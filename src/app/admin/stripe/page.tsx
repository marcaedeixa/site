'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Settings,
  ExternalLink,
  Download
} from 'lucide-react'
import { formatCurrency } from '@/lib/stripe'
import AdminLayout from '@/components/admin/AdminLayout'

interface StripeStats {
  totalCustomers: number
  activeSubscriptions: number
  totalRevenue: number
  monthlyRevenue: number
  failedPayments: number
  trialSubscriptions: number
}

interface StripeCustomer {
  id: string
  stripe_customer_id: string
  email: string
  name?: string
  created_at: string
}

interface StripeSubscription {
  id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: string
  plan_id: string
  plan_name: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string
  customer_email?: string
}

interface StripePayment {
  id: string
  stripe_payment_intent_id: string
  amount: number
  currency: string
  status: string
  description?: string
  created_at: string
  customer_email?: string
}

export default function AdminStripePage() {
  const [stats, setStats] = useState<StripeStats>({
    totalCustomers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    failedPayments: 0,
    trialSubscriptions: 0
  })
  const [customers, setCustomers] = useState<StripeCustomer[]>([])
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([])
  const [payments, setPayments] = useState<StripePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [syncingProducts, setSyncingProducts] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown')

  useEffect(() => {
    loadStripeData()
  }, [])

  const loadStripeData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load stats
      await loadStats()
      
      // Load customers
      await loadCustomers()
      
      // Load subscriptions
      await loadSubscriptions()
      
      // Load payments
      await loadPayments()

    } catch (err) {
      setError('Erro ao carregar dados do Stripe')
      console.error('Error loading Stripe data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Carregar estatísticas reais do banco de dados
      const response = await fetch('/api/stripe/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        // Fallback para dados mock se a API não existir ainda
        setStats({
          totalCustomers: 0,
          activeSubscriptions: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          failedPayments: 0,
          trialSubscriptions: 0
        })
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      // Fallback para dados mock
      setStats({
        totalCustomers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        failedPayments: 0,
        trialSubscriptions: 0
      })
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/admin/stripe/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setCustomers([])
    }
  }

  const loadSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/stripe/subscriptions')
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data.subscriptions || [])
      } else {
        setSubscriptions([])
      }
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error)
      setSubscriptions([])
    }
  }

  const loadPayments = async () => {
    try {
      const response = await fetch('/api/admin/stripe/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
      } else {
        setPayments([])
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error)
      setPayments([])
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Ativa' },
      trialing: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Teste' },
      canceled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelada' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Vencida' },
      succeeded: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Sucesso' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Falhou' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Pendente' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-100 text-gray-800',
      icon: AlertTriangle,
      label: status
    }
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

  const openStripeCustomer = (customerId: string) => {
    window.open(`https://dashboard.stripe.com/customers/${customerId}`, '_blank')
  }

  const openStripeSubscription = (subscriptionId: string) => {
    window.open(`https://dashboard.stripe.com/subscriptions/${subscriptionId}`, '_blank')
  }

  const openStripePayment = (paymentId: string) => {
    window.open(`https://dashboard.stripe.com/payments/${paymentId}`, '_blank')
  }

  const syncProducts = async () => {
    try {
      setSyncingProducts(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/stripe/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync' })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Produtos sincronizados com sucesso!')
        await loadStripeData() // Recarregar dados
      } else {
        setError(data.error || 'Erro ao sincronizar produtos')
      }
    } catch (err) {
      setError('Erro ao sincronizar produtos')
      console.error('Error syncing products:', err)
    } finally {
      setSyncingProducts(false)
    }
  }

  const testConnection = async () => {
    try {
      setTestingConnection(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/stripe/test-connection')
      const data = await response.json()

      if (data.success) {
        setConnectionStatus('connected')
        setSuccess(`Conexão estabelecida! Modo: ${data.mode}`)
      } else {
        setConnectionStatus('error')
        setError(data.error || 'Erro ao testar conexão')
      }
    } catch (err) {
      setConnectionStatus('error')
      setError('Erro ao testar conexão com Stripe')
      console.error('Error testing connection:', err)
    } finally {
      setTestingConnection(false)
    }
  }

  const configureWebhooks = async () => {
    try {
      setError('')
      setSuccess('')

      const response = await fetch('/api/stripe/webhook-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'create' })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Webhook configurado com sucesso!')
      } else {
        setError(data.error || 'Erro ao configurar webhook')
      }
    } catch (err) {
      setError('Erro ao configurar webhook')
      console.error('Error configuring webhook:', err)
    }
  }

  return (
    <AdminLayout
      title="Stripe Dashboard"
      description="Gerencie pagamentos, assinaturas e clientes"
      currentPath="/admin/stripe"
      onRefresh={loadStripeData}
      refreshing={loading}
      actions={
        <Button onClick={() => window.open('https://dashboard.stripe.com', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Stripe Dashboard
        </Button>
      }
    >
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Falharam</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testes Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trialSubscriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Assinaturas</CardTitle>
              <CardDescription>
                Gerencie todas as assinaturas do Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Próxima Cobrança</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>{subscription.customer_email}</TableCell>
                      <TableCell>{subscription.plan_name}</TableCell>
                      <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                      <TableCell>{formatDate(subscription.current_period_start)}</TableCell>
                      <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStripeSubscription(subscription.stripe_subscription_id)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>
                Visualize todos os clientes do Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>ID do Stripe</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{customer.stripe_customer_id}</TableCell>
                      <TableCell>{formatDate(customer.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStripeCustomer(customer.stripe_customer_id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos</CardTitle>
              <CardDescription>
                Histórico de todos os pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.customer_email}</TableCell>
                      <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStripePayment(payment.stripe_payment_intent_id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Stripe</CardTitle>
              <CardDescription>
                Gerencie configurações e webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status da Conexão</CardTitle>
                    <CardDescription>
                      Teste a conexão com o Stripe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      {connectionStatus === 'connected' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                      )}
                      {connectionStatus === 'error' && (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                      {connectionStatus === 'unknown' && (
                        <Badge className="bg-gray-100 text-gray-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Não testado
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={testConnection}
                      disabled={testingConnection}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${testingConnection ? 'animate-spin' : ''}`} />
                      {testingConnection ? 'Testando...' : 'Testar Conexão'}
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Webhooks</CardTitle>
                    <CardDescription>
                      Configure e monitore webhooks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={configureWebhooks}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar Webhooks
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open('https://dashboard.stripe.com/webhooks', '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Logs de Webhook
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Produtos e Preços</CardTitle>
                    <CardDescription>
                      Gerencie produtos no Stripe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={syncProducts}
                      disabled={syncingProducts}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncingProducts ? 'animate-spin' : ''}`} />
                      {syncingProducts ? 'Sincronizando...' : 'Sincronizar Produtos'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open('https://dashboard.stripe.com/products', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver no Stripe
                    </Button>
                  </CardContent>
                </Card>
                </div>
              </div>

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Modo de Teste:</strong> A aplicação está configurada para usar o modo de teste do Stripe.
                  Para produção, atualize as chaves de API nas variáveis de ambiente.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AdminLayout>
  )
}