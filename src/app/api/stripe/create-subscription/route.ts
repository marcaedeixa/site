import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

type SubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start: number
  current_period_end: number
  trial_start?: number | null
  trial_end?: number | null
}
import { getServerStripe, STRIPE_CONFIG, getPlanByPriceId } from '@/lib/stripe'
import { createOrRetrieveStripeCustomer } from '@/lib/stripe-config'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Service role client for DB operations
function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // Extract auth token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Autenticação requerida' },
        { status: 401 }
      )
    }
    
    // Verify user with service role client + token
    const serviceSupabase = getServiceSupabase()
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    const { priceId, userId, email, name } = await request.json()

    if (!priceId || !userId || !email) {
      return NextResponse.json(
        { error: 'Dados incompletos: priceId, userId e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Security: Validate that userId in body matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Usuário não autorizado' },
        { status: 403 }
      )
    }

    const stripe = getServerStripe()

    // Create or retrieve the Stripe customer
    const customerId = await createOrRetrieveStripeCustomer(userId, email, name)

    // Check if customer already has an active subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (existingSubscriptions.data.length > 0) {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura ativa' },
        { status: 400 }
      )
    }

    // Also check for trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'trialing',
      limit: 1,
    })

    if (trialingSubscriptions.data.length > 0) {
      return NextResponse.json(
        { error: 'Você já possui um período de teste ativo' },
        { status: 400 }
      )
    }

    // Generate idempotency key to prevent duplicate subscriptions
    const idempotencyKey = `sub_create_${userId}_${priceId}_${Date.now()}`

    // Create the subscription with trial period
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        user_id: userId,
      },
      // Add trial period if configured
      ...(STRIPE_CONFIG.trialDays && STRIPE_CONFIG.trialDays > 0 ? {
        trial_period_days: STRIPE_CONFIG.trialDays,
      } : {}),
    }, {
      idempotencyKey,
    })

    const subscriptionData = subscription as unknown as SubscriptionWithPeriods

    // Get the customer's internal ID from stripe_customers table
    const { data: stripeCustomer } = await serviceSupabase
      .from('stripe_customers')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    // Save subscription to database immediately (don't wait for webhook)
    if (stripeCustomer) {
      const planInfo = await getPlanByPriceId(priceId)
      const planName = planInfo?.plan?.name || planInfo?.productName || 'Unknown Plan'
      
      try {
        await serviceSupabase
          .from('stripe_subscriptions')
          .upsert({
            customer_id: stripeCustomer.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: subscription.status,
            plan_id: priceId,
            plan_name: planName,
            current_period_start: new Date(subscriptionData.current_period_start * 1000),
            current_period_end: new Date(subscriptionData.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_start: subscriptionData.trial_start ? new Date(subscriptionData.trial_start * 1000) : null,
            trial_end: subscriptionData.trial_end ? new Date(subscriptionData.trial_end * 1000) : null,
          }, {
            onConflict: 'stripe_subscription_id'
          })
        console.log('Subscription saved to database:', subscription.id)
      } catch (dbError) {
        console.error('Error saving subscription to database:', dbError)
        // Continue anyway, webhook will sync later
      }
    }

    // Get the client secret from the payment intent
    const invoice = subscription.latest_invoice as any
    const paymentIntent = invoice?.payment_intent

    if (!paymentIntent?.client_secret) {
      // If there's a trial, there won't be a payment intent yet
      // Return success for trial subscriptions
      if (subscription.status === 'trialing') {
        return NextResponse.json({
          subscriptionId: subscription.id,
          status: 'trialing',
          message: 'Período de teste iniciado com sucesso',
        })
      }

      return NextResponse.json(
        { error: 'Não foi possível criar o pagamento' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      status: subscription.status,
    })

  } catch (error: any) {
    console.error('Error creating subscription:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Dados de pagamento inválidos' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar assinatura' },
      { status: 500 }
    )
  }
}
