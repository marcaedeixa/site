'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Element, useEditorStore } from '@/hooks/useEditorStore'
import ActorsTab from './ActorsTab'
import { Palette, Settings, Layers, Users, Lock, Unlock, Theater } from 'lucide-react'

interface EditorSidebarProps {
  selectedElements: string[]
  onUpdateElement: (id: string, updates: Partial<Element>) => void
}

const colorPresets = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
  '#008000', '#000080', '#808080', '#c0c0c0', '#800000'
]

export function EditorSidebar({ selectedElements, onUpdateElement }: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState('properties')
  
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
    getElementGroup
  } = useEditorStore()

  // Get selected element (if only one is selected)
  const selectedElement = selectedElements.length === 1 
    ? elements.find(el => el.id === selectedElements[0])
    : null

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
      }
    })
  }

  const handleTextChange = (text: string) => {
    selectedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element?.type === 'text') {
        onUpdateElement(id, { text })
      }
    })
  }

  const handleActorPropertyChange = (property: string, value: string) => {
    selectedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element?.type === 'actor') {
        const updates: Partial<Element> = { [property]: value }
        
        // Update initials when name changes
        if (property === 'actorName') {
          const initials = value
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('')
          updates.actorInitials = initials
        }
        
        onUpdateElement(id, updates)
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

  const handleSizeChange = (property: 'width' | 'height', value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) return
    
    selectedElements.forEach(id => {
      onUpdateElement(id, { [property]: numValue })
    })
  }

  const ColorPicker = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string
    value: string
    onChange: (color: string) => void 
  }) => (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs"
          placeholder="#000000"
        />
      </div>
      <div className="grid grid-cols-5 gap-1">
        {colorPresets.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="properties" className="flex items-center justify-center">
            <Settings className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center justify-center">
            <Palette className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="layers" className="flex items-center justify-center">
            <Layers className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="actors" className="flex items-center justify-center">
            <Users className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="properties" className="space-y-4 mt-0 overflow-y-auto max-h-[calc(100vh-200px)]">
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
                          <Label className="text-xs">X</Label>
                          <Input
                            type="number"
                            value={selectedElement.x}
                            onChange={(e) => handlePositionChange('x', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y</Label>
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
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Largura</Label>
                          <Input
                            type="number"
                            value={selectedElement.width || 0}
                            onChange={(e) => handleSizeChange('width', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Altura</Label>
                          <Input
                            type="number"
                            value={selectedElement.height || 0}
                            onChange={(e) => handleSizeChange('height', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    )}

                    {/* Text Content */}
                    {selectedElement?.type === 'text' && (
                      <div>
                        <Label className="text-xs">Texto</Label>
                        <Input
                          value={selectedElement.text || ''}
                          onChange={(e) => handleTextChange(e.target.value)}
                          className="h-8"
                          placeholder="Digite o texto..."
                        />
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
                          <Label className="text-xs">Papel</Label>
                          <Input
                            value={selectedElement.actorRole || ''}
                            onChange={(e) => handleActorPropertyChange('actorRole', e.target.value)}
                            className="h-8"
                            placeholder="Papel do ator..."
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Fala</Label>
                          <Input
                            value={selectedElement.actorSpeech || ''}
                            onChange={(e) => handleActorPropertyChange('actorSpeech', e.target.value)}
                            className="h-8"
                            placeholder="Fala do ator..."
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Forma</Label>
                          <select
                            value={selectedElement.actorShape || 'circle'}
                            onChange={(e) => handleActorPropertyChange('actorShape', e.target.value)}
                            className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm"
                          >
                            <option value="circle">Círculo</option>
                            <option value="square">Quadrado</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Font Size */}
                    {selectedElement?.type === 'text' && (
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
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="colors" className="space-y-4 mt-0 overflow-y-auto max-h-[calc(100vh-200px)]">
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

          <TabsContent value="layers" className="space-y-4 mt-0 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Stage Controls */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Theater className="h-4 w-4" />
                  Controles de Palco
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedElements.length >= 1 && (
                  <>
                    <Button
                      onClick={() => createStage(selectedElements)}
                      className="w-full"
                      size="sm"
                      variant="default"
                    >
                      <Theater className="h-4 w-4 mr-2" />
                      Criar Palco
                    </Button>
                    <p className="text-xs text-gray-600">
                      Agrupa e trava os elementos selecionados como base do palco
                    </p>
                  </>
                )}
                
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
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border"
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
                              <Unlock className="h-3 w-3" />
                            ) : (
                              <Lock className="h-3 w-3" />
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
                        
                        return (
                          <div
                            key={element.id}
                            className={`p-2 rounded border transition-colors ${
                              isLocked 
                                ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-75'
                                : isSelected 
                                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300 cursor-pointer' 
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer'
                            }`}
                            onClick={() => {
                              if (!isLocked) {
                                const { selectElements } = useEditorStore.getState()
                                selectElements([element.id])
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
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
                                  <span className={`text-xs font-medium capitalize truncate ${
                                    isLocked ? 'text-red-600' : ''
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
                        )
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actors" className="space-y-4 mt-0 overflow-y-auto max-h-[calc(100vh-200px)]">
            <ActorsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}