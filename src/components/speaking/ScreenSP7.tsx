'use client'

import { useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import { SPEAKING_TURNS } from '@/data/speakingScenario'
import { waitForVideoEnd, notifyVideoEnded } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

const RULES = [
  { num: '01', label: '장소',   parts: ['This picture was taken in ', '장소', '.'] },
  { num: '02', label: '인물',   parts: ['A person is ', '-ing', '.'] },
  { num: '03', label: '사물',   parts: ['There is / There are ', '사물', '.'] },
  { num: '04', label: '분위기', parts: ['Overall, they look ', '형용사', '.'] },
]

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP7({ onComplete, onEnd }: Props) {
  const [speech, setSpeech]     = useState('')
  const [videoSrc, setVideo]    = useState<string | undefined>()
  const [canInput, setCanInput] = useState(false)

  const mountedRef = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const run = async () => {
      const turn = SPEAKING_TURNS['sp7_t1']
      setSpeech(turn.script)
      setVideo(turn.videoSrc)
      if (turn.videoSrc) await waitForVideoEnd()
      if (!mountedRef.current) return
      setCanInput(true)
    }
    run()
  }, [])

  return (
    <ClassroomLayout
      partName="TOEIC Speaking · Part 2"
      totalProblems={1}
      instructorSpeech={speech}
      instructorVideoSrc={videoSrc}
      onInstructorVideoEnd={notifyVideoEnded}
      onEnd={onEnd}
      toolbar={<SpeakingNavBar onNext={onComplete} highlighted={canInput} />}
    >
      <div className="flex flex-col gap-5 h-full">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl leading-none">★</span>
            <h2 className="text-xl font-black text-[#1A2B4B]">이것만 기억하자!</h2>
            <span className="text-[#2277F0] text-lg leading-none ml-1">✦</span>
          </div>
          <div className="border-b-2 border-[#1A2B4B]/10" />
        </div>

        {/* Rule cards */}
        <div className="flex flex-col gap-3 flex-1">
          {RULES.map((rule) => (
            <div
              key={rule.num}
              className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-ybm-border flex items-center gap-3"
            >
              <span className="w-8 h-8 rounded-full bg-[#2277F0] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {rule.num}
              </span>
              <span className="text-[10px] font-bold text-[#2277F0] bg-[#EFF6FF] px-1.5 py-0.5 rounded shrink-0">
                {rule.label}
              </span>
              <p className="text-sm text-[#1A2B4B] font-medium">
                {rule.parts[0]}
                <span className="text-[#2277F0] font-bold">{rule.parts[1]}</span>
                {rule.parts[2]}
              </p>
            </div>
          ))}
        </div>

        {/* Complete button */}
        <button
          disabled={!canInput}
          onClick={onComplete}
          className={`w-full py-3 rounded-2xl font-bold text-sm text-white transition-all
            ${canInput ? 'bg-[#2277F0] hover:bg-[#1a66d4] active:scale-95 shadow-sm' : 'bg-[#D1D5DB] cursor-not-allowed'}
          `}
        >
          학습 완료 →
        </button>
      </div>
    </ClassroomLayout>
  )
}
