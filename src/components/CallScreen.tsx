'use client'
import { useState, useEffect, useRef } from 'react'

export type CallEntry = {
  id: string
  instructorKey: string
  instructorName: string
  instructorThumb: string
  time: Date
  status: 'answered' | 'rejected'
  duration?: number
}

function InstructorAvatar({ thumb, name, size = 110 }: { thumb: string; name: string; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden border-[3px] border-white/30 shadow-2xl relative bg-[#2563EB]"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-black" style={{ fontSize: size * 0.33 }}>{name.slice(0, 1)}</span>
      </div>
      <img
        src={thumb}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover object-top"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

function PhoneOffSvg() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.32 9.9a16 16 0 0 0 3.36 3.41z"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

// ── 수신 전화 화면 ────────────────────────────────────────
export function IncomingCallScreen({
  instructorName,
  instructorThumb,
  onAnswer,
  onReject,
}: {
  instructorName: string
  instructorThumb: string
  onAnswer: () => void
  onReject: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between py-16 animate-fade-in"
      style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E293B 55%, #0F172A 100%)' }}
    >
      <div className="flex flex-col items-center gap-3 pt-4">
        <p className="text-white/40 text-[12px] tracking-[0.18em] uppercase font-semibold">수신 전화</p>
        <h2 className="text-white font-bold text-[30px] tracking-tight">{instructorName} 선생님</h2>
        <p className="text-white/40 text-[14px]">YBM AI Academy</p>

        <div className="relative flex items-center justify-center mt-6">
          <div className="absolute rounded-full border border-white/[0.06] animate-ping"
            style={{ width: 196, height: 196, animationDuration: '2.6s' }} />
          <div className="absolute rounded-full border border-white/[0.10] animate-ping"
            style={{ width: 162, height: 162, animationDuration: '2s', animationDelay: '0.5s' }} />
          <div className="absolute rounded-full bg-white/[0.04]" style={{ width: 133, height: 133 }} />
          <InstructorAvatar thumb={instructorThumb} name={instructorName} size={108} />
        </div>

        <div className="flex items-center gap-2 mt-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/60 text-[13px]">수신 전화 중...</span>
        </div>
      </div>

      <div className="flex items-center gap-24 pb-4">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onReject}
            className="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-xl shadow-red-500/30"
          >
            <PhoneOffSvg />
          </button>
          <span className="text-white/50 text-[12px]">끊기</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onAnswer}
            className="w-[72px] h-[72px] rounded-full bg-green-500 hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center shadow-xl shadow-green-500/30 animate-bounce"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <span className="text-white/50 text-[12px]">받기</span>
        </div>
      </div>
    </div>
  )
}

// ── 통화 중 화면 ──────────────────────────────────────────
export function ActiveCallScreen({
  instructorName,
  instructorThumb,
  onHangup,
  greeting,
  persona = 'park',
}: {
  instructorName: string
  instructorThumb: string
  onHangup: (duration: number) => void
  greeting?: string
  persona?: string
}) {
  const [seconds, setSeconds] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (!greeting) return
    const playGreeting = async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: greeting, persona }),
        })
        const data = await res.json()
        if (data.useNativeTts) {
          const u = new SpeechSynthesisUtterance(data.text)
          window.speechSynthesis.speak(u)
          return
        }
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        audioRef.current = audio
        audio.onended = () => { audioRef.current = null }
        await audio.play()
      } catch (_e) {
        if (greeting && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(greeting))
        }
      }
    }
    playGreeting()
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [])

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between py-16 animate-fade-in"
      style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E293B 55%, #0F172A 100%)' }}
    >
      <div className="flex flex-col items-center gap-3 pt-4">
        <p className="text-green-400 text-[12px] tracking-[0.18em] uppercase font-semibold">통화 중</p>
        <h2 className="text-white font-bold text-[30px] tracking-tight">{instructorName} 선생님</h2>
        <p className="text-green-400/80 text-[24px] font-mono mt-1 tabular-nums">{fmt(seconds)}</p>
        <div className="mt-6">
          <InstructorAvatar thumb={instructorThumb} name={instructorName} size={108} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pb-4">
        <button
          onClick={() => onHangup(seconds)}
          className="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-xl shadow-red-500/30"
        >
          <PhoneOffSvg />
        </button>
        <span className="text-white/50 text-[12px]">끊기</span>
      </div>
    </div>
  )
}

// ── 통화 기록 시트 ────────────────────────────────────────
export function CallLogSheet({
  entries,
  onClose,
}: {
  entries: CallEntry[]
  onClose: () => void
}) {
  const formatTime = (d: Date) => {
    const diff = Date.now() - d.getTime()
    if (diff < 60_000) return '방금 전'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const formatDuration = (s?: number) => {
    if (!s) return ''
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}분 ${sec}초` : `${sec}초`
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl pb-10 pt-5 px-5 shadow-2xl animate-slide-up overflow-y-auto"
        style={{ maxHeight: '75vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900 font-bold text-[18px]">통화 기록</h2>
          <button onClick={onClose} className="text-slate-400 text-[13px] font-medium hover:text-slate-600 transition-colors">
            닫기
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-slate-400 text-center py-10 text-[14px]">통화 기록이 없습니다.</p>
        ) : (
          <div className="space-y-1">
            {[...entries].reverse().map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-11 h-11 rounded-full overflow-hidden relative bg-[#EFF6FF] shrink-0">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#2563EB] font-black text-lg">{entry.instructorName.slice(0, 1)}</span>
                  </div>
                  <img
                    src={entry.instructorThumb}
                    alt={entry.instructorName}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-[14px]">{entry.instructorName} 선생님</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-red-500 font-semibold">부재중</span>
                  </div>
                </div>

                <p className="text-[12px] text-slate-400 shrink-0">{formatTime(entry.time)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
