'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

/* 필기 도구 — 벡터 스트로크 모델
   · 색상: 주황 단색
   · 그리기: 연필(pen) / 형광펜(highlighter)
   · 지우개: 획 지우기(eraseStroke) / 그냥 지우기(erasePixel)
   · 커서: 답 선택 가능(캔버스 통과) */

const ORANGE = '#F97316'
type Tool = 'pen' | 'highlighter' | 'eraseStroke' | 'erasePixel' | 'cursor'
/* ── 획은 **무엇 위에 그었는지** 기준으로 적는다 (09-28) ──
   예전에는 캔버스 픽셀 그대로 적었다. 그런데 캔버스는 수업 칸에 **덮인 판**이고 내용은 그 밑에서
   움직인다 — 강사 창 폭을 바꾸면 가운데 정렬된 사진이 옆으로 옮겨 가고, 스크롤하면 지문이 올라간다.
   획만 제자리에 남아 엉뚱한 데를 가리켰다(사용자 보고).
     · img  — 사진 위에 그은 획. **실제 그림 영역**(object-contain 여백을 뺀) 안의 비율(0~1).
              사진이 옮겨 가도 커져도 그 자리를 따라간다.
     · root — 그 밖(글자 위). 시험지 열(bounds 의 첫 자식)의 왼쪽 위에서 잰 **픽셀 거리**.
              글자는 칸 폭이 바뀌어도 크기가 그대로라 비율로 늘리지 않는다. 칸이 옆으로 옮겨 가고
              스크롤되는 것은 따라가지만, 줄바꿈이 달라질 만큼 폭을 줄이면 조금 어긋난다(알고 둔 한계).
   anchor 가 없는 획은 예전처럼 캔버스 픽셀이다(bounds 없이 쓰는 화면). */
type InkAnchor = { kind: 'img'; src: string } | { kind: 'root' }
export interface Stroke { tool: 'pen' | 'highlighter' | 'erasePixel'; points: { x: number; y: number }[]; anchor?: InkAnchor }
type Box = { left: number; top: number; width: number; height: number }

/** 사진이 **실제로 그려진** 자리 — object-contain 이면 칸 안에 여백이 생기므로 그림만 잰다 */
function pictureBox(img: HTMLImageElement): Box {
  const r = img.getBoundingClientRect()
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (!nw || !nh || getComputedStyle(img).objectFit !== 'contain') return r
  const s = Math.min(r.width / nw, r.height / nh)
  const w = nw * s
  const h = nh * s
  return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h }
}

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
  /** 필기 영역(수업 칸) — DrawingOverlay 가 채운다. 획의 기준(anchor)을 찾는 데 쓴다 */
  const boundsRef = useRef<HTMLElement | null>(null)

  /** anchor 가 지금 화면 어디에 있나 (viewport 좌표). 못 찾으면 null — 그 획은 이번엔 안 그린다 */
  const anchorBox = (a: InkAnchor): Box | null => {
    const root = boundsRef.current
    if (!root) return null
    if (a.kind === 'img') {
      const img = Array.from(root.querySelectorAll('img')).find((i) => i.getAttribute('src') === a.src)
      return img ? pictureBox(img) : null
    }
    return (root.firstElementChild ?? root).getBoundingClientRect()
  }

  /** 저장된 획 → 지금 캔버스 픽셀. 기준이 화면에 없으면 null */
  const onCanvas = (s: Stroke): { x: number; y: number }[] | null => {
    if (!s.anchor) return s.points
    const c = canvasRef.current
    const b = anchorBox(s.anchor)
    if (!c || !b) return null
    const cr = c.getBoundingClientRect()
    return s.anchor.kind === 'img'
      ? s.points.map((p) => ({ x: b.left - cr.left + p.x * b.width, y: b.top - cr.top + p.y * b.height }))
      : s.points.map((p) => ({ x: b.left - cr.left + p.x, y: b.top - cr.top + p.y }))
  }

  /** 다 그은 획(캔버스 픽셀) → 기준 좌표로. 시작점 밑에 사진이 있으면 사진, 아니면 시험지 열 */
  const anchored = (s: Stroke): Stroke => {
    const c = canvasRef.current
    const root = boundsRef.current
    if (!c || !root || !s.points.length) return s
    const cr = c.getBoundingClientRect()
    const p0 = s.points[0]
    const under = document.elementsFromPoint(cr.left + p0.x, cr.top + p0.y)
    const img = under.find((el): el is HTMLImageElement => el instanceof HTMLImageElement && root.contains(el))
    const src = img?.getAttribute('src')
    if (img && src) {
      const b = pictureBox(img)
      const inside = cr.left + p0.x >= b.left && cr.left + p0.x <= b.left + b.width
        && cr.top + p0.y >= b.top && cr.top + p0.y <= b.top + b.height
      if (inside && b.width && b.height) {
        return { ...s, anchor: { kind: 'img', src },
          points: s.points.map((p) => ({ x: (cr.left + p.x - b.left) / b.width, y: (cr.top + p.y - b.top) / b.height })) }
      }
    }
    const b = (root.firstElementChild ?? root).getBoundingClientRect()
    return { ...s, anchor: { kind: 'root' },
      points: s.points.map((p) => ({ x: cr.left + p.x - b.left, y: cr.top + p.y - b.top })) }
  }

  const drawStroke = (ctx: CanvasRenderingContext2D, s0: Stroke) => {
    const pts = onCanvas(s0)
    if (!pts?.length) return
    const s = { ...s0, points: pts }
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
      /* 지금 화면에 그려진 자리로 잰다 — 저장된 좌표는 사진 비율이거나 시험지 열 기준이다 */
      const pts = onCanvas(s)
      if (!pts?.length) return true
      // 형광펜은 점이 둘뿐이라 점 거리로 재면 띠 한가운데를 문질러도 안 지워진다
      if (s.tool === 'highlighter') {
        const r = hlRect(pts)
        return !(pos.x >= r.x - 4 && pos.x <= r.x + r.w + 4 && pos.y >= r.y - 4 && pos.y <= r.y + r.h + 4)
      }
      return !pts.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 14)
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
      strokesRef.current.push(anchored(currentRef.current))
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
    exportStrokes, loadStrokes, boundsRef,
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
        icon ? 'w-10 h-10 justify-center rounded-lg' : 'gap-1 px-2.5 h-8 rounded-lg text-[11px] font-bold'
      } ${active ? 'bg-[#F97316] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
    >
      {children}
    </button>
  )
}

type PaletteProps = Pick<DrawingOverlayProps, 'tool' | 'setTool' | 'clearCanvas' | 'setDrawMode'>

/* 도구 버튼 묶음 (플로팅 팔레트·인라인 바 공용)
   `minimal` — **네 개만 남긴다**: 연필 · 형광펜 · 대상 지우기 · 전체 지우기 (콘텐츠 파트 요청 09-01).
   빠지는 것과 그래도 되는 이유:
     · 커서(답 선택) — 연필 버튼을 다시 누르면 필기가 꺼지고 보기가 눌린다. 같은 일을 하는 문이 둘이었다.
     · 픽셀 지우기(문지르기) — 대상 지우기로 다 된다. 둘을 나란히 두면 무엇이 다른지부터 알아야 한다.
     · 주황 점 — 색이 하나뿐이라 고를 것이 없다. 색 고르는 자리처럼 보이기만 했다.
     · 닫기(X) — 연필 버튼이 그 일을 한다. */
function PaletteButtons({ tool, setTool, clearCanvas, setDrawMode, minimal, row }: PaletteProps & { minimal?: boolean; row?: boolean }) {
  const sz = minimal ? 17 : 14
  /* ── 켜진 연필·형광펜을 **한 번 더 누르면 필기가 꺼진다** (09-28 사용자 요청) ──
     손은 방금 누른 버튼 위에 있다. 끄려고 팔레트 밖 연필 버튼까지 가지 않아도 된다. */
  const pick = (t: 'pen' | 'highlighter') => () => (tool === t ? setDrawMode(false) : setTool(t))
  const pen = (
    <ToolBtn active={tool === 'pen'} onClick={pick('pen')} title="연필" icon={minimal}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
      {!minimal && '연필'}
    </ToolBtn>
  )
  const highlighter = (
    <ToolBtn active={tool === 'highlighter'} onClick={pick('highlighter')} title="형광펜" icon={minimal}>
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
    <ToolBtn active={tool === 'eraseStroke'} onClick={() => setTool('eraseStroke')}
      title={minimal ? '대상 지우기' : '대상 지우기 — 누른 선 하나가 통째로 지워집니다'} icon={minimal}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 7 7-2.5 2.5" /><path d="M6 11l7 7" /></svg>
      {!minimal && '대상 지우기'}
    </ToolBtn>
  )
  const clearAll = (
    /* ⚠️ **다른 아이콘과 같은 회색이어야 한다.** 되돌릴 수 없는 버튼이라 예전에는 옅게(#9CA3AF)
       칠해 뒀는데, 글자를 떼고 아이콘만 세우니 그 하나만 흐려서 **꺼진 버튼으로 보였다**(09-01).
       조심하라는 신호는 누를 때 빨개지는 것으로 충분하다 — 흐린 색은 "못 누른다" 는 뜻이다. */
    <button onClick={clearCanvas} title="전체 지우기" aria-label="전체 지우기"
      className={`flex items-center justify-center text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors ${
        minimal ? 'w-10 h-10 rounded-lg' : 'w-8 h-8 rounded-lg'}`}>
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

      {/* 대상 지우기 */}
      {eraseStroke}
      {/* 그냥 지우기 */}
      <ToolBtn active={tool === 'erasePixel'} onClick={() => setTool('erasePixel')} title="픽셀 지우기 — 문지른 자리만 지워집니다">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="14" width="18" height="6" rx="1" /><path d="M8 14l6-9 5 3-4 6" /></svg>
        픽셀 지우기
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
   상단 도구줄의 '필기' 버튼을 대신한다. 필기는 지문 위에서 하는 일이라 도구도 지문 가까이
   (화면 좌하단)에 둔다.

   한 번 누르면 필기가 켜지면서 도구 판이 펴지고, **도구를 고르거나 긋기 시작하면 접힌다** —
   판이 떠 있는 동안은 화면 왼쪽 글자를 가리기 때문이다(아래 '떠 있는 시간' 참고).
   접힌 뒤로 그 버튼은 판을 다시 여는 문이 되고, 펴져 있을 때 누르면 필기가 꺼진다. */
export function PenFab({ drawMode, toggleDraw, attention, strokeCount, className, bottomClass = 'bottom-5', anchor = 'fixed', open = 'up', ...p }: PaletteProps & {
  drawMode: boolean; toggleDraw: () => void
  /** 지금 단계가 "필기해 보세요"인가 — 버튼 주변을 뛰게 해 여기를 누르라고 알린다 */
  attention?: boolean; className?: string
  /** 지금까지 그은 획 수 — **늘어나면 도구 판을 접는다**(아래 '떠 있는 시간' 참고).
   *  안 넘기면 도구를 고를 때만 접힌다. 있으면 넘기는 편이 낫다. */
  strokeCount?: number
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

  /* ── 도구 판은 **고르는 동안만** 떠 있다 (09-07) ──
     예전에는 필기가 켜져 있는 내내 판이 떠 있었다. 그런데 판은 화면 왼쪽 16~62px 를 세로로
     먹는데, 수업 칸은 x=0 에서 시작하고 안쪽 여백이 24px 뿐이라 **글자와 그대로 겹친다**
     (실측: Part 1 수업은 `max-w-none`, Part 7 좌우 지문은 `max-w-[1440px]` 이라 왼쪽 여백이 없다).
     방향을 옆으로 눕히는 것은 되돌아가는 길이다 — 원래 옆으로 폈다가 보기 D 를 덮어서 세로로
     세운 자리다(09-01). 그래서 **방향이 아니라 떠 있는 시간**을 줄인다.
     판이 하는 일은 '무엇으로 그릴지 한 번 고르기' 뿐이라, 고르고 나면 볼 일이 없다. */
  const [expanded, setExpanded] = useState(false)
  /* 필기를 켜면 펴고, 끄면 접는다 */
  useEffect(() => { setExpanded(drawMode) }, [drawMode])
  /* 긋기 시작하면 접는다 — 기본 도구가 연필이라 **고르지 않고 바로 긋는** 쪽이 흔하다.
     ⚠️ 획 수는 필기를 껐다 켜도 그대로 남는다. 그래서 '늘어났을 때' 만 접는다 —
        위 효과가 켤 때 펴 준 것을 이 효과가 곧바로 도로 접으면 안 된다. */
  const strokes = strokeCount ?? 0
  const seen = useRef(strokes)
  useEffect(() => {
    if (strokes > seen.current) setExpanded(false)
    seen.current = strokes
  }, [strokes])

  /* 도구를 고르거나 다 지우면 접는다 — 판을 여닫는 일과 도구를 고르는 일이 한 번의 탭으로 끝난다 */
  const fold = <T extends (...args: never[]) => void>(fn: T) =>
    ((...args: Parameters<T>) => { fn(...args); setExpanded(false) }) as T

  /** 판이 펴져 있는가 — 연필 버튼의 뜻이 여기서 갈린다.
   *  접혀 있으면 그 버튼은 **판을 여는 문**이고(연필 그림), 펴져 있으면 **필기를 끄는 문**이다(X).
   *  필기를 끄러 두 번 눌러야 하는 셈인데, 수업·실전 모두 `tapThrough` 라 답을 고르려고 필기를
   *  끌 일이 없다 — 끄기는 드물고, 지우개를 다시 꺼내는 쪽이 잦다. */
  const showTools = drawMode && expanded

  /* ── 끌어서 옮긴다 (09-28 사용자 요청) ──
     강사 얼굴처럼 이 버튼도 학생이 원하는 자리에 둔다 — 늘 왼쪽 아래라 사진·보기 모서리를 가렸다.
     **조금이라도 끌면 이동, 제자리에서 떼면 지금처럼 누르기**(켜기·판 열기). 끈 뒤에 오는 click 은 삼킨다.
     좌표는 앉는 자리의 기준(fixed=화면, pane=가장 가까운 relative 칸) 안에서 잡고, 그 밖으로는 못 나간다. */
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const frame = () => {
    const parent = anchor === 'pane' ? (wrapRef.current?.offsetParent as HTMLElement | null) : null
    return parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  }
  const onDragStart = (e: React.PointerEvent) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false }
    /* 누르는 순간 붙잡는다 — 손가락이 빨리 움직이면 첫 이동이 이미 버튼 밖이라, 끈 뒤에 잡으면 놓친다(실측) */
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    const r = wrapRef.current?.getBoundingClientRect()
    if (!d || !r) return
    if (!d.moved && Math.hypot(e.clientX - (r.left + d.dx), e.clientY - (r.top + d.dy)) < 6) return
    d.moved = true
    const f = frame()
    /* 판이 펼쳐져 있으면 그만큼 커진 상자를 옮기게 된다 — 자리는 **버튼** 기준으로 잡으려고 먼저 접는다 */
    setExpanded(false)
    const bw = 48
    setPos({
      x: Math.min(Math.max(8, e.clientX - d.dx - f.left), f.width - bw - 8),
      y: Math.min(Math.max(8, e.clientY - d.dy - f.top), f.height - bw - 8),
    })
  }
  const onDragEnd = () => {
    const d = dragRef.current
    dragRef.current = null
    if (d?.moved) suppressClickRef.current = true
  }
  /* 위로 펼치는 판이 **화면 위로 넘치면** 아래로 편다 — 판 높이(최대 240) + 여유 */
  const flipDown = open === 'up' && !!pos && pos.y < 260

  return (
    /* ── 도구는 **위로 쌓는다** ──
       옆으로 늘어나던 때는 도구 바가 문제 영역을 가로질러 **보기 D 를 덮었다**(실측 09-01,
       아이패드 가로). 화면 왼쪽 여백은 어느 파트에서든 비어 있으므로(사진·보기·지문은 가운데로
       모인다) 그 좁은 칸에 세로로 세운다. 연필 버튼 자리는 그대로다. */
    <div ref={wrapRef}
      /* 옮긴 뒤에는 **버튼의 왼쪽 위**가 pos 에 온다 — 위로 펴는 판은 버튼 위에 붙으므로 그만큼 올려
         세우고(bottom 기준), 아래로 펴는 판(flipDown)은 top 기준으로 둔다. 그래야 판이 열리고 닫혀도
         **버튼이 제자리에 있다.** */
      style={!pos ? undefined
        : open === 'up' && !flipDown ? { left: pos.x, bottom: `calc(100% - ${pos.y + 48}px)` }
        : { left: pos.x, top: pos.y }}
      className={`${anchor === 'pane' ? 'absolute' : 'fixed'} ${pos ? '' : `${bottomClass} left-4`} z-50 flex gap-2 ${
      open === 'right' ? 'flex-row-reverse items-center' : flipDown ? 'flex-col-reverse items-start' : 'flex-col items-start'} ${className ?? ''}`}>
      {/* 늘어나는 도구 판 — 접힘은 크기로만 준다(언마운트하면 늘어나는 맛이 없다) */}
      <div className={`flex gap-0.5 rounded-xl bg-white overflow-hidden whitespace-nowrap
                       [&>*]:shrink-0 duration-200 ${
        open === 'right'
          ? `flex-row items-center transition-[max-width,opacity,padding] ${
            showTools ? 'max-w-[280px] opacity-100 p-1.5 border border-[#E5E7EB] shadow-lg'
              : 'max-w-0 opacity-0 py-1.5 px-0 border-0'}`
          : `flex-col items-stretch transition-[max-height,opacity,padding] ${
            showTools ? 'max-h-[240px] opacity-100 p-1.5 border border-[#E5E7EB] shadow-lg'
              : 'max-h-0 opacity-0 px-1.5 py-0 border-0'}`
      }`}>
        <PaletteButtons {...p} setTool={fold(p.setTool)} clearCanvas={fold(p.clearCanvas)}
          minimal row={open === 'right'} />
      </div>
      <div className="flex items-center gap-2">
      <div className="relative shrink-0">
        {/* 퍼지는 링 — 필기를 시켜놓고 도구가 어디 있는지 모르면 수업이 멈춘다 */}
        {nudge && <span className="absolute inset-0 rounded-full bg-[#F97316]/40 animate-ping pointer-events-none" />}
        <button
          /* 접혀 있을 때는 **판을 다시 편다** — 잘못 그어 지우개를 꺼내는 자리다.
             껐다 켜게 하면(그것도 두 번 탭이다) 도구가 연필로 되돌아가 지우개를 또 골라야 한다. */
          onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
          onClick={() => {
            if (suppressClickRef.current) { suppressClickRef.current = false; return }   // 방금 끌어서 옮겼다 — 누른 게 아니다
            if (drawMode && !expanded) setExpanded(true); else toggleDraw()
          }}
          title={showTools ? '필기 끄기' : drawMode ? '필기 도구' : '필기'}
          aria-label={showTools ? '필기 도구 닫기' : '필기 도구'}
          className={`relative w-12 h-12 touch-none rounded-full flex items-center justify-center border shadow-lg transition-colors ${
            drawMode ? 'bg-[#F97316] border-[#F97316] text-white'
              : nudge ? 'bg-[#FFF7ED] border-[#F97316] text-[#F97316] ring-4 ring-[#F97316]/20'
                : 'bg-white border-[#E5E7EB] text-[#F97316] hover:bg-[#FFF7ED]'
          }`}>
          {/* 펴 놓았을 때는 **X** 다 — 바로 위 도구 판의 첫 칸도 주황 연필이라, 여기까지 연필이면
              같은 그림이 둘로 겹쳐서 어느 쪽이 끄는 문인지 알 수 없다(실측 09-01).
              접어 놓았으면 겹칠 그림이 없으니 연필로 돌아온다 — 그 자리에서 누르면 판이 다시 펴진다.
              필기 중이라는 신호는 그림이 아니라 **주황으로 찬 배경**이 준다. */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showTools
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
  const { drawMode, setDrawMode, tool, setTool, canvasRef, startDraw, doDraw, endDraw, clearCanvas, redraw, boundsRef } = props
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  /* ── 내용이 움직이면 **다시 그린다** (09-28) ──
     획은 사진·시험지 열을 기준으로 적혀 있어서(Stroke.anchor), 그 기준이 움직일 때마다 새 자리에
     그려야 따라간다. 움직이는 경우는 셋: 스크롤 · 칸 크기 변화(아래 rect 효과가 맡는다) ·
     칸은 그대로인데 안의 열이 옮겨 가거나 사진이 늦게 뜨는 경우(열에 ResizeObserver, 사진 load). */
  useEffect(() => {
    const el = bounds?.current ?? null
    boundsRef.current = el
    if (!el) return
    let raf = 0
    const again = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => redraw()) }
    el.addEventListener('scroll', again, { passive: true })
    el.addEventListener('load', again, true)          // 사진이 늦게 뜨면 그 크기로 다시
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(again)
      if (el.firstElementChild) ro.observe(el.firstElementChild)
    }
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', again); el.removeEventListener('load', again, true); ro?.disconnect() }
  }, [bounds, boundsRef, redraw])

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
          className="z-50 flex items-center gap-1.5 bg-white rounded-xl shadow-xl border border-[#E5E7EB] px-3 py-2 -translate-x-1/2"
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
