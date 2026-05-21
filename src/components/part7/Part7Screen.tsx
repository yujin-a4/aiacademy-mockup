'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import DrawingToolbar from '@/components/classroom/toolbar/DrawingToolbar'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'
import { useClassroomStore } from '@/store/classroomStore'
import {
  PART7_SETS, DIRECTIONS, P7_TURNS,
  type Choice, type Question,
} from '@/data/part7Scenario'
import { waitForVideoEnd, notifyVideoEnded, speakTurn, stopCurrentAudio } from '@/lib/tts'

type TurnId = keyof typeof P7_TURNS

const TURN_ORDER: TurnId[] = [
  'p7_t1','p7_t2','p7_t3','p7_t4','p7_t5','p7_t6',
  'p7_t7','p7_t8','p7_t9','p7_t10','p7_t11','p7_t12',
]

export interface Part7EndResult {
  correct: number
  total: number
  results: boolean[]
}

interface Props { onEnd: (result: Part7EndResult) => void }

export default function Part7Screen({ onEnd }: Props) {
  const persona = useClassroomStore((s) => s.persona)
  const set     = PART7_SETS[0]

  const [turnId, setTurnId]     = useState<TurnId>('p7_t1')
  const [speech, setSpeech]     = useState('')
  const [videoSrc, setVideo]    = useState<string | undefined>()
  const [canInput, setCanInput] = useState(false)
  const [isDone, setDone]       = useState(false)

  const [drawing, setDrawing]    = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearTrigger, setClear] = useState(0)

  // per-question answer state
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const mountedRef        = useRef(false)
  const startedRef        = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const currentTurn = P7_TURNS[turnId]
  const answerRevealed = isDone || (currentTurn?.revealAnswer ?? false)

  const enterTurn = useCallback(async (id: TurnId) => {
    if (!mountedRef.current) return
    const turn = P7_TURNS[id]
    setTurnId(id)
    setCanInput(false)
    setSpeech(turn.script)
    setVideo(turn.videoSrc)

    if (turn.videoSrc) await waitForVideoEnd()
    else await speakTurn({ script: turn.script, persona })
    if (!mountedRef.current) return

    setCanInput(true)
    if (turn.inputType === 'voice') {
      setTimeout(() => startListeningRef.current(), 300)
    }
  }, [persona])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    enterTurn('p7_t1')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVoice = useCallback(async () => {
    if (!canInput) return
    const turn = P7_TURNS[turnId]
    if (turn.inputType !== 'voice') return
    stopListeningRef.current()
    setCanInput(false)
    if (turn.nextTurnId) await enterTurn(turn.nextTurnId as TurnId)
  }, [canInput, turnId, enterTurn])

  const handleSelect = useCallback((qNum: number, id: string) => {
    const turn = P7_TURNS[turnId]
    if (turn?.revealAnswer && qNum === 148) return
    setAnswers((prev) => ({ ...prev, [qNum]: id }))
  }, [turnId])

  const currentIdx    = TURN_ORDER.indexOf(turnId)
  const totalTurns    = TURN_ORDER.length
  const correctCount  = set.questions.filter((q) => answers[q.number] === q.correct).length

  const getEndResult = (): Part7EndResult => ({
    correct: correctCount,
    total: set.questions.length,
    results: set.questions.map((q) => answers[q.number] === q.correct),
  })

  const handlePrev = useCallback(() => {
    if (currentIdx <= 0) return
    stopCurrentAudio()
    enterTurn(TURN_ORDER[currentIdx - 1])
  }, [currentIdx, enterTurn])

  const handleNext = useCallback(() => {
    stopCurrentAudio()
    if (currentIdx >= totalTurns - 1) { setDone(true); return }
    enterTurn(TURN_ORDER[currentIdx + 1])
  }, [currentIdx, totalTurns, enterTurn])

  return (
    <ClassroomLayout
      partName="PART 7 집중공략"
      totalProblems={1}
      instructorSpeech={speech}
      instructorVideoSrc={videoSrc}
      onInstructorVideoEnd={notifyVideoEnded}
      onEnd={() => onEnd(getEndResult())}
      toolbar={
        isDone ? (
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1A2B4B]">수업 완료</span>
              <ResultBadge correctCount={correctCount} total={set.questions.length} />
            </div>
            <button
              onClick={() => onEnd(getEndResult())}
              className="px-5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold text-sm transition-all active:scale-95"
            >
              종료 →
            </button>
          </div>
        ) : (
          <div className="flex items-center px-4 py-3 gap-2">
            {/* 필기도구 */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <DrawingToolbar
                onChange={setDrawing}
                onClearAll={() => setClear((n) => n + 1)}
              />
            </div>

            <div className="h-5 w-px bg-ybm-border shrink-0" />

            {/* 이전/다음 */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                  ${currentIdx === 0
                    ? 'opacity-30 cursor-not-allowed text-ybm-text-sub'
                    : 'text-ybm-text hover:bg-ybm-bg active:scale-95'}
                `}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                이전
              </button>
              <span className="text-xs text-ybm-text-sub tabular-nums font-medium px-1">
                {currentIdx + 1} / {totalTurns}
              </span>
              <button
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all duration-300
                  ${currentIdx === totalTurns - 1
                    ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4] shadow-sm'
                    : 'text-ybm-text hover:bg-ybm-bg'}
                `}
              >
                {currentIdx === totalTurns - 1 ? '완료' : '다음'}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l5 4-5 4" stroke={currentIdx === totalTurns - 1 ? 'white' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )
      }
      instructorInput={
        <InputBar
          placeholder={
            !canInput ? '강사 설명 듣는 중...' :
            currentTurn.inputType === 'voice' ? '음성으로 대답해 보세요' :
            '아래 버튼을 눌러주세요'
          }
          onReadyToListen={(s, st) => { startListeningRef.current = s; stopListeningRef.current = st }}
          onSpeechResult={handleVoice}
          onListeningChange={() => {}}
          actions={[]}
        />
      }
    >
      <div className="relative flex flex-col gap-4 pb-2">
        <CanvasOverlay
          tool={drawing.tool}
          color={drawing.color}
          clearTrigger={clearTrigger}
        />

        {/* 지시문 + 지문 */}
        <div className="bg-white rounded-2xl border border-ybm-border shadow-sm px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#0EA5E9] text-white text-xs font-bold px-3 py-0.5 rounded-full">지시문</span>
          </div>
          <p className="text-xs text-ybm-text-sub leading-relaxed mb-2">{DIRECTIONS}</p>
          <p className="text-sm font-semibold text-[#1A2B4B] mb-4">
            {set.questionRange} refer to the following {set.passageType}.
          </p>
          {set.passageType === 'advertisement' ? (
            <div className="border border-gray-300 rounded px-5 py-4 max-w-[38%] mx-auto">
              <p className="text-sm leading-relaxed text-[#1A2B4B]">
                <span className="font-bold">Used Car For Sale.</span>
                {set.passage.replace('Used Car For Sale.', '')}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[#1A2B4B]">{set.passage}</p>
          )}
        </div>

        {/* 문항 */}
        <div className="bg-white rounded-2xl border border-ybm-border shadow-sm px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-[#0EA5E9] text-white text-xs font-bold px-3 py-0.5 rounded-full">문항</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {set.questions.map((q) => (
              <QuestionCard
                key={q.number}
                q={q}
                selected={answers[q.number] ?? null}
                onSelect={(id) => handleSelect(q.number, id)}
                revealed={q.number === 148 ? answerRevealed : isDone}
              />
            ))}
          </div>
        </div>


      </div>
    </ClassroomLayout>
  )
}

/* ── 문항 카드 ── */
function QuestionCard({
  q, selected, onSelect, revealed,
}: {
  q: Question
  selected: string | null
  onSelect: (id: string) => void
  revealed: boolean
}) {
  const isQ148 = q.number === 148

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all
      ${isQ148 ? 'border-[#0EA5E9]/50 ring-1 ring-[#0EA5E9]/20' : 'border-ybm-border'}
    `}>
      <p className="text-sm font-bold text-[#1A2B4B] mb-3 leading-snug">
        <span className="text-[#0EA5E9] mr-1.5">{q.number}.</span>
        {q.text}
      </p>

      <div className="flex flex-col gap-2">
        {q.choices.map((choice: Choice) => {
          const isSelected  = selected === choice.id
          const isCorrect   = choice.id === q.correct
          const showGreen   = revealed && isCorrect
          const showRed     = revealed && isSelected && !isCorrect

          let cls = 'bg-white border border-ybm-border text-[#1A2B4B] hover:bg-[#EFF6FF] hover:border-[#0EA5E9] hover:text-[#0EA5E9]'
          if (!revealed && isSelected)        cls = 'bg-[#EFF6FF] border border-[#0EA5E9] text-[#0EA5E9]'
          else if (showGreen)                  cls = 'bg-[#DCFCE7] border border-green-400 text-green-700'
          else if (showRed)                    cls = 'bg-[#FEE2E2] border border-red-400 text-red-600'

          let circleCls = 'border-ybm-border text-ybm-text-sub'
          if (!revealed && isSelected)        circleCls = 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
          else if (showGreen)                  circleCls = 'border-green-500 bg-green-500 text-white'
          else if (showRed)                    circleCls = 'border-red-400 bg-red-400 text-white'

          return (
            <button
              key={choice.id}
              onClick={() => onSelect(choice.id)}
              disabled={revealed && isQ148}
              className={`flex items-center gap-3 w-full text-left rounded-xl px-4 py-2.5 transition-all active:scale-[0.98] ${cls}
                ${revealed && isQ148 ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${circleCls}`}>
                {choice.id}
              </span>
              <span className="text-sm leading-snug flex-1">{choice.text}</span>
              {showGreen && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M3 8l4 4 6-7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className="mt-3 bg-[#F0F9FF] border border-[#0EA5E9]/30 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-[#0EA5E9] mb-1">해설</p>
          <p className="text-xs text-[#1A2B4B] leading-relaxed">{q.explanation}</p>
        </div>
      )}
    </div>
  )
}

/* ── 결과 배지 ── */
function ResultBadge({ correctCount, total }: {
  correctCount: number
  total: number
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xl font-black text-[#0EA5E9]">{correctCount}</span>
      <span className="text-sm text-ybm-text-sub">/ {total} 정답</span>
    </div>
  )
}
