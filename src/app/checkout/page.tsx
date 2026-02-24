'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import EmbeddedCheckout from '@/components/stripe/EmbeddedCheckout'
import { formatCurrency } from '@/lib/stripe'
import { cn } from '@/lib/utils'

type BillingInterval = 'monthly' | 'yearly'
type PlanKey = 'pro' | 'basic' | 'premium'
type StripePrice = { priceId: string; amount: number; interval: 'month' | 'year' }
type StripePlan = {
  key: PlanKey
  name: string
  description: string
  features: string[]
  prices: { monthly: StripePrice; yearly: StripePrice }
}
type AuthMode = 'login' | 'register'

function CheckoutContent() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [formAuthLoading, setFormAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [pricesLoading, setPricesLoading] = useState(true)
  const [priceError, setPriceError] = useState('')
  const [pricePlans, setPricePlans] = useState<StripePlan[] | null>(null)
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const planKey = searchParams.get('plan') as PlanKey | null
  const intervalFromUrl = searchParams.get('interval') as BillingInterval | null

  useEffect(() => {
    if (intervalFromUrl) {
      setBillingInterval(intervalFromUrl)
    }
  }, [intervalFromUrl])

  useEffect(() => {
    let active = true
    const loadPrices = async () => {
      setPricesLoading(true)
      setPriceError('')
      try {
        const response = await fetch('/api/stripe/prices')
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || 'Erro ao carregar preços')
        }
        const data = await response.json()
        if (active) {
          setPricePlans(data.plans)
        }
      } catch (error) {
        if (active) {
          setPriceError(error instanceof Error ? error.message : 'Erro ao carregar preços')
        }
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

  // Auth state comes from useAuth hook — no manual check needed

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormAuthLoading(true)
    setAuthError('')
    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          },
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        if (data.user) {
          // useAuth hook detects session automatically via onAuthStateChange
          if (!data.session) {
            // Usuário precisa confirmar email
            setAuthError('Verifique seu email para confirmar o cadastro.')
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setAuthError(error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message)
          return
        }

        // useAuth hook detects session automatically via onAuthStateChange
      }
    } catch (err) {
      setAuthError('Ocorreu um erro. Tente novamente.')
    } finally {
      setFormAuthLoading(false)
    }
  }

  // Get plan details
  const planInfo = planKey && pricePlans
    ? pricePlans.find((plan) => plan.key === planKey) || null
    : null
  const currentPrice = billingInterval === 'monthly'
    ? planInfo?.prices.monthly
    : planInfo?.prices.yearly
  const priceId = currentPrice?.priceId || null

  const yearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12
    const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100
    return Math.round(discount)
  }

  if (authLoading || pricesLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-black" />
          <p className="text-gray-500">Carregando checkout...</p>
        </div>
      </div>
    )
  }

  if (priceError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
        <div className="relative text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ArrowLeft className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-3xl font-black text-black mb-4 tracking-tight">
            Preços indisponíveis
          </h2>
          <p className="text-gray-500 mb-8">
            {priceError}
          </p>
          <Button 
            onClick={() => router.push('/#planos')}
            className="bg-black hover:bg-gray-800 text-white rounded-full px-8 py-3 font-medium"
          >
            Ver Planos Disponíveis
          </Button>
        </div>
      </div>
    )
  }

  if (!planKey || !planInfo || !currentPrice || !priceId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
        <div className="relative text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ArrowLeft className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-3xl font-black text-black mb-4 tracking-tight">
            Plano não encontrado
          </h2>
          <p className="text-gray-500 mb-8">
            O plano selecionado não foi encontrado. Por favor, escolha um plano válido.
          </p>
          <Button 
            onClick={() => router.push('/#planos')}
            className="bg-black hover:bg-gray-800 text-white rounded-full px-8 py-3 font-medium"
          >
            Ver Planos Disponíveis
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Background Pattern — matching landing page hero */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-1/3 -right-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-60" />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Button
              variant="ghost"
              onClick={() => router.push('/#planos')}
              className="flex items-center gap-2 rounded-full text-gray-600 hover:text-black hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar aos Planos</span>
            </Button>
            <span className="text-2xl font-black tracking-tight text-black">
              marca<span className="text-gray-400">e</span>deixa
            </span>
            <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
              <svg className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Checkout Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
          {/* Plan Details (Left Side — 3 cols) */}
          <div className="order-2 lg:order-1 lg:col-span-3 space-y-10">
            {/* Plan Header */}
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-black tracking-tight leading-tight">
                {planInfo.name}
              </h1>
              <p className="text-lg text-gray-500 mt-3 leading-relaxed">{planInfo.description}</p>
            </div>

            {/* Billing Toggle — matching PricingSection */}
            <div>
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider block mb-4">
                Período de cobrança
              </span>
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
                    -{yearlyDiscount(planInfo.prices.monthly.amount, planInfo.prices.yearly.amount)}%
                  </span>
                </button>
              </div>
            </div>

            {/* Order Summary — dark premium card */}
            <div className="bg-black rounded-3xl shadow-2xl p-8 md:p-10">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Resumo do Pedido</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-300 text-lg">{planInfo.name}</span>
                  <span className="text-white text-lg font-semibold">{formatCurrency(currentPrice!.amount, 'brl')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Período</span>
                  <span className="text-gray-400">{billingInterval === 'monthly' ? 'Mensal' : 'Anual'}</span>
                </div>
                <div className="border-t border-gray-800 pt-4 mt-2 flex justify-between items-baseline">
                  <span className="text-white text-xl font-black">Total</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-white">
                      {formatCurrency(currentPrice!.amount, 'brl')}
                    </span>
                    <span className="text-gray-500 text-sm font-normal ml-1">
                      /{billingInterval === 'monthly' ? 'mês' : 'ano'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
              
            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">O que está incluso:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {planInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guarantee Badge — refined trust signal */}
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full px-6 py-3.5">
              <svg className="w-5 h-5 text-black flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <span className="text-sm font-semibold text-black">Garantia de 7 dias</span>
                <span className="text-sm text-gray-500 ml-1">— Se não estiver satisfeito, devolvemos seu dinheiro</span>
              </div>
            </div>
          </div>

          {/* Auth/Checkout Form (Right Side — 2 cols) */}
          <div className="order-1 lg:order-2 lg:col-span-2">
            <div className="lg:sticky lg:top-28">
              {!authUser ? (
                /* Auth Form */
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="p-8 pb-0">
                    <h2 className="text-2xl font-black text-black tracking-tight">
                      {authMode === 'register' ? 'Criar Conta' : 'Entrar'}
                    </h2>
                    <p className="text-gray-500 mt-2">
                      {authMode === 'register' 
                        ? 'Crie sua conta para continuar com a assinatura' 
                        : 'Entre na sua conta para continuar'}
                    </p>
                  </div>
                  <div className="p-8">
                    <form onSubmit={handleAuth} className="space-y-5">
                      {authMode === 'register' && (
                        <div>
                          <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Nome completo</Label>
                          <div className="relative mt-2">
                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="fullName"
                              type="text"
                              placeholder="Seu nome"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="pl-11 h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black"
                              required
                            />
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                        <div className="relative mt-2">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-11 h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</Label>
                        <div className="relative mt-2">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={authMode === 'register' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-11 pr-11 h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black"
                            minLength={6}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {authError && (
                        <Alert className="border-red-200 bg-red-50 rounded-xl">
                          <AlertDescription className="text-red-800">{authError}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-black hover:bg-gray-800 text-white py-6 text-base rounded-full font-medium"
                        disabled={formAuthLoading}
                      >
                        {formAuthLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Processando...
                          </>
                        ) : authMode === 'register' ? (
                          'Criar Conta e Continuar'
                        ) : (
                          'Entrar e Continuar'
                        )}
                      </Button>
                    </form>

                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode(authMode === 'register' ? 'login' : 'register')
                          setAuthError('')
                        }}
                        className="text-gray-500 hover:text-black text-sm font-medium transition-colors"
                      >
                        {authMode === 'register' 
                          ? 'Já tem uma conta? Faça login' 
                          : 'Não tem conta? Cadastre-se'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 text-center mt-4">
                      Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
                    </p>
                  </div>
                </div>
              ) : (
                /* Stripe Checkout */
                <EmbeddedCheckout
                  priceId={priceId}
                  userId={authUser.id}
                  userEmail={authUser.email || ''}
                  userName={authUser.user_metadata?.full_name}
                  planName={planInfo.name}
                  amount={currentPrice.amount}
                  interval={currentPrice.interval}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-black" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
