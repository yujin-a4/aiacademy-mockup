'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import { useClassroomStore } from '@/store/classroomStore'
import { SPEAKING_TURNS } from '@/data/speakingScenario'
import { waitForVideoEnd, notifyVideoEnded } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP0({ onComplete, onEnd }: Props) {
  const persona    = useClassroomStore((s) => s.persona)
  const [speech, setSpeech]   = useState('')
  const [videoSrc, setVideo]  = useState<string | undefined>()
  const mountedRef = useRef(false)
  const enteredRef = useRef(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const enter = useCallback(async () => {
    const turn = SPEAKING_TURNS['sp0_intro']
    setSpeech(turn.script)
    setVideo(turn.videoSrc)
    if (turn.videoSrc) await waitForVideoEnd()
  }, [])

  useEffect(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    enter()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ClassroomLayout
      partName="TOEIC Speaking · Part 2"
      totalProblems={1}
      instructorSpeech={speech}
      instructorVideoSrc={videoSrc}
      onInstructorVideoEnd={notifyVideoEnded}
      onEnd={onEnd}
      toolbar={<div />}
    >
      {/* 도입 화면 — 제목 카드 */}
      <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
        <div className="w-24 h-24 rounded-3xl bg-[#EFF6FF] flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="24" height="20" rx="3" stroke="#2277F0" strokeWidth="2"/>
            <path d="M10 14h12M10 18h8" stroke="#2277F0" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="10" r="4" fill="#2277F0"/>
            <path d="M22.5 10l1 1 2-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-[#2277F0] uppercase tracking-widest mb-3">TOEIC Speaking</p>
          <h1 className="text-3xl font-bold text-[#1A2B4B]">Part 2</h1>
          <h2 className="text-4xl font-black text-[#1A2B4B] mt-1 leading-tight">사진 보고<br/>30초 말하기</h2>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          {['장소 말하기', '주요 인물 설명', '주변 설명', '전체 분위기 설명'].map((step, i) => (
            <div key={i} className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm border border-ybm-border/50">
              <span className="w-9 h-9 rounded-full bg-[#2277F0] text-white text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-base font-semibold text-ybm-text">{step}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onComplete}
          className="w-full max-w-sm py-4 rounded-2xl bg-[#2277F0] text-white font-bold text-lg hover:bg-[#1a66d4] active:scale-95 transition-all shadow-sm"
        >
          시작하기 →
        </button>
      </div>
    </ClassroomLayout>
  )
}
