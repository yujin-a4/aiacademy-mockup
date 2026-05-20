'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ybm-blue overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="relative w-32 h-10 md:w-40 md:h-12 flex items-center justify-center">
        <div className="animate-logo-scale-in">
          <img
            src="/logo.svg"
            alt="YBM Logo"
            className="w-full h-full object-contain brightness-0 invert"
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }}
          />
        </div>
      </div>
    </div>
  )
}

function LoginSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { savedProfiles, loadProfile } = useOnboardingStore()

  const handleSelect = (name: string) => {
    loadProfile(name)
    router.push('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl pb-10 pt-5 px-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
        <h2 className="text-slate-900 font-bold text-xl mb-1">계정 선택</h2>
        <p className="text-slate-400 text-sm mb-6">학습을 이어갈 이름을 선택해주세요</p>
        {savedProfiles.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">등록된 계정이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {savedProfiles.map((profile) => (
              <button
                key={profile.userName}
                onClick={() => handleSelect(profile.userName)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-[#2563EB]/5 hover:border-[#2563EB]/20 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <span className="text-[#2563EB] font-black text-lg">{profile.userName.slice(0, 1)}</span>
                </div>
                <div>
                  <p className="text-slate-900 font-bold text-base">{profile.userName}</p>
                  <p className="text-slate-400 text-xs font-medium mt-0.5">
                    목표 {profile.targetScore ?? '-'}점 · {profile.studyPeriod ?? '-'} 플랜
                  </p>
                </div>
                <svg className="ml-auto text-slate-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full mt-4 h-11 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  )
}

const FEATURES = ['AI 진단', '오답 루틴', '1:1 코칭', '보카런']

const TRUST = [
  { icon: '🎓', text: 'YBM 강사 콘텐츠 기반' },
  { icon: '🎯', text: '목표 점수 맞춤 루틴' },
  { icon: '📊', text: '오답 패턴 자동 분석' },
]

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-ybm-bg font-sans overflow-x-hidden">
      {showSplash && <SplashScreen />}

      <div className={showSplash ? 'opacity-0' : 'animate-fade-in'}>

        {/* ── 메인 섹션 ── */}
        <section className="max-w-[640px] mx-auto px-6 md:px-12 pt-16 md:pt-28 pb-16 text-center">

          {/* 카피 + CTA */}
          <div className="space-y-7">
            {/* 배지 */}
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#2563EB] bg-[#EFF6FF] px-3 py-1.5 rounded-full border border-[#C7D2FE]">
              ✨ YBM 강사 × AI 맞춤 코칭
            </span>

            {/* 헤드라인 */}
            <h1 className="text-[34px] md:text-[46px] font-black text-[#1C1B33] leading-[1.2] tracking-tight">
              토익 공부,<br />오늘 뭐 할지<br />
              <span className="text-[#2563EB]">고민하지 마세요</span>
            </h1>

            {/* 서브타이틀 */}
            <p className="text-[15px] md:text-[16px] text-[#6B7280] leading-relaxed font-normal">
              AI가 약점을 분석하고 YBM 강사 스타일로<br />
              맞춤 루틴을 제안합니다.
            </p>

            {/* 기능 pill */}
            <div className="flex flex-wrap justify-center gap-2">
              {FEATURES.map((f) => (
                <span
                  key={f}
                  className="text-[12px] font-normal text-[#374151] bg-white border border-[#DBEAFE] px-3.5 py-1.5 rounded-full shadow-sm"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="pt-1 w-full md:w-[260px] mx-auto flex flex-col items-center gap-4">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[15px] h-[52px] px-8 rounded-xl animate-cta-pulse transition-colors active:scale-[0.98]"
              >
                AI 진단 시작하기
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <p className="text-[13px] text-[#9CA3AF] font-normal text-center">
                이미 계정이 있나요?{' '}
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-[#2563EB] font-bold hover:underline"
                >
                  로그인
                </button>
              </p>
            </div>
          </div>

          {/* 신뢰 요소 */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {TRUST.map((item) => (
              <div key={item.text} className="bg-white rounded-xl border border-[#DBEAFE] p-3 text-center shadow-sm">
                <span className="text-[18px] block mb-1">{item.icon}</span>
                <p className="text-[10px] font-semibold text-[#6B7280] leading-tight">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  )
}
