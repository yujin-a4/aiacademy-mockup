'use client'

import { useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import DrawingToolbar from '@/components/classroom/toolbar/DrawingToolbar'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'
import ElevenLabsConvAIPanel from './ElevenLabsConvAIPanel'
import TypecastConvAIPanel from './TypecastConvAIPanel'
import VertexConvAIPanel from './VertexConvAIPanel'
import {
  PART7_SETS, DIRECTIONS,
  type Choice, type Question,
} from '@/data/part7Scenario'
import { useDbQuestionsByPassage, toPart7Set, Q_ANCHORS } from '@/data/db/questionStore'

export interface Part7ConvAIEndResult {
  correct: number
  total: number
  results: boolean[]
}

interface Props {
  onEnd: (result: Part7ConvAIEndResult) => void
  engine?: 'elevenlabs' | 'typecast' | 'vertex'
}

export default function Part7ConvAIScreen({ onEnd, engine = 'elevenlabs' }: Props) {
  // 문항(지문·보기·정답·해설)은 Supabase DB에서 로드 — 튜터 엔진과 같은 원천. 실패 시 하드코딩 폴백.
  const set = useDbQuestionsByPassage(
    Q_ANCHORS.p7CarAd,
    (rows) => toPart7Set(rows, PART7_SETS[0]),
    PART7_SETS[0],
  )

  const [answers, setAnswers]   = useState<Record<number, string>>({})
  const [revealed, setRevealed] = useState(false)
  const [drawing, setDrawing]   = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearTrigger, setClear] = useState(0)

  const correctCount = set.questions.filter((q) => answers[q.number] === q.correct).length

  const handleSelect = useCallback((qNum: number, id: string) => {
    if (revealed) return
    setAnswers(prev => ({ ...prev, [qNum]: id }))
  }, [revealed])

  const handleDone = useCallback(() => {
    setRevealed(true)
  }, [])

  const handleEnd = useCallback(() => {
    onEnd({
      correct: correctCount,
      total: set.questions.length,
      results: set.questions.map(q => answers[q.number] === q.correct),
    })
  }, [correctCount, set.questions, answers, onEnd])

  return (
    <ClassroomLayout
      partName="PART 7 집중공략"
      totalProblems={1}
      instructorSpeech=""
      instructorPanel={
        engine === 'typecast' ? <TypecastConvAIPanel />
        : engine === 'vertex' ? <VertexConvAIPanel />
        : <ElevenLabsConvAIPanel />
      }
      onEnd={handleEnd}
      toolbar={
        <div className="flex items-center px-4 py-2.5 gap-2">
          {/* 필기도구 */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <DrawingToolbar
              onChange={setDrawing}
              onClearAll={() => setClear(n => n + 1)}
            />
          </div>

          <div className="h-5 w-px bg-ybm-border shrink-0" />

          {/* 정답 / 종료 */}
          {revealed ? (
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-[#0EA5E9]">{correctCount}</span>
                <span className="text-sm text-ybm-text-sub">/ {set.questions.length} 정답</span>
              </div>
              <button
                onClick={handleEnd}
                className="px-5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold text-sm transition-all active:scale-95"
              >
                종료 →
              </button>
            </div>
          ) : (
            <button
              onClick={handleDone}
              className="px-5 py-2 rounded-xl bg-[#2277F0] hover:bg-[#1a66d4] text-white font-bold text-sm transition-all active:scale-95 shrink-0"
            >
              정답 확인
            </button>
          )}
        </div>
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
            {set.questions.map(q => (
              <QuestionCard
                key={q.number}
                q={q}
                selected={answers[q.number] ?? null}
                onSelect={id => handleSelect(q.number, id)}
                revealed={revealed}
              />
            ))}
          </div>
        </div>
      </div>
    </ClassroomLayout>
  )
}

function QuestionCard({
  q, selected, onSelect, revealed,
}: {
  q: Question
  selected: string | null
  onSelect: (id: string) => void
  revealed: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all
      ${q.number === 148 ? 'border-[#0EA5E9]/50 ring-1 ring-[#0EA5E9]/20' : 'border-ybm-border'}
    `}>
      <p className="text-sm font-bold text-[#1A2B4B] mb-3 leading-snug">
        <span className="text-[#0EA5E9] mr-1.5">{q.number}.</span>
        {q.text}
      </p>

      <div className="flex flex-col gap-2">
        {q.choices.map((choice: Choice) => {
          const isSelected = selected === choice.id
          const isCorrect  = choice.id === q.correct
          const showGreen  = revealed && isCorrect
          const showRed    = revealed && isSelected && !isCorrect

          let cls = 'bg-white border border-ybm-border text-[#1A2B4B] hover:bg-[#EFF6FF] hover:border-[#0EA5E9] hover:text-[#0EA5E9]'
          if (!revealed && isSelected)  cls = 'bg-[#EFF6FF] border border-[#0EA5E9] text-[#0EA5E9]'
          else if (showGreen)            cls = 'bg-[#DCFCE7] border border-green-400 text-green-700'
          else if (showRed)              cls = 'bg-[#FEE2E2] border border-red-400 text-red-600'

          let circleCls = 'border-ybm-border text-ybm-text-sub'
          if (!revealed && isSelected)  circleCls = 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
          else if (showGreen)            circleCls = 'border-green-500 bg-green-500 text-white'
          else if (showRed)              circleCls = 'border-red-400 bg-red-400 text-white'

          return (
            <button
              key={choice.id}
              onClick={() => onSelect(choice.id)}
              disabled={revealed}
              className={`flex items-center gap-3 w-full text-left rounded-xl px-4 py-2.5 transition-all active:scale-[0.98] ${cls}
                ${revealed ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${circleCls}`}>
                {choice.id}
              </span>
              <span className="text-sm leading-snug flex-1">{choice.text}</span>
              {showGreen && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M3 8l4 4 6-7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
