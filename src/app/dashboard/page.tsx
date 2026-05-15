'use client'
import Image from 'next/image'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState } from 'react'

/* ─── 더미 데이터 (추후 API 연동) ─────────────────────── */
const MISSIONS = [
  { id: 1, text: '단어 50개 암기', done: true, tag: null },
  { id: 2, text: '문법 기초 2강 수강', done: false, tag: 'AI 추천' },
  { id: 3, text: 'Part 5 실전 문제 10개', done: false, tag: null },
  { id: 4, text: '오늘의 단어 테스트', done: false, tag: 'AI 추천' },
  { id: 5, text: '복습 퀴즈 완료', done: false, tag: null },
]

const PROGRESS_ITEMS = [
  { label: '어휘', pct: 75, colorCls: 'bg-ybm-blue' },
  { label: '문법', pct: 40, colorCls: 'bg-yellow-400' },
  { label: '독해', pct: 90, colorCls: 'bg-success' },
]

const LESSONS = [
  {
    id: 1,
    tag: '어휘 집중',
    tagCls: 'bg-ybm-blue-light text-ybm-blue',
    xp: 15,
    title: '필수 동사 100선',
    desc: '일상 생활에서 가장 자주 쓰이는 핵심 동사들을 예문과 함께 학습합니다.',
    img: null,
    gradientCls: 'from-slate-100 to-ybm-bg',
  },
  {
    id: 2,
    tag: '문법 다지기',
    tagCls: 'bg-purple-100 text-purple-600',
    xp: 20,
    title: '시제의 이해 (완료형)',
    desc: '까다로운 완료 시제를 직관적인 그래프와 AI 피드백을 통해 마스터하세요.',
    img: null,
    gradientCls: 'from-purple-50 to-ybm-bg',
  },
  {
    id: 3,
    tag: '실전 듣기',
    tagCls: 'bg-emerald-100 text-emerald-600',
    xp: 25,
    title: '비즈니스 미팅 대화',
    desc: '실제 비즈니스 환경에서 사용되는 대화를 듣고 핵심 내용을 파악합니다.',
    img: null,
    gradientCls: 'from-emerald-50 to-ybm-bg',
  },
]

const INST_NAME: Record<string, string> = { driller: '드릴러', mentor: '멘토', realist: '리얼리스트' }
const INST_EMOJI: Record<string, string> = { driller: '🔥', mentor: '🤝', realist: '💼' }

const NAV_ITEMS = [
  { icon: '🏠', label: '홈', active: true },
  { icon: '📚', label: '내 학습', active: false },
  { icon: '📊', label: '학습 현황', active: false },
]

/* ─── 사이드바 ─────────────────────────────────────────── */
function Sidebar({ open, setOpen }: { open: boolean, setOpen: (v: boolean) => void }) {
  const { userName, selectedInstructor, targetScore, studyPeriod } = useOnboardingStore()
  const instName = INST_NAME[selectedInstructor ?? 'mentor'] ?? '멘토'
  const instEmoji = INST_EMOJI[selectedInstructor ?? 'mentor'] ?? '🤝'

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-ybm-onboarding border-r border-white/5
        transition-all duration-300 ease-in-out overflow-hidden shrink-0 z-30
        ${open ? 'w-[220px]' : 'w-[72px]'}`}
    >
      {/* 둥근 배경 데코 */}
      <div className="absolute top-[-40px] left-[-20px] w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      {/* 로고 영역 + 접기 버튼 */}
      <div className={`px-4 py-6 flex items-center justify-between min-h-[72px] relative z-10`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-ybm-blue font-black text-[10px] tracking-tighter italic">YBM</span>
          </div>
          {open && (
            <div className="leading-tight animate-fade-in">
              <p className="text-white font-bold text-sm tracking-tight uppercase">Course</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setOpen(!open)}
          className={`w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all
            ${!open ? 'absolute left-1/2 -translate-x-1/2' : ''}`}
        >
          <svg 
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" 
            className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* 프로필 섹션 */}
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

        {/* 목표 요약 - 간결하게 */}
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

      {/* 네비게이션 */}
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
            <span className={`text-base shrink-0 transition-transform group-hover:scale-110`}>
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

/* ─── 대시보드 메인 ─────────────────────────────────────── */
export default function Dashboard() {
  const { userName, selectedInstructor, targetScore, studyPeriod } = useOnboardingStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [missions, setMissions] = useState(MISSIONS)

  const completedCount = missions.filter((m) => m.done).length
  const instName = INST_NAME[selectedInstructor ?? 'mentor'] ?? '멘토'
  const instEmoji = INST_EMOJI[selectedInstructor ?? 'mentor'] ?? '🤝'

  const toggleMission = (id: number) => {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m)))
  }

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
    <div className="flex min-h-screen bg-ybm-bg font-sans text-ybm-text selection:bg-ybm-blue-light selection:text-ybm-blue">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className="flex-1 min-w-0 flex flex-col relative overflow-y-auto h-screen">
        
        {/* 상단 헤더: 태블릿에 맞게 컴팩트하게 */}
        <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-ybm-bg/90 backdrop-blur-md border-b border-ybm-border/40">
          <div className="flex items-center gap-4">
            <h2 className="text-ybm-text font-bold text-xl tracking-tight">
              Dashboard
            </h2>
            <div className="h-4 w-px bg-ybm-border" />
            <p className="text-ybm-text-sub text-xs font-medium">Hello, <span className="text-ybm-blue font-bold">{userName || 'User'}</span></p>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-white border border-ybm-border flex items-center justify-center text-ybm-text-sub hover:text-ybm-blue transition-all relative">
              <span className="text-lg">🔔</span>
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-error rounded-full border-2 border-white" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-ybm-blue flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {userName ? userName.slice(0, 1) : 'U'}
            </div>
          </div>
        </header>

        {/* 콘텐츠: 태블릿 최적화 여백 */}
        <div className="flex-1 px-6 py-6 space-y-6 max-w-5xl mx-auto w-full">

          {/* Hero Section */}
          <div className="relative overflow-hidden bg-white rounded-3xl p-6 border border-ybm-border shadow-sm group">
            <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-ybm-blue-light/20 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-ybm-onboarding flex items-center justify-center text-4xl shadow-md shrink-0 animate-float">
                {instEmoji}
              </div>
              
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-ybm-blue-light text-ybm-blue font-bold text-[9px] uppercase tracking-wider italic">
                  Instructor Message
                </div>
                <h3 className="text-ybm-text text-xl font-bold leading-tight truncate md:whitespace-normal">
                  "{userName}님, <span className="text-ybm-blue">상위 5%</span> 진입이 눈앞이에요!"
                </h3>
                <p className="text-ybm-text-sub text-[13px] font-medium opacity-80">
                  {instName} 선생님의 실시간 학습 응원입니다.
                </p>
              </div>

              <button className="hidden sm:block bg-ybm-blue text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md hover:bg-ybm-blue/90 transition-all active:scale-95">
                Start Coaching
              </button>
            </div>
          </div>

          {/* Weekly Streak: 더 컴팩트하게 */}
          <div className="bg-white rounded-3xl border border-ybm-border shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-0.5">
                <h4 className="text-ybm-text font-bold text-lg flex items-center gap-2">
                  📅 Weekly Streak
                </h4>
                <p className="text-ybm-text-sub text-[10px] font-semibold uppercase tracking-widest pl-7">연속 학습 기록</p>
              </div>

              <div className="flex-1 flex justify-between gap-1.5 max-w-lg">
                {WEEK.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-ybm-text-sub opacity-60 uppercase">{d.day}</span>
                    <div className={`w-9 h-11 rounded-xl flex flex-col items-center justify-center transition-all border
                      ${d.status === 'complete' ? 'bg-ybm-blue border-ybm-blue shadow-sm' : 
                        d.status === 'current' ? 'bg-white border-ybm-blue' : 
                        'bg-ybm-bg border-transparent text-ybm-text-sub opacity-40'}`}
                    >
                      <span className={`text-[13px] font-bold ${d.status === 'complete' ? 'text-white' : ''}`}>
                        {d.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-ybm-blue-light/40 px-5 py-3 rounded-xl text-center shrink-0 border border-ybm-blue/5">
                <p className="text-ybm-blue font-bold text-xl italic leading-none">12 DAYS</p>
                <p className="text-ybm-text-sub text-[9px] font-bold uppercase mt-1">Streak</p>
              </div>
            </div>
          </div>

          {/* Grid Layout: Tablet 최적화 (2컬럼) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 오늘의 미션 */}
            <div className="bg-white rounded-3xl border border-ybm-border shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-ybm-text font-bold text-lg flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-ybm-blue-light flex items-center justify-center text-lg">🎯</span>
                  오늘의 미션
                </h3>
                <p className="text-xl font-bold text-ybm-blue">{completedCount}<span className="text-sm text-ybm-text-sub">/{missions.length}</span></p>
              </div>

              <div className="space-y-3">
                {missions.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => toggleMission(m.id)}
                    className={`cursor-pointer flex items-center gap-3.5 p-4 rounded-xl border transition-all
                      ${m.done
                        ? 'bg-ybm-bg border-transparent opacity-50'
                        : 'bg-white border-ybm-border hover:border-ybm-blue hover:shadow-sm'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-lg border-1.5 flex items-center justify-center shrink-0 transition-all
                      ${m.done ? 'bg-ybm-blue border-ybm-blue' : 'border-ybm-border'}`}>
                      {m.done && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-[13.5px] font-medium ${m.done ? 'text-ybm-text-sub line-through' : 'text-ybm-text'}`}>
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 스킬 분포 + 캐릭터 */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-ybm-border shadow-sm p-6 space-y-5">
                <h3 className="text-ybm-text font-bold text-lg flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center text-lg">📈</span>
                  스킬 분포
                </h3>
                
                <div className="space-y-4">
                  {PROGRESS_ITEMS.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-ybm-text text-[13px] font-semibold">{item.label}</span>
                        <span className="text-ybm-blue font-bold text-[13px] italic">{item.pct}%</span>
                      </div>
                      <div className="w-full bg-ybm-bg rounded-full h-2">
                        <div
                          className={`${item.colorCls} h-full rounded-full transition-all duration-1000`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 코칭 인사이트 */}
              <div className="relative h-28 bg-slate-50 rounded-3xl flex items-center px-6 overflow-hidden border border-slate-200/60">
                <div className="relative z-10 space-y-0.5">
                  <p className="text-slate-500 font-bold text-sm italic">AI Coach Insight</p>
                  <p className="text-slate-600 text-[12px] font-medium leading-tight">
                    최근 3일간 정답률이 15% 상승했습니다.<br />
                    이대로라면 목표 달성이 예상보다 빨라질 수 있어요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터: 슬림하게 한 줄로 최적화 */}
        <footer className="px-6 py-5 border-t border-ybm-border/30 bg-white/50 flex items-center justify-between">
          <p className="text-[10px] text-ybm-text-sub font-bold uppercase tracking-widest opacity-40">YBM AI Language Institute</p>
          <p className="text-[10px] text-ybm-text-sub font-medium opacity-30">© 2026. All data optimized by AI.</p>
        </footer>
      </main>
    </div>
  )
}


