'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

/* 필기 도구 — 벡터 스트로크 모델
   · 색상: 주황 단색
   · 그리기: 연필(pen) / 형광펜(highlighter)
   · 지우개: 획 지우기(eraseStroke) / 그냥 지우기(erasePixel)
   · 커서: 답 선택 가능(캔버스 통과) */

const ORANGE = '#F97316'
type Tool = 'pen' | 'highlighter' | 'eraseStroke' | 'erasePixel' | 'cursor'
export interface Stroke { tool: 'pen' | 'highlighter' | 'erasePixel'; points: { x: number; y: number }[] }

const HL_WIDTH = 18

/**
 * 형광펜이 덮는 사각형.
 *
 * 손으로 그은 곡선을 그대로 칠하면 밑줄이 물결친다 — 실물 형광펜은 자를 대고 긋지 않아도
 * 종이 위에서 곧게 나간다(펜촉이 넓고 납작해서). 그래서 **시작점과 지금 점만** 보고
 * 가로로 더 갔으면 가로 띠, 세로로 더 갔으면 세로 띠를 만든다.
 */
function hlRect(pts: { x: number; y: number }[]) {
  const a = pts[0]
  const b = pts[pts.length - 1]
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  return dx >= dy
    ? { x: Math.min(a.x, b.x), y: a.y - HL_WIDTH / 2, w: Math.max(dx, 2), h: HL_WIDTH }
    : { x: a.x - HL_WIDTH / 2, y: Math.min(a.y, b.y), w: HL_WIDTH, h: Math.max(dy, 2) }
}

export function useDrawingTool(opts?: {
  /** 끌지 않고 **툭 누르면** 그 클릭을 캔버스 아래 요소로 넘긴다.
   *
   *  필기를 켜면 캔버스가 화면을 덮어 보기 클릭을 통째로 삼킨다. 그래서 지금까지는
   *  `필기 켬 → 답 고르려고 필기 끔 → 고름 → 다시 켬` 을 문항마다 반복해야 했다.
   *  시험지에서는 연필을 든 채로 답을 고른다 — 긋는 동작(끌기)과 고르는 동작(누르기)은
   *  손이 이미 구분하고 있으므로, 움직임이 거의 없는 입력은 필기로 치지 않고 흘려보낸다. */
  tapThrough?: boolean
}) {
  const [drawMode, setDrawMode] = useState(false)
  /** 획을 하나 그을 때마다 오르는 수 — 화면이 "필기가 멈췄다"를 알아야 자동 판정을 걸 수 있다.
   *  (ref 로 두면 리렌더가 안 돼서 감지 못 한다) */
  const [strokeCount, setStrokeCount] = useState(0)
  const [tool, setTool] = useState<Tool>('pen')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const currentRef = useRef<Stroke | null>(null)
  const isDrawing = useRef(false)
  /* 누르기 시작한 자리와 시각 — 끝날 때 '끈 것'인지 '툭 누른 것'인지 가른다 */
  const downRef = useRef<{ x: number; y: number; cx: number; cy: number; t: number } | null>(null)

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (!s.points.length) return
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (s.tool === 'highlighter') {
      // 곡선이 아니라 **띠**다 — 획을 잇지 않고 사각형 하나를 칠한다
      const r = hlRect(s.points)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.35
      ctx.fillStyle = ORANGE
      ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.restore()
      return
    }
    if (s.tool === 'erasePixel') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = 28
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = ORANGE
      ctx.lineWidth = 3
    }
    ctx.beginPath()
    const p0 = s.points[0]
    ctx.moveTo(p0.x, p0.y)
    if (s.points.length === 1) ctx.lineTo(p0.x + 0.1, p0.y + 0.1)
    else for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y)
    ctx.stroke()
    ctx.restore()
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const s of strokesRef.current) drawStroke(ctx, s)
    if (currentRef.current) drawStroke(ctx, currentRef.current)
  }, [])

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0)
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
  }

  const eraseAt = (pos: { x: number; y: number }) => {
    const before = strokesRef.current.length
    strokesRef.current = strokesRef.current.filter((s) => {
      if (s.tool === 'erasePixel') return true
      // 형광펜은 점이 둘뿐이라 점 거리로 재면 띠 한가운데를 문질러도 안 지워진다
      if (s.tool === 'highlighter') {
        const r = hlRect(s.points)
        return !(pos.x >= r.x - 4 && pos.x <= r.x + r.w + 4 && pos.y >= r.y - 4 && pos.y <= r.y + r.h + 4)
      }
      return !s.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 14)
    })
    if (strokesRef.current.length !== before) redraw()
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'cursor') return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    isDrawing.current = true
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
    const ne = e.nativeEvent as MouseEvent | TouchEvent
    const touch = 'touches' in ne && ne.touches.length > 0 ? ne.touches[0] : null
    downRef.current = {
      x: pos.x, y: pos.y,
      cx: touch ? touch.clientX : (ne as MouseEvent).clientX,
      cy: touch ? touch.clientY : (ne as MouseEvent).clientY,
      t: Date.now(),
    }
    if (tool === 'eraseStroke') { eraseAt(pos); return }
    currentRef.current = { tool, points: [pos] }
    redraw()
  }, [tool, redraw])

  const doDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
    if (tool === 'eraseStroke') { eraseAt(pos); return }
    if (!currentRef.current) return
    if (currentRef.current.tool === 'highlighter') {
      // 중간 점들은 필요 없다 — 시작점과 지금 점이 띠의 두 끝이다
      currentRef.current.points = [currentRef.current.points[0], pos]
    } else {
      currentRef.current.points.push(pos)
    }
    redraw()
  }, [tool, redraw])

  const endDraw = useCallback(() => {
    const down = downRef.current
    downRef.current = null

    /* 툭 누른 것인가 — 거의 안 움직였고 짧게 끝났다. 그러면 필기가 아니라 **클릭**이다.
       점 하나짜리 획을 남기지 않고, 캔버스를 잠깐 비켜 세워 아래 요소에 클릭을 전달한다. */
    if (opts?.tapThrough && down && currentRef.current) {
      const pts = currentRef.current.points
      const last = pts[pts.length - 1]
      const moved = Math.hypot(last.x - down.x, last.y - down.y)
      if (moved < 6 && Date.now() - down.t < 400) {
        currentRef.current = null
        isDrawing.current = false
        redraw()
        const c = canvasRef.current
        if (c) {
          const keep = c.style.pointerEvents
          c.style.pointerEvents = 'none'
          const el = document.elementFromPoint(down.cx, down.cy)
          c.style.pointerEvents = keep
          const hit = el?.closest('button, a, input, select, textarea, [role="button"]')
          if (hit instanceof HTMLElement) hit.click()
        }
        return
      }
    }

    if (currentRef.current) {
      strokesRef.current.push(currentRef.current)
      currentRef.current = null
      setStrokeCount((n) => n + 1)
    }
    isDrawing.current = false
  }, [opts?.tapThrough, redraw, canvasRef])

  const clearCanvas = useCallback(() => {
    strokesRef.current = []
    currentRef.current = null
    setStrokeCount(0)
    redraw()
  }, [redraw])

  /* 지금 캔버스의 획을 꺼낸다 / 다른 획으로 갈아 끼운다.
     문항을 넘길 때 잉크를 문항별로 따로 들고 있으려고 쓴다 — 안 그러면 5번에 그은 표시가
     6번 위에 그대로 남는다(캔버스는 하나다). */
  const exportStrokes = useCallback(() => strokesRef.current.slice(), [])
  const loadStrokes = useCallback((list: Stroke[]) => {
    strokesRef.current = list.slice()
    currentRef.current = null
    setStrokeCount(list.length)
    redraw()
  }, [redraw])

  const toggleDraw = useCallback(() => {
    setDrawMode((v) => !v)
    setTool('pen')
  }, [])

  return {
    drawMode, setDrawMode, toggleDraw,
    tool, setTool,
    canvasRef, startDraw, doDraw, endDraw, clearCanvas, redraw,
    exportStrokes, loadStrokes,
    strokeCount,
  }
}

type DrawingOverlayProps = ReturnType<typeof useDrawingTool>

/* 팔레트 버튼 */
function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 px-2.5 h-8 rounded-lg text-[11px] font-bold transition-colors ${active ? 'bg-[#F97316] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
    >
      {children}
    </button>
  )
}

type PaletteProps = Pick<DrawingOverlayProps, 'tool' | 'setTool' | 'clearCanvas' | 'setDrawMode'>

/* 도구 버튼 묶음 (플로팅 팔레트·인라인 바 공용) */
function PaletteButtons({ tool, setTool, clearCanvas, setDrawMode }: PaletteProps) {
  return (
    <>
      {/* 커서 (답 선택) */}
      <ToolBtn active={tool === 'cursor'} onClick={() => setTool('cursor')} title="커서 모드 (답 선택)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-7 1-4 7L5 3z" /></svg>
      </ToolBtn>

      <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

      {/* 연필 */}
      <ToolBtn active={tool === 'pen'} onClick={() => setTool('pen')} title="연필">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
        연필
      </ToolBtn>
      {/* 형광펜 */}
      <ToolBtn active={tool === 'highlighter'} onClick={() => setTool('highlighter')} title="형광펜">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h3l6-6" /><path d="m17 7-1.5-1.5a2 2 0 0 0-3 0L9 8.5l4 4 3.5-3.5a2 2 0 0 0 .5-2z" /></svg>
        형광펜
      </ToolBtn>

      {/* 주황 단색 표시 */}
      <span className="w-4 h-4 rounded-full ml-0.5" style={{ background: ORANGE }} title="주황" />

      <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

      {/* 획 지우기 */}
      <ToolBtn active={tool === 'eraseStroke'} onClick={() => setTool('eraseStroke')} title="대상 지우기 — 누른 선 하나가 통째로 지워집니다">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 7 7-2.5 2.5" /><path d="M6 11l7 7" /></svg>
        대상 지우기
      </ToolBtn>
      {/* 그냥 지우기 */}
      <ToolBtn active={tool === 'erasePixel'} onClick={() => setTool('erasePixel')} title="픽셀 지우기 — 문지른 자리만 지워집니다">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="14" width="18" height="6" rx="1" /><path d="M8 14l6-9 5 3-4 6" /></svg>
        픽셀 지우기
      </ToolBtn>
      {/* 전체 지우기 */}
      <button onClick={clearCanvas} title="전체 지우기" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
      </button>

      <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

      {/* 닫기 */}
      <button onClick={() => setDrawMode(false)} title="닫기" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </>
  )
}

/* 인라인 도구 바 — 레이아웃 흐름 안(예: 좌측 콘텐츠 영역 상단)에 한 줄로 배치.
   플로팅 팝업과 달리 아래 콘텐츠를 가리지 않고 밀어낸다. DrawingOverlay에는 hidePalette를 넘겨 캔버스만 렌더. */
export function DrawPalette({ className, ...p }: PaletteProps & { className?: string }) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto bg-white border-b border-[#E5E7EB] px-3 py-1.5 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className ?? ''}`}>
      <PaletteButtons {...p} />
    </div>
  )
}

/* ── 연필 FAB — 동그란 버튼 하나가 도구 바를 품고 있다 ──
   상단 도구줄의 '필기' 버튼을 대신한다. 누르면 옆으로 도구 바가 쭉 늘어나고, 다시 누르면 접힌다.
   필기는 지문 위에서 하는 일이라 도구도 지문 가까이(화면 좌하단)에 둔다. */
export function PenFab({ drawMode, toggleDraw, attention, className, bottomClass = 'bottom-5', ...p }: PaletteProps & {
  drawMode: boolean; toggleDraw: () => void
  /** 지금 단계가 "필기해 보세요"인가 — 버튼 주변을 뛰게 해 여기를 누르라고 알린다 */
  attention?: boolean; className?: string
  /** 아래쪽 띄우는 높이. 화면 하단에 바가 있으면 그만큼 올린다(실전은 제출/채점 바가 깔린다).
   *  className 으로 bottom-* 를 덧씌우면 Tailwind 규칙상 어느 쪽이 이길지 정해지지 않아 프롭으로 받는다. */
  bottomClass?: string
}) {
  const nudge = !!attention && !drawMode
  return (
    <div className={`fixed ${bottomClass} left-4 z-50 flex items-center gap-2 ${className ?? ''}`}>
      <div className="relative shrink-0">
        {/* 퍼지는 링 — 필기를 시켜놓고 도구가 어디 있는지 모르면 수업이 멈춘다 */}
        {nudge && <span className="absolute inset-0 rounded-full bg-[#F97316]/40 animate-ping pointer-events-none" />}
        <button onClick={toggleDraw} title="필기" aria-label="필기 도구"
          className={`relative w-12 h-12 rounded-full flex items-center justify-center border shadow-lg transition-colors ${
            drawMode ? 'bg-[#F97316] border-[#F97316] text-white'
              : nudge ? 'bg-[#FFF7ED] border-[#F97316] text-[#F97316] ring-4 ring-[#F97316]/20'
                : 'bg-white border-[#E5E7EB] text-[#F97316] hover:bg-[#FFF7ED]'
          }`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
      </div>
      {/* 도구 바가 접혀 있을 때만 뜨는 안내 — 펼치면 도구 바가 이 자리를 쓴다 */}
      {nudge && (
        <span className="shrink-0 rounded-full bg-[#F97316] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg whitespace-nowrap">
          여기를 눌러 필기하세요
        </span>
      )}
      {/* 늘어나는 도구 바 — 접힘은 max-width 로만 준다(언마운트하면 늘어나는 맛이 없다) */}
      <div className={`flex items-center gap-1 rounded-full bg-white overflow-hidden whitespace-nowrap
                       [&>*]:shrink-0 transition-[max-width,opacity,padding] duration-200 ${
        drawMode ? 'max-w-[68vw] opacity-100 px-2 py-1.5 border border-[#E5E7EB] shadow-lg'
          : 'max-w-0 opacity-0 px-0 py-1.5 border-0'
      }`}>
        <PaletteButtons {...p} />
      </div>
    </div>
  )
}

export function DrawingOverlay({ bounds, hidePalette, ...props }: DrawingOverlayProps & { bounds?: React.RefObject<HTMLElement>; hidePalette?: boolean }) {
  const { drawMode, setDrawMode, tool, setTool, canvasRef, startDraw, doDraw, endDraw, clearCanvas, redraw } = props
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  // 필기 영역 계산 (bounds 지정 시 그 영역만, 아니면 전체 화면)
  useEffect(() => {
    if (!drawMode) return
    const el = bounds?.current ?? null
    const update = () => {
      if (el) { const r = el.getBoundingClientRect(); setRect({ left: r.left, top: r.top, width: r.width, height: r.height }) }
      else setRect({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    let ro: ResizeObserver | undefined
    if (el && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(update); ro.observe(el) }
    return () => { window.removeEventListener('resize', update); ro?.disconnect() }
  }, [drawMode, bounds])

  // 영역에 맞춰 캔버스 크기 지정 후 다시 그림
  useEffect(() => {
    if (!drawMode || !rect) return
    const c = canvasRef.current
    if (!c) return
    c.width = rect.width
    c.height = rect.height
    redraw()
  }, [drawMode, rect, canvasRef, redraw])

  if (!drawMode || !rect) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="z-40"
        style={{
          position: 'fixed',
          left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          cursor: tool === 'cursor' ? 'default' : tool === 'eraseStroke' || tool === 'erasePixel' ? 'cell' : 'crosshair',
          touchAction: 'none',
          pointerEvents: tool === 'cursor' ? 'none' : 'auto',
        }}
        onMouseDown={startDraw}
        onMouseMove={doDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={doDraw}
        onTouchEnd={endDraw}
      />
      {!hidePalette && (
        <div
          className="z-50 flex items-center gap-1.5 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] px-3 py-2 -translate-x-1/2"
          style={{ position: 'fixed', left: '50%', bottom: 32 }}
        >
          <PaletteButtons tool={tool} setTool={setTool} clearCanvas={clearCanvas} setDrawMode={setDrawMode} />
        </div>
      )}
    </>
  )
}

export function DrawToggleButton({ drawMode, toggleDraw }: { drawMode: boolean; toggleDraw: () => void }) {
  return (
    <button
      onClick={toggleDraw}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${drawMode ? 'bg-[#F97316] text-white' : 'bg-[#FFF7ED] text-[#F97316]'}`}
      title="필기 도구"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    </button>
  )
}
