'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const SCORE_OPTIONS = [600, 700, 750, 800, 900]
const TIME_OPTIONS = ['15분', '30분', '1시간', '1시간 이상']
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

const TOEIC_DATES = [
  '2026-05-25', '2026-06-14', '2026-06-28',
  '2026-07-12', '2026-07-26',
  '2026-08-09', '2026-08-23',
  '2026-09-13', '2026-09-27',
  '2026-10-11', '2026-10-25',
  '2026-11-08', '2026-11-22',
  '2026-12-13', '2026-12-27',
]

function getDefaultExamDate(): string {
  const threeMonthsLater = new Date()
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
  return (
    TOEIC_DATES.find((d) => new Date(d) >= threeMonthsLater) ??
    TOEIC_DATES[TOEIC_DATES.length - 1]
  )
}

function formatDisplayDate(ds: string): string {
  const d = new Date(ds + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTodayStr(): string {
  const t = new Date()
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate())
}

type SubStep = 'score' | 'date' | 'time'

/* 공통 레이아웃 래퍼 */
function StepLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] px-4 py-10">
      <div className="w-full max-w-[390px] mx-auto flex flex-col flex-1 animate-fade-in">
        {children}
      </div>
    </div>
  )
}

/* 공통 Step 헤더 */
function StepHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="text-center space-y-3 mb-8">
      <div className="w-14 h-14 mx-auto flex items-center justify-center bg-primary-50 border border-primary-100 rounded-2xl text-2xl animate-bounce-in">
        {icon}
      </div>
      <h2 className="text-[#111318] text-[22px] font-bold leading-snug">{title}</h2>
      <p className="text-[#6B7280] text-[14px]">{subtitle}</p>
    </div>
  )
}

export default function GoalSetting({ onNext }: { onNext: () => void }) {
  const store = useOnboardingStore()
  const [subStep, setSubStep] = useState<SubStep>('score')
  const [score, setScore] = useState<number | null>(store.targetScore)
  const [examDate, setExamDate] = useState<string>(() => store.examDate ?? getDefaultExamDate())
  const [time, setTime] = useState<string | null>(store.dailyTime)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => {
    const ds = store.examDate ?? getDefaultExamDate()
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
    setCalendarOpen(false)
  }

  const handleComplete = () => {
    if (!score || !examDate || !time) return
    store.setTargetScore(score)
    store.setExamDate(examDate)
    store.setDailyTime(time)
    const diff = new Date(examDate).getTime() - Date.now()
    const months = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)))
    store.setStudyPeriod(`${months}개월`)
    onNext()
  }

  /* ─── Step 1: 목표 점수 ─── */
  if (subStep === 'score') {
    return (
      <StepLayout>
        <div className="flex-1 flex flex-col justify-center">
          <StepHeader icon="🎯" title="목표 점수는요?" subtitle="달성하고 싶은 토익 점수를 선택해 주세요." />
          <div className="grid grid-cols-3 gap-2.5">
            {SCORE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={`h-14 rounded-[10px] text-[15px] font-semibold transition-all border ${
                  score === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-[#374151] border-[#D1D5DB] hover:border-primary hover:text-primary'
                }`}
              >
                {s === 900 ? '900+' : s}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setSubStep('date')}
          disabled={!score}
          className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] disabled:opacity-30 transition-colors active:scale-[0.98] mt-6"
        >
          다음
        </button>
      </StepLayout>
    )
  }

  /* ─── Step 2: 시험 예정일 ─── */
  if (subStep === 'date') {
    return (
      <StepLayout>
        <div className="flex-1 flex flex-col space-y-4 pb-4">
          <StepHeader icon="📅" title={`시험 예정일을\n알려 주세요.`} subtitle="오늘 기준 3개월 뒤 시험일이 선택되어 있어요." />

          <button
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={`w-full bg-white border rounded-[10px] px-4 py-3.5 flex items-center justify-between transition-colors ${
              calendarOpen ? 'border-primary' : 'border-[#D1D5DB] hover:border-primary'
            }`}
          >
            <div className="text-left">
              <p className="text-[#6B7280] text-[11px] font-medium mb-0.5">시험일</p>
              <p className="text-[#111318] font-semibold text-[15px]">{formatDisplayDate(examDate)}</p>
            </div>
            <svg className={`w-5 h-5 text-primary transition-transform shrink-0 ${calendarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {calendarOpen && (
            <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3 px-1">
                <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-primary rounded-lg hover:bg-primary-50 transition-colors">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-[#111318] font-semibold text-sm">{year}년 {month + 1}월</span>
                <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-primary rounded-lg hover:bg-primary-50 transition-colors">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center mb-1">
                {DAY_NAMES.map((d) => (<span key={d} className="text-[10px] font-medium text-[#6B7280] py-1">{d}</span>))}
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
                        className={`w-8 h-8 rounded-full text-xs font-semibold transition-all flex items-center justify-center relative ${
                          selected ? 'bg-primary text-white' :
                          isExam ? 'text-primary bg-primary-50 hover:bg-primary-100' :
                          'text-[#D1D5DB] cursor-default'
                        }`}
                      >
                        {d}
                        {isToday && !selected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="text-[#6B7280] text-[11px] text-center mt-3 pt-3 border-t border-[#F3F4F6]">
                파란색 날짜만 정기 토익 시험일로 선택 가능해요
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2 pb-2">
          <button onClick={() => { setCalendarOpen(false); setSubStep('time') }} className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] transition-colors active:scale-[0.98]">다음</button>
          <button onClick={() => setSubStep('score')} className="w-full h-10 text-[#6B7280] font-medium text-sm hover:text-[#374151] transition-colors">이전</button>
        </div>
      </StepLayout>
    )
  }

  /* ─── Step 3: 학습 시간 ─── */
  return (
    <StepLayout>
      <div className="flex-1 flex flex-col justify-center">
        <StepHeader icon="⏰" title={`하루에 얼마나\n공부할 수 있어요?`} subtitle="무리하지 않아도 괜찮아요. 솔직하게 알려 주세요." />
        <div className="grid grid-cols-2 gap-2.5">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTime(t)}
              className={`h-14 rounded-[10px] text-[15px] font-semibold transition-all border ${
                time === t
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-[#374151] border-[#D1D5DB] hover:border-primary hover:text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2 pb-2">
        <button onClick={handleComplete} disabled={!time} className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] disabled:opacity-30 transition-colors active:scale-[0.98]">커리큘럼 생성하기</button>
        <button onClick={() => setSubStep('date')} className="w-full h-10 text-[#6B7280] font-medium text-sm hover:text-[#374151] transition-colors">이전</button>
      </div>
    </StepLayout>
  )
}
