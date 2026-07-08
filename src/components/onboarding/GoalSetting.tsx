'use client'
import { useState } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const SCORE_OPTIONS = [
  { score: 600, emoji: '🌱', title: '600+', desc: '기초를 다지고 싶어요' },
  { score: 750, emoji: '📈', title: '750+', desc: '취업·승진 스펙이 목표예요' },
  { score: 850, emoji: '🏆', title: '850+', desc: '고득점을 집중 공략할 거예요' },
]

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
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[11px] font-black px-3.5 py-1 rounded-full tracking-widest mb-6 uppercase">
              {step}
            </span>
            <h2 className="text-white text-[28px] md:text-[34px] font-black leading-tight whitespace-pre-line">
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

export default function GoalSetting({ onNext }: { onNext: () => void }) {
  const store = useOnboardingStore()
  const [subStep, setSubStep] = useState<'score' | 'date'>('score')
  const [score, setScore] = useState<number | null>(store.targetScore)
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

  /* ─── 목표 점수 ─── */
  if (subStep === 'score') return (
    <TwoColCard step="STEP 5" title={'목표 점수는\n얼마인가요?'}>
      <div className="animate-fade-in">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {SCORE_OPTIONS.map((opt) => {
            const isSelected = score === opt.score
            return (
              <button
                key={opt.score}
                onClick={() => { setScore(opt.score); store.setTargetScore(opt.score); setSubStep('date') }}
                className={`flex flex-col items-center gap-3 p-5 md:p-6 rounded-2xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary border-primary shadow-xl shadow-primary/25 scale-[1.02]'
                    : 'bg-white border-[#E5E7EB] hover:border-primary/40 hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  isSelected ? 'bg-white/20' : 'bg-[#EEF2FF]'
                }`}>
                  {opt.emoji}
                </div>
                <p className={`text-[20px] md:text-[22px] font-black ${isSelected ? 'text-white' : 'text-[#0F172A]'}`}>
                  {opt.title}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </TwoColCard>
  )

  /* ─── 시험 예정일 ─── */
  return (
    <TwoColCard
      step="STEP 6"
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
