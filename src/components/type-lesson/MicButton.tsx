'use client'

/* ── 마이크 버튼 (Web Speech STT — 주관식 ko / 정리 단계 en) ── */

import { useEffect, useRef, useState } from 'react'

export default function MicButton({ lang, onResult, className }: { lang: string; onResult: (t: string) => void; className?: string }) {
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
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalBuf += t; else interim += t
      }
      onResult((finalBuf || interim).trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }
  return (
    <button type="button" onClick={toggle} aria-label="음성 입력"
      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
        listening ? 'bg-[#EF4444] border-[#EF4444] text-white animate-pulse' : 'bg-white border-[#BFDBFE] text-[#2563EB] hover:bg-[#EFF6FF]'
      } ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    </button>
  )
}
