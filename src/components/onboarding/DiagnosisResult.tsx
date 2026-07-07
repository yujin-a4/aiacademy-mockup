'use client'
import { useState, useEffect } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(ds: string) {
  const d = new Date(ds + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`
}

function dDayFrom(ds: string) {
  const diff = new Date(ds + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  const days = Math.ceil(diff / 86400000)
  return days > 0 ? `D-${days}` : days === 0 ? 'D-Day' : `D+${Math.abs(days)}`
}

const RANGE_DESC:  Record<string, string> = { W: '전체 범위형', N: '핵심 집중형' }
const DIFF_DESC:   Record<string, string> = { C: '도전 선호형', S: '안전 선호형' }
const RHYTHM_DESC: Record<string, string> = { B: '집중 몰아형', G: '꾸준 유지형' }
const MOTIVE_DESC: Record<string, string> = { R: '보상 동기형', P: '압박 동기형' }

const TYPE_NAMES: Record<string, string> = {
  WCBR: '불꽃 올라운더',   WCGR: '성장 덕후',
  NCBR: '돌파 헌터',       NCGR: '집중 성장러',
  WCBP: '전방위 스파르타', WCGP: '자기관리 등반가',
  NCBP: '스나이퍼',        NCGP: '목표 추격자',
  WSBR: '고밀도 안심러',  WSGR: '모범 루틴러',
  NSBR: '효율 안심러',    NSGR: '실속 루틴러',
  WSBP: '고밀도 안전러',  WSGP: '성실 관리형',
  NSBP: '점수 사수러',    NSGP: '최단거리 득점러',
}

const LETTER_COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-400 to-orange-500',
]

export default function DiagnosisResult({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const { userName, rangeAxis, difficulty, rhythm, motivation, targetScore, examDate, studyPeriod, dailyTime } = useOnboardingStore()

  const letters = [rangeAxis ?? '?', difficulty ?? '?', rhythm ?? '?', motivation ?? '?']
  const typeKey = letters.join('')
  const typeName = TYPE_NAMES[typeKey] ?? '맞춤 학습형'

  const letterDetails = [
    { letter: letters[0], label: RANGE_DESC[rangeAxis ?? ''] ?? '-' },
    { letter: letters[1], label: DIFF_DESC[difficulty ?? ''] ?? '-' },
    { letter: letters[2], label: RHYTHM_DESC[rhythm ?? ''] ?? '-' },
    { letter: letters[3], label: MOTIVE_DESC[motivation ?? ''] ?? '-' },
  ]

  const dday = examDate ? dDayFrom(examDate) : null

  // 각 축의 값에 따라 레이더 꼭짓점 거리 결정 (중심 80,80 기준)
  const rTop    = rangeAxis  === 'W' ? 58 : 38   // 넓게(W) → 크게, 집중(N) → 작게
  const rRight  = difficulty === 'C' ? 56 : 40   // 도전(C) → 크게, 안전(S) → 작게
  const rBottom = rhythm     === 'B' ? 60 : 36   // 몰아(B) → 크게, 꾸준(G) → 작게
  const rLeft   = motivation === 'R' ? 54 : 42   // 보상(R) → 크게, 압박(P) → 작게

  const pts = {
    top:    { x: 80,          y: 80 - rTop    },
    right:  { x: 80 + rRight, y: 80           },
    bottom: { x: 80,          y: 80 + rBottom },
    left:   { x: 80 - rLeft,  y: 80           },
  }
  const outerPoly = `${pts.top.x},${pts.top.y} ${pts.right.x},${pts.right.y} ${pts.bottom.x},${pts.bottom.y} ${pts.left.x},${pts.left.y}`

  const sc = 0.58
  const ip = (v: number) => 80 + (v - 80) * sc
  const innerPoly = `${ip(pts.top.x)},${ip(pts.top.y)} ${ip(pts.right.x)},${ip(pts.right.y)} ${ip(pts.bottom.x)},${ip(pts.bottom.y)} ${ip(pts.left.x)},${ip(pts.left.y)}`

  const fullMessage = `목표 점수까지 가는 가장 효율적인 커리큘럼을 만들었어요. 딱 맞는 프로그램을 제안해 드릴게요!`
  const [typedText, setTypedText] = useState('')
  const [typingDone, setTypingDone] = useState(false)

  useEffect(() => {
    setTypedText('')
    setTypingDone(false)
    let i = 0
    const timer = setInterval(() => {
      i++
      setTypedText(fullMessage.slice(0, i))
      if (i >= fullMessage.length) { clearInterval(timer); setTypingDone(true) }
    }, 32)
    return () => clearInterval(timer)
  }, [])

  const goalItems = [
    { label: '목표 점수', value: `${targetScore ?? '-'}점` },
    { label: '시험 예정일', value: examDate ? formatDate(examDate) : '-' },
    { label: '학습 기간', value: studyPeriod ?? '-' },
    { label: '하루 학습', value: dailyTime ?? '-' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFF] animate-fade-in">

      {/* 헤더 */}
      <header className="flex items-center px-6 md:px-12 py-4 md:py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <img src="/logo.svg" alt="YBM" className="w-4 h-4 brightness-0 invert"
              onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
          </div>
          <span className="text-[#374151] text-[13px] font-bold hidden sm:block">YBM AI 어학원</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 md:px-12 pb-10">
        <div className="max-w-[680px] mx-auto flex flex-col gap-5">

          {/* 타이틀 */}
          <div className="text-center pt-2">
            <span className="inline-block bg-primary text-white text-[11px] font-black px-3.5 py-1 rounded-full tracking-widest mb-4 uppercase">
              AI 진단 완료
            </span>
            <h2 className="text-[#0F172A] text-[26px] md:text-[30px] font-black leading-tight">
              {userName}님의 학습 유형
            </h2>
          </div>

          {/* MBTI 히어로 카드 */}
          <div
            className="rounded-2xl relative overflow-hidden shadow-xl border border-[#1a3fa8]/20 flex"
            style={{ background: 'linear-gradient(135deg, #1a3fa8 0%, #2563EB 55%, #4f8ef7 100%)', minHeight: '220px' }}
          >
            {/* 배경 블러 장식 */}
            <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-8 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none" />

            {/* 텍스트 콘텐츠 */}
            <div className="relative z-10 p-7 md:p-9 flex-1">
              <p className="text-white/55 text-[11px] font-semibold tracking-[0.14em] uppercase mb-3">나의 토익 학습 유형</p>

              <div className="flex items-baseline gap-0 mb-3">
                {letters.map((letter, i) => (
                  <span key={i} className="text-white font-black leading-none"
                    style={{ fontSize: 'clamp(52px, 10vw, 76px)', letterSpacing: '6px' }}>
                    {letter}
                  </span>
                ))}
              </div>

              <span className="bg-white/20 backdrop-blur-sm text-white text-[13px] font-bold px-4 py-1.5 rounded-full">
                {typeName}
              </span>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {dday && (
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                    <span className="text-white/65 text-[11px] font-semibold">시험까지</span>
                    <span className="text-white font-black text-[16px] leading-none">{dday}</span>
                  </div>
                )}
                {targetScore && (
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                    <span className="text-white/65 text-[11px] font-semibold">목표</span>
                    <span className="text-white font-black text-[16px] leading-none">{targetScore}점</span>
                  </div>
                )}
                {studyPeriod && (
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                    <span className="text-white font-black text-[16px] leading-none">{studyPeriod}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 우측 아트워크 */}
            <div className="relative z-10 flex items-center justify-center pr-4 md:pr-8 shrink-0 w-[160px] md:w-[200px]">
              <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="nodeglow">
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>
                </defs>

                {/* 배경 글로우 */}
                <circle cx="80" cy="80" r="72" fill="url(#centerGrad)"/>

                {/* 동심원 */}
                <circle cx="80" cy="80" r="68" stroke="white" strokeOpacity="0.07" strokeWidth="1" fill="none"/>
                <circle cx="80" cy="80" r="50" stroke="white" strokeOpacity="0.10" strokeWidth="1" fill="none"/>
                <circle cx="80" cy="80" r="32" stroke="white" strokeOpacity="0.14" strokeWidth="1" fill="none"/>
                <circle cx="80" cy="80" r="15" stroke="white" strokeOpacity="0.18" strokeWidth="1" fill="none"/>

                {/* 축 라인 */}
                <line x1="80" y1="12" x2="80" y2="148" stroke="white" strokeOpacity="0.07" strokeWidth="0.8"/>
                <line x1="12" y1="80" x2="148" y2="80" stroke="white" strokeOpacity="0.07" strokeWidth="0.8"/>
                <line x1="32" y1="32" x2="128" y2="128" stroke="white" strokeOpacity="0.05" strokeWidth="0.8"/>
                <line x1="128" y1="32" x2="32" y2="128" stroke="white" strokeOpacity="0.05" strokeWidth="0.8"/>

                {/* 레이더 폴리곤 */}
                <polygon
                  points={outerPoly}
                  fill="rgba(255,255,255,0.09)"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {/* 내부 폴리곤 */}
                <polygon
                  points={innerPoly}
                  fill="rgba(255,255,255,0.06)"
                  stroke="rgba(255,255,255,0.20)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />

                {/* 꼭짓점 노드 */}
                <circle cx={pts.top.x}    cy={pts.top.y}    r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>
                <circle cx={pts.right.x}  cy={pts.right.y}  r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>
                <circle cx={pts.bottom.x} cy={pts.bottom.y} r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>
                <circle cx={pts.left.x}   cy={pts.left.y}   r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>

                {/* 꼭짓점 노드 외곽 링 */}
                <circle cx={pts.top.x}    cy={pts.top.y}    r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>
                <circle cx={pts.right.x}  cy={pts.right.y}  r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>
                <circle cx={pts.bottom.x} cy={pts.bottom.y} r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>
                <circle cx={pts.left.x}   cy={pts.left.y}   r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>

                {/* 중심 */}
                <circle cx="80" cy="80" r="8" fill="rgba(255,255,255,0.15)" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
                <circle cx="80" cy="80" r="3.5" fill="white" fillOpacity="0.9"/>

                {/* 플로팅 파티클 */}
                <circle cx="112" cy="48" r="2" fill="white" fillOpacity="0.35"/>
                <circle cx="122" cy="112" r="1.5" fill="white" fillOpacity="0.25"/>
                <circle cx="50" cy="118" r="2" fill="white" fillOpacity="0.30"/>
                <circle cx="44" cy="52" r="1.5" fill="white" fillOpacity="0.25"/>
                <circle cx="96" cy="14" r="1.5" fill="white" fillOpacity="0.20"/>
                <circle cx="148" cy="64" r="1.5" fill="white" fillOpacity="0.20"/>
              </svg>
            </div>
          </div>

          {/* 4글자 배지 */}
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {letterDetails.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl py-4 px-2 flex flex-col items-center gap-2.5 shadow-sm border-2 border-[#E5E7EB]">
                <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${LETTER_COLORS[i]} flex items-center justify-center shadow-sm`}>
                  <span className="text-white text-[20px] md:text-[22px] font-black">{d.letter}</span>
                </div>
                <p className="text-[#64748B] text-[10px] md:text-[11px] font-semibold leading-tight text-center">{d.label}</p>
              </div>
            ))}
          </div>

          {/* 타이핑 메시지 */}
          <div className="bg-white border-2 border-[#E5E7EB] rounded-2xl px-6 py-5">
            <p className="text-[#0F172A] text-[14px] md:text-[15px] leading-relaxed">
              <span className="font-bold text-primary">{userName}님, </span>
              {typedText}
              {!typingDone && (
                <span className="inline-block w-0.5 h-[14px] bg-primary align-middle ml-0.5 animate-pulse" />
              )}
            </p>
          </div>

          {/* 목표 & 학습 계획 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {goalItems.map((item) => (
              <div key={item.label} className="bg-white border-2 border-[#E5E7EB] rounded-2xl px-4 py-4 flex flex-col gap-1.5">
                <p className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide">{item.label}</p>
                <p className="text-[#0F172A] text-[13px] md:text-[14px] font-bold leading-tight">{item.value}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-2.5 pb-2">
            <button
              onClick={onNext}
              className="w-full h-12 bg-primary hover:bg-primary-600 text-white rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              프로그램 제안받기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </button>
            {onBack && (
              <button onClick={onBack} className="w-full h-10 text-[#94A3B8] font-medium text-[13px] hover:text-[#64748B] transition-colors">
                이전으로
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
