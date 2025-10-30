'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { EditorToolbar } from './editor/EditorToolbar'
import { EditorTopToolbar } from './editor/EditorTopToolbar'
import { EditorCanvas } from './editor/EditorCanvas'
import { EditorSidebar } from './editor/EditorSidebar'
import { EditorBottomBar } from './editor/EditorBottomBar'
import { useEditorStore } from '@/hooks/useEditorStore'
import { saveProjectData, loadProjectData } from '@/lib/projectData'
import { performBooleanOperation, uniteMultipleShapes, convertElementToShape } from '@/lib/svgUtils'

interface VisualEditorProps {
  projectId: string
  project: {
    id: string
    title: string
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
    canUndo,
    canRedo,
    groupElements,
    ungroupElements,
    weldElements,
    getElementGroup,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    resetStore,
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
        lastModified: new Date().toISOString()
      })
    } catch (error) {
      console.error('Erro ao salvar automaticamente:', error)
    }
  }, [projectId, elements, groups, viewport, scenes])

  // Load project data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Reset store before loading new project data
        resetStore()
        
        const data = await loadProjectData(projectId)
        
        if (data) {
          setElements(data.elements || [])
          // Load groups if available
          if (data.groups) {
            const store = useEditorStore.getState()
            store.groups = data.groups
          }
          // Load scenes if available
          if (data.scenes) {
            const store = useEditorStore.getState()
            store.scenes = data.scenes
            store.currentSceneIndex = data.currentSceneIndex || 0
          }
          setViewport(data.viewport || { x: 0, y: 0, zoom: 1 })
        }
      } catch (error) {
        console.error('Erro ao carregar dados do projeto:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [projectId, setElements, setViewport, resetStore])

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

  // Boolean operations handlers
  const handleUnionElements = useCallback(async () => {
    if (selectedElements.length >= 2) {
      try {
        const selectedElementsData = elements.filter(el => selectedElements.includes(el.id))
        const result = await uniteMultipleShapes(selectedElementsData)
        
        if (result.success && result.svgPath) {
          // Remove selected elements
          deleteElements(selectedElements)
          
          // Add the unified element
          addElement({
            type: 'path',
            x: result.bounds?.x || 0,
            y: result.bounds?.y || 0,
            width: result.bounds?.width || 100,
            height: result.bounds?.height || 100,
            strokeColor: selectedElementsData[0].strokeColor,
            fillColor: selectedElementsData[0].fillColor,
            strokeWidth: selectedElementsData[0].strokeWidth,
            opacity: selectedElementsData[0].opacity,
            zIndex: Math.max(...selectedElementsData.map(el => el.zIndex || 0)),
            points: [{ x: 0, y: 0 }], // Will be replaced by path data
            locked: false, // Ensure the new element is not locked
            // Store path data in a custom property
            pathData: result.svgPath,
            pathBounds: result.bounds
          } as any)
        }
      } catch (error) {
        console.error('Erro na operação de união:', error)
      }
    }
  }, [selectedElements, elements, deleteElements, addElement])

  const handleSubtractElements = useCallback(async () => {
    if (selectedElements.length >= 2) {
      try {
        const selectedElementsData = elements.filter(el => selectedElements.includes(el.id))
        const shape1 = convertElementToShape(selectedElementsData[0])
        const shape2 = convertElementToShape(selectedElementsData[1])
        
        if (!shape1 || !shape2) {
          console.error('Não foi possível converter elementos para shapes')
          return
        }
        
        const result = await performBooleanOperation(shape1, shape2, 'subtract')
        
        if (result.success && result.svgPath) {
          deleteElements(selectedElements)
          
          addElement({
            type: 'path',
            x: result.bounds?.x || 0,
            y: result.bounds?.y || 0,
            width: result.bounds?.width || 100,
            height: result.bounds?.height || 100,
            strokeColor: selectedElementsData[0].strokeColor,
            fillColor: selectedElementsData[0].fillColor,
            strokeWidth: selectedElementsData[0].strokeWidth,
            opacity: selectedElementsData[0].opacity,
            zIndex: Math.max(...selectedElementsData.map(el => el.zIndex || 0)),
            points: [{ x: 0, y: 0 }],
            locked: false, // Ensure the new element is not locked
            pathData: result.svgPath,
            pathBounds: result.bounds
          } as any)
        }
      } catch (error) {
        console.error('Erro na operação de subtração:', error)
      }
    }
  }, [selectedElements, elements, deleteElements, addElement])

  const handleIntersectElements = useCallback(async () => {
    if (selectedElements.length >= 2) {
      try {
        const selectedElementsData = elements.filter(el => selectedElements.includes(el.id))
        const shape1 = convertElementToShape(selectedElementsData[0])
        const shape2 = convertElementToShape(selectedElementsData[1])
        
        if (!shape1 || !shape2) {
          console.error('Não foi possível converter elementos para shapes')
          return
        }
        
        const result = await performBooleanOperation(shape1, shape2, 'intersect')
        
        if (result.success && result.svgPath) {
          deleteElements(selectedElements)
          
          addElement({
            type: 'path',
            x: result.bounds?.x || 0,
            y: result.bounds?.y || 0,
            width: result.bounds?.width || 100,
            height: result.bounds?.height || 100,
            strokeColor: selectedElementsData[0].strokeColor,
            fillColor: selectedElementsData[0].fillColor,
            strokeWidth: selectedElementsData[0].strokeWidth,
            opacity: selectedElementsData[0].opacity,
            zIndex: Math.max(...selectedElementsData.map(el => el.zIndex || 0)),
            points: [{ x: 0, y: 0 }],
            locked: false, // Ensure the new element is not locked
            pathData: result.svgPath,
            pathBounds: result.bounds
          } as any)
        }
      } catch (error) {
        console.error('Erro na operação de interseção:', error)
      }
    }
  }, [selectedElements, elements, deleteElements, addElement])

  const handleExcludeElements = useCallback(async () => {
    if (selectedElements.length >= 2) {
      try {
        const selectedElementsData = elements.filter(el => selectedElements.includes(el.id))
        const shape1 = convertElementToShape(selectedElementsData[0])
        const shape2 = convertElementToShape(selectedElementsData[1])
        
        if (!shape1 || !shape2) {
          console.error('Não foi possível converter elementos para shapes')
          return
        }
        
        const result = await performBooleanOperation(shape1, shape2, 'exclude')
        
        if (result.success && result.svgPath) {
          deleteElements(selectedElements)
          
          addElement({
            type: 'path',
            x: result.bounds?.x || 0,
            y: result.bounds?.y || 0,
            width: result.bounds?.width || 100,
            height: result.bounds?.height || 100,
            strokeColor: selectedElementsData[0].strokeColor,
            fillColor: selectedElementsData[0].fillColor,
            strokeWidth: selectedElementsData[0].strokeWidth,
            opacity: selectedElementsData[0].opacity,
            zIndex: Math.max(...selectedElementsData.map(el => el.zIndex || 0)),
            points: [{ x: 0, y: 0 }],
            locked: false, // Ensure the new element is not locked
            pathData: result.svgPath,
            pathBounds: result.bounds
          } as any)
        }
      } catch (error) {
        console.error('Erro na operação de exclusão:', error)
      }
    }
  }, [selectedElements, elements, deleteElements, addElement])

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
      <div className="flex-1 flex">
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
        />

        {/* Canvas Container no centro */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-white"
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

        {/* Sidebar à direita */}
        <EditorSidebar 
          selectedElements={selectedElements}
          onUpdateElement={updateElement}
        />
      </div>

      {/* Barra inferior com cenas - posição absoluta fixa */}
      {!isFullscreenSlideshow && <EditorBottomBar />}
    </div>
  )
}