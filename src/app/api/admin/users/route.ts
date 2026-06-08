import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const rawLimit = parseInt(searchParams.get('limit') || '10')
    const rawOffset = parseInt(searchParams.get('offset') || '0')
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 10 : rawLimit, 1), 100)
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const supabaseAdmin = await createClient(true)
    const page = Math.floor(offset / limit) + 1

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit
    })

    if (usersError) throw usersError

    const authUsers = usersData?.users || []
    const userIds = authUsers.map(u => u.id)

    if (userIds.length === 0) {
      return NextResponse.json({ users: [], total: 0, limit, offset })
    }

    // Buscar stripe_customers para esse batch
    const { data: stripeCustomers } = await supabaseAdmin
      .from('stripe_customers')
      .select('id, user_id')
      .in('user_id', userIds)

    const customerByUserId = new Map(
      (stripeCustomers || []).map(c => [c.user_id as string, c.id as string])
    )
    const internalCustomerIds = (stripeCustomers || []).map(c => c.id as string)

    // Buscar assinaturas Stripe ativas
    const subscriptionByCustomerId = new Map<string, { plan_name: string }>()
    if (internalCustomerIds.length > 0) {
      const { data: stripeSubs } = await supabaseAdmin
        .from('stripe_subscriptions')
        .select('customer_id, plan_name')
        .in('customer_id', internalCustomerIds)
        .in('status', ['active', 'trialing'])

      for (const sub of stripeSubs || []) {
        subscriptionByCustomerId.set(sub.customer_id as string, { plan_name: sub.plan_name as string })
      }
    }

    // Buscar trials ativos
    const { data: trialSubs } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_trial', true)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())

    const trialUserIds = new Set((trialSubs || []).map(s => s.user_id as string))

    // Buscar total gasto por cliente
    const spentByCustomerId = new Map<string, number>()
    if (internalCustomerIds.length > 0) {
      const { data: payments } = await supabaseAdmin
        .from('stripe_payments')
        .select('customer_id, amount')
        .in('customer_id', internalCustomerIds)
        .eq('status', 'succeeded')

      for (const p of payments || []) {
        spentByCustomerId.set(
          p.customer_id as string,
          (spentByCustomerId.get(p.customer_id as string) || 0) + (p.amount as number)
        )
      }
    }

    // Montar resposta enriquecida
    const users = authUsers.map(u => {
      const internalCustomerId = customerByUserId.get(u.id)
      const stripeSub = internalCustomerId ? subscriptionByCustomerId.get(internalCustomerId) : undefined
      const totalSpent = internalCustomerId ? (spentByCustomerId.get(internalCustomerId) || 0) : 0

      let subscription_status: 'free' | 'trial' | 'paid' = 'free'
      let plan_name: string | null = null

      if (stripeSub) {
        subscription_status = 'paid'
        plan_name = stripeSub.plan_name
      } else if (trialUserIds.has(u.id)) {
        subscription_status = 'trial'
      }

      return {
        id: u.id,
        email: u.email,
        full_name: (u.user_metadata?.full_name as string) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        subscription_status,
        plan_name,
        total_spent: totalSpent
      }
    })

    return NextResponse.json({
      users,
      total: usersData?.total ?? 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Erro ao obter usuários:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
