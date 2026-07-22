'use client'

/* ── 강사 도크 — 한 강사 창의 3단 크기 ──
 *
 *   사이드바(기본)  ─접기→  모달창  ─최소화→  작은 창(얼굴 + 지금 하는 말만)
 *        ↑─────확대─────┘        ↑──── 탭 ────┘
 *
 * 강사 노트·상호작용·대화가 전부 이 창 안에 산다. 크기만 바뀌고 내용은 같은 것을 쓴다
 * (작은 창만 예외 — 얼굴과 발화 한 줄로 접힌다. 상호작용은 모달/사이드바에서).
 * 모달은 딤드 없이 떠 있고 헤더를 잡아 끌 수 있다 — 뒤 지문을 보면서 쓰라고.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type DockMode = 'sidebar' | 'modal' | 'mini'

const ICON = 'w-4 h-4'

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
      {children}
    </button>
  )
}

const CollapseIcon = () => (   // 사이드바 → 모달 (오른쪽으로 접기)
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /><path d="M8 10l3 2-3 2" />
  </svg>
)
const ExpandIcon = () => (     // 모달 → 사이드바
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
  </svg>
)
const MinimizeIcon = () => (   // 모달 → 작은 창
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={ICON}>
    <path d="M5 12h14" />
  </svg>
)

/** 헤더 — 강사 얼굴·이름·연결 상태 + 크기 전환 버튼 (사이드바/모달 공통) */
function DockHeader({ mode, setMode, name, imgSrc, connected, isSpeaking, onDragStart }: {
  mode: DockMode; setMode: (m: DockMode) => void
  name: string; imgSrc: string; connected: boolean; isSpeaking: boolean
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void
}) {
  return (
    <div
      onMouseDown={onDragStart} onTouchStart={onDragStart}
      style={onDragStart ? { touchAction: 'none' } : undefined}
      className={`flex items-center justify-between gap-2 px-3 md:px-4 py-2.5 border-b border-gray-100 shrink-0 select-none ${
        onDragStart ? 'cursor-grab active:cursor-grabbing' : ''
      }`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`relative shrink-0 block w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
          isSpeaking ? 'border-[#2563EB] shadow-[0_0_14px_rgba(37,99,235,0.5)]' : 'border-[#2563EB]/25'
        }`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={name} className="w-full h-full object-cover object-top" />
        </span>
        <span className="text-[13px] font-bold text-[#374151] truncate">{name} 강사</span>
        <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {mode === 'sidebar' ? (
          <IconBtn label="모달창으로 접기" onClick={() => setMode('modal')}><CollapseIcon /></IconBtn>
        ) : (
          <>
            <IconBtn label="사이드바로 확대" onClick={() => setMode('sidebar')}><ExpandIcon /></IconBtn>
            <IconBtn label="작은 창으로 최소화" onClick={() => setMode('mini')}><MinimizeIcon /></IconBtn>
          </>
        )}
      </div>
    </div>
  )
}

/* ── 마이크 파형 — 음성 모드에서 "내가 지금 말하고 있다"를 보여주는 자리 ──
   에이전트 연결 시 실제 입력 스펙트럼(getInputByteFrequencyData)을 그리고,
   연결 전에는 잠잠한 바만 둔다. 초당 ~20회만 갱신한다(프레임마다 setState 하면 과하다). */
function MicWave({ active, speaking, getFreq }: {
  active: boolean; speaking: boolean; getFreq?: () => Uint8Array | undefined
}) {
  const N = 22
  const [bars, setBars] = useState<number[]>(() => Array(N).fill(0.08))

  useEffect(() => {
    if (!active) { setBars(Array(N).fill(0.08)); return }
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 50) return           // ~20fps
      last = t
      try {
        const d = getFreq?.()
        if (d && d.length) {
          const step = Math.max(1, Math.floor(d.length / N))
          setBars(Array.from({ length: N }, (_, i) => Math.min(1, (d[i * step] ?? 0) / 180)))
          return
        }
      } catch { /* 연결 전이면 스펙트럼을 못 읽는다 — 아래 잠잠한 바로 폴백 */ }
      setBars(Array(N).fill(0.08))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, getFreq])

  return (
    <div className="flex-1 flex items-center justify-center gap-[3px] h-10 px-3 rounded-full bg-gray-50 border border-gray-100">
      {bars.map((v, i) => (
        <span key={i}
          className={`w-[3px] rounded-full transition-[height] duration-75 ${
            speaking ? 'bg-[#93C5FD]' : active ? 'bg-[#2563EB]' : 'bg-gray-300'
          }`}
          style={{ height: `${Math.max(4, v * 28)}px` }} />
      ))}
    </div>
  )
}

/** 대화 하단 입력 — 강사 에이전트(일레븐랩스) 연결/텍스트/음성. 대화 흐름 아래에 붙는다. */
export function TutorComposer({
  connected, connecting, isSpeaking, chatMode, setChatMode,
  inputText, setInputText, onSend, onStartAgent, onEndSession, getFreq,
}: {
  connected: boolean; connecting: boolean; isSpeaking: boolean
  chatMode: 'text' | 'voice'; setChatMode: (m: 'text' | 'voice') => void
  inputText: string; setInputText: (s: string) => void
  onSend: () => void; onStartAgent: () => void; onEndSession: () => void
  /** 마이크 입력 스펙트럼 — 파형용 (에이전트 연결 시에만 값이 나온다) */
  getFreq?: () => Uint8Array | undefined
}) {
  return (
    <div className="shrink-0 px-3 pb-2.5 pt-1.5 space-y-1.5">
      {/* 학생이 말하는 자리 — 음성이면 파형, 텍스트면 입력창 */}
      {chatMode === 'voice' ? (
        <div className="flex items-center gap-2">
          <MicWave active={connected} speaking={isSpeaking} getFreq={getFreq} />
          {!connected && (
            <button onClick={onStartAgent} disabled={connecting}
              className="shrink-0 px-3 h-10 rounded-full bg-[#2563EB] text-white font-bold text-[12px] hover:bg-[#1D4ED8] disabled:opacity-60">
              {connecting ? '연결 중…' : '마이크 켜기'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5">
            <input className="w-full bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
              placeholder={connected ? '메시지 입력...' : '대화를 시작하면 입력할 수 있어요'}
              value={inputText} disabled={!connected}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSend() }} />
          </div>
          <button onClick={connected ? onSend : onStartAgent} disabled={connected ? !inputText.trim() : connecting}
            aria-label={connected ? '전송' : '대화 시작'}
            className="w-9 h-9 bg-[#2563EB] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      )}

      {/* 모드 전환 + 상태 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-50 rounded-full p-0.5">
          <button onClick={() => setChatMode('voice')} className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${chatMode === 'voice' ? 'bg-[#2563EB] text-white' : 'text-gray-400'}`}>음성</button>
          <button onClick={() => setChatMode('text')} className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${chatMode === 'text' ? 'bg-[#2563EB] text-white' : 'text-gray-400'}`}>텍스트</button>
        </div>
        <span className="text-[11px] text-gray-400 truncate px-2">
          {!connected ? (connecting ? '연결 중…' : '아직 강사와 연결 전이에요')
            : isSpeaking ? '강사가 말하는 중…'
            : chatMode === 'voice' ? '말하면 강사가 들어요' : ''}
        </span>
        {connected && (
          <button onClick={onEndSession} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 shrink-0">대화 종료</button>
        )}
      </div>
    </div>
  )
}

export interface TutorDockProps {
  mode: DockMode
  setMode: (m: DockMode) => void
  name: string
  imgSrc: string
  connected: boolean
  isSpeaking: boolean
  /** 작은 창에 보여줄 지금 발화 한 줄 */
  lastLine: string
  /** 창 본문 — 대화 흐름 하나(강사 말 + 단계 내용 + 상호작용) + 하단 입력. 사이드바·모달 공통 */
  children: ReactNode
}

export default function TutorDock({
  mode, setMode, name, imgSrc, connected, isSpeaking, lastLine, children,
}: TutorDockProps) {
  const modalRef = useRef<HTMLElement | null>(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const el = modalRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragging.current = true
    dragOffset.current = { x: cx - rect.left, y: cy - rect.top }
    setPos({ x: rect.left, y: rect.top })
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      const cx = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
      const cy = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      const el = modalRef.current
      if (!el) return
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, cx - dragOffset.current.x)),
        y: Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, cy - dragOffset.current.y)),
      })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  const body = <div className="flex-1 min-h-0 flex flex-col">{children}</div>

  /* ── 작은 창 — 얼굴 + 지금 하는 말. 탭하면 모달창으로 돌아간다 ── */
  if (mode === 'mini') {
    return (
      <div className="fixed bottom-5 right-4 z-40 flex items-end gap-2.5">
        {lastLine && (
          <button onClick={() => setMode('modal')}
            className="max-w-[240px] text-left rounded-2xl rounded-br-sm bg-white border border-gray-200 px-3.5 py-2.5 text-[13px] leading-snug text-gray-700 line-clamp-3"
            style={{ boxShadow: '0 4px 20px rgba(37,99,235,0.14), 0 1px 4px rgba(0,0,0,0.08)' }}>
            {lastLine}
          </button>
        )}
        <button onClick={() => setMode('modal')} aria-label="강사 창 열기"
          className={`relative shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg transition-all ${
            isSpeaking ? 'border-[#2563EB] shadow-[0_0_18px_rgba(37,99,235,0.55)]' : 'border-white'
          }`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={name} className="w-full h-full object-cover object-top" />
          <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </button>
      </div>
    )
  }

  /* ── 모달창 — 떠 있는 강사 창(드래그). 사이드바와 같은 내용을 담는다 ── */
  if (mode === 'modal') {
    return (
      <aside ref={modalRef}
        className="fixed z-40 w-[min(420px,92vw)] bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col"
        style={{
          height: 'min(620px, 82dvh)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          ...(pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 80 }),
        }}>
        <DockHeader mode={mode} setMode={setMode} name={name} imgSrc={imgSrc}
          connected={connected} isSpeaking={isSpeaking} onDragStart={onDragStart} />
        {body}
      </aside>
    )
  }

  /* ── 사이드바(기본) — 화면 오른쪽 기둥. 폭은 부모의 리사이즈 핸들이 남긴 공간을 그대로 채운다 ── */
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <DockHeader mode={mode} setMode={setMode} name={name} imgSrc={imgSrc} connected={connected} isSpeaking={isSpeaking} />
      {body}
    </div>
  )
}
