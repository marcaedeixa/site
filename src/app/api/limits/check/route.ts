import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  type PlanTier,
  type PlanLimits,
  PLAN_LIMITS,
  getTierFromPlanName,
  canCreate,
  getLimitReachedMessage,
} from '@/lib/plan-config'

/**
 * POST /api/limits/check
 *
 * Validates server-side whether a user can create a resource based on their
 * plan tier and current usage.
 *
 * Body:
 *   resource: 'actors' | 'objects' | 'scenes' | 'projects'
 *   projectId?: string  (required for actors/objects/scenes — scoped to project)
 *
 * Response:
 *   { allowed: boolean, current: number, max: number, tier: PlanTier, message?: string }
 */

type Resource = 'actors' | 'objects' | 'scenes' | 'projects'

const RESOURCE_TO_LIMIT_KEY: Record<Resource, keyof PlanLimits> = {
  actors: 'maxActorsPerProject',
  objects: 'maxObjectsPerProject',
  scenes: 'maxScenesPerProject',
  projects: 'maxProjects',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { resource, projectId } = body as { resource?: Resource; projectId?: string }

    if (!resource || !RESOURCE_TO_LIMIT_KEY[resource]) {
      return NextResponse.json(
        { error: 'resource inválido. Use: actors, objects, scenes, projects' },
        { status: 400 }
      )
    }

    if (resource !== 'projects' && !projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório para verificar limites de actors/objects/scenes' },
        { status: 400 }
      )
    }

    // Determine user's plan tier
    const tier = await getUserTier(supabase, user.id)

    // Count current usage
    const current = await countResource(supabase, user.id, resource, projectId)

    const limitKey = RESOURCE_TO_LIMIT_KEY[resource]
    const max = PLAN_LIMITS[tier][limitKey]
    const allowed = canCreate(current, limitKey, tier)

    return NextResponse.json({
      allowed,
      current,
      max,
      tier,
      ...(allowed ? {} : { message: getLimitReachedMessage(limitKey, tier) }),
    })
  } catch (error) {
    console.error('Erro ao verificar limites:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * Determine the user's plan tier by checking Stripe subscriptions,
 * then falling back to legacy subscriptions, then defaulting to 'free'.
 */
async function getUserTier(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<PlanTier> {
  // Check Stripe subscriptions first
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (stripeCustomer) {
    const { data: subscription } = await supabase
      .from('stripe_subscriptions')
      .select('plan_name, status')
      .eq('customer_id', stripeCustomer.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscription?.plan_name) {
      return getTierFromPlanName(subscription.plan_name)
    }
  }

  // Check legacy subscription system
  const { data: legacySub } = await supabase
    .from('user_subscriptions')
    .select('subscription_plans(name), end_date, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (legacySub) {
    const endDate = new Date(legacySub.end_date)
    if (endDate > new Date()) {
      const planName = (legacySub.subscription_plans as any)?.name
      if (planName) {
        return getTierFromPlanName(planName)
      }
    }
  }

  return 'free'
}

/**
 * Count the number of existing resources for a user.
 */
async function countResource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  resource: Resource,
  projectId?: string
): Promise<number> {
  switch (resource) {
    case 'projects': {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      return count || 0
    }
    case 'actors': {
      const { count } = await supabase
        .from('actors')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId!)
        .eq('user_id', userId)
      return count || 0
    }
    case 'objects': {
      const { count } = await supabase
        .from('objects')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId!)
        .eq('user_id', userId)
      return count || 0
    }
    case 'scenes': {
      // Scenes are stored in project data JSON, not a separate table.
      // We count from the project_data JSON field.
      const { data: projectData } = await supabase
        .from('project_data')
        .select('data')
        .eq('project_id', projectId!)
        .maybeSingle()

      if (projectData?.data) {
        const parsed = typeof projectData.data === 'string'
          ? JSON.parse(projectData.data)
          : projectData.data
        return Array.isArray(parsed.scenes) ? parsed.scenes.length : 0
      }
      return 0
    }
    default:
      return 0
  }
}
