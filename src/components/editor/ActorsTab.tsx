'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth.tsx'
import { 
  Trash2, 
  User,
  Plus
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { Element, useEditorStore } from '@/hooks/useEditorStore'

interface Actor {
  id: string
  project_id: string
  user_id: string
  name: string
  color?: string
  notes?: string
  appearance_config?: {
    shape?: 'circle' | 'square'
    size?: number
    icon?: string
  }
  default_speech_bubble?: {
    style?: 'rounded' | 'square' | 'thought'
    color?: string
    textColor?: string
  }
  created_at?: string
  updated_at?: string
}

export function ActorsTab() {
  const { user } = useAuth()
  const params = useParams()
  const projectId = params.projectId as string
  const { removeActorFromAllScenes } = useEditorStore()
  
  const [actors, setActors] = useState<Actor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingActorId, setDeletingActorId] = useState<string | null>(null)

  const supabase = createClient()

  // Carregar atores do projeto
  const loadActors = useCallback(async () => {
    if (!user || !projectId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('actors')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setActors(data || [])
    } catch (err) {
      console.error('Erro ao carregar atores:', err)
      setError('Erro ao carregar atores. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [user, projectId, supabase])

  useEffect(() => {
    loadActors()
  }, [user, projectId])

  // Listener para recarregar quando um novo ator é criado
  useEffect(() => {
    const handleActorCreated = (event: CustomEvent) => {
      loadActors()
    }

    window.addEventListener('actorCreated', handleActorCreated as EventListener)
    
    return () => {
      window.removeEventListener('actorCreated', handleActorCreated as EventListener)
    }
  }, [loadActors])

  // Deletar ator
  const deleteActor = async (actorId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir este ator?')) return
    
    try {
      setDeletingActorId(actorId)
      setError(null)
      
      const { error } = await supabase
        .from('actors')
        .delete()
        .eq('id', actorId)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // Remove elementos de ator de todas as cenas
      removeActorFromAllScenes(actorId)
      
      await loadActors()
    } catch (err) {
      console.error('Erro ao excluir ator:', err)
      setError('Erro ao excluir ator. Tente novamente.')
    } finally {
      setDeletingActorId(null)
    }
  }

  // Limpar mensagens após 3 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error])



  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span className="ml-2 text-gray-600">Carregando atores...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Atores do Projeto</h3>
          <p className="text-sm text-gray-600">Gerencie os atores do seu projeto</p>
          <p className="text-xs text-blue-600 mt-1">💡 Arraste os atores para o canvas para adicioná-los ao projeto</p>
        </div>
      </div>

      {/* Mensagens de feedback */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Lista de atores */}
      <div className="overflow-y-auto">
        {actors.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2">Nenhum ator criado ainda</p>
            <p className="text-sm text-gray-400">Use a ferramenta de ator no editor para criar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 min-w-0">
            {actors.map((actor) => (
              <Card 
                key={actor.id}
                className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing relative min-w-0 overflow-hidden"
                draggable={true}
                onDragStart={(e) => {
                  // Gerar iniciais do nome do ator
                  const actorInitials = actor.name
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('')
                  
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'actor',
                    actorId: actor.id,
                    actorName: actor.name,
                    actorInitials: actorInitials,
                    actorColor: actor.color || '#3b82f6',
                    actorShape: actor.appearance_config?.shape || 'circle',
                    actorSize: actor.appearance_config?.size || 60,
                    actorNotes: actor.notes || '',
                    fillColor: actor.color || '#3b82f6',
                    strokeColor: '#ffffff',
                    bubbleStyle: actor.default_speech_bubble?.style || 'rounded',
                    bubbleColor: actor.default_speech_bubble?.color || '#ffffff',
                    bubbleTextColor: actor.default_speech_bubble?.textColor || '#000000'
                  }))
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onDragEnd={(e) => {
                  // Reset cursor
                  e.currentTarget.style.cursor = 'grab'
                }}
              >
                <CardContent className="p-2">
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar do ator */}
                    <div 
                      className={`w-8 h-8 flex items-center justify-center text-white font-semibold text-xs mb-1 ${
                        actor.appearance_config?.shape === 'square' ? 'rounded-md' : 'rounded-full'
                      }`}
                      style={{ backgroundColor: actor.color || '#3b82f6' }}
                    >
                      {actor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    
                    {/* Nome do ator */}
                    <h4 className="text-xs font-medium text-gray-900 truncate w-full">{actor.name}</h4>
                  </div>
                  
                  {/* Botão de excluir - posicionado no canto superior direito */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteActor(actor.id)}
                    disabled={deletingActorId === actor.id}
                    className="absolute top-1 right-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                  >
                    {deletingActorId === actor.id ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>


    </div>
  )
}

// Export default para compatibilidade com HMR
export default ActorsTab