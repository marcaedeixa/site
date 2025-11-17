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
  Clock,
  ChevronUp,
  ChevronDown,
  Maximize
} from 'lucide-react'
import { useEditorStore } from '@/hooks/useEditorStore'

export function EditorBottomBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  
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
    startFullscreenSlideshow
  } = useEditorStore()

  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [intervalInput, setIntervalInput] = useState(slideshowInterval / 1000)

  // Atualizar input do intervalo quando o valor do store mudar
  useEffect(() => {
    setIntervalInput(slideshowInterval / 1000)
  }, [slideshowInterval])

  const handleAddScene = () => {
    addScene()
  }

  const handleDuplicateScene = (index: number) => {
    duplicateScene(index)
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

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg transition-all duration-300 rounded-t-md overflow-hidden">
      {/* Barra de controle sempre visível */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Cenas do Projeto</span>
            <span className="text-xs text-gray-500">
              {scenes.length > 0 ? `${currentSceneIndex + 1} de ${scenes.length}` : '0 de 0'}
            </span>
          </div>
          
          {/* Controles de navegação */}
          <div className="flex items-center gap-1">
            <Button
              onClick={previousScene}
              size="sm"
              variant="outline"
              disabled={scenes.length === 0 || isPlayingSlideshow}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              onClick={nextScene}
              size="sm"
              variant="outline"
              disabled={scenes.length === 0 || isPlayingSlideshow}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {/* Controles de slideshow */}
          <div className="flex items-center gap-2">
            {!isPlayingSlideshow ? (
              <div className="flex items-center gap-1">
                <Button
                  onClick={startSlideshow}
                  disabled={scenes.length === 0}
                  size="sm"
                  className="h-7"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Slideshow
                </Button>
                <Button
                  onClick={startFullscreenSlideshow}
                  disabled={scenes.length === 0}
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  title="Slideshow em tela inteira"
                >
                  <Maximize className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  onClick={pauseSlideshow}
                  variant="outline"
                  size="sm"
                  className="h-7"
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Pausar
                </Button>
                <Button
                  onClick={stopSlideshow}
                  variant="outline"
                  size="sm"
                  className="h-7"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Parar
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={handleAddScene}
            size="sm"
            disabled={isPlayingSlideshow}
            className="h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nova Cena
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Configuração de intervalo */}
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-gray-500" />
            <Input
              type="number"
              min="1"
              max="10"
              value={intervalInput}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="h-7 w-16 text-xs"
              disabled={isPlayingSlideshow}
            />
            <span className="text-xs text-gray-500">s</span>
          </div>

          {/* Botão de expandir/recolher */}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Área expandida com lista de cenas */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100">
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {scenes.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Film className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500 text-sm mb-1">Nenhuma cena criada ainda</p>
                  <p className="text-xs text-gray-400">Clique em "Nova Cena" para começar</p>
                </div>
              ) : (
                scenes.map((scene, index) => (
                  <Card 
                    key={scene.id}
                    className={`w-full transition-all cursor-pointer ${
                      index === currentSceneIndex 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:shadow-md'
                    } ${
                      isPlayingSlideshow ? 'pointer-events-none opacity-75' : ''
                    }`}
                    onClick={() => handleLoadScene(index)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {/* Nome da Cena */}
                        <div className="flex items-center justify-between">
                          {editingSceneIndex === index ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit()
                                  if (e.key === 'Escape') handleCancelEdit()
                                }}
                                className="h-6 text-xs"
                                autoFocus
                              />
                              <Button
                                onClick={handleSaveEdit}
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                ✓
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <h4 
                              className="font-medium text-gray-900 truncate flex-1 cursor-pointer text-sm"
                              onDoubleClick={() => handleStartEdit(index, scene.name)}
                              title="Clique duplo para editar"
                            >
                              {scene.name}
                            </h4>
                          )}
                        </div>

                        {/* Informações da Cena */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{scene.elements.length} elementos</span>
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
          </div>

          {/* Indicador de Slideshow Ativo */}
          {isPlayingSlideshow && (
            <div className="mt-4 text-center p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow-sm">
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
      )}
    </div>
  )
}
