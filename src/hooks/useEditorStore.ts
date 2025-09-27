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
  | 'actor'

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
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'path' | 'actor'
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
  // Line/Arrow specific properties
  curveOffsetX?: number
  curveOffsetY?: number
  // Rectangle specific properties
  borderRadius?: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
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
  timestamp: string
  thumbnail?: string
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
  
  // Scene state
  scenes: Scene[]
  currentSceneIndex: number
  isPlayingSlideshow: boolean
  isTransitioning: boolean
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
  
  // Layer operations
  bringToFront: (elementIds: string[]) => void
  sendToBack: (elementIds: string[]) => void
  bringForward: (elementIds: string[]) => void
  sendBackward: (elementIds: string[]) => void
  
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
  
  // Store reset
  resetStore: () => void
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
  
  // Scene state
  scenes: [],
  currentSceneIndex: -1,
  isPlayingSlideshow: false,
  isTransitioning: false,
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
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
  },
  
  deleteElements: (ids) => {
    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id)),
      selectedElements: state.selectedElements.filter((id) => !ids.includes(id)),
    }))
    
    get().saveToHistory()
    get().updateCurrentScene()
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
    
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newHistoryState)
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },
  
  undo: () => {
    const { history, historyIndex } = get()
    
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1]
      set({
        elements: previousState.elements,
        groups: previousState.groups,
        selectedElements: previousState.selectedElements,
        historyIndex: historyIndex - 1,
      })
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get()
    
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      set({
        elements: nextState.elements,
        groups: nextState.groups,
        selectedElements: nextState.selectedElements,
        historyIndex: historyIndex + 1,
      })
    }
  },
  
  get canUndo() {
    return get().historyIndex > 0
  },
  
  get canRedo() {
    const { history, historyIndex } = get()
    return historyIndex < history.length - 1
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
    
    const { elements } = get()
    const minZIndex = Math.min(...elements.map(el => el.zIndex || 0))
    const stageZIndex = Math.max(0, minZIndex - 100) // Garantir que o palco fique bem no fundo
    
    // Primeiro agrupa os elementos
    const groupId = nanoid()
    const newGroup: Group = {
      id: groupId,
      elementIds,
      type: 'group',
      locked: true,
      name: 'Palco'
    }
    
    set((state) => ({
      groups: [...state.groups, newGroup],
      elements: state.elements.map((el) => {
        if (elementIds.includes(el.id)) {
          return { 
            ...el, 
            groupId, 
            locked: true,
            zIndex: stageZIndex + elementIds.indexOf(el.id)
          }
        }
        // Garantir que outros elementos fiquem acima do palco
        return el.zIndex <= stageZIndex + elementIds.length 
          ? { ...el, zIndex: el.zIndex + 200 }
          : el
      }),
      selectedElements: []
    }))
    
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
          ? { ...el, zIndex: Math.max(0, (el.zIndex || 0) - 1) }
          : el
      ),
    }))
    
    get().saveToHistory()
  },
  
  // Scene operations
  addScene: (name) => {
    const { elements, groups, viewport, scenes } = get()
    
    const newScene: Scene = {
      id: nanoid(),
      name: name || `Cena ${scenes.length + 1}`,
      elements: JSON.parse(JSON.stringify(elements)),
      groups: JSON.parse(JSON.stringify(groups)),
      viewport: { ...viewport },
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
      currentSceneIndex: index,
      selectedElements: []
    })
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
    const { scenes, currentSceneIndex, elements, groups, viewport } = get()
    if (currentSceneIndex < 0 || currentSceneIndex >= scenes.length) return
    
    set((state) => ({
      scenes: state.scenes.map((scene, i) => 
        i === currentSceneIndex ? {
          ...scene,
          elements: JSON.parse(JSON.stringify(elements)),
          groups: JSON.parse(JSON.stringify(groups)),
          viewport: { ...viewport },
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
      // Add transition effect
      set({ isTransitioning: true })
      
      // Load next scene with smooth transition
      setTimeout(() => {
        get().nextScene()
        set({ isTransitioning: false })
      }, 300) // 300ms transition duration
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
      fontSize: 16
    })
  },
}))