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
import { User } from '@supabase/supabase-js'
import EmbeddedCheckout from '@/components/stripe/EmbeddedCheckout'
import { STRIPE_PLANS, formatCurrency } from '@/lib/stripe'
import { cn } from '@/lib/utils'

type BillingInterval = 'monthly' | 'yearly'
type AuthMode = 'login' | 'register'

function CheckoutContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const planKey = searchParams.get('plan') as 'basic' | 'premium' | null
  const intervalFromUrl = searchParams.get('interval') as BillingInterval | null

  useEffect(() => {
    if (intervalFromUrl) {
      setBillingInterval(intervalFromUrl)
    }
  }, [intervalFromUrl])

  // Get current price ID based on selected interval
  const priceId = planKey && STRIPE_PLANS[planKey] 
    ? STRIPE_PLANS[planKey].prices[billingInterval].priceId 
    : null

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (err) {
      console.error('Error checking user:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
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
          // Auto-login após cadastro (se confirmação não for necessária)
          if (data.session) {
            setUser(data.user)
          } else {
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

        if (data.user) {
          setUser(data.user)
        }
      }
    } catch (err) {
      setAuthError('Ocorreu um erro. Tente novamente.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setAuthLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        },
      })
    } catch (err) {
      setAuthError('Erro ao conectar com Google')
      setAuthLoading(false)
    }
  }

  // Get plan details
  const getPlanInfo = () => {
    if (!planKey || !STRIPE_PLANS[planKey]) {
      return null
    }
    return STRIPE_PLANS[planKey]
  }

  const planInfo = getPlanInfo()
  const currentPrice = planInfo?.prices[billingInterval]

  const yearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12
    const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100
    return Math.round(discount)
  }

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

  if (!planKey || !planInfo || !priceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Plano não encontrado
          </h2>
          <p className="text-gray-600 mb-6">
            O plano selecionado não foi encontrado. Por favor, escolha um plano válido.
          </p>
          <Button onClick={() => router.push('/#planos')}>
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
              onClick={() => router.push('/#planos')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Planos
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Checkout Seguro</h1>
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Plan Details (Left Side) */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {planInfo.name}
              </h2>
              <p className="text-gray-600 mb-6">{planInfo.description}</p>

              {/* Billing Toggle */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Período de cobrança
                </Label>
                <div className="bg-gray-100 p-1 rounded-xl flex">
                  <button
                    onClick={() => setBillingInterval('monthly')}
                    className={cn(
                      'flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                      billingInterval === 'monthly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <span className="block">Mensal</span>
                    <span className="block text-lg font-bold mt-1">
                      {formatCurrency(planInfo.prices.monthly.amount, 'brl')}
                    </span>
                  </button>
                  <button
                    onClick={() => setBillingInterval('yearly')}
                    className={cn(
                      'flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all relative',
                      billingInterval === 'yearly'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {billingInterval !== 'yearly' && (
                      <span className="absolute -top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        -{yearlyDiscount(planInfo.prices.monthly.amount, planInfo.prices.yearly.amount)}%
                      </span>
                    )}
                    <span className="block">Anual</span>
                    <span className="block text-lg font-bold mt-1">
                      {formatCurrency(planInfo.prices.yearly.amount, 'brl')}
                    </span>
                    {billingInterval === 'yearly' && (
                      <span className="block text-xs text-green-600 mt-1">
                        Economia de {yearlyDiscount(planInfo.prices.monthly.amount, planInfo.prices.yearly.amount)}%
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Resumo do Pedido</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{planInfo.name}</span>
                    <span>{formatCurrency(currentPrice!.amount, 'brl')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Período</span>
                    <span>{billingInterval === 'monthly' ? 'Mensal' : 'Anual'}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-violet-600">
                      {formatCurrency(currentPrice!.amount, 'brl')}
                      <span className="text-sm font-normal text-gray-500">
                        /{billingInterval === 'monthly' ? 'mês' : 'ano'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-gray-900 mb-4">O que está incluso:</h3>
                <ul className="space-y-3">
                  {planInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Guarantee Badge */}
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          {/* Auth/Checkout Form (Right Side) */}
          <div className="order-1 lg:order-2">
            {!user ? (
              /* Auth Form */
              <Card className="shadow-xl">
                <CardHeader className="text-center border-b pb-6">
                  <CardTitle className="text-2xl">
                    {authMode === 'register' ? 'Criar Conta' : 'Entrar'}
                  </CardTitle>
                  <CardDescription>
                    {authMode === 'register' 
                      ? 'Crie sua conta para continuar com a assinatura' 
                      : 'Entre na sua conta para continuar'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Google Auth Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-6 py-6"
                    onClick={handleGoogleAuth}
                    disabled={authLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </Button>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">ou</span>
                    </div>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                    {authMode === 'register' && (
                      <div>
                        <Label htmlFor="fullName">Nome completo</Label>
                        <div className="relative mt-1">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Seu nome"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={authMode === 'register' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {authError && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">{authError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-violet-600 hover:bg-violet-700 py-6 text-lg"
                      disabled={authLoading}
                    >
                      {authLoading ? (
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
                      className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                    >
                      {authMode === 'register' 
                        ? 'Já tem uma conta? Faça login' 
                        : 'Não tem conta? Cadastre-se'}
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Stripe Checkout */
              <EmbeddedCheckout
                priceId={priceId}
                userId={user.id}
                userEmail={user.email || ''}
                userName={user.user_metadata?.full_name}
              />
            )}
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
