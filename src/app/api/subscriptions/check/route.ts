import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { feature, action } = body

    // Buscar assinatura ativa do usuário
    const { data: activePlan, error } = await supabase
      .rpc('get_user_active_plan', { user_uuid: user.id })

    if (error) {
      console.error('Erro ao buscar assinatura:', error)
      return NextResponse.json(
        { error: 'Erro ao verificar assinatura' },
        { status: 500 }
      )
    }

    const subscription = activePlan && activePlan.length > 0 ? activePlan[0] : null

    // Se não tem assinatura ativa
    if (!subscription) {
      return NextResponse.json({
        hasAccess: false,
        hasFeature: false,
        usageAllowed: false,
        remaining: 0,
        message: 'Nenhuma assinatura ativa encontrada'
      })
    }

    // Verificar se a assinatura expirou
    const now = new Date()
    const endDate = new Date(subscription.end_date)
    
    if (now >= endDate) {
      return NextResponse.json({
        hasAccess: false,
        hasFeature: false,
        usageAllowed: false,
        remaining: 0,
        message: 'Assinatura expirada'
      })
    }

    // Verificar funcionalidade específica
    let hasFeature = true
    if (feature) {
      const features = subscription.features || []
      hasFeature = features.includes(feature)
    }

    // Verificar limites de uso
    let usageAllowed = true
    let remaining = -1 // -1 significa ilimitado

    if (action) {
      const usageCheck = await checkUsageLimit(user.id, action, subscription.plan_name)
      usageAllowed = usageCheck.allowed
      remaining = usageCheck.remaining
    }

    return NextResponse.json({
      hasAccess: true,
      hasFeature,
      usageAllowed,
      remaining,
      subscription: {
        plan_name: subscription.plan_name,
        is_trial: subscription.is_trial,
        days_remaining: subscription.days_remaining,
        end_date: subscription.end_date
      }
    })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para verificar limites de uso
async function checkUsageLimit(userId: string, action: string, planName: string) {
  try {
    const supabase = await createClient()
    
    // Definir limites por plano
    const limits = {
      'Teste Gratuito': { daily_actions: 10 },
      'Plano Básico': { daily_actions: 100 },
      'Plano Premium': { daily_actions: -1 } // Ilimitado
    }

    const planLimits = limits[planName as keyof typeof limits]
    
    if (!planLimits) {
      return { allowed: false, remaining: 0 }
    }

    // Se é ilimitado
    if (planLimits.daily_actions === -1) {
      return { allowed: true, remaining: -1 }
    }

    // Verificar uso atual do dia
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Criar tabela de ações se não existir (simulação)
    // Na prática, você criaria esta tabela na migração
    const { count: usageCount } = await supabase
      .from('user_actions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', action)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    const currentUsage = usageCount || 0
    const remaining = Math.max(0, planLimits.daily_actions - currentUsage)
    const allowed = remaining > 0

    return { allowed, remaining }
  } catch (error) {
    console.error('Erro ao verificar limite de uso:', error)
    // Em caso de erro, permitir a ação (fail-safe)
    return { allowed: true, remaining: -1 }
  }
}

// Endpoint para registrar uma ação
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, metadata } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Ação é obrigatória' },
        { status: 400 }
      )
    }

    // Registrar a ação (assumindo que a tabela user_actions existe)
    const { error: insertError } = await supabase
      .from('user_actions')
      .insert({
        user_id: user.id,
        action_type: action,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Erro ao registrar ação:', insertError)
      // Não falhar se não conseguir registrar a ação
    }

    return NextResponse.json({ 
      message: 'Ação registrada com sucesso'
    })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}