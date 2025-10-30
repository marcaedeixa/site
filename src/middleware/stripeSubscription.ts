import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Rotas que requerem assinatura ativa do Stripe
const STRIPE_PROTECTED_ROUTES = [
  '/dashboard/premium',
  '/dashboard/analytics',
  '/dashboard/integrations',
  '/api/premium'
]

// Rotas que requerem plano premium
const PREMIUM_ONLY_ROUTES = [
  '/dashboard/premium',
  '/dashboard/analytics',
  '/dashboard/integrations',
  '/api/premium'
]

// Rotas que permitem período de teste
const TRIAL_ALLOWED_ROUTES = [
  '/dashboard',
  '/dashboard/projects',
  '/dashboard/settings'
]

export async function checkStripeSubscription(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname

  // Skip check for non-protected routes
  if (!STRIPE_PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    return response
  }

  try {
    // Create Supabase client
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check for active Stripe subscription
    const { data: stripeSubscription, error: subError } = await supabase
      .from('stripe_subscriptions')
      .select(`
        *,
        stripe_customers!inner(user_id)
      `)
      .eq('stripe_customers.user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If no Stripe subscription, check for local subscription (trial)
    if (subError || !stripeSubscription) {
      const { data: localSubscription } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // If accessing trial-allowed routes and has local trial subscription
      if (localSubscription && 
          localSubscription.subscription_plans?.is_trial &&
          TRIAL_ALLOWED_ROUTES.some(route => pathname.startsWith(route))) {
        return response
      }

      // No valid subscription found
      return NextResponse.redirect(new URL('/plans?reason=subscription_required', request.url))
    }

    // Check if route requires premium and user has basic plan
    if (PREMIUM_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
      const isPremium = stripeSubscription.plan_name.toLowerCase().includes('premium')
      
      if (!isPremium) {
        return NextResponse.redirect(new URL('/plans?reason=premium_required', request.url))
      }
    }

    // Check subscription status
    if (stripeSubscription.status === 'past_due') {
      return NextResponse.redirect(new URL('/dashboard/subscription?reason=payment_failed', request.url))
    }

    if (stripeSubscription.status === 'canceled') {
      return NextResponse.redirect(new URL('/plans?reason=subscription_canceled', request.url))
    }

    // Check if subscription is expired
    const endDate = new Date(stripeSubscription.current_period_end)
    const now = new Date()
    
    if (endDate < now && stripeSubscription.status !== 'trialing') {
      return NextResponse.redirect(new URL('/plans?reason=subscription_expired', request.url))
    }

    // All checks passed
    return response

  } catch (error) {
    console.error('Error checking Stripe subscription:', error)
    
    // On error, redirect to plans page
    return NextResponse.redirect(new URL('/plans?reason=error', request.url))
  }
}

// Helper function to check if user has feature access
export async function hasStripeFeatureAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      }
    )

    // Check Stripe subscription
    const { data: stripeSubscription } = await supabase
      .from('stripe_subscriptions')
      .select(`
        *,
        stripe_customers!inner(user_id)
      `)
      .eq('stripe_customers.user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (stripeSubscription) {
      return checkFeatureAccess(stripeSubscription.plan_name, feature)
    }

    // Check local subscription (trial)
    const { data: localSubscription } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (localSubscription?.subscription_plans) {
      return checkFeatureAccess(localSubscription.subscription_plans.name, feature)
    }

    return false

  } catch (error) {
    console.error('Error checking feature access:', error)
    return false
  }
}

// Helper function to determine feature access based on plan
function checkFeatureAccess(planName: string, feature: string): boolean {
  const planFeatures: Record<string, string[]> = {
    'trial': [
      'dashboard',
      'projects_limited',
      'basic_reports'
    ],
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
      'custom_branding',
      'analytics',
      'premium_features'
    ]
  }

  // Determine plan type
  let planType = 'trial'
  if (planName.toLowerCase().includes('básico') || planName.toLowerCase().includes('basic')) {
    planType = 'basic'
  } else if (planName.toLowerCase().includes('premium')) {
    planType = 'premium'
  }

  const allowedFeatures = planFeatures[planType] || []
  return allowedFeatures.includes(feature)
}

// Helper function to get subscription info for API responses
export async function getSubscriptionInfo(userId: string): Promise<{
  hasActiveSubscription: boolean
  planName: string | null
  status: string | null
  isTrialing: boolean
  isPremium: boolean
  expiresAt: string | null
}> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      }
    )

    // Check Stripe subscription first
    const { data: stripeSubscription } = await supabase
      .from('stripe_subscriptions')
      .select(`
        *,
        stripe_customers!inner(user_id)
      `)
      .eq('stripe_customers.user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (stripeSubscription) {
      return {
        hasActiveSubscription: ['active', 'trialing'].includes(stripeSubscription.status),
        planName: stripeSubscription.plan_name,
        status: stripeSubscription.status,
        isTrialing: stripeSubscription.status === 'trialing',
        isPremium: stripeSubscription.plan_name.toLowerCase().includes('premium'),
        expiresAt: stripeSubscription.current_period_end
      }
    }

    // Check local subscription
    const { data: localSubscription } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (localSubscription?.subscription_plans) {
      return {
        hasActiveSubscription: true,
        planName: localSubscription.subscription_plans.name,
        status: 'active',
        isTrialing: localSubscription.subscription_plans.is_trial,
        isPremium: false,
        expiresAt: localSubscription.end_date
      }
    }

    return {
      hasActiveSubscription: false,
      planName: null,
      status: null,
      isTrialing: false,
      isPremium: false,
      expiresAt: null
    }

  } catch (error) {
    console.error('Error getting subscription info:', error)
    return {
      hasActiveSubscription: false,
      planName: null,
      status: null,
      isTrialing: false,
      isPremium: false,
      expiresAt: null
    }
  }
}