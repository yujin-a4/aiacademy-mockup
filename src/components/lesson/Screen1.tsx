'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import DrawingToolbar from '@/components/classroom/toolbar/DrawingToolbar'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { buildTurns, SCREEN1_PROBLEM } from '@/data/lessonScenario'
import { matchBranch } from '@/lib/matchBranch'
import { speakTurn, stopCurrentAudio, waitForVideoEnd, notifyVideoEnded } from '@/lib/tts'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'

type TurnId =
  | 's1_turn1' | 's1_turn2a' | 's1_turn3'
  | 's1_turn4' | 's1_turn5' | 's1_turn6' | 's1_turn7'

interface RemoteOption {
  id: string
  text: string
  correct: boolean
}

interface Screen1Props {
  onComplete: () => void
  onEnd: () => void
  onPrev?: () => void
}

export default function Screen1({ onComplete, onEnd, onPrev }: Screen1Props) {
  const persona  = useClassroomStore((s) => s.persona)
  const userName = useOnboardingStore((s) => s.userName) || '민주'
  const TURNS    = buildTurns(userName)

  const [currentTurnId, setTurnId]  = useState<TurnId>('s1_turn1')
  const [isPlaying, setPlaying]     = useState(false)
  const [canInput, setCanInput]     = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speech, setSpeech]         = useState('')
  const [drawingState, setDrawing]  = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearCanvas, setClear]     = useState(0)
  const [clearInput, setClearInput] = useState(0)
  const [selectedChoice, setChoice]       = useState<string | null>(null)
  const [pipListening, setPip]            = useState(false)
  const [warnMessage, setWarnMessage]     = useState('')
  const [strokeReset, setStrokeReset]     = useState(0)
  const [xMarkedChoices, setXMarked]      = useState<Set<string>>(new Set())
  const [remoteOptions, setRemoteOptions] = useState<RemoteOption[] | null>(null)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef  = useRef<() => void>(() => {})
  const mountedRef        = useRef(false)
  const enteredRef        = useRef(false)
  const xTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (xTimerRef.current) { clearTimeout(xTimerRef.current); xTimerRef.current = null }
    setXMarked(new Set())
    setRemoteOptions(null)
    setRemoteLoading(false)

    /* 대사를 즉시 업데이트 → InstructorPanel 타이핑 즉시 시작 */
    setSpeech(turn.script)
    setPlaying(true)

    /* 영상 있으면 영상 끝날 때까지 대기, 없으면 오디오/TTS */
    if (turn.videoSrc) {
      await waitForVideoEnd()
    } else {
      await speakTurn({ audioSrc: turn.audioSrc, script: turn.script, persona })
    }
    if (!mountedRef.current) return

    setPlaying(false)
    setCanInput(true)

    if (turn.inputType === 'voice') {
      /* 오디오 컨텍스트 해제 후 마이크 자동 시작 — state 경유 없이 직접 스케줄 */
      console.log('[Screen1] inputType=voice, scheduling mic start in 300ms for turn:', turnId)
      setTimeout(() => {
        if (!mountedRef.current) return
        console.log('[Screen1] starting mic now for turn:', turnId)
        startListeningRef.current()
      }, 300)
    }

    if (turn.inputType === 'remoteChoice' && turn.remoteChoiceId) {
      setRemoteLoading(true)
      try {
        const res = await fetch(`/api/lesson-content/subject-choices?id=${turn.remoteChoiceId}`)
        const data = await res.json()
        if (!mountedRef.current) return
        setRemoteOptions(Array.isArray(data.options) ? data.options : [])
      } catch {
        if (mountedRef.current) setRemoteOptions([])
      } finally {
        if (mountedRef.current) setRemoteLoading(false)
      }
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
    console.log('[Screen1] handleVoice called, text:', text, 'canInput:', canInput, 'turnId:', currentTurnId)
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

  /* ── DB에서 가져온 선택지 처리 (실험: 세부 질문용 remoteChoice) ── */
  const handleRemoteChoice = useCallback(async (optionId: string) => {
    if (!canInput) return
    const turn = TURNS[currentTurnId]
    if (turn.inputType !== 'remoteChoice') return
    const picked = remoteOptions?.find((o) => o.id === optionId)
    if (!picked) return

    if (!picked.correct) {
      showWarn('다시 생각해봐! 수식어구를 빼고 핵심 명사구를 찾아보세요')
      return
    }

    setCanInput(false)
    const nextId = turn.defaultNextTurnId as TurnId | undefined
    if (nextId) await enterTurn(nextId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInput, currentTurnId, TURNS, remoteOptions, enterTurn])

  /* ── 필기 첫 획 처리 ── */
  const handleFirstStroke = useCallback(async (relX: number, relY: number, screenX: number, screenY: number) => {
    const turn = TURNS[currentTurnId]
    if (turn.inputType !== 'draw' || !canInput) return

    /* X 표시 턴: A·C 둘 다 표시해야 통과 */
    if (turn.drawHint === 'x') {
      const col      = relX > 0.5 ? 1 : 0
      const row      = relY > 0.5 ? 1 : 0
      const markedId = SCREEN1_PROBLEM.choices[row * 2 + col]?.id
      const required = ['A', 'C']  // 능동태 제거 대상

      if (!markedId || !required.includes(markedId)) {
        showWarn('다시 생각해봐! 능동태 선택지에 X 표시해 보세요')
        return
      }

      /* 유효한 X 획 — set에 추가 */
      const newMarked = new Set(xMarkedChoices)
      newMarked.add(markedId)
      setXMarked(newMarked)
      if (xTimerRef.current) { clearTimeout(xTimerRef.current); xTimerRef.current = null }

      if (required.every(id => newMarked.has(id))) {
        /* A·C 둘 다 표시 → 다음 턴 */
        setCanInput(false)
        const nextId = turn.onDraw as TurnId | undefined
        if (nextId) {
          await new Promise(r => setTimeout(r, 600))
          await enterTurn(nextId)
        }
        return
      }

      /* 하나만 표시 — 3초 후 힌트 */
      xTimerRef.current = setTimeout(() => {
        showHint('하나 더! 틀린 선택지가 하나 더 있어요')
      }, 3000)
      return
    }

    /* underline / circle 턴: 타겟 단어 범위 밖이면 경고 */
    if ((turn.drawHint === 'underline' || turn.drawHint === 'circle') && turn.drawTargetWordIndices?.length) {
      const PAD_X = 60
      const PAD_Y_TOP = 60
      const PAD_Y_BOT = turn.drawHint === 'underline' ? 80 : 60
      /* ClassroomLayout이 children을 모바일/데스크탑 두 곳에 렌더링하므로
         querySelectorAll로 전부 찾은 뒤 실제로 보이는(width > 0) 엘리먼트만 사용 */
      const els = turn.drawTargetWordIndices.flatMap(idx =>
        Array.from(document.querySelectorAll(`[data-word-index="${idx}"]`))
          .filter(el => el.getBoundingClientRect().width > 0)
      )
      const hit = els.length === 0 || els.some(el => {
        const r = el.getBoundingClientRect()
        return (
          screenX >= r.left  - PAD_X &&
          screenX <= r.right + PAD_X &&
          screenY >= r.top   - PAD_Y_TOP &&
          screenY <= r.bottom + PAD_Y_BOT
        )
      })
      if (!hit) {
        const msg = turn.drawHint === 'underline'
          ? '다시 생각해봐! 주어 부분을 찾아서 밑줄을 그어 보세요'
          : '다시 생각해봐! 빈칸 뒤 힌트 단어에 동그라미를 쳐 보세요'
        showWarn(msg)
        return
      }
    }

    setCanInput(false)
    const nextId = turn.onDraw as TurnId | undefined
    if (nextId) {
      await new Promise((r) => setTimeout(r, 600))
      await enterTurn(nextId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInput, currentTurnId, TURNS, enterTurn, xMarkedChoices])

  const showWarn = useCallback((msg: string) => {
    setWarnMessage(msg)
    setStrokeReset(n => n + 1)
    setTimeout(() => setWarnMessage(''), 2500)
  }, [])

  const showHint = useCallback((msg: string) => {
    setWarnMessage(msg)
    setTimeout(() => setWarnMessage(''), 3000)
  }, [])

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
  const choicesVisible = currentTurnId === 's1_turn6' || currentTurnId === 's1_turn7'
  const answerVisible  = currentTurnId === 's1_turn7'
  const highlightId    = (canInput && currentTurn.highlightChoiceId) ? currentTurn.highlightChoiceId : null
  const canAdvanceNow = currentTurnId === 's1_turn7' && canInput
  const pulseAdvance  = currentTurnId === 's1_turn7' && canInput

  return (
  <>
    {pulseAdvance && (
      <style>{`
        .advance-pulse { animation: advanceRing 1.4s ease-out infinite; }
        @keyframes advanceRing {
          0%   { box-shadow: 0 0 0 0 rgba(34,119,240,0.55); }
          70%  { box-shadow: 0 0 0 10px rgba(34,119,240,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,119,240,0); }
        }
      `}</style>
    )}
    <ClassroomLayout
      partName="Part 5 수동태"
      totalProblems={5}
      instructorSpeech={speech}
      instructorLoading={false}
      instructorVideoSrc={currentTurn.videoSrc}
      onInstructorVideoEnd={notifyVideoEnded}
      onEnd={onEnd}
      toolbar={
        <LessonToolbar
          drawing={drawingState}
          onDrawingChange={setDrawing}
          onClearAll={() => setClear((n) => n + 1)}
          onPrev={onPrev}
          nextLabel="다음 단계로"
          onNext={() => { stopCurrentAudio(); onComplete() }}
          nextEnabled={canAdvanceNow}
          nextPulse={pulseAdvance}
        />
      }
      onPipMic={() => {
        if (pipListening) { stopListeningRef.current(); setPip(false) }
        else              { startListeningRef.current(); setPip(true) }
      }}
      pipListening={pipListening}
      instructorInput={
        currentTurn.inputType === 'remoteChoice' ? (
          <RemoteChoiceBar
            loading={remoteLoading}
            options={remoteOptions}
            disabled={!canInput}
            onSelect={handleRemoteChoice}
          />
        ) : (
          <InputBar
            placeholder={
              !canInput                          ? '강사 설명 듣는 중...' :
              currentTurn.inputType === 'voice'  ? '음성으로 대답해 보세요' :
              currentTurn.inputType === 'draw'   ? (currentTurn.drawHint === 'underline' ? '문장에 밑줄을 그어 보세요' : currentTurn.drawHint === 'x' ? '틀린 선택지에 X 표시해 보세요' : '힌트에 동그라미를 쳐 보세요') :
              currentTurn.inputType === 'button' ? '아래 버튼을 눌러주세요' : ''
            }
            clearTrigger={clearInput}
            onReadyToListen={(start, stop) => {
              startListeningRef.current = start
              stopListeningRef.current  = stop
            }}
            onSpeechResult={handleVoice}
            onListeningChange={setIsListening}
            lang={currentTurn.lang ?? 'ko-KR'}
            actions={[]}
          />
        )
      }
    >
      <ProblemContent
        problem={problem}
        drawingState={drawingState}
        onFirstStroke={handleFirstStroke}
        clearCanvas={clearCanvas}
        strokeReset={strokeReset}
        choicesVisible={choicesVisible}
        answerVisible={answerVisible}
        highlightId={highlightId}
        selectedChoice={selectedChoice}
        onChoiceSelect={setChoice}
        drawActive={currentTurn.inputType === 'draw' && canInput}
        drawHint={currentTurn.drawHint}
        turnId={currentTurnId}
        isListening={isListening}
      />
    </ClassroomLayout>
    {/* 경고/힌트 토스트 — fixed 위치로 레이아웃 영향 없음 */}
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

/* ── 문제 콘텐츠 ── */
function ProblemContent({
  problem,
  drawingState,
  onFirstStroke,
  clearCanvas,
  strokeReset,
  choicesVisible,
  answerVisible,
  highlightId,
  selectedChoice,
  onChoiceSelect,
  drawActive,
  drawHint,
  turnId,
  isListening,
}: {
  problem: typeof SCREEN1_PROBLEM
  drawingState: DrawingState
  onFirstStroke: (relX: number, relY: number, screenX: number, screenY: number) => void
  clearCanvas: number
  strokeReset: number
  choicesVisible: boolean
  answerVisible: boolean
  highlightId: string | null
  selectedChoice: string | null
  onChoiceSelect: (id: string) => void
  drawActive: boolean
  drawHint?: string
  turnId: TurnId
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
            <span className="text-sm shrink-0"></span>
            <span className="text-xs font-medium text-amber-700 animate-pulse">
              {drawHint === 'underline' ? '주어에 밑줄 긋기' : drawHint === 'x' ? '틀린 선택지 2개에 X표시' : '힌트에 동그라미 표시'}
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
                    : 'border-[#2277F0]'}
                  `}
                  style={{ minWidth: 160 }}
                >
                  {answerVisible ? problem.correctAnswer : '\u00a0'}
                </span>
              </span>
            ) : (
              <span key={i} data-word-index={i}>{word} </span>
            )
          )}
        </p>
        {/* 문장 위 드로잉 — x 힌트일 때만 선택지로 이동, 나머지는 항상 활성 */}
        {drawHint !== 'x' && (
          <CanvasOverlay
            tool={drawingState.tool}
            color={drawingState.color}
            onFirstStroke={drawActive ? onFirstStroke : undefined}
            clearTrigger={clearCanvas}
            strokeResetTrigger={strokeReset}
          />
        )}
      </div>

      {/* 선택지 — quiz 단계에서만 인터랙션 활성 / X 드로잉 모드에서는 캔버스가 위를 덮음 */}
      <div className={`relative grid grid-cols-2 gap-3 ${!choicesVisible ? 'pointer-events-none' : ''}`}>
        {problem.choices.map(({ id, text }) => {
          const isHighlight = choicesVisible && id === highlightId
          return (
            <button
              key={id}
              onClick={() => choicesVisible && onChoiceSelect(id)}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all
                ${isHighlight
                  ? 'border-green-400 bg-green-50'
                  : choicesVisible
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
        {/* 선택지 위 드로잉 — drawHint가 'x'일 때 항상 활성 */}
        {drawHint === 'x' && (
          <CanvasOverlay
            tool={drawingState.tool}
            color={drawingState.color}
            onFirstStroke={drawActive ? onFirstStroke : undefined}
            clearTrigger={clearCanvas}
            strokeResetTrigger={strokeReset}
          />
        )}
      </div>

    </div>
  )
}

/* ── DB에서 가져온 선택지 바 (실험: 세부 질문용 remoteChoice) ── */
function RemoteChoiceBar({
  loading,
  options,
  disabled,
  onSelect,
}: {
  loading: boolean
  options: RemoteOption[] | null
  disabled: boolean
  onSelect: (id: string) => void
}) {
  if (loading || !options) {
    return (
      <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-ybm-text-sub">
        <span className="w-4 h-4 rounded-full border-2 border-[#2277F0]/30 border-t-[#2277F0] animate-spin" />
        DB에서 선택지 불러오는 중...
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          disabled={disabled}
          onClick={() => onSelect(opt.id)}
          className="px-4 py-2.5 rounded-xl border-2 border-ybm-border bg-white text-sm font-semibold text-ybm-text
            hover:border-[#2277F0]/50 hover:bg-[#2277F0]/5 active:scale-95 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {opt.text}
        </button>
      ))}
    </div>
  )
}

/* ── 공용 레슨 툴바 ── */
export function LessonToolbar({
  drawing,
  onDrawingChange,
  onClearAll,
  onPrev,
  onNext,
  nextLabel = '다음',
  nextEnabled = true,
  nextPulse = false,
}: {
  drawing: import('@/components/classroom/toolbar/DrawingToolbar').DrawingState
  onDrawingChange: (s: import('@/components/classroom/toolbar/DrawingToolbar').DrawingState) => void
  onClearAll: () => void
  onPrev?: () => void
  onNext?: () => void
  nextLabel?: string
  nextEnabled?: boolean
  nextPulse?: boolean
}) {
  return (
    <div className="flex items-center px-4 py-3 gap-2">
      {/* 필기도구 */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <DrawingToolbar onChange={onDrawingChange} onClearAll={onClearAll} />
      </div>

      <div className="h-5 w-px bg-ybm-border shrink-0" />

      {/* 이전 / 다음 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onPrev}
          disabled={!onPrev}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
            ${!onPrev
              ? 'opacity-30 cursor-not-allowed text-ybm-text-sub'
              : 'text-ybm-text hover:bg-ybm-bg active:scale-95'}
          `}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          이전
        </button>

        {onNext && (
          <button
            onClick={onNext}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95
              ${nextEnabled
                ? `bg-[#2277F0] text-white hover:bg-[#1a66d4] shadow-sm${nextPulse ? ' advance-pulse' : ''}`
                : 'text-ybm-text-sub border border-ybm-border bg-ybm-bg hover:bg-gray-100'}
            `}
          >
            {nextLabel}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
