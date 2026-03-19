import { NextRequest, NextResponse } from 'next/server';
import {
  createOrRetrieveStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession
} from '@/lib/stripe-config';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Function to get Supabase client
function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// POST - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, priceId, mode = 'subscription' } = await request.json();

    // Validate required fields
    if (!userId || !email || !priceId) {
      return NextResponse.json(
        { error: 'userId, email, and priceId are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const supabase = getSupabase()
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create or retrieve Stripe customer
    const stripeCustomerId = await createOrRetrieveStripeCustomer(
      userId,
      email,
      name
    );

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      stripeCustomerId,
      priceId,
      userId
    );

    return NextResponse.json({
      success: true,
      checkoutUrl,
      customerId: stripeCustomerId
    });

  } catch (error) {
    console.error('Error in POST /api/stripe/checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Create billing portal session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const action = searchParams.get('action');

    const authSupabase = await createServerClient()
    const {
      data: { user },
      error: authError
    } = await authSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const userId = user.id

    // Get customer from database
    const supabase = getSupabase()
    const { data: customer, error } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: 'Customer not found. Please create a subscription first.' },
        { status: 404 }
      );
    }

    if (action === 'billing_portal') {
      // Create billing portal session
      const portalUrl = await createBillingPortalSession(customer.stripe_customer_id);
      
      return NextResponse.json({
        success: true,
        portalUrl
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: billing_portal' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in GET /api/stripe/checkout:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error'

    // Provide specific messages for common Stripe errors
    if (errorMessage.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Stripe não está configurado. Verifique as variáveis de ambiente.' },
        { status: 503 }
      );
    }

    if (errorMessage.includes('billing portal') || errorMessage.includes('configuration')) {
      return NextResponse.json(
        { error: 'O portal de cobrança do Stripe precisa ser configurado no Dashboard do Stripe.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Erro ao acessar portal de cobrança: ${errorMessage}` },
      { status: 500 }
    );
  }
}
