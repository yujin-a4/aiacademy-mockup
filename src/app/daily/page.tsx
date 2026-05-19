'use client'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const LABELS = ['A', 'B', 'C', 'D']

interface DailyQuestion {
  id: number
  sentence: string
  choices: string[]
  answer: number
  category: string
  explanation: string
}

const ALL_QUESTIONS: DailyQuestion[] = [
  // Set 0
  {
    id: 1,
    sentence: 'The manager asked all employees to submit their expense reports ___ the end of the month.',
    choices: ['until', 'by', 'during', 'within'],
    answer: 1,
    category: '전치사',
    explanation: '"by + 기한"은 특정 시점까지 완료를 의미해요. "until"은 상태 지속, "during"은 기간 내내를 뜻합니다.',
  },
  {
    id: 2,
    sentence: 'The annual report was ___ reviewed by the accounting department before publication.',
    choices: ['thorough', 'thoroughly', 'thoroughness', 'more thorough'],
    answer: 1,
    category: '품사',
    explanation: '동사(reviewed)를 수식하려면 부사가 필요해요. "thoroughly"가 부사 형태입니다.',
  },
  {
    id: 3,
    sentence: '___ the heavy rain, the outdoor event was held as scheduled.',
    choices: ['Although', 'Despite', 'However', 'Even if'],
    answer: 1,
    category: '전치사 vs. 접속사',
    explanation: '"Despite"는 전치사로 뒤에 명사구가 와요. "Although/Even if"는 접속사로 뒤에 절이 필요합니다.',
  },
  // Set 1
  {
    id: 4,
    sentence: 'The new product line ___ formally introduced at the trade show next month.',
    choices: ['will be', 'has been', 'was being', 'had been'],
    answer: 0,
    category: '수동태',
    explanation: '"next month"가 미래 시제의 단서입니다. 수동태 미래형은 "will be + p.p." 형태예요.',
  },
  {
    id: 5,
    sentence: 'Customer ___ has improved significantly since the new service policy was implemented.',
    choices: ['satisfy', 'satisfying', 'satisfied', 'satisfaction'],
    answer: 3,
    category: '품사',
    explanation: '주어 자리에는 명사가 와야 해요. "satisfaction"이 명사 형태입니다.',
  },
  {
    id: 6,
    sentence: 'The committee has not yet decided ___ to approve the proposed budget increase.',
    choices: ['that', 'what', 'whether', 'which'],
    answer: 2,
    category: '명사절',
    explanation: '"decided whether to do"는 "~할지 결정하다" 의미. whether는 to 부정사와 자주 쓰입니다.',
  },
  // Set 2
  {
    id: 7,
    sentence: 'All participants are ___ to bring a valid ID to the registration desk.',
    choices: ['required', 'requiring', 'requirement', 'require'],
    answer: 0,
    category: '수동태',
    explanation: '"be required to do"는 "~하도록 요구되다" 의미의 수동태 표현입니다.',
  },
  {
    id: 8,
    sentence: 'The renovation project is expected to ___ several months to complete.',
    choices: ['spend', 'cost', 'take', 'use'],
    answer: 2,
    category: '어휘',
    explanation: '시간이 "걸리다"는 "take + 시간"으로 표현해요. "spend"는 사람 주어와 쓰입니다.',
  },
  {
    id: 9,
    sentence: 'Please make sure that all equipment ___ properly before leaving the laboratory.',
    choices: ['stored', 'is stored', 'stores', 'storing'],
    answer: 1,
    category: '수동태',
    explanation: 'that절의 주어 "equipment"는 "보관되는" 대상이므로 수동태 "is stored"가 적절합니다.',
  },
  // Set 3
  {
    id: 10,
    sentence: 'The CEO ___ a speech at the company anniversary dinner last Friday.',
    choices: ['delivered', 'was delivering', 'has delivered', 'delivers'],
    answer: 0,
    category: '시제',
    explanation: '"last Friday"는 과거 시제의 단서예요. 단순 과거형 "delivered"가 정답입니다.',
  },
  {
    id: 11,
    sentence: 'The client requested that the invoice ___ sent by the end of business today.',
    choices: ['be', 'is', 'was', 'will be'],
    answer: 0,
    category: '동사형',
    explanation: '요청/제안 동사(requested) 뒤 that절에는 동사원형(be)이 와요. should가 생략된 형태입니다.',
  },
  {
    id: 12,
    sentence: 'The marketing team is working ___ to meet the upcoming product launch deadline.',
    choices: ['hard', 'hardly', 'hardness', 'harder'],
    answer: 0,
    category: '부사',
    explanation: '"work hard"는 "열심히 일하다". "hardly"는 "거의 ~않다"로 전혀 다른 의미입니다.',
  },
  // Set 4
  {
    id: 13,
    sentence: '___ completing the online application, candidates will be contacted within five business days.',
    choices: ['After', 'Following', 'Once', 'Upon'],
    answer: 3,
    category: '전치사',
    explanation: '"Upon + 동명사"는 "~하자마자, ~한 후에"를 의미하는 격식체 전치사 표현입니다.',
  },
  {
    id: 14,
    sentence: 'The new employee handbook contains ___ information about company policies and procedures.',
    choices: ['comprehensive', 'comprehensively', 'comprehend', 'comprehension'],
    answer: 0,
    category: '품사',
    explanation: '명사(information)를 수식하는 자리에는 형용사가 필요해요. "comprehensive"가 형용사 형태입니다.',
  },
  {
    id: 15,
    sentence: 'Employees who ___ the training session will receive a certificate of completion.',
    choices: ['completed', 'complete', 'completing', 'have completing'],
    answer: 1,
    category: '관계절',
    explanation: '주격 관계절에서 선행사 "Employees"(복수)에 맞는 복수 동사 "complete"이 정답입니다.',
  },
]

// 날짜 기반으로 오늘 문제 3개 선택 (같은 날 = 전체 유저 동일)
function getTodayQuestions(): DailyQuestion[] {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )
  const setsCount = Math.floor(ALL_QUESTIONS.length / 3)
  const setIndex = dayOfYear % setsCount
  return ALL_QUESTIONS.slice(setIndex * 3, setIndex * 3 + 3)
}

// 질문 ID + 날짜로 일관된 가짜 정답률 생성
function mockAccuracy(questionId: number): number {
  const day = new Date().getDate()
  return 42 + ((questionId * 13 + day * 7) % 43)
}

function formatDate(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function DailyPage() {
  const router = useRouter()
  const questions = useMemo(getTodayQuestions, [])
  const today = useMemo(() => new Date(), [])

  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [answers, setAnswers] = useState<{ chosen: number; correct: boolean }[]>([])
  const [done, setDone] = useState(false)

  const q = questions[index]
  const answered = chosen !== null
  const isCorrect = chosen === q?.answer
  const accuracy = q ? mockAccuracy(q.id) : 0

  const handleSelect = (i: number) => {
    if (answered) return
    setChosen(i)
  }

  const handleNext = () => {
    if (chosen === null) return
    const result = { chosen, correct: chosen === q.answer }
    const newAnswers = [...answers, result]
    setAnswers(newAnswers)
    if (index < questions.length - 1) {
      setIndex(index + 1)
      setChosen(null)
    } else {
      setDone(true)
    }
  }

  const correctCount = answers.filter(a => a.correct).length + (done && chosen !== null && chosen === questions[questions.length - 1].answer ? 1 : 0)
  const finalCorrect = answers.length === questions.length
    ? answers.filter(a => a.correct).length
    : correctCount

  // 완료 화면
  if (done) {
    const scoreMsg = finalCorrect === 3 ? '완벽해요! 🎉' : finalCorrect === 2 ? '잘 했어요!' : finalCorrect === 1 ? '조금 더 파이팅!' : '내일 다시 도전!'
    const avgAccuracy = Math.round(questions.reduce((s, q) => s + mockAccuracy(q.id), 0) / questions.length)

    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans">
        <header className="px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-[#6B7280]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div>
            <p className="text-[#1C1B33] font-bold text-[15px]">오늘의 데일리 챌린지</p>
            <p className="text-[#9CA3AF] text-[11px]">{formatDate(today)}</p>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 gap-6">
          {/* 점수 원 */}
          <div className="relative w-32 h-32">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#ECEAF5" strokeWidth="10"/>
              <circle cx="64" cy="64" r="56" fill="none"
                stroke={finalCorrect === 3 ? '#10B981' : finalCorrect >= 2 ? '#4F46E5' : '#F59E0B'}
                strokeWidth="10"
                strokeDasharray={`${Math.PI * 2 * 56}`}
                strokeDashoffset={`${Math.PI * 2 * 56 * (1 - finalCorrect / 3)}`}
                strokeLinecap="round"
                transform="rotate(-90 64 64)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[36px] font-black text-[#1C1B33] leading-none">{finalCorrect}</span>
              <span className="text-[13px] text-[#9CA3AF] font-medium">/ 3</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-[#1C1B33] font-black text-[22px]">{scoreMsg}</p>
            <p className="text-[#6B7280] text-[14px]">오늘 전체 유저 평균 정답률 <span className="text-[#4F46E5] font-bold">{avgAccuracy}%</span></p>
          </div>

          {/* 문제별 결과 */}
          <div className="w-full max-w-[400px] bg-white border border-[#ECEAF5] rounded-2xl p-4 space-y-3 shadow-sm">
            <p className="text-[#1C1B33] font-bold text-[13px] mb-1">문제별 결과</p>
            {questions.map((q, i) => {
              const a = i < answers.length ? answers[i] : null
              const correct = a?.correct ?? false
              return (
                <div key={q.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${correct ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
                    {correct
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#374151] text-[12px] font-medium truncate">Q{i + 1}. {q.category}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-[#ECEAF5] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4F46E5] rounded-full" style={{ width: `${mockAccuracy(q.id)}%` }}/>
                      </div>
                      <span className="text-[11px] text-[#9CA3AF] shrink-0">유저 {mockAccuracy(q.id)}% 정답</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="w-full max-w-[400px] space-y-2">
            <Link href="/dashboard" className="block w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-3.5 rounded-2xl font-bold text-[15px] text-center transition-colors">
              대시보드로 돌아가기
            </Link>
            <Link href="/my-learning?tab=part" className="block w-full bg-white border border-[#ECEAF5] text-[#374151] py-3.5 rounded-2xl font-semibold text-[14px] text-center hover:border-[#C7D2FE] transition-colors">
              파트별 연습 더 하기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col font-sans pb-32">
      {/* 헤더 */}
      <header className="px-6 py-4 flex items-center gap-3 sticky top-0 bg-[#F8FAFF] z-10">
        <Link href="/dashboard" className="p-2 -ml-2 text-[#6B7280]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1C1B33] font-bold text-[15px]">오늘의 데일리 챌린지</p>
              <p className="text-[#9CA3AF] text-[11px]">{formatDate(today)}</p>
            </div>
            {/* 진행 점 */}
            <div className="flex items-center gap-1.5">
              {questions.map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${
                  i < index ? 'w-2 h-2 bg-[#10B981]' :
                  i === index ? 'w-3 h-3 bg-[#4F46E5]' :
                  'w-2 h-2 bg-[#E5E7EB]'
                }`}/>
              ))}
            </div>
          </div>
          {/* 프로그레스 바 */}
          <div className="mt-2 h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className="h-full bg-[#4F46E5] rounded-full transition-all duration-300"
              style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}/>
          </div>
        </div>
      </header>

      <div className="px-5 max-w-[600px] mx-auto w-full space-y-4 mt-2">

        {/* 문제 번호 + 카테고리 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-[#EEF2FF] text-[#4F46E5] px-2.5 py-1 rounded-full">Q{index + 1} / 3</span>
          <span className="text-[11px] font-bold bg-[#FEE2E2] text-[#DC2626] px-2.5 py-1 rounded-full">{q.category}</span>
        </div>

        {/* 문제 카드 */}
        <div className="bg-white border border-[#ECEAF5] rounded-2xl px-5 py-5 shadow-sm">
          <p className="text-[#1C1B33] text-[15px] leading-relaxed font-medium">
            {q.sentence.split('___').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="inline-block mx-1 px-3 py-0.5 border-b-2 border-[#4F46E5] text-[#4F46E5] font-black text-[13px] min-w-[64px] text-center">
                    {answered ? q.choices[q.answer] : '　　　'}
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>

        {/* 선택지 */}
        <div className="space-y-2.5">
          {q.choices.map((choice, i) => {
            const isCorrectOpt = i === q.answer
            const isChosen = i === chosen
            const isWrong = isChosen && !isCorrectOpt

            let cls = 'bg-white border-[#E5E7EB] text-[#374151]'
            if (answered) {
              if (isCorrectOpt) cls = 'bg-[#D1FAE5] border-[#10B981] text-[#059669]'
              else if (isWrong) cls = 'bg-[#FEE2E2] border-[#EF4444] text-[#DC2626]'
              else cls = 'bg-white border-[#E5E7EB] text-[#9CA3AF]'
            }

            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => handleSelect(i)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${cls} ${!answered ? 'hover:border-[#4F46E5] hover:bg-[#EEF2FF] active:scale-[0.99]' : ''}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${
                  answered && isCorrectOpt ? 'bg-[#10B981] text-white' :
                  answered && isWrong ? 'bg-[#EF4444] text-white' :
                  !answered && isChosen ? 'bg-[#4F46E5] text-white' :
                  'bg-[#F3F4F6] text-[#6B7280]'
                }`}>{LABELS[i]}</span>
                <span className="text-[14px] font-medium flex-1">{choice}</span>
                {answered && isCorrectOpt && <span className="text-[11px] font-bold text-[#059669] shrink-0">정답</span>}
                {answered && isWrong && <span className="text-[11px] font-bold text-[#DC2626] shrink-0">내 선택</span>}
              </button>
            )
          })}
        </div>

        {/* 정답 후 피드백 */}
        {answered && (
          <div className="space-y-3 animate-fade-in">
            {/* 결과 + 정답률 */}
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${isCorrect ? 'bg-[#D1FAE5] border border-[#10B981]' : 'bg-[#FEE2E2] border border-[#EF4444]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
                {isCorrect
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </div>
              <div className="flex-1">
                <p className={`text-[13px] font-bold ${isCorrect ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                  {isCorrect ? '정답이에요!' : '틀렸어요.'}
                </p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  오늘 전체 유저 중 <span className="font-bold text-[#374151]">{accuracy}%</span>가 이 문제를 맞혔어요
                </p>
              </div>
              {/* 정답률 미니 바 */}
              <div className="shrink-0 text-right">
                <p className="text-[16px] font-black text-[#4F46E5]">{accuracy}%</p>
                <div className="w-16 h-1.5 bg-white/60 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-[#4F46E5] rounded-full" style={{ width: `${accuracy}%` }}/>
                </div>
              </div>
            </div>

            {/* 해설 */}
            <div className="bg-white border border-[#ECEAF5] rounded-2xl px-4 py-3">
              <p className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-wider mb-1.5">해설</p>
              <p className="text-[#374151] text-[13px] leading-relaxed">{q.explanation}</p>
            </div>
          </div>
        )}
      </div>

      {/* 하단 다음 버튼 */}
      {answered && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#F8FAFF] via-[#F8FAFF] to-transparent animate-fade-in">
          <div className="max-w-[600px] mx-auto">
            <button
              onClick={handleNext}
              className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-4 rounded-2xl font-bold text-[15px] transition-colors shadow-lg shadow-[#4F46E5]/20"
            >
              {index < questions.length - 1 ? '다음 문제' : '결과 보기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
