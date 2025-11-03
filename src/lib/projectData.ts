import { createClient } from '@/lib/supabase/client'
import { Element, Viewport, Group, Scene, StageConfig } from '@/hooks/useEditorStore'

export interface ProjectData {
  elements: Element[]
  groups?: Group[]
  viewport: Viewport
  scenes?: Scene[]
  currentSceneIndex?: number
  stageConfig?: StageConfig | null
  lastModified: string
}

export async function saveProjectData(projectId: string, data: ProjectData): Promise<void> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { error } = await supabase
    .from('project_data')
    .upsert({
      project_id: projectId,
      user_id: user.id,
      data,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'project_id,user_id'
    })

  if (error) {
    console.error('Erro ao salvar dados do projeto:', error)
    throw error
  }
}

export async function loadProjectData(projectId: string): Promise<ProjectData | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { data, error } = await supabase
    .from('project_data')
    .select('data')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Nenhum dado encontrado
      return null
    }
    console.error('Erro ao carregar dados do projeto:', error)
    throw error
  }

  return data?.data || null
}

export async function deleteProjectData(projectId: string): Promise<void> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { error } = await supabase
    .from('project_data')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Erro ao deletar dados do projeto:', error)
    throw error
  }
}

export async function exportProjectData(projectId: string, format: 'json' | 'svg' | 'png', sceneIndex?: number): Promise<string | Blob> {
  const data = await loadProjectData(projectId)
  
  if (!data) {
    throw new Error('Nenhum dado encontrado para este projeto')
  }

  let elementsToExport = data.elements ?? []
  let activeStageConfig: StageConfig | null = data.stageConfig ?? null
  let exportData: ProjectData = {
    ...data,
    elements: elementsToExport,
    stageConfig: activeStageConfig,
  }

  if (sceneIndex !== undefined && data.scenes && data.scenes[sceneIndex]) {
    const scene = data.scenes[sceneIndex]
    elementsToExport = scene.elements ?? []
    activeStageConfig = scene.stageConfig ?? activeStageConfig ?? null
    exportData = {
      ...exportData,
      elements: scene.elements,
      groups: scene.groups,
      viewport: scene.viewport,
      currentSceneIndex: sceneIndex,
      stageConfig: activeStageConfig,
    }
  }

  switch (format) {
    case 'json':
      return JSON.stringify(exportData, null, 2)
    
    case 'svg':
      return generateSVG(elementsToExport, activeStageConfig)
    
    case 'png':
      return generatePNG(elementsToExport, activeStageConfig)
    
    default:
      throw new Error('Formato não suportado')
  }
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function extendBounds(bounds: Bounds, minX: number, minY: number, maxX: number, maxY: number) {
  bounds.minX = Math.min(bounds.minX, minX)
  bounds.minY = Math.min(bounds.minY, minY)
  bounds.maxX = Math.max(bounds.maxX, maxX)
  bounds.maxY = Math.max(bounds.maxY, maxY)
}

function sanitizeBounds(bounds: Bounds): Bounds {
  let { minX, minY, maxX, maxY } = bounds
  
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  }
  
  if (maxX <= minX) {
    maxX = minX + 100
  }
  
  if (maxY <= minY) {
    maxY = minY + 100
  }
  
  return { minX, minY, maxX, maxY }
}

function getElementBounds(element: Element): Bounds | null {
  const strokeOffset = (element.strokeWidth ?? 0) / 2
  const x = element.x ?? 0
  const y = element.y ?? 0
  
  const rectBounds = (width = 0, height = 0): Bounds => ({
    minX: Math.min(x, x + width) - strokeOffset,
    minY: Math.min(y, y + height) - strokeOffset,
    maxX: Math.max(x, x + width) + strokeOffset,
    maxY: Math.max(y, y + height) + strokeOffset,
  })
  
  switch (element.type) {
    case 'rectangle':
    case 'textbox':
    case 'object':
    case 'stage':
      return rectBounds(element.width, element.height)
    
    case 'circle':
      return rectBounds(element.width, element.height)
    
    case 'actor': {
      const baseBounds = rectBounds(element.width, element.height)
      if (!element.actorSpeech) {
        return baseBounds
      }
      
      const bubbleX = x + (element.width ?? 0) + 10
      const bubbleY = y - 20
      const bubbleWidth = 100
      const bubbleHeight = 30
      
      return {
        minX: Math.min(baseBounds.minX, bubbleX - strokeOffset),
        minY: Math.min(baseBounds.minY, bubbleY - strokeOffset),
        maxX: Math.max(baseBounds.maxX, bubbleX + bubbleWidth + strokeOffset),
        maxY: Math.max(baseBounds.maxY, bubbleY + bubbleHeight + strokeOffset),
      }
    }
    
    case 'line':
    case 'arrow': {
      const { startX, startY, endX, endY, controlPoint } = getLineGeometry(element)
      
      let minX = Math.min(startX, endX)
      let minY = Math.min(startY, endY)
      let maxX = Math.max(startX, endX)
      let maxY = Math.max(startY, endY)
      
      if (controlPoint) {
        minX = Math.min(minX, controlPoint.x)
        minY = Math.min(minY, controlPoint.y)
        maxX = Math.max(maxX, controlPoint.x)
        maxY = Math.max(maxY, controlPoint.y)
      }
      
      if (element.type === 'arrow') {
        const { leftPoint, rightPoint } = computeArrowHeadPoints(startX, startY, endX, endY, controlPoint)
        minX = Math.min(minX, leftPoint.x, rightPoint.x)
        minY = Math.min(minY, leftPoint.y, rightPoint.y)
        maxX = Math.max(maxX, leftPoint.x, rightPoint.x)
        maxY = Math.max(maxY, leftPoint.y, rightPoint.y)
      }
      
      return {
        minX: minX - strokeOffset,
        minY: minY - strokeOffset,
        maxX: maxX + strokeOffset,
        maxY: maxY + strokeOffset,
      }
    }
    
    case 'pen':
    case 'path': {
      if (element.pathBounds) {
        const { x: px, y: py, width = 0, height = 0 } = element.pathBounds
        return {
          minX: px - strokeOffset,
          minY: py - strokeOffset,
          maxX: px + width + strokeOffset,
          maxY: py + height + strokeOffset,
        }
      }
      
      if (element.points && element.points.length > 0) {
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        
        element.points.forEach(point => {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        })
        
        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
          return null
        }
        
        return {
          minX: minX - strokeOffset,
          minY: minY - strokeOffset,
          maxX: maxX + strokeOffset,
          maxY: maxY + strokeOffset,
        }
      }
      
      return rectBounds(element.width, element.height)
    }
    
    case 'text': {
      const fontSize = element.fontSize ?? 16
      const linesCount = Math.max(1, (element.text || '').split(/\r?\n/).length)
      const widthValue = element.width ?? Math.max(fontSize * 2, (element.text?.length || 0) * fontSize * 0.6)
      const heightValue = element.height ?? Math.max(fontSize * 1.2, linesCount * fontSize * 1.2)
      return {
        minX: x - strokeOffset,
        minY: y - strokeOffset,
        maxX: x + widthValue + strokeOffset,
        maxY: y + heightValue + strokeOffset,
      }
    }
    
    default:
      if (element.width !== undefined || element.height !== undefined) {
        return rectBounds(element.width, element.height)
      }
      return null
  }
}

function calculateSceneBounds(elements: Element[], stageConfig: StageConfig | null): Bounds {
  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }
  
  elements.forEach(element => {
    const elementBounds = getElementBounds(element)
    if (elementBounds) {
      extendBounds(bounds, elementBounds.minX, elementBounds.minY, elementBounds.maxX, elementBounds.maxY)
    }
  })
  
  if (stageConfig && stageConfig.visible !== false) {
    const halfBorder = (stageConfig.borderWidth ?? 0) / 2
    extendBounds(
      bounds,
      stageConfig.x - halfBorder,
      stageConfig.y - halfBorder,
      stageConfig.x + stageConfig.width + halfBorder,
      stageConfig.y + stageConfig.height + halfBorder
    )
  }
  
  return sanitizeBounds(bounds)
}

function sanitizeAttrValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeColor(color?: string | null): string | null {
  if (!color) return null
  
  let trimmed = color.trim()
  
  const fillMatch = trimmed.match(/fill\s*=\s*["']?([^"']+)["']?/i)
  if (fillMatch) {
    trimmed = fillMatch[1]
  }
  
  const fillStyleMatch = trimmed.match(/fill\s*:\s*([^;]+)/i)
  if (fillStyleMatch) {
    trimmed = fillStyleMatch[1]
  }
  
  trimmed = trimmed.replace(/;+$/, '').trim()
  
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1)
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    trimmed = trimmed.slice(1, -1)
  }
  
  return trimmed
}

function normalizeFillColor(color?: string | null) {
  const sanitized = sanitizeColor(color)
  if (!sanitized || sanitized === 'transparent') {
    return 'none'
  }
  return sanitized
}

function normalizeStrokeColor(color?: string | null) {
  const sanitized = sanitizeColor(color)
  if (!sanitized || sanitized === 'transparent') {
    return 'none'
  }
  return sanitized
}

function getLineGeometry(element: Element) {
  const startX = element.x ?? 0
  const startY = element.y ?? 0
  const endX = startX + (element.width ?? 0)
  const endY = startY + (element.height ?? 0)
  
  let controlPoint: { x: number; y: number } | null = null
  if (element.curveOffsetX !== undefined && element.curveOffsetY !== undefined) {
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    controlPoint = {
      x: midX + element.curveOffsetX,
      y: midY + element.curveOffsetY
    }
  }
  
  return { startX, startY, endX, endY, controlPoint }
}

function computeArrowHeadPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  controlPoint: { x: number; y: number } | null,
  arrowLength: number = 15,
  arrowAngle: number = Math.PI / 6
) {
  let angle: number
  if (controlPoint) {
    angle = Math.atan2(endY - controlPoint.y, endX - controlPoint.x)
  } else {
    angle = Math.atan2(endY - startY, endX - startX)
  }
  
  const leftPoint = {
    x: endX - arrowLength * Math.cos(angle - arrowAngle),
    y: endY - arrowLength * Math.sin(angle - arrowAngle),
  }
  const rightPoint = {
    x: endX - arrowLength * Math.cos(angle + arrowAngle),
    y: endY - arrowLength * Math.sin(angle + arrowAngle),
  }
  
  return { leftPoint, rightPoint }
}

function getStrokeDashArray(value?: string | null): number[] | null {
  if (!value) return null
  const parts = value.split(/[, ]+/).map(part => Number(part.trim())).filter(num => Number.isFinite(num))
  return parts.length > 0 ? parts : null
}

function generateSVG(elements: Element[], stageConfig: StageConfig | null): string {
  const bounds = calculateSceneBounds(elements, stageConfig)
  const padding = 20
  const viewBoxX = bounds.minX - padding
  const viewBoxY = bounds.minY - padding
  const viewBoxWidth = bounds.maxX - bounds.minX + padding * 2
  const viewBoxHeight = bounds.maxY - bounds.minY + padding * 2
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}">`
  svg += `<rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="white" />`
  
  if (stageConfig && stageConfig.visible !== false) {
    svg += drawStageSVG(stageConfig)
  }
  
  const sortedElements = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
  
  sortedElements.forEach(element => {
    const { type, x = 0, y = 0, width = 0, height = 0, strokeColor, fillColor, strokeWidth = 1, opacity = 1, text, fontSize } = element
    const strokeRaw = strokeWidth > 0 ? normalizeStrokeColor(strokeColor) : 'none'
    const fillRaw = normalizeFillColor(fillColor)
    const stroke = sanitizeAttrValue(strokeRaw || 'none')
    const fill = sanitizeAttrValue(fillRaw || 'none')
    
    switch (type) {
      case 'rectangle':
      case 'textbox':
      case 'object': {
        const radius = (element as any).borderRadius ?? 0
        svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" rx="${radius}" ry="${radius}" />`
        if (type === 'textbox' && element.textBoxConfig?.fullText) {
          const escapedText = sanitizeAttrValue(element.textBoxConfig.fullText)
          const textColor = sanitizeAttrValue(normalizeStrokeColor(strokeColor) || '#000000')
          svg += `<text x="${x + 8}" y="${y + (fontSize ?? 16) + 8}" font-size="${fontSize ?? 16}" fill="${textColor}" opacity="${opacity}">${escapedText}</text>`
        }
        break
      }
      
      case 'circle': {
        const radius = Math.max(0, Math.min(width, height) / 2)
        svg += `<circle cx="${x + radius}" cy="${y + radius}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`
        break
      }
      
      case 'line':
      case 'arrow': {
        const { startX, startY, endX, endY, controlPoint } = getLineGeometry(element)
        const dashArray = getStrokeDashArray(element.strokeDasharray)
        const dashAttr = dashArray ? ` stroke-dasharray="${sanitizeAttrValue(dashArray.join(' '))}"` : ''
        const pathData = controlPoint
          ? `M ${startX} ${startY} Q ${controlPoint.x} ${controlPoint.y} ${endX} ${endY}`
          : `M ${startX} ${startY} L ${endX} ${endY}`
        
        svg += `<path d="${pathData}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linecap="round"${dashAttr} />`
        
        if (type === 'arrow') {
          const { leftPoint, rightPoint } = computeArrowHeadPoints(startX, startY, endX, endY, controlPoint)
          svg += `<line x1="${endX}" y1="${endY}" x2="${leftPoint.x}" y2="${leftPoint.y}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linecap="round"${dashAttr} />`
          svg += `<line x1="${endX}" y1="${endY}" x2="${rightPoint.x}" y2="${rightPoint.y}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linecap="round"${dashAttr} />`
        }
        break
      }
      
      case 'text': {
        const fontSizeValue = fontSize ?? 16
        const textColor = sanitizeAttrValue(normalizeStrokeColor(strokeColor) || '#000000')
        const lines = (text || '').split(/\r?\n/)
        const lineHeight = Number((fontSizeValue * 1.2).toFixed(2))
        svg += `<text x="${x}" y="${y}" font-size="${fontSizeValue}" fill="${textColor}" opacity="${opacity}" dominant-baseline="hanging" xml:space="preserve">`
        lines.forEach((line, index) => {
          const escapedLine = sanitizeAttrValue(line === '' ? ' ' : line)
          const dyAttr = index === 0 ? '' : ` dy="${lineHeight}"`
          svg += `<tspan x="${x}"${dyAttr}>${escapedLine}</tspan>`
        })
        svg += `</text>`
        break
      }
      
      case 'path':
      case 'pen': {
        if (element.pathData) {
          svg += `<path d="${element.pathData}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`
        } else if (element.points && element.points.length > 0) {
          const pathData = element.points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ')
          svg += `<path d="${pathData}" fill="${fill === 'none' ? 'none' : fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`
        }
        break
      }
      
      case 'actor': {
        const radius = Math.max(0, Math.min(width, height) / 2)
        if (element.actorShape === 'circle') {
          svg += `<circle cx="${x + radius}" cy="${y + radius}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`
        } else {
          svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`
        }
        const initials = element.actorInitials ? sanitizeAttrValue(element.actorInitials) : ''
        const textX = element.actorShape === 'circle' ? x + radius : x + width / 2
        const textY = element.actorShape === 'circle' ? y + radius + 5 : y + height / 2 + 5
        const actorTextColor = sanitizeAttrValue(normalizeStrokeColor(strokeColor) || '#000000')
        svg += `<text x="${textX}" y="${textY}" font-size="${Math.max(12, radius * 0.6)}" text-anchor="middle" fill="${actorTextColor}" opacity="${opacity}">${initials}</text>`
        
        if (element.actorSpeech) {
          const bubbleX = x + width + 10
          const bubbleY = y - 20
          const bubbleStroke = sanitizeAttrValue(normalizeStrokeColor(strokeColor) || '#000000')
          const escapedSpeech = sanitizeAttrValue(element.actorSpeech)
          svg += `<rect x="${bubbleX}" y="${bubbleY}" width="100" height="30" fill="white" stroke="${bubbleStroke}" stroke-width="1" rx="5" />`
          svg += `<text x="${bubbleX + 5}" y="${bubbleY + 20}" font-size="12" fill="black">${escapedSpeech}</text>`
        }
        break
      }
      
      default:
        break
    }
  })
  
  svg += '</svg>'
  return svg
}

function drawStageSVG(stageConfig: StageConfig): string {
  if (stageConfig.visible === false) {
    return ''
  }
  
  const fill = sanitizeAttrValue(normalizeFillColor(stageConfig.backgroundColor) || 'none')
  const stroke = stageConfig.borderWidth && stageConfig.borderWidth > 0
    ? sanitizeAttrValue(normalizeStrokeColor(stageConfig.borderColor) || 'none')
    : 'none'
  const strokeWidth = stageConfig.borderWidth ?? 0
  
  switch (stageConfig.shape) {
    case 'circle': {
      const radius = Math.max(0, Math.min(stageConfig.width, stageConfig.height) / 2)
      const cx = stageConfig.x + stageConfig.width / 2
      const cy = stageConfig.y + stageConfig.height / 2
      return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
    }
    case 'oval': {
      const rx = stageConfig.width / 2
      const ry = stageConfig.height / 2
      const cx = stageConfig.x + rx
      const cy = stageConfig.y + ry
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
    }
    default:
      return `<rect x="${stageConfig.x}" y="${stageConfig.y}" width="${stageConfig.width}" height="${stageConfig.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
  }
}

function generatePNG(elements: Element[], stageConfig: StageConfig | null): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Não foi possível criar contexto do canvas'))
      return
    }
    
    const bounds = calculateSceneBounds(elements, stageConfig)
    const padding = 20
    const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX + padding * 2))
    const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY + padding * 2))
    
    canvas.width = width
    canvas.height = height
    
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.translate(-(bounds.minX - padding), -(bounds.minY - padding))
    
    if (stageConfig && stageConfig.visible !== false) {
      drawStageOnContext(ctx, stageConfig)
    }
    
    const sortedElements = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    
    sortedElements.forEach(element => {
      const { type, x = 0, y = 0, width = 0, height = 0, strokeColor, fillColor, strokeWidth = 1, opacity = 1, text, fontSize } = element
      
      ctx.globalAlpha = opacity
      const normalizedStroke = strokeWidth > 0 ? normalizeStrokeColor(strokeColor) : 'none'
      ctx.strokeStyle = normalizedStroke === 'none' ? 'transparent' : normalizedStroke
      const normalizedFill = normalizeFillColor(fillColor)
      ctx.fillStyle = normalizedFill === 'none' ? 'transparent' : normalizedFill
      ctx.lineWidth = strokeWidth
      
      switch (type) {
        case 'rectangle':
        case 'textbox':
        case 'object': {
          if (normalizedFill !== 'none') {
            ctx.fillRect(x, y, width, height)
          }
          if (strokeWidth > 0 && normalizedStroke !== 'none') {
            ctx.strokeRect(x, y, width, height)
          }
          if (type === 'textbox' && element.textBoxConfig?.fullText) {
            ctx.fillStyle = normalizedStroke === 'none' ? '#000000' : normalizedStroke
            ctx.globalAlpha = 1
            ctx.font = `${fontSize ?? 16}px Arial`
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.fillText(element.textBoxConfig.fullText, x + 8, y + 8)
          }
          break
        }
        
        case 'circle': {
          const radius = Math.max(0, Math.min(width, height) / 2)
          ctx.beginPath()
          ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI)
          if (normalizedFill !== 'none') {
            ctx.fill()
          }
          if (strokeWidth > 0 && normalizedStroke !== 'none') {
            ctx.stroke()
          }
          break
        }
        
        case 'line':
        case 'arrow': {
          const { startX, startY, endX, endY, controlPoint } = getLineGeometry(element)
          const dashArray = getStrokeDashArray(element.strokeDasharray)
          if (dashArray) {
            ctx.setLineDash(dashArray)
          }
          
          const previousLineCap = ctx.lineCap
          ctx.lineCap = 'round'
          
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          if (controlPoint) {
            ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, endX, endY)
          } else {
            ctx.lineTo(endX, endY)
          }
          if (strokeWidth > 0 && normalizedStroke !== 'none') {
            ctx.stroke()
          }
          
          if (type === 'arrow' && strokeWidth > 0 && normalizedStroke !== 'none') {
            const { leftPoint, rightPoint } = computeArrowHeadPoints(startX, startY, endX, endY, controlPoint)
            ctx.beginPath()
            ctx.moveTo(endX, endY)
            ctx.lineTo(leftPoint.x, leftPoint.y)
            ctx.moveTo(endX, endY)
            ctx.lineTo(rightPoint.x, rightPoint.y)
            ctx.stroke()
          }
          
          if (dashArray) {
            ctx.setLineDash([])
          }
          ctx.lineCap = previousLineCap
          break
        }
        
        case 'text': {
          const fontSizeValue = fontSize ?? 16
          const lineHeight = fontSizeValue * 1.2
          const lines = (text || '').split(/\r?\n/)
          ctx.save()
          ctx.fillStyle = normalizedStroke === 'none' ? '#000000' : normalizedStroke
          ctx.globalAlpha = opacity
          ctx.font = `${fontSizeValue}px Arial`
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          lines.forEach((line, index) => {
            const content = line === '' ? ' ' : line
            ctx.fillText(content, x, y + index * lineHeight)
          })
          ctx.restore()
          break
        }
        
        case 'path':
        case 'pen': {
          if (element.pathData) {
            const path = new Path2D(element.pathData)
            if (normalizedFill !== 'none') {
              ctx.fill(path)
            }
            if (strokeWidth > 0 && normalizedStroke !== 'none') {
              ctx.stroke(path)
            }
          } else if (element.points && element.points.length > 0) {
            ctx.beginPath()
            element.points.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y)
              } else {
                ctx.lineTo(point.x, point.y)
              }
            })
            if (normalizedFill !== 'none') {
              ctx.fill()
            }
            if (strokeWidth > 0 && normalizedStroke !== 'none') {
              ctx.stroke()
            }
          }
          break
        }
        
        case 'actor': {
          const radius = Math.max(0, Math.min(width, height) / 2)
          ctx.beginPath()
          if (element.actorShape === 'circle') {
            ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI)
          } else {
            ctx.rect(x, y, width, height)
          }
          if (normalizedFill !== 'none') {
            ctx.fill()
          }
          if (strokeWidth > 0 && normalizedStroke !== 'none') {
            ctx.stroke()
          }
          
          if (element.actorSpeech) {
            const bubbleX = x + width + 10
            const bubbleY = y - 20
            ctx.fillStyle = 'white'
            ctx.fillRect(bubbleX, bubbleY, 100, 30)
            ctx.strokeStyle = normalizedStroke === 'none' ? '#000000' : normalizedStroke
            ctx.strokeRect(bubbleX, bubbleY, 100, 30)
            ctx.font = '12px Arial'
            ctx.fillStyle = 'black'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.fillText(element.actorSpeech, bubbleX + 5, bubbleY + 5)
          }
          
          ctx.fillStyle = normalizedStroke === 'none' ? '#000000' : normalizedStroke
          ctx.globalAlpha = opacity
          ctx.font = `${Math.max(12, radius * 0.6)}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(element.actorInitials || '', element.actorShape === 'circle' ? x + radius : x + width / 2, element.actorShape === 'circle' ? y + radius : y + height / 2)
          break
        }
        
        default:
          break
      }
    })
    
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Erro ao gerar PNG'))
      }
    }, 'image/png')
  })
}

function drawStageOnContext(ctx: CanvasRenderingContext2D, stageConfig: StageConfig) {
  if (stageConfig.visible === false) {
    return
  }
  
  const fillColor = normalizeFillColor(stageConfig.backgroundColor)
  const strokeColor = stageConfig.borderWidth && stageConfig.borderWidth > 0
    ? normalizeStrokeColor(stageConfig.borderColor)
    : 'none'
  const strokeWidth = stageConfig.borderWidth ?? 0
  
  ctx.save()
  ctx.globalAlpha = 1
  ctx.lineWidth = strokeWidth
  ctx.fillStyle = fillColor === 'none' ? 'transparent' : fillColor
  ctx.strokeStyle = strokeColor === 'none' ? 'transparent' : strokeColor
  
  const shouldFill = fillColor !== 'none'
  const shouldStroke = strokeWidth > 0 && strokeColor !== 'none'
  
  switch (stageConfig.shape) {
    case 'circle': {
      const radius = Math.max(0, Math.min(stageConfig.width, stageConfig.height) / 2)
      const cx = stageConfig.x + stageConfig.width / 2
      const cy = stageConfig.y + stageConfig.height / 2
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
      if (shouldFill) ctx.fill()
      if (shouldStroke) ctx.stroke()
      break
    }
    case 'oval': {
      const rx = stageConfig.width / 2
      const ry = stageConfig.height / 2
      const cx = stageConfig.x + rx
      const cy = stageConfig.y + ry
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI)
      if (shouldFill) ctx.fill()
      if (shouldStroke) ctx.stroke()
      break
    }
    default: {
      if (shouldFill) {
        ctx.fillRect(stageConfig.x, stageConfig.y, stageConfig.width, stageConfig.height)
      }
      if (shouldStroke) {
        ctx.strokeRect(stageConfig.x, stageConfig.y, stageConfig.width, stageConfig.height)
      }
      break
    }
  }
  
  ctx.restore()
}
