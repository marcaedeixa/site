/**
 * Configuração centralizada de planos e limites.
 *
 * Fonte única de verdade — todos os limites, preços e features referenciados
 * pela aplicação devem vir daqui.
 *
 * Modelo de negócio:
 *   - Gratuito: permanente, sem expiração, com limites reduzidos.
 *   - Pago (Pro): R$ 5/mês ou R$ 50/ano, com limites ampliados.
 *   - Todos os planos: caixas de texto, formas e setas ilimitadas.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'pro'

export interface PlanLimits {
  /** Máximo de atores por projeto */
  maxActorsPerProject: number
  /** Máximo de objetos por projeto */
  maxObjectsPerProject: number
  /** Máximo de cenas por projeto */
  maxScenesPerProject: number
  /** Máximo de projetos por usuário */
  maxProjects: number
}

export interface PlanDefinition {
  tier: PlanTier
  name: string
  description: string
  limits: PlanLimits
  features: string[]
  prices: {
    monthly: { amount: number; interval: 'month' }
    yearly: { amount: number; interval: 'year' }
  } | null // null para plano gratuito
}

// ---------------------------------------------------------------------------
// Definições dos planos
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxActorsPerProject: 7,
    maxObjectsPerProject: 7,
    maxScenesPerProject: 50,
    maxProjects: 3,
  },
  pro: {
    maxActorsPerProject: 40,
    maxObjectsPerProject: 30,
    maxScenesPerProject: 300,
    maxProjects: 30,
  },
} as const

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: 'free',
    name: 'Plano Gratuito',
    description: 'Para começar a organizar suas marcações',
    limits: PLAN_LIMITS.free,
    features: [
      `Até ${PLAN_LIMITS.free.maxActorsPerProject} atores por projeto`,
      `Até ${PLAN_LIMITS.free.maxObjectsPerProject} objetos por projeto`,
      `Até ${PLAN_LIMITS.free.maxScenesPerProject} cenas por projeto`,
      `Até ${PLAN_LIMITS.free.maxProjects} projetos`,
      'Caixas de texto, formas e setas ilimitadas',
      'Editor completo',
      'Exportação básica',
      'Sem limite de tempo',
    ],
    prices: null,
  },
  pro: {
    tier: 'pro',
    name: 'Plano Pro',
    description: 'Acesso completo para profissionais',
    limits: PLAN_LIMITS.pro,
    features: [
      `Até ${PLAN_LIMITS.pro.maxActorsPerProject} atores por projeto`,
      `Até ${PLAN_LIMITS.pro.maxObjectsPerProject} objetos por projeto`,
      `Até ${PLAN_LIMITS.pro.maxScenesPerProject} cenas por projeto`,
      `Até ${PLAN_LIMITS.pro.maxProjects} projetos`,
      'Caixas de texto, formas e setas ilimitadas',
      'Editor avançado',
      'Exportação em alta qualidade',
      'Suporte prioritário',
    ],
    prices: {
      monthly: { amount: 500, interval: 'month' },   // R$ 5,00
      yearly: { amount: 5000, interval: 'year' },     // R$ 50,00
    },
  },
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retorna os limites do plano com base no tier.
 * Default: free.
 */
export function getLimitsForTier(tier: PlanTier | null | undefined): PlanLimits {
  if (tier && tier in PLAN_LIMITS) {
    return PLAN_LIMITS[tier]
  }
  return PLAN_LIMITS.free
}

/**
 * Determina o tier do plano a partir do nome salvo no banco (plan_name).
 * Aceita variações como "Plano Pro", "Pro", "Plano Básico", "Premium", etc.
 * Retorna 'free' quando não consegue mapear.
 */
export function getTierFromPlanName(planName: string | null | undefined): PlanTier {
  if (!planName) return 'free'
  const normalized = planName.toLowerCase().trim()

  // Mapear nomes antigos (basic/premium) e novos (pro)
  if (
    normalized.includes('pro') ||
    normalized.includes('premium') ||
    normalized.includes('básico') ||
    normalized.includes('basic') ||
    normalized.includes('pago')
  ) {
    return 'pro'
  }

  return 'free'
}

/**
 * Verifica se um determinado recurso excede o limite do plano.
 * Retorna `true` se ainda há espaço, `false` se o limite foi atingido.
 */
export function canCreate(
  currentCount: number,
  limitKey: keyof PlanLimits,
  tier: PlanTier | null | undefined,
): boolean {
  const limits = getLimitsForTier(tier)
  return currentCount < limits[limitKey]
}

/**
 * Retorna a mensagem de erro padrão quando o limite foi atingido.
 */
export function getLimitReachedMessage(
  limitKey: keyof PlanLimits,
  tier: PlanTier | null | undefined,
): string {
  const limits = getLimitsForTier(tier)
  const limit = limits[limitKey]
  const isPro = tier === 'pro'

  const labels: Record<keyof PlanLimits, string> = {
    maxActorsPerProject: 'atores por projeto',
    maxObjectsPerProject: 'objetos por projeto',
    maxScenesPerProject: 'cenas por projeto',
    maxProjects: 'projetos',
  }

  const base = `Limite máximo de ${limit} ${labels[limitKey]} atingido`
  if (!isPro) {
    return `${base}. Faça upgrade para o Plano Pro para ter limites maiores.`
  }
  return `${base}.`
}
