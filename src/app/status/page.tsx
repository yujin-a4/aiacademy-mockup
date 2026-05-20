'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useEffect } from 'react'
import AccountMenu from '@/components/AccountMenu'
import { INST_NAME, INST_MESSAGES, INST_THUMBS } from '../dashboard/page'

/* ── 데이터 ── */

const PART_STATS = [
  { id: 'P1', name: '사진 묘사',  type: 'LC', accuracy: 91 },
  { id: 'P2', name: '질문 응답',  type: 'LC', accuracy: 83 },
  { id: 'P3', name: '짧은 대화',  type: 'LC', accuracy: 74 },
  { id: 'P5', name: '단문 공란',  type: 'RC', accuracy: 61 },
  { id: 'P6', name: '장문 공란',  type: 'RC', accuracy: 52 },
  { id: 'P7', name: '장문 독해',  type: 'RC', accuracy: 48 },
]

const RADAR_DATA = [
  { label: 'Part 1', value: 91 },
  { label: 'Part 2', value: 83 },
  { label: 'Part 3', value: 74 },
  { label: 'Part 5', value: 61 },
  { label: 'Part 6', value: 52 },
  { label: 'Part 7', value: 48 },
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
  blue:   { bg: '#EFF6FF', text: '#2563EB' },
  purple: { bg: '#EFF6FF', text: '#7C3AED' },
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

const RANKING_DATA = [
  { rank: 1,   name: '토익마스터',   score: 895, streak: 64, target: 900  },
  { rank: 2,   name: '영어의신',     score: 867, streak: 52, target: 900  },
  { rank: 3,   name: '9시간공부',    score: 851, streak: 47, target: 850  },
  { rank: 4,   name: '외국계취준',   score: 830, streak: 38, target: 850  },
  { rank: 5,   name: '대학원준비',   score: 812, streak: 35, target: 850  },
  { rank: 340, name: '취업준비생',   score: 672, streak: 13, target: 750  },
  { rank: 341, name: '직장인파이팅', score: 670, streak: 11, target: 700  },
  { rank: 342, name: '토익초보',     score: 668, streak: 12, target: 750, isMe: true },
  { rank: 343, name: '주부토익러',   score: 665, streak: 9,  target: 700  },
  { rank: 344, name: '편입도전',     score: 661, streak: 8,  target: 750  },
]

const REPORT_SESSIONS = [
  { date: '5월 18일', part: 'Part 5 · 수동태', duration: '50분', score: '+4점' },
  { date: '5월 15일', part: 'Part 5·6 · 시제', duration: '55분', score: '+3점' },
  { date: '5월 12일', part: 'Part 5 · 전치사', duration: '45분', score: '+2점' },
  { date: '5월 8일',  part: 'Part 7 · 독해',  duration: '60분', score: '+7점' },
  { date: '4월 28일', part: 'Part 6 · 어휘',  duration: '50분', score: '+5점' },
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

/* ── 랭킹 행 ── */
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function RankRow({ item }: { item: typeof RANKING_DATA[0] }) {
  const isMe = item.isMe === true
  return (
    <div className={`px-4 py-3 flex items-center gap-3 border-t border-[#F3F4F6] first:border-t-0 ${isMe ? 'bg-[#EFF6FF]' : ''}`}>
      <span className={`w-8 text-center shrink-0 ${item.rank <= 3 ? 'text-[18px]' : 'text-[13px] font-bold text-[#9CA3AF]'}`}>
        {item.rank <= 3 ? MEDAL[item.rank] : item.rank}
      </span>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold ${isMe ? 'bg-[#2563EB] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
        {item.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-[13px] font-semibold truncate ${isMe ? 'text-[#2563EB]' : 'text-[#1C1B33]'}`}>{item.name}</p>
          {isMe && <span className="text-[9px] font-bold bg-[#2563EB] text-white px-1.5 py-0.5 rounded-full shrink-0">나</span>}
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">🔥 {item.streak}일 연속 · 목표 {item.target}점</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-[15px] font-bold ${isMe ? 'text-[#2563EB]' : 'text-[#1C1B33]'}`}>
          {item.score}<span className="text-[10px] font-normal text-[#9CA3AF] ml-0.5">점</span>
        </p>
      </div>
    </div>
  )
}

/* ── SVG 레이더 차트 ── */
function RadarChart() {
  const CX = 100, CY = 112, R = 62, N = RADAR_DATA.length
  const angles = RADAR_DATA.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / N)
  const pt = (angle: number, val: number): [number, number] => [
    CX + R * (val / 100) * Math.cos(angle),
    CY + R * (val / 100) * Math.sin(angle),
  ]
  const axisPt = (angle: number): [number, number] => [
    CX + R * Math.cos(angle),
    CY + R * Math.sin(angle),
  ]
  const dataPoints = RADAR_DATA.map((d, i) => pt(angles[i], d.value))

  // 꼭짓점만 살짝 둥글게 — 직선 유지, corner만 softening
  const smoothPath = (() => {
    const n = dataPoints.length
    const t = 0.18 // 꼭짓점 rounding 비율 (0=직선, 0.5=완전곡선)
    const segs = dataPoints.map((p, i) => {
      const prev = dataPoints[(i - 1 + n) % n]
      const next = dataPoints[(i + 1) % n]
      const before: [number, number] = [p[0] * (1 - t) + prev[0] * t, p[1] * (1 - t) + prev[1] * t]
      const after: [number, number]  = [p[0] * (1 - t) + next[0] * t, p[1] * (1 - t) + next[1] * t]
      return { p, before, after }
    })
    let d = `M${segs[0].before[0].toFixed(1)},${segs[0].before[1].toFixed(1)}`
    for (let i = 0; i < n; i++) {
      const { p, after } = segs[i]
      const nextBefore = segs[(i + 1) % n].before
      d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${after[0].toFixed(1)},${after[1].toFixed(1)}`
      d += ` L${nextBefore[0].toFixed(1)},${nextBefore[1].toFixed(1)}`
    }
    return d + 'Z'
  })()

  const gridPaths = [0.25, 0.5, 0.75, 1.0].map(lv =>
    RADAR_DATA.map((_, i) => {
      const [x, y] = pt(angles[i], lv * 100)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ') + 'Z'
  )
  return (
    <svg viewBox="0 0 200 220" className="w-full max-w-[230px] mx-auto">
      {gridPaths.map((path, gi) => (
        <path key={gi} d={path} fill="none" stroke={gi === 3 ? '#D1D5DB' : '#E5E7EB'} strokeWidth={gi === 3 ? 0.8 : 0.5}/>
      ))}
      {angles.map((angle, i) => {
        const [x, y] = axisPt(angle)
        return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#E5E7EB" strokeWidth="0.5"/>
      })}
      <path d={smoothPath} fill="#2563EB" fillOpacity="0.1" stroke="#2563EB" strokeWidth="1" strokeLinejoin="round"/>
      {dataPoints.map(([x, y], i) => {
        const isStrong = RADAR_DATA[i].value >= 70
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.8" fill={isStrong ? '#10B981' : '#EF4444'} stroke="white" strokeWidth="1.2"/>
      })}
      {RADAR_DATA.map((d, i) => {
        const lx = CX + (R + 20) * Math.cos(angles[i])
        const ly = CY + (R + 20) * Math.sin(angles[i])
        return (
          <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="8.5" fontWeight="600" fill={d.value >= 70 ? '#059669' : '#DC2626'}>
            {d.label}
          </text>
        )
      })}
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
    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    </div>
  )
}

/* ── 메인 ── */
export default function StatusPage() {
  const { userName, selectedInstructor } = useOnboardingStore()
  const [tab, setTab] = useState<'report' | 'badge' | 'tips' | 'materials' | 'ranking'>('report')
  const [openTip, setOpenTip] = useState<number | null>(null)

  const [typedMsg, setTypedMsg] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)

  const currentMessages = INST_MESSAGES[selectedInstructor ?? 'park']?.status ?? []
  const instName = INST_NAME[selectedInstructor ?? 'park'] ?? '박혜원'

  // 30초마다 멘트 교체
  useEffect(() => {
    setMsgIdx(0)
  }, [selectedInstructor])

  useEffect(() => {
    if (currentMessages.length <= 1) return
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % currentMessages.length)
    }, 15000)
    return () => clearInterval(interval)
  }, [currentMessages])

  // 타이핑 효과
  useEffect(() => {
    const msg = currentMessages[msgIdx] ?? ''
    setTypedMsg('')
    setTypingDone(false)
    let intervalId: ReturnType<typeof setInterval>
    const timeoutId = setTimeout(() => {
      let i = 0
      intervalId = setInterval(() => {
        i++
        setTypedMsg(msg.slice(0, i))
        if (i >= msg.length) { 
          setTypingDone(true)
          clearInterval(intervalId) 
        }
      }, 36)
    }, 900)
    return () => { 
      clearTimeout(timeoutId)
      clearInterval(intervalId) 
    }
  }, [selectedInstructor, msgIdx, currentMessages])

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#DBEAFE] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <p className="text-[#1C1B33] text-[20px] font-bold">현황</p>
            <AccountMenu userName={userName ?? ''} />
          </div>
        </header>
        {/* 데스크탑 헤더 */}
        <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white border-b border-[#DBEAFE] sticky top-0 z-20">
          <p className="text-[#1C1B33] font-bold text-[20px]">현황</p>
          <AccountMenu userName={userName ?? ''} />
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 pt-5 pb-28 md:pb-10">
          <div className="max-w-[1200px] mx-auto w-full">

            {/* 탭 */}
            <div className="flex border-b border-[#DBEAFE] mb-5 overflow-x-auto">
              {([
                ['report',    '리포트'],
                ['badge',     '배지'],
                ['tips',      '비법노트'],
                ['materials', '학습자료'],
                ['ranking',   '랭킹'],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-5 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
                    tab === key
                      ? 'text-[#2563EB] border-[#2563EB] font-bold'
                      : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── 리포트 ── */}
            {tab === 'report' && (
              <div className="animate-fade-in space-y-5">

                {/* 예측 점수 배너 */}
                <div className="bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6] rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white/60 text-[11px] tracking-widest uppercase mb-1">AI 예측 점수</p>
                    <p className="text-white/80 text-[13px] font-medium mb-1">{userName ?? '정연'}님의 현재 예측 점수</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-[48px] font-bold leading-none">745</span>
                      <span className="text-white/80 text-[22px] font-semibold">점</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 mb-2">
                      <p className="text-white text-[22px] font-bold">+45점 🚀</p>
                      <p className="text-white/75 text-[12px]">상승 중!</p>
                    </div>
                    <p className="text-white/45 text-[10px]">목표 750점까지 5점 남음</p>
                    <p className="text-white/35 text-[10px] mt-0.5">2026.05.12 ~ 2026.05.18 기준</p>
                  </div>
                </div>

                {/* 학습 상태 요약 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: '총 학습일',    value: '12',  unit: '일',   icon: '📅', color: '#2563EB', bg: '#EFF6FF' },
                    { label: '총 풀이 문제', value: '247', unit: '문제', icon: '✏️', color: '#059669', bg: '#F0FDF4' },
                    { label: 'LC 정답률',    value: '83',  unit: '%',    icon: '🎧', color: '#2563EB', bg: '#EFF6FF' },
                    { label: 'RC 정답률',    value: '54',  unit: '%',    icon: '📖', color: '#D97706', bg: '#FEF9C3' },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 flex items-center gap-3 shadow-[0_1px_6px_rgba(37,99,235,0.06)]">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0" style={{ background: s.bg }}>
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] mb-0.5">{s.label}</p>
                        <p className="text-[20px] font-bold leading-tight" style={{ color: s.color }}>
                          {s.value}<span className="text-[11px] font-normal ml-0.5 text-[#9CA3AF]">{s.unit}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2-col */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

                  {/* LEFT: AI 강사 피드백 + 행동 분석 */}
                  <div className="space-y-4">

                    {/* AI 강사의 한마디 */}
                    <section>
                      <p className="text-[11px] text-[#9CA3AF] mb-2.5 uppercase tracking-widest">AI 강사의 한마디</p>
                      <div className="flex gap-3 items-start">
                        <img
                          src={(selectedInstructor ?? 'park') === 'park' ? '/image_reference/park-report.png' : INST_THUMBS[selectedInstructor ?? 'park']}
                          alt={instName}
                          className="w-[96px] h-[136px] object-cover object-top rounded-2xl shrink-0 shadow-md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 relative shadow-[0_1px_6px_rgba(37,99,235,0.06)]">
                            <div className="absolute -left-[9px] top-5" style={{ width:0, height:0, borderTop:'8px solid transparent', borderBottom:'8px solid transparent', borderRight:'9px solid #DBEAFE' }}/>
                            <div className="absolute -left-[7px] top-5" style={{ width:0, height:0, borderTop:'8px solid transparent', borderBottom:'8px solid transparent', borderRight:'9px solid #fff' }}/>
                            <p className="text-[13px] font-semibold text-[#1C1B33] mb-0.5">{instName} 강사</p>
                            <p className="text-[10px] text-[#9CA3AF] mb-3">AI 코치</p>
                            <div className="bg-[#EFF6FF] rounded-xl px-3.5 py-3">
                              <div className="min-h-[50px]">
                                <p className="text-[12.5px] text-[#374151] leading-relaxed">
                                  {typedMsg}
                                  {!typingDone && (
                                    <span className="inline-block w-[2px] h-3 bg-[#2563EB] animate-pulse ml-0.5 align-middle rounded-full" />
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 음성/필기 행동 분석 */}
                    <section>
                      <p className="text-[11px] text-[#9CA3AF] mb-2.5 uppercase tracking-widest">음성·필기 행동 분석</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.04)]">
                          <p className="text-[10px] text-[#9CA3AF] mb-0.5">필기 습관</p>
                          <p className="text-[10px] text-[#D97706] font-medium mb-2.5">보기 선행 리딩</p>
                          <p className="text-[28px] font-semibold text-[#D97706] leading-none">72<span className="text-[14px]">%</span></p>
                          <div className="flex items-center gap-1 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"/>
                            <p className="text-[10px] text-[#D97706]">주의 필요</p>
                          </div>
                        </div>
                        <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.04)]">
                          <p className="text-[10px] text-[#9CA3AF] mb-0.5">대화 지체 시간</p>
                          <p className="text-[10px] text-[#059669] font-medium mb-2.5">평균 응답 속도</p>
                          <p className="text-[28px] font-semibold text-[#1C1B33] leading-none">4.1<span className="text-[14px] text-[#6B7280] ml-0.5">초</span></p>
                          <div className="flex items-center gap-1 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"/>
                            <p className="text-[10px] text-[#059669]">양호</p>
                          </div>
                        </div>
                      </div>
                    </section>

                  </div>

                  {/* RIGHT: 레이더 차트 + 실전 정답률 */}
                  <div className="space-y-4">

                    {/* 약점 저격 레이더 */}
                    <section>
                      <p className="text-[11px] text-[#9CA3AF] mb-2.5 uppercase tracking-widest">약점 저격 레이더</p>
                      <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.04)]">
                        <RadarChart />
                        <div className="flex items-center justify-center gap-5 mt-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#10B981]"/>
                            <span className="text-[10px] text-[#6B7280]">강점 70%+</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#EF4444]"/>
                            <span className="text-[10px] text-[#6B7280]">약점 70%-</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 실전문제 정답률 */}
                    <section>
                      <p className="text-[11px] text-[#9CA3AF] mb-2.5 uppercase tracking-widest">실전문제 정답률</p>
                      <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.04)]">
                        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-[#F3F4F6]">
                          {[
                            { label: '오늘 문제', value: '35', unit: '문제' },
                            { label: '평균 정답률', value: '78', unit: '%' },
                            { label: '누적 학습', value: '12:40', unit: 'h' },
                          ].map(s => (
                            <div key={s.label} className="text-center">
                              <p className="text-[10px] text-[#9CA3AF] mb-1">{s.label}</p>
                              <p className="text-[20px] font-semibold text-[#1C1B33] leading-none">
                                {s.value}<span className="text-[11px] text-[#2563EB] ml-0.5">{s.unit}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {PART_STATS.filter(p => ['P5','P6','P7'].includes(p.id)).map(p => (
                            <div key={p.id} className="flex items-center gap-3">
                              <span className="text-[11px] text-[#9CA3AF] w-[28px] shrink-0">{p.id}</span>
                              <span className="text-[12px] text-[#374151] w-[56px] shrink-0 truncate">{p.name}</span>
                              <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${p.accuracy}%`,
                                    background: p.accuracy >= 70 ? '#10B981' : p.accuracy >= 55 ? '#F59E0B' : '#EF4444',
                                  }}/>
                              </div>
                              <span className="text-[12px] w-8 text-right shrink-0 font-medium"
                                style={{ color: p.accuracy >= 70 ? '#10B981' : p.accuracy >= 55 ? '#F59E0B' : '#EF4444' }}>
                                {p.accuracy}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

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
                    획득한 배지 <span className="text-[#2563EB] font-bold ml-1">{BADGES.filter(b => b.earned).length}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {BADGES.filter(b => b.earned).map(b => (
                      <div key={b.id} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_8px_rgba(37,99,235,0.06)]">
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
                      <div key={b.id} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 opacity-55">
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
                    <div key={tip.id} className="bg-white border border-[#DBEAFE] rounded-2xl shadow-[0_1px_8px_rgba(37,99,235,0.06)] overflow-hidden">
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
                        <div key={i} className="bg-white border border-[#DBEAFE] rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-[0_1px_8px_rgba(37,99,235,0.06)]">
                          <MaterialIcon type={item.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#1C1B33] truncate">{item.title}</p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{item.type} · {item.meta}</p>
                          </div>
                          <button className="shrink-0 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1.5 rounded-lg hover:bg-[#E0E7FF] transition-colors whitespace-nowrap">
                            보기
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── 랭킹 ── */}
            {tab === 'ranking' && (
              <div className="animate-fade-in space-y-4">

                {/* 소속감 배너 */}
                <div className="bg-gradient-to-br from-[#1C1B33] to-[#1E3A8A] rounded-2xl px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"/>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"/>
                    </span>
                    <span className="text-white/60 text-[11px] tracking-wider uppercase">LIVE · 실시간</span>
                  </div>
                  <p className="text-white text-[26px] font-bold leading-snug">
                    지금 <span className="text-[#93C5FD]">2,847명</span>이<br/>
                    함께 달리고 있어요 🏃
                  </p>
                  <p className="text-white/50 text-[12px] mt-2 leading-relaxed">
                    혼자 패드 붙잡고 공부하는 게 아니에요.<br/>
                    지금 이 순간에도 수천 명이 토익을 향해 달리고 있어요.
                  </p>
                </div>

                {/* 나의 위치 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.04)]">
                    <p className="text-[11px] text-[#9CA3AF] mb-2">전체 순위</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-[30px] font-bold text-[#1C1B33]">342</span>
                      <span className="text-[13px] text-[#9CA3AF]">위</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex-1 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '88%' }}/>
                      </div>
                      <span className="text-[11px] text-[#2563EB] font-semibold shrink-0">상위 12%</span>
                    </div>
                    <p className="text-[10px] text-[#9CA3AF]">전체 2,847명 중</p>
                  </div>
                  <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-4">
                    <p className="text-[11px] text-[#7C6FBF] mb-2">750점 목표 그룹</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-[30px] font-bold text-[#2563EB]">38</span>
                      <span className="text-[13px] text-[#7C6FBF]">위</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex-1 h-1 bg-[#DBEAFE] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '92%' }}/>
                      </div>
                      <span className="text-[11px] text-[#2563EB] font-semibold shrink-0">상위 8%</span>
                    </div>
                    <p className="text-[10px] text-[#7C6FBF]">456명 중 · 같은 목표</p>
                  </div>
                </div>

                {/* 리더보드 */}
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] text-[#9CA3AF] uppercase tracking-widest">전체 랭킹</p>
                    <p className="text-[11px] text-[#9CA3AF]">AI 예측 점수 기준</p>
                  </div>
                  <div className="bg-white border border-[#DBEAFE] rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(37,99,235,0.04)]">

                    {/* Top 5 */}
                    {RANKING_DATA.filter(r => r.rank <= 5).map(r => (
                      <RankRow key={r.rank} item={r} />
                    ))}

                    {/* 갭 */}
                    <div className="px-4 py-3 border-t border-[#F3F4F6] flex items-center justify-between bg-[#FAFAFA]">
                      <div className="flex flex-col gap-1">
                        {[70, 50, 35].map((w, i) => (
                          <div key={i} className="h-[3px] rounded-full bg-[#DBEAFE]" style={{ width: `${w}px` }}/>
                        ))}
                      </div>
                      <span className="text-[11px] text-[#9CA3AF]">336명 더 있음</span>
                    </div>

                    {/* 내 주변 */}
                    {RANKING_DATA.filter(r => r.rank >= 340).map(r => (
                      <RankRow key={r.rank} item={r} />
                    ))}

                  </div>
                </section>

              </div>
            )}

          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
