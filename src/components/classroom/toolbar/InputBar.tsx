'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

/* Web Speech API — TypeScript DOM lib 버전에 따라 누락될 수 있어 로컬 타입 선언 */
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: { readonly transcript: string; readonly confidence: number }
}
interface SpeechRecognitionResultList {
  readonly length: number
  readonly resultIndex?: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart:  ((ev: Event) => void) | null
  onend:    ((ev: Event) => void) | null
  onerror:  ((ev: Event) => void) | null
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

export interface ToolbarAction {
  label: string
  onClick: (value: string) => void
  variant?: 'primary' | 'secondary'
  icon?: React.ReactNode
  disabled?: boolean
}

interface InputBarProps {
  placeholder?: string
  actions?: ToolbarAction[]
  onValueChange?: (value: string) => void
  clearTrigger?: number
  /**
   * 마운트 시 startListening / stopListening 함수를 부모에게 전달.
   * 부모가 ref에 저장해두고 TTS 종료 즉시 직접 호출 →
   * React 리렌더 사이클 없이 STT 즉시 시작.
   */
  onReadyToListen?: (startFn: () => void, stopFn: () => void) => void
  /** STT 최종 결과 텍스트를 부모에게 전달 (submit 없이) */
  onSpeechResult?: (text: string) => void
  /** 마이크 listening 상태 변경 시 부모에게 알림 */
  onListeningChange?: (listening: boolean) => void
}

/* ── 파형 프로파일 (deterministic, 36개 바) ── */
const WAVE_BARS = 36
const WAVE_PROFILE = Array.from({ length: WAVE_BARS }, (_, i) => {
  const t      = i / (WAVE_BARS - 1)
  const bell   = Math.exp(-((t - 0.5) ** 2) / 0.08)
  const ripple = 0.5 + 0.5 * Math.abs(Math.sin(i * 1.4))
  return Math.round((0.15 + 0.85 * bell * ripple) * 44) + 4
})

export default function InputBar({
  placeholder = '답을 말하거나 입력해 보세요',
  actions = [],
  onValueChange,
  clearTrigger,
  onReadyToListen,
  onSpeechResult,
  onListeningChange,
}: InputBarProps) {
  const [value, setValue]               = useState('')
  const [interimText, setInterim]       = useState('')
  const [isListening, setListening]     = useState(false)
  const [sttSupported, setSttSupported] = useState(true)

  const inputRef     = useRef<HTMLInputElement>(null)
  const recognRef    = useRef<SpeechRecognitionInstance | null>(null)
  /* 항상 최신 handleMic을 가리키는 stable ref (클로저 stale 방지) */
  const handleMicRef = useRef<() => void>(() => {})

  /* clearTrigger */
  useEffect(() => {
    if (clearTrigger !== undefined && clearTrigger > 0) {
      setValue('')
      setInterim('')
    }
  }, [clearTrigger])

  useEffect(() => { onValueChange?.(value) }, [value, onValueChange])
  useEffect(() => { onListeningChange?.(isListening) }, [isListening, onListeningChange])

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    setSttSupported(ok)
  }, [])

  const handleMic = useCallback(() => {
    if (isListening) {
      recognRef.current?.stop()
      setListening(false)
      setInterim('')
      return
    }
    if (!sttSupported) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. (Chrome 권장)')
      return
    }
    const Ctor: SpeechRecognitionCtor | undefined =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!Ctor) return

    const rec = new Ctor()
    rec.lang           = 'ko-KR'
    rec.continuous     = true
    rec.interimResults = true

    rec.onstart = () => setListening(true)

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interimBuf = ''
      let finalBuf   = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalBuf += t
        else                       interimBuf += t
      }
      if (finalBuf) {
        setValue(finalBuf)
        setInterim('')
        onSpeechResult?.(finalBuf)
        inputRef.current?.focus()
      } else {
        setInterim(interimBuf)
      }
    }

    rec.onerror = () => { setListening(false); setInterim('') }
    rec.onend   = () => { setListening(false); setInterim('') }
    recognRef.current = rec
    rec.start()
  }, [isListening, sttSupported, onSpeechResult])

  /* handleMicRef를 매 렌더마다 최신으로 유지 */
  useEffect(() => { handleMicRef.current = handleMic })

  /* 마운트 시 start/stopFn을 부모에게 한 번만 전달 */
  useEffect(() => {
    const start = () => handleMicRef.current()
    const stop  = () => { recognRef.current?.stop(); setListening(false); setInterim('') }
    onReadyToListen?.(start, stop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-2 w-full">

      {isListening ? (
        /* ── 녹음 중: 파형(위) + STT 텍스트(아래) ── */
        <div className="bg-white border-2 border-cr-accent rounded-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-center gap-[3px] px-4 pt-4 pb-2" style={{ minHeight: 72 }}>
            <VoiceWave />
          </div>
          <div className="px-4 pb-2" style={{ minHeight: 44 }}>
            {interimText
              ? <p className="text-sm text-ybm-text leading-snug">{interimText}</p>
              : <p className="text-sm text-ybm-text-sub italic">음성 인식 중…</p>
            }
          </div>
          <div className="px-4 pb-3 flex justify-end">
            <button
              onClick={handleMic}
              aria-label="음성 입력 중지"
              className="flex items-center gap-1.5 text-xs font-semibold bg-cr-accent/10 hover:bg-cr-accent/20 text-cr-accent px-3 py-1.5 rounded-lg transition-colors"
            >
              <MicIcon />
              중지
            </button>
          </div>
        </div>
      ) : (
        /* ── 일반 입력 ── */
        <div
          className={`flex items-center gap-2 bg-white border-2 rounded-2xl px-4 transition-colors min-w-0
            ${value ? 'border-cr-accent/60' : 'border-ybm-border focus-within:border-cr-accent'}
          `}
          style={{ minHeight: 72 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim() && actions[0] && !actions[0].disabled)
                actions[0].onClick(value)
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-ybm-text placeholder:text-ybm-text-sub outline-none min-w-0 py-4"
          />
          <button
            aria-label="음성 입력 시작"
            onClick={handleMic}
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors
              ${sttSupported
                ? 'bg-cr-accent/10 hover:bg-cr-accent/20 text-cr-accent'
                : 'bg-ybm-bg text-ybm-text-sub cursor-not-allowed opacity-50'}
            `}
          >
            <MicIcon />
          </button>
        </div>
      )}

      {/* 액션 버튼들 */}
      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              disabled={action.disabled}
              onClick={() => { if (value.trim()) action.onClick(value) }}
              className={`flex-1 h-11 rounded-xl font-semibold text-sm transition-all whitespace-nowrap flex items-center justify-center gap-1.5
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                ${action.variant === 'secondary'
                  ? 'bg-ybm-bg text-ybm-text border border-ybm-border hover:bg-ybm-border'
                  : 'bg-cr-accent hover:bg-cr-accent/90 text-white shadow-sm'}
              `}
            >
              {action.icon}
              {action.label}
              {(!action.variant || action.variant === 'primary') && !action.icon && !action.disabled && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VoiceWave() {
  return (
    <>
      {WAVE_PROFILE.map((h, i) => {
        const t = i / (WAVE_BARS - 1)
        const r = Math.round(34  + (124 - 34)  * t)
        const g = Math.round(119 + (91  - 119) * t)
        const b = Math.round(240 + (200 - 240) * t)
        return (
          <span
            key={i}
            className="rounded-full shrink-0"
            style={{
              width: 3,
              height: h,
              backgroundColor: `rgb(${r},${g},${b})`,
              opacity: 0.75 + 0.25 * Math.abs(Math.sin(i * 0.5)),
              animation: `waveBar ${0.55 + (i % 5) * 0.07}s ease-in-out ${i * 30}ms infinite alternate`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </>
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
