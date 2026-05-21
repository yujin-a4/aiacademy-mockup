'use client'
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

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] px-4 py-10 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-[390px] mx-auto flex flex-col flex-1 space-y-3 pb-6">

        {/* 헤더 + 뒤로가기 */}
        <div className="relative text-center space-y-0.5 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#6B7280] hover:text-[#374151] transition-colors rounded-lg hover:bg-white"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-[0.15em]">AI 진단 완료</p>
          <h2 className="text-[#111318] text-[22px] font-bold">{userName}님의 학습 유형</h2>
        </div>

        {/* ── MBTI 히어로 카드 (대시보드 D-day 카드 스타일) ── */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden shadow-md"
          style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)' }}
        >
          {/* 배경 원형 장식 */}
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-4 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-white/60 text-[11px] font-semibold tracking-[0.12em] uppercase mb-2">나의 토익 학습 유형</p>
            {/* 대형 유형 코드 */}
            <div className="flex items-baseline gap-1 mb-3">
              {letters.map((letter, i) => (
                <span key={i} className="text-white font-black leading-none" style={{ fontSize: '56px', letterSpacing: '2px' }}>
                  {letter}
                </span>
              ))}
            </div>
            {/* 유형명 뱃지 */}
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="bg-white/25 backdrop-blur-sm text-white text-[13px] font-bold px-3.5 py-1 rounded-full">
                {typeName}
              </span>
            </div>
            {/* D-day + 목표점수 인라인 */}
            <div className="flex items-center gap-3">
              {dday && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <span className="text-white/70 text-[10px] font-semibold">시험까지</span>
                  <span className="text-white font-black text-[16px] leading-none">{dday}</span>
                </div>
              )}
              {targetScore && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <span className="text-white/70 text-[10px] font-semibold">목표</span>
                  <span className="text-white font-black text-[16px] leading-none">{targetScore}점</span>
                </div>
              )}
              {studyPeriod && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <span className="text-white font-black text-[16px] leading-none">{studyPeriod}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 글자 배지 — 가로형 4열 (대시보드 카드 스타일) */}
        <div className="grid grid-cols-4 gap-2">
          {letterDetails.map((d, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl py-3 px-1.5 flex flex-col items-center gap-2 shadow-sm border border-[#F3F4F6]"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${LETTER_COLORS[i]} flex items-center justify-center shadow-sm`}>
                <span className="text-white text-[18px] font-black">{d.letter}</span>
              </div>
              <p className="text-[#374151] text-[10px] font-medium leading-tight text-center">{d.label}</p>
            </div>
          ))}
        </div>

        {/* ── AI 매니저 카드 (대시보드 선생님 카드 스타일) ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 55%, #BFDBFE 100%)' }}
        >
          <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-[#60A5FA]/15 blur-3xl pointer-events-none" />
          <span className="self-start inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
            AI 매니저의 한마디
          </span>
          <div className="flex items-end gap-2">
            {/* 아바타 */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            {/* 말풍선 */}
            <div className="relative bg-white rounded-2xl px-3.5 py-2.5 shadow-md flex-1">
              <div
                className="absolute -left-[7px] top-4 w-0 h-0"
                style={{ borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '7px solid white' }}
              />
              <p className="text-[#1C1B33] text-[13px] leading-relaxed">
                지금부터 <span className="font-bold text-[#2563EB]">{userName}님</span>에게 딱 맞는 강사와 프로그램을 제안해 드릴게요! 🎯
              </p>
            </div>
          </div>
        </div>

        {/* 목표 요약 — 대시보드 리스트 카드 스타일 */}
        <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-5">
          <p className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-[0.15em] mb-3">목표 & 학습 계획</p>
          <div className="space-y-2.5">
            {[
              { label: '목표 점수', value: `${targetScore ?? '-'}점` },
              { label: '학습 범위', value: RANGE_LABEL[studyRange ?? ''] ?? studyRange ?? '-' },
              { label: '시험 예정일', value: examDate ? formatDate(examDate) : '-' },
              { label: '학습 기간', value: studyPeriod ?? '-' },
              { label: '하루 학습', value: dailyTime ?? '-' },
            ].map(g => (
              <div key={g.label} className="flex items-center justify-between">
                <span className="text-[#6B7280] text-[13px]">{g.label}</span>
                <span className="text-[#1C1B33] text-[13px] font-semibold">{g.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <div className="space-y-2 pb-2">
          <button
            onClick={onNext}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl h-12 font-bold text-[15px] transition-colors active:scale-[0.98] shadow-md shadow-[#2563EB]/20"
          >
            커리큘럼 생성하기
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full h-10 text-[#6B7280] font-medium text-sm hover:text-[#374151] transition-colors"
            >
              이전
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
