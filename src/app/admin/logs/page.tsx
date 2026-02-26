'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Calendar,
  Clock,
  User,
  Activity,
  Lock,
  Unlock,
  LogIn,
  LogOut,
  Settings,
  Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { createClient } from '@/lib/supabase/client'
import AdminLayout from '@/components/admin/AdminLayout'

interface AccessLog {
  id: string
  admin_user_id: string
  admin_email: string
  action: string
  resource: string
  ip_address: string
  user_agent: string
  status: 'success' | 'failed' | 'blocked'
  details?: string
  created_at: string
}

interface LogStats {
  totalLogs: number
  successfulActions: number
  failedActions: number
  blockedAttempts: number
  uniqueAdmins: number
  todayLogs: number
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AccessLog[]>([])
  const [stats, setStats] = useState<LogStats>({
    totalLogs: 0,
    successfulActions: 0,
    failedActions: 0,
    blockedAttempts: 0,
    uniqueAdmins: 0,
    todayLogs: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()
  const { adminUser } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      loadLogs()
    }
  }, [adminUser])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, statusFilter, actionFilter, dateFilter])

  const loadLogs = async () => {
    setLoading(true)
    try {
      // Simular carregamento de logs
      const mockLogs: AccessLog[] = [
        {
          id: '1',
          admin_user_id: '1',
          admin_email: 'admin@exemplo.com',
          action: 'login',
          resource: '/admin/login',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          details: 'Login realizado com sucesso',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          admin_user_id: '1',
          admin_email: 'admin@exemplo.com',
          action: 'view_customers',
          resource: '/admin/customers',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          details: 'Visualização da lista de clientes',
          created_at: new Date(Date.now() - 300000).toISOString()
        },
        {
          id: '3',
          admin_user_id: '2',
          admin_email: 'supervisor@exemplo.com',
          action: 'login_failed',
          resource: '/admin/login',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'failed',
          details: 'Senha incorreta',
          created_at: new Date(Date.now() - 600000).toISOString()
        },

        {
          id: '5',
          admin_user_id: '3',
          admin_email: 'hacker@malicious.com',
          action: 'login_blocked',
          resource: '/admin/login',
          ip_address: '10.0.0.1',
          user_agent: 'curl/7.68.0',
          status: 'blocked',
          details: 'Tentativa de login bloqueada - muitas tentativas falhadas',
          created_at: new Date(Date.now() - 1200000).toISOString()
        },
        {
          id: '6',
          admin_user_id: '1',
          admin_email: 'admin@exemplo.com',
          action: 'deactivate_customer',
          resource: '/admin/customers',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          details: 'Cliente carlos@exemplo.com desativado',
          created_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: '7',
          admin_user_id: '1',
          admin_email: 'admin@exemplo.com',
          action: 'view_settings',
          resource: '/admin/settings',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          details: 'Visualização das configurações do sistema',
          created_at: new Date(Date.now() - 2400000).toISOString()
        },
        {
          id: '8',
          admin_user_id: '1',
          admin_email: 'admin@exemplo.com',
          action: 'logout',
          resource: '/admin',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success',
          details: 'Logout realizado',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]
      
      setLogs(mockLogs)
      
      // Calcular estatísticas
      const totalLogs = mockLogs.length
      const successfulActions = mockLogs.filter(log => log.status === 'success').length
      const failedActions = mockLogs.filter(log => log.status === 'failed').length
      const blockedAttempts = mockLogs.filter(log => log.status === 'blocked').length
      const uniqueAdmins = new Set(mockLogs.map(log => log.admin_email)).size
      const today = new Date().toDateString()
      const todayLogs = mockLogs.filter(log => new Date(log.created_at).toDateString() === today).length
      
      setStats({
        totalLogs,
        successfulActions,
        failedActions,
        blockedAttempts,
        uniqueAdmins,
        todayLogs
      })
      
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
      setError('Erro ao carregar logs de acesso')
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = logs
    
    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address.includes(searchTerm) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter)
    }
    
    // Filtro por ação
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action.includes(actionFilter))
    }
    
    // Filtro por data
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(log => 
            new Date(log.created_at).toDateString() === now.toDateString()
          )
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter(log => new Date(log.created_at) >= filterDate)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter(log => new Date(log.created_at) >= filterDate)
          break
      }
    }
    
    setFilteredLogs(filtered)
    setCurrentPage(1)
  }

  const exportLogs = () => {
    const csvContent = [
      ['Data/Hora', 'Admin', 'Ação', 'Recurso', 'IP', 'Status', 'Detalhes'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.admin_email,
        log.action,
        log.resource,
        log.ip_address,
        log.status,
        log.details || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs_acesso_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    setSuccess('Logs exportados com sucesso!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Falha</Badge>
      case 'blocked':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Bloqueado</Badge>
      default:
        return <Badge variant="secondary">Desconhecido</Badge>
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return <LogIn className="h-4 w-4" />
    if (action.includes('logout')) return <LogOut className="h-4 w-4" />
    if (action.includes('view')) return <Eye className="h-4 w-4" />
    if (action.includes('update') || action.includes('config')) return <Settings className="h-4 w-4" />
    if (action.includes('activate')) return <Unlock className="h-4 w-4" />
    if (action.includes('deactivate')) return <Lock className="h-4 w-4" />
    if (action.includes('blocked')) return <Shield className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLogs = filteredLogs.slice(startIndex, endIndex)

  if (!adminUser) {
    return <div>Carregando...</div>
  }

  return (
    <AdminLayout
      title="Logs de Acesso e Segurança"
      description="Monitore todas as atividades administrativas do sistema"
      currentPath="/admin/logs"
      onRefresh={loadLogs}
      refreshing={loading}
      actions={
        <Button onClick={exportLogs} variant="outline">
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Logs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sucessos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.successfulActions}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Falhas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.failedActions}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bloqueados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.blockedAttempts}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Admins Únicos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.uniqueAdmins}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayLogs}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Email, ação, IP..."
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
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="failed">Falha</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Ação</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                    <SelectItem value="view">Visualização</SelectItem>
                    <SelectItem value="update">Atualização</SelectItem>
                    <SelectItem value="activate">Ativação</SelectItem>
                    <SelectItem value="deactivate">Desativação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
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
                    setActionFilter('all')
                    setDateFilter('all')
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Acesso ({filteredLogs.length})</CardTitle>
            <CardDescription>
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} de {filteredLogs.length} registros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Data/Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Admin</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Ação</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Recurso</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">IP</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm">{formatDate(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                            <span className="text-blue-600 font-medium text-xs">
                              {log.admin_email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{log.admin_email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          {getActionIcon(log.action)}
                          <span className="ml-2 text-sm">{log.action}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">{log.resource}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono">{log.ip_address}</span>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {currentLogs.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Nenhum log encontrado</p>
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

      {/* Modal de Detalhes do Log */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Informações completas sobre a atividade selecionada
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data/Hora:</span>
                      <span>{formatDate(selectedLog.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Admin:</span>
                      <span>{selectedLog.admin_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ação:</span>
                      <span>{selectedLog.action}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(selectedLog.status)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Informações Técnicas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recurso:</span>
                      <span className="font-mono text-xs">{selectedLog.resource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IP:</span>
                      <span className="font-mono">{selectedLog.ip_address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID do Log:</span>
                      <span className="font-mono text-xs">{selectedLog.id}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">User Agent</h4>
                <p className="text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded">
                  {selectedLog.user_agent}
                </p>
              </div>
              
              {selectedLog.details && (
                <div>
                  <h4 className="font-medium mb-3">Detalhes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedLog.details}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
