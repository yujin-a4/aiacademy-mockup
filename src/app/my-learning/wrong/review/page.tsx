'use client'
import { useWrongAnswerStore, WrongAnswer, SCAFFOLDING } from '@/store/wrongAnswerStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { track, secSince } from '@/lib/analytics'
import { useDrawingTool, DrawingOverlay, DrawToggleButton } from '@/components/DrawingOverlay'
import { useFontSettingsStore, FONT_SIZE_CLASSES } from '@/store/fontSettingsStore'
import FontSettingsController from '@/components/FontSettingsController'

const LABELS = ['A', 'B', 'C', 'D']

const INST_NAME: Record<string, string> = { park_hyewon: '박혜원', yun_daeun: '윤다은', lee_doyun: '이도윤', seo_jian: '서지안', oh_jungja: '오정자' }
const INST_COLOR: Record<string, { bg: string; tc: string; border: string }> = {
  park_hyewon:  { bg: '#FEF3C7', tc: '#B45309', border: '#FDE68A' },
  yun_daeun:    { bg: '#EFF6FF', tc: '#2563EB', border: '#C7D2FE' },
  lee_doyun:    { bg: '#F0FDF4', tc: '#059669', border: '#BBF7D0' },
  seo_jian:     { bg: '#F5F3FF', tc: '#7C3AED', border: '#DDD6FE' },
  oh_jungja:    { bg: '#FFF1F2', tc: '#BE123C', border: '#FECDD3' },
}

function ReviewInner() {
  const { wrongAnswers } = useWrongAnswerStore()
  const { selectedInstructor: instructor } = useOnboardingStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { fontSize, fontType } = useFontSettingsStore()
  const [showSettings, setShowSettings] = useState(false)

  const partId   = searchParams.get('partId')
  const category = searchParams.get('category')

  const questions: WrongAnswer[] = useMemo(() => {
    let filtered = [...wrongAnswers]
    if (partId)   filtered = filtered.filter(w => w.partId === partId)
    if (category) filtered = filtered.filter(w => w.category === category)
    return filtered
  }, [wrongAnswers, partId, category])

  const [index, setIndex]       = useState(0)
  const [chosen, setChosen]     = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [done, setDone]         = useState(false)
  /* 연필을 든 채로 답을 고른다(구현 중 메모 75행) — 다른 풀이 화면과 같게 맞춘다.
     여기는 캔버스가 화면 전체를 덮어서(bounds 없음) 안 켜면 보기가 통째로 안 눌린다. */
  const drawing = useDrawingTool({ tapThrough: true })

  /* ── 측정 (GA) ──
     오답을 강사와 다시 보는 단계는 **얼마나 오래 붙잡고 있는지**가 곧 스캐폴딩이 먹히는지의 신호다.
     들어온 시각을 잡아 두고, 끝냈을 때 소요 시간과 정답 수를 남긴다. */
  const startedAtRef = useRef(Date.now())
  const doneSentRef = useRef(false)
  useEffect(() => {
    track('review_started', {
      count: questions.length,
      part: partId ?? undefined,
      category: category ?? undefined,
      instructor: instructor ?? undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!done || doneSentRef.current) return
    doneSentRef.current = true
    track('review_finished', {
      count: questions.length,
      correct: correctCount,
      elapsed_sec: secSince(startedAtRef.current),
      part: partId ?? undefined,
      category: category ?? undefined,
    })
  }, [done, correctCount, questions.length, partId, category])

  const inst      = instructor ?? 'park_hyewon'
  const instColor = INST_COLOR[inst] ?? INST_COLOR.park_hyewon

  const titleLabel = category
    ? `${category} 집중 복습`
    : partId
    ? `${questions[0]?.partLabel ?? ''} 오답 복습`
    : '전체 오답 복습'

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-4 font-sans text-[#6B7280] px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p className="text-[#1C1B33] font-bold text-[16px]">복습할 오답이 없어요</p>
        <p className="text-[13px] text-center">해당 유형의 오답이 없거나 이미 모두 삭제됐어요</p>
        <Link href="/my-learning?tab=wrong" className="mt-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl font-semibold text-[14px]">
          오답노트로 돌아가기
        </Link>
      </div>
    )
  }

  if (done) {
    const accuracy = Math.round((correctCount / questions.length) * 100)
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-5 font-sans px-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#60A5FA] to-[#2563EB] flex items-center justify-center shadow-lg shadow-[#2563EB]/30">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-[#1C1B33] font-black text-[22px]">복습 완료!</p>
          <p className="text-[#6B7280] text-[14px]">{questions.length}문제 중 <span className="text-[#2563EB] font-bold">{correctCount}개</span> 정답</p>
        </div>

        <div className="w-full max-w-[360px] bg-white border border-[#DBEAFE] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#1C1B33] font-bold text-[15px]">결과</p>
            <span className={`text-[13px] font-black ${accuracy >= 80 ? 'text-[#059669]' : accuracy >= 60 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
              {accuracy}%
            </span>
          </div>
          <div className="h-2 bg-[#DBEAFE] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${accuracy}%`,
                background: accuracy >= 80 ? '#059669' : accuracy >= 60 ? '#D97706' : '#DC2626',
              }}
            />
          </div>
          <p className="text-[#9CA3AF] text-[12px] mt-3 leading-relaxed">
            {accuracy >= 80
              ? '훌륭해요! 이 유형은 완벽히 이해했어요.'
              : accuracy >= 60
              ? '조금 더 연습하면 완벽해질 거예요.'
              : '틀린 문제를 오답노트에서 다시 확인해보세요.'}
          </p>
        </div>

        <div className="w-full max-w-[360px] space-y-2">
          <button
            onClick={() => { setIndex(0); setChosen(null); setCorrectCount(0); setDone(false) }}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3.5 rounded-2xl font-bold text-[15px] transition-colors"
          >
            다시 복습하기
          </button>
          <Link
            href="/my-learning?tab=wrong"
            className="block w-full text-center bg-white border border-[#DBEAFE] text-[#374151] py-3.5 rounded-2xl font-semibold text-[14px] hover:border-[#C7D2FE] transition-colors"
          >
            오답노트로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const item = questions[index]
  const scaffolding = item.category ? SCAFFOLDING[item.category] : null
  const answered = chosen !== null
  const isCorrect = chosen === item.correctAnswer

  const handleNext = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1)
      setChosen(null)
    } else {
      setDone(true)
    }
  }

  const sizeClasses = FONT_SIZE_CLASSES[fontSize] || FONT_SIZE_CLASSES.normal
  const fontStyleClass = fontType === 'serif' ? 'font-serif' : 'font-sans'

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans pb-32">
      {/* 헤더 */}
      <header className="px-6 pt-safe-4 pb-4 flex items-center gap-3 bg-[#F8FAFF] border-b border-[#DBEAFE]/30 sticky top-0 z-10">
        <button onClick={() => router.push('/my-learning?tab=wrong')} className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#1C1B33] font-bold text-[15px] truncate">{titleLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-[#DBEAFE] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-[#9CA3AF] shrink-0">{index + 1} / {questions.length}</span>
          </div>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="글자 크기"
            aria-expanded={showSettings}
            className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-bold transition-colors ${
              showSettings ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
              <path d="M4 20V7a3 3 0 0 1 3-3h1" /><path d="M13 20v-9a2 2 0 0 1 2-2h1" /><path d="M2 12h8" /><path d="M12 16h7" />
            </svg>
            가
          </button>
          {showSettings && (
            <>
              {/* 바깥을 누르면 접힌다 — 열어둔 패널이 문제를 가린 채 남으면 다시 버튼을
                  찾아 눌러야 한다. 화면 전체를 덮는 투명 판이 그 클릭을 받는다. */}
              <button
                aria-label="글자 크기 닫기"
                onClick={() => setShowSettings(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 mt-2 w-64 shadow-xl z-50">
                <FontSettingsController />
              </div>
            </>
          )}
        </div>
        <DrawToggleButton drawMode={drawing.drawMode} toggleDraw={drawing.toggleDraw} />
      </header>
      <DrawingOverlay {...drawing} />

      <div className="px-5 max-w-[600px] mx-auto w-full space-y-3">
        {/* 지문 제목 */}
        {item.passageTitle && (
          <div className="bg-white border border-[#DBEAFE] rounded-2xl px-4 py-3">
            <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-1">지문</p>
            <p className={`text-[#374151] whitespace-pre-wrap ${fontStyleClass} ${sizeClasses.body}`}>{item.passageTitle}</p>
          </div>
        )}

        {/* 문제 */}
        <div className="bg-white border border-[#DBEAFE] rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-md">{item.partLabel}</span>
            {item.category && (
              <span className="text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded-md">{item.category}</span>
            )}
          </div>
          <p className={`text-[#1C1B33] font-medium ${fontStyleClass} ${sizeClasses.body}`}>{item.questionText}</p>
        </div>

        {/* 선택지 */}
        <div className="space-y-2">
          {item.choices.map((choice, i) => {
            const isCorrectOpt = i === item.correctAnswer
            const isChosen     = i === chosen
            const isWrong      = isChosen && !isCorrectOpt

            let style = 'bg-white border-[#E5E7EB] text-[#374151]'
            if (answered) {
              if (isCorrectOpt) style = 'bg-[#D1FAE5] border-[#10B981] text-[#059669]'
              else if (isWrong) style = 'bg-[#FEE2E2] border-[#EF4444] text-[#DC2626]'
              else style = 'bg-white border-[#E5E7EB] text-[#9CA3AF]'
            } else if (isChosen) {
              style = 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
            }

            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => {
                  setChosen(i)
                  if (i === item.correctAnswer) setCorrectCount(c => c + 1)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${style} ${!answered ? 'hover:border-[#2563EB] hover:bg-[#EFF6FF] active:scale-[0.99]' : ''}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${
                  answered && isCorrectOpt ? 'bg-[#10B981] text-white' :
                  answered && isWrong      ? 'bg-[#EF4444] text-white' :
                  !answered && isChosen    ? 'bg-[#2563EB] text-white' :
                  'bg-[#F3F4F6] text-[#6B7280]'
                }`}>
                  {LABELS[i]}
                </span>
                <span className={`flex-1 font-medium ${fontStyleClass} ${sizeClasses.body}`}>{choice}</span>
                {answered && isCorrectOpt && <span className="text-[11px] font-bold text-[#059669] shrink-0">정답</span>}
                {answered && isWrong      && <span className="text-[11px] font-bold text-[#DC2626] shrink-0">내 선택</span>}
              </button>
            )
          })}
        </div>

        {/* 정답 후 피드백 */}
        {answered && (
          <div className="space-y-3 animate-fade-in">
            {/* 결과 배너 */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isCorrect ? 'bg-[#D1FAE5] border border-[#10B981]' : 'bg-[#FEE2E2] border border-[#EF4444]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
                {isCorrect
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </div>
              <p className={`text-[13px] font-bold ${isCorrect ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                {isCorrect ? '정답이에요!' : '틀렸어요. 해설을 확인하세요.'}
              </p>
            </div>

            {/* 해설 */}
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-4 py-3">
              <p className="text-[12px] font-bold text-[#DC2626] mb-1.5">오답 해설</p>
              <p className="text-[#374151] text-[13px] leading-relaxed">{item.explanation}</p>
            </div>

            {/* AI 스캐폴딩 힌트 */}
            {scaffolding && (
              <div className="rounded-2xl border-2 px-5 py-4" style={{ background: instColor.bg, borderColor: instColor.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-[11px] text-white shrink-0"
                    style={{ background: instColor.tc }}>
                    {INST_NAME[inst]?.[0] ?? 'A'}
                  </div>
                  <p className="text-[12px] font-bold" style={{ color: instColor.tc }}>{INST_NAME[inst] ?? '강사'} 선생님의 힌트</p>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: instColor.tc }}>{scaffolding}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      {answered && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#F8FAFF] via-[#F8FAFF] to-transparent animate-fade-in">
          <div className="max-w-[600px] mx-auto">
            <button
              onClick={handleNext}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-4 rounded-2xl font-bold text-[15px] transition-colors shadow-lg shadow-[#2563EB]/20"
            >
              {index < questions.length - 1 ? '다음 문제' : '복습 완료'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WrongReview() {
  return (
    <Suspense>
      <ReviewInner />
    </Suspense>
  )
}
