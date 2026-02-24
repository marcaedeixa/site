import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getServerStripe, getPlanByPriceId } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Get supabase client with service role
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId e email são obrigatórios' },
        { status: 400 }
      )
    }

    const stripe = getServerStripe()
    const supabase = getSupabase()

    // Find or create the Stripe customer
    let stripeCustomerId: string | null = null
    let stripeCustomerDbId: string | null = null

    // Check if customer exists in our database
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('id, stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripe_customer_id
      stripeCustomerDbId = existingCustomer.id
    } else {
      // Search for customer in Stripe by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id

        // Save to our database
        const { data: newCustomer, error } = await supabase
          .from('stripe_customers')
          .insert({
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            email: email,
          })
          .select('id')
          .single()

        if (newCustomer) {
          stripeCustomerDbId = newCustomer.id
        }
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum cliente Stripe encontrado',
        synced: 0,
      })
    }

    // Get all subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10,
    })

    let synced = 0
    const results: any[] = []

    for (const subscription of subscriptions.data) {
      try {
        const subscriptionData = subscription as unknown as SubscriptionWithPeriods
        const priceId = subscription.items.data[0]?.price?.id
        const planInfo = await getPlanByPriceId(priceId)
        const planName = planInfo?.plan?.name || planInfo?.productName || subscription.items.data[0]?.price?.nickname || 'Unknown Plan'

        // Upsert subscription to database
        const { error } = await supabase
          .from('stripe_subscriptions')
          .upsert({
            customer_id: stripeCustomerDbId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: stripeCustomerId,
            status: subscription.status,
            plan_id: priceId,
            plan_name: planName,
            current_period_start: new Date(subscriptionData.current_period_start * 1000),
            current_period_end: new Date(subscriptionData.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            trial_start: subscriptionData.trial_start ? new Date(subscriptionData.trial_start * 1000) : null,
            trial_end: subscriptionData.trial_end ? new Date(subscriptionData.trial_end * 1000) : null,
          }, {
            onConflict: 'stripe_subscription_id'
          })

        if (!error) {
          synced++
        }

        results.push({
          id: subscription.id,
          status: subscription.status,
          planName,
          synced: !error,
          error: error?.message,
        })
      } catch (err: any) {
        results.push({
          id: subscription.id,
          status: subscription.status,
          synced: false,
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${synced} assinatura(s) sincronizada(s)`,
      synced,
      total: subscriptions.data.length,
      results,
    })

  } catch (error: any) {
    console.error('Error syncing subscriptions:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar assinaturas' },
      { status: 500 }
    )
  }
}
type SubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start: number
  current_period_end: number
  trial_start?: number | null
  trial_end?: number | null
}
