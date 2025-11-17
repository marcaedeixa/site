'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { createUnifiedStageSync } from '@/lib/svgUtils'

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
    stopSlideshow
  } = useEditorStore()

  const containerRef = useRef<HTMLDivElement | null>(null)

  const renderScene = useCallback(() => {
    if (currentSceneIndex < 0 || !scenes[currentSceneIndex]) return null

    const scene = scenes[currentSceneIndex]
    const { elements = [], stageConfig } = scene

    const sorted = [...elements]
      .filter(el => el.visible !== false)
      .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0))

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    const considerPoint = (x: number, y: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }

    const considerRect = (x = 0, y = 0, width = 0, height = 0) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return
      const x2 = x + width
      const y2 = y + height
      const left = Math.min(x, x2)
      const right = Math.max(x, x2)
      const top = Math.min(y, y2)
      const bottom = Math.max(y, y2)
      considerPoint(left, top)
      considerPoint(right, bottom)
    }

    sorted.forEach((el: any) => {
      considerRect(el.x ?? 0, el.y ?? 0, el.width ?? 0, el.height ?? 0)

      if (el.points && Array.isArray(el.points)) {
        el.points.forEach((point: any) => considerPoint(point.x, point.y))
      }

      if (el.pathBounds) {
        considerRect(el.pathBounds.x, el.pathBounds.y, el.pathBounds.width, el.pathBounds.height)
      }

      if (el.circleX !== undefined && el.circleY !== undefined) {
        considerRect(el.circleX, el.circleY, el.circleWidth ?? 0, el.circleHeight ?? 0)
      }
    })

    if (stageConfig) {
      considerRect(stageConfig.x ?? 0, stageConfig.y ?? 0, stageConfig.width ?? 0, stageConfig.height ?? 0)
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      minX = -400
      minY = -300
      maxX = 400
      maxY = 300
    }

    const padding = 64
    let originX = minX - padding
    let originY = minY - padding
    let contentWidth = Math.max(10, maxX - minX) + padding * 2
    let contentHeight = Math.max(10, maxY - minY) + padding * 2

    if (stageConfig) {
      const stageWidth = stageConfig.width ?? 0
      const stageHeight = stageConfig.height ?? 0
      const stageCenterX = (stageConfig.x ?? 0) + stageWidth / 2
      const stageCenterY = (stageConfig.y ?? 0) + stageHeight / 2

      if (
        Number.isFinite(stageCenterX) &&
        Number.isFinite(stageCenterY) &&
        Number.isFinite(stageWidth) &&
        Number.isFinite(stageHeight)
      ) {
        const halfWidthFromStage = stageWidth / 2
        const halfHeightFromStage = stageHeight / 2
        const halfWidthFromElements = Math.max(
          halfWidthFromStage,
          stageCenterX - minX,
          maxX - stageCenterX
        ) + padding
        const halfHeightFromElements = Math.max(
          halfHeightFromStage,
          stageCenterY - minY,
          maxY - stageCenterY
        ) + padding

        contentWidth = Math.max(10, halfWidthFromElements * 2)
        contentHeight = Math.max(10, halfHeightFromElements * 2)
        originX = stageCenterX - halfWidthFromElements
        originY = stageCenterY - halfHeightFromElements
      }
    }

    const viewBox = `${originX} ${originY} ${contentWidth} ${contentHeight}`
    const backgroundColor = stageConfig?.backgroundColor || '#ffffff'

    const arrowHead = (
      x2: number,
      y2: number,
      angle: number,
      color: string,
      width = 2,
      len = 15,
      ang = Math.PI / 6
    ) => (
      <>
        <line
          x1={x2}
          y1={y2}
          x2={x2 - len * Math.cos(angle - ang)}
          y2={y2 - len * Math.sin(angle - ang)}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
        />
        <line
          x1={x2}
          y1={y2}
          x2={x2 - len * Math.cos(angle + ang)}
          y2={y2 - len * Math.sin(angle + ang)}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
        />
      </>
    )

    const renderElement = (el: any) => {
      switch (el.type) {
        case 'rectangle': {
          const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
          const radius = el.borderRadius || 0
          if (radius > 0) {
            return (
              <rect
                key={el.id}
                x={el.x || 0}
                y={el.y || 0}
                width={el.width || 0}
                height={el.height || 0}
                rx={radius}
                ry={radius}
                fill={fill}
                stroke={el.strokeColor}
                strokeWidth={el.strokeWidth || 2}
                opacity={el.opacity ?? 1}
              />
            )
          }
          return (
            <rect
              key={el.id}
              x={el.x || 0}
              y={el.y || 0}
              width={el.width || 0}
              height={el.height || 0}
              fill={fill}
              stroke={el.strokeColor}
              strokeWidth={el.strokeWidth || 2}
              opacity={el.opacity ?? 1}
            />
          )
        }
        case 'circle': {
          const radius = Math.min(el.width || 0, el.height || 0) / 2
          const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
          return (
            <circle
              key={el.id}
              cx={(el.x || 0) + radius}
              cy={(el.y || 0) + radius}
              r={radius}
              fill={fill}
              stroke={el.strokeColor}
              strokeWidth={el.strokeWidth || 2}
              opacity={el.opacity ?? 1}
            />
          )
        }
        case 'text': {
          const fontSize = el.fontSize || 16
          const lineHeight = fontSize * 1.2
          const lines = (el.text || '').split(/\r?\n/)
          return (
            <text
              key={el.id}
              x={el.x || 0}
              y={el.y || 0}
              fontSize={fontSize}
              fill={el.strokeColor || '#000'}
              opacity={el.opacity ?? 1}
              dominantBaseline="hanging"
            >
              {lines.map((line, index) => (
                <tspan
                  key={index}
                  x={el.x || 0}
                  dy={index === 0 ? 0 : lineHeight}
                >
                  {line || ' '}
                </tspan>
              ))}
            </text>
          )
        }
        case 'textbox': {
          const paddingBox = 8
          const lines = (el.text || '').split('\n')
          const textColor = el.strokeColor || '#000'
          const strokeWidth = el.strokeWidth || 1
          const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
          return (
            <g key={el.id} opacity={el.opacity ?? 1}>
              <rect
                x={el.x || 0}
                y={el.y || 0}
                width={el.width || 0}
                height={el.height || 0}
                fill={fill}
                stroke={textColor}
                strokeWidth={strokeWidth}
              />
              <text
                x={(el.x || 0) + paddingBox}
                y={(el.y || 0) + paddingBox}
                fontSize={el.fontSize || 14}
                fill={textColor}
              >
                {lines.map((line: string, idx: number) => (
                  <tspan
                    key={idx}
                    x={(el.x || 0) + paddingBox}
                    dy={idx === 0 ? 0 : (el.fontSize || 14) * 1.25}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        }
        case 'line': {
          const x1 = el.x || 0
          const y1 = el.y || 0
          const x2 = x1 + (el.width || 0)
          const y2 = y1 + (el.height || 0)
          const strokeWidth = el.strokeWidth || 2
          const stroke = el.strokeColor || '#000'
          const isCurve = el.curveOffsetX !== undefined && el.curveOffsetY !== undefined
          const controlX = x1 + (x2 - x1) / 2 + (el.curveOffsetX || 0)
          const controlY = y1 + (y2 - y1) / 2 + (el.curveOffsetY || 0)
          const d = isCurve
            ? `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`
            : `M ${x1} ${y1} L ${x2} ${y2}`
          const props: any = {
            d,
            stroke,
            fill: 'none',
            strokeWidth,
            opacity: el.opacity ?? 1,
            strokeLinecap: 'round'
          }
          if (el.strokeDasharray) {
            props.strokeDasharray = el.strokeDasharray
          }
          return <path key={el.id} {...props} />
        }
        case 'arrow': {
          const x1 = el.x || 0
          const y1 = el.y || 0
          const x2 = x1 + (el.width || 0)
          const y2 = y1 + (el.height || 0)
          const strokeWidth = el.strokeWidth || 2
          const stroke = el.strokeColor || '#000'
          const isCurve = el.curveOffsetX !== undefined && el.curveOffsetY !== undefined
          const controlX = x1 + (x2 - x1) / 2 + (el.curveOffsetX || 0)
          const controlY = y1 + (y2 - y1) / 2 + (el.curveOffsetY || 0)
          const d = isCurve
            ? `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`
            : `M ${x1} ${y1} L ${x2} ${y2}`
          const angle = isCurve
            ? Math.atan2(y2 - controlY, x2 - controlX)
            : Math.atan2(y2 - y1, x2 - x1)
          const props: any = {
            d,
            stroke,
            fill: 'none',
            strokeWidth,
            opacity: el.opacity ?? 1,
            strokeLinecap: 'round'
          }
          if (el.strokeDasharray) {
            props.strokeDasharray = el.strokeDasharray
          }
          return (
            <g key={el.id}>
              <path {...props} />
              {arrowHead(x2, y2, angle, stroke, strokeWidth)}
            </g>
          )
        }
        case 'path': {
          if (el.pathData) {
            const bounds = el.pathBounds || {
              x: el.x || 0,
              y: el.y || 0,
              width: el.width || 0,
              height: el.height || 0
            }
            const scaleX = bounds.width ? (el.width || bounds.width) / bounds.width : 1
            const scaleY = bounds.height ? (el.height || bounds.height) / bounds.height : 1
            const translateX = (el.x || 0) - bounds.x
            const translateY = (el.y || 0) - bounds.y
            return (
              <path
                key={el.id}
                d={el.pathData}
                transform={`translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`}
                fill={el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'}
                stroke={el.strokeColor || '#000'}
                strokeWidth={el.strokeWidth || 2}
                opacity={el.opacity ?? 1}
              />
            )
          }
          if (el.points && el.points.length > 1) {
            const d = `M ${el.points
              .map((p: any, index: number) => (index === 0 ? `${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
              .join(' ')}`
            return (
              <path
                key={el.id}
                d={d}
                fill="none"
                stroke={el.strokeColor || '#000'}
                strokeWidth={el.strokeWidth || 2}
                opacity={el.opacity ?? 1}
              />
            )
          }
          return null
        }
        case 'actor': {
          const width = el.width || el.actorSize || 60
          const height = el.height || el.actorSize || width
          const x = el.x || 0
          const y = el.y || 0
          const color = el.actorColor || el.fillColor || '#3b82f6'
          const initials = el.actorInitials || ''
          const fontSize = Math.max(12, Math.min(width, height) * 0.3)
          const textX = x + width / 2
          const textY = y + height / 2 + fontSize * 0.35

          if (el.actorShape === 'circle') {
            return (
              <g key={el.id} opacity={el.opacity ?? 1}>
                <circle cx={x + width / 2} cy={y + height / 2} r={Math.min(width, height) / 2} fill={color} />
                {initials && (
                  <text x={textX} y={textY} fontSize={fontSize} fill="#fff" textAnchor="middle">
                    {initials}
                  </text>
                )}
              </g>
            )
          }

          return (
            <g key={el.id} opacity={el.opacity ?? 1}>
              <rect x={x} y={y} width={width} height={height} fill={color} />
              {initials && (
                <text x={textX} y={textY} fontSize={fontSize} fill="#fff" textAnchor="middle">
                  {initials}
                </text>
              )}
            </g>
          )
        }
        case 'object': {
          const width = el.width || 60
          const height = el.height || width
          const x = el.x || 0
          const y = el.y || 0
          const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
          const stroke = el.strokeColor || '#000'
          const strokeDasharray = el.strokeDasharray
          const shape = normalizeObjectShape(el.objectShape)

          if (shape === 'triangle') {
            const points = [
              `${x + width / 2} ${y}`,
              `${x} ${y + height}`,
              `${x + width} ${y + height}`
            ].join(' ')
            return (
              <polygon
                key={el.id}
                points={points}
                fill={fill}
                stroke={stroke}
                strokeWidth={el.strokeWidth || 2}
                opacity={el.opacity ?? 1}
                strokeDasharray={strokeDasharray}
              />
            )
          }

          if (shape === 'hexagon') {
            const cx = x + width / 2
            const cy = y + height / 2
            const radius = Math.min(width, height) / 2
            const points = Array.from({ length: 6 })
              .map((_, index) => {
                const angle = (index * Math.PI) / 3
                return `${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`
              })
              .join(' ')
            return (
              <polygon
                key={el.id}
                points={points}
                fill={fill}
                stroke={stroke}
                strokeWidth={el.strokeWidth || 2}
                opacity={el.opacity ?? 1}
                strokeDasharray={strokeDasharray}
              />
            )
          }

          return (
            <rect
              key={el.id}
              x={x}
              y={y}
              width={width}
              height={height}
              fill={fill}
              stroke={stroke}
              strokeWidth={el.strokeWidth || 2}
              opacity={el.opacity ?? 1}
              strokeDasharray={strokeDasharray}
            />
          )
        }
        case 'stage': {
          const rectBounds = {
            x: el.x || 0,
            y: el.y || 0,
            width: el.width || 0,
            height: el.height || 0
          }
          const circleBounds =
            el.circleX !== undefined && el.circleY !== undefined
              ? {
                  x: el.circleX,
                  y: el.circleY,
                  width: el.circleWidth || 0,
                  height: el.circleHeight || 0
                }
              : null
          const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
          const stroke = el.strokeColor || '#000'
          const strokeWidth = el.strokeWidth || 2

          if (circleBounds) {
            const path = createUnifiedStageSync(rectBounds, circleBounds)
            if (path) {
              return (
                <path
                  key={el.id}
                  d={path}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={el.opacity ?? 1}
                />
              )
            }
          }

          return (
            <rect
              key={el.id}
              x={rectBounds.x}
              y={rectBounds.y}
              width={rectBounds.width}
              height={rectBounds.height}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={el.opacity ?? 1}
            />
          )
        }
        default:
          return null
      }
    }

    return (
      <svg
        className="w-full h-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: backgroundColor }}
      >
        {sorted.map(renderElement)}
      </svg>
    )
  }, [scenes, currentSceneIndex])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        stopFullscreenSlideshow()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    if (isFullscreenSlideshow) {
      if (node.requestFullscreen && document.fullscreenElement !== node) {
        node.requestFullscreen().catch(() => {})
      }
    } else if (document.fullscreenElement === node) {
      document.exitFullscreen().catch(() => {})
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (!isFullscreenSlideshow && document.fullscreenElement === node) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [isFullscreenSlideshow, stopFullscreenSlideshow])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          stopFullscreenSlideshow()
          break
        case 'ArrowLeft':
          e.preventDefault()
          previousScene()
          break
        case 'ArrowRight':
          e.preventDefault()
          nextScene()
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPlayingSlideshow, stopSlideshow, startSlideshow, previousScene, nextScene, stopFullscreenSlideshow])

  if (!isFullscreenSlideshow) return null
  const currentScene = scenes[currentSceneIndex]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      <div className="w-full h-full flex items-center justify-center">
        {renderScene()}
      </div>

      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="bg-black/60 text-white px-4 py-2 rounded-lg">
          <span className="text-sm">
            {currentScene?.name || `Cena ${currentSceneIndex + 1}`} ({currentSceneIndex + 1} de {scenes.length})
          </span>
        </div>
        <button
          onClick={stopFullscreenSlideshow}
          className="bg-black/60 text-white p-2 rounded-lg hover:bg-black/80"
        >
          <X size={24} />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-6 py-3 rounded-lg">
        <button
          onClick={previousScene}
          className="text-white hover:text-blue-400 disabled:opacity-40"
          disabled={scenes.length <= 1}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={isPlayingSlideshow ? stopSlideshow : startSlideshow}
          className="text-white hover:text-blue-400"
        >
          {isPlayingSlideshow ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={nextScene}
          className="text-white hover:text-blue-400 disabled:opacity-40"
          disabled={scenes.length <= 1}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {isPlayingSlideshow && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          <div className="bg-green-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span className="text-sm font-medium">Auto</span>
          </div>
        </div>
      )}
    </div>
  )
}
