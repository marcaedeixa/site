'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import EmbeddedCheckout from '@/components/stripe/EmbeddedCheckout'
import { STRIPE_PLANS } from '@/lib/stripe'

function CheckoutContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const priceId = searchParams.get('priceId')
  const planKey = searchParams.get('plan')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        // Redirect to login with return URL
        router.push(`/login?redirect=/checkout?priceId=${priceId}&plan=${planKey}`)
        return
      }

      setUser(user)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  // Get plan details
  const getPlanInfo = () => {
    if (!planKey || !STRIPE_PLANS[planKey as keyof typeof STRIPE_PLANS]) {
      return null
    }
    return STRIPE_PLANS[planKey as keyof typeof STRIPE_PLANS]
  }

  const planInfo = getPlanInfo()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-violet-600" />
          <p className="text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!priceId || !planInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Plano não encontrado
          </h2>
          <p className="text-gray-600 mb-6">
            O plano selecionado não foi encontrado. Por favor, escolha um plano válido.
          </p>
          <Button onClick={() => router.push('/plans')}>
            Ver Planos Disponíveis
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-violet-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Checkout Seguro</h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Plan Details */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {planInfo.name}
              </h2>
              <p className="text-gray-600 mb-6">{planInfo.description}</p>
              
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">O que está incluso:</h3>
                <ul className="space-y-3">
                  {planInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Guarantee Badge */}
              <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-green-800">Garantia de 7 dias</h4>
                    <p className="text-sm text-green-700">
                      Se não estiver satisfeito, devolvemos seu dinheiro
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="order-1 lg:order-2">
            <EmbeddedCheckout
              priceId={priceId}
              userId={user.id}
              userEmail={user.email || ''}
              userName={user.user_metadata?.full_name}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

