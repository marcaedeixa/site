import { create } from 'zustand'
import { nanoid } from 'nanoid'

export type Tool = 
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'pen'
  | 'eraser'

export interface Point {
  x: number
  y: number
}

export interface Group {
  id: string
  elementIds: string[]
  name?: string
  locked?: boolean
  type: 'group' | 'welded'
}

export interface Element {
  id: string
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'path' | 'actor' | 'stage' | 'object' | 'textbox'
  x: number
  y: number
  width?: number
  height?: number
  points?: Point[]
  text?: string
  fontSize?: number
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  rotation?: number
  locked?: boolean
  visible?: boolean
  groupId?: string
  zIndex: number
  // Actor specific properties
  actorId?: string
  actorName?: string
  actorRole?: string
  actorSpeech?: string
  actorShape?: 'circle' | 'square'
  actorInitials?: string
  actorColor?: string
  actorSize?: number
  actorNotes?: string
  bubbleStyle?: string
  bubbleColor?: string
  bubbleTextColor?: string
  // Object specific properties
  objectName?: string
  objectInitials?: string
  objectNotes?: string
  objectShape?: 'triangle' | 'square' | 'hexagon'
  strokeDasharray?: string
  // Line/Arrow specific properties
  curveOffsetX?: number
  curveOffsetY?: number
  // Rectangle specific properties
  borderRadius?: number
  // Stage specific properties
  circleX?: number
  circleY?: number
  circleWidth?: number
  circleHeight?: number
  circleFillColor?: string
  circleStrokeColor?: string
  // Path specific properties (for boolean operations)
  pathData?: string
  // Original bounds of the pathData (used to transform with x/y/width/height)
  pathBounds?: { x: number; y: number; width: number; height: number }
  // TextBox specific properties
  textBoxConfig?: {
    previewMode: 'full' | 'start' | 'end' | 'start-end'
    fullText: string
    lineHeight?: number
  }
  circleStrokeWidth?: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface StageConfig {
  id: string
  width: number
  height: number
  shape: 'rectangle' | 'circle' | 'oval'
  backgroundColor: string
  borderColor: string
  borderWidth: number
  x: number
  y: number
  visible: boolean
  locked: boolean
}

export interface HistoryState {
  elements: Element[]
  groups: Group[]
  selectedElements: string[]
}

export interface Scene {
  id: string
  name: string
  elements: Element[]
  groups: Group[]
  viewport: Viewport
  stageConfig: StageConfig | null
  timestamp: string
  thumbnail?: string
  notes?: string
  // Campos de deixa
  deixaAtual?: string
  deixaSeguinte?: string
  deixaAtualAutoFilled?: boolean
  deixaSeguinteAutoFilled?: boolean
}

interface EditorStore {
  // State
  elements: Element[]
  groups: Group[]
  selectedTool: Tool
  selectedElements: string[]
  viewport: Viewport
  history: HistoryState[]
  historyIndex: number
  
  // Stage configuration
  stageConfig: StageConfig | null
  hoverPreviewEnabled: boolean
  hoverPreviewColor: string
  
  // Scene state
  scenes: Scene[]
  currentSceneIndex: number
  isPlayingSlideshow: boolean
  isTransitioning: boolean
  isFullscreenSlideshow: boolean
  slideshowInterval: number
  slideshowTimer?: NodeJS.Timeout
  
  // Drawing state
  isDrawing: boolean
  currentElement: Element | null
  
  // Properties
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  fontSize: number
  
  // Actions
  setSelectedTool: (tool: Tool) => void
  setElements: (elements: Element[]) => void
  setViewport: (viewport: Viewport) => void
  
  // Element operations
  addElement: (element: Omit<Element, 'id'>) => void
  updateElement: (id: string, updates: Partial<Element>) => void
  deleteElements: (ids: string[]) => void
  duplicateElements: (ids: string[]) => void
  
  // Selection
  selectElements: (ids: string[]) => void
  clearSelection: () => void
  toggleElementSelection: (id: string) => void
  
  // History
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  
  // Drawing
  startDrawing: (element: Omit<Element, 'id'>) => void
  updateCurrentElement: (updates: Partial<Element>) => void
  finishDrawing: () => void
  cancelDrawing: () => void
  
  // Properties
  setStrokeColor: (color: string) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setOpacity: (opacity: number) => void
  setFontSize: (size: number) => void
  setHoverPreviewEnabled: (enabled: boolean) => void
  setHoverPreviewColor: (color: string) => void

  // Group operations
  groupElements: (elementIds: string[]) => void
  ungroupElements: (groupId: string) => void
  weldElements: (elementIds: string[]) => void
  getElementGroup: (elementId: string) => Group | undefined
  isElementInGroup: (elementId: string) => boolean
  
  // Stage/Lock operations
  lockGroup: (groupId: string) => void
  unlockGroup: (groupId: string) => void
  createStage: (elementIds: string[]) => void
  isElementLocked: (elementId: string) => boolean
  validateGeometricElements: (elementIds: string[]) => { valid: string[], invalid: string[], hasValidElements: boolean }
  
  // Layer operations
  bringToFront: (elementIds: string[]) => void
  sendToBack: (elementIds: string[]) => void
  bringForward: (elementIds: string[]) => void
  sendBackward: (elementIds: string[]) => void
  reorderElements: (draggedElementId: string, targetElementId: string, position: 'above' | 'below') => void
  
  // Scene operations
  addScene: (name?: string) => void
  duplicateScene: (index: number) => void
  deleteScene: (index: number) => void
  loadScene: (index: number) => void
  updateSceneName: (index: number, name: string) => void
  updateCurrentScene: () => void
  reorderScenes: (fromIndex: number, toIndex: number) => void
  
  // Slideshow operations
  startSlideshow: () => void
  stopSlideshow: () => void
  pauseSlideshow: () => void
  nextScene: () => void
  previousScene: () => void
  setSlideshowInterval: (interval: number) => void
  startFullscreenSlideshow: () => void
  stopFullscreenSlideshow: () => void
  
  // Stage operations
  setStageConfig: (config: StageConfig) => void
  updateStageConfig: (updates: Partial<StageConfig>) => void
  removeStageConfig: () => void
  centerStage: () => void
  syncStageAcrossScenes: () => void
  
  // Deixa operations
  updateDeixaAtual: (sceneIndex: number, deixa: string, autoFilled?: boolean) => void
  updateDeixaSeguinte: (sceneIndex: number, deixa: string, autoFilled?: boolean) => void
  syncDeixas: (sceneIndex: number, field: 'atual' | 'seguinte', value: string) => void
  
  // Scene notes operations
  updateSceneNotes: (sceneIndex: number, notes: string) => void
  
  // Actor operations
  removeActorFromAllScenes: (actorId: string) => void
  
  // Alignment operations
  alignElementsLeft: (elementIds: string[]) => void
  alignElementsCenter: (elementIds: string[]) => void
  alignElementsRight: (elementIds: string[]) => void
  alignElementsTop: (elementIds: string[]) => void
  alignElementsMiddle: (elementIds: string[]) => void
  alignElementsBottom: (elementIds: string[]) => void
  distributeElementsHorizontally: (elementIds: string[]) => void
  distributeElementsVertically: (elementIds: string[]) => void
  
  // Store reset
  resetStore: () => void
  
  // Initialize with sample data
  initializeWithSampleData: () => void

  // History initialization
  initializeHistory: () => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  elements: [],
  groups: [],
  selectedTool: 'select',
  selectedElements: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  
  // Stage configuration
  stageConfig: null,
  hoverPreviewEnabled: false,
  hoverPreviewColor: '#1d4ed8',
  
  // Scene state
  scenes: [],
  currentSceneIndex: -1,
  isPlayingSlideshow: false,
  isTransitioning: false,
  isFullscreenSlideshow: false,
  slideshowInterval: 3000, // 3 seconds default
  slideshowTimer: undefined,
  
  isDrawing: false,
  currentElement: null,
  
  strokeColor: '#000000',
  fillColor: 'transparent',
  strokeWidth: 2,
  opacity: 1,
  fontSize: 16,
  
  // Actions
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setElements: (elements) => set({ elements }),
  setViewport: (viewport) => set({ viewport }),
  
  // Element operations
  addElement: (elementData) => {
    const { elements, groups } = get()
    
    // Verificar duplicação de atores na cena atual
    if (elementData.type === 'actor' && elementData.actorId) {
      const existingActor = elements.find(el => 
        el.type === 'actor' && el.actorId === elementData.actorId
      )
      if (existingActor) {
        console.warn('Ator já existe na cena atual')
        return // Não adicionar o ator duplicado
      }
    }
    
    // Verificar duplicação de objetos na cena atual
    if (elementData.type === 'object' && elementData.objectId) {
      const existingObject = elements.find(el => 
        el.type === 'object' && el.objectId === elementData.objectId
      )
      if (existingObject) {
        console.warn('Objeto já existe na cena atual')
        return // Não adicionar o objeto duplicado
      }
    }
    
    // Encontrar o maior z-index de elementos não travados
    const unlockedElements = elements.filter(el => {
      if (el.locked) return false
      if (el.groupId) {
        const group = groups.find(g => g.id === el.groupId)
        return !group?.locked
      }
      return true
    })
    
    const maxUnlockedZIndex = unlockedElements.length > 0 
      ? Math.max(...unlockedElements.map(el => el.zIndex || 0)) 
      : Math.max(...elements.map(el => el.zIndex || 0), 0)
    
    const element: Element = {
      ...elementData,
      id: nanoid(),
      zIndex: elementData.zIndex !== undefined ? elementData.zIndex : maxUnlockedZIndex + 1,
    }
    
    set((state) => {
      const newElements = [...state.elements, element]
      return {
        elements: newElements,
      }
    })
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  updateElement: (id, updates) => {
    let stageAffected = false

    set((state) => {
      const stageGroup = state.groups.find(group => group.name === 'Palco')

      const updatedElements = state.elements.map((el) => {
        if (el.id !== id) {
          return el
        }

        let mergedElement: Element = { ...el, ...updates }

        if (el.type === 'textbox') {
          const baseConfig = el.textBoxConfig || {
            previewMode: 'full' as const,
            fullText: el.text || ''
          }

          mergedElement = {
            ...mergedElement,
            textBoxConfig: {
              ...baseConfig,
              ...updates.textBoxConfig,
              ...(updates.text !== undefined ? { fullText: updates.text } : {})
            }
          }
        }

        if (stageGroup && (mergedElement.type === 'stage' || stageGroup.elementIds.includes(mergedElement.id))) {
          stageAffected = true
        }

        return mergedElement
      })

      return { elements: updatedElements }
    })
    
    get().saveToHistory()
    get().updateCurrentScene()

    if (stageAffected) {
      get().syncStageAcrossScenes()
    }
  },
  
  deleteElements: (ids) => {
    const { elements, groups } = get()
    const stageGroup = groups.find(group => group.name === 'Palco')

    const protectedIds = new Set(
      elements
        .filter(el => ids.includes(el.id) && (el.type === 'stage' || (stageGroup && stageGroup.elementIds.includes(el.id))))
        .map(el => el.id)
    )

    if (protectedIds.size > 0) {
      console.warn('Elementos do palco não podem ser removidos diretamente.')
    }

    const allowedIds = ids.filter(id => !protectedIds.has(id))
    if (allowedIds.length === 0) {
      return
    }

    set((state) => ({
      elements: state.elements.filter((el) => !allowedIds.includes(el.id)),
      selectedElements: state.selectedElements.filter((id) => !allowedIds.includes(id)),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
    get().syncStageAcrossScenes()
  },
  
  duplicateElements: (ids) => {
    const { elements } = get()
    const elementsToDuplicate = elements.filter((el) => ids.includes(el.id))
    const maxZIndex = elements.length > 0 ? Math.max(...elements.map(el => el.zIndex || 0)) : 0
    
    const duplicatedElements = elementsToDuplicate.map((el, index) => ({
      ...el,
      id: nanoid(),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: maxZIndex + index + 1,
    }))
    
    set((state) => ({
      elements: [...state.elements, ...duplicatedElements],
      selectedElements: duplicatedElements.map((el) => el.id),
    }))
    
    get().saveToHistory()
  },
  
  // Selection
  selectElements: (ids) => set({ selectedElements: ids }),
  clearSelection: () => set({ selectedElements: [] }),
  
  toggleElementSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedElements.includes(id)
      return {
        selectedElements: isSelected
          ? state.selectedElements.filter((selectedId) => selectedId !== id)
          : [...state.selectedElements, id],
      }
    })
  },
  
  // History
  saveToHistory: () => {
    const { elements, groups, selectedElements, history, historyIndex } = get()
    
    const newHistoryState: HistoryState = {
      elements: JSON.parse(JSON.stringify(elements)),
      groups: JSON.parse(JSON.stringify(groups)),
      selectedElements: [...selectedElements],
    }

    // Initialize history if it's empty
    if (historyIndex < 0 || history.length === 0) {
      set({
        history: [newHistoryState],
        historyIndex: 0,
        canUndo: false,
        canRedo: false,
      })
      return
    }
    
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newHistoryState)
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    })
  },
  
  undo: () => {
    const { history, historyIndex } = get()
    
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const previousState = history[newIndex]
      set({
        elements: previousState.elements,
        groups: previousState.groups,
        selectedElements: previousState.selectedElements,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: history.length > newIndex + 1,
      })
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get()
    
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const nextState = history[newIndex]
      set({
        elements: nextState.elements,
        groups: nextState.groups,
        selectedElements: nextState.selectedElements,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: newIndex < history.length - 1,
      })
    }
  },
  
  // Drawing
  startDrawing: (elementData) => {
    const { elements } = get()
    const maxZIndex = elements.length > 0 ? Math.max(...elements.map(el => el.zIndex || 0)) : 0
    
    const element: Element = {
      ...elementData,
      id: nanoid(),
      zIndex: elementData.zIndex !== undefined ? elementData.zIndex : maxZIndex + 1,
    }
    
    set({
      isDrawing: true,
      currentElement: element,
    })
  },
  
  updateCurrentElement: (updates) => {
    set((state) => ({
      currentElement: state.currentElement
        ? { ...state.currentElement, ...updates }
        : null,
    }))
  },
  
  finishDrawing: () => {
    const { currentElement } = get()
    
    if (currentElement) {
      get().addElement(currentElement)
    }
    
    set({
      isDrawing: false,
      currentElement: null,
    })
  },
  
  cancelDrawing: () => {
    set({
      isDrawing: false,
      currentElement: null,
    })
  },
  
  // Properties
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity }),
  setFontSize: (size) => set({ fontSize: size }),
  setHoverPreviewEnabled: (enabled) => set({ hoverPreviewEnabled: enabled }),
  setHoverPreviewColor: (color) => set({ hoverPreviewColor: color }),
  
  // Group operations
  groupElements: (elementIds) => {
    if (elementIds.length < 2) return
    
    const groupId = nanoid()
    const newGroup: Group = {
      id: groupId,
      elementIds,
      type: 'group'
    }
    
    set((state) => ({
      groups: [...state.groups, newGroup],
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, groupId } : el
      ),
      selectedElements: []
    }))
    
    get().saveToHistory()
  },
  
  ungroupElements: (groupId) => {
    const { groups } = get()
    const group = groups.find(g => g.id === groupId)
    
    if (!group) return
    
    set((state) => ({
      groups: state.groups.filter(g => g.id !== groupId),
      elements: state.elements.map((el) =>
        group.elementIds.includes(el.id) ? { ...el, groupId: undefined } : el
      ),
      selectedElements: group.elementIds
    }))
    
    get().saveToHistory()
  },
  
  weldElements: (elementIds) => {
    if (elementIds.length < 2) return
    
    const groupId = nanoid()
    const newGroup: Group = {
      id: groupId,
      elementIds,
      type: 'welded',
      locked: true
    }
    
    set((state) => ({
      groups: [...state.groups, newGroup],
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, groupId, locked: true } : el
      ),
      selectedElements: []
    }))
    
    get().saveToHistory()
  },
  
  getElementGroup: (elementId) => {
    const { groups, elements } = get()
    const element = elements.find(el => el.id === elementId)
    
    if (!element?.groupId) return undefined
    
    return groups.find(g => g.id === element.groupId)
  },
  
  isElementInGroup: (elementId) => {
    const { elements } = get()
    const element = elements.find(el => el.id === elementId)
    return !!element?.groupId
  },
  
  // Stage/Lock operations
  lockGroup: (groupId) => {
    const { groups } = get()
    const group = groups.find(g => g.id === groupId)
    
    if (!group) return
    
    set((state) => ({
      groups: state.groups.map(g => 
        g.id === groupId ? { ...g, locked: true } : g
      ),
      elements: state.elements.map(el => 
        group.elementIds.includes(el.id) ? { ...el, locked: true } : el
      ),
      selectedElements: []
    }))
    
    get().saveToHistory()
  },
  
  unlockGroup: (groupId) => {
    const { groups } = get()
    const group = groups.find(g => g.id === groupId)
    
    if (!group) return
    
    set((state) => ({
      groups: state.groups.map(g => 
        g.id === groupId ? { ...g, locked: false } : g
      ),
      elements: state.elements.map(el => 
        group.elementIds.includes(el.id) ? { ...el, locked: false } : el
      )
    }))
    
    get().saveToHistory()
  },
  
  createStage: (elementIds) => {
    if (elementIds.length < 1) return

    const { elements, groups } = get()
    
    // Filtrar elementos válidos para palco: retângulos, círculos e formas compostas (paths)
    const geometricElements = elementIds
      .map(id => elements.find(el => el.id === id))
      .filter(el => el && (el.type === 'rectangle' || el.type === 'circle' || el.type === 'path'))
    
    if (geometricElements.length === 0) {
      console.warn('Nenhum elemento válido (retângulo, círculo ou forma composta) foi selecionado para criar o palco')
      return
    }
    
    // Usar apenas os IDs dos elementos geométricos válidos
    const validElementIds = geometricElements.map(el => el.id)
    
    const minZIndex = Math.min(...elements.map(el => el.zIndex || 0))
    const stageZIndex = Math.max(0, minZIndex - 100) // Garantir que o palco fique bem no fundo

    // Verificar se já existe um grupo "Palco" para evitar repetição
    const existingStageGroup = groups.find(g => g.name === 'Palco')

    if (existingStageGroup) {
      // Se o palco existente estiver travado, não permitir criar/atualizar
      if (existingStageGroup.locked) {
        console.warn('Palco travado: destrave o palco antes de adicionar/atualizar elementos.')
        return
      }

      const existingId = existingStageGroup.id

      set((state) => {
        // Elementos anteriormente no grupo Palco
        const prevStageElementIds = existingStageGroup.elementIds
        // Agregar novos IDs válidos ao conjunto atual (quando destravado)
        const newStageIdsSet = new Set([...prevStageElementIds, ...validElementIds])
        const mergedStageElementIds = Array.from(newStageIdsSet)

        const updatedElements = state.elements.map((el) => {
          if (mergedStageElementIds.includes(el.id)) {
            // Elementos do palco: atribuir ao grupo existente e respeitar estado de lock atual do grupo
            const indexInValid = validElementIds.indexOf(el.id)
            const z = indexInValid >= 0 ? (stageZIndex + indexInValid) : (el.zIndex || stageZIndex)
            return {
              ...el,
              groupId: existingId,
              locked: existingStageGroup.locked,
              zIndex: z
            }
          }
          // Garantir que outros elementos fiquem acima do palco
          return el.zIndex <= stageZIndex + mergedStageElementIds.length
            ? { ...el, zIndex: (el.zIndex || 0) + 200 }
            : el
        })

        const updatedGroups = state.groups.map(g =>
          g.id === existingId
            ? { ...g, elementIds: mergedStageElementIds }
            : g
        )

        return {
          groups: updatedGroups,
          elements: updatedElements,
          selectedElements: []
        }
      })

      get().syncStageAcrossScenes()
      get().saveToHistory()
      return
    }

    // Não há grupo Palco ainda: criar novo grupo
    const groupId = nanoid()
    const newGroup: Group = {
      id: groupId,
      elementIds: validElementIds,
      type: 'group',
      locked: true,
      name: 'Palco'
    }

    set((state) => ({
      groups: [...state.groups, newGroup],
      elements: state.elements.map((el) => {
        if (validElementIds.includes(el.id)) {
          return {
            ...el,
            groupId,
            // Ao criar, travamos o palco por padrão; usuário pode destravar depois
            locked: newGroup.locked,
            zIndex: stageZIndex + validElementIds.indexOf(el.id)
          }
        }
        // Garantir que outros elementos fiquem acima do palco
        return el.zIndex <= stageZIndex + validElementIds.length
          ? { ...el, zIndex: (el.zIndex || 0) + 200 }
          : el
      }),
      selectedElements: []
    }))

    get().syncStageAcrossScenes()
    get().saveToHistory()
  },
  
  isElementLocked: (elementId) => {
    const { elements, groups } = get()
    const element = elements.find(el => el.id === elementId)
    
    if (!element) return false
    if (element.locked) return true
    
    // Verificar se o grupo está travado
    if (element.groupId) {
      const group = groups.find(g => g.id === element.groupId)
      return group?.locked || false
    }
    
    return false
  },

  validateGeometricElements: (elementIds) => {
    const { elements } = get()
    const valid: string[] = []
    const invalid: string[] = []
    
    elementIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element) {
        if (element.type === 'rectangle' || element.type === 'circle' || element.type === 'path') {
          valid.push(id)
        } else {
          invalid.push(id)
        }
      }
    })
    
    return {
      valid,
      invalid,
      hasValidElements: valid.length > 0
    }
  },
  
  // Layer operations
  bringToFront: (elementIds) => {
    if (elementIds.length === 0) return
    
    const { elements } = get()
    const maxZIndex = Math.max(...elements.map(el => el.zIndex || 0))
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) 
          ? { ...el, zIndex: maxZIndex + elementIds.indexOf(el.id) + 1 }
          : el
      ),
    }))
    
    get().saveToHistory()
  },
  
  sendToBack: (elementIds) => {
    if (elementIds.length === 0) return
    
    const { elements } = get()
    const minZIndex = Math.min(...elements.map(el => el.zIndex || 0))
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) 
          ? { ...el, zIndex: minZIndex - elementIds.length + elementIds.indexOf(el.id) }
          : el
      ),
    }))
    
    get().saveToHistory()
  },
  
  bringForward: (elementIds) => {
    if (elementIds.length === 0) return
    
    const { elements } = get()
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) 
          ? { ...el, zIndex: (el.zIndex || 0) + 1 }
          : el
      ),
    }))
    
    get().saveToHistory()
  },
  
  sendBackward: (elementIds) => {
    if (elementIds.length === 0) return
    
    const { elements } = get()
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) 
          ? { ...el, zIndex: (el.zIndex || 0) - 1 }
          : el
      ),
    }))
    
    get().saveToHistory()
  },

  reorderElements: (draggedElementId, targetElementId, position) => {
    const { elements } = get()
    
    const draggedElement = elements.find(el => el.id === draggedElementId)
    const targetElement = elements.find(el => el.id === targetElementId)
    
    if (!draggedElement || !targetElement) return
    
    const targetZIndex = targetElement.zIndex || 0
    let newZIndex: number
    
    if (position === 'above') {
      newZIndex = targetZIndex + 1
    } else {
      newZIndex = targetZIndex - 1
    }
    
    // Ajustar outros elementos se necessário
    const updatedElements = elements.map(el => {
      if (el.id === draggedElementId) {
        return { ...el, zIndex: newZIndex }
      }
      
      // Se estamos movendo para cima e o elemento está entre o target e o novo zIndex
      if (position === 'above' && el.zIndex > targetZIndex && el.zIndex <= newZIndex && el.id !== draggedElementId) {
        return { ...el, zIndex: el.zIndex - 1 }
      }
      
      // Se estamos movendo para baixo e o elemento está entre o novo zIndex e o target
      if (position === 'below' && el.zIndex >= newZIndex && el.zIndex < targetZIndex && el.id !== draggedElementId) {
        return { ...el, zIndex: el.zIndex + 1 }
      }
      
      return el
    })
    
    set({ elements: updatedElements })
    get().saveToHistory()
  },
  
  // Scene operations
  addScene: (name) => {
    const { elements, groups, viewport, stageConfig, scenes } = get()
    
    const newScene: Scene = {
      id: nanoid(),
      name: name || `Cena ${scenes.length + 1}`,
      elements: JSON.parse(JSON.stringify(elements)),
      groups: JSON.parse(JSON.stringify(groups)),
      viewport: { ...viewport },
      stageConfig: stageConfig ? JSON.parse(JSON.stringify(stageConfig)) : null,
      timestamp: new Date().toISOString()
    }
    
    set((state) => ({
      scenes: [...state.scenes, newScene],
      currentSceneIndex: state.scenes.length
    }))
  },
  
  duplicateScene: (index) => {
    const { scenes } = get()
    if (index < 0 || index >= scenes.length) return
    
    const sceneToClone = scenes[index]
    const newScene: Scene = {
      ...JSON.parse(JSON.stringify(sceneToClone)),
      id: nanoid(),
      name: `${sceneToClone.name} (Cópia)`,
      timestamp: new Date().toISOString()
    }
    
    set((state) => ({
      scenes: [
        ...state.scenes.slice(0, index + 1),
        newScene,
        ...state.scenes.slice(index + 1)
      ]
    }))
  },
  
  deleteScene: (index) => {
    const { scenes, currentSceneIndex } = get()
    if (index < 0 || index >= scenes.length) return
    
    const newScenes = scenes.filter((_, i) => i !== index)
    let newCurrentIndex = currentSceneIndex
    
    if (currentSceneIndex === index) {
      newCurrentIndex = Math.max(0, Math.min(newScenes.length - 1, currentSceneIndex))
    } else if (currentSceneIndex > index) {
      newCurrentIndex = currentSceneIndex - 1
    }
    
    set({
      scenes: newScenes,
      currentSceneIndex: newScenes.length === 0 ? -1 : newCurrentIndex
    })
  },
  
  loadScene: (index) => {
    const { scenes } = get()
    if (index < 0 || index >= scenes.length) return
    
    const scene = scenes[index]
    
    set({
      elements: JSON.parse(JSON.stringify(scene.elements)),
      groups: JSON.parse(JSON.stringify(scene.groups)),
      viewport: { ...scene.viewport },
      stageConfig: scene.stageConfig ? JSON.parse(JSON.stringify(scene.stageConfig)) : null,
      currentSceneIndex: index,
      selectedElements: []
    })

    get().initializeHistory()
  },
  
  updateSceneName: (index, name) => {
    const { scenes } = get()
    if (index < 0 || index >= scenes.length) return
    
    set((state) => ({
      scenes: state.scenes.map((scene, i) => 
        i === index ? { ...scene, name } : scene
      )
    }))
  },
  
  updateCurrentScene: () => {
    const { scenes, currentSceneIndex, elements, groups, viewport, stageConfig } = get()
    if (currentSceneIndex < 0 || currentSceneIndex >= scenes.length) return
    
    set((state) => ({
      scenes: state.scenes.map((scene, i) => 
        i === currentSceneIndex ? {
          ...scene,
          elements: JSON.parse(JSON.stringify(elements)),
          groups: JSON.parse(JSON.stringify(groups)),
          viewport: { ...viewport },
          stageConfig: stageConfig ? JSON.parse(JSON.stringify(stageConfig)) : null,
          timestamp: new Date().toISOString()
        } : scene
      )
    }))
  },
  
  reorderScenes: (fromIndex, toIndex) => {
    const { scenes } = get()
    if (fromIndex < 0 || fromIndex >= scenes.length || toIndex < 0 || toIndex >= scenes.length) return
    
    const newScenes = [...scenes]
    const [movedScene] = newScenes.splice(fromIndex, 1)
    newScenes.splice(toIndex, 0, movedScene)
    
    set({ scenes: newScenes })
  },
  
  // Slideshow operations
  startSlideshow: () => {
    const { scenes, slideshowInterval, slideshowTimer } = get()
    if (scenes.length === 0) return
    
    // Limpar timer existente se houver
    if (slideshowTimer) {
      clearInterval(slideshowTimer)
    }
    
    // Começar da primeira cena se não houver cena atual
    const { currentSceneIndex } = get()
    if (currentSceneIndex === -1) {
      get().loadScene(0)
    }
    
    const timer = setInterval(() => {
      // Load next scene directly without transition
      get().nextScene()
    }, slideshowInterval)
    
    set({
      isPlayingSlideshow: true,
      slideshowTimer: timer
    })
  },
  
  stopSlideshow: () => {
    const { slideshowTimer } = get()
    if (slideshowTimer) {
      clearInterval(slideshowTimer)
    }
    
    set({
      isPlayingSlideshow: false,
      slideshowTimer: undefined
    })
  },
  
  pauseSlideshow: () => {
    const { slideshowTimer } = get()
    if (slideshowTimer) {
      clearInterval(slideshowTimer)
    }
    
    set({
      isPlayingSlideshow: false,
      slideshowTimer: undefined
    })
  },
  
  nextScene: () => {
    const { scenes, currentSceneIndex } = get()
    if (scenes.length === 0) return
    
    const nextIndex = (currentSceneIndex + 1) % scenes.length
    get().loadScene(nextIndex)
  },
  
  previousScene: () => {
    const { scenes, currentSceneIndex } = get()
    if (scenes.length === 0) return
    
    const prevIndex = currentSceneIndex <= 0 ? scenes.length - 1 : currentSceneIndex - 1
    get().loadScene(prevIndex)
  },
  
  setSlideshowInterval: (interval) => {
    const { isPlayingSlideshow } = get()
    
    set({ slideshowInterval: interval })
    
    // Se o slideshow estiver rodando, reiniciar com novo intervalo
    if (isPlayingSlideshow) {
      get().stopSlideshow()
      get().startSlideshow()
    }
  },

  startFullscreenSlideshow: () => {
    const { scenes } = get()
    if (scenes.length === 0) return
    
    // Para o slideshow normal se estiver rodando
    get().stopSlideshow()
    
    // Ativa o modo tela inteira
    set({ isFullscreenSlideshow: true })
    
    // Inicia o slideshow automático
    get().startSlideshow()
  },

  stopFullscreenSlideshow: () => {
    // Para o slideshow
    get().stopSlideshow()
    
    // Desativa o modo tela inteira
    set({ isFullscreenSlideshow: false })
  },
  
  // Stage operations
  setStageConfig: (config) => {
    set({ stageConfig: config })
    
    // Sincronizar stageConfig em todas as cenas
    const { scenes } = get()
    if (scenes.length > 0) {
      set((state) => ({
        scenes: state.scenes.map(scene => ({
          ...scene,
          stageConfig: config ? JSON.parse(JSON.stringify(config)) : null
        }))
      }))
    }
    
    // Centralizar o palco após configurá-lo
    get().centerStage()
  },
  
  updateStageConfig: (updates) => {
    const { stageConfig, scenes } = get()
    if (!stageConfig) return
    
    const updatedConfig = { ...stageConfig, ...updates }
    set({ stageConfig: updatedConfig })
    
    // Sincronizar stageConfig atualizado em todas as cenas
    if (scenes.length > 0) {
      set((state) => ({
        scenes: state.scenes.map(scene => ({
          ...scene,
          stageConfig: JSON.parse(JSON.stringify(updatedConfig))
        }))
      }))
    }
  },
  
  removeStageConfig: () => {
    set({ stageConfig: null })
    
    // Remover stageConfig de todas as cenas
    const { scenes } = get()
    if (scenes.length > 0) {
      set((state) => ({
        scenes: state.scenes.map(scene => ({
          ...scene,
          stageConfig: null
        }))
      }))
    }
  },
  
  centerStage: () => {
    const { stageConfig, viewport } = get()
    if (!stageConfig) return
    
    // Centralizar o palco no viewport atual
    // Converter coordenadas do viewport para coordenadas do canvas
    const viewportCenterX = -viewport.x / viewport.zoom
    const viewportCenterY = -viewport.y / viewport.zoom
    
    // Posicionar o palco no centro do viewport
    const centerX = viewportCenterX - stageConfig.width / 2
    const centerY = viewportCenterY - stageConfig.height / 2
    
    set({
      stageConfig: {
        ...stageConfig,
        x: centerX,
        y: centerY
      }
    })
  },

  syncStageAcrossScenes: () => {
    const { scenes, groups, elements } = get()
    if (!scenes || scenes.length === 0) {
      return
    }

    const stageGroup = groups.find(group => group.name === 'Palco')
    if (!stageGroup) {
      return
    }

    const stageElements = stageGroup.elementIds
      .map(id => elements.find(el => el?.id === id))
      .filter((el): el is Element => Boolean(el))

    if (stageElements.length === 0) {
      return
    }

    const serializedStageElements = stageElements.map(el => JSON.stringify(el))
    const stageElementIdSet = new Set(stageGroup.elementIds)

    set((state) => ({
      scenes: state.scenes.map(scene => {
        const filteredElements = scene.elements.filter(el => !stageElementIdSet.has(el.id))
        const filteredGroups = scene.groups.filter(group => group.id !== stageGroup.id && group.name !== 'Palco')

        return {
          ...scene,
          elements: [
            ...filteredElements,
            ...serializedStageElements.map(serialized => JSON.parse(serialized) as Element)
          ],
          groups: [
            ...filteredGroups,
            { ...stageGroup, elementIds: [...stageGroup.elementIds] }
          ],
          timestamp: new Date().toISOString()
        }
      })
    }))
  },

  combineShapesIntoStage: (elementIds) => {
    if (elementIds.length < 2) return
    
    const { elements } = get()
    const selectedShapes = elementIds
      .map(id => elements.find(el => el.id === id))
      .filter(el => el && (el.type === 'rectangle' || el.type === 'circle'))
    
    if (selectedShapes.length < 2) return
    
    // Find rectangle and circle
    const rectangle = selectedShapes.find(el => el.type === 'rectangle')
    const circle = selectedShapes.find(el => el.type === 'circle')
    
    if (rectangle && circle) {
      // Calculate optimal positioning for a natural stage appearance
      const rectCenterX = rectangle.x + rectangle.width / 2
      const rectCenterY = rectangle.y + rectangle.height / 2
      const circleCenterX = circle.x + circle.width / 2
      const circleCenterY = circle.y + circle.height / 2
      
      // Determine the unified bounding box
      const minX = Math.min(rectangle.x, circle.x)
      const minY = Math.min(rectangle.y, circle.y)
      const maxX = Math.max(rectangle.x + rectangle.width, circle.x + circle.width)
      const maxY = Math.max(rectangle.y + rectangle.height, circle.y + circle.height)
      
      // Create a new unified stage element
      const stageElement: Omit<Element, 'id'> = {
        type: 'stage',
        x: rectangle.x,
        y: rectangle.y,
        width: rectangle.width,
        height: rectangle.height,
        fillColor: rectangle.fillColor || '#f0f0f0',
        strokeColor: rectangle.strokeColor || '#000000',
        strokeWidth: rectangle.strokeWidth || 2,
        opacity: rectangle.opacity || 1,
        zIndex: Math.min(...elements.map(el => el.zIndex || 0)) - 100,
        // Store circle properties for rendering (keep user-defined positions)
        circleX: circle.x,
        circleY: circle.y,
        circleWidth: circle.width,
        circleHeight: circle.height,
        circleFillColor: rectangle.fillColor || '#f0f0f0', // Use same color as rectangle for unity
        circleStrokeColor: rectangle.strokeColor || '#000000', // Use same stroke as rectangle
        circleStrokeWidth: rectangle.strokeWidth || 2 // Use same stroke width
      }
      
      // Remove original shapes and add unified stage
      set((state) => ({
        elements: [
          ...state.elements.filter(el => !elementIds.includes(el.id)),
          { ...stageElement, id: nanoid() } as Element
        ],
        selectedElements: []
      }))

      get().syncStageAcrossScenes()
      get().saveToHistory()
    }
  },
  
  // Deixa operations
  updateDeixaAtual: (sceneIndex, deixa, autoFilled = false) => {
    set((state) => ({
      scenes: state.scenes.map((scene, index) => 
        index === sceneIndex 
          ? { ...scene, deixaAtual: deixa, deixaAtualAutoFilled: autoFilled }
          : scene
      )
    }))
    
    // Sincronizar com a cena anterior
    if (sceneIndex > 0) {
      get().syncDeixas(sceneIndex, 'atual', deixa)
    }
  },
  
  updateDeixaSeguinte: (sceneIndex, deixa, autoFilled = false) => {
    set((state) => ({
      scenes: state.scenes.map((scene, index) => 
        index === sceneIndex 
          ? { ...scene, deixaSeguinte: deixa, deixaSeguinteAutoFilled: autoFilled }
          : scene
      )
    }))
    
    // Sincronizar com a próxima cena
    const { scenes } = get()
    if (sceneIndex < scenes.length - 1) {
      get().syncDeixas(sceneIndex, 'seguinte', deixa)
    }
  },
  
  syncDeixas: (sceneIndex, field, value) => {
    const { scenes } = get()
    
    if (field === 'atual' && sceneIndex > 0) {
      // Atualizar "deixa seguinte" da cena anterior
      set((state) => ({
        scenes: state.scenes.map((scene, index) => 
          index === sceneIndex - 1 
            ? { ...scene, deixaSeguinte: value, deixaSeguinteAutoFilled: true }
            : scene
        )
      }))
    } else if (field === 'seguinte' && sceneIndex < scenes.length - 1) {
      // Atualizar "deixa atual" da próxima cena
      set((state) => ({
        scenes: state.scenes.map((scene, index) => 
          index === sceneIndex + 1 
            ? { ...scene, deixaAtual: value, deixaAtualAutoFilled: true }
            : scene
        )
      }))
    }
  },
  
  updateSceneNotes: (sceneIndex, notes) => {
    set((state) => ({
      scenes: state.scenes.map((scene, index) => 
        index === sceneIndex 
          ? { ...scene, notes }
          : scene
      )
    }))
  },
  
  removeActorFromAllScenes: (actorId) => {
    const { currentSceneIndex } = get()
    
    set((state) => {
      // Remove elementos de ator de todas as cenas
      const updatedScenes = state.scenes.map(scene => ({
        ...scene,
        elements: scene.elements.filter(element => 
          !(element.type === 'actor' && element.actorId === actorId)
        )
      }))
      
      // Remove elementos de ator da cena atual também
      const updatedElements = state.elements.filter(element => 
        !(element.type === 'actor' && element.actorId === actorId)
      )
      
      // Remove elementos selecionados se algum for do ator excluído
      const updatedSelectedElements = state.selectedElements.filter(elementId => {
        const element = state.elements.find(el => el.id === elementId)
        return !(element?.type === 'actor' && element?.actorId === actorId)
      })
      
      return {
        scenes: updatedScenes,
        elements: updatedElements,
        selectedElements: updatedSelectedElements
      }
    })
  },
  
  // Alignment operations
  alignElementsLeft: (elementIds) => {
    if (elementIds.length < 2) return
    
    const { elements } = get()
    const elementsToAlign = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToAlign.length < 2) return
    
    const leftmostX = Math.min(...elementsToAlign.map(el => el.x))
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, x: leftmostX } : el
      ),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  alignElementsCenter: (elementIds) => {
    if (elementIds.length < 2) return
    
    const { elements } = get()
    const elementsToAlign = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToAlign.length < 2) return
    
    const centerX = elementsToAlign.reduce((sum, el) => sum + el.x + (el.width || 0) / 2, 0) / elementsToAlign.length
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, x: centerX - (el.width || 0) / 2 } : el
      ),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  alignElementsRight: (elementIds) => {
    if (elementIds.length < 2) return
    
    const { elements } = get()
    const elementsToAlign = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToAlign.length < 2) return
    
    const rightmostX = Math.max(...elementsToAlign.map(el => el.x + (el.width || 0)))
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, x: rightmostX - (el.width || 0) } : el
      ),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  alignElementsTop: (elementIds) => {
    if (elementIds.length < 2) return
    
    const { elements } = get()
    const elementsToAlign = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToAlign.length < 2) return
    
    const topmostY = Math.min(...elementsToAlign.map(el => el.y))
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, y: topmostY } : el
      ),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  alignElementsMiddle: (elementIds) => {
    if (elementIds.length < 2) return
    
    const { elements } = get()
    const elementsToAlign = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToAlign.length < 2) return
    
    const centerY = elementsToAlign.reduce((sum, el) => sum + el.y + (el.height || 0) / 2, 0) / elementsToAlign.length
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, y: centerY - (el.height || 0) / 2 } : el
      ),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  alignElementsBottom: (elementIds) => {
    if (elementIds.length < 2) return
    
    const { elements } = get()
    const elementsToAlign = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToAlign.length < 2) return
    
    const bottommostY = Math.max(...elementsToAlign.map(el => el.y + (el.height || 0)))
    
    set((state) => ({
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, y: bottommostY - (el.height || 0) } : el
      ),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  distributeElementsHorizontally: (elementIds) => {
    if (elementIds.length < 3) return
    
    const { elements } = get()
    const elementsToDistribute = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToDistribute.length < 3) return
    
    // Sort elements by x position
    const sortedElements = [...elementsToDistribute].sort((a, b) => a.x - b.x)
    
    const leftmostX = sortedElements[0].x
    const rightmostX = sortedElements[sortedElements.length - 1].x + (sortedElements[sortedElements.length - 1].width || 0)
    const totalWidth = rightmostX - leftmostX
    const spacing = totalWidth / (sortedElements.length - 1)
    
    set((state) => ({
      elements: state.elements.map((el) => {
        const index = sortedElements.findIndex(sorted => sorted.id === el.id)
        if (index !== -1 && index > 0 && index < sortedElements.length - 1) {
          return { ...el, x: leftmostX + spacing * index - (el.width || 0) / 2 }
        }
        return el
      }),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  distributeElementsVertically: (elementIds) => {
    if (elementIds.length < 3) return
    
    const { elements } = get()
    const elementsToDistribute = elements.filter(el => elementIds.includes(el.id))
    
    if (elementsToDistribute.length < 3) return
    
    // Sort elements by y position
    const sortedElements = [...elementsToDistribute].sort((a, b) => a.y - b.y)
    
    const topmostY = sortedElements[0].y
    const bottommostY = sortedElements[sortedElements.length - 1].y + (sortedElements[sortedElements.length - 1].height || 0)
    const totalHeight = bottommostY - topmostY
    const spacing = totalHeight / (sortedElements.length - 1)
    
    set((state) => ({
      elements: state.elements.map((el) => {
        const index = sortedElements.findIndex(sorted => sorted.id === el.id)
        if (index !== -1 && index > 0 && index < sortedElements.length - 1) {
          return { ...el, y: topmostY + spacing * index - (el.height || 0) / 2 }
        }
        return el
      }),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  // Store reset
  resetStore: () => {
    const { slideshowTimer } = get()
    if (slideshowTimer) {
      clearInterval(slideshowTimer)
    }
    
    set({
      elements: [],
      groups: [],
      selectedElements: [],
      history: [],
      historyIndex: -1,
      viewport: { x: 0, y: 0, zoom: 1 },
      stageConfig: null,
      scenes: [],
      currentSceneIndex: -1,
      isPlayingSlideshow: false,
      slideshowInterval: 3000,
      slideshowTimer: undefined,
      isDrawing: false,
      currentElement: null,
      selectedTool: 'select',
      strokeColor: '#000000',
      fillColor: 'transparent',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 16,
      canUndo: false,
      canRedo: false,
      hoverPreviewEnabled: false,
      hoverPreviewColor: '#1d4ed8',
    })
  },
  
  initializeHistory: () => {
    const { elements, groups, selectedElements } = get()

    const historyState: HistoryState = {
      elements: JSON.parse(JSON.stringify(elements)),
      groups: JSON.parse(JSON.stringify(groups)),
      selectedElements: [...selectedElements],
    }

    set({
      history: [historyState],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
    })
  },
  
  // Initialize with sample data
  initializeWithSampleData: () => {
    const sampleStageConfig: StageConfig = {
      id: nanoid(),
      width: 800,
      height: 600,
      shape: 'rectangle',
      backgroundColor: '#f0f0f0',
      borderColor: '#333333',
      borderWidth: 2,
      x: 400,
      y: 300,
      visible: true,
      locked: false
    }

    const sampleElements: Element[] = [
      {
        id: nanoid(),
        type: 'rectangle',
        x: 200,
        y: 150,
        width: 100,
        height: 80,
        strokeColor: '#ff6b6b',
        fillColor: '#ff6b6b',
        strokeWidth: 2,
        opacity: 1,
        zIndex: 1,
        visible: true
      },
      {
        id: nanoid(),
        type: 'circle',
        x: 400,
        y: 200,
        width: 80,
        height: 80,
        strokeColor: '#4ecdc4',
        fillColor: '#4ecdc4',
        strokeWidth: 2,
        opacity: 1,
        zIndex: 2,
        visible: true
      },
      {
        id: nanoid(),
        type: 'text',
        x: 300,
        y: 350,
        width: 200,
        height: 40,
        text: 'Cena de Exemplo',
        fontSize: 24,
        strokeColor: '#333333',
        fillColor: 'transparent',
        strokeWidth: 1,
        opacity: 1,
        zIndex: 3,
        visible: true
      }
    ]

    const sampleScenes: Scene[] = [
      {
        id: nanoid(),
        name: 'Cena 1 - Exemplo',
        elements: JSON.parse(JSON.stringify(sampleElements)),
        groups: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        stageConfig: JSON.parse(JSON.stringify(sampleStageConfig)),
        timestamp: new Date().toISOString()
      },
      {
        id: nanoid(),
        name: 'Cena 2 - Exemplo',
        elements: JSON.parse(JSON.stringify([
          {
            id: nanoid(),
            type: 'circle',
            x: 150,
            y: 100,
            width: 120,
            height: 120,
            strokeColor: '#45b7d1',
            fillColor: '#45b7d1',
            strokeWidth: 3,
            opacity: 0.8,
            zIndex: 1,
            visible: true
          },
          {
            id: nanoid(),
            type: 'rectangle',
            x: 450,
            y: 180,
            width: 150,
            height: 100,
            strokeColor: '#96ceb4',
            fillColor: '#96ceb4',
            strokeWidth: 2,
            opacity: 1,
            zIndex: 2,
            visible: true
          },
          {
            id: nanoid(),
            type: 'text',
            x: 250,
            y: 400,
            width: 300,
            height: 40,
            text: 'Segunda Cena',
            fontSize: 28,
            strokeColor: '#2c3e50',
            fillColor: 'transparent',
            strokeWidth: 1,
            opacity: 1,
            zIndex: 3,
            visible: true
          }
        ])),
        groups: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        stageConfig: JSON.parse(JSON.stringify(sampleStageConfig)),
        timestamp: new Date().toISOString()
      }
    ]

    set({
      scenes: sampleScenes,
      currentSceneIndex: 0,
      elements: JSON.parse(JSON.stringify(sampleElements)),
      stageConfig: JSON.parse(JSON.stringify(sampleStageConfig))
    })

    get().initializeHistory()
  },
}))
