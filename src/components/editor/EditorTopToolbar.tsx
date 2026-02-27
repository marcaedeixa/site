'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Save,
  Download,
  Plus,
  Scissors,
  Merge,
  XCircle,
  User,
  Box,
  ChevronRight
} from 'lucide-react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { exportProjectData } from '@/lib/projectData'
import { getProjectDataSnapshot } from '@/lib/editorSnapshot'
import { useState, useEffect, useRef } from 'react'
import { ActorModal } from './ActorModal'
import { ObjectModal } from './ObjectModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useUserPlan } from '@/hooks/useUserPlan'
import { useParams } from 'next/navigation'

interface EditorTopToolbarProps {
  onSave: () => Promise<void> | void
  selectedElements: string[]
  onUnionElements: () => void
  onSubtractElements: () => void
  onIntersectElements: () => void
  onExcludeElements: () => void
}

export function EditorTopToolbar({ 
  onSave,
  selectedElements,
  onUnionElements,
  onSubtractElements,
  onIntersectElements,
  onExcludeElements
}: EditorTopToolbarProps) {
  const { user } = useAuth()
  const userPlan = useUserPlan(user ?? null)
  const params = useParams()
  const projectId = params?.projectId as string
  
  // Estado para controlar o modal de ator
  const [showActorModal, setShowActorModal] = useState(false)
  const [actorModalPosition] = useState({ x: 400, y: 300 })
  const [actorCount, setActorCount] = useState(0)
  
  // Estado para controlar o modal de objeto
  const [showObjectModal, setShowObjectModal] = useState(false)
  const [objectModalPosition] = useState({ x: 400, y: 300 })
  const [objectCount, setObjectCount] = useState(0)
  
  // Estado para controlar o dropdown de exportação
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [svgSubOpen, setSvgSubOpen] = useState(false)
  const [pngSubOpen, setPngSubOpen] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  
  // Fechar dropdown de exportação ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false)
        setSvgSubOpen(false)
        setPngSubOpen(false)
      }
    }
    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside as unknown as EventListener)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside as unknown as EventListener)
    }
  }, [showExportDropdown])

  const closeExportMenu = () => {
    setShowExportDropdown(false)
    setSvgSubOpen(false)
    setPngSubOpen(false)
  }

  // Obter cenas do store
  const { scenes, currentSceneIndex } = useEditorStore()
  
  // Carregar contagem de atores
  useEffect(() => {
    const loadActorCount = async () => {
      if (!projectId || !user) return
      
      try {
        const { count } = await supabase
          .from('actors')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('user_id', user.id)
        
        setActorCount(count || 0)
      } catch (error) {
        console.error('Erro ao carregar contagem de atores:', error)
      }
    }
    
    loadActorCount()
    
    // Escutar evento de ator criado
    const handleActorCreated = () => {
      loadActorCount()
    }
    
    window.addEventListener('actorCreated', handleActorCreated)
    return () => window.removeEventListener('actorCreated', handleActorCreated)
  }, [projectId, user])
  
  // Carregar contagem de objetos
  useEffect(() => {
    const loadObjectCount = async () => {
      if (!projectId || !user) return
      
      try {
        const { count } = await supabase
          .from('objects')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('user_id', user.id)
        
        setObjectCount(count || 0)
      } catch (error) {
        console.error('Erro ao carregar contagem de objetos:', error)
      }
    }
    
    loadObjectCount()
    
    // Escutar evento de objeto criado
    const handleObjectCreated = () => {
      loadObjectCount()
    }
    
    window.addEventListener('objectCreated', handleObjectCreated)
    return () => window.removeEventListener('objectCreated', handleObjectCreated)
  }, [projectId, user])
  
  // Funções do modal de ator
  const handleOpenActorModal = () => {
    setShowActorModal(true)
  }
  
  const handleActorModalClose = () => {
    setShowActorModal(false)
  }
  
  // Funções do modal de objeto
  const handleOpenObjectModal = () => {
    setShowObjectModal(true)
  }
  
  const handleObjectModalClose = () => {
    setShowObjectModal(false)
  }
  
  const handleActorModalSave = () => {
    setShowActorModal(false)
    // A contagem será atualizada pelo evento actorCreated
  }
  
  const handleObjectModalSave = () => {
    setShowObjectModal(false)
    // A contagem será atualizada pelo evento objectCreated
  }
  
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    const { viewport, setViewport } = useEditorStore.getState()
    
    let newZoom = viewport.zoom
    
    switch (direction) {
      case 'in':
        newZoom = Math.min(viewport.zoom * 1.2, 5)
        break
      case 'out':
        newZoom = Math.max(viewport.zoom / 1.2, 0.1)
        break
      case 'reset':
        newZoom = 1
        break
    }
    
    setViewport({ ...viewport, zoom: newZoom })
  }

  const handleCopy = () => {
    const { selectedElements, duplicateElements } = useEditorStore.getState()
    
    if (selectedElements.length > 0) {
      duplicateElements(selectedElements)
    }
  }

  const handleDelete = () => {
    const { selectedElements, deleteElements } = useEditorStore.getState()
    
    if (selectedElements.length > 0) {
      deleteElements(selectedElements)
    }
  }

  const handleBringToFront = () => {
    const { selectedElements, bringToFront } = useEditorStore.getState()
    
    if (selectedElements.length > 0) {
      bringToFront(selectedElements)
    }
  }

  const handleSendToBack = () => {
    const { selectedElements, sendToBack } = useEditorStore.getState()
    
    if (selectedElements.length > 0) {
      sendToBack(selectedElements)
    }
  }

  const handleBringForward = () => {
    const { selectedElements, bringForward } = useEditorStore.getState()
    
    if (selectedElements.length > 0) {
      bringForward(selectedElements)
    }
  }

  const handleSendBackward = () => {
    const { selectedElements, sendBackward } = useEditorStore.getState()
    
    if (selectedElements.length > 0) {
      sendBackward(selectedElements)
    }
  }

  const handleExport = async (format: 'json' | 'svg' | 'png', sceneIndex?: number) => {
    try {
      const projectId = window.location.pathname.split('/').pop()
      
      if (!projectId) return

      await Promise.resolve(onSave())
      
      const projectData = getProjectDataSnapshot()
      const data = await exportProjectData(projectId, format, sceneIndex, projectData)
      
      // Determinar o nome do arquivo
      let fileName = 'projeto'
      if (sceneIndex !== undefined && scenes[sceneIndex]) {
        fileName = `${scenes[sceneIndex].name.replace(/[^a-zA-Z0-9]/g, '_')}`
      }
      
      const isZip = data instanceof Blob && data.type === 'application/zip'
      const extension = isZip ? 'zip' : format
      const downloadBaseName = isZip ? `${fileName}-cenas` : fileName

      if (typeof data === 'string') {
        const blob = new Blob([data], { 
          type: format === 'json' ? 'application/json' : 'image/svg+xml' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${downloadBaseName}.${extension}`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = `${downloadBaseName}.${extension}`
        a.click()
        URL.revokeObjectURL(url)
      }
      
      // Fechar o dropdown após exportar
      setShowExportDropdown(false)
    } catch (error) {
      console.error('Erro ao exportar:', error)
    }
  }

  const handleExportAnimatedSVG = async () => {
    try {
      const projectId = window.location.pathname.split('/').pop()
      if (!projectId) return

      await Promise.resolve(onSave())
      const projectData = getProjectDataSnapshot()
      const data = await exportProjectData(projectId, 'animated-svg', undefined, projectData)

      if (typeof data === 'string') {
        const blob = new Blob([data], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'projeto-animado.svg'
        a.click()
        URL.revokeObjectURL(url)
      }

      setShowExportDropdown(false)
    } catch (error) {
      console.error('Erro ao exportar SVG animado:', error)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 md:gap-4 justify-between flex-wrap">
      {/* Controles principais */}
      <div className="flex items-center gap-4">
        {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom('out')}
          title="Diminuir Zoom"
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom('reset')}
          title="Resetar Zoom"
          className="h-8 w-8 p-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom('in')}
          title="Aumentar Zoom"
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs text-gray-500 ml-2">
          {Math.round((useEditorStore.getState().viewport?.zoom || 1) * 100)}%
        </span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Edit Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          title="Duplicar"
          className="h-8 w-8 p-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          title="Deletar"
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>



      {/* Boolean Operations */}
      {selectedElements.length >= 2 && (
        <>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnionElements}
              title="União"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSubtractElements}
              title="Subtração"
              className="h-8 w-8 p-0"
            >
              <Scissors className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onIntersectElements}
              title="Interseção"
              className="h-8 w-8 p-0"
            >
              <Merge className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExcludeElements}
              title="Exclusão"
              className="h-8 w-8 p-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* Layer Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBringToFront}
          disabled={selectedElements.length === 0}
          title="Trazer para Frente"
          className="h-8 w-8 p-0"
        >
          <ChevronsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBringForward}
          disabled={selectedElements.length === 0}
          title="Subir uma Camada"
          className="h-8 w-8 p-0"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendBackward}
          disabled={selectedElements.length === 0}
          title="Descer uma Camada"
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendToBack}
          disabled={selectedElements.length === 0}
          title="Enviar para Trás"
          className="h-8 w-8 p-0"
        >
          <ChevronsDown className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* File Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          title="Salvar"
          className="h-8 w-8 p-0"
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <div className="relative" ref={exportDropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            title="Exportar"
            className="h-8 w-8 p-0"
            onClick={() => {
              setShowExportDropdown(prev => !prev)
              setSvgSubOpen(false)
              setPngSubOpen(false)
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {/* Export Dropdown */}
          {showExportDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <div className="py-1 min-w-[180px]">
                {/* JSON */}
                <button
                  onClick={() => { handleExport('json'); closeExportMenu() }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar JSON
                </button>

                {/* SVG - com sub-menu */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (scenes.length > 1) {
                        setSvgSubOpen(prev => !prev)
                        setPngSubOpen(false)
                      } else {
                        handleExport('svg', currentSceneIndex)
                        closeExportMenu()
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar SVG
                    </div>
                    {scenes.length > 1 && <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${svgSubOpen ? 'rotate-90' : ''}`} />}
                  </button>
                  {scenes.length > 1 && svgSubOpen && (
                    <div className="border-l-2 border-gray-200 ml-4">
                      <div className="py-1 max-h-[40vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {scenes.map((scene, index) => (
                          <button
                            key={scene.id}
                            onClick={() => { handleExport('svg', index); closeExportMenu() }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <span>{scene.name}</span>
                            {index === currentSceneIndex && (
                              <span className="text-xs text-gray-400 ml-2">(atual)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SVG Animado */}
                {scenes.length > 1 && (
                  <button
                    onClick={() => { handleExportAnimatedSVG(); closeExportMenu() }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    SVG Animado
                  </button>
                )}

                <div className="border-t border-gray-200 my-1"></div>

                {/* PNG - com sub-menu */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setPngSubOpen(prev => !prev)
                      setSvgSubOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar PNG
                    </div>
                    <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${pngSubOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {pngSubOpen && (
                    <div className="border-l-2 border-gray-200 ml-4">
                      <div className="py-1 max-h-[40vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                        <button
                          onClick={() => { handleExport('png'); closeExportMenu() }}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 transition-colors flex items-center"
                        >
                          Projeto Completo
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        {scenes.map((scene, index) => (
                          <button
                            key={scene.id}
                            onClick={() => { handleExport('png', index); closeExportMenu() }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <span>{scene.name}</span>
                            {index === currentSceneIndex && (
                              <span className="text-xs text-gray-400 ml-2">(atual)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Botões de cadastro na extremidade direita */}
      <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
        <Button
          onClick={handleOpenActorModal}
          variant="default"
          size="sm"
          title="Cadastrar Ator"
          className="px-2 md:px-3"
        >
          <User className="h-4 w-4 md:mr-2" />
          <span className="hidden sm:inline">Cadastrar Ator</span>
        </Button>
        <Button
          onClick={handleOpenObjectModal}
          variant="default"
          size="sm"
          title="Cadastrar Objeto"
          className="px-2 md:px-3"
        >
          <Box className="h-4 w-4 md:mr-2" />
          <span className="hidden sm:inline">Cadastrar Objeto</span>
        </Button>
      </div>

      {/* Modal de criação de ator */}
      <ActorModal
        isOpen={showActorModal}
        onClose={handleActorModalClose}
        onSave={handleActorModalSave}
        position={actorModalPosition}
        currentActorCount={actorCount}
        planTier={userPlan.tier}
      />

      {/* Modal de criação de objeto */}
      <ObjectModal
        isOpen={showObjectModal}
        onClose={handleObjectModalClose}
        onSave={handleObjectModalSave}
        position={objectModalPosition}
        currentObjectCount={objectCount}
        planTier={userPlan.tier}
      />
    </div>
  )
}
