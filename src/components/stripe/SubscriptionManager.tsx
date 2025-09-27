'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  CreditCard,
  Calendar,
  DollarSign,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { formatCurrency } from '@/lib/stripe'

interface Subscription {
  id: string
  stripe_subscription_id: string
  status: string
  plan_id: string
  plan_name: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string
  trial_start?: string
  trial_end?: string
}

interface Payment {
  id: string
  stripe_payment_intent_id: string
  amount: number
  currency: string
  status: string
  description?: string
  created_at: string
}

interface SubscriptionManagerProps {
  userId: string
}

export default function SubscriptionManager({ userId }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSubscriptionData()
  }, [userId])

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
      
      // Load subscription
      const subResponse = await fetch(`/api/stripe/subscriptions?userId=${userId}`)
      const subData = await subResponse.json()
      
      if (subResponse.ok && subData.activeSubscription) {
        setSubscription(subData.activeSubscription)
      }

      // Load payments
      const payResponse = await fetch(`/api/stripe/payments?userId=${userId}&limit=5`)
      const payData = await payResponse.json()
      
      if (payResponse.ok) {
        setPayments(payData.payments || [])
      }

    } catch (err) {
      setError('Erro ao carregar dados da assinatura')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async (immediate: boolean = false) => {
    if (!subscription) return

    setActionLoading('cancel')
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/stripe/subscriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          action: immediate ? 'cancel_immediately' : 'cancel'
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(
          immediate 
            ? 'Assinatura cancelada imediatamente' 
            : 'Assinatura será cancelada no final do período atual'
        )
        await loadSubscriptionData()
      } else {
        setError(data.error || 'Erro ao cancelar assinatura')
      }
    } catch (err) {
      setError('Erro ao cancelar assinatura')
    } finally {
      setActionLoading('')
    }
  }

  const handleManageBilling = async () => {
    setActionLoading('billing')
    setError('')

    try {
      const response = await fetch(`/api/stripe/checkout?userId=${userId}&action=billing_portal`)
      const data = await response.json()

      if (response.ok) {
        window.open(data.portalUrl, '_blank')
      } else {
        setError(data.error || 'Erro ao abrir portal de cobrança')
      }
    } catch (err) {
      setError('Erro ao abrir portal de cobrança')
    } finally {
      setActionLoading('')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Ativa' },
      trialing: { color: 'bg-blue-100 text-blue-800', icon: Calendar, label: 'Teste' },
      canceled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelada' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Vencida' },
      incomplete: { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle, label: 'Incompleta' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando assinatura...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Card */}
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Minha Assinatura
                </CardTitle>
                <CardDescription>
                  Gerencie sua assinatura e métodos de pagamento
                </CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">Plano Atual</h4>
                <p className="text-lg font-semibold text-blue-600">{subscription.plan_name}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Próxima Cobrança</h4>
                <p className="text-gray-600">
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
            </div>

            {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
              <Alert className="border-blue-200 bg-blue-50">
                <Calendar className="h-4 w-4" />
                <AlertDescription className="text-blue-800">
                  Seu período de teste termina em {formatDate(subscription.trial_end)}
                </AlertDescription>
              </Alert>
            )}

            {subscription.cancel_at_period_end && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-yellow-800">
                  Sua assinatura será cancelada em {formatDate(subscription.current_period_end)}
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleManageBilling}
                disabled={actionLoading === 'billing'}
                variant="outline"
              >
                {actionLoading === 'billing' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Gerenciar Cobrança
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>

              {!subscription.cancel_at_period_end && subscription.status === 'active' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Cancelar Assinatura
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancelar Assinatura</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja cancelar sua assinatura?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Você pode cancelar no final do período atual ou imediatamente.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCancelSubscription(false)}
                          disabled={actionLoading === 'cancel'}
                          variant="outline"
                        >
                          {actionLoading === 'cancel' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Cancelar no Final do Período
                        </Button>
                        <Button
                          onClick={() => handleCancelSubscription(true)}
                          disabled={actionLoading === 'cancel'}
                          variant="destructive"
                        >
                          {actionLoading === 'cancel' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Cancelar Imediatamente
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma assinatura ativa
            </h3>
            <p className="text-gray-600 mb-4">
              Você não possui uma assinatura ativa no momento.
            </p>
            <Button onClick={() => window.location.href = '/plans'}>
              Ver Planos Disponíveis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Histórico de Pagamentos
            </CardTitle>
            <CardDescription>
              Últimos pagamentos realizados
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {payment.description || 'Pagamento de assinatura'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}