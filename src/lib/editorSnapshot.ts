import type { ProjectData } from '@/lib/projectData'
import { useEditorStore } from '@/hooks/useEditorStore'

function cloneProjectData<T>(value: T): T {
  const structuredCloneFn = (globalThis as any).structuredClone
  if (typeof structuredCloneFn === 'function') {
    return structuredCloneFn(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

export function getProjectDataSnapshot(): ProjectData {
  const { elements, groups, viewport, scenes, currentSceneIndex, stageConfig } = useEditorStore.getState()

  const snapshot: ProjectData = {
    elements,
    groups,
    viewport,
    scenes,
    currentSceneIndex,
    stageConfig,
    lastModified: new Date().toISOString()
  }

  return cloneProjectData(snapshot)
}
