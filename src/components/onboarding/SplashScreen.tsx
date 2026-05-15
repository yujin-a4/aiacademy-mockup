'use client'
import { useEffect } from 'react'
import Image from 'next/image'

interface Props {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ybm-onboarding relative overflow-hidden">
      <div className="absolute top-[-80px] right-[-60px] w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-40px] w-52 h-52 rounded-full bg-ybm-blue/20 blur-2xl pointer-events-none" />

      <div className="text-center space-y-8 animate-fade-in z-10">
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center bg-white rounded-3xl shadow-2xl animate-float">
          <span className="text-slate-800 font-black text-2xl tracking-tighter italic">YBM</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase">YBM AI COURSE</h1>
          <p className="text-white/40 text-sm font-medium">개인 맞춤형 AI 토익 코칭</p>
        </div>
        <div className="flex gap-1.5 justify-center pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
