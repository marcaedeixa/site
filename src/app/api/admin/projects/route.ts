import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
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

    // Obter projetos usando service role
    const supabaseAdmin = createClient(true) // service role
    
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name, description, created_at, updated_at, user_id')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (projectsError) {
      throw projectsError
    }

    // Contar total de projetos
    const { count: totalCount } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      projects: projects || [],
      total: totalCount || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Erro ao obter projetos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}