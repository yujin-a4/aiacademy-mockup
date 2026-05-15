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
            <span className="text-ybm-blue font-black text-[10px] tracking-tighter">YBM</span>
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
    <div className="flex min-h-screen bg-ybm-bg font-sans text-ybm-text selection:bg-ybm-blue/10 selection:text-ybm-blue">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className="flex-1 min-w-0 flex flex-col relative overflow-y-auto h-screen">
        
        {/* 상단 헤더: 참고 이미지와 유사한 슬림 디자인 */}
        <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center gap-6">
            <h1 className="text-slate-900 font-bold text-lg tracking-tight">아카데미 대시보드</h1>
            <div className="h-4 w-px bg-slate-200" />
            <p className="text-ybm-blue font-bold text-sm flex items-center gap-2">
              <span className="text-base">💧</span> 12일 연속 학습 중
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none">목표 점수</p>
              <p className="text-slate-900 font-bold text-lg leading-none mt-1">{targetScore || '990'}점</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 relative">
              <span className="text-xl">🕒</span>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-error rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        {/* 콘텐츠 영역: 태블릿 최적화 */}
        <div className="flex-1 px-8 py-8 space-y-10 max-w-6xl mx-auto w-full">

          {/* Hero Section: 참고 이미지 레이아웃 적용 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* 왼쪽: 환영 및 전체 진행률 */}
            <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[360px]">
              <div className="absolute top-[-100px] right-[-100px] w-80 h-80 rounded-full bg-slate-50 opacity-50 blur-3xl pointer-events-none" />
              
              <div className="relative z-10 space-y-6">
                <p className="text-ybm-blue font-medium text-lg opacity-80">
                  다시 오신 것을 환영합니다, {userName || '학습자'}님
                </p>
                <h2 className="text-slate-900 text-5xl font-bold leading-tight">
                  목표 {targetScore || '990'}점을 향한 여정이<br />
                  <span className="text-ybm-blue">65% 완료되었습니다.</span>
                </h2>
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-8 pt-10 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase">학습 효율</p>
                  <p className="text-slate-900 text-3xl font-light font-mono">A+</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase">총 학습 시간</p>
                  <p className="text-slate-900 text-3xl font-light font-mono">42.5<span className="text-sm font-sans font-bold ml-1">시간</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-xs font-bold uppercase">어휘 마스터</p>
                  <p className="text-slate-900 text-3xl font-light font-mono">Lv. 14</p>
                </div>
              </div>
            </div>

            {/* 오른쪽: 오늘의 커리큘럼 (강조 섹션) */}
            <div className="bg-[#0F172A] rounded-[40px] p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              {/* 장식용 글로우 */}
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-ybm-blue/20 blur-3xl rounded-full" />
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">📖</span>
                  <span className="text-[10px] font-bold bg-white/10 text-white/50 px-3 py-1 rounded-full uppercase tracking-widest">
                    진행 중인 커리큘럼
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-white text-2xl font-bold leading-snug">
                    Part 5 집중 공략:<br />
                    문법 공식 정복
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {instName} 튜터가 당신의 다음 1:1 세션을 기다리고 있습니다. 오늘의 주제: 복합 절에서의 동사 식별.
                  </p>
                </div>
              </div>

              <button className="relative z-10 w-full bg-ybm-blue hover:bg-[#1a66d8] text-white py-5 rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-10 shadow-blue">
                1:1 세션 시작하기
                <span className="text-lg">›</span>
              </button>
            </div>
          </div>

          {/* 하단 섹션: 2단 구성 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            
            {/* 오늘의 미션 (왼쪽) */}
            <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-100 p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h3 className="text-slate-900 font-bold text-lg flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-lg">🎯</span>
                  오늘의 미션
                </h3>
                <span className="text-ybm-blue font-bold text-sm">60% Completed</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {missions.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => toggleMission(m.id)}
                    className={`cursor-pointer flex items-center gap-4 p-5 rounded-2xl border transition-all
                      ${m.done
                        ? 'bg-slate-50 border-transparent opacity-50'
                        : 'bg-white border-slate-100 hover:border-ybm-blue'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all
                      ${m.done ? 'bg-ybm-blue border-ybm-blue' : 'border-slate-200'}`}>
                      {m.done && <span className="text-[10px] text-white">✓</span>}
                    </div>
                    <p className={`text-sm font-medium ${m.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 습관 트래커 / 스트릭 (오른쪽) */}
            <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-100 p-8 space-y-6">
              <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] text-center">습관 트래커</h3>
              
              <div className="flex justify-between items-center px-2 pt-4">
                {WEEK.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{d.day}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${d.status === 'complete' ? 'bg-ybm-blue text-white shadow-blue' : 
                        d.status === 'current' ? 'border-2 border-ybm-blue text-ybm-blue' : 
                        'bg-slate-50 text-slate-300'}`}
                    >
                      <span className="text-[11px] font-bold">{d.date}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-slate-500 text-xs font-medium">현재까지 <span className="text-slate-900 font-bold underline underline-offset-4 decoration-ybm-blue/30">12일 연속</span> 학습 성공!</p>
              </div>
            </div>
          </div>

        </div>

        {/* 푸터: 슬림 한 줄 */}
        <footer className="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-between mt-auto">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">YBM AI Language Institute</p>
          <p className="text-[10px] text-slate-300 font-medium">© 2026. Empowered by AI Analysis.</p>
        </footer>
      </main>
    </div>
  )
}
