'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MousePointer2,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
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
  const [showTextBoxDialog, setShowTextBoxDialog] = useState(false)
  const [textBoxConfig, setTextBoxConfig] = useState({
    text: '',
    width: 200,
    fontSize: 16,
    previewMode: 'full' as 'full' | 'start' | 'end' | 'start-end'
  })

  const handleToolSelect = (tool: Tool) => {
    const { setSelectedTool } = useEditorStore.getState()
    setSelectedTool(tool)
  }

  const handleAddTextBox = () => {
    if (!textBoxConfig.text.trim()) return

    const { viewport, addElement } = useEditorStore.getState()
    const centerX = -viewport.x + (window.innerWidth / 2) / viewport.zoom
    const centerY = -viewport.y + (window.innerHeight / 2) / viewport.zoom

    const lineHeight = textBoxConfig.fontSize * 1.2
    const padding = 16
    const defaultHeight = Math.max(textBoxConfig.fontSize * 1.5, lineHeight + padding)

    addElement({
      type: 'textbox',
      x: centerX - textBoxConfig.width / 2,
      y: centerY - 20,
      width: textBoxConfig.width,
      height: defaultHeight,
      text: textBoxConfig.text,
      fontSize: textBoxConfig.fontSize,
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      zIndex: 1000,
      textBoxConfig: {
        previewMode: textBoxConfig.previewMode,
        fullText: textBoxConfig.text
      }
    } as any)

    setTextBoxConfig({
      text: '',
      width: 200,
      fontSize: 16,
      previewMode: 'full'
    })
    setShowTextBoxDialog(false)
  }

  const getPreviewText = (text: string, mode: string) => {
    if (mode === 'full' || text.length <= 20) return text
    switch (mode) {
      case 'start': return text.substring(0, 15) + '...'
      case 'end': return '...' + text.substring(text.length - 15)
      case 'start-end': return text.substring(0, 8) + '...' + text.substring(text.length - 8)
      default: return text
    }
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

      <Separator orientation="horizontal" className="w-8" />

      {/* Add Text Box Button */}
      <Dialog open={showTextBoxDialog} onOpenChange={setShowTextBoxDialog}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Adicionar Caixa de Texto"
            className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200"
          >
            <Type className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Nova Caixa de Texto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Texto</Label>
              <Textarea
                id="text"
                value={textBoxConfig.text}
                onChange={(e) => setTextBoxConfig(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Digite o texto aqui..."
                className="min-h-[80px]"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Configurações</h4>

              <div>
                <Label className="text-xs">Largura: {textBoxConfig.width}px</Label>
                <Slider
                  value={[textBoxConfig.width]}
                  onValueChange={([value]) => setTextBoxConfig(prev => ({ ...prev, width: value }))}
                  min={100}
                  max={500}
                  step={10}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs">Tamanho da Fonte: {textBoxConfig.fontSize}px</Label>
                <Slider
                  value={[textBoxConfig.fontSize]}
                  onValueChange={([value]) => setTextBoxConfig(prev => ({ ...prev, fontSize: value }))}
                  min={8}
                  max={48}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Prévia</h4>

              <div>
                <Label className="text-xs">Modo de Exibição</Label>
                <Select
                  value={textBoxConfig.previewMode}
                  onValueChange={(value: any) => setTextBoxConfig(prev => ({ ...prev, previewMode: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Mostrar texto completo</SelectItem>
                    <SelectItem value="start">Mostrar início do texto</SelectItem>
                    <SelectItem value="end">Mostrar final do texto</SelectItem>
                    <SelectItem value="start-end">Mostrar início e final</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {textBoxConfig.text && (
                <div className="p-3 bg-gray-50 rounded border">
                  <Label className="text-xs text-gray-600">Prévia:</Label>
                  <div
                    className="mt-1 text-sm"
                    style={{
                      fontSize: `${Math.min(textBoxConfig.fontSize, 14)}px`,
                      width: `${Math.min(textBoxConfig.width, 200)}px`,
                      wordWrap: 'break-word'
                    }}
                  >
                    {getPreviewText(textBoxConfig.text, textBoxConfig.previewMode)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTextBoxDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddTextBox}
                disabled={!textBoxConfig.text.trim()}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Separator orientation="horizontal" className="w-8" />

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
