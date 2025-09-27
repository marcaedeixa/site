'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'

export interface StripeSubscription {
  id: string
  stripe_subscription_id: string
  status: string
  plan_id: string
  plan_name: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string
  trial_start?: string
  trial_end?: string
}

export interface StripeCustomer {
  id: string
  stripe_customer_id: string
  email: string
  name?: string
}

export interface UseStripeSubscriptionReturn {
  subscription: StripeSubscription | null
  customer: StripeCustomer | null
  loading: boolean
  error: string | null
  hasActiveSubscription: boolean
  isTrialing: boolean
  isPastDue: boolean
  refreshSubscription: () => Promise<void>
  cancelSubscription: (immediate?: boolean) => Promise<boolean>
  openBillingPortal: () => Promise<void>
}

export function useStripeSubscription(user: User | null): UseStripeSubscriptionReturn {
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null)
  const [customer, setCustomer] = useState<StripeCustomer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSubscriptionData = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setCustomer(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Load subscription data
      const response = await fetch(`/api/stripe/subscriptions?userId=${user.id}`)
      const data = await response.json()

      if (response.ok) {
        setSubscription(data.activeSubscription)
      } else {
        setError(data.error || 'Erro ao carregar assinatura')
      }

      // Load customer data
      const customerResponse = await fetch(`/api/stripe/customers?userId=${user.id}`)
      const customerData = await customerResponse.json()

      if (customerResponse.ok) {
        setCustomer(customerData.customer)
      }

    } catch (err) {
      setError('Erro ao carregar dados da assinatura')
      console.error('Error loading subscription data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const refreshSubscription = async () => {
    await loadSubscriptionData()
  }

  const cancelSubscription = async (immediate: boolean = false): Promise<boolean> => {
    if (!subscription) {
      setError('Nenhuma assinatura ativa encontrada')
      return false
    }

    try {
      const response = await fetch('/api/stripe/subscriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          action: immediate ? 'cancel_immediately' : 'cancel'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await refreshSubscription()
        return true
      } else {
        setError(data.error || 'Erro ao cancelar assinatura')
        return false
      }
    } catch (err) {
      setError('Erro ao cancelar assinatura')
      console.error('Error canceling subscription:', err)
      return false
    }
  }

  const openBillingPortal = async (): Promise<void> => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    try {
      const response = await fetch(`/api/stripe/checkout?userId=${user.id}&action=billing_portal`)
      const data = await response.json()

      if (response.ok) {
        window.open(data.portalUrl, '_blank')
      } else {
        setError(data.error || 'Erro ao abrir portal de cobrança')
      }
    } catch (err) {
      setError('Erro ao abrir portal de cobrança')
      console.error('Error opening billing portal:', err)
    }
  }

  // Load data when user changes
  useEffect(() => {
    loadSubscriptionData()
  }, [user, loadSubscriptionData])

  // Computed properties
  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isTrialing = subscription?.status === 'trialing'
  const isPastDue = subscription?.status === 'past_due'

  return {
    subscription,
    customer,
    loading,
    error,
    hasActiveSubscription,
    isTrialing,
    isPastDue,
    refreshSubscription,
    cancelSubscription,
    openBillingPortal,
  }
}

// Helper function to check if user has access to a feature based on subscription
export function hasFeatureAccess(
  subscription: StripeSubscription | null,
  feature: string
): boolean {
  if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
    return false
  }

  // Define feature access based on plan
  const planFeatures: Record<string, string[]> = {
    'basic': [
      'dashboard',
      'projects_limited',
      'email_support',
      'basic_reports'
    ],
    'premium': [
      'dashboard',
      'projects_unlimited',
      'priority_support',
      'advanced_reports',
      'api_access',
      'integrations',
      'custom_branding'
    ]
  }

  // Determine plan type from plan name
  let planType = 'basic'
  if (subscription.plan_name.toLowerCase().includes('premium')) {
    planType = 'premium'
  }

  const allowedFeatures = planFeatures[planType] || []
  return allowedFeatures.includes(feature)
}

// Helper function to get subscription status display
export function getSubscriptionStatusDisplay(subscription: StripeSubscription | null): {
  label: string
  color: string
  description: string
} {
  if (!subscription) {
    return {
      label: 'Sem Assinatura',
      color: 'gray',
      description: 'Nenhuma assinatura ativa'
    }
  }

  switch (subscription.status) {
    case 'active':
      return {
        label: 'Ativa',
        color: 'green',
        description: 'Sua assinatura está ativa'
      }
    case 'trialing':
      return {
        label: 'Período de Teste',
        color: 'blue',
        description: 'Você está no período de teste'
      }
    case 'past_due':
      return {
        label: 'Vencida',
        color: 'yellow',
        description: 'Pagamento em atraso'
      }
    case 'canceled':
      return {
        label: 'Cancelada',
        color: 'red',
        description: 'Assinatura cancelada'
      }
    case 'incomplete':
      return {
        label: 'Incompleta',
        color: 'orange',
        description: 'Pagamento pendente'
      }
    default:
      return {
        label: 'Desconhecido',
        color: 'gray',
        description: 'Status desconhecido'
      }
  }
}

// Helper function to format subscription dates
export function formatSubscriptionDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Helper function to calculate days until next billing
export function getDaysUntilNextBilling(subscription: StripeSubscription | null): number {
  if (!subscription || !subscription.current_period_end) {
    return 0
  }

  const endDate = new Date(subscription.current_period_end)
  const today = new Date()
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}