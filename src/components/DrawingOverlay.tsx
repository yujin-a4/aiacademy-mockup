'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

/* 필기 도구 — 벡터 스트로크 모델
   · 색상: 주황 단색
   · 그리기: 연필(pen) / 형광펜(highlighter)
   · 지우개: 획 지우기(eraseStroke) / 그냥 지우기(erasePixel)
   · 커서: 답 선택 가능(캔버스 통과) */

const ORANGE = '#F97316'
type Tool = 'pen' | 'highlighter' | 'eraseStroke' | 'erasePixel' | 'cursor'
interface Stroke { tool: 'pen' | 'highlighter' | 'erasePixel'; points: { x: number; y: number }[] }

export function useDrawingTool() {
  const [drawMode, setDrawMode] = useState(false)
  /** 획을 하나 그을 때마다 오르는 수 — 화면이 "필기가 멈췄다"를 알아야 자동 판정을 걸 수 있다.
   *  (ref 로 두면 리렌더가 안 돼서 감지 못 한다) */
  const [strokeCount, setStrokeCount] = useState(0)
  const [tool, setTool] = useState<Tool>('pen')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const currentRef = useRef<Stroke | null>(null)
  const isDrawing = useRef(false)

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (!s.points.length) return
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (s.tool === 'erasePixel') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = 28
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = ORANGE
      if (s.tool === 'highlighter') { ctx.globalAlpha = 0.35; ctx.lineWidth = 18 }
      else { ctx.lineWidth = 3 }
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
    strokesRef.current = strokesRef.current.filter((s) =>
      s.tool === 'erasePixel' ? true : !s.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 14)
    )
    if (strokesRef.current.length !== before) redraw()
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'cursor') return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    isDrawing.current = true
    const pos = getPos(e.nativeEvent as MouseEvent | TouchEvent, canvas)
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
    if (currentRef.current) { currentRef.current.points.push(pos); redraw() }
  }, [tool, redraw])

  const endDraw = useCallback(() => {
    if (currentRef.current) {
      strokesRef.current.push(currentRef.current)
      currentRef.current = null
      setStrokeCount((n) => n + 1)
    }
    isDrawing.current = false
  }, [])

  const clearCanvas = useCallback(() => {
    strokesRef.current = []
    currentRef.current = null
    setStrokeCount(0)
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
    strokeCount,
  }
}

type DrawingOverlayProps = ReturnType<typeof useDrawingTool>

/* 팔레트 버튼.
   `icon` — 글자 없이 아이콘만. 판이 작아야 화면을 안 가리고, 작으면 감추고 싶을 이유도 없어진다.
   손가락으로 누르는 것이라 칸은 40px 을 준다 — 아이콘만 줄이고 칸까지 줄이면 빗나간다. */
function ToolBtn({ active, onClick, title, icon, children }: {
  active: boolean; onClick: () => void; title: string; icon?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex items-center transition-colors ${
        icon ? 'w-10 h-10 justify-center rounded-xl' : 'gap-1 px-2.5 h-8 rounded-lg text-[11px] font-bold'
      } ${active ? 'bg-[#F97316] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
    >
      {children}
    </button>
  )
}

type PaletteProps = Pick<DrawingOverlayProps, 'tool' | 'setTool' | 'clearCanvas' | 'setDrawMode'>

/* 도구 버튼 묶음 (플로팅 팔레트·인라인 바 공용)
   `minimal` — **네 개만 남긴다**: 연필 · 형광펜 · 획 지우기 · 전체 지우기 (콘텐츠 파트 요청 09-01).
   빠지는 것과 그래도 되는 이유:
     · 커서(답 선택) — 연필 버튼을 다시 누르면 필기가 꺼지고 보기가 눌린다. 같은 일을 하는 문이 둘이었다.
     · 그냥 지우기(문지르기) — 획 지우기로 다 된다. 둘을 나란히 두면 무엇이 다른지부터 알아야 한다.
     · 주황 점 — 색이 하나뿐이라 고를 것이 없다. 색 고르는 자리처럼 보이기만 했다.
     · 닫기(X) — 연필 버튼이 그 일을 한다. */
function PaletteButtons({ tool, setTool, clearCanvas, setDrawMode, minimal, row }: PaletteProps & { minimal?: boolean; row?: boolean }) {
  const sz = minimal ? 17 : 14
  const pen = (
    <ToolBtn active={tool === 'pen'} onClick={() => setTool('pen')} title="연필" icon={minimal}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
      {!minimal && '연필'}
    </ToolBtn>
  )
  const highlighter = (
    <ToolBtn active={tool === 'highlighter'} onClick={() => setTool('highlighter')} title="형광펜" icon={minimal}>
      {/* ── 연필과 갈리는 지점은 **밑줄의 두께**다 ──
          예전 아이콘(꺾인 촉 모양)은 작게 그리면 무엇인지 알아볼 수 없었다(콘텐츠 파트 09-01).
          연필과 같은 자세로 세우고, 뒤에 남는 자국만 굵게 그어 둔다 — 연필은 가는 선, 형광펜은 굵은 띠. */}
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20.5h16" strokeWidth="4.5" opacity="0.5" />
        <path d="M15.8 3.7a2.2 2.2 0 0 1 3.1 3.1l-8.5 8.5-4.1 1 1-4.1 8.5-8.5z" />
      </svg>
      {!minimal && '형광펜'}
    </ToolBtn>
  )
  const eraseStroke = (
    <ToolBtn active={tool === 'eraseStroke'} onClick={() => setTool('eraseStroke')} title="획 지우기" icon={minimal}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 7 7-2.5 2.5" /><path d="M6 11l7 7" /></svg>
      {!minimal && '획 지우기'}
    </ToolBtn>
  )
  const clearAll = (
    /* ⚠️ **다른 아이콘과 같은 회색이어야 한다.** 되돌릴 수 없는 버튼이라 예전에는 옅게(#9CA3AF)
       칠해 뒀는데, 글자를 떼고 아이콘만 세우니 그 하나만 흐려서 **꺼진 버튼으로 보였다**(09-01).
       조심하라는 신호는 누를 때 빨개지는 것으로 충분하다 — 흐린 색은 "못 누른다" 는 뜻이다. */
    <button onClick={clearCanvas} title="전체 지우기" aria-label="전체 지우기"
      className={`flex items-center justify-center text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors ${
        minimal ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-lg'}`}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
    </button>
  )

  if (minimal) {
    return (
      <>
        {pen}
        {highlighter}
        {/* 구분선 — 누워 놓으면 세로로 긋고, 눈혀 놓으면 가로로 세운다 */}
        <div className={row ? 'w-px h-5 bg-[#E5E7EB] mx-0.5' : 'h-px w-full bg-[#E5E7EB] my-0.5'} />
        {eraseStroke}
        {clearAll}
      </>
    )
  }

  return (
    <>
      {/* 커서 (답 선택) */}
      <ToolBtn active={tool === 'cursor'} onClick={() => setTool('cursor')} title="커서 모드 (답 선택)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-7 1-4 7L5 3z" /></svg>
      </ToolBtn>

      <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

      {pen}
      {highlighter}

      {/* 주황 단색 표시 */}
      <span className="w-4 h-4 rounded-full ml-0.5" style={{ background: ORANGE }} title="주황" />

      <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

      {eraseStroke}
      {/* 그냥 지우기 */}
      <ToolBtn active={tool === 'erasePixel'} onClick={() => setTool('erasePixel')} title="그냥 지우기 (문지르기)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="14" width="18" height="6" rx="1" /><path d="M8 14l6-9 5 3-4 6" /></svg>
        그냥 지우기
      </ToolBtn>
      {clearAll}

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
export function PenFab({ drawMode, toggleDraw, attention, className, bottomClass = 'bottom-5', anchor = 'fixed', open = 'up', ...p }: PaletteProps & {
  drawMode: boolean; toggleDraw: () => void
  /** 지금 단계가 "필기해 보세요"인가 — 버튼 주변을 뛰게 해 여기를 누르라고 알린다 */
  attention?: boolean; className?: string
  /** 무엇을 기준으로 앉는가. `pane` 은 가장 가까운 relative 칸 — 강사 판이
   *  화면 아래를 차지하는 세로 배치에서는 화면 기준(fixed)으로 두면 그 판 위에 올라앉는다 */
  anchor?: 'fixed' | 'pane'
  /** 도구 판이 펼쳐지는 방향. `up` — 위로(가로 배치: 왼쪽 여백이 좀아 옆으로 못 늘인다)
   *  `right` — 옆으로(세로 배치: 연필이 낮게 앉아 위로 펼치면 문제를 덮는다) */
  open?: 'up' | 'right'
  /** 아래쪽 띄우는 높이. 화면 하단에 바가 있으면 그만큼 올린다(실전은 제출/채점 바가 깔린다).
   *  className 으로 bottom-* 를 덧씌우면 Tailwind 규칙상 어느 쪽이 이길지 정해지지 않아 프롭으로 받는다. */
  bottomClass?: string
}) {
  const nudge = !!attention && !drawMode
  return (
    /* ── 도구는 **위로 쌓는다** ──
       옆으로 늘어나던 때는 도구 바가 문제 영역을 가로질러 **보기 D 를 덮었다**(실측 09-01,
       아이패드 가로). 화면 왼쪽 여백은 어느 파트에서든 비어 있으므로(사진·보기·지문은 가운데로
       모인다) 그 좁은 칸에 세로로 세운다. 연필 버튼 자리는 그대로다. */
    <div className={`${anchor === 'pane' ? 'absolute' : 'fixed'} ${bottomClass} left-4 z-50 flex gap-2 ${
      open === 'right' ? 'flex-row-reverse items-center' : 'flex-col items-start'} ${className ?? ''}`}>
      {/* 늘어나는 도구 판 — 접힘은 크기로만 준다(언마운트하면 늘어나는 맛이 없다) */}
      <div className={`flex gap-0.5 rounded-2xl bg-white overflow-hidden whitespace-nowrap
                       [&>*]:shrink-0 duration-200 ${
        open === 'right'
          ? `flex-row items-center transition-[max-width,opacity,padding] ${
            drawMode ? 'max-w-[280px] opacity-100 p-1.5 border border-[#E5E7EB] shadow-lg'
              : 'max-w-0 opacity-0 py-1.5 px-0 border-0'}`
          : `flex-col items-stretch transition-[max-height,opacity,padding] ${
            drawMode ? 'max-h-[240px] opacity-100 p-1.5 border border-[#E5E7EB] shadow-lg'
              : 'max-h-0 opacity-0 px-1.5 py-0 border-0'}`
      }`}>
        <PaletteButtons {...p} minimal row={open === 'right'} />
      </div>
      <div className="flex items-center gap-2">
      <div className="relative shrink-0">
        {/* 퍼지는 링 — 필기를 시켜놓고 도구가 어디 있는지 모르면 수업이 멈춘다 */}
        {nudge && <span className="absolute inset-0 rounded-full bg-[#F97316]/40 animate-ping pointer-events-none" />}
        <button onClick={toggleDraw} title={drawMode ? '필기 끄기' : '필기'}
          aria-label={drawMode ? '필기 도구 닫기' : '필기 도구'}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center border shadow-lg transition-colors ${
            drawMode ? 'bg-[#F97316] border-[#F97316] text-white'
              : nudge ? 'bg-[#FFF7ED] border-[#F97316] text-[#F97316] ring-4 ring-[#F97316]/20'
                : 'bg-white border-[#E5E7EB] text-[#F97316] hover:bg-[#FFF7ED]'
          }`}>
          {/* 펴 놓았을 때는 **X** 다 — 바로 위 도구 판의 첫 칸도 주황 연필이라, 여기까지 연필이면
              같은 그림이 둘로 겹쳐서 어느 쪽이 끄는 문인지 알 수 없다(실측 09-01). */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {drawMode
              ? <path d="M18 6L6 18M6 6l12 12" />
              : <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></>}
          </svg>
        </button>
      </div>
      {/* 옆에 붙는 안내 — 필기를 시킨 단계에서만 */}
      {nudge && (
        <span className="shrink-0 rounded-full bg-[#F97316] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg whitespace-nowrap">
          여기를 눌러 필기하세요
        </span>
      )}
      </div>
    </div>
  )
}

export function DrawingOverlay({ bounds, hidePalette, ...props }: DrawingOverlayProps & { bounds?: React.RefObject<HTMLElement>; hidePalette?: boolean }) {
  const { drawMode, setDrawMode, tool, setTool, canvasRef, startDraw, doDraw, endDraw, clearCanvas, redraw } = props
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  /* 필기 영역 계산 (bounds 지정 시 그 영역만, 아니면 전체 화면)
     ⚠️ **필기 도구를 껐다고 멈추면 안 된다** — 아래 머리말대로 꺼도 그린 것은 계속 보여야 한다. */
  useEffect(() => {
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
    if (!rect) return
    const c = canvasRef.current
    if (!c) return
    c.width = rect.width
    c.height = rect.height
    redraw()
  }, [drawMode, rect, canvasRef, redraw])

  /* ── 꺼도 **그린 것은 보인다** ──
     예전에는 필기 도구를 끄면 캔버스를 통째로 걷어냈다. 그래서 동그라미를 치고 도구를 닫으면
     표시가 사라지고, 다시 켜면 되살아났다(콘텐츠 파트 보고). 시험지에 연필로 그은 자국이
     연필을 내려놓는다고 사라지지 않는 것처럼, **그은 것은 남아 있어야 한다.**
     특히 "표시해 보세요" 다음에 "이제 골라보세요" 가 오는 자리에서, 방금 친 동그라미를 보면서
     골라야 하는데 화면에서 사라져 버렸다.
     끄면 달라지는 것은 **입력을 받지 않는 것뿐**이다(pointerEvents) — 그래야 밑에 있는 보기가
     눌린다. 팔레트도 켜져 있을 때만 뜬다. */
  if (!rect) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="z-40"
        style={{
          position: 'fixed',
          left: rect.left, top: rect.top, width: rect.width, height: rect.height,
          cursor: !drawMode || tool === 'cursor' ? 'default'
            : tool === 'eraseStroke' || tool === 'erasePixel' ? 'cell' : 'crosshair',
          touchAction: 'none',
          pointerEvents: !drawMode || tool === 'cursor' ? 'none' : 'auto',
        }}
        onMouseDown={startDraw}
        onMouseMove={doDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={doDraw}
        onTouchEnd={endDraw}
      />
      {drawMode && !hidePalette && (
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
