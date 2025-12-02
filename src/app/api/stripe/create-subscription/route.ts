import { NextRequest, NextResponse } from 'next/server'
import { getServerStripe, STRIPE_CONFIG } from '@/lib/stripe'
import { createOrRetrieveStripeCustomer } from '@/lib/stripe-config'

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, email, name } = await request.json()

    if (!priceId || !userId || !email) {
      return NextResponse.json(
        { error: 'Dados incompletos: priceId, userId e email são obrigatórios' },
        { status: 400 }
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
    })

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

