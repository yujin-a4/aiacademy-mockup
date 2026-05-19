'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState } from 'react'
import AccountMenu from '@/components/AccountMenu'

/* ── 데이터 ── */

const SCORE_HISTORY = [
  { label: '3/1',  score: 615 },
  { label: '3/15', score: 628 },
  { label: '4/1',  score: 638 },
  { label: '4/15', score: 652 },
  { label: '5/1',  score: 647 },
  { label: '5/18', score: 668 },
]

const OVERVIEW_STATS = [
  { label: '총 학습일',  value: '48일',   color: '#4F46E5', bg: '#EEF2FF' },
  { label: '총 문제 수', value: '1,240',  color: '#0891B2', bg: '#ECFEFF' },
  { label: '평균 정답률', value: '68%',   color: '#059669', bg: '#F0FDF4' },
  { label: '연속 학습',  value: '12일',   color: '#D97706', bg: '#FEF9C3' },
]

const PART_STATS = [
  { id: 'P1', name: '사진 묘사',  type: 'LC', accuracy: 91 },
  { id: 'P2', name: '질문 응답',  type: 'LC', accuracy: 83 },
  { id: 'P3', name: '짧은 대화',  type: 'LC', accuracy: 74 },
  { id: 'P5', name: '단문 공란',  type: 'RC', accuracy: 61 },
  { id: 'P6', name: '장문 공란',  type: 'RC', accuracy: 52 },
  { id: 'P7', name: '장문 독해',  type: 'RC', accuracy: 48 },
]

const BADGES = [
  { id: 1, icon: '🔥', name: '첫 발걸음',      desc: '첫 번째 학습 완료',             earned: true,  earnedAt: '3월 1일' },
  { id: 2, icon: '📅', name: '7일 연속',        desc: '7일 연속 학습 달성',           earned: true,  earnedAt: '3월 8일' },
  { id: 3, icon: '✍️', name: '받아쓰기 입문',   desc: '받아쓰기 10회 완료',           earned: true,  earnedAt: '4월 2일' },
  { id: 4, icon: '📖', name: 'Part 5 도전자',   desc: 'Part 5 연습 20문제 완료',      earned: true,  earnedAt: '5월 10일' },
  { id: 5, icon: '🏆', name: '30일 연속',       desc: '30일 연속 학습 달성',           earned: false, condition: '현재 12일 · 18일 남음' },
  { id: 6, icon: '⭐', name: '700점 돌파',      desc: '모의 점수 700점 이상 달성',    earned: false, condition: '현재 예상 668점' },
  { id: 7, icon: '💎', name: '파트 마스터',     desc: '모든 파트 정답률 80% 이상',    earned: false, condition: 'P5·P6·P7 개선 필요' },
  { id: 8, icon: '🌟', name: '보카런 완주',     desc: '1,000개 단어 학습 완료',       earned: false, condition: '현재 312 / 1,000개' },
]

type TipColor = 'blue' | 'purple' | 'green' | 'amber'
const TIP_COLORS: Record<TipColor, { bg: string; text: string }> = {
  blue:   { bg: '#EEF2FF', text: '#4F46E5' },
  purple: { bg: '#F5F3FF', text: '#7C3AED' },
  green:  { bg: '#F0FDF4', text: '#059669' },
  amber:  { bg: '#FEF9C3', text: '#B45309' },
}

const TIPS: { id: number; category: string; color: TipColor; points: string[] }[] = [
  {
    id: 1, category: '수동태', color: 'blue',
    points: [
      'be + p.p 형태 — 주어가 행위를 "당하는" 관계일 때 사용',
      '"by + 행위자"는 시험에서 대부분 생략됨',
      '현재완료 수동: has/have been + p.p',
      '미래 수동: will be + p.p',
    ],
  },
  {
    id: 2, category: '시제', color: 'purple',
    points: [
      'since + 과거시점 → 반드시 현재완료(has/have + p.p)',
      'for + 기간 → 현재완료 또는 과거 둘 다 가능',
      'last week, yesterday → 과거시제 (현재완료 사용 불가)',
    ],
  },
  {
    id: 3, category: '전치사', color: 'green',
    points: [
      'by: 마감 기한 (~까지 완료) — "submit by Friday"',
      'until: 상태 지속 (~까지 계속) — "open until 6 PM"',
      'during + 명사 ↔ while + 절 — 둘 다 "~하는 동안"',
      'within: ~이내 / in: ~후 (미래 표현)',
    ],
  },
  {
    id: 4, category: '비즈니스 어휘', color: 'amber',
    points: [
      'accommodate: 수용하다, 편의를 제공하다',
      'facilitate: 용이하게 하다, 촉진하다',
      'implement: 시행하다, 이행하다',
      'collaborate (with): ~와 협력하다',
      'designated: 지정된 — "designated parking area"',
    ],
  },
]

const MATERIALS = [
  {
    date: '2026-05-18', label: '오늘',
    items: [
      { type: 'PDF',  title: '수동태 핵심 패턴 워크시트',       meta: '2.1 MB' },
      { type: '문제', title: 'Part 5 수동태 집중 연습 20선',    meta: '20문항' },
    ],
  },
  {
    date: '2026-05-15', label: '5월 15일 목',
    items: [
      { type: 'PDF',  title: '시제 총정리 핸드아웃',            meta: '1.8 MB' },
      { type: '문제', title: 'Part 5·6 시제 연습',              meta: '24문항' },
    ],
  },
  {
    date: '2026-05-12', label: '5월 12일 월',
    items: [
      { type: 'PDF',  title: '전치사 패턴 카드 (by/until/during)', meta: '0.9 MB' },
      { type: '영상', title: '전치사 특강 요약 클립',            meta: '8분' },
    ],
  },
  {
    date: '2026-05-08', label: '5월 8일 목',
    items: [
      { type: 'PDF',  title: '비즈니스 어휘 Top 100',           meta: '3.2 MB' },
    ],
  },
]

/* ── SVG 점수 차트 ── */
function ScoreChart({ data, target }: { data: { label: string; score: number }[]; target: number }) {
  const MIN = 580, MAX = 800
  const W = 300, H = 120, PX = 8, PT = 20, PB = 18
  const innerW = W - PX * 2
  const innerH = H - PT - PB
  const tx = (i: number) => PX + (i / (data.length - 1)) * innerW
  const ty = (s: number) => PT + innerH - ((s - MIN) / (MAX - MIN)) * innerH
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${tx(i).toFixed(1)},${ty(d.score).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${tx(data.length - 1).toFixed(1)},${(PT + innerH).toFixed(1)} L${PX},${(PT + innerH).toFixed(1)}Z`
  const tgtY = ty(target)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* 목표선 */}
      <line x1={PX} y1={tgtY} x2={W - PX} y2={tgtY} stroke="#EF4444" strokeWidth="1.2" strokeDasharray="4,3" />
      <text x={W - PX - 2} y={tgtY - 4} textAnchor="end" fill="#EF4444" fontSize="8.5" fontWeight="600">목표 {target}</text>
      {/* 면적 */}
      <path d={areaPath} fill="url(#sg)" />
      {/* 선 */}
      <path d={linePath} fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* 점 */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={tx(i)} cy={ty(d.score)} r="3.5" fill="#4F46E5" stroke="white" strokeWidth="1.5" />
          {i === data.length - 1 && (
            <text x={tx(i)} y={ty(d.score) - 8} textAnchor="middle" fill="#4F46E5" fontSize="9.5" fontWeight="700">{d.score}</text>
          )}
        </g>
      ))}
      {/* x 레이블 */}
      {data.map((d, i) => (
        <text key={i} x={tx(i)} y={H - 2} textAnchor="middle" fill="#9CA3AF" fontSize="8.5">{d.label}</text>
      ))}
    </svg>
  )
}

/* ── 네비게이션 ── */
const NAV = [
  { label: '홈',      href: '/dashboard',  active: false },
  { label: '내 학습', href: '/my-learning', active: false },
  { label: '현황',    href: '/status',      active: true  },
  { label: '알림',    href: '#',            active: false },
]

const NAV_ICONS = [
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill={a?'#4F46E5':'none'} stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  (a: boolean) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#4F46E5':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
]

function Sidebar() {
  const [open, setOpen] = useState(false)
  return (
    <aside className={`hidden md:flex flex-col bg-[#F8FAFF] border-r border-[#ECEAF5] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[240px]' : 'w-[56px]'}`}>
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
        <div className="mb-2 h-px bg-[#ECEAF5]" />
        <Link href="/settings/account" className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {open && <span className="animate-fade-in">설정</span>}
        </Link>
      </div>

    </aside>
  )
}

function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#ECEAF5] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {NAV.slice(0, 4).map((item, i) => (
        <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`}>
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

/* ── 아이콘 ── */
function MaterialIcon({ type }: { type: string }) {
  if (type === 'PDF') return (
    <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/></svg>
    </div>
  )
  if (type === '영상') return (
    <div className="w-10 h-10 rounded-xl bg-[#ECFEFF] flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </div>
  )
  return (
    <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    </div>
  )
}

/* ── 메인 ── */
export default function StatusPage() {
  const { userName, targetScore } = useOnboardingStore()
  const [tab, setTab] = useState<'report' | 'badge' | 'tips' | 'materials'>('report')
  const [openTip, setOpenTip] = useState<number | null>(null)

  const target = targetScore ?? 750

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#ECEAF5] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <p className="text-[#1C1B33] text-[20px] font-bold">현황</p>
            <AccountMenu userName={userName ?? ''} />
          </div>
        </header>
        {/* 데스크탑 헤더 */}
        <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white border-b border-[#ECEAF5] sticky top-0 z-20">
          <p className="text-[#1C1B33] font-bold text-[20px]">현황</p>
          <AccountMenu userName={userName ?? ''} />
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[680px] mx-auto w-full">

            {/* 탭 */}
            <div className="flex border-b border-[#ECEAF5] mb-5 overflow-x-auto">
              {([
                ['report',    '리포트'],
                ['badge',     '배지'],
                ['tips',      '비법노트'],
                ['materials', '학습자료'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-5 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
                    tab === key
                      ? 'text-[#4F46E5] border-[#4F46E5] font-bold'
                      : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── 리포트 ── */}
            {tab === 'report' && (
              <div className="animate-fade-in space-y-4">
                {/* 개요 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {OVERVIEW_STATS.map(s => (
                    <div key={s.label} className="bg-white border border-[#ECEAF5] rounded-2xl p-4 text-center shadow-[0_1px_8px_rgba(79,70,229,0.06)]">
                      <p className="text-[22px] font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* 점수 추이 */}
                <div className="bg-white border border-[#ECEAF5] rounded-2xl p-5 shadow-[0_1px_8px_rgba(79,70,229,0.06)]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[14px] font-bold text-[#1C1B33]">점수 추이</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">최근 6회 과외 기준</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[24px] font-black text-[#4F46E5] leading-none">668</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-1">현재 예상 점수</p>
                    </div>
                  </div>
                  <ScoreChart data={SCORE_HISTORY} target={target} />
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-0.5 bg-[#4F46E5] rounded-full" />
                      <span className="text-[10px] text-[#9CA3AF]">점수 추이</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-0 border-t border-dashed border-[#EF4444]" />
                      <span className="text-[10px] text-[#9CA3AF]">목표 점수</span>
                    </div>
                  </div>
                </div>

                {/* 파트별 정답률 */}
                <div className="bg-white border border-[#ECEAF5] rounded-2xl p-5 shadow-[0_1px_8px_rgba(79,70,229,0.06)]">
                  <p className="text-[14px] font-bold text-[#1C1B33] mb-4">파트별 정답률</p>
                  <div className="space-y-3.5">
                    {PART_STATS.map(p => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="w-7 text-[11px] font-bold text-[#9CA3AF] shrink-0">{p.id}</span>
                        <span className="w-[58px] text-[12px] text-[#374151] shrink-0 truncate">{p.name}</span>
                        <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${p.accuracy}%`,
                            background: p.accuracy >= 80 ? '#10B981' : p.accuracy >= 65 ? '#4F46E5' : '#EF4444',
                          }} />
                        </div>
                        <span className={`w-9 text-right text-[12px] font-bold shrink-0 ${
                          p.accuracy >= 80 ? 'text-[#059669]' : p.accuracy >= 65 ? 'text-[#4F46E5]' : 'text-[#DC2626]'
                        }`}>{p.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-4 pt-3 border-t border-[#F3F4F6]">
                    {[['#10B981', '80% 이상'], ['#4F46E5', '65–79%'], ['#EF4444', '65% 미만']].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-[10px] text-[#9CA3AF]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 배지 ── */}
            {tab === 'badge' && (
              <div className="animate-fade-in space-y-6">
                {/* 획득 배지 */}
                <div>
                  <p className="text-[13px] font-semibold text-[#374151] px-1 mb-3">
                    획득한 배지 <span className="text-[#4F46E5] font-bold ml-1">{BADGES.filter(b => b.earned).length}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {BADGES.filter(b => b.earned).map(b => (
                      <div key={b.id} className="bg-white border border-[#ECEAF5] rounded-2xl p-4 shadow-[0_1px_8px_rgba(79,70,229,0.06)]">
                        <div className="text-[34px] mb-2 leading-none">{b.icon}</div>
                        <p className="text-[13px] font-bold text-[#1C1B33]">{b.name}</p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">{b.desc}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <p className="text-[10px] text-[#10B981] font-semibold">{b.earnedAt} 달성</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 미획득 배지 */}
                <div>
                  <p className="text-[13px] font-semibold text-[#374151] px-1 mb-3">
                    도전 중인 배지 <span className="text-[#9CA3AF] font-bold ml-1">{BADGES.filter(b => !b.earned).length}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {BADGES.filter(b => !b.earned).map(b => (
                      <div key={b.id} className="bg-white border border-[#ECEAF5] rounded-2xl p-4 opacity-55">
                        <div className="text-[34px] mb-2 leading-none grayscale">{b.icon}</div>
                        <p className="text-[13px] font-bold text-[#9CA3AF]">{b.name}</p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">{b.desc}</p>
                        <p className="text-[10px] text-[#B0B7C0] mt-2 leading-snug">{b.condition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 비법노트 ── */}
            {tab === 'tips' && (
              <div className="animate-fade-in space-y-3">
                <p className="text-[13px] text-[#6B7280] leading-relaxed mb-1">
                  AI 튜터가 과외 중 자주 틀린 유형을 분석해 정리한 핵심 노트예요.
                </p>
                {TIPS.map(tip => {
                  const c = TIP_COLORS[tip.color]
                  const isOpen = openTip === tip.id
                  return (
                    <div key={tip.id} className="bg-white border border-[#ECEAF5] rounded-2xl shadow-[0_1px_8px_rgba(79,70,229,0.06)] overflow-hidden">
                      <button
                        onClick={() => setOpenTip(isOpen ? null : tip.id)}
                        className="w-full flex items-center gap-3 px-4 py-4 text-left"
                      >
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0"
                          style={{ background: c.bg, color: c.text }}>
                          {tip.category}
                        </span>
                        <span className="flex-1 text-[13px] font-semibold text-[#1C1B33]">
                          핵심 포인트 {tip.points.length}개
                        </span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
                          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <div className="h-px bg-[#F3F4F6] mb-3" />
                          <div className="space-y-2.5">
                            {tip.points.map((pt, i) => (
                              <div key={i} className="flex gap-2.5 items-start">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                                  style={{ background: c.bg, color: c.text }}>
                                  {i + 1}
                                </span>
                                <p className="text-[13px] text-[#374151] leading-relaxed">{pt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── 학습자료 ── */}
            {tab === 'materials' && (
              <div className="animate-fade-in space-y-6">
                {MATERIALS.map(group => (
                  <div key={group.date}>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider px-1 mb-2.5">
                      {group.label}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((item, i) => (
                        <div key={i} className="bg-white border border-[#ECEAF5] rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-[0_1px_8px_rgba(79,70,229,0.06)]">
                          <MaterialIcon type={item.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#1C1B33] truncate">{item.title}</p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{item.type} · {item.meta}</p>
                          </div>
                          <button className="shrink-0 text-[11px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-3 py-1.5 rounded-lg hover:bg-[#E0E7FF] transition-colors whitespace-nowrap">
                            보기
                          </button>
                        </div>
                      ))}
                    </div>
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
