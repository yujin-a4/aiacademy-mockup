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

const INST_NAME: Record<string, string> = { driller: '드릴러', mentor: '멘토', realist: '리얼리스트' }
const INST_EMOJI: Record<string, string> = { driller: '🔥', mentor: '🤝', realist: '💼' }

const NAV_ITEMS = [
  { icon: '🏠', label: '홈', active: true },
  { icon: '📚', label: '내 학습', active: false },
  { icon: '📊', label: '현황', active: false },
]

/* ── 태블릿 전용 접이식 사이드바 ── */
function Sidebar({
  open,
  setOpen,
  userName,
  targetScore,
  selectedInstructor,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  userName: string
  targetScore: string
  selectedInstructor: string | null
}) {
  const instEmoji = INST_EMOJI[selectedInstructor ?? 'mentor'] ?? '🤝'

  return (
    <aside
      className={`hidden md:flex flex-col bg-onboarding border-r border-white/5
        h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 ease-in-out overflow-hidden
        ${open ? 'w-[220px]' : 'w-[72px]'}`}
    >
      {/* 배경 데코 */}
      <div className="absolute top-[-40px] left-[-20px] w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      {/* 로고 + 토글 */}
      <div className="px-4 py-6 flex items-center justify-between min-h-[72px] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-ybm-blue font-black text-[10px] tracking-tighter">YBM</span>
          </div>
          {open && (
            <p className="text-white font-bold text-sm tracking-tight uppercase animate-fade-in">
              Course
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all
            ${!open ? 'absolute left-1/2 -translate-x-1/2' : ''}`}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5"
            className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* 프로필 */}
      <div className={`px-4 py-4 relative z-10 ${open ? '' : 'flex flex-col items-center'}`}>
        <div className={`flex items-center gap-3 ${open ? '' : 'flex-col'}`}>
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center
            text-white font-medium text-base shrink-0 shadow-inner backdrop-blur-sm">
            {userName ? userName.slice(0, 1) : 'U'}
          </div>
          {open && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-white font-semibold text-sm truncate">{userName || '학습자'}님</p>
              <span className="text-[10px] text-white/50 font-medium">Level 5</span>
            </div>
          )}
        </div>

        {open && targetScore && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 animate-fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/40 text-[9px] font-bold uppercase">Goal</span>
              <span className="text-ybm-blue-mid text-[11px] font-bold">{targetScore}점</span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div className="bg-ybm-blue-mid h-full w-[65%] rounded-full shadow-[0_0_8px_rgba(91,168,245,0.4)]" />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mb-3">
        <div className="h-px bg-white/10" />
      </div>

      {/* 네비 */}
      <nav className="flex-1 px-2.5 space-y-0.5 relative z-10">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3.5 rounded-xl text-sm transition-all group
              ${open ? 'px-3.5 py-3' : 'py-3 justify-center'}
              ${item.active
                ? 'bg-white text-ybm-blue font-bold shadow-md'
                : 'text-white/50 font-medium hover:bg-white/5 hover:text-white'}`}
          >
            <span className="text-base shrink-0 transition-transform group-hover:scale-110">
              {item.icon}
            </span>
            {open && <span className="animate-fade-in">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="px-2.5 pb-6 relative z-10">
        <button
          className={`w-full flex items-center gap-3.5 rounded-xl text-white/40 text-sm font-medium
            hover:bg-white/5 hover:text-white transition-all
            ${open ? 'px-3.5 py-3' : 'py-3 justify-center'}`}
        >
          <span className="text-base">⚙️</span>
          {open && <span className="animate-fade-in">설정</span>}
        </button>
      </div>
    </aside>
  )
}

/* ── 모바일 전용 하단 네비 ── */
function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {[...NAV_ITEMS, { icon: '⚙️', label: '설정', active: false }].map((item) => (
        <button
          key={item.label}
          className={`flex flex-col items-center gap-1 min-w-[56px] py-1 transition-colors
            ${item.active ? 'text-ybm-blue' : 'text-slate-400'}`}
        >
          <span className="text-[22px]">{item.icon}</span>
          <span className={`text-[10px] font-bold ${item.active ? 'text-ybm-blue' : 'text-slate-400'}`}>
            {item.label}
          </span>
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

  const instName = INST_NAME[selectedInstructor ?? 'mentor'] ?? '멘토'
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
    <div className="flex min-h-screen bg-ybm-bg font-sans text-ybm-text">

      {/* 태블릿 사이드바 */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        userName={userName ?? ''}
        targetScore={targetScore ?? ''}
        selectedInstructor={selectedInstructor}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* 모바일 헤더 */}
        <header className="md:hidden px-5 pt-14 pb-4 flex items-center justify-between sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ybm-blue flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-[9px] tracking-tight">YBM</span>
            </div>
            <div className="flex items-center gap-1.5 bg-ybm-blue/8 px-3 py-1.5 rounded-full border border-ybm-blue/15">
              <span className="text-sm">💧</span>
              <span className="text-ybm-blue text-xs font-bold">12일 연속</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="relative w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
              <span className="text-[18px]">🔔</span>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-error rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-ybm-blue/10 border-2 border-ybm-blue/20 flex items-center justify-center text-ybm-blue font-bold text-sm">
              {userName ? userName.slice(0, 1) : 'U'}
            </div>
          </div>
        </header>

        {/* 태블릿 헤더 */}
        <header className="hidden md:flex px-8 py-5 items-center justify-between sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center gap-3">
            <p className="text-slate-900 font-bold text-base">홈</p>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-ybm-blue">
              <span>💧</span>
              <span className="text-sm font-bold">12일 연속 학습 중</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none">목표 점수</p>
              <p className="text-slate-900 font-bold text-lg leading-none mt-1">{targetScore || '990'}점</p>
            </div>
            <button className="relative w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
              <span className="text-xl">🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border border-white" />
            </button>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-32 md:pb-10 space-y-4">
          <div className="max-w-[430px] md:max-w-3xl mx-auto w-full space-y-4">

            {/* 히어로 + 커리큘럼 */}
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">

              {/* 히어로 카드 */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 md:flex md:flex-col md:justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium">
                    안녕하세요, {userName || '학습자'}님 👋
                  </p>
                  <h2 className="text-slate-900 text-[22px] font-bold leading-snug mt-1.5">
                    목표 {targetScore || '990'}점을 향한 여정이<br />
                    <span className="text-ybm-blue">65% 완료되었습니다.</span>
                  </h2>
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">현재 예상 점수</span>
                      <span className="text-ybm-blue">643점 / {targetScore || '990'}점</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-ybm-blue h-full rounded-full w-[65%] transition-all duration-500" />
                    </div>
                  </div>
                </div>

                {/* 스탯 */}
                <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex flex-col items-center justify-center border border-blue-100/70">
                      <span className="text-ybm-blue font-black text-[17px] leading-none">A</span>
                      <span className="text-ybm-blue font-black text-[10px] leading-none -mt-0.5">+</span>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-900 font-bold text-sm">최상위</p>
                      <p className="text-slate-400 text-[10px] font-semibold">학습 효율</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100/70">
                      <span className="text-[22px]">⏱️</span>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-900 font-bold text-sm">42.5h</p>
                      <p className="text-slate-400 text-[10px] font-semibold">학습 시간</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100/70">
                      <span className="text-[22px]">📖</span>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-900 font-bold text-sm">Lv. 14</p>
                      <p className="text-slate-400 text-[10px] font-semibold">어휘 마스터</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 커리큘럼 카드 */}
              <div className="bg-[#0F172A] rounded-3xl p-5 relative overflow-hidden md:flex md:flex-col md:justify-between">
                <div className="absolute bottom-0 right-0 w-36 h-36 bg-ybm-blue/20 blur-3xl rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold bg-white/10 text-white/50 px-3 py-1.5 rounded-full uppercase tracking-wider">
                      진행 중인 커리큘럼
                    </span>
                    <span className="text-2xl">📖</span>
                  </div>
                  <h3 className="text-white text-xl font-bold leading-snug">
                    Part 5 집중 공략:<br />문법 공식 정복
                  </h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    {instName} 튜터가 기다리고 있습니다. 오늘의 주제: 복합 절에서의 동사 식별.
                  </p>
                  <Link
                    href="/classroom"
                    className="mt-5 w-full bg-ybm-blue text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform shadow-blue"
                  >
                    1:1 세션 시작하기 ›
                  </Link>
                </div>
              </div>

            </div>

            {/* 현황 + 미션 */}
            <div className="md:grid md:grid-cols-5 md:gap-4 space-y-4 md:space-y-0">

              {/* 이번 주 학습 현황 */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 md:col-span-2">
                <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.18em] mb-4">이번 주 학습 현황</h3>
                <div className="flex justify-between items-center">
                  {WEEK.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">{d.day}</span>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all
                          ${d.status === 'complete' ? 'bg-ybm-blue text-white shadow-sm' :
                            d.status === 'current' ? 'border-2 border-ybm-blue text-ybm-blue' :
                            'bg-slate-50 text-slate-300'}`}
                      >
                        <span className="text-xs font-bold">{d.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center bg-slate-50 rounded-2xl py-3">
                  <p className="text-slate-500 text-xs font-medium">
                    🔥 <span className="text-slate-900 font-bold">12일 연속</span> 학습 성공!
                  </p>
                </div>
              </div>

              {/* 오늘의 미션 */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 md:col-span-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center text-base">🎯</span>
                    오늘의 미션
                  </h3>
                  <span className="text-ybm-blue font-bold text-xs bg-ybm-blue/8 px-2.5 py-1 rounded-full">
                    {completedPct}% 완료
                  </span>
                </div>
                <div className="space-y-2.5">
                  {missions.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => toggleMission(m.id)}
                      className={`cursor-pointer flex items-center gap-3.5 p-4 rounded-2xl border transition-all active:scale-[0.98]
                        ${m.done ? 'bg-slate-50 border-transparent opacity-50' : 'bg-white border-slate-100'}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all
                          ${m.done ? 'bg-ybm-blue border-ybm-blue' : 'border-slate-200'}`}
                      >
                        {m.done && <span className="text-[10px] text-white font-bold">✓</span>}
                      </div>
                      <p className={`text-sm font-medium flex-1 ${m.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {m.text}
                      </p>
                      {m.tag && !m.done && (
                        <span className="text-[10px] font-bold text-ybm-blue bg-ybm-blue/10 px-2 py-1 rounded-full shrink-0">
                          {m.tag}
                        </span>
                      )}
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
