'use client'

/* ── 마이크 버튼 (Web Speech STT — 주관식 ko / 정리 단계 en) ── */

import { useEffect, useRef, useState } from 'react'

export default function MicButton({ lang, onResult, className, finalOnly, label }: {
  lang: string
  onResult: (t: string) => void
  className?: string
  /** **다 말하고 나서 한 번만** 알린다.
   *  기본은 인식되는 대로 계속 알리는데(낱말 하나를 받는 자리는 그게 빠르다), 문장을 통째로
   *  말하는 자리에서는 중간 토막마다 판정이 돌아 "다시 말해 보세요" 가 쏟아진다. */
  finalOnly?: boolean
  /** 버튼 옆에 붙는 한 마디 — 무엇을 말해야 하는지 알려 준다 */
  label?: string
}) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)
  // SSR과 첫 클라이언트 렌더가 같아야 하므로(hydration) 지원 여부는 마운트 후 판별
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    setSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    return () => { try { recRef.current?.stop() } catch { /* noop */ } }
  }, [])
  if (!supported) return null
  const toggle = () => {
    if (listening) { try { recRef.current?.stop() } catch { /* noop */ } setListening(false); return }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = lang
    rec.interimResults = true
    let finalBuf = ''
    let lastInterim = ''
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalBuf += t; else interim += t
      }
      lastInterim = interim
      if (!finalOnly) onResult((finalBuf || interim).trim())
    }
    rec.onend = () => {
      setListening(false)
      /* 최종 결과가 끝내 안 오는 기기가 있다 — 그때는 마지막 중간 결과를 쓴다 */
      if (finalOnly) { const t = (finalBuf || lastInterim).trim(); if (t) onResult(t) }
    }
    rec.onerror = () => setListening(false)
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }
  const button = (
    <button type="button" onClick={toggle} aria-label="음성 입력"
      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
        listening ? 'bg-[#EF4444] border-[#EF4444] text-white animate-pulse' : 'bg-white border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF]'
      } ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    </button>
  )
  if (!label) return button
  return (
    <div className="flex items-center gap-2">
      {button}
      <span className={`text-[12px] font-semibold ${listening ? 'text-[#B91C1C]' : 'text-[#64748B]'}`}>
        {listening ? '듣고 있어요… 다 말하면 마이크를 다시 눌러 주세요' : label}
      </span>
    </div>
  )
}
