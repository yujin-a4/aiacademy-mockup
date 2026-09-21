'use client'

import { useEffect, useState } from 'react'
import { LottieSvg } from 'lottie-react'

/** public/lottie/waong-*.json 으로 들어가 있는 모션 이름 */
export type WaongMotionName = 'celebrate' | 'idea' | 'sleepy' | 'notice' | 'love'

/** 갤러리·검토용 목록. 어디에 쓰는 모션인지 한 줄로 적어둔다. */
export const WAONG_MOTIONS: { name: WaongMotionName; pose: string; use: string }[] = [
  { name: 'idea',      pose: '똑똑해', use: '정답 · 힌트' },
  { name: 'celebrate', pose: '축하',   use: '수업 완료 · 보상' },
  { name: 'sleepy',    pose: '졸려',   use: '로딩 · 대기' },
  { name: 'notice',    pose: '공지',   use: '알림 · 안내' },
  { name: 'love',      pose: '사랑',   use: '출석 · 응원' },
]

interface WaongMotionProps {
  name: WaongMotionName
  /** 정사각형 한 변 (px) */
  size?: number
  loop?: boolean
  className?: string
}

/**
 * 와옹이 Lottie 모션.
 *
 *  *  파일은 `public/lottie/` 에서 런타임에 받아온다 — import 하면 JSON(30~55KB)이
 *     JS 번들에 그대로 박힌다.
 *  *  옆에 이미 "수업 완료!" / "정답!" 같은 문구가 있는 자리에만 쓰는 **장식**이라
 *     스크린리더에서는 숨긴다.
 *  *  모션 최소화를 켠 사용자에게는 재생하지 않고 첫 프레임만 보여준다.
 */
export default function WaongMotion({
  name,
  size = 160,
  loop = true,
  className,
}: WaongMotionProps) {
  const reduced = usePrefersReducedMotion()

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <LottieSvg
        src={`/lottie/waong-${name}.json`}
        loop={loop && !reduced}
        autoplay={!reduced}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
