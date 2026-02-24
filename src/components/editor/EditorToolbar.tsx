'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  MousePointer2,
  Square,
  Circle,
  Minus,
  ArrowRight,
  PenTool,
  Eraser,
  Group,
  Ungroup,
  Combine,
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
  XCircle,
  FileText
} from 'lucide-react'
import { Tool, useEditorStore } from '@/hooks/useEditorStore'
import { cn } from '@/lib/utils'
import { exportProjectData } from '@/lib/projectData'
import { getProjectDataSnapshot } from '@/lib/editorSnapshot'

interface EditorToolbarProps {
  selectedTool: Tool
  onSave: () => Promise<void> | void
  selectedElements: string[]
  onGroupElements: () => void
  onUngroupElements: () => void
  onUnionElements: () => void
  onSubtractElements: () => void
  onIntersectElements: () => void
  onExcludeElements: () => void
  booleanOpsEnabled?: boolean
}

const tools: { id: Tool; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Seleção' },
  { id: 'rectangle', icon: Square, label: 'Retângulo' },
  { id: 'circle', icon: Circle, label: 'Círculo' },
  { id: 'line', icon: Minus, label: 'Linha' },
  { id: 'arrow', icon: ArrowRight, label: 'Seta' },
  { id: 'pen', icon: PenTool, label: 'Caneta' },
  { id: 'eraser', icon: Eraser, label: 'Borracha' },
]

export function EditorToolbar({
  selectedTool,
  onSave,
  selectedElements,
  onGroupElements,
  onUngroupElements,
  onUnionElements,
  onSubtractElements,
  onIntersectElements,
  onExcludeElements,
  booleanOpsEnabled = true
}: EditorToolbarProps) {

  const handleToolSelect = (tool: Tool) => {
    const { setSelectedTool } = useEditorStore.getState()
    setSelectedTool(tool)
  }

  const handleExport = async (format: 'json' | 'svg' | 'png') => {
    try {
      const projectId = window.location.pathname.split('/').pop()

      if (!projectId) return

      await Promise.resolve(onSave())

      const projectData = getProjectDataSnapshot()
      const data = await exportProjectData(projectId, format, undefined, projectData)

      const isZip = data instanceof Blob && data.type === 'application/zip'
      const extension = isZip ? 'zip' : format
      const downloadBaseName = isZip ? 'projeto-cenas' : 'projeto'

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
    <div className="bg-gray-50 border-r border-gray-200 py-3 flex flex-col items-center gap-3 w-12 min-w-12 h-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
      {/* Drawing Tools */}
      <div className="flex flex-col items-center gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Button
              key={tool.id}
              variant="ghost"
              size="sm"
              onClick={() => handleToolSelect(tool.id)}
              title={tool.label}
              className={cn(
                "flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200",
                selectedTool === tool.id && "bg-gray-300"
              )}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>


      {/* Boolean Operations */}
      {selectedElements.length >= 2 && (
        <div className="flex flex-col items-center gap-3">
          {booleanOpsEnabled ? null : (
            <span className="text-[10px] text-gray-500 text-center px-1">
              Selecione apenas formas geométricas para habilitar
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnionElements}
            title={booleanOpsEnabled ? 'União - Combinar formas' : 'Selecione ao menos duas formas geométricas'}
            className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200"
            disabled={!booleanOpsEnabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSubtractElements}
            title={booleanOpsEnabled ? 'Subtração - Remover forma superior' : 'Selecione ao menos duas formas geométricas'}
            className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200"
            disabled={!booleanOpsEnabled}
          >
            <Scissors className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onIntersectElements}
            title={booleanOpsEnabled ? 'Interseção - Manter apenas sobreposição' : 'Selecione ao menos duas formas geométricas'}
            className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200"
            disabled={!booleanOpsEnabled}
          >
            <Merge className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExcludeElements}
            title={booleanOpsEnabled ? 'Exclusão - Remover sobreposição' : 'Selecione ao menos duas formas geométricas'}
            className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200"
            disabled={!booleanOpsEnabled}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  )
}
