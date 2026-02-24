'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEditorStore } from '@/hooks/useEditorStore'
import { 
  Plus, 
  Eye
} from 'lucide-react'

export function ToolsTab() {
  const {
    hoverPreviewEnabled,
    hoverPreviewColor,
    setHoverPreviewEnabled,
    setHoverPreviewColor
  } = useEditorStore()
  const [showHoverDialog, setShowHoverDialog] = useState(false)
  const [hoverEnabledDraft, setHoverEnabledDraft] = useState(hoverPreviewEnabled)
  const [hoverColorDraft, setHoverColorDraft] = useState(hoverPreviewColor)

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
          {/* Configurações de Visualização */}
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
