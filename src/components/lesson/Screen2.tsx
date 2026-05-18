'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import ClassroomToolbar from '@/components/classroom/toolbar/ClassroomToolbar'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { buildTurns, SCREEN2_PROBLEM } from '@/data/lessonScenario'
import { matchBranch } from '@/lib/matchBranch'
import { speakAndWait, stopCurrentAudio } from '@/lib/tts'
import { useCountdownTimer } from '@/hooks/useCountdownTimer'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'

type TurnId =
  | 's2_start' | 's2_timer_hint' | 's2_reason' | 's2_reason_wrong'
  | 's2_branch_a' | 's2_branch_b' | 's2_common' | 's2_voice1' | 's2_conclusion'

interface Screen2Props {
  onComplete: () => void
  onEnd: () => void
}

export default function Screen2({ onComplete, onEnd }: Screen2Props) {
  const persona  = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const TURNS    = buildTurns(userName)

  const [currentTurnId, setTurnId]   = useState<TurnId>('s2_start')
  const [isPlaying, setPlaying]      = useState(false)
  const [canInput, setCanInput]      = useState(false)
  const [isListening, setIsListening]= useState(false)
  const [speech, setSpeech]          = useState('')
  const [drawingState, setDrawing]   = useState<DrawingState>({ tool: 'pen', color: '#2277F0' })
  const [clearCanvas, setClear]      = useState(0)
  const [clearInput, setClearInput]  = useState(0)
  const [selectedChoice, setChoice]  = useState<string | null>(null)
  const [isCorrect, setIsCorrect]    = useState<boolean | null>(null)
  const [pipListening, setPip]       = useState(false)
  const [pendingListen, setPendingListen] = useState(false)

  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})
  const mountedRef        = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  const currentTurn = TURNS[currentTurnId]

  const problem = SCREEN2_PROBLEM

  /* 타이머: s2_start 단계에서만 동작 */
  const handleTimerExpire = useCallback(async () => {
    if (currentTurnId !== 's2_start') return
    await enterTurn('s2_timer_hint')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurnId])

  const timer = useCountdownTimer(problem.timerSeconds, handleTimerExpire)

  const enterTurn = useCallback(async (turnId: TurnId) => {
    if (!mountedRef.current) return
    const turn = TURNS[turnId]
    setTurnId(turnId)
    setCanInput(false)
    setClearInput((n) => n + 1)

    if (!turn.script) {
      setCanInput(true)
      if (turnId === 's2_start') timer.start()
      return
    }

    /* 대사 즉시 표시 → 타이핑 애니메이션 즉시 시작 */
    setSpeech(turn.script)
    setPlaying(true)
    /* React 렌더링 완료 후 오디오 시작 */
    await new Promise<void>((r) => setTimeout(r, 0))
    await speakAndWait(turn.script, persona)
    if (!mountedRef.current) return
    setPlaying(false)
    setCanInput(true)

    if (turn.inputType === 'voice') {
      setPendingListen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TURNS, persona, timer])

  useEffect(() => {
    enterTurn('s2_start')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* pendingListen → React 재렌더 완료 후 실제 마이크 시작 */
  useEffect(() => {
    if (!pendingListen || !canInput) return
    setPendingListen(false)
    const timer2 = setTimeout(() => {
      if (!mountedRef.current) return
      setIsListening(true)
      startListeningRef.current()
    }, 300)
    return () => clearTimeout(timer2)
  }, [pendingListen, canInput])

  /* 선택지 선택 */
  const handleChoiceSelect = useCallback(async (choiceId: string) => {
    if (currentTurnId !== 's2_start' || selectedChoice) return
    timer.stop()
    setChoice(choiceId)
    const correct = choiceId === problem.choices.find((c) => c.text === problem.correctAnswer)?.id
    setIsCorrect(correct)
    const nextId: TurnId = correct ? 's2_reason' : 's2_reason_wrong'
    await enterTurn(nextId)
  }, [currentTurnId, selectedChoice, timer, problem, enterTurn])

  /* 음성 입력 */
  const handleVoice = useCallback(async (text: string) => {
    if (!canInput || currentTurn.inputType !== 'voice') return
    stopListeningRef.current()
    setIsListening(false)
    setCanInput(false)
    const nextId = (
      matchBranch(text, currentTurn.voiceBranches ?? []) ??
      currentTurn.defaultNextTurnId
    ) as TurnId | undefined
    if (nextId) await enterTurn(nextId)
  }, [canInput, currentTurn, enterTurn])

  /* 필기 감지 */
  const handleFirstStroke = useCallback(async () => {
    if (currentTurn.inputType !== 'draw' || !canInput) return
    setCanInput(false)
    const nextId = currentTurn.onDraw as TurnId | undefined
    if (nextId) {
      await new Promise((r) => setTimeout(r, 600))
      await enterTurn(nextId)
    }
  }, [canInput, currentTurn, enterTurn])

  /* 버튼 처리 */
  const handleButton = useCallback(async () => {
    if (!canInput && currentTurn.inputType !== 'button') return
    if (currentTurn.onButton === 'NEXT_SCREEN') {
      stopCurrentAudio(); onComplete()
    } else if (currentTurn.onButton) {
      await enterTurn(currentTurn.onButton as TurnId)
    }
  }, [canInput, currentTurn, enterTurn, onComplete])

  const highlightId = currentTurn.highlightChoiceId ?? null
  const showChoices = currentTurnId === 's2_start' || currentTurnId === 's2_timer_hint'
    || currentTurnId === 's2_conclusion'
  const drawActive  = currentTurn.inputType === 'draw' && canInput
  const correctId   = problem.choices.find((c) => c.text === problem.correctAnswer)?.id ?? ''

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech || `15초 안에 답을 선택해보세요.`}
      instructorLoading={false}
      instructorVideoSrc={currentTurn.videoSrc}
      onEnd={onEnd}
      toolbar={
        <ClassroomToolbar
          onDrawingChange={setDrawing}
          onClearAll={() => setClear((n) => n + 1)}
        />
      }
      onPipMic={() => {
        if (pipListening) { stopListeningRef.current(); setPip(false) }
        else              { startListeningRef.current(); setPip(true) }
      }}
      pipListening={pipListening}
      instructorInput={
        <InputBar
          placeholder={
            !canInput                         ? '강사 설명 듣는 중...' :
            currentTurn.inputType === 'voice' ? '이유를 음성으로 설명해 보세요' :
            currentTurn.inputType === 'draw'  ? '문장에 표시해 보세요' :
            currentTurn.inputType === 'button'? '아래 버튼을 눌러주세요' :
            showChoices                        ? '선택지를 골라주세요' : ''
          }
          clearTrigger={clearInput}
          onReadyToListen={(start, stop) => {
            startListeningRef.current = start
            stopListeningRef.current  = stop
          }}
          onSpeechResult={handleVoice}
          actions={
            currentTurn.inputType === 'button' && canInput
              ? [{ label: currentTurn.buttonLabel ?? '다음', onClick: handleButton }]
              : []
          }
        />
      }
    >
      <div className="flex flex-col gap-4 h-full">

        {/* 헤더 */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#2277F0]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="2" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M6 6h6M6 9h6M6 12h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-base text-[#1A2B4B]">{problem.partLabel}</span>
          <span className="inline-flex items-center justify-center font-bold text-sm px-3 py-1 rounded-lg bg-[#D6EAFF] text-[#2277F0]">Q1</span>
          {currentTurn.inputType === 'draw' && canInput ? (
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-sm shrink-0">✏️</span>
              <span className="text-xs font-medium text-amber-700 animate-pulse">문장에 직접 표시</span>
            </div>
          ) : isListening ? (
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2277F0]/8 border border-[#2277F0]/20">
              <div className="flex items-center gap-[3px] shrink-0">
                {[0,1,2,3].map((i) => (
                  <span key={i} className="inline-block w-[3px] rounded-full bg-[#2277F0]"
                    style={{ height: 14, animation: `micBar2 ${0.5+i*0.1}s ease-in-out ${i*80}ms infinite alternate` }} />
                ))}
              </div>
              <span className="text-xs font-medium text-[#2277F0]">마이크 켜짐</span>
              <style>{`@keyframes micBar2{from{transform:scaleY(0.3)}to{transform:scaleY(1)}}`}</style>
            </div>
          ) : (
            <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-600">750점 모드</span>
          )}
        </div>

        {/* 타이머 바 */}
        {currentTurnId === 's2_start' && timer.running && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-ybm-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${timer.remaining <= 5 ? 'bg-red-400' : 'bg-[#2277F0]'}`}
                style={{ width: `${(timer.remaining / problem.timerSeconds) * 100}%`, transition: 'width 1s linear' }}
              />
            </div>
            <span className={`text-sm font-bold tabular-nums min-w-[2rem] text-right ${timer.remaining <= 5 ? 'text-red-500' : 'text-[#2277F0]'}`}>
              {timer.remaining}s
            </span>
          </div>
        )}

        {/* 문제 카드 */}
        <div className="ybm-card p-6 relative overflow-hidden select-none flex-1" style={{ minHeight: 140 }}>
          <p className="text-ybm-text text-xl lg:text-2xl font-medium leading-[2.6] tracking-wide">
            {problem.words.map((word, i) =>
              i === problem.blankIndex ? (
                <span key={i} className="inline-block align-bottom mx-1">
                  <span
                    className={`inline-block border-b-2 text-center font-semibold transition-colors
                      ${highlightId ? 'border-green-400 text-green-600' : 'border-[#2277F0]'}
                    `}
                    style={{ minWidth: 160 }}
                  >
                    {highlightId ? problem.correctAnswer : '\u00a0'}
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
            onFirstStroke={drawActive ? handleFirstStroke : undefined}
            clearTrigger={clearCanvas}
          />
        </div>

        {/* 선택지 */}
        {showChoices && (
          <div className="grid grid-cols-2 gap-3">
            {problem.choices.map(({ id, text }) => {
              const isSel = selectedChoice === id
              const isCorrectC = id === correctId
              const showResult = selectedChoice !== null

              return (
                <button
                  key={id}
                  onClick={() => !selectedChoice && handleChoiceSelect(id)}
                  disabled={!!selectedChoice}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all
                    ${!selectedChoice
                      ? 'border-ybm-border bg-white hover:border-[#2277F0]/50 cursor-pointer'
                      : isSel && isCorrectC   ? 'border-green-400 bg-green-50'
                      : isSel && !isCorrectC  ? 'border-red-400 bg-red-50'
                      : showResult && isCorrectC ? 'border-green-300 bg-green-50/40'
                      : 'border-ybm-border bg-white opacity-40'}
                  `}
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0
                    ${isSel && isCorrectC  ? 'bg-green-400 text-white'
                    : isSel && !isCorrectC ? 'bg-red-400 text-white'
                    : showResult && isCorrectC ? 'bg-green-300 text-white'
                    : 'bg-ybm-bg text-ybm-text-sub'}
                  `}>{id}</span>
                  <span className={`text-base font-medium flex-1
                    ${isSel && isCorrectC  ? 'text-green-700'
                    : isSel && !isCorrectC ? 'text-red-600'
                    : showResult && isCorrectC ? 'text-green-600'
                    : 'text-ybm-text'}
                  `}>{text}</span>
                </button>
              )
            })}
          </div>
        )}

        <p className="text-ybm-text-sub text-xs text-center">
          {currentTurnId === 's2_start' ? '15초 안에 선택해 보세요.'
          : currentTurn.inputType === 'voice' ? '음성으로 이유를 설명해 보세요.'
          : currentTurn.inputType === 'draw'  ? '문장에 직접 표시해 보세요.'
          : isCorrect !== null ? (isCorrect ? '정답이에요!' : '오답이에요. 근거를 확인해봐요.') : ''}
        </p>
      </div>
    </ClassroomLayout>
  )
}
