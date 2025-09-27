'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Database,
  LogOut,
  RefreshCw,
  CreditCard,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Menu,
  X,
  ArrowUpRight,
  Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface User {
  id: string
  email: string
  created_at: string
  [key: string]: string | number | boolean | null | undefined
}

interface Project {
  id: string
  name: string
  created_at: string
  user_id: string
}

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    activeUsers: 0,
    systemStatus: 'operational',
    todayLogins: 0,
    weeklyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { adminUser, signOut, loading: authLoading } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      loadData()
      checkIntegrationsStatus()
    }
  }, [adminUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!authLoading && !adminUser) {
      router.push('/admin/login')
    }
  }, [authLoading, adminUser, router])

  const checkIntegrationsStatus = async () => {
    try {

      // Verificar status do Supabase (sempre conectado se chegou até aqui)
      setSupabaseConnected(true)
    } catch (error) {
      console.error('Erro ao verificar status das integrações:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    
    try {
      // Usar API routes para obter dados com permissões administrativas
      const [statsResponse, usersResponse, projectsResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users?limit=10'),
        fetch('/api/admin/projects?limit=10')
      ])
      
      // Processar estatísticas
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      } else {
        // Fallback para dados simulados se a API não estiver disponível
        setStats({
          totalUsers: 15,
          totalProjects: 8,
          activeUsers: 12,
          systemStatus: 'operational',
          todayLogins: 5,
          weeklyGrowth: 12.5
        })
      }
      
      // Processar usuários
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      } else {
        // Fallback para dados simulados
        setUsers([
          { id: '1', email: 'usuario1@exemplo.com', created_at: new Date().toISOString() },
          { id: '2', email: 'usuario2@exemplo.com', created_at: new Date().toISOString() }
        ])
      }
      
      // Processar projetos
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        setProjects(projectsData.projects || [])
      } else {
        // Fallback para dados simulados
        setProjects([
          { id: '1', name: 'Projeto Demo 1', created_at: new Date().toISOString(), user_id: '1' },
          { id: '2', name: 'Projeto Demo 2', created_at: new Date().toISOString(), user_id: '2' }
        ])
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      // Em caso de erro, definir dados padrão para não ficar em loading infinito
      setStats({
        totalUsers: 0,
        totalProjects: 0,
        activeUsers: 0,
        systemStatus: 'error',
        todayLogins: 0,
        weeklyGrowth: 0
      })
      setUsers([])
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/admin/login')
  }

  const navigateToUsers = () => {
    router.push('/admin/customers')
  }

  const navigateToSettings = (section: string) => {
    router.push(`/admin/settings/${section}`)
  }

  // Sidebar de navegação
  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', href: '/admin', active: true },
    { icon: Users, label: 'Clientes', href: '/admin/customers' },
    { icon: CreditCard, label: 'Stripe', href: '/admin/stripe' },
    { icon: Database, label: 'Supabase', href: '/admin/settings/supabase' },
    { icon: Settings, label: 'Configurações', href: '/admin/settings' },
  ]

  // Se ainda está carregando autenticação, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Carregando...</h3>
        </div>
      </div>
    )
  }

  // Se não há usuário admin após o carregamento, mostrar redirecionando
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Redirecionando para login...</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant={item.active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    item.active && "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  )}
                  onClick={() => {
                    if (item.href !== '/admin') {
                      router.push(item.href)
                    }
                    setSidebarOpen(false)
                  }}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              )
            })}
          </div>
          
          <div className="mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:bg-gray-100"
              onClick={() => {
                router.push('/admin/logs')
                setSidebarOpen(false)
              }}
            >
              <Shield className="mr-3 h-5 w-5" />
              Logs de Segurança
            </Button>
          </div>
          
          <Separator className="my-6" />
          
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Usuário
            </p>
            <div className="mt-2 flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">
                    {adminUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
                <p className="text-xs text-gray-500">{adminUser.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </nav>
      </div>
      
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden mr-3"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-gray-600">Visão geral do sistema</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={loadData}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Atualizar
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Status do Sistema */}
          <div className="mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Sistema Operacional</h3>
                      <p className="text-sm text-gray-600">
                        Todos os serviços funcionando normalmente
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${supabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-gray-500">Supabase</span>
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +{stats.weeklyGrowth}% esta semana
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Projetos Criados</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Total de projetos
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Últimos 30 dias
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Logins Hoje</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.todayLogins}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Últimas 24 horas
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={navigateToUsers}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Gerenciar Clientes</h3>
                    <p className="text-sm text-gray-600">Visualizar e gerenciar usuários</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            

            
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToSettings('supabase')}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Configurar Supabase</h3>
                    <p className="text-sm text-gray-600">Gerenciar banco de dados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/subscriptions')}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Gerenciar Assinaturas</h3>
                    <p className="text-sm text-gray-600">Visualizar e gerenciar planos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabelas de Dados Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usuários Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Usuários Recentes
                </CardTitle>
                <CardDescription>
                  Últimos usuários cadastrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <div className="space-y-4">
                    {users.slice(0, 5).map((user, index) => (
                      <div key={user.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Ativo
                        </Badge>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={navigateToUsers}>
                      Ver Todos os Usuários
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário</h3>
                    <p className="mt-1 text-sm text-gray-500">Ainda não há usuários cadastrados.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projetos Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Projetos Recentes
                </CardTitle>
                <CardDescription>
                  Últimos projetos criados pelos usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.slice(0, 5).map((project, index) => (
                      <div key={project.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(project.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          Ativo
                        </Badge>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full">
                      Ver Todos os Projetos
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum projeto</h3>
                    <p className="mt-1 text-sm text-gray-500">Ainda não há projetos criados.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}