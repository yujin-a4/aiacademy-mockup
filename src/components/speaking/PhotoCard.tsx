'use client'

import type { PhotoAnnotation } from '@/data/speakingScenario'

interface PhotoCardProps {
  src: string
  annotations?: PhotoAnnotation[]
  className?: string
}

export default function PhotoCard({ src, annotations = [], className = '' }: PhotoCardProps) {
  return (
    <div className={`relative w-full rounded-2xl overflow-hidden select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="TOEIC photo" className="w-full h-full object-cover block" />

      {annotations.map(({ n, x, y }) => (
        <div
          key={n}
          className="absolute flex items-center justify-center"
          style={{
            left: `${x}%`,
            top:  `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* pulse ring */}
          <span className="absolute w-12 h-12 rounded-full border-2 border-[#2277F0] animate-ping opacity-40" />
          <div className="w-8 h-8 rounded-full bg-[#2277F0] text-white text-sm font-bold flex items-center justify-center shadow-lg z-10">
            {n}
          </div>
        </div>
      ))}
    </div>
  )
}
