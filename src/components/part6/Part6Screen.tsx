'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AIChatPanel from './AIChatPanel'
import CanvasOverlay from '@/components/classroom/CanvasOverlay'
import DrawingToolbar from '@/components/classroom/toolbar/DrawingToolbar'
import type { DrawingState } from '@/components/classroom/toolbar/DrawingToolbar'
import {
  P6_SETS,
  type P6Question,
} from '@/data/part6Scenario'

export interface Part6EndResult {
  correct: number
  total: number
  results: boolean[]
}

interface Props { onEnd: (result: Part6EndResult) => void }

export default function Part6Screen({ onEnd }: Props) {
  const router = useRouter()
  const [setIndex, setSetIndex]   = useState(0)
  const [answers, setAnswers]     = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [drawing, setDrawing]     = useState<DrawingState>({ tool: 'pen', color: '#EF4444' })
  const [clearTrigger, setClear]  = useState(0)

  const set = P6_SETS[setIndex]

  const goToSet = (idx: number) => {
    setSetIndex(idx)
    setAnswers({})
    setSubmitted(false)
    setClear((n) => n + 1)
  }

  const canvasRef        = useRef<HTMLCanvasElement | null>(null)
  const passageRef       = useRef<HTMLDivElement | null>(null)
  const drawTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [drawingVersion, setDrawingVersion] = useState(0)
  const [isUserDrawing,  setIsUserDrawing]  = useState(false)

  const handleDrawStart = useCallback(() => setIsUserDrawing(true), [])

  /** 획 끝날 때마다 호출 — 1.5초 debounce 후 drawingVersion 증가 */
  const handleStrokeEnd = useCallback(() => {
    setIsUserDrawing(false)
    if (drawTimerRef.current) clearTimeout(drawTimerRef.current)
    drawTimerRef.current = setTimeout(() => {
      setDrawingVersion((v) => v + 1)
    }, 1500)
  }, [])

  const handleSelect = useCallback((qNum: number, id: string) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qNum]: id }))
  }, [submitted])

  const allAnswered  = set.questions.every((q) => answers[q.number])
  const correctCount = submitted
    ? set.questions.filter((q) => answers[q.number] === q.correct).length
    : 0

  const getEndResult = (): Part6EndResult => submitted
    ? {
        correct: correctCount,
        total: set.questions.length,
        results: set.questions.map((q) => answers[q.number] === q.correct),
      }
    : { correct: 0, total: set.questions.length, results: [] }

  /** 지문 텍스트 + 필기를 수동 합성 캡처 + 필기 위치 힌트 생성
   *  html2canvas는 canvas 오버레이 픽셀을 클론 시 잃어버리므로
   *  텍스트만 캡처 후 annotation 레이어를 직접 합성 */
  const getCanvasImage = useCallback(async (): Promise<{ base64: string; hint: string } | null> => {
    const annotationCanvas = canvasRef.current
    const passageEl = passageRef.current
    if (!annotationCanvas || !passageEl) return null

    // 필기 여부 확인 + 바운딩박스 계산
    const actx = annotationCanvas.getContext('2d')
    if (!actx) return null
    const pixelData = actx.getImageData(0, 0, annotationCanvas.width, annotationCanvas.height).data

    let minY = annotationCanvas.height, maxY = 0
    let hasDrawing = false
    for (let i = 0; i < pixelData.length; i += 4) {
      if (pixelData[i + 3] > 0) {
        hasDrawing = true
        const py = Math.floor((i / 4) / annotationCanvas.width)
        if (py < minY) minY = py
        if (py > maxY) maxY = py
      }
    }
    if (!hasDrawing) return null

    // 필기 중심 Y 비율로 단락 힌트 생성
    const centerYRel = (minY + maxY) / 2 / annotationCanvas.height
    const hints = set.passageHints
    const hint  = (hints.find((h) => centerYRel < h.maxRel) ?? hints[hints.length - 1]).text

    try {
      const { default: html2canvas } = await import('html2canvas')

      // canvas를 숨기지 않고 ignoreElements로 제외 → ResizeObserver 오작동 방지
      const textCapture = await html2canvas(passageEl, {
        useCORS: true,
        scale: 2.5,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => el === annotationCanvas,
      })

      // composite canvas에 텍스트 + 필기 합성
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
      return { base64, hint }
    } catch {
      return null
    }
  }, [set])

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
            <p className="text-xs font-black text-[#6366F1] leading-none">PART 6</p>
            <p className="text-sm font-black text-[#1A2B4B] leading-tight">장문 빈칸 채우기</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 ml-1">테스트</span>
        </div>
        {submitted && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm text-ybm-text-sub">결과</span>
            <span className="text-xl font-black text-[#6366F1]">{correctCount}</span>
            <span className="text-sm text-ybm-text-sub">/ {set.questions.length}</span>
          </div>
        )}
        <button onClick={() => onEnd(getEndResult())} className="shrink-0 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
          종료
        </button>
      </header>

      {/* Main */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* 왼쪽: 지문 + 문항 */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* 스크롤 영역 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">

              {/* 지시문 */}
              <div className="bg-white rounded-2xl border border-ybm-border shadow-sm px-5 py-4">
                <span className="bg-[#6366F1] text-white text-xs font-bold px-3 py-0.5 rounded-full">지시문</span>
                <p className="text-xs text-ybm-text-sub mt-2 leading-relaxed">
                  In this part you will read a set of texts. Each text is followed by several questions. Select the best answer for each question and mark the letter (A), (B), (C), or (D).
                </p>
                <p className="text-sm font-semibold text-[#1A2B4B] mt-2">{set.intro}</p>
              </div>

              {/* 지문 카드 (캔버스 오버레이 포함) */}
              <div
                ref={passageRef}
                className="bg-white rounded-2xl border border-ybm-border shadow-sm px-5 py-4 relative overflow-hidden"
              >
                <div className="text-xs text-ybm-text-sub mb-3 flex flex-col gap-0.5 select-none">
                  <span><b>From:</b> {set.meta.from}</span>
                  <span><b>To:</b> {set.meta.to}</span>
                  <span><b>Date:</b> {set.meta.date}</span>
                  <span><b>Subject:</b> {set.meta.subject}</span>
                </div>
                <div className="border-t border-ybm-border pt-3 text-sm leading-relaxed text-[#1A2B4B]">
                  {set.segments.map((seg, i) => {
                    if (seg.blankNumber) {
                      const q = set.questions.find((q) => q.number === seg.blankNumber)!
                      const ans = answers[seg.blankNumber]
                      const choice = q.choices.find((c) => c.id === ans)
                      const isCorrect = submitted && ans === q.correct
                      const isWrong   = submitted && ans && ans !== q.correct
                      return (
                        <span
                          key={i}
                          className={`inline-block mx-1 px-2 py-0.5 rounded-lg font-semibold text-sm border transition-all
                            ${isCorrect ? 'bg-green-100 border-green-400 text-green-700' :
                              isWrong   ? 'bg-red-100 border-red-400 text-red-600' :
                              ans       ? 'bg-[#EDE9FE] border-[#6366F1] text-[#6366F1]' :
                                          'bg-gray-100 border-dashed border-gray-300 text-gray-400 min-w-[100px] text-center'}
                          `}
                        >
                          {ans ? `(${ans}) ${choice?.text}` : `${seg.blankNumber}`}
                        </span>
                      )
                    }
                    return <span key={i} className="whitespace-pre-line">{seg.text}</span>
                  })}
                </div>

                {/* 필기 캔버스 오버레이 */}
                <CanvasOverlay
                  ref={canvasRef}
                  tool={drawing.tool}
                  color={drawing.color}
                  clearTrigger={clearTrigger}
                  onDrawStart={handleDrawStart}
                  onStrokeEnd={handleStrokeEnd}
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
                      ? 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm'
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
          />
        </aside>

      </div>

      {/* 하단 필기 툴바 */}
      <div className="shrink-0 border-t border-ybm-border bg-white">
        <div className="flex items-center px-4 py-3 gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            <DrawingToolbar
              onChange={setDrawing}
              onClearAll={() => setClear((n) => n + 1)}
            />
          </div>
          <div className="h-5 w-px bg-ybm-border shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => goToSet(setIndex - 1)}
              disabled={setIndex === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                ${setIndex === 0 ? 'opacity-30 cursor-not-allowed text-ybm-text-sub' : 'text-ybm-text hover:bg-ybm-bg'}`}
            >
              ← 이전
            </button>
            <span className="text-xs text-ybm-text-sub tabular-nums px-1">
              {setIndex + 1} / {P6_SETS.length}
            </span>
            <button
              onClick={() => goToSet(setIndex + 1)}
              disabled={setIndex === P6_SETS.length - 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                ${setIndex === P6_SETS.length - 1 ? 'opacity-30 cursor-not-allowed text-ybm-text-sub' : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'}`}
            >
              다음 →
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

/* ── 문항 카드 ── */
function QuestionCard({
  q, selected, onSelect, submitted,
}: {
  q: P6Question
  selected: string | null
  onSelect: (id: string) => void
  submitted: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-ybm-border shadow-sm p-4">
      <p className="text-sm font-bold text-[#1A2B4B] mb-3">
        <span className="text-[#6366F1] mr-1">{q.number}.</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {q.choices.map((choice) => {
          const isSel     = selected === choice.id
          const isCorrect = choice.id === q.correct
          const showGreen = submitted && isCorrect
          const showRed   = submitted && isSel && !isCorrect

          let cls = 'bg-white border border-ybm-border text-[#1A2B4B] hover:bg-[#F5F3FF] hover:border-[#6366F1] hover:text-[#6366F1]'
          if (!submitted && isSel) cls = 'bg-[#EDE9FE] border border-[#6366F1] text-[#6366F1]'
          else if (showGreen)      cls = 'bg-[#DCFCE7] border border-green-400 text-green-700'
          else if (showRed)        cls = 'bg-[#FEE2E2] border border-red-400 text-red-600'

          let circleCls = 'border-ybm-border text-ybm-text-sub'
          if (!submitted && isSel) circleCls = 'border-[#6366F1] bg-[#6366F1] text-white'
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
        <div className="mt-3 bg-[#F5F3FF] border border-violet-200 rounded-xl px-3 py-2.5">
          <p className="text-xs font-bold text-[#6366F1] mb-0.5">해설</p>
          <p className="text-xs text-[#1A2B4B] leading-relaxed">{q.grammarPoint}</p>
        </div>
      )}
    </div>
  )
}
