'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronLeft, 
  ChevronRight,
  Film,
  Clock
} from 'lucide-react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { useUserPlan } from '@/hooks/useUserPlan'

export function ScenesTab() {
  const {
    scenes,
    currentSceneIndex,
    isPlayingSlideshow,
    slideshowInterval,
    addScene,
    duplicateScene,
    deleteScene,
    loadScene,
    updateSceneName,
    startSlideshow,
    stopSlideshow,
    pauseSlideshow,
    nextScene,
    previousScene,
    setSlideshowInterval,
    reorderScenes
  } = useEditorStore()

  const { user } = useAuth()
  const userPlan = useUserPlan(user ?? null)

  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [intervalInput, setIntervalInput] = useState(slideshowInterval / 1000)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

  // Atualizar input do intervalo quando o valor do store mudar
  useEffect(() => {
    setIntervalInput(slideshowInterval / 1000)
  }, [slideshowInterval])

  const handleAddScene = () => {
    const maxScenes = userPlan.limits.maxScenesPerProject
    if (scenes.length >= maxScenes) {
      alert(`Limite máximo de ${maxScenes} cenas atingido para seu plano.`)
      return
    }
    addScene(undefined, maxScenes)
  }

  const handleDuplicateScene = (index: number) => {
    const maxScenes = userPlan.limits.maxScenesPerProject
    if (scenes.length >= maxScenes) {
      alert(`Limite máximo de ${maxScenes} cenas atingido para seu plano.`)
      return
    }
    duplicateScene(index, maxScenes)
  }

  const handleDeleteScene = (index: number) => {
    if (confirm('Tem certeza que deseja excluir esta cena?')) {
      deleteScene(index)
    }
  }

  const handleLoadScene = (index: number) => {
    if (!isPlayingSlideshow) {
      loadScene(index)
    }
  }

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingSceneIndex(index)
    setEditingName(currentName)
  }

  const handleSaveEdit = () => {
    if (editingSceneIndex !== null && editingName.trim()) {
      updateSceneName(editingSceneIndex, editingName.trim())
    }
    setEditingSceneIndex(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingSceneIndex(null)
    setEditingName('')
  }

  const handleIntervalChange = (value: number) => {
    setIntervalInput(value)
    setSlideshowInterval(value * 1000)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Drag and drop handlers for reordering scenes
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && index !== draggedIndex) {
      setDropTargetIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDropTargetIndex(null)
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderScenes(draggedIndex, targetIndex)
    }
    setDraggedIndex(null)
    setDropTargetIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDropTargetIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Cenas do Projeto</h3>
        <p className="text-sm text-gray-600">Gerencie as cenas e crie apresentações</p>
      </div>

      {/* Controles de Navegação Manual */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              onClick={previousScene}
              size="sm"
              variant="outline"
              disabled={scenes.length === 0 || isPlayingSlideshow}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={nextScene}
              size="sm"
              variant="outline"
              disabled={scenes.length === 0 || isPlayingSlideshow}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 ml-2">
              {scenes.length > 0 ? `${currentSceneIndex + 1} de ${scenes.length}` : '0 de 0'}
            </span>
          </div>
          <Button
            onClick={handleAddScene}
            size="sm"
            disabled={isPlayingSlideshow}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>
        
        {/* Controles de Slideshow */}
        <div className="flex items-center gap-2">
          {!isPlayingSlideshow ? (
            <Button
              onClick={startSlideshow}
              disabled={scenes.length === 0}
              className="flex items-center gap-2"
              size="sm"
            >
              <Play className="h-4 w-4" />
              Iniciar Slideshow
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={pauseSlideshow}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pausar
              </Button>
              <Button
                onClick={stopSlideshow}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Parar
              </Button>
            </div>
          )}
        </div>

        {/* Configuração de Intervalo */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Intervalo (segundos)
          </Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={intervalInput}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="h-8"
            disabled={isPlayingSlideshow}
          />
        </div>
      </div>

      {/* Lista de Cenas */}
      <div className="h-96 overflow-y-auto space-y-2">
        {scenes.length === 0 ? (
          <div className="text-center py-8">
            <Film className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2">Nenhuma cena criada ainda</p>
            <p className="text-sm text-gray-400">Clique em &quot;Nova Cena&quot; para começar</p>
          </div>
        ) : (
          scenes.map((scene, index) => (
            <Card
              key={scene.id}
              draggable={!isPlayingSlideshow && editingSceneIndex !== index}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`transition-all cursor-pointer ${
                index === currentSceneIndex
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-md'
              } ${
                isPlayingSlideshow ? 'pointer-events-none opacity-75' : ''
              } ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${
                dropTargetIndex === index ? 'ring-2 ring-green-400 bg-green-50' : ''
              }`}
              onClick={() => handleLoadScene(index)}
            >
              <CardContent className="p-2">
                <div className="space-y-1">
                  {/* Nome da Cena */}
                  <div className="flex items-center justify-between">
                    {editingSceneIndex === index ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          onClick={handleSaveEdit}
                          size="sm"
                          className="h-7 px-2"
                        >
                          ✓
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <h4 
                        className="font-medium text-gray-900 truncate flex-1 cursor-pointer"
                        onDoubleClick={() => handleStartEdit(index, scene.name)}
                        title="Clique duplo para editar"
                      >
                        {scene.name}
                      </h4>
                    )}
                  </div>

                  {/* Informações da Cena */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{scene.elements.length} elem.</span>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicateScene(index)
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        disabled={isPlayingSlideshow}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteScene(index)
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isPlayingSlideshow}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Indicador de Slideshow Ativo */}
      {isPlayingSlideshow && (
        <div className="text-center p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-green-700 font-medium">📽️ Slideshow em execução</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="text-xs text-green-600">Cena atual: {currentSceneIndex + 1}/{scenes.length}</div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="text-xs text-green-600">Próxima em {intervalInput}s</div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div className="bg-green-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export default para compatibilidade com HMR
export default ScenesTab
