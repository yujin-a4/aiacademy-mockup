'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import { LessonToolbar } from './Screen1'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useLessonStore } from '@/store/lessonStore'
import { SCREEN3_PROBLEMS, buildTurns } from '@/data/lessonScenario'
import { speakAndWait, stopCurrentAudio } from '@/lib/tts'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'

interface Screen3Props {
  onComplete: () => void
  onEnd: () => void
  onPrev?: () => void
}

export default function Screen3({ onComplete, onEnd, onPrev }: Screen3Props) {
  const persona           = useClassroomStore((s) => s.persona)
  const userName          = useOnboardingStore((s) => s.userName) || '민주'
  const setPracticeResult = useLessonStore((s) => s.setPracticeResult)
  const TURNS             = buildTurns(userName)

  const [problemIdx, setProblemIdx] = useState(0)
  const [answers, setAnswers]       = useState<(string | null)[]>([null, null, null])
  const [speech, setSpeech]         = useState('문제를 풀어보세요!')
  const [isPlaying, setPlaying]     = useState(false)
  const [drawingState, setDrawing]  = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearCanvas, setClear]     = useState(0)
  const [doneSpoken, setDoneSpoken] = useState(false)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  const problem   = SCREEN3_PROBLEMS[problemIdx]
  const correctId = problem.choices.find((c) => c.text === problem.correctAnswer)?.id ?? ''
  const selected  = answers[problemIdx]

  const results = answers.map((a, i) => {
    if (a === null) return null
    const cid = SCREEN3_PROBLEMS[i].choices.find((c) => c.text === SCREEN3_PROBLEMS[i].correctAnswer)?.id
    return a === cid
  })

  const allAnswered = answers.every((a) => a !== null)

  /* 선택지 선택 */
  const handleChoiceSelect = useCallback(async (choiceId: string) => {
    if (answers[problemIdx] !== null) return
    const correct = choiceId === correctId
    const newAnswers = [...answers]
    newAnswers[problemIdx] = choiceId
    setAnswers(newAnswers)
    setPracticeResult(problemIdx, correct)

    const feedbackText = correct
      ? `맞았어! ${problem.explanation}`
      : `아쉽네. ${problem.explanation}. 정답은 ${problem.correctAnswer}야.`
    setSpeech(feedbackText)
    setPlaying(true)
    await new Promise<void>((r) => setTimeout(r, 0))
    await speakAndWait(feedbackText, persona)
    if (!mountedRef.current) return
    setPlaying(false)

    /* 마지막 문제였으면 최종 피드백 */
    const newResults = newAnswers.map((a, i) => {
      if (a === null) return null
      const cid = SCREEN3_PROBLEMS[i].choices.find((c) => c.text === SCREEN3_PROBLEMS[i].correctAnswer)?.id
      return a === cid
    })
    if (newAnswers.every((a) => a !== null) && !doneSpoken) {
      setDoneSpoken(true)
      const correctCount = newResults.filter(Boolean).length
      const finalTurn = correctCount === 3 ? TURNS.s3_all_correct : TURNS.s3_partial
      const finalText = correctCount === 3
        ? finalTurn.script
        : `3문제 중 ${correctCount}개 맞혔네? ${finalTurn.script}`
      setSpeech(finalText)
      setPlaying(true)
      await new Promise<void>((r) => setTimeout(r, 0))
      await speakAndWait(finalText, persona)
      if (mountedRef.current) setPlaying(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, problemIdx, correctId, problem, persona, setPracticeResult, doneSpoken])

  const correctCount = results.filter(Boolean).length

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
      instructorLoading={isPlaying}
      instructorVideoSrc={
        allAnswered
          ? (correctCount === 3 ? TURNS.s3_all_correct.videoSrc : TURNS.s3_partial.videoSrc)
          : TURNS.s3_timer_hint.videoSrc
      }
      onEnd={onEnd}
      toolbar={
        <LessonToolbar
          drawing={drawingState}
          onDrawingChange={setDrawing}
          onClearAll={() => setClear((n) => n + 1)}
          onPrev={onPrev}
          onNext={allAnswered && !isPlaying ? () => { stopCurrentAudio(); onComplete() } : undefined}
          nextLabel="다음 단계로"
        />
      }
      instructorInput={
        <InputBar
          placeholder="선택지를 골라주세요"
          clearTrigger={0}
          onReadyToListen={() => {}}
          actions={[]}
        />
      }
    >
      <div className="flex flex-col gap-3 h-full">

        {/* 헤더 + Q 탭 */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#2277F0]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="2" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M6 6h6M6 9h6M6 12h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-base text-[#1A2B4B]">실전 확인 문제</span>

          {/* Q1 / Q2 / Q3 탭 */}
          <div className="ml-auto flex items-center gap-1.5">
            {SCREEN3_PROBLEMS.map((p, i) => {
              const r = results[i]
              const isCurrent = i === problemIdx
              return (
                <button
                  key={p.number}
                  onClick={() => setProblemIdx(i)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border
                    ${isCurrent
                      ? 'bg-[#2277F0] text-white border-[#2277F0]'
                      : r === true  ? 'bg-green-50 text-green-600 border-green-300'
                      : r === false ? 'bg-red-50 text-red-500 border-red-300'
                      : 'bg-ybm-bg text-ybm-text-sub border-ybm-border'}
                  `}
                >
                  {p.number}
                  {r === true  && <span className="text-green-500">✓</span>}
                  {r === false && <span className="text-red-400">✗</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* 문제 카드 */}
        <div className="ybm-card px-6 pt-4 pb-5 relative overflow-hidden select-none" style={{ minHeight: 140 }}>
          <span className="inline-flex items-center justify-center font-bold text-sm px-3 py-1 rounded-lg bg-[#D6EAFF] text-[#2277F0] mb-3">
            {problem.number}
          </span>
          <p className="text-ybm-text text-xl lg:text-2xl font-medium leading-[2.6] tracking-wide">
            {problem.words.map((word, i) =>
              i === problem.blankIndex ? (
                <span key={i} className="inline-block align-bottom mx-1">
                  <span
                    className={`inline-block border-b-2 text-center font-semibold transition-colors
                      ${selected && results[problemIdx] === true  ? 'border-green-400 text-green-600'
                      : selected && results[problemIdx] === false ? 'border-red-400 text-red-600'
                      : 'border-[#2277F0]'}
                    `}
                    style={{ minWidth: 160 }}
                  >
                    {selected ? problem.correctAnswer : ' '}
                  </span>
                </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </p>
          <CanvasOverlay tool={drawingState.tool} color={drawingState.color} clearTrigger={clearCanvas} />
        </div>

        {/* 선택지 */}
        <div className="grid grid-cols-2 gap-2.5">
          {problem.choices.map(({ id, text }) => {
            const isSel      = selected === id
            const isCorr     = id === correctId
            const showResult = selected !== null
            return (
              <button
                key={id}
                onClick={() => !selected && handleChoiceSelect(id)}
                disabled={!!selected}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all
                  ${!selected
                    ? 'border-ybm-border bg-white hover:border-[#2277F0]/50 cursor-pointer active:scale-[0.98]'
                    : isSel && isCorr      ? 'border-green-400 bg-green-50'
                    : isSel && !isCorr     ? 'border-red-400 bg-red-50'
                    : showResult && isCorr ? 'border-green-300 bg-green-50/40'
                    : 'border-ybm-border bg-white opacity-40'}
                `}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                  ${isSel && isCorr      ? 'bg-green-400 text-white'
                  : isSel && !isCorr     ? 'bg-red-400 text-white'
                  : showResult && isCorr ? 'bg-green-300 text-white'
                  : 'bg-ybm-bg text-ybm-text-sub'}
                `}>{id}</span>
                <span className={`text-sm font-medium flex-1
                  ${isSel && isCorr      ? 'text-green-700'
                  : isSel && !isCorr     ? 'text-red-600'
                  : showResult && isCorr ? 'text-green-600'
                  : 'text-ybm-text'}
                `}>{text}</span>
              </button>
            )
          })}
        </div>

        {/* 해설 */}
        {selected && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2
            ${results[problemIdx] ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
          `}>
            <span className="shrink-0 text-base">{results[problemIdx] ? '✅' : '❌'}</span>
            <div>
              <p className={`font-bold text-xs mb-0.5 ${results[problemIdx] ? 'text-green-700' : 'text-red-600'}`}>
                {results[problemIdx] ? '정답!' : `오답 — 정답: ${problem.correctAnswer}`}
              </p>
              <p className="text-ybm-text-sub leading-relaxed">{problem.explanation}</p>
            </div>
          </div>
        )}

        {/* 이전 / 다음 문제 버튼 */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setProblemIdx((i) => Math.max(0, i - 1))}
            disabled={problemIdx === 0}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold transition-colors
              ${problemIdx === 0
                ? 'opacity-30 cursor-not-allowed text-ybm-text-sub'
                : 'text-[#2277F0] hover:bg-[#D6EAFF]'}`}
          >
            ← 이전 문제
          </button>
          <button
            onClick={() => setProblemIdx((i) => Math.min(SCREEN3_PROBLEMS.length - 1, i + 1))}
            disabled={problemIdx === SCREEN3_PROBLEMS.length - 1}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold transition-colors
              ${problemIdx === SCREEN3_PROBLEMS.length - 1
                ? 'opacity-30 cursor-not-allowed text-ybm-text-sub'
                : 'text-[#2277F0] hover:bg-[#D6EAFF]'}`}
          >
            다음 문제 →
          </button>
        </div>

      </div>
    </ClassroomLayout>
  )
}
