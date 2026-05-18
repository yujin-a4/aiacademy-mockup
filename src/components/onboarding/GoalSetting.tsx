'use client'
import { useState, useEffect } from 'react'
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

const bgDecorations = (
  <>
    <div className="absolute top-[-80px] right-[-60px] w-64 h-64 rounded-full bg-ybm-blue/5 blur-3xl pointer-events-none" />
    <div className="absolute bottom-20 left-[-40px] w-40 h-40 rounded-full bg-ybm-blue/5 blur-2xl pointer-events-none" />
  </>
)

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

  /* ─── Step 1: 목표 점수 ─────────────────────────────── */
  if (subStep === 'score') {
    return (
      <div className="flex flex-col min-h-screen bg-ybm-onboarding px-6 py-10 relative overflow-hidden">
        {bgDecorations}
        <div className="w-full max-w-sm mx-auto flex flex-col flex-1 z-10 animate-fade-in">
          <div className="flex-1 flex flex-col justify-center space-y-10">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm text-2xl animate-bounce-in">
                🎯
              </div>
              <h2 className="text-slate-900 text-2xl font-bold leading-snug">목표 점수는요?</h2>
              <p className="text-slate-400 text-sm font-medium">달성하고 싶은 토익 점수를 선택해 주세요.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {SCORE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className={`h-14 rounded-2xl text-base font-bold transition-all border-2 ${
                    score === s
                      ? 'bg-ybm-blue text-white border-ybm-blue shadow-blue scale-[1.04]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-ybm-blue hover:text-ybm-blue'
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
            className="w-full bg-ybm-blue text-white rounded-2xl h-[56px] font-bold text-lg shadow-blue disabled:opacity-30 transition-all active:scale-95 hover:opacity-90 mb-4"
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  /* ─── Step 2: 시험 예정일 ────────────────────────────── */
  if (subStep === 'date') {
    return (
      <div className="flex flex-col min-h-screen bg-ybm-onboarding px-6 py-10 relative overflow-hidden">
        {bgDecorations}
        <div className="w-full max-w-sm mx-auto flex flex-col flex-1 z-10 animate-fade-in">
          <div className="flex-1 flex flex-col space-y-6 pb-4">
            <div className="text-center space-y-4 pt-2">
              <div className="w-16 h-16 mx-auto flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm text-2xl animate-bounce-in">
                📅
              </div>
              <div className="space-y-1">
                <h2 className="text-slate-900 text-2xl font-bold leading-snug">시험 예정일을<br />알려 주세요.</h2>
                <p className="text-slate-400 text-sm font-medium">오늘 기준 3개월 뒤 시험일이 선택되어 있어요.</p>
              </div>
            </div>

            {/* 날짜 선택 버튼 */}
            <button
              onClick={() => setCalendarOpen(!calendarOpen)}
              className={`w-full bg-white border-2 rounded-2xl px-5 py-4 flex items-center justify-between transition-all shadow-sm ${
                calendarOpen ? 'border-ybm-blue' : 'border-slate-200 hover:border-ybm-blue'
              }`}
            >
              <div className="text-left">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">시험일</p>
                <p className="text-slate-900 font-bold text-base">{formatDisplayDate(examDate)}</p>
              </div>
              <svg
                className={`w-5 h-5 text-ybm-blue transition-transform shrink-0 ${calendarOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 달력 */}
            {calendarOpen && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-fade-in">
                {/* 월 네비게이션 */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <button
                    onClick={() => setViewDate(new Date(year, month - 1, 1))}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-ybm-blue rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className="text-slate-800 font-bold text-sm">{year}년 {month + 1}월</span>
                  <button
                    onClick={() => setViewDate(new Date(year, month + 1, 1))}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-ybm-blue rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 text-center mb-1">
                  {DAY_NAMES.map((d) => (
                    <span key={d} className="text-[10px] font-bold text-slate-300 py-1">{d}</span>
                  ))}
                </div>

                {/* 날짜 그리드 */}
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
                          className={`w-8 h-8 rounded-full text-[12px] font-bold transition-all relative flex items-center justify-center ${
                            selected
                              ? 'bg-ybm-blue text-white shadow-md scale-110'
                              : isExam
                              ? 'text-ybm-blue bg-ybm-blue/10 hover:bg-ybm-blue/20'
                              : 'text-slate-300 cursor-default'
                          }`}
                        >
                          {d}
                          {isToday && !selected && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-ybm-blue rounded-full" />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>

                <p className="text-slate-300 text-[10px] font-medium text-center mt-3 pt-3 border-t border-slate-100">
                  파란색 날짜만 정기 토익 시험일로 선택 가능해요
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 pb-4">
            <button
              onClick={() => { setCalendarOpen(false); setSubStep('time') }}
              className="w-full bg-ybm-blue text-white rounded-2xl h-[56px] font-bold text-lg shadow-blue transition-all active:scale-95 hover:opacity-90"
            >
              다음
            </button>
            <button
              onClick={() => setSubStep('score')}
              className="w-full h-10 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
            >
              이전
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Step 3: 학습 시간 ──────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-ybm-onboarding px-6 py-10 relative overflow-hidden">
      {bgDecorations}
      <div className="w-full max-w-sm mx-auto flex flex-col flex-1 z-10 animate-fade-in">
        <div className="flex-1 flex flex-col justify-center space-y-10">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm text-2xl animate-bounce-in">
              ⏰
            </div>
            <h2 className="text-slate-900 text-2xl font-bold leading-snug">하루에 얼마나<br />공부할 수 있어요?</h2>
            <p className="text-slate-400 text-sm font-medium">무리하지 않아도 괜찮아요. 솔직하게 알려 주세요.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`h-14 rounded-2xl text-base font-bold transition-all border-2 ${
                  time === t
                    ? 'bg-ybm-blue text-white border-ybm-blue shadow-blue scale-[1.04]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-ybm-blue hover:text-ybm-blue'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pb-4">
          <button
            onClick={handleComplete}
            disabled={!time}
            className="w-full bg-ybm-blue text-white rounded-2xl h-[56px] font-bold text-lg shadow-blue disabled:opacity-30 transition-all active:scale-95 hover:opacity-90"
          >
            커리큘럼 생성하기
          </button>
          <button
            onClick={() => setSubStep('date')}
            className="w-full h-10 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
          >
            이전
          </button>
        </div>
      </div>
    </div>
  )
}
