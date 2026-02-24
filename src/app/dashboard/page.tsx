'use client'

import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react'
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
  Crown,
  Pencil,
  Check,
  X,
  Upload,
  Share2,
  Copy,
  Link2,
  CheckCheck
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
import { getProjects, deleteProject, updateProject, createProject } from '@/lib/projects'
import { saveProjectData, type ProjectData } from '@/lib/projectData'
import DebugAuth from '@/components/DebugAuth'
import ProjectCardSkeleton from '@/components/ProjectCardSkeleton'
import { TrialWarningBanner } from '@/components/SubscriptionGate'
import { useTrialStatus, getStatusMessage, getStatusColor } from '@/hooks/useTrialStatus'
import { useUserPlan } from '@/hooks/useUserPlan'

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
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [importing, setImporting] = useState(false)
  const [sharingProject, setSharingProject] = useState<Project | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cacheRef = useRef<{ data: Project[], timestamp: number } | null>(null)
  const CACHE_DURATION = 30000 // 30 segundos
  const router = useRouter()

  const { signOut, user, loading: authLoading } = useAuth()
  const trialStatus = useTrialStatus(user)
  const userPlan = useUserPlan(user ?? null)

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

  const handleImportProject = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    if (fileInputRef.current) fileInputRef.current.value = ''

    if (projects.length >= userPlan.limits.maxProjects) {
      setError(`Limite de ${userPlan.limits.maxProjects} projetos atingido. Faça upgrade para criar mais projetos.`)
      return
    }

    setImporting(true)
    setError('')

    try {
      const text = await file.text()
      const data = JSON.parse(text) as ProjectData

      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error('Arquivo JSON inválido: campo "elements" não encontrado')
      }
      if (!data.viewport || typeof data.viewport.x !== 'number') {
        throw new Error('Arquivo JSON inválido: campo "viewport" não encontrado')
      }

      const projectName = file.name.replace(/\.json$/i, '').trim() || 'Projeto Importado'

      const { data: newProject, error: createError } = await createProject(user.id, {
        name: projectName,
        description: 'Projeto importado de arquivo JSON'
      })

      if (createError || !newProject) {
        const createErrorMessage = createError && typeof createError === 'object' && 'message' in createError
          ? String(createError.message)
          : 'erro desconhecido'
        throw new Error('Erro ao criar projeto: ' + createErrorMessage)
      }

      const createdProjectId = (newProject as { id?: string }).id
      if (!createdProjectId) {
        throw new Error('Erro ao criar projeto: ID não retornado')
      }

      await saveProjectData(createdProjectId, {
        elements: data.elements || [],
        groups: data.groups || [],
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
        scenes: data.scenes || [],
        currentSceneIndex: data.currentSceneIndex ?? 0,
        stageConfig: data.stageConfig ?? null,
        lastModified: new Date().toISOString()
      })

      await loadProjects(true)
    } catch (err) {
      const message = err instanceof SyntaxError
        ? 'Arquivo não é um JSON válido'
        : err instanceof Error
          ? err.message
          : 'Erro ao importar projeto'
      setError(message)
    } finally {
      setImporting(false)
    }
  }, [user?.id, projects.length, userPlan.limits.maxProjects, loadProjects])

  const handleShareProject = async (project: Project) => {
    setSharingProject(project)
    setShowShareDialog(true)
    setShareUrl('')
    setShareLoading(true)
    setShareCopied(false)
    
    try {
      const res = await fetch('/api/projects/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })
      const data = await res.json()
      if (res.ok && data.shareUrl) {
        setShareUrl(data.shareUrl)
      } else {
        setError(data.error || 'Erro ao compartilhar projeto')
        setShowShareDialog(false)
      }
    } catch {
      setError('Erro ao compartilhar projeto')
      setShowShareDialog(false)
    } finally {
      setShareLoading(false)
    }
  }

  const handleCopyShareLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  const handleRemoveShare = async () => {
    if (!sharingProject) return
    setShareLoading(true)
    try {
      const res = await fetch(`/api/projects/share?projectId=${sharingProject.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowShareDialog(false)
        setSharingProject(null)
        setShareUrl('')
      }
    } catch {
      setError('Erro ao remover compartilhamento')
    } finally {
      setShareLoading(false)
    }
  }

  // Função para salvar nome editado do projeto
  const handleSaveProjectName = async (projectId: string) => {
    const trimmed = editingName.trim()
    if (!trimmed || !user?.id) {
      setEditingProjectId(null)
      setEditingName('')
      return
    }

    try {
      const { data, error } = await updateProject(projectId, user.id, { name: trimmed })
      if (error) {
        alert('Erro ao renomear projeto: ' + (typeof error === 'object' && error && 'message' in error ? error.message : 'Erro desconhecido'))
        return
      }

      // Atualizar lista local
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: trimmed } : p))

      // Atualizar cache
      if (cacheRef.current) {
        cacheRef.current = {
          data: cacheRef.current.data.map(p => p.id === projectId ? { ...p, name: trimmed } : p),
          timestamp: Date.now()
        }
      }
    } catch (err) {
      console.error('Erro inesperado ao renomear projeto:', err)
      alert('Erro inesperado ao renomear projeto')
    } finally {
      setEditingProjectId(null)
      setEditingName('')
    }
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

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportProject}
            />

            <Card
              className="border-dashed border-muted hover:border-muted-foreground transition-colors cursor-pointer group h-64 flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center text-center p-6">
                {importing ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mb-4" />
                    <CardTitle className="text-lg mb-2">Importando...</CardTitle>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-muted-foreground group-hover:text-muted transition-colors">
                      <Upload className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg mb-2 group-hover:text-muted-foreground transition-colors">
                      Importar Projeto
                    </CardTitle>
                    <CardDescription className="group-hover:text-muted-foreground transition-colors">
                      Importar de arquivo .json
                    </CardDescription>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Project Cards */}
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow h-64">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div>
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-1 mb-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveProjectName(project.id)
                            if (e.key === 'Escape') { setEditingProjectId(null); setEditingName('') }
                          }}
                          className="h-8 text-lg font-semibold"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSaveProjectName(project.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => { setEditingProjectId(null); setEditingName('') }}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/name mb-2">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover/name:opacity-100 transition-opacity"
                          onClick={() => { setEditingProjectId(project.id); setEditingName(project.name) }}
                          title="Renomear projeto"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
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
                      <div className="flex items-center gap-1">
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
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShareProject(project)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Compartilhar projeto"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
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
        currentProjectCount={projects.length}
        maxProjects={userPlan.limits.maxProjects}
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

      {/* Dialog de Compartilhamento */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Compartilhar Projeto
            </DialogTitle>
            <DialogDescription>
              {sharingProject ? `Compartilhe &quot;${sharingProject.name}&quot; com um link público de visualização.` : ''}
            </DialogDescription>
          </DialogHeader>
          
          {shareLoading && !shareUrl ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : shareUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-sm">
                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{shareUrl}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyShareLink}
                  className="shrink-0"
                >
                  {shareCopied ? (
                    <><CheckCheck className="h-4 w-4 mr-1 text-green-600" /> Copiado!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Qualquer pessoa com este link poderá visualizar o projeto (somente leitura).
              </p>
            </div>
          ) : null}
          
          <DialogFooter className="gap-2 sm:gap-0">
            {shareUrl && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveShare}
                disabled={shareLoading}
                className="mr-auto"
              >
                Remover Compartilhamento
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
