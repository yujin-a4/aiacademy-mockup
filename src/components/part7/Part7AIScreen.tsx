'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AIChatPanel from '@/components/part6/AIChatPanel'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import DrawingToolbar from '@/components/classroom/toolbar/DrawingToolbar'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'
import { PART7_SETS, DIRECTIONS, type Question, type Choice } from '@/data/part7Scenario'

export interface Part7AIEndResult {
  correct: number
  total: number
  results: boolean[]
}

interface Props { onEnd: (result: Part7AIEndResult) => void }

export default function Part7AIScreen({ onEnd }: Props) {
  const router = useRouter()
  const set = PART7_SETS[0]

  const [answers, setAnswers]     = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [drawing, setDrawing]     = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearTrigger, setClear]  = useState(0)

  const canvasRef   = useRef<HTMLCanvasElement | null>(null)
  const passageRef  = useRef<HTMLDivElement | null>(null)
  const [isUserDrawing, setIsUserDrawing] = useState(false)

  const handleSelect = useCallback((qNum: number, id: string) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qNum]: id }))
  }, [submitted])

  const allAnswered  = set.questions.every((q) => answers[q.number])
  const correctCount = submitted
    ? set.questions.filter((q) => answers[q.number] === q.correct).length
    : 0

  const getCanvasImage = useCallback(async (): Promise<{ base64: string; hint: string } | null> => {
    const annotationCanvas = canvasRef.current
    const passageEl = passageRef.current
    if (!annotationCanvas || !passageEl) return null

    const actx = annotationCanvas.getContext('2d')
    if (!actx) return null
    const pixelData = actx.getImageData(0, 0, annotationCanvas.width, annotationCanvas.height).data

    let hasDrawing = false
    for (let i = 0; i < pixelData.length; i += 4) {
      if (pixelData[i + 3] > 0) { hasDrawing = true; break }
    }
    if (!hasDrawing) return null

    try {
      const { default: html2canvas } = await import('html2canvas')
      const textCapture = await html2canvas(passageEl, {
        useCORS: true,
        scale: 2.5,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => el === annotationCanvas,
      })

      const composite = document.createElement('canvas')
      composite.width  = textCapture.width
      composite.height = textCapture.height
      const cctx = composite.getContext('2d')!
      cctx.drawImage(textCapture, 0, 0)

      const scaleX = textCapture.width  / passageEl.offsetWidth
      const scaleY = textCapture.height / passageEl.offsetHeight
      cctx.save()
      cctx.scale(scaleX, scaleY)
      cctx.drawImage(annotationCanvas, 0, 0, passageEl.offsetWidth, passageEl.offsetHeight)
      cctx.restore()

      const base64 = composite.toDataURL('image/png').replace('data:image/png;base64,', '')
      return { base64, hint: '지문' }
    } catch {
      return null
    }
  }, [])

  return (
    <div className="h-dvh flex flex-col bg-[#F5F7FA] overflow-hidden">

      {/* Top nav */}
      <header className="shrink-0 bg-white border-b border-ybm-border h-14 flex items-center px-4 gap-3">
        <button onClick={() => router.push('/lessons')} className="p-1 text-ybm-text-sub hover:text-ybm-text transition-colors shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 16l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div>
            <p className="text-xs font-black text-[#0EA5E9] leading-none">PART 7</p>
            <p className="text-sm font-black text-[#1A2B4B] leading-tight">장문 독해</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 ml-1">테스트</span>
        </div>
        {submitted && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm text-ybm-text-sub">결과</span>
            <span className="text-xl font-black text-[#0EA5E9]">{correctCount}</span>
            <span className="text-sm text-ybm-text-sub">/ {set.questions.length}</span>
          </div>
        )}
        <button onClick={() => onEnd({ correct: correctCount, total: set.questions.length, results: set.questions.map((q) => answers[q.number] === q.correct) })} className="shrink-0 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
          종료
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* 왼쪽: 지문 + 문항 */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">

              {/* 지시문 */}
              <div className="bg-white rounded-2xl border border-ybm-border shadow-sm px-5 py-4">
                <span className="bg-[#0EA5E9] text-white text-xs font-bold px-3 py-0.5 rounded-full">지시문</span>
                <p className="text-xs text-ybm-text-sub mt-2 leading-relaxed">{DIRECTIONS}</p>
                <p className="text-sm font-semibold text-[#1A2B4B] mt-2">
                  {set.questionRange} refer to the following {set.passageType}.
                </p>
              </div>

              {/* 지문 카드 (캔버스 오버레이 포함) */}
              <div
                ref={passageRef}
                className="bg-white rounded-2xl border border-ybm-border shadow-sm px-5 py-4 relative overflow-hidden"
              >
                <p className="text-sm leading-relaxed text-[#1A2B4B]">
                  <span className="font-bold">Used Car For Sale.</span>
                  {set.passage.replace('Used Car For Sale.', '')}
                </p>
                <CanvasOverlay
                  ref={canvasRef}
                  tool={drawing.tool}
                  color={drawing.color}
                  clearTrigger={clearTrigger}
                  onDrawStart={() => setIsUserDrawing(true)}
                  onStrokeEnd={() => setIsUserDrawing(false)}
                />
              </div>

              {/* 문항 카드들 */}
              <div className="flex flex-col gap-3">
                {set.questions.map((q) => (
                  <QuestionCard
                    key={q.number}
                    q={q}
                    selected={answers[q.number] ?? null}
                    onSelect={(id) => handleSelect(q.number, id)}
                    submitted={submitted}
                  />
                ))}
              </div>

              {/* 정답 확인 */}
              {!submitted ? (
                <button
                  onClick={() => setSubmitted(true)}
                  disabled={!allAnswered}
                  className={`w-full py-3 rounded-2xl font-bold text-base transition-all active:scale-95
                    ${allAnswered
                      ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  정답 확인
                </button>
              ) : (
                <div className="bg-white rounded-2xl border border-ybm-border p-4 text-center">
                  <p className="text-sm text-ybm-text-sub">
                    {correctCount === set.questions.length
                      ? `완벽해요! ${set.questions.length}문제 모두 정답입니다.`
                      : `${correctCount}/${set.questions.length} 정답 — AI 튜터에게 틀린 문제를 물어보세요!`}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* 오른쪽: AI 채팅 패널 */}
        <aside className="w-[320px] xl:w-[360px] shrink-0 p-4 flex flex-col min-h-0">
          <AIChatPanel
            answers={answers}
            getCanvasImage={getCanvasImage}
            isUserDrawing={isUserDrawing}
            persona="p7tutor"
            initialMessage="147, 148번 풀어봐. 모르는 거 있으면 물어봐."
            quickQuestions={['147번 힌트 줘', '148번 왜 D야?', 'going overseas 뜻이 뭐야?']}
          />
        </aside>

      </div>

      {/* 하단 필기 툴바 */}
      <div className="shrink-0 border-t border-ybm-border bg-white">
        <div className="flex items-center px-4 py-3 gap-2">
          <DrawingToolbar
            onChange={setDrawing}
            onClearAll={() => setClear((n) => n + 1)}
          />
        </div>
      </div>

    </div>
  )
}

/* ── 문항 카드 ── */
function QuestionCard({
  q, selected, onSelect, submitted,
}: {
  q: Question
  selected: string | null
  onSelect: (id: string) => void
  submitted: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-ybm-border shadow-sm p-4">
      <p className="text-sm font-bold text-[#1A2B4B] mb-3 leading-snug">
        <span className="text-[#0EA5E9] mr-1.5">{q.number}.</span>
        {q.text}
      </p>
      <div className="flex flex-col gap-2">
        {q.choices.map((choice: Choice) => {
          const isSel     = selected === choice.id
          const isCorrect = choice.id === q.correct
          const showGreen = submitted && isCorrect
          const showRed   = submitted && isSel && !isCorrect

          let cls = 'bg-white border border-ybm-border text-[#1A2B4B] hover:bg-[#EFF6FF] hover:border-[#0EA5E9] hover:text-[#0EA5E9]'
          if (!submitted && isSel) cls = 'bg-[#EFF6FF] border border-[#0EA5E9] text-[#0EA5E9]'
          else if (showGreen)      cls = 'bg-[#DCFCE7] border border-green-400 text-green-700'
          else if (showRed)        cls = 'bg-[#FEE2E2] border border-red-400 text-red-600'

          let circleCls = 'border-ybm-border text-ybm-text-sub'
          if (!submitted && isSel) circleCls = 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
          else if (showGreen)      circleCls = 'border-green-500 bg-green-500 text-white'
          else if (showRed)        circleCls = 'border-red-400 bg-red-400 text-white'

          return (
            <button
              key={choice.id}
              onClick={() => onSelect(choice.id)}
              disabled={submitted}
              className={`flex items-center gap-2.5 text-left rounded-xl px-3 py-2.5 transition-all active:scale-[0.98] ${cls}
                ${submitted ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[11px] font-bold ${circleCls}`}>
                {choice.id}
              </span>
              <span className="text-sm">{choice.text}</span>
            </button>
          )
        })}
      </div>
      {submitted && (
        <div className="mt-3 bg-[#F0F9FF] border border-[#0EA5E9]/30 rounded-xl px-3 py-2.5">
          <p className="text-xs font-bold text-[#0EA5E9] mb-0.5">해설</p>
          <p className="text-xs text-[#1A2B4B] leading-relaxed">{q.explanation}</p>
        </div>
      )}
    </div>
  )
}
