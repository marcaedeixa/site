import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Rotas que requerem assinatura ativa
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/api/protected'
]

// Rotas que requerem plano premium
const PREMIUM_ROUTES = [
  '/analytics',
  '/reports',
  '/api/premium',
  '/integrations'
]

// Funcionalidades por plano
const PLAN_FEATURES = {
  'Teste Gratuito': [
    'Funcionalidades básicas',
    'Suporte por email',
    'Limite de 10 ações por dia'
  ],
  'Plano Básico': [
    'Todas as funcionalidades básicas',
    'Suporte prioritário', 
    'Limite de 100 ações por dia',
    'Relatórios básicos'
  ],
  'Plano Premium': [
    'Todas as funcionalidades',
    'Suporte 24/7',
    'Ações ilimitadas',
    'Relatórios avançados',
    'API access',
    'Integrações premium'
  ]
}

export async function subscriptionMiddleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Pular verificação para rotas públicas
  if (!isProtectedRoute(pathname)) {
    return response
  }

  try {
    // Criar cliente Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar assinatura ativa
    const { data: activePlan, error: subscriptionError } = await supabase
      .rpc('get_user_active_plan', { user_uuid: user.id })

    if (subscriptionError) {
      console.error('Erro ao verificar assinatura:', subscriptionError)
      return NextResponse.redirect(new URL('/subscription-error', request.url))
    }

    // Se não tem assinatura ativa, redirecionar para página de planos
    if (!activePlan || activePlan.length === 0) {
      return NextResponse.redirect(new URL('/plans', request.url))
    }

    const subscription = activePlan[0]
    
    // Verificar se a assinatura expirou
    const now = new Date()
    const endDate = new Date(subscription.end_date)
    
    if (now >= endDate) {
      return NextResponse.redirect(new URL('/subscription-expired', request.url))
    }

    // Verificar se a rota requer plano premium
    if (isPremiumRoute(pathname)) {
      const planFeatures = PLAN_FEATURES[subscription.plan_name as keyof typeof PLAN_FEATURES] || []
      
      if (!planFeatures.includes('Todas as funcionalidades')) {
        return NextResponse.redirect(new URL('/upgrade-required', request.url))
      }
    }

    // Adicionar informações da assinatura aos headers para uso nas páginas
    response.headers.set('x-user-subscription', JSON.stringify({
      plan_name: subscription.plan_name,
      is_trial: subscription.is_trial,
      days_remaining: subscription.days_remaining,
      features: subscription.features
    }))

    return response
  } catch (error) {
    console.error('Erro no middleware de assinatura:', error)
    return NextResponse.redirect(new URL('/error', request.url))
  }
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

function isPremiumRoute(pathname: string): boolean {
  return PREMIUM_ROUTES.some(route => pathname.startsWith(route))
}

// Função para verificar se o usuário tem uma funcionalidade específica
export async function hasFeature(userId: string, feature: string): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {},
      }
    )

    const { data: activePlan } = await supabase
      .rpc('get_user_active_plan', { user_uuid: userId })

    if (!activePlan || activePlan.length === 0) {
      return false
    }

    const subscription = activePlan[0]
    const features = subscription.features || []
    
    return features.includes(feature)
  } catch (error) {
    console.error('Erro ao verificar funcionalidade:', error)
    return false
  }
}

// Função para verificar limites de uso
export async function checkUsageLimit(userId: string, action: string): Promise<{ allowed: boolean, remaining: number }> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {},
      }
    )

    const { data: activePlan } = await supabase
      .rpc('get_user_active_plan', { user_uuid: userId })

    if (!activePlan || activePlan.length === 0) {
      return { allowed: false, remaining: 0 }
    }

    const subscription = activePlan[0]
    const planName = subscription.plan_name
    
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
    
    const { count: usageCount } = await supabase
      .from('user_actions') // Assumindo que existe uma tabela para rastrear ações
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', action)
      .gte('created_at', today.toISOString())

    const remaining = Math.max(0, planLimits.daily_actions - (usageCount || 0))
    const allowed = remaining > 0

    return { allowed, remaining }
  } catch (error) {
    console.error('Erro ao verificar limite de uso:', error)
    return { allowed: false, remaining: 0 }
  }
}