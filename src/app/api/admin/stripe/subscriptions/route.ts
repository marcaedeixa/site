import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerStripe } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = await createClient(true); // Use service role
    
    // Get all subscriptions from database
    const { data: subscriptions, error } = await supabase
      .from('stripe_subscriptions')
      .select(`
        *,
        stripe_customers!inner(
          stripe_customer_id,
          auth.users!inner(email)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Error fetching subscriptions' },
        { status: 500 }
      );
    }

    // Format subscriptions for admin view
    const formattedSubscriptions = (subscriptions || []).map(sub => ({
      id: sub.id,
      stripe_subscription_id: sub.stripe_subscription_id,
      stripe_customer_id: sub.stripe_customer_id,
      status: sub.status,
      plan_id: sub.plan_id,
      plan_name: sub.plan_name || 'Plano não encontrado',
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      created_at: sub.created_at,
      customer_email: sub.stripe_customers?.auth?.users?.email || 'Email não encontrado'
    }));

    return NextResponse.json({
      success: true,
      subscriptions: formattedSubscriptions
    });

  } catch (error) {
    console.error('Error in GET /api/admin/stripe/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}