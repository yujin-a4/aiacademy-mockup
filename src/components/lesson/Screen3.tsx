'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import ClassroomToolbar from '@/components/classroom/toolbar/ClassroomToolbar'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useLessonStore } from '@/store/lessonStore'
import { SCREEN3_PROBLEMS, buildTurns } from '@/data/lessonScenario'
import { speakAndWait, stopCurrentAudio } from '@/lib/tts'
import { useCountdownTimer } from '@/hooks/useCountdownTimer'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'

type Stage = 'solving' | 'feedback' | 'final-feedback'

interface Screen3Props {
  onComplete: () => void
  onEnd: () => void
}

const TIMER_SECONDS = 20

export default function Screen3({ onComplete, onEnd }: Screen3Props) {
  const persona    = useClassroomStore((s) => s.persona)
  const userName   = useOnboardingStore((s) => s.userName) || '민주'
  const setPracticeResult = useLessonStore((s) => s.setPracticeResult)
  const TURNS      = buildTurns(userName)

  const [problemIdx, setProblemIdx]   = useState(0)
  const [stage, setStage]             = useState<Stage>('solving')
  const [selectedChoice, setChoice]   = useState<string | null>(null)
  const [isCorrect, setIsCorrect]     = useState<boolean | null>(null)
  const [speech, setSpeech]           = useState('')
  const [isPlaying, setPlaying]       = useState(false)
  const [drawingState, setDrawing]    = useState<DrawingState>({ tool: 'pen', color: '#2277F0' })
  const [clearCanvas, setClear]       = useState(0)
  const [timerHintShown, setTimerHint]= useState(false)
  const [results, setResults]         = useState<(boolean | null)[]>([null, null, null])
  const [panelOpen, setPanelOpen]     = useState(false)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  const problem = SCREEN3_PROBLEMS[problemIdx]
  const correctId = problem?.choices.find((c) => c.text === problem.correctAnswer)?.id ?? ''

  /* 타이머 만료 → 패널 열고 힌트 */
  const handleTimerExpire = useCallback(async () => {
    if (stage !== 'solving' || timerHintShown) return
    setTimerHint(true)
    setPanelOpen(true)
    const hint = TURNS.s3_timer_hint.script
    setSpeech(hint)
    setPlaying(true)
    await new Promise<void>((r) => setTimeout(r, 0))
    await speakAndWait(hint, persona)
    if (mountedRef.current) setPlaying(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timerHintShown, persona])

  const timer = useCountdownTimer(TIMER_SECONDS, handleTimerExpire)

  /* 문제 진입 — 오디오 없이 바로 타이머 시작, 패널 닫기 */
  const enterProblem = useCallback((idx: number) => {
    if (idx >= SCREEN3_PROBLEMS.length) return
    setPanelOpen(false)
    setStage('solving')
    setChoice(null)
    setIsCorrect(null)
    setTimerHint(false)
    setClear((n) => n + 1)
    setSpeech('20초 안에 문제를 풀어보세요!')
    setPlaying(false)
    timer.start()
  }, [timer])

  useEffect(() => {
    enterProblem(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 선택지 선택 → 패널 열고 피드백 오디오 */
  const handleChoiceSelect = useCallback(async (choiceId: string) => {
    if (stage !== 'solving' || selectedChoice) return
    timer.stop()
    setChoice(choiceId)
    const correct = choiceId === correctId
    setIsCorrect(correct)
    setStage('feedback')
    setPanelOpen(true)

    const newResults = [...results]
    newResults[problemIdx] = correct
    setResults(newResults)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selectedChoice, correctId, timer, problem, problemIdx, persona, results, setPracticeResult])

  /* 다음 문제 or 마무리 */
  const handleNext = useCallback(async () => {
    const nextIdx = problemIdx + 1
    if (nextIdx >= SCREEN3_PROBLEMS.length) {
      const correctCount = results.filter(Boolean).length
      const finalTurn = correctCount === 3 ? TURNS.s3_all_correct : TURNS.s3_partial
      const finalText = correctCount === 3
        ? finalTurn.script
        : `3문제 중 ${correctCount}개 맞혔네? ${finalTurn.script}`
      setStage('final-feedback')
      setPanelOpen(true)
      setSpeech(finalText)
      setPlaying(true)
      await new Promise<void>((r) => setTimeout(r, 0))
      await speakAndWait(finalText, persona)
      if (mountedRef.current) setPlaying(false)
    } else {
      setProblemIdx(nextIdx)
      enterProblem(nextIdx)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemIdx, results, persona, TURNS])

  if (!problem) return null

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
      instructorLoading={isPlaying}
      instructorVideoSrc={
        stage === 'final-feedback'
          ? (results.filter(Boolean).length === 3 ? TURNS.s3_all_correct.videoSrc : TURNS.s3_partial.videoSrc)
          : TURNS.s3_timer_hint.videoSrc
      }
      onEnd={onEnd}
      toolbar={<ClassroomToolbar onDrawingChange={setDrawing} onClearAll={() => setClear((n) => n + 1)} />}
      panelOpen={panelOpen}
      onPanelToggle={() => setPanelOpen((v) => !v)}
      instructorInput={
        <InputBar
          placeholder="선택지를 골라주세요"
          clearTrigger={0}
          onReadyToListen={() => {}}
          actions={
            stage === 'feedback'
              ? [{ label: problemIdx < SCREEN3_PROBLEMS.length - 1 ? '다음 문제 →' : '결과 보기 →', onClick: handleNext }]
              : stage === 'final-feedback' && !isPlaying
              ? [{ label: '다음 단계로 →', onClick: () => { stopCurrentAudio(); onComplete() } }]
              : []
          }
        />
      }
    >
      <div className="flex flex-col gap-4 h-full">

        {/* 헤더 + 진행도 */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#2277F0]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="2" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M6 6h6M6 9h6M6 12h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-base text-[#1A2B4B]">2단계 · 실전 문제 도전</span>
          <span className="inline-flex items-center justify-center font-bold text-sm px-3 py-1 rounded-lg bg-[#D6EAFF] text-[#2277F0]">
            {problem.number}
          </span>
          {/* 결과 표시 */}
          <div className="ml-auto flex items-center gap-1.5">
            {results.map((r, i) => (
              <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${r === true ? 'bg-green-400 text-white' : r === false ? 'bg-red-400 text-white' : 'bg-ybm-bg text-ybm-text-sub border border-ybm-border'}
              `}>
                {r === true ? '✓' : r === false ? '✗' : i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* 풀이 단계 안내 배너 */}
        {stage === 'solving' && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2277F0]/8 border border-[#2277F0]/20">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <rect x="2" y="1" width="12" height="14" rx="2" stroke="#2277F0" strokeWidth="1.4"/>
              <path d="M5 5h6M5 8h6M5 11h3" stroke="#2277F0" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="text-sm font-medium text-[#2277F0]">문제를 풀어보세요</span>
            {timerHintShown && (
              <span className="ml-auto text-xs text-ybm-text-sub">시간 초과 — 정답을 골라보세요</span>
            )}
          </div>
        )}

        {/* 문제 카드 — 타이머는 카드 우상단에 절대 배치 */}
        <div className="ybm-card p-6 relative overflow-hidden select-none flex-1" style={{ minHeight: 140 }}>

          {/* 타이머 배지 */}
          {stage === 'solving' && timer.running && (
            <div className={`absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-xl text-sm font-bold tabular-nums
              ${timer.remaining <= 5 ? 'bg-red-100 text-red-500' : 'bg-[#2277F0]/10 text-[#2277F0]'}
            `}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M6 3.5v2.8l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {timer.remaining}s
            </div>
          )}

          <p className="text-ybm-text text-xl lg:text-2xl font-medium leading-[2.6] tracking-wide">
            {problem.words.map((word, i) =>
              i === problem.blankIndex ? (
                <span key={i} className="inline-block align-bottom mx-1">
                  <span
                    className={`inline-block border-b-2 text-center font-semibold transition-colors
                      ${stage !== 'solving' && isCorrect ? 'border-green-400 text-green-600'
                      : stage !== 'solving' && !isCorrect ? 'border-red-400 text-red-600'
                      : 'border-[#2277F0]'}
                    `}
                    style={{ minWidth: 160 }}
                  >
                    {stage !== 'solving' ? problem.correctAnswer : ' '}
                  </span>
                </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </p>
          <CanvasOverlay
            tool={drawingState.tool}
            color={drawingState.color}
            clearTrigger={clearCanvas}
          />
        </div>

        {/* 선택지 */}
        {stage !== 'final-feedback' && (
          <div className="grid grid-cols-2 gap-3">
            {problem.choices.map(({ id, text }) => {
              const isSel = selectedChoice === id
              const isCorr = id === correctId
              const showResult = selectedChoice !== null

              return (
                <button
                  key={id}
                  onClick={() => !selectedChoice && handleChoiceSelect(id)}
                  disabled={!!selectedChoice}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all
                    ${!selectedChoice
                      ? 'border-ybm-border bg-white hover:border-[#2277F0]/50 cursor-pointer active:scale-[0.98]'
                      : isSel && isCorr    ? 'border-green-400 bg-green-50'
                      : isSel && !isCorr   ? 'border-red-400 bg-red-50'
                      : showResult && isCorr ? 'border-green-300 bg-green-50/40'
                      : 'border-ybm-border bg-white opacity-40'}
                  `}
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0
                    ${isSel && isCorr   ? 'bg-green-400 text-white'
                    : isSel && !isCorr  ? 'bg-red-400 text-white'
                    : showResult && isCorr ? 'bg-green-300 text-white'
                    : 'bg-ybm-bg text-ybm-text-sub'}
                  `}>{id}</span>
                  <span className={`text-base font-medium flex-1
                    ${isSel && isCorr   ? 'text-green-700'
                    : isSel && !isCorr  ? 'text-red-600'
                    : showResult && isCorr ? 'text-green-600'
                    : 'text-ybm-text'}
                  `}>{text}</span>
                </button>
              )
            })}
          </div>
        )}

        {stage === 'final-feedback' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-[#2277F0]">{results.filter(Boolean).length}/3</span>
              <span className="text-sm text-ybm-text-sub">맞힌 문제</span>
            </div>
            <div className="flex gap-2">
              {results.map((r, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${r === true ? 'bg-green-400' : 'bg-red-300'}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ClassroomLayout>
  )
}
