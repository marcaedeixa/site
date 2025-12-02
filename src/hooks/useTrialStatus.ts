'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export interface TrialStatus {
  isLoading: boolean
  hasActiveSubscription: boolean
  isTrialing: boolean
  trialEndsAt: Date | null
  daysRemaining: number
  isExpired: boolean
  subscriptionStatus: string | null
  planName: string | null
  error: string | null
}

export interface SubscriptionData {
  id: string
  status: string
  plan_name: string
  trial_start: string | null
  trial_end: string | null
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

export function useTrialStatus(user: User | null): TrialStatus & { refresh: () => Promise<void> } {
  const [status, setStatus] = useState<TrialStatus>({
    isLoading: true,
    hasActiveSubscription: false,
    isTrialing: false,
    trialEndsAt: null,
    daysRemaining: 0,
    isExpired: false,
    subscriptionStatus: null,
    planName: null,
    error: null,
  })

  const supabase = createClient()

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setStatus({
        isLoading: false,
        hasActiveSubscription: false,
        isTrialing: false,
        trialEndsAt: null,
        daysRemaining: 0,
        isExpired: false,
        subscriptionStatus: null,
        planName: null,
        error: null,
      })
      return
    }

    try {
      // First check Stripe subscriptions
      const { data: stripeCustomer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (stripeCustomer) {
        // Get subscription from Stripe tables
        const { data: subscription, error: subError } = await supabase
          .from('stripe_subscriptions')
          .select('*')
          .eq('customer_id', stripeCustomer.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (subscription) {
          const now = new Date()
          const isTrialing = subscription.status === 'trialing'
          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null
          const periodEnd = new Date(subscription.current_period_end)
          
          // Calculate days remaining
          let daysRemaining = 0
          if (isTrialing && trialEnd) {
            daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          } else if (subscription.status === 'active') {
            daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          }

          // Check if trial is expired
          const isExpired = isTrialing && trialEnd && trialEnd < now

          setStatus({
            isLoading: false,
            hasActiveSubscription: subscription.status === 'active' || (subscription.status === 'trialing' && !isExpired),
            isTrialing,
            trialEndsAt: trialEnd,
            daysRemaining,
            isExpired,
            subscriptionStatus: subscription.status,
            planName: subscription.plan_name,
            error: null,
          })
          return
        }
      }

      // Check legacy subscription system
      const { data: legacySubscription, error: legacyError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (legacySubscription) {
        const now = new Date()
        const endDate = new Date(legacySubscription.end_date)
        const isExpired = endDate < now
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        const isTrialing = legacySubscription.subscription_plans?.name?.toLowerCase().includes('teste') || 
                           legacySubscription.subscription_plans?.name?.toLowerCase().includes('trial')

        setStatus({
          isLoading: false,
          hasActiveSubscription: !isExpired,
          isTrialing,
          trialEndsAt: isTrialing ? endDate : null,
          daysRemaining,
          isExpired,
          subscriptionStatus: isExpired ? 'expired' : 'active',
          planName: legacySubscription.subscription_plans?.name || null,
          error: null,
        })
        return
      }

      // No subscription found
      setStatus({
        isLoading: false,
        hasActiveSubscription: false,
        isTrialing: false,
        trialEndsAt: null,
        daysRemaining: 0,
        isExpired: true, // Consider as expired if no subscription
        subscriptionStatus: null,
        planName: null,
        error: null,
      })

    } catch (err: any) {
      console.error('Error checking subscription status:', err)
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Erro ao verificar assinatura',
      }))
    }
  }, [user, supabase])

  useEffect(() => {
    checkSubscriptionStatus()
  }, [checkSubscriptionStatus])

  return {
    ...status,
    refresh: checkSubscriptionStatus,
  }
}

// Helper function to check if user has access
export function hasSubscriptionAccess(status: TrialStatus): boolean {
  if (status.isLoading) return true // Assume access while loading
  return status.hasActiveSubscription && !status.isExpired
}

// Helper function to get friendly status message
export function getStatusMessage(status: TrialStatus): string {
  if (status.isLoading) return 'Verificando assinatura...'
  
  if (status.isExpired) {
    if (status.isTrialing) {
      return 'Seu período de teste expirou'
    }
    return 'Sua assinatura expirou'
  }
  
  if (status.isTrialing) {
    if (status.daysRemaining === 0) {
      return 'Último dia do período de teste'
    }
    if (status.daysRemaining === 1) {
      return '1 dia restante no período de teste'
    }
    return `${status.daysRemaining} dias restantes no período de teste`
  }
  
  if (status.hasActiveSubscription) {
    return `Assinatura ativa: ${status.planName || 'Plano'}`
  }
  
  return 'Sem assinatura ativa'
}

// Helper function to get status color
export function getStatusColor(status: TrialStatus): 'green' | 'yellow' | 'red' | 'gray' {
  if (status.isLoading) return 'gray'
  
  if (status.isExpired) return 'red'
  
  if (status.isTrialing) {
    if (status.daysRemaining <= 2) return 'yellow'
    return 'green'
  }
  
  if (status.hasActiveSubscription) return 'green'
  
  return 'red'
}

