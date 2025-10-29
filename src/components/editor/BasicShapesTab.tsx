'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Square, Circle, Plus, Theater } from 'lucide-react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { nanoid } from 'nanoid'

interface BasicShapesTabProps {
  onCombineShapes: (rectangleId: string, circleId: string) => void
}

export function BasicShapesTab({ onCombineShapes }: BasicShapesTabProps) {
  const { 
    addElement, 
    viewport, 
    selectedElements,
    elements,
    setSelectedElements,
    combineShapesIntoStage
  } = useEditorStore()

  const createBasicShape = (type: 'rectangle' | 'circle') => {
    const id = nanoid()
    
    // Calculate position in the center of the viewport
    const centerX = -viewport.x + (window.innerWidth / 2) / viewport.zoom
    const centerY = -viewport.y + (window.innerHeight / 2) / viewport.zoom
    
    const baseElement = {
      id,
      x: centerX - 50,
      y: centerY - 50,
      strokeColor: '#000000',
      fillColor: type === 'rectangle' ? '#e0e0e0' : '#f0f0f0',
      strokeWidth: 2,
      opacity: 1,
      zIndex: Date.now()
    }

    if (type === 'rectangle') {
      addElement({
        ...baseElement,
        type: 'rectangle',
        width: 100,
        height: 60,
        borderRadius: 8
      })
    } else {
      addElement({
        ...baseElement,
        type: 'circle',
        width: 80,
        height: 80,
        radius: 40
      })
    }

    // Select the newly created element
    setSelectedElements([id])
  }

  const createStageFromSelectedShapes = () => {
    // Use the new combine function that handles positioning automatically
    combineShapesIntoStage(selectedElements)
  }

  const canCreateStageFromSelection = () => {
    const selectedShapes = selectedElements
      .map(id => elements.find(el => el.id === id))
      .filter(el => el && (el.type === 'rectangle' || el.type === 'circle'))

    const hasRectangle = selectedShapes.some(el => el?.type === 'rectangle')
    const hasCircle = selectedShapes.some(el => el?.type === 'circle')

    return hasRectangle && hasCircle
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Square className="h-4 w-4" />
            Formas Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-600 mb-3">
            Crie formas básicas para construir seu palco
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBasicShape('rectangle')}
              className="flex flex-col items-center gap-1 h-16"
            >
              <Square className="h-5 w-5" />
              <span className="text-xs">Retângulo</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => createBasicShape('circle')}
              className="flex flex-col items-center gap-1 h-16"
            >
              <Circle className="h-5 w-5" />
              <span className="text-xs">Círculo</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Theater className="h-4 w-4" />
            Criar Palco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-600 mb-3">
            Combine um retângulo e um círculo em um palco unificado
          </p>
          
          <Button
            variant={canCreateStageFromSelection() ? "default" : "outline"}
            size="sm"
            onClick={createStageFromSelectedShapes}
            disabled={!canCreateStageFromSelection()}
            className={`w-full flex items-center gap-2 transition-all duration-200 ${
              canCreateStageFromSelection() 
                ? "bg-green-600 hover:bg-green-700 text-white shadow-md" 
                : "border-dashed border-gray-300"
            }`}
          >
            <Theater className="h-4 w-4" />
            {canCreateStageFromSelection() ? "✨ Criar Palco" : "Criar Palco"}
          </Button>
          
          {selectedElements.length > 0 && !canCreateStageFromSelection() && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2">
              <p className="text-xs text-amber-700 font-medium">
                ⚠️ Selecione pelo menos um retângulo e um círculo
              </p>
            </div>
          )}
          
          {selectedElements.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <p className="text-xs text-blue-700">
                💡 Primeiro, selecione as formas que deseja combinar
              </p>
            </div>
          )}
          
          {canCreateStageFromSelection() && (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <p className="text-xs text-green-700 font-medium">
                ✅ Pronto! As formas serão unidas em um palco
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>📋</span>
            Como Criar um Palco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600 space-y-3">
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
              <p>Crie um retângulo (base do palco)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
              <p>Crie um círculo (parte superior)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
              <p>Posicione as formas como desejar</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
              <p>Selecione ambas as formas (Ctrl+clique)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">5</span>
              <p>Clique em "✨ Criar Palco"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}