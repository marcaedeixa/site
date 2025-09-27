'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react'
import { Element, Point, Tool, Viewport, useEditorStore } from '@/hooks/useEditorStore'
import { ActorModal } from './ActorModal'

interface EditorCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  elements: Element[]
  selectedElements: string[]
  selectedTool: Tool
  viewport: Viewport
  onAddElement: (element: Omit<Element, 'id'>) => void
  onUpdateElement: (id: string, updates: Partial<Element>) => void
  onSelectElements: (ids: string[]) => void
  onClearSelection: () => void
  onUpdateViewport: (viewport: Viewport) => void
}

export const EditorCanvas = forwardRef<HTMLCanvasElement, EditorCanvasProps>((
  {
    containerRef,
    elements,
    selectedElements,
    selectedTool,
    viewport,
    onAddElement,
    onUpdateElement,
    onSelectElements,
    onClearSelection,
    onUpdateViewport
  },
  ref
) => {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentElement, setCurrentElement] = useState<Partial<Element> | null>(null)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null)
  const [draggedElements, setDraggedElements] = useState<string[]>([])
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const [showActorModal, setShowActorModal] = useState(false)
  const [actorModalPosition, setActorModalPosition] = useState<Point>({ x: 0, y: 0 })
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<Point | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStartPoint, setResizeStartPoint] = useState<Point | null>(null)
  const [resizeStartBounds, setResizeStartBounds] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
  const [resizePreview, setResizePreview] = useState<{ x: number, y: number, width: number, height: number, borderRadius?: number } | null>(null)
  const [currentCursor, setCurrentCursor] = useState<string>('default')
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Get slideshow state from store
  const { isPlayingSlideshow, isTransitioning } = useEditorStore()

  useImperativeHandle(ref, () => canvasRef.current!)

  // Helper function to check if user is typing
  const isTyping = () => {
    const activeElement = document.activeElement as HTMLElement
    return activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )
  }

  // Handle keyboard events for Shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing
      if (isTyping()) return
      
      if (e.key === 'Shift') {
        setIsShiftPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't interfere with typing
      if (isTyping()) return
      
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Snap utilities
  const snapToGrid = useCallback((value: number, gridSize: number = 20): number => {
    if (!snapEnabled) return value
    return Math.round(value / gridSize) * gridSize
  }, [snapEnabled])

  const snapToAngle = useCallback((angle: number, snapAngles: number[] = [0, 45, 90, 135, 180, 225, 270, 315]): number => {
    if (!snapEnabled) return angle
    
    const normalizedAngle = ((angle % 360) + 360) % 360
    const threshold = 15 // degrees
    
    for (const snapAngle of snapAngles) {
      if (Math.abs(normalizedAngle - snapAngle) <= threshold) {
        return snapAngle
      }
    }
    
    return angle
  }, [snapEnabled])

  const snapToSize = useCallback((size: number, snapSizes: number[] = [50, 100, 150, 200, 250, 300]): number => {
    if (!snapEnabled) return size
    
    const threshold = 10
    
    for (const snapSize of snapSizes) {
      if (Math.abs(size - snapSize) <= threshold) {
        return snapSize
      }
    }
    
    return size
  }, [snapEnabled])

  // Get current properties from store
  const getCurrentProperties = useCallback(() => {
    const store = useEditorStore.getState()
    return {
      strokeColor: store.strokeColor,
      fillColor: store.fillColor,
      strokeWidth: store.strokeWidth,
      opacity: store.opacity,
      fontSize: store.fontSize
    }
  }, [])

  // Get group functions from store
  const getGroupFunctions = useCallback(() => {
    const store = useEditorStore.getState()
    return {
      getElementGroup: store.getElementGroup,
      groups: store.groups
    }
  }, [])

  // Get all elements in the same group as the given element
  const getGroupElements = useCallback((elementId: string): string[] => {
    const { getElementGroup, groups } = getGroupFunctions()
    const group = getElementGroup(elementId)
    return group ? group.elementIds : [elementId]
  }, [getGroupFunctions])

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left - viewport.x) / viewport.zoom
    const y = (screenY - rect.top - viewport.y) / viewport.zoom
    
    return { x, y }
  }, [viewport])

  // Check if point is inside element
  const isPointInElement = useCallback((point: Point, element: Element): boolean => {
    const { x, y, width = 0, height = 0, type } = element
    
    switch (type) {
      case 'rectangle':
        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height
      
      case 'circle':
        const radius = Math.min(width, height) / 2
        const centerX = x + radius
        const centerY = y + radius
        const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2)
        return distance <= radius
      
      case 'line':
      case 'arrow':
        // Simple line hit detection with tolerance
        const tolerance = 5
        const lineLength = Math.sqrt(width ** 2 + height ** 2)
        if (lineLength === 0) return false
        
        const t = Math.max(0, Math.min(1, 
          ((point.x - x) * width + (point.y - y) * height) / (lineLength ** 2)
        ))
        
        const closestX = x + t * width
        const closestY = y + t * height
        const lineDistance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2)
        
        return lineDistance <= tolerance
      
      case 'text':
        // Approximate text bounds
        const textWidth = (element.text?.length || 0) * (element.fontSize || 16) * 0.6
        const textHeight = element.fontSize || 16
        return point.x >= x && point.x <= x + textWidth && point.y >= y - textHeight && point.y <= y
      
      case 'path':
        // Check if point is near any line segment in the path
        if (!element.points || element.points.length < 2) return false
        
        for (let i = 0; i < element.points.length - 1; i++) {
          const p1 = element.points[i]
          const p2 = element.points[i + 1]
          
          const segmentLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
          if (segmentLength === 0) continue
          
          const t = Math.max(0, Math.min(1, 
            ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / (segmentLength ** 2)
          ))
          
          const closestX = p1.x + t * (p2.x - p1.x)
          const closestY = p1.y + t * (p2.y - p1.y)
          const pathDistance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2)
          
          if (pathDistance <= 5) return true
        }
        
        return false
      
      case 'actor':
        // Actor hit detection based on shape
        if (element.actorShape === 'circle') {
          const radius = Math.min(width, height) / 2
          const centerX = x + radius
          const centerY = y + radius
          const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2)
          return distance <= radius
        } else {
          // Square shape
          return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height
        }
      
      default:
        return false
    }
  }, [])

  // Find element at point (optimized with zIndex priority)
  const getElementAtPoint = useCallback((point: Point): Element | null => {
    const { isElementLocked } = useEditorStore.getState()
    
    // Quick bounds check first, then detailed hit detection
    const candidateElements = elements.filter(element => {
      const { x, y, width = 0, height = 0 } = element
      // Quick bounding box check and exclude locked elements
      return !isElementLocked(element.id) &&
             point.x >= x - 5 && point.x <= x + width + 5 && 
             point.y >= y - 5 && point.y <= y + height + 5
    })
    
    // Sort candidates by zIndex (highest first) for proper hit detection
    const sortedCandidates = candidateElements.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
    
    // Check from highest zIndex to lowest
    for (const element of sortedCandidates) {
      if (isPointInElement(point, element)) {
        return element
      }
    }
    return null
  }, [elements, isPointInElement])

  // Get resize handles for an element
  const getResizeHandles = useCallback((element: Element) => {
    const { x, y, width = 0, height = 0, type } = element
    const handleSize = 8 / viewport.zoom
    const handles: { id: string, x: number, y: number, cursor: string }[] = []

    if (type === 'rectangle' || type === 'text' || type === 'actor') {
      // Corner handles
      handles.push(
        { id: 'nw', x: x - handleSize/2, y: y - handleSize/2, cursor: 'nw-resize' },
        { id: 'ne', x: x + width - handleSize/2, y: y - handleSize/2, cursor: 'ne-resize' },
        { id: 'sw', x: x - handleSize/2, y: y + height - handleSize/2, cursor: 'sw-resize' },
        { id: 'se', x: x + width - handleSize/2, y: y + height - handleSize/2, cursor: 'se-resize' }
      )
      
      // Edge handles
      handles.push(
        { id: 'n', x: x + width/2 - handleSize/2, y: y - handleSize/2, cursor: 'n-resize' },
        { id: 's', x: x + width/2 - handleSize/2, y: y + height - handleSize/2, cursor: 's-resize' },
        { id: 'w', x: x - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'w-resize' },
        { id: 'e', x: x + width - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'e-resize' }
      )
      
      // Border radius handle for rectangles
      if (type === 'rectangle') {
        handles.push(
          { id: 'radius', x: x + width - 15/viewport.zoom, y: y + 15/viewport.zoom, cursor: 'pointer' }
        )
      }
    } else if (type === 'circle') {
      const radius = Math.min(width, height) / 2
      const centerX = x + radius
      const centerY = y + radius
      
      // Radius handles
      handles.push(
        { id: 'radius-n', x: centerX - handleSize/2, y: y - handleSize/2, cursor: 'n-resize' },
        { id: 'radius-s', x: centerX - handleSize/2, y: y + height - handleSize/2, cursor: 's-resize' },
        { id: 'radius-w', x: x - handleSize/2, y: centerY - handleSize/2, cursor: 'w-resize' },
        { id: 'radius-e', x: x + width - handleSize/2, y: centerY - handleSize/2, cursor: 'e-resize' }
      )
    } else if (type === 'line' || type === 'arrow') {
      const startX = x
      const startY = y
      const endX = x + width
      const endY = y + height
      const midX = (startX + endX) / 2
      const midY = (startY + endY) / 2
      
      // Calculate curve handle position
      const curveX = element.curveOffsetX !== undefined ? midX + element.curveOffsetX : midX
      const curveY = element.curveOffsetY !== undefined ? midY + element.curveOffsetY : midY
      
      // Control points for line/arrow
      handles.push(
        { id: 'start', x: startX - handleSize/2, y: startY - handleSize/2, cursor: 'move' },
        { id: 'end', x: endX - handleSize/2, y: endY - handleSize/2, cursor: 'move' },
        { id: 'curve', x: curveX - handleSize/2, y: curveY - handleSize/2, cursor: 'crosshair' }
      )
    }

    return handles
  }, [viewport.zoom])

  // Check if point is on a resize handle
  const getHandleAtPoint = useCallback((point: Point, element: Element): string | null => {
    const handles = getResizeHandles(element)
    const handleSize = 8 / viewport.zoom
    
    for (const handle of handles) {
      // Significantly increase hit area for better usability
      const hitArea = Math.max(handleSize + 8 / viewport.zoom, 16 / viewport.zoom)
      const centerX = handle.x + handleSize / 2
      const centerY = handle.y + handleSize / 2
      
      const distance = Math.sqrt(
        Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
      )
      
      if (distance <= hitArea / 2) {
        return handle.id
      }
    }
    
    return null
  }, [getResizeHandles, viewport.zoom])

  // Update cursor based on mouse position
  const updateCursor = useCallback((e: React.MouseEvent) => {
    if (isSpacePressed || isPanning) {
      setCurrentCursor('grab')
      return
    }
    
    if (isResizing) {
      setCurrentCursor('grabbing')
      return
    }
    
    if (selectedTool !== 'select') {
      setCurrentCursor('crosshair')
      return
    }
    
    // Check for resize handles on selected elements
    if (selectedElements.length === 1) {
      const canvasPoint = screenToCanvas(e.clientX, e.clientY)
      const selectedElement = elements.find(el => el.id === selectedElements[0])
      
      if (selectedElement) {
        const handleId = getHandleAtPoint(canvasPoint, selectedElement)
        if (handleId) {
          const handles = getResizeHandles(selectedElement)
          const handle = handles.find(h => h.id === handleId)
          setCurrentCursor(handle?.cursor || 'default')
          return
        }
      }
    }
    
    // Check if hovering over an element
    const canvasPoint = screenToCanvas(e.clientX, e.clientY)
    const hoveredElement = getElementAtPoint(canvasPoint)
    
    if (hoveredElement) {
      setCurrentCursor('move')
    } else {
      setCurrentCursor('default')
    }
  }, [isSpacePressed, isPanning, isResizing, selectedTool, selectedElements, elements, screenToCanvas, getHandleAtPoint, getResizeHandles, getElementAtPoint])

  // Check if element is within selection rectangle
  const isElementInSelection = useCallback((element: Element, start: Point, end: Point): boolean => {
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)
    
    const { x, y, width = 0, height = 0, type } = element
    
    switch (type) {
      case 'rectangle':
      case 'text':
        return x >= minX && y >= minY && x + width <= maxX && y + height <= maxY
      
      case 'circle':
      case 'actor':
        const radius = Math.min(width, height) / 2
        const centerX = x + radius
        const centerY = y + radius
        return centerX - radius >= minX && centerY - radius >= minY && 
               centerX + radius <= maxX && centerY + radius <= maxY
      
      case 'line':
      case 'arrow':
        return x >= minX && y >= minY && x + width <= maxX && y + height <= maxY
      
      case 'path':
        if (!element.points || element.points.length === 0) return false
        return element.points.every(point => 
          point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
        )
      
      default:
        return false
    }
  }, [])

  // Get elements within selection rectangle (optimized with memoization)
  const getElementsInSelection = useCallback((start: Point, end: Point): string[] => {
    const { isElementLocked } = useEditorStore.getState()
    
    // Only check elements that could potentially be in the selection area
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)
    
    // Quick bounds check before detailed intersection and exclude locked elements
    const potentialElements = elements.filter(element => {
      if (isElementLocked(element.id)) return false
      const { x, y, width = 0, height = 0 } = element
      return !(x > maxX || x + width < minX || y > maxY || y + height < minY)
    })
    
    return potentialElements
      .filter(element => isElementInSelection(element, start, end))
      .map(element => element.id)
  }, [elements, isElementInSelection])

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Prevent default for all mouse interactions to avoid conflicts
    e.preventDefault()
    
    const canvasPoint = screenToCanvas(e.clientX, e.clientY)
    const clickedElement = getElementAtPoint(canvasPoint)

    // Handle middle mouse button or space+drag for panning
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.stopPropagation()
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }

    // Handle selection tool
    if (selectedTool === 'select') {
      // First, check for handles on selected elements (higher priority)
      for (const elementId of selectedElements) {
        const element = elements.find(el => el.id === elementId)
        if (element) {
          const handleId = getHandleAtPoint(canvasPoint, element)
          if (handleId) {
            // Prevent default to avoid conflicts
            e.preventDefault()
            e.stopPropagation()
            
            // Start resizing
            setIsResizing(true)
            setResizeHandle(handleId)
            setResizeStartPoint(canvasPoint)
            setResizeStartBounds({
              x: element.x,
              y: element.y,
              width: element.width || 0,
              height: element.height || 0
            })
            return
          }
        }
      }
      
      // Then check for element selection
      if (clickedElement) {
        
        // Get all elements in the same group as the clicked element
        const groupElements = getGroupElements(clickedElement.id)
        
        if (e.ctrlKey || e.metaKey) {
          // Multi-select - toggle group selection
          const isGroupSelected = groupElements.every(id => selectedElements.includes(id))
          const newSelection = isGroupSelected
            ? selectedElements.filter(id => !groupElements.includes(id))
            : [...new Set([...selectedElements, ...groupElements])]
          onSelectElements(newSelection)
        } else {
          // Single select - select entire group if not already selected
          const isGroupSelected = groupElements.every(id => selectedElements.includes(id))
          if (!isGroupSelected) {
            onSelectElements(groupElements)
          }
        }
        
        // Start dragging - use current selection or group elements, but filter out locked ones
        const { isElementLocked } = useEditorStore.getState()
        const elementsToMove = selectedElements.some(id => groupElements.includes(id)) 
          ? selectedElements 
          : groupElements
        
        // Filter out locked elements from dragging
        const unlocked = elementsToMove.filter(id => !isElementLocked(id))
        
        setDraggedElements(unlocked)
        setDragOffset({
          x: canvasPoint.x - clickedElement.x,
          y: canvasPoint.y - clickedElement.y
        })
      } else {
        // Start selection rectangle or panning
        if (e.ctrlKey || e.metaKey) {
          // Start selection rectangle without clearing current selection
          setIsSelecting(true)
          setSelectionStart(canvasPoint)
          setSelectionEnd(canvasPoint)
        } else {
          // Clear selection and start selection rectangle or panning
          onClearSelection()
          setIsSelecting(true)
          setSelectionStart(canvasPoint)
          setSelectionEnd(canvasPoint)
        }
      }
      return
    }

    // Handle drawing tools (skip eraser)
    if (selectedTool === 'eraser') {
      // Eraser logic would go here
      return
    }
    
    // Handle actor tool - show modal for actor creation
    if (selectedTool === 'actor') {
      setActorModalPosition(canvasPoint)
      setShowActorModal(true)
      return
    }
    
    setIsDrawing(true)
    setStartPoint(canvasPoint)
    
    const properties = getCurrentProperties()
    
    const newElement: Partial<Element> = {
      type: selectedTool === 'pen' ? 'path' : selectedTool as 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'path',
      x: canvasPoint.x,
      y: canvasPoint.y,
      ...properties
    }

    if (selectedTool === 'pen') {
      newElement.points = [canvasPoint]
    } else if (selectedTool === 'text') {
      newElement.text = 'Texto'
      newElement.width = 100
      newElement.height = properties.fontSize
    }

    setCurrentElement(newElement)
  }, [selectedTool, selectedElements, screenToCanvas, getElementAtPoint, onSelectElements, onClearSelection, getCurrentProperties, getGroupElements, isSpacePressed])

  // Handle mouse move with debounced cursor update
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasPoint = screenToCanvas(e.clientX, e.clientY)
    
    // Update cursor based on current mouse position (debounced for performance)
    updateCursor(e)

    // Handle resizing
    if (isResizing && resizeHandle && resizeStartPoint && resizeStartBounds && selectedElements.length === 1) {
      const element = elements.find(el => el.id === selectedElements[0])
      if (element) {
        const deltaX = canvasPoint.x - resizeStartPoint.x
        const deltaY = canvasPoint.y - resizeStartPoint.y
        
        const newBounds = { ...resizeStartBounds }
        
        // Handle different resize directions
        switch (resizeHandle) {
          case 'nw':
            newBounds.x = resizeStartBounds.x + deltaX
            newBounds.y = resizeStartBounds.y + deltaY
            newBounds.width = resizeStartBounds.width - deltaX
            newBounds.height = resizeStartBounds.height - deltaY
            break
          case 'ne':
            newBounds.y = resizeStartBounds.y + deltaY
            newBounds.width = resizeStartBounds.width + deltaX
            newBounds.height = resizeStartBounds.height - deltaY
            break
          case 'sw':
            newBounds.x = resizeStartBounds.x + deltaX
            newBounds.width = resizeStartBounds.width - deltaX
            newBounds.height = resizeStartBounds.height + deltaY
            break
          case 'se':
            newBounds.width = resizeStartBounds.width + deltaX
            newBounds.height = resizeStartBounds.height + deltaY
            break
          case 'n':
            newBounds.y = resizeStartBounds.y + deltaY
            newBounds.height = resizeStartBounds.height - deltaY
            break
          case 's':
            newBounds.height = resizeStartBounds.height + deltaY
            break
          case 'w':
            newBounds.x = resizeStartBounds.x + deltaX
            newBounds.width = resizeStartBounds.width - deltaX
            break
          case 'e':
            newBounds.width = resizeStartBounds.width + deltaX
            break
          case 'radius':
            // Handle border radius for rectangles
            if (element.type === 'rectangle') {
              // Calculate radius based on distance from corner
              const maxRadius = Math.min(resizeStartBounds.width, resizeStartBounds.height) / 2
              const radiusValue = Math.max(0, Math.min(Math.abs(deltaX + deltaY) / 2, maxRadius))
              
              // Apply the border radius immediately
              onUpdateElement(element.id, { borderRadius: radiusValue })
              
              // Show tooltip for border radius
              setTooltip({
                x: e.clientX + 10,
                y: e.clientY - 30,
                text: `Border Radius: ${Math.round(radiusValue)}px`
              })
              return
            }
            break
          case 'radius-n':
          case 'radius-s':
          case 'radius-w':
          case 'radius-e':
            // Handle circle radius
            if (element.type === 'circle') {
              const centerX = resizeStartBounds.x + resizeStartBounds.width / 2
              const centerY = resizeStartBounds.y + resizeStartBounds.height / 2
              const newRadius = Math.abs(Math.sqrt((canvasPoint.x - centerX) ** 2 + (canvasPoint.y - centerY) ** 2))
              const newSize = newRadius * 2
              
              newBounds.x = centerX - newRadius
              newBounds.y = centerY - newRadius
              newBounds.width = newSize
              newBounds.height = newSize
            }
            break
          case 'start':
            // Handle line/arrow start point
            if (element.type === 'line' || element.type === 'arrow') {
              newBounds.x = canvasPoint.x
              newBounds.y = canvasPoint.y
              newBounds.width = (resizeStartBounds.x + resizeStartBounds.width) - canvasPoint.x
              newBounds.height = (resizeStartBounds.y + resizeStartBounds.height) - canvasPoint.y
            }
            break
          case 'end':
            // Handle line/arrow end point
            if (element.type === 'line' || element.type === 'arrow') {
              newBounds.width = canvasPoint.x - resizeStartBounds.x
              newBounds.height = canvasPoint.y - resizeStartBounds.y
            }
            break
          case 'curve':
            // Handle curve control point for lines/arrows
            if (element.type === 'line' || element.type === 'arrow') {
              // For now, just store the curve offset
              const curveOffsetX = canvasPoint.x - (resizeStartBounds.x + resizeStartBounds.width / 2)
              const curveOffsetY = canvasPoint.y - (resizeStartBounds.y + resizeStartBounds.height / 2)
              
              // Update element with curve data
              onUpdateElement(element.id, { 
                curveOffsetX: curveOffsetX,
                curveOffsetY: curveOffsetY
              })
              
              // Show tooltip for curve
              setTooltip({
                x: e.clientX + 10,
                y: e.clientY - 30,
                text: `Curve: ${Math.round(curveOffsetX)}, ${Math.round(curveOffsetY)}`
              })
              return
            }
            break
        }
        
        // Ensure minimum size
        newBounds.width = Math.max(10, newBounds.width)
        newBounds.height = Math.max(10, newBounds.height)
        
        // Apply snap to grid for position and size
        if (snapEnabled) {
          newBounds.x = snapToGrid(newBounds.x)
          newBounds.y = snapToGrid(newBounds.y)
          newBounds.width = snapToSize(newBounds.width)
          newBounds.height = snapToSize(newBounds.height)
        }
        
        // Maintain aspect ratio with Shift key
        if (isShiftPressed && (resizeHandle === 'nw' || resizeHandle === 'ne' || resizeHandle === 'sw' || resizeHandle === 'se')) {
          const aspectRatio = resizeStartBounds.width / resizeStartBounds.height
          if (newBounds.width / newBounds.height > aspectRatio) {
            newBounds.width = newBounds.height * aspectRatio
          } else {
            newBounds.height = newBounds.width / aspectRatio
          }
          
          // Adjust position for corner handles
          if (resizeHandle === 'nw') {
            newBounds.x = resizeStartBounds.x + resizeStartBounds.width - newBounds.width
            newBounds.y = resizeStartBounds.y + resizeStartBounds.height - newBounds.height
          } else if (resizeHandle === 'ne') {
            newBounds.y = resizeStartBounds.y + resizeStartBounds.height - newBounds.height
          } else if (resizeHandle === 'sw') {
            newBounds.x = resizeStartBounds.x + resizeStartBounds.width - newBounds.width
          }
        }
        
        // Apply changes directly during resize for immediate feedback
         onUpdateElement(element.id, newBounds)
         
         // Also update preview for visual feedback
         setResizePreview({
           ...newBounds,
           borderRadius: element.borderRadius
         })
         
         // Show tooltip with dimensions
         const tooltipText = `${Math.round(newBounds.width)} × ${Math.round(newBounds.height)}`
         setTooltip({
           x: e.clientX + 10,
           y: e.clientY - 30,
           text: tooltipText
         })
       }
       return
     }

    // Handle selection rectangle
    if (isSelecting && selectionStart) {
      setSelectionEnd(canvasPoint)
      return
    }

    // Handle panning
    if (isPanning && lastPanPoint) {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y
      
      onUpdateViewport({
        ...viewport,
        x: viewport.x + deltaX,
        y: viewport.y + deltaY
      })
      
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }

    // Handle dragging elements
    if (draggedElements.length > 0 && selectedTool === 'select') {
      const { isElementLocked } = useEditorStore.getState()
      
      // Filter out locked elements from dragging
      const unlocked = draggedElements.filter(id => !isElementLocked(id))
      
      if (unlocked.length === 0) {
        // All elements are locked, stop dragging
        setDraggedElements([])
        return
      }
      
      const newX = canvasPoint.x - dragOffset.x
      const newY = canvasPoint.y - dragOffset.y
      
      // Calculate the movement delta from the first unlocked element
      const firstElement = elements.find(el => el.id === unlocked[0])
      if (firstElement) {
        const deltaX = newX - firstElement.x
        const deltaY = newY - firstElement.y
        
        // Move all unlocked dragged elements by the same delta to maintain relative positions
        unlocked.forEach(elementId => {
          const element = elements.find(el => el.id === elementId)
          if (element) {
            let newX = element.x + deltaX
            let newY = element.y + deltaY
            
            // Apply snap to grid
            if (snapEnabled) {
              newX = snapToGrid(newX)
              newY = snapToGrid(newY)
            }
            
            onUpdateElement(elementId, {
              x: newX,
              y: newY
            })
          }
        })
      }
      return
    }

    // Handle drawing
    if (isDrawing && currentElement && startPoint) {
      const updatedElement = { ...currentElement }

      switch (selectedTool) {
        case 'rectangle':
        case 'circle':
          updatedElement.width = Math.abs(canvasPoint.x - startPoint.x)
          updatedElement.height = Math.abs(canvasPoint.y - startPoint.y)
          updatedElement.x = Math.min(startPoint.x, canvasPoint.x)
          updatedElement.y = Math.min(startPoint.y, canvasPoint.y)
          break
        
        case 'line':
        case 'arrow':
          updatedElement.width = canvasPoint.x - startPoint.x
          updatedElement.height = canvasPoint.y - startPoint.y
          break
        
        case 'pen':
          if (updatedElement.points) {
            updatedElement.points = [...updatedElement.points, canvasPoint]
          }
          break
      }

      setCurrentElement(updatedElement)
    }
  }, [isPanning, lastPanPoint, draggedElements, selectedTool, isDrawing, currentElement, startPoint, viewport, onUpdateViewport, dragOffset, elements, onUpdateElement, screenToCanvas, isSelecting, selectionStart, isResizing, resizeHandle, resizeStartPoint, resizeStartBounds, isShiftPressed, snapEnabled, snapToGrid, snapToSize])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // Handle selection rectangle completion
    if (isSelecting && selectionStart && selectionEnd) {
      const selectedIds = getElementsInSelection(selectionStart, selectionEnd)
      
      if (selectedIds.length > 0) {
        // Expand selection to include grouped elements
        const expandedSelection = new Set<string>()
        selectedIds.forEach(id => {
          const groupElements = getGroupElements(id)
          groupElements.forEach(groupId => expandedSelection.add(groupId))
        })
        
        const finalSelection = Array.from(expandedSelection)
        
        // Merge with existing selection if Ctrl is held
        const event = window.event as KeyboardEvent | MouseEvent | null
        const isCtrlHeld = event && ('ctrlKey' in event) ? event.ctrlKey : false
        const newSelection = (selectionStart && isCtrlHeld) 
          ? [...new Set([...selectedElements, ...finalSelection])]
          : finalSelection
        
        onSelectElements(newSelection)
      }
      
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      return
    }
    
    if (isDrawing && currentElement) {
      onAddElement(currentElement as Omit<Element, 'id'>)
    }
    
    setIsDrawing(false)
    setCurrentElement(null)
    setStartPoint(null)
    setIsPanning(false)
    setLastPanPoint(null)
    setDraggedElements([])
    setDragOffset({ x: 0, y: 0 })
    // Save to history for undo/redo when finishing resize
    if (isResizing && selectedElements.length === 1) {
      const { saveToHistory } = useEditorStore.getState()
      saveToHistory()
    }
    
    setIsResizing(false)
    setResizeHandle(null)
    setResizeStartPoint(null)
    setResizeStartBounds(null)
    setResizePreview(null)
    setTooltip(null)
  }, [isDrawing, currentElement, onAddElement, isSelecting, selectionStart, selectionEnd, getElementsInSelection, getGroupElements, selectedElements, onSelectElements, isResizing, resizePreview, elements, onUpdateElement])

  // Handle wheel for zoom and horizontal scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl+scroll
      e.preventDefault()
      
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor))
      
      // Zoom towards mouse position
      const zoomRatio = newZoom / viewport.zoom
      const newX = mouseX - (mouseX - viewport.x) * zoomRatio
      const newY = mouseY - (mouseY - viewport.y) * zoomRatio
      
      onUpdateViewport({
        x: newX,
        y: newY,
        zoom: newZoom
      })
    } else if (e.shiftKey) {
      // Horizontal scroll with Shift+scroll
      e.preventDefault()
      
      const scrollSpeed = 50
      const deltaX = e.deltaY > 0 ? -scrollSpeed : scrollSpeed
      
      onUpdateViewport({
        ...viewport,
        x: viewport.x + deltaX
      })
    }
  }, [viewport, onUpdateViewport])

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply viewport transform
    ctx.save()
    ctx.translate(viewport.x, viewport.y)
    ctx.scale(viewport.zoom, viewport.zoom)

    // Draw grid
    drawGrid(ctx, viewport)

    // Draw elements sorted by zIndex (lowest to highest)
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    sortedElements.forEach(element => {
      drawElement(ctx, element, selectedElements.includes(element.id))
    })

    // Draw current element being drawn
    if (currentElement) {
      drawElement(ctx, currentElement as Element, false)
    }
    
    // Draw resize preview
    if (isResizing && resizePreview && selectedElements.length === 1) {
      const element = elements.find(el => el.id === selectedElements[0])
      if (element) {
        const previewElement = {
          ...element,
          ...resizePreview
        }
        
        // Draw preview with semi-transparent style
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = '#007bff'
        ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom])
        drawElement(ctx, previewElement, false)
        ctx.restore()
      }
    }

    // Draw selection rectangle
    if (isSelecting && selectionStart && selectionEnd) {
      ctx.strokeStyle = '#007bff'
      ctx.fillStyle = 'rgba(0, 123, 255, 0.1)'
      ctx.lineWidth = 1 / viewport.zoom
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom])
      
      const x = Math.min(selectionStart.x, selectionEnd.x)
      const y = Math.min(selectionStart.y, selectionEnd.y)
      const width = Math.abs(selectionEnd.x - selectionStart.x)
      const height = Math.abs(selectionEnd.y - selectionStart.y)
      
      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)
      
      ctx.setLineDash([])
    }

    ctx.restore()
  }, [elements, selectedElements, currentElement, viewport, containerRef, isSelecting, selectionStart, selectionEnd])

  // Draw grid
  const drawGrid = (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
    const gridSize = 20
    const canvas = canvasRef.current
    if (!canvas) return

    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1 / viewport.zoom
    
    const startX = Math.floor(-viewport.x / viewport.zoom / gridSize) * gridSize
    const startY = Math.floor(-viewport.y / viewport.zoom / gridSize) * gridSize
    const endX = startX + (canvas.width / viewport.zoom) + gridSize
    const endY = startY + (canvas.height / viewport.zoom) + gridSize

    ctx.beginPath()
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
    }
    ctx.stroke()
  }

  // Draw element
  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: Partial<Element>, isSelected: boolean) => {
    if (!element.type) return

    ctx.save()
    
    // Check if element is in a group
    const { getElementGroup } = getGroupFunctions()
    const elementGroup = element.id ? getElementGroup(element.id) : undefined
    const isInGroup = !!elementGroup
    const isWelded = elementGroup?.type === 'welded'
    
    ctx.strokeStyle = element.strokeColor || '#000000'
    ctx.fillStyle = element.fillColor || 'transparent'
    ctx.lineWidth = (element.strokeWidth || 2) / viewport.zoom
    ctx.globalAlpha = element.opacity || 1

    const { x = 0, y = 0, width = 0, height = 0 } = element

    switch (element.type) {
      case 'rectangle':
        const borderRadius = element.borderRadius || 0
        if (borderRadius > 0) {
          // Draw rounded rectangle
          ctx.beginPath()
          ctx.roundRect(x, y, width, height, borderRadius)
          if (element.fillColor !== 'transparent') {
            ctx.fill()
          }
          ctx.stroke()
        } else {
          // Draw regular rectangle
          if (element.fillColor !== 'transparent') {
            ctx.fillRect(x, y, width, height)
          }
          ctx.strokeRect(x, y, width, height)
        }
        break

      case 'circle':
        const radius = Math.min(width, height) / 2
        ctx.beginPath()
        ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI)
        if (element.fillColor !== 'transparent') {
          ctx.fill()
        }
        ctx.stroke()
        break

      case 'line':
        ctx.beginPath()
        if (element.curveOffsetX !== undefined && element.curveOffsetY !== undefined) {
          // Draw curved line using quadratic curve
          const controlX = x + width / 2 + element.curveOffsetX
          const controlY = y + height / 2 + element.curveOffsetY
          ctx.moveTo(x, y)
          ctx.quadraticCurveTo(controlX, controlY, x + width, y + height)
        } else {
          // Draw straight line
          ctx.moveTo(x, y)
          ctx.lineTo(x + width, y + height)
        }
        ctx.stroke()
        break

      case 'arrow':
        // Draw line (curved or straight)
        ctx.beginPath()
        if (element.curveOffsetX !== undefined && element.curveOffsetY !== undefined) {
          // Draw curved arrow using quadratic curve
          const controlX = x + width / 2 + element.curveOffsetX
          const controlY = y + height / 2 + element.curveOffsetY
          ctx.moveTo(x, y)
          ctx.quadraticCurveTo(controlX, controlY, x + width, y + height)
        } else {
          // Draw straight arrow
          ctx.moveTo(x, y)
          ctx.lineTo(x + width, y + height)
        }
        ctx.stroke()
        
        // Draw arrowhead
        let angle: number
        if (element.curveOffsetX !== undefined && element.curveOffsetY !== undefined) {
          // Calculate angle from curve direction at end point
          const controlX = x + width / 2 + element.curveOffsetX
          const controlY = y + height / 2 + element.curveOffsetY
          angle = Math.atan2((y + height) - controlY, (x + width) - controlX)
        } else {
          // Calculate angle from straight line
          angle = Math.atan2(height, width)
        }
        
        const arrowLength = 15 / viewport.zoom
        const arrowAngle = Math.PI / 6
        
        ctx.beginPath()
        ctx.moveTo(x + width, y + height)
        ctx.lineTo(
          x + width - arrowLength * Math.cos(angle - arrowAngle),
          y + height - arrowLength * Math.sin(angle - arrowAngle)
        )
        ctx.moveTo(x + width, y + height)
        ctx.lineTo(
          x + width - arrowLength * Math.cos(angle + arrowAngle),
          y + height - arrowLength * Math.sin(angle + arrowAngle)
        )
        ctx.stroke()
        break

      case 'text':
        ctx.font = `${(element.fontSize || 16) / viewport.zoom}px Arial`
        ctx.fillStyle = element.strokeColor || '#000000'
        ctx.fillText(element.text || '', x, y)
        break

      case 'path':
        if (element.points && element.points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(element.points[0].x, element.points[0].y)
          element.points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y)
          })
          ctx.stroke()
        }
        break

      case 'actor':
        // Draw actor shape
        if (element.actorShape === 'circle') {
          const radius = Math.min(width, height) / 2
          ctx.beginPath()
          ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI)
          if (element.fillColor !== 'transparent') {
            ctx.fill()
          }
          ctx.stroke()
        } else {
          // Square shape
          if (element.fillColor !== 'transparent') {
            ctx.fillRect(x, y, width, height)
          }
          ctx.strokeRect(x, y, width, height)
        }
        
        // Draw initials
        if (element.actorInitials) {
          ctx.save()
          ctx.font = `bold ${Math.min(width, height) * 0.3 / viewport.zoom}px Arial`
          ctx.fillStyle = element.strokeColor || '#000000'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            element.actorInitials,
            x + width / 2,
            y + height / 2
          )
          ctx.restore()
        }
        
        // Draw speech bubble if there's speech text
        if (element.actorSpeech && element.actorSpeech.trim()) {
          ctx.save()
          
          // Calculate bubble position and size
          const bubbleWidth = Math.max(100, element.actorSpeech.length * 8)
          const bubbleHeight = 30
          const bubbleX = x + width + 10
          const bubbleY = y - bubbleHeight / 2
          
          // Draw bubble background
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = 1 / viewport.zoom
          
          // Bubble shape
          ctx.beginPath()
          ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 5)
          ctx.fill()
          ctx.stroke()
          
          // Bubble tail
          ctx.beginPath()
          ctx.moveTo(bubbleX, bubbleY + bubbleHeight / 2)
          ctx.lineTo(x + width, y + height / 2)
          ctx.lineTo(bubbleX, bubbleY + bubbleHeight / 2 + 5)
          ctx.fill()
          
          // Draw speech text
          ctx.fillStyle = '#000000'
          ctx.font = `${12 / viewport.zoom}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            element.actorSpeech,
            bubbleX + bubbleWidth / 2,
            bubbleY + bubbleHeight / 2
          )
          
          ctx.restore()
        }
        break
    }

    // Draw group indicator
    if (isInGroup) {
      ctx.strokeStyle = isWelded ? '#ff6b6b' : '#28a745'
      ctx.lineWidth = 1.5 / viewport.zoom
      ctx.setLineDash([3 / viewport.zoom, 3 / viewport.zoom])
      
      const padding = 3
      
      switch (element.type) {
        case 'rectangle':
        case 'text':
          ctx.strokeRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
          break
        case 'circle':
          const r = Math.min(width, height) / 2
          ctx.beginPath()
          ctx.arc(x + r, y + r, r + padding, 0, 2 * Math.PI)
          ctx.stroke()
          break
        case 'actor':
          if (element.actorShape === 'circle') {
            const r = Math.min(width, height) / 2
            ctx.beginPath()
            ctx.arc(x + r, y + r, r + padding, 0, 2 * Math.PI)
            ctx.stroke()
          } else {
            ctx.strokeRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
          }
          break
        default:
          ctx.strokeRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
          break
      }
      
      ctx.setLineDash([])
    }

    // Draw selection outline
    if (isSelected) {
      ctx.strokeStyle = '#007bff'
      ctx.lineWidth = 2 / viewport.zoom
      ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom])
      
      switch (element.type) {
        case 'rectangle':
        case 'text':
          ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
          break
        case 'circle':
          const r = Math.min(width, height) / 2
          ctx.beginPath()
          ctx.arc(x + r, y + r, r + 2, 0, 2 * Math.PI)
          ctx.stroke()
          break
        case 'actor':
          if (element.actorShape === 'circle') {
            const r = Math.min(width, height) / 2
            ctx.beginPath()
            ctx.arc(x + r, y + r, r + 2, 0, 2 * Math.PI)
            ctx.stroke()
          } else {
            ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
          }
          break
      }
      
      ctx.setLineDash([])
      
      // Draw resize handles
      if (selectedElements.length === 1) {
        const handles = element ? getResizeHandles(element as Element) : []
        const handleSize = 8 / viewport.zoom
        
        ctx.fillStyle = '#007bff'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1 / viewport.zoom
        
        handles.forEach(handle => {
          if (handle.id === 'radius') {
            // Special styling for border radius handle
            ctx.fillStyle = '#28a745'
            ctx.beginPath()
            ctx.arc(handle.x + handleSize/2, handle.y + handleSize/2, handleSize/2, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
            ctx.fillStyle = '#007bff'
          } else {
            // Regular resize handles
            ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
            ctx.strokeRect(handle.x, handle.y, handleSize, handleSize)
          }
        })
      }
    }

    ctx.restore()
  }, [viewport, getGroupFunctions, getResizeHandles, selectedElements.length])

  // Handle actor modal
  const handleActorModalSave = useCallback((actorData: Partial<Element>) => {
    onAddElement(actorData as Omit<Element, 'id'>)
    setShowActorModal(false)
  }, [onAddElement])

  const handleActorModalClose = useCallback(() => {
    setShowActorModal(false)
  }, [])

  // Render on changes
  useEffect(() => {
    render()
  }, [render])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      render()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [render])



  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in input fields
      if (isTyping()) {
        return
      }

      // Handle space key for panning
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
        return
      }
      
      // Handle Ctrl+A (select all)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault()
        const allElementIds = elements.map(el => el.id)
        onSelectElements(allElementIds)
        return
      }
      
      // Handle Escape (clear selection)
      if (e.code === 'Escape') {
        e.preventDefault()
        onClearSelection()
        // Also cancel any ongoing selection rectangle
        setIsSelecting(false)
        setSelectionStart(null)
        setSelectionEnd(null)
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't interfere with typing in input fields
      if (isTyping()) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(false)
        // Stop panning if space is released
        setIsPanning(false)
        setLastPanPoint(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [elements, onSelectElements, onClearSelection])

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    // Only set to false if we're actually leaving the canvas
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      
      if (data.type === 'actor') {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        
        // Convert screen coordinates to canvas coordinates
        const canvasPoint = screenToCanvas(e.clientX, e.clientY)
        
        // Create actor element
        const actorElement: Omit<Element, 'id'> = {
          type: 'actor',
          x: canvasPoint.x - (data.actorSize || 60) / 2, // Center on drop point
          y: canvasPoint.y - (data.actorSize || 60) / 2,
          width: data.actorSize || 60,
          height: data.actorSize || 60,
          actorId: data.actorId,
          actorName: data.actorName,
          actorInitials: data.actorInitials,
          actorColor: data.actorColor,
          actorShape: data.actorShape,
          actorNotes: data.actorNotes,
          actorRole: '',
          actorSpeech: '',
          fillColor: data.fillColor,
          strokeColor: data.strokeColor,
          strokeWidth: 2,
          opacity: 1,
          bubbleStyle: data.bubbleStyle,
          bubbleColor: data.bubbleColor,
          bubbleTextColor: data.bubbleTextColor,
          zIndex: elements.length
        }
        
        onAddElement(actorElement)
      }
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }, [screenToCanvas, elements.length, onAddElement])

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 cursor-crosshair transition-all duration-200 ${
          isDragOver ? 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50 bg-opacity-10' : ''
        } ${
          isTransitioning ? 'opacity-75 transition-opacity duration-300' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          cursor: currentCursor
        }}
      />
      
      {tooltip && (
        <div
          className="absolute bg-gray-800 text-white px-2 py-1 rounded text-sm pointer-events-none z-50"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.text}
        </div>
      )}
      
      {/* Slideshow Indicator */}
      {isPlayingSlideshow && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-sm font-medium">📽️ Slideshow em execução</span>
          </div>
        </div>
      )}
      
      {/* Transition Overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black bg-opacity-20 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 shadow-xl flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Transicionando para próxima cena...</span>
          </div>
        </div>
      )}
      
      <ActorModal
          isOpen={showActorModal}
          onClose={handleActorModalClose}
          onSave={handleActorModalSave}
          position={actorModalPosition}
          currentActorCount={elements.filter(el => el.type === 'actor').length}
        />
    </>
  )
})

EditorCanvas.displayName = 'EditorCanvas'