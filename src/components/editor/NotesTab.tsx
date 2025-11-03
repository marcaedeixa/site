import React, { useState, useEffect } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export function NotesTab() {
  const { scenes, currentSceneIndex, updateSceneNotes } = useEditorStore()
  const [localNotes, setLocalNotes] = useState('')
  
  const currentScene = scenes[currentSceneIndex]
  
  // Sincronizar com as anotações da cena atual
  useEffect(() => {
    if (currentScene) {
      setLocalNotes(currentScene.notes || '')
    }
  }, [currentScene])
  
  const handleNotesChange = (value: string) => {
    setLocalNotes(value)
    if (currentSceneIndex >= 0) {
      updateSceneNotes(currentSceneIndex, value)
    }
  }
  
  if (currentSceneIndex < 0 || !currentScene) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma cena selecionada</p>
      </div>
    )
  }
  
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Anotações da Cena
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="scene-notes" className="text-xs font-medium text-gray-600">
              Cena: {currentScene.name}
            </Label>
            <Textarea
              id="scene-notes"
              placeholder="Adicione anotações gerais sobre esta cena..."
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="min-h-[120px] text-sm resize-none"
            />
          </div>
          
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>💡 Use este espaço para:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Direções de cena</li>
              <li>Notas de produção</li>
              <li>Observações técnicas</li>
              <li>Lembretes importantes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}