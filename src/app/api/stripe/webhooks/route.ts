import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe, STRIPE_WEBHOOK_EVENTS } from '@/lib/stripe';
import { saveSubscriptionToDatabase, savePaymentToDatabase } from '@/lib/stripe-config';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

type WebhookDatabase = {
  public: {
    Tables: {
      stripe_webhook_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          processed: boolean;
        };
        Insert: {
          stripe_event_id: string;
          event_type: string;
          data: unknown;
          processed: boolean;
        };
        Update: {
          processed?: boolean;
        };
        Relationships: [];
      };
      stripe_customers: {
        Row: {
          id: string;
          stripe_customer_id: string;
          email: string | null;
          name: string | null;
        };
        Insert: {
          id?: string;
          stripe_customer_id: string;
          email?: string | null;
          name?: string | null;
        };
        Update: {
          email?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
      stripe_subscriptions: {
        Row: {
          stripe_subscription_id: string;
          status: string;
          canceled_at: string | null;
        };
        Insert: {
          stripe_subscription_id: string;
          status: string;
          canceled_at?: string | null;
        };
        Update: {
          status?: string;
          canceled_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let supabaseClient: ReturnType<typeof createClient<WebhookDatabase>> | null = null;

function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase is disabled: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  }

  supabaseClient = createClient<WebhookDatabase>(supabaseUrl, serviceRoleKey);
  return supabaseClient;
}

// Webhook secret (opcional): se não houver, a rota retorna 501
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// POST - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Stripe desabilitado: STRIPE_WEBHOOK_SECRET ausente' },
        { status: 501 }
      );
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event;

    try {
      // Verify webhook signature
      event = getServerStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Log the event for debugging
    console.log('Received Stripe webhook event:', event.type, event.id);

    // Check for idempotency - skip if already processed
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id, processed')
      .eq('stripe_event_id', event.id)
      .single();

    if ((existingEvent as { processed?: boolean } | null)?.processed) {
      console.log('Webhook event already processed, skipping:', event.id);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Save webhook event to database for audit
    await saveWebhookEvent(event);

    // Handle the event
    switch (event.type) {
      case STRIPE_WEBHOOK_EVENTS.CUSTOMER_CREATED:
        await handleCustomerCreated(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.CUSTOMER_UPDATED:
        await handleCustomerUpdated(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.CUSTOMER_DELETED:
        await handleCustomerDeleted(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED:
        await handleSubscriptionCreated(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED:
        await handleSubscriptionUpdated(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_DELETED:
        await handleSubscriptionDeleted(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED:
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED:
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case STRIPE_WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED:
        await handlePaymentIntentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await markEventAsProcessed(event.id);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to save webhook event
async function saveWebhookEvent(event: any) {
  try {
    const supabase = getSupabase();
    await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        data: event,
        processed: false
      });
  } catch (error) {
    console.error('Error saving webhook event:', error);
  }
}

// Helper function to mark event as processed
async function markEventAsProcessed(eventId: string) {
  try {
    const supabase = getSupabase();
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', eventId);
  } catch (error) {
    console.error('Error marking event as processed:', error);
  }
}

// Event handlers
async function handleCustomerCreated(customer: any) {
  console.log('Customer created:', customer.id);
  // Customer creation is handled in the API when creating checkout sessions
}

async function handleCustomerUpdated(customer: any) {
  console.log('Customer updated:', customer.id);
  
  try {
    const supabase = getSupabase();
    await supabase
      .from('stripe_customers')
      .update({
        email: customer.email,
        name: customer.name
      })
      .eq('stripe_customer_id', customer.id);
  } catch (error) {
    console.error('Error updating customer:', error);
  }
}

async function handleCustomerDeleted(customer: any) {
  console.log('Customer deleted:', customer.id);
  
  try {
    const supabase = getSupabase();
    await supabase
      .from('stripe_customers')
      .delete()
      .eq('stripe_customer_id', customer.id);
  } catch (error) {
    console.error('Error deleting customer:', error);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('Subscription created:', subscription.id);
  
  try {
    const supabase = getSupabase();
    // Get customer from database
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (customer) {
      await saveSubscriptionToDatabase(subscription, customer.id);
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id);
  
  try {
    const supabase = getSupabase();
    // Get customer from database
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (customer) {
      await saveSubscriptionToDatabase(subscription, customer.id);
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);
  
  try {
    const supabase = getSupabase();
    await supabase
      .from('stripe_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  try {
    // Don't blindly set subscription to active - let the subscription.updated event handle status
    // The invoice.payment_succeeded means payment was collected, but subscription status
    // should be managed by subscription events (created/updated/deleted)
    // This prevents race conditions between webhook ordering
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice.id);
  
  try {
    const supabase = getSupabase();
    // Update subscription status
    if (invoice.subscription) {
      await supabase
        .from('stripe_subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription);
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  
  try {
    const supabase = getSupabase();
    // Get customer from database
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('id')
      .eq('stripe_customer_id', paymentIntent.customer)
      .single();

    if (customer) {
      await savePaymentToDatabase(paymentIntent, customer.id);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('Payment intent failed:', paymentIntent.id);
  
  try {
    const supabase = getSupabase();
    // Get customer from database
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('id')
      .eq('stripe_customer_id', paymentIntent.customer)
      .single();

    if (customer) {
      await savePaymentToDatabase(paymentIntent, customer.id);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}
