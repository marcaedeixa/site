'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Trash2,
  Group,
  Ungroup,
  Combine,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Save,
  Download
} from 'lucide-react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { exportProjectData } from '@/lib/projectData'

interface EditorTopToolbarProps {
  onSave: () => void
  selectedElements: string[]
  onGroupElements: () => void
  onUngroupElements: () => void
  onWeldElements: () => void
}

export function EditorTopToolbar({ 
  onSave,
  selectedElements,
  onGroupElements,
  onUngroupElements,
  onWeldElements
}: EditorTopToolbarProps) {
  
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

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
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
          title="Duplicar (Ctrl+D)"
          className="h-8 w-8 p-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          title="Deletar (Delete)"
          className="h-8 w-8 p-0"
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
          className="h-8 w-8 p-0"
        >
          <Group className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUngroupElements}
          disabled={selectedElements.length === 0}
          title="Desagrupar (Ctrl+Shift+G)"
          className="h-8 w-8 p-0"
        >
          <Ungroup className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onWeldElements}
          disabled={selectedElements.length < 2}
          title="Soldar"
          className="h-8 w-8 p-0"
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
          className="h-8 w-8 p-0"
        >
          <ChevronsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBringForward}
          disabled={selectedElements.length === 0}
          title="Subir uma Camada (Ctrl+])"
          className="h-8 w-8 p-0"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendBackward}
          disabled={selectedElements.length === 0}
          title="Descer uma Camada (Ctrl+[)"
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendToBack}
          disabled={selectedElements.length === 0}
          title="Enviar para Trás (Ctrl+Shift+[)"
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
          title="Salvar (Ctrl+S)"
          className="h-8 w-8 p-0"
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <div className="relative group">
          <Button
            variant="ghost"
            size="sm"
            title="Exportar"
            className="h-8 w-8 p-0"
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
    </div>
  )
}