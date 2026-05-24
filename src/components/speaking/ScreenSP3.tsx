'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import InputBar from '@/components/classroom/toolbar/InputBar'
import PhotoCard from './PhotoCard'
import { useClassroomStore } from '@/store/classroomStore'
import { SPEAKING_TURNS, OFFICE_PHOTO, OFFICE_ANNOTATIONS } from '@/data/speakingScenario'
import { waitForVideoEnd, notifyVideoEnded, speakTurn, stopCurrentAudio } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

type TurnId = 'sp3_t1' | 'sp3_t2' | 'sp3_t3' | 'sp3_t4' | 'sp3_t5'

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP3({ onComplete, onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [turnId, setTurnId]     = useState<TurnId>('sp3_t1')
  const [speech, setSpeech]     = useState('')
  const [videoSrc, setVideo]    = useState<string | undefined>()
  const [canInput, setCanInput] = useState(false)

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
    if (turn.inputType === 'voice' || turn.inputType === 'repeat') {
      setTimeout(() => startListeningRef.current(), 300)
    }
  }, [persona])

  useEffect(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    enterTurn('sp3_t1')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVoice = useCallback(async () => {
    if (!canInput) return
    const turn = SPEAKING_TURNS[turnId]
    stopListeningRef.current()
    setCanInput(false)
    if (turn.nextTurnId) await enterTurn(turn.nextTurnId as TurnId)
  }, [canInput, turnId, enterTurn])

  const handleButton = useCallback(() => { stopCurrentAudio(); onComplete() }, [onComplete])
  const currentTurn = SPEAKING_TURNS[turnId]

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
            currentTurn.inputType === 'voice'  ? '음성으로 대답해 보세요' :
            currentTurn.inputType === 'repeat' ? `"${currentTurn.repeatPhrase}" 따라해 보세요` :
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

        {/* 헤더: 배지 + 제목 + 부제 */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <span className="bg-[#2277F0] text-white text-sm font-bold px-3 py-1 rounded-full">STEP 3</span>
          <h2 className="text-3xl font-bold text-[#1A2B4B] mt-2 leading-tight">
            주변 인물과 사물을 설명해요
          </h2>
          <p className="text-base text-ybm-text-sub mt-1">두 번째 인물과 주변 사물을 영어로 묘사해 보세요.</p>
        </div>

        {/* 사진 */}
        <div className="flex-1 min-h-0">
          <PhotoCard
            src={OFFICE_PHOTO}
            annotations={
              (['sp3_t3', 'sp3_t4', 'sp3_t5'] as TurnId[]).includes(turnId)
                ? OFFICE_ANNOTATIONS['sp3_t3']
                : OFFICE_ANNOTATIONS['sp3']
            }
            className="h-full rounded-none"
          />
        </div>

      </div>
    </ClassroomLayout>
  )
}
