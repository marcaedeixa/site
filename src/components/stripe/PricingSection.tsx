'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Crown, Shield, Zap, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STRIPE_PLANS, STRIPE_CONFIG, formatCurrency } from '@/lib/stripe'
import { cn } from '@/lib/utils'

interface PricingSectionProps {
  userId?: string | null
  userEmail?: string | null
  currentPlanId?: string | null
  onSelectPlan?: (priceId: string, planName: string) => void
  showTrialOption?: boolean
  className?: string
  variant?: 'default' | 'compact'
}

type BillingInterval = 'monthly' | 'yearly'

export default function PricingSection({
  userId,
  userEmail,
  currentPlanId,
  onSelectPlan,
  showTrialOption = true,
  className,
  variant = 'default',
}: PricingSectionProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const plans = [
    {
      key: 'trial',
      name: 'Teste Grátis',
      description: `${STRIPE_CONFIG.trialDays} dias para experimentar`,
      price: 0,
      priceId: 'trial',
      interval: 'trial',
      features: [
        'Acesso completo por 7 dias',
        'Todos os recursos',
        'Sem cartão de crédito',
        'Cancele quando quiser',
      ],
      icon: Zap,
      color: 'blue',
      popular: false,
    },
    {
      key: 'basic',
      name: STRIPE_PLANS.basic.name,
      description: STRIPE_PLANS.basic.description,
      price: billingInterval === 'monthly' 
        ? STRIPE_PLANS.basic.prices.monthly.amount 
        : STRIPE_PLANS.basic.prices.yearly.amount,
      priceId: billingInterval === 'monthly'
        ? STRIPE_PLANS.basic.prices.monthly.priceId
        : STRIPE_PLANS.basic.prices.yearly.priceId,
      interval: billingInterval,
      features: STRIPE_PLANS.basic.features,
      icon: Shield,
      color: 'green',
      popular: false,
    },
    {
      key: 'premium',
      name: STRIPE_PLANS.premium.name,
      description: STRIPE_PLANS.premium.description,
      price: billingInterval === 'monthly'
        ? STRIPE_PLANS.premium.prices.monthly.amount
        : STRIPE_PLANS.premium.prices.yearly.amount,
      priceId: billingInterval === 'monthly'
        ? STRIPE_PLANS.premium.prices.monthly.priceId
        : STRIPE_PLANS.premium.prices.yearly.priceId,
      interval: billingInterval,
      features: STRIPE_PLANS.premium.features,
      icon: Crown,
      color: 'purple',
      popular: true,
    },
  ]

  const displayPlans = showTrialOption ? plans : plans.filter(p => p.key !== 'trial')

  const handleSelectPlan = async (plan: typeof plans[0]) => {
    if (plan.key === 'trial') {
      // Para trial, precisa estar logado
      if (!userId) {
        router.push('/login?redirect=/plans')
        return
      }
      
      // Iniciar trial
      setLoading('trial')
      try {
        const response = await fetch('/api/subscriptions/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            plan_id: 'trial',
            trial_days: STRIPE_CONFIG.trialDays 
          }),
        })
        
        if (response.ok) {
          router.push('/dashboard?trial=started')
        }
      } catch (error) {
        console.error('Erro ao iniciar trial:', error)
      } finally {
        setLoading(null)
      }
      return
    }

    // Para planos pagos, ir direto para checkout (cadastro durante o processo)
    if (onSelectPlan) {
      onSelectPlan(plan.priceId, plan.name)
    } else {
      // Inclui o intervalo na URL para manter a seleção
      router.push(`/checkout?plan=${plan.key}&interval=${billingInterval}`)
    }
  }

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border' | 'button') => {
    const colors: Record<string, Record<string, string>> = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700',
      },
      green: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-200',
        button: 'bg-emerald-600 hover:bg-emerald-700',
      },
      purple: {
        bg: 'bg-violet-50',
        text: 'text-violet-600',
        border: 'border-violet-200',
        button: 'bg-violet-600 hover:bg-violet-700',
      },
    }
    return colors[color]?.[type] || ''
  }

  const yearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12
    const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100
    return Math.round(discount)
  }

  return (
    <section className={cn('py-16 px-4', className)}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200">
            <Sparkles className="w-3 h-3 mr-1" />
            Planos e Preços
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Escolha o plano ideal para você
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comece gratuitamente e faça upgrade quando precisar de mais recursos
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-white border-2 border-gray-200 p-1.5 rounded-2xl inline-flex shadow-lg">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                'px-8 py-3 rounded-xl text-base font-semibold transition-all',
                billingInterval === 'monthly'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={cn(
                'px-8 py-3 rounded-xl text-base font-semibold transition-all flex items-center gap-2',
                billingInterval === 'yearly'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              Anual
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold',
                billingInterval === 'yearly'
                  ? 'bg-green-400 text-green-900'
                  : 'bg-green-100 text-green-700'
              )}>
                -25%
              </span>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {billingInterval === 'yearly' 
              ? '✨ Você está economizando até 25% com o plano anual!' 
              : 'Economize até 25% escolhendo o plano anual'}
          </p>
        </div>

        {/* Plans Grid */}
        <div className={cn(
          'grid gap-8',
          displayPlans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'
        )}>
          {displayPlans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = currentPlanId === plan.priceId
            const isLoading = loading === plan.key
            const isTrial = plan.key === 'trial'

            return (
              <Card
                key={plan.key}
                className={cn(
                  'relative overflow-hidden transition-all duration-300 hover:shadow-xl',
                  plan.popular && 'ring-2 ring-violet-500 shadow-lg scale-105 z-10',
                  isCurrentPlan && 'ring-2 ring-blue-500'
                )}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-violet-600 text-white text-xs font-semibold px-4 py-1 rounded-bl-lg">
                      Mais Popular
                    </div>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-br-lg">
                      Plano Atual
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  {/* Icon */}
                  <div className={cn(
                    'w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center',
                    getColorClasses(plan.color, 'bg')
                  )}>
                    <Icon className={cn('w-7 h-7', getColorClasses(plan.color, 'text'))} />
                  </div>

                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>

                  {/* Price */}
                  <div className="mt-6">
                    {isTrial ? (
                      <div>
                        <span className="text-4xl font-bold text-gray-900">Grátis</span>
                        <span className="text-gray-500 ml-2">/ {STRIPE_CONFIG.trialDays} dias</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-4xl font-bold text-gray-900">
                          {formatCurrency(plan.price, 'brl')}
                        </span>
                        <span className="text-gray-500 ml-1">
                          /{billingInterval === 'monthly' ? 'mês' : 'ano'}
                        </span>
                        {billingInterval === 'yearly' && plan.key !== 'trial' && (
                          <div className="text-sm text-green-600 mt-1">
                            Economia de {yearlyDiscount(
                              plan.key === 'basic' 
                                ? STRIPE_PLANS.basic.prices.monthly.amount 
                                : STRIPE_PLANS.premium.prices.monthly.amount,
                              plan.price
                            )}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className={cn('w-5 h-5 mt-0.5 flex-shrink-0', getColorClasses(plan.color, 'text'))} />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentPlan || isLoading}
                    className={cn(
                      'w-full',
                      getColorClasses(plan.color, 'button'),
                      isCurrentPlan && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processando...
                      </>
                    ) : isCurrentPlan ? (
                      'Plano Atual'
                    ) : isTrial ? (
                      <>
                        Começar Grátis
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Assinar Agora
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Trial Note */}
                  {isTrial && (
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Sem cartão de crédito necessário
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 mb-6">Pagamentos seguros processados por</p>
          <div className="flex justify-center items-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <svg className="w-10 h-10" viewBox="0 0 60 25" fill="currentColor">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a12.5 12.5 0 01-4.56.95c-4.05 0-6.53-2.37-6.53-6.82 0-3.66 2.1-6.79 5.93-6.79 3.52 0 5.97 2.65 5.97 7.74zm-8.06-2.37h4.68c0-1.93-.87-3-2.34-3-1.4 0-2.34 1.07-2.34 3zM25.27 0l-6.85 24h-4.3l6.84-24h4.31zm-12.62 6.82L8.4 18.79H4.25L.16 6.82h4.31l2.68 9.4 2.68-9.4h4.82zm32.95.28c-3.1 0-5.47 2.68-5.47 5.85 0 3.98 2.68 6.05 6.85 6.05 2 0 3.63-.43 5.1-1.18v-3.32c-1.24.69-2.74 1.12-4.4 1.12-2.24 0-3.48-.81-3.66-2.62h9.21c.06-.44.06-.87.06-1.18 0-3.91-2.23-6.72-7.69-6.72zm3.48 5.3h-5.22c.13-1.37.87-2.37 2.37-2.37 1.56 0 2.55.94 2.85 2.37z"/>
              </svg>
              <span className="text-sm font-medium">Stripe</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm">SSL Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Check className="w-5 h-5" />
              <span className="text-sm">Garantia de 7 dias</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

