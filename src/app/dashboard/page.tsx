'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState } from 'react'

const MISSIONS = [
  { id: 1, text: '단어 50개 암기', done: true, tag: null },
  { id: 2, text: '문법 기초 2강 수강', done: false, tag: 'AI 추천' },
  { id: 3, text: 'Part 5 실전 문제 10개', done: false, tag: null },
  { id: 4, text: '오늘의 단어 테스트', done: false, tag: 'AI 추천' },
  { id: 5, text: '복습 퀴즈 완료', done: false, tag: null },
]

const INST_NAME: Record<string, string> = { park: '박혜원', jang: '장연지', kim: '김토익' }

const NAV_ITEMS = [
  { icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#3459E6' : 'none'} stroke={active ? '#3459E6' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ), label: '홈', active: true },
  { icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#3459E6' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ), label: '내 학습', active: false },
  { icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#3459E6' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ), label: '현황', active: false },
]

/* ── 태블릿 사이드바 ── */
function Sidebar({ open, setOpen, userName, targetScore, selectedInstructor }: {
  open: boolean; setOpen: (v: boolean) => void
  userName: string; targetScore: string; selectedInstructor: string | null
}) {
  return (
    <aside className={`hidden md:flex flex-col bg-[#111827] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[220px]' : 'w-[68px]'}`}>
      {/* 로고 + 토글 */}
      <div className="px-4 py-5 flex items-center justify-between min-h-[64px]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
            <span className="text-primary font-black text-[10px] tracking-tighter">YBM</span>
          </div>
          {open && <p className="text-white font-bold text-sm tracking-tight animate-fade-in">AI Course</p>}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all ${!open ? 'absolute left-1/2 -translate-x-1/2' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* 프로필 */}
      <div className={`px-4 py-3 ${open ? '' : 'flex flex-col items-center'}`}>
        <div className={`flex items-center gap-3 ${open ? '' : 'flex-col'}`}>
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white font-bold text-base shrink-0">
            {userName ? userName.slice(0, 1) : 'U'}
          </div>
          {open && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-white font-semibold text-sm truncate">{userName || '학습자'}님</p>
              <span className="text-white/50 text-[10px] font-medium">Level 5</span>
            </div>
          )}
        </div>
        {open && targetScore && (
          <div className="mt-3 bg-white/10 border border-white/10 rounded-xl p-3 animate-fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/50 text-[9px] font-bold uppercase">Goal</span>
              <span className="text-white text-[11px] font-bold">{targetScore}점</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full w-[65%] rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 my-2"><div className="h-px bg-white/10" /></div>

      {/* 네비 */}
      <nav className="flex-1 px-2.5 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button key={item.label} className={`w-full flex items-center gap-3 rounded-xl text-sm transition-all ${open ? 'px-3 py-2.5' : 'py-2.5 justify-center'} ${item.active ? 'bg-white text-[#3459E6] font-bold' : 'text-white/60 font-medium hover:bg-white/10 hover:text-white'}`}>
            <span className="shrink-0">{item.icon(item.active)}</span>
            {open && <span className="animate-fade-in">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="px-2.5 pb-6">
        <button className={`w-full flex items-center gap-3 rounded-xl text-white/40 text-sm font-medium hover:bg-white/10 hover:text-white transition-all ${open ? 'px-3 py-2.5' : 'py-2.5 justify-center'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {open && <span className="animate-fade-in">설정</span>}
        </button>
      </div>
    </aside>
  )
}

/* ── 모바일 하단 네비 ── */
function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#D1D5DB] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {[...NAV_ITEMS, { icon: (_: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      ), label: '설정', active: false }].map((item) => (
        <button key={item.label} className={`flex flex-col items-center gap-1 min-w-[56px] py-1 ${item.active ? 'text-[#3459E6]' : 'text-[#6B7280]'}`}>
          {item.icon(item.active)}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

/* ── 대시보드 메인 ── */
export default function Dashboard() {
  const { userName, selectedInstructor, targetScore } = useOnboardingStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [missions, setMissions] = useState(MISSIONS)

  const instName = INST_NAME[selectedInstructor ?? 'jang'] ?? '장연지'
  const completedCount = missions.filter((m) => m.done).length
  const completedPct = Math.round((completedCount / missions.length) * 100)

  const toggleMission = (id: number) =>
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m)))

  const WEEK = [
    { day: '월', date: 11, status: 'complete' },
    { day: '화', date: 12, status: 'complete' },
    { day: '수', date: 13, status: 'complete' },
    { day: '목', date: 14, status: 'current' },
    { day: '금', date: 15, status: 'pending' },
    { day: '토', date: 16, status: 'pending' },
    { day: '일', date: 17, status: 'pending' },
  ]

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans text-[#111318]">

      {/* 태블릿 사이드바 */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        userName={userName ?? ''}
        targetScore={targetScore?.toString() ?? ''}
        selectedInstructor={selectedInstructor}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── 모바일 헤더 (흰색) ── */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#F3F4F6] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#6B7280] text-[13px] font-normal">안녕하세요</p>
              <p className="text-[#111318] text-[20px] font-bold leading-snug">{userName || '학습자'}님 👋</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F3F4F6] rounded-lg px-3 py-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
                <span className="text-[#10B981] text-xs font-semibold">12일 연속</span>
              </div>
              <button className="relative w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* ── 태블릿 헤더 ── */}
        <header className="hidden md:flex px-8 py-4 items-center justify-between sticky top-0 z-20 bg-white border-b border-[#D1D5DB]">
          <div className="flex items-center gap-3">
            <p className="text-[#111318] font-bold text-[17px]">홈</p>
            <div className="h-4 w-px bg-[#D1D5DB]" />
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
              <span className="text-[#10B981] text-sm font-semibold">12일 연속 학습 중</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider leading-none">목표 점수</p>
              <p className="text-[#111318] font-bold text-[22px] leading-none mt-1">{targetScore || '990'}점</p>
            </div>
            <button className="relative w-10 h-10 rounded-full bg-[#F3F4F6] border border-[#D1D5DB] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full border border-white" />
            </button>
          </div>
        </header>

        {/* ── 콘텐츠 ── */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[390px] md:max-w-3xl mx-auto w-full space-y-3">

            {/* ★ 히어로 — 오늘의 학습 카드 */}
            <div className="bg-white border border-[#D1D5DB] rounded-[14px] overflow-hidden">
              {/* 상단 컬러 스트립 */}
              <div className="h-1 bg-[#3459E6]" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold bg-accent-light text-accent px-2 py-1 rounded-[4px] tracking-wide">AI 추천</span>
                  <span className="text-[#6B7280] text-xs">{instName} 튜터 · 오늘 40분</span>
                </div>
                <p className="text-[#6B7280] text-[13px] font-normal mb-1">진행 중인 커리큘럼</p>
                <h2 className="text-[#111318] text-[22px] font-bold leading-snug">
                  Part 5 집중 공략:<br />문법 공식 정복
                </h2>
                <p className="text-[#374151] text-[14px] leading-relaxed mt-2">
                  {instName} 튜터가 기다리고 있습니다. 오늘의 주제: 복합 절에서의 동사 식별.
                </p>
                <Link
                  href="/classroom"
                  className="mt-5 flex items-center justify-center gap-1.5 w-full bg-[#3459E6] hover:bg-[#5578F0] text-white h-12 rounded-[10px] font-semibold text-[15px] transition-colors active:scale-[0.98]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  1:1 세션 시작하기
                </Link>
              </div>
            </div>

            {/* 진행률 + 통계 — 보조 위젯 */}
            <div className="grid grid-cols-4 gap-2.5">
              {/* 진행률 */}
              <div className="col-span-2 bg-white border border-[#D1D5DB] rounded-xl p-4">
                <p className="text-[#6B7280] text-[11px] font-medium mb-1">목표 달성률</p>
                <p className="text-[#111318] text-[20px] font-bold leading-none">65%</p>
                <div className="mt-2.5 w-full bg-[#F3F4F6] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#3459E6] h-full rounded-full w-[65%]" />
                </div>
                <p className="text-[#6B7280] text-[11px] mt-1.5">643 / {targetScore || '990'}점</p>
              </div>
              {/* 통계 2개 */}
              {[
                { value: '42.5h', label: '학습 시간' },
                { value: 'Lv.14', label: '어휘 레벨' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-[#D1D5DB] rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[#6B7280] text-[11px] font-medium">{stat.label}</span>
                  <span className="text-[#3459E6] font-bold text-[18px] leading-none mt-1">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* 현황 + 미션 */}
            <div className="md:grid md:grid-cols-5 md:gap-3 space-y-3 md:space-y-0">

              {/* 이번 주 학습 현황 */}
              <div className="bg-white border border-[#D1D5DB] rounded-[14px] p-5 md:col-span-2">
                <h3 className="text-[#6B7280] font-bold text-[11px] uppercase tracking-[0.15em] mb-4">이번 주 학습 현황</h3>
                <div className="flex justify-between items-center">
                  {WEEK.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-medium text-[#6B7280] uppercase">{d.day}</span>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                        ${d.status === 'complete' ? 'bg-[#EEF2FF] text-[#3459E6]' :
                          d.status === 'current' ? 'bg-[#3459E6] text-white' :
                          'bg-[#F3F4F6] text-[#6B7280]'}`}>
                        {d.date}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-[#F3F4F6] rounded-xl py-3 text-center">
                  <p className="text-[#6B7280] text-xs font-normal">
                    <span className="text-[#10B981] font-semibold">12일 연속</span> 학습 성공!
                  </p>
                </div>
              </div>

              {/* 오늘의 미션 */}
              <div className="bg-white border border-[#D1D5DB] rounded-[14px] md:col-span-3 overflow-hidden">
                {/* 진행률 바 */}
                <div className="h-1 bg-[#F3F4F6]">
                  <div className="bg-[#3459E6] h-full transition-all duration-500" style={{ width: `${completedPct}%` }} />
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[#111318] font-bold text-[17px]">오늘의 미션</h3>
                    <span className="text-[#3459E6] font-semibold text-[11px] bg-[#EEF2FF] px-2.5 py-1 rounded-full">
                      {completedPct}% 완료
                    </span>
                  </div>
                  <div className="space-y-2">
                    {missions.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMission(m.id)}
                        className="cursor-pointer flex items-center gap-3 p-3.5 rounded-xl border border-[#D1D5DB] hover:border-[#3459E6]/30 transition-colors active:scale-[0.98]"
                      >
                        {/* 체크박스 */}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all
                          ${m.done ? 'bg-[#10B981] border-[#10B981]' : 'border-[1.5px] border-[#D1D5DB] bg-white'}`}>
                          {m.done && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <p className={`text-sm flex-1 leading-snug ${m.done ? 'text-[#6B7280] line-through' : 'text-[#111318] font-medium'}`}>
                          {m.text}
                        </p>
                        {m.tag && !m.done && (
                          <span className="text-[11px] font-semibold text-accent bg-accent-light px-2 py-0.5 rounded-[4px] shrink-0">
                            {m.tag}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
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
