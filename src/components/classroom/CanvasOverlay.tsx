'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { DrawingTool } from './toolbar/DrawingToolbar'

interface CanvasOverlayProps {
  tool: DrawingTool
  color: string
  /** 첫 번째 획이 끝났을 때 한 번만 호출 */
  onFirstStroke?: () => void
  /** 이 값이 증가할 때마다 캔버스를 전체 지움 */
  clearTrigger?: number
}

/* 도구별 설정 */
const TOOL_CONFIG: Record<DrawingTool, { lineWidth: number; alpha: number; composite: GlobalCompositeOperation }> = {
  pen:         { lineWidth: 2.5, alpha: 1.0,  composite: 'source-over' },
  highlighter: { lineWidth: 18,  alpha: 0.32, composite: 'source-over' },
  eraser:      { lineWidth: 24,  alpha: 1.0,  composite: 'destination-out' },
}

function getEventPos(
  e: MouseEvent | TouchEvent,
  rect: DOMRect,
): { x: number; y: number } {
  if ('touches' in e) {
    const touch = e.touches[0] ?? e.changedTouches[0]
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }
  return {
    x: (e as MouseEvent).clientX - rect.left,
    y: (e as MouseEvent).clientY - rect.top,
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function CanvasOverlay({ tool, color, onFirstStroke, clearTrigger }: CanvasOverlayProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const isDrawing      = useRef(false)
  const lastPos        = useRef({ x: 0, y: 0 })
  const firstStroked   = useRef(false)

  /* clearTrigger 증가 시 캔버스 전체 지우기 */
  useEffect(() => {
    if (!clearTrigger) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    firstStroked.current = false
  }, [clearTrigger])

  /* 캔버스 크기를 컨테이너에 맞게 설정 (리사이즈 대응) */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const sync = () => {
      /* imageData 보존 후 크기 조정 */
      const ctx  = canvas.getContext('2d')
      const snap = ctx?.getImageData(0, 0, canvas.width, canvas.height)
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      if (snap && canvas.width && canvas.height) ctx?.putImageData(snap, 0, 0)
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  /* 그리기 시작 */
  const onStart = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    isDrawing.current = true
    lastPos.current   = getEventPos(e, canvas.getBoundingClientRect())
  }, [])

  /* 드래그 중 */
  const onMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()

      const ctx    = canvas.getContext('2d')
      if (!ctx) return
      const pos    = getEventPos(e, canvas.getBoundingClientRect())
      const cfg    = TOOL_CONFIG[tool]

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.globalCompositeOperation = cfg.composite
      ctx.lineWidth   = cfg.lineWidth
      ctx.strokeStyle = cfg.composite === 'destination-out'
        ? 'rgba(0,0,0,1)'
        : hexToRgba(color, cfg.alpha)
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.stroke()
      ctx.restore()

      lastPos.current = pos
    },
    [tool, color],
  )

  /* 그리기 종료 */
  const onEnd = useCallback(() => {
    if (isDrawing.current && !firstStroked.current) {
      firstStroked.current = true
      onFirstStroke?.()
    }
    isDrawing.current = false
  }, [onFirstStroke])

  /* 이벤트 등록 */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown',  onStart)
    canvas.addEventListener('mousemove',  onMove)
    canvas.addEventListener('mouseup',    onEnd)
    canvas.addEventListener('mouseleave', onEnd)
    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove',  onMove,  { passive: false })
    canvas.addEventListener('touchend',   onEnd)

    return () => {
      canvas.removeEventListener('mousedown',  onStart)
      canvas.removeEventListener('mousemove',  onMove)
      canvas.removeEventListener('mouseup',    onEnd)
      canvas.removeEventListener('mouseleave', onEnd)
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove',  onMove)
      canvas.removeEventListener('touchend',   onEnd)
    }
  }, [onStart, onMove, onEnd])

  const cursor =
    tool === 'eraser'      ? 'cursor-cell'
    : tool === 'highlighter' ? 'cursor-crosshair'
    : 'cursor-crosshair'

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${cursor}`}
      style={{ touchAction: 'none' }}
    />
  )
}
