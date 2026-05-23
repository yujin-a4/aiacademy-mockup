'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

const PEN_COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#1C1B33']

export function useDrawingTool() {
  const [drawMode, setDrawMode] = useState(false)
  const [cursorMode, setCursorMode] = useState(false)
  const [penColor, setPenColor] = useState('#2563EB')
  const [eraserMode, setEraserMode] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!drawMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }, [drawMode])

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0)
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    isDrawing.current = true
    lastPos.current = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
  }, [])

  const doDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !lastPos.current) return
    e.preventDefault()
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    if (eraserMode) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = 24
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = penColor
      ctx.lineWidth = 3
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }, [eraserMode, penColor])

  const endDraw = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const toggleDraw = useCallback(() => {
    setDrawMode(v => !v)
    setEraserMode(false)
    setCursorMode(false)
  }, [])

  return {
    drawMode, cursorMode, setCursorMode,
    penColor, setPenColor,
    eraserMode, setEraserMode,
    canvasRef, startDraw, doDraw, endDraw, clearCanvas, toggleDraw,
    setDrawMode,
  }
}

type DrawingOverlayProps = ReturnType<typeof useDrawingTool>

export function DrawingOverlay(props: DrawingOverlayProps) {
  const {
    drawMode, cursorMode, setCursorMode,
    penColor, setPenColor,
    eraserMode, setEraserMode,
    canvasRef, startDraw, doDraw, endDraw, clearCanvas, setDrawMode,
  } = props

  if (!drawMode) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-40"
        style={{
          cursor: cursorMode ? 'default' : eraserMode ? 'cell' : 'crosshair',
          touchAction: 'none',
          pointerEvents: cursorMode ? 'none' : 'auto',
        }}
        onMouseDown={startDraw}
        onMouseMove={doDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={doDraw}
        onTouchEnd={endDraw}
      />
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white rounded-2xl shadow-xl border border-[#DBEAFE] px-3 py-2">
        {/* 커서 모드 */}
        <button
          onClick={() => { setCursorMode(v => !v); setEraserMode(false) }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${cursorMode ? 'bg-[#2563EB] text-white' : 'text-[#9CA3AF] hover:bg-[#F3F4F6]'}`}
          title="커서 모드 (답 선택 가능)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l14 9-7 1-4 7L5 3z"/>
          </svg>
        </button>
        <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />
        {/* 색상 */}
        {PEN_COLORS.map(color => (
          <button
            key={color}
            onClick={() => { setPenColor(color); setEraserMode(false); setCursorMode(false) }}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              background: color,
              borderColor: !eraserMode && !cursorMode && penColor === color ? '#1C1B33' : 'transparent',
              transform: !eraserMode && !cursorMode && penColor === color ? 'scale(1.2)' : undefined,
            }}
          />
        ))}
        <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />
        {/* 지우개 */}
        <button
          onClick={() => { setEraserMode(v => !v); setCursorMode(false) }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${eraserMode ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#9CA3AF] hover:bg-[#F3F4F6]'}`}
          title="지우개"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6.0 11.0 l7 7"/>
          </svg>
        </button>
        {/* 전체 지우기 */}
        <button
          onClick={clearCanvas}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
          title="전체 지우기"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
        {/* 닫기 */}
        <button
          onClick={() => { setDrawMode(false); setEraserMode(false); setCursorMode(false) }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors ml-0.5"
          title="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </>
  )
}

export function DrawToggleButton({ drawMode, toggleDraw }: { drawMode: boolean; toggleDraw: () => void }) {
  return (
    <button
      onClick={toggleDraw}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${drawMode ? 'bg-[#2563EB] text-white' : 'bg-[#EFF6FF] text-[#2563EB]'}`}
      title="필기 도구"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    </button>
  )
}
