'use client'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-ybm-bg px-6 text-center overflow-hidden">
      <div className="relative space-y-12 animate-fade-in z-10">
        {/* 심플 로고 아이콘 */}
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center bg-white rounded-[40px] border border-slate-200 shadow-xl animate-float">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner">
            <span className="text-slate-800 font-black text-2xl tracking-tighter">YBM</span>
          </div>
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
            이미 계정이 있으신가요? <span className="text-ybm-blue font-bold underline cursor-pointer">로그인</span>
          </p>
        </div>
      </div>
    </main>
  )
}
