'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import ClassroomToolbar from '@/components/classroom/toolbar/ClassroomToolbar'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { buildTurns, SCREEN1_PROBLEM } from '@/data/lessonScenario'
import { matchBranch } from '@/lib/matchBranch'
import { speakTurn, stopCurrentAudio } from '@/lib/tts'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'

type TurnId =
  | 's1_turn1' | 's1_turn2a' | 's1_turn3'
  | 's1_turn4' | 's1_turn5' | 's1_turn6' | 's1_turn7'

interface Screen1Props {
  onComplete: () => void
  onEnd: () => void
}

export default function Screen1({ onComplete, onEnd }: Screen1Props) {
  const persona  = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const TURNS    = buildTurns(userName)

  const [currentTurnId, setTurnId]  = useState<TurnId>('s1_turn1')
  const [isPlaying, setPlaying]     = useState(false)
  const [canInput, setCanInput]     = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speech, setSpeech]         = useState('')
  const [drawingState, setDrawing]  = useState<DrawingState>({ tool: 'pen', color: '#2277F0' })
  const [clearCanvas, setClear]     = useState(0)
  const [clearInput, setClearInput] = useState(0)
  const [selectedChoice, setChoice] = useState<string | null>(null)
  const [pipListening, setPip]      = useState(false)

  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})
  const mountedRef        = useRef(false)
  const enteredRef        = useRef(false)

  /* mountedRef: 실제 unmount 시 false, remount(StrictMode 포함) 시 true로 리셋 */
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const currentTurn = TURNS[currentTurnId]

  /* ── 턴 진입: 대사 즉시 표시 + 오디오 동시 재생 ── */
  const enterTurn = useCallback(async (turnId: TurnId) => {
    if (!mountedRef.current) return
    const turn = TURNS[turnId]
    setTurnId(turnId)
    setCanInput(false)
    setIsListening(false)
    setClearInput((n) => n + 1)
    setClear((n) => n + 1)

    /* 대사를 즉시 업데이트 → InstructorPanel 타이핑 즉시 시작 */
    setSpeech(turn.script)
    setPlaying(true)

    /* 오디오는 대사와 동시에 재생 */
    await speakTurn({ audioSrc: turn.audioSrc, script: turn.script, persona })
    if (!mountedRef.current) return

    setPlaying(false)
    setCanInput(true)

    if (turn.inputType === 'voice') {
      /* 오디오 컨텍스트 해제 후 마이크 자동 시작 — state 경유 없이 직접 스케줄 */
      setTimeout(() => {
        if (!mountedRef.current) return
        startListeningRef.current()
      }, 300)
    }
  }, [TURNS, persona])

  /* 마운트 시 첫 번째 턴 진입 — enteredRef로 StrictMode 이중 실행 방지 */
  useEffect(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    enterTurn('s1_turn1')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 음성 입력 처리 ── */
  const handleVoice = useCallback(async (text: string) => {
    if (!canInput) return
    const turn = TURNS[currentTurnId]
    if (turn.inputType !== 'voice') return

    stopListeningRef.current()
    setIsListening(false)
    setCanInput(false)

    const nextId = (
      matchBranch(text, turn.voiceBranches ?? []) ??
      turn.defaultNextTurnId
    ) as TurnId | undefined

    if (nextId) await enterTurn(nextId)
  }, [canInput, currentTurnId, TURNS, enterTurn])

  /* ── 필기 첫 획 처리 ── */
  const handleFirstStroke = useCallback(async () => {
    const turn = TURNS[currentTurnId]
    if (turn.inputType !== 'draw' || !canInput) return
    setCanInput(false)
    const nextId = turn.onDraw as TurnId | undefined
    if (nextId) {
      await new Promise((r) => setTimeout(r, 600))
      await enterTurn(nextId)
    }
  }, [canInput, currentTurnId, TURNS, enterTurn])

  /* ── 버튼 처리 ── */
  const handleButton = useCallback(async () => {
    const turn = TURNS[currentTurnId]
    if (!canInput && turn.inputType !== 'button') return
    if (turn.onButton === 'NEXT_SCREEN') {
      stopCurrentAudio(); onComplete()
    } else if (turn.onButton) {
      await enterTurn(turn.onButton as TurnId)
    }
  }, [canInput, currentTurnId, TURNS, enterTurn, onComplete])

  const problem = SCREEN1_PROBLEM
  const quizVisible   = currentTurnId === 's1_turn6' || currentTurnId === 's1_turn7'
  const highlightId   = currentTurn.highlightChoiceId ?? null
  const canAdvanceNow = (currentTurnId === 's1_turn4' || currentTurnId === 's1_turn7') && canInput
  const pulseAdvance  = currentTurnId === 's1_turn4' && canInput

  return (
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
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
            !canInput                          ? '강사 설명 듣는 중...' :
            currentTurn.inputType === 'voice'  ? '음성으로 대답해 보세요' :
            currentTurn.inputType === 'draw'   ? `문장에 ${currentTurn.drawHint === 'underline' ? '밑줄' : '동그라미'}을 그어 보세요` :
            currentTurn.inputType === 'button' ? '아래 버튼을 눌러주세요' : ''
          }
          clearTrigger={clearInput}
          onReadyToListen={(start, stop) => {
            startListeningRef.current = start
            stopListeningRef.current  = stop
          }}
          onSpeechResult={handleVoice}
          onListeningChange={setIsListening}
          actions={
            currentTurn.inputType === 'button' && canInput && currentTurnId !== 's1_turn4'
              ? [{ label: currentTurn.buttonLabel ?? '다음', onClick: handleButton }]
              : []
          }
        />
      }
    >
      <ProblemContent
        problem={problem}
        drawingState={drawingState}
        onFirstStroke={handleFirstStroke}
        clearCanvas={clearCanvas}
        quizVisible={quizVisible}
        highlightId={highlightId}
        selectedChoice={selectedChoice}
        onChoiceSelect={setChoice}
        drawActive={currentTurn.inputType === 'draw' && canInput}
        drawHint={currentTurn.drawHint}
        turnId={currentTurnId}
        onNext={handleButton}
        canAdvance={canAdvanceNow}
        pulseAdvance={pulseAdvance}
        isListening={isListening}
      />
    </ClassroomLayout>
  )
}

/* ── 문제 콘텐츠 ── */
function ProblemContent({
  problem,
  drawingState,
  onFirstStroke,
  clearCanvas,
  quizVisible,
  highlightId,
  selectedChoice,
  onChoiceSelect,
  drawActive,
  drawHint,
  turnId,
  onNext,
  canAdvance,
  pulseAdvance,
  isListening,
}: {
  problem: typeof SCREEN1_PROBLEM
  drawingState: DrawingState
  onFirstStroke: () => void
  clearCanvas: number
  quizVisible: boolean
  highlightId: string | null
  selectedChoice: string | null
  onChoiceSelect: (id: string) => void
  drawActive: boolean
  drawHint?: string
  turnId: TurnId
  onNext: () => void
  canAdvance: boolean
  pulseAdvance?: boolean
  isListening: boolean
}) {
  return (
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
        {drawActive ? (
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-sm shrink-0">✏️</span>
            <span className="text-xs font-medium text-amber-700 animate-pulse">
              {drawHint === 'underline' ? '주어에 밑줄 긋기' : 'by 뒤 동그라미'}
            </span>
          </div>
        ) : isListening ? (
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2277F0]/8 border border-[#2277F0]/20">
            <div className="flex items-center gap-[3px] shrink-0">
              {[0,1,2,3].map((i) => (
                <span key={i} className="inline-block w-[3px] rounded-full bg-[#2277F0]"
                  style={{ height: 14, animation: `micBar ${0.5+i*0.1}s ease-in-out ${i*80}ms infinite alternate` }} />
              ))}
            </div>
            <span className="text-xs font-medium text-[#2277F0]">마이크 켜짐</span>
            <style>{`@keyframes micBar{from{transform:scaleY(0.3)}to{transform:scaleY(1)}}`}</style>
          </div>
        ) : null}
      </div>

      {/* 문제 카드 + Canvas */}
      <div className="ybm-card p-6 relative overflow-hidden select-none flex-1" style={{ minHeight: 140 }}>
        <p className="text-ybm-text text-xl lg:text-2xl font-medium leading-[2.6] tracking-wide">
          {problem.words.map((word, i) =>
            i === problem.blankIndex ? (
              <span key={i} className="inline-block align-bottom mx-1">
                <span
                  className={`inline-block border-b-2 text-center font-semibold transition-colors
                    ${highlightId && selectedChoice === highlightId ? 'border-green-400 text-green-600'
                    : quizVisible ? 'border-[#2277F0]'
                    : 'border-[#2277F0]'}
                  `}
                  style={{ minWidth: 160 }}
                >
                  {quizVisible ? problem.correctAnswer : '\u00a0'}
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
          onFirstStroke={drawActive ? onFirstStroke : undefined}
          clearTrigger={clearCanvas}
        />
      </div>

      {/* 선택지 — 항상 표시, quiz 단계에서만 인터랙션 활성 */}
      <div className={`grid grid-cols-2 gap-3 ${!quizVisible ? 'pointer-events-none' : ''}`}>
        {problem.choices.map(({ id, text }) => {
          const isHighlight = quizVisible && id === highlightId
          return (
            <button
              key={id}
              onClick={() => quizVisible && onChoiceSelect(id)}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all
                ${isHighlight
                  ? 'border-green-400 bg-green-50'
                  : quizVisible
                  ? 'border-ybm-border bg-white hover:border-[#2277F0]/40 cursor-pointer'
                  : 'border-ybm-border bg-white opacity-50 cursor-default'}
              `}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0
                ${isHighlight ? 'bg-green-400 text-white' : 'bg-ybm-bg text-ybm-text-sub'}
              `}>{id}</span>
              <span className={`text-base font-medium flex-1 ${isHighlight ? 'text-green-700' : 'text-ybm-text'}`}>
                {text}
              </span>
              {isHighlight && (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9l4 4 6-7" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* 하단 안내 */}
      {quizVisible && (
        <p className="text-ybm-text-sub text-xs text-center">정답이 하이라이트 되어 있어요.</p>
      )}

      {/* 하단 다음 단계 버튼 */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-ybm-text-sub font-medium">1단계 · 문제 유형 학습</span>
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${canAdvance
              ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4] active:scale-95 shadow-sm'
              : 'border border-ybm-border text-ybm-text-sub bg-ybm-bg cursor-not-allowed opacity-50'}
            ${pulseAdvance ? 'advance-pulse' : ''}
          `}
        >
          다음 단계로
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {pulseAdvance && (
          <style>{`
            .advance-pulse {
              animation: advanceRing 1.4s ease-out infinite;
            }
            @keyframes advanceRing {
              0%   { box-shadow: 0 0 0 0 rgba(34,119,240,0.55); }
              70%  { box-shadow: 0 0 0 10px rgba(34,119,240,0); }
              100% { box-shadow: 0 0 0 0 rgba(34,119,240,0); }
            }
          `}</style>
        )}
      </div>
    </div>
  )
}
