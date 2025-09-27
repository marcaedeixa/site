import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerStripe } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = await createClient(true); // Use service role
    
    // Get all payments from database
    const { data: payments, error } = await supabase
      .from('stripe_payments')
      .select(`
        *,
        stripe_customers!inner(
          stripe_customer_id,
          auth.users!inner(email)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 payments for performance

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Error fetching payments' },
        { status: 500 }
      );
    }

    // Format payments for admin view
    const formattedPayments = (payments || []).map(payment => ({
      id: payment.id,
      stripe_payment_intent_id: payment.stripe_payment_intent_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      created_at: payment.created_at,
      customer_email: payment.stripe_customers?.auth?.users?.email || 'Email não encontrado'
    }));

    return NextResponse.json({
      success: true,
      payments: formattedPayments
    });

  } catch (error) {
    console.error('Error in GET /api/admin/stripe/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}