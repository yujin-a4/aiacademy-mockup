'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo } from 'react'

const MISSIONS = [
  { id: 1, text: '단어 50개 암기', done: true, tag: null },
  { id: 2, text: '문법 기초 2강 수강', done: false, tag: 'AI 추천' },
  { id: 3, text: 'Part 5 실전 문제 10개', done: false, tag: null },
  { id: 4, text: '오늘의 단어 테스트', done: false, tag: 'AI 추천' },
  { id: 5, text: '복습 퀴즈 완료', done: false, tag: null },
]

const INST_NAME: Record<string, string> = { park: '박혜원', jang: '장연지', kim: '김토익' }
const INST_MESSAGES: Record<string, string> = {
  park: '오늘 하루도 완벽하게! 작은 실수도 그냥 넘기지 않는 것이 실력입니다.',
  jang: '괜찮아요, 틀려도 돼요. 꾸준히만 나아가면 반드시 도달할 수 있어요.',
  kim: '오늘 학습한 단어 하나가 시험장에서 당신을 구할 수 있습니다!',
}

const AI_RECS = [
  { tag: 'RC', title: '독해 속도 향상 훈련', sub: '장연지 · 35분', bg: '#EEF2FF', tc: '#4F46E5' },
  { tag: 'LC', title: 'Part 2 단문 응답 집중', sub: '박혜원 · 40분', bg: '#FEF9C3', tc: '#B45309' },
  { tag: '어휘', title: '비즈니스 단어 Top 100', sub: '김토익 · 25분', bg: '#F0FDF4', tc: '#059669' },
]

const STATS = [
  { label: '진행률', value: '65%', change: '+3%', color: '#4F46E5' },
  { label: '학습 시간', value: '42.5h', change: '+2h', color: '#6366F1' },
  { label: '어휘 레벨', value: 'Lv.14', change: '+1', color: '#7C3AED' },
  { label: '정답률', value: '78%', change: '+5%', color: '#8B5CF6' },
]

function Sparkline() {
  const pts = '0,40 18,34 36,28 54,31 72,19 90,14 108,17 130,8'
  return (
    <svg width="100%" height="52" viewBox="0 0 130 52" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,52 ${pts} 130,52`} fill="url(#spk)" />
      <polyline points={pts} fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="130" cy="8" r="3.5" fill="#4F46E5" />
    </svg>
  )
}

const NAV = [
  {
    label: '홈', active: true, href: '/dashboard',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={a ? '#4F46E5' : 'none'} stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: '내 학습', active: false, href: '/my-learning',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: '현황', active: false,
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: '알림', active: false,
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
]

const SETTINGS_ICON = (a: boolean) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

/* ── 사이드바 ── */
function Sidebar({ open, setOpen, userName, targetScore }: {
  open: boolean; setOpen: (v: boolean) => void; userName: string; targetScore: string
}) {
  return (
    <aside className={`hidden md:flex flex-col bg-[#F8FAFF] border-r border-[#ECEAF5] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[240px]' : 'w-[56px]'}`}>

      {/* 로고 + 토글 */}
      <div className={`flex items-center min-h-[60px] shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
        {open && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] tracking-tight">YBM</span>
            </div>
            <span className="text-[#1C1B33] font-bold text-[15px]">AI Course</span>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-7 h-7 rounded-lg bg-[#ECEAF5] hover:bg-[#DDD9F7] flex items-center justify-center transition-all shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* 프로필 */}
      <div className={`${open ? 'px-4 pb-4' : 'pb-3 flex flex-col items-center'}`}>
        {open ? (
          <div className="bg-white border border-[#ECEAF5] rounded-2xl p-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#818CF8] to-[#4F46E5] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {userName ? userName.slice(0, 1) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[#1C1B33] font-semibold text-sm truncate">{userName || '학습자'}님</p>
                <span className="text-[#9CA3AF] text-[11px]">Level 5 · TOEIC 준비</span>
              </div>
            </div>
            {targetScore && (
              <div className="mt-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[#9CA3AF] text-[10px]">목표까지</span>
                  <span className="text-[#1C1B33] text-[10px] font-semibold">{targetScore}점</span>
                </div>
                <div className="w-full h-1.5 bg-[#ECEAF5] rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#818CF8] to-[#4F46E5] h-full rounded-full w-[65%]" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#818CF8] to-[#4F46E5] flex items-center justify-center text-white font-bold text-sm">
            {userName ? userName.slice(0, 1) : 'U'}
          </div>
        )}
      </div>

      <div className={`mb-2 ${open ? 'px-4' : 'px-3'}`}><div className="h-px bg-[#ECEAF5]" /></div>

      {/* 네비 */}
      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href ?? '#'}
            className={`w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#6B7280] hover:bg-[#EEF2FF] hover:text-[#4F46E5]'}`}
          >
            <span className="shrink-0">{item.icon(item.active)}</span>
            {open && <span className="animate-fade-in">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={`${open ? 'px-3' : 'px-2'} mb-3`}>
        <div className="mb-2"><div className="h-px bg-[#ECEAF5]" /></div>
        <button className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
          <span className="shrink-0">{SETTINGS_ICON(false)}</span>
          {open && <span className="animate-fade-in">설정</span>}
        </button>
      </div>


    </aside>
  )
}

/* ── 모바일 하단 네비 ── */
function BottomNav() {
  const items = [
    ...NAV.slice(0, 4),
    { label: '설정', active: false, href: '#', icon: SETTINGS_ICON },
  ]
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#ECEAF5] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {items.map((item) => (
        <Link key={item.label} href={item.href ?? '#'} className={`flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`}>
          {item.icon(item.active)}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

/* ── 대시보드 ── */
export default function Dashboard() {
  const { userName, selectedInstructor, targetScore, examDate } = useOnboardingStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [missions, setMissions] = useState(MISSIONS)

  const instName = INST_NAME[selectedInstructor ?? 'jang'] ?? '장연지'
  const completedCount = missions.filter((m) => m.done).length
  const completedPct = Math.round((completedCount / missions.length) * 100)

  const ddayLabel = useMemo(() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  const WEEK = useMemo(() => {
    const today = new Date()
    const dow = today.getDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const isToday = d.toDateString() === today.toDateString()
      const isPast = d < today && !isToday
      return {
        day: ['월', '화', '수', '목', '금', '토', '일'][i],
        date: d.getDate(),
        status: isToday ? 'current' : isPast ? 'complete' : 'pending',
      }
    })
  }, [])

  const toggleMission = (id: number) =>
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m)))

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">

      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} userName={userName ?? ''} targetScore={targetScore?.toString() ?? ''} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── 모바일 헤더 ── */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#9CA3AF] text-[13px]">안녕하세요</p>
              <p className="text-[#1C1B33] text-[20px] font-bold leading-snug">{userName || '학습자'}님 👋</p>
              {ddayLabel && (
                <span className="inline-block mt-1 text-[11px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
                  {ddayLabel} · 시험까지
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F0FDF4] rounded-full px-3 py-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
                <span className="text-[#10B981] text-[11px] font-semibold">12일 연속</span>
              </div>
              <button className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* ── 콘텐츠 ── */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-28 md:pb-10">
          <div className="max-w-[1100px] mx-auto w-full space-y-4">

            {/* 데스크탑 인사 헤더 */}
            <div className="hidden md:flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-[13px]">좋은 하루예요, 오늘도 파이팅!</p>
                <h1 className="text-[#1C1B33] text-[24px] font-bold leading-snug">
                  안녕하세요, {userName || '학습자'}님 👋
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {ddayLabel && (
                  <div className="flex items-center gap-2 bg-white border border-[#ECEAF5] rounded-xl px-4 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <div>
                      <p className="text-[9px] text-[#9CA3AF] font-semibold uppercase tracking-wider leading-none">시험까지</p>
                      <p className="text-[#4F46E5] font-black text-[18px] leading-none mt-0.5">{ddayLabel}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
                  <div>
                    <p className="text-[9px] text-[#9CA3AF] font-semibold uppercase tracking-wider leading-none">연속 학습</p>
                    <p className="text-[#10B981] font-black text-[18px] leading-none mt-0.5">12일</p>
                  </div>
                </div>
                <button className="relative w-10 h-10 rounded-xl bg-white border border-[#ECEAF5] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                </button>
              </div>
            </div>

            {/* ── 히어로 2분할 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* 히어로 카드 */}
              <div className="lg:col-span-3 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EAE8FF] via-[#E0DBFF] to-[#D5CEFF] min-h-[200px] p-6">
                {/* 장식 오브 */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-[#C4B5FD]/50 blur-md pointer-events-none" />
                <div className="absolute right-24 bottom-2 w-20 h-20 rounded-full bg-[#A5B4FC]/40 blur-sm pointer-events-none" />
                <div className="absolute right-12 top-3 w-12 h-12 rounded-full bg-[#818CF8]/25 pointer-events-none" />
                {/* 강사 아바타 */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:block">
                  <img
                    src="/instructor/park.png"
                    alt={instName}
                    className="w-[88px] h-[88px] rounded-full object-cover shadow-xl ring-4 ring-white/40"
                  />
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#FCD34D] shadow-md flex items-center justify-center text-[10px]">⭐</div>
                </div>

                <div className="relative z-10 max-w-[260px] sm:max-w-[310px]">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4F46E5] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
                    AI RC 오늘의 추천
                  </span>
                  <h2 className="mt-3 text-[#1C1B33] text-[20px] sm:text-[22px] font-bold leading-snug">
                    Part 5 집중 공략:<br />문법 공식 정복
                  </h2>
                  <p className="mt-2 text-[#5B5A72] text-[13px] leading-relaxed line-clamp-2">
                    {instName} 튜터가 기다리고 있어요. 오늘의 주제: 복합 절에서의 동사 식별.
                  </p>
                  <Link
                    href="/classroom"
                    className="mt-5 inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-colors active:scale-[0.98] shadow-lg shadow-[#4F46E5]/30"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    1:1 세션 시작하기
                  </Link>
                </div>
              </div>

              {/* 목표 점수 카드 */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-5 flex flex-col">
                <p className="text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider">목표 점수</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[44px] font-black text-[#1C1B33] leading-none">643</span>
                  <span className="text-[#9CA3AF] text-sm">/ {targetScore || 990}점</span>
                </div>
                <div className="mt-2 flex-1">
                  <Sparkline />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[#4F46E5] text-[11px] font-semibold">↑ 지난달 대비 +23점</span>
                  <span className="text-[#9CA3AF] text-[11px]">65% 달성</span>
                </div>
                {/* 강사 한마디 */}
                <div className="mt-4 bg-[#F5F4FF] rounded-xl p-3 border border-[#E0DEFF]">
                  <div className="flex items-start gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p className="text-[#5B5A72] text-[12px] leading-relaxed">
                      {INST_MESSAGES[selectedInstructor ?? 'jang'] ?? INST_MESSAGES.jang}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 통계 4열 ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-4">
                  <p className="text-[#9CA3AF] text-[11px] font-medium">{s.label}</p>
                  <p className="text-[24px] font-black leading-none mt-1.5" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[#10B981] text-[11px] font-semibold mt-1.5">{s.change} 이번 주</p>
                </div>
              ))}
            </div>

            {/* ── 3열 섹션 ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 이번 주 학습 현황 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-5">
                <h3 className="text-[#1C1B33] font-bold text-[14px] mb-4">이번 주 학습 현황</h3>
                <div className="flex justify-between items-end">
                  {WEEK.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-[#9CA3AF] font-medium">{d.day}</span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold transition-all ${
                        d.status === 'complete' ? 'bg-[#EEF2FF] text-[#4F46E5]' :
                        d.status === 'current' ? 'bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/30' :
                        'bg-[#FAFAFA] text-[#D1D5DB]'
                      }`}>
                        {d.date}
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        d.status === 'complete' ? 'bg-[#10B981]' :
                        d.status === 'current' ? 'bg-[#4F46E5]' :
                        'bg-[#ECEAF5]'
                      }`} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-[#F0FDF4] rounded-xl py-2.5 px-3 flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
                  <p className="text-[#059669] text-[12px] font-semibold">12일 연속 학습 중!</p>
                </div>
              </div>

              {/* 오늘의 미션 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] overflow-hidden">
                <div className="h-1 bg-[#FAFAFA]">
                  <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] h-full transition-all duration-500" style={{ width: `${completedPct}%` }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[#1C1B33] font-bold text-[14px]">오늘의 미션</h3>
                    <span className="text-[#4F46E5] font-semibold text-[11px] bg-[#EEF2FF] px-2.5 py-1 rounded-full">{completedPct}% 완료</span>
                  </div>
                  <div className="space-y-2">
                    {missions.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMission(m.id)}
                        className="cursor-pointer flex items-center gap-3 p-3 rounded-xl border border-[#ECEAF5] hover:border-[#C7D2FE] transition-all active:scale-[0.98]"
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${m.done ? 'bg-[#10B981]' : 'border-2 border-[#D1D5DB] bg-white'}`}>
                          {m.done && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <p className={`text-[13px] flex-1 leading-snug ${m.done ? 'text-[#9CA3AF] line-through' : 'text-[#1C1B33] font-medium'}`}>
                          {m.text}
                        </p>
                        {m.tag && !m.done && (
                          <span className="text-[10px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-1.5 py-0.5 rounded-md shrink-0">{m.tag}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI 강사 추천 코스 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold text-[#06B6D4] bg-[#ECFEFF] border border-[#A5F3FC] px-2 py-0.5 rounded-full">AI 추천</span>
                  <h3 className="text-[#1C1B33] font-bold text-[14px]">강사 추천 코스</h3>
                </div>
                <div className="space-y-2.5">
                  {AI_RECS.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#ECEAF5] hover:border-[#C7D2FE] cursor-pointer transition-all group"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0"
                        style={{ background: r.bg, color: r.tc }}
                      >
                        {r.tag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1C1B33] text-[13px] font-semibold leading-snug truncate">{r.title}</p>
                        <p className="text-[#9CA3AF] text-[11px]">{r.sub}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" className="shrink-0 group-hover:stroke-[#4F46E5] transition-colors">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

            </div>



          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
