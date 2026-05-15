'use client'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-onboarding px-6 text-center overflow-hidden">
      {/* 배경 패턴 (반투명 스트라이프) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }}></div>
      
      <div className="relative space-y-12 animate-fade-in z-10">
        {/* 심플 로고 아이콘 */}
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center bg-white/10 rounded-[40px] border border-white/20 backdrop-blur-md shadow-2xl animate-float">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg">
            <span className="text-slate-800 font-black text-2xl tracking-tighter italic">YBM</span>
          </div>
        </div>

        {/* 타이틀 및 설명 */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase font-display italic">
            YBM AI COURSE
          </h1>
          <p className="text-slate-300 text-lg font-medium leading-relaxed">
            AI와 스타 강사가 함께 설계한<br />
            <span className="text-white">초개인화 1:1 토익 코칭</span>
          </p>
        </div>

        {/* 시작하기 버튼 */}
        <div className="pt-4 space-y-6">
          <Link
            href="/onboarding"
            className="inline-block w-full max-w-xs bg-white text-dark-navy text-lg font-bold h-[52px] leading-[52px] rounded-xl shadow-mid hover:bg-off-white transition-all active:scale-95"
          >
            START LEARNING
          </Link>
          <p className="text-white/40 text-sm font-medium">
            이미 계정이 있으신가요? <span className="text-lavender-light underline cursor-pointer">로그인</span>
          </p>
        </div>
      </div>
    </main>
  )
}
