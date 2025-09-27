'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Crown, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSubscription } from '@/hooks/useSubscription'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface Plan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly?: number
  duration_days: number
  features: string[]
  is_trial: boolean
  is_active: boolean
}

export default function PlansPage() {
  const [user, setUser] = useState<User | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()
  const supabase = createClient()
  const { subscription, hasActiveSubscription, refreshSubscription } = useSubscription(user)

  useEffect(() => {
    checkUser()
    loadPlans()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans')
      const data = await response.json()
      
      if (response.ok) {
        setPlans(data.plans || [])
      } else {
        setError('Erro ao carregar planos')
      }
    } catch (err) {
      setError('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    setSubscribing(planId)
    setError('')
    setSuccess('')

    try {
      // Get plan details to determine Stripe price ID
      const plan = plans.find(p => p.id === planId)
      if (!plan) {
        setError('Plano não encontrado')
        return
      }

      // For trial plans, use the old system
      if (plan.is_trial) {
        const response = await fetch('/api/subscriptions/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plan_id: planId })
        })

        const data = await response.json()

        if (response.ok) {
          setSuccess('Período de teste ativado com sucesso!')
          await refreshSubscription()
          
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setError(data.error || 'Erro ao ativar período de teste')
        }
        return
      }

      // For paid plans, use Stripe
      let stripePrice = ''
      if (plan.name.includes('Básico')) {
        stripePrice = 'price_basic_monthly' // Replace with actual Stripe price ID
      } else if (plan.name.includes('Premium')) {
        stripePrice = 'price_premium_monthly' // Replace with actual Stripe price ID
      }

      if (!stripePrice) {
        setError('Configuração de preço não encontrada')
        return
      }

      // Create Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
          priceId: stripePrice
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error || 'Erro ao processar pagamento')
      }
    } catch (err) {
      setError('Erro ao processar assinatura')
    } finally {
      setSubscribing(null)
    }
  }

  const getPlanIcon = (planName: string) => {
    if (planName.includes('Teste')) return <Zap className="h-6 w-6" />
    if (planName.includes('Básico')) return <Shield className="h-6 w-6" />
    if (planName.includes('Premium')) return <Crown className="h-6 w-6" />
    return <Shield className="h-6 w-6" />
  }

  const getPlanColor = (planName: string) => {
    if (planName.includes('Teste')) return 'bg-blue-100 text-blue-600 border-blue-200'
    if (planName.includes('Básico')) return 'bg-green-100 text-green-600 border-green-200'
    if (planName.includes('Premium')) return 'bg-purple-100 text-purple-600 border-purple-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const isCurrentPlan = (planId: string) => {
    return subscription?.plan_id === planId
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

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id)
            const isSubscribingToPlan = subscribing === plan.id
            
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-200 hover:shadow-lg ${
                  isCurrent ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${
                  plan.name.includes('Premium') ? 'border-purple-200 shadow-md' : ''
                }`}
              >
                {plan.name.includes('Premium') && (
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
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${getPlanColor(plan.name)}`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  
                  <div className="mt-4">
                    {plan.is_trial ? (
                      <div>
                        <span className="text-3xl font-bold text-gray-900">Grátis</span>
                        <span className="text-gray-600 ml-2">por {plan.duration_days} dias</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold text-gray-900">
                          R$ {plan.price_monthly.toFixed(2)}
                        </span>
                        <span className="text-gray-600 ml-2">/mês</span>
                        {plan.price_yearly && (
                          <div className="text-sm text-green-600 mt-1">
                            R$ {plan.price_yearly.toFixed(2)}/ano (economize 17%)
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
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || isSubscribingToPlan || !user}
                    className={`w-full ${
                      plan.name.includes('Premium') 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : plan.name.includes('Básico')
                        ? 'bg-green-600 hover:bg-green-700'
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
                    ) : !user ? (
                      'Faça Login para Assinar'
                    ) : (
                      <>
                        {plan.is_trial ? 'Iniciar Teste Grátis' : 'Assinar Agora'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  {plan.is_trial && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Sem compromisso • Cancele a qualquer momento
                    </p>
                  )}
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
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
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
                O que acontece após o período de teste?
              </h4>
              <p className="text-gray-600">
                Após os 3 dias de teste, você precisará escolher um plano pago 
                para continuar usando a plataforma.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">
                Posso fazer upgrade do meu plano?
              </h4>
              <p className="text-gray-600">
                Sim, você pode fazer upgrade para um plano superior a qualquer momento. 
                A diferença será calculada proporcionalmente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}