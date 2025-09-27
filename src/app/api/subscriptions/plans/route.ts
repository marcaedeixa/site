import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })

    if (error) {
      console.error('Erro ao buscar planos:', error)
      return NextResponse.json(
        { error: 'Erro ao carregar planos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar se é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se é admin (assumindo que existe uma tabela admin_users)
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, price_monthly, price_yearly, duration_days, features, is_trial } = body

    // Validar dados
    if (!name || !description || duration_days === undefined) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    const { data: newPlan, error } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        description,
        price_monthly: price_monthly || 0,
        price_yearly,
        duration_days,
        features: features || [],
        is_trial: is_trial || false
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar plano:', error)
      return NextResponse.json(
        { error: 'Erro ao criar plano' },
        { status: 500 }
      )
    }

    return NextResponse.json({ plan: newPlan }, { status: 201 })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}