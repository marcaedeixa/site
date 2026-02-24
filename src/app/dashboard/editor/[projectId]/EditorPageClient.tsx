'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getProject } from '@/lib/projects'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Undo, Redo } from 'lucide-react'
import { VisualEditor } from '@/components/VisualEditor'
import { useEditorStore } from '@/hooks/useEditorStore'

interface Project {
  id: string
  name: string
  description: string
  [key: string]: string | number | boolean | null | undefined
}

interface EditorPageClientProps {
  projectId: string
}

export default function EditorPageClient({ projectId }: EditorPageClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Editor store functions
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)

  useEffect(() => {
    if (!user || !projectId) return

    const loadProject = async () => {
      try {
        setLoading(true)
        const projectData = await getProject(projectId, user.id)
        
        if (!projectData || !projectData.data) {
          setError('Projeto não encontrado')
          return
        }
        
        setProject(projectData.data)
      } catch (err) {
        console.error('Erro ao carregar projeto:', err)
        setError('Erro ao carregar projeto')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [user, projectId])

  const handleBack = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando editor...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Projeto não encontrado'}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-sm text-gray-500">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 min-h-0 overflow-hidden flex">
        <VisualEditor 
          projectId={projectId}
          project={project}
        />
      </main>
    </div>
  )
}
