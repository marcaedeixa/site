import { createClient } from '@/lib/supabase/client'
import { Element, Viewport, Group, Scene } from '@/hooks/useEditorStore'

export interface ProjectData {
  elements: Element[]
  groups?: Group[]
  viewport: Viewport
  scenes?: Scene[]
  currentSceneIndex?: number
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
      data: data,
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
      // No data found, return null
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

export async function exportProjectData(projectId: string, format: 'json' | 'svg' | 'png'): Promise<string | Blob> {
  const data = await loadProjectData(projectId)
  
  if (!data) {
    throw new Error('Nenhum dado encontrado para este projeto')
  }

  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)
    
    case 'svg':
      return generateSVG(data.elements)
    
    case 'png':
      return generatePNG(data.elements)
    
    default:
      throw new Error('Formato não suportado')
  }
}

function generateSVG(elements: Element[]): string {
  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  elements.forEach(element => {
    const { x, y, width = 0, height = 0 } = element
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  })
  
  const padding = 20
  const viewBoxWidth = maxX - minX + padding * 2
  const viewBoxHeight = maxY - minY + padding * 2
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - padding} ${minY - padding} ${viewBoxWidth} ${viewBoxHeight}">`
  
  elements.forEach(element => {
    const { type, x, y, width, height, strokeColor, fillColor, strokeWidth, opacity, text, fontSize } = element
    
    const style = `stroke="${strokeColor}" fill="${fillColor}" stroke-width="${strokeWidth}" opacity="${opacity}"`
    
    switch (type) {
      case 'rectangle':
        svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${style} />`
        break
      
      case 'circle':
        const radius = Math.min(width || 0, height || 0) / 2
        svg += `<circle cx="${x + radius}" cy="${y + radius}" r="${radius}" ${style} />`
        break
      
      case 'line':
        svg += `<line x1="${x}" y1="${y}" x2="${x + (width || 0)}" y2="${y + (height || 0)}" ${style} />`
        break
      
      case 'text':
        svg += `<text x="${x}" y="${y}" font-size="${fontSize || 16}" fill="${strokeColor}" opacity="${opacity}">${text || ''}</text>`
        break
      
      case 'path':
        if (element.points && element.points.length > 0) {
          const pathData = `M ${element.points.map(p => `${p.x} ${p.y}`).join(' L ')}`
          svg += `<path d="${pathData}" ${style} fill="none" />`
        }
        break
      
      case 'actor':
        const { actorShape, actorInitials, actorSpeech } = element
        if (actorShape === 'circle') {
          const radius = Math.min(width || 0, height || 0) / 2
          svg += `<circle cx="${x + radius}" cy="${y + radius}" r="${radius}" ${style} />`
          // Add initials
          svg += `<text x="${x + radius}" y="${y + radius + 5}" font-size="${Math.max(12, radius * 0.6)}" text-anchor="middle" fill="${strokeColor}" opacity="${opacity}">${actorInitials || ''}</text>`
        } else {
          svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${style} />`
          // Add initials
          svg += `<text x="${x + (width || 0) / 2}" y="${y + (height || 0) / 2 + 5}" font-size="${Math.max(12, Math.min(width || 0, height || 0) * 0.3)}" text-anchor="middle" fill="${strokeColor}" opacity="${opacity}">${actorInitials || ''}</text>`
        }
        // Add speech bubble if present
        if (actorSpeech) {
          const bubbleX = x + (width || 0) + 10
          const bubbleY = y - 20
          svg += `<rect x="${bubbleX}" y="${bubbleY}" width="100" height="30" fill="white" stroke="${strokeColor}" stroke-width="1" rx="5" />`
          svg += `<text x="${bubbleX + 5}" y="${bubbleY + 20}" font-size="12" fill="black">${actorSpeech}</text>`
        }
        break
    }
  })
  
  svg += '</svg>'
  return svg
}

function generatePNG(elements: Element[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create a temporary canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Não foi possível criar contexto do canvas'))
      return
    }
    
    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    elements.forEach(element => {
      const { x, y, width = 0, height = 0 } = element
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
    })
    
    const padding = 20
    canvas.width = maxX - minX + padding * 2
    canvas.height = maxY - minY + padding * 2
    
    // Set white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Translate to account for bounds
    ctx.translate(-minX + padding, -minY + padding)
    
    // Draw elements
    elements.forEach(element => {
      const { type, x, y, width, height, strokeColor, fillColor, strokeWidth, opacity, text, fontSize } = element
      
      ctx.globalAlpha = opacity
      ctx.strokeStyle = strokeColor
      ctx.fillStyle = fillColor
      ctx.lineWidth = strokeWidth
      
      switch (type) {
        case 'rectangle':
          if (fillColor !== 'transparent') {
            ctx.fillRect(x, y, width || 0, height || 0)
          }
          ctx.strokeRect(x, y, width || 0, height || 0)
          break
        
        case 'circle':
          const radius = Math.min(width || 0, height || 0) / 2
          ctx.beginPath()
          ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI)
          if (fillColor !== 'transparent') {
            ctx.fill()
          }
          ctx.stroke()
          break
        
        case 'line':
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + (width || 0), y + (height || 0))
          ctx.stroke()
          break
        
        case 'text':
          ctx.font = `${fontSize || 16}px Arial`
          ctx.fillStyle = strokeColor
          ctx.fillText(text || '', x, y)
          break
        
        case 'path':
          if (element.points && element.points.length > 0) {
            ctx.beginPath()
            ctx.moveTo(element.points[0].x, element.points[0].y)
            element.points.slice(1).forEach(point => {
              ctx.lineTo(point.x, point.y)
            })
            ctx.stroke()
          }
          break
        
        case 'actor':
          const { actorShape, actorInitials, actorSpeech } = element
          if (actorShape === 'circle') {
            const radius = Math.min(width || 0, height || 0) / 2
            ctx.beginPath()
            ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI)
            if (fillColor !== 'transparent') {
              ctx.fill()
            }
            ctx.stroke()
            // Add initials
            ctx.font = `${Math.max(12, radius * 0.6)}px Arial`
            ctx.fillStyle = strokeColor
            ctx.textAlign = 'center'
            ctx.fillText(actorInitials || '', x + radius, y + radius + 5)
          } else {
            if (fillColor !== 'transparent') {
              ctx.fillRect(x, y, width || 0, height || 0)
            }
            ctx.strokeRect(x, y, width || 0, height || 0)
            // Add initials
            ctx.font = `${Math.max(12, Math.min(width || 0, height || 0) * 0.3)}px Arial`
            ctx.fillStyle = strokeColor
            ctx.textAlign = 'center'
            ctx.fillText(actorInitials || '', x + (width || 0) / 2, y + (height || 0) / 2 + 5)
          }
          // Add speech bubble if present
          if (actorSpeech) {
            const bubbleX = x + (width || 0) + 10
            const bubbleY = y - 20
            ctx.fillStyle = 'white'
            ctx.fillRect(bubbleX, bubbleY, 100, 30)
            ctx.strokeStyle = strokeColor
            ctx.strokeRect(bubbleX, bubbleY, 100, 30)
            ctx.font = '12px Arial'
            ctx.fillStyle = 'black'
            ctx.textAlign = 'left'
            ctx.fillText(actorSpeech, bubbleX + 5, bubbleY + 20)
          }
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