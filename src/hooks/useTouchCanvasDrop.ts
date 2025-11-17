'use client'

import { useCallback, useRef } from 'react'
import type { TouchEvent } from 'react'

export const TOUCH_DROP_EVENT = 'editor:touch-drop'

export interface TouchDropPayload {
  type: string
  [key: string]: unknown
}

export interface TouchDropDetail {
  payload: TouchDropPayload
  clientX: number
  clientY: number
}

export function useTouchCanvasDrop() {
  const payloadRef = useRef<TouchDropPayload | null>(null)

  const clearPayload = () => {
    payloadRef.current = null
  }

  const handleTouchStart = useCallback((event: TouchEvent, payload: TouchDropPayload) => {
    if (event.touches.length !== 1) {
      clearPayload()
      return
    }

    payloadRef.current = payload
    event.preventDefault()
  }, [])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!payloadRef.current) return
    event.preventDefault()
  }, [])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!payloadRef.current) return
    const touch = event.changedTouches[0]
    if (touch) {
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      if (target instanceof Element && target.closest('[data-editor-canvas="true"]')) {
        window.dispatchEvent(new CustomEvent<TouchDropDetail>(TOUCH_DROP_EVENT, {
          detail: {
            payload: payloadRef.current,
            clientX: touch.clientX,
            clientY: touch.clientY
          }
        }))
      }
    }

    clearPayload()
  }, [])

  const handleTouchCancel = useCallback(() => {
    clearPayload()
  }, [])

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel
  }
}
