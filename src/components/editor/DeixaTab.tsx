import React, { useState, useEffect } from 'react'
import { useEditorStore } from '../../hooks/useEditorStore'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export const DeixaTab: React.FC = () => {
  const { 
    scenes, 
    currentSceneIndex, 
    updateDeixaAtual, 
    updateDeixaSeguinte 
  } = useEditorStore()
  
  const [localDeixaAtual, setLocalDeixaAtual] = useState('')
  const [localDeixaSeguinte, setLocalDeixaSeguinte] = useState('')
  
  const currentScene = scenes[currentSceneIndex]
  
  // Sincronizar com o estado global quando a cena muda
  useEffect(() => {
    if (currentScene) {
      setLocalDeixaAtual(currentScene.deixaAtual || '')
      setLocalDeixaSeguinte(currentScene.deixaSeguinte || '')
    }
  }, [currentScene])
  
  const handleDeixaAtualChange = (value: string) => {
    setLocalDeixaAtual(value)
    updateDeixaAtual(currentSceneIndex, value, false)
  }
  
  const handleDeixaSeguinteChange = (value: string) => {
    setLocalDeixaSeguinte(value)
    updateDeixaSeguinte(currentSceneIndex, value, false)
  }
  
  if (!currentScene) {
    return (
      <div className="p-4 text-center text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Nenhuma cena selecionada</p>
      </div>
    )
  }
  
  const isFirstScene = currentSceneIndex === 0
  const isLastScene = currentSceneIndex === scenes.length - 1
  const previousScene = currentSceneIndex > 0 ? scenes[currentSceneIndex - 1] : null
  const nextScene = currentSceneIndex < scenes.length - 1 ? scenes[currentSceneIndex + 1] : null
  
  return (
    <div className="p-4 space-y-4">
      {/* Informações da cena atual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>Cena Atual</span>
            <Badge variant="outline">{currentScene.name}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deixa Atual */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="deixa-atual">Deixa Atual</Label>
              {currentScene.deixaAtualAutoFilled && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Auto-preenchido
                </Badge>
              )}
            </div>
            <Input
              id="deixa-atual"
              value={localDeixaAtual}
              onChange={(e) => handleDeixaAtualChange(e.target.value)}
              placeholder="Frase ou ação que marca o início desta cena"
              className={currentScene.deixaAtualAutoFilled ? "bg-blue-50 border-blue-200" : ""}
            />
            {previousScene && (
              <p className="text-xs text-gray-500">
                Sincronizado com "Deixa seguinte" da cena: {previousScene.name}
              </p>
            )}
            {!previousScene && (
              <p className="text-xs text-gray-500">
                Esta é a primeira cena - não há sincronização anterior
              </p>
            )}
          </div>
          
          {/* Deixa Seguinte */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="deixa-seguinte">Deixa Seguinte</Label>
              {currentScene.deixaSeguinteAutoFilled && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Auto-preenchido
                </Badge>
              )}
            </div>
            <Input
              id="deixa-seguinte"
              value={localDeixaSeguinte}
              onChange={(e) => handleDeixaSeguinteChange(e.target.value)}
              placeholder="Frase ou ação que marcará o início da próxima cena"
              className={currentScene.deixaSeguinteAutoFilled ? "bg-blue-50 border-blue-200" : ""}
            />
            {nextScene && (
              <p className="text-xs text-gray-500">
                Sincronizado com "Deixa atual" da cena: {nextScene.name}
              </p>
            )}
            {!nextScene && (
              <p className="text-xs text-gray-500">
                Esta é a última cena - não há sincronização posterior
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Informações de sincronização */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-700">Sincronização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-gray-600">
            <p>• As deixas são sincronizadas automaticamente entre cenas adjacentes</p>
            <p>• Campos auto-preenchidos são destacados em azul</p>
            <p>• Alterações são salvas em tempo real</p>
          </div>
          
          {/* Status das cenas adjacentes */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {previousScene && (
              <div className="text-xs p-2 bg-white rounded border">
                <p className="font-medium text-gray-700">Cena Anterior</p>
                <p className="text-gray-600">{previousScene.name}</p>
                <p className="text-gray-500 truncate">
                  Deixa: {previousScene.deixaSeguinte || "Não definida"}
                </p>
              </div>
            )}
            
            {nextScene && (
              <div className="text-xs p-2 bg-white rounded border">
                <p className="font-medium text-gray-700">Próxima Cena</p>
                <p className="text-gray-600">{nextScene.name}</p>
                <p className="text-gray-500 truncate">
                  Deixa: {nextScene.deixaAtual || "Não definida"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}