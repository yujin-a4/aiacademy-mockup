'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import ClassroomLayout from '@/components/classroom/ClassroomLayout'
import ClassroomToolbar from '@/components/classroom/toolbar/ClassroomToolbar'
import InputBar from '@/components/classroom/toolbar/InputBar'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import { useClassroomStore } from '@/store/classroomStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import type { DrawingState, DrawingTool } from '@/components/classroom/toolbar/DrawingToolbar'

/* ════════════════════════════════════════
   문제 데이터 (스크린샷 기준)
════════════════════════════════════════ */
const PROBLEM = {
  partLabel: '실전 확인 문제',
  number: 'Q1',
  topic: 'Part 5 수동태',
  words: [
    'The', 'technical', 'issues', 'with', 'the', 'server',
    '______',
    'promptly', 'by', 'your', 'IT', 'support', 'team.'
  ],
  blankIndex: 6,
  correctAnswer: 'were handled',
  choices: [
    { id: 'A', text: 'handled' },
    { id: 'B', text: 'were handled' },
    { id: 'C', text: 'handling' },
    { id: 'D', text: 'was handled' },
  ],
}

/* ════════════════════════════════════════
   시나리오 단계
════════════════════════════════════════ */
type Phase =
  | 'intro'       // TTS 자동 재생 중
  | 'listening1'  // 마이크 자동 활성화 — 첫 번째 질문 후 학습자 대답 대기
  | 'scaffold1'   // 첫 번째 피드백 TTS 중
  | 'await-draw'  // "밑줄 그어 봐" — 캔버스 드로잉 대기
  | 'scaffold2'   // 두 번째 피드백 TTS 중
  | 'quiz'        // 선택지 활성화
  | 'done'        // 완료

const SCAFFOLD_1 = '다시 봐봐. 빈칸 앞에서 with 같은 찌꺼기들 빼고 핵심이 뭐야? 밑줄 그어 봐.'
const SCAFFOLD_2 = '그렇지. 이제 by 동그라미 쳐. 동사 뒤에 by가 나오면 수동태인지 먼저 의심해야 해.'

/* ════════════════════════════════════════
   TTS 헬퍼 (완료 Promise 반환)
════════════════════════════════════════ */
async function speakAndWait(text: string, persona: string): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const res  = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      const data = await res.json()

      if (!data.useNativeTts && data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
        /* ended 이벤트가 오기 전 ~50ms 앞당겨 resolve해 체감 딜레이 제거 */
        const earlyResolve = () => setTimeout(resolve, 0)
        audio.onended = earlyResolve
        audio.onerror = () => resolve()
        await audio.play().catch(() => resolve())
        return
      }
    } catch { /* fall through */ }

    /* 브라우저 내장 TTS fallback */
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt   = new SpeechSynthesisUtterance(text)
      utt.lang    = 'ko-KR'
      utt.rate    = persona === 'driller' ? 1.2 : 0.95
      utt.onend   = () => resolve()
      utt.onerror = () => resolve()
      window.speechSynthesis.speak(utt)
    } else {
      resolve()
    }
  })
}

/* ════════════════════════════════════════
   메인 페이지
════════════════════════════════════════ */
export default function ClassroomPage() {
  const persona            = useClassroomStore((s) => s.persona)
  const currentProblemIndex = useClassroomStore((s) => s.currentProblemIndex)
  const nextProblem        = useClassroomStore((s) => s.nextProblem)
  const storedName   = useOnboardingStore((s) => s.userName)
  const userName     = storedName || '민주'

  const introText = `${userName}야, Part 5에서는 문장 구조를 먼저 파악해야 해. 문장 보이면 무조건 주어랑 동사 먼저 찾아봐. 여기서 주어가 뭐야?`

  const [phase, setPhase]               = useState<Phase>('intro')
  const [instructorSpeech, setSpeech]   = useState(introText)
  const [isLoading, setLoading]         = useState(false)
  const [selectedChoice, setChoice]     = useState<string | null>(null)
  const [clearTrigger, setClear]        = useState(0)
  const [clearCanvas, setClearCanvas]   = useState(0)
  const [drawingState, setDrawing]      = useState<DrawingState>({ tool: 'pen', color: '#2277F0' })
  /* InputBar의 startListening 함수를 저장 — React state 없이 직접 호출해 딜레이 제거 */
  const startListeningRef  = useRef<() => void>(() => {})
  const stopListeningRef   = useRef<() => void>(() => {})
  const [pipListening, setPipListening] = useState(false)

  const scenarioRunning = useRef(false)

  /* ── 수업 시작: intro TTS → 마이크 자동 활성화 ── */
  useEffect(() => {
    if (scenarioRunning.current) return
    scenarioRunning.current = true

    ;(async () => {
      setPhase('intro')
      await speakAndWait(introText, persona)
      setPhase('listening1')
      startListeningRef.current()   // React state 없이 STT 즉시 시작
    })()
  // 마운트 시 1회만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 첫 번째 STT 결과 수신 → scaffold1 ── */
  const handleSpeechResult1 = useCallback(async (text: string) => {
    if (phase !== 'listening1') return
    setPhase('scaffold1')
    setLoading(true)
    setSpeech(SCAFFOLD_1)
    setClear((n) => n + 1)
    await speakAndWait(SCAFFOLD_1, persona)
    setLoading(false)
    setPhase('await-draw')
  }, [phase, persona])

  /* ── 캔버스 첫 획 감지 → scaffold2 ── */
  const handleFirstStroke = useCallback(async () => {
    if (phase !== 'await-draw') return
    setPhase('scaffold2')
    setLoading(true)
    setSpeech(SCAFFOLD_2)
    await speakAndWait(SCAFFOLD_2, persona)
    setLoading(false)
    setPhase('quiz')
  }, [phase, persona])

  /* ── 선택지 선택 → Gemini 최종 피드백 ── */
  const handleChoiceSelect = useCallback(async (choiceId: string) => {
    if (phase !== 'quiz' || selectedChoice) return
    setChoice(choiceId)
    setPhase('done')
    setLoading(true)

    const choiceText = PROBLEM.choices.find((c) => c.id === choiceId)?.text ?? ''
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: PROBLEM.words.join(' '),
          correctAnswer: PROBLEM.correctAnswer,
          userAnswer: choiceText,
          persona,
          history: [{ role: 'model', text: SCAFFOLD_2 }],
        }),
      })
      const { dialogue } = await res.json()
      setSpeech(dialogue)
      speakAndWait(dialogue, persona).catch(console.warn)
    } catch {
      setSpeech('잘했어! 수동태 패턴 기억해 뒤.')
    } finally {
      setLoading(false)
    }
  }, [phase, selectedChoice, persona])

  /* ── 텍스트/음성 직접 제출 ── */
  const handleManualSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return
    if (phase === 'listening1') {
      await handleSpeechResult1(text)
    } else if (phase === 'quiz' || phase === 'done') {
      // quiz 단계 이후 자유 질문은 Gemini로
      setLoading(true)
      setClear((n) => n + 1)
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem: PROBLEM.words.join(' '),
            correctAnswer: PROBLEM.correctAnswer,
            userAnswer: text,
            persona,
            history: [],
          }),
        })
        const { dialogue } = await res.json()
        setSpeech(dialogue)
        speakAndWait(dialogue, persona).catch(console.warn)
      } finally {
        setLoading(false)
      }
    }
  }, [phase, handleSpeechResult1, persona])

  /* ── 단계별 입력 플레이스홀더 ── */
  const inputPlaceholder =
    phase === 'intro'      ? '강사가 설명 중...' :
    phase === 'listening1' ? '주어를 말해 보세요' :
    phase === 'scaffold1'  ? '강사 피드백 중...' :
    phase === 'await-draw' ? '문장에 밑줄을 그어 보세요' :
    phase === 'scaffold2'  ? '강사 피드백 중...' :
                             '강사에게 질문하거나 답을 입력하세요'

  return (
    <ClassroomLayout
      partName={PROBLEM.topic}
      totalProblems={5}
      instructorSpeech={instructorSpeech}
      instructorLoading={isLoading}
      onEnd={() => window.history.back()}
      toolbar={<ClassroomToolbar onDrawingChange={setDrawing} onClearAll={() => setClearCanvas((n) => n + 1)} />}
      onPipMic={() => {
        if (pipListening) { stopListeningRef.current(); setPipListening(false) }
        else              { startListeningRef.current(); setPipListening(true) }
      }}
      pipListening={pipListening}
      instructorInput={
        <InputBar
          placeholder={inputPlaceholder}
          clearTrigger={clearTrigger}
          onReadyToListen={(start, stop) => { startListeningRef.current = start; stopListeningRef.current = stop }}
          onSpeechResult={handleSpeechResult1}
          actions={
            phase === 'quiz' || phase === 'done'
              ? [{ label: '전송', onClick: handleManualSubmit, disabled: isLoading }]
              : []
          }
        />
      }
    >
      <QuizContent
        phase={phase}
        selectedChoice={selectedChoice}
        onChoiceSelect={handleChoiceSelect}
        drawingTool={drawingState.tool}
        drawingColor={drawingState.color}
        onFirstStroke={handleFirstStroke}
        currentIndex={currentProblemIndex}
        totalProblems={5}
        onPrev={() => {/* 첫 번째 문제라 비활성 */}}
        onNext={nextProblem}
        clearCanvasTrigger={clearCanvas}
      />
    </ClassroomLayout>
  )
}

/* ════════════════════════════════════════
   퀴즈 콘텐츠
════════════════════════════════════════ */
function QuizContent({
  phase,
  selectedChoice,
  onChoiceSelect,
  drawingTool,
  drawingColor,
  onFirstStroke,
  currentIndex,
  totalProblems,
  onPrev,
  onNext,
  clearCanvasTrigger,
}: {
  phase: Phase
  selectedChoice: string | null
  onChoiceSelect: (id: string) => void
  drawingTool: DrawingTool
  drawingColor: string
  onFirstStroke: () => void
  currentIndex: number
  totalProblems: number
  onPrev: () => void
  onNext: () => void
  clearCanvasTrigger?: number
}) {
  const correctId = PROBLEM.choices.find((c) => c.text === PROBLEM.correctAnswer)?.id ?? ''
  const quizActive = phase === 'quiz' || phase === 'done'

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* 헤더 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          {/* 아이콘 */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#2277F0' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="2" width="12" height="14" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M6 6h6M6 9h6M6 12h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {/* 제목 */}
          <span className="font-bold text-base" style={{ color: '#1A2B4B' }}>{PROBLEM.partLabel}</span>
          {/* Q 번호 뱃지 */}
          <span className="inline-flex items-center justify-center font-bold text-sm px-3 py-1 rounded-lg" style={{ backgroundColor: '#D6EAFF', color: '#2277F0' }}>
            {PROBLEM.number}
          </span>
          {/* 단계 힌트 뱃지 */}
          {phase === 'await-draw' && (
            <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
              ✏️ 밑줄을 그어 보세요
            </span>
          )}
        </div>
      </div>

      {/* 문제 카드 + Canvas */}
      <div className="ybm-card p-6 relative overflow-hidden select-none flex-1" style={{ minHeight: 140 }}>
        <p className="text-ybm-text text-xl lg:text-2xl font-medium leading-[2.6] tracking-wide">
          {PROBLEM.words.map((word, i) =>
            i === PROBLEM.blankIndex ? (
              <span key={i} className="inline-block align-bottom mx-1">
                <span
                  className={`inline-block border-b-2 transition-colors text-center font-semibold
                    ${quizActive && selectedChoice === correctId ? 'border-green-400 text-green-600'
                    : quizActive && selectedChoice && selectedChoice !== correctId ? 'border-red-400'
                    : 'border-cr-accent'}
                  `}
                  style={{ minWidth: 160 }}
                >
                  {quizActive ? PROBLEM.correctAnswer : '\u00a0'}
                </span>
              </span>
            ) : (
              <span key={i}>{word} </span>
            )
          )}
        </p>

        {/* Canvas — 항상 표시, await-draw 단계에서 그리기 감지 */}
        <CanvasOverlay
          tool={drawingTool}
          color={drawingColor}
          onFirstStroke={phase === 'await-draw' ? onFirstStroke : undefined}
          clearTrigger={clearCanvasTrigger}
        />
      </div>

      {/* 선택지 — quiz / done 단계에서만 활성화 */}
      <div className={`grid grid-cols-2 gap-3 ${!quizActive ? 'pointer-events-none' : ''}`}>
        {PROBLEM.choices.map(({ id, text }) => {
          const isSelected = selectedChoice === id
          const isCorrect  = id === correctId

          return (
            <button
              key={id}
              onClick={() => quizActive && !selectedChoice && onChoiceSelect(id)}
              disabled={!quizActive || !!selectedChoice}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all
                ${!quizActive
                  ? 'border-ybm-border bg-white cursor-default'
                  : !selectedChoice
                  ? 'border-ybm-border bg-white hover:border-cr-accent hover:bg-cr-panel/40 active:scale-[0.98] cursor-pointer'
                  : isSelected && isCorrect  ? 'border-green-400 bg-green-50'
                  : isSelected && !isCorrect ? 'border-red-400 bg-red-50'
                  : isCorrect               ? 'border-green-300 bg-green-50/40'
                  : 'border-ybm-border bg-white opacity-40'}
              `}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0
                ${isSelected && isCorrect  ? 'bg-green-400 text-white'
                : isSelected && !isCorrect ? 'bg-red-400 text-white'
                : selectedChoice && isCorrect ? 'bg-green-300 text-white'
                : 'bg-ybm-bg text-ybm-text-sub'}
              `}>{id}</span>
              <span className={`text-base font-medium flex-1
                ${isSelected && isCorrect  ? 'text-green-700'
                : isSelected && !isCorrect ? 'text-red-600'
                : selectedChoice && isCorrect ? 'text-green-600'
                : 'text-ybm-text'}
              `}>{text}</span>
              {selectedChoice && isSelected && (
                isCorrect
                  ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l4 4 6-7" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 5l8 8M13 5l-8 8" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round"/></svg>
              )}
              {selectedChoice && !isSelected && isCorrect && (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l4 4 6-7" stroke="#86efac" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          )
        })}
      </div>

      {/* 안내 텍스트 */}
      <p className="text-ybm-text-sub text-xs text-center">
        {phase === 'await-draw'
          ? '필기 도구로 문장에 밑줄을 그으면 다음 힌트가 나와요.'
          : phase === 'quiz'
          ? '선택지를 탭하거나 우측 입력창으로 답하세요.'
          : phase === 'done'
          ? '강사에게 추가로 질문할 수 있어요.'
          : '강사의 질문에 음성 또는 텍스트로 답해 보세요.'}
      </p>

      {/* 이전/다음 문제 네비게이션 */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all
            ${currentIndex === 0
              ? 'border-ybm-border text-ybm-text-sub bg-ybm-bg cursor-not-allowed opacity-40'
              : 'border-ybm-border text-ybm-text bg-white hover:bg-ybm-bg active:scale-95'}
          `}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          이전 문제
        </button>

        {/* 진행 표시 */}
        <span className="text-xs text-ybm-text-sub font-medium">
          {currentIndex + 1} / {totalProblems}
        </span>

        <button
          onClick={() => {
            if (currentIndex >= totalProblems - 1) {
              alert('마지막 문제입니다. 준비 중인 문제예요!')
              return
            }
            onNext()
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-cr-accent/40 text-cr-accent bg-cr-accent/5 hover:bg-cr-accent/10 active:scale-95 transition-all"
        >
          다음 문제
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
