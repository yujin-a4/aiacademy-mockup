'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { useVocaStore } from '@/store/vocaStore'
import { useWrongAnswerStore, WrongAnswer, SCAFFOLDING } from '@/store/wrongAnswerStore'
import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AccountMenu from '@/components/AccountMenu'

/* ── 데이터 ── */
const PARTS = [
  { id: 'P1', name: '사진 묘사',  type: 'LC', accuracy: 91, desc: '장소·사람·사물을 묘사하는 문장 구조 연습', status: 'done' },
  { id: 'P5', name: '단문 공란',  type: 'RC', accuracy: 61, desc: '오늘 과외에서 수동태·시제 유형을 틀렸어요. 집중 연습이 필요해요.', status: 'recommended' },
  { id: 'P3', name: '짧은 대화',  type: 'LC', accuracy: 74, desc: '두 사람의 대화에서 주제·의도·다음 행동 파악', status: 'normal' },
  { id: 'P6', name: '장문 공란',  type: 'RC', accuracy: 52, desc: '이메일·공지 등 지문 흐름 속 문장 삽입 연습', status: 'normal' },
  { id: 'P2', name: '질문 응답',  type: 'LC', accuracy: 83, desc: '다양한 의문문에 적절한 응답 고르기 연습', status: 'normal' },
  { id: 'P7', name: '장문 독해',  type: 'RC', accuracy: 48, desc: '단일 지문과 복수 지문 읽기 이해력 훈련', status: 'normal' },
]

const VOCA_BOOKS_STATIC = [
  { name: '비즈니스 핵심 어휘', total: 350, done: 212, color: '#2563EB', bg: '#EFF6FF', tc: '#2563EB', recommended: true },
  { name: 'TOEIC 빈출 1000',   total: 1000, done: 312, color: '#06B6D4', bg: '#ECFEFF', tc: '#0891B2', recommended: false },
]

/* ── 원형 진행 SVG ── */
function Ring({ current, total }: { current: number; total: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(current / total, 1))
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#DBEAFE" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#2563EB" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 32 32)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-black text-[#2563EB] leading-none">{current}</span>
        <span className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">/ {total}</span>
      </div>
    </div>
  )
}


/* ── 오답 카드 ── */
function WrongItem({ item, showDate }: { item: WrongAnswer; showDate?: boolean }) {
  const d = new Date(item.timestamp)
  const isToday = d.toDateString() === new Date().toDateString()
  const dateLabel = isToday ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}`
  return (
    <Link
      href={`/my-learning/wrong/${item.id}`}
      className="flex bg-white border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] rounded-2xl px-4 py-3 items-center gap-3 hover:border-[#C7D2FE] transition-all"
    >
      {showDate && (
        <div className="text-center shrink-0 w-8">
          <p className="text-[10px] text-[#9CA3AF] leading-snug">{dateLabel}</p>
          <p className="text-[10px] text-[#9CA3AF] leading-snug">{item.partLabel}</p>
        </div>
      )}
      <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#1C1B33] text-[13px] font-medium truncate mb-1.5">{item.questionText}</p>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB]">{item.partLabel}</span>
          {item.category && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#DC2626]">{item.category}</span>
          )}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" className="shrink-0"><path d="M9 18l6-6-6-6"/></svg>
    </Link>
  )
}

/* ── 사이드바 ── */
const NAV = [
  { label: '홈',      href: '/dashboard',  active: false },
  { label: '내 학습', href: '/my-learning', active: true },
  { label: '현황',    href: '/status',     active: false },
  { label: '알림',    href: '#',           active: false },
]

const NAV_ICONS = [
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill={a?'#2563EB':'none'} stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
]

function Sidebar() {
  const [open, setOpen] = useState(false)
  return (
    <aside className={`hidden md:flex flex-col bg-[#F8FAFF] border-r border-[#DBEAFE] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[240px]' : 'w-[56px]'}`}>
      <div className={`flex items-center min-h-[60px] shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
        {open && (
          <Link href="/dashboard" className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] tracking-tight">YBM</span>
            </div>
            <span className="text-[#1C1B33] font-bold text-[15px]">AI Course</span>
          </Link>
        )}
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#DBEAFE] hover:bg-[#DBEAFE] flex items-center justify-center transition-all shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item, i) => (
          <Link key={item.label} href={item.href}
            className={`w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]'}`}>
            <span className="shrink-0">{NAV_ICONS[i](item.active)}</span>
            {open && <span className="animate-fade-in">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={`${open ? 'px-3' : 'px-2'} mb-3`}>
        <div className="mb-2 h-px bg-[#DBEAFE]"/>
        <Link href="/settings/account" className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {open && <span className="animate-fade-in">설정</span>}
        </Link>
      </div>

    </aside>
  )
}

/* ── 모바일 하단 네비 ── */
function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#DBEAFE] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {NAV.slice(0, 4).map((item, i) => (
        <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>
          {NAV_ICONS[i](item.active)}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
      <Link href="/settings/account" className="flex flex-col items-center gap-1 min-w-[52px] py-1 text-[#9CA3AF]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span className="text-[10px] font-medium">설정</span>
      </Link>
    </nav>
  )
}

/* ── 메인 페이지 ── */
function MyLearningInner() {
  const { userName, targetScore, examDate } = useOnboardingStore()
  const { bookmarkedIds } = useBookmarkStore()
  const { initTodayWords } = useVocaStore()
  const { wrongAnswers } = useWrongAnswerStore()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'part' | 'wrong' | 'voca'>(
    (searchParams.get('tab') as 'part' | 'wrong' | 'voca') || 'part'
  )
  const [filter, setFilter] = useState<'전체' | 'LC' | 'RC'>('전체')
  const [wrongSubTab, setWrongSubTab] = useState<'유형별' | '파트별' | 'AI 추천'>('유형별')

  const ddayLabel = useMemo(() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  const router = useRouter()
  const filteredParts = filter === '전체' ? PARTS : PARTS.filter((p) => p.type === filter)

  const categoryGroups = useMemo(() => {
    const groups: Record<string, WrongAnswer[]> = {}
    wrongAnswers.forEach(w => {
      const cat = w.category ?? '미분류'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(w)
    })
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [wrongAnswers])

  const partGroups = useMemo(() => {
    const groups: Record<string, WrongAnswer[]> = {}
    wrongAnswers.forEach(w => {
      if (!groups[w.partLabel]) groups[w.partLabel] = []
      groups[w.partLabel].push(w)
    })
    return Object.entries(groups)
  }, [wrongAnswers])

  const topCategories = categoryGroups.slice(0, 2)

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#DBEAFE] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <p className="text-[#1C1B33] text-[20px] font-bold">내 학습</p>
            <div className="flex items-center gap-2">
              {ddayLabel && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D2FE] px-2.5 py-1 rounded-full">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {ddayLabel}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
                12일 연속
              </span>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </div>
        </header>

        {/* 데스크탑 탑바 */}
        <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white border-b border-[#DBEAFE] sticky top-0 z-20">
          <p className="text-[#1C1B33] font-bold text-[20px]">내 학습</p>
          <div className="flex items-center gap-2">
            {ddayLabel && (
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D2FE] px-3 py-1.5 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {ddayLabel}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#059669] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-full">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
              12일 연속
            </span>
            <AccountMenu userName={userName ?? ''} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[680px] mx-auto w-full">

            {/* AI 넛지 배너 */}
            {wrongAnswers.length > 0 && (
              <div className="max-w-[680px] bg-white border-l-4 border-[#06B6D4] border-y border-r border-[#DBEAFE] rounded-r-xl rounded-l-none flex items-center gap-3 px-4 py-3 mb-5 shadow-[0_1px_8px_rgba(37,99,235,0.06)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1C1B33] text-[13px] font-semibold">틀린 문제가 {wrongAnswers.length}개 쌓여있어요</p>
                  <p className="text-[#6B7280] text-[12px] mt-0.5">AI 강사가 스캐폴딩 힌트를 준비해뒀어요</p>
                </div>
                <button
                  onClick={() => setTab('wrong')}
                  className="shrink-0 text-[11px] font-bold text-[#0891B2] bg-[#ECFEFF] border border-[#A5F3FC] px-3 py-1.5 rounded-lg hover:bg-[#CFFAFE] transition-colors whitespace-nowrap"
                >
                  오답노트 보기
                </button>
              </div>
            )}

            {/* 메인 탭 */}
            <div className="max-w-[680px] flex border-b border-[#DBEAFE] mb-5">
              {([['part', '파트별 연습'], ['wrong', 'AI 오답노트'], ['voca', '보카런']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-5 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-all ${tab === key ? 'text-[#2563EB] border-[#2563EB] font-bold' : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── 파트별 연습 ── */}
            {tab === 'part' && (
              <div className="max-w-[680px] animate-fade-in">
                <p className="text-[#6B7280] text-[13px] leading-relaxed mb-4">
                  오늘 과외에서 다룬 파트를 더 연습하거나, 약한 파트를 골라 추가 문제를 풀어보세요.
                </p>
                <div className="flex gap-2 mb-4">
                  {(['전체', 'LC', 'RC'] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`text-[12px] font-semibold px-4 py-1.5 rounded-full border transition-all ${filter === f ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#DBEAFE] bg-white text-[#6B7280] hover:border-[#C7D2FE]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredParts.map((p) => (
                    <div key={p.id}
                      className={`bg-white rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md ${p.status === 'recommended' ? 'border border-[#06B6D4] shadow-[0_1px_8px_rgba(6,182,212,0.10)]' : 'border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)]'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0 ${p.status === 'done' ? 'bg-[#F0FDF4] text-[#059669]' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
                          {p.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#1C1B33] text-[13px] font-semibold">{p.name}</p>
                          <p className="text-[#9CA3AF] text-[11px]">{p.type}</p>
                        </div>
                        {p.status === 'done' && <span className="text-[10px] font-bold bg-[#F0FDF4] text-[#059669] px-2 py-0.5 rounded-md">자신있음</span>}
                        {p.status === 'recommended' && <span className="text-[10px] font-bold bg-[#ECFEFF] text-[#0891B2] px-2 py-0.5 rounded-md">AI 추천</span>}
                      </div>
                      <p className="text-[#374151] text-[12px] leading-relaxed mb-3 line-clamp-2">{p.desc}</p>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => p.type === 'RC' && router.push(`/my-learning/part/${p.id.toLowerCase()}`)}
                          className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${p.status === 'recommended' ? 'bg-[#ECFEFF] text-[#0891B2] hover:bg-[#CFFAFE]' : p.type === 'RC' ? 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#E0E7FF]' : 'bg-[#EFF6FF] text-[#9CA3AF] cursor-not-allowed'}`}>
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
              <div className="animate-fade-in space-y-4">
                {wrongAnswers.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <p className="text-[#6B7280] text-[14px] font-medium">아직 오답이 없어요</p>
                    <p className="text-[#9CA3AF] text-[12px] mt-1">파트별 연습을 풀면 틀린 문제가 자동으로 모입니다</p>
                  </div>
                ) : (
                  <>
                    {/* 새 오답 알림 카드 */}
                    <div className="bg-[#EFF6FF] border border-[#C7D2FE] rounded-2xl px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1C1B33] text-[13px] font-semibold">
                          오늘 새 오답 {wrongAnswers.filter(w => new Date(w.timestamp).toDateString() === new Date().toDateString()).length}개가 추가됐어요
                        </p>
                        <p className="text-[#6B7280] text-[12px]">AI 분석이 완료됐습니다</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#2563EB] bg-white border border-[#C7D2FE] px-2 py-0.5 rounded-full shrink-0">NEW</span>
                    </div>

                    {/* AI 분석 요약 카드 */}
                    {topCategories.length > 0 && (
                      <div className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] rounded-2xl p-4">
                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">AI 오답 분석 요약</p>
                        <p className="text-white font-bold text-[15px] leading-snug">
                          <span className="font-black">{topCategories[0][0]}</span> 유형이 가장 취약해요
                        </p>
                        <p className="text-white/70 text-[12px] mt-1 leading-relaxed">
                          {topCategories[0][1].length}회 반복 오답{partGroups[0] ? ` · ${partGroups[0][0]} 집중 필요` : ''}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {topCategories.slice(0, 3).map(([cat, items]) => (
                            <span key={cat} className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-lg">
                              {cat} {items.length}회
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 요약 지표 3개 */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white border border-[#DBEAFE] rounded-2xl p-3 text-center shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
                        <p className="text-[#2563EB] font-black text-[22px] leading-none">{wrongAnswers.length}</p>
                        <p className="text-[#9CA3AF] text-[11px] mt-1.5">누적 오답</p>
                      </div>
                      <div className="bg-white border border-[#DBEAFE] rounded-2xl p-3 text-center shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
                        <p className="text-[#2563EB] font-black text-[22px] leading-none">{categoryGroups.length}</p>
                        <p className="text-[#9CA3AF] text-[11px] mt-1.5">반복 유형</p>
                      </div>
                      <div className="bg-white border border-[#DBEAFE] rounded-2xl p-3 text-center shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
                        <p className="text-[#059669] font-black text-[22px] leading-none">0</p>
                        <p className="text-[#9CA3AF] text-[11px] mt-1.5">복습 완료</p>
                      </div>
                    </div>

                    {/* Primary CTA */}
                    <button
                      onClick={() => router.push('/my-learning/wrong/review')}
                      className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3 rounded-xl font-bold text-[14px] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      AI 추천 순서대로 복습하기
                    </button>

                    {/* 서브 탭 */}
                    <div className="flex border-b border-[#DBEAFE]">
                      {(['유형별', '파트별', 'AI 추천'] as const).map((t) => (
                        <button key={t} onClick={() => setWrongSubTab(t)}
                          className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${wrongSubTab === t ? 'text-[#2563EB] border-[#2563EB] font-bold' : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'}`}>
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* 유형별 — 패턴 카드 */}
                    {wrongSubTab === '유형별' && (
                      <div className="space-y-3">
                        {categoryGroups.length === 0 ? (
                          <p className="text-center text-[#9CA3AF] text-[13px] py-8">분석할 오답 데이터가 없습니다</p>
                        ) : categoryGroups.map(([cat, items]) => (
                          <div key={cat} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.05)] hover:border-[#C7D2FE] transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <p className="text-[#1C1B33] font-bold text-[14px]">{cat}</p>
                                  <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-md">{items.length}회 오답</span>
                                </div>
                                <div className="h-1.5 bg-[#DBEAFE] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${Math.min(items.length / 5 * 100, 100)}%` }} />
                                </div>
                              </div>
                              <button
                                onClick={() => router.push(`/my-learning/wrong/review?category=${encodeURIComponent(cat)}`)}
                                className="text-[12px] font-semibold text-[#2563EB] border border-[#C7D2FE] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition-colors shrink-0"
                              >
                                집중 복습
                              </button>
                            </div>
                            <p className="text-[#6B7280] text-[12px] mt-3 leading-relaxed pl-[52px]">
                              {SCAFFOLDING[cat] ?? '이 유형의 핵심 패턴을 복습해보세요.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 파트별 — 파트 요약 카드 */}
                    {wrongSubTab === '파트별' && (
                      <div className="space-y-3">
                        {partGroups.map(([part, items]) => (
                          <div key={part} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.05)] hover:border-[#C7D2FE] transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                                <span className="text-[#2563EB] font-black text-[12px]">{part.replace('Part ', 'P')}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <p className="text-[#1C1B33] font-bold text-[14px]">{part}</p>
                                  <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md">{items.length}개</span>
                                </div>
                                <div className="h-1.5 bg-[#DBEAFE] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${Math.min(items.length / 5 * 100, 100)}%` }} />
                                </div>
                              </div>
                              <button
                                onClick={() => router.push(`/my-learning/wrong/review?partId=${items[0]?.partId ?? 'p5'}`)}
                                className="text-[12px] font-semibold text-[#2563EB] border border-[#C7D2FE] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition-colors shrink-0"
                              >
                                복습하기
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI 추천 */}
                    {wrongSubTab === 'AI 추천' && (
                      <div className="space-y-3">
                        {topCategories.length === 0 ? (
                          <p className="text-center text-[#9CA3AF] text-[13px] py-8">분석할 오답 데이터가 부족합니다</p>
                        ) : topCategories.map(([cat, items], idx) => (
                          <div key={cat} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
                            <div className="flex items-start gap-3 mb-2">
                              <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md">AI 추천 {idx + 1}순위</span>
                                  <span className="text-[10px] text-[#9CA3AF]">{items.length}개 오답</span>
                                </div>
                                <p className="text-[14px] font-bold text-[#1C1B33]">{cat} 집중 복습</p>
                              </div>
                            </div>
                            <p className="text-[12px] text-[#6B7280] leading-relaxed pl-9">{SCAFFOLDING[cat] ?? '이 유형의 핵심 패턴을 복습해보세요.'}</p>
                            <div className="mt-3 pl-9">
                              <Link href={`/my-learning/wrong/review?category=${encodeURIComponent(cat)}`}
                                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] border border-[#C7D2FE] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition-colors">
                                이 유형부터 복습
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── 보카런 ── */}
            {tab === 'voca' && (
              <div className="max-w-[680px] animate-fade-in space-y-3">
                <div className="bg-white border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <Ring current={18} total={50} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1C1B33] font-bold text-[15px]">오늘의 단어 목표 50개</p>
                      <p className="text-[#6B7280] text-[12px] mt-0.5 mb-3">32개 남았어요 · 12일 연속 달성 중</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: '플래시카드', color: 'indigo', href: '/my-learning/voca/flashcard' },
                          { label: '퀴즈', color: 'indigo', href: '/my-learning/voca/quiz' },
                          { label: '받아쓰기', color: 'cyan', href: '/my-learning/voca/dictation' },
                        ].map((m) => (
                          <button key={m.label}
                            onClick={() => { initTodayWords(); router.push(m.href) }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-colors ${m.color === 'cyan' ? 'border-[#A5F3FC] bg-[#ECFEFF] text-[#0891B2] hover:bg-[#CFFAFE]' : 'border-[#C7D2FE] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#E0E7FF]'}`}>
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

                <p className="text-[#374151] text-[13px] font-semibold px-1">단어장</p>
                {VOCA_BOOKS_STATIC.map((book) => (
                  <div key={book.name} className="bg-white border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] rounded-2xl px-4 py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: book.bg }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={book.tc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[#1C1B33] text-[13px] font-semibold">{book.name}</p>
                        {book.recommended && <span className="text-[9px] font-bold bg-[#ECFEFF] text-[#0891B2] px-1.5 py-0.5 rounded-md">AI 추천</span>}
                      </div>
                      <p className="text-[#9CA3AF] text-[11px] mb-1.5">{book.total}개 · {book.done}개 완료</p>
                      <div className="h-1 bg-[#DBEAFE] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(book.done / book.total * 100)}%`, background: book.color }}/>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => router.push('/my-learning/voca/saved')}
                  className="w-full bg-white border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-[#FDE68A] hover:shadow-md transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FEF9C3] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1C1B33] text-[13px] font-semibold">내가 저장한 단어</p>
                    <p className="text-[#9CA3AF] text-[11px] mb-1.5">{bookmarkedIds.length}개 저장됨</p>
                    <div className="h-1 bg-[#DBEAFE] rounded-full overflow-hidden">
                      <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: bookmarkedIds.length > 0 ? '100%' : '0%' }}/>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

export default function MyLearning() {
  return (
    <Suspense>
      <MyLearningInner />
    </Suspense>
  )
}
