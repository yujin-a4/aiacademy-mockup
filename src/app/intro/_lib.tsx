'use client'

/**
 * /intro 세 버전이 함께 쓰는 스크롤 장치.
 *
 * 왜 공용으로 뺐나: V1·V2·V3 는 **기획이 다른 세 페이지**지 같은 화면의 변형이 아니다.
 * 카피도 구성도 연출도 다르다. 다만 "스크롤 진행률을 재고, 관성을 주고, 보이면 올려준다"는
 * 배관은 셋 다 똑같고 버그도 똑같이 난다(StrictMode rAF 누수를 세 번 고칠 이유가 없다).
 * **배관만 공유하고 화면은 각자 짠다.**
 */

import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'

/** 0 → 1 구간 진행률. a 전에는 0, b 후에는 1. */
export const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 0~1 을 부드럽게 — 시작과 끝에서 속도가 죽는다. 선형보다 늘 낫다. */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** 부드러운 스크롤(Lenis). **소개 페이지에서만** 켠다 — 수업 화면까지 관성이 붙으면
 *  문제 풀다가 화면이 미끄러져 방해가 된다. 모션을 끈 사용자에게는 아예 켜지 않는다. */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    /* wheelMultiplier: 한 번 굴릴 때 더 많이 내려가게 — 소개 페이지는 읽는 페이지가 아니라
       훑는 페이지라 기본값(1)이면 답답하다. duration 은 짧게 잡아 반응을 빠르게. */
    const lenis = new Lenis({ duration: 0.95, smoothWheel: true, wheelMultiplier: 1.45 })
    let id = requestAnimationFrame(function raf(t: number) {
      lenis.raf(t)
      id = requestAnimationFrame(raf)
    })
    return () => {
      cancelAnimationFrame(id)
      lenis.destroy()
    }
  }, [])
}

/** 화면에 들어오면 한 번 올려주는 공용 리빌. 되돌리지 않는다. */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

const LERP_TAU = 7.5
const SNAP = 0.0008

/** 트랙의 스크롤 진행률(0~1). 값을 그대로 쓰지 않고 rAF 안에서 따라붙게 해서 미끄러지게 한다. */
export function useTrackProgress(ref: React.RefObject<HTMLElement>) {
  const [p, setP] = useState(0)
  const target = useRef(0)
  const current = useRef(0)
  const raf = useRef<number | null>(null)
  const last = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const measure = () => {
      const el = ref.current
      if (!el) return
      const span = el.offsetHeight - window.innerHeight
      if (span <= 0) return
      target.current = Math.min(1, Math.max(0, (window.scrollY - el.offsetTop) / span))
    }

    const tick = (t: number) => {
      const dt = Math.min(0.1, last.current ? (t - last.current) / 1000 : 0.016)
      last.current = t
      current.current += (target.current - current.current) * (1 - Math.exp(-dt * LERP_TAU))
      if (Math.abs(target.current - current.current) < SNAP) {
        current.current = target.current
        setP(current.current)
        raf.current = null
        last.current = 0
        return
      }
      setP(current.current)
      raf.current = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      measure()
      if (reduced) {
        current.current = target.current
        setP(target.current)
        return
      }
      if (raf.current == null) raf.current = requestAnimationFrame(tick)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      /* ⚠️ 취소만 하고 id 를 비우지 않으면 **다시 마운트됐을 때 영영 안 돈다.**
         StrictMode 는 effect 를 마운트→정리→마운트 로 두 번 돌리는데, 남아 있는 옛 id 때문에
         `raf.current == null` 이 거짓이 되어 rAF 예약을 건너뛴다(실측: 진행률이 0 에서 안 움직임). */
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
      last.current = 0
    }
  }, [ref])

  return p
}

/** 마우스 위치(−1~1). 데스크톱에서만 의미가 있다 — 터치에는 hover 도 커서도 없다.
 *  터치 기기에서는 0 으로 남아서 아무 일도 하지 않는다(그게 맞다). */
export function usePointer() {
  const [pt, setPt] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const on = (e: PointerEvent) => {
      setPt({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      })
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => window.removeEventListener('pointermove', on)
  }, [])
  return pt
}
