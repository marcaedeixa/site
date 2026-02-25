import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Obter estatísticas usando service role
    const supabaseAdmin = await createClient(true) // service role
    
    // Contar usuários
    const { count: totalUsers } = await supabaseAdmin
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
    
    // Contar projetos
    const { count: totalProjects } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    // Calcular usuários ativos (últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: activeUsers } = await supabaseAdmin
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString())
    
    // Calcular logins de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayLogins } = await supabaseAdmin
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', today.toISOString())

    const stats = {
      totalUsers: totalUsers || 0,
      totalProjects: totalProjects || 0,
      activeUsers: activeUsers || 0,
      systemStatus: 'operational',
      todayLogins: todayLogins || 0,
      weeklyGrowth: 12.5 // Simulado por enquanto
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
