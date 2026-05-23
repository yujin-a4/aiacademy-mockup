'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { P5_QUESTIONS, P6_PASSAGES, P7_PASSAGES } from '@/data/rcData'
import type { RCChoices } from '@/data/rcData'
import ExitConfirmModal from '@/components/ExitConfirmModal'
import { useWrongAnswerStore } from '@/store/wrongAnswerStore'
import { useDrawingTool, DrawingOverlay, DrawToggleButton } from '@/components/DrawingOverlay'

const PART_INFO: Record<string, { name: string; label: string }> = {
  p5: { name: '단문 공란', label: 'Part 5' },
  p6: { name: '장문 공란', label: 'Part 6' },
  p7: { name: '장문 독해', label: 'Part 7' },
}

const LABELS = ['A', 'B', 'C', 'D']

interface PracticeItem {
  choices: RCChoices
  answer: number
  explanation: string
  category?: string
  sentence?: string
  blankNum?: number
  question?: string
}

function P5Sentence({ sentence, filledWord }: { sentence: string; filledWord?: string }) {
  const parts = sentence.split('_______')
  return (
    <p className="text-[15px] text-[#1C1B33] leading-[1.9] font-medium">
      {parts[0]}
      <span className={`inline-block border-b-2 min-w-[110px] text-center font-bold mx-1 px-2 py-0.5 rounded-sm transition-colors ${
        filledWord ? 'border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]' : 'border-[#D1D5DB] text-transparent'
      }`}>
        {filledWord || '　'}
      </span>
      {parts[1]}
    </p>
  )
}

function P6PassageView({ passage, currentBlankNum }: { passage: string; currentBlankNum: number }) {
  const lines = passage.split('\n')
  return (
    <div className="text-[13px] text-[#374151] leading-[1.8] space-y-0.5">
      {lines.map((line, lineIdx) => {
        if (!line) return <div key={lineIdx} className="h-2" />
        const parts = line.split(/(\(\d\)_+)/g)
        return (
          <p key={lineIdx}>
            {parts.map((part, j) => {
              const m = part.match(/^\((\d)\)(_+)$/)
              if (!m) return <span key={j}>{part}</span>
              const num = parseInt(m[1])
              return (
                <span key={j} className={`inline-block px-1.5 py-0.5 rounded text-[12px] font-bold mx-0.5 ${
                  num === currentBlankNum
                    ? 'bg-[#EFF6FF] text-[#2563EB] border-b-2 border-[#2563EB]'
                    : num < currentBlankNum
                      ? 'bg-[#F0FDF4] text-[#059669]'
                      : 'bg-[#F3F4F6] text-[#9CA3AF]'
                }`}>
                  ({num})
                </span>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}

export default function PartPracticePage() {
  const params = useParams()
  const partId = ((params?.partId as string) || '').toLowerCase()
  const router = useRouter()

  const { addWrongAnswer } = useWrongAnswerStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [evaluated, setEvaluated] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [showExitModal, setShowExitModal] = useState(false)

  const drawing = useDrawingTool()

  const partInfo = PART_INFO[partId]

  const items: PracticeItem[] = useMemo(() => {
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)

    if (partId === 'p5') {
      return shuffle(P5_QUESTIONS).map(q => ({
        choices: q.choices, answer: q.answer, explanation: q.explanation,
        category: q.category, sentence: q.sentence,
      }))
    }
    if (partId === 'p6') {
      const passage = P6_PASSAGES[Math.floor(Math.random() * P6_PASSAGES.length)]
      return shuffle(passage.questions.map(q => ({
        choices: q.choices, answer: q.answer, explanation: q.explanation,
        category: q.category, blankNum: q.blankNum,
      })))
    }
    if (partId === 'p7') {
      const passage = P7_PASSAGES[Math.floor(Math.random() * P7_PASSAGES.length)]
      return shuffle(passage.questions.map(q => ({
        choices: q.choices, answer: q.answer, explanation: q.explanation,
        question: q.question,
      })))
    }
    return []
  }, [partId])

  if (!partInfo || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#6B7280] font-sans">
        파트를 찾을 수 없습니다.
      </div>
    )
  }

  const isFinished = currentIndex >= items.length
  const current = items[currentIndex]

  const handleSelect = (idx: number) => { if (!evaluated) setSelected(idx) }
  const handleSubmit = () => {
    if (selected === null) return
    const isCorrect = selected === current.answer
    setResults(prev => [...prev, isCorrect])
    setEvaluated(true)

    if (!isCorrect) {
      const questionText =
        current.sentence
          ? current.sentence
          : current.question
            ? current.question
            : `빈칸 (${current.blankNum}) 에 들어갈 알맞은 것은?`

      addWrongAnswer({
        partId,
        partLabel: PART_INFO[partId]?.label ?? partId.toUpperCase(),
        questionText,
        choices: Array.from(current.choices),
        chosenAnswer: selected,
        correctAnswer: current.answer,
        category: current.category,
        explanation: current.explanation,
        passageTitle:
          partId === 'p6' ? P6_PASSAGES[0].title :
          partId === 'p7' ? P7_PASSAGES[0].title : undefined,
      })
    }
  }
  const handleNext = () => { setSelected(null); setEvaluated(false); setCurrentIndex(p => p + 1) }
  const handleRestart = () => { setCurrentIndex(0); setSelected(null); setEvaluated(false); setResults([]) }

  const BackArrow = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  )

  /* ── 결과 화면 ── */
  if (isFinished) {
    const correct = results.filter(Boolean).length
    const pct = Math.round((correct / items.length) * 100)
    const accentColor = pct >= 80 ? '#059669' : pct >= 60 ? '#B45309' : '#DC2626'
    const bgColor    = pct >= 80 ? '#D1FAE5' : pct >= 60 ? '#FEF9C3' : '#FEE2E2'
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans pb-10">
        <header className="px-6 py-4 flex items-center justify-between shrink-0">
          <button onClick={() => router.push('/my-learning?tab=part')} className="p-2 -ml-2 text-[#6B7280]">{BackArrow}</button>
          <div className="font-bold text-[#1C1B33] text-[15px]">{partInfo.label} · {partInfo.name} · 결과</div>
          <div className="w-8" />
        </header>
        <div className="px-6 max-w-[600px] mx-auto w-full mt-6">
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-[#DBEAFE] text-center">
            <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: bgColor }}>
              <span className="text-[28px] font-black" style={{ color: accentColor }}>{pct}%</span>
            </div>
            <h2 className="text-[20px] font-bold text-[#1C1B33] mb-1">연습 완료!</h2>
            <p className="text-[#6B7280] text-[14px]">{items.length}문제 중 {correct}개 정답</p>
            <div className="mt-6 space-y-2 text-left">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] ${r ? 'bg-[#F0FDF4]' : 'bg-[#FEF2F2]'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${r ? 'bg-[#10B981] text-white' : 'bg-[#EF4444] text-white'}`}>
                    {r ? '○' : '✕'}
                  </span>
                  <span className={`font-semibold ${r ? 'text-[#059669]' : 'text-[#DC2626]'}`}>Q{i + 1}</span>
                  <span className={r ? 'text-[#059669]' : 'text-[#DC2626]'}>{r ? '정답' : '오답'}</span>
                  {items[i].category && (
                    <span className="ml-auto text-[11px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-md">{items[i].category}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={handleRestart} className="flex-1 border-2 border-[#2563EB] text-[#2563EB] py-3 rounded-2xl font-bold text-[14px] hover:bg-[#EFF6FF] transition-colors">
                다시 풀기
              </button>
              <button onClick={() => router.push('/my-learning?tab=part')} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3 rounded-2xl font-bold text-[14px] transition-colors shadow-lg shadow-[#2563EB]/20">
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── 연습 화면 공통 요소 ── */
  const isCorrect = evaluated && selected === current.answer
  const isSplit = partId === 'p6' || partId === 'p7'

  const renderChoices = () => (
    <div className="space-y-2">
      {current.choices.map((choice, i) => {
        const isSelected = selected === i
        const showCorrect = evaluated && i === current.answer
        const showWrong = evaluated && isSelected && i !== current.answer
        return (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={evaluated}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
              showCorrect ? 'bg-[#D1FAE5] border-[#10B981]' :
              showWrong   ? 'bg-[#FEE2E2] border-[#EF4444]' :
              isSelected  ? 'bg-[#EFF6FF] border-[#2563EB]' :
              'bg-white border-[#E5E7EB] hover:border-[#C7D2FE] hover:bg-[#EFF6FF]'
            }`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${
              showCorrect ? 'bg-[#10B981] text-white' :
              showWrong   ? 'bg-[#EF4444] text-white' :
              isSelected  ? 'bg-[#2563EB] text-white' :
              'bg-[#F3F4F6] text-[#6B7280]'
            }`}>
              {LABELS[i]}
            </span>
            <span className={`text-[14px] font-medium ${
              showCorrect ? 'text-[#059669]' :
              showWrong   ? 'text-[#DC2626]' :
              isSelected  ? 'text-[#2563EB]' :
              'text-[#374151]'
            }`}>
              {choice}
            </span>
          </button>
        )
      })}
    </div>
  )

  const renderExplanation = () => evaluated ? (
    <div className={`rounded-2xl px-4 py-3 border ${isCorrect ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FEF2F2] border-[#FECACA]'}`}>
      <p className={`text-[12px] font-bold mb-1.5 ${isCorrect ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
        {isCorrect ? '정답입니다!' : `오답 — 정답: ${LABELS[current.answer]}`}
      </p>
      <p className="text-[#374151] text-[12px] leading-relaxed">{current.explanation}</p>
    </div>
  ) : null

  const renderButton = () => !evaluated ? (
    <button
      onClick={handleSubmit}
      disabled={selected === null}
      className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#D1D5DB] disabled:text-[#9CA3AF] text-white py-4 rounded-2xl font-bold text-[16px] transition-colors shadow-lg shadow-[#2563EB]/20"
    >
      정답 확인
    </button>
  ) : (
    <button
      onClick={handleNext}
      className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 rounded-2xl font-bold text-[16px] transition-colors shadow-lg shadow-[#2563EB]/20"
    >
      {currentIndex < items.length - 1 ? '다음 문제' : '결과 보기'}
    </button>
  )

  /* ── 연습 화면 렌더 ── */
  return (
    // 태블릿에서는 뷰포트 높이 고정, 모바일은 자연 스크롤
    <div className={`bg-[#F8FAFF] flex flex-col font-sans min-h-screen ${isSplit ? 'md:h-screen md:overflow-hidden' : ''}`}>
      <ExitConfirmModal
        isOpen={showExitModal}
        onContinue={() => setShowExitModal(false)}
        onExit={() => router.push('/my-learning?tab=part')}
      />

      <header className="px-6 py-4 flex items-center justify-between shrink-0 bg-[#F8FAFF]">
        <button onClick={() => setShowExitModal(true)} className="p-2 -ml-2 text-[#6B7280]">{BackArrow}</button>
        <div className="font-bold text-[#1C1B33] text-[15px]">{partInfo.label} · {partInfo.name}</div>
        <DrawToggleButton drawMode={drawing.drawMode} toggleDraw={drawing.toggleDraw} />
      </header>

      <DrawingOverlay {...drawing} />

      {/* 진행 바 */}
      <div className={`shrink-0 px-6 pb-3 mx-auto w-full ${isSplit ? 'md:px-8 md:max-w-none' : 'max-w-[600px]'}`}>
        <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
          <div className="bg-[#2563EB] h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} />
        </div>
        <p className="text-center text-[#6B7280] text-[12px] mt-2 font-medium">
          {partId === 'p6' ? `빈칸 ${current.blankNum} / ${items.length}` : `Question ${currentIndex + 1} of ${items.length}`}
        </p>
      </div>

      {/* ── P5: 세로 레이아웃 ── */}
      {partId === 'p5' && (
        <div className="px-6 max-w-[600px] mx-auto w-full pb-10 space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-[#DBEAFE]">
            {current.sentence && (
              <P5Sentence
                sentence={current.sentence}
                filledWord={selected !== null ? current.choices[selected] : undefined}
              />
            )}
          </div>
          {renderChoices()}
          {evaluated && <div>{renderExplanation()}</div>}
          <div>{renderButton()}</div>
        </div>
      )}

      {/* ── P6/P7: 태블릿 좌우 분할 / 모바일 세로 ── */}
      {isSplit && (
        <div className={`flex-1 min-h-0 px-4 md:px-6 mx-auto w-full pb-6 md:flex md:gap-5 ${isSplit ? 'md:max-w-none' : ''}`}>

          {/* LEFT: 지문 영역 */}
          <div className="md:flex-1 md:min-w-0 flex flex-col min-h-0">
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-lg border border-[#DBEAFE] max-h-[40vh] md:max-h-none md:flex-1 md:overflow-y-auto overflow-y-auto">
              <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-3">
                {partId === 'p6' ? P6_PASSAGES[0].title : P7_PASSAGES[0].title}
              </p>
              {partId === 'p6' && current.blankNum !== undefined && (
                <P6PassageView passage={P6_PASSAGES[0].passage} currentBlankNum={current.blankNum} />
              )}
              {partId === 'p7' && (
                <p className="text-[13px] text-[#374151] leading-[1.8] whitespace-pre-line">
                  {P7_PASSAGES[0].passage}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: 문제 + 선택지 + 버튼 */}
          <div className="mt-4 md:mt-0 md:w-[380px] md:shrink-0 md:flex md:flex-col md:min-h-0">
            <div className="md:flex-1 md:overflow-y-auto md:flex md:flex-col">
              {/* 문제 카드 */}
              <div className="bg-white rounded-3xl p-5 shadow-lg border border-[#DBEAFE] mb-3">
                {partId === 'p6' && current.blankNum !== undefined && (
                  <p className="text-[13px] font-semibold text-[#374151]">
                    빈칸 ({current.blankNum})에 들어갈 가장 적절한 것은?
                  </p>
                )}
                {partId === 'p7' && (
                  <p className="text-[14px] font-semibold text-[#1C1B33] leading-relaxed">
                    {current.question}
                  </p>
                )}
              </div>

              {/* 선택지 */}
              {renderChoices()}

              {/* 해설 */}
              {evaluated && <div className="mt-3">{renderExplanation()}</div>}

              {/* 버튼 */}
              <div className="mt-4 md:mt-auto md:pt-4">
                {renderButton()}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
