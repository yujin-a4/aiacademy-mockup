'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const SCORE_OPTIONS = [
  { score: 600, emoji: '🌱', title: '600+', desc: '기초를 다지고 싶어요' },
  { score: 750, emoji: '📈', title: '750+', desc: '취업·승진 스펙이 목표예요' },
  { score: 850, emoji: '🏆', title: '850+', desc: '고득점을 집중 공략할 거예요' },
]

/** FGI에서는 750+ 하나만 고르게 한다. 나머지는 화면에 두되 눌리지 않는다.
 *  전부 열려면 SCORE_OPTIONS의 점수를 다 넣으면 된다. */
const SELECTABLE_SCORES = [750]

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

const TOEIC_DATES = [
  '2026-05-31', '2026-06-13', '2026-06-28',
  '2026-07-12', '2026-07-26',
  '2026-08-09', '2026-08-23', '2026-08-30',
  '2026-09-06', '2026-09-20',
  '2026-10-11', '2026-10-31',
  '2026-11-15', '2026-11-29',
  '2026-12-13', '2026-12-27',
]

const SCORE_MIN = 10
const SCORE_MAX = 990

/** 토익 점수는 5점 단위 */
function roundTo5(n: number) {
  return Math.round(n / 5) * 5
}

/** 취약 파트 선택지 — 파트 이름은 InstructorSelect·DbLessonScreen 과 같은 말을 쓴다 */
const PARTS = [
  { no: 1, kind: 'LC', name: '사진 묘사' },
  { no: 2, kind: 'LC', name: '질의·응답' },
  { no: 3, kind: 'LC', name: '짧은 대화' },
  { no: 4, kind: 'LC', name: '짧은 담화' },
  { no: 5, kind: 'RC', name: '단문 빈칸' },
  { no: 6, kind: 'RC', name: '장문 빈칸' },
  { no: 7, kind: 'RC', name: '독해' },
] as const

function getDefaultExamDate() {
  const twoMonthsLater = new Date()
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2)
  return TOEIC_DATES.find(d => new Date(d) >= twoMonthsLater) ?? TOEIC_DATES[TOEIC_DATES.length - 1]
}

function formatDisplayDate(ds: string) {
  const d = new Date(ds + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTodayStr() {
  const t = new Date()
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate())
}

function TwoColCard({
  step, title, subtitle, children,
}: {
  step: string; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-4 gap-4">
      <div className="w-full max-w-[1032px] flex items-center gap-2.5">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
          <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
            onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
        </div>
        <span className="text-[#374151] text-[13px] font-bold">YBM AI 어학원</span>
      </div>

      <div className="w-full max-w-[1032px] h-[620px] rounded-3xl overflow-hidden shadow-2xl shadow-black/10 flex flex-col md:flex-row">
        {/* 좌측 */}
        <div className="relative md:w-[45%] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] p-8 md:p-10 flex flex-col justify-center overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-[#1D4ED8]/40 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-3.5 py-1 rounded-full tracking-widest mb-6 uppercase">
              {step}
            </span>
            <h2 className="text-white text-[28px] md:text-[34px] font-bold leading-tight tracking-tight whitespace-pre-line">
              {title}
            </h2>
            {subtitle && (
              <p className="text-white/65 text-[14px] leading-relaxed mt-4">{subtitle}</p>
            )}
          </div>
        </div>

        {/* 우측 */}
        <div className="md:w-[55%] bg-white flex flex-col px-8 md:px-10 py-8 overflow-y-auto justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}

/** 총점 입력 한 칸 — 파트 구분 없이 990점 만점 총점만 받는다 */
function TotalScoreField({
  value, onChange,
}: {
  value: number | null; onChange: (v: number | null) => void
}) {
  return (
    <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl px-6 py-5 focus-within:border-primary/50 transition-colors">
      <p className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wider mb-2">총점</p>
      <div className="flex items-baseline justify-center gap-2">
        <input
          type="text" inputMode="numeric" placeholder="0" value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            if (raw === '') return onChange(null)
            // 입력 중에는 상한만 막는다 — 하한까지 걸면 "9"를 치는 순간 10으로 튄다
            onChange(Math.min(SCORE_MAX, Number(raw)))
          }}
          onBlur={() => {
            if (value === null) return
            onChange(Math.max(SCORE_MIN, Math.min(SCORE_MAX, roundTo5(value))))
          }}
          className="w-[150px] text-center text-[#0F172A] font-bold text-[44px] leading-tight bg-transparent outline-none placeholder:text-[#CBD5E1] placeholder:font-normal"
        />
        <span className="text-[#94A3B8] text-[18px] font-semibold shrink-0">점</span>
      </div>
    </div>
  )
}

export default function GoalSetting({ onNext }: { onNext: () => void }) {
  const store = useOnboardingStore()
  const [subStep, setSubStep] = useState<'current' | 'weak' | 'score' | 'date'>('current')
  const [totalScore, setTotalScore] = useState<number | null>(store.currentTotalScore)
  const [weak, setWeak] = useState<number[]>(store.weakParts)
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [examDate, setExamDate] = useState(() => {
    const stored = store.examDate
    return (stored && TOEIC_DATES.includes(stored)) ? stored : getDefaultExamDate()
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const stored = store.examDate
    const ds = (stored && TOEIC_DATES.includes(stored)) ? stored : getDefaultExamDate()
    return new Date(ds + 'T00:00:00')
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const todayStr = getTodayStr()

  const calendarDays: (number | null)[] = []
  const startDay = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  for (let i = 0; i < startDay; i++) calendarDays.push(null)
  for (let i = 1; i <= totalDays; i++) calendarDays.push(i)

  const handleSelectDate = (d: number) => {
    const ds = toDateStr(year, month, d)
    if (!TOEIC_DATES.includes(ds)) return
    setExamDate(ds)
    store.setExamDate(ds)
    const diff = new Date(ds).getTime() - Date.now()
    const months = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)))
    store.setStudyPeriod(`${months}개월`)
    setCalendarOpen(false)
  }

  const handleComplete = () => {
    if (!score) return
    store.setTargetScore(score)
    store.setStudyRange('LC+RC')
    store.setDailyTime('1시간')
    store.setExamDate(examDate)
    const diff = new Date(examDate).getTime() - Date.now()
    const months = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)))
    store.setStudyPeriod(`${months}개월`)
    onNext()
  }

  /* ─── 최근 시험 점수 ─── */
  const currentValid = totalScore !== null && totalScore >= SCORE_MIN

  const handleCurrentNext = (skipped: boolean) => {
    if (skipped) {
      setTotalScore(null)
      store.setLastExamResult(null, null)
    } else {
      if (!currentValid) return
      store.setLastExamResult(null, totalScore)
    }
    setSubStep('weak')
  }

  if (subStep === 'current') return (
    <TwoColCard
      step="STEP 5"
      title={'최근 토익 점수를\n알려주세요'}
      subtitle="가장 최근에 치른 시험의 총점을 입력해 주세요. 지금 실력에 맞춰 커리큘럼을 짭니다"
    >
      <div className="animate-fade-in">
        <div className="mb-5">
          <TotalScoreField value={totalScore} onChange={setTotalScore} />
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => handleCurrentNext(false)}
            disabled={!currentValid}
            className={`w-full h-12 font-bold text-[15px] rounded-xl transition-all ${
              currentValid
                ? 'bg-primary hover:bg-[#1D4ED8] text-white active:scale-[0.98]'
                : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
            }`}
          >
            다음
          </button>
          <button
            onClick={() => handleCurrentNext(true)}
            className="w-full h-10 text-[#94A3B8] font-medium text-[13px] hover:text-[#64748B] transition-colors"
          >
            아직 토익에 응시한 적 없어요
          </button>
        </div>
      </div>
    </TwoColCard>
  )

  /* ─── 취약 파트 ─── */
  const handleWeakNext = () => {
    store.setWeakParts(weak)
    setSubStep('score')
  }

  if (subStep === 'weak') return (
    <TwoColCard
      step="STEP 6"
      title={'어느 파트가\n어려우신가요?'}
      subtitle="여러 개 고르셔도 됩니다. 고르신 파트를 커리큘럼 앞쪽에 배치합니다"
    >
      <div className="animate-fade-in">
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {PARTS.map((p) => {
            const on = weak.includes(p.no)
            return (
              <button
                key={p.no}
                onClick={() => setWeak(on ? weak.filter(n => n !== p.no) : [...weak, p.no])}
                aria-pressed={on}
                className={`min-h-[56px] px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  on
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-white border-[#E5E7EB] hover:border-primary/40'
                }`}
              >
                <p className={`text-[10px] font-semibold tracking-wider ${on ? 'text-white/70' : 'text-[#94A3B8]'}`}>
                  {p.kind} · PART {p.no}
                </p>
                <p className={`text-[15px] font-bold ${on ? 'text-white' : 'text-[#0F172A]'}`}>{p.name}</p>
              </button>
            )
          })}
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleWeakNext}
            disabled={weak.length === 0}
            className={`w-full h-12 font-bold text-[15px] rounded-xl transition-all ${
              weak.length > 0
                ? 'bg-primary hover:bg-[#1D4ED8] text-white active:scale-[0.98]'
                : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
            }`}
          >
            {weak.length > 0 ? `${weak.length}개 선택 · 다음` : '다음'}
          </button>
          <button
            onClick={() => { setWeak([]); store.setWeakParts([]); setSubStep('score') }}
            className="w-full h-10 text-[#94A3B8] font-medium text-[13px] hover:text-[#64748B] transition-colors"
          >
            잘 모르겠어요
          </button>
        </div>
      </div>
    </TwoColCard>
  )

  /* ─── 목표 점수 ─── */
  if (subStep === 'score') return (
    <TwoColCard step="STEP 7" title={'목표 점수는\n얼마인가요?'}>
      <div className="animate-fade-in">
        <div className="flex flex-col gap-4">
          {SCORE_OPTIONS.map((opt) => {
            const isSelected = selectedScore === opt.score
            const isLocked = !SELECTABLE_SCORES.includes(opt.score)
            const isDimmed = (selectedScore !== null && !isSelected) || isLocked
            return (
              <button
                key={opt.score}
                disabled={selectedScore !== null || isLocked}
                onClick={() => {
                  if (selectedScore !== null || isLocked) return
                  setSelectedScore(opt.score)
                  setScore(opt.score)
                  store.setTargetScore(opt.score)
                  setTimeout(() => { setSelectedScore(null); setSubStep('date') }, 420)
                }}
                className={`relative flex items-start gap-4 p-6 md:p-7 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary border-primary shadow-xl shadow-primary/25 scale-[1.02]'
                    : isDimmed
                    ? 'bg-[#F3F4F6] border-[#E9EBEF] opacity-40 cursor-default'
                    : 'bg-white border-[#E5E7EB] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/8 hover:scale-[1.01] cursor-pointer'
                }`}
              >
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-[22px] ${
                  isSelected ? 'bg-white/20' : 'bg-[#EEF2FF]'
                }`}>
                  {opt.emoji}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`text-[22px] md:text-[24px] font-normal ${
                    isSelected ? 'text-white' : 'text-[#0F172A]'
                  }`}>
                    {opt.title}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-white/25 rounded-full flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setSubStep('weak')}
          className="w-full h-10 mt-4 text-[#94A3B8] font-medium text-[13px] hover:text-[#64748B] transition-colors"
        >
          이전으로
        </button>
      </div>
    </TwoColCard>
  )

  /* ─── 시험 예정일 ─── */
  return (
    <TwoColCard
      step="STEP 8"
      title={'시험 예정일을\n알려주세요'}
      subtitle="오늘 기준 2개월 뒤 시험일이 선택되어 있어요"
    >
      <div className="animate-fade-in">
        {/* 날짜 선택 버튼 */}
        <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl overflow-hidden mb-4">
          <button
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
              calendarOpen ? 'border-b-2 border-primary/20' : ''
            }`}
          >
            <div className="text-left">
              <p className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wider mb-0.5">시험일</p>
              <p className="text-[#0F172A] font-bold text-[16px]">{formatDisplayDate(examDate)}</p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              calendarOpen ? 'bg-primary text-white' : 'bg-[#F1F5F9] text-[#64748B]'
            }`}>
              <svg className={`w-4 h-4 transition-transform ${calendarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {calendarOpen && (
            <div className="p-4 border-t border-[#F1F5F9] animate-fade-in">
              <div className="flex items-center justify-between mb-3 px-1">
                <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-primary hover:bg-[#EEF2FF] rounded-lg transition-colors">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-[#0F172A] font-bold text-[14px]">{year}년 {month + 1}월</span>
                <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
                  className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-primary hover:bg-[#EEF2FF] rounded-lg transition-colors">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center mb-1">
                {DAY_NAMES.map(d => (
                  <span key={d} className="text-[10px] font-semibold text-[#94A3B8] py-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((d, i) => {
                  if (!d) return <div key={i} />
                  const ds = toDateStr(year, month, d)
                  const isExam = TOEIC_DATES.includes(ds)
                  const selected = examDate === ds
                  const isToday = ds === todayStr
                  return (
                    <div key={i} className="flex items-center justify-center h-9">
                      <button
                        onClick={() => handleSelectDate(d)}
                        disabled={!isExam}
                        className={`w-8 h-8 rounded-full text-[12px] font-semibold transition-all flex items-center justify-center relative ${
                          selected ? 'bg-primary text-white shadow-md' :
                          isExam ? 'text-primary bg-[#EEF2FF] hover:bg-primary/20' :
                          'text-[#CBD5E1] cursor-default'
                        }`}
                      >
                        {d}
                        {isToday && !selected && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="text-[#94A3B8] text-[11px] text-center mt-3 pt-3 border-t border-[#F1F5F9]">
                파란색 날짜만 정기 토익 시험일로 선택 가능해요
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => { setCalendarOpen(false); handleComplete() }}
            className="w-full h-12 bg-primary hover:bg-[#1D4ED8] text-white font-bold text-[15px] rounded-xl transition-all active:scale-[0.98]"
          >
            진단 결과 보기
          </button>
          <button
            onClick={() => setSubStep('score')}
            className="w-full h-10 text-[#94A3B8] font-medium text-[13px] hover:text-[#64748B] transition-colors"
          >
            이전으로
          </button>
        </div>
      </div>
    </TwoColCard>
  )
}
