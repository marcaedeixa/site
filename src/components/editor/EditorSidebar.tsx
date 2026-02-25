'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Element, useEditorStore } from '@/hooks/useEditorStore'
import { ActorsTab } from './ActorsTab'
import { ObjectsTab } from './ObjectsTab'
import { DeixaTab } from './DeixaTab'
import { ToolsTab } from './ToolsTab'
import {
  Palette, Settings, Layers, Users, Box, Lock, Unlock, Theater, MessageSquare, MoreHorizontal,
  AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Group, Ungroup,
  GripVertical, ChevronRight
} from 'lucide-react'

interface EditorSidebarProps {
  selectedElements: string[]
  onUpdateElement: (id: string, updates: Partial<Element>, options?: { commitHistory?: boolean }) => void
}

const colorPresets = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
  '#008000', '#000080', '#808080', '#c0c0c0', '#800000'
]

export function EditorSidebar({ selectedElements, onUpdateElement }: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState('properties')
  const [dimensionLocked, setDimensionLocked] = useState(false)
  const [editingWidth, setEditingWidth] = useState<string>('')
  const [editingHeight, setEditingHeight] = useState<string>('')
  const [isEditingWidth, setIsEditingWidth] = useState(false)
  const [isEditingHeight, setIsEditingHeight] = useState(false)
  const [actorColorInput, setActorColorInput] = useState('#3b82f6')
  const [isEditingActorColor, setIsEditingActorColor] = useState(false)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)

  const sanitizeInitials = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2)

  const deriveInitialsFromName = (name: string) =>
    sanitizeInitials(
      name
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0))
        .join('')
    )
  const [dragOverElement, setDragOverElement] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<'above' | 'below' | null>(null)

  const {
    elements,
    groups,
    strokeColor,
    fillColor,
    strokeWidth,
    opacity,
    fontSize,
    setStrokeColor,
    setFillColor,
    setStrokeWidth,
    setOpacity,
    setFontSize,
    createStage,
    lockGroup,
    unlockGroup,
    isElementLocked,
    getElementGroup,
    alignElementsLeft,
    alignElementsCenter,
    alignElementsRight,
    alignElementsTop,
    alignElementsMiddle,
    alignElementsBottom,
    distributeElementsHorizontally,
    distributeElementsVertically,
    groupElements,
    ungroupElements,
    reorderElements,
    selectElements,
    validateGeometricElements
  } = useEditorStore()

  // Get selected element (if only one is selected)
  const selectedElement = selectedElements.length === 1
    ? elements.find(el => el.id === selectedElements[0])
    : null

  useEffect(() => {
    if (!isEditingActorColor) {
      setActorColorInput(selectedElement?.actorColor || '#3b82f6')
    }
  }, [selectedElement?.actorColor, isEditingActorColor])

  const normalizeHexColor = (value: string): string | null => {
    const raw = value.trim()
    if (!raw) return null

    const withoutHash = raw.startsWith('#') ? raw.slice(1) : raw
    if (!/^[a-fA-F0-9]{3}([a-fA-F0-9]{3})?$/.test(withoutHash)) {
      return null
    }

    return `#${withoutHash}`
  }

  const commitActorColorInput = () => {
    setIsEditingActorColor(false)

    const normalizedColor = normalizeHexColor(actorColorInput)
    if (!normalizedColor) {
      setActorColorInput(selectedElement?.actorColor || '#3b82f6')
      return
    }

    if (selectedElement?.type === 'actor' && normalizedColor !== (selectedElement.actorColor || '#3b82f6')) {
      handleActorPropertyChange('actorColor', normalizedColor)
    }

    setActorColorInput(normalizedColor)
  }

  const handleColorChange = (property: 'stroke' | 'fill', color: string) => {
    if (property === 'stroke') {
      setStrokeColor(color)
    } else {
      setFillColor(color)
    }

    // Apply to selected elements
    selectedElements.forEach(id => {
      onUpdateElement(id, {
        [property === 'stroke' ? 'strokeColor' : 'fillColor']: color
      })
    })
  }

  const handleStrokeWidthChange = (value: number[]) => {
    const width = value[0]
    setStrokeWidth(width)

    selectedElements.forEach(id => {
      onUpdateElement(id, { strokeWidth: width })
    })
  }

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0] / 100
    setOpacity(newOpacity)

    selectedElements.forEach(id => {
      onUpdateElement(id, { opacity: newOpacity })
    })
  }

  const handleFontSizeChange = (value: number[]) => {
    const size = value[0]
    setFontSize(size)

    selectedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element?.type === 'text') {
        onUpdateElement(id, { fontSize: size })
      } else if (element?.type === 'textbox') {
        const padding = 16
        const currentFont = element.fontSize ?? size
        const ratio = currentFont ? size / currentFont : 1

        const textSource = (element.textBoxConfig?.fullText ?? element.text ?? '').trim()
        const fallbackWidth = Math.max(120, textSource.length * (currentFont * 0.6) + padding)
        const baseWidth = element.width && element.width > 0 ? element.width : fallbackWidth
        const newWidth = Math.max(120, baseWidth * ratio)

        const lines = Math.max(1, textSource.split(/\r?\n/).length)
        const lineHeight = size * 1.4
        const newHeight = Math.max(size * 1.5 + padding, lines * lineHeight + padding)

        onUpdateElement(id, {
          fontSize: size,
          width: newWidth,
          height: newHeight,
          textBoxConfig: {
            ...(element.textBoxConfig ?? { previewMode: 'full', fullText: element.text || '' }),
            fullText: textSource || element.text || ''
          }
        })
      }
    })
  }

  const handleTextChange = (text: string) => {
    selectedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element?.type === 'text') {
        onUpdateElement(id, { text })
      } else if (element?.type === 'textbox') {
        const fontSize = element.fontSize ?? 16
        const lines = Math.max(1, text.split(/\r?\n/).length)
        const lineHeight = fontSize * 1.4
        const padding = 16
        const textWidthEstimate = Math.max(fontSize * 2, text.split(/\r?\n/).reduce((max, line) => Math.max(max, line.length), 0) * (fontSize * 0.6))
        const width = Math.max(element.width ?? textWidthEstimate + padding, textWidthEstimate + padding)
        const height = Math.max(element.height ?? fontSize * 1.5 + padding, lines * lineHeight + padding)

        onUpdateElement(id, {
          text,
          width,
          height,
          textBoxConfig: {
            ...(element.textBoxConfig ?? { previewMode: 'full', fullText: '' }),
            fullText: text
          }
        })
      }
    })
  }

  const handleActorPropertyChange = (property: string, value: string) => {
    selectedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element?.type === 'actor') {
        const updates: Partial<Element> = { [property]: value }

        if (property === 'actorName') {
          updates.actorInitials = deriveInitialsFromName(value)
        }

        if (property === 'actorInitials') {
          updates.actorInitials = sanitizeInitials(value)
        }

        onUpdateElement(id, updates)
      }
    })
  }

  const handleObjectPropertyChange = (property: string, value: string) => {
    selectedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element?.type === 'object') {
        const updates: Partial<Element> = { [property]: value }

        if (property === 'objectName') {
          const previousAuto = deriveInitialsFromName(element.objectName || '')
          const nextAuto = deriveInitialsFromName(value)
          if (!element.objectInitials || element.objectInitials === previousAuto) {
            updates.objectInitials = nextAuto
          }
        }

        if (property === 'objectInitials') {
          updates.objectInitials = sanitizeInitials(value)
        }

        onUpdateElement(id, updates)
      }
    })
  }

  const handleStrokeDashChange = (dashArray: string) => {
    selectedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element && (element.type === 'line' || element.type === 'arrow')) {
        onUpdateElement(id, { strokeDasharray: dashArray })
      }
    })
  }



  const handlePositionChange = (property: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return

    selectedElements.forEach(id => {
      onUpdateElement(id, { [property]: numValue })
    })
  }

  // Display values directly in cm (internal storage unit)
  const formatCm = (cm: number) => cm.toFixed(1)

  const handleDimensionFocus = (property: 'width' | 'height') => {
    const element = elements.find(el => el.id === selectedElements[0])
    if (element) {
      const displayValue = formatCm(element[property] || 0)
      if (property === 'width') {
        setIsEditingWidth(true)
        setEditingWidth(displayValue)
        if (dimensionLocked) {
          setIsEditingHeight(true)
          setEditingHeight(displayValue)
        }
      } else {
        setIsEditingHeight(true)
        setEditingHeight(displayValue)
        if (dimensionLocked) {
          setIsEditingWidth(true)
          setEditingWidth(displayValue)
        }
      }
    }
  }

  const handleDimensionChange = (property: 'width' | 'height', value: string) => {
    if (property === 'width') {
      setEditingWidth(value)
      if (dimensionLocked) setEditingHeight(value)
    } else {
      setEditingHeight(value)
      if (dimensionLocked) setEditingWidth(value)
    }
  }

  const handleDimensionBlur = (property: 'width' | 'height') => {
    if (property === 'width') {
      setIsEditingWidth(false)
    } else {
      setIsEditingHeight(false)
    }

    if (dimensionLocked) {
      setIsEditingWidth(false)
      setIsEditingHeight(false)
    }

    const value = property === 'width' ? editingWidth : editingHeight

    if (value === '' || value === '-') return

    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) return

    // Value is already in cm (internal storage unit)
    const cmValue = numValue

    selectedElements.forEach(id => {
      if (dimensionLocked) {
        onUpdateElement(id, { width: cmValue, height: cmValue })
      } else {
        onUpdateElement(id, { [property]: cmValue })
      }
    })
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, elementId: string) => {
    setDraggedElement(elementId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, elementId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (draggedElement === elementId) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    const position = y < height / 2 ? 'above' : 'below'

    setDragOverElement(elementId)
    setDragPosition(position)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the entire element, not just moving to a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverElement(null)
      setDragPosition(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetElementId: string) => {
    e.preventDefault()

    if (draggedElement && draggedElement !== targetElementId && dragPosition) {
      reorderElements(draggedElement, targetElementId, dragPosition)
    }

    setDraggedElement(null)
    setDragOverElement(null)
    setDragPosition(null)
  }

  const handleDragEnd = () => {
    setDraggedElement(null)
    setDragOverElement(null)
    setDragPosition(null)
  }

  const ColorPicker = ({
    label,
    value,
    onChange
  }: {
    label: string
    value: string
    onChange: (color: string) => void
  }) => {
    const [localValue, setLocalValue] = useState(value)
    const [isFocused, setIsFocused] = useState(false)

    // Update local value when external value changes (but not while user is typing)
    useEffect(() => {
      if (!isFocused) {
        setLocalValue(value)
      }
    }, [value, isFocused])

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value)
    }

    const handleTextBlur = () => {
      setIsFocused(false)
      // Only apply if it's a valid color format
      if (localValue && (localValue.startsWith('#') || /^[a-fA-F0-9]{3,6}$/.test(localValue))) {
        const colorValue = localValue.startsWith('#') ? localValue : `#${localValue}`
        onChange(colorValue)
      } else {
        setLocalValue(value) // Reset to original if invalid
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur()
      } else if (e.key === 'Escape') {
        setLocalValue(value)
        setIsFocused(false)
      }
    }

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-8 p-1 border rounded"
          />
          <Input
            type="text"
            value={localValue}
            onChange={handleTextChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 text-xs"
            placeholder="#000000"
          />
        </div>
        <div className="grid grid-cols-5 gap-1">
          {colorPresets.map((color) => (
            <button
              key={color}
              onClick={() => {
                setLocalValue(color)
                onChange(color)
              }}
              className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    )
  }

  const [isCollapsed, setIsCollapsed] = useState(true)

  const handleTabClick = (value: string) => {
    if (activeTab === value && !isCollapsed) {
      setIsCollapsed(true)
    } else {
      setActiveTab(value)
      setIsCollapsed(false)
    }
  }

  // Sidebar agora é overlay absoluto; não precisa mais de largura dinâmica do container

  return (
    <div className="h-full min-h-0 flex border-l border-gray-200 bg-white shadow-sm overflow-hidden">
      <Tabs value={activeTab} className="flex w-full h-full min-h-0">
        {/* Coluna de ícones */}
        <TabsList className="flex flex-col items-center justify-start gap-3 w-12 min-w-12 h-full py-3 border-r bg-gray-50 rounded-none overflow-y-auto scrollbar-hide">
          <TabsTrigger value="properties" onClick={() => handleTabClick('properties')} className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200 data-[state=active]:bg-gray-300">
            <Settings className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="colors" onClick={() => handleTabClick('colors')} className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200 data-[state=active]:bg-gray-300">
            <Palette className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="layers" onClick={() => handleTabClick('layers')} className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200 data-[state=active]:bg-gray-300">
            <Layers className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="actors" onClick={() => handleTabClick('actors')} className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200 data-[state=active]:bg-gray-300">
            <Users className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="objects" onClick={() => handleTabClick('objects')} className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200 data-[state=active]:bg-gray-300">
            <Box className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="deixa" onClick={() => handleTabClick('deixa')} className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200 data-[state=active]:bg-gray-300">
            <MessageSquare className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="tools" onClick={() => handleTabClick('tools')} className="flex items-center justify-center h-10 w-10 p-0 hover:bg-gray-200 data-[state=active]:bg-gray-300">
            <MoreHorizontal className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {/* Área de conteúdo das abas (retrátil) */}
        <div className={`${isCollapsed ? 'hidden' : 'flex-1 flex flex-col min-h-0'} h-full bg-white p-3 overflow-hidden relative min-w-[260px] max-w-[360px]`}>
          {/* Botão para recolher o painel */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 absolute top-2 right-2"
            title="Recolher painel"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <TabsContent value="properties" className="space-y-4 mt-0 overflow-y-auto flex-1 pr-1">
            {selectedElements.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Selecione um elemento para editar suas propriedades</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {selectedElements.length === 1 ? 'Elemento Selecionado' : `${selectedElements.length} Elementos`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Position */}
                    {selectedElement && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Localização horizontal (cm)</Label>
                          <Input
                            type="number"
                            value={selectedElement.x}
                            onChange={(e) => handlePositionChange('x', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Localização vertical (cm)</Label>
                          <Input
                            type="number"
                            value={selectedElement.y}
                            onChange={(e) => handlePositionChange('y', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    )}

                    {/* Size */}
                    {selectedElement && selectedElement.type !== 'line' && selectedElement.type !== 'arrow' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Dimensões</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setDimensionLocked(!dimensionLocked)}
                            title={dimensionLocked ? "Destravar proporções" : "Travar proporções"}
                          >
                            {dimensionLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Largura (cm)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={isEditingWidth ? editingWidth : formatCm(selectedElement.width || 0)}
                              onFocus={() => handleDimensionFocus('width')}
                              onChange={(e) => handleDimensionChange('width', e.target.value)}
                              onBlur={() => handleDimensionBlur('width')}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Altura (cm)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={isEditingHeight ? editingHeight : formatCm(selectedElement.height || 0)}
                              onFocus={() => handleDimensionFocus('height')}
                              onChange={(e) => handleDimensionChange('height', e.target.value)}
                              onBlur={() => handleDimensionBlur('height')}
                              className="h-8"
                            />
                          </div>
                        </div>
                        {dimensionLocked && (
                          <p className="text-xs text-muted-foreground">🔗 Proporções travadas</p>
                        )}
                      </div>
                    )}

                    {/* Text Content */}
                    {selectedElement && (selectedElement.type === 'text' || selectedElement.type === 'textbox') && (
                      <div className="space-y-1">
                        <Label className="text-xs">Texto</Label>
                        {selectedElement.type === 'textbox' ? (
                          <Textarea
                            value={selectedElement.text || ''}
                            onChange={(e) => handleTextChange(e.target.value)}
                            className="min-h-[80px]"
                            placeholder="Digite o conteúdo do texto..."
                          />
                        ) : (
                          <Input
                            value={selectedElement.text || ''}
                            onChange={(e) => handleTextChange(e.target.value)}
                            className="h-8"
                            placeholder="Digite o texto..."
                          />
                        )}
                      </div>
                    )}

                    {/* Textbox Preview Mode */}
                    {selectedElement?.type === 'textbox' && (
                      <div className="space-y-1">
                        <Label className="text-xs">Modo de Exibição</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant={(!selectedElement.textBoxConfig?.previewMode || selectedElement.textBoxConfig?.previewMode === 'full') ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onUpdateElement(selectedElement.id, { textBoxConfig: { ...selectedElement.textBoxConfig, previewMode: 'full', fullText: selectedElement.textBoxConfig?.fullText || '' } })}
                          >
                            Completo
                          </Button>
                          <Button
                            variant={selectedElement.textBoxConfig?.previewMode === 'start' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onUpdateElement(selectedElement.id, { textBoxConfig: { ...selectedElement.textBoxConfig, previewMode: 'start', fullText: selectedElement.textBoxConfig?.fullText || '' } })}
                          >
                            Início...
                          </Button>
                          <Button
                            variant={selectedElement.textBoxConfig?.previewMode === 'end' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onUpdateElement(selectedElement.id, { textBoxConfig: { ...selectedElement.textBoxConfig, previewMode: 'end', fullText: selectedElement.textBoxConfig?.fullText || '' } })}
                          >
                            ...Final
                          </Button>
                          <Button
                            variant={selectedElement.textBoxConfig?.previewMode === 'start-end' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onUpdateElement(selectedElement.id, { textBoxConfig: { ...selectedElement.textBoxConfig, previewMode: 'start-end', fullText: selectedElement.textBoxConfig?.fullText || '' } })}
                          >
                            Início...Final
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Actor Properties */}
                    {selectedElement?.type === 'actor' && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Nome do Ator</Label>
                          <Input
                            value={selectedElement.actorName || ''}
                            onChange={(e) => handleActorPropertyChange('actorName', e.target.value)}
                            className="h-8"
                            placeholder="Nome do ator..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sigla</Label>
                          <Input
                            value={selectedElement.actorInitials || ''}
                            onChange={(e) => handleActorPropertyChange('actorInitials', e.target.value)}
                            className="h-8 uppercase"
                            maxLength={2}
                            placeholder="Ex: AB"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cor do Ator</Label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={selectedElement.actorColor || '#3b82f6'}
                              onChange={(e) => handleActorPropertyChange('actorColor', e.target.value)}
                              className="h-8 w-12 cursor-pointer rounded border"
                            />
                            <Input
                              value={actorColorInput}
                              onChange={(e) => setActorColorInput(e.target.value)}
                              onFocus={() => setIsEditingActorColor(true)}
                              onBlur={commitActorColorInput}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                }

                                if (e.key === 'Escape') {
                                  setIsEditingActorColor(false)
                                  setActorColorInput(selectedElement.actorColor || '#3b82f6')
                                  e.currentTarget.blur()
                                }
                              }}
                              className="h-8 flex-1 font-mono text-xs"
                              placeholder="#3b82f6"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Object Properties */}
                    {selectedElement?.type === 'object' && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Nome do Objeto</Label>
                          <Input
                            value={selectedElement.objectName || ''}
                            onChange={(e) => handleObjectPropertyChange('objectName', e.target.value)}
                            className="h-8"
                            placeholder="Nome do objeto..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Sigla</Label>
                          <Input
                            value={selectedElement.objectInitials || ''}
                            onChange={(e) => handleObjectPropertyChange('objectInitials', e.target.value)}
                            className="h-8 uppercase"
                            maxLength={2}
                            placeholder="Ex: OB"
                          />
                        </div>
                      </div>
                    )}

                    {/* Font Size */}
                    {selectedElement && (selectedElement.type === 'text' || selectedElement.type === 'textbox') && (
                      <div>
                        <Label className="text-xs mb-2 block">Tamanho da Fonte: {selectedElement.fontSize || fontSize}px</Label>
                        <Slider
                          value={[selectedElement.fontSize || fontSize]}
                          onValueChange={handleFontSizeChange}
                          min={8}
                          max={72}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Stroke Width */}
                    <div>
                      <Label className="text-xs mb-2 block">Espessura: {selectedElement?.strokeWidth || strokeWidth}px</Label>
                      <Slider
                        value={[selectedElement?.strokeWidth || strokeWidth]}
                        onValueChange={handleStrokeWidthChange}
                        min={1}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Opacity */}
                    <div>
                      <Label className="text-xs mb-2 block">Opacidade: {Math.round((selectedElement?.opacity || opacity) * 100)}%</Label>
                      <Slider
                        value={[Math.round((selectedElement?.opacity || opacity) * 100)]}
                        onValueChange={handleOpacityChange}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Stroke Dash Array - Only for lines and arrows */}
                    {selectedElement && (selectedElement.type === 'line' || selectedElement.type === 'arrow') && (
                      <div>
                        <Label className="text-xs mb-2 block">Tipo de Tracejado</Label>
                        <div className="grid grid-cols-3 gap-1">
                          <Button
                            variant={!selectedElement.strokeDasharray || selectedElement.strokeDasharray === '' ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleStrokeDashChange('')}
                            className="h-8 text-xs"
                            title="Linha sólida"
                          >
                            ___
                          </Button>
                          <Button
                            variant={selectedElement.strokeDasharray === '8,4' ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleStrokeDashChange('8,4')}
                            className="h-8 text-xs"
                            title="Linha tracejada"
                          >
                            - - -
                          </Button>
                          <Button
                            variant={selectedElement.strokeDasharray === '1,3' ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleStrokeDashChange('1,3')}
                            className="h-8 text-xs"
                            title="Linha pontilhada"
                          >
                            ···
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Alignment and Grouping - Only show when multiple elements are selected */}
                    {selectedElements.length > 1 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <Label className="text-xs font-medium">Alinhamento</Label>

                          {/* Horizontal Alignment */}
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-600">Horizontal</Label>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alignElementsLeft(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Alinhar à esquerda"
                              >
                                <AlignLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alignElementsCenter(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Alinhar ao centro"
                              >
                                <AlignCenter className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alignElementsRight(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Alinhar à direita"
                              >
                                <AlignRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Vertical Alignment */}
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-600">Vertical</Label>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alignElementsTop(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Alinhar ao topo"
                              >
                                <AlignVerticalJustifyStart className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alignElementsMiddle(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Alinhar ao meio"
                              >
                                <AlignVerticalJustifyCenter className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => alignElementsBottom(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Alinhar à base"
                              >
                                <AlignVerticalJustifyEnd className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Distribution */}
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-600">Distribuição</Label>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => distributeElementsHorizontally(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Distribuir horizontalmente"
                              >
                                <AlignHorizontalDistributeCenter className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => distributeElementsVertically(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Distribuir verticalmente"
                              >
                                <AlignVerticalDistributeCenter className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Grouping */}
                          <div className="space-y-2">
                            <Label className="text-xs text-gray-600">Agrupamento</Label>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => groupElements(selectedElements)}
                                className="h-8 w-8 p-0"
                                title="Agrupar elementos"
                              >
                                <Group className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Find groups that contain selected elements and ungroup them
                                  const groupsToUngroup = groups.filter(group =>
                                    group.elementIds.some(elementId => selectedElements.includes(elementId))
                                  )
                                  groupsToUngroup.forEach(group => ungroupElements(group.id))
                                }}
                                disabled={!groups.some(group =>
                                  group.elementIds.some(elementId => selectedElements.includes(elementId))
                                )}
                                className="h-8 w-8 p-0"
                                title="Desagrupar elementos"
                              >
                                <Ungroup className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="colors" className="space-y-4 mt-0 overflow-y-auto flex-1 pr-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ColorPicker
                  label="Cor do Contorno"
                  value={selectedElement?.strokeColor || strokeColor}
                  onChange={(color) => handleColorChange('stroke', color)}
                />

                <Separator />

                <ColorPicker
                  label="Cor de Preenchimento"
                  value={selectedElement?.fillColor || fillColor}
                  onChange={(color) => handleColorChange('fill', color)}
                />

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleColorChange('fill', 'transparent')}
                    className="w-full"
                  >
                    Sem Preenchimento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layers" className="space-y-4 mt-0 overflow-y-auto flex-1 pr-1">
            {/* Stage Controls */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Theater className="h-4 w-4" />
                  Controles de Palco
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedElements.length >= 1 && (() => {
                  const validation = validateGeometricElements(selectedElements)
                  const hasValidElements = validation.hasValidElements
                  const invalidCount = validation.invalid.length
                  const stageGroup = groups.find(g => g.name === 'Palco')
                  const isStageLocked = !!stageGroup?.locked

                  return (
                    <>
                      <Button
                        onClick={() => createStage(selectedElements)}
                        className="w-full"
                        size="sm"
                        variant={hasValidElements && !isStageLocked ? "default" : "outline"}
                        disabled={!hasValidElements || isStageLocked}
                      >
                        <Theater className="h-4 w-4 mr-2" />
                        Criar Palco
                      </Button>
                      {isStageLocked && (
                        <p className="text-xs text-amber-600">
                          ⚠ Palco travado: destrave para adicionar novos elementos ao palco
                        </p>
                      )}

                      {hasValidElements && invalidCount === 0 && (
                        <p className="text-xs text-green-600">
                          ✓ {validation.valid.length} elemento(s) geométrico(s) selecionado(s)
                        </p>
                      )}

                      {hasValidElements && invalidCount > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-green-600">
                            ✓ {validation.valid.length} elemento(s) geométrico(s) válido(s)
                          </p>
                          <p className="text-xs text-amber-600">
                            ⚠ {invalidCount} elemento(s) não geométrico(s) serão ignorados
                          </p>
                        </div>
                      )}

                      {!hasValidElements && (
                        <p className="text-xs text-red-600">
                          ✗ Apenas retângulos, círculos, retas ou formas compostas podem formar o palco
                        </p>
                      )}

                      <p className="text-xs text-gray-600">
                        Agrupa e trava elementos geométricos e compostos como base do palco
                      </p>
                    </>
                  )
                })()}

                {selectedElements.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Selecione elementos para criar um palco
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Groups Controls */}
            {groups.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Grupos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {groups.map((group) => {
                      const isLocked = group.locked
                      const groupName = group.name || `Grupo ${group.id.slice(0, 8)}`

                      return (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-2 bg-red-50 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            {isLocked ? (
                              <Lock className="h-3 w-3 text-red-500" />
                            ) : (
                              <Unlock className="h-3 w-3 text-green-500" />
                            )}
                            <span className="text-xs font-medium">{groupName}</span>
                            <span className="text-xs text-gray-500">({group.elementIds.length} elementos)</span>
                          </div>

                          <Button
                            onClick={() => isLocked ? unlockGroup(group.id) : lockGroup(group.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            {isLocked ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <Unlock className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Camadas</CardTitle>
                {selectedElements.length === 1 && selectedElement && (
                  <div className="text-xs text-gray-600">
                    Camada atual: <span className="font-semibold">{selectedElement.zIndex || 0}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {elements.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Nenhum elemento criado</p>
                    </div>
                  ) : (
                    elements
                      .slice()
                      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                      .map((element, index) => {
                        const isSelected = selectedElements.includes(element.id)
                        const isLocked = isElementLocked(element.id)
                        const elementGroup = getElementGroup(element.id)
                        const zIndex = element.zIndex || 0

                        const isDragging = draggedElement === element.id
                        const isDragOver = dragOverElement === element.id
                        const showDropIndicator = isDragOver && dragPosition

                        return (
                          <div key={element.id} className="relative">
                            {/* Drop indicator above */}
                            {showDropIndicator && dragPosition === 'above' && (
                              <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 z-10 rounded" />
                            )}

                            <div
                              draggable={!isLocked}
                              onDragStart={(e) => !isLocked && handleDragStart(e, element.id)}
                              onDragOver={(e) => handleDragOver(e, element.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, element.id)}
                              onDragEnd={handleDragEnd}
                              className={`p-2 rounded border transition-all duration-200 ${isDragging
                                ? 'opacity-50 scale-95 rotate-1 shadow-lg'
                                : isLocked
                                  ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-75'
                                  : isSelected
                                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300 cursor-pointer'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                                } ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
                              onClick={() => {
                                if (!isLocked && !isDragging) {
                                  selectElements([element.id])
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {/* Drag handle */}
                                  {!isLocked && (
                                    <GripVertical className="h-3 w-3 text-gray-400 cursor-grab active:cursor-grabbing" />
                                  )}

                                  <div className="flex items-center gap-1">
                                    <div
                                      className="w-3 h-3 rounded border flex-shrink-0"
                                      style={{ backgroundColor: element.fillColor !== 'transparent' ? element.fillColor : element.strokeColor }}
                                    />
                                    {isLocked && (
                                      <Lock className="h-3 w-3 text-red-500" />
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-xs font-medium capitalize truncate ${isLocked ? 'text-red-600' : ''
                                      }`}>
                                      {element.type === 'path' ? 'Desenho' :
                                        element.type === 'actor' ? 'Ator' : element.type}
                                      {element.type === 'text' && element.text ? ` - ${element.text.slice(0, 8)}...` : ''}
                                      {element.type === 'actor' && element.actorName ? ` - ${element.actorName.slice(0, 8)}...` : ''}
                                    </span>
                                    {elementGroup && (
                                      <span className="text-xs text-purple-600 font-medium">
                                        {elementGroup.name || 'Grupo'}
                                      </span>
                                    )}
                                    {isSelected && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        Camada {zIndex}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs text-gray-400 font-mono">
                                    z:{zIndex}
                                  </span>
                                  {index === 0 && (
                                    <span className="text-xs text-green-600 font-medium">
                                      Topo
                                    </span>
                                  )}
                                  {index === elements.length - 1 && (
                                    <span className="text-xs text-red-600 font-medium">
                                      Base
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Drop indicator below */}
                            {showDropIndicator && dragPosition === 'below' && (
                              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 z-10 rounded" />
                            )}
                          </div>
                        )
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actors" className="space-y-4 mt-0 overflow-y-auto overflow-x-hidden flex-1 min-w-0 pr-1">
            <ActorsTab />
          </TabsContent>

          <TabsContent value="objects" className="space-y-4 mt-0 overflow-y-auto overflow-x-hidden flex-1 min-w-0 pr-1">
            <ObjectsTab />
          </TabsContent>

          <TabsContent value="deixa" className="space-y-4 mt-0 overflow-y-auto overflow-x-hidden flex-1 min-w-0 pr-1">
            <DeixaTab />
          </TabsContent>

          <TabsContent value="tools" className="space-y-4 mt-0 overflow-y-auto overflow-x-hidden flex-1 min-w-0 pr-1">
            <ToolsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
