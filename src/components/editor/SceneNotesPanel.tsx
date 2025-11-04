'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'

export function SceneNotesPanel() {
  const { scenes, currentSceneIndex, updateSceneNotes } = useEditorStore()
  const [localNotes, setLocalNotes] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const currentScene = currentSceneIndex >= 0 ? scenes[currentSceneIndex] : null

  useEffect(() => {
    if (!currentScene) {
      setLocalNotes('')
      setIsCollapsed(true)
      return
    }

    setLocalNotes(currentScene.notes || '')
  }, [currentScene?.id, currentScene?.notes])

  const handleChange = (value: string) => {
    setLocalNotes(value)
    if (currentSceneIndex >= 0) {
      updateSceneNotes(currentSceneIndex, value)
    }
  }

  const preview = useMemo(() => {
    const text = localNotes.trim()
    if (!text) return 'Sem anotações ainda'
    if (text.length <= 60) return text
    return `${text.slice(0, 57)}...`
  }, [localNotes])

  const headerTitle = currentScene
    ? `Anotações da Cena · ${currentScene.name}`
    : 'Anotações da Cena'

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg transition-all duration-300 rounded-t-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700 truncate max-w-[220px] sm:max-w-none">
              {headerTitle}
            </span>
          </div>
          <span className="hidden sm:block text-xs text-gray-500 max-w-[260px] truncate">
            {preview}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="h-7 px-2 text-xs text-gray-600 hover:text-gray-800"
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Expandir
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Recolher
              </>
            )}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="px-4 pb-4 pt-3 bg-white">
          {currentScene ? (
            <div className="space-y-2">
              <Label htmlFor="scene-note-inline" className="text-xs font-medium text-gray-600">
                O que precisa acontecer nesta cena?
              </Label>
              <Textarea
                id="scene-note-inline"
                value={localNotes}
                onChange={(event) => handleChange(event.target.value)}
                placeholder="Ex.: Câmera em plano aberto, ator principal à direita, iluminar palco."
                className="min-h-[110px] text-sm resize-none"
              />
            </div>
          ) : (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-3">
              Crie ou selecione uma cena para adicionar anotações.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
