'use client'
import { useEffect, useRef, useState } from 'react'
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

const SCORE_MIN = 0
const SCORE_MAX = 990

/** 토익 점수는 5점 단위 — 654 같은 점수는 없으므로 받지 않는다 */
function isValidScore(n: number | null): n is number {
  return n !== null && n >= SCORE_MIN && n <= SCORE_MAX && n % 5 === 0
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

/** 휠 한 칸 높이 — 다섯 칸이 보이고 가운데가 선택값 */
const WHEEL_ITEM_H = 48

/** 돌려서 고르는 세로 휠 — 손가락·마우스 드래그, 마우스 휠, 화살표 키, 항목 탭 모두 받는다.
 *
 *  브라우저 스크롤(scroll-snap)에 맡기지 않고 직접 굴린다. 기기마다 관성·스냅 느낌이 달라서
 *  갤럭시탭·아이패드·PC 에서 같은 손맛을 내려면 이 편이 낫다(PC 는 마우스로 끌어 스크롤이 안 된다).
 *  부드러움의 핵심은 **손을 뗀 순간의 속도에서 이어서 감속**하는 것 — easeOutCubic 의 시작 속도가
 *  3·거리/시간 이므로, 시간을 그 식으로 맞추면 끊김 없이 넘어간다. */
function WheelColumn({
  items, value, format, onChange,
}: {
  items: string[]; value: string; format: (v: string) => string; onChange: (v: string) => void
}) {
  const H = WHEEL_ITEM_H
  const idx = Math.max(0, items.indexOf(value))
  const [offset, setOffset] = useState(-idx * H)
  const off = useRef(offset)
  const aim = useRef(idx)
  const anim = useRef<number>()
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startOff: number; moved: boolean; samples: { t: number; y: number }[] } | null>(null)
  const latest = useRef({ items, value, onChange })
  latest.current = { items, value, onChange }

  const set = (v: number) => { off.current = v; setOffset(v) }
  const stop = () => { if (anim.current) cancelAnimationFrame(anim.current); anim.current = undefined }
  const clampIdx = (i: number) => Math.min(latest.current.items.length - 1, Math.max(0, i))

  const animateTo = (target: number, duration = 380) => {
    stop()
    const i = clampIdx(target)
    aim.current = i
    const from = off.current, to = -i * H
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      set(from + (to - from) * (1 - Math.pow(1 - p, 3)))    // easeOutCubic — 빠르게 출발해 천천히 멈춘다
      if (p < 1) { anim.current = requestAnimationFrame(tick); return }
      anim.current = undefined
      const { items, value, onChange } = latest.current
      if (items[i] && items[i] !== value) onChange(items[i])
    }
    anim.current = requestAnimationFrame(tick)
  }

  // 바깥에서 값이 바뀌면(연도를 바꿔 월 목록이 달라지는 등) 그 자리로 굴려 놓는다
  useEffect(() => {
    if (drag.current || anim.current) return
    if (off.current !== -idx * H) animateTo(idx)
    aim.current = idx
  }, [idx, items.length])

  // 마우스 휠 — 한 번 굴릴 때 한 칸. passive 로 붙으면 페이지 스크롤을 못 막아서 직접 붙인다
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    let acc = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      acc += e.deltaY
      if (Math.abs(acc) < 30) return
      animateTo(aim.current + Math.sign(acc))
      acc = 0
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => stop, [])

  const maxOff = 0, minOff = -(items.length - 1) * H
  /** 끝을 넘겨 끌면 고무줄처럼 덜 따라온다 */
  const rubber = (v: number) => v > maxOff ? maxOff + (v - maxOff) * 0.35 : v < minOff ? minOff + (v - minOff) * 0.35 : v

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); animateTo(aim.current - 1) }
        if (e.key === 'ArrowDown') { e.preventDefault(); animateTo(aim.current + 1) }
      }}
      onPointerDown={(e) => {
        stop()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { startY: e.clientY, startOff: off.current, moved: false, samples: [{ t: performance.now(), y: e.clientY }] }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const dy = e.clientY - d.startY
        if (Math.abs(dy) > 5) d.moved = true
        set(rubber(d.startOff + dy))
        const now = performance.now()
        d.samples.push({ t: now, y: e.clientY })
        while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift()
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (!d) return
        if (!d.moved) {
          // 탭 — 누른 칸으로 굴린다
          const rect = e.currentTarget.getBoundingClientRect()
          const rel = Math.round((e.clientY - (rect.top + H * 2.5)) / H)
          animateTo(Math.round(-off.current / H) + rel)
          return
        }
        const first = d.samples[0], last = d.samples[d.samples.length - 1]
        const v = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0   // px/ms
        const target = clampIdx(Math.round(-(off.current + v * 250) / H))          // 관성으로 더 굴러갈 자리
        const dist = Math.abs(-target * H - off.current)
        const dur = Math.abs(v) > 0.05 ? (3 * dist) / Math.abs(v) : 320             // 손 뗀 속도 그대로 이어받기
        animateTo(target, Math.min(1100, Math.max(260, dur)))
      }}
      onPointerCancel={() => { drag.current = null; animateTo(Math.round(-off.current / H)) }}
      className="relative h-[240px] overflow-hidden select-none cursor-grab active:cursor-grabbing outline-none"
      style={{ touchAction: 'none' }}
    >
      <div style={{ transform: `translate3d(0, ${offset + H * 2}px, 0)`, willChange: 'transform' }}>
        {items.map((v, i) => {
          const dist = Math.abs(i + offset / H)
          return (
            <div
              key={v}
              className="flex items-center justify-center text-[#0F172A] tabular-nums"
              style={{
                height: H,
                fontSize: 26,
                fontWeight: dist < 0.5 ? 600 : 400,
                opacity: Math.max(0.12, 1 - dist * 0.38),
                transform: `scale(${Math.max(0.72, 1 - dist * 0.1)})`,
              }}
            >
              {format(v)}
            </div>
          )
        })}
      </div>
    </div>
  )
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
  const invalid = value !== null && !isValidScore(value)
  return (
    <div className={`bg-white border-2 rounded-2xl px-6 py-5 transition-colors ${
      invalid ? 'border-[#F87171]' : 'border-[#E5E7EB] focus-within:border-primary/50'
    }`}>
      <p className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wider mb-2">총점</p>
      <div className="flex items-baseline justify-center gap-2">
        <input
          type="text" inputMode="numeric" placeholder="0" value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            if (raw === '') return onChange(null)
            onChange(Math.min(SCORE_MAX, Number(raw)))
          }}
          className="w-[150px] text-center text-[#0F172A] font-bold text-[44px] leading-tight bg-transparent outline-none placeholder:text-[#CBD5E1] placeholder:font-normal"
        />
        <span className="text-[#94A3B8] text-[18px] font-semibold shrink-0">점</span>
      </div>
      {invalid && (
        <p className="text-center text-[12px] mt-2 text-[#EF4444] font-semibold">
          토익 점수는 5점 단위예요 (예: 650, 655)
        </p>
      )}
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
    return (stored && TOEIC_DATES.includes(stored) && stored >= getTodayStr()) ? stored : getDefaultExamDate()
  })
  /* 지난 시험일은 고를 수 없다 — 다 지나 버렸으면 목록이 비지 않게 전부 보여준다 */
  const todayStr = getTodayStr()
  const upcoming = TOEIC_DATES.filter(d => d >= todayStr)
  const examDates = upcoming.length ? upcoming : TOEIC_DATES
  const [selY, selM] = examDate.split('-')
  const years = Array.from(new Set(examDates.map(d => d.slice(0, 4))))
  const months = Array.from(new Set(examDates.filter(d => d.startsWith(selY)).map(d => d.slice(5, 7))))
  const days = examDates.filter(d => d.startsWith(`${selY}-${selM}`))

  const pickDate = (ds: string | undefined) => {
    if (!ds) return
    setExamDate(ds)
    store.setExamDate(ds)
    const diff = new Date(ds).getTime() - Date.now()
    const months = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)))
    store.setStudyPeriod(`${months}개월`)
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
  const currentValid = isValidScore(totalScore)

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
      subtitle="가장 최근에 응시하신 토익 시험 점수를 입력해 주세요."
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
      subtitle="여러 개 고르셔도 됩니다"
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
        {/* 시험일 — 달력은 빈 날이 대부분이라, 연·월·일을 실제 시험이 있는 값만 늘어놓는다 */}
        <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl px-6 py-4 mb-4">
          <p className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wider mb-0.5">시험일</p>
          <p className="text-[#0F172A] font-bold text-[16px] mb-2">{formatDisplayDate(examDate)}</p>
          {/* 시험이 있는 연·월·일만 휠에 올린다 — 빈 날짜를 늘어놓지 않는다 */}
          <div className="relative grid grid-cols-3">
            <div
              className="absolute inset-x-0 border-y border-[#CBD5E1] pointer-events-none"
              style={{ top: WHEEL_ITEM_H * 2, height: WHEEL_ITEM_H }}
            />
            <WheelColumn items={years} value={selY} format={(y) => y}
              onChange={(y) => pickDate(examDates.find(d => d.startsWith(y)))} />
            <WheelColumn items={months} value={selM} format={(m) => m}
              onChange={(m) => pickDate(examDates.find(d => d.startsWith(`${selY}-${m}`)))} />
            <WheelColumn items={days} value={examDate} format={(d) => d.slice(8)}
              onChange={(d) => pickDate(d)} />
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleComplete}
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
