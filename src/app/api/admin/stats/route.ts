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
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const supabaseAdmin = await createClient(true)

    // Buscar até 1000 usuários para contagens baseadas em datas
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    const allUsers = usersData?.users || []
    const totalUsers = (usersData && 'total' in usersData ? (usersData as { total?: number }).total : undefined) ?? allUsers.length

    // Usuários ativos (login nos últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeUsers = allUsers.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= thirtyDaysAgo
    ).length

    // Logins hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayLogins = allUsers.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= today
    ).length

    // Crescimento semanal
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const thisWeekNew = allUsers.filter(
      u => new Date(u.created_at) >= sevenDaysAgo
    ).length
    const lastWeekNew = allUsers.filter(u => {
      const d = new Date(u.created_at)
      return d >= fourteenDaysAgo && d < sevenDaysAgo
    }).length
    const weeklyGrowth = lastWeekNew > 0
      ? Math.round(((thisWeekNew - lastWeekNew) / lastWeekNew) * 100 * 10) / 10
      : thisWeekNew > 0 ? 100 : 0

    // Contar projetos
    const { count: totalProjects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
    if (projectsError) console.error('Erro ao contar projetos:', projectsError)

    // Usuários pagos — buscar user_ids distintos via stripe_customers
    const { data: activeSubs } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('customer_id')
      .in('status', ['active', 'trialing'])

    const paidCustomerIds = (activeSubs || []).map(s => s.customer_id)
    let paidUserIds: string[] = []

    if (paidCustomerIds.length > 0) {
      const { data: paidCustomers } = await supabaseAdmin
        .from('stripe_customers')
        .select('user_id')
        .in('id', paidCustomerIds)
      paidUserIds = (paidCustomers || []).map(c => c.user_id as string)
    }

    const paidCount = paidUserIds.length

    // Usuários em trial excluindo os que já são pagos
    let trialQuery = supabaseAdmin
      .from('user_subscriptions')
      .select('user_id', { count: 'exact', head: true })
      .eq('is_trial', true)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())

    if (paidUserIds.length > 0) {
      trialQuery = trialQuery.not('user_id', 'in', `(${paidUserIds.map(id => `"${id}"`).join(',')})`)
    }

    const { count: trialUsersCount, error: trialError } = await trialQuery
    if (trialError) console.error('Erro ao contar trial users:', trialError)
    const trialCount = trialUsersCount || 0
    const freeUsers = Math.max(0, totalUsers - paidCount - trialCount)

    // Trials expirando nos próximos 7 dias
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const { count: trialsExpiringSoonCount } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('is_trial', true)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .lte('end_date', sevenDaysFromNow.toISOString())
    const trialsExpiringSoon = trialsExpiringSoonCount || 0

    // Receita do mês corrente (em centavos, como armazenado)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { data: monthlyPaymentsData } = await supabaseAdmin
      .from('stripe_payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', startOfMonth.toISOString())
    const mrr = (monthlyPaymentsData || []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0), 0
    )

    return NextResponse.json({
      totalUsers,
      totalProjects: totalProjects || 0,
      activeUsers,
      systemStatus: 'operational',
      todayLogins,
      weeklyGrowth,
      freeUsers,
      trialUsers: trialCount,
      paidUsers: paidCount,
      newThisWeek: thisWeekNew,
      trialsExpiringSoon,
      mrr,
    })
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
