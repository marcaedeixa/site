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
  ChevronsDown,
  Plus,
  Scissors,
  Merge,
  XCircle
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
  onUnionElements: () => void
  onSubtractElements: () => void
  onIntersectElements: () => void
  onExcludeElements: () => void
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
  onWeldElements,
  onUnionElements,
  onSubtractElements,
  onIntersectElements,
  onExcludeElements
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
    <div className="bg-white border-l border-gray-200 px-2 py-4 flex flex-col gap-4 w-16 min-h-full">
      {/* History Actions */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          className="w-12 h-12 p-0"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Refazer (Ctrl+Y)"
          className="w-12 h-12 p-0"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="horizontal" className="w-full" />

      {/* Drawing Tools */}
      <div className="flex flex-col gap-1">
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
                "w-12 h-12 p-0",
                selectedTool === tool.id && "bg-blue-100 text-blue-700 hover:bg-blue-200"
              )}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>

      <Separator orientation="horizontal" className="w-full" />

      {/* Boolean Operations */}
      {selectedElements.length >= 2 && (
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnionElements}
            title="União - Combinar formas (Ctrl+Shift+U)"
            className="w-12 h-12 p-0 hover:bg-green-100"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSubtractElements}
            title="Subtração - Remover forma superior (Ctrl+Shift+S)"
            className="w-12 h-12 p-0 hover:bg-red-100"
          >
            <Scissors className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onIntersectElements}
            title="Interseção - Manter apenas sobreposição (Ctrl+Shift+I)"
            className="w-12 h-12 p-0 hover:bg-blue-100"
          >
            <Merge className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExcludeElements}
            title="Exclusão - Remover sobreposição (Ctrl+Shift+E)"
            className="w-12 h-12 p-0 hover:bg-yellow-100"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  )
}