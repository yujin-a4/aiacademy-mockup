'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo, useEffect } from 'react'
import AccountMenu from '@/components/AccountMenu'
import { Noto_Serif_KR, Diphylleia } from 'next/font/google'
import { IncomingCallScreen, CallLogSheet } from '@/components/CallScreen'
import type { CallEntry } from '@/components/CallScreen'
import { INST_NAME, INST_THUMBS, INST_MESSAGES } from '@/data/instructorData'
import CallSurvey from '@/components/survey/CallSurvey'
import { useStreakDay } from '@/hooks/useStreakDay'

type CallState = 'idle' | 'ringing' | 'active' | 'log'

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-noto-serif-kr',
})

const diphylleia = Diphylleia({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-diphylleia',
})

/* ══════════════════════════════════════════════
   오정자 선생님 전용 대시보드
══════════════════════════════════════════════ */
const OJJ_NUDGE = '자, 앉아요. 화장실은 미리 다녀오셨죠? 오늘도 천천히 같이 봐요.'

const OJJ_QUOTES = [
  '천재는 노력하는 자를 이길 수 없고,\n노력하는 자는 즐기는 자를 이길 수 없다.',
  '배움에는 왕도가 없다.\n그저 앉아서 하는 것이다.',
  '오늘 할 수 있는 일을\n내일로 미루지 마라.',
  '공부는 엉덩이로 하는 것이다.',
  '세 번 읽으면 모르는 것이 없고,\n열 번 쓰면 못 쓰는 것이 없다.',
]

type AdviceQuote = {
  message: string
  author: string
}

const OJJ_SCHEDULE = [
  { time: '오전 10:00', title: '화장실 먼저 다녀오기', done: true,  icon: '' },
  { time: '오전 10:10', title: 'Part 5 기초 문법 (천천히)', done: true,  icon: '' },
  { time: '오후 2:00',  title: '오늘 단어 딱 10개만 (이상 안 해도 됨)', done: false, icon: '' },
  { time: '오후 4:00',  title: 'LC 듣기 (두 번 틀어줄게요)', done: false, icon: '' },
  { time: '저녁 7:00',  title: '커피 한 잔 마시기 (공부 끝)', done: false, icon: '' },
]

function OjjDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { userName, examDate } = useOnboardingStore()
  const streakDay = useStreakDay()
  const [typedMsg, setTypedMsg] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [missions, setMissions] = useState(OJJ_SCHEDULE)
  const [clickedMilestones, setClickedMilestones] = useState<number[]>([])
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [apiQuote, setApiQuote] = useState<AdviceQuote | null>(null)

  const [callState, setCallState] = useState<CallState>('idle')
  const [callLog, setCallLog] = useState<CallEntry[]>([])
  const ojjName = INST_NAME['oh_jungja']
  const ojjThumb = INST_THUMBS['oh_jungja']
  const handlePhoneClick = () => setCallState('ringing')
  const handleAnswer = () => setCallState('idle')
  const handleReject = () => {
    setCallLog((prev) => [...prev, {
      id: Date.now().toString(),
      instructorKey: 'oh_jungja',
      instructorName: ojjName,
      instructorThumb: ojjThumb,
      time: new Date(),
      status: 'rejected' as const,
    }])
    setCallState('log')
  }
  const handleCloseLog = () => setCallState('idle')

  const fetchAdvice = () =>
    fetch('/api/advice', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch advice')
        return r.json() as Promise<AdviceQuote>
      })
      .then(d => setApiQuote({ message: d.message, author: d.author }))
      .catch(() => {})

  const currentQuote = apiQuote
    ? `${apiQuote.message}\n- ${apiQuote.author}`
    : OJJ_QUOTES[quoteIdx]

  useEffect(() => {
    fetchAdvice()
    const id = setInterval(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % OJJ_QUOTES.length)
        fetchAdvice().finally(() => setQuoteVisible(true))
      }, 500)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setTypedMsg(''); setTypingDone(false)
    let intervalId: ReturnType<typeof setInterval>
    const timeoutId = setTimeout(() => {
      let i = 0
      intervalId = setInterval(() => {
        i++
        setTypedMsg(OJJ_NUDGE.slice(0, i))
        if (i >= OJJ_NUDGE.length) { setTypingDone(true); clearInterval(intervalId) }
      }, 38)
    }, 700)
    return () => { clearTimeout(timeoutId); clearInterval(intervalId) }
  }, [])

  const ddayLabel = useMemo(() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  const cal = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDayOfWeek = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayDate = today.getDate()
    return { year, month, firstDayOfWeek, daysInMonth, todayDate }
  }, [])

  const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const toggleMission = (i: number) =>
    setMissions(prev => prev.map((m, idx) => idx === i ? { ...m, done: !m.done } : m))
  const doneCount = missions.filter(m => m.done).length

  return (
    <div className={`${notoSerifKR.variable} ${diphylleia.variable} flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1C1B33] text-[20px] font-bold">{userName || '학습자'}님 </p>
              {ddayLabel && <span className="inline-block mt-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">토익 시험 {ddayLabel}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePhoneClick}
                className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center hover:bg-[#EFF6FF] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                {callLog.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                )}
              </button>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[1000px] mx-auto w-full space-y-4">

            {/* 데스크탑 상단 바 */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-3 py-1.5 rounded-full">
                   {streakDay}일 연속 학습 중
                </span>
                {ddayLabel && (
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1.5 rounded-full">
                     토익 시험 {ddayLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a href="https://exam.toeic.co.kr/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white border border-[#EBEBF0] text-[#5B5A72] hover:text-[#2563EB] hover:border-[#2563EB] text-[12px] font-bold px-4 py-2 rounded-full transition-all">
                  토익 시험 접수하기
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
                <button onClick={handlePhoneClick} className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center hover:bg-[#EFF6FF] transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {callLog.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
                </button>
                <AccountMenu userName={userName ?? ''} />
              </div>
            </div>

            {/* ── 히어로 3-카드 ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 1. 명언 족자 */}
              <div className="flex items-stretch rounded-xl overflow-hidden shadow-md" style={{ minHeight: '190px' }}>
                <div style={{ width: '14px', flexShrink: 0, background: 'linear-gradient(to right, #3B1F0A 0%, #7C4A1E 30%, #A0642A 50%, #7C4A1E 70%, #3B1F0A 100%)', boxShadow: '3px 0 6px rgba(0,0,0,0.35)' }} />
                <div style={{ flex: 1, background: 'linear-gradient(to bottom, #D4A96A 0%, #F5E6C0 5%, #FFFAED 50%, #F5E6C0 95%, #D4A96A 100%)', borderTop: '2px solid #C4974A', borderBottom: '2px solid #C4974A', padding: '20px 20px 30px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: '8px', left: 0, right: 0, height: '1px', background: 'rgba(180,120,40,0.2)' }} />
                  <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, height: '1px', background: 'rgba(180,120,40,0.2)' }} />
                  <p style={{
                    fontFamily: "var(--font-diphylleia), 'Diphylleia', serif",
                    fontSize: '15px', fontWeight: '400', textAlign: 'center',
                    color: '#1C0A00', lineHeight: '1.9', letterSpacing: '0.02em',
                    opacity: quoteVisible ? 1 : 0,
                    transition: 'opacity 0.5s ease',
                    whiteSpace: 'pre-line',
                  }}>
                    {currentQuote}
                  </p>
                  <div style={{ position: 'absolute', bottom: '10px', right: '12px', width: '26px', height: '26px', border: '2px solid #CC1111', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(204,17,17,0.06)' }}>
                    <span style={{ fontSize: '6.5px', color: '#CC1111', fontWeight: 'bold', lineHeight: 1.2, textAlign: 'center', fontFamily: "'Gungsuh', serif" }}>오정<br/>자인</span>
                  </div>
                </div>
                <div style={{ width: '14px', flexShrink: 0, background: 'linear-gradient(to right, #3B1F0A 0%, #7C4A1E 30%, #A0642A 50%, #7C4A1E 70%, #3B1F0A 100%)', boxShadow: '-3px 0 6px rgba(0,0,0,0.35)' }} />
              </div>

              {/* 2. 선생님 응원 메시지 */}
              <div className="relative overflow-hidden rounded-xl p-5 flex flex-col gap-3"
                style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 55%, #BFDBFE 100%)' }}>
                <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-[#60A5FA]/15 blur-3xl pointer-events-none" />
                <span className="self-start inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                  오정자 선생님의 오늘 처방전 
                </span>
                <div className="flex items-end gap-2 flex-1">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-md">
                    <img src="/image_reference/ojungja.jpg" alt="오정자" className="w-full h-full object-cover object-top"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div className="relative bg-white rounded-2xl px-3.5 py-2.5 shadow-md flex-1">
                    <p className="text-[#1C1B33] text-[12px] leading-relaxed">
                      {typedMsg}
                      {!typingDone && <span className="inline-block w-[2px] h-3 bg-[#2563EB] animate-pulse ml-0.5 align-middle rounded-full" />}
                    </p>
                    <div className="absolute -left-[7px] top-[16px] w-0 h-0"
                      style={{ borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '7px solid white' }} />
                  </div>
                </div>
                <a href="/part5"
                  className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 rounded-md font-bold text-[13px] transition-colors shadow-md shadow-[#2563EB]/25 active:scale-[0.98]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  1:1 학습 시작하기
                </a>
              </div>

              {/* 3. 동기부여 — D-day + 연속학습 */}
              <div className="rounded-xl p-5 flex flex-col justify-between"
                style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)' }}>
                <div>
                  <p className="text-white/60 text-[11px] font-semibold mb-1">토익 시험까지</p>
                  <p className="text-white font-black leading-none"
                    style={{ fontSize: '64px', fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', 'Batang', '바탕', serif" }}>
                    {ddayLabel ?? 'D-?'}
                  </p>
                  <p className="text-white/70 text-[12px] mt-2">오늘의 첫 걸음이, 합격으로 만들겠습니다.</p>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2.5 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
                    <span className="text-[22px] leading-none"></span>
                    <div>
                      <p className="text-[22px] font-black text-white leading-none">{streakDay}일</p>
                      <p className="text-[10px] text-white/70 font-semibold">연속 학습 중</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 하단 섹션 ── */}
            <div className="space-y-4">

              {/* 66일 달성 그리드 — 전체 가로 */}
              {(() => {
                const TODAY = streakDay
                const MILESTONES: Record<number, string> = { 7: '', 14: '', 21: '', 30: '', 42: '', 55: '', 66: '' }
                const COLS = 13
                const TOTAL_CELLS = Math.ceil(66 / COLS) * COLS // 78
                return (
                  <div className="bg-white rounded-xl border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#1C1B33] font-bold text-[14px]">66일 연속 달성 </h3>
                      <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-full"> {TODAY - 1}일째</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] -mt-1">트로피·별표를 눌러서 미리 달성해봐요!</p>

                    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                      {Array.from({ length: TOTAL_CELLS }, (_, i) => {
                        const day = i + 1
                        if (day > 66) return <div key={`empty-${i}`} />
                        const isUserMarked = clickedMilestones.includes(day)
                        const done = day < TODAY || isUserMarked
                        const isToday = day === TODAY
                        const milestone = MILESTONES[day]
                        const clickable = !!milestone && day > TODAY
                        return (
                          <div
                            key={day}
                            title={`${day}일차${milestone ? ' ' + milestone : ''}`}
                            onClick={() => {
                              if (!clickable) return
                              setClickedMilestones(p => isUserMarked ? p.filter(d => d !== day) : [...p, day])
                            }}
                            className="aspect-square rounded-[7px] flex items-center justify-center transition-all"
                            style={{
                              cursor: clickable ? 'pointer' : 'default',
                              ...(isToday ? {
                                background: '#EFF6FF',
                                boxShadow: '0 0 0 2.5px #2563EB',
                              } : done ? {
                                background: '#2563EB',
                              } : milestone ? {
                                background: '#EFF6FF',
                                border: '1.5px dashed #93C5FD',
                              } : {
                                background: '#F3F4F6',
                              }),
                            }}
                          >
                            {isToday ? (
                              <span style={{ fontSize: '7px', color: '#2563EB', fontWeight: 900, lineHeight: 1 }}>TODAY</span>
                            ) : done && milestone ? (
                              <span style={{ fontSize: '10px', lineHeight: 1 }}>{milestone}</span>
                            ) : !done && milestone ? (
                              <span style={{ fontSize: '11px', lineHeight: 1, opacity: 0.7 }}>{milestone}</span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-[2px] bg-[#2563EB]" />
                        <span className="text-[10px] text-[#9CA3AF]">완료</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-[2px] bg-[#EFF6FF]" style={{ boxShadow: '0 0 0 1.5px #2563EB' }} />
                        <span className="text-[10px] text-[#9CA3AF]">오늘</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-[2px] bg-[#EFF6FF]" style={{ border: '1.5px dashed #93C5FD' }} />
                        <span className="text-[10px] text-[#9CA3AF]">달성 미션</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 오늘의 일정 + 학습량 — 2분할 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 오늘의 일정 */}
              <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_8px_rgba(37,99,235,0.06)] border border-[#DBEAFE]">
                <div className="h-1 bg-[#EFF6FF]">
                  <div className="h-full transition-all duration-500 rounded-r-full from-[#2563EB] to-[#1D4ED8] bg-gradient-to-r"
                    style={{ width: `${Math.round((doneCount / missions.length) * 100)}%` }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[14px]">오늘의 일정</h3>
                    <span className="text-[11px] text-[#9CA3AF]">선생님이 짜줬어요 ️</span>
                  </div>
                  <div className="space-y-2">
                    {missions.map((item, i) => (
                      <div key={i} onClick={() => toggleMission(i)}
                        className="cursor-pointer flex items-start gap-2.5 p-2.5 rounded-xl border transition-all active:scale-[0.98]"
                        style={item.done
                          ? { borderColor: '#BFDBFE', background: '#EFF6FF' }
                          : { borderColor: '#F3F4F6', background: '#FAFAFA' }}>
                        <span className="text-[15px] shrink-0 mt-0.5">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-bold leading-snug ${item.done ? 'text-[#9CA3AF] line-through' : 'text-[#1C1B33]'}`}>
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{item.time}</p>
                        </div>
                        {item.done && (
                          <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오늘의 학습량 */}
              <div className="bg-white rounded-xl p-5 flex flex-col shadow-[0_1px_8px_rgba(37,99,235,0.06)] border border-[#DBEAFE]">
                <h3 className="font-bold text-[14px] mb-1">오늘의 학습량</h3>
                <p className="text-[10px] text-[#9CA3AF] mb-4">선생님이 직접 확인했어요 </p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: '학습 시간', value: '42', unit: '분', color: '#2563EB', bg: '#EFF6FF' },
                    { label: '정확도',   value: '78', unit: '%',  color: '#059669', bg: '#F0FDF4' },
                    { label: '연속 학습', value: '12', unit: '일', color: '#B45309', bg: '#FEF9C3' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center rounded-xl py-3" style={{ background: stat.bg }}>
                      <p className="font-black leading-none text-[24px]" style={{ color: stat.color }}>{stat.value}</p>
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: stat.color }}>{stat.unit}</p>
                      <p className="text-[9px] text-[#9CA3AF] mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* 오정자 코멘트 */}
                <div className="rounded-xl p-3 mt-auto bg-[#EFF6FF] border border-[#DBEAFE]">
                  <p className="text-[11px] font-bold leading-relaxed text-[#1D4ED8]">
                     "42분이요? 잘했어요. 내일은 45분 해봐요. 딱 3분만 더요."
                  </p>
                </div>

                <Link href="/daily"
                  className="mt-3 w-full py-2.5 rounded-md font-bold text-[12px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98] bg-white border border-[#DBEAFE] text-[#2563EB] hover:bg-[#EFF6FF]">
                   오늘의 문제 풀기
                </Link>
              </div>

              </div>{/* /우측 컬럼 */}

            </div>
          </div>
        </main>
      </div>

      <BottomNav />

      {callState === 'ringing' && (
        <IncomingCallScreen
          instructorName={ojjName}
          instructorThumb={ojjThumb}
          onAnswer={handleAnswer}
          onReject={handleReject}
        />
      )}
      {callState === 'log' && (
        <CallLogSheet entries={callLog} onClose={handleCloseLog} />
      )}
    </div>
  )
}

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
      <div className={`flex items-center min-h-[60px] shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
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
  const instName = INST_NAME[selectedInstructor ?? 'park_hyewon'] ?? '박혜원'
  const instThumb = INST_THUMBS[selectedInstructor ?? 'park_hyewon'] ?? ''

  const [callState, setCallState] = useState<CallState>('idle')
  const [callLog, setCallLog] = useState<CallEntry[]>([])
  const [surveyOpen, setSurveyOpen] = useState(false)

  const handlePhoneClick = () => setSurveyOpen(true)
  const handleAnswer = () => setCallState('idle')
  const handleReject = () => {
    setCallLog((prev) => [...prev, {
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
    }, 900)
    return () => { clearTimeout(timeoutId); clearInterval(intervalId) }
  }, [selectedInstructor, msgIdx, currentMessages])

  const ddayLabel = useMemo(() => {
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
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] bg-[#FEF9C3] px-2.5 py-1.5 rounded-full">🔥 {streakDay}일</span>
              {ddayLabel && <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1.5 rounded-full">{ddayLabel}</span>}
              <button onClick={handlePhoneClick} className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.36 2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {callLog.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
              </button>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 pt-5 md:pt-16 pb-28 md:pb-8">
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

            {/* ── 메인 그리드: 강사카드 + 오른쪽 컬럼 ── */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">

              {/* ① 강사 카드 */}
              <div className="relative rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #E8EFFF 0%, #DBEAFE 50%, #C7D7FD 100%)', minHeight: '360px' }}>
                {/* 배경 장식 */}
                <div className="absolute top-6 right-[35%] w-24 h-24 rounded-full bg-white/20 pointer-events-none" />
                <div className="absolute top-4 right-[48%] w-10 h-10 rounded-full border-2 border-white/30 pointer-events-none" />

                {/* 강사 사진 */}
                <div className="absolute left-0 bottom-0 w-[44%] h-full flex items-end justify-center">
                  {(selectedInstructor ?? 'park_hyewon') === 'park_hyewon' ? (
                    <img src="/image_reference/park-report.png" alt={instName}
                      className="h-full w-auto object-contain drop-shadow-md" />
                  ) : (
                    <img src={INST_THUMBS[selectedInstructor ?? 'park_hyewon']} alt={instName}
                      className="h-full w-full object-cover object-top"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                </div>

                {/* 말풍선 영역 */}
                <div className="absolute right-0 top-0 bottom-0 w-[60%] flex flex-col justify-center px-6 py-7">
                  <div className="bg-white rounded-xl px-6 py-5 shadow-lg">
                    <p className="text-[32px] text-[#93C5FD] font-serif leading-none mb-1 -ml-1">"</p>
                    <p className="text-[11px] font-bold text-[#2563EB] mb-3">{instName} 선생님의 한마디</p>
                    <p className="text-[15px] font-bold text-[#1C1B33] leading-relaxed">
                      {typedMsg}
                      {!typingDone && <span className="inline-block w-[2px] h-[1em] bg-[#2563EB] animate-pulse ml-0.5 align-middle rounded-full" />}
                    </p>
                    <div className="flex justify-end mt-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BFDBFE" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </div>
                  </div>
                  {/* 강사 서명 */}
                  <div className="mt-3 pl-1">
                    <p className="text-[13px] text-[#6B7280] italic">{instName} 선생님</p>
                    <div className="mt-1 h-[2px] w-16 bg-[#93C5FD] rounded-full" />
                  </div>
                </div>
              </div>

              {/* ② 오른쪽 컬럼 */}
              <div className="flex flex-col gap-3">

                {/* 연속 학습일 카드 */}
                <div className="bg-white rounded-xl border border-[#F3F4F6] p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-semibold text-[#6B7280]">연속 학습일</p>
                    <span className="text-[20px]">🔥</span>
                  </div>
                  <p className="text-[44px] font-black text-[#D97706] leading-none">{streakDay}일</p>
                  <div className="flex gap-1.5 mt-3">
                    {Array.from({ length: 8 }, (_, i) => {
                      const done = i < Math.min(streakDay % 8 || 8, 8) && i < 7
                      return (
                        <div key={i} className={`w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${done ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F9FAFB] border-[#E5E7EB] text-transparent'}`}>
                          ✓
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* D-day 카드 */}
                {ddayLabel && (
                  <div className="bg-white rounded-xl border border-[#F3F4F6] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[12px] font-semibold text-[#6B7280]">토익 시험</p>
                      <span className="text-[20px]">📅</span>
                    </div>
                    <p className="text-[44px] font-black text-[#2563EB] leading-none">{ddayLabel}</p>
                  </div>
                )}

                {/* CTA 버튼 */}
                <a href="/part5"
                  className="mt-auto flex items-center justify-between bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-4 rounded-xl font-black text-[15px] transition-colors shadow-lg shadow-[#2563EB]/25 active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                    1:1 학습 시작하기
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </a>

              </div>
            </div>

            {/* ── ③ 배지 카드 — 상태별 조건부 렌더링 (상호 배타적) ── */}
            {(() => {
              const isReturning = streakDay === 0
              const badgeChevron = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>

              return (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                  {isReturning ? (
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-[#DBEAFE] transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#DBEAFE] flex items-center justify-center shrink-0 text-[22px]">👋</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] text-[#2563EB]">오랜만에 오셨네요!</p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">다시 시작하는 오늘, 응원할게요!</p>
                      </div>
                      {badgeChevron}
                    </div>
                  ) : (
                    <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-[#FEE2E2] transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0 text-[22px]">⚠️</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] text-[#DC2626]">오늘 빠지면 연속 기록 놓쳐요</p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">하루만 더! 연속 기록을 지켜봐요.</p>
                      </div>
                      {badgeChevron}
                    </div>
                  )}
                </div>
              )
            })()}

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
      {surveyOpen && (
        <CallSurvey
          instructorName={instName}
          instructorThumb={instThumb}
          onClose={() => setSurveyOpen(false)}
        />
      )}
    </div>
  )
}

/* ── 대시보드 라우터 ── */
export default function Dashboard() {
  const { selectedInstructor } = useOnboardingStore()
  if (selectedInstructor === 'oh_jungja') return <OjjDashboard />
  return <RegularDashboard />
}
