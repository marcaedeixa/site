import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Cancel active Stripe subscriptions if any
    const { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (stripeCustomer?.stripe_customer_id) {
      try {
        const { getServerStripe } = await import('@/lib/stripe')
        const stripe = getServerStripe()

        // Cancel all active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.stripe_customer_id,
          status: 'active',
        })

        for (const sub of subscriptions.data) {
          await stripe.subscriptions.cancel(sub.id)
        }

        // Delete stripe customer
        await stripe.customers.del(stripeCustomer.stripe_customer_id)
      } catch (stripeError) {
        console.error('Error cleaning up Stripe data:', stripeError)
        // Continue with account deletion even if Stripe cleanup fails
      }
    }

    // Delete user data from database tables (cascading)
    // Order matters: delete dependent tables first
    const tables = ['actors', 'objects', 'projects', 'stripe_customers', 'subscriptions', 'payments']
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId)
      if (error) {
        console.error(`Error deleting from ${table}:`, error)
      }
    }

    // Delete the user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Error deleting user account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/account/delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
