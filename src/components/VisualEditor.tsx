'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { EditorToolbar } from './editor/EditorToolbar'
import { EditorTopToolbar } from './editor/EditorTopToolbar'
import { EditorCanvas } from './editor/EditorCanvas'
import { EditorSidebar } from './editor/EditorSidebar'
import { EditorBottomBar } from './editor/EditorBottomBar'
import { SceneNotesPanel } from './editor/SceneNotesPanel'
import { useEditorStore } from '@/hooks/useEditorStore'
import { saveProjectData, loadProjectData } from '@/lib/projectData'
import { performBooleanOperation, uniteMultipleShapes, convertElementToShape } from '@/lib/svgUtils'

interface VisualEditorProps {
  projectId: string
  project: {
    id: string
    name: string
    description: string
  }
}

export function VisualEditor({ projectId }: VisualEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const {
    elements,
    groups,
    selectedTool,
    selectedElements,
    viewport,
    setElements,
    setViewport,
    addElement,
    updateElement,
    deleteElements,
    selectElements,
    clearSelection,
    undo,
    redo,
    groupElements,
    ungroupElements,
    weldElements,
    getElementGroup,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    resetStore,
    stageConfig,
    initializeHistory,
    scenes,
    nextScene,
    previousScene,
    isFullscreenSlideshow
  } = useEditorStore()

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (elements.length === 0 && groups.length === 0 && scenes.length === 0) return
    
    try {
      await saveProjectData(projectId, {
        elements,
        groups,
        viewport,
        scenes,
        currentSceneIndex: useEditorStore.getState().currentSceneIndex,
        stageConfig,
        lastModified: new Date().toISOString()
      })
    } catch (error) {
      console.error('Erro ao salvar automaticamente:', error)
    }
  }, [projectId, elements, groups, viewport, scenes, stageConfig])

  // Load project data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Reset store before loading new project data
        resetStore()
        
        const data = await loadProjectData(projectId)
        
        if (data) {
          const elements = data.elements || []
          const groups = data.groups || []
          const scenes = data.scenes || []
          const currentSceneIndex = scenes.length > 0
            ? (data.currentSceneIndex !== undefined ? data.currentSceneIndex : 0)
            : -1
          
          setElements(elements)
          useEditorStore.setState({
            groups,
            scenes,
            currentSceneIndex,
            stageConfig: data.stageConfig || null,
          })
          setViewport(data.viewport || { x: 0, y: 0, zoom: 1 })
          initializeHistory()
        } else {
          // No data found (new project) - ensure everything is clean
          setElements([])
          useEditorStore.setState({
            groups: [],
            scenes: [],
            currentSceneIndex: -1,
            stageConfig: null,
          })
          setViewport({ x: 0, y: 0, zoom: 1 })
          initializeHistory()
        }
      } catch (error) {
        console.error('Erro ao carregar dados do projeto:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [projectId, setElements, setViewport, resetStore, initializeHistory])

  // Auto-save every 5 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 5000)
    return () => clearInterval(interval)
  }, [autoSave])

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      autoSave()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [autoSave])

  // Group operations handlers
  const handleGroupElements = useCallback(() => {
    if (selectedElements.length >= 2) {
      groupElements(selectedElements)
    }
  }, [selectedElements, groupElements])

  const handleUngroupElements = useCallback(() => {
    if (selectedElements.length > 0) {
      // Find the group of the first selected element
      const firstElement = elements.find(el => el.id === selectedElements[0])
      if (firstElement?.groupId) {
        ungroupElements(firstElement.groupId)
      }
    }
  }, [selectedElements, elements, ungroupElements])

  const handleWeldElements = useCallback(() => {
    if (selectedElements.length >= 2) {
      weldElements(selectedElements)
    }
  }, [selectedElements, weldElements])

  const getSelectedShapeElements = useCallback(() => {
    return elements.filter(el => 
      selectedElements.includes(el.id) &&
      (el.type === 'rectangle' || el.type === 'circle' || el.type === 'path')
    )
  }, [elements, selectedElements])

  const canRunBooleanOps = useMemo(() => {
    return getSelectedShapeElements().length >= 2
  }, [getSelectedShapeElements])

  // Boolean operations handlers
  const handleUnionElements = useCallback(async () => {
    const shapeElements = getSelectedShapeElements()
    if (shapeElements.length < 2) {
      alert('Selecione pelo menos duas formas geométricas (retângulo, círculo ou forma combinada) para usar as operações booleanas.')
      return
    }

    try {
      const result = await uniteMultipleShapes(shapeElements)
      
      if (result.success && result.svgPath) {
        const referenceElement = shapeElements[0]
        const idsToRemove = shapeElements.map(el => el.id)
        deleteElements(idsToRemove)
        
        addElement({
          type: 'path',
          x: result.bounds?.x || 0,
          y: result.bounds?.y || 0,
          width: result.bounds?.width || 100,
          height: result.bounds?.height || 100,
          strokeColor: referenceElement.strokeColor,
          fillColor: referenceElement.fillColor,
          strokeWidth: referenceElement.strokeWidth,
          opacity: referenceElement.opacity,
          zIndex: Math.max(...shapeElements.map(el => el.zIndex || 0)),
          points: [{ x: 0, y: 0 }],
          locked: false,
          pathData: result.svgPath,
          pathBounds: result.bounds
        } as any)
      }
    } catch (error) {
      console.error('Erro na operação de união:', error)
    }
  }, [getSelectedShapeElements, deleteElements, addElement])

  const handleSubtractElements = useCallback(async () => {
    const shapeElements = getSelectedShapeElements()
    if (shapeElements.length < 2) {
      alert('Selecione pelo menos duas formas geométricas (retângulo, círculo ou forma combinada) para usar as operações booleanas.')
      return
    }

    try {
      const [first, second] = shapeElements
      const shape1 = convertElementToShape(first)
      const shape2 = convertElementToShape(second)
      
      if (!shape1 || !shape2) {
        console.error('Não foi possível converter elementos para shapes')
        return
      }
      
      const result = await performBooleanOperation(shape1, shape2, 'subtract')
      
      if (result.success && result.svgPath) {
        deleteElements([first.id, second.id])
        
        addElement({
          type: 'path',
          x: result.bounds?.x || 0,
          y: result.bounds?.y || 0,
          width: result.bounds?.width || 100,
          height: result.bounds?.height || 100,
          strokeColor: first.strokeColor,
          fillColor: first.fillColor,
          strokeWidth: first.strokeWidth,
          opacity: first.opacity,
          zIndex: Math.max(first.zIndex || 0, second.zIndex || 0),
          points: [{ x: 0, y: 0 }],
          locked: false,
          pathData: result.svgPath,
          pathBounds: result.bounds
        } as any)
      }
    } catch (error) {
      console.error('Erro na operação de subtração:', error)
    }
  }, [getSelectedShapeElements, deleteElements, addElement])

  const handleIntersectElements = useCallback(async () => {
    const shapeElements = getSelectedShapeElements()
    if (shapeElements.length < 2) {
      alert('Selecione pelo menos duas formas geométricas (retângulo, círculo ou forma combinada) para usar as operações booleanas.')
      return
    }

    try {
      const [first, second] = shapeElements
      const shape1 = convertElementToShape(first)
      const shape2 = convertElementToShape(second)
      
      if (!shape1 || !shape2) {
        console.error('Não foi possível converter elementos para shapes')
        return
      }
      
      const result = await performBooleanOperation(shape1, shape2, 'intersect')
      
      if (result.success && result.svgPath) {
        deleteElements([first.id, second.id])
        
        addElement({
          type: 'path',
          x: result.bounds?.x || 0,
          y: result.bounds?.y || 0,
          width: result.bounds?.width || 100,
          height: result.bounds?.height || 100,
          strokeColor: first.strokeColor,
          fillColor: first.fillColor,
          strokeWidth: first.strokeWidth,
          opacity: first.opacity,
          zIndex: Math.max(first.zIndex || 0, second.zIndex || 0),
          points: [{ x: 0, y: 0 }],
          locked: false,
          pathData: result.svgPath,
          pathBounds: result.bounds
        } as any)
      }
    } catch (error) {
      console.error('Erro na operação de interseção:', error)
    }
  }, [getSelectedShapeElements, deleteElements, addElement])

  const handleExcludeElements = useCallback(async () => {
    const shapeElements = getSelectedShapeElements()
    if (shapeElements.length < 2) {
      alert('Selecione pelo menos duas formas geométricas (retângulo, círculo ou forma combinada) para usar as operações booleanas.')
      return
    }

    try {
      const [first, second] = shapeElements
      const shape1 = convertElementToShape(first)
      const shape2 = convertElementToShape(second)
      
      if (!shape1 || !shape2) {
        console.error('Não foi possível converter elementos para shapes')
        return
      }
      
      const result = await performBooleanOperation(shape1, shape2, 'exclude')
      
      if (result.success && result.svgPath) {
        deleteElements([first.id, second.id])
        
        addElement({
          type: 'path',
          x: result.bounds?.x || 0,
          y: result.bounds?.y || 0,
          width: result.bounds?.width || 100,
          height: result.bounds?.height || 100,
          strokeColor: first.strokeColor,
          fillColor: first.fillColor,
          strokeWidth: first.strokeWidth,
          opacity: first.opacity,
          zIndex: Math.max(first.zIndex || 0, second.zIndex || 0),
          points: [{ x: 0, y: 0 }],
          locked: false,
          pathData: result.svgPath,
          pathBounds: result.bounds
        } as any)
      }
    } catch (error) {
      console.error('Erro na operação de exclusão:', error)
    }
  }, [getSelectedShapeElements, deleteElements, addElement])

  // Helper function to check if user is typing
  const isTyping = useCallback(() => {
    const activeElement = document.activeElement
    return activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in input fields
      if (isTyping()) {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case 'y':
            e.preventDefault()
            redo()
            break
          case 's':
            if (e.shiftKey) {
              e.preventDefault()
              handleSubtractElements()
            } else {
              e.preventDefault()
              autoSave()
            }
            break
          case 'a':
            e.preventDefault()
            selectElements(elements.map(el => el.id))
            break
          case 'g':
            e.preventDefault()
            if (e.shiftKey) {
              handleUngroupElements()
            } else {
              handleGroupElements()
            }
            break
          case 'u':
            if (e.shiftKey) {
              e.preventDefault()
              handleUnionElements()
            } else {
              e.preventDefault()
              handleUngroupElements()
            }
            break
          case 'i':
            if (e.shiftKey) {
              e.preventDefault()
              handleIntersectElements()
            }
            break
          case 'e':
            if (e.shiftKey) {
              e.preventDefault()
              handleExcludeElements()
            }
            break
          case ']':
            e.preventDefault()
            if (selectedElements.length > 0) {
              if (e.shiftKey) {
                bringToFront(selectedElements)
              } else {
                bringForward(selectedElements)
              }
            }
            break
          case '[':
            e.preventDefault()
            if (selectedElements.length > 0) {
              if (e.shiftKey) {
                sendToBack(selectedElements)
              } else {
                sendBackward(selectedElements)
              }
            }
            break
          case 'Escape':
            clearSelection()
            break
        }
      }
      
      // Scene navigation shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
          case 'ArrowLeft':
            if (scenes.length > 0) {
              e.preventDefault()
              previousScene()
            }
            break
          case 'ArrowRight':
            if (scenes.length > 0) {
              e.preventDefault()
              nextScene()
            }
            break
        }
      }

      // Delete selected elements (only if not typing)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElements.length > 0) {
          e.preventDefault()
          deleteElements(selectedElements)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, autoSave, selectElements, clearSelection, deleteElements, selectedElements, elements, handleGroupElements, handleUngroupElements, handleUnionElements, handleSubtractElements, handleIntersectElements, handleExcludeElements, bringToFront, sendToBack, bringForward, sendBackward, scenes, nextScene, previousScene])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Barra de ferramentas horizontal no topo */}
      <EditorTopToolbar 
        onSave={autoSave}
        selectedElements={selectedElements}
        onUnionElements={handleUnionElements}
        onSubtractElements={handleSubtractElements}
        onIntersectElements={handleIntersectElements}
        onExcludeElements={handleExcludeElements}
      />

      {/* Layout principal com toolbar vertical, canvas e sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar à esquerda na vertical */}
        <EditorToolbar 
          selectedTool={selectedTool}
          onSave={autoSave}
          selectedElements={selectedElements}
          onGroupElements={handleGroupElements}
          onUngroupElements={handleUngroupElements}
          onUnionElements={handleUnionElements}
          onSubtractElements={handleSubtractElements}
          onIntersectElements={handleIntersectElements}
          onExcludeElements={handleExcludeElements}
          booleanOpsEnabled={canRunBooleanOps}
        />

        {/* Canvas Container no centro */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-white overflow-hidden pb-[320px]"
        >
          <EditorCanvas
            ref={canvasRef}
            containerRef={containerRef}
            elements={elements}
            selectedElements={selectedElements}
            selectedTool={selectedTool}
            viewport={viewport}
            onAddElement={addElement}
            onUpdateElement={updateElement}
            onSelectElements={selectElements}
            onClearSelection={clearSelection}
            onUpdateViewport={setViewport}
          />
        </div>

        <EditorSidebar 
          selectedElements={selectedElements}
          onUpdateElement={updateElement}
        />
      </div>

      {/* Painéis inferiores */}
      {!isFullscreenSlideshow && (
        <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <SceneNotesPanel />
          </div>
          <div className="pointer-events-auto">
            <EditorBottomBar />
          </div>
        </div>
      )}
    </div>
  )
}
