'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CreditCard,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import AdminLayout from '@/components/admin/AdminLayout'

interface Customer {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  last_sign_in_at?: string
  is_active: boolean
  subscription_status: 'free' | 'trial' | 'paid'
  plan_name: string | null
  total_projects: number | null
  total_spent: number
  last_activity: string
}

interface CustomerStats {
  totalUsers: number
  mrr: number
  paidUsers: number
  trialUsers: number
  freeUsers: number
  trialsExpiringSoon: number
  weeklyGrowth: number
  todayLogins: number
  newThisWeek: number
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats>({
    totalUsers: 0,
    mrr: 0,
    paidUsers: 0,
    trialUsers: 0,
    freeUsers: 0,
    trialsExpiringSoon: 0,
    weeklyGrowth: 0,
    todayLogins: 0,
    newThisWeek: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()
  const { adminUser } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      loadStats()
      loadCustomers()
    }
  }, [adminUser])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchTerm, statusFilter, subscriptionFilter])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Falha ao carregar estatísticas')
      const data = await response.json()
      setStats({
        totalUsers: data.totalUsers ?? 0,
        mrr: data.mrr ?? 0,
        paidUsers: data.paidUsers ?? 0,
        trialUsers: data.trialUsers ?? 0,
        freeUsers: data.freeUsers ?? 0,
        trialsExpiringSoon: data.trialsExpiringSoon ?? 0,
        weeklyGrowth: data.weeklyGrowth ?? 0,
        todayLogins: data.todayLogins ?? 0,
        newThisWeek: data.newThisWeek ?? 0,
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users?limit=50&offset=0')
      if (!response.ok) throw new Error('Falha ao carregar clientes')

      const data = await response.json()
      const loaded: Customer[] = (data.users || []).map((u: {
        id: string
        email: string
        full_name: string | null
        created_at: string
        last_sign_in_at: string | null
        subscription_status: 'free' | 'trial' | 'paid'
        plan_name: string | null
        total_spent: number
      }) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name ?? undefined,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? undefined,
        is_active: true,
        subscription_status: u.subscription_status,
        plan_name: u.plan_name,
        total_projects: null,
        total_spent: u.total_spent / 100,
        last_activity: u.last_sign_in_at ?? u.created_at
      }))

      setCustomers(loaded)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setError('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    let filtered = customers
    
    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => 
        statusFilter === 'active' ? customer.is_active : !customer.is_active
      )
    }
    
    // Filtro por assinatura
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(customer => customer.subscription_status === subscriptionFilter)
    }
    
    setFilteredCustomers(filtered)
    setCurrentPage(1)
  }

  const handleCustomerAction = async (customerId: string, action: string) => {
    setError('')
    setSuccess('')
    
    try {
      switch (action) {
        case 'activate':
          setCustomers(prev => prev.map(c => 
            c.id === customerId ? { ...c, is_active: true } : c
          ))
          setSuccess('Cliente ativado com sucesso!')
          break
        case 'deactivate':
          setCustomers(prev => prev.map(c => 
            c.id === customerId ? { ...c, is_active: false } : c
          ))
          setSuccess('Cliente desativado com sucesso!')
          break
        case 'delete':
          if (confirm('Tem certeza que deseja excluir este cliente?')) {
            setCustomers(prev => prev.filter(c => c.id !== customerId))
            setSuccess('Cliente excluído com sucesso!')
          }
          break
        default:
          break
      }
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Erro ao executar ação')
    }
  }

  const exportCustomers = () => {
    const csvContent = [
      ['Email', 'Nome', 'Status', 'Assinatura', 'Projetos', 'Gasto Total', 'Criado em'].join(','),
      ...filteredCustomers.map(customer => [
        customer.email,
        customer.full_name || '',
        customer.is_active ? 'Ativo' : 'Inativo',
        customer.subscription_status,
        customer.total_projects,
        customer.total_spent.toFixed(2),
        new Date(customer.created_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    setSuccess('Dados exportados com sucesso!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const getStatusBadge = (customer: Customer) => {
    switch (customer.subscription_status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>
      case 'trial':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'free':
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Gratuito</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Paginação
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex)

  if (!adminUser) {
    return <div>Carregando...</div>
  }

  return (
    <AdminLayout
      title="Gerenciamento de Clientes"
      description="Visualize e gerencie todos os clientes da plataforma"
      currentPath="/admin/customers"
      onRefresh={loadCustomers}
      refreshing={loading}
      actions={
        <Button onClick={exportCustomers} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Stats — Linha 1: 4 KPIs principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total de Clientes */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className={`text-xs mt-1 ${stats.newThisWeek > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {stats.newThisWeek > 0 ? `+${stats.newThisWeek} esta semana` : 'Sem novos esta semana'}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receita do Mês */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita do Mês</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {(stats.mrr / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Conversão */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers > 0
                      ? Math.round((stats.paidUsers / stats.totalUsers) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs mt-1 text-gray-400">{stats.paidUsers} pagantes</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trials Expirando */}
          <Card
            className={`transition-colors ${stats.trialsExpiringSoon > 0 ? 'cursor-pointer hover:bg-amber-50' : ''}`}
            onClick={() => stats.trialsExpiringSoon > 0 && setSubscriptionFilter('trial')}
            role={stats.trialsExpiringSoon > 0 ? 'button' : undefined}
            tabIndex={stats.trialsExpiringSoon > 0 ? 0 : undefined}
            onKeyDown={(e) => {
              if (stats.trialsExpiringSoon > 0 && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                setSubscriptionFilter('trial')
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trials Expirando</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.trialsExpiringSoon}</p>
                  <p className="text-xs mt-1 text-gray-400">próximos 7 dias</p>
                </div>
                <div className={`p-3 rounded-lg ${
                  stats.trialsExpiringSoon === 0
                    ? 'bg-gray-100'
                    : stats.trialsExpiringSoon <= 5
                    ? 'bg-yellow-100'
                    : 'bg-orange-100'
                }`}>
                  <AlertTriangle className={`h-6 w-6 ${
                    stats.trialsExpiringSoon === 0
                      ? 'text-gray-400'
                      : stats.trialsExpiringSoon <= 5
                      ? 'text-yellow-600'
                      : 'text-orange-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats — Linha 2: Funil + Atividade */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Funil de Conversão */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-600 mb-4">Funil de Conversão</p>
              {[
                { label: 'Gratuito', count: stats.freeUsers, color: 'bg-gray-400' },
                { label: 'Trial', count: stats.trialUsers, color: 'bg-blue-400' },
                { label: 'Pago', count: stats.paidUsers, color: 'bg-green-500' },
              ].map(({ label, count, color }) => {
                const pct = stats.totalUsers > 0
                  ? Math.round((count / stats.totalUsers) * 100)
                  : 0
                return (
                  <div key={label} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-medium text-gray-900">
                        {count}{' '}
                        <span className="text-gray-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Crescimento Semanal */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Crescimento Semanal</p>
                  <p className={`text-2xl font-bold ${stats.weeklyGrowth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {stats.weeklyGrowth >= 0 ? '+' : ''}{Math.round(stats.weeklyGrowth)}%
                  </p>
                  <p className="text-xs mt-1 text-gray-400">vs. semana anterior</p>
                </div>
                <div className={`p-3 rounded-lg ${stats.weeklyGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`h-6 w-6 ${stats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logins Hoje */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Logins Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayLogins}</p>
                  <p className="text-xs mt-1 text-gray-400">usuários únicos</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Activity className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Email ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Assinatura</Label>
                <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="free">Gratuito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setSubscriptionFilter('all')
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes ({filteredCustomers.length})</CardTitle>
            <CardDescription>
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} de {filteredCustomers.length} clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Plano</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Gasto Total</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Última Atividade</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div
                          className="flex items-center cursor-pointer group"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-medium">
                              {customer.full_name?.charAt(0) || customer.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-blue-600">{customer.full_name || 'Nome não informado'}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(customer)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium">{customer.plan_name ?? '—'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium">
                          R$ {customer.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(customer.last_activity)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            {customer.is_active ? (
                              <DropdownMenuItem onClick={() => handleCustomerAction(customer.id, 'deactivate')}>
                                <UserX className="h-4 w-4 mr-2" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleCustomerAction(customer.id, 'activate')}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Ativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {currentCustomers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Nenhum cliente encontrado</p>
                  <p className="text-sm text-gray-400">Tente ajustar os filtros de busca</p>
                </div>
              )}
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes do Cliente */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações completas sobre o cliente selecionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {selectedCustomer.full_name?.charAt(0) || selectedCustomer.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.full_name || 'Nome não informado'}</h3>
                  <p className="text-gray-600">{selectedCustomer.email}</p>
                  {getStatusBadge(selectedCustomer)}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Informações Gerais</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data de Cadastro:</span>
                      <span>{formatDate(selectedCustomer.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Último Login:</span>
                      <span>{selectedCustomer.last_sign_in_at ? formatDate(selectedCustomer.last_sign_in_at) : 'Nunca'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status da Conta:</span>
                      <span>{selectedCustomer.is_active ? 'Ativa' : 'Inativa'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Estatísticas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de Projetos:</span>
                      <span className="font-medium">{selectedCustomer.total_projects ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gasto Total:</span>
                      <span className="font-medium">
                        R$ {selectedCustomer.total_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plano:</span>
                      <span>{selectedCustomer.plan_name ?? selectedCustomer.subscription_status}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex space-x-3">
                {selectedCustomer.is_active ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleCustomerAction(selectedCustomer.id, 'deactivate')
                      setSelectedCustomer(null)
                    }}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Desativar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleCustomerAction(selectedCustomer.id, 'activate')
                      setSelectedCustomer(null)
                    }}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Ativar
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    handleCustomerAction(selectedCustomer.id, 'delete')
                    setSelectedCustomer(null)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}