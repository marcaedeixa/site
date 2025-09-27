import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerStripe } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = await createClient(true); // Use service role
    
    // Get all customers from database
    const { data: customers, error } = await supabase
      .from('stripe_customers')
      .select(`
        *,
        auth.users!inner(email, created_at)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: 'Error fetching customers' },
        { status: 500 }
      );
    }

    // Format customers for admin view
    const formattedCustomers = (customers || []).map(customer => ({
      id: customer.id,
      stripe_customer_id: customer.stripe_customer_id,
      email: customer.auth?.users?.email || 'Email não encontrado',
      name: customer.name,
      created_at: customer.created_at
    }));

    return NextResponse.json({
      success: true,
      customers: formattedCustomers
    });

  } catch (error) {
    console.error('Error in GET /api/admin/stripe/customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}