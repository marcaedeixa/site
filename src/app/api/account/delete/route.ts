import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function DELETE() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const adminSupabase = getSupabase()

    // Verify user exists
    const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Cancel active Stripe subscriptions if any
    const { data: stripeCustomer } = await adminSupabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (stripeCustomer?.stripe_customer_id) {
      try {
        const { getServerStripe } = await import('@/lib/stripe')
        const stripe = getServerStripe()

        // Cancel any non-terminated subscriptions before deleting the account.
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.stripe_customer_id,
          status: 'all',
        })

        for (const sub of subscriptions.data) {
          if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
            continue
          }
          await stripe.subscriptions.cancel(sub.id)
        }

        // Delete stripe customer
        await stripe.customers.del(stripeCustomer.stripe_customer_id)
      } catch (stripeError) {
        console.error('Error cleaning up Stripe data:', stripeError)
        return NextResponse.json(
          { error: 'Não foi possível cancelar a assinatura e remover os dados do Stripe.' },
          { status: 502 }
        )
      }
    }

    // Delete user data from database tables (cascading)
    // stripe_payments and stripe_subscriptions use customer_id FK, not user_id
    const { data: customerRecord } = await adminSupabase
      .from('stripe_customers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (customerRecord?.id) {
      // Delete tables that reference stripe_customers via customer_id
      for (const table of ['stripe_payments', 'stripe_subscriptions']) {
        const { error } = await adminSupabase.from(table).delete().eq('customer_id', customerRecord.id)
        if (error) console.error(`Error deleting from ${table}:`, error)
      }
    }

    // Delete tables that have direct user_id column
    const userIdTables = [
      'project_data',
      'user_actions',
      'subscription_history',
      'user_subscriptions',
      'stripe_customers',
      'actors',
      'objects',
      'projects'
    ]
    for (const table of userIdTables) {
      const { error } = await adminSupabase.from(table).delete().eq('user_id', userId)
      if (error && !error.message?.includes('does not exist')) {
        console.error(`Error deleting from ${table}:`, error)
      }
    }

    // Delete the user from Supabase Auth
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Error deleting user account' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedUserId: userId })
  } catch (error) {
    console.error('Error in DELETE /api/account/delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
