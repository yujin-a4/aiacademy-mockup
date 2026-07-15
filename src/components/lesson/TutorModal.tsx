'use client'

/* 강사 대화 — 플로팅 위젯 + 드래그 가능한 모달 창 (UI 실험: split 레이아웃용).
   딤드 없음 — 뒤 화면을 보면서 쓸 수 있고, 헤더를 잡고 끌어 이동한다.
   세션 상태는 부모가 소유 — 모달을 닫아도 대화는 유지된다. */

import { useEffect, useRef, useState } from 'react'

export interface TutorChatModalProps {
  imgSrc: string
  name?: string
  connected: boolean
  connecting: boolean
  isSpeaking: boolean
  chatMode: 'text' | 'voice'
  setChatMode: (m: 'text' | 'voice') => void
  messages: { role: 'ai' | 'user'; text: string }[]
  inputText: string
  setInputText: (s: string) => void
  onSend: () => void
  onStartAgent: () => void
  onEndSession: () => void
  lastAi: string
  onClose: () => void
  footerLabel?: string
  onFooter?: () => void
}

export function TutorChatModal({
  imgSrc, name = '박혜원', connected, connecting, isSpeaking,
  chatMode, setChatMode, messages, inputText, setInputText,
  onSend, onStartAgent, onEndSession, lastAi, onClose, footerLabel, onFooter,
}: TutorChatModalProps) {
  const modalRef   = useRef<HTMLElement | null>(null)
  const dragging   = useRef(false)
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
      const x = Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, cx - dragOffset.current.x))
      const y = Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, cy - dragOffset.current.y))
      setPos({ x, y })
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

  return (
    <aside
      ref={modalRef}
      className="fixed z-40 w-[min(400px,92vw)] bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col"
      style={{
        height: 'min(600px, 80dvh)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        ...(pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 80 }),
      }}
    >
      {/* 헤더 = 드래그 핸들 */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={name} className="w-7 h-7 rounded-full object-cover object-top border border-[#2277F0]/40" />
          <span className="text-[13px] font-bold text-gray-600">{name} AI 강사</span>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-gray-50 rounded-full p-0.5">
            <button onClick={() => setChatMode('text')} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'text' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>텍스트</button>
            <button onClick={() => setChatMode('voice')} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${chatMode === 'voice' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>음성</button>
          </div>
          <button onClick={onClose} aria-label="강사 창 닫기" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 본문 */}
      {!connected ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={name} className="w-20 h-20 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
          <p className="text-sm text-gray-500 text-center">{connecting ? '강사와 연결 중…' : `${name} 강사와 대화를 시작해요`}</p>
          <button onClick={onStartAgent} disabled={connecting} className="px-5 py-3 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] disabled:opacity-60">{connecting ? '연결 중…' : '▶ 강사와 대화 시작'}</button>
        </div>
      ) : chatMode === 'text' ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
            {messages.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">강사가 곧 말을 걸어요…</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'ai' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#2277F0] text-white rounded-tr-sm'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5">
              <input className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none" placeholder="메시지 입력..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSend() }} />
            </div>
            <button onClick={onSend} disabled={!inputText.trim()} className="w-9 h-9 bg-[#2277F0] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40" aria-label="전송">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-5 min-h-0">
          <div className={`w-24 h-24 rounded-full overflow-hidden border-4 mb-3 transition-all ${isSpeaking ? 'border-[#2277F0] shadow-[0_0_24px_rgba(34,119,240,0.55)]' : 'border-[#2277F0]/25'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt={name} className="w-full h-full object-cover object-top" />
          </div>
          <p className="text-gray-500 text-[12px] font-semibold mb-1">{name} AI 강사</p>
          {lastAi && (
            <div className="bg-gray-100 rounded-xl p-3 w-full my-3 text-center max-h-24 overflow-y-auto">
              <p className="text-gray-600 text-[13px] leading-relaxed">{lastAi}</p>
            </div>
          )}
          <p className="text-gray-400 text-[11px] mt-1">{isSpeaking ? '강사가 말하는 중…' : '말하면 강사가 들어요'}</p>
          <button onClick={onEndSession} className="mt-4 text-[12px] font-semibold text-gray-400">통화 종료</button>
        </div>
      )}

      {footerLabel && onFooter && (
        <button onClick={onFooter} className="shrink-0 border-t border-gray-100 py-3 text-[13px] font-bold text-[#2277F0] hover:bg-[#2277F0]/5">{footerLabel}</button>
      )}
    </aside>
  )
}

/* 평소 상태 — 우하단 플로팅 강사 위젯 (탭하면 모달) */
export function TutorFloatingWidget({ imgSrc, name = '박혜원', connected, isSpeaking, lastAi, onOpen, nudge }: {
  imgSrc: string; name?: string; connected: boolean; isSpeaking: boolean; lastAi: string; onOpen: () => void
  /** 수업 진입 직후 등 — 아직 안 눌러본 사용자의 시선을 끌기 위한 펄스 링 + 말풍선 강조 (선택) */
  nudge?: boolean
}) {
  return (
    <button onClick={onOpen} aria-label="강사와 대화 열기" className="fixed bottom-5 right-4 z-30 flex items-end gap-2.5 text-left">
      {(lastAi || !connected || nudge) && (
        <span className={`block max-w-[240px] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] leading-snug shadow-lg line-clamp-2 ${
          nudge ? 'bg-[#2563EB] text-white font-semibold animate-bounce-in' : 'bg-white border border-gray-200 text-gray-700'
        }`}
          style={{ boxShadow: '0 4px 20px rgba(34,119,240,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}>
          {lastAi || (nudge ? '탭해서 대화를 시작해보세요!' : `${name} 강사와 대화를 시작해요`)}
        </span>
      )}
      <span className={`relative shrink-0 block w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg transition-all ${connected && isSpeaking ? 'border-[#2277F0] shadow-[0_0_18px_rgba(34,119,240,0.55)]' : 'border-white'}`}>
        {nudge && <span className="absolute -inset-1 rounded-full bg-[#2563EB]/50 animate-ping" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={name} className="relative w-full h-full object-cover object-top" />
        <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
      </span>
    </button>
  )
}
