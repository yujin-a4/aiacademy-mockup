'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo, useEffect } from 'react'
import AccountMenu from '@/components/AccountMenu'
import { IncomingCallScreen, ActiveCallScreen, CallLogSheet } from '@/components/CallScreen'
import type { CallEntry } from '@/components/CallScreen'
import { INST_NAME, INST_THUMBS, INST_MESSAGES, INST_PERSONA } from '@/data/instructorData'
import CallSurvey from '@/components/survey/CallSurvey'
import { useStreakDay } from '@/hooks/useStreakDay'
import { DEMO_DDAY } from '@/data/curriculumSchedule'
import HomeB, { HomeVariantToggle } from './homeB'

type CallState = 'idle' | 'ringing' | 'active' | 'log'

const NAV = [
  {
    label: '홈', active: true, href: '/dashboard',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={a ? '#2563EB' : 'none'} stroke={a ? '#2563EB' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: '내 학습', active: false, href: '/lessons',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#2563EB' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: '현황', active: false, href: '/status',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#2563EB' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: '자율학습', active: false, href: '/my-learning',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#2563EB' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
]

const SETTINGS_ICON = (a: boolean) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#2563EB' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

/* ── 사이드바 ── */
function Sidebar({ open, setOpen }: {
  open: boolean; setOpen: (v: boolean) => void
}) {
  return (
    <aside className={`hidden md:flex flex-col bg-[#F8FAFF] border-r border-[#DBEAFE] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[240px]' : 'w-[56px]'}`}>
      {/* 사이드바 맨 윗줄(로고·접기 버튼)도 상태바 밑이다 — 안전영역만큼 내린다 */}
      <div className={`flex items-center min-h-[60px] pt-safe-0 shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
        {open && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] tracking-tight">YBM</span>
            </div>
            <span className="text-[#1C1B33] font-bold text-[15px]">AI Course</span>
          </div>
        )}
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#DBEAFE] hover:bg-[#DBEAFE] flex items-center justify-center transition-all shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item) => {
          const cls = `w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]'}`
          return (
            <Link key={item.label} href={item.href ?? '#'} className={cls}>
              <span className="shrink-0">{item.icon(item.active)}</span>
              {open && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={`${open ? 'px-3' : 'px-2'} mb-3`}>
        <div className="mb-2"><div className="h-px bg-[#DBEAFE]" /></div>
        <Link href="/settings/account" className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
          <span className="shrink-0">{SETTINGS_ICON(false)}</span>
          {open && <span className="animate-fade-in">설정</span>}
        </Link>
      </div>
    </aside>
  )
}

/* ── 모바일 하단 네비 ── */
function BottomNav() {
  const items = [...NAV.slice(0, 4), { label: '설정', active: false, href: '/settings/account', icon: SETTINGS_ICON }]
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#DBEAFE] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {items.map((item) => {
        const cls = `flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`
        return (
          <Link key={item.label} href={item.href ?? '#'} className={cls}>
            {item.icon(item.active)}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/* ── 정규 대시보드 ── */
function RegularDashboard() {
  const { userName, selectedInstructor, examDate } = useOnboardingStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const streakDay = useStreakDay()

  /* 홈 시안 A/B 전환 (검토용). 새로고침해도 보던 쪽이 유지되게 localStorage 에 남긴다.
     첫 렌더는 서버와 같아야 해서 'a' 로 시작하고, 마운트 뒤에 저장값을 읽는다. */
  const [variant, setVariant] = useState<'a' | 'b'>('a')
  useEffect(() => {
    if (localStorage.getItem('homeVariant') === 'b') setVariant('b')
  }, [])
  const changeVariant = (v: 'a' | 'b') => {
    setVariant(v)
    localStorage.setItem('homeVariant', v)
  }
  const instName = INST_NAME[selectedInstructor ?? 'park_hyewon'] ?? '박혜원'
  const instThumb = INST_THUMBS[selectedInstructor ?? 'park_hyewon'] ?? ''

  const [callState, setCallState] = useState<CallState>('idle')
  const [callLog, setCallLog] = useState<CallEntry[]>([])
  const [surveyOpen, setSurveyOpen] = useState(false)

  const INST_GREETING: Record<string, string> = {
    park_hyewon: '오늘 토익 공부할 시간이야. 지금 시작해야 돼, 알겠지?',
    yun_daeun: '안녕하세요~ 오늘도 같이 토익 공부해봐요! 잘 할 수 있어요.',
    lee_doyun: '공부할 시간이야. 오늘 목표 꼭 달성하고 자자고.',
    seo_jian: '오늘도 잘 왔어요 💜 조급해하지 말고 같이 한 걸음씩 가봐요.',
    oh_jungja: '오늘도 왔네요. 천천히 한 문제씩 하면 돼요. 시작해봐요.',
  }
  const greeting = INST_GREETING[selectedInstructor ?? 'park_hyewon'] ?? '오늘 토익 공부할 시간이에요! 같이 시작해봐요.'
  const ttsPersona = INST_PERSONA[selectedInstructor ?? 'park_hyewon'] ?? 'park'

  const handlePhoneClick = () => setCallState('ringing')
  const handleAnswer = () => setCallState('active')
  const handleHangup = (duration: number) => {
    setCallLog((prev) => [...prev, {
      id: Date.now().toString(),
      instructorKey: selectedInstructor ?? 'park_hyewon',
      instructorName: instName,
      instructorThumb: instThumb,
      time: new Date(),
      status: 'answered' as const,
      duration,
    }])
    setCallState('idle')
    setSurveyOpen(true)
  }
  const handleReject = () => {
    setCallLog((prev) => [...prev, {
      id: Date.now().toString(),
      instructorKey: selectedInstructor ?? 'park_hyewon',
      instructorName: instName,
      instructorThumb: instThumb,
      time: new Date(),
      status: 'rejected' as const,
    }])
    setCallState('idle')
    setSurveyOpen(true)
  }
  const handleCloseLog = () => setCallState('idle')

  const [typedMsg, setTypedMsg] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const currentMessages = INST_MESSAGES[selectedInstructor ?? 'park_hyewon']?.dashboard ?? []

  useEffect(() => { setMsgIdx(0) }, [selectedInstructor])

  useEffect(() => {
    if (currentMessages.length <= 1) return
    const interval = setInterval(() => setMsgIdx((prev) => (prev + 1) % currentMessages.length), 15000)
    return () => clearInterval(interval)
  }, [currentMessages])

  useEffect(() => {
    const msg = currentMessages[msgIdx] ?? ''
    setTypedMsg(''); setTypingDone(false)
    let intervalId: ReturnType<typeof setInterval>
    const timeoutId = setTimeout(() => {
      let i = 0
      intervalId = setInterval(() => {
        i++
        setTypedMsg(msg.slice(0, i))
        if (i >= msg.length) { setTypingDone(true); clearInterval(intervalId) }
      }, 36)
    }, 400)
    return () => { clearTimeout(timeoutId); clearInterval(intervalId) }
  }, [selectedInstructor, msgIdx, currentMessages])

  const ddayLabel = useMemo(() => {
    if (DEMO_DDAY) return DEMO_DDAY          // 시연 고정값 (내 학습 화면과 같은 값을 써야 한다)
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  return (
    <div className="flex min-h-screen bg-[#F5F7FF] font-sans text-[#1C1B33]">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── 모바일 헤더 ── */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <p className="text-[#1C1B33] text-[20px] font-bold">{userName || '학습자'}님 👋</p>
            <div className="flex items-center gap-2">
              <button onClick={handlePhoneClick} className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {callLog.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
              </button>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 pt-5 md:pt-safe-5 pb-28 md:pb-8">
          <div className="max-w-[1100px] mx-auto w-full space-y-4">

            {/* 데스크탑 상단 바 */}
            <div className="hidden md:flex items-center justify-end gap-2">
              <a href="https://exam.toeic.co.kr/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white border border-[#EBEBF0] text-[#5B5A72] hover:text-[#2563EB] hover:border-[#2563EB] text-[12px] font-bold px-4 py-2 rounded-full transition-all">
                토익 시험 접수하기
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </a>
              <button onClick={handlePhoneClick} className="relative w-9 h-9 rounded-full bg-white border border-[#EBEBF0] flex items-center justify-center hover:bg-[#EFF6FF] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {callLog.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
              </button>
              <AccountMenu userName={userName ?? ''} />
            </div>

            {/* ── 홈 B · 오늘 할 일 중심 시안 (homeB.tsx) ── */}
            {/* B 는 온보딩 스토어·연속학습·D-day 를 스스로 읽는다 (A 와 데이터 경로가 갈리지 않게) */}
            {variant === 'b' && <HomeB />}

            {/* ── 홈 A · 메인 레이아웃: 코칭 카드 + 오른쪽 스탯 카드 ── */}
            {variant === 'a' && (
            <div className="flex flex-col md:flex-row gap-4 items-stretch" style={{ maxWidth: '1080px' }}>

              {/* ① 코칭 카드 (사진 35% + 말풍선·CTA 65%) */}
              <div
                className="flex-1 rounded-3xl overflow-hidden shadow-lg relative h-auto md:h-[400px]"
                style={{
                  background: 'linear-gradient(135deg, #E8EFFF 0%, #DBEAFE 55%, #C7D7FD 100%)',
                }}
              >
                <div className="h-full grid grid-cols-1 md:grid-cols-[35%_65%]">

                  {/* 강사 사진 (데스크탑 전용 · 모바일은 코칭 라벨 옆 아바타로 대체) */}
                  <div className="relative overflow-hidden h-full hidden md:block">
                    {(selectedInstructor ?? 'park_hyewon') === 'park_hyewon' ? (
                      <img
                        src="/image_reference/park-report.png"
                        alt={instName}
                        className="absolute bottom-0 left-0 max-h-[320px] w-auto object-contain drop-shadow-lg"
                      />
                    ) : (
                      <img
                        src={INST_THUMBS[selectedInstructor ?? 'park_hyewon']}
                        alt={instName}
                        className="absolute bottom-0 left-0 max-h-[320px] w-auto object-contain drop-shadow-lg"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                  </div>

                  {/* 말풍선 + CTA */}
                  <div className="flex flex-col justify-center gap-5 py-8 md:py-10 px-5 md:pr-8 md:pl-2">
                    <div className="flex items-center gap-2">
                      {/* 모바일: 강사 얼굴 아바타 */}
                      <div className="md:hidden w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-white">
                        <img src={instThumb} alt={instName} className="w-full h-full object-cover object-top"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      {/* 데스크탑: 아이콘 */}
                      <div className="hidden md:flex w-6 h-6 rounded-full bg-white/60 items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <span className="text-[12px] font-bold text-[#4B5494]">{instName} 선생님의 오늘 코칭</span>
                    </div>

                    <div className="bg-white rounded-2xl px-5 py-4 shadow-md">
                      <p className="text-[15px] font-semibold text-[#1C1B33] leading-relaxed">
                        {typedMsg}
                        {!typingDone && (
                          <span className="inline-block w-[2px] h-[1em] bg-[#2563EB] animate-pulse ml-0.5 align-middle rounded-full" />
                        )}
                      </p>
                    </div>

                    <a
                      href="/part5"
                      className="self-end md:mt-auto inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white pl-2.5 pr-4 py-2 rounded-xl font-bold text-[13px] transition-all shadow-lg shadow-[#2563EB]/25"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                      1:1 학습 시작하기
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </a>
                  </div>

                </div>
              </div>

              {/* ② 오른쪽(모바일: 코칭 카드 아래) 스탯 카드 2개 */}
              <div className="grid grid-cols-2 gap-3 md:flex md:flex-col w-full md:w-[200px] shrink-0">

                <div className="flex-1 bg-white rounded-2xl px-5 py-5 shadow-sm border border-[#F3F4F6] flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-semibold text-[#6B7280]">연속 학습</p>
                    <span className="text-[16px]">🔥</span>
                  </div>
                  <p className="text-[40px] font-black text-[#D97706] leading-none">
                    {streakDay}<span className="text-[18px] font-bold ml-1">일</span>
                  </p>
                  <div className="flex gap-[3px] mt-3">
                    {Array.from({ length: 7 }, (_, i) => {
                      const done = i < Math.min(streakDay % 7 || 7, 7)
                      return (
                        <div key={i} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors ${done ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F9FAFB] border-[#E5E7EB] text-transparent'}`}>
                          ✓
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl px-5 py-5 shadow-sm border border-[#F3F4F6] flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[14px]">📅</span>
                    <p className="text-[11px] font-semibold text-[#6B7280]">토익 시험</p>
                  </div>
                  <p className="text-[40px] font-black text-[#2563EB] leading-none">
                    {ddayLabel ?? 'D-?'}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] mt-2">목표 점수까지 화이팅! 💪</p>
                </div>

              </div>
            </div>
            )}


          </div>
        </main>
      </div>

      <BottomNav />

      {callState === 'ringing' && (
        <IncomingCallScreen instructorName={instName} instructorThumb={instThumb} onAnswer={handleAnswer} onReject={handleReject} />
      )}
      {callState === 'active' && (
        <ActiveCallScreen instructorName={instName} instructorThumb={instThumb} onHangup={handleHangup} greeting={greeting} persona={ttsPersona} />
      )}
      {callState === 'log' && (
        <CallLogSheet entries={callLog} onClose={handleCloseLog} />
      )}
      {surveyOpen && (
        <CallSurvey
          instructorName={instName}
          instructorThumb={instThumb}
          onClose={() => setSurveyOpen(false)}
        />
      )}

      <HomeVariantToggle variant={variant} onChange={changeVariant} />
    </div>
  )
}

/* ── 대시보드 라우터 ── */
export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    import('@/lib/supabase').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user }, error }) => {
        if (!user || error) {
          createClient().auth.signOut()
          router.replace('/')
        }
      })
    })
  }, [router])

  return <RegularDashboard />
}
