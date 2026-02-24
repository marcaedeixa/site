'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Crown, Shield, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/plan-config'
import { formatCurrency } from '@/lib/stripe'
import { cn } from '@/lib/utils'

interface PricingSectionProps {
  userId?: string | null
  userEmail?: string | null
  currentPlanId?: string | null
  onSelectPlan?: (priceId: string, planName: string) => void
  className?: string
  variant?: 'default' | 'compact'
}

type BillingInterval = 'monthly' | 'yearly'
type StripePrice = { priceId: string; amount: number; interval: 'month' | 'year' }
type StripePlan = {
  name: string
  description: string
  features: string[]
  prices: { monthly: StripePrice; yearly: StripePrice } | null
}

export default function PricingSection({
  userId,
  currentPlanId,
  onSelectPlan,
  className,
}: PricingSectionProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [pricesLoading, setPricesLoading] = useState(true)
  const [pricePlans, setPricePlans] = useState<Record<string, StripePlan> | null>(null)
  const router = useRouter()

  useEffect(() => {
    let active = true
    const loadPrices = async () => {
      setPricesLoading(true)
      try {
        const response = await fetch('/api/stripe/prices')
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || 'Erro ao carregar preços')
        }
        const data = await response.json()
        if (active) {
          // Map response to our format
          const mapped: Record<string, StripePlan> = {}
          if (data.plans && Array.isArray(data.plans)) {
            data.plans.forEach((plan: StripePlan) => {
              mapped[plan.key] = plan
            })
          }
          setPricePlans(mapped)
        }
      } catch (error) {
        // Silently fall back to static prices from plan-config.ts
        // The plan cards already use PLANS.pro.prices as fallback (lines 98-99)
        console.warn('Failed to load Stripe prices, using static fallback:', error instanceof Error ? error.message : error)
      } finally {
        if (active) {
          setPricesLoading(false)
        }
      }
    }

    loadPrices()
    return () => {
      active = false
    }
  }, [])

  const plans = [
    {
      key: 'free',
      name: PLANS.free.name,
      description: PLANS.free.description,
      price: 0,
      priceId: 'free',
      interval: 'free' as const,
      features: PLANS.free.features,
      icon: Zap,
      popular: false,
    },
    {
      key: 'pro',
      name: PLANS.pro.name,
      description: PLANS.pro.description,
      price: billingInterval === 'monthly'
        ? (pricePlans?.pro?.prices?.monthly.amount ?? PLANS.pro.prices.monthly.amount)
        : (pricePlans?.pro?.prices?.yearly.amount ?? PLANS.pro.prices.yearly.amount),
      priceId: billingInterval === 'monthly'
        ? pricePlans?.pro?.prices?.monthly.priceId || ''
        : pricePlans?.pro?.prices?.yearly.priceId || '',
      interval: billingInterval,
      features: PLANS.pro.features,
      icon: Crown,
      popular: true,
    },
  ]
  const handleSelectPlan = async (plan: typeof plans[0]) => {
    // Free plan: redirect to dashboard or register
    if (plan.key === 'free') {
      if (!userId) {
        router.push('/register')
      } else {
        router.push('/dashboard')
      }
      return
    }

    // Pro plan: redirect to checkout
    if (onSelectPlan && plan.priceId) {
      onSelectPlan(plan.priceId, plan.name)
    } else {
      router.push(`/checkout?plan=pro&interval=${billingInterval}`)
    }
  }

  const yearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12
    const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100
    return Math.round(discount)
  }

  return (
    <section className={cn('py-32 px-4', className)}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Planos</span>
          <h2 className="text-4xl md:text-5xl font-black text-black mt-4 mb-6">
            Escolha seu plano
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Comece gratuitamente e faça upgrade quando precisar
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex flex-col items-center mb-16">
          <div className="bg-gray-100 p-1.5 rounded-full inline-flex">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                'px-8 py-3 rounded-full text-sm font-semibold transition-all',
                billingInterval === 'monthly'
                  ? 'bg-black text-white shadow-lg'
                  : 'text-gray-600 hover:text-black'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={cn(
                'px-8 py-3 rounded-full text-sm font-semibold transition-all flex items-center gap-2',
                billingInterval === 'yearly'
                  ? 'bg-black text-white shadow-lg'
                  : 'text-gray-600 hover:text-black'
              )}
            >
              Anual
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold',
                billingInterval === 'yearly'
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
              )}>
                -25%
              </span>
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            {billingInterval === 'yearly' 
              ? '✨ Você economiza até 25% com o plano anual' 
              : 'Economize até 25% escolhendo o plano anual'}
          </p>
        </div>

        {/* Plans Grid */}
        <div className={cn(
          'grid gap-6',
          'md:grid-cols-2 max-w-4xl mx-auto'
        )}>
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = currentPlanId === plan.priceId
            const isLoading = loading === plan.key
            const isFree = plan.key === 'free'
            const isPro = plan.key === 'pro'
            const isPriceUnavailable = false // fallback to static prices always works

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative rounded-3xl p-8 transition-all duration-300',
                  isPro
                    ? 'bg-black text-white ring-2 ring-black'
                    : 'bg-white border-2 border-gray-100 hover:border-gray-300',
                  isCurrentPlan && 'ring-2 ring-gray-400'
                )}
              >
                {/* Popular Badge */}
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      Mais Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-gray-200 text-black text-xs font-bold px-4 py-1.5 rounded-full">
                      Atual
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-8">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center mb-4',
                    isPro ? 'bg-white/10' : 'bg-gray-100'
                  )}>
                    <Icon className={cn('w-6 h-6', isPro ? 'text-white' : 'text-black')} />
                  </div>

                  <h3 className={cn(
                    'text-xl font-bold mb-2',
                    isPro ? 'text-white' : 'text-black'
                  )}>
                    {plan.name}
                  </h3>
                  <p className={cn(
                    'text-sm',
                    isPro ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  {isFree ? (
                    <div>
                      <span className={cn(
                        'text-5xl font-black',
                        isPro ? 'text-white' : 'text-black'
                      )}>
                        Grátis
                      </span>
                      <span className={cn(
                        'ml-2',
                        isPro ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        / Sem limite de tempo
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className={cn(
                        'text-5xl font-black',
                        isPro ? 'text-white' : 'text-black'
                      )}>
                        {formatCurrency(plan.price, 'brl')}
                      </span>
                      <span className={cn(
                        'ml-2',
                        isPro ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        /{billingInterval === 'monthly' ? 'mês' : 'ano'}
                      </span>
                      {billingInterval === 'yearly' && !isFree && (
                        <p className={cn(
                          'text-sm mt-2',
                          isPro ? 'text-green-400' : 'text-green-600'
                        )}>
                          Economia de {yearlyDiscount(
                            PLANS.pro.prices.monthly.amount,
                            PLANS.pro.prices.yearly.amount
                          )}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        isPro ? 'bg-white/10' : 'bg-gray-100'
                      )}>
                        <Check className={cn(
                          'w-3 h-3',
                          isPro ? 'text-white' : 'text-black'
                        )} />
                      </div>
                      <span className={cn(
                        'text-sm',
                        isPro ? 'text-gray-300' : 'text-gray-600'
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan || isLoading || isPriceUnavailable}
                  className={cn(
                    'w-full py-6 rounded-full font-semibold transition-all group',
                    isPro
                      ? 'bg-white text-black hover:bg-gray-100'
                      : 'bg-black text-white hover:bg-gray-800',
                    (isCurrentPlan || isPriceUnavailable) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : isCurrentPlan ? (
                    'Plano Atual'
                  ) : isFree ? (
                    <>
                      Começar Grátis
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      Assinar Agora
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                {/* Free Plan Note */}
                {isFree && (
                  <p className={cn(
                    'text-xs text-center mt-4',
                    isPro ? 'text-gray-500' : 'text-gray-400'
                  )}>
                    Sem cartão de crédito necessário
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Trust */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400 mb-4">Pagamentos seguros processados por Stripe</p>
          <div className="flex justify-center items-center gap-8">
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">SSL Seguro</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Garantia de 7 dias</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
