import { NextRequest, NextResponse } from 'next/server';
import { createOrRetrieveStripeCustomer } from '@/lib/stripe-config';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name } = await request.json();

    // Validate required fields
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(true); // Use service role
    
    // Verify user exists in auth.users
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

    return NextResponse.json({
      success: true,
      customerId: stripeCustomerId,
      message: 'Customer created/retrieved successfully'
    });

  } catch (error) {
    console.error('Error in /api/stripe/customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { data: customer, error } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer:', error);
      return NextResponse.json(
        { error: 'Error fetching customer' },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer
    });

  } catch (error) {
    console.error('Error in GET /api/stripe/customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}