'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { loadProfileFromSupabase } from '@/lib/profile'
import { useOnboardingStore } from '@/store/onboardingStore'

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
      </svg>
    ),
    title: 'AI 약점 진단',
    desc: '풀이 패턴을 분석해 내 약점을 자동으로 찾아줘요',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    title: '강사 맞춤 루틴',
    desc: 'YBM 스타 강사 스타일로 매일 학습 계획을 설계해요',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: '오답 패턴 분석',
    desc: '틀린 문제의 유형을 파악해 반복 실수를 줄여줘요',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const store = useOnboardingStore()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeProgress, setWelcomeProgress] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setChecking(false)
    })
  }, [])

  const loginWith = async (email: string, pw: string) => {
    setError('')
    setLoading(true)
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) {
      setError('아이디 또는 비밀번호가 올바르지 않아요.')
      setLoading(false)
      return
    }
    setShowWelcome(true)
    setWelcomeProgress(30)
    setTimeout(() => setWelcomeProgress(70), 600)
    const profile = await loadProfileFromSupabase(signInData.user?.id).catch(() => null)
    if (profile?.userName) {
      if (profile.userName) store.setUserName(profile.userName)
      if (profile.rangeAxis) store.setRangeAxis(profile.rangeAxis)
      if (profile.rhythm) store.setRhythm(profile.rhythm)
      if (profile.difficulty) store.setDifficulty(profile.difficulty)
      if (profile.motivation) store.setMotivation(profile.motivation)
      if (profile.targetScore) store.setTargetScore(profile.targetScore)
      if (profile.studyPeriod) store.setStudyPeriod(profile.studyPeriod)
      if (profile.examDate) store.setExamDate(profile.examDate)
      if (profile.dailyTime) store.setDailyTime(profile.dailyTime)
      if (profile.selectedInstructor) store.setSelectedInstructor(profile.selectedInstructor)
      if (profile.studyRange) store.setStudyRange(profile.studyRange)
      setWelcomeProgress(100)
      setTimeout(() => router.replace('/dashboard'), 600)
    } else {
      setWelcomeProgress(100)
      setTimeout(() => router.replace('/onboarding'), 600)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim()) return
    await loginWith(`${id.trim()}@ybm.co.kr`, password)
  }

  const handleGuestLogin = () => loginWith('guest00@ybm.co.kr', '1234')


  if (checking) return <div className="min-h-screen bg-[#EFF6FF]" />

  if (showWelcome) return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#3B82F6] to-[#2563EB] font-sans">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex flex-col items-center gap-8 px-8 text-center">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center border border-white/25 shadow-xl backdrop-blur-sm">
          <img src="/logo.svg" alt="YBM" className="w-10 h-10 object-contain brightness-0 invert"
            onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
        </div>
        <div>
          <h1 className="text-white text-[26px] font-black leading-tight">
            YBM AI 어학원에<br />오신 것을 환영해요
          </h1>
          <p className="text-white/60 text-[14px] mt-3">잠시만 기다려주세요...</p>
        </div>
        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700 ease-out" style={{ width: `${welcomeProgress}%` }} />
        </div>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F0F4FF] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[860px] min-h-[540px] rounded-3xl overflow-hidden shadow-2xl shadow-black/10 flex flex-col md:flex-row">

        {/* ── 좌측: 비주얼 영역 ── */}
        <div className="relative md:w-[55%] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] p-8 md:p-10 flex flex-col justify-between overflow-hidden">
          {/* 배경 원형 장식 */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-[#1D4ED8]/40 rounded-full blur-3xl pointer-events-none" />

          {/* 로고 + 타이틀 */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                <img src="/logo.svg" alt="YBM" className="w-5 h-5 object-contain brightness-0 invert"
                  onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
              </div>
              <span className="text-white/90 text-[14px] font-bold tracking-wide">YBM AI 어학원</span>
            </div>

            <h1 className="text-white text-[28px] md:text-[32px] font-black leading-tight mb-2">
              토익 공부,<br />오늘 뭐 할지<br />
              <span className="text-white/70">고민하지 마세요.</span>
            </h1>
            <p className="text-white/60 text-[13px] leading-relaxed mt-3">
              AI가 약점을 분석하고<br />YBM 강사 스타일로 맞춤 루틴을 제안해요.
            </p>
          </div>

          {/* 피처 리스트 */}
          <div className="relative z-10 flex flex-col gap-3 mt-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
                <div className="text-white/80 mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <p className="text-white text-[13px] font-bold">{f.title}</p>
                  <p className="text-white/55 text-[11px] leading-snug mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 우측: 로그인 영역 ── */}
        <div className="md:w-[45%] bg-white flex flex-col justify-center px-8 md:px-10 py-10">
          <div className="mb-7">
            <h2 className="text-[#111318] text-[22px] font-black">로그인</h2>
            <p className="text-[#9CA3AF] text-[13px] mt-1">받으신 계정 정보를 입력해주세요</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* 아이디 입력 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-[12px] font-semibold">아이디</label>
              <div className={`flex items-center h-12 rounded-xl border bg-white transition-all ${id ? 'border-[#2563EB] ring-2 ring-[#2563EB]/15' : 'border-[#E5E7EB]'}`}>
                <input
                  type="text"
                  value={id}
                  onChange={e => setId(e.target.value.replace(/\s/g, ''))}
                  placeholder="guest01"
                  required
                  className="flex-1 h-full px-4 text-[14px] text-[#111318] placeholder:text-[#D1D5DB] outline-none bg-transparent rounded-l-xl"
                />
                <span className="text-[#9CA3AF] text-[13px] pr-4 select-none whitespace-nowrap">@ybm.co.kr</span>
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#374151] text-[12px] font-semibold">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 rounded-xl border border-[#E5E7EB] text-[14px] text-[#111318] placeholder:text-[#D1D5DB] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
              />
            </div>

            {error && (
              <p className="text-[#EF4444] text-[12px] font-medium -mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#93C5FD] text-white font-bold text-[15px] rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : '시작하기 →'}
            </button>
          </form>

          {/* 빠른 접속 (개발/마스터용) */}
          <div className="mt-6 pt-5 border-t border-[#F3F4F6]">
            <p className="text-[#D1D5DB] text-[10px] text-center mb-2">빠른 접속</p>
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full h-10 rounded-xl border border-dashed border-[#E5E7EB] text-[#9CA3AF] text-[12px] font-medium hover:bg-[#F9FAFB] hover:text-[#6B7280] transition-colors disabled:opacity-50"
            >
              guest00 (마스터) 로그인
            </button>
          </div>

          <p className="mt-4 text-[#D1D5DB] text-[11px] text-center">© 2026 YBM AI 어학원 · 데모 버전</p>
        </div>
      </div>
    </main>
  )
}
