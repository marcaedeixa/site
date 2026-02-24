'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Crown, Shield, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSubscription } from '@/hooks/useSubscription'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanTier } from '@/lib/plan-config'
import { formatCurrency } from '@/lib/stripe'
import { User } from '@supabase/supabase-js'

export default function PlansPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<PlanTier | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  
  const router = useRouter()
  const supabase = createClient()
  const { subscription, hasActiveSubscription } = useSubscription(user)

  useEffect(() => {
    checkUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  const handleSubscribe = async (tier: PlanTier) => {
    // Free plan: redirect to dashboard or login
    if (tier === 'free') {
      if (!user) {
        router.push('/login')
      } else {
        router.push('/dashboard')
      }
      return
    }

    // Pro plan: always go to checkout (it has its own auth form)
    setSubscribing(tier)
    setError('')
    setSuccess('')

    try {
      router.push(`/checkout?plan=pro&interval=${billingInterval}`)
    } catch {
      setError('Erro ao processar assinatura')
      setSubscribing(null)
    }
  }

  const isCurrentPlan = (tier: PlanTier) => {
    if (!subscription) return false
    // Map subscription plan_name to tier
    const planName = subscription.plan_name?.toLowerCase() || ''
    if (tier === 'pro') {
      return planName.includes('pro') || planName.includes('premium') || planName.includes('básico') || planName.includes('basic')
    }
    return tier === 'free' && !planName.includes('pro') && !planName.includes('premium') && !planName.includes('básico') && !planName.includes('basic')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      </div>
    )
  }

  const plans: Array<{ tier: PlanTier; name: string; description: string; features: string[] }> = [
    {
      tier: 'free',
      name: PLANS.free.name,
      description: PLANS.free.description,
      features: PLANS.free.features,
    },
    {
      tier: 'pro',
      name: PLANS.pro.name,
      description: PLANS.pro.description,
      features: PLANS.pro.features,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Escolha seu Plano</h1>
            <p className="mt-4 text-lg text-gray-600">
              Selecione o plano que melhor atende às suas necessidades
            </p>
            {hasActiveSubscription && (
              <div className="mt-4">
                <Badge className="bg-green-100 text-green-800">
                  Você tem uma assinatura ativa: {subscription?.plan_name}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Alertas */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${ 
                billingInterval === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${ 
                billingInterval === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.tier)
            const isSubscribingToPlan = subscribing === plan.tier
            const isPro = plan.tier === 'pro'
            
            return (
              <Card 
                key={plan.tier} 
                className={`relative transition-all duration-200 hover:shadow-lg ${
                  isCurrent ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${
                  isPro ? 'border-purple-200 shadow-md' : ''
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white px-3 py-1">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-blue-600 text-white px-3 py-1">
                      Plano Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${
                    isPro ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {isPro ? <Crown className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                  </div>
                  
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  
                  <div className="mt-4">
                    {plan.tier === 'free' ? (
                      <div>
                        <span className="text-3xl font-bold text-gray-900">Grátis</span>
                        <span className="text-gray-600 ml-2">Sem limite de tempo</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold text-gray-900">
                          {formatCurrency(
                            billingInterval === 'monthly'
                              ? PLANS.pro.prices!.monthly.amount
                              : PLANS.pro.prices!.yearly.amount,
                            'brl'
                          )}
                        </span>
                        <span className="text-gray-600 ml-2">
                          /{billingInterval === 'monthly' ? 'mês' : 'ano'}
                        </span>
                        {billingInterval === 'yearly' && (
                          <div className="text-sm text-green-600 mt-1">
                            Economize 17%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={isCurrent || isSubscribingToPlan}
                    className={`w-full ${
                      isPro
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubscribingToPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processando...
                      </>
                    ) : isCurrent ? (
                      'Plano Atual'
                    ) : (
                      <>
                        {plan.tier === 'free' ? 'Usar Plano Gratuito' : 'Assinar Agora'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Informações Adicionais */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Todas as assinaturas incluem:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Segurança Garantida</h4>
              <p className="text-sm text-gray-600">Seus dados protegidos com criptografia</p>
            </div>
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Suporte Técnico</h4>
              <p className="text-sm text-gray-600">Ajuda quando você precisar</p>
            </div>
            <div className="text-center">
              <Crown className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Atualizações Gratuitas</h4>
              <p className="text-sm text-gray-600">Sempre com as últimas funcionalidades</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-8">
            Perguntas Frequentes
          </h3>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">
                Posso cancelar minha assinatura a qualquer momento?
              </h4>
              <p className="text-gray-600">
                Sim, você pode cancelar sua assinatura a qualquer momento. 
                Você continuará tendo acesso até o final do período pago.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">
                O plano gratuito tem limite de tempo?
              </h4>
              <p className="text-gray-600">
                Não, o plano gratuito é permanente e sem limite de tempo. 
                Você pode usar indefinidamente com os limites do plano gratuito.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">
                Posso fazer upgrade do meu plano?
              </h4>
              <p className="text-gray-600">
                Sim, você pode fazer upgrade para o Plano Pro a qualquer momento. 
                A diferença será calculada proporcionalmente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
