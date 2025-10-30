'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useEditorStore, StageConfig as StageConfigType, Element } from '@/hooks/useEditorStore'
import { nanoid } from 'nanoid'
import { Settings, Square, Circle, Ellipsis, Palette, Eye, EyeOff, Lock, Unlock } from 'lucide-react'

interface StageConfigProps {
  className?: string
}

export function StageConfig({ className }: StageConfigProps) {
  const { 
    stageConfig, 
    setStageConfig, 
    updateStageConfig, 
    removeStageConfig,
    centerStage,
    selectedElements,
    elements,
    createStage,
    combineShapesIntoStage
  } = useEditorStore()

  const [isExpanded, setIsExpanded] = useState(false)

  // Configuração padrão para novo palco
  const defaultStageConfig: StageConfigType = {
    id: nanoid(),
    width: 800,
    height: 600,
    shape: 'rectangle',
    backgroundColor: '#f8f9fa',
    borderColor: '#000000',
    borderWidth: 2,
    x: 0,
    y: 0,
    visible: true,
    locked: false
  }

  const handleCreateStage = () => {
    // Se houver seleção, usar os elementos selecionados como palco
    if (selectedElements && selectedElements.length > 0) {
      // Verificar se há retângulo e círculo para unir em um palco unificado
      const selected = selectedElements
        .map(id => elements.find(el => el.id === id))
        .filter((el): el is Element => Boolean(el))

      const hasRectangle = selected.some(el => el.type === 'rectangle')
      const hasCircle = selected.some(el => el.type === 'circle')

      // Calcular bounding box da seleção
      const minX = Math.min(...selected.map(el => el.x))
      const minY = Math.min(...selected.map(el => el.y))
      const maxX = Math.max(...selected.map(el => el.x + (el.width || 0)))
      const maxY = Math.max(...selected.map(el => el.y + (el.height || 0)))

      // Usar estilos do primeiro elemento para preencher a config
      const styleRef = selected[0]
      const configFromSelection: StageConfigType = {
        id: nanoid(),
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
        shape: 'rectangle',
        backgroundColor: styleRef?.fillColor || '#f8f9fa',
        borderColor: styleRef?.strokeColor || '#000000',
        borderWidth: styleRef?.strokeWidth || 2,
        visible: true,
        locked: true
      }

      // Não definir stageConfig quando há seleção para evitar overlay duplicado
      // Garantir que qualquer overlay existente seja removido
      removeStageConfig()

      if (hasRectangle && hasCircle) {
        // Unir formas em um elemento 'stage' dedicado
        combineShapesIntoStage(selectedElements)
      } else {
        // Agrupar e travar como base do palco
        createStage(selectedElements)
      }

      return
    }

    // Sem seleção: criar palco padrão e centralizar
    setStageConfig(defaultStageConfig)
    setTimeout(() => centerStage(), 0)
  }

  const handleUpdateStage = (updates: Partial<StageConfigType>) => {
    updateStageConfig(updates)
  }

  const handleRemoveStage = () => {
    removeStageConfig()
  }

  const handleToggleVisibility = () => {
    if (stageConfig) {
      handleUpdateStage({ visible: !stageConfig.visible })
    }
  }

  const handleToggleLock = () => {
    if (stageConfig) {
      handleUpdateStage({ locked: !stageConfig.locked })
    }
  }

  const colorPresets = [
    { name: 'Branco', value: '#ffffff' },
    { name: 'Cinza Claro', value: '#f8f9fa' },
    { name: 'Cinza', value: '#e9ecef' },
    { name: 'Azul Claro', value: '#e3f2fd' },
    { name: 'Verde Claro', value: '#e8f5e8' },
    { name: 'Amarelo Claro', value: '#fff9c4' },
    { name: 'Rosa Claro', value: '#fce4ec' },
    { name: 'Preto', value: '#000000' }
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          Configuração do Palco
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto h-6 w-6 p-0"
          >
            {isExpanded ? '−' : '+'}
          </Button>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {!stageConfig ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhum palco configurado
              </p>
              <Button onClick={handleCreateStage} className="w-full">
                Criar Palco
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Controles de visibilidade e bloqueio */}
              <div className="flex gap-2">
                <Button
                  variant={stageConfig.visible ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleVisibility}
                  className="flex-1"
                >
                  {stageConfig.visible ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                  {stageConfig.visible ? 'Visível' : 'Oculto'}
                </Button>
                <Button
                  variant={stageConfig.locked ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleToggleLock}
                  className="flex-1"
                >
                  {stageConfig.locked ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                  {stageConfig.locked ? 'Bloqueado' : 'Livre'}
                </Button>
              </div>

              <Separator />

              {/* Dimensões */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Dimensões</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="stage-width" className="text-xs">Largura</Label>
                    <Input
                      id="stage-width"
                      type="number"
                      value={stageConfig.width}
                      onChange={(e) => handleUpdateStage({ width: parseInt(e.target.value) || 0 })}
                      className="h-8"
                      min="100"
                      max="2000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stage-height" className="text-xs">Altura</Label>
                    <Input
                      id="stage-height"
                      type="number"
                      value={stageConfig.height}
                      onChange={(e) => handleUpdateStage({ height: parseInt(e.target.value) || 0 })}
                      className="h-8"
                      min="100"
                      max="2000"
                    />
                  </div>
                </div>
              </div>

              {/* Forma */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Forma</Label>
                <Select
                  value={stageConfig.shape}
                  onValueChange={(value: 'rectangle' | 'circle' | 'oval') => 
                    handleUpdateStage({ shape: value })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rectangle">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4" />
                        Retângulo
                      </div>
                    </SelectItem>
                    <SelectItem value="circle">
                      <div className="flex items-center gap-2">
                        <Circle className="h-4 w-4" />
                        Círculo
                      </div>
                    </SelectItem>
                    <SelectItem value="oval">
                      <div className="flex items-center gap-2">
                        <Ellipsis className="h-4 w-4" />
                        Oval
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cores */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Cores</Label>
                
                {/* Cor de fundo */}
                <div className="space-y-2">
                  <Label htmlFor="stage-bg-color" className="text-xs">Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stage-bg-color"
                      type="color"
                      value={stageConfig.backgroundColor}
                      onChange={(e) => handleUpdateStage({ backgroundColor: e.target.value })}
                      className="h-8 w-16 p-1"
                    />
                    <Select
                      value={stageConfig.backgroundColor}
                      onValueChange={(value) => handleUpdateStage({ backgroundColor: value })}
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {colorPresets.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: preset.value }}
                              />
                              {preset.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cor da borda */}
                <div className="space-y-2">
                  <Label htmlFor="stage-border-color" className="text-xs">Cor da Borda</Label>
                  <Input
                    id="stage-border-color"
                    type="color"
                    value={stageConfig.borderColor}
                    onChange={(e) => handleUpdateStage({ borderColor: e.target.value })}
                    className="h-8 w-16 p-1"
                  />
                </div>

                {/* Largura da borda */}
                <div className="space-y-2">
                  <Label htmlFor="stage-border-width" className="text-xs">Largura da Borda</Label>
                  <Input
                    id="stage-border-width"
                    type="number"
                    value={stageConfig.borderWidth}
                    onChange={(e) => handleUpdateStage({ borderWidth: parseInt(e.target.value) || 0 })}
                    className="h-8"
                    min="0"
                    max="20"
                  />
                </div>
              </div>

              <Separator />

              {/* Ações */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={centerStage}
                  className="w-full"
                >
                  Centralizar Palco
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveStage}
                  className="w-full"
                >
                  Remover Palco
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}