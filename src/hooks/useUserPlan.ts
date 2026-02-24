'use client'

import { useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import {
  type PlanTier,
  type PlanLimits,
  type PlanDefinition,
  PLANS,
  getLimitsForTier,
  getTierFromPlanName,
  canCreate,
  getLimitReachedMessage,
} from '@/lib/plan-config'

export interface UserPlanInfo {
  /** O tier atual do usuário (free ou pro) */
  tier: PlanTier
  /** Definição completa do plano */
  plan: PlanDefinition
  /** Limites do plano atual */
  limits: PlanLimits
  /** Se o plano é pago (pro) */
  isPro: boolean
  /** Se o usuário tem assinatura ativa */
  hasActiveSubscription: boolean
  /** Se ainda está carregando */
  isLoading: boolean
  /** Helper: verifica se pode criar mais de um recurso */
  canCreate: (currentCount: number, limitKey: keyof PlanLimits) => boolean
  /** Helper: retorna mensagem de limite atingido */
  getLimitMessage: (limitKey: keyof PlanLimits) => string
}

/**
 * Hook que retorna informações do plano do usuário com limites tipados.
 *
 * Usa o `useTrialStatus` existente para determinar a assinatura e
 * mapeia para o tier correto via `plan-config`.
 *
 * Lógica:
 *   - Se tem assinatura Stripe ativa com plan_name mapeável → tier correspondente
 *   - Se tem assinatura legacy ativa → tier correspondente
 *   - Caso contrário → free (plano gratuito permanente)
 */
export function useUserPlan(user: User | null): UserPlanInfo {
  const trialStatus = useTrialStatus(user)

  const tier: PlanTier = useMemo(() => {
    if (trialStatus.isLoading) return 'free'

    // Usuário com assinatura ativa → determinar tier pelo nome do plano
    if (trialStatus.hasActiveSubscription && trialStatus.planName) {
      return getTierFromPlanName(trialStatus.planName)
    }

    // Sem assinatura ou expirada → free (permanente)
    return 'free'
  }, [trialStatus.isLoading, trialStatus.hasActiveSubscription, trialStatus.planName])

  const limits = useMemo(() => getLimitsForTier(tier), [tier])
  const plan = PLANS[tier]

  return {
    tier,
    plan,
    limits,
    isPro: tier === 'pro',
    hasActiveSubscription: trialStatus.hasActiveSubscription,
    isLoading: trialStatus.isLoading,
    canCreate: (currentCount: number, limitKey: keyof PlanLimits) =>
      canCreate(currentCount, limitKey, tier),
    getLimitMessage: (limitKey: keyof PlanLimits) =>
      getLimitReachedMessage(limitKey, tier),
  }
}
