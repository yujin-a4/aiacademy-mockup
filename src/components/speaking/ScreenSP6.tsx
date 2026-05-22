'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import InputBar from '@/components/classroom/toolbar/InputBar'
import PhotoCard from './PhotoCard'
import TimerRing from './TimerRing'
import { useClassroomStore } from '@/store/classroomStore'
import { SPEAKING_TURNS, PARK_PHOTO } from '@/data/speakingScenario'
import { speakTurn } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

type Phase = 'intro' | 'practice' | 'feedback'
type FeedTurnId = 'sp6_t2' | 'sp6_t3'

const STEPS = ['장소 말하기', '주요 인물 설명', '주변 설명', '전체 분위기 설명']

const WAVE_HEIGHTS = Array.from({ length: 20 }, (_, i) => {
  const t = i / 19
  return Math.round(6 + Math.sin(t * Math.PI) * 22)
})

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP6({ onComplete, onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [phase, setPhase]         = useState<Phase>('intro')
  const [feedTurnId, setFeedTurn] = useState<FeedTurnId>('sp6_t2')
  const [timerRunning, setTimer]  = useState(false)
  const [canInput, setCanInput]   = useState(false)
  const [isRecording, setRecording] = useState(false)
  const [speech, setSpeech]       = useState('')

  const mountedRef        = useRef(false)
  const startedRef        = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const run = async () => {
      const turn = SPEAKING_TURNS['sp6_t1']
      setSpeech(turn.script)
      await speakTurn({ script: turn.script, persona })
      if (!mountedRef.current) return
      setPhase('practice')
      setTimer(true)
      setCanInput(true)
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSpeechResult = useCallback(async (_text: string) => {
    if (phase === 'practice') {
      stopListeningRef.current()
      setTimer(false)
      setCanInput(false)
      setPhase('feedback')

      const t2 = SPEAKING_TURNS['sp6_t2']
      setFeedTurn('sp6_t2')
      setSpeech(t2.script)
      await speakTurn({ script: t2.script, persona })
      if (!mountedRef.current) return
      setCanInput(true)
      setTimeout(() => startListeningRef.current(), 300)
    } else if (phase === 'feedback' && feedTurnId === 'sp6_t2') {
      stopListeningRef.current()
      setCanInput(false)
      const t3 = SPEAKING_TURNS['sp6_t3']
      setFeedTurn('sp6_t3')
      setSpeech(t3.script)
      await speakTurn({ script: t3.script, persona })
      if (!mountedRef.current) return
      setCanInput(true)
    }
  }, [phase, feedTurnId, persona])

  const handleMicTap = useCallback(() => {
    if (!canInput || phase !== 'practice') return
    startListeningRef.current()
  }, [canInput, phase])

  const handleTimerEnd = useCallback(() => {
    if (phase !== 'practice' || !canInput) return
    handleSpeechResult('')
  }, [phase, canInput, handleSpeechResult])

  const currentTurn = SPEAKING_TURNS[feedTurnId]

  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="shrink-0 h-14 bg-white border-b border-ybm-border flex items-center px-4 gap-2">
        <button onClick={onEnd} className="p-1 text-ybm-text-sub hover:text-ybm-text transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 16l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-xs text-ybm-text-sub">TOEIC Speaking</span>
        <span className="text-xs text-ybm-text-sub mx-0.5">›</span>
        <span className="text-sm font-bold text-ybm-text">Part 2 사진 묘사</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-bold text-[#1A2B4B]">1/3</span>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F7FA] text-ybm-text-sub transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 8v5M9 6v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="text-xs font-semibold text-[#2277F0] px-2.5 py-1 rounded-lg hover:bg-[#EFF6FF] transition-colors">
            학습 도움말
          </button>
        </div>
      </header>

      {/* Step Progress */}
      <div className="shrink-0 bg-white border-b border-ybm-border px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-[10px] font-bold text-[#2277F0] border border-[#2277F0]/60 rounded px-1.5 py-0.5">TIP</span>
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <span className="text-ybm-text-sub text-xs">›</span>}
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
              i < 3 ? 'bg-[#2277F0] text-white' : 'bg-[#EFF6FF] text-[#2277F0]'
            }`}>{i + 1}</span>
            <span className="text-xs text-ybm-text font-medium">{step}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex gap-4 p-4">
        {/* Photo */}
        <div className="w-1/2 shrink-0">
          <PhotoCard src={PARK_PHOTO} className="h-full" />
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-3">
          {phase !== 'feedback' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <p className="text-base font-bold text-[#1A2B4B]">사진을 보고 설명해 보세요.</p>
              <span className="text-[#2277F0] text-xl select-none"></span>

              <TimerRing seconds={45} running={timerRunning} size={72} onEnd={handleTimerEnd} />

              {/* Voice wave */}
              <div className="flex items-end justify-center gap-1 h-12 w-52">
                {WAVE_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full"
                    style={{
                      height: `${h}px`,
                      backgroundColor: isRecording ? '#2277F0' : '#D1D5DB',
                      animation: isRecording
                        ? `wavePractice ${0.4 + (i % 5) * 0.07}s ease-in-out ${i * 28}ms infinite alternate`
                        : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Mic button */}
              <button
                onClick={handleMicTap}
                disabled={!canInput}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all
                  ${isRecording ? 'bg-red-500 scale-105' : canInput ? 'bg-[#2277F0] hover:bg-[#1a66d4] active:scale-95' : 'bg-[#D1D5DB]'}
                `}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="10" y="2" width="12" height="16" rx="6" stroke="white" strokeWidth="2.5"/>
                  <path d="M4 16c0 6.627 5.373 12 12 12s12-5.373 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M16 28v4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
              <p className="text-xs text-ybm-text-sub text-center">버튼을 눌러 말하기를 시작하세요.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-ybm-border overflow-y-auto">
                <p className="text-sm leading-relaxed text-[#1A2B4B] whitespace-pre-line">{speech}</p>
              </div>
              {/* Feedback InputBar */}
            </>
          )}
        </div>
      </div>

      {/* Single InputBar — always mounted, sr-only in practice, visible in feedback */}
      <div className={`shrink-0 ${phase === 'feedback' ? 'px-4 pb-4' : 'sr-only'}`}>
        <InputBar
          placeholder={
            phase !== 'feedback' ? '' :
            !canInput ? '강사 설명 듣는 중...' :
            feedTurnId === 'sp6_t2' ? `"${currentTurn.repeatPhrase}" 따라해 보세요` :
            '아래 버튼을 눌러주세요'
          }
          onReadyToListen={(s, st) => { startListeningRef.current = s; stopListeningRef.current = st }}
          onSpeechResult={handleSpeechResult}
          onListeningChange={(listening) => { if (phase === 'practice') setRecording(listening) }}
          actions={[]}
        />
      </div>

      {/* 이전/다음 단계 네비바 */}
      <div className="shrink-0 border-t border-ybm-border bg-white">
        <SpeakingNavBar onNext={onComplete} highlighted={feedTurnId === 'sp6_t3' && canInput && phase === 'feedback'} />
      </div>

      <style>{`
        @keyframes wavePractice {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  )
}
