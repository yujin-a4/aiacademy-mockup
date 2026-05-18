'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/store/onboardingStore'

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ybm-blue overflow-hidden">
      {/* 배경 은은한 빛 효과 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative w-32 h-10 md:w-40 md:h-12 flex items-center justify-center">
        {/* 닦아내기 + 확대 애니메이션이 적용된 로고 */}
        <div className="animate-logo-wipe-scale">
          <img 
            src="/logo.svg" 
            alt="YBM Logo" 
            className="w-full h-full object-contain brightness-0 invert" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png'
            }}
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 바텀 시트 */}
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl pb-10 pt-5 px-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
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
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-ybm-blue/5 hover:border-ybm-blue/20 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-ybm-blue/10 flex items-center justify-center shrink-0">
                  <span className="text-ybm-blue font-black text-lg">
                    {profile.userName.slice(0, 1)}
                  </span>
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

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const { savedProfiles } = useOnboardingStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-ybm-bg px-6 text-center overflow-hidden">
      {showSplash && <SplashScreen />}
      
      <div className={`relative space-y-12 z-10 ${showSplash ? 'opacity-0' : 'animate-fade-in'}`}>
        {/* 심플 로고 아이콘 */}
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center bg-white rounded-[40px] border border-slate-200 shadow-xl animate-float">
          <img src="/favicon.png" alt="YBM Logo" className="w-24 h-24 object-contain" />
        </div>

        {/* 타이틀 및 설명 */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase font-display">
            YBM AI COURSE
          </h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">
            AI와 스타 강사가 함께 설계한<br />
            <span className="text-ybm-blue font-bold">초개인화 1:1 토익 코칭</span>
          </p>
        </div>

        {/* 시작하기 버튼 */}
        <div className="pt-4 space-y-6">
          <Link
            href="/onboarding"
            className="inline-block w-full max-w-xs bg-ybm-blue text-white text-lg font-bold h-[52px] leading-[52px] rounded-xl shadow-blue hover:opacity-90 transition-all active:scale-95"
          >
            START LEARNING
          </Link>
          <p className="text-slate-400 text-sm font-medium">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => setShowLogin(true)}
              className="text-ybm-blue font-bold underline cursor-pointer"
            >
              로그인
            </button>
          </p>
        </div>
      </div>

      {showLogin && <LoginSheet onClose={() => setShowLogin(false)} />}
    </main>
  )
}

