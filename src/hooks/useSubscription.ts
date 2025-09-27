'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly?: number
  duration_days: number
  features: string[]
  is_trial: boolean
  is_active: boolean
}

export interface UserSubscription {
  subscription_id: string
  plan_id: string
  plan_name: string
  features: string[]
  is_trial: boolean
  end_date: string
  days_remaining: number
  status: 'active' | 'expired' | 'cancelled'
}

export interface UseSubscriptionReturn {
  subscription: UserSubscription | null
  plans: SubscriptionPlan[]
  loading: boolean
  error: string | null
  hasActiveSubscription: boolean
  isTrialActive: boolean
  daysRemaining: number
  refreshSubscription: () => Promise<void>
  subscribeToPlan: (planId: string) => Promise<boolean>
  cancelSubscription: () => Promise<boolean>
  hasFeature: (feature: string) => boolean
}

export function useSubscription(user?: User | null): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Carregar planos disponíveis
  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (err) {
      console.error('Erro ao carregar planos:', err)
      setError('Erro ao carregar planos de assinatura')
    }
  }

  // Carregar assinatura ativa do usuário
  const loadUserSubscription = async () => {
    if (!user?.id) {
      setSubscription(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Usar a função SQL para obter o plano ativo
      const { data, error } = await supabase
        .rpc('get_user_active_plan', { user_uuid: user.id })

      if (error) throw error

      if (data && data.length > 0) {
        const activePlan = data[0]
        setSubscription({
          subscription_id: activePlan.subscription_id,
          plan_id: activePlan.plan_id,
          plan_name: activePlan.plan_name,
          features: activePlan.features || [],
          is_trial: activePlan.is_trial,
          end_date: activePlan.end_date,
          days_remaining: Math.max(0, activePlan.days_remaining || 0),
          status: 'active'
        })
      } else {
        setSubscription(null)
      }
    } catch (err) {
      console.error('Erro ao carregar assinatura:', err)
      setError('Erro ao carregar informações da assinatura')
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  // Assinar um plano
  const subscribeToPlan = async (planId: string): Promise<boolean> => {
    if (!user?.id) {
      setError('Usuário não autenticado')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar informações do plano
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (planError) throw planError

      // Cancelar assinatura ativa se existir
      if (subscription) {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', subscription.subscription_id)
      }

      // Criar nova assinatura
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + plan.duration_days)

      const { data: newSubscription, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          is_trial: plan.is_trial,
          trial_used: plan.is_trial
        })
        .select()
        .single()

      if (subscriptionError) throw subscriptionError

      // Registrar no histórico
      await supabase
        .from('subscription_history')
        .insert({
          user_id: user.id,
          subscription_id: newSubscription.id,
          action: 'created',
          new_plan_id: planId,
          details: { type: plan.is_trial ? 'trial' : 'paid' }
        })

      // Recarregar assinatura
      await loadUserSubscription()
      return true
    } catch (err) {
      console.error('Erro ao assinar plano:', err)
      setError('Erro ao processar assinatura')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Cancelar assinatura
  const cancelSubscription = async (): Promise<boolean> => {
    if (!user?.id || !subscription) {
      setError('Nenhuma assinatura ativa encontrada')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.subscription_id)

      if (error) throw error

      // Registrar no histórico
      await supabase
        .from('subscription_history')
        .insert({
          user_id: user.id,
          subscription_id: subscription.subscription_id,
          action: 'cancelled',
          old_plan_id: subscription.plan_id,
          details: { cancelled_at: new Date().toISOString() }
        })

      // Recarregar assinatura
      await loadUserSubscription()
      return true
    } catch (err) {
      console.error('Erro ao cancelar assinatura:', err)
      setError('Erro ao cancelar assinatura')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Atualizar dados
  const refreshSubscription = async () => {
    await Promise.all([loadPlans(), loadUserSubscription()])
  }

  // Verificar se tem uma funcionalidade específica
  const hasFeature = (feature: string): boolean => {
    if (!subscription) return false
    return subscription.features.includes(feature)
  }

  // Computed values
  const hasActiveSubscription = subscription !== null && subscription.days_remaining > 0
  const isTrialActive = subscription?.is_trial && hasActiveSubscription
  const daysRemaining = subscription?.days_remaining || 0

  // Effects
  useEffect(() => {
    loadPlans()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadUserSubscription()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Verificar expiração periodicamente
  useEffect(() => {
    if (!subscription) return

    const checkExpiration = () => {
      const now = new Date()
      const endDate = new Date(subscription.end_date)
      
      if (now >= endDate) {
        loadUserSubscription() // Recarregar para atualizar status
      }
    }

    // Verificar a cada minuto
    const interval = setInterval(checkExpiration, 60000)
    return () => clearInterval(interval)
  }, [subscription]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    subscription,
    plans,
    loading,
    error,
    hasActiveSubscription,
    isTrialActive,
    daysRemaining,
    refreshSubscription,
    subscribeToPlan,
    cancelSubscription,
    hasFeature
  }
}