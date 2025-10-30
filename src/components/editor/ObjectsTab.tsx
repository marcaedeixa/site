'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth.tsx'
import { 
  Trash2, 
  Shapes,
  Plus
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { Element } from '@/hooks/useEditorStore'

interface ObjectItem {
  id: string
  project_id: string
  user_id: string
  name: string
  initials?: string
  appearance_config?: {
    shape?: 'triangle' | 'square' | 'hexagon' | 'rectangle'
    width?: number
    height?: number
    strokeDasharray?: string
  }
  position_x?: number
  position_y?: number
  color?: string
  created_at?: string
  updated_at?: string
}

export function ObjectsTab() {
  const { user } = useAuth()
  const params = useParams()
  const projectId = params.projectId as string
  
  const [objects, setObjects] = useState<ObjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingObjectId, setDeletingObjectId] = useState<string | null>(null)

  const supabase = createClient()

  // Carregar objetos do projeto
  const loadObjects = useCallback(async () => {
    if (!user || !projectId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('objects')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setObjects(data || [])
    } catch (err) {
      console.error('Erro ao carregar objetos:', err)
      setError('Erro ao carregar objetos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [user, projectId, supabase])

  useEffect(() => {
    loadObjects()
  }, [user, projectId])

  // Listener para recarregar quando um novo objeto é criado
  useEffect(() => {
    const handleObjectCreated = (event: CustomEvent) => {
      loadObjects()
    }

    window.addEventListener('objectCreated', handleObjectCreated as EventListener)
    
    return () => {
      window.removeEventListener('objectCreated', handleObjectCreated as EventListener)
    }
  }, [loadObjects])

  // Deletar objeto
  const deleteObject = async (objectId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir este objeto?')) return
    
    try {
      setDeletingObjectId(objectId)
      setError(null)
      
      const { error } = await supabase
        .from('objects')
        .delete()
        .eq('id', objectId)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      await loadObjects()
    } catch (err) {
      console.error('Erro ao excluir objeto:', err)
      setError('Erro ao excluir objeto. Tente novamente.')
    } finally {
      setDeletingObjectId(null)
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

  // Renderizar prévia do objeto
  const renderObjectPreview = (object: ObjectItem) => {
    const config = object.appearance_config || {}
    const shape = config.shape || 'rectangle'
    const width = 32
    const height = 32
    const color = object.color || '#3b82f6'
    
    const viewBox = `0 0 ${width} ${height}`
    const centerX = width / 2
    const centerY = height / 2

    switch (shape) {
      case 'triangle':
        return (
          <svg width="32" height="32" viewBox={viewBox} className="flex-shrink-0">
            <polygon
              points={`${centerX},4 ${width - 4},${height - 4} 4,${height - 4}`}
              fill={color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
        )
      case 'square':
        return (
          <svg width="32" height="32" viewBox={viewBox} className="flex-shrink-0">
            <rect
              x="4"
              y="4"
              width={width - 8}
              height={height - 8}
              fill={color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
        )
      case 'hexagon':
        const hexPoints = [
          [centerX, 4],
          [width - 6, height * 0.25],
          [width - 6, height * 0.75],
          [centerX, height - 4],
          [6, height * 0.75],
          [6, height * 0.25]
        ].map(point => point.join(',')).join(' ')
        
        return (
          <svg width="32" height="32" viewBox={viewBox} className="flex-shrink-0">
            <polygon
              points={hexPoints}
              fill={color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
        )
      case 'rectangle':
      default:
        return (
          <svg width="32" height="32" viewBox={viewBox} className="flex-shrink-0">
            <rect
              x="4"
              y="8"
              width={width - 8}
              height={height - 16}
              fill={color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span className="ml-2 text-gray-600">Carregando objetos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Objetos do Projeto</h3>
          <p className="text-sm text-gray-600">Gerencie os objetos do seu projeto</p>
          <p className="text-xs text-blue-600 mt-1">💡 Arraste os objetos para o canvas para adicioná-los ao projeto</p>
        </div>
      </div>

      {/* Mensagens de feedback */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Lista de objetos */}
      <div className="overflow-y-auto">
        {objects.length === 0 ? (
          <div className="text-center py-8">
            <Shapes className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2">Nenhum objeto criado ainda</p>
            <p className="text-sm text-gray-400">Use a ferramenta de objeto no editor para criar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 min-w-0">
            {objects.map((object) => (
              <Card 
                key={object.id} 
                className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing relative min-w-0 overflow-hidden"
                draggable={true}
                onDragStart={(e) => {
                  const config = object.appearance_config || {}
                  
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'object',
                    objectId: object.id,
                    objectName: object.name,
                    objectInitials: object.initials || '',
                    objectShape: config.shape || 'rectangle',
                    objectWidth: config.width || 100,
                    objectHeight: config.height || 100,
                    objectColor: object.color || '#3b82f6',
                    strokeDasharray: config.strokeDasharray || '5,5',
                    fillColor: 'transparent',
                    strokeColor: object.color || '#3b82f6'
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
                    {/* Prévia do objeto */}
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      {renderObjectPreview(object)}
                    </div>
                    
                    {/* Nome do objeto */}
                    <h4 className="text-xs font-medium text-gray-900 truncate w-full">{object.name}</h4>
                  </div>
                  
                  {/* Botão de excluir - posicionado no canto superior direito */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteObject(object.id)}
                    disabled={deletingObjectId === object.id}
                    className="absolute top-1 right-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                  >
                    {deletingObjectId === object.id ? (
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
export default ObjectsTab