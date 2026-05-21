'use client'
import { useOnboardingStore } from '@/store/onboardingStore'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(ds: string): string {
  const d = new Date(ds + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`
}

// QuizCard actual values → letter
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

// 유형 이름: learningStyle 첫글자 + motivationType 첫글자 조합
const TYPE_NAMES: Record<string, string> = {
  'FP': '목표 돌파형', 'FA': '활력 성취형', 'FJ': '활력 탐험형', 'FH': '스피드 루틴형',
  'TP': '꼼꼼 점수형', 'TA': '완벽 달성형', 'TJ': '탐구 즐김형', 'TH': '정밀 루틴형',
  'RP': '반복 점수형', 'RA': '반복 정복형', 'RJ': '반복 탐험형', 'RH': '습관 강화형',
}

const RANGE_LABEL: Record<string, string> = {
  'LC+RC': 'LC + RC (듣기 + 읽기)',
  'LC': 'LC (듣기 집중)',
  'RC': 'RC (읽기 집중)',
}

const LETTER_COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-400 to-orange-500',
]

export default function DiagnosisResult({ onNext }: { onNext: () => void }) {
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

  const goals = [
    { label: '목표 점수', value: `${targetScore ?? '-'}점` },
    { label: '학습 범위', value: RANGE_LABEL[studyRange ?? ''] ?? studyRange ?? '-' },
    { label: '시험 예정일', value: examDate ? formatDate(examDate) : '-' },
    { label: '학습 기간', value: studyPeriod ?? '-' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] px-4 py-10 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-[390px] mx-auto flex flex-col flex-1 space-y-4 pb-6">

        {/* 헤더 */}
        <div className="text-center space-y-1 mb-1">
          <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-[0.15em]">AI 진단 완료</p>
          <h2 className="text-[#111318] text-[22px] font-bold">{userName}님의 학습 유형</h2>
        </div>

        {/* MBTI 스타일 타입 카드 */}
        <div className="bg-gradient-to-br from-primary via-blue-600 to-indigo-700 rounded-[20px] px-6 pt-7 pb-5 text-center shadow-lg">
          <div className="flex items-center justify-center gap-1 mb-4">
            {letters.map((letter, i) => (
              <span
                key={i}
                className="text-white font-black leading-none"
                style={{ fontSize: '58px', letterSpacing: '3px' }}
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="inline-block bg-white/25 backdrop-blur-sm rounded-full px-5 py-1.5 mb-4">
            <p className="text-white text-[15px] font-bold tracking-wide">{typeName}</p>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {letterDetails.map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-white/65 text-[9.5px] leading-snug">{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 각 글자 배지 */}
        <div className="grid grid-cols-2 gap-2">
          {letterDetails.map((d, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-[12px] p-3 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${LETTER_COLORS[i]} flex items-center justify-center shrink-0`}>
                <span className="text-white text-[18px] font-black">{d.letter}</span>
              </div>
              <p className="text-[#374151] text-[12px] font-medium leading-tight">{d.label}</p>
            </div>
          ))}
        </div>

        {/* AI 매니저 */}
        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0 gap-1">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <p className="text-[#9CA3AF] text-[9px] font-semibold whitespace-nowrap">AI 매니저</p>
            </div>
            <div className="flex-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[14px] rounded-tl-[4px] px-3.5 py-3">
              <p className="text-[#1D4ED8] text-[13px] leading-relaxed font-medium">
                지금부터 <span className="font-bold">{userName}님</span>에게 딱 맞는 강사와 프로그램을 제안해 드릴게요! 🎯
              </p>
            </div>
          </div>
        </div>

        {/* 목표 & 일정 */}
        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-4">
          <p className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-[0.15em] mb-3">목표 & 학습 계획</p>
          <div className="space-y-2.5">
            {goals.map(g => (
              <div key={g.label} className="flex items-center justify-between">
                <span className="text-[#6B7280] text-[13px]">{g.label}</span>
                <span className="text-[#111318] text-[13px] font-semibold">{g.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <button
          onClick={onNext}
          className="w-full bg-primary-500 hover:bg-primary-400 text-white rounded-[10px] h-11 font-semibold text-[15px] transition-colors active:scale-[0.98]"
        >
          커리큘럼 생성하기
        </button>
      </div>
    </div>
  )
}
