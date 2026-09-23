'use client'

/**
 * 02 장면의 **고민 블록 더미.** 진짜 물리로 떨어지고 부딪히고 쌓이고, 손으로 집히기도 한다.
 *
 * ── 왜 엔진을 썼나 ────────────────────────────────────────────────────────
 * 전에는 카드마다 `easeOutBounce` 곡선 하나로 떨어뜨렸다. 보기엔 튕기지만 **서로를 모른다** -
 * 겹쳐 지나가고, 쌓이지 않고, 건드릴 수도 없다. 사용자가 원한 건 "진짜 블록"이고
 * 그러려면 충돌·적층·마우스가 필요한데, 그건 곡선으로는 안 된다. 20개 강체를 안정적으로
 * 쌓는 건 직접 짜면 며칠이고 매번 터진다. matter.js 는 그 일만 하는 도구다.
 *
 * ── 대신 잃은 것 ──────────────────────────────────────────────────────────
 * **되감기.** 시뮬레이션의 시간은 한쪽으로만 흐르는데 스크롤은 양쪽으로 간다.
 * 그래서 낙하는 더 이상 스크롤에 물려 있지 않다 - **장면에 들어오면 한 번 쏟아지고**,
 * 그다음부터 스크롤은 "정렬" 만 맡는다. 위로 되돌아가면 더미 상태로 돌아간다.
 *
 * ── 그리는 방식 ───────────────────────────────────────────────────────────
 * 캔버스를 안 쓴다. 엔진은 좌표만 계산하고 **글자는 평범한 DOM** 이 그린다.
 * 캔버스에 한글을 그리면 서체·자간이 페이지와 달라지고 복사도 안 되고 읽어주기도 안 된다.
 * 매 프레임 `transform` 만 갈아 끼우므로 비용은 전과 같다.
 *
 * ponytail: 렌더 루프에서 React state 를 건드리지 않는다. 20개 × 60fps = 초당 1200번
 *   리렌더가 된다. ref 로 잡은 DOM 에 `transform` 을 직접 쓴다.
 */

import { useEffect, useRef } from 'react'
import Matter from 'matter-js'

/** 블록 하나의 크기. **전부 같게** 잡는다 - 크기가 제각각이면 쌓임이 불안정해서 더미가 떨린다.
 *  가장 긴 문구("며칠 쉬었는데 어디서 다시 시작하지")가 두 줄에 들어가는 폭이다. */
export const BLOCK_W = 168
export const BLOCK_H = 62

export type PileHandle = {
  /** 엔진을 멈추고 지금 위치를 돌려준다(정렬로 넘어갈 때). */
  freeze: () => { x: number; y: number; a: number }[]
  /** 다시 떨어뜨린다(위로 되돌아왔을 때). */
  resume: () => void
}

export function usePile(
  hostRef: React.RefObject<HTMLElement>,
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>,
  count: number,
  enabled: boolean,
) {
  const api = useRef<PileHandle | null>(null)
  const running = useRef(true)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !enabled) return
    const W = host.clientWidth
    const H = host.clientHeight
    if (W < 200 || H < 200) return

    const { Engine, Runner, Bodies, Composite, Mouse, MouseConstraint, Body } = Matter
    /* 중력. matter 기본값은 y:1 인데 그 정도면 **달에서 떨어지는 것처럼** 보인다(사용자 지적).
       화면 속 블록은 실제보다 크게 보이므로 같은 가속도라도 느리게 느껴진다 - 숫자로 보정한다. */
    const engine = Engine.create({ gravity: { x: 0, y: 3.4, scale: 0.001 } })

    /* 벽. 바닥은 화면 아래쪽에 두고 좌우로 막아 둔다. 안 막으면 밀려 나간 블록이
       영영 돌아오지 않는다(문구 하나가 조용히 사라진다). */
    const wall = (x: number, y: number, w: number, h: number) =>
      Bodies.rectangle(x, y, w, h, { isStatic: true, restitution: 0.25, friction: 0.6 })
    Composite.add(engine.world, [
      wall(W / 2, H + 18, W * 2, 60), // 바닥. 화면 아래 끝에 살짝 걸치게 - 더 내리면 맨 아랫줄이 잘린다
      wall(-30, H / 2, 60, H * 3), // 왼쪽
      wall(W + 30, H / 2, 60, H * 3), // 오른쪽
    ])

    /* 블록. 화면 위 바깥에서 시작해 차례차례 떨어진다.
       가로 자리는 고르게 흩되 **줄줄이 세우지 않는다** - 한 줄로 떨어지면 도미노가 된다. */
    const blocks: Matter.Body[] = []
    for (let i = 0; i < count; i++) {
      const lane = (i * 7) % 10 // 0~9 를 건너뛰며 돌아 이웃끼리 안 붙는다
      const x = W * (0.08 + lane * 0.093) + (i % 3) * 14
      const y = -80 - Math.floor(i / 4) * 150 - (i % 4) * 40
      const b = Bodies.rectangle(x, y, BLOCK_W, BLOCK_H, {
        chamfer: { radius: 14 },
        restitution: 0.26, // 튕김. 1 에 가까우면 고무공이 되고 0 이면 젖은 모래가 된다
        friction: 0.45,
        frictionAir: 0.002, // 공기 저항. 높으면 낙하가 끝까지 안 빨라져서 둥둥 뜬 느낌이 난다
        density: 0.0022,
      })
      Body.setAngle(b, (Math.sin(i * 12.9898) * 0.5)) // 기울여서 떨어뜨린다
      blocks.push(b)
    }
    Composite.add(engine.world, blocks)

    /* 손으로 집기. 커서가 있는 기기에서만 - 터치 기기에서 이걸 켜면 블록을 잡으려다
       페이지 스크롤이 막힌다(손가락 하나로 두 가지를 할 수는 없다). */
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    let mc: Matter.MouseConstraint | null = null
    if (fine) {
      const mouse = Mouse.create(host as HTMLElement)
      /* matter 가 휠 이벤트를 가로채면 이 위에서 **페이지가 안 내려간다.** 스크롤로 넘기는
         화면이라 그건 치명적이다. 휠은 우리 것이 아니므로 등록을 걷어낸다. */
      host.removeEventListener('wheel', (mouse as unknown as { mousewheel: EventListener }).mousewheel)
      mc = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.16, damping: 0.1, render: { visible: false } },
      })
      Composite.add(engine.world, mc)
    }

    const runner = Runner.create()
    Runner.run(runner, engine)

    /* 엔진 좌표 → DOM. 매 프레임 transform 만 갈아 끼운다. */
    let raf = 0
    const draw = () => {
      for (let i = 0; i < blocks.length; i++) {
        const el = itemRefs.current[i]
        if (!el) continue
        const b = blocks[i]
        el.style.transform = `translate3d(${b.position.x - BLOCK_W / 2}px, ${b.position.y - BLOCK_H / 2}px, 0) rotate(${b.angle}rad)`
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    api.current = {
      freeze() {
        if (running.current) {
          Runner.stop(runner)
          /* ⚠️ **그리기 루프도 같이 끊어야 한다.** 엔진만 멈추고 rAF 를 두면 멈춘 좌표를
             매 프레임 계속 덮어써서, 정렬하려고 넣은 transform 이 바로 지워진다
             (실측: 스크롤을 아무리 내려도 블록이 더미에 그대로 붙어 있었다). */
          cancelAnimationFrame(raf)
          running.current = false
        }
        return blocks.map((b) => ({ x: b.position.x, y: b.position.y, a: b.angle }))
      },
      resume() {
        if (!running.current) {
          Runner.run(runner, engine)
          running.current = true
          raf = requestAnimationFrame(draw)
        }
      },
    }

    return () => {
      cancelAnimationFrame(raf)
      Runner.stop(runner)
      if (mc) Composite.remove(engine.world, mc)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
      api.current = null
      running.current = true
    }
  }, [hostRef, itemRefs, count, enabled])

  return api
}
