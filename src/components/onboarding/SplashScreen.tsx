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

      <div className="text-center space-y-6 animate-fade-in z-10">
        <div className="relative w-32 h-32 mx-auto animate-float">
          <Image
            src="/img/와옹이_hi.png"
            alt="와옹이"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">YBM AI 어학원</h1>
          <p className="text-white/50 text-sm font-medium">AI 강사와 함께하는 토익 코칭</p>
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
