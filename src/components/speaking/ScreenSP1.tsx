'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import InputBar from '@/components/classroom/toolbar/InputBar'
import PhotoCard from './PhotoCard'
import { useClassroomStore } from '@/store/classroomStore'
import { SPEAKING_TURNS, OFFICE_PHOTO } from '@/data/speakingScenario'
import { waitForVideoEnd, notifyVideoEnded, speakTurn, stopCurrentAudio } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

type TurnId = 'sp1_t1' | 'sp1_t2' | 'sp1_t3'

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP1({ onComplete, onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [turnId, setTurnId]   = useState<TurnId>('sp1_t1')
  const [speech, setSpeech]   = useState('')
  const [videoSrc, setVideo]  = useState<string | undefined>()
  const [canInput, setCanInput] = useState(false)
  const [warnMessage, setWarnMessage] = useState('')

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
    enterTurn('sp1_t1')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showWarn = useCallback((msg: string) => {
    setWarnMessage(msg)
    setTimeout(() => setWarnMessage(''), 2500)
  }, [])

  const handleLocationSelect = useCallback(async (loc: string) => {
    if (!canInput) return
    if (loc !== 'office') {
      showWarn('다시 생각해봐! 사진을 잘 봐보세요')
      return
    }
    const turn = SPEAKING_TURNS[turnId]
    stopListeningRef.current()
    setCanInput(false)
    if (turn.nextTurnId) await enterTurn(turn.nextTurnId as TurnId)
  }, [canInput, turnId, enterTurn, showWarn])

  const handleVoice = useCallback(async () => {
    if (!canInput) return
    const turn = SPEAKING_TURNS[turnId]
    stopListeningRef.current()
    setCanInput(false)
    if (turn.nextTurnId) await enterTurn(turn.nextTurnId as TurnId)
  }, [canInput, turnId, enterTurn])

  const handleButton = useCallback(() => {
    stopCurrentAudio()
    onComplete()
  }, [onComplete])

  const currentTurn = SPEAKING_TURNS[turnId]

  return (
    <>
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
          lang={currentTurn.lang ?? 'ko-KR'}
          actions={[]}
        />
      }
    >
      {/* 흰색 카드 전체 */}
      <div className="flex flex-col h-full bg-white rounded-2xl border border-ybm-border shadow-sm overflow-hidden">

        {/* 헤더: 배지 + 제목 + 부제 */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <span className="bg-[#2277F0] text-white text-sm font-bold px-3 py-1 rounded-full">STEP 1</span>
          <h2 className="text-3xl font-bold text-[#1A2B4B] mt-2 leading-tight">
            사진 속 장소를 파악해요
          </h2>
          <p className="text-base text-ybm-text-sub mt-1">사진을 보고 장소가 어디인지 영어로 말해보세요.</p>
        </div>

        {/* 사진 + 오버레이 */}
        <div className="relative flex-1 min-h-0">
          <PhotoCard src={OFFICE_PHOTO} className="h-full rounded-none" />
          {turnId === 'sp1_t1' && canInput && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-white/85 backdrop-blur-sm px-4 py-3"
              style={{ animation: 'phraseIn 0.42s cubic-bezier(0.16,1,0.3,1)' }}
            >
              <p className="text-sm text-ybm-text-sub font-semibold mb-2">장소를 골라보세요</p>
              <div className="flex gap-2 flex-wrap">
                {['office', 'restaurant', 'street'].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => handleLocationSelect(loc)}
                    className="px-4 py-2 rounded-xl border-2 border-[#2277F0]/30 bg-[#EFF6FF] text-[#2277F0] text-base font-semibold hover:border-[#2277F0] transition-colors"
                  >
                    {loc}
                  </button>
                ))}
              </div>
              <style>{`@keyframes phraseIn { from { opacity:0; transform:translateY(100%) } to { opacity:1; transform:translateY(0) } }`}</style>
            </div>
          )}
        </div>

      </div>
    </ClassroomLayout>
    {warnMessage && (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce-once">
        <div className="bg-orange-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-bold whitespace-nowrap">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
            <path d="M9 2L16.5 15H1.5L9 2Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M9 7v4M9 12.5v.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {warnMessage}
        </div>
      </div>
    )}
  </>
  )
}
