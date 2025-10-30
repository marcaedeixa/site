'use client'

import { useEffect, useCallback } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'

export const FullscreenSlideshow = () => {
  const {
    scenes,
    currentSceneIndex,
    isPlayingSlideshow,
    isFullscreenSlideshow,
    stopFullscreenSlideshow,
    nextScene,
    previousScene,
    startSlideshow,
    stopSlideshow,
    initializeWithSampleData
  } = useEditorStore()

  useEffect(() => {
    if (scenes.length === 0) initializeWithSampleData()
  }, [])

  const renderScene = useCallback(() => {
    if (currentSceneIndex < 0 || !scenes[currentSceneIndex]) return null
    const scene = scenes[currentSceneIndex]
    const { elements = [], stageConfig } = scene

    const stageWidth = stageConfig?.width || 800
    const stageHeight = stageConfig?.height || 600
    const stageX = stageConfig?.x || 0
    const stageY = stageConfig?.y || 0

    // Ordenar elementos visíveis por zIndex
    const sorted = [...elements]
      .filter(el => el.visible !== false)
      .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0))

    // ViewBox baseado no palco para centralização
    const viewBox = `0 0 ${stageWidth} ${stageHeight}`

    const arrowHead = (x2: number, y2: number, angle: number, len = 15, ang = Math.PI / 6) => (
      <g>
        <line x1={x2} y1={y2} x2={x2 - len * Math.cos(angle - ang)} y2={y2 - len * Math.sin(angle - ang)} strokeWidth={2} />
        <line x1={x2} y1={y2} x2={x2 - len * Math.cos(angle + ang)} y2={y2 - len * Math.sin(angle + ang)} strokeWidth={2} />
      </g>
    )

    const E = (el: any) => {
      const common: any = { stroke: el.strokeColor, fill: el.fillColor, opacity: el.opacity, strokeWidth: el.strokeWidth }
      switch (el.type) {
        case 'rectangle':
          return <rect key={el.id} x={(el.x || 0) - stageX} y={(el.y || 0) - stageY} width={el.width || 0} height={el.height || 0} {...common} />
        case 'circle': {
          const r = Math.min(el.width || 0, el.height || 0) / 2
          return <circle key={el.id} cx={(el.x || 0) - stageX + r} cy={(el.y || 0) - stageY + r} r={r} {...common} />
        }
        case 'text':
          return <text key={el.id} x={(el.x || 0) - stageX} y={(el.y || 0) - stageY + (el.fontSize || 16)} fontSize={el.fontSize || 16} fill={el.strokeColor} opacity={el.opacity}>{el.text || ''}</text>
        case 'textbox': {
          const pad = 8
          const lines = (el.text || '').split('\n')
          return (
            <g key={el.id}>
              {el.fillColor && el.fillColor !== 'transparent' && (
                <rect x={(el.x || 0) - stageX} y={(el.y || 0) - stageY} width={el.width || 0} height={el.height || 0} fill={el.fillColor} />
              )}
              <rect x={(el.x || 0) - stageX} y={(el.y || 0) - stageY} width={el.width || 0} height={el.height || 0} stroke={el.strokeColor || '#ccc'} strokeWidth={el.strokeWidth || 1} fill="none" />
              <text x={(el.x || 0) - stageX + pad} y={(el.y || 0) - stageY + pad} fontSize={el.fontSize || 14} fill={el.strokeColor || '#000'}>
                {lines.map((line: string, idx: number) => (
                  <tspan key={idx} x={(el.x || 0) - stageX + pad} dy={idx === 0 ? 0 : (el.fontSize || 14) * 1.25}>{line}</tspan>
                ))}
              </text>
            </g>
          )
        }
        case 'line': {
          const x = (el.x || 0) - stageX, y = (el.y || 0) - stageY
          const w = el.width || 0, h = el.height || 0
          const style: any = { stroke: el.strokeColor, fill: 'none', strokeWidth: el.strokeWidth || 2 }
          if (el.strokeDasharray) style.strokeDasharray = el.strokeDasharray
          const d = (el.curveOffsetX !== undefined && el.curveOffsetY !== undefined)
            ? `M ${x} ${y} Q ${x + w / 2 + (el.curveOffsetX || 0)} ${y + h / 2 + (el.curveOffsetY || 0)} ${x + w} ${y + h}`
            : `M ${x} ${y} L ${x + w} ${y + h}`
          return <path key={el.id} d={d} {...style} />
        }
        case 'arrow': {
          const x = (el.x || 0) - stageX, y = (el.y || 0) - stageY
          const w = el.width || 0, h = el.height || 0
          const style: any = { stroke: el.strokeColor, fill: 'none', strokeWidth: el.strokeWidth || 2 }
          if (el.strokeDasharray) style.strokeDasharray = el.strokeDasharray
          const isCurve = (el.curveOffsetX !== undefined && el.curveOffsetY !== undefined)
          const cx = x + w / 2 + (el.curveOffsetX || 0)
          const cy = y + h / 2 + (el.curveOffsetY || 0)
          const d = isCurve ? `M ${x} ${y} Q ${cx} ${cy} ${x + w} ${y + h}` : `M ${x} ${y} L ${x + w} ${y + h}`
          const ang = isCurve ? Math.atan2((y + h) - cy, (x + w) - cx) : Math.atan2(h, w)
          return (
            <g key={el.id}>
              <path d={d} {...style} strokeLinecap="round" />
              <g stroke={el.strokeColor} fill="none">{arrowHead(x + w, y + h, ang, 15, Math.PI / 6)}</g>
            </g>
          )
        }
        case 'path': {
          if (el.pathData) {
            const pb = el.pathBounds || { x: el.x || 0, y: el.y || 0, width: el.width || 0, height: el.height || 0 }
            const sx = pb.width ? ((el.width || 0) / pb.width) : 1
            const sy = pb.height ? ((el.height || 0) / pb.height) : 1
            const tx = ((el.x || 0) - stageX) - pb.x
            const ty = ((el.y || 0) - stageY) - pb.y
            return (
              <path key={el.id} d={el.pathData} transform={`translate(${tx} ${ty}) scale(${sx} ${sy})`} stroke={el.strokeColor} fill={el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'} opacity={el.opacity} strokeWidth={el.strokeWidth || 2} />
            )
          }
          if (el.points && el.points.length > 1) {
            const d = `M ${el.points.map((p: any, i: number) => (i === 0 ? `${p.x - stageX} ${p.y - stageY}` : `L ${p.x - stageX} ${p.y - stageY}`)).join(' ')}`
            return <path key={el.id} d={d} stroke={el.strokeColor} fill="none" opacity={el.opacity} strokeWidth={el.strokeWidth || 2} />
          }
          return null
        }
        case 'actor': {
          const size = el.actorSize || 50
          const color = el.actorColor || '#3b82f6'
          const initials = el.actorInitials || ''
          const fs = Math.max(12, size * 0.3)
          if (el.actorShape === 'circle') {
            return (
              <g key={el.id}>
                <circle cx={(el.x || 0) - stageX + size/2} cy={(el.y || 0) - stageY + size/2} r={size/2} fill={color} />
                {initials && (<text x={(el.x || 0) - stageX + size/2} y={(el.y || 0) - stageY + size/2 + size * 0.1} fontSize={fs} fill="#fff" textAnchor="middle">{initials}</text>)}
              </g>
            )
          }
          return (
            <g key={el.id}>
              <rect x={(el.x || 0) - stageX} y={(el.y || 0) - stageY} width={size} height={size} fill={color} />
              {initials && (<text x={(el.x || 0) - stageX + size/2} y={(el.y || 0) - stageY + size/2 + size * 0.1} fontSize={fs} fill="#fff" textAnchor="middle">{initials}</text>)}
            </g>
          )
        }
        case 'object': {
          const size = el.width || 50
          if (el.objectShape === 'triangle') {
            const points = [
              `${(el.x || 0) - stageX + size/2} ${(el.y || 0) - stageY}`,
              `${(el.x || 0) - stageX} ${(el.y || 0) - stageY + size}`,
              `${(el.x || 0) - stageX + size} ${(el.y || 0) - stageY + size}`
            ].join(' ')
            return <polygon key={el.id} points={points} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth || 1} />
          }
          if (el.objectShape === 'hexagon') {
            const cx = (el.x || 0) - stageX + size/2
            const cy = (el.y || 0) - stageY + size/2
            const r = size/2
            const pts = Array.from({ length: 6 }).map((_, i) => {
              const a = (i * Math.PI) / 3
              return `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
            }).join(' ')
            return <polygon key={el.id} points={pts} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth || 1} />
          }
          return <rect key={el.id} x={(el.x || 0) - stageX} y={(el.y || 0) - stageY} width={size} height={size} fill={el.fillColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth || 1} />
        }
        default:
          return null
      }
    }

    // Render com dimensões fixas e centralização diretamente no container principal
    return (
      <svg width={stageWidth} height={stageHeight} viewBox={viewBox} style={{ background: stageConfig?.backgroundColor || '#ffffff', maxWidth: '100%', maxHeight: '100%' }}>
        <rect x={0} y={0} width={stageWidth} height={stageHeight} fill={stageConfig?.backgroundColor || '#ffffff'} />
        {sorted.map(E)}
      </svg>
    )
  }, [scenes, currentSceneIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          stopFullscreenSlideshow(); break
        case 'ArrowLeft':
          e.preventDefault(); previousScene(); break
        case 'ArrowRight':
          e.preventDefault(); nextScene(); break
        case ' ': // espaço
          e.preventDefault(); isPlayingSlideshow ? stopSlideshow() : startSlideshow(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPlayingSlideshow, stopSlideshow, startSlideshow, previousScene, nextScene, stopFullscreenSlideshow])

  if (!isFullscreenSlideshow) return null
  const currentScene = scenes[currentSceneIndex]

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {renderScene()}

      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          <span className="text-sm">{currentScene?.name || `Cena ${currentSceneIndex + 1}`} ({currentSceneIndex + 1} de {scenes.length})</span>
        </div>
        <button onClick={stopFullscreenSlideshow} className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70"><X size={24} /></button>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black bg-opacity-50 px-6 py-3 rounded-lg">
        <button onClick={previousScene} className="text-white hover:text-blue-400" disabled={scenes.length <= 1}><ChevronLeft size={24} /></button>
        <button onClick={isPlayingSlideshow ? stopSlideshow : startSlideshow} className="text-white hover:text-blue-400">{isPlayingSlideshow ? <Pause size={24} /> : <Play size={24} />}</button>
        <button onClick={nextScene} className="text-white hover:text-blue-400" disabled={scenes.length <= 1}><ChevronRight size={24} /></button>
      </div>

      {isPlayingSlideshow && (
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
          <div className="bg-green-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-sm font-medium">Auto</span>
          </div>
        </div>
      )}
    </div>
  )
}