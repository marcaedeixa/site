'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth.tsx'
import { getProject } from '@/lib/projects'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Download, Undo, Redo } from 'lucide-react'
import { VisualEditor } from '@/components/VisualEditor'

interface Project {
  id: string
  name: string
  description: string | null
  [key: string]: string | number | boolean | null | undefined
}

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const projectId = params.projectId as string

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
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
              <p className="text-sm text-gray-500">
                {project.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="h-[calc(100vh-73px)]">
        <VisualEditor 
          projectId={projectId}
          project={project}
        />
      </main>
    </div>
  )
}