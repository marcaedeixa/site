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

    // Obter usuários usando service role
    const supabaseAdmin = await createClient(true) // service role
    
    const page = Math.floor(offset / limit) + 1

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit
    })
    
    if (usersError) {
      throw usersError
    }

    const users = (usersData?.users || []).map((entry) => ({
      id: entry.id,
      email: entry.email,
      created_at: entry.created_at,
      last_sign_in_at: entry.last_sign_in_at
    }))

    const totalCount = usersData?.total ?? 0

    return NextResponse.json({
      users: users || [],
      total: totalCount || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Erro ao obter usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
