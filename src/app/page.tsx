'use client'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-onboarding px-6 text-center overflow-hidden">
      {/* 배경 패턴 (반투명 스트라이프) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }}></div>
      
      <div className="relative space-y-12 animate-fade-in z-10">
        {/* 와옹이 캐릭터 - bounce-in 애니메이션 적용 */}
        <div className="relative w-56 h-56 mx-auto animate-float">
          <Image
            src="/img/와옹이_hi.png"
            alt="와옹이"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* 타이틀 및 설명 */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase font-display italic">
            YBM AI 어학원
          </h1>
          <p className="text-lavender-light text-lg font-medium leading-relaxed">
            스타 강사와 와옹이가 함께하는<br />
            <span className="text-white">슈퍼히어로 1:1 토익 코칭</span>
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
