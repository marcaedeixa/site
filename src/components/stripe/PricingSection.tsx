'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Crown, Shield, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
          displayPlans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'
        )}>
          {displayPlans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = currentPlanId === plan.priceId
            const isLoading = loading === plan.key
            const isTrial = plan.key === 'trial'
            const isPremium = plan.key === 'premium'

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative rounded-3xl p-8 transition-all duration-300',
                  isPremium 
                    ? 'bg-black text-white ring-2 ring-black' 
                    : 'bg-white border-2 border-gray-100 hover:border-gray-300',
                  isCurrentPlan && 'ring-2 ring-gray-400'
                )}
              >
                {/* Popular Badge */}
                {isPremium && (
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
                    isPremium ? 'bg-white/10' : 'bg-gray-100'
                  )}>
                    <Icon className={cn('w-6 h-6', isPremium ? 'text-white' : 'text-black')} />
                  </div>

                  <h3 className={cn(
                    'text-xl font-bold mb-2',
                    isPremium ? 'text-white' : 'text-black'
                  )}>
                    {plan.name}
                  </h3>
                  <p className={cn(
                    'text-sm',
                    isPremium ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  {isTrial ? (
                    <div>
                      <span className={cn(
                        'text-5xl font-black',
                        isPremium ? 'text-white' : 'text-black'
                      )}>
                        Grátis
                      </span>
                      <span className={cn(
                        'ml-2',
                        isPremium ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        / {STRIPE_CONFIG.trialDays} dias
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className={cn(
                        'text-5xl font-black',
                        isPremium ? 'text-white' : 'text-black'
                      )}>
                        {formatCurrency(plan.price, 'brl')}
                      </span>
                      <span className={cn(
                        'ml-2',
                        isPremium ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        /{billingInterval === 'monthly' ? 'mês' : 'ano'}
                      </span>
                      {billingInterval === 'yearly' && !isTrial && (
                        <p className={cn(
                          'text-sm mt-2',
                          isPremium ? 'text-green-400' : 'text-green-600'
                        )}>
                          Economia de {yearlyDiscount(
                            plan.key === 'basic' 
                              ? STRIPE_PLANS.basic.prices.monthly.amount 
                              : STRIPE_PLANS.premium.prices.monthly.amount,
                            plan.price
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
                        isPremium ? 'bg-white/10' : 'bg-gray-100'
                      )}>
                        <Check className={cn(
                          'w-3 h-3',
                          isPremium ? 'text-white' : 'text-black'
                        )} />
                      </div>
                      <span className={cn(
                        'text-sm',
                        isPremium ? 'text-gray-300' : 'text-gray-600'
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan || isLoading}
                  className={cn(
                    'w-full py-6 rounded-full font-semibold transition-all group',
                    isPremium 
                      ? 'bg-white text-black hover:bg-gray-100' 
                      : 'bg-black text-white hover:bg-gray-800',
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
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      Assinar Agora
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                {/* Trial Note */}
                {isTrial && (
                  <p className={cn(
                    'text-xs text-center mt-4',
                    isPremium ? 'text-gray-500' : 'text-gray-400'
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
          <div className="flex justify-center items-center gap-8 text-gray-300">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">SSL Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span className="text-sm">Garantia de 7 dias</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
