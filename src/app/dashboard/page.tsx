'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo, useEffect } from 'react'
import AccountMenu from '@/components/AccountMenu'
import { Noto_Serif_KR } from 'next/font/google'

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-noto-serif-kr',
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
  { time: '오전 10:00', title: '화장실 먼저 다녀오기', done: true,  icon: '🚽' },
  { time: '오전 10:10', title: 'Part 5 기초 문법 (천천히)', done: true,  icon: '📖' },
  { time: '오후 2:00',  title: '오늘 단어 딱 10개만 (이상 안 해도 됨)', done: false, icon: '📝' },
  { time: '오후 4:00',  title: 'LC 듣기 (두 번 틀어줄게요)', done: false, icon: '🎧' },
  { time: '저녁 7:00',  title: '커피 한 잔 마시기 (공부 끝)', done: false, icon: '☕' },
]

function OjjDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { userName, examDate } = useOnboardingStore()
  const [typedMsg, setTypedMsg] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [missions, setMissions] = useState(OJJ_SCHEDULE)
  const [clickedMilestones, setClickedMilestones] = useState<number[]>([])
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [apiQuote, setApiQuote] = useState<AdviceQuote | null>(null)

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
    <div className={`${notoSerifKR.variable} flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1C1B33] text-[20px] font-bold">{userName || '학습자'}님 👵</p>
              {ddayLabel && <span className="inline-block mt-1 text-[11px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full">토익 시험 {ddayLabel}</span>}
            </div>
            <AccountMenu userName={userName ?? ''} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[1000px] mx-auto w-full space-y-4">

            {/* 데스크탑 상단 바 */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-3 py-1.5 rounded-full">
                  🔥 12일 연속 학습 중
                </span>
                {ddayLabel && (
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#4F46E5] bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-1.5 rounded-full">
                    📅 토익 시험 {ddayLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a href="https://exam.toeic.co.kr/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white border border-[#EBEBF0] text-[#5B5A72] hover:text-[#4F46E5] hover:border-[#4F46E5] text-[12px] font-bold px-4 py-2 rounded-full transition-all">
                  토익 시험 접수하기
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
                <AccountMenu userName={userName ?? ''} />
              </div>
            </div>

            {/* ── 히어로 카드 ── */}
            <div className="relative overflow-hidden rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #EAE8FF 0%, #D5CEFF 50%, #C7D2FE 100%)', minHeight: '200px' }}>
              <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-[#818CF8]/20 blur-3xl pointer-events-none" />

              {/* 족자 — 데스크탑 우측 상단 고정 */}
              <div className="absolute top-5 right-6 z-20 hidden md:flex items-stretch" style={{ width: '300px' }}>
                <div style={{ width: '15px', flexShrink: 0, borderRadius: '7px', background: 'linear-gradient(to right, #3B1F0A 0%, #7C4A1E 30%, #A0642A 50%, #7C4A1E 70%, #3B1F0A 100%)', boxShadow: '3px 0 6px rgba(0,0,0,0.35)' }} />
                <div style={{ flex: 1, minHeight: '140px', background: 'linear-gradient(to bottom, #D4A96A 0%, #F5E6C0 5%, #FFFAED 50%, #F5E6C0 95%, #D4A96A 100%)', borderTop: '2px solid #C4974A', borderBottom: '2px solid #C4974A', padding: '14px 20px 18px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: '8px', left: 0, right: 0, height: '1px', background: 'rgba(180,120,40,0.2)' }} />
                  <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, height: '1px', background: 'rgba(180,120,40,0.2)' }} />
                  <p style={{
                    fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', 'Batang', '바탕', serif",
                    fontSize: '15px', fontWeight: 'bold', textAlign: 'center',
                    color: '#1C0A00', lineHeight: '1.7', letterSpacing: '0.01em',
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
                <div style={{ width: '15px', flexShrink: 0, borderRadius: '7px', background: 'linear-gradient(to right, #3B1F0A 0%, #7C4A1E 30%, #A0642A 50%, #7C4A1E 70%, #3B1F0A 100%)', boxShadow: '-3px 0 6px rgba(0,0,0,0.35)' }} />
              </div>

              <div className="relative z-10 p-6 md:p-8 md:pr-[340px]">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4F46E5] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
                  오정자 선생님의 오늘 처방전 📋
                </span>

                {/* D-Day */}
                <div className="mb-4">
                  <p className="text-[#6B7280] text-[12px]">토익 시험까지</p>
                  <p className="text-[#1C1B33] font-black leading-none" style={{ fontSize: '64px', fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', 'Batang', '바탕', serif" }}>
                    {ddayLabel ?? 'D-?'}
                  </p>
                  <p className="text-[#6B7280] text-[12px] mt-1">오늘의 첫 걸음이, 합격으로 만들겠습니다.</p>
                </div>

                {/* 카카오톡 말풍선 + CTA */}
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="flex items-end gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-[#EEF2FF]">
                      <img src="/image_reference/ojungja.jpg" alt="오정자" className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                    <div className="relative bg-white rounded-2xl rounded-bl-none px-3.5 py-2.5 shadow-md max-w-[280px]">
                      <p className="text-[#1C1B33] text-[12px] leading-relaxed">
                        {typedMsg}
                        {!typingDone && <span className="inline-block w-[2px] h-3 bg-[#4F46E5] animate-pulse ml-0.5 align-middle rounded-full" />}
                      </p>
                      <div className="absolute -bottom-[6px] left-0 w-0 h-0"
                        style={{ borderLeft: '7px solid white', borderRight: '7px solid transparent', borderTop: '7px solid white' }} />
                    </div>
                    {typingDone && <span className="text-[10px] text-[#9CA3AF] self-end mb-0.5 shrink-0">방금</span>}
                  </div>
                  <a href="https://aiacademy-classroom.vercel.app/"
                    className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-colors shadow-lg shadow-[#4F46E5]/30 active:scale-[0.98]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    1:1 학습 시작하기
                  </a>
                </div>

                {/* 족자 — 모바일 인라인 */}
                <div className="md:hidden mt-5 flex items-stretch rounded-xl overflow-hidden shadow-md">
                  <div style={{ width: '14px', flexShrink: 0, background: 'linear-gradient(to right, #3B1F0A 0%, #7C4A1E 30%, #A0642A 50%, #7C4A1E 70%, #3B1F0A 100%)', boxShadow: '3px 0 6px rgba(0,0,0,0.35)' }} />
                  <div style={{ flex: 1, minHeight: '120px', background: 'linear-gradient(to bottom, #D4A96A 0%, #F5E6C0 5%, #FFFAED 50%, #F5E6C0 95%, #D4A96A 100%)', borderTop: '2px solid #C4974A', borderBottom: '2px solid #C4974A', padding: '16px 20px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: '8px', left: 0, right: 0, height: '1px', background: 'rgba(180,120,40,0.2)' }} />
                    <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, height: '1px', background: 'rgba(180,120,40,0.2)' }} />
                    <p style={{
                      fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', 'Batang', '바탕', serif",
                      fontSize: '16px', fontWeight: 'bold', textAlign: 'center',
                      color: '#1C0A00', lineHeight: '1.7', letterSpacing: '0.01em',
                      opacity: quoteVisible ? 1 : 0,
                      transition: 'opacity 0.5s ease',
                      whiteSpace: 'pre-line',
                    }}>
                      {currentQuote}
                    </p>
                    <div style={{ position: 'absolute', bottom: '8px', right: '10px', width: '24px', height: '24px', border: '2px solid #CC1111', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(204,17,17,0.06)' }}>
                      <span style={{ fontSize: '6px', color: '#CC1111', fontWeight: 'bold', lineHeight: 1.2, textAlign: 'center', fontFamily: "'Gungsuh', serif" }}>오정<br/>자인</span>
                    </div>
                  </div>
                  <div style={{ width: '14px', flexShrink: 0, background: 'linear-gradient(to right, #3B1F0A 0%, #7C4A1E 30%, #A0642A 50%, #7C4A1E 70%, #3B1F0A 100%)', boxShadow: '-3px 0 6px rgba(0,0,0,0.35)' }} />
                </div>
              </div>
            </div>

            {/* ── 2+1열 ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 66일 달성 그리드 */}
              {(() => {
                const TODAY = 13
                const MILESTONES: Record<number, string> = { 7: '🏆', 14: '⭐', 21: '🏆', 30: '🎯', 42: '⭐', 55: '🏆', 66: '👑' }
                const COLS = 11
                const TOTAL_CELLS = Math.ceil(66 / COLS) * COLS // 72
                return (
                  <div className="md:col-span-2 bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#1C1B33] font-bold text-[14px]">66일 연속 달성 🏅</h3>
                      <span className="text-[11px] font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2.5 py-1 rounded-full">🔥 {TODAY - 1}일째</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] -mt-1">트로피·별표를 눌러서 미리 달성해봐요!</p>

                    <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
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
                            className="aspect-square rounded-[4px] flex items-center justify-center transition-all"
                            style={{
                              cursor: clickable ? 'pointer' : 'default',
                              ...(isToday ? {
                                background: '#EEF2FF',
                                boxShadow: '0 0 0 2.5px #4F46E5',
                              } : done ? {
                                background: '#4F46E5',
                              } : milestone ? {
                                background: '#F5F3FF',
                                border: '1.5px dashed #A5B4FC',
                              } : {
                                background: '#F3F4F6',
                              }),
                            }}
                          >
                            {isToday ? (
                              <span style={{ fontSize: '7px', color: '#4F46E5', fontWeight: 900, lineHeight: 1 }}>TODAY</span>
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
                        <div className="w-3 h-3 rounded-[2px] bg-[#4F46E5]" />
                        <span className="text-[10px] text-[#9CA3AF]">완료</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-[2px] bg-[#EEF2FF]" style={{ boxShadow: '0 0 0 1.5px #4F46E5' }} />
                        <span className="text-[10px] text-[#9CA3AF]">오늘</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-[2px] bg-[#F5F3FF]" style={{ border: '1.5px dashed #A5B4FC' }} />
                        <span className="text-[10px] text-[#9CA3AF]">달성 미션</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 우측 컬럼: 오늘의 일정 + 학습량 */}
              <div className="md:col-span-1 flex flex-col gap-4">

              {/* 오늘의 일정 */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #E5D9C3' }}>
                <div className="h-1" style={{ background: '#FEF9C3' }}>
                  <div className="h-full transition-all duration-500 rounded-r-full"
                    style={{ width: `${Math.round((doneCount / missions.length) * 100)}%`, background: 'linear-gradient(to right, #B45309, #D97706)' }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[14px]">오늘의 일정</h3>
                    <span className="text-[11px] text-[#9CA3AF]">선생님이 짜줬어요 ✍️</span>
                  </div>
                  <div className="space-y-2">
                    {missions.map((item, i) => (
                      <div key={i} onClick={() => toggleMission(i)}
                        className="cursor-pointer flex items-start gap-2.5 p-2.5 rounded-xl border transition-all active:scale-[0.98]"
                        style={item.done
                          ? { borderColor: '#FDE68A', background: '#FFFBEB' }
                          : { borderColor: '#F3F4F6', background: '#FAFAFA' }}>
                        <span className="text-[15px] shrink-0 mt-0.5">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-bold leading-snug ${item.done ? 'line-through' : ''}`}
                            style={item.done ? { color: '#B45309' } : { color: '#1C1B33' }}>
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{item.time}</p>
                        </div>
                        {item.done && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#FDE68A' }}>
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오늘의 학습량 */}
              <div className="bg-white rounded-2xl p-5 flex flex-col shadow-sm" style={{ border: '1px solid #E5D9C3' }}>
                <h3 className="font-bold text-[14px] mb-1">오늘의 학습량</h3>
                <p className="text-[10px] text-[#9CA3AF] mb-4">선생님이 직접 확인했어요 👀</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: '학습 시간', value: '42', unit: '분', color: '#1A3FD4', bg: '#EEF2FF' },
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
                <div className="rounded-xl p-3 mt-auto" style={{ background: '#FFFBEB', border: '1px solid rgba(253,230,138,0.5)' }}>
                  <p className="text-[11px] font-bold leading-relaxed" style={{ color: '#78350F' }}>
                    👵 "42분이요? 잘했어요. 내일은 45분 해봐요. 딱 3분만 더요."
                  </p>
                </div>

                <Link href="/daily"
                  className="mt-3 w-full py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(to right, #B45309, #D97706)', color: 'white' }}>
                  📜 오늘의 문제 풀기
                </Link>
              </div>

              </div>{/* /우측 컬럼 */}

            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

const MISSIONS = [
  { id: 1, text: 'Part 5 이하 10문제 풀기', done: true,  tag: null },
  { id: 2, text: '첫 분사구문 마스터하기 확인', done: false, tag: 'AI 분석' },
  { id: 3, text: 'AI 강사와 1분 결과 데이터 분석', done: false, tag: null },
  { id: 4, text: "오늘 수업 '모이기' 마무리 표시", done: false, tag: null },
  { id: 5, text: '오늘의 일일 단어 문제 풀기', done: false, tag: null },
]

const INST_NAME: Record<string, string> = { park: '박혜원', jang: '장연지', kim: '김토익', jeong: '정은순', lee: '이인호' }
const INST_MESSAGES: Record<string, string> = {
  park: '오늘 Part 5 딱 10문제만 해. 그거면 충분해. 작은 게 쌓이는 거야.',
  jang: '오늘 못 풀어도 괜찮아요 😊 한번 읽기만 해도 오늘은 성공이에요.',
  kim: '바쁘면 5분만요. Part 5 한 섹션만 봐도 오늘 학습은 진짜 성공이에요.',
  jeong: '틀려도 괜찮아요 💜 오늘 한 단어만 기억해도 충분해요. 응원해요!',
  lee: '데이터 보니까 분사구문이 약점이야. 딱 이거 하나만 잡자. 빠르게.',
}
const INST_THUMBS: Record<string, string> = {
  park: '/image_reference/park-2.jpg',
  jang: '/image_reference/jang.png',
  kim: '/image_reference/kim.png',
  jeong: '/image_reference/jung.png',
  lee: '/image_reference/lee.png',
}

const NAV = [
  {
    label: '홈', active: true, href: '/dashboard',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={a ? '#4F46E5' : 'none'} stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: '내 학습', active: false, href: '/my-learning',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: '현황', active: false, href: '/status',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: '알림', active: false, href: '#',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
]

const SETTINGS_ICON = (a: boolean) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#4F46E5' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

/* ── 사이드바 ── */
function Sidebar({ open, setOpen }: {
  open: boolean; setOpen: (v: boolean) => void
}) {
  return (
    <aside className={`hidden md:flex flex-col bg-[#F8FAFF] border-r border-[#ECEAF5] h-screen sticky top-0 shrink-0 z-30 transition-all duration-300 overflow-hidden ${open ? 'w-[240px]' : 'w-[56px]'}`}>
      <div className={`flex items-center min-h-[60px] shrink-0 ${open ? 'px-5 justify-between' : 'justify-center'}`}>
        {open && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[10px] tracking-tight">YBM</span>
            </div>
            <span className="text-[#1C1B33] font-bold text-[15px]">AI Course</span>
          </div>
        )}
        <button onClick={() => setOpen(!open)} className="w-7 h-7 rounded-lg bg-[#ECEAF5] hover:bg-[#DDD9F7] flex items-center justify-center transition-all shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" className={`transition-transform duration-300 ${!open ? 'rotate-180' : ''}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav className={`flex-1 space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
        {NAV.map((item) => (
          <Link key={item.label} href={item.href ?? '#'}
            className={`w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#6B7280] hover:bg-[#EEF2FF] hover:text-[#4F46E5]'}`}>
            <span className="shrink-0">{item.icon(item.active)}</span>
            {open && <span className="animate-fade-in">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className={`${open ? 'px-3' : 'px-2'} mb-3`}>
        <div className="mb-2"><div className="h-px bg-[#ECEAF5]" /></div>
        <Link href="/settings/account" className={`w-full flex items-center rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'}`}>
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#ECEAF5] flex items-center justify-around px-2 pt-2 pb-6 z-50">
      {items.map((item) => (
        <Link key={item.label} href={item.href ?? '#'} className={`flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`}>
          {item.icon(item.active)}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

/* ── 정규 대시보드 ── */
function RegularDashboard() {
  const { userName, selectedInstructor, targetScore, examDate } = useOnboardingStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [missions, setMissions] = useState(MISSIONS)

  const instName = INST_NAME[selectedInstructor ?? 'park'] ?? '박혜원'
  const completedCount = missions.filter((m) => m.done).length
  const completedPct = Math.round((completedCount / missions.length) * 100)

  const [typedMsg, setTypedMsg] = useState('')
  const [typingDone, setTypingDone] = useState(false)

  useEffect(() => {
    const msg = INST_MESSAGES[selectedInstructor ?? 'park'] ?? ''
    setTypedMsg('')
    setTypingDone(false)
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
  }, [selectedInstructor])

  const ddayLabel = useMemo(() => {
    if (!examDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exam = new Date(examDate); exam.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
    return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
  }, [examDate])

  const WEEK = useMemo(() => {
    const today = new Date()
    const dow = today.getDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const isToday = d.toDateString() === today.toDateString()
      const isPast = d < today && !isToday
      return {
        day: ['월', '화', '수', '목', '금', '토', '일'][i],
        date: d.getDate(),
        status: isToday ? 'current' : isPast ? 'complete' : 'pending',
      }
    })
  }, [])

  const toggleMission = (id: number) =>
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m)))

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── 모바일 헤더 ── */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1C1B33] text-[20px] font-bold leading-snug">{userName || '학습자'}님 👋</p>
              {ddayLabel && (
                <span className="inline-block mt-1 text-[11px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
                  토익 시험 {ddayLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#F59E0B] bg-[#FEF9C3] px-2.5 py-1.5 rounded-full shrink-0">
                🔥 12일 연속
              </span>
              <a 
                href="https://exam.toeic.co.kr/" 
                target="_blank" 
                rel="noopener noreferrer"
                title="토익 시험 접수하기" 
                className="w-9 h-9 rounded-full bg-white border border-[#EBEBF0] flex items-center justify-center text-[#6B7280] hover:text-[#4F46E5] hover:border-[#4F46E5] transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              </a>
              <button className="relative w-9 h-9 rounded-full bg-[#FAFAFA] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>
              <AccountMenu userName={userName ?? ''} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-5 pb-28 md:pb-10">
          <div className="max-w-[1000px] mx-auto w-full space-y-4">

            {/* ── 데스크탑 상단 상태 바 ── */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#F59E0B] bg-[#FEF9C3] border border-[#FDE68A] px-3 py-1.5 rounded-full">
                  🔥 12일 연속 학습 중
                </span>
                {ddayLabel && (
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#4F46E5] bg-[#EEF2FF] border border-[#C7D2FE] px-3 py-1.5 rounded-full">
                    📅 토익 시험 {ddayLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href="https://exam.toeic.co.kr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white border border-[#EBEBF0] text-[#5B5A72] hover:text-[#4F46E5] hover:border-[#4F46E5] text-[12px] font-bold px-4 py-2 rounded-full transition-all"
                >
                  토익 시험 접수하기
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
                <AccountMenu userName={userName ?? ''} />
              </div>
            </div>

            {/* ── 히어로 카드 ── */}
            <div className="relative overflow-hidden rounded-2xl min-h-[180px] md:min-h-[220px]"
              style={{ background: 'linear-gradient(135deg, #EAE8FF 0%, #D5CEFF 50%, #C7D2FE 100%)' }}>
              {/* 장식 블롭 */}
              <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-[#818CF8]/20 blur-3xl pointer-events-none" />
              <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full bg-[#A5B4FC]/25 blur-2xl pointer-events-none" />

              {/* D-Day + 연속 스탯 카드 */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-2.5 z-10">
                <div className="bg-white/85 backdrop-blur-sm rounded-2xl px-4 py-3 text-center shadow-md min-w-[120px]">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">토익 시험</p>
                  <p className="text-[28px] font-black text-[#4F46E5] leading-none">{ddayLabel ?? 'D-?'}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">남은 날</p>
                </div>
                <div className="bg-white/85 backdrop-blur-sm rounded-2xl px-4 py-3 text-center shadow-md">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">연속 학습</p>
                  <p className="text-[28px] font-black text-[#F59E0B] leading-none">12</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">일째 🔥</p>
                </div>
              </div>

              {/* 텍스트 */}
              <div className="relative z-10 p-6 md:p-8 max-w-[420px] sm:max-w-[480px]">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4F46E5] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />
                  {instName} 선생님의 오늘의 처방
                </span>
                <h2 className="text-[#1C1B33] text-[17px] md:text-[20px] font-bold leading-snug">
                  {userName || '학습자'}님, 오늘은<br />
                  <span className="text-[#4F46E5]">{missions.length}개 미션</span>으로 충분해요.
                </h2>

                {/* 카카오톡 말풍선 */}
                <div className="mt-4 flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-[#EEF2FF]">
                    <img
                      src={INST_THUMBS[selectedInstructor ?? 'park']}
                      alt={instName}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <div className="relative bg-white rounded-2xl rounded-bl-none px-3.5 py-2.5 shadow-md max-w-[240px]">
                    <p className="text-[#1C1B33] text-[12px] leading-relaxed">
                      {typedMsg}
                      {!typingDone && (
                        <span className="inline-block w-[2px] h-3 bg-[#4F46E5] animate-pulse ml-0.5 align-middle rounded-full" />
                      )}
                    </p>
                    {/* 말풍선 꼬리 */}
                    <div className="absolute -bottom-[6px] left-0 w-0 h-0"
                      style={{ borderLeft: '7px solid white', borderRight: '7px solid transparent', borderTop: '7px solid white' }} />
                  </div>
                  {typingDone && (
                    <span className="text-[10px] text-[#9CA3AF] self-end mb-0.5 shrink-0">방금</span>
                  )}
                </div>

                <a
                  href="https://aiacademy-classroom.vercel.app/"
                  className="mt-5 inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-colors shadow-lg shadow-[#4F46E5]/30 active:scale-[0.98]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  오늘 수업 시작하기
                </a>
              </div>
            </div>

            {/* ── 3열 섹션 ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 이번 주 루틴 — 습관 트래커 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#1C1B33] font-bold text-[14px]">이번 주 루틴</h3>
                  <span className="text-[11px] font-semibold text-[#F59E0B] bg-[#FEF9C3] px-2.5 py-1 rounded-full">🔥 12일 연속</span>
                </div>

                {/* 마일스톤 */}
                {(() => {
                  const doneCount = WEEK.filter(d => d.status === 'complete').length
                  const remaining = 7 - doneCount
                  return (
                    <div className="bg-[#F5F3FF] rounded-xl px-3 py-2 text-center">
                      <p className="text-[12px] font-bold text-[#4F46E5]">
                        {remaining > 0
                          ? <>🎁 7일 연속 달성까지 <span className="text-[15px]">{remaining}</span>일!</>
                          : <>🎉 이번 주 완주 성공!</>}
                      </p>
                    </div>
                  )
                })()}

                {/* 요일별 원형 체크 */}
                <div className="flex items-center justify-between">
                  {WEEK.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold transition-all ${
                        d.status === 'complete'
                          ? 'bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/40'
                          : d.status === 'current'
                          ? 'bg-white border-[2.5px] border-[#4F46E5] text-[#4F46E5] shadow-sm'
                          : 'bg-[#F3F4F6] text-[#D1D5DB]'
                      }`}>
                        {d.status === 'complete' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        ) : (
                          <span className="text-[11px]">{d.date}</span>
                        )}
                      </div>
                      <span className={`text-[9px] font-medium ${d.status === 'current' ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`}>{d.day}</span>
                    </div>
                  ))}
                </div>

                {/* 세그먼트 바 */}
                <div className="flex gap-1">
                  {WEEK.map((d, i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                      d.status === 'complete' ? 'bg-[#4F46E5]' : d.status === 'current' ? 'bg-[#C7D2FE]' : 'bg-[#F3F4F6]'
                    }`} />
                  ))}
                </div>

                <p className="text-[11px] text-[#9CA3AF] leading-[1.6]">
                  오늘 미션 {completedCount} / {missions.length} 완료 · 흐름을 이어가고 있어요 👍
                </p>
              </div>

              {/* 오늘의 미션 리스트 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] overflow-hidden">
                <div className="h-1 bg-[#FAFAFA]">
                  <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] h-full transition-all duration-500" style={{ width: `${completedPct}%` }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[#1C1B33] font-bold text-[14px]">오늘의 미션 리스트</h3>
                    <span className="text-[#4F46E5] font-semibold text-[11px] bg-[#EEF2FF] px-2.5 py-1 rounded-full">{completedPct}% 완료</span>
                  </div>
                  <div className="space-y-2">
                    {missions.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMission(m.id)}
                        className="cursor-pointer flex items-center gap-3 p-3 rounded-xl border border-[#ECEAF5] hover:border-[#C7D2FE] transition-all active:scale-[0.98]"
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${m.done ? 'bg-[#10B981]' : 'border-2 border-[#D1D5DB] bg-white'}`}>
                          {m.done && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <p className={`text-[13px] flex-1 leading-snug ${m.done ? 'text-[#9CA3AF] line-through' : 'text-[#1C1B33] font-medium'}`}>
                          {m.text}
                        </p>
                        {m.tag && !m.done && (
                          <span className="text-[10px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-1.5 py-0.5 rounded-md shrink-0">{m.tag}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오늘의 소셜 챌린저 */}
              <div className="bg-white rounded-2xl border border-[#ECEAF5] shadow-[0_1px_8px_rgba(79,70,229,0.06)] p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] flex items-center justify-center text-[20px] shrink-0">🏆</div>
                  <h3 className="text-[#1C1B33] font-bold text-[14px]">오늘의 데일리 챌린지</h3>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-[#6B7280]">전체 유저 달성률</span>
                    <span className="text-[12px] font-bold text-[#4F46E5]">75%</span>
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] h-full rounded-full transition-all" style={{ width: '75%' }} />
                  </div>
                </div>

                <p className="text-[#374151] text-[13px] leading-relaxed">
                  전체 유저 <span className="font-bold text-[#4F46E5]">75%</span>가 넘긴 일일 문제!
                </p>
                <p className="text-[#9CA3AF] text-[12px] mt-0.5 mb-auto">지금 <span className="font-semibold text-[#374151]">923명</span>이 도전 중입니다.</p>

                <Link href="/daily" className="mt-4 w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[#4F46E5]/20 active:scale-[0.98]">
                  ⚡ 오늘의 데일리 문제 풀기
                </Link>
              </div>

            </div>

          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

/* ── 대시보드 라우터 ── */
export default function Dashboard() {
  const { selectedInstructor } = useOnboardingStore()
  if (selectedInstructor === 'oh') return <OjjDashboard />
  return <RegularDashboard />
}
