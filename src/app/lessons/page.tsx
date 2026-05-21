'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo } from 'react'
import AccountMenu from '@/components/AccountMenu'

/* ── 타입 ── */
type LessonStatus = 'done' | 'current' | 'upcoming' | 'locked'
interface Lesson {
  id: string; title: string; status: LessonStatus
  partLabel?: string; href?: string
}
interface BookData {
  id: number; emoji: string; accentColor: string
  title: string; duration: string; desc: string
  fullyLocked: boolean; lockReason?: string; lessons: Lesson[]
}

/* ── 커리큘럼 ── */
const BOOKS: BookData[] = [
  {
    id: 1, emoji: '📗', accentColor: '#16A34A',
    title: '문법 기초 다지기', duration: '3주',
    desc: '수동태, 시제, 접속사 — 진단에서 약했던 영역 집중',
    fullyLocked: false,
    lessons: [
      { id: 'l1', title: '수동태 기초 이해', status: 'done', partLabel: 'Part 5', href: '/part5' },
      { id: 'l2', title: 'be + p.p. 형태 연습', status: 'done', partLabel: 'Part 5', href: '/part5' },
      { id: 'l3', title: '수동태 vs 능동태 구별', status: 'current', partLabel: 'Part 5', href: '/part5' },
      { id: 'l4', title: '수동태 시제 변화', status: 'upcoming', partLabel: 'Part 5', href: '/part5' },
      { id: 'l5', title: '실전 문제 적용', status: 'locked', partLabel: 'Part 5' },
    ],
  },
  {
    id: 2, emoji: '📙', accentColor: '#F59E0B',
    title: '장문 공란 AI 실전', duration: '2주',
    desc: 'Part 6 — AI 강사와 함께 지문 흐름 속 빈칸 채우기',
    fullyLocked: false,
    lessons: [
      { id: 'l_p6_1', title: 'AI 강사와 실전 풀기', status: 'upcoming', partLabel: 'Part 6', href: '/part6' },
      { id: 'l_p6_2', title: '이메일·공지 지문 분석', status: 'locked', partLabel: 'Part 6' },
      { id: 'l_p6_3', title: '문장 삽입 전략 완성', status: 'locked', partLabel: 'Part 6' },
    ],
  },
  {
    id: 3, emoji: '📘', accentColor: '#2563EB',
    title: '독해 실전 훈련', duration: '4주',
    desc: 'Part 7 — 장문 읽기 이해력 훈련',
    fullyLocked: false,
    lessons: [
      { id: 'l6', title: '장문 독해 — 단일지문', status: 'upcoming', partLabel: 'Part 7', href: '/part7' },
      { id: 'l7', title: 'Why 문제 풀이 전략', status: 'locked', partLabel: 'Part 7' },
      { id: 'l8', title: '추론 독해 완성', status: 'locked', partLabel: 'Part 7' },
      { id: 'l9', title: '복수지문 분석', status: 'locked', partLabel: 'Part 7' },
    ],
  },
  {
    id: 4, emoji: '🎤', accentColor: '#7C3AED',
    title: '스피킹 도전', duration: '2주',
    desc: 'TOEIC Speaking — 사진 묘사부터 즉흥 말하기까지',
    fullyLocked: false,
    lessons: [
      { id: 'l10', title: '사진 묘사 30초 말하기', status: 'upcoming', partLabel: 'Speaking', href: '/speaking' },
      { id: 'l11', title: '인물·사물·배경 묘사 순서', status: 'locked', partLabel: 'Speaking' },
      { id: 'l12', title: '30초 즉흥 말하기 연습', status: 'locked', partLabel: 'Speaking' },
    ],
  },
  {
    id: 5, emoji: '📕', accentColor: '#6B7280',
    title: '실전 감각 만들기', duration: '5주',
    desc: '시간 내 풀기, 오답 패턴 분석',
    fullyLocked: true, lockReason: 'Book 1·2·3·4 완료 후 해제', lessons: [],
  },
]

/* ── 네비게이션 ── */
const NAV = [
  { label: '홈',      href: '/dashboard',  active: false },
  { label: '내 학습', href: '/lessons',     active: true },
  { label: '현황',    href: '/status',     active: false },
  { label: '자율학습', href: '/my-learning', active: false },
]
const NAV_ICONS = [
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill={a?'#2563EB':'none'} stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#2563EB':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
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
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center transition-all shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>
      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item, i) => {
          const cls = `w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]'}`
          return (
            <Link key={item.label} href={item.href} className={cls}>
              <span className="shrink-0">{NAV_ICONS[i](item.active)}</span>
              {open && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      <div className={`${open ? 'px-3' : 'px-2'} mb-3`}>
        <div className="mb-2 h-px bg-[#DBEAFE]" />
        <Link href="/settings/account" className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {open && <span className="animate-fade-in">설정</span>}
        </Link>
      </div>
    </aside>
  )
}

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

/* ── 책 섹션 ── */
function BookSection({ book }: { book: BookData }) {
  const router = useRouter()

  if (book.fullyLocked) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-[22px] opacity-25 shrink-0">{book.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#C4C9D4]">Book {book.id} · {book.title}</p>
            <p className="text-[11px] text-[#D1D5DB] mt-0.5">{book.desc}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {book.lockReason && <span className="text-[10px] text-[#D1D5DB]">0개</span>}
            <div className="w-7 h-7 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
        </div>
        {book.lockReason && (
          <p className="text-[10px] text-[#E5E7EB] mt-2.5 text-center bg-[#F9FAFB] rounded-lg py-1.5">{book.lockReason}</p>
        )}
      </div>
    )
  }

  const doneCount = book.lessons.filter(l => l.status === 'done').length

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-[0_1px_10px_rgba(0,0,0,0.06)]"
      style={{ borderLeft: `3px solid ${book.accentColor}` }}>

      {/* 책 헤더 */}
      <div className="px-4 pt-4 pb-3 border-b border-[#F3F4F6]">
        <div className="flex items-start gap-3">
          <span className="text-[22px] shrink-0 mt-0.5">{book.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="text-[#1C1B33] font-bold text-[14px]">Book {book.id} · {book.title}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ECFEFF] text-[#0891B2] border border-[#A5F3FC] shrink-0">PRO</span>
            </div>
            <p className="text-[#9CA3AF] text-[12px]">{book.desc}</p>
          </div>
          <div className="shrink-0 text-right pl-2">
            <p className="text-[13px] font-black text-[#2563EB]">{doneCount} / {book.lessons.length}</p>
            <p className="text-[10px] text-[#D1D5DB] font-medium">완료</p>
          </div>
        </div>
      </div>

      {/* 강의 타임라인 */}
      <div className="relative px-4 py-2">
        <div className="absolute left-[28px] top-0 bottom-0 w-px bg-[#F0F0F0]" />

        {book.lessons.map((lesson) => {
          /* 완료 */
          if (lesson.status === 'done') return (
            <div key={lesson.id} className="relative flex items-center gap-3 py-2.5">
              <div className="relative z-10 w-5 h-5 rounded-full bg-[#DCFCE7] border border-[#86EFAC] flex items-center justify-center shrink-0">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="text-[13px] text-[#C4C9D4] line-through flex-1 min-w-0 truncate">{lesson.title}</span>
              {lesson.partLabel && <span className="text-[10px] bg-[#F9FAFB] text-[#D1D5DB] px-1.5 py-0.5 rounded-md shrink-0">{lesson.partLabel}</span>}
            </div>
          )

          /* 오늘의 수업 */
          if (lesson.status === 'current') return (
            <div key={lesson.id} className="relative my-2.5 -mx-1">
              <div className="rounded-2xl overflow-hidden border border-[#C7D2FE] shadow-[0_4px_20px_rgba(37,99,235,0.16)]">
                <div className="bg-white px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-[#2563EB] shrink-0">
                        ▶ 오늘의 수업
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] shrink-0">
                        📍 지금 여기
                      </span>
                    </div>
                    {lesson.partLabel && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] shrink-0">{lesson.partLabel}</span>
                    )}
                  </div>
                  <p className="text-[#1C1B33] font-bold text-[15px]">{lesson.title}</p>
                </div>
                <button
                  onClick={() => lesson.href && router.push(lesson.href)}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] py-3 font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  시작하기
                </button>
              </div>
            </div>
          )

          /* 미시작 (접근 가능) */
          if (lesson.status === 'upcoming') return (
            <button
              key={lesson.id}
              onClick={() => lesson.href && router.push(lesson.href)}
              className="relative w-full flex items-center gap-3 py-2.5 text-left group"
            >
              <div className="relative z-10 w-5 h-5 rounded-full border-2 border-[#D1D5DB] bg-white flex items-center justify-center shrink-0 group-hover:border-[#6B7280] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB] group-hover:bg-[#6B7280] transition-colors" />
              </div>
              <span className="text-[13px] text-[#374151] flex-1 min-w-0 truncate group-hover:text-[#1C1B33] transition-colors">{lesson.title}</span>
              {lesson.partLabel && (
                <span className="text-[10px] bg-[#F3F4F6] text-[#9CA3AF] px-1.5 py-0.5 rounded-md shrink-0">{lesson.partLabel}</span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 group-hover:stroke-[#9CA3AF] transition-colors"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )

          /* 잠금 */
          return (
            <div key={lesson.id} className="relative flex items-center gap-3 py-2.5 opacity-30">
              <div className="relative z-10 w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <span className="text-[13px] text-[#6B7280] flex-1 min-w-0 truncate">{lesson.title}</span>
              {lesson.partLabel && <span className="text-[10px] bg-[#F3F4F6] text-[#9CA3AF] px-1.5 py-0.5 rounded-md shrink-0">{lesson.partLabel}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── AI 튜터 하단 바 ── */
function AiTutorBar() {
  const router = useRouter()
  return (
    <div className="fixed bottom-[72px] md:bottom-6 left-0 right-0 md:left-[56px] z-40 px-4 md:px-8 pointer-events-none">
      <div className="max-w-[680px] mx-auto pointer-events-auto">
        <div className="bg-white border border-[#DBEAFE] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_8px_24px_rgba(37,99,235,0.14)]">
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1C1B33] font-bold text-[13px]">AI 튜터와 함께 풀기</p>
            <p className="text-[#9CA3AF] text-[11px]">막힌 문제 바로 물어보세요</p>
          </div>
          <button
            onClick={() => router.push('/part5')}
            className="shrink-0 bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-[12px] font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            입장하기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 메인 ── */
export default function LessonsPage() {
  const { userName, targetScore, examDate } = useOnboardingStore()

  const ddayLabel = useMemo(() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <p className="text-[#1C1B33] text-[20px] font-bold">내 학습</p>
            <div className="flex items-center gap-2">
              {ddayLabel && (
                <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D2FE] px-2.5 py-1 rounded-full">
                  {ddayLabel}
                </span>
              )}
              <span className="text-[11px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-2.5 py-1 rounded-full">
                🔥 12일
              </span>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </div>
        </header>

        {/* 데스크탑 헤더 */}
        <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <p className="text-[#1C1B33] font-bold text-[20px]">내 학습</p>
          <div className="flex items-center gap-2">
            {ddayLabel && (
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#C7D2FE] px-3 py-1.5 rounded-full">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                토익 {ddayLabel}
              </span>
            )}
            <span className="text-[12px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-3 py-1.5 rounded-full">
              🔥 12일 연속
            </span>
            <AccountMenu userName={userName ?? ''} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-40 md:pb-28">
          <div className="max-w-[680px] mx-auto w-full space-y-3">

            {/* 플랜 배너 — 블루 그라디언트 */}
            <div className="bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#60A5FA] rounded-2xl px-5 py-5 flex items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
              <div className="absolute right-20 bottom-0 w-16 h-16 bg-white/5 rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">맞춤 학습 플랜</span>
                  <span className="text-[10px] font-semibold bg-white/20 text-white/90 px-1.5 py-0.5 rounded">진단 결과 반영</span>
                </div>
                <p className="text-white font-bold text-[18px] leading-snug mb-2.5">
                  🎯 {userName ? `${userName}님의 플랜` : '나만의 플랜'}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">3개월</span>
                  {targetScore && (
                    <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">목표 {targetScore}점</span>
                  )}
                  <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">꾸준히</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl px-3.5 py-3 text-center shrink-0 min-w-[68px] relative z-10 shadow-sm">
                <p className="text-[28px] leading-none mb-1">📚</p>
                <p className="text-[10px] text-[#374151] font-bold">5 Books</p>
              </div>
            </div>

            {/* 오늘 수업 완료 뱃지 */}
            <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-3.5 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
              <p className="text-[#15803D] text-[12px] font-semibold flex-1">오늘 수업 일정을 완료했어요!</p>
              <button className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-0.5 shrink-0">
                완전보기
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            {/* Books */}
            {BOOKS.map((book) => <BookSection key={book.id} book={book} />)}

          </div>
        </main>
      </div>

      <BottomNav />
      <AiTutorBar />
    </div>
  )
}
