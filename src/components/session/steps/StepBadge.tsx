'use client'

import { useEffect, useState } from 'react'
import type { Badge } from '@/lib/sessionBadges'

const PARTICLE_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#F97316', '#8B5CF6', '#14B8A6']

interface Props {
  badge: Badge
  badgeIndex: number
  totalBadges: number
  onNext: () => void
}

export default function StepBadge({ badge, badgeIndex, totalBadges, onNext }: Props) {
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowParticles(true), 350)
    return () => clearTimeout(t)
  }, [badge.id])

  useEffect(() => {
    const id = setTimeout(onNext, 2400)
    return () => clearTimeout(id)
  }, [onNext])

  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI
    const dist = 70 + (i % 3) * 22
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      delay: i * 0.04,
    }
  })

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-5 px-8 cursor-pointer select-none relative overflow-hidden"
      onClick={onNext}
    >
      {/* 파티클 버스트 */}
      {showParticles && particles.map((p, i) => (
        <span
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full animate-particle-fly pointer-events-none"
          style={{
            left: 'calc(50% - 5px)',
            top: '38%',
            background: p.color,
            animationDelay: `${p.delay}s`,
            '--dx': `${p.tx}px`,
            '--dy': `${p.ty}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* 배지 카운터 */}
      {totalBadges > 1 && (
        <p className="text-slate-400 text-xs animate-fade-in-up">
          배지 {badgeIndex} / {totalBadges}
        </p>
      )}

      {/* 배지 아이콘 */}
      <div
        className="w-28 h-28 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center animate-pop-badge shadow-md shadow-indigo-100"
        style={{ animationDelay: '0.1s' }}
      >
        <span className="text-6xl leading-none">{badge.icon}</span>
      </div>

      {/* 배지 텍스트 */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
        <p className="text-indigo-400 text-xs font-semibold mb-1 tracking-wider uppercase">배지 획득</p>
        <h2 className="text-2xl font-black text-slate-900 mb-2">{badge.label}</h2>
        <p className="text-slate-500 text-sm">{badge.description}</p>
      </div>

      <p className="text-slate-300 text-xs mt-8 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
        화면을 탭하면 건너뜁니다
      </p>
    </div>
  )
}
