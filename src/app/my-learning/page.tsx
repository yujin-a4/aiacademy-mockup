'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo } from 'react'

/* ── 데이터 ── */
const PARTS = [
  { id: 'P1', name: '사진 묘사',  type: 'LC', accuracy: 91, desc: '장소·사람·사물을 묘사하는 문장 구조 연습', status: 'done' },
  { id: 'P5', name: '단문 공란',  type: 'RC', accuracy: 61, desc: '오늘 과외에서 수동태·시제 유형을 틀렸어요. 집중 연습이 필요해요.', status: 'recommended' },
  { id: 'P3', name: '짧은 대화',  type: 'LC', accuracy: 74, desc: '두 사람의 대화에서 주제·의도·다음 행동 파악', status: 'normal' },
  { id: 'P6', name: '장문 공란',  type: 'RC', accuracy: 52, desc: '이메일·공지 등 지문 흐름 속 문장 삽입 연습', status: 'normal' },
  { id: 'P2', name: '질문 응답',  type: 'LC', accuracy: 83, desc: '다양한 의문문에 적절한 응답 고르기 연습', status: 'normal' },
  { id: 'P7', name: '장문 독해',  type: 'RC', accuracy: 48, desc: '단일 지문과 복수 지문 읽기 이해력 훈련', status: 'normal' },
]

const WRONG_ITEMS = [
  { date: ['오늘', '과외'], q: 'The report ___ by the team yesterday.', icon: 'RC', tags: [{ label: 'Part 5', color: 'blue' }, { label: '수동태', color: 'red' }] },
  { date: ['오늘', '과외'], q: 'These findings ___ that further review is required.', icon: 'RC', tags: [{ label: 'Part 5', color: 'blue' }, { label: '수동태', color: 'red' }] },
  { date: ['오늘', '과외'], q: 'What does the man suggest the woman do?', icon: 'LC', tags: [{ label: 'Part 3', color: 'blue' }, { label: '의도 파악', color: 'amber' }] },
  { date: ['5/17', '과외'], q: 'The manager asked that all employees ___ on time.', icon: 'RC', tags: [{ label: 'Part 5', color: 'blue' }, { label: '시제 일치', color: 'amber' }] },
]

const VOCA_BOOKS = [
  { name: '비즈니스 핵심 어휘', total: 350, done: 212, color: '#4F46E5', bg: '#EEF2FF', tc: '#4F46E5', recommended: true },
  { name: 'TOEIC 빈출 1000',   total: 1000, done: 312, color: '#06B6D4', bg: '#ECFEFF', tc: '#0891B2', recommended: false },
  { name: '내가 저장한 단어',   total: 47,   done: 0,   color: '#F59E0B', bg: '#FEF9C3', tc: '#B45309', recommended: false },
]

const TAG_STYLE: Record<string, string> = {
  blue:  'bg-[#EEF2FF] text-[#4F46E5]',
  red:   'bg-[#FEF2F2] text-[#DC2626]',
  amber: 'bg-[#FEF9C3] text-[#B45309]',
}

/* ── 원형 진행 SVG ── */
function Ring({ current, total }: { current: number; total: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const pct = Math.min(current / total, 1)
  const offset = circ * (1 - pct)
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ECEAF5" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#4F46E5" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 32 32)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-black text-[#4F46E5] leading-none">{current}</span>
        <span className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">/ {total}</span>
      </div>
    </div>
  )
}

/* ── 사이드바 ── */
const NAV = [
  { label: '홈',        href: '/dashboard', active: false },
  { label: '내 학습',   href: '/my-learning', active: true },
  { label: '오늘의 미션', href: '#', active: false },
  { label: '현황',      href: '#', active: false },
  { label: '알림',      href: '#', active: false },
]

const NAV_ICONS = [
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill={a?'#4F46E5':'none'} stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
]

function Sidebar({ userName, targetScore }: { userName: string; targetScore: string }) {
  const [open, setOpen] = useState(false)
  return (
    <aside className={`hidden md:flex flex-col bg-[#F8FAFF] border-r border-[#ECEAF5] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[240px]' : 'w-[56px]'}`}>
      {/* 로고 + 토글 */}
      <div className={`flex items-center min-h-[60px] shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
        {open && (
          <Link href="/dashboard" className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] tracking-tight">YBM</span>
            </div>
            <span className="text-[#1C1B33] font-bold text-[15px]">AI Course</span>
          </Link>
        )}
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#ECEAF5] hover:bg-[#DDD9F7] flex items-center justify-center transition-all shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      {/* 프로필 */}
      <div className={`${open ? 'px-4 pb-4' : 'pb-3 flex flex-col items-center'}`}>
        {open ? (
          <div className="bg-white border border-[#ECEAF5] rounded-2xl p-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#818CF8] to-[#4F46E5] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {userName ? userName[0] : 'U'}
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
                  <div className="bg-gradient-to-r from-[#818CF8] to-[#4F46E5] h-full rounded-full w-[65%]"/>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#818CF8] to-[#4F46E5] flex items-center justify-center text-white font-bold text-sm">
            {userName ? userName[0] : 'U'}
          </div>
        )}
      </div>

      <div className={`mb-2 ${open ? 'px-4' : 'px-3'}`}><div className="h-px bg-[#ECEAF5]"/></div>

      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item, i) => (
          <Link key={item.label} href={item.href}
            className={`w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#6B7280] hover:bg-[#EEF2FF] hover:text-[#4F46E5]'}`}>
            <span className="shrink-0">{NAV_ICONS[i](item.active)}</span>
            {open && <span className="animate-fade-in">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={`${open ? 'px-3' : 'px-2'} mb-3`}>
        <div className="mb-2 h-px bg-[#ECEAF5]"/>
        <button className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {open && <span className="animate-fade-in">설정</span>}
        </button>
      </div>

      {open && (
        <div className="px-3 pb-5 animate-fade-in">
          <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-2xl p-4">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">AI 튜터</p>
            <p className="text-white font-bold text-[13px] mt-0.5 leading-snug">궁금한 점이 있으신가요?</p>
            <button className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white text-[12px] font-semibold rounded-xl py-2 transition-all">바로 질문하기</button>
          </div>
        </div>
      )}
    </aside>
  )
}

/* ── 모바일 하단 네비 ── */
function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#ECEAF5] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {NAV.slice(0, 4).map((item, i) => (
        <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`}>
          {NAV_ICONS[i](item.active)}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
      <button className="flex flex-col items-center gap-1 min-w-[52px] py-1 text-[#9CA3AF]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span className="text-[10px] font-medium">설정</span>
      </button>
    </nav>
  )
}

/* ── 메인 페이지 ── */
export default function MyLearning() {
  const { userName, targetScore, examDate } = useOnboardingStore()
  const [tab, setTab] = useState<'part' | 'wrong' | 'voca'>('part')
  const [filter, setFilter] = useState<'전체' | 'LC' | 'RC'>('전체')

  const ddayLabel = useMemo(() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  const filteredParts = filter === '전체' ? PARTS : PARTS.filter((p) => p.type === filter)

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">
      <Sidebar userName={userName ?? ''} targetScore={targetScore?.toString() ?? ''} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#ECEAF5] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <p className="text-[#1C1B33] text-[20px] font-bold">내 학습</p>
            <div className="flex items-center gap-2">
              {ddayLabel && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#4F46E5] bg-[#EEF2FF] border border-[#C7D2FE] px-2.5 py-1 rounded-full">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {ddayLabel}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
                12일 연속
              </span>
            </div>
          </div>
        </header>

        {/* 데스크탑 탑바 */}
        <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white border-b border-[#ECEAF5] sticky top-0 z-20">
          <p className="text-[#1C1B33] font-bold text-[20px]">내 학습</p>
          <div className="flex items-center gap-2">
            {ddayLabel && (
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#4F46E5] bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-1.5 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {ddayLabel}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#059669] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-full">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
              12일 연속
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[680px] mx-auto w-full">

            {/* AI 넛지 배너 */}
            <div className="bg-white border-l-4 border-[#06B6D4] border-y border-r border-[#ECEAF5] rounded-r-xl rounded-l-none flex items-center gap-3 px-4 py-3 mb-5 shadow-[0_1px_8px_rgba(79,70,229,0.06)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[#1C1B33] text-[13px] font-semibold">오늘 과외에서 틀린 문제가 3개 있어요</p>
                <p className="text-[#6B7280] text-[12px] mt-0.5">Part 5 수동태 2개 · Part 3 의도 파악 1개 — AI가 정리해뒀어요</p>
              </div>
              <button
                onClick={() => setTab('wrong')}
                className="shrink-0 text-[11px] font-bold text-[#0891B2] bg-[#ECFEFF] border border-[#A5F3FC] px-3 py-1.5 rounded-lg hover:bg-[#CFFAFE] transition-colors whitespace-nowrap"
              >
                오답노트 보기
              </button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-[#ECEAF5] mb-5">
              {([['part', '파트별 연습'], ['wrong', 'AI 오답노트'], ['voca', '보카런']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-5 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-all ${tab === key ? 'text-[#4F46E5] border-[#4F46E5] font-bold' : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── 파트별 연습 ── */}
            {tab === 'part' && (
              <div className="animate-fade-in">
                <p className="text-[#6B7280] text-[13px] leading-relaxed mb-4">
                  오늘 과외에서 다룬 파트를 더 연습하거나, 약한 파트를 골라 추가 문제를 풀어보세요.
                </p>
                {/* 필터 */}
                <div className="flex gap-2 mb-4">
                  {(['전체', 'LC', 'RC'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-[12px] font-semibold px-4 py-1.5 rounded-full border transition-all ${filter === f ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]' : 'border-[#ECEAF5] bg-white text-[#6B7280] hover:border-[#C7D2FE]'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {/* 파트 그리드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredParts.map((p) => (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md ${
                        p.status === 'recommended'
                          ? 'border border-[#06B6D4] shadow-[0_1px_8px_rgba(6,182,212,0.10)]'
                          : 'border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0 ${p.status === 'done' ? 'bg-[#F0FDF4] text-[#059669]' : 'bg-[#EEF2FF] text-[#4F46E5]'}`}>
                          {p.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#1C1B33] text-[13px] font-semibold">{p.name}</p>
                          <p className="text-[#9CA3AF] text-[11px]">{p.type}</p>
                        </div>
                        {p.status === 'done' && (
                          <span className="text-[10px] font-bold bg-[#F0FDF4] text-[#059669] px-2 py-0.5 rounded-md">자신있음</span>
                        )}
                        {p.status === 'recommended' && (
                          <span className="text-[10px] font-bold bg-[#ECFEFF] text-[#0891B2] px-2 py-0.5 rounded-md">AI 추천</span>
                        )}
                      </div>
                      <p className="text-[#374151] text-[12px] leading-relaxed mb-3 line-clamp-2">{p.desc}</p>
                      <div className="flex items-center justify-between">
                        <button className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${p.status === 'recommended' ? 'bg-[#ECFEFF] text-[#0891B2] hover:bg-[#CFFAFE]' : 'bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]'}`}>
                          {p.status === 'recommended' ? 'AI 맞춤 문제' : '문제 풀기'}
                        </button>
                        <span className={`text-[11px] font-semibold ${p.accuracy >= 80 ? 'text-[#059669]' : p.accuracy >= 65 ? 'text-[#9CA3AF]' : 'text-[#DC2626]'}`}>
                          정답률 {p.accuracy}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI 오답노트 ── */}
            {tab === 'wrong' && (
              <div className="animate-fade-in space-y-3">
                {/* AI 분석 배너 */}
                <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-2xl p-4 flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <div>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">AI 오답 패턴 분석</p>
                    <p className="text-white font-semibold text-[13px] leading-snug">수동태 문제가 최근 3회 연속 틀렸어요.</p>
                    <p className="text-white/70 text-[12px] mt-0.5">이 유형만 집중하면 예상 점수 +15점 가능합니다.</p>
                  </div>
                </div>

                {/* 오답 리스트 */}
                {WRONG_ITEMS.map((item, i) => (
                  <div key={i} className="bg-white border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-[#C7D2FE] transition-all">
                    <div className="text-center shrink-0 w-8">
                      {item.date.map((d, j) => (
                        <p key={j} className="text-[10px] text-[#9CA3AF] leading-snug">{d}</p>
                      ))}
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.icon === 'RC' ? 'bg-[#EEF2FF]' : 'bg-[#ECFEFF]'}`}>
                      {item.icon === 'RC' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1C1B33] text-[13px] font-medium truncate mb-1.5">{item.q}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {item.tags.map((tag) => (
                          <span key={tag.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${TAG_STYLE[tag.color]}`}>{tag.label}</span>
                        ))}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" className="shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            )}

            {/* ── 보카런 ── */}
            {tab === 'voca' && (
              <div className="animate-fade-in space-y-3">
                {/* 오늘의 단어 목표 */}
                <div className="bg-white border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <Ring current={18} total={50} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1C1B33] font-bold text-[15px]">오늘의 단어 목표 50개</p>
                      <p className="text-[#6B7280] text-[12px] mt-0.5 mb-3">32개 남았어요 · 12일 연속 달성 중</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: '플래시카드', color: 'indigo' },
                          { label: '퀴즈', color: 'indigo' },
                          { label: '받아쓰기', color: 'cyan' },
                        ].map((m) => (
                          <button key={m.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-colors ${m.color === 'cyan' ? 'border-[#A5F3FC] bg-[#ECFEFF] text-[#0891B2] hover:bg-[#CFFAFE]' : 'border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]'}`}>
                            {m.label === '플래시카드' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
                            {m.label === '퀴즈' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}
                            {m.label === '받아쓰기' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 단어장 목록 */}
                <p className="text-[#374151] text-[13px] font-semibold px-1">단어장</p>
                {VOCA_BOOKS.map((book) => (
                  <div key={book.name} className="bg-white border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-[#C7D2FE] transition-all">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: book.bg }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={book.tc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[#1C1B33] text-[13px] font-semibold">{book.name}</p>
                        {book.recommended && (
                          <span className="text-[9px] font-bold bg-[#ECFEFF] text-[#0891B2] px-1.5 py-0.5 rounded-md">AI 추천</span>
                        )}
                      </div>
                      <p className="text-[#9CA3AF] text-[11px] mb-1.5">{book.total}개 · {book.done}개 완료</p>
                      <div className="h-1 bg-[#ECEAF5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(book.done / book.total * 100)}%`, background: book.color }}/>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" className="shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            )}

          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
