import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';
import { savePaymentToDatabase } from '@/lib/stripe-config';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch user's payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const authSupabase = await createClient()
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

    const supabase = await createClient(true); // Use service role
    
    // Get payments from database
    const { data: payments, error, count } = await supabase
      .from('stripe_payments')
      .select(`
        *,
        stripe_customers!inner(user_id)
      `, { count: 'exact' })
      .eq('stripe_customers.user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Error fetching payments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payments: payments || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in GET /api/stripe/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create payment intent
export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      amount, 
      currency = 'usd', 
      description,
      metadata = {} 
    } = await request.json();

    // Validate required fields
    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'userId and amount are required' },
        { status: 400 }
      );
    }

    if (amount < 50) { // Minimum $0.50
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    const supabase = await createClient(true); // Use service role
    
    // Get customer from database
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found. Please create a customer first.' },
        { status: 404 }
      );
    }

    // Create payment intent
    const paymentIntent = await getServerStripe().paymentIntents.create({
      amount: Math.round(amount), // Ensure it's an integer
      currency: currency.toLowerCase(),
      customer: customer.stripe_customer_id,
      description,
      metadata: {
        user_id: userId,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });

  } catch (error) {
    console.error('Error in POST /api/stripe/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update payment intent
export async function PUT(request: NextRequest) {
  try {
    const { paymentIntentId, amount, description, metadata } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = Math.round(amount);
    if (description !== undefined) updateData.description = description;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Update payment intent
    const paymentIntent = await getServerStripe().paymentIntents.update(
      paymentIntentId,
      updateData
    );

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata
      }
    });

  } catch (error) {
    console.error('Error in PUT /api/stripe/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel payment intent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      );
    }

    // Cancel payment intent
    const paymentIntent = await getServerStripe().paymentIntents.cancel(paymentIntentId);

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status
      },
      message: 'Payment intent canceled successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/stripe/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
