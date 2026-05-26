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
  onReadyToListen?: (startFn: () => void, stopFn: () => void) => void
  onSpeechResult?: (text: string) => void
  onListeningChange?: (listening: boolean) => void
  /** 음성 인식 언어. 기본값 'ko-KR' */
  lang?: string
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
  lang = 'ko-KR',
}: InputBarProps) {
  const [value, setValue]               = useState('')
  const [interimText, setInterim]       = useState('')
  const [isListening, setListening]     = useState(false)
  const [sttSupported, setSttSupported] = useState(true)

  const inputRef             = useRef<HTMLInputElement>(null)
  const recognRef            = useRef<SpeechRecognitionInstance | null>(null)
  const handleMicRef         = useRef<() => void>(() => {})
  const langRef              = useRef(lang)
  const onSpeechResultRef    = useRef(onSpeechResult)
  const onListeningChangeRef = useRef(onListeningChange)
  useEffect(() => { langRef.current             = lang             }, [lang])
  useEffect(() => { onSpeechResultRef.current    = onSpeechResult    }, [onSpeechResult])
  useEffect(() => { onListeningChangeRef.current = onListeningChange }, [onListeningChange])

  useEffect(() => { onListeningChangeRef.current?.(isListening) }, [isListening])

  useEffect(() => {
    if (clearTrigger !== undefined && clearTrigger > 0) {
      setValue('')
      setInterim('')
    }
  }, [clearTrigger])

  useEffect(() => { onValueChange?.(value) }, [value, onValueChange])

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
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .SpeechRecognition ??
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition
    if (!Ctor) return

    const rec = new Ctor()
    rec.lang           = lang
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
        onSpeechResultRef.current?.(finalBuf)
        inputRef.current?.focus()
      } else {
        setInterim(interimBuf)
      }
    }

    rec.onerror = () => { setListening(false); setInterim('') }
    rec.onend   = () => { setListening(false); setInterim('') }
    recognRef.current = rec
    rec.start()
  }, [isListening, sttSupported])

  useEffect(() => { handleMicRef.current = handleMic })

  const forceStartRef = useRef<() => void>(() => {})
  useEffect(() => {
    forceStartRef.current = () => {
      const ok =
        typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
      console.log('[STT] forceStart called, supported:', ok)
      if (!ok) { console.warn('[STT] SpeechRecognition not supported in this browser'); return }
      try { recognRef.current?.stop() } catch (_) {}

      const Ctor: SpeechRecognitionCtor | undefined =
        (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
          .SpeechRecognition ??
        (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
          .webkitSpeechRecognition
      if (!Ctor) return

      const rec = new Ctor()
      rec.lang           = langRef.current
      rec.continuous     = true
      rec.interimResults = true

      rec.onstart = () => { console.log('[STT] onstart fired'); setListening(true) }
      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interimBuf = ''
        let finalBuf   = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finalBuf += t
          else                       interimBuf += t
        }
        console.log('[STT] onresult — interim:', interimBuf, 'final:', finalBuf)
        if (finalBuf) {
          setValue(finalBuf)
          setInterim('')
          onSpeechResultRef.current?.(finalBuf)
          inputRef.current?.focus()
        } else {
          setInterim(interimBuf)
        }
      }
      rec.onerror = (e) => {
        console.error('[STT] onerror:', (e as unknown as { error?: string }).error ?? e)
        setListening(false); setInterim('')
      }
      rec.onend   = () => { console.log('[STT] onend fired'); setListening(false); setInterim('') }
      recognRef.current = rec
      console.log('[STT] calling rec.start()')
      rec.start()
    }
  })

  useEffect(() => {
    const start = () => forceStartRef.current()
    const stop  = () => { try { recognRef.current?.stop() } catch (_) {} setListening(false); setInterim('') }
    onReadyToListen?.(start, stop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 텍스트 직접 입력 후 전송 */
  const handleTextSubmit = useCallback(() => {
    const text = value.trim()
    if (!text) return
    try { recognRef.current?.stop() } catch (_) {}
    setListening(false)
    setInterim('')
    onSpeechResultRef.current?.(text)
    setValue('')
  }, [value])

  return (
    <div className="flex flex-col gap-2 w-full">

      {/* 음성 입력 영역 — 액션 버튼(button 타입 턴)일 때는 숨김 */}
      {actions.length === 0 && <div className={`bg-white border-2 rounded-2xl overflow-hidden transition-colors
        ${isListening ? 'border-cr-accent' : value ? 'border-cr-accent/60' : 'border-ybm-border focus-within:border-cr-accent'}
      `}>

        {/* 파형 영역 — 마이크 켜져 있을 때만 표시 */}
        {isListening && (
          <>
            <div className="flex items-center gap-3 px-4 pt-3 pb-1">
              <div className="flex-1 flex items-center justify-center gap-[3px]" style={{ minHeight: 44 }}>
                <VoiceWave />
              </div>
              <button
                onClick={handleMic}
                aria-label="음성 입력 중지"
                className="shrink-0 flex items-center gap-1.5 text-sm font-semibold bg-cr-accent/10 hover:bg-cr-accent/20 text-cr-accent px-3 py-1.5 rounded-lg transition-colors"
              >
                <span className="w-2 h-2 rounded-sm bg-current inline-block" />
                중지
              </button>
            </div>
            <div className="px-4 pb-2 min-h-[20px]">
              {interimText
                ? <p className="text-base text-ybm-text leading-snug">{interimText}</p>
                : <p className="text-sm text-ybm-text-sub italic">말하거나 아래에 직접 입력할 수 있어요</p>
              }
            </div>
            <div className="mx-4 border-t border-ybm-border/50" />
          </>
        )}

        {/* 텍스트 입력 — 항상 표시 */}
        <div
          className="flex items-center gap-2 px-4"
          style={{ minHeight: isListening ? 48 : 72 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              if (isListening) {
                handleTextSubmit()
              } else if (value.trim() && actions[0] && !actions[0].disabled) {
                actions[0].onClick(value)
              }
            }}
            placeholder={isListening ? '직접 입력 후 Enter...' : placeholder}
            className="flex-1 bg-transparent text-base text-ybm-text placeholder:text-ybm-text-sub outline-none min-w-0 py-3"
          />
          {isListening ? (
            value.trim() ? (
              <button
                onClick={handleTextSubmit}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-cr-accent hover:bg-cr-accent/90 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                전송
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : null
          ) : (
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
          )}
        </div>
      </div>}

      {/* 액션 버튼들 */}
      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              disabled={action.disabled}
              onClick={() => action.onClick(value)}
              className={`flex-1 h-12 rounded-xl font-semibold text-base transition-all whitespace-nowrap flex items-center justify-center gap-1.5
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
