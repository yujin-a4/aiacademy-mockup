'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import InputBar from '@/components/classroom/toolbar/InputBar'
import PhotoCard from './PhotoCard'
import { useClassroomStore } from '@/store/classroomStore'
import { SPEAKING_TURNS, OFFICE_PHOTO, OFFICE_ANNOTATIONS } from '@/data/speakingScenario'
import { waitForVideoEnd, notifyVideoEnded, speakTurn, stopCurrentAudio } from '@/lib/tts'
import SpeakingNavBar from './SpeakingNavBar'

type TurnId = 'sp2_t1' | 'sp2_t2' | 'sp2_t3' | 'sp2_t4' | 'sp2_t5'

interface Props { onComplete: () => void; onEnd: () => void }

export default function ScreenSP2({ onComplete, onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const [turnId, setTurnId]     = useState<TurnId>('sp2_t1')
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
    enterTurn('sp2_t1')
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
            !canInput                          ? '강사 설명 듣는 중...' :
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
          <span className="bg-[#2277F0] text-white text-sm font-bold px-3 py-1 rounded-full">STEP 2</span>
          <h2 className="text-3xl font-bold text-[#1A2B4B] mt-2 leading-tight">
            Part 2 사진 보고 30초 말하기
          </h2>
          <p className="text-base text-ybm-text-sub mt-1">사진을 보고 30초 동안 가능한 한 자세히 설명하세요.</p>
        </div>

        {/* 사진 + 오버레이 — 카드 하단을 꽉 채움 */}
        <div className="relative flex-1 min-h-0">
          <PhotoCard
            src={OFFICE_PHOTO}
            annotations={OFFICE_ANNOTATIONS['sp2']}
            className="h-full rounded-none"
          />
          {canInput && <PhraseCard key={turnId} turnId={turnId} canInput={canInput} onChoice={handleVoice} />}
        </div>

      </div>
    </ClassroomLayout>
  )
}

/* ── 사진 위 오버레이 구문 카드 ── */
function PhraseCard({ turnId, canInput, onChoice }: {
  turnId: TurnId
  canInput: boolean
  onChoice: () => void
}) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 overflow-hidden"
      style={{ backgroundColor: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(6px)', animation: 'phraseIn 0.42s cubic-bezier(0.16,1,0.3,1), phraseBounce 0.6s ease-out 0.45s' }}
    >
      {/* 파란 강조 선 */}
      <div className="h-[3px] bg-[#2277F0]" />

      {/* 아이콘 + 레이블 */}
      <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#2277F0]">
          <rect x="1" y="1" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M3 10l2-3h4a1.5 1.5 0 001.5-1.5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs font-bold text-[#2277F0] tracking-wide uppercase">Hint</span>
      </div>

      <div className="px-4 pt-1.5 pb-3">
        <PhraseContent turnId={turnId} canInput={canInput} onChoice={onChoice} />
      </div>

      <style>{`
        @keyframes phraseIn {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes phraseBounce {
          0%   { transform: translateY(0); }
          25%  { transform: translateY(-8px); }
          50%  { transform: translateY(0); }
          75%  { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function PhraseContent({ turnId, canInput, onChoice }: {
  turnId: TurnId
  canInput: boolean
  onChoice: () => void
}) {
  /* sp2_t1: A woman is ___. */
  if (turnId === 'sp2_t1') return (
    <div>
      <p className="text-sm text-ybm-text-sub font-semibold mb-1.5">영어로 말해보세요</p>
      <p className="text-2xl font-medium text-ybm-text">
        A woman is{' '}
        <span className="inline-block border-b-2 border-[#2277F0] min-w-[140px] mx-1 text-center text-ybm-text-sub italic">
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
        .
      </p>
    </div>
  )

  /* sp2_t2: 첫 문장 완성 + She is ___. */
  if (turnId === 'sp2_t2') return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
          <path d="M2 6.5l3 3 6-6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-lg font-semibold text-green-600">A woman is sitting at a desk.</p>
      </div>
      <div className="border-t border-black/10 pt-2">
        <p className="text-sm text-ybm-text-sub font-semibold mb-1">이어서 말해보세요</p>
        <p className="text-2xl font-medium text-ybm-text">
          She is{' '}
          <span className="inline-block border-b-2 border-[#2277F0] min-w-[140px] mx-1 text-center text-ybm-text-sub italic">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
          .
        </p>
      </div>
    </div>
  )

  /* sp2_t3: 관사 'a' 강조 + 따라하기 */
  if (turnId === 'sp2_t3') return (
    <div>
      <p className="text-sm text-ybm-text-sub font-semibold mb-1.5">따라해 보세요</p>
      <p className="text-2xl font-medium text-ybm-text">
        She is using{' '}
        <span className="inline-flex items-center px-2 py-0.5 bg-[#D6EAFF] text-[#2277F0] rounded-lg font-bold mx-0.5">
          a
        </span>
        {' '}laptop.
      </p>
      <p className="text-base text-ybm-text-sub mt-1.5">💡 사물 앞에는 관사 <strong>a</strong>를 꼭 넣어줘요</p>
    </div>
  )

  /* sp2_t4: 동사 강조 + 주어/동사 선택 칩 */
  if (turnId === 'sp2_t4') return (
    <div>
      <p className="text-sm text-ybm-text-sub font-semibold mb-1.5">중요한 건 뭘까요?</p>
      <p className="text-2xl font-medium text-ybm-text mb-2.5">
        She{' '}
        <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-700 rounded-lg font-bold mx-0.5">
          is using
        </span>
        {' '}a laptop.
      </p>
      {canInput && (
        <div className="flex gap-2">
          {['주어', '동사'].map((chip) => (
            <button
              key={chip}
              onClick={onChoice}
              className="flex-1 py-2 rounded-xl border-2 border-[#2277F0]/30 bg-[#EFF6FF] text-[#2277F0] text-base font-semibold hover:border-[#2277F0] transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  /* sp2_t5: 핵심 문법 요약 */
  if (turnId === 'sp2_t5') return (
    <div>
      <p className="text-sm font-bold text-[#2277F0] mb-1">핵심 문법 포인트</p>
      <p className="text-xl font-bold text-[#1A2B4B] mb-2">
        be동사 + <span className="text-[#2277F0]">-ing</span> = 지금 보이는 동작 묘사
      </p>
      <div className="flex flex-col gap-1.5">
        <p className="text-base text-ybm-text">
          <span className="text-green-600 font-bold mr-1">✓</span>
          A woman <span className="font-bold text-[#2277F0]">is sitting</span> at a desk.
        </p>
        <p className="text-base text-ybm-text">
          <span className="text-green-600 font-bold mr-1">✓</span>
          She <span className="font-bold text-[#2277F0]">is using</span> a laptop.
        </p>
      </div>
    </div>
  )

  return null
}
