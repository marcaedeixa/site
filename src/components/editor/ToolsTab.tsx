'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useEditorStore } from '@/hooks/useEditorStore'
import { 
  Type, 
  Plus, 
  Settings,
  Eye
} from 'lucide-react'

interface TextBoxConfig {
  text: string
  width: number
  fontSize: number
  previewMode: 'full' | 'start' | 'end' | 'start-end'
}

export function ToolsTab() {
  const {
    addElement,
    viewport,
    hoverPreviewEnabled,
    hoverPreviewColor,
    setHoverPreviewEnabled,
    setHoverPreviewColor
  } = useEditorStore()
  const [showTextBoxDialog, setShowTextBoxDialog] = useState(false)
  const [textBoxConfig, setTextBoxConfig] = useState<TextBoxConfig>({
    text: '',
    width: 200,
    fontSize: 16,
    previewMode: 'full'
  })
  const [showHoverDialog, setShowHoverDialog] = useState(false)
  const [hoverEnabledDraft, setHoverEnabledDraft] = useState(hoverPreviewEnabled)
  const [hoverColorDraft, setHoverColorDraft] = useState(hoverPreviewColor)

  const handleAddTextBox = () => {
    if (!textBoxConfig.text.trim()) return

    // Calculate position in the center of the viewport
    const centerX = -viewport.x + (window.innerWidth / 2) / viewport.zoom
    const centerY = -viewport.y + (window.innerHeight / 2) / viewport.zoom

    addElement({
      type: 'textbox',
      x: centerX - textBoxConfig.width / 2,
      y: centerY - 20,
      width: textBoxConfig.width,
      height: textBoxConfig.fontSize * 1.5,
      text: textBoxConfig.text,
      fontSize: textBoxConfig.fontSize,
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      zIndex: 1000,
      // Custom properties for text box
      textBoxConfig: {
        previewMode: textBoxConfig.previewMode,
        fullText: textBoxConfig.text
      }
    } as any)

    // Reset form
    setTextBoxConfig({
      text: '',
      width: 200,
      fontSize: 16,
      previewMode: 'full'
    })
    setShowTextBoxDialog(false)
  }

  const handleOpenHoverDialog = () => {
    setHoverEnabledDraft(hoverPreviewEnabled)
    setHoverColorDraft(hoverPreviewColor)
    setShowHoverDialog(true)
  }

  const handleApplyHoverConfig = () => {
    setHoverPreviewEnabled(hoverEnabledDraft)
    setHoverPreviewColor(hoverColorDraft)
    setShowHoverDialog(false)
  }

  const getPreviewText = (text: string, mode: string) => {
    if (mode === 'full' || text.length <= 20) return text
    
    switch (mode) {
      case 'start':
        return text.substring(0, 15) + '...'
      case 'end':
        return '...' + text.substring(text.length - 15)
      case 'start-end':
        return text.substring(0, 8) + '...' + text.substring(text.length - 8)
      default:
        return text
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ferramentas Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Adicionar Caixa de Texto */}
          <Dialog open={showTextBoxDialog} onOpenChange={setShowTextBoxDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                size="sm"
              >
                <Type className="h-4 w-4" />
                Adicionar Caixa de Texto
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
                {/* Texto */}
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

                {/* Configurações Avançadas */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Configurações Avançadas</h4>
                  
                  {/* Largura */}
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

                  {/* Tamanho da Fonte */}
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

                {/* Prévia */}
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

                  {/* Preview do texto */}
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
          {/* Configurações de Visualização (placeholder) */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Visualização</Label>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            size="sm"
            onClick={handleOpenHoverDialog}
          >
            <Eye className="h-4 w-4" />
            Configurar Hover
          </Button>
          </div>

          <Dialog open={showHoverDialog} onOpenChange={setShowHoverDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Configurações de Hover
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Destaque ao passar o mouse</Label>
                  <Button
                    variant={hoverEnabledDraft ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHoverEnabledDraft(prev => !prev)}
                  >
                    {hoverEnabledDraft ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Cor do destaque</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={hoverColorDraft}
                      onChange={(event) => setHoverColorDraft(event.target.value)}
                      className="h-10 w-16 p-1"
                    />
                    <span className="text-sm text-gray-600">{hoverColorDraft}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowHoverDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleApplyHoverConfig}>
                  Aplicar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
