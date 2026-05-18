'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo } from 'react'

const MISSIONS = [
  { id: 1, text: 'Part 5 이하 10문제 풀기', done: true,  tag: null },
  { id: 2, text: '첫 분사구문 마스터하기 확인', done: false, tag: 'AI 분석' },
  { id: 3, text: 'AI 강사와 1분 결과 데이터 분석', done: false, tag: null },
  { id: 4, text: "오늘 수업 '모이기' 마무리 표시", done: false, tag: null },
  { id: 5, text: '오늘의 일일 단어 문제 풀기', done: false, tag: null },
]

const INST_NAME: Record<string, string> = { park: '박혜원', jang: '장연지', kim: '김토익' }
const INST_MESSAGES: Record<string, string> = {
  park: '오늘 하루도 완벽하게! 작은 실수도 그냥 넘기지 않는 것이 실력입니다.',
  jang: '괜찮아요, 틀려도 돼요. 꾸준히만 나아가면 반드시 도달할 수 있어요.',
  kim: '오늘 학습한 단어 하나가 시험장에서 당신을 구할 수 있습니다!',
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
    label: '현황', active: false, href: '/status',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: '알림', active: false, href: '#',
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
      <div className={`flex items-center min-h-[60px] shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
        {open && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] tracking-tight">YBM</span>
            </div>
            <span className="text-[#1C1B33] font-bold text-[15px]">AI Course</span>
          </div>
        )}
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#ECEAF5] hover:bg-[#DDD9F7] flex items-center justify-center transition-all shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

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

      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item) => (
          <Link key={item.label} href={item.href ?? '#'}
            className={`w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#6B7280] hover:bg-[#EEF2FF] hover:text-[#4F46E5]'}`}>
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
  const items = [...NAV.slice(0, 4), { label: '설정', active: false, href: '#', icon: SETTINGS_ICON }]
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

  const instName = INST_NAME[selectedInstructor ?? 'park'] ?? '박혜원'
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
              <p className="text-[#1C1B33] text-[20px] font-bold leading-snug">{userName || '학습자'}님 👋</p>
              {ddayLabel && (
                <span className="inline-block mt-1 text-[11px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
                  토익 시험 {ddayLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] bg-[#FEF9C3] px-2.5 py-1.5 rounded-full">
                🔥 12일 연속
              </span>
              <button className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[1000px] mx-auto w-full space-y-4">

            {/* ── 데스크탑 상단 상태 바 ── */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-3 py-1.5 rounded-full">
                  🔥 12일 연속 학습 중
                </span>
                {ddayLabel && (
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#4F46E5] bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-1.5 rounded-full">
                    📅 토익 시험 {ddayLabel}
                  </span>
                )}
              </div>
              <button className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[12px] font-bold px-4 py-2 rounded-full transition-colors shadow-md shadow-[#4F46E5]/20">
                YBM 토익 시험 접수하기
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </button>
            </div>

            {/* ── 히어로 카드 ── */}
            <div className="relative overflow-hidden rounded-2xl min-h-[160px] md:min-h-[190px]"
              style={{ background: 'linear-gradient(135deg, #EAE8FF 0%, #D5CEFF 50%, #C7D2FE 100%)' }}>
              {/* 장식 블롭 */}
              <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-[#818CF8]/20 blur-3xl pointer-events-none" />
              <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full bg-[#A5B4FC]/25 blur-2xl pointer-events-none" />

              {/* 강사 이미지 */}
              <div className="absolute right-0 bottom-0 hidden sm:block h-full">
                <img
                  src={`/instructor/${selectedInstructor ?? 'park'}.png`}
                  alt={instName}
                  className="h-full object-contain object-bottom drop-shadow-xl"
                  style={{ maxWidth: '220px' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>

              {/* 텍스트 */}
              <div className="relative z-10 p-6 md:p-8 max-w-[420px] sm:max-w-[480px]">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4F46E5] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
                  {instName} 선생님의 오늘의 처방
                </span>
                <h2 className="text-[#1C1B33] text-[17px] md:text-[20px] font-bold leading-snug">
                  {userName || '학습자'}님, 오늘 준비된 맞춤 처방은<br />
                  <span className="text-[#4F46E5]">{missions.length}개의 미션</span>입니다.
                </h2>
                <p className="mt-2 text-[#5B5A72] text-[12px] md:text-[13px] leading-relaxed">
                  {INST_MESSAGES[selectedInstructor ?? 'park']}
                </p>
                <Link
                  href="/my-learning"
                  className="mt-5 inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-colors shadow-lg shadow-[#4F46E5]/30 active:scale-[0.98]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  1:1 라이브 과외 세션 시작하기
                </Link>
              </div>
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
                        d.status === 'current'  ? 'bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/30' :
                        'bg-[#FAFAFA] text-[#D1D5DB]'
                      }`}>
                        {d.date}
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        d.status === 'complete' ? 'bg-[#10B981]' :
                        d.status === 'current'  ? 'bg-[#4F46E5]' :
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

              {/* 오늘의 미션 리스트 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] overflow-hidden">
                <div className="h-1 bg-[#FAFAFA]">
                  <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] h-full transition-all duration-500" style={{ width: `${completedPct}%` }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[#1C1B33] font-bold text-[14px]">오늘의 미션 리스트</h3>
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

              {/* 오늘의 소셜 챌린저 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] flex items-center justify-center text-[20px] shrink-0">🏆</div>
                  <h3 className="text-[#1C1B33] font-bold text-[14px]">오늘의 소셜 챌린저</h3>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-[#6B7280]">전체 유저 달성률</span>
                    <span className="text-[12px] font-bold text-[#4F46E5]">75%</span>
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] h-full rounded-full transition-all" style={{ width: '75%' }} />
                  </div>
                </div>

                <p className="text-[#374151] text-[13px] leading-relaxed">
                  전체 유저 <span className="font-bold text-[#4F46E5]">75%</span>가 넘긴 일일 문제!
                </p>
                <p className="text-[#9CA3AF] text-[12px] mt-0.5 mb-auto">지금 <span className="font-semibold text-[#374151]">923명</span>이 도전 중입니다.</p>

                <button className="mt-4 w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[#4F46E5]/20 active:scale-[0.98]">
                  ⚡ 10% 성능 챌린지 도전
                </button>
              </div>

            </div>

          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
