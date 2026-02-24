import { NextRequest, NextResponse } from 'next/server';
import {
  createOrRetrieveStripeCustomer,
  getCustomerSubscriptions,
  cancelSubscription,
  updateSubscription,
  getUserActiveSubscription,
  saveSubscriptionToDatabase
} from '@/lib/stripe-config';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(true); // Use service role
    
    // Get customer from database
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('id, stripe_customer_id')
      .eq('user_id', userId)
      .single();

    // Get user's active subscription from database
    let activeSubscription = await getUserActiveSubscription(userId);

    // If no active subscription in DB, sync from Stripe (handles post-payment updates)
    if (!activeSubscription && customer) {
      const stripeSubscriptions = await getCustomerSubscriptions(customer.stripe_customer_id);
      const activeSub = stripeSubscriptions.find(s => s.status === 'active' || s.status === 'trialing');
      if (activeSub) {
        // Sync active subscription back to database
        try {
          const subData = activeSub as any;
          await saveSubscriptionToDatabase(
            {
              id: activeSub.id,
              customer: activeSub.customer as string,
              status: activeSub.status,
              items: activeSub.items as any,
              current_period_start: subData.current_period_start ?? Math.floor(Date.now() / 1000),
              current_period_end: subData.current_period_end ?? Math.floor(Date.now() / 1000),
              cancel_at_period_end: activeSub.cancel_at_period_end,
            },
            customer.id
          );
          // Re-fetch from DB to get consistent data
          activeSubscription = await getUserActiveSubscription(userId);
        } catch (syncErr) {
          console.error('Error syncing subscription from Stripe:', syncErr);
        }
      }
    }

    let allSubscriptions: any[] = [];
    if (customer) {
      allSubscriptions = await getCustomerSubscriptions(customer.stripe_customer_id);
    }

    return NextResponse.json({
      success: true,
      activeSubscription,
      allSubscriptions
    });

  } catch (error) {
    console.error('Error in GET /api/stripe/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new subscription (handled via checkout)
export async function POST(request: NextRequest) {
  try {
    const { userId, email, name } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      );
    }

    // Create or retrieve customer
    const stripeCustomerId = await createOrRetrieveStripeCustomer(
      userId,
      email,
      name
    );

    // Get current subscriptions
    const subscriptions = await getCustomerSubscriptions(stripeCustomerId);
    const activeSubscriptions = subscriptions.filter(
      sub => ['active', 'trialing'].includes(sub.status)
    );

    return NextResponse.json({
      success: true,
      customerId: stripeCustomerId,
      activeSubscriptions: activeSubscriptions.length,
      subscriptions
    });

  } catch (error) {
    console.error('Error in POST /api/stripe/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update subscription
export async function PUT(request: NextRequest) {
  try {
    const { subscriptionId, newPriceId, action } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'update_plan':
        if (!newPriceId) {
          return NextResponse.json(
            { error: 'newPriceId is required for plan update' },
            { status: 400 }
          );
        }
        result = await updateSubscription(subscriptionId, newPriceId);
        break;

      case 'cancel':
        result = await cancelSubscription(subscriptionId, true); // Cancel at period end
        break;

      case 'cancel_immediately':
        result = await cancelSubscription(subscriptionId, false); // Cancel immediately
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: update_plan, cancel, or cancel_immediately' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      subscription: result,
      message: `Subscription ${action} completed successfully`
    });

  } catch (error) {
    console.error('Error in PUT /api/stripe/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const immediate = searchParams.get('immediate') === 'true';

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required' },
        { status: 400 }
      );
    }

    const result = await cancelSubscription(subscriptionId, !immediate);

    return NextResponse.json({
      success: true,
      subscription: result,
      message: immediate 
        ? 'Subscription canceled immediately' 
        : 'Subscription will be canceled at the end of the current period'
    });

  } catch (error) {
    console.error('Error in DELETE /api/stripe/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}