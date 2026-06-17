import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cancelSubscription, updateSubscription } from '@/lib/stripe-config'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, newPriceId } = body as {
      userId: string
      action: 'cancel' | 'change_plan'
      newPriceId?: string
    }

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId e action são obrigatórios' },
        { status: 400 }
      )
    }

    if (action === 'change_plan' && !newPriceId) {
      return NextResponse.json(
        { error: 'newPriceId é obrigatório para change_plan' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Resolve userId → stripe_customers
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Usuário não possui cliente Stripe' },
        { status: 404 }
      )
    }

    // 2. Resolve customer_id → stripe_subscriptions (assinatura ativa)
    const { data: subscription, error: subError } = await supabase
      .from('stripe_subscriptions')
      .select('stripe_subscription_id, plan_id')
      .eq('customer_id', customer.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Usuário não possui assinatura ativa' },
        { status: 404 }
      )
    }

    const stripeSubscriptionId = subscription.stripe_subscription_id

    if (action === 'cancel') {
      const result = await cancelSubscription(stripeSubscriptionId, true)

      // Atualiza flag local no banco
      const { error: cancelUpdateError } = await supabase
        .from('stripe_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('stripe_subscription_id', stripeSubscriptionId)
      if (cancelUpdateError) {
        console.error('Failed to update cancel_at_period_end locally:', cancelUpdateError)
      }

      return NextResponse.json({
        success: true,
        cancelAtPeriodEnd: result.cancel_at_period_end,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPeriodEnd: (result as any).current_period_end
          ? new Date((result as any).current_period_end * 1000).toISOString()
          : null,
      })
    }

    if (action === 'change_plan') {
      if (subscription.plan_id === newPriceId) {
        return NextResponse.json(
          { error: 'O usuário já está neste plano' },
          { status: 400 }
        )
      }

      const result = await updateSubscription(stripeSubscriptionId, newPriceId!)

      // Atualiza plan_id local no banco (plan_name será atualizado pelo webhook)
      const { error: planUpdateError } = await supabase
        .from('stripe_subscriptions')
        .update({ plan_id: newPriceId })
        .eq('stripe_subscription_id', stripeSubscriptionId)
      if (planUpdateError) {
        console.error('Failed to update plan_id locally:', planUpdateError)
      }

      return NextResponse.json({
        success: true,
        newPlanId: newPriceId,
        status: result.status,
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST /api/admin/subscriptions/manage:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
