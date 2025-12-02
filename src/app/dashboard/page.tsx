'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Calendar, 
  BarChart3,
  LogOut,
  Edit,
  Loader2,
  Settings,
  RefreshCw,
  Trash2,
  Crown
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CreateProjectModal } from '@/components/CreateProjectModal'
import { getProjects, deleteProject } from '@/lib/projects'
import DebugAuth from '@/components/DebugAuth'
import ProjectCardSkeleton from '@/components/ProjectCardSkeleton'
import { TrialWarningBanner } from '@/components/SubscriptionGate'
import { useTrialStatus, getStatusMessage, getStatusColor } from '@/hooks/useTrialStatus'

interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  [key: string]: string | number | boolean | null | undefined
}

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastFetch, setLastFetch] = useState<number>(0)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<Project | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const cacheRef = useRef<{ data: Project[], timestamp: number } | null>(null)
  const CACHE_DURATION = 30000 // 30 segundos
  const router = useRouter()

  const { signOut, user, loading: authLoading } = useAuth()
  const trialStatus = useTrialStatus(user)

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  // Carregar projetos do Supabase com cache
  const loadProjects = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      return
    }
    
    const now = Date.now()
    
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && cacheRef.current && (now - cacheRef.current.timestamp) < CACHE_DURATION) {
      setProjects(cacheRef.current.data)
      setLoading(false)
      return
    }
    
    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')
    
    try {
      const { data, error: fetchError } = await getProjects(user.id)
      
      if (fetchError) {
        setError('Erro ao carregar projetos: ' + (typeof fetchError === 'object' && fetchError && 'message' in fetchError ? fetchError.message : 'Erro desconhecido'))
        return
      }
      
      const projectsData = data || []
      setProjects(projectsData)
      setHasInitialLoad(true)
      
      // Atualizar cache
      cacheRef.current = {
        data: projectsData,
        timestamp: now
      }
      setLastFetch(now)
      
    } catch (err) {
      setError('Erro inesperado ao carregar projetos')
      console.error('Erro:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, CACHE_DURATION])

  // Carregar projetos quando o usuário estiver disponível
  useEffect(() => {
    if (user?.id && !authLoading && !hasInitialLoad) {
      loadProjects()
    }
  }, [user?.id, authLoading, hasInitialLoad, loadProjects])
  
  // Fallback: Tentar carregar projetos após 2 segundos se ainda não carregou
  useEffect(() => {
    if (!authLoading && user?.id && !hasInitialLoad) {
      const fallbackTimer = setTimeout(() => {
        if (!hasInitialLoad) {
          loadProjects()
        }
      }, 2000)
      
      return () => clearTimeout(fallbackTimer)
    }
  }, [user?.id, authLoading, hasInitialLoad, loadProjects])

  // Resetar cache e recarregar quando o usuário mudar
  useEffect(() => {
    if (!authLoading && user?.id) {
      // Limpar cache e estado ao trocar de usuário
      cacheRef.current = null
      setProjects([])
      setHasInitialLoad(false)
      // Forçar recarregamento imediato para o novo usuário
      loadProjects(true)
    }
  }, [user?.id, authLoading, loadProjects])
  
  // Auto-refresh a cada 2 minutos
  useEffect(() => {
    if (!user?.id || authLoading) return
    
    const interval = setInterval(() => {
      loadProjects(true)
    }, 120000) // 2 minutos
    
    return () => clearInterval(interval)
  }, [user?.id, authLoading, loadProjects])

  // Callback para quando um novo projeto for criado
  const handleProjectCreated = (newProject: Project) => {
    // Adicionar um pequeno delay para evitar conflitos com RSC
    setTimeout(() => {
      setProjects(prev => [newProject, ...prev])
      // Atualizar cache
      if (cacheRef.current) {
        cacheRef.current = {
          data: [newProject, ...cacheRef.current.data],
          timestamp: Date.now()
        }
      }
    }, 100)
  }
  
  // Função para refresh manual
  const handleRefresh = () => {
    setHasInitialLoad(false) // Reset para permitir novo carregamento
    loadProjects(true)
  }

  // Função para abrir confirmação de exclusão
  const handleDeleteProject = (project: Project) => {
    setConfirmDeleteProject(project)
    setShowDeleteConfirm(true)
  }

  // Função para cancelar exclusão
  const handleCancelDelete = () => {
    setConfirmDeleteProject(null)
    setShowDeleteConfirm(false)
  }

  // Função para confirmar e executar exclusão
  const handleConfirmDelete = async () => {
    if (!confirmDeleteProject) return
    
    setDeletingProject(confirmDeleteProject.id)
    setShowDeleteConfirm(false)
    
    try {
      const { error } = await deleteProject(confirmDeleteProject.id, user?.id)
      
      if (error) {
        alert('Erro ao excluir projeto: ' + (typeof error === 'object' && error && 'message' in error ? error.message : 'Erro desconhecido'))
        return
      }
      
      // Remover projeto da lista local
      setProjects(prev => prev.filter(p => p.id !== confirmDeleteProject.id))
      
      // Atualizar cache
      if (cacheRef.current) {
        cacheRef.current = {
          data: cacheRef.current.data.filter(p => p.id !== confirmDeleteProject.id),
          timestamp: Date.now()
        }
      }
      
    } catch (err) {
      console.error('Erro inesperado ao excluir projeto:', err)
      alert('Erro inesperado ao excluir projeto')
    } finally {
      setDeletingProject(null)
      setConfirmDeleteProject(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-background">
      <DebugAuth />
      {/* Trial Warning Banner */}
      <TrialWarningBanner user={user} />
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Gerencie seus projetos e tarefas</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <Button
                onClick={() => router.push('/dashboard/settings')}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total de Projetos</p>
                  <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Subscription Status Card */}
          <Card className={`${
            getStatusColor(trialStatus) === 'green' ? 'border-green-200 bg-green-50' :
            getStatusColor(trialStatus) === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
            getStatusColor(trialStatus) === 'red' ? 'border-red-200 bg-red-50' :
            ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Crown className={`h-8 w-8 ${
                    getStatusColor(trialStatus) === 'green' ? 'text-green-600' :
                    getStatusColor(trialStatus) === 'yellow' ? 'text-yellow-600' :
                    getStatusColor(trialStatus) === 'red' ? 'text-red-600' :
                    'text-gray-400'
                  }`} />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Assinatura</p>
                    <p className={`text-lg font-semibold ${
                      getStatusColor(trialStatus) === 'green' ? 'text-green-700' :
                      getStatusColor(trialStatus) === 'yellow' ? 'text-yellow-700' :
                      getStatusColor(trialStatus) === 'red' ? 'text-red-700' :
                      'text-foreground'
                    }`}>
                      {trialStatus.isLoading ? 'Carregando...' : 
                       trialStatus.planName || (trialStatus.isTrialing ? 'Período de Teste' : 'Sem assinatura')}
                    </p>
                    {!trialStatus.isLoading && (
                      <p className={`text-sm ${
                        getStatusColor(trialStatus) === 'green' ? 'text-green-600' :
                        getStatusColor(trialStatus) === 'yellow' ? 'text-yellow-600' :
                        getStatusColor(trialStatus) === 'red' ? 'text-red-600' :
                        'text-muted-foreground'
                      }`}>
                        {getStatusMessage(trialStatus)}
                      </p>
                    )}
                  </div>
                </div>
                {!trialStatus.isLoading && (!trialStatus.hasActiveSubscription || trialStatus.isTrialing) && (
                  <Button 
                    size="sm"
                    onClick={() => router.push('/plans')}
                    className={`${
                      trialStatus.isExpired 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-violet-600 hover:bg-violet-700'
                    }`}
                  >
                    {trialStatus.isExpired ? 'Reativar' : 'Fazer Upgrade'}
                  </Button>
                )}
                {!trialStatus.isLoading && trialStatus.hasActiveSubscription && !trialStatus.isTrialing && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/dashboard/subscription')}
                  >
                    Gerenciar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold text-foreground">Projetos</h2>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar projetos..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create New Project Card */}
            <Card 
              className="border-dashed border-muted hover:border-muted-foreground transition-colors cursor-pointer group h-64 flex items-center justify-center"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-muted-foreground group-hover:text-muted transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg mb-2 group-hover:text-muted-foreground transition-colors">
                  Criar Novo Projeto
                </CardTitle>
                <CardDescription className="group-hover:text-muted-foreground transition-colors">
                  Clique para adicionar um novo projeto
                </CardDescription>
              </CardContent>
            </Card>

            {/* Project Cards */}
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow h-64">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {project.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteProject(project)}
                        disabled={deletingProject === project.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                        title="Excluir projeto"
                      >
                        {deletingProject === project.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {deletingProject === project.id ? 'Excluindo...' : 'Excluir'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/editor/${project.id}`)}
                        className="hover:bg-primary hover:text-primary-foreground"
                        disabled={deletingProject === project.id}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Abrir Editor
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Skeleton Loading */}
            {loading && projects.length === 0 && (
              Array.from({ length: 6 }).map((_, index) => (
                <ProjectCardSkeleton key={`skeleton-${index}`} />
              ))
            )}
            
            {/* Empty State */}
            {!loading && filteredProjects.length === 0 && searchTerm && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Nenhum projeto encontrado</p>
              </div>
            )}
            
            {/* No Projects State */}
            {!loading && projects.length === 0 && !searchTerm && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Você ainda não tem projetos</p>
                <p className="text-sm text-muted-foreground mt-1">Clique em &quot;Criar Novo Projeto&quot; para começar</p>
              </div>
            )}
            
            {error && (
              <div className="col-span-full text-center py-12">
                <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                  <p>{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => loadProjects(true)}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Modal de Criação de Projeto */}
      <CreateProjectModal 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onProjectCreated={handleProjectCreated}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-base">
              Tem certeza que deseja excluir o projeto <strong>"{confirmDeleteProject?.name}"</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelDelete}
              disabled={deletingProject === confirmDeleteProject?.id}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deletingProject === confirmDeleteProject?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingProject === confirmDeleteProject?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}