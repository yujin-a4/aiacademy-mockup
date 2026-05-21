'use client'
import { useOnboardingStore } from '@/store/onboardingStore'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(ds: string): string {
  const d = new Date(ds + 'T00:00:00')
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`
}

const STYLE_ICONS: Record<string, string> = {
  '꼼꼼': '🔍', '빠르게': '⚡', '반복': '🔄',
  '스스로': '💪', '함께': '👥', '코칭': '🎯',
  '성취감': '🏆', '재미': '🎮', '습관': '📅',
}

const RANGE_LABEL: Record<string, string> = {
  'LC+RC': 'LC + RC (듣기 + 읽기)',
  'LC': 'LC (듣기 집중)',
  'RC': 'RC (읽기 집중)',
}

function getInsight(
  learningStyle: string | null,
  targetScore: number | null,
  dailyTime: string | null,
  userName: string,
): string {
  if (learningStyle === '꼼꼼' && (targetScore ?? 0) >= 800)
    return `꼼꼼한 분석형 성향이라 고득점에 유리해요. 문법 → 어휘 → 독해 순서로 차근차근 가면 ${targetScore}점 달성이 충분히 가능해요.`
  if (learningStyle === '빠르게')
    return `빠른 학습 성향을 가진 ${userName}님에게는 핵심 유형만 집중 공략하는 플랜이 잘 맞아요. 빈출 문법과 어휘를 빠르게 끝내고 실전으로 넘어갈게요.`
  if (dailyTime === '15분' || dailyTime === '30분')
    return `바쁜 일상에서도 꾸준히 하는 게 핵심이에요. ${dailyTime}도 최대한 효율적으로 활용할 수 있는 압축 플랜을 만들었어요.`
  return `${targetScore ?? 700}점 목표에 맞춰 AI가 최적의 학습 순서와 일정을 설계했어요. 지금 페이스 그대로 꾸준히 가면 충분히 달성할 수 있어요.`
}

export default function DiagnosisResult({ onNext }: { onNext: () => void }) {
  const {
    userName, learningStyle, managementStyle, motivationType,
    targetScore, studyRange, examDate, studyPeriod, dailyTime,
  } = useOnboardingStore()

  const insight = getInsight(learningStyle, targetScore, dailyTime, userName)

  const traits = [
    { label: '학습 방식', value: learningStyle, icon: STYLE_ICONS[learningStyle ?? ''] ?? '📖' },
    { label: '관리 방식', value: managementStyle, icon: STYLE_ICONS[managementStyle ?? ''] ?? '🎯' },
    { label: '동기 유형', value: motivationType, icon: STYLE_ICONS[motivationType ?? ''] ?? '⭐' },
  ]

  const goals = [
    { label: '목표 점수', value: `${targetScore ?? '-'}점` },
    { label: '학습 범위', value: RANGE_LABEL[studyRange ?? ''] ?? studyRange ?? '-' },
    { label: '시험 예정일', value: examDate ? formatDate(examDate) : '-' },
    { label: '학습 기간', value: studyPeriod ?? '-' },
    { label: '하루 학습 시간', value: dailyTime ?? '-' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] px-4 py-10 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-[390px] mx-auto flex flex-col flex-1 space-y-4 pb-6">

        {/* 헤더 */}
        <div className="text-center space-y-3 mb-1">
          <div className="w-14 h-14 mx-auto flex items-center justify-center bg-primary rounded-2xl animate-bounce-in">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-[#6B7280] text-xs font-semibold uppercase tracking-[0.15em]">AI 진단 완료</p>
            <h2 className="text-[#111318] text-[22px] font-bold">{userName}님의 진단 결과</h2>
            <p className="text-[#6B7280] text-[14px]">아래 내용을 확인하고 커리큘럼을 생성해요.</p>
          </div>
        </div>

        {/* 학습 성향 */}
        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5">
          <p className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-[0.15em] mb-4">내 학습 성향</p>
          <div className="grid grid-cols-3 gap-2.5">
            {traits.map(t => (
              <div key={t.label} className="flex flex-col items-center gap-1.5 bg-[#F3F4F6] rounded-xl p-3">
                <span className="text-[22px]">{t.icon}</span>
                <p className="text-[#111318] font-bold text-[13px]">{t.value ?? '-'}</p>
                <p className="text-[#9CA3AF] text-[10px] text-center leading-tight">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 목표 & 일정 */}
        <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5">
          <p className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-[0.15em] mb-4">목표 & 학습 계획</p>
          <div className="space-y-3">
            {goals.map(g => (
              <div key={g.label} className="flex items-center justify-between">
                <span className="text-[#6B7280] text-[13px]">{g.label}</span>
                <span className="text-[#111318] text-[13px] font-semibold">{g.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI 분석 한마디 */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[14px] p-4">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
            </div>
            <p className="text-[#374151] text-[13px] leading-relaxed">{insight}</p>
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
