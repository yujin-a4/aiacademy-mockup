'use client'

import { useRef, useEffect, useCallback, forwardRef } from 'react'
import type { DrawingTool } from './toolbar/DrawingToolbar'

interface CanvasOverlayProps {
  tool: DrawingTool
  color: string
  /** 첫 번째 획이 끝났을 때 한 번만 호출
   *  relX/relY: 캔버스 내 비율 (0~1), screenX/screenY: 절대 화면 좌표 (px) */
  onFirstStroke?: (relX: number, relY: number, screenX: number, screenY: number) => void
  /** 이 값이 증가할 때마다 캔버스를 전체 지움 */
  clearTrigger?: number
  /** 이 값이 증가할 때마다 캔버스 내용은 유지한 채 첫 획 상태만 초기화 */
  strokeResetTrigger?: number
  /** 획이 시작될 때 호출 (STT 일시정지용) */
  onDrawStart?: () => void
  /** 획이 끝날 때마다 호출 (실시간 필기 감지용) */
  onStrokeEnd?: () => void
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

/* ── 도구별 커서 ── */
function buildCursor(tool: DrawingTool, color: string): string {
  if (tool === 'pen') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <path d="M16 2 L20 6 L7 19 L3 15 Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.6"/>
      <path d="M16 2 L18 4 L5 17 L3 15 Z" fill="#E2E8F0"/>
      <path d="M3 15 L7 19 L4 21.5 Z" fill="#FDE68A" stroke="#D97706" strokeWidth="0.4"/>
      <path d="M3.5 19 L5 21.5 L2.5 21 Z" fill="${color}"/>
    </svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 21, crosshair`
  }

  if (tool === 'highlighter') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <path d="M15 2 L19 6 L9 17 L5 13 Z" fill="#CBD5E1" stroke="#9CA3AF" strokeWidth="0.6"/>
      <path d="M15 2 L17 4 L7 15 L5 13 Z" fill="#E2E8F0"/>
      <path d="M5 13 L9 17 L5 21 L1 17 Z" fill="${color}" stroke="#D97706" strokeWidth="0.4"/>
    </svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 20, crosshair`
  }

  /* eraser */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="16" viewBox="0 0 22 16">
    <rect x="1" y="1" width="20" height="10" rx="2" fill="#FCA5A5" stroke="#F87171" strokeWidth="0.8"/>
    <rect x="1" y="1" width="7" height="10" rx="2" fill="#FECACA"/>
    <rect x="1" y="9" width="20" height="6" rx="1.5" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="0.7"/>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 11 8, cell`
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const CanvasOverlay = forwardRef<HTMLCanvasElement, CanvasOverlayProps>(function CanvasOverlay(
  { tool, color, onFirstStroke, clearTrigger, strokeResetTrigger, onDrawStart, onStrokeEnd },
  forwardedRef,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* 외부 ref와 내부 ref를 동기화 */
  useEffect(() => {
    if (!forwardedRef) return
    if (typeof forwardedRef === 'function') {
      forwardedRef(canvasRef.current)
    } else {
      forwardedRef.current = canvasRef.current
    }
  })
  const isDrawing       = useRef(false)
  const lastPos         = useRef({ x: 0, y: 0 })
  const strokeStartPos  = useRef({ x: 0, y: 0 })
  const firstStroked    = useRef(false)
  /* 형광펜 전용 — 스냅샷 + 경로 수집 */
  const hlSnapshot      = useRef<ImageData | null>(null)
  const hlPoints        = useRef<{ x: number; y: number }[]>([])

  /* clearTrigger 증가 시 캔버스 전체 지우기 */
  useEffect(() => {
    if (!clearTrigger) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    firstStroked.current = false
  }, [clearTrigger])

  /* onFirstStroke prop이 바뀔 때마다 (예: 드로잉 턴 진입 시 undefined → fn) 첫 획 상태 초기화 */
  useEffect(() => {
    firstStroked.current = false
  }, [onFirstStroke])

  /* strokeResetTrigger 증가 시 캔버스 내용은 유지한 채 첫 획 상태만 초기화 */
  useEffect(() => {
    if (!strokeResetTrigger) return
    firstStroked.current = false
  }, [strokeResetTrigger])

  /* 캔버스 크기를 컨테이너에 맞게 설정 (리사이즈 대응) */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const sync = () => {
      const ctx = canvas.getContext('2d')
      /* 크기가 0이면 getImageData 자체가 에러 — 조기 종료 */
      const prevW = canvas.width
      const prevH = canvas.height
      const snap = (ctx && prevW > 0 && prevH > 0)
        ? ctx.getImageData(0, 0, prevW, prevH)
        : null
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      if (snap && canvas.width > 0 && canvas.height > 0) ctx?.putImageData(snap, 0, 0)
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
    onDrawStart?.()
    const pos = getEventPos(e, canvas.getBoundingClientRect())
    lastPos.current        = pos
    strokeStartPos.current = pos

    if (tool === 'highlighter') {
      const ctx = canvas.getContext('2d')
      hlSnapshot.current = ctx?.getImageData(0, 0, canvas.width, canvas.height) ?? null
      hlPoints.current   = [pos]
    }
  }, [tool, onDrawStart])

  /* 드래그 중 */
  const onMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const pos = getEventPos(e, canvas.getBoundingClientRect())

      if (tool === 'highlighter') {
        hlPoints.current.push(pos)
        /* 스냅샷으로 복원 후 전체 경로를 한 번에 그림 → 겹침 없이 균일한 색 */
        if (hlSnapshot.current) ctx.putImageData(hlSnapshot.current, 0, 0)
        const pts = hlPoints.current
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha  = 0.35
        ctx.lineWidth    = 18
        ctx.strokeStyle  = color
        ctx.lineCap      = 'round'
        ctx.lineJoin     = 'round'
        ctx.stroke()
        ctx.restore()
      } else {
        const cfg = TOOL_CONFIG[tool]
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
      }

      lastPos.current = pos
    },
    [tool, color],
  )

  /* 그리기 종료 */
  const onEnd = useCallback(() => {
    if (tool === 'highlighter') {
      hlSnapshot.current = null
      hlPoints.current   = []
    }

    if (isDrawing.current) {
      const dx = lastPos.current.x - strokeStartPos.current.x
      const dy = lastPos.current.y - strokeStartPos.current.y
      const isTap = Math.sqrt(dx * dx + dy * dy) < 5

      if (isTap) {
        /* 탭 → 캔버스 아래 요소에 클릭 전달 */
        const canvas = canvasRef.current
        const rect = canvas?.getBoundingClientRect()
        if (rect) {
          const screenX = rect.left + strokeStartPos.current.x
          const screenY = rect.top  + strokeStartPos.current.y
          const els = document.elementsFromPoint(screenX, screenY)
          const target = els.find((el) => el !== canvas) as HTMLElement | undefined
          target?.click()
        }
      } else {
        if (!firstStroked.current) {
          firstStroked.current = true
          if (onFirstStroke) {
            const canvas = canvasRef.current
            const relX    = canvas ? strokeStartPos.current.x / canvas.width  : 0.5
            const relY    = canvas ? strokeStartPos.current.y / canvas.height : 0.5
            const rect    = canvas?.getBoundingClientRect()
            const screenX = (rect?.left ?? 0) + strokeStartPos.current.x
            const screenY = (rect?.top  ?? 0) + strokeStartPos.current.y
            onFirstStroke(relX, relY, screenX, screenY)
          }
        }
        onStrokeEnd?.()
      }
    }

    isDrawing.current = false
  }, [tool, onFirstStroke, onStrokeEnd])

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

  const cursorStyle = buildCursor(tool, color)

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none', cursor: cursorStyle }}
    />
  )
})

export default CanvasOverlay
