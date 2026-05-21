'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import InputBar from '@/components/classroom/toolbar/InputBar'
import PhotoCard from './PhotoCard'
import ScriptPanel from './ScriptPanel'
import TimerRing from './TimerRing'
import { useClassroomStore } from '@/store/classroomStore'
import { SPEAKING_TURNS, OFFICE_PHOTO, OFFICE_SCRIPT } from '@/data/speakingScenario'
import { waitForVideoEnd, notifyVideoEnded, speakTurn, stopCurrentAudio } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

type TurnId = 'sp5_t1' | 'sp5_t2' | 'sp5_t3'

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP5({ onComplete, onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [turnId, setTurnId]       = useState<TurnId>('sp5_t1')
  const [speech, setSpeech]       = useState('')
  const [videoSrc, setVideo]      = useState<string | undefined>()
  const [canInput, setCanInput]   = useState(false)
  const [timerRunning, setTimer]  = useState(false)

  const mountedRef = useRef(false)
  const enteredRef = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const enterTurn = useCallback(async (id: TurnId) => {
    if (!mountedRef.current) return
    const turn = SPEAKING_TURNS[id]
    setTurnId(id)
    setCanInput(false)
    setSpeech(turn.script)
    setVideo(turn.videoSrc)

    if (turn.videoSrc) await waitForVideoEnd()
    else await speakTurn({ script: turn.script, persona })
    if (!mountedRef.current) return

    setCanInput(true)
    if (id === 'sp5_t1') { setTimer(true); setTimeout(() => startListeningRef.current(), 300) }
    if (turn.inputType === 'repeat') setTimeout(() => startListeningRef.current(), 300)
  }, [persona])

  useEffect(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    enterTurn('sp5_t1')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVoice = useCallback(async () => {
    if (!canInput) return
    const turn = SPEAKING_TURNS[turnId]
    stopListeningRef.current()
    setTimer(false)
    setCanInput(false)
    if (turn.nextTurnId) await enterTurn(turn.nextTurnId as TurnId)
  }, [canInput, turnId, enterTurn])

  const handleButton = useCallback(() => { stopCurrentAudio(); onComplete() }, [onComplete])
  const currentTurn = SPEAKING_TURNS[turnId]
  const isPractice = turnId === 'sp5_t1'

  return (
    <ClassroomLayout
      partName="TOEIC Speaking · Part 2"
      totalProblems={1}
      instructorSpeech={speech}
      instructorVideoSrc={videoSrc}
      onInstructorVideoEnd={notifyVideoEnded}
      onEnd={onEnd}
      toolbar={<SpeakingNavBar onNext={onComplete} highlighted={canInput && currentTurn.inputType === 'button'} />}
      instructorInput={
        <InputBar
          placeholder={
            !canInput ? '강사 설명 듣는 중...' :
            currentTurn.inputType === 'practice' ? '빈칸을 채워서 말해보세요' :
            currentTurn.inputType === 'repeat'   ? `"${currentTurn.repeatPhrase}" 따라해 보세요` :
            '아래 버튼을 눌러주세요'
          }
          onReadyToListen={(s, st) => { startListeningRef.current = s; stopListeningRef.current = st }}
          onSpeechResult={handleVoice}
          onListeningChange={() => {}}
          actions={[]}
        />
      }
    >
      {/* 흰색 카드 전체 */}
      <div className="flex flex-col h-full bg-white rounded-2xl border border-ybm-border shadow-sm overflow-hidden">

        {/* 헤더: 배지 + 타이머 + 제목 + 부제 */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="bg-[#2277F0] text-white text-sm font-bold px-3 py-1 rounded-full">STEP 5</span>
            <TimerRing seconds={30} running={timerRunning} size={56} />
          </div>
          <h2 className="text-3xl font-bold text-[#1A2B4B] mt-2 leading-tight">
            빈칸을 채워 말해봐요
          </h2>
          <p className="text-base text-ybm-text-sub mt-1">배운 표현을 활용해 전체 문장을 완성해 보세요.</p>
        </div>

        {/* 사진 + 스크립트 2단 */}
        <div className="flex gap-4 flex-1 min-h-0 px-5 pb-3">
          <div className="w-2/5 shrink-0">
            <PhotoCard src={OFFICE_PHOTO} className="h-full" />
          </div>
          <div className="flex-1 ybm-card p-4 overflow-y-auto">
            <ScriptPanel
              title="빈칸을 채워 말해보세요"
              lines={OFFICE_SCRIPT}
              mode={isPractice ? 'blank' : 'full'}
            />
          </div>
        </div>

        {/* 말하기 버튼 */}
        {isPractice && canInput && (
          <div className="px-5 pb-4">
            <button
              onClick={handleVoice}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-[#2277F0] text-white font-bold text-base hover:bg-[#1a66d4] active:scale-95 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="1" width="6" height="8" rx="3" stroke="white" strokeWidth="1.5"/>
                <path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 14v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              말하기 시작
            </button>
          </div>
        )}

      </div>
    </ClassroomLayout>
  )
}
