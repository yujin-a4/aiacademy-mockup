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
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-navy">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="relative w-32 h-32 mx-auto animate-bounce">
          <Image
            src="/img/와옹이_hi.png"
            alt="와옹이"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold text-white">YBM AI 어학원</h1>
        <p className="text-lavender text-sm">AI 강사와 함께하는 토익 코칭</p>
      </div>
    </div>
  )
}
