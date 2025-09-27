'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, Lock } from 'lucide-react'
import { formatCurrency } from '@/lib/stripe'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutProps {
  priceId: string
  planName: string
  amount: number
  currency?: string
  userId: string
  userEmail: string
  userName?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

// Card element options
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
}

// Checkout form component
function CheckoutForm({
  priceId,
  planName,
  amount,
  currency = 'usd',
  userId,
  userEmail,
  userName,
  onSuccess,
  onError
}: StripeCheckoutProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail,
          name: userName,
          priceId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar sessão de checkout')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pagamento'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CreditCard className="h-5 w-5" />
          Finalizar Assinatura
        </CardTitle>
        <CardDescription>
          {planName} - {formatCurrency(amount, currency)}/mês
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              Pagamento processado com sucesso!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Informações do Cartão
            </label>
            <div className="p-3 border border-gray-300 rounded-md">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="h-4 w-4" />
            <span>Pagamento seguro processado pelo Stripe</span>
          </div>

          <Button
            type="submit"
            disabled={!stripe || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              `Assinar por ${formatCurrency(amount, currency)}/mês`
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Ao continuar, você concorda com nossos termos de serviço.
            Você pode cancelar a qualquer momento.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

// Main Stripe Checkout component
export default function StripeCheckout(props: StripeCheckoutProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  )
}

// Simple checkout button component for quick integration
interface StripeCheckoutButtonProps {
  priceId: string
  planName: string
  amount: number
  currency?: string
  userId: string
  userEmail: string
  userName?: string
  className?: string
  children?: React.ReactNode
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function StripeCheckoutButton({
  priceId,
  planName,
  amount,
  currency = 'usd',
  userId,
  userEmail,
  userName,
  className,
  children,
  onSuccess,
  onError
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail,
          name: userName,
          priceId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar sessão de checkout')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pagamento'
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Processando...
        </>
      ) : (
        children || `Assinar ${planName}`
      )}
    </Button>
  )
}