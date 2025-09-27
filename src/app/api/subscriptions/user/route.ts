import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar assinatura ativa do usuário
    const { data: activePlan, error } = await supabase
      .rpc('get_user_active_plan', { user_uuid: user.id })

    if (error) {
      console.error('Erro ao buscar assinatura:', error)
      return NextResponse.json(
        { error: 'Erro ao carregar assinatura' },
        { status: 500 }
      )
    }

    const subscription = activePlan && activePlan.length > 0 ? activePlan[0] : null

    return NextResponse.json({ subscription })
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { plan_id } = body

    if (!plan_id) {
      return NextResponse.json(
        { error: 'ID do plano é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar informações do plano
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário já tem uma assinatura ativa
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .single()

    // Se é um plano de teste, verificar se já foi usado
    if (plan.is_trial) {
      const { data: trialUsed } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('trial_used', true)
        .single()

      if (trialUsed) {
        return NextResponse.json(
          { error: 'Período de teste já foi utilizado' },
          { status: 400 }
        )
      }
    }

    // Cancelar assinatura existente se houver
    if (existingSubscription) {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', existingSubscription.id)

      // Registrar cancelamento no histórico
      await supabase
        .from('subscription_history')
        .insert({
          user_id: user.id,
          subscription_id: existingSubscription.id,
          action: 'cancelled',
          old_plan_id: existingSubscription.plan_id,
          details: { reason: 'upgrade', cancelled_at: new Date().toISOString() }
        })
    }

    // Criar nova assinatura
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + plan.duration_days)

    const { data: newSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: plan_id,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_trial: plan.is_trial,
        trial_used: plan.is_trial,
        auto_renew: !plan.is_trial
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Erro ao criar assinatura:', subscriptionError)
      return NextResponse.json(
        { error: 'Erro ao processar assinatura' },
        { status: 500 }
      )
    }

    // Registrar criação no histórico
    await supabase
      .from('subscription_history')
      .insert({
        user_id: user.id,
        subscription_id: newSubscription.id,
        action: 'created',
        new_plan_id: plan_id,
        details: { 
          type: plan.is_trial ? 'trial' : 'paid',
          plan_name: plan.name,
          duration_days: plan.duration_days
        }
      })

    // Buscar a assinatura criada com informações do plano
    const { data: createdSubscription } = await supabase
      .rpc('get_user_active_plan', { user_uuid: user.id })

    return NextResponse.json({ 
      subscription: createdSubscription?.[0] || null,
      message: 'Assinatura criada com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar assinatura ativa
    const { data: activeSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .single()

    if (!activeSubscription) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada' },
        { status: 404 }
      )
    }

    // Cancelar assinatura
    const { error: cancelError } = await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', activeSubscription.id)

    if (cancelError) {
      console.error('Erro ao cancelar assinatura:', cancelError)
      return NextResponse.json(
        { error: 'Erro ao cancelar assinatura' },
        { status: 500 }
      )
    }

    // Registrar cancelamento no histórico
    await supabase
      .from('subscription_history')
      .insert({
        user_id: user.id,
        subscription_id: activeSubscription.id,
        action: 'cancelled',
        old_plan_id: activeSubscription.plan_id,
        details: { 
          reason: 'user_request',
          cancelled_at: new Date().toISOString()
        }
      })

    return NextResponse.json({ 
      message: 'Assinatura cancelada com sucesso'
    })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}