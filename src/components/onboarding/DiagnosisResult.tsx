'use client'
import { useState, useEffect } from 'react'
import { useOnboardingStore } from '@/store/onboardingStore'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(ds: string): string {
  const d = new Date(ds + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`
}

function dDayFrom(ds: string): string {
  const diff = new Date(ds + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  const days = Math.ceil(diff / 86400000)
  return days > 0 ? `D-${days}` : days === 0 ? 'D-Day' : `D+${Math.abs(days)}`
}

const LEARN_LETTER: Record<string, string> = { '빠르게': 'F', '꼼꼼': 'T', '반복': 'R' }
const MANAGE_LETTER: Record<string, string> = { '강하게': 'D', '스스로': 'I', '함께': 'G', '코칭': 'C' }
const MOTIVE_LETTER: Record<string, string> = { '점수': 'P', '성취감': 'A', '재미': 'J', '습관': 'H' }
const TIME_LETTER: Record<string, string> = { '15분': 'L', '30분': 'M', '1시간': 'N', '1시간 이상': 'X' }

const LEARN_DESC: Record<string, string> = { '빠르게': '핵심 속공형', '꼼꼼': '꼼꼼 분석형', '반복': '반복 강화형' }
const MANAGE_DESC: Record<string, string> = {
  '강하게': '직접 피드백형', '스스로': '자기 주도형', '함께': '협력 선호형', '코칭': '코칭 수용형',
}
const MOTIVE_DESC: Record<string, string> = {
  '점수': '점수 달성형', '성취감': '성취감 추구형', '재미': '즐거움 추구형', '습관': '습관 형성형',
}
const TIME_DESC: Record<string, string> = {
  '15분': '스낵 학습형', '30분': '집중 단기형', '1시간': '균형 집중형', '1시간 이상': '몰입 심화형',
}

const TYPE_NAMES: Record<string, string> = {
  'FP': '목표 돌파형', 'FA': '활력 성취형', 'FJ': '활력 탐험형', 'FH': '스피드 루틴형',
  'TP': '꼼꼼 점수형', 'TA': '완벽 달성형', 'TJ': '탐구 즐김형', 'TH': '정밀 루틴형',
  'RP': '반복 점수형', 'RA': '반복 정복형', 'RJ': '반복 탐험형', 'RH': '습관 강화형',
}

const RANGE_LABEL: Record<string, string> = {
  'LC+RC': 'LC + RC', 'LC': 'LC (듣기)', 'RC': 'RC (읽기)',
}

const LETTER_COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-400 to-orange-500',
]

const GOAL_ITEMS = [
  { icon: '', label: '목표 점수' },
  { icon: '', label: '학습 범위' },
  { icon: '', label: '시험 예정일' },
  { icon: '', label: '학습 기간' },
  { icon: '', label: '하루 학습' },
]

export default function DiagnosisResult({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const {
    userName, learningStyle, managementStyle, motivationType,
    targetScore, studyRange, examDate, studyPeriod, dailyTime,
  } = useOnboardingStore()

  const letters = [
    LEARN_LETTER[learningStyle ?? ''] ?? '?',
    MANAGE_LETTER[managementStyle ?? ''] ?? '?',
    MOTIVE_LETTER[motivationType ?? ''] ?? '?',
    TIME_LETTER[dailyTime ?? ''] ?? '?',
  ]
  const typeKey = `${letters[0]}${letters[2]}`
  const typeName = TYPE_NAMES[typeKey] ?? '맞춤 학습형'

  const letterDetails = [
    { letter: letters[0], label: LEARN_DESC[learningStyle ?? ''] ?? learningStyle ?? '-' },
    { letter: letters[1], label: MANAGE_DESC[managementStyle ?? ''] ?? managementStyle ?? '-' },
    { letter: letters[2], label: MOTIVE_DESC[motivationType ?? ''] ?? motivationType ?? '-' },
    { letter: letters[3], label: TIME_DESC[dailyTime ?? ''] ?? dailyTime ?? '-' },
  ]

  const dday = examDate ? dDayFrom(examDate) : null

  const fullMessage = `${userName}님, 목표 점수까지 가는 가장 효율적인 커리큘럼을 만들었어요. 지금부터 딱 맞는 프로그램을 제안해 드릴게요!`
  const [typedText, setTypedText] = useState('')
  const [typingDone, setTypingDone] = useState(false)

  useEffect(() => {
    setTypedText('')
    setTypingDone(false)
    let i = 0
    const timer = setInterval(() => {
      i++
      setTypedText(fullMessage.slice(0, i))
      if (i >= fullMessage.length) {
        clearInterval(timer)
        setTypingDone(true)
      }
    }, 35)
    return () => clearInterval(timer)
  }, [fullMessage])

  const goalValues = [
    `${targetScore ?? '-'}점`,
    RANGE_LABEL[studyRange ?? ''] ?? studyRange ?? '-',
    examDate ? formatDate(examDate) : '-',
    studyPeriod ?? '-',
    dailyTime ?? '-',
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F4FF] animate-fade-in">

      {/* 헤더 바 */}
      <div className="w-full bg-white/80 backdrop-blur-sm border-b border-[#E5E7EB] px-4 md:px-8 py-3 flex items-center gap-3 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#374151] rounded-lg hover:bg-[#F3F4F6] transition-colors shrink-0"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div>
          <p className="text-[#6B7280] text-[10px] font-semibold uppercase tracking-[0.18em]">AI 진단 완료</p>
          <h1 className="text-[#111318] text-[16px] md:text-[18px] font-bold leading-tight">{userName}님의 학습 유형</h1>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-7">
        <div className="max-w-[960px] mx-auto flex flex-col gap-4 md:gap-5">

          {/* ── 상단: 모바일 1컬럼 / 데스크톱 2컬럼 ── */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4 md:gap-5 items-stretch">

            {/* 왼쪽: MBTI 히어로 카드 + 글자 배지 */}
            <div className="flex flex-col gap-3 md:gap-4">

              {/* MBTI 히어로 카드 */}
              <div
                className="rounded-xl p-5 md:p-7 relative overflow-hidden shadow-lg border border-[#1a3fa8]/20"
                style={{ background: 'linear-gradient(135deg, #1a3fa8 0%, #2563EB 55%, #4f8ef7 100%)' }}
              >
                <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-6 -bottom-8 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                <div className="relative z-10">
                  <p className="text-white/55 text-[10px] font-semibold tracking-[0.14em] uppercase mb-2">나의 토익 학습 유형</p>

                  <div className="flex items-baseline gap-0 mb-2">
                    {letters.map((letter, i) => (
                      <span
                        key={i}
                        className="text-white font-black leading-none"
                        style={{ fontSize: 'clamp(44px, 10vw, 72px)', letterSpacing: '4px' }}
                      >
                        {letter}
                      </span>
                    ))}
                  </div>

                  <div className="mb-4">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-[12px] md:text-[13px] font-bold px-3.5 py-1.5 rounded-full">
                      {typeName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {dday && (
                      <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                        <span className="text-white/65 text-[10px] font-semibold">시험까지</span>
                        <span className="text-white font-black text-[14px] md:text-[16px] leading-none">{dday}</span>
                      </div>
                    )}
                    {targetScore && (
                      <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                        <span className="text-white/65 text-[10px] font-semibold">목표</span>
                        <span className="text-white font-black text-[14px] md:text-[16px] leading-none">{targetScore}점</span>
                      </div>
                    )}
                    {studyPeriod && (
                      <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5">
                        <span className="text-white font-black text-[14px] md:text-[16px] leading-none">{studyPeriod}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4글자 배지 */}
              <div className="grid grid-cols-4 gap-2 md:gap-3">
                {letterDetails.map((d, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl py-3 md:py-4 px-1.5 md:px-2.5 flex flex-col items-center gap-2 md:gap-3 shadow-sm border border-[#E5E7EB]"
                  >
                    <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${LETTER_COLORS[i]} flex items-center justify-center shadow-sm`}>
                      <span className="text-white text-[18px] md:text-[22px] font-black">{d.letter}</span>
                    </div>
                    <p className="text-[#374151] text-[10px] md:text-[11px] font-semibold leading-tight text-center">{d.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 오른쪽: AI 매니저 */}
            <div
              className="rounded-xl overflow-hidden relative shadow-md border border-[#BFDBFE]/60"
              style={{ background: 'linear-gradient(160deg, #EBF2FF 0%, #D6E8FF 60%, #C5DAFF 100%)' }}
            >
              {/* 모바일: 가로 배치 / 데스크톱: 세로 배치 */}
              <div className="flex flex-row md:flex-col h-full">

                {/* 말풍선 영역 */}
                <div className="flex-1 px-4 pt-4 pb-4 md:px-5 md:pt-5 md:pb-0 z-10 relative">
                  <p className="text-[#1D4ED8] text-[12px] md:text-[13px] font-bold tracking-wide mb-2">AI 매니저</p>
                  <div className="relative">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3.5 py-3 md:px-4 md:py-3.5 shadow-sm h-[88px] md:h-[100px] overflow-hidden">
                      <p className="text-[#1C1B33] text-[12px] md:text-[12.5px] leading-relaxed">
                        {typedText}
                        {!typingDone && (
                          <span className="inline-block w-0.5 h-[13px] bg-[#2563EB] align-middle ml-0.5 animate-pulse" />
                        )}
                      </p>
                    </div>
                    {/* 말풍선 꼬리 — 모바일: 오른쪽 / 데스크톱: 아래 */}
                    <div
                      className="hidden md:block absolute -bottom-[9px] left-8 w-0 h-0"
                      style={{
                        borderLeft: '9px solid transparent',
                        borderRight: '9px solid transparent',
                        borderTop: '9px solid rgba(255,255,255,0.9)',
                      }}
                    />
                  </div>
                </div>

                {/* AI 매니저 사진 */}
                <div className="shrink-0 flex items-end justify-center overflow-hidden
                  w-[110px] md:w-full
                  h-full md:h-auto md:mt-2"
                >
                  <img
                    src="/image_reference/ai-manager2.png"
                    alt="AI 매니저"
                    className="object-contain object-bottom
                      h-full max-h-[160px]
                      md:w-full md:h-auto md:max-h-[280px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 목표 & 학습 계획 ── */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-4 md:p-6">
            <p className="text-[#6B7280] text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.18em] mb-3 md:mb-4">목표 & 학습 계획</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
              {GOAL_ITEMS.map((item, i) => (
                <div
                  key={item.label}
                  className={`bg-[#F8FAFF] rounded-xl px-3 py-3 md:px-4 md:py-3.5 flex flex-col gap-1 md:gap-1.5
                    ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}
                >
                  <span className="text-[16px] md:text-[18px]">{item.icon}</span>
                  <p className="text-[#9CA3AF] text-[10px] md:text-[11px] font-medium">{item.label}</p>
                  <p className="text-[#111318] text-[12px] md:text-[13px] font-bold leading-tight">{goalValues[i]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2 pb-2">
            <button
              onClick={onNext}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-[15px] transition-colors active:scale-[0.98] shadow-lg shadow-[#2563EB]/25 flex items-center justify-center gap-2"
              style={{ height: '52px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              프로그램 제안받기
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="w-full h-9 text-[#9CA3AF] font-medium text-sm hover:text-[#6B7280] transition-colors"
              >
                이전
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
