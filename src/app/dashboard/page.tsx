'use client'
import Link from 'next/link'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useState, useMemo, useEffect } from 'react'
import AccountMenu from '@/components/AccountMenu'
import { Noto_Serif_KR, Diphylleia } from 'next/font/google'

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
    <div className={`${notoSerifKR.variable} ${diphylleia.variable} flex min-h-screen bg-[#FAFAFA] font-sans text-[#1C1B33]`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="md:hidden px-4 pt-12 pb-3 bg-white border-b border-[#EBEBF0] sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1C1B33] text-[20px] font-bold">{userName || '학습자'}님 👵</p>
              {ddayLabel && <span className="inline-block mt-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">토익 시험 {ddayLabel}</span>}
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
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1.5 rounded-full">
                    📅 토익 시험 {ddayLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a href="https://exam.toeic.co.kr/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white border border-[#EBEBF0] text-[#5B5A72] hover:text-[#2563EB] hover:border-[#2563EB] text-[12px] font-bold px-4 py-2 rounded-full transition-all">
                  토익 시험 접수하기
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
                <AccountMenu userName={userName ?? ''} />
              </div>
            </div>

            {/* ── 히어로 3-카드 ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 1. 명언 족자 */}
              <div className="flex items-stretch rounded-2xl overflow-hidden shadow-md" style={{ minHeight: '190px' }}>
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
              <div className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 55%, #BFDBFE 100%)' }}>
                <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-[#60A5FA]/15 blur-3xl pointer-events-none" />
                <span className="self-start inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                  오정자 선생님의 오늘 처방전 📋
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
                <a href="https://aiacademy-classroom.vercel.app/"
                  className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 rounded-xl font-bold text-[13px] transition-colors shadow-md shadow-[#2563EB]/25 active:scale-[0.98]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  1:1 학습 시작하기
                </a>
              </div>

              {/* 3. 동기부여 — D-day + 연속학습 */}
              <div className="rounded-2xl p-5 flex flex-col justify-between"
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
                    <span className="text-[22px] leading-none">🔥</span>
                    <div>
                      <p className="text-[22px] font-black text-white leading-none">12일</p>
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
                const TODAY = 13
                const MILESTONES: Record<number, string> = { 7: '🏆', 14: '⭐', 21: '🏆', 30: '🎯', 42: '⭐', 55: '🏆', 66: '👑' }
                const COLS = 11
                const TOTAL_CELLS = Math.ceil(66 / COLS) * COLS // 72
                return (
                  <div className="bg-white rounded-2xl border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#1C1B33] font-bold text-[14px]">66일 연속 달성 🏅</h3>
                      <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-full">🔥 {TODAY - 1}일째</span>
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
              <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_8px_rgba(37,99,235,0.06)] border border-[#DBEAFE]">
                <div className="h-1 bg-[#EFF6FF]">
                  <div className="h-full transition-all duration-500 rounded-r-full from-[#2563EB] to-[#1D4ED8] bg-gradient-to-r"
                    style={{ width: `${Math.round((doneCount / missions.length) * 100)}%` }} />
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
              <div className="bg-white rounded-2xl p-5 flex flex-col shadow-[0_1px_8px_rgba(37,99,235,0.06)] border border-[#DBEAFE]">
                <h3 className="font-bold text-[14px] mb-1">오늘의 학습량</h3>
                <p className="text-[10px] text-[#9CA3AF] mb-4">선생님이 직접 확인했어요 👀</p>

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
                    👵 "42분이요? 잘했어요. 내일은 45분 해봐요. 딱 3분만 더요."
                  </p>
                </div>

                <Link href="/daily"
                  className="mt-3 w-full py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.98] bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white">
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

export const INST_NAME: Record<string, string> = { park: '박혜원', jang: '장연지', kim: '김토익', jeong: '정은순', lee: '이인호', oh: '오정자' }
export const INST_MESSAGES: Record<string, { dashboard: string[]; status: string[] }> = {
  park: {
    dashboard: [
      '오늘 Part 5 딱 10문제만 해. 그거면 충분해. 작은 게 쌓이는 거야.',
      '지금 바로 켜. 고민하는 시간에 이미 한 문제 풀 수 있어.',
      '어제보다 1%만 나으면 돼. 오늘 그 1% 채우러 가자.',
      '목표 점수까지 77점 남았어. 지금 시작하면 이번 달 안에 닿아.',
      '틀린 문제가 곧 보물이야. 오늘 오답 한 개라도 제대로 파고들어 봐.',
    ],
    status: [
      '정답률은 좋은데 속도가 문제야. Part 5에서 시간 다 쓰면 Part 7은 구경도 못 해.',
      '오답 패턴 보니까 전치사에서 자꾸 실수하네. 이건 개념 부족이 아니라 꼼꼼함 부족이야.',
      '지금 수준에서는 아는 걸 안 틀리는 게 제일 중요해. 실수도 실력인 거 알지?',
      '데이터가 거짓말하나? 공부 시간은 늘었는데 효율이 제자리야. 집중해서 풀어.',
      '단어장만 넘기지 말고 문장 구조를 봐. 동사 자리인지 아닌지 그것부터 파악해.',
    ],
  },
  jang: {
    dashboard: [
      '오늘 못 풀어도 괜찮아요 😊 한번 읽기만 해도 오늘은 성공이에요.',
      '시작이 반이에요. 앱 켠 것만으로도 이미 훌륭해요 🌸',
      '천천히 가도 괜찮아요. 포기만 안 하면 반드시 올라가요.',
      '오늘 5분도 충분해요. 그 5분이 쌓여서 점수가 된답니다.',
      '오늘 학습 후 뿌듯함을 미리 상상해봐요 ✨ 바로 시작해요!',
    ],
    status: [
      '전체적으로 많이 안정됐어요! 다만 수동태 부분이 조금 흔들리니 오늘만 한 번 더 봐요 😊',
      '꾸준함은 1등이에요! 이제는 정확도를 조금만 더 높여볼까요? 할 수 있어요 ✨',
      '틀린 개수에 너무 상심 마요. 오답 노트 쓴 만큼 점수는 반드시 올라가니까요.',
      '학습 리듬이 정말 좋아요. RC 독해 속도만 조금 더 붙으면 목표 점수 금방이에요!',
      '어려운 문제도 포기 안 하고 끝까지 푼 거 봤어요. 그 끈기가 결국 결과를 만들 거예요.',
    ],
  },
  kim: {
    dashboard: [
      '바쁘면 5분만요. Part 5 한 섹션만 봐도 오늘 학습은 진짜 성공이에요.',
      '토익은 전략이에요. 빈칸 먼저 읽고 품사 확인 — 이것만 해도 5점 올라요.',
      '자투리 10분, 단어 10개. 매일 하면 한 달에 300개예요.',
      '오늘 목표: 어제 틀린 문제 3개 복습. 거기서 점수 올라와요.',
      'Part 7은 시간 싸움이에요. 오늘 속독 1회분만 타이머 켜고 도전!',
    ],
    status: [
      '데이터를 보면 Part 6 문맥 파악이 약점입니다. 문장 간 연결어 위주로 복습하세요.',
      '현재 추세라면 다음 시험에서 700점 돌파 가능합니다. 오답 소거법 연습에 집중하세요.',
      '정답률 60%대 정체기는 어휘량 부족 때문입니다. 하루 30개씩 더 외워야 합니다.',
      'LC는 강점이지만 RC 시제 파트에서 감점이 큽니다. since/for 구분 확실히 하세요.',
      '시간 배분 전략을 수정합시다. Part 5는 10분 컷을 목표로 훈련해야 합니다.',
    ],
  },
  jeong: {
    dashboard: [
      '틀려도 괜찮아요 💜 오늘 한 단어만 기억해도 충분해요. 응원해요!',
      '오늘도 화면 켜준 것만으로 대단해요! 같이 한 문제씩 가봐요 💪',
      '조급해하지 마요. 당신은 분명히 할 수 있어요. 오늘도 믿어요.',
      '작은 성공이 큰 자신감이 돼요. 오늘 한 파트만 완주해봐요!',
      '지금 이 순간이 나중에 감사하게 될 선택이에요. 오늘도 함께해요 ☺️',
    ],
    status: [
      '조금씩 성장하는 게 눈에 보여요 💜 오늘은 틀린 문제들 다시 읽어보는 것부터 시작해요.',
      '기초가 탄탄해지고 있어요. 이제 스스로를 믿고 더 어려운 문제에도 도전해봐요!',
      '어제보다 오답이 줄었어요! 대단해요. 이 기세를 몰아서 문법 한 파트만 더 볼까요?',
      '컨디션에 따라 점수가 흔들릴 수 있어요. 흔들리지 않는 기본기를 같이 만들어가요.',
      '당신의 노력을 AI는 다 알고 있어요. 오늘도 어제만큼만 하면 충분히 성공이에요.',
    ],
  },
  lee: {
    dashboard: [
      '데이터 보니까 분사구문이 약점이야. 딱 이거 하나만 잡자. 빠르게.',
      '3일 연속 학습하면 기억 정착률 47% 올라가. 오늘 빠지면 리셋이야.',
      'Part 5 정답률 61%. 70%까지 딱 9% 남았어. 오늘 집중하면 닿아.',
      '학습 효율 최상위권은 복습 비중이 60%야. 오늘 복습 먼저.',
      '시제 오답 패턴이 반복돼. since/for 차이 오늘 완전히 정리하자.',
    ],
    status: [
      '분사구문 정답률 40% 미만. 구조 분석부터 다시 해야 합니다. 원리를 이해하세요.',
      '비즈니스 이메일 지문에서 오답이 집중됩니다. 상황별 빈출 어휘 리스트를 확인하세요.',
      '학습 밀도가 낮습니다. 한 번 풀 때 타이머를 켜고 긴장감을 유지하며 푸는 연습이 필요합니다.',
      '관계대명사 격 구분 실수가 반복됩니다. 주격/목적격 자리를 시각화해서 외우세요.',
      '오답을 분석해보면 함정 보기에 잘 걸리는 타입입니다. 끝까지 읽는 습관을 들이세요.',
    ],
  },
  oh: {
    dashboard: [
      '오늘도 왔네요. 자, 화장실 먼저 다녀오고 시작해요.',
      '서두르지 말아요. 천천히 한 문제씩 하면 돼요.',
      '어제 틀린 거 오늘 다시 보면 돼요. 그게 공부예요.',
      '오늘 30분만 해봐요. 딱 30분만. 그것만 해도 충분해요.',
      '앉아있는 게 공부예요. 오늘도 잘 왔어요.',
    ],
    status: [
      '이번 주 분석 보니까 전치사에서 자꾸 틀리네요. 천천히 by랑 until 구분 한 번 봐요.',
      '틀린 게 많아도 괜찮아요. 중요한 건 오늘도 앉아서 한 거예요. 잘하고 있어요.',
      '데이터 보니까 LC는 괜찮은데 RC가 조금 약해요. 독해 한 지문씩 천천히 읽어봐요.',
      '정확도보다 꾸준함이 먼저예요. 오늘도 빠지지 않고 한 거, 선생님이 봤어요.',
      '다음 시험까지 지금 페이스 유지하면 충분해요. 무리하지 말고 천천히 가요.',
    ],
  },
}
export const INST_THUMBS: Record<string, string> = {
  park: '/image_reference/park-2.jpg',
  jang: '/image_reference/jang.png',
  kim: '/image_reference/kim.png',
  jeong: '/image_reference/jung.png',
  lee: '/image_reference/lee.png',
  oh: '/image_reference/ojungja.jpg',
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
    label: '내 학습', active: false, href: '/my-learning',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#2563EB' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
    label: '알림', active: false, href: '#',
    icon: (a: boolean) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a ? '#2563EB' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
        {NAV.map((item) => (
          <Link key={item.label} href={item.href ?? '#'}
            className={`w-full flex items-center rounded-xl text-[13px] font-medium transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${item.active ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]'}`}>
            <span className="shrink-0">{item.icon(item.active)}</span>
            {open && <span className="animate-fade-in">{item.label}</span>}
          </Link>
        ))}
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
      {items.map((item) => (
        <Link key={item.label} href={item.href ?? '#'} className={`flex flex-col items-center gap-1 min-w-[52px] py-1 ${item.active ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>
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
  const [msgIdx, setMsgIdx] = useState(0)

  const currentMessages = INST_MESSAGES[selectedInstructor ?? 'park']?.dashboard ?? []

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
                <span className="inline-block mt-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
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
                className="w-9 h-9 rounded-full bg-white border border-[#EBEBF0] flex items-center justify-center text-[#6B7280] hover:text-[#2563EB] hover:border-[#2563EB] transition-all"
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-[#FEF9C3] border border-[#FDE68A] px-4 py-2.5 rounded-2xl">
                  <span className="text-[22px] leading-none">🔥</span>
                  <div>
                    <p className="text-[22px] font-black text-[#D97706] leading-none">12일</p>
                    <p className="text-[10px] text-[#92400E] font-semibold">연속 학습 중</p>
                  </div>
                </div>
                {ddayLabel && (
                  <div className="flex items-center gap-2.5 bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-2.5 rounded-2xl">
                    <span className="text-[22px] leading-none">📅</span>
                    <div>
                      <p className="text-[22px] font-black text-[#2563EB] leading-none">{ddayLabel}</p>
                      <p className="text-[10px] text-[#3B82F6] font-semibold">토익 시험</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href="https://exam.toeic.co.kr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white border border-[#EBEBF0] text-[#5B5A72] hover:text-[#2563EB] hover:border-[#2563EB] text-[12px] font-bold px-4 py-2 rounded-full transition-all"
                >
                  토익 시험 접수하기
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
                <AccountMenu userName={userName ?? ''} />
              </div>
            </div>

            {/* ── 히어로 2-카드 ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 왼쪽: 강사 한마디 */}
              <div className="relative overflow-hidden rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 55%, #BFDBFE 100%)' }}>
                <div className="absolute -right-6 -top-6 w-48 h-48 rounded-full bg-[#60A5FA]/15 blur-3xl pointer-events-none" />
                <div className="relative z-10 p-5 flex flex-col gap-3">
                  <span className="self-start inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB] bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                    {instName} 선생님의 오늘의 처방
                  </span>
                  <div className="flex gap-4 items-center">
                    {/* 강사 사진 */}
                    {(selectedInstructor ?? 'park') === 'park' ? (
                      <div className="w-[108px] h-[152px] shrink-0 drop-shadow-md">
                        <img
                          src="/image_reference/park-report.png"
                          alt={instName}
                          className="w-full h-full object-contain object-bottom"
                        />
                      </div>
                    ) : (
                      <div className="w-[80px] h-[108px] rounded-2xl overflow-hidden shrink-0 shadow-md border-2 border-white/70">
                        <img
                          src={INST_THUMBS[selectedInstructor ?? 'park']}
                          alt={instName}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    )}
                    {/* 말풍선 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#6B7280] font-medium mb-1.5">{instName} 선생님</p>
                      <div className="relative bg-white rounded-2xl px-4 py-3.5 shadow-md">
                        <div className="h-[66px] overflow-hidden">
                          <p className="text-[13px] text-[#1C1B33] leading-relaxed">
                            {typedMsg}
                            {!typingDone && (
                              <span className="inline-block w-[2px] h-3 bg-[#2563EB] animate-pulse ml-0.5 align-middle rounded-full" />
                            )}
                          </p>
                        </div>
                        {/* 말풍선 꼬리 — 왼쪽 방향 */}
                        <div className="absolute -left-[7px] top-[18px] w-0 h-0"
                          style={{ borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '7px solid white' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 수업 시작하기 */}
              <div className="rounded-2xl p-5 flex flex-col justify-between"
                style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)' }}>
                <div>
                  <p className="text-white/60 text-[11px] font-semibold tracking-wide uppercase mb-2">오늘의 학습</p>
                  <p className="text-white text-[17px] font-bold leading-snug mb-1">Part 5 문법 + 단어 5개</p>
                  <p className="text-white/70 text-[12px]">예상 시간 약 15분 · 놓친 복습 2개</p>
                </div>
                <div className="mt-4 space-y-2.5">
                  <a
                    href="https://aiacademy-classroom.vercel.app/"
                    className="w-full bg-white text-[#2563EB] py-3 rounded-xl font-black text-[14px] flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-lg active:scale-[0.98]"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#2563EB"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    오늘 수업 시작하기
                  </a>
                  <p className="text-center text-white/50 text-[11px]">토익 초보야, 오늘도 화이팅 💪</p>
                </div>
              </div>

            </div>

            {/* ── 3열 섹션 ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 66일 해빗 트래커 */}
              <div className="bg-white rounded-2xl border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#1C1B33] font-bold text-[14px]">66일 챌린지</h3>
                  <span className="text-[11px] font-semibold text-[#F59E0B] bg-[#FEF9C3] px-2.5 py-1 rounded-full">🔥 12일 연속</span>
                </div>

                {/* 격자 그리드 */}
                <div className="relative">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '3px' }}>
                    {Array.from({ length: 66 }, (_, i) => {
                      const day = i + 1
                      const isDone = day < 12
                      const isToday = day === 12
                      const isMilestone = day === 30 || day === 66
                      return (
                        <div
                          key={day}
                          title={day === 30 ? '30일 마일스톤' : day === 66 ? '66일 완주!' : undefined}
                          className={`aspect-square rounded-[3px] ${
                            isDone
                              ? 'bg-[#2563EB] opacity-75'
                              : isToday
                              ? 'bg-[#2563EB] animate-pulse ring-2 ring-[#2563EB] ring-offset-1'
                              : isMilestone
                              ? 'bg-[#FCD34D]/50 border border-[#F59E0B]/60'
                              : 'bg-[#F3F4F6]'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] text-[#9CA3AF]">1일</span>
                    <span className="text-[9px] font-bold text-[#2563EB]">12일차 🔥 오늘</span>
                    <span className="text-[9px] text-[#9CA3AF]">66일</span>
                  </div>
                </div>

                {/* 마일스톤 보상 */}
                <div className="flex items-stretch gap-1.5">
                  <div className="flex-1 flex flex-col items-center gap-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-1.5 py-2">
                    <span className="text-[15px]">☕</span>
                    <p className="text-[9px] font-black text-[#2563EB]">12일 ✅</p>
                    <p className="text-[9px] text-[#6B7280] text-center leading-tight">아메리카노<br/>쿠폰</p>
                  </div>
                  <div className="flex items-center text-[#D1D5DB] text-[10px]">›</div>
                  <div className="flex-1 flex flex-col items-center gap-1 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-1.5 py-2">
                    <span className="text-[15px]">📖</span>
                    <p className="text-[9px] font-black text-[#D97706]">30일</p>
                    <p className="text-[9px] text-[#6B7280] text-center leading-tight">교재<br/>20% 할인</p>
                  </div>
                  <div className="flex items-center text-[#D1D5DB] text-[10px]">›</div>
                  <div className="flex-1 flex flex-col items-center gap-1 bg-[#FEF3C7] border border-[#F59E0B] rounded-xl px-1.5 py-2">
                    <span className="text-[15px]">🏆</span>
                    <p className="text-[9px] font-black text-[#B45309]">66일</p>
                    <p className="text-[9px] text-[#6B7280] text-center leading-tight">수료증 +<br/>특별 선물</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#9CA3AF] leading-[1.6]">
                  오늘 미션 {completedCount} / {missions.length} 완료 · 흐름을 이어가고 있어요 👍
                </p>
              </div>

              {/* 오늘의 미션 리스트 */}
              <div className="bg-white rounded-2xl border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] overflow-hidden">
                <div className="h-1 bg-[#FAFAFA]">
                  <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] h-full transition-all duration-500" style={{ width: `${completedPct}%` }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[#1C1B33] font-bold text-[14px]">오늘의 미션 리스트</h3>
                    <span className="text-[#2563EB] font-semibold text-[11px] bg-[#EFF6FF] px-2.5 py-1 rounded-full">{completedPct}% 완료</span>
                  </div>
                  <div className="space-y-2">
                    {missions.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMission(m.id)}
                        className="cursor-pointer flex items-center gap-3 p-3 rounded-xl border border-[#DBEAFE] hover:border-[#BFDBFE] transition-all active:scale-[0.98]"
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
                          <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded-md shrink-0">{m.tag}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오늘의 소셜 챌린저 */}
              <div className="bg-white rounded-2xl border border-[#DBEAFE] shadow-[0_1px_8px_rgba(37,99,235,0.06)] p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] flex items-center justify-center text-[20px] shrink-0">🏆</div>
                  <h3 className="text-[#1C1B33] font-bold text-[14px]">오늘의 데일리 챌린지</h3>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-[#6B7280]">전체 유저 달성률</span>
                    <span className="text-[12px] font-bold text-[#2563EB]">75%</span>
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] h-full rounded-full transition-all" style={{ width: '75%' }} />
                  </div>
                </div>

                <p className="text-[#374151] text-[13px] leading-relaxed">
                  전체 유저 <span className="font-bold text-[#2563EB]">75%</span>가 넘긴 일일 문제!
                </p>
                <p className="text-[#9CA3AF] text-[12px] mt-0.5 mb-auto">지금 <span className="font-semibold text-[#374151]">923명</span>이 도전 중입니다.</p>

                <Link href="/daily" className="mt-4 w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-[#2563EB]/20 active:scale-[0.98]">
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
