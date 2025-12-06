'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertTriangle, Lock, CreditCard, Gift } from 'lucide-react'
import { STRIPE_PLANS, formatCurrency } from '@/lib/stripe'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutFormProps {
  priceId: string
  planName: string
  amount: number
  interval: string
  onSuccess: () => void
  onError: (error: string) => void
}

function CheckoutForm({ priceId, planName, amount, interval, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setMessage(null)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/subscription/success`,
      },
    })

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || 'Ocorreu um erro no pagamento.')
        onError(error.message || 'Erro no pagamento')
      } else {
        setMessage('Ocorreu um erro inesperado.')
        onError('Erro inesperado')
      }
    }

    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Resumo do Pedido</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{planName}</span>
          <span className="font-semibold">
            {formatCurrency(amount, 'brl')}/{interval === 'month' ? 'mês' : 'ano'}
          </span>
        </div>
      </div>

      {/* Payment Element */}
      <div className="border rounded-lg p-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error Message */}
      {message && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{message}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-violet-600 hover:bg-violet-700 py-6 text-lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Processando...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Pagar {formatCurrency(amount, 'brl')}
          </>
        )}
      </Button>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Lock className="w-4 h-4" />
        <span>Pagamento seguro processado pelo Stripe</span>
      </div>
    </form>
  )
}

interface EmbeddedCheckoutProps {
  priceId: string
  userId: string
  userEmail: string
  userName?: string
}

export default function EmbeddedCheckout({ priceId, userId, userEmail, userName }: EmbeddedCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isTrialing, setIsTrialing] = useState(false)

  // Get plan details from price ID
  const getPlanDetails = () => {
    for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
      if (plan.prices.monthly.priceId === priceId) {
        return { ...plan, interval: 'month', amount: plan.prices.monthly.amount }
      }
      if (plan.prices.yearly.priceId === priceId) {
        return { ...plan, interval: 'year', amount: plan.prices.yearly.amount }
      }
    }
    return null
  }

  const planDetails = getPlanDetails()

  useEffect(() => {
    // Create subscription/payment intent
    const createSubscription = async () => {
      try {
        setLoading(true)
        setError(null)
        setIsTrialing(false)

        const response = await fetch('/api/stripe/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId,
            userId,
            email: userEmail,
            name: userName,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar assinatura')
        }

        // Check if subscription is in trial mode (no payment required yet)
        if (data.status === 'trialing') {
          setIsTrialing(true)
          setSuccess(true)
        } else {
          setClientSecret(data.clientSecret)
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao inicializar checkout')
      } finally {
        setLoading(false)
      }
    }

    if (priceId && userId) {
      createSubscription()
    }
  }, [priceId, userId, userEmail, userName])

  if (loading) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600 mb-4" />
          <p className="text-gray-600">Preparando checkout...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full mt-4"
            variant="outline"
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className={`w-16 h-16 ${isTrialing ? 'bg-violet-100' : 'bg-green-100'} rounded-full flex items-center justify-center mb-4`}>
            {isTrialing ? (
              <Gift className="w-10 h-10 text-violet-600" />
            ) : (
              <CheckCircle className="w-10 h-10 text-green-600" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isTrialing ? 'Período de Teste Ativado!' : 'Pagamento Confirmado!'}
          </h3>
          <p className="text-gray-600 text-center mb-6">
            {isTrialing 
              ? 'Seu período de teste gratuito de 7 dias foi ativado com sucesso. Aproveite todos os recursos do plano!' 
              : 'Sua assinatura foi ativada com sucesso.'}
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className={isTrialing ? 'bg-violet-600 hover:bg-violet-700' : 'bg-green-600 hover:bg-green-700'}
          >
            Ir para o Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!clientSecret || !planDetails) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-8">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Não foi possível carregar as informações do plano.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center border-b">
        <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-violet-600" />
        </div>
        <CardTitle className="text-2xl">Finalizar Assinatura</CardTitle>
        <CardDescription>
          Complete o pagamento para ativar seu plano
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#7c3aed',
                colorBackground: '#ffffff',
                colorText: '#1f2937',
                colorDanger: '#dc2626',
                fontFamily: 'system-ui, sans-serif',
                borderRadius: '8px',
              },
            },
          }}
        >
          <CheckoutForm
            priceId={priceId}
            planName={planDetails.name}
            amount={planDetails.amount}
            interval={planDetails.interval}
            onSuccess={() => setSuccess(true)}
            onError={(err) => setError(err)}
          />
        </Elements>
      </CardContent>
    </Card>
  )
}

