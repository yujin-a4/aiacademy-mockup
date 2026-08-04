'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useEffect } from 'react'
import AccountMenu from '@/components/AccountMenu'
import { INST_NAME, INST_THUMBS } from '@/data/instructorData'
import { IncomingCallScreen, CallLogSheet } from '@/components/CallScreen'
import type { CallEntry } from '@/components/CallScreen'
import { loadAnswerStats, type AnswerStats } from '@/lib/profile'
import { resolveWeeklyPrescription } from '@/lib/weeklyReport'

/* ── 데이터 ── */

const PART_STATS = [
  { id: 'P1', name: '사진 묘사',  type: 'LC', accuracy: 91 },
  { id: 'P2', name: '질문 응답',  type: 'LC', accuracy: 83 },
  { id: 'P3', name: '짧은 대화',  type: 'LC', accuracy: 74 },
  { id: 'P4', name: '짧은 담화',  type: 'LC', accuracy: 68 },
  { id: 'P5', name: '단문 공란',  type: 'RC', accuracy: 61 },
  { id: 'P6', name: '장문 공란',  type: 'RC', accuracy: 52 },
  { id: 'P7', name: '장문 독해',  type: 'RC', accuracy: 48 },
]


/** 강사 처방전에 한 번에 띄우는 약점 파트 수 */
const WEAK_LIMIT = 3

const PART_WEAK_REASONS: Record<string, string> = {
  P3: '짧은 대화 유형에서 오답이 집중되고 있어요',
  P4: '안내·광고 등 담화 유형에서 세부 정보를 놓치고 있어요',
  P5: '품사 구분 유형에서 오답이 반복되고 있어요',
  P6: '접속사·연결어 유형 정답률이 40% 미만이에요',
  P7: '지문당 풀이 시간이 기준을 초과하고 있어요',
}

/* 전주 대비 ±%p는 뺐다. 축 값은 누적 정답률인데 델타만 주간(최근 7일 vs 그 전 7일)이라
   한 축에 기준이 다른 두 숫자가 붙었고, 온보딩 baseline이 난수로 심겨 그 델타가
   설계값이 아니라 시드의 우연이었다. */
type RadarPoint = { label: string; value: number }

const RADAR_DATA: RadarPoint[] = [
  { label: 'Part 1', value: 91 },
  { label: 'Part 2', value: 83 },
  { label: 'Part 3', value: 74 },
  { label: 'Part 4', value: 68 },
  { label: 'Part 5', value: 61 },
  { label: 'Part 6', value: 52 },
  { label: 'Part 7', value: 48 },
]

const BADGES = [
  { id: 1, icon: '', name: '첫 발걸음',      desc: '첫 번째 학습 완료',             earned: true,  earnedAt: '3월 1일' },
  { id: 2, icon: '', name: '7일 연속',        desc: '7일 연속 학습 달성',           earned: true,  earnedAt: '3월 8일' },
  { id: 3, icon: '️', name: '받아쓰기 입문',   desc: '받아쓰기 10회 완료',           earned: true,  earnedAt: '4월 2일' },
  { id: 4, icon: '', name: 'Part 5 도전자',   desc: 'Part 5 연습 20문제 완료',      earned: true,  earnedAt: '5월 10일' },
  { id: 5, icon: '', name: '30일 연속',       desc: '30일 연속 학습 달성',           earned: false, condition: '현재 12일 · 18일 남음' },
  { id: 6, icon: '', name: '700점 돌파',      desc: '모의 점수 700점 이상 달성',    earned: false, condition: '현재 예상 668점' },
  { id: 7, icon: '', name: '파트 마스터',     desc: '모든 파트 정답률 80% 이상',    earned: false, condition: 'P5·P6·P7 개선 필요' },
  { id: 8, icon: '', name: '보카런 완주',     desc: '1,000개 단어 학습 완료',       earned: false, condition: '현재 312 / 1,000개' },
]

const BADGE_ICONS: Record<number, { node: JSX.Element; color: string; bg: string }> = {
  1: { // 첫 발걸음 — 깃발
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
    color: '#2563EB', bg: '#EFF6FF',
  },
  2: { // 7일 연속 — 불꽃
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>,
    color: '#DC2626', bg: '#FEF2F2',
  },
  3: { // 받아쓰기 입문 — 헤드폰
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>,
    color: '#0891B2', bg: '#ECFEFF',
  },
  4: { // Part 5 도전자 — 연필
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    color: '#059669', bg: '#F0FDF4',
  },
  5: { // 30일 연속 — 캘린더
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    color: '#D97706', bg: '#FEF9C3',
  },
  6: { // 700점 돌파 — 트로피
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>,
    color: '#D97706', bg: '#FFFBEB',
  },
  7: { // 파트 마스터 — 왕관
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>,
    color: '#7C3AED', bg: '#F5F3FF',
  },
  8: { // 보카런 완주 — 책
    node: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    color: '#2563EB', bg: '#EFF6FF',
  },
}

type RankEntry = {
  rank: number; name: string; score: number; streak: number; target: number; isMe?: boolean
}
type LeagueInfo = {
  totalCount: number; myRank: number; myPercent: number
  globalRank: number; globalPercent: number; globalTotal: number
  gapCount: number
  topUsers: RankEntry[]; surrounding: RankEntry[]
}

const LEAGUE_DATA: Record<number, LeagueInfo> = {
  700: {
    totalCount: 312, myRank: 45, myPercent: 14,
    globalRank: 1205, globalPercent: 42, globalTotal: 2847, gapCount: 39,
    topUsers: [
      { rank: 1, name: '빠른합격',   score: 698, streak: 31, target: 700 },
      { rank: 2, name: '직장인토익', score: 692, streak: 22, target: 700 },
      { rank: 3, name: '독학마스터', score: 688, streak: 18, target: 700 },
    ],
    surrounding: [
      { rank: 43, name: '퇴근후공부',   score: 624, streak: 9,  target: 700 },
      { rank: 44, name: '주말전사',     score: 621, streak: 7,  target: 700 },
      { rank: 45, name: '토익초보',     score: 618, streak: 12, target: 700, isMe: true },
      { rank: 46, name: '꾸준함이힘',   score: 615, streak: 8,  target: 700 },
      { rank: 47, name: '내일은700',    score: 611, streak: 6,  target: 700 },
    ],
  },
  750: {
    totalCount: 456, myRank: 38, myPercent: 8,
    globalRank: 342, globalPercent: 12, globalTotal: 2847, gapCount: 32,
    topUsers: [
      { rank: 1, name: '외국계취준', score: 748, streak: 45, target: 750 },
      { rank: 2, name: '대학원준비', score: 741, streak: 38, target: 750 },
      { rank: 3, name: '이직준비중', score: 735, streak: 29, target: 750 },
    ],
    surrounding: [
      { rank: 36, name: '취업준비생',   score: 672, streak: 13, target: 750 },
      { rank: 37, name: '취준파이팅',   score: 670, streak: 11, target: 750 },
      { rank: 38, name: '토익초보',     score: 668, streak: 12, target: 750, isMe: true },
      { rank: 39, name: '주부토익러',   score: 665, streak: 9,  target: 750 },
      { rank: 40, name: '편입도전',     score: 661, streak: 8,  target: 750 },
    ],
  },
  800: {
    totalCount: 524, myRank: 112, myPercent: 21,
    globalRank: 589, globalPercent: 21, globalTotal: 2847, gapCount: 106,
    topUsers: [
      { rank: 1, name: '9시간공부',   score: 798, streak: 51, target: 800 },
      { rank: 2, name: '스터디고수', score: 792, streak: 43, target: 800 },
      { rank: 3, name: '만점향해',   score: 787, streak: 37, target: 800 },
    ],
    surrounding: [
      { rank: 110, name: '퇴근후집중', score: 724, streak: 15, target: 800 },
      { rank: 111, name: '오전공부',   score: 721, streak: 14, target: 800 },
      { rank: 112, name: '토익초보',   score: 718, streak: 12, target: 800, isMe: true },
      { rank: 113, name: '독학중',     score: 715, streak: 10, target: 800 },
      { rank: 114, name: '목표800',    score: 712, streak: 9,  target: 800 },
    ],
  },
  850: {
    totalCount: 389, myRank: 67, myPercent: 17,
    globalRank: 198, globalPercent: 7, globalTotal: 2847, gapCount: 61,
    topUsers: [
      { rank: 1, name: '토익마스터',     score: 895, streak: 64, target: 850 },
      { rank: 2, name: '영어의신',       score: 867, streak: 52, target: 850 },
      { rank: 3, name: '목표달성직전',   score: 851, streak: 41, target: 850 },
    ],
    surrounding: [
      { rank: 65, name: '고득점도전', score: 772, streak: 19, target: 850 },
      { rank: 66, name: '850목표',   score: 769, streak: 16, target: 850 },
      { rank: 67, name: '토익초보',  score: 765, streak: 12, target: 850, isMe: true },
      { rank: 68, name: '상위권진입', score: 762, streak: 11, target: 850 },
      { rank: 69, name: '착실한공부', score: 758, streak: 9,  target: 850 },
    ],
  },
  900: {
    totalCount: 178, myRank: 29, myPercent: 16,
    globalRank: 89, globalPercent: 3, globalTotal: 2847, gapCount: 23,
    topUsers: [
      { rank: 1, name: '만점사냥꾼', score: 985, streak: 89, target: 900 },
      { rank: 2, name: '영어원어민', score: 975, streak: 76, target: 900 },
      { rank: 3, name: '토익신',     score: 960, streak: 68, target: 900 },
    ],
    surrounding: [
      { rank: 27, name: '고수준비중',   score: 845, streak: 28, target: 900 },
      { rank: 28, name: '900클럽',     score: 842, streak: 24, target: 900 },
      { rank: 29, name: '토익초보',    score: 838, streak: 12, target: 900, isMe: true },
      { rank: 30, name: '영어덕후',    score: 835, streak: 19, target: 900 },
      { rank: 31, name: '해외취업준비', score: 831, streak: 15, target: 900 },
    ],
  },
}

const REPORT_SESSIONS = [
  { date: '5월 18일', part: 'Part 5 · 수동태', duration: '50분', score: '+4점' },
  { date: '5월 15일', part: 'Part 5·6 · 시제', duration: '55분', score: '+3점' },
  { date: '5월 12일', part: 'Part 5 · 전치사', duration: '45분', score: '+2점' },
  { date: '5월 8일',  part: 'Part 7 · 독해',  duration: '60분', score: '+7점' },
  { date: '4월 28일', part: 'Part 6 · 어휘',  duration: '50분', score: '+5점' },
]

/* ── 랭킹 행 ── */
const MEDAL: Record<number, string> = { 1: '', 2: '', 3: '' }

function RankRow({ item }: { item: RankEntry }) {
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
        <p className="text-[10px] text-[#9CA3AF] mt-0.5"> {item.streak}일 연속 · 목표 {item.target}점</p>
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
function RadarChart({ data }: { data: RadarPoint[] }) {
  const CX = 100, CY = 112, R = 62, N = data.length
  const angles = data.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / N)
  const pt = (angle: number, val: number): [number, number] => [
    CX + R * (val / 100) * Math.cos(angle),
    CY + R * (val / 100) * Math.sin(angle),
  ]
  const axisPt = (angle: number): [number, number] => [
    CX + R * Math.cos(angle),
    CY + R * Math.sin(angle),
  ]
  const dataPoints = data.map((d, i) => pt(angles[i], d.value))

  const straightPath = dataPoints
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ') + 'Z'

  const gridPaths = [0.25, 0.5, 0.75, 1.0].map(lv =>
    data.map((_, i) => {
      const [x, y] = pt(angles[i], lv * 100)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ') + 'Z'
  )

  return (
    <svg viewBox="0 0 200 224" className="w-full max-w-[230px] mx-auto">
      {gridPaths.map((path, gi) => (
        <path key={gi} d={path} fill="none" stroke={gi === 3 ? '#D1D5DB' : '#E5E7EB'} strokeWidth={gi === 3 ? 0.8 : 0.5}/>
      ))}
      {angles.map((angle, i) => {
        const [x, y] = axisPt(angle)
        return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#E5E7EB" strokeWidth="0.5"/>
      })}
      <path d={straightPath} fill="#2563EB" fillOpacity="0.1" stroke="#2563EB" strokeWidth="1" strokeLinejoin="round"/>
      {dataPoints.map(([x, y], i) => {
        const isStrong = data[i].value >= 70
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2" fill={isStrong ? '#10B981' : '#EF4444'} stroke="white" strokeWidth="0.8"/>
      })}
      {data.map((d, i) => {
        const lx = CX + (R + 22) * Math.cos(angles[i])
        const ly = CY + (R + 22) * Math.sin(angles[i])
        const labelColor = d.value >= 70 ? '#059669' : '#DC2626'
        return (
          <g key={i}>
            <text x={lx.toFixed(1)} y={(ly - 5).toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fontWeight="600" fill={labelColor}>
              {d.label}
            </text>
            <text x={lx.toFixed(1)} y={(ly + 5).toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fontWeight="700" fill={labelColor}>
              {d.value}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── 네비게이션 ── */
const NAV = [
  { label: '홈',      href: '/dashboard',  active: false },
  { label: '내 학습', href: '/lessons',      active: false },
  { label: '현황',    href: '/status',      active: true  },
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
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#DBEAFE] hover:bg-[#DBEAFE] flex items-center justify-center transition-all shrink-0">
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
      {NAV.slice(0, 4).map((item, i) => {
        const cls = `flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`
        return (
          <Link key={item.label} href={item.href} className={cls}>
            {NAV_ICONS[i](item.active)}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
      <Link href="/settings/account" className="flex flex-col items-center gap-1 min-w-[52px] py-1 text-[#9CA3AF]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span className="text-[10px] font-medium">설정</span>
      </Link>
    </nav>
  )
}

/* ── 메인 ── */

export default function StatusPage() {
  const { userName, selectedInstructor, targetScore, examDate } = useOnboardingStore()
  const myTarget = targetScore ?? 750
  const league = LEAGUE_DATA[myTarget] ?? LEAGUE_DATA[750]
  const [tab, setTab] = useState<'report' | 'badge' | 'ranking'>('report')
  const [answerStats, setAnswerStats] = useState<AnswerStats | null>(null)
  const [statsReady, setStatsReady] = useState(false)
  /** 이번 주 처방 대상 파트 id. null = 아직 확정 전 */
  const [rxPartIds, setRxPartIds] = useState<string[] | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAnswerStats().catch(() => null).then(stats => {
      if (!cancelled) { setAnswerStats(stats); setStatsReady(true) }
    })
    return () => { cancelled = true }
  }, [])

  // 실측 데이터만 사용 (하드코딩 폴백 없음). 데이터 없으면 빈 상태로 처리.
  const hasData = !!answerStats && answerStats.totalAnswered > 0
  const livePartStats = PART_STATS.map(p => {
    const num = parseInt(p.id.replace('P', ''))
    const stat = answerStats?.partStats.find(s => s.part === num)
    return { ...p, accuracy: stat?.accuracy ?? 0, hasStat: !!stat }
  })
  const liveRadarData = RADAR_DATA.map(d => {
    const partNum = parseInt(d.label.replace('Part ', ''))
    const stat = answerStats?.partStats.find(s => s.part === partNum)
    return { ...d, value: stat?.accuracy ?? 0 }
  })
  const totalAnswered = answerStats?.totalAnswered ?? 0
  const lcAccuracy = answerStats?.lcAccuracy ?? null
  const rcAccuracy = answerStats?.rcAccuracy ?? null
  const studyDays = answerStats?.studyDays ?? 0
  const answeredThisWeek = answerStats?.answeredThisWeek ?? 0
  const overallAccuracy = (() => {
    if (!answerStats) return null
    const t = answerStats.partStats.reduce((s, p) => s + p.total, 0)
    const c = answerStats.partStats.reduce((s, p) => s + p.correct, 0)
    return t > 0 ? Math.round((c / t) * 100) : null
  })()

  // 시험 D-day 계산
  const ddayLabel = (() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : null
  })()

  /* 강사 처방전 — **어느 파트를 처방했는지**만 주 단위로 고정한다(정답률은 실시간).
     주 중에 처방이 갈아치워지면, 시킨 걸 해낸 학습자에게 칭찬 대신 새 숙제가 나간다. */
  useEffect(() => {
    if (!statsReady) return
    let cancelled = false
    ;(async () => {
      let userId = 'guest'
      try {
        const { createClient } = await import('@/lib/supabase')
        const { data: { user } } = await createClient().auth.getUser()
        if (user?.id) userId = user.id
      } catch { /* 비로그인/오류 시 guest 키 사용 */ }

      const ids = resolveWeeklyPrescription(userId, () =>
        livePartStats
          .filter(p => p.hasStat && p.accuracy < 70)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, WEAK_LIMIT)
          .map(p => p.id),
      )
      if (!cancelled) setRxPartIds(ids)
    })()
    return () => { cancelled = true }
  }, [statsReady, answerStats])

  const instName = INST_NAME[selectedInstructor ?? 'park_hyewon'] ?? '박혜원'
  const instThumb = (selectedInstructor ?? 'park_hyewon') === 'park_hyewon'
    ? '/image_reference/park-report.png'
    : INST_THUMBS[selectedInstructor ?? 'park_hyewon']

  const [callState, setCallState] = useState<'idle' | 'ringing' | 'log'>('idle')
  const [callLog, setCallLog] = useState<CallEntry[]>([])
  const handlePhoneClick = () => setCallState('ringing')
  const handleAnswer = () => setCallState('idle')
  const handleReject = () => {
    setCallLog(prev => [...prev, {
      id: Date.now().toString(),
      instructorKey: selectedInstructor ?? 'park_hyewon',
      instructorName: instName,
      instructorThumb: instThumb,
      time: new Date(),
      status: 'rejected' as const,
    }])
    setCallState('log')
  }
  const handleCloseLog = () => setCallState('idle')

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#DBEAFE] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <p className="text-[#1C1B33] text-[20px] font-bold">현황</p>
            <div className="flex items-center gap-2">
              <button onClick={handlePhoneClick} className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center hover:bg-[#EFF6FF] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {callLog.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
              </button>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </div>
        </header>
        {/* 데스크탑 헤더 */}
        <header className="hidden md:flex px-8 py-4 items-center justify-between bg-white border-b border-[#DBEAFE] sticky top-0 z-20">
          <p className="text-[#1C1B33] font-bold text-[20px]">현황</p>
          <div className="flex items-center gap-2">
            <button onClick={handlePhoneClick} className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center hover:bg-[#EFF6FF] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {callLog.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
            </button>
            <AccountMenu userName={userName ?? ''} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 pt-5 pb-28 md:pb-10">
          <div className="max-w-[1200px] mx-auto w-full">

              {/* 탭 */}
            <div className="flex border-b border-[#DBEAFE] mb-5 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {([
                ['report',    '리포트'],
                ['badge',     '배지'],
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

                {/* ①② 학습 상태 요약 — 전부 실측(learner_answer_log). 데이터 없으면 '-' */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_2fr] gap-3 items-stretch">

                  {/* ① 전체 정답률 — 총 풀이 문제 수 대비 정답 수 */}
                  <div className="bg-white border border-[#DBEAFE] rounded-2xl px-5 py-4 shadow-[0_1px_6px_rgba(37,99,235,0.06)] flex flex-col justify-center">
                    <p className="text-[#9CA3AF] text-[10px] tracking-widest uppercase mb-1">전체 정답률</p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[#1C1B33] text-[40px] font-bold leading-none">{overallAccuracy != null ? overallAccuracy : '-'}</span>
                      <span className="text-[#6B7280] text-[14px] font-semibold">%</span>
                    </div>
                    <p className="text-[#9CA3AF] text-[10px] mt-1">
                      목표 {myTarget}점{ddayLabel ? ` · 시험 ${ddayLabel}` : ''} · 누적 {totalAnswered}문제 기준
                    </p>
                  </div>

                  {/* ② 보조 지표 4칸 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '주간 풀이',  value: String(answeredThisWeek), unit: '문제', color: '#2563EB' },
                      { label: '총 학습일',  value: String(studyDays),        unit: '일',   color: '#059669' },
                      { label: 'LC 정답률',  value: lcAccuracy != null ? String(lcAccuracy) : '-', unit: '%', color: '#2563EB' },
                      { label: 'RC 정답률',  value: rcAccuracy != null ? String(rcAccuracy) : '-', unit: '%', color: '#D97706' },
                    ].map(s => (
                      <div key={s.label} className="bg-white border border-[#DBEAFE] rounded-xl px-3 py-2.5 shadow-[0_1px_6px_rgba(37,99,235,0.06)] h-full flex flex-col justify-center">
                        <p className="text-[10px] text-[#9CA3AF] mb-0.5 whitespace-nowrap">{s.label}</p>
                        <p className="text-[18px] font-bold leading-tight" style={{ color: s.color }}>
                          {s.value}<span className="text-[10px] font-normal ml-0.5 text-[#9CA3AF]">{s.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                </div>

                {/* 레이더 + 처방전 2열.
                    items-stretch + 카드 flex-1 로 두 열 높이를 맞춘다 — 처방 항목 수에 따라
                    오른쪽이 길어지면 왼쪽 레이더 카드가 짧게 남던 것을 없앤다. */}
                {!hasData ? (
                  <div className="bg-white border border-[#DBEAFE] rounded-2xl p-8 text-center shadow-[0_1px_6px_rgba(37,99,235,0.04)]">
                    <p className="text-[13px] font-bold text-[#374151]">아직 학습 데이터가 없어요</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-1">문제를 풀면 파트별 정답률과 약점 분석이 여기에 쌓여요.</p>
                  </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

                {/* 약점 저격 레이더 */}
                <section className="flex flex-col h-full">
                  <p className="text-[11px] text-[#9CA3AF] mb-2.5 uppercase tracking-widest">약점 저격 레이더</p>
                  <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.04)] flex-1 flex flex-col justify-center">
                    <RadarChart data={liveRadarData} />
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
                    <p className="text-center text-[10px] text-[#C4C9D4] mt-2">전체 기간 누적 풀이 기준 파트별 정답률이에요</p>
                  </div>
                </section>

                {/* 강사 처방전 */}
                <section className="flex flex-col h-full">
                    <p className="text-[11px] text-[#9CA3AF] mb-2.5 uppercase tracking-widest">강사 처방전</p>
                    {(() => {
                      const instKey = selectedInstructor ?? 'park_hyewon'
                      /* 처방 대상은 이번 주 시작 시점에 확정된 목록(rxPartIds)을 따른다.
                         정답률·진행바만 실시간 값이라, 처방받은 파트가 좋아지는 게 주 중에 보인다. */
                      const weakParts = (rxPartIds ?? [])
                        .map(id => livePartStats.find(p => p.id === id))
                        .filter((p): p is typeof livePartStats[number] => !!p)
                      return (
                        <div className="bg-white border border-[#DBEAFE] rounded-2xl shadow-[0_1px_6px_rgba(37,99,235,0.04)] overflow-hidden flex-1 flex flex-col">
                          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F3F4F6]">
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-[#DBEAFE]">
                              <img src={INST_THUMBS[instKey]} alt={INST_NAME[instKey]} className="w-full h-full object-cover object-top" />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[#1C1B33]">{INST_NAME[instKey]} 선생님의 처방전</p>
                              <p className="text-[11px] text-[#9CA3AF]">레이더 분석 기반 약점 파트 처방</p>
                            </div>
                          </div>
                          <div className="divide-y divide-[#F3F4F6]">
                            {rxPartIds !== null && weakParts.length === 0 && (
                              <div className="px-4 py-6 text-center">
                                <p className="text-[12px] font-semibold text-[#374151]">이번 주 약점 파트가 없어요 👏</p>
                                <p className="text-[11px] text-[#9CA3AF] mt-1">모든 파트 정답률이 70% 이상이에요.</p>
                              </div>
                            )}
                            {weakParts.map(p => {
                              /* 70%를 넘기면 초록 — 이번 주 처방을 따라가 회복했다는 신호다.
                                 처방 목록은 주 단위로 고정이라, 회복해도 항목이 사라지지 않고 색만 바뀐다. */
                              const tone = p.accuracy >= 70
                                ? { badgeBg: '#F0FDF4', badgeFg: '#059669', bar: '#10B981' }
                                : p.accuracy >= 55
                                ? { badgeBg: '#FEF9C3', badgeFg: '#B45309', bar: '#F59E0B' }
                                : { badgeBg: '#FEF2F2', badgeFg: '#DC2626', bar: '#EF4444' }
                              return (
                              <div key={p.id} className="px-4 py-3.5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                                    style={{ background: tone.badgeBg, color: tone.badgeFg }}>
                                    {p.id}
                                  </span>
                                  <span className="text-[12px] text-[#374151] font-medium shrink-0">{p.name}</span>
                                  <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${p.accuracy}%`, background: tone.bar }} />
                                  </div>
                                  <span className="text-[12px] font-bold shrink-0" style={{ color: tone.bar }}>{p.accuracy}%</span>
                                  {p.accuracy >= 70 && (
                                    <span className="shrink-0 text-[10px] font-bold text-[#059669] bg-[#F0FDF4] px-1.5 py-0.5 rounded">
                                      회복
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#6B7280] flex items-start gap-1">
                                  <span className="shrink-0">📍</span>
                                  {PART_WEAK_REASONS[p.id] ?? '해당 파트에서 오답이 집중되고 있어요'}
                                </p>
                                <div className="flex justify-end">
                                  <Link href="/my-learning"
                                    className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1.5 rounded-lg hover:bg-[#DBEAFE] transition-colors whitespace-nowrap">
                                    연습하기
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                                  </Link>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </section>

                </div>
                )}{/* 레이더 + 처방전 그리드 끝 */}

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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {BADGES.filter(b => b.earned).map(b => {
                      const bi = BADGE_ICONS[b.id]
                      return (
                      <div key={b.id} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_8px_rgba(37,99,235,0.06)] flex flex-col">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shrink-0" style={{ background: bi?.bg ?? '#EFF6FF', color: bi?.color ?? '#2563EB' }}>
                          {bi?.node}
                        </div>
                        <p className="text-[13px] font-bold text-[#1C1B33]">{b.name}</p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug flex-1">{b.desc}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <p className="text-[10px] text-[#10B981] font-semibold">{b.earnedAt} 달성</p>
                        </div>
                      </div>
                    )})}

                  </div>
                </div>

                {/* 미획득 배지 */}
                <div>
                  <p className="text-[13px] font-semibold text-[#374151] px-1 mb-3">
                    도전 중인 배지 <span className="text-[#9CA3AF] font-bold ml-1">{BADGES.filter(b => !b.earned).length}</span>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {BADGES.filter(b => !b.earned).map(b => {
                      const bi = BADGE_ICONS[b.id]
                      return (
                      <div key={b.id} className="bg-white border border-[#DBEAFE] rounded-2xl p-4 opacity-55 flex flex-col">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shrink-0 grayscale" style={{ background: bi?.bg ?? '#F3F4F6', color: bi?.color ?? '#9CA3AF' }}>
                          {bi?.node}
                        </div>
                        <p className="text-[13px] font-bold text-[#9CA3AF]">{b.name}</p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug flex-1">{b.desc}</p>
                        <p className="text-[10px] text-[#B0B7C0] mt-2 leading-snug">{b.condition}</p>
                      </div>
                    )})}
                  </div>
                </div>
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
                    지금 <span className="text-[#93C5FD]">{league.globalTotal.toLocaleString()}명</span>이<br/>
                    함께 달리고 있어요
                  </p>
                  <p className="text-white/50 text-[12px] mt-2 leading-relaxed">
                    혼자 패드 붙잡고 공부하는 게 아니에요.<br/>
                    지금 이 순간에도 수천 명이 토익을 향해 달리고 있어요.
                  </p>
                </div>

                {/* 나의 위치 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 shadow-[0_1px_6px_rgba(37,99,235,0.04)]">
                    <p className="text-[11px] text-[#9CA3AF] mb-2">전체 순위</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-[30px] font-bold text-[#1C1B33]">{league.globalRank}</span>
                      <span className="text-[13px] text-[#9CA3AF]">위</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex-1 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${100 - league.globalPercent}%` }}/>
                      </div>
                      <span className="text-[11px] text-[#2563EB] font-semibold shrink-0">상위 {league.globalPercent}%</span>
                    </div>
                    <p className="text-[10px] text-[#9CA3AF]">전체 {league.globalTotal.toLocaleString()}명 중</p>
                  </div>
                  <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-4">
                    <p className="text-[11px] text-[#7C6FBF] mb-2">{myTarget}점 목표 그룹</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-[30px] font-bold text-[#2563EB]">{league.myRank}</span>
                      <span className="text-[13px] text-[#7C6FBF]">위</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex-1 h-1 bg-[#DBEAFE] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${100 - league.myPercent}%` }}/>
                      </div>
                      <span className="text-[11px] text-[#2563EB] font-semibold shrink-0">상위 {league.myPercent}%</span>
                    </div>
                    <p className="text-[10px] text-[#7C6FBF]">{league.totalCount}명 중 · 같은 목표</p>
                  </div>
                </div>

                {/* 리더보드 */}
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] text-[#9CA3AF] uppercase tracking-widest">{myTarget}점 목표 리그</p>
                    <p className="text-[11px] text-[#9CA3AF]">AI 예측 점수 기준</p>
                  </div>
                  <div className="bg-white border border-[#DBEAFE] rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(37,99,235,0.04)]">

                    {/* Top 3 */}
                    {league.topUsers.map(r => (
                      <RankRow key={r.rank} item={r} />
                    ))}

                    {/* 갭 */}
                    <div className="px-4 py-3 border-t border-[#F3F4F6] flex items-center justify-between bg-[#FAFAFA]">
                      <div className="flex flex-col gap-1">
                        {[70, 50, 35].map((w, i) => (
                          <div key={i} className="h-[3px] rounded-full bg-[#DBEAFE]" style={{ width: `${w}px` }}/>
                        ))}
                      </div>
                      <span className="text-[11px] text-[#9CA3AF]">{league.gapCount}명 더 있음</span>
                    </div>

                    {/* 내 주변 */}
                    {league.surrounding.map(r => (
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

      {callState === 'ringing' && (
        <IncomingCallScreen instructorName={instName} instructorThumb={instThumb} onAnswer={handleAnswer} onReject={handleReject} />
      )}
      {callState === 'log' && (
        <CallLogSheet entries={callLog} onClose={handleCloseLog} />
      )}
    </div>
  )
}
