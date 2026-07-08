'use client'
import { useEffect, useState } from 'react'

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(50), 400)
    const t2 = setTimeout(() => setProgress(100), 1200)
    const t3 = setTimeout(() => onNext(), 1800)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#3B82F6] to-[#2563EB] font-sans">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-[#1D4ED8]/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center gap-8 px-8 text-center">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center border border-white/25 shadow-xl backdrop-blur-sm">
          <img
            src="/logo.svg"
            alt="YBM"
            className="w-10 h-10 object-contain brightness-0 invert"
            onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }}
          />
        </div>

        <div>
          <h1 className="text-white text-[26px] font-bold leading-tight">
            YBM AI 어학원에<br />오신 것을 환영해요
          </h1>
          <p className="text-white/60 text-[14px] mt-3">잠시만 기다려주세요...</p>
        </div>

        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
