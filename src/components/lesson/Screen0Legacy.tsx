'use client'

/* ⚠️ 구버전 도입 화면 (아카이브) — 기존 콘텐츠 기록용.
   새 도입 디자인은 Screen0.tsx에서 계속 수정. 이 파일은 그대로 두어 구버전으로 보존한다. */

import { useEffect, useRef } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { buildTurns } from '@/data/lessonScenario'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'

interface Screen0Props {
  onComplete: () => void
  onEnd?: () => void
}

export default function Screen0Legacy({ onComplete, onEnd }: Screen0Props) {
  const persona  = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const turn     = buildTurns(userName).s0_intro
  const playedRef = useRef(false)

  useEffect(() => {
    if (playedRef.current) return
    playedRef.current = true
    void speakTTS(turn.script, persona)
    return () => stopCurrentAudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={turn.script}
      instructorLoading={false}
      instructorVideoSrc={turn.videoSrc}
      onEnd={onEnd ?? (() => window.history.back())}
      instructorInput={
        <button
          onClick={() => { stopCurrentAudio(); onComplete() }}
          className="w-full py-4 rounded-2xl text-base font-bold transition-all bg-[#2277F0] text-white hover:bg-[#1a66d4] active:scale-[0.98] shadow-sm"
        >
          수업 시작하기 →
        </button>
      }
    >
      {/* 썸네일 콘텐츠 영역 */}
      <div className="flex flex-col gap-5 h-full justify-center items-center">

        {/* 대형 썸네일 카드 */}
        <div className="w-full max-w-lg">
          <div className="relative rounded-3xl overflow-hidden shadow-lg border border-ybm-border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/part5-thumb.png"
              alt="Part 5 수동태"
              className="w-full h-auto block"
              style={{ maxHeight: 320, objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* 수업 정보 카드 */}
        <div className="w-full max-w-lg bg-white rounded-2xl border border-ybm-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#2277F0] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2.5" stroke="white" strokeWidth="1.5"/>
                <path d="M7 7h6M7 10h6M7 13h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-ybm-text-sub font-medium">오늘의 수업</p>
              <p className="text-base font-bold text-[#1A2B4B]">Part 5 · 수동태 완벽 정복</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              { step: '1단계', label: '문제 유형 학습', desc: '강사와 함께 수동태 풀이 전략 익히기' },
              { step: '2단계', label: '실전 문제 도전', desc: '3문제를 20초 안에 직접 풀기' },
              { step: '3단계', label: '핵심 요약 설명', desc: '오늘 배운 내용을 직접 강사에게 설명' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 w-14 text-[10px] font-bold text-[#2277F0] bg-[#D6EAFF] px-2 py-0.5 rounded-full text-center">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ybm-text">{label}</p>
                  <p className="text-xs text-ybm-text-sub">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ClassroomLayout>
  )
}
