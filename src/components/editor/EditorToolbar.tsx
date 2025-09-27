'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  MousePointer2, 
  Square, 
  Circle, 
  Minus, 
  ArrowRight, 
  Type, 
  PenTool, 
  Eraser,
  User,
  Group,
  Ungroup,
  Combine,
  Undo2, 
  Redo2, 
  Save,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown
} from 'lucide-react'
import { Tool, useEditorStore } from '@/hooks/useEditorStore'
import { cn } from '@/lib/utils'
import { exportProjectData } from '@/lib/projectData'

interface EditorToolbarProps {
  selectedTool: Tool
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  selectedElements: string[]
  onGroupElements: () => void
  onUngroupElements: () => void
  onWeldElements: () => void
}

const tools: { id: Tool; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; shortcut?: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Seleção', shortcut: 'V' },
  { id: 'rectangle', icon: Square, label: 'Retângulo', shortcut: 'R' },
  { id: 'circle', icon: Circle, label: 'Círculo', shortcut: 'C' },
  { id: 'line', icon: Minus, label: 'Linha', shortcut: 'L' },
  { id: 'arrow', icon: ArrowRight, label: 'Seta', shortcut: 'A' },
  { id: 'text', icon: Type, label: 'Texto', shortcut: 'T' },
  { id: 'pen', icon: PenTool, label: 'Caneta', shortcut: 'P' },
  { id: 'eraser', icon: Eraser, label: 'Borracha', shortcut: 'E' },
  { id: 'actor', icon: User, label: 'Ator', shortcut: 'U' },
]

export function EditorToolbar({ 
  selectedTool, 
  canUndo, 
  canRedo, 
  onUndo, 
  onRedo, 
  onSave,
  selectedElements,
  onGroupElements,
  onUngroupElements,
  onWeldElements
}: EditorToolbarProps) {
  const handleToolSelect = (tool: Tool) => {
    const { setSelectedTool } = useEditorStore.getState()
    setSelectedTool(tool)
  }

  const handleExport = async (format: 'json' | 'svg' | 'png') => {
    try {
      const projectId = window.location.pathname.split('/').pop()
      
      if (!projectId) return
      
      const data = await exportProjectData(projectId, format)
      
      if (typeof data === 'string') {
        // JSON or SVG
        const blob = new Blob([data], { 
          type: format === 'json' ? 'application/json' : 'image/svg+xml' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `projeto.${format}`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // PNG Blob
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = `projeto.${format}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
    }
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

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
      {/* History Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolSelect(tool.id)}
              title={`${tool.label} ${tool.shortcut ? `(${tool.shortcut})` : ''}`}
              className={cn(
                "relative",
                selectedTool === tool.id && "bg-blue-100 text-blue-700 hover:bg-blue-200"
              )}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom('out')}
          title="Diminuir Zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom('reset')}
          title="Resetar Zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleZoom('in')}
          title="Aumentar Zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Edit Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          title="Duplicar (Ctrl+D)"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          title="Deletar (Delete)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Group Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGroupElements}
          disabled={selectedElements.length < 2}
          title="Agrupar (Ctrl+G)"
        >
          <Group className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUngroupElements}
          disabled={selectedElements.length === 0}
          title="Desagrupar (Ctrl+Shift+G)"
        >
          <Ungroup className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onWeldElements}
          disabled={selectedElements.length < 2}
          title="Soldar"
        >
          <Combine className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Layer Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBringToFront}
          disabled={selectedElements.length === 0}
          title="Trazer para Frente (Ctrl+Shift+])"
        >
          <ChevronsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBringForward}
          disabled={selectedElements.length === 0}
          title="Subir uma Camada (Ctrl+])"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendBackward}
          disabled={selectedElements.length === 0}
          title="Descer uma Camada (Ctrl+[)"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendToBack}
          disabled={selectedElements.length === 0}
          title="Enviar para Trás (Ctrl+Shift+[)"
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
          title="Salvar (Ctrl+S)"
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <div className="relative group">
          <Button
            variant="ghost"
            size="sm"
            title="Exportar"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {/* Export Dropdown */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="py-1 min-w-[120px]">
              <button
                onClick={() => handleExport('json')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('svg')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
              >
                SVG
              </button>
              <button
                onClick={() => handleExport('png')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
              >
                PNG
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Display */}
      <div className="ml-auto text-sm text-gray-500">
        {Math.round((useEditorStore.getState().viewport?.zoom || 1) * 100)}%
      </div>
    </div>
  )
}