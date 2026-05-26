'use client'

import Image from 'next/image'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getMuted, setMuted, onMuteChange } from '@/lib/tts'

interface InstructorPipProps {
  speech: string
  isLoading?: boolean
  isTyping?: boolean
  imageSrc?: string
  onOpen: () => void
  onMic: () => void
  isListening?: boolean
}

const CHAR_DELAY_MS = 28

export default function InstructorPip({
  speech,
  isLoading = false,
  imageSrc = '/instructor/park.png',
  onOpen,
  onMic,
  isListening = false,
}: InstructorPipProps) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping]   = useState(false)
  const [muted, setMutedState]    = useState(() => getMuted())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── 드래그 상태 ── */
  const pipRef      = useRef<HTMLDivElement>(null)
  const dragging    = useRef(false)
  const dragOffset  = useRef({ x: 0, y: 0 })
  /* 초기 위치: right/bottom 기준 → left/top으로 변환은 첫 드래그 시 계산 */
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    /* 버튼 클릭은 드래그로 처리하지 않음 */
    if ((e.target as HTMLElement).closest('button')) return
    const el   = pipRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragging.current   = true
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top }
    /* absolute 위치로 전환 */
    setPos({ x: rect.left, y: rect.top })
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      const el   = pipRef.current
      if (!el) return
      const W    = window.innerWidth
      const H    = window.innerHeight
      const w    = el.offsetWidth
      const h    = el.offsetHeight
      const x    = Math.max(8, Math.min(W - w - 8, clientX - dragOffset.current.x))
      const y    = Math.max(8, Math.min(H - h - 8, clientY - dragOffset.current.y))
      setPos({ x, y })
    }
    const onUp = () => { dragging.current = false }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
  }, [])

  useEffect(() => onMuteChange(setMutedState), [])

  useEffect(() => {
    if (!speech || isLoading) { setDisplayed(''); setIsTyping(false); return }
    setDisplayed(''); setIsTyping(true)
    let idx = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      idx += 1
      setDisplayed(speech.slice(0, idx))
      if (idx >= speech.length) { clearInterval(timerRef.current!); timerRef.current = null; setIsTyping(false) }
    }, CHAR_DELAY_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [speech, isLoading])

  return (
    <div
      ref={pipRef}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      className="fixed z-30 flex items-center gap-4
        bg-white/95 backdrop-blur-md border border-ybm-border
        rounded-2xl shadow-lg px-4 py-3
        max-w-[400px] min-w-[280px]
        select-none"
      style={
        pos
          ? { left: pos.x, top: pos.y, cursor: dragging.current ? 'grabbing' : 'grab',
              touchAction: 'none',
              boxShadow: '0 4px 24px rgba(34,119,240,0.12), 0 1px 4px rgba(0,0,0,0.08)' }
          : { bottom: 80, right: 16, cursor: 'grab',
              touchAction: 'none',
              boxShadow: '0 4px 24px rgba(34,119,240,0.12), 0 1px 4px rgba(0,0,0,0.08)',
              animation: 'pipSlideIn 0.3s ease-out' }
      }
    >
      <style>{`@keyframes pipSlideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
      {/* 강사 얼굴 — 클릭하면 패널 다시 열기 */}
      <div className="relative shrink-0">
        <button
          onClick={onOpen}
          aria-label="강사 패널 열기"
          className="w-14 h-14 rounded-full overflow-hidden border-2 border-cr-accent/30 hover:border-cr-accent transition-colors"
        >
          {imageSrc ? (
            <Image src={imageSrc} alt="강사" width={56} height={56} className="object-cover object-top w-full h-full" />
          ) : (
            <div className="w-full h-full bg-cr-accent-light flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="4" stroke="#2277F0" strokeWidth="1.5"/>
                <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#2277F0" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </button>
        {/* 음소거 버튼 — 아바타 우측 상단 */}
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? '음소거 해제' : '음소거'}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        >
          {muted ? <PipVolumeOffIcon /> : <PipVolumeOnIcon />}
        </button>
      </div>

      {/* 발화 텍스트 */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex items-center gap-1 h-5">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-cr-accent/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {/* 말하는 중 음파 */}
            {isTyping && (
              <div className="flex items-center gap-[2px] shrink-0" style={{ height: 14 }}>
                {[0,1,2,3].map((i) => (
                  <span key={i} className="rounded-full" style={{
                    width: 2.5, height: 8, backgroundColor: '#2277F0',
                    animation: `pipWave ${0.4 + i * 0.08}s ease-in-out ${i * 60}ms infinite alternate`,
                  }} />
                ))}
                <style>{`@keyframes pipWave { from { transform: scaleY(0.25); } to { transform: scaleY(1); } }`}</style>
              </div>
            )}
            <p className="text-sm text-ybm-text leading-snug line-clamp-2">
              {displayed || speech}
              {isTyping && (
                <span className="inline-block w-[1.5px] h-[0.9em] bg-cr-accent ml-[1px] align-middle rounded-full"
                  style={{ animation: 'pipCursor 0.7s step-end infinite' }} />
              )}
              <style>{`@keyframes pipCursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
            </p>
          </div>
        )}
      </div>

      {/* 마이크 버튼 */}
      <button
        onClick={onMic}
        aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
        className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all
          ${isListening
            ? 'bg-cr-accent text-white scale-110 shadow-md'
            : 'bg-cr-accent/10 hover:bg-cr-accent/20 text-cr-accent'}
        `}
      >
        {isListening ? <StopIcon /> : <MicIcon />}
      </button>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="6" y="1.5" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9.5c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 15.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor"/>
    </svg>
  )
}

function PipVolumeOnIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <path d="M2 5.5h2.5L8 2.5v11L4.5 10.5H2V5.5z" fill="currentColor" />
      <path d="M10.5 5.5c.8.6 1.3 1.5 1.3 2.5s-.5 1.9-1.3 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function PipVolumeOffIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <path d="M2 5.5h2.5L8 2.5v11L4.5 10.5H2V5.5z" fill="currentColor" />
      <path d="M11 6l3 4M14 6l-3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
