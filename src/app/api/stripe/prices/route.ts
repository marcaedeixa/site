import { NextResponse } from 'next/server'
import { getServerStripe } from '@/lib/stripe'
import { PLANS } from '@/lib/plan-config'

const mapToPro = (product: { name?: string; metadata?: Record<string, string> } | null): boolean => {
  if (!product) return false
  const planKey = product.metadata?.plan_key
  if (planKey === 'pro') return true
  const name = product.name?.toLowerCase() || ''
  // Match any paid plan name (pro, básico, basic, premium) — all map to pro in the new model
  return name.includes('pro') || name.includes('básico') || name.includes('basic') || name.includes('premium')
}

export async function GET() {
  try {
    const stripe = getServerStripe()

    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    })

    const proPrice: { month?: typeof prices.data[number]; year?: typeof prices.data[number] } = {}

    for (const price of prices.data) {
      if (!price.recurring?.interval) continue
      const product = price.product && typeof price.product !== 'string' && !('deleted' in price.product)
        ? { name: price.product.name, metadata: price.product.metadata }
        : null
      if (!mapToPro(product)) continue

      // Prefer exact plan_key='pro' metadata match, or lowest price (our new R$5/R$50 product)
      if (price.recurring.interval === 'month') {
        if (!proPrice.month || (price.unit_amount ?? Infinity) < (proPrice.month.unit_amount ?? Infinity)) {
          proPrice.month = price
        }
      }
      if (price.recurring.interval === 'year') {
        if (!proPrice.year || (price.unit_amount ?? Infinity) < (proPrice.year.unit_amount ?? Infinity)) {
          proPrice.year = price
        }
      }
    }

    if (!proPrice.month || !proPrice.year) {
      return NextResponse.json(
        {
          error: 'Stripe prices not configured',
          missing: [
            ...(!proPrice.month ? [{ planKey: 'pro', interval: 'month' }] : []),
            ...(!proPrice.year ? [{ planKey: 'pro', interval: 'year' }] : []),
          ],
        },
        { status: 500 }
      )
    }

    const plans = [
      {
        key: 'pro',
        name: PLANS.pro.name,
        description: PLANS.pro.description,
        features: PLANS.pro.features,
        prices: {
          monthly: {
            priceId: proPrice.month.id,
            amount: proPrice.month.unit_amount ?? 0,
            interval: 'month',
          },
          yearly: {
            priceId: proPrice.year.id,
            amount: proPrice.year.unit_amount ?? 0,
            interval: 'year',
          },
        },
      },
    ]

    return NextResponse.json({ plans })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error fetching Stripe prices:', message)
    return NextResponse.json(
      { error: 'Erro ao buscar preços do Stripe', details: message },
      { status: 500 }
    )
  }
}
