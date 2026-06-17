import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const supabaseAdmin = await createClient(true)

    const [{ data: subsData, error: subsError }, { data: usersData }] = await Promise.all([
      supabaseAdmin
        .from('user_subscriptions')
        .select('*, subscription_plans(name, price_monthly)')
        .order('created_at', { ascending: false }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ])

    if (subsError) {
      return NextResponse.json({ error: 'Erro ao buscar assinaturas' }, { status: 500 })
    }

    const usersMap = new Map((usersData?.users || []).map(u => [u.id, u]))
    const now = new Date()

    const subscriptions = (subsData || []).map(sub => {
      const endDate = new Date(sub.end_date)
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const authUser = usersMap.get(sub.user_id)
      const plan = sub.subscription_plans as { name?: string; price_monthly?: number }

      return {
        id: sub.id,
        user_id: sub.user_id,
        user_email: authUser?.email || `ID: ${sub.user_id.substring(0, 8)}…`,
        plan_name: plan?.name || 'Plano não encontrado',
        status: sub.status,
        start_date: sub.start_date,
        end_date: sub.end_date,
        is_trial: sub.is_trial,
        days_remaining: daysRemaining,
        created_at: sub.created_at,
      }
    })

    const active = subscriptions.filter(s => s.status === 'active' && s.days_remaining > 0)
    const trial = active.filter(s => s.is_trial)
    const expired = subscriptions.filter(s => s.status === 'active' && s.days_remaining === 0)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const monthlyRevenue = active
      .filter(s => !s.is_trial && new Date(s.created_at) >= thirtyDaysAgo)
      .reduce((sum, s) => {
        const plan = (subsData || []).find(d => d.id === s.id)?.subscription_plans as { price_monthly?: number }
        return sum + (plan?.price_monthly || 0)
      }, 0)

    const totalRevenue = active
      .filter(s => !s.is_trial)
      .reduce((sum, s) => {
        const plan = (subsData || []).find(d => d.id === s.id)?.subscription_plans as { price_monthly?: number }
        return sum + (plan?.price_monthly || 0)
      }, 0)

    return NextResponse.json({
      subscriptions,
      stats: {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: active.length,
        trialSubscriptions: trial.length,
        expiredSubscriptions: expired.length,
        monthlyRevenue,
        totalRevenue,
      },
    })
  } catch (error) {
    console.error('Erro em GET /api/admin/subscriptions:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
