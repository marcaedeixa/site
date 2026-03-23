import Stripe from 'stripe';
import { getServerStripe, STRIPE_CONFIG, STRIPE_PLANS } from './stripe';
import { createClient } from '@supabase/supabase-js';

// Function to get Supabase client for server-side operations
function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Types for Stripe operations
export interface StripeCustomer {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  email: string;
  name?: string;
}

export interface StripeSubscription {
  id: string;
  customer_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  plan_id: string;
  plan_name: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  trial_start?: Date;
  trial_end?: Date;
}

export interface StripePayment {
  id: string;
  customer_id: string;
  stripe_payment_intent_id: string;
  stripe_customer_id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  metadata?: Record<string, string>;
}

// Create or retrieve Stripe customer
export async function createOrRetrieveStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  try {
    // Check if customer already exists in our database
    const supabase = getSupabase()
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer) {
      return existingCustomer.stripe_customer_id;
    }

    // Create new customer in Stripe
    const stripeCustomer = await getServerStripe().customers.create({
      email,
      name,
      metadata: {
        user_id: userId,
      },
    });

    // Save customer to our database
    const { error } = await supabase
      .from('stripe_customers')
      .insert({
        user_id: userId,
        stripe_customer_id: stripeCustomer.id,
        email,
        name,
      });

    if (error) {
      console.error('Error saving Stripe customer to database:', error);
      throw new Error('Failed to save customer to database');
    }

    return stripeCustomer.id;
  } catch (error) {
    console.error('Error creating/retrieving Stripe customer:', error);
    throw error;
  }
}

// Create Stripe checkout session
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string
): Promise<string> {
  try {
    const session = await getServerStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: STRIPE_CONFIG.successUrl,
      cancel_url: STRIPE_CONFIG.cancelUrl,
      metadata: {
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
        },
      },
    });

    return session.url!;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Create Stripe billing portal session
export async function createBillingPortalSession(
  customerId: string
): Promise<string> {
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()
    const session = await getServerStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/subscription`,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

// Get customer subscriptions from Stripe
export async function getCustomerSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  try {
    const subscriptions = await getServerStripe().subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    return subscriptions.data;
  } catch (error) {
    console.error('Error fetching customer subscriptions:', error);
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  try {
    if (cancelAtPeriodEnd) {
      // Cancel at period end
      const subscription = await getServerStripe().subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    } else {
      // Cancel immediately
      const subscription = await getServerStripe().subscriptions.cancel(subscriptionId);
      return subscription;
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Update subscription
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await getServerStripe().subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await getServerStripe().subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

// Save subscription to database
export async function saveSubscriptionToDatabase(
  subscription: {
    id: string
    customer: string
    status: string
    items: { data: Array<{ price: { id: string; nickname?: string } }> }
    current_period_start: number
    current_period_end: number
    cancel_at_period_end: boolean
    canceled_at?: number
    trial_start?: number
    trial_end?: number
  },
  customerId: string
): Promise<void> {
  try {
    const supabase = getSupabase()
    // Resolve plan name from Stripe product (nickname is often null)
    const priceId = subscription.items.data[0]?.price?.id
    let planName = subscription.items.data[0]?.price?.nickname || 'Unknown Plan'
    if (priceId && planName === 'Unknown Plan') {
      try {
        const stripe = getServerStripe()
        const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
        const product = price.product && typeof price.product !== 'string' ? price.product : null
        if (product && !('deleted' in product)) {
          planName = product.name
        }
      } catch { /* fallback to Unknown Plan */ }
    }
    const { error } = await supabase
      .from('stripe_subscriptions')
      .upsert({
        customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        status: subscription.status,
        plan_id: priceId,
        plan_name: planName,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      }, {
        onConflict: 'stripe_subscription_id'
      });

    if (error) {
      console.error('Error saving subscription to database:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in saveSubscriptionToDatabase:', error);
    throw error;
  }
}

// Save payment to database
export async function savePaymentToDatabase(
  paymentIntent: {
    id: string
    customer: string
    amount: number
    currency: string
    status: string
    description?: string
    metadata?: Record<string, string>
  },
  customerId: string
): Promise<void> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('stripe_payments')
      .insert({
        customer_id: customerId,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
      });

    if (error) {
      console.error('Error saving payment to database:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in savePaymentToDatabase:', error);
    throw error;
  }
}

// Get user's active subscription
export async function getUserActiveSubscription(
  userId: string
): Promise<StripeSubscription | null> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('stripe_subscriptions')
      .select(`
        *,
        stripe_customers!inner(user_id)
      `)
      .eq('stripe_customers.user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user subscription:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserActiveSubscription:', error);
    return null;
  }
}

// Initialize Stripe products and prices (run once during setup)
export async function initializeStripeProducts(): Promise<void> {
  try {
    console.log('Initializing Stripe products and prices...');

    for (const [planKey, plan] of Object.entries(STRIPE_PLANS)) {
      // Create product
      const product = await getServerStripe().products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          plan_key: planKey,
        },
      });

      console.log(`Created product: ${product.name} (${product.id})`);

      // Create prices for each interval
      for (const [intervalKey, priceConfig] of Object.entries(plan.prices)) {
        const price = await getServerStripe().prices.create({
          product: product.id,
          unit_amount: priceConfig.amount,
          currency: STRIPE_CONFIG.currency,
          recurring: {
            interval: priceConfig.interval,
          },
          nickname: `${plan.name} - ${intervalKey}`,
          metadata: {
            plan_key: planKey,
            interval_key: intervalKey,
          },
        });

        console.log(`Created price: ${price.nickname} (${price.id})`);
        console.log(`Update STRIPE_PLANS.${planKey}.prices.${intervalKey}.priceId to: ${price.id}`);
      }
    }

    console.log('Stripe products and prices initialized successfully!');
  } catch (error) {
    console.error('Error initializing Stripe products:', error);
    throw error;
  }
}