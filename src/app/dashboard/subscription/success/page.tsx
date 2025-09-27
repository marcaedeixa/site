'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Loader2, ArrowRight, Home, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function SubscriptionSuccessContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const supabase = createClient()

  useEffect(() => {
    if (sessionId) {
      verifySession()
    } else {
      setError('Sessão de pagamento não encontrada')
      setLoading(false)
    }
  }, [sessionId])

  const verifySession = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Verify the session and get subscription data
      // In a real implementation, you would verify the session with Stripe
      // For now, we'll just get the user's current subscription
      const response = await fetch(`/api/stripe/subscriptions?userId=${user.id}`)
      const data = await response.json()

      if (response.ok && data.activeSubscription) {
        setSubscriptionData(data.activeSubscription)
      } else {
        setError('Não foi possível verificar a assinatura')
      }
    } catch (err) {
      setError('Erro ao verificar pagamento')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verificando seu pagamento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erro na Verificação
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Ir para Dashboard
              </Button>
              <Button 
                onClick={() => router.push('/plans')} 
                variant="outline" 
                className="w-full"
              >
                Ver Planos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Pagamento Confirmado!</h1>
            <p className="mt-2 text-lg text-gray-600">
              Sua assinatura foi ativada com sucesso
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Alert */}
        <Alert className="mb-8 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            <strong>Parabéns!</strong> Sua assinatura foi processada com sucesso. 
            Você já pode aproveitar todos os benefícios do seu plano.
          </AlertDescription>
        </Alert>

        {/* Subscription Details */}
        {subscriptionData && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Detalhes da Assinatura
              </CardTitle>
              <CardDescription>
                Informações sobre sua nova assinatura
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Plano Selecionado</h4>
                  <p className="text-lg font-semibold text-blue-600">
                    {subscriptionData.plan_name}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Ativa</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Início da Assinatura</h4>
                  <p className="text-gray-600">
                    {formatDate(subscriptionData.current_period_start)}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Próxima Cobrança</h4>
                  <p className="text-gray-600">
                    {formatDate(subscriptionData.current_period_end)}
                  </p>
                </div>
              </div>

              {subscriptionData.trial_end && new Date(subscriptionData.trial_end) > new Date() && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    <strong>Período de Teste:</strong> Seu teste gratuito termina em {formatDate(subscriptionData.trial_end)}.
                    Após essa data, sua assinatura será cobrada automaticamente.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
            <CardDescription>
              O que você pode fazer agora
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Explore o Dashboard</h4>
                  <p className="text-sm text-gray-600">
                    Acesse seu dashboard para começar a usar todas as funcionalidades do seu plano.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Configure seu Perfil</h4>
                  <p className="text-sm text-gray-600">
                    Complete seu perfil para personalizar sua experiência na plataforma.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Gerencie sua Assinatura</h4>
                  <p className="text-sm text-gray-600">
                    Você pode gerenciar sua assinatura, métodos de pagamento e faturas a qualquer momento.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => router.push('/dashboard')} 
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Ir para Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            onClick={() => router.push('/dashboard/subscription')} 
            variant="outline"
            className="flex-1"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Gerenciar Assinatura
          </Button>
        </div>

        {/* Support */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Precisa de Ajuda?
          </h3>
          <p className="text-gray-600 mb-4">
            Nossa equipe de suporte está pronta para ajudar você.
          </p>
          <Button variant="outline" size="sm">
            Entrar em Contato
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  )
}