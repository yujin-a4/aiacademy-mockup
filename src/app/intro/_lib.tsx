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
    lenisRef.current = lenis // 무대가 한 걸음씩 넘길 때 관성을 멈추려고(useStageSteps)
    let id = requestAnimationFrame(function raf(t: number) {
      lenis.raf(t)
      id = requestAnimationFrame(raf)
    })
    return () => {
      cancelAnimationFrame(id)
      lenisRef.current = null
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

/** **스크롤은 '어디까지' 만 정하고, 움직임은 시간이 돌린다.**
 *
 *  스크롤 위치에 움직임을 그대로 물리면(스크럽) 조금 굴리면 조금 움직이고, 멈추면 동작 중간에 얼어붙는다.
 *  "스크롤 하나하나에 움직임이 걸려 있어서 어색하다"(사용자). 그래서 무대에 **멈춤 자리(stops)** 를 두고,
 *  스크롤은 그중 어디로 갈지만 고른다. 다음 멈춤 쪽으로 30% 만 넘어가면 거기까지 **정해진 속도로 스스로 재생**된다.
 *  되돌아갈 때는 재생하지 않고 곧장 그 자리로 간다.
 *
 *  scroll = 트랙 진행률(0~1). 멈춤 자리들은 스크롤 위에 **같은 간격**으로 깔린다(한 번 굴리면 한 칸).
 *  stops = 멈출 재생 위치(오름차순, 0 과 1 포함) · durs[i] = stops[i] → stops[i+1] 에 걸리는 초.
 *  돌려주는 값은 기존 진행률과 같은 자리(0~1)라, 장면 쪽 코드는 그대로 둔 채 넣고 빼기만 하면 된다. */
export function usePlayhead(scroll: number, stops: readonly number[], durs: readonly number[]) {
  const [p, setP] = useState(stops[0])
  const cur = useRef(stops[0])
  const target = useRef(stops[0])
  const raf = useRef<number | null>(null)
  const last = useRef(0)

  const n = stops.length
  const idx = Math.min(n - 1, Math.max(0, Math.floor(scroll * (n - 1) + 0.7)))
  target.current = stops[idx]

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cur.current = target.current
      setP(cur.current)
      return
    }
    if (raf.current != null) return
    const tick = (t: number) => {
      const dt = Math.min(0.05, last.current ? (t - last.current) / 1000 : 0.016)
      last.current = t
      const goal = target.current
      // 되돌아가는 건 재생하지 않고 곧장 간다("올라갈 때는 빠르게", 사용자)
      if (goal < cur.current) {
        cur.current = goal
        setP(goal)
      }
      const dir = Math.sign(goal - cur.current)
      if (dir === 0) {
        raf.current = null
        last.current = 0
        return
      }
      // 지금 놓인 칸의 속도로 간다(칸마다 걸리는 시간이 다르다)
      let i = 0
      while (i < n - 2 && (dir > 0 ? cur.current >= stops[i + 1] : cur.current > stops[i + 1])) i++
      // 재생 중에 또 내렸으면(목표가 여러 칸 앞) 남은 칸 수만큼 빨리 간다 - 입력이 재생에 막혀 답답하지 않게
      const ahead = stops.filter((s) => s > cur.current && s <= goal).length
      const rate = ((stops[i + 1] - stops[i]) / durs[i]) * Math.max(1, ahead)
      const next = cur.current + dir * rate * dt
      cur.current = dir > 0 ? Math.min(goal, next) : Math.max(goal, next)
      setP(cur.current)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [idx, stops, durs, n])

  // ⚠️ StrictMode 두 번째 마운트에서 rAF 가 안 도는 함정(useTrackProgress 참고) - 정리 때 id 를 비운다
  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
      last.current = 0
    },
    [],
  )

  return p
}

/** 보이면 재생(0 → 1, dur 초). 스크럽 대신 쓰는 짝. 끝나면 1 에 머물고,
 *  **화면 밖으로 완전히 나가면 0 으로 되감아** 다음에 들어올 때 다시 돈다
 *  (한 번만 돌게 했더니 위로 갔다 다시 내려오면 '애니메이션이 사라졌다', 09-29 사용자).
 *  threshold = 요소가 얼마나 보여야 시작하나. 움직임 줄이기 설정이면 바로 1. */
export function usePlayOnView(ref: React.RefObject<HTMLElement>, dur: number, threshold = 0.35) {
  const [k, setK] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setK(1)
      return
    }
    let raf = 0
    let start = 0
    let playing = false
    const io = new IntersectionObserver(
      (es) => {
        const e = es[es.length - 1]
        if (!e.isIntersecting) {
          cancelAnimationFrame(raf)
          playing = false
          setK(0)
          return
        }
        if (playing || e.intersectionRatio < threshold) return
        playing = true
        start = 0
        const tick = (t: number) => {
          if (!start) start = t
          const v = Math.min(1, (t - start) / 1000 / dur)
          setK(v)
          if (v < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: [0, threshold] },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [ref, dur, threshold])
  return k
}

/* 페이지의 Lenis. 무대가 스크롤을 잠깐 쥐었다 놓으려면 관성을 멈출 수 있어야 한다. */
type LenisLike = { stop(): void; start(): void; scrollTo(y: number, o?: { immediate?: boolean; force?: boolean; duration?: number }): void }
const lenisRef: { current: LenisLike | null } = { current: null }
const scrollToY = (y: number, immediate: boolean) => {
  if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate, force: true, duration: 0.9 })
  else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
}

/** **제스처 한 번 = 한 걸음.** 무대가 화면을 꽉 채우는 동안에는 페이지 스크롤을 멈추고,
 *  휠·스와이프·방향키 한 번마다 걸음을 하나씩 옮긴다. 마지막 걸음에서 한 번 더 내리면 페이지로 돌려준다.
 *
 *  왜: 멈춤 자리를 스크롤 위에 깔아 두는 방식(40vh 간격)은 한 번 휙 굴리면 관성으로 서너 칸을 한꺼번에 지나갔다
 *  ("스크롤 한 번에 너무 많이 가버린다", 사용자). 기기마다 한 번 굴림의 거리가 달라서 간격으로는 못 막는다.
 *  - 트랙패드는 한 번 쓸어도 관성 휠 이벤트가 1초 가까이 이어진다 → **휠이 250ms 잠잠해져야** 새 제스처로 보고,
 *    걸음 사이는 **최소 0.45초** 벌린다(느린 기기·무거운 장면에서는 관성 이벤트 사이가 300ms 넘게 벌어졌다).
 *  - 트랙(`el`)은 화면 두 장 높이면 된다. 들어오면 윗끝(아래로 올 때)·아랫끝(위로 올 때)에 딱 붙인다.
 *  - 놓을 때는 잠깐(1.2초) 다시 붙잡지 않는다 - 빠져나가는 스크롤이 트랙을 지나가며 도로 잡혔다.
 *  - 올라갈 때도 **한 걸음씩** 되돌아간다(09-29 "순차적으로 올라가야 하는 거 아님?", 사용자 - 전에는 위로 한 번 = 히어로로 곧장).
 *    되감기는 재생하지 않고 곧장 앞 멈춤 자리로 간다(usePlayhead). 아래 구간에서 올라와 들어오면 마지막 장면에서 시작한다. */
export function useStageSteps(ref: React.RefObject<HTMLElement>, count: number, canLeave: () => boolean = () => true) {
  const canLeaveRef = useRef(canLeave)
  canLeaveRef.current = canLeave
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)
  stepRef.current = step

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let engaged = false
    let freeUntil = 0
    let lastWheel = 0 // 앞 휠 이벤트 시각 - 450ms 안에 또 오면 같은 제스처(관성)로 본다
    let lastStep = -1e9 // 마지막으로 걸음을 옮긴 시각 - 0.9초 안에는 다시 옮기지 않는다
    let touchY: number | null = null

    const bounds = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      return { top, end: top + el.offsetHeight - window.innerHeight }
    }
    let swallow = false // 놓아 준 그 제스처의 남은 관성은 먹는다 - 안 먹으면 다음 섹션을 건너뛰어 체험까지 날아갔다(실측)
    const release = () => {
      engaged = false
      swallow = true
      freeUntil = performance.now() + 1200
      lenisRef.current?.start()
      const b = bounds()
      scrollToY(b.end, true)
      scrollToY(b.end + window.innerHeight, false) // 다음 섹션 윗끝에 정확히 선다
    }
    const move = (dir: 1 | -1) => {
      if (dir < 0) return setStep(Math.max(0, stepRef.current - 1)) // 올라갈 때도 한 걸음씩
      if (stepRef.current + 1 > count - 1) return canLeaveRef.current() ? release() : undefined // 마지막 장면 재생 중이면 기다린다
      setStep(stepRef.current + 1)
    }
    let lastY = window.scrollY
    const check = () => {
      const up = window.scrollY < lastY
      lastY = window.scrollY
      if (engaged || performance.now() < freeUntil) return
      const r = el.getBoundingClientRect()
      if (r.top <= 0 && r.bottom >= window.innerHeight && r.height > 0) {
        engaged = true
        lenisRef.current?.stop()
        const b = bounds()
        // 위에서 내려오면 윗끝에 붙인다. 아래에서 올라오면 마지막 장면부터 한 걸음씩 되돌아간다.
        if (up) setStep(count - 1)
        scrollToY(b.top, true)
        lastY = window.scrollY
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (swallow) {
        const now = performance.now()
        const still = now - lastWheel < 250
        lastWheel = now
        if (still) {
          e.preventDefault()
          e.stopImmediatePropagation()
          return
        }
        swallow = false
      }
      check()
      if (!engaged) return
      e.preventDefault()
      e.stopImmediatePropagation()
      /* 두 겹으로 막는다. 무거운 장면(블록 물리)이 돌면 관성 휠 이벤트가 250ms 씩 벌어져 들어와
         '잠잠해지면 새 제스처' 규칙만으로는 한 번 쓸기가 여러 걸음이 됐다(실측: 한 번에 끝까지 가서 페이지로 빠짐). */
      const now = performance.now()
      // 09-29: 450/900 → 250/450ms. 걸음 사이가 길어 입력이 먹히고 스크롤이 느리게 느껴졌다(사용자).
      const fresh = now - lastWheel > 250
      lastWheel = now
      if (fresh && now - lastStep > 450 && Math.abs(e.deltaY) > 2) {
        lastStep = now
        move(e.deltaY > 0 ? 1 : -1)
      }
    }
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      check()
      if (engaged) e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!engaged || touchY == null) return
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY)
      touchY = null
      if (Math.abs(dy) > 40) move(dy > 0 ? 1 : -1)
    }
    const onKey = (e: KeyboardEvent) => {
      check()
      if (!engaged) return
      const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key)
      const up = ['ArrowUp', 'PageUp'].includes(e.key)
      if (!down && !up) return
      e.preventDefault()
      move(down ? 1 : -1)
    }

    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    check()
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('wheel', onWheel, { capture: true })
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
      if (engaged) lenisRef.current?.start()
    }
  }, [ref, count])

  return step
}
