'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
  Eye,
  Edit,
  Trash2,
  Plus,
  Crown,
  Shield,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin/AdminLayout'

interface SubscriptionStats {
  totalSubscriptions: number
  activeSubscriptions: number
  trialSubscriptions: number
  expiredSubscriptions: number
  monthlyRevenue: number
  totalRevenue: number
}

interface UserSubscription {
  id: string
  user_id: string
  user_email: string
  plan_name: string
  status: string
  start_date: string
  end_date: string
  is_trial: boolean
  days_remaining: number
  created_at: string
}

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

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<SubscriptionStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    expiredSubscriptions: 0,
    monthlyRevenue: 0,
    totalRevenue: 0
  })
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<UserSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cancelConfirming, setCancelConfirming] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [changePlanLoading, setChangePlanLoading] = useState(false)
  const [availablePrices, setAvailablePrices] = useState<Array<{
    priceId: string
    label: string
    amount: number
  }>>([])
  const [selectedPriceId, setSelectedPriceId] = useState('')

  const router = useRouter()
  const { adminUser } = useAdminAuth()
  const supabase = createClient()

  useEffect(() => {
    if (adminUser) {
      loadData()
    }
  }, [adminUser])

  useEffect(() => {
    filterSubscriptions()
  }, [subscriptions, searchTerm, statusFilter, planFilter])

  useEffect(() => {
    if (!selectedSubscription) {
      setCancelConfirming(false)
      setChangingPlan(false)
      setSelectedPriceId('')
      return
    }

    const isActive = selectedSubscription.status !== 'cancelled' && selectedSubscription.days_remaining > 0
    if (!isActive) return

    setAvailablePrices([])
    fetch('/api/stripe/prices')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.plans) return
        const prices: Array<{ priceId: string; label: string; amount: number }> = []
        for (const plan of data.plans) {
          if (plan.prices?.monthly) {
            prices.push({
              priceId: plan.prices.monthly.priceId,
              label: `${plan.name} — Mensal`,
              amount: plan.prices.monthly.amount,
            })
          }
          if (plan.prices?.yearly) {
            prices.push({
              priceId: plan.prices.yearly.priceId,
              label: `${plan.name} — Anual`,
              amount: plan.prices.yearly.amount,
            })
          }
        }
        setAvailablePrices(prices)
      })
      .catch(() => {})
  }, [selectedSubscription])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadSubscriptions(),
        loadPlans(),
      ])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const loadSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions')
      if (!res.ok) throw new Error('Falha ao buscar assinaturas')
      const data = await res.json()

      setSubscriptions(data.subscriptions || [])
      setStats(data.stats || stats)
    } catch (error) {
      console.error('Erro ao carregar assinaturas:', error)
    }
  }

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true })

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
    }
  }

  const filterSubscriptions = () => {
    let filtered = subscriptions

    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(sub => 
          sub.status === 'active' && sub.days_remaining > 0
        )
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(sub => 
          sub.status === 'active' && sub.days_remaining <= 0
        )
      } else {
        filtered = filtered.filter(sub => sub.status === statusFilter)
      }
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(sub => sub.plan_name === planFilter)
    }

    setFilteredSubscriptions(filtered)
  }

  const getStatusBadge = (subscription: UserSubscription) => {
    if (subscription.status === 'cancelled') {
      return <Badge variant="destructive">Cancelada</Badge>
    }
    
    if (subscription.days_remaining <= 0) {
      return <Badge variant="destructive">Expirada</Badge>
    }
    
    if (subscription.is_trial) {
      return <Badge className="bg-blue-100 text-blue-800">Teste Grátis</Badge>
    }
    
    return <Badge className="bg-green-100 text-green-800">Ativa</Badge>
  }

  const getPlanIcon = (planName: string) => {
    if (planName.includes('Teste')) return <Zap className="h-4 w-4" />
    if (planName.includes('Básico')) return <Shield className="h-4 w-4" />
    if (planName.includes('Premium')) return <Crown className="h-4 w-4" />
    return <Shield className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleCancelSubscription = async () => {
    if (!selectedSubscription) return
    setCancelLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedSubscription.user_id, action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar')
      setSuccess(`Assinatura de ${selectedSubscription.user_email} será cancelada ao fim do período.`)
      setSelectedSubscription(null)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar assinatura')
    } finally {
      setCancelLoading(false)
      setCancelConfirming(false)
    }
  }

  const handleChangePlan = async () => {
    if (!selectedSubscription || !selectedPriceId) return
    setChangePlanLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedSubscription.user_id,
          action: 'change_plan',
          newPriceId: selectedPriceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao trocar plano')
      setSuccess(`Plano de ${selectedSubscription.user_email} atualizado com sucesso.`)
      setSelectedSubscription(null)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao trocar plano')
    } finally {
      setChangePlanLoading(false)
      setChangingPlan(false)
    }
  }

  if (!adminUser) {
    return <div>Carregando...</div>
  }

  return (
    <AdminLayout
      title="Gerenciar Assinaturas"
      description="Visualize e gerencie todas as assinaturas dos usuários"
      currentPath="/admin/subscriptions"
      onRefresh={loadData}
      refreshing={loading}
    >
      <div className="space-y-6">
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Assinaturas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.trialSubscriptions} em período de teste
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.monthlyRevenue)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expiredSubscriptions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Buscar por email ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Planos</SelectItem>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.name}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Assinaturas */}
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas ({filteredSubscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Dias Restantes</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.user_email}</div>
                          <div className="text-sm text-gray-500">
                            ID: {subscription.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getPlanIcon(subscription.plan_name)}
                          <span className="ml-2">{subscription.plan_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(subscription)}</TableCell>
                      <TableCell>{formatDate(subscription.start_date)}</TableCell>
                      <TableCell>{formatDate(subscription.end_date)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          subscription.days_remaining <= 0 ? 'text-red-600' :
                          subscription.days_remaining <= 7 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {subscription.days_remaining <= 0 ? 'Expirada' : `${subscription.days_remaining} dias`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubscription(subscription)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredSubscriptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma assinatura encontrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedSubscription} onOpenChange={() => setSelectedSubscription(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>
              Informações completas da assinatura selecionada
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email do Usuário</label>
                  <p className="text-sm text-gray-900">{selectedSubscription.user_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Plano</label>
                  <p className="text-sm text-gray-900">{selectedSubscription.plan_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedSubscription)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <p className="text-sm text-gray-900">
                    {selectedSubscription.is_trial ? 'Período de Teste' : 'Assinatura Paga'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data de Início</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSubscription.start_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data de Fim</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSubscription.end_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Dias Restantes</label>
                  <p className={`text-sm font-medium ${
                    selectedSubscription.days_remaining <= 0 ? 'text-red-600' :
                    selectedSubscription.days_remaining <= 7 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {selectedSubscription.days_remaining <= 0 ? 'Expirada' : `${selectedSubscription.days_remaining} dias`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Criada em</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSubscription.created_at)}</p>
                </div>
              </div>

              {selectedSubscription.status !== 'cancelled' && selectedSubscription.days_remaining > 0 && (
                <div className="pt-4 border-t space-y-3">
                  {/* Trocar Plano */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => { setChangingPlan(v => !v); setCancelConfirming(false) }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Trocar Plano
                    </Button>

                    {changingPlan && (
                      <div className="mt-3 space-y-2">
                        <Select value={selectedPriceId} onValueChange={setSelectedPriceId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o novo plano..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePrices.map(p => (
                              <SelectItem key={p.priceId} value={p.priceId}>
                                {p.label} — {formatCurrency(p.amount / 100)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!selectedPriceId || changePlanLoading}
                          onClick={handleChangePlan}
                        >
                          {changePlanLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                          Confirmar Troca
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Cancelar Assinatura */}
                  <div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => { setCancelConfirming(v => !v); setChangingPlan(false) }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancelar Assinatura
                    </Button>

                    {cancelConfirming && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                        <p className="text-sm text-red-800">
                          O usuário manterá acesso até <strong>{formatDate(selectedSubscription.end_date)}</strong>. Confirmar cancelamento?
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          disabled={cancelLoading}
                          onClick={handleCancelSubscription}
                        >
                          {cancelLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                          Sim, Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}