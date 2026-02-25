'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo } from 'react'
import { Element, Point, Tool, Viewport, useEditorStore } from '@/hooks/useEditorStore'
import { ActorModal } from './ActorModal'
import { FullscreenSlideshow } from './FullscreenSlideshow'
import { useAuth } from '@/hooks/useAuth'
import { useUserPlan } from '@/hooks/useUserPlan'

import { createUnifiedStageSync, extractPathData } from '@/lib/svgUtils'
import { TOUCH_DROP_EVENT, TouchDropDetail, TouchDropPayload } from '@/hooks/useTouchCanvasDrop'

type ActorDropPayload = TouchDropPayload & {
  type: 'actor'
  actorId: string
  actorName: string
  actorInitials: string
  actorColor: string
  actorShape: string
  actorSize?: number
  actorNotes?: string
  fillColor: string
  strokeColor: string
  bubbleStyle?: string
  bubbleColor?: string
  bubbleTextColor?: string
}

type ObjectDropPayload = TouchDropPayload & {
  type: 'object'
  objectId: string
  objectName: string
  objectInitials?: string
  objectNotes?: string
  objectShape: string
  objectWidth?: number
  objectHeight?: number
  fillColor?: string
  strokeColor: string
  strokeDasharray?: string
}

const isActorPayload = (payload: TouchDropPayload): payload is ActorDropPayload => payload.type === 'actor'
const isObjectPayload = (payload: TouchDropPayload): payload is ObjectDropPayload => payload.type === 'object'

// Normalize object shape to handle Portuguese variations and case
function normalizeObjectShape(shape?: string | null): 'triangle' | 'square' | 'hexagon' {
  if (!shape) return 'square'
  const cleaned = shape
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

  if (cleaned === 'triangle' || cleaned === 'triangulo') return 'triangle'
  if (cleaned === 'hexagon' || cleaned === 'hexagono') return 'hexagon'
  return 'square'
}

interface EditorCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  elements: Element[]
  selectedElements: string[]
  selectedTool: Tool
  viewport: Viewport
  onAddElement: (element: Omit<Element, 'id'>) => void
  onUpdateElement: (id: string, updates: Partial<Element>, options?: { commitHistory?: boolean }) => void
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

  const { user } = useAuth()
  const userPlan = useUserPlan(user ?? null)
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
  const [textEditor, setTextEditor] = useState<{ elementId: string; value: string; initialValue: string } | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const textMeasureContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const pendingTextElementRef = useRef(false)
  const previousElementsRef = useRef<Element[]>([])
  const touchGestureRef = useRef<{
    initialDistance: number
    initialZoom: number
    initialViewport: Viewport
    initialMidpoint: { x: number; y: number }
  } | null>(null)

  // Guide lines state
  const [guideLines, setGuideLines] = useState<{
    vertical: number[]
    horizontal: number[]
  }>({ vertical: [], horizontal: [] })
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)



  // Get slideshow state from store
  const { stageConfig, isPlayingSlideshow, hoverPreviewEnabled, hoverPreviewColor } = useEditorStore()

  useEffect(() => {
    if (!hoverPreviewEnabled && hoveredElementId) {
      setHoveredElementId(null)
    }
  }, [hoverPreviewEnabled, hoveredElementId])

  useEffect(() => {
    const measureCanvas = document.createElement('canvas')
    textMeasureContextRef.current = measureCanvas.getContext('2d')
    return () => {
      textMeasureContextRef.current = null
    }
  }, [])

  useEffect(() => {
    if (textEditor && textAreaRef.current) {
      const textarea = textAreaRef.current
      textarea.focus()
      const length = textEditor.value.length
      requestAnimationFrame(() => {
        textarea.setSelectionRange(length, length)
      })
    }
  }, [textEditor])

  useEffect(() => {
    if (!textEditor) return
    const exists = elements.some(el => el.id === textEditor.elementId && (el.type === 'text' || el.type === 'textbox'))
    if (!exists) {
      setTextEditor(null)
    }
  }, [elements, textEditor])

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

  const measureTextWidth = useCallback((text: string, fontSize: number): number => {
    const ctx = textMeasureContextRef.current
    if (!ctx) {
      return Math.max(fontSize, text.length * (fontSize * 0.6))
    }
    ctx.font = `${fontSize}px Arial`
    const metrics = ctx.measureText(text || 'M')
    return Math.max(fontSize, metrics.width)
  }, [])

  const computeTextMetrics = useCallback((value: string, fontSize: number) => {
    const sanitized = value ?? ''
    const lines = sanitized.split(/\r?\n/)
    const lineHeight = fontSize * 1.2
    const maxLineWidth = Math.max(fontSize, ...lines.map(line => measureTextWidth(line, fontSize)))
    const width = Math.max(fontSize * 2, Math.ceil(maxLineWidth) + 2)
    const height = Math.max(lineHeight, lines.length * lineHeight)
    return { lines, lineHeight, width, height: Math.ceil(height) + 2 }
  }, [measureTextWidth])

  // Compute text height accounting for word-wrapping within a given container width
  const computeWrappedTextHeight = useCallback((text: string, fontSize: number, containerWidth: number) => {
    const sanitized = text ?? ''
    const paragraphs = sanitized.split(/\r?\n/)
    const lineHeight = fontSize * 1.2
    const padding = 16 // same padding used in textbox dimension calcs
    const availableWidth = containerWidth - padding
    let totalLines = 0

    for (const paragraph of paragraphs) {
      if (paragraph === '') {
        totalLines += 1
        continue
      }
      const words = paragraph.split(' ')
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word
        const testWidth = measureTextWidth(testLine, fontSize)
        if (testWidth > availableWidth && currentLine) {
          totalLines += 1
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) {
        totalLines += 1
      }
    }

    return Math.max(lineHeight, totalLines * lineHeight)
  }, [measureTextWidth])

  const openTextEditor = useCallback((element: Element) => {
    setTextEditor({
      elementId: element.id,
      value: element.text || '',
      initialValue: element.text || ''
    })
    onSelectElements([element.id])
  }, [onSelectElements])

  useEffect(() => {
    if (pendingTextElementRef.current) {
      const previousIds = new Set(previousElementsRef.current.map(el => el.id))
      const newTextElement = elements.find(el => !previousIds.has(el.id) && (el.type === 'text' || el.type === 'textbox'))
      if (newTextElement) {
        pendingTextElementRef.current = false
        openTextEditor(newTextElement)
      }
    }
    previousElementsRef.current = elements
  }, [elements, openTextEditor])

  const editingElement = useMemo(() => {
    if (!textEditor) return null
    return elements.find(el => el.id === textEditor.elementId) || null
  }, [elements, textEditor])

  const textEditorStyle = useMemo(() => {
    if (!textEditor || !editingElement || !canvasRef.current || !containerRef.current) {
      return null
    }

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    const fontSize = editingElement.fontSize ?? 16
    const metrics = computeTextMetrics(textEditor.value, fontSize)

    const rawLeft = canvasRect.left + viewport.x + (editingElement.x ?? 0) * viewport.zoom - containerRect.left
    const rawTop = canvasRect.top + viewport.y + (editingElement.y ?? 0) * viewport.zoom - containerRect.top

    let editorWidth = metrics.width
    let editorHeight = metrics.height
    let editorLineHeight = metrics.lineHeight
    let padding = 0

    if (editingElement.type === 'textbox') {
      const baseWidth = Math.max(300, editingElement.width ?? metrics.width)
      const lineHeightBox = fontSize * 1.4
      padding = 8
      const wrappedHeight = computeWrappedTextHeight(textEditor.value, fontSize, baseWidth)
      const contentHeight = wrappedHeight + padding * 2
      editorWidth = baseWidth
      editorHeight = Math.max(editingElement.height ?? fontSize * 1.5, contentHeight)
      editorLineHeight = lineHeightBox
    }

    const isTextbox = editingElement.type === 'textbox'

    return {
      position: 'absolute' as const,
      left: Math.round(rawLeft),
      top: Math.round(rawTop),
      width: Math.max(1, Math.round(editorWidth * viewport.zoom)),
      height: Math.max(1, Math.round(editorHeight * viewport.zoom)),
      fontSize: `${fontSize * viewport.zoom}px`,
      lineHeight: `${editorLineHeight * viewport.zoom}px`,
      fontFamily: 'Arial, sans-serif',
      color: isTextbox ? '#000000' : (editingElement.strokeColor || '#000000'),
      background: isTextbox ? 'transparent' : 'rgba(255,255,255,0.95)',
      border: isTextbox ? 'none' : `${Math.max(1, 1 * viewport.zoom)}px solid #2563eb`,
      borderRadius: isTextbox ? 0 : 4,
      padding: padding ? `${padding * viewport.zoom}px` : 0,
      boxSizing: 'border-box' as const,
      outline: 'none',
      resize: 'none' as const,
      boxShadow: isTextbox ? 'none' : '0 0 0 1px rgba(37,99,235,0.4)',
      zIndex: 30,
      overflow: 'hidden' as const,
      whiteSpace: 'pre-wrap' as const,
      backgroundClip: 'padding-box',
      caretColor: '#000000'
    }
  }, [textEditor, editingElement, viewport, containerRef, canvasRef, computeTextMetrics, computeWrappedTextHeight])

  const updateTextElementDimensions = useCallback((elementId: string, value: string) => {
    const element = useEditorStore.getState().elements.find(el => el.id === elementId)
    if (!element) return
    const fontSize = element.fontSize ?? 16
    if (element.type === 'textbox') {
      const { width: metricsWidth, lineHeight } = computeTextMetrics(value, fontSize)
      const padding = 16
      const newWidth = Math.max(element.width ?? metricsWidth + padding, metricsWidth + padding)
      const wrappedHeight = computeWrappedTextHeight(value, fontSize, newWidth)
      const newHeight = Math.max(element.height ?? fontSize * 1.5 + padding, wrappedHeight + padding)

      onUpdateElement(elementId, {
        text: value,
        width: newWidth,
        height: newHeight,
        textBoxConfig: {
          ...(element.textBoxConfig ?? { previewMode: 'full', fullText: '' }),
          fullText: value,
          lineHeight
        }
      })
      return
    }

    const { width, height } = computeTextMetrics(value, fontSize)
    onUpdateElement(elementId, {
      text: value,
      width,
      height
    })
  }, [computeTextMetrics, computeWrappedTextHeight, onUpdateElement])

  const closeTextEditor = useCallback((commit: boolean) => {
    if (!textEditor) return
    const { elementId, value, initialValue } = textEditor
    const trimmedValue = value.trim()
    const targetElement = useEditorStore.getState().elements.find(el => el.id === elementId)
    if (!targetElement) {
      setTextEditor(null)
      return
    }

    if (commit) {
      if (trimmedValue === '') {
        useEditorStore.getState().deleteElements([elementId])
      } else {
        if (targetElement.type === 'textbox') {
          updateTextElementDimensions(elementId, value)
        } else {
          const fontSize = targetElement.fontSize ?? 16
          const { width, height } = computeTextMetrics(value, fontSize)
          if (targetElement.text !== value || targetElement.width !== width || targetElement.height !== height) {
            updateTextElementDimensions(elementId, value)
          }
        }
      }
    } else {
      if (initialValue.trim() === '') {
        useEditorStore.getState().deleteElements([elementId])
      } else {
        if (targetElement.type === 'textbox') {
          updateTextElementDimensions(elementId, initialValue)
        } else {
          if (targetElement.text !== initialValue) {
            updateTextElementDimensions(elementId, initialValue)
          }
        }
      }
    }
    setTextEditor(null)
  }, [textEditor, computeTextMetrics, updateTextElementDimensions])

  const handleTextEditorChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!textEditor) return
    const newValue = event.target.value
    setTextEditor(prev => prev ? { ...prev, value: newValue } : prev)
    const element = useEditorStore.getState().elements.find(el => el.id === textEditor.elementId)
    if (element) {
      const fontSize = element.fontSize ?? 16
      let needsSceneUpdate = false
      if (element.type === 'textbox') {
        const { width: metricsWidth, lineHeight } = computeTextMetrics(newValue, fontSize)
        const padding = 16
        const newWidth = Math.max(element.width ?? metricsWidth + padding, metricsWidth + padding)
        const wrappedHeight = computeWrappedTextHeight(newValue, fontSize, newWidth)
        const newHeight = Math.max(element.height ?? fontSize * 1.5 + padding, wrappedHeight + padding)

        useEditorStore.setState((state) => ({
          elements: state.elements.map(el =>
            el.id === textEditor.elementId
              ? {
                ...el,
                text: newValue,
                width: newWidth,
                height: newHeight,
                textBoxConfig: {
                  ...(el.textBoxConfig ?? { previewMode: 'full', fullText: '' }),
                  fullText: newValue,
                  lineHeight
                }
              }
              : el
          )
        }))
        needsSceneUpdate = true
      } else {
        const { width, height } = computeTextMetrics(newValue, fontSize)
        if (element.text !== newValue || element.width !== width || element.height !== height) {
          useEditorStore.setState((state) => ({
            elements: state.elements.map(el =>
              el.id === textEditor.elementId
                ? { ...el, text: newValue, width, height }
                : el
            )
          }))
          needsSceneUpdate = true
        }
      }

      if (needsSceneUpdate) {
        const { updateCurrentScene } = useEditorStore.getState()
        updateCurrentScene()
      }
    }
  }, [textEditor, computeTextMetrics, computeWrappedTextHeight])

  const handleTextEditorKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeTextEditor(false)
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      closeTextEditor(true)
    }
  }, [closeTextEditor])

  const handleTextEditorBlur = useCallback(() => {
    closeTextEditor(true)
  }, [closeTextEditor])

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

  const isStageElement = useCallback((elementId: string): boolean => {
    const store = useEditorStore.getState()
    const element = store.elements.find(el => el.id === elementId)
    if (element?.type === 'stage') {
      return true
    }
    const group = store.getElementGroup(elementId)
    return group?.name === 'Palco'
  }, [])

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left - viewport.x) / viewport.zoom
    const y = (screenY - rect.top - viewport.y) / viewport.zoom

    return { x, y }
  }, [viewport])

  const getTouchPair = (touchList: TouchList): [Touch, Touch] | null => {
    if (touchList.length < 2) return null
    const first = touchList[0]
    const second = touchList[1]
    if (!first || !second) return null
    return [first, second]
  }

  const getTouchDistance = (touch1: Touch, touch2: Touch) => {
    return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
  }

  const getTouchMidpoint = (touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }

  const clampZoom = (value: number) => Math.max(0.1, Math.min(5, value))

  // Normalize element bounds, handling negative widths/heights (e.g. lines drawn right-to-left)
  const getElementBounds = useCallback((element: Element) => {
    const width = element.width ?? 0
    const height = element.height ?? 0

    const minX = Math.min(element.x, element.x + width)
    const maxX = Math.max(element.x + width, element.x)
    const minY = Math.min(element.y, element.y + height)
    const maxY = Math.max(element.y + height, element.y)

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }, [])

  // Check if point is inside element
  const isPointInElement = useCallback((point: Point, element: Element): boolean => {
    const { x, y, width = 0, height = 0, type } = element

    switch (type) {
      case 'rectangle':
        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height

      case 'circle':
        // Use ellipse geometry for hit detection (supports different width/height)
        const radiusX = width / 2
        const radiusY = height / 2
        const ellipseCenterX = x + radiusX
        const ellipseCenterY = y + radiusY
        // Ellipse equation: (x-cx)²/rx² + (y-cy)²/ry² <= 1
        const normalizedX = (point.x - ellipseCenterX) / radiusX
        const normalizedY = (point.y - ellipseCenterY) / radiusY
        return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1

      case 'line':
      case 'arrow':
        // Enhanced line hit detection with support for curved lines
        const tolerance = 8 // Increased tolerance for better usability
        const startX = x
        const startY = y
        const endX = x + width
        const endY = y + height

        // Check if line has curve
        const hasCurve = element.curveOffsetX !== undefined && element.curveOffsetY !== undefined

        if (hasCurve) {
          // For curved lines, use quadratic bezier curve hit detection
          const midX = (startX + endX) / 2
          const midY = (startY + endY) / 2
          const controlX = midX + element.curveOffsetX!
          const controlY = midY + element.curveOffsetY!

          // Sample points along the bezier curve and find closest distance
          let minDistance = Infinity
          const samples = 20 // Number of sample points along the curve

          for (let i = 0; i <= samples; i++) {
            const t = i / samples
            const invT = 1 - t

            // Quadratic bezier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
            const curveX = invT * invT * startX + 2 * invT * t * controlX + t * t * endX
            const curveY = invT * invT * startY + 2 * invT * t * controlY + t * t * endY

            const distance = Math.sqrt((point.x - curveX) ** 2 + (point.y - curveY) ** 2)
            minDistance = Math.min(minDistance, distance)
          }

          return minDistance <= tolerance
        } else {
          // For straight lines, use original logic but with improved tolerance
          const lineLength = Math.sqrt(width ** 2 + height ** 2)
          if (lineLength === 0) return false

          const t = Math.max(0, Math.min(1,
            ((point.x - startX) * width + (point.y - startY) * height) / (lineLength ** 2)
          ))

          const closestX = startX + t * width
          const closestY = startY + t * height
          const lineDistance = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2)

          return lineDistance <= tolerance
        }

      case 'text':
        const fontSize = element.fontSize ?? 16
        const metrics = computeTextMetrics(element.text || '', fontSize)
        const textWidth = element.width ?? metrics.width
        const textHeight = element.height ?? metrics.height
        return point.x >= x && point.x <= x + textWidth && point.y >= y && point.y <= y + textHeight

      case 'textbox':
        // Textbox uses defined width and height
        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height

      case 'path':
        if (element.pathData) {
          // Precise hit detection for SVG path with transform based on x/y/width/height
          try {
            const path2D = new Path2D(element.pathData)
            const tempCanvas = document.createElement('canvas')
            const tempCtx = tempCanvas.getContext('2d')
            if (tempCtx) {
              const pb = (element as any).pathBounds || { x, y, width, height }
              const sx = pb.width ? (width / pb.width) : 1
              const sy = pb.height ? (height / pb.height) : 1
              tempCtx.save()
              // Apply same transform used in rendering
              tempCtx.translate(x - pb.x, y - pb.y)
              tempCtx.scale(sx, sy)
              const hit = tempCtx.isPointInPath(path2D, point.x, point.y) ||
                tempCtx.isPointInStroke(path2D, point.x, point.y)
              tempCtx.restore()
              return hit
            }
          } catch (error) {
            console.warn('Error in path hit detection, falling back to bounding box:', error)
          }
          // Fallback to bounding box if path detection fails
          return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height
        } else if (element.points && element.points.length >= 2) {
          // Check if point is near any line segment in the freehand path
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

      case 'stage':
        // Stage hit detection - treat as rectangle
        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height

      case 'object':
        // Object hit detection using bounding box (same as square actors)
        return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height

      default:
        return false
    }
  }, [computeTextMetrics])

  // Find element at point (optimized with zIndex priority)
  const getElementAtPoint = useCallback((point: Point): Element | null => {
    // Quick bounds check first, then detailed hit detection
    const candidateElements = elements.filter(element => {
      const { type } = element

      // For 'path' elements with SVG pathData, skip quick bbox filter to avoid false negatives
      if (type === 'path' && (element as any).pathData) {
        return true
      }

      const bounds = getElementBounds(element)
      const padding = (type === 'line' || type === 'arrow') ? 12 : 5

      // Otherwise, use bounding box quick filter with padding
      return point.x >= bounds.minX - padding && point.x <= bounds.maxX + padding &&
        point.y >= bounds.minY - padding && point.y <= bounds.maxY + padding
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
  }, [elements, getElementBounds, isPointInElement])

  // Get resize handles for an element
  const getResizeHandles = useCallback((element: Element) => {
    const { x, y, width = 0, height = 0, type } = element
    const handleSize = 8 / viewport.zoom
    const handles: { id: string, x: number, y: number, cursor: string }[] = []

    if (type === 'rectangle' || type === 'text' || type === 'actor' || type === 'object') {
      // Corner handles
      handles.push(
        { id: 'nw', x: x - handleSize / 2, y: y - handleSize / 2, cursor: 'nw-resize' },
        { id: 'ne', x: x + width - handleSize / 2, y: y - handleSize / 2, cursor: 'ne-resize' },
        { id: 'sw', x: x - handleSize / 2, y: y + height - handleSize / 2, cursor: 'sw-resize' },
        { id: 'se', x: x + width - handleSize / 2, y: y + height - handleSize / 2, cursor: 'se-resize' }
      )

      // Edge handles
      handles.push(
        { id: 'n', x: x + width / 2 - handleSize / 2, y: y - handleSize / 2, cursor: 'n-resize' },
        { id: 's', x: x + width / 2 - handleSize / 2, y: y + height - handleSize / 2, cursor: 's-resize' },
        { id: 'w', x: x - handleSize / 2, y: y + height / 2 - handleSize / 2, cursor: 'w-resize' },
        { id: 'e', x: x + width - handleSize / 2, y: y + height / 2 - handleSize / 2, cursor: 'e-resize' }
      )

      // Border radius handle for rectangles
      if (type === 'rectangle') {
        handles.push(
          { id: 'radius', x: x + width - 15 / viewport.zoom, y: y + 15 / viewport.zoom, cursor: 'pointer' }
        )
      }
    } else if (type === 'circle') {
      // Use ellipse geometry for handles (independent width/height)
      const centerX = x + width / 2
      const centerY = y + height / 2

      // Corner handles for ellipse (like rectangle)
      handles.push(
        { id: 'nw', x: x - handleSize / 2, y: y - handleSize / 2, cursor: 'nw-resize' },
        { id: 'ne', x: x + width - handleSize / 2, y: y - handleSize / 2, cursor: 'ne-resize' },
        { id: 'sw', x: x - handleSize / 2, y: y + height - handleSize / 2, cursor: 'sw-resize' },
        { id: 'se', x: x + width - handleSize / 2, y: y + height - handleSize / 2, cursor: 'se-resize' }
      )

      // Edge handles
      handles.push(
        { id: 'n', x: centerX - handleSize / 2, y: y - handleSize / 2, cursor: 'n-resize' },
        { id: 's', x: centerX - handleSize / 2, y: y + height - handleSize / 2, cursor: 's-resize' },
        { id: 'w', x: x - handleSize / 2, y: centerY - handleSize / 2, cursor: 'w-resize' },
        { id: 'e', x: x + width - handleSize / 2, y: centerY - handleSize / 2, cursor: 'e-resize' }
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
        { id: 'start', x: startX - handleSize / 2, y: startY - handleSize / 2, cursor: 'move' },
        { id: 'end', x: endX - handleSize / 2, y: endY - handleSize / 2, cursor: 'move' },
        { id: 'curve', x: curveX - handleSize / 2, y: curveY - handleSize / 2, cursor: 'crosshair' }
      )
    } else if (type === 'path' && element.pathData) {
      // For path elements from boolean operations, add corner and edge handles
      handles.push(
        { id: 'nw', x: x - handleSize / 2, y: y - handleSize / 2, cursor: 'nw-resize' },
        { id: 'ne', x: x + width - handleSize / 2, y: y - handleSize / 2, cursor: 'ne-resize' },
        { id: 'sw', x: x - handleSize / 2, y: y + height - handleSize / 2, cursor: 'sw-resize' },
        { id: 'se', x: x + width - handleSize / 2, y: y + height - handleSize / 2, cursor: 'se-resize' }
      )

      // Edge handles
      handles.push(
        { id: 'n', x: x + width / 2 - handleSize / 2, y: y - handleSize / 2, cursor: 'n-resize' },
        { id: 's', x: x + width / 2 - handleSize / 2, y: y + height - handleSize / 2, cursor: 's-resize' },
        { id: 'w', x: x - handleSize / 2, y: y + height / 2 - handleSize / 2, cursor: 'w-resize' },
        { id: 'e', x: x + width - handleSize / 2, y: y + height / 2 - handleSize / 2, cursor: 'e-resize' }
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

    // Enhanced feedback for dragging elements
    if (draggedElements.length > 0) {
      setCurrentCursor('grabbing')
      return
    }

    if ((selectedTool === 'text' || selectedTool === 'textbox') && textEditor) {
      setCurrentCursor('text')
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
        const { isElementLocked } = useEditorStore.getState()
        if (!isElementLocked(selectedElement.id)) {
          const handleId = getHandleAtPoint(canvasPoint, selectedElement)
          if (handleId) {
            const handles = getResizeHandles(selectedElement)
            const handle = handles.find(h => h.id === handleId)
            setCurrentCursor(handle?.cursor || 'default')
            return
          }
        }
      }
    }

    // Check if hovering over an element
    const canvasPoint = screenToCanvas(e.clientX, e.clientY)
    const hoveredElement = getElementAtPoint(canvasPoint)

    if (hoveredElement) {
      setHoveredElementId(prev => (prev === hoveredElement.id ? prev : hoveredElement.id))
      // Enhanced feedback for hovering over elements
      if (selectedElements.includes(hoveredElement.id)) {
        setCurrentCursor('move') // Selected element ready to move
      } else {
        setCurrentCursor('pointer') // Unselected element ready to select
      }
    } else {
      if (hoveredElementId !== null) {
        setHoveredElementId(null)
      }
      setCurrentCursor('default')
    }
  }, [isSpacePressed, isPanning, isResizing, draggedElements.length, selectedTool, selectedElements, elements, screenToCanvas, getHandleAtPoint, getResizeHandles, getElementAtPoint, hoveredElementId])

  // Check if element is within selection rectangle
  const isElementInSelection = useCallback((element: Element, start: Point, end: Point): boolean => {
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)

    const { type } = element

    switch (type) {
      case 'rectangle':
      case 'textbox':
      case 'stage':
      case 'object': {
        const bounds = getElementBounds(element)
        return bounds.minX >= minX && bounds.maxX <= maxX && bounds.minY >= minY && bounds.maxY <= maxY
      }

      case 'text': {
        const fontSize = element.fontSize ?? 16
        const metrics = computeTextMetrics(element.text || '', fontSize)
        const textWidth = element.width ?? metrics.width
        const textHeight = element.height ?? metrics.height
        const bounds = getElementBounds({
          ...element,
          width: textWidth,
          height: textHeight
        } as Element)
        return bounds.minX >= minX && bounds.maxX <= maxX && bounds.minY >= minY && bounds.maxY <= maxY
      }

      case 'circle':
      case 'actor': {
        const bounds = getElementBounds(element)
        return bounds.minX >= minX && bounds.maxX <= maxX && bounds.minY >= minY && bounds.maxY <= maxY
      }

      case 'line':
      case 'arrow': {
        const bounds = getElementBounds(element)
        return bounds.minX >= minX && bounds.maxX <= maxX && bounds.minY >= minY && bounds.maxY <= maxY
      }

      case 'path':
        if (element.pathData) {
          // For SVG path data from boolean operations, use bounding box
          const bounds = getElementBounds(element)
          return bounds.minX >= minX && bounds.maxX <= maxX && bounds.minY >= minY && bounds.maxY <= maxY
        } else if (element.points && element.points.length > 0) {
          // For freehand paths with points
          return element.points.every(point =>
            point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
          )
        }
        return false

      default:
        return false
    }
  }, [computeTextMetrics, getElementBounds])

  // Detect alignment guides between elements
  const detectAlignmentGuides = useCallback((draggedElementIds: string[], currentPositions: { [id: string]: { x: number, y: number } }) => {
    const SNAP_THRESHOLD = 10 // pixels
    const guides: { vertical: number[], horizontal: number[] } = { vertical: [], horizontal: [] }

    // Get all non-dragged elements as reference points
    const referenceElements = elements.filter(el => !draggedElementIds.includes(el.id))

    // Get dragged elements with their current positions
    const draggedElements = elements.filter(el => draggedElementIds.includes(el.id))

    // Normalize bounds for any element, handling negative width/height (lines drawn right-to-left)
    const getAlignBounds = (el: Element, pos?: { x: number; y: number }) => {
      const x = pos?.x ?? el.x
      const y = pos?.y ?? el.y
      const w = el.width ?? 0
      const h = el.height ?? 0
      const left = Math.min(x, x + w)
      const right = Math.max(x, x + w)
      const top = Math.min(y, y + h)
      const bottom = Math.max(y, y + h)
      return { left, right, top, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 }
    }

    draggedElements.forEach(draggedEl => {
      const currentPos = currentPositions[draggedEl.id] || { x: draggedEl.x, y: draggedEl.y }
      const dragged = getAlignBounds(draggedEl, currentPos)

      referenceElements.forEach(refEl => {
        const ref = getAlignBounds(refEl)

        // Vertical alignment checks
        // Left edges
        if (Math.abs(dragged.left - ref.left) <= SNAP_THRESHOLD) {
          guides.vertical.push(ref.left)
        }
        // Centers
        if (Math.abs(dragged.centerX - ref.centerX) <= SNAP_THRESHOLD) {
          guides.vertical.push(ref.centerX)
        }
        // Right edges
        if (Math.abs(dragged.right - ref.right) <= SNAP_THRESHOLD) {
          guides.vertical.push(ref.right)
        }

        // Horizontal alignment checks
        // Top edges
        if (Math.abs(dragged.top - ref.top) <= SNAP_THRESHOLD) {
          guides.horizontal.push(ref.top)
        }
        // Centers
        if (Math.abs(dragged.centerY - ref.centerY) <= SNAP_THRESHOLD) {
          guides.horizontal.push(ref.centerY)
        }
        // Bottom edges
        if (Math.abs(dragged.bottom - ref.bottom) <= SNAP_THRESHOLD) {
          guides.horizontal.push(ref.bottom)
        }
      })
    })

    // Remove duplicates and sort
    guides.vertical = [...new Set(guides.vertical)].sort((a, b) => a - b)
    guides.horizontal = [...new Set(guides.horizontal)].sort((a, b) => a - b)

    return guides
  }, [elements])

  // Get elements within selection rectangle (optimized with memoization)
  const getElementsInSelection = useCallback((start: Point, end: Point): string[] => {
    // Only check elements that could potentially be in the selection area
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)

    // Quick bounds check before detailed intersection
    const potentialElements = elements.filter(element => {
      const bounds = getElementBounds(element)
      return !(bounds.minX > maxX || bounds.maxX < minX || bounds.minY > maxY || bounds.maxY < minY)
    })

    const { isElementLocked } = useEditorStore.getState()
    return potentialElements
      .filter(element => isElementInSelection(element, start, end))
      .filter(element => !(stageConfig?.locked && isStageElement(element.id) && isElementLocked(element.id)))
      .map(element => element.id)
  }, [elements, getElementBounds, isElementInSelection, stageConfig, isStageElement])

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Prevent default for all mouse interactions to avoid conflicts
    e.preventDefault()

    // Ignore middle button entirely (wheel click)
    if (e.button === 1) {
      e.stopPropagation()
      return
    }

    const canvasPoint = screenToCanvas(e.clientX, e.clientY)
    const clickedElement = getElementAtPoint(canvasPoint)

    if (textEditor) {
      closeTextEditor(true)
      // Switch to select tool to prevent creating a new element on the same click
      if (selectedTool === 'text' || selectedTool === 'textbox') {
        useEditorStore.getState().setSelectedTool('select')
      }
      return
    }

    if (e.button === 0 && e.detail === 2 && clickedElement) {
      const { isElementLocked } = useEditorStore.getState()
      if ((clickedElement.type === 'text' || clickedElement.type === 'textbox') && !isElementLocked(clickedElement.id)) {
        e.stopPropagation()
        openTextEditor(clickedElement)
        return
      }
    }

    const isPanGesture =
      e.button === 2 ||
      (e.button === 0 && isSpacePressed)

    // Handle middle/right mouse button or space+drag for panning
    if (isPanGesture) {
      e.stopPropagation()

      // Check if stage is configured and locked - prevent panning
      if (stageConfig && stageConfig.locked) {
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          text: 'Canvas bloqueado - Palco configurado'
        })
        setTimeout(() => setTooltip(null), 2000)
        return
      }

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
          // Não iniciar resize para elementos travados
          const { isElementLocked } = useEditorStore.getState()
          if (isElementLocked(element.id)) {
            continue
          }
          const handleId = getHandleAtPoint(canvasPoint, element)
          if (handleId) {
            // Prevent default to avoid conflicts
            e.preventDefault()
            e.stopPropagation()

            // Start resizing
            setIsResizing(true)
            setResizeHandle(handleId)
            setResizeStartPoint(canvasPoint)

            // Use pathBounds for path elements (result of boolean operations) if available
            // This ensures the resize works correctly with the actual visual bounds
            let initialBounds = {
              x: element.x,
              y: element.y,
              width: element.width || 0,
              height: element.height || 0
            }

            // For path elements, ensure we have valid dimensions
            if (element.type === 'path') {
              // If pathBounds exists and current dimensions are 0 or invalid, use pathBounds
              if (element.pathBounds && (initialBounds.width <= 0 || initialBounds.height <= 0)) {
                initialBounds.width = element.pathBounds.width
                initialBounds.height = element.pathBounds.height
              }
              // Ensure minimum size for paths
              initialBounds.width = Math.max(10, initialBounds.width)
              initialBounds.height = Math.max(10, initialBounds.height)
            }

            setResizeStartBounds(initialBounds)
            return
          }
        }
      }

      // Then check for element selection
      if (clickedElement) {
        const storeState = useEditorStore.getState()
        const { isElementLocked } = storeState
        if (stageConfig?.locked && isElementLocked(clickedElement.id) && isStageElement(clickedElement.id)) {
          setTooltip({
            x: e.clientX,
            y: e.clientY,
            text: 'Palco bloqueado - destrave para editar'
          })
          setTimeout(() => setTooltip(null), 2000)
          return
        }

        // Get all elements in the same group as the clicked element
        const groupElements = getGroupElements(clickedElement.id)

        // Determine what elements will be selected/moved BEFORE updating selection
        let elementsToMove: string[]

        if (e.ctrlKey || e.metaKey) {
          // Multi-select - toggle group selection
          const isGroupSelected = groupElements.every(id => selectedElements.includes(id))
          const newSelection = isGroupSelected
            ? selectedElements.filter(id => !groupElements.includes(id))
            : [...new Set([...selectedElements, ...groupElements])]
          onSelectElements(newSelection)
          // For multi-select, use the new computed selection
          elementsToMove = newSelection
        } else {
          // Single select - select entire group if not already selected
          const isGroupSelected = groupElements.every(id => selectedElements.includes(id))
          if (!isGroupSelected) {
            onSelectElements(groupElements)
          }
          // For single select, use the group elements (what we just selected or was already selected)
          elementsToMove = isGroupSelected ? selectedElements : groupElements
        }

        // Filter out locked elements from dragging
        const unlocked = elementsToMove.filter(id => !isElementLocked(id))

        setDraggedElements(unlocked)

        // Calculate offset from the first unlocked element (reference element used in drag delta calculation)
        // This ensures consistency between where we click and how we calculate movement
        const referenceElement = elements.find(el => el.id === unlocked[0])
        if (referenceElement) {
          setDragOffset({
            x: canvasPoint.x - referenceElement.x,
            y: canvasPoint.y - referenceElement.y
          })
        } else {
          // Fallback to clicked element if reference not found
          setDragOffset({
            x: canvasPoint.x - clickedElement.x,
            y: canvasPoint.y - clickedElement.y
          })
        }
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

    // Handle eraser tool
    if (selectedTool === 'eraser') {
      // Find elements under the cursor
      const elementsUnderCursor = elements.filter(element => {
        if (element.locked) return false

        // Check if point is inside element bounds
        const elementBounds = getElementBounds(element)

        // For path elements (pen tool), check if point is near the path
        if (element.type === 'path' && element.points) {
          const tolerance = 10 // pixels
          return element.points.some(point => {
            const distance = Math.sqrt(
              Math.pow(canvasPoint.x - point.x, 2) +
              Math.pow(canvasPoint.y - point.y, 2)
            )
            return distance <= tolerance
          })
        }

        // For other elements, check if point is inside bounds
        return canvasPoint.x >= elementBounds.minX &&
          canvasPoint.x <= elementBounds.maxX &&
          canvasPoint.y >= elementBounds.minY &&
          canvasPoint.y <= elementBounds.maxY
      })

      // Delete elements under cursor
      if (elementsUnderCursor.length > 0) {
        const { deleteElements } = useEditorStore.getState()
        deleteElements(elementsUnderCursor.map(el => el.id))
      }

      setIsDrawing(true) // Allow continuous erasing while dragging
      return
    }

    if (selectedTool === 'text' || selectedTool === 'textbox') {
      pendingTextElementRef.current = true
    }
    setIsDrawing(true)
    setStartPoint(canvasPoint)

    const properties = getCurrentProperties()

    let elementType: Element['type']
    if (selectedTool === 'pen') {
      elementType = 'path'
    } else if (selectedTool === 'textbox') {
      elementType = 'textbox'
    } else {
      elementType = selectedTool as Element['type']
    }

    const newElement: Partial<Element> = {
      type: elementType,
      x: canvasPoint.x,
      y: canvasPoint.y,
      ...properties
    }

    if (selectedTool === 'pen') {
      newElement.points = [canvasPoint]
    } else if (selectedTool === 'text') {
      const fontSize = properties.fontSize ?? 16
      newElement.text = ''
      newElement.width = fontSize * 3
      newElement.height = fontSize * 1.2
    } else if (selectedTool === 'textbox') {
      const fontSize = properties.fontSize ?? 16
      newElement.text = ''
      newElement.width = 300
      newElement.height = fontSize * 1.5
      newElement.textBoxConfig = {
        previewMode: 'full',
        fullText: ''
      }
      newElement.fillColor = 'transparent'
      // strokeColor is used for text color, NOT for border
      newElement.strokeColor = '#000000'
    }

    setCurrentElement(newElement)
  }, [selectedTool, selectedElements, screenToCanvas, getElementAtPoint, onSelectElements, onClearSelection, getCurrentProperties, getGroupElements, getElementBounds, isSpacePressed])

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
        const safeStartWidth = Math.max(1, resizeStartBounds.width)
        const safeStartHeight = Math.max(1, resizeStartBounds.height)

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
              const maxRadius = Math.min(safeStartWidth, safeStartHeight) / 2
              const radiusValue = Math.max(0, Math.min(Math.abs(deltaX + deltaY) / 2, maxRadius))

              // Apply the border radius immediately
              onUpdateElement(element.id, { borderRadius: radiusValue }, { commitHistory: false })

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
              }, { commitHistory: false })

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
        newBounds.width = Math.max(1, newBounds.width)
        newBounds.height = Math.max(1, newBounds.height)

        // Apply snap to grid for position and size
        if (snapEnabled) {
          newBounds.x = snapToGrid(newBounds.x)
          newBounds.y = snapToGrid(newBounds.y)
          newBounds.width = snapToSize(newBounds.width)
          newBounds.height = snapToSize(newBounds.height)
        }

        // Maintain aspect ratio for circular actors (always), objects (always), and other elements with Shift key
        const shouldMaintainAspectRatio = (element.type === 'actor' && element.actorShape === 'circle') ||
          element.type === 'object' ||
          (isShiftPressed && (resizeHandle === 'nw' || resizeHandle === 'ne' || resizeHandle === 'sw' || resizeHandle === 'se'))

        if (shouldMaintainAspectRatio) {
          if (element.type === 'actor' && element.actorShape === 'circle') {
            // For circular actors, always maintain 1:1 aspect ratio (perfect circle)
            const size = Math.max(newBounds.width, newBounds.height)
            newBounds.width = size
            newBounds.height = size

            // Adjust position for corner handles to maintain circle center
            if (resizeHandle === 'nw') {
              newBounds.x = resizeStartBounds.x + resizeStartBounds.width - newBounds.width
              newBounds.y = resizeStartBounds.y + resizeStartBounds.height - newBounds.height
            } else if (resizeHandle === 'ne') {
              newBounds.y = resizeStartBounds.y + resizeStartBounds.height - newBounds.height
            } else if (resizeHandle === 'sw') {
              newBounds.x = resizeStartBounds.x + resizeStartBounds.width - newBounds.width
            }
          } else if (element.type === 'object') {
            // For objects, always maintain 1:1 aspect ratio (square proportions)
            const size = Math.max(newBounds.width, newBounds.height)
            newBounds.width = size
            newBounds.height = size

            // Adjust position for corner handles to maintain object center
            if (resizeHandle === 'nw') {
              newBounds.x = resizeStartBounds.x + resizeStartBounds.width - newBounds.width
              newBounds.y = resizeStartBounds.y + resizeStartBounds.height - newBounds.height
            } else if (resizeHandle === 'ne') {
              newBounds.y = resizeStartBounds.y + resizeStartBounds.height - newBounds.height
            } else if (resizeHandle === 'sw') {
              newBounds.x = resizeStartBounds.x + resizeStartBounds.width - newBounds.width
            }
          } else {
            // For other elements with Shift key, maintain original aspect ratio
            const aspectRatio = safeStartWidth / safeStartHeight
            const safeNewHeight = Math.max(1, newBounds.height)
            if (newBounds.width / safeNewHeight > aspectRatio) {
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
        }

        newBounds.width = Math.max(1, newBounds.width)
        newBounds.height = Math.max(1, newBounds.height)

        // Apply changes directly during resize for immediate feedback
        onUpdateElement(element.id, newBounds, { commitHistory: false })

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

      // Calculate the movement delta from the first unlocked element (reference element)
      const firstElement = elements.find(el => el.id === unlocked[0])
      if (!firstElement) {
        return
      }

        // Calculate raw delta (before any snapping)
        let deltaX = newX - firstElement.x
        let deltaY = newY - firstElement.y

        // Apply snap to grid ONLY on the reference element's new position
        // Then calculate the snapped delta to apply to ALL elements
        let referenceNewX = firstElement.x + deltaX
        let referenceNewY = firstElement.y + deltaY

        if (snapEnabled) {
          const snappedX = snapToGrid(referenceNewX)
          const snappedY = snapToGrid(referenceNewY)
          // Calculate the snapped delta - this same delta will be applied to all elements
          deltaX = snappedX - firstElement.x
          deltaY = snappedY - firstElement.y
          referenceNewX = snappedX
          referenceNewY = snappedY
        }

        // Calculate new positions for all dragged elements using the SAME delta
        // This preserves relative positions between grouped elements
        const newPositions: { [id: string]: { x: number, y: number } } = {}
        unlocked.forEach(elementId => {
          const element = elements.find(el => el.id === elementId)
          if (element) {
            // Apply the same delta to all elements (no individual snapping)
            newPositions[elementId] = {
              x: element.x + deltaX,
              y: element.y + deltaY
            }
          }
        })

        // Detect alignment guides using the reference element
        const guides = detectAlignmentGuides(unlocked, newPositions)
        setGuideLines(guides)

        // Apply snap to alignment guides ONLY on the reference element
        // Then adjust all elements by the same offset
        const SNAP_THRESHOLD = 10
        let guideSnapOffsetX = 0
        let guideSnapOffsetY = 0

        // Check reference element against guides
        const refElement = firstElement
        const refPos = newPositions[refElement.id]
        if (refPos) {
          const elementCenterX = refPos.x + (refElement.width || 0) / 2
          const elementRight = refPos.x + (refElement.width || 0)

          for (const guideX of guides.vertical) {
            // Snap left edge
            if (Math.abs(refPos.x - guideX) <= SNAP_THRESHOLD) {
              guideSnapOffsetX = guideX - refPos.x
              break
            }
            // Snap center
            if (Math.abs(elementCenterX - guideX) <= SNAP_THRESHOLD) {
              guideSnapOffsetX = guideX - elementCenterX
              break
            }
            // Snap right edge
            if (Math.abs(elementRight - guideX) <= SNAP_THRESHOLD) {
              guideSnapOffsetX = guideX - elementRight
              break
            }
          }

          const elementCenterY = refPos.y + (refElement.height || 0) / 2
          const elementBottom = refPos.y + (refElement.height || 0)

          for (const guideY of guides.horizontal) {
            // Snap top edge
            if (Math.abs(refPos.y - guideY) <= SNAP_THRESHOLD) {
              guideSnapOffsetY = guideY - refPos.y
              break
            }
            // Snap center
            if (Math.abs(elementCenterY - guideY) <= SNAP_THRESHOLD) {
              guideSnapOffsetY = guideY - elementCenterY
              break
            }
            // Snap bottom edge
            if (Math.abs(elementBottom - guideY) <= SNAP_THRESHOLD) {
              guideSnapOffsetY = guideY - elementBottom
              break
            }
          }
        }

        // Apply guide snap offset to all elements (same offset for all)
        if (guideSnapOffsetX !== 0 || guideSnapOffsetY !== 0) {
          unlocked.forEach(elementId => {
            const pos = newPositions[elementId]
            if (pos) {
              newPositions[elementId] = {
                x: pos.x + guideSnapOffsetX,
                y: pos.y + guideSnapOffsetY
              }
            }
          })
        }

        // Calculate the final delta to use for stage circle elements
        const finalDeltaX = deltaX + guideSnapOffsetX
        const finalDeltaY = deltaY + guideSnapOffsetY

        // Move all unlocked dragged elements using the calculated positions
        unlocked.forEach(elementId => {
          const element = elements.find(el => el.id === elementId)
          if (element) {
            const finalPosition = newPositions[elementId]
            if (!finalPosition) {
              return
            }

            const { x: finalX, y: finalY } = finalPosition

            // For stage elements, also move the circle properties by the same delta
            if (element.type === 'stage' && element.circleX !== undefined && element.circleY !== undefined) {
              onUpdateElement(elementId, {
                x: finalX,
                y: finalY,
                circleX: element.circleX + finalDeltaX,
                circleY: element.circleY + finalDeltaY
              }, { commitHistory: false })
            } else {
              onUpdateElement(elementId, {
                x: finalX,
                y: finalY
              }, { commitHistory: false })
            }
          }
        })
      return
    }

    // Handle eraser tool during drag
    if (isDrawing && selectedTool === 'eraser') {
      // Find elements under the cursor
      const elementsUnderCursor = elements.filter(element => {
        if (element.locked) return false

        // Check if point is inside element bounds
        const elementBounds = getElementBounds(element)

        // For path elements (pen tool), check if point is near the path
        if (element.type === 'path' && element.points) {
          const tolerance = 10 // pixels
          return element.points.some(point => {
            const distance = Math.sqrt(
              Math.pow(canvasPoint.x - point.x, 2) +
              Math.pow(canvasPoint.y - point.y, 2)
            )
            return distance <= tolerance
          })
        }

        // For other elements, check if point is inside bounds
        return canvasPoint.x >= elementBounds.minX &&
          canvasPoint.x <= elementBounds.maxX &&
          canvasPoint.y >= elementBounds.minY &&
          canvasPoint.y <= elementBounds.maxY
      })

      // Delete elements under cursor
      if (elementsUnderCursor.length > 0) {
        const { deleteElements } = useEditorStore.getState()
        deleteElements(elementsUnderCursor.map(el => el.id))
      }
      return
    }

    // Handle drawing
    if (isDrawing && currentElement && startPoint) {
      const updatedElement = { ...currentElement }

      switch (selectedTool) {
        case 'rectangle':
        case 'circle':
        case 'textbox':
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
  }, [isPanning, lastPanPoint, draggedElements, selectedTool, isDrawing, currentElement, startPoint, viewport, onUpdateViewport, dragOffset, elements, onUpdateElement, screenToCanvas, isSelecting, selectionStart, isResizing, resizeHandle, resizeStartPoint, resizeStartBounds, isShiftPressed, snapEnabled, snapToGrid, snapToSize, getElementBounds])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    const hadDragging = draggedElements.length > 0
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

    const shouldSwitchToSelect = isDrawing && currentElement && !['select', 'pen', 'eraser'].includes(selectedTool)

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
    // Clear guide lines when dragging ends
    setGuideLines({ vertical: [], horizontal: [] })
    // Apply resize changes and save to history when finishing resize
    if (isResizing && resizePreview && selectedElements.length === 1) {
      const elementId = selectedElements[0]
      const element = elements.find(el => el.id === elementId)

      if (element) {
        const updates: Partial<Element> = {
          x: resizePreview.x,
          y: resizePreview.y,
          width: resizePreview.width,
          height: resizePreview.height,
          ...(resizePreview.borderRadius !== undefined && { borderRadius: resizePreview.borderRadius })
        }

        // Update pathBounds for path elements with pathData to maintain consistency
        if (element.type === 'path' && element.pathData && element.pathBounds) {
          const originalBounds = element.pathBounds
          const scaleX = resizePreview.width / (element.width || 1)
          const scaleY = resizePreview.height / (element.height || 1)

          updates.pathBounds = {
            x: resizePreview.x,
            y: resizePreview.y,
            width: originalBounds.width * scaleX,
            height: originalBounds.height * scaleY
          }
        }

        onUpdateElement(elementId, updates)

        const { saveToHistory } = useEditorStore.getState()
        saveToHistory()
      }
    }

    setIsResizing(false)
    setResizeHandle(null)
    setResizeStartPoint(null)
    setResizeStartBounds(null)
    setResizePreview(null)
    setTooltip(null)
    setHoveredElementId(null)

    if (hadDragging) {
      const { saveToHistory } = useEditorStore.getState()
      saveToHistory()
    }

    if (shouldSwitchToSelect) {
      const { setSelectedTool } = useEditorStore.getState()
      setSelectedTool('select')
    }
  }, [isDrawing, currentElement, onAddElement, isSelecting, selectionStart, selectionEnd, getElementsInSelection, getGroupElements, selectedElements, onSelectElements, isResizing, resizePreview, elements, onUpdateElement, draggedElements, selectedTool])

  // Handle wheel for zoom and trackpad scrolling
  const handleWheel = useCallback((event: WheelEvent) => {
    // Always block browser zoom/scroll when handling the gesture ourselves
    if (event.cancelable) {
      event.preventDefault()
    }
    event.stopPropagation()

    // Check if stage is configured and locked - prevent viewport changes
    if (stageConfig && stageConfig.locked) {
      return
    }

    if (event.ctrlKey || event.metaKey) {
      // Zoom with Ctrl / Cmd + scroll
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
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
    } else {
      // Trackpad two-finger pan or regular scroll
      const modeScale = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
        ? 1
        : event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : 100

      let deltaX = event.deltaX * modeScale
      let deltaY = event.deltaY * modeScale

      // Holding shift should force horizontal scroll (common UX)
      if (event.shiftKey && Math.abs(deltaY) > Math.abs(deltaX)) {
        deltaX = deltaY
        deltaY = 0
      }

      if (deltaX !== 0 || deltaY !== 0) {
        onUpdateViewport({
          ...viewport,
          x: viewport.x + deltaX,
          y: viewport.y + deltaY
        })
      }
    }
  }, [viewport, onUpdateViewport, stageConfig])

  // Attach wheel listener manually to ensure passive: false (required to block browser zoom)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const wheelListener = (event: WheelEvent) => handleWheel(event)
    canvas.addEventListener('wheel', wheelListener, { passive: false })

    return () => {
      canvas.removeEventListener('wheel', wheelListener)
    }
  }, [handleWheel])

  // Render function
  const drawHoverOutline = useCallback((ctx: CanvasRenderingContext2D, element: Element, color: string) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2 / viewport.zoom
    ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom])

    const { x = 0, y = 0 } = element
    const width = element.width ?? 0
    const height = element.height ?? 0

    switch (element.type) {
      case 'text': {
        const fontSize = element.fontSize ?? 16
        const { width: textWidth, height: textHeight } = computeTextMetrics(element.text || '', fontSize)
        const rectWidth = element.width ?? textWidth
        const rectHeight = element.height ?? textHeight
        ctx.strokeRect(x - 2, y - 2, rectWidth + 4, rectHeight + 4)
        break
      }
      case 'textbox':
      case 'rectangle':
      case 'stage':
      case 'object':
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
        break
      case 'circle':
      case 'actor': {
        // Use ellipse for hover to match rendering
        const hoverRadiusX = width / 2
        const hoverRadiusY = height / 2
        const hoverCenterX = x + hoverRadiusX
        const hoverCenterY = y + hoverRadiusY
        ctx.beginPath()
        ctx.ellipse(hoverCenterX, hoverCenterY, hoverRadiusX + 2, hoverRadiusY + 2, 0, 0, 2 * Math.PI)
        ctx.stroke()
        break
      }
      case 'line':
      case 'arrow': {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + width, y + height)
        ctx.stroke()
        break
      }
      case 'path': {
        if (element.pathData) {
          try {
            const path2D = new Path2D(element.pathData)
            const pb = (element as any).pathBounds || { x, y, width, height }
            const sx = pb.width ? ((element.width ?? pb.width) / pb.width) : 1
            const sy = pb.height ? ((element.height ?? pb.height) / pb.height) : 1
            ctx.save()
            ctx.translate((element.x ?? 0) - pb.x, (element.y ?? 0) - pb.y)
            ctx.scale(sx, sy)
            ctx.stroke(path2D)
            ctx.restore()
            break
          } catch {
            ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
            break
          }
        }
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
        break
      }
      default:
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
        break
    }

    ctx.restore()
  }, [computeTextMetrics, viewport.zoom])

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

    // Draw stage (behind elements but above grid)
    drawStage(ctx, viewport)

    // Draw elements sorted by zIndex (lowest to highest)
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    sortedElements.forEach(element => {
      const isSelected = selectedElements.includes(element.id)
      const isBeingDragged = draggedElements.includes(element.id)
      const isBeingEdited = textEditor?.elementId === element.id

      if (isBeingDragged) {
        ctx.save()
        ctx.globalAlpha = 0.7
        drawElement(ctx, element, isSelected, isBeingEdited)
        ctx.restore()
      } else {
        drawElement(ctx, element, isSelected, isBeingEdited)
      }
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

    // Draw guide lines
    if (guideLines.vertical.length > 0 || guideLines.horizontal.length > 0) {
      ctx.save()
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 1 / viewport.zoom
      ctx.setLineDash([8 / viewport.zoom, 4 / viewport.zoom])
      ctx.globalAlpha = 0.8

      // Draw vertical guide lines
      guideLines.vertical.forEach(x => {
        ctx.beginPath()
        ctx.moveTo(x, -viewport.y / viewport.zoom)
        ctx.lineTo(x, (-viewport.y + canvas.height) / viewport.zoom)
        ctx.stroke()
      })

      // Draw horizontal guide lines
      guideLines.horizontal.forEach(y => {
        ctx.beginPath()
        ctx.moveTo(-viewport.x / viewport.zoom, y)
        ctx.lineTo((-viewport.x + canvas.width) / viewport.zoom, y)
        ctx.stroke()
      })

      ctx.restore()
    }

    if (hoverPreviewEnabled && hoveredElementId) {
      const hoveredElement = elements.find(el => el.id === hoveredElementId)
      if (hoveredElement) {
        drawHoverOutline(ctx, hoveredElement, hoverPreviewColor)
      }
    }

    ctx.restore()
  }, [elements, selectedElements, currentElement, viewport, containerRef, isSelecting, selectionStart, selectionEnd, stageConfig, guideLines, draggedElements, isResizing, resizePreview, hoverPreviewEnabled, hoveredElementId, hoverPreviewColor, drawHoverOutline, textEditor])

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
  // Draw stage
  const drawStage = (ctx: CanvasRenderingContext2D, viewport: Viewport) => {
    if (!stageConfig || !stageConfig.visible) return
    // Não desenhar overlay de palco se já existir um elemento do tipo 'stage'
    if (elements && elements.some(el => el.type === 'stage')) {
      return
    }

    ctx.save()

    const { x, y, width, height, shape, backgroundColor, borderColor, borderWidth } = stageConfig

    // Set styles
    ctx.fillStyle = backgroundColor
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth / viewport.zoom
    ctx.globalAlpha = 1

    // Draw based on shape
    switch (shape) {
      case 'rectangle':
        ctx.fillRect(x, y, width, height)
        if (borderWidth > 0) {
          ctx.strokeRect(x, y, width, height)
        }
        break

      case 'circle':
        // Use ellipse to support different width/height (allows circle to become oval)
        const circleRadiusX = width / 2
        const circleRadiusY = height / 2
        const circleCenterX = x + circleRadiusX
        const circleCenterY = y + circleRadiusY

        ctx.beginPath()
        ctx.ellipse(circleCenterX, circleCenterY, circleRadiusX, circleRadiusY, 0, 0, 2 * Math.PI)
        ctx.fill()
        if (borderWidth > 0) {
          ctx.stroke()
        }
        break

      case 'oval':
        const radiusX = width / 2
        const radiusY = height / 2
        const ovalCenterX = x + radiusX
        const ovalCenterY = y + radiusY

        ctx.beginPath()
        ctx.ellipse(ovalCenterX, ovalCenterY, radiusX, radiusY, 0, 0, 2 * Math.PI)
        ctx.fill()
        if (borderWidth > 0) {
          ctx.stroke()
        }
        break

      case 'triangle':
        // Draw triangle
        ctx.beginPath()
        ctx.moveTo(x + width / 2, y) // Top point
        ctx.lineTo(x, y + height) // Bottom left
        ctx.lineTo(x + width, y + height) // Bottom right
        ctx.closePath()
        if (element.fillColor !== 'transparent') {
          ctx.fill()
        }
        ctx.stroke()
        break

      case 'square':
        // Draw square (always square, not rectangle)
        const squareSize = Math.min(width, height)
        const squareX = x + (width - squareSize) / 2
        const squareY = y + (height - squareSize) / 2
        if (element.fillColor !== 'transparent') {
          ctx.fillRect(squareX, squareY, squareSize, squareSize)
        }
        ctx.strokeRect(squareX, squareY, squareSize, squareSize)
        break

      case 'hexagon':
        // Draw hexagon
        const hexRadius = Math.min(width, height) / 2
        const hexCenterX = x + width / 2
        const hexCenterY = y + height / 2

        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3
          const pointX = hexCenterX + hexRadius * Math.cos(angle)
          const pointY = hexCenterY + hexRadius * Math.sin(angle)

          if (i === 0) {
            ctx.moveTo(pointX, pointY)
          } else {
            ctx.lineTo(pointX, pointY)
          }
        }
        ctx.closePath()
        if (element.fillColor !== 'transparent') {
          ctx.fill()
        }
        ctx.stroke()
        break
    }

    // Draw stage label if locked
    if (stageConfig.locked) {
      ctx.fillStyle = '#ff0000'
      ctx.font = `${12 / viewport.zoom}px Arial`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('🔒 PALCO BLOQUEADO', x + 5, y + 5)
    }

    ctx.restore()
  }

  // Draw element
  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: Partial<Element>, isSelected: boolean, skipTextRendering = false) => {
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
        // Use ellipse for different width/height support
        const previewRadiusX = width / 2
        const previewRadiusY = height / 2
        ctx.beginPath()
        ctx.ellipse(x + previewRadiusX, y + previewRadiusY, previewRadiusX, previewRadiusY, 0, 0, 2 * Math.PI)
        if (element.fillColor !== 'transparent') {
          ctx.fill()
        }
        ctx.stroke()
        break

      case 'line':
        // Apply stroke dash array if specified
        if (element.strokeDasharray) {
          const dashArray = element.strokeDasharray.split(',').map(Number)
          ctx.setLineDash(dashArray.map(d => d / viewport.zoom))
        }

        // Set line cap to round for rounded ends
        ctx.lineCap = 'round'

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

        // Reset line dash and line cap
        if (element.strokeDasharray) {
          ctx.setLineDash([])
        }
        ctx.lineCap = 'butt'
        break

      case 'arrow':
        // Apply stroke dash array if specified
        if (element.strokeDasharray) {
          const dashArray = element.strokeDasharray.split(',').map(Number)
          ctx.setLineDash(dashArray.map(d => d / viewport.zoom))
        }

        // Set line cap to round for rounded ends
        ctx.lineCap = 'round'

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

        // Reset line dash and line cap
        if (element.strokeDasharray) {
          ctx.setLineDash([])
        }
        ctx.lineCap = 'butt'
        break

      case 'text': {
        const fontSize = element.fontSize ?? 16
        const { lines, lineHeight } = computeTextMetrics(element.text || '', fontSize)
        ctx.save()
        ctx.globalAlpha = element.opacity ?? 1
        ctx.font = `${fontSize}px Arial`
        ctx.fillStyle = element.strokeColor || '#000000'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        lines.forEach((line, index) => {
          const content = line === '' ? ' ' : line
          ctx.fillText(content, x, y + index * lineHeight)
        })
        ctx.restore()
        break
      }

      case 'textbox':
        // Draw textbox background only if explicitly set
        if (element.fillColor && element.fillColor !== 'transparent') {
          ctx.fillStyle = element.fillColor
          ctx.fillRect(x, y, width, height)
        }

        // No border rect for textbox — strokeColor is used for text color only

        // Draw text content based on preview mode
        const baseText = element.text ?? element.textBoxConfig?.fullText ?? ''

        if (baseText && !skipTextRendering) {
          ctx.save()
          ctx.font = `${(element.fontSize || 16) / viewport.zoom}px Arial`
          ctx.fillStyle = (element.strokeColor && element.strokeColor !== 'transparent') ? element.strokeColor : '#000000'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'

          const padding = 8 / viewport.zoom
          const textX = x + padding
          const textY = y + padding
          const textWidth = width - (padding * 2)
          const textHeight = height - (padding * 2)

          let displayText = baseText
          const previewMode = element.textBoxConfig?.previewMode || 'full'

          if (previewMode !== 'full') {
            const maxChars = Math.floor(textWidth / ((element.fontSize || 16) * 0.6 / viewport.zoom))

            switch (previewMode) {
              case 'start':
                displayText = baseText.length > maxChars
                  ? baseText.substring(0, Math.max(0, maxChars - 3)) + '...'
                  : baseText
                break
              case 'end':
                displayText = baseText.length > maxChars
                  ? '...' + baseText.substring(Math.max(0, baseText.length - (Math.max(0, maxChars - 3))))
                  : baseText
                break
              case 'start-end':
                if (baseText.length > maxChars) {
                  const halfChars = Math.floor((maxChars - 3) / 2)
                  displayText = baseText.substring(0, Math.max(0, halfChars)) + '...' +
                    baseText.substring(baseText.length - Math.max(0, halfChars))
                }
                break
            }
          }

          // Text wrapping with newline support
          const paragraphs = displayText.split('\n')
          const lines: string[] = []

          for (const paragraph of paragraphs) {
            if (paragraph === '') {
              lines.push('')
              continue
            }
            const words = paragraph.split(' ')
            let currentLine = ''
            for (const word of words) {
              const testLine = currentLine + (currentLine ? ' ' : '') + word
              const testWidth = ctx.measureText(testLine).width
              if (testWidth > textWidth && currentLine) {
                lines.push(currentLine)
                currentLine = word
              } else {
                currentLine = testLine
              }
            }
            if (currentLine) {
              lines.push(currentLine)
            }
          }

          // Draw lines (no clipping — let text overflow)
          const lineHeight = (element.fontSize || 16) * 1.2 / viewport.zoom
          lines.forEach((line, index) => {
            ctx.fillText(line, textX, textY + (index * lineHeight))
          })

          ctx.restore()
        }
        break

      case 'path':
        if (element.pathData) {
          // Render SVG path data from boolean operations with transform
          const path2D = new Path2D(element.pathData)
          const pb = (element as any).pathBounds || { x, y, width, height }
          // Use current element dimensions for consistent scaling during resize
          const currentWidth = element.width || width
          const currentHeight = element.height || height
          const sx = pb.width ? (currentWidth / pb.width) : 1
          const sy = pb.height ? (currentHeight / pb.height) : 1
          ctx.save()
          ctx.translate(x - pb.x, y - pb.y)
          ctx.scale(sx, sy)
          if (element.fillColor && element.fillColor !== 'transparent') {
            ctx.fillStyle = element.fillColor
            ctx.fill(path2D)
          }
          if (element.strokeColor) {
            ctx.strokeStyle = element.strokeColor
            ctx.lineWidth = (element.strokeWidth || 1) / viewport.zoom
            ctx.stroke(path2D)
          }
          ctx.restore()
        } else if (element.points && element.points.length > 1) {
          // Render freehand path with smooth curves using quadratic bezier
          ctx.beginPath()
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          const points = element.points

          if (points.length === 2) {
            // Just draw a line for 2 points
            ctx.moveTo(points[0].x, points[0].y)
            ctx.lineTo(points[1].x, points[1].y)
          } else {
            // Use quadratic curves through midpoints for smooth path
            ctx.moveTo(points[0].x, points[0].y)

            for (let i = 0; i < points.length - 1; i++) {
              const current = points[i]
              const next = points[i + 1]

              // Calculate midpoint
              const midX = (current.x + next.x) / 2
              const midY = (current.y + next.y) / 2

              // Draw quadratic curve to midpoint, using current point as control
              ctx.quadraticCurveTo(current.x, current.y, midX, midY)
            }

            // Draw line to last point
            const lastPoint = points[points.length - 1]
            ctx.lineTo(lastPoint.x, lastPoint.y)
          }

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

      case 'stage':
        // Draw unified stage shape using Paper.js for better quality
        if (element.circleX !== undefined && element.circleY !== undefined &&
          element.circleWidth !== undefined && element.circleHeight !== undefined) {
          ctx.save()

          try {
            // Create unified stage path using Paper.js
            const stagePathData = createUnifiedStageSync(
              { x, y, width, height },
              {
                x: element.circleX,
                y: element.circleY,
                width: element.circleWidth,
                height: element.circleHeight
              }
            )

            if (stagePathData) {
              // Create Path2D from the unified path data
              const stagePath = new Path2D(stagePathData)

              // Fill the unified shape
              if (element.fillColor !== 'transparent') {
                ctx.fillStyle = element.fillColor
                ctx.fill(stagePath)
              }

              // Stroke the unified outline
              ctx.strokeStyle = element.strokeColor
              ctx.lineWidth = element.strokeWidth / viewport.zoom
              ctx.stroke(stagePath)
            } else {
              // Fallback to simple union if Paper.js fails
              const stagePath = new Path2D()
              stagePath.rect(x, y, width, height)

              const circleRadius = Math.min(element.circleWidth, element.circleHeight) / 2
              const circleCenterX = element.circleX + circleRadius
              const circleCenterY = element.circleY + circleRadius
              stagePath.arc(circleCenterX, circleCenterY, circleRadius, 0, 2 * Math.PI)

              if (element.fillColor !== 'transparent') {
                ctx.fillStyle = element.fillColor
                ctx.fill(stagePath, 'nonzero')
              }

              ctx.strokeStyle = element.strokeColor
              ctx.lineWidth = element.strokeWidth / viewport.zoom
              ctx.stroke(stagePath)
            }
          } catch (error) {
            console.warn('Paper.js stage rendering failed, using fallback:', error)

            // Simple fallback rendering
            const stagePath = new Path2D()
            stagePath.rect(x, y, width, height)

            const circleRadius = Math.min(element.circleWidth, element.circleHeight) / 2
            const circleCenterX = element.circleX + circleRadius
            const circleCenterY = element.circleY + circleRadius
            stagePath.arc(circleCenterX, circleCenterY, circleRadius, 0, 2 * Math.PI)

            if (element.fillColor !== 'transparent') {
              ctx.fillStyle = element.fillColor
              ctx.fill(stagePath, 'nonzero')
            }

            ctx.strokeStyle = element.strokeColor
            ctx.lineWidth = element.strokeWidth / viewport.zoom
            ctx.stroke(stagePath)
          }

          ctx.restore()
        } else {
          // Fallback: draw just rectangle if circle properties are missing
          if (element.fillColor !== 'transparent') {
            ctx.fillRect(x, y, width, height)
          }
          ctx.strokeRect(x, y, width, height)
        }
        break

      case 'object':
        // Draw object based on its shape
        const objectShape = normalizeObjectShape(element.objectShape)

        switch (objectShape) {
          case 'triangle':
            ctx.beginPath()
            ctx.moveTo(x + width / 2, y) // Top point
            ctx.lineTo(x, y + height) // Bottom left
            ctx.lineTo(x + width, y + height) // Bottom right
            ctx.closePath()

            if (element.fillColor !== 'transparent') {
              ctx.fill()
            }

            // Apply stroke dash array if specified
            if (element.strokeDasharray) {
              const dashArray = element.strokeDasharray.split(',').map(Number)
              ctx.setLineDash(dashArray.map(d => d / viewport.zoom))
            }
            ctx.stroke()
            if (element.strokeDasharray) {
              ctx.setLineDash([])
            }
            break

          case 'square':
            const squareSize = Math.min(width, height)
            const squareX = x + (width - squareSize) / 2
            const squareY = y + (height - squareSize) / 2

            if (element.fillColor !== 'transparent') {
              ctx.fillRect(squareX, squareY, squareSize, squareSize)
            }

            // Apply stroke dash array if specified
            if (element.strokeDasharray) {
              const dashArray = element.strokeDasharray.split(',').map(Number)
              ctx.setLineDash(dashArray.map(d => d / viewport.zoom))
            }
            ctx.strokeRect(squareX, squareY, squareSize, squareSize)
            if (element.strokeDasharray) {
              ctx.setLineDash([])
            }
            break

          case 'hexagon':
            const hexRadius = Math.min(width, height) / 2
            const hexCenterX = x + width / 2
            const hexCenterY = y + height / 2

            ctx.beginPath()
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3
              const pointX = hexCenterX + hexRadius * Math.cos(angle)
              const pointY = hexCenterY + hexRadius * Math.sin(angle)

              if (i === 0) {
                ctx.moveTo(pointX, pointY)
              } else {
                ctx.lineTo(pointX, pointY)
              }
            }
            ctx.closePath()

            if (element.fillColor !== 'transparent') {
              ctx.fill()
            }

            // Apply stroke dash array if specified
            if (element.strokeDasharray) {
              const dashArray = element.strokeDasharray.split(',').map(Number)
              ctx.setLineDash(dashArray.map(d => d / viewport.zoom))
            }
            ctx.stroke()
            if (element.strokeDasharray) {
              ctx.setLineDash([])
            }
            break

          default: // rectangle
            if (element.fillColor !== 'transparent') {
              ctx.fillRect(x, y, width, height)
            }

            // Apply stroke dash array if specified
            if (element.strokeDasharray) {
              const dashArray = element.strokeDasharray.split(',').map(Number)
              ctx.setLineDash(dashArray.map(d => d / viewport.zoom))
            }
            ctx.strokeRect(x, y, width, height)
            if (element.strokeDasharray) {
              ctx.setLineDash([])
            }
            break
        }

        // Draw object initials if available
        if (element.objectInitials) {
          ctx.save()
          ctx.fillStyle = element.strokeColor || '#000000'
          ctx.font = `bold ${Math.min(width, height) * 0.3}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            element.objectInitials,
            x + width / 2,
            y + height / 2
          )
          ctx.restore()
        }
        break
    }

    // Draw group indicator somente quando o grupo NÃO está travado
    if (isInGroup && !elementGroup?.locked) {
      ctx.strokeStyle = isWelded ? '#ff6b6b' : '#28a745'
      ctx.lineWidth = 1.5 / viewport.zoom
      ctx.setLineDash([3 / viewport.zoom, 3 / viewport.zoom])

      const padding = 3

      switch (element.type) {
        case 'rectangle':
        case 'text':
        case 'textbox':
        case 'stage':
          ctx.strokeRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
          break
        case 'circle':
          // Use ellipse for group indicator
          const groupRadiusX = width / 2
          const groupRadiusY = height / 2
          ctx.beginPath()
          ctx.ellipse(x + groupRadiusX, y + groupRadiusY, groupRadiusX + padding, groupRadiusY + padding, 0, 0, 2 * Math.PI)
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
        case 'triangle':
          // Draw triangle outline for group indicator
          ctx.beginPath()
          ctx.moveTo(x + width / 2, y - padding) // Top point
          ctx.lineTo(x - padding, y + height + padding) // Bottom left
          ctx.lineTo(x + width + padding, y + height + padding) // Bottom right
          ctx.closePath()
          ctx.stroke()
          break
        case 'square':
          // Draw square outline for group indicator
          const squareSize = Math.min(width, height)
          const squareX = x + (width - squareSize) / 2
          const squareY = y + (height - squareSize) / 2
          ctx.strokeRect(squareX - padding, squareY - padding, squareSize + padding * 2, squareSize + padding * 2)
          break
        case 'hexagon':
          // Draw hexagon outline for group indicator
          const hexRadius = Math.min(width, height) / 2 + padding
          const hexGroupCenterX = x + width / 2
          const hexGroupCenterY = y + height / 2

          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3
            const pointX = hexGroupCenterX + hexRadius * Math.cos(angle)
            const pointY = hexGroupCenterY + hexRadius * Math.sin(angle)

            if (i === 0) {
              ctx.moveTo(pointX, pointY)
            } else {
              ctx.lineTo(pointX, pointY)
            }
          }
          ctx.closePath()
          ctx.stroke()
          break
        case 'object':
          // Draw object outline for group indicator (simplified to rectangle)
          ctx.strokeRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
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
        case 'textbox':
          ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
          break
        case 'stage':
          // Draw unified stage selection outline using Paper.js
          if (element.circleX !== undefined && element.circleY !== undefined &&
            element.circleWidth !== undefined && element.circleHeight !== undefined) {

            try {
              // Create unified stage path with expanded outline using Paper.js
              const stagePathData = createUnifiedStageSync(
                { x: x - 2, y: y - 2, width: width + 4, height: height + 4 },
                {
                  x: element.circleX - 2,
                  y: element.circleY - 2,
                  width: element.circleWidth + 4,
                  height: element.circleHeight + 4
                }
              )

              if (stagePathData) {
                // Create Path2D from the unified path data
                const selectionPath = new Path2D(stagePathData)
                ctx.stroke(selectionPath)
              } else {
                // Fallback to simple outline
                ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)

                const circleRadius = Math.min(element.circleWidth, element.circleHeight) / 2
                const circleCenterX = element.circleX + circleRadius
                const circleCenterY = element.circleY + circleRadius

                ctx.beginPath()
                ctx.arc(circleCenterX, circleCenterY, circleRadius + 2, 0, 2 * Math.PI)
                ctx.stroke()
              }
            } catch (error) {
              console.warn('Paper.js selection outline failed, using fallback:', error)

              // Simple fallback outline
              ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)

              const circleRadius = Math.min(element.circleWidth, element.circleHeight) / 2
              const circleCenterX = element.circleX + circleRadius
              const circleCenterY = element.circleY + circleRadius

              ctx.beginPath()
              ctx.arc(circleCenterX, circleCenterY, circleRadius + 2, 0, 2 * Math.PI)
              ctx.stroke()
            }
          } else {
            // Fallback to rectangle outline
            ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
          }
          break
        case 'circle':
          // Use ellipse for selection outline
          const selRadiusX = width / 2
          const selRadiusY = height / 2
          ctx.beginPath()
          ctx.ellipse(x + selRadiusX, y + selRadiusY, selRadiusX + 2, selRadiusY + 2, 0, 0, 2 * Math.PI)
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
        case 'line':
        case 'arrow':
          if (element.points && element.points.length >= 2) {
            // Draw outline around line/arrow points
            ctx.beginPath()
            const padding = 4 / viewport.zoom
            element.points.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x - padding, point.y - padding)
                ctx.lineTo(point.x + padding, point.y - padding)
                ctx.lineTo(point.x + padding, point.y + padding)
                ctx.lineTo(point.x - padding, point.y + padding)
                ctx.closePath()
              } else {
                ctx.moveTo(point.x - padding, point.y - padding)
                ctx.lineTo(point.x + padding, point.y - padding)
                ctx.lineTo(point.x + padding, point.y + padding)
                ctx.lineTo(point.x - padding, point.y + padding)
                ctx.closePath()
              }
            })
            ctx.stroke()
          } else {
            // Fallback to rectangle outline
            ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
          }
          break
        case 'path':
          if (element.pathData) {
            // Draw selection outline following the actual path instead of bbox
            try {
              const path2D = new Path2D(element.pathData)
              const pb = (element as any).pathBounds || { x, y, width, height }
              const sx = pb.width ? (width / pb.width) : 1
              const sy = pb.height ? (height / pb.height) : 1
              ctx.save()
              ctx.translate(x - pb.x, y - pb.y)
              ctx.scale(sx, sy)
              ctx.lineWidth = 1 / viewport.zoom
              ctx.stroke(path2D)
              ctx.restore()
            } catch {
              // Fallback to bounding box if Path2D fails
              ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
            }
          } else if (element.points && element.points.length > 0) {
            // For freehand paths, draw outline around the path
            const padding = 4 / viewport.zoom
            ctx.beginPath()
            element.points.forEach((point, index) => {
              const circleX = point.x - padding
              const circleY = point.y - padding
              const circleSize = padding * 2

              ctx.moveTo(circleX + circleSize, circleY)
              ctx.arc(point.x, point.y, padding, 0, 2 * Math.PI)
            })
            ctx.stroke()
          } else {
            // Fallback to rectangle outline
            ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
          }
          break
        case 'triangle':
          // Draw triangle selection outline
          ctx.beginPath()
          ctx.moveTo(x + width / 2, y - 2) // Top point
          ctx.lineTo(x - 2, y + height + 2) // Bottom left
          ctx.lineTo(x + width + 2, y + height + 2) // Bottom right
          ctx.closePath()
          ctx.stroke()
          break
        case 'square':
          // Draw square selection outline
          const squareSize = Math.min(width, height)
          const squareX = x + (width - squareSize) / 2
          const squareY = y + (height - squareSize) / 2
          ctx.strokeRect(squareX - 2, squareY - 2, squareSize + 4, squareSize + 4)
          break
        case 'hexagon':
          // Draw hexagon selection outline
          const hexRadius = Math.min(width, height) / 2 + 2
          const hexSelectionCenterX = x + width / 2
          const hexSelectionCenterY = y + height / 2

          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3
            const pointX = hexSelectionCenterX + hexRadius * Math.cos(angle)
            const pointY = hexSelectionCenterY + hexRadius * Math.sin(angle)

            if (i === 0) {
              ctx.moveTo(pointX, pointY)
            } else {
              ctx.lineTo(pointX, pointY)
            }
          }
          ctx.closePath()
          ctx.stroke()
          break
        case 'object':
          // Draw object selection outline based on its shape
          const objectSelectionShape = normalizeObjectShape(element.objectShape)

          switch (objectSelectionShape) {
            case 'triangle':
              ctx.beginPath()
              ctx.moveTo(x + width / 2, y - 2) // Top point
              ctx.lineTo(x - 2, y + height + 2) // Bottom left
              ctx.lineTo(x + width + 2, y + height + 2) // Bottom right
              ctx.closePath()
              ctx.stroke()
              break

            case 'square':
              const squareSize = Math.min(width, height)
              const squareX = x + (width - squareSize) / 2
              const squareY = y + (height - squareSize) / 2
              ctx.strokeRect(squareX - 2, squareY - 2, squareSize + 4, squareSize + 4)
              break

            case 'hexagon':
              const hexRadius = Math.min(width, height) / 2 + 2
              const hexSelectionCenterX = x + width / 2
              const hexSelectionCenterY = y + height / 2

              ctx.beginPath()
              for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3
                const pointX = hexSelectionCenterX + hexRadius * Math.cos(angle)
                const pointY = hexSelectionCenterY + hexRadius * Math.sin(angle)

                if (i === 0) {
                  ctx.moveTo(pointX, pointY)
                } else {
                  ctx.lineTo(pointX, pointY)
                }
              }
              ctx.closePath()
              ctx.stroke()
              break

            default: // rectangle
              ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
              break
          }
          break
      }

      ctx.setLineDash([])

      // Draw resize handles
      if (selectedElements.length === 1) {
        const handles = element ? getResizeHandles(element as Element) : []
        // Make handles more visible and responsive to zoom level
        const baseHandleSize = 10
        const minHandleSize = 8
        const maxHandleSize = 16
        const handleSize = Math.max(minHandleSize, Math.min(maxHandleSize, baseHandleSize / viewport.zoom))

        // Enhanced styling for better visibility
        ctx.lineWidth = Math.max(1, 2 / viewport.zoom)

        // Não desenhar handles para elementos travados
        const { isElementLocked } = useEditorStore.getState()
        const isLocked = element ? isElementLocked((element as Element).id) : false
        if (!isLocked) {
          handles.forEach(handle => {
            if (handle.id === 'radius') {
              // Special styling for border radius handle with better visibility
              ctx.fillStyle = '#28a745'
              ctx.strokeStyle = '#ffffff'
              ctx.beginPath()
              ctx.arc(handle.x + handleSize / 2, handle.y + handleSize / 2, handleSize / 2, 0, 2 * Math.PI)
              ctx.fill()
              ctx.stroke()

              // Add inner circle for better contrast
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.arc(handle.x + handleSize / 2, handle.y + handleSize / 2, handleSize / 4, 0, 2 * Math.PI)
              ctx.fill()
            } else {
              // Enhanced regular resize handles with better visibility
              ctx.fillStyle = '#007bff'
              ctx.strokeStyle = '#ffffff'

              // Draw main handle
              ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
              ctx.strokeRect(handle.x, handle.y, handleSize, handleSize)

              // Add inner highlight for better visibility
              ctx.fillStyle = '#ffffff'
              const innerSize = handleSize * 0.3
              const innerOffset = (handleSize - innerSize) / 2
              ctx.fillRect(handle.x + innerOffset, handle.y + innerOffset, innerSize, innerSize)
            }
          })
        }
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

  const isPointOverCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return false
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    )
  }, [])

  const handleDropPayload = useCallback((data: TouchDropPayload, clientX: number, clientY: number) => {
    if (!data || !isPointOverCanvas(clientX, clientY)) return

    const canvasPoint = screenToCanvas(clientX, clientY)

    if (isActorPayload(data)) {
      const size = data.actorSize || 60
      const actorElement: Omit<Element, 'id'> = {
        type: 'actor',
        x: canvasPoint.x - size / 2,
        y: canvasPoint.y - size / 2,
        width: size,
        height: size,
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
      return
    }

    if (isObjectPayload(data)) {
      const width = data.objectWidth || 60
      const height = data.objectHeight || 60
      const objectElement: Omit<Element, 'id'> = {
        type: 'object',
        x: canvasPoint.x - width / 2,
        y: canvasPoint.y - height / 2,
        width,
        height,
        objectId: data.objectId,
        objectName: data.objectName,
        objectInitials: data.objectInitials,
        objectNotes: data.objectNotes,
        objectShape: data.objectShape,
        fillColor: data.fillColor ?? 'transparent',
        strokeColor: data.strokeColor,
        strokeWidth: 2,
        strokeDasharray: data.strokeDasharray || '5,5',
        opacity: 1,
        zIndex: elements.length
      }

      onAddElement(objectElement)
    }
  }, [isPointOverCanvas, screenToCanvas, elements.length, onAddElement])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      handleDropPayload(data, e.clientX, e.clientY)
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }, [handleDropPayload])

  useEffect(() => {
    const handleTouchDrop = (event: Event) => {
      const customEvent = event as CustomEvent<TouchDropDetail>
      if (!customEvent.detail) return
      handleDropPayload(customEvent.detail.payload, customEvent.detail.clientX, customEvent.detail.clientY)
    }

    window.addEventListener(TOUCH_DROP_EVENT, handleTouchDrop as EventListener)
    return () => window.removeEventListener(TOUCH_DROP_EVENT, handleTouchDrop as EventListener)
  }, [handleDropPayload])

  return (
    <>
      <canvas
        ref={canvasRef}
        data-editor-canvas="true"
        className={`absolute inset-0 cursor-crosshair transition-all duration-200 ${isDragOver ? 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50 bg-opacity-10' : ''
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
        onContextMenu={(e) => {
          e.preventDefault()
        }}
        onTouchStart={(e) => {
          const isPinchAttempt = e.touches.length >= 2

          if (isPinchAttempt) {
            e.preventDefault()
            const touchPair = getTouchPair(e.touches)
            if (!touchPair) {
              return
            }

            // Finaliza qualquer interação atual antes de iniciar a pinça
            const syntheticMouseUp = new MouseEvent('mouseup', {
              clientX: 0,
              clientY: 0,
              button: 0,
              buttons: 0
            })
            handleMouseUp(syntheticMouseUp as any)

            const [first, second] = touchPair
            touchGestureRef.current = {
              initialDistance: getTouchDistance(first, second),
              initialZoom: viewport.zoom,
              initialViewport: { ...viewport },
              initialMidpoint: getTouchMidpoint(first, second)
            }
            return
          }

          if (touchGestureRef.current) {
            return
          }

          e.preventDefault()
          const touch = e.touches[0]
          if (touch) {
            const mouseEvent = new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY,
              button: 0,
              buttons: 1
            })
            handleMouseDown(mouseEvent as any)
          }
        }}
        onTouchMove={(e) => {
          if (touchGestureRef.current && e.touches.length >= 2) {
            e.preventDefault()
            const touchPair = getTouchPair(e.touches)
            const canvas = canvasRef.current
            if (!touchPair || !canvas) {
              return
            }

            const gestureState = touchGestureRef.current
            const { initialDistance, initialZoom, initialViewport, initialMidpoint } = gestureState
            if (initialDistance === 0) {
              return
            }

            const [first, second] = touchPair
            const distance = getTouchDistance(first, second)
            const midpoint = getTouchMidpoint(first, second)
            const rect = canvas.getBoundingClientRect()
            const pointerX = midpoint.x - rect.left
            const pointerY = midpoint.y - rect.top

            const distanceRatio = distance / initialDistance
            const targetZoom = clampZoom(initialZoom * distanceRatio)
            const zoomRatio = targetZoom / initialZoom

            const deltaX = midpoint.x - initialMidpoint.x
            const deltaY = midpoint.y - initialMidpoint.y
            let nextX = initialViewport.x + deltaX
            let nextY = initialViewport.y + deltaY

            nextX = pointerX - (pointerX - nextX) * zoomRatio
            nextY = pointerY - (pointerY - nextY) * zoomRatio

            onUpdateViewport({ x: nextX, y: nextY, zoom: targetZoom })
            return
          }

          if (touchGestureRef.current) {
            return
          }

          e.preventDefault()
          const touch = e.touches[0]
          if (touch) {
            const mouseEvent = new MouseEvent('mousemove', {
              clientX: touch.clientX,
              clientY: touch.clientY,
              button: 0,
              buttons: 1
            })
            handleMouseMove(mouseEvent as any)
          }
        }}
        onTouchEnd={(e) => {
          const wasPinching = Boolean(touchGestureRef.current)
          if (touchGestureRef.current && e.touches.length < 2) {
            touchGestureRef.current = null
          }

          if (wasPinching) {
            return
          }

          e.preventDefault()
          const mouseEvent = new MouseEvent('mouseup', {
            clientX: 0,
            clientY: 0,
            button: 0,
            buttons: 0
          })
          handleMouseUp(mouseEvent as any)
        }}
        onTouchCancel={() => {
          if (touchGestureRef.current) {
            touchGestureRef.current = null
            return
          }
          const mouseEvent = new MouseEvent('mouseup', {
            clientX: 0,
            clientY: 0,
            button: 0,
            buttons: 0
          })
          handleMouseUp(mouseEvent as any)
        }}
        style={{
          cursor: currentCursor,
          touchAction: 'none' // Prevent default touch behaviors
        }}
      />

      {textEditor && editingElement && textEditorStyle && (
        <textarea
          ref={textAreaRef}
          value={textEditor.value}
          onChange={handleTextEditorChange}
          onKeyDown={handleTextEditorKeyDown}
          onBlur={handleTextEditorBlur}
          spellCheck={false}
          style={textEditorStyle}
          className="bg-transparent text-current"
        />
      )}

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





      <ActorModal
        isOpen={showActorModal}
        onClose={handleActorModalClose}
        onSave={handleActorModalSave}
        position={actorModalPosition}
        currentActorCount={elements.filter(el => el.type === 'actor').length}
        planTier={userPlan.tier}
      />

      <FullscreenSlideshow />
    </>
  )
})

EditorCanvas.displayName = 'EditorCanvas'
