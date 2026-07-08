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

const RANGE_DESC:  Record<string, string> = { W: '골고루 학습형', N: '우선순위 학습형' }
const DIFF_DESC:   Record<string, string> = { C: '레벨업 도전형', S: '안정 득점형' }
const MOTIVE_DESC: Record<string, string> = { R: '성취 보상형',   P: '목표 자극형' }
const RHYTHM_DESC: Record<string, string> = { D: '집중 몰입형',   M: '짧게 자주형' }

// 코드 순서: [W/N][C/S][R/P][D/M]
const TYPE_NAMES: Record<string, string> = {
  WCRD: '몰입 부스터',   WCRM: '성장 수집가',
  NCRD: '약점 해결사',   NCRM: '목표 실천가',
  WCPD: '점수 승부사',   WCPM: '흐름 전략가',
  NCPD: '고득점 추격자', NCPM: '전략 설계자',
  WSRD: '자신감 부스터', WSRM: '꾸준 성장캐',
  NSRD: '차곡 몰입러',   NSRM: '기초 저금러',
  WSPD: '점수 부스터',   WSPM: '플랜 지킴이',
  NSPD: '점수 회복러',   NSPM: '완주 루틴러',
}

const LETTER_COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-400 to-orange-500',
]

export default function DiagnosisResult({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const { userName, rangeAxis, difficulty, rhythm, motivation, targetScore, examDate, studyPeriod } = useOnboardingStore()

  // 코드 순서: [W/N][C/S][R/P][D/M]
  const letters = [rangeAxis ?? '?', difficulty ?? '?', motivation ?? '?', rhythm ?? '?']
  const typeKey = letters.join('')
  const typeName = TYPE_NAMES[typeKey] ?? '맞춤 학습형'

  const letterDetails = [
    { letter: letters[0], label: RANGE_DESC[rangeAxis ?? ''] ?? '-' },
    { letter: letters[1], label: DIFF_DESC[difficulty ?? ''] ?? '-' },
    { letter: letters[2], label: MOTIVE_DESC[motivation ?? ''] ?? '-' },
    { letter: letters[3], label: RHYTHM_DESC[rhythm ?? ''] ?? '-' },
  ]

  const dday = examDate ? dDayFrom(examDate) : null

  // 각 축의 값에 따라 레이더 꼭짓점 거리 결정 (중심 80,80 기준)
  const rTop    = rangeAxis  === 'W' ? 58 : 38
  const rRight  = difficulty === 'C' ? 56 : 40
  const rBottom = rhythm     === 'D' ? 60 : 36
  const rLeft   = motivation === 'R' ? 54 : 42

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

  const nameHighlightLen = (userName?.length ?? 0) + 1 // "[이름]님" 길이
  const fullMessage = `${userName}님은 ${typeName} 스타일의 학습자예요. ${RANGE_DESC[rangeAxis ?? '']}이면서 ${RHYTHM_DESC[rhythm ?? '']}인 성향에 꼭 맞는 프로그램을 제안해 드릴게요!`
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
  }, [fullMessage])

  const renderTypedText = () => {
    if (!typedText) return null
    if (typedText.length <= nameHighlightLen) {
      return <><span className="text-[#2563EB] font-bold">{typedText}</span></>
    }
    return (
      <>
        <span className="text-[#2563EB] font-bold">{typedText.slice(0, nameHighlightLen)}</span>
        {typedText.slice(nameHighlightLen)}
      </>
    )
  }

  const goalItems = [
    { label: '목표 점수', value: `${targetScore ?? '-'}점` },
    { label: '시험 예정일', value: examDate ? formatDate(examDate) : '-' },
    { label: '학습 기간', value: studyPeriod ?? '-' },
  ]

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-[1032px] min-h-[648px] rounded-3xl overflow-hidden shadow-2xl shadow-black/10 flex flex-col md:flex-row">

        {/* ── 좌측: 비주얼 영역 ── */}
        <div
          className="relative md:w-[45%] p-8 md:p-10 flex flex-col justify-between overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a3fa8 0%, #2563EB 55%, #4f8ef7 100%)' }}
        >
          <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-8 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          {/* 상단: 로고 + 결과 */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                <img src="/logo.svg" alt="YBM" className="w-5 h-5 object-contain brightness-0 invert"
                  onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
              </div>
              <span className="text-white/90 text-[14px] font-bold tracking-wide">YBM AI 어학원</span>
            </div>

            <p className="text-white/55 text-[11px] font-semibold tracking-[0.14em] uppercase mb-3">나의 토익 학습 유형</p>

            {/* MBTI 큰 글자 */}
            <div className="flex items-baseline gap-0 mb-3">
              {letters.map((letter, i) => (
                <span key={i} className="text-white font-black leading-none"
                  style={{ fontSize: 'clamp(48px, 9vw, 72px)', letterSpacing: '4px' }}>
                  {letter}
                </span>
              ))}
            </div>

            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[13px] font-bold px-4 py-1.5 rounded-full mb-5">
              {typeName}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {dday && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <span className="text-white/65 text-[11px] font-semibold">시험까지</span>
                  <span className="text-white font-bold text-[16px] leading-none">{dday}</span>
                </div>
              )}
              {targetScore && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <span className="text-white/65 text-[11px] font-semibold">목표</span>
                  <span className="text-white font-bold text-[16px] leading-none">{targetScore}점</span>
                </div>
              )}
              {studyPeriod && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                  <span className="text-white font-bold text-[16px] leading-none">{studyPeriod}</span>
                </div>
              )}
            </div>
          </div>

          {/* 하단: 레이더 차트 */}
          <div className="relative z-10 flex justify-center">
            <svg width="150" height="150" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <circle cx="80" cy="80" r="72" fill="url(#centerGrad)"/>
              <circle cx="80" cy="80" r="68" stroke="white" strokeOpacity="0.07" strokeWidth="1" fill="none"/>
              <circle cx="80" cy="80" r="50" stroke="white" strokeOpacity="0.10" strokeWidth="1" fill="none"/>
              <circle cx="80" cy="80" r="32" stroke="white" strokeOpacity="0.14" strokeWidth="1" fill="none"/>
              <circle cx="80" cy="80" r="15" stroke="white" strokeOpacity="0.18" strokeWidth="1" fill="none"/>
              <line x1="80" y1="12" x2="80" y2="148" stroke="white" strokeOpacity="0.07" strokeWidth="0.8"/>
              <line x1="12" y1="80" x2="148" y2="80" stroke="white" strokeOpacity="0.07" strokeWidth="0.8"/>
              <line x1="32" y1="32" x2="128" y2="128" stroke="white" strokeOpacity="0.05" strokeWidth="0.8"/>
              <line x1="128" y1="32" x2="32" y2="128" stroke="white" strokeOpacity="0.05" strokeWidth="0.8"/>
              <polygon points={outerPoly} fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinejoin="round"/>
              <polygon points={innerPoly} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.20)" strokeWidth="1" strokeLinejoin="round"/>
              <circle cx={pts.top.x}    cy={pts.top.y}    r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>
              <circle cx={pts.right.x}  cy={pts.right.y}  r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>
              <circle cx={pts.bottom.x} cy={pts.bottom.y} r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>
              <circle cx={pts.left.x}   cy={pts.left.y}   r="5" fill="white" fillOpacity="0.85" filter="url(#nodeglow)"/>
              <circle cx={pts.top.x}    cy={pts.top.y}    r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>
              <circle cx={pts.right.x}  cy={pts.right.y}  r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>
              <circle cx={pts.bottom.x} cy={pts.bottom.y} r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>
              <circle cx={pts.left.x}   cy={pts.left.y}   r="9" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="none"/>
              <circle cx="80" cy="80" r="8" fill="rgba(255,255,255,0.15)" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
              <circle cx="80" cy="80" r="3.5" fill="white" fillOpacity="0.9"/>
              <circle cx="112" cy="48" r="2" fill="white" fillOpacity="0.35"/>
              <circle cx="122" cy="112" r="1.5" fill="white" fillOpacity="0.25"/>
              <circle cx="50" cy="118" r="2" fill="white" fillOpacity="0.30"/>
              <circle cx="44" cy="52" r="1.5" fill="white" fillOpacity="0.25"/>
              <circle cx="96" cy="14" r="1.5" fill="white" fillOpacity="0.20"/>
              <circle cx="148" cy="64" r="1.5" fill="white" fillOpacity="0.20"/>
            </svg>
          </div>
        </div>

        {/* ── 우측: 결과 상세 ── */}
        <div className="md:w-[55%] bg-white flex flex-col justify-center px-8 md:px-10 py-10">
          <div className="flex flex-col gap-5">

            {/* 헤딩 */}
            <div>
              <span className="inline-block bg-primary text-white text-[11px] font-semibold px-3.5 py-1 rounded-full tracking-widest mb-3 uppercase">
                AI 진단 완료
              </span>
              <h2 className="text-[#0F172A] text-[22px] font-bold leading-tight">
                {userName}님의 학습 유형 분석 결과
              </h2>
            </div>

            {/* 4글자 배지 — 2x2 그리드 */}
            <div className="grid grid-cols-2 gap-2">
              {letterDetails.map((d, i) => (
                <div key={i} className="bg-[#F8FAFF] rounded-2xl py-3 px-4 flex items-center gap-3 border border-[#E5E7EB]">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${LETTER_COLORS[i]} flex items-center justify-center shadow-sm shrink-0`}>
                    <span className="text-white text-[17px] font-bold">{d.letter}</span>
                  </div>
                  <p className="text-[#374151] text-[12px] font-semibold leading-tight">{d.label}</p>
                </div>
              ))}
            </div>

            {/* 타이핑 메시지 */}
            <div className="bg-[#F8FAFF] border border-[#E5E7EB] rounded-2xl px-5 py-4">
              <p className="text-[#0F172A] text-[13px] md:text-[14px] leading-relaxed">
                {renderTypedText()}
                {!typingDone && (
                  <span className="inline-block w-0.5 h-[14px] bg-primary align-middle ml-0.5 animate-pulse" />
                )}
              </p>
            </div>

            {/* 목표 & 학습 계획 */}
            <div className="grid grid-cols-3 gap-2">
              {goalItems.map((item) => (
                <div key={item.label} className="bg-[#F8FAFF] border border-[#E5E7EB] rounded-xl px-3 py-3 flex flex-col gap-1">
                  <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wide">{item.label}</p>
                  <p className="text-[#0F172A] text-[12px] md:text-[13px] font-bold leading-tight">{item.value}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2">
              <button
                onClick={onNext}
                className="w-full h-12 bg-primary hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
              >
                프로그램 제안받기
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </button>
              {onBack && (
                <button onClick={onBack} className="w-full h-9 text-[#94A3B8] font-medium text-[13px] hover:text-[#64748B] transition-colors">
                  이전으로
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
