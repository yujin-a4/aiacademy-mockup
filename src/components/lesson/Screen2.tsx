'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import { LessonToolbar } from './Screen1'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useLessonStore } from '@/store/lessonStore'
import { SCREEN3_PROBLEMS } from '@/data/lessonScenario'
import { speakAndWait, stopCurrentAudio } from '@/lib/tts'
import { useCountdownTimer } from '@/hooks/useCountdownTimer'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'

const TIMER_SECONDS = 20

interface Screen2Props {
  onComplete: () => void
  onEnd: () => void
  onPrev?: () => void
}

export default function Screen2({ onComplete, onEnd, onPrev }: Screen2Props) {
  const persona           = useClassroomStore((s) => s.persona)
  const setPracticeResult = useLessonStore((s) => s.setPracticeResult)

  const [problemIdx, setProblemIdx] = useState(0)
  const [answers, setAnswers]       = useState<(string | null)[]>([null, null, null])
  const [drawingState, setDrawing]  = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearCanvas, setClear]     = useState(0)
  const [timeOver, setTimeOver]     = useState(false)
  const [panelOpen, setPanelOpen]   = useState(false)
  const [speech, setSpeech]         = useState('문제 3개를 풀어봐.')
  const [isPlaying, setIsPlaying]   = useState(false)
  const feedbackDoneRef = useRef(false)

  const timer = useCountdownTimer(TIMER_SECONDS, () => setTimeOver(true))

  /* 문제 이동 시 타이머 리셋 */
  useEffect(() => {
    setTimeOver(false)
    timer.start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemIdx])

  const problem   = SCREEN3_PROBLEMS[problemIdx]
  const correctId = problem.choices.find((c) => c.text === problem.correctAnswer)?.id ?? ''
  const selected  = answers[problemIdx]

  const results = answers.map((a, i) => {
    if (a === null) return null
    const cid = SCREEN3_PROBLEMS[i].choices.find((c) => c.text === SCREEN3_PROBLEMS[i].correctAnswer)?.id
    return a === cid
  })

  const allAnswered = answers.every((a) => a !== null)

  /* 3문제 완료 → 패널 즉시 오픈 후 LLM 총평 생성 + TTS */
  useEffect(() => {
    if (!allAnswered || feedbackDoneRef.current) return
    feedbackDoneRef.current = true

    const currentResults = answers.map((a, i) => {
      const cid = SCREEN3_PROBLEMS[i].choices.find((c) => c.text === SCREEN3_PROBLEMS[i].correctAnswer)?.id
      return a === cid
    })
    const correctCount = currentResults.filter(Boolean).length
    const wrongNums    = SCREEN3_PROBLEMS
      .filter((_, i) => currentResults[i] === false)
      .map((p) => p.number)
      .join(', ')

    const fallback = `3문제 중에 ${correctCount}개 맞혔네? ${correctCount === 3 ? '완벽해! 다음 단계로 가자.' : '틀린 문제 다시 봐보자.'}`

    /* 패널을 즉시 오픈 */
    setSpeech(fallback)
    setPanelOpen(true)
    setIsPlaying(true)

    const prompt = `학생이 토익 Part 5 수동태 문제 3개를 풀었어. ${correctCount}개 맞혔고 틀린 문제는 ${wrongNums || '없음'}이야. 반드시 "3문제 중에 ${correctCount}개 맞혔네?"로 시작해서, 틀린 문제가 있으면 살짝 언급하고, 전체 총평을 친근하고 간결하게 2문장 이내로 말해줘. 한국어로.`

    fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, persona: 'park', history: [] }),
    })
      .then((res) => res.json())
      .then((data) => {
        const reply = (data.dialogue as string) || fallback
        setSpeech(reply)
        return speakAndWait(reply, persona)
      })
      .catch(() => speakAndWait(fallback, persona))
      .finally(() => setIsPlaying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnswered])

  const handleChoiceSelect = useCallback((choiceId: string) => {
    if (answers[problemIdx] !== null) return
    timer.stop()
    const correct = choiceId === correctId
    const newAnswers = [...answers]
    newAnswers[problemIdx] = choiceId
    setAnswers(newAnswers)
    setPracticeResult(problemIdx, correct)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, problemIdx, correctId, setPracticeResult])

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
      instructorLoading={isPlaying}
      panelOpen={panelOpen}
      onPanelToggle={() => setPanelOpen((v) => !v)}
      disablePip={true}
      onEnd={onEnd}
      toolbar={
        <LessonToolbar
          drawing={drawingState}
          onDrawingChange={setDrawing}
          onClearAll={() => setClear((n) => n + 1)}
          onPrev={onPrev}
          onNext={() => { stopCurrentAudio(); onComplete() }}
          nextEnabled={allAnswered}
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

        {/* 타이머 바 */}
        {!selected && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-ybm-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${timeOver || timer.remaining <= 5 ? 'bg-red-400' : 'bg-[#2277F0]'}`}
                style={{ width: timeOver ? '0%' : `${(timer.remaining / TIMER_SECONDS) * 100}%`, transition: 'width 1s linear' }}
              />
            </div>
            {timeOver ? (
              <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                시간 초과
              </span>
            ) : (
              <span className={`text-sm font-bold tabular-nums min-w-[2rem] text-right ${timer.remaining <= 5 ? 'text-red-500' : 'text-[#2277F0]'}`}>
                {timer.remaining}s
              </span>
            )}
          </div>
        )}

        {/* 문제 카드 */}
        <div className="ybm-card px-6 pt-4 pb-5 relative overflow-hidden select-none flex-1" style={{ minHeight: 140 }}>
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
                    {selected ? problem.correctAnswer : ' '}
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
