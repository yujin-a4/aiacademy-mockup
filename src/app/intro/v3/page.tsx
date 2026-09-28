'use client'

/**
 * /intro/v3 - **나를 가장 잘 이해하는 AI 선생님** (2026-09-23 개편, 기획서 11섹션 판 반영).
 *
 * 개편 전 판은 `/intro/v3-prev` 에 그대로 있다. 되돌리려면 그 파일을 이 자리에 덮으면 된다.
 *
 * ── 기획서(구글문서 "YBM AI 어학원 소개 페이지 기획안")에서 바뀐 것 ────────────────
 *   · **AI HUMAN 과 SESSION DEMO 가 03·04 로 올라왔다.** 전에는 분석 이야기를 먼저 하고
 *     사람이 뒤에 나왔는데 순서가 뒤집혔다. 먼저 선생님을 보여주고, 그다음에 그 판단의
 *     근거를 설명한다. "기능보다 먼저 AI 휴먼 선생님과의 관계가 보이도록"(기획서 V3 개요).
 *   · **SESSION DEMO 가 새로 생겼다.** 한 문제를 어떻게 가르치는지가 아니라,
 *     지난 학습을 기억하고 오늘을 안내하고 다음을 준비하는 한 바퀴를 보여준다.
 *   · 섹션마다 붙은 '화면 연출' 이 전부 같은 말을 한다: **AI 휴먼이 화면에서 안 사라진다.**
 *
 * ── 그래서 구조가 이렇게 됐다 ──────────────────────────────────────────────
 *   01~06 = `_stage.tsx` 의 **무대 하나.** 여섯 섹션이 아니라 인물 하나가 서 있고 그 주위로
 *           고민·말·카드·HUD 가 도는 한 덩어리다. 섹션으로 쪼개면 인물이 섹션마다
 *           나타났다 사라져서 "계속 곁에 있다" 는 이 페이지의 주장 자체가 무너진다.
 *   07~11 = 이 파일. 박혜원(별도 사례) · 학습 사이클 · 검증 · 다음 단계 · 신청.
 *           여기서부터 인물이 바뀌므로(박혜원) 무대가 끝나는 게 맞다.
 *
 * ── 이 페이지의 규칙 (고쳐 쓸 때 지킬 것) ────────────────────────────────────
 *   · **테마 하나.** 어떤 섹션도 밝은 면으로 뒤집지 않는다. 면의 깊이(INK/BASE/RAISE)만 바꾼다.
 *   · **강조색 하나.** BLUE 말고 다른 색을 쓰지 않는다.
 *   · **모서리 셋.** 누르는 것 = 완전 둥글게(pill) · 패널 = 16px · 영상/사진 = 24px.
 *   · **아이브로우 금지.** 섹션 위 작은 대문자 라벨(`01 - Managed learning` 류)을 다시 붙이지 않는다.
 *     화면에 보이는 대문자 영문은 전부 **내용**이다(START/BEFORE/LEARN 같은 단계 이름).
 *   · **긴 줄표 금지.** U+2014 와 U+2013 은 주석까지 포함해 이 파일에 한 글자도 없다.
 *     LLM 이 만든 화면의 가장 흔한 지문이라 `grep` 으로 0인지 확인되게 주석에도 안 쓴다.
 *   · **글보다 화면.** 문단을 늘리지 말고 움직임으로 말한다(사용자 지시, 09-23).
 */

import localFont from 'next/font/local'
import { useEffect, useRef, useState } from 'react'

import { ease, lerp, seg, useReveal, useSmoothScroll, useTrackProgress } from '../_lib'
import { BASE, BLUE, INK, Stage, StageFlow } from './_stage'

/** 색면으로 뒤집는 구간의 파랑. 강조색 BLUE(#2E6BFF) 위에 흰 글자는 대비가 모자라(≈4.2:1) 한 톤 내렸다(≈5.3:1). */
const BLUE_BLOCK = '#2458E0'

/** 제목 글꼴: **페이퍼로지**(Paperlogy, 눈누 · 상업 무료). 반듯한 기하 산세리프라 어두운 홀로그램 화면과 결이 맞는다.
 *  제목 전체(`.display`)는 SemiBold, 강조 줄(`.em`)은 ExtraBold + 밝은 파랑으로 한 번 더 튄다.
 *  거쳐 온 것: 마루부리(명조) "너무 차분하다" → 에이투지체(참고 페이지 AI컨닝데이의 제목체) "테마와 안 어울린다" -
 *  에이투지는 둥글고 장난스러워 주황 만화 페이지엔 맞지만 이 페이지의 차가운 빛과는 따로 놀았다.
 *  두 굵기 합 316KB. next/font 라 이 페이지에서만 받는다. */
const displayFont = localFont({
  src: [
    { path: './Paperlogy-6SemiBold.woff2', weight: '600' },
    { path: './Paperlogy-8ExtraBold.woff2', weight: '800' },
  ],
  display: 'swap',
  variable: '--font-display',
})


/* ══════════════════════════════════════════════════════════════════════════ */

export default function IntroV3() {
  useSmoothScroll()
  useReveal()

  /* ⚠️ main 에 `overflow-x: hidden` 을 쓰면 **하위의 position:sticky 가 전부 죽는다**
     (실측: 섹션이 스크롤에 딸려 올라가 사라졌다). 조상에 overflow 가 있으면 그게
     스크롤 컨테이너가 되기 때문이다. `clip` 은 같은 일을 하면서 컨테이너를 만들지 않는다. */
  return (
    <main className={`${displayFont.variable} break-keep bg-[#0B1830] text-white [overflow-x:clip]`}>
      <div className="intro-grain" aria-hidden />
      <TopBar />
      <SectionNav />
      <Stage />
      <StageFlow />
      {/* 무대의 마지막(06 '다음 수업은 오늘 이미 시작됩니다')을 빼고 그 자리에 이 섹션을 이어 붙였다 */}
      <LearningFlow />
      <Trial />
      <ParkHyeWon />
      <WhatWeAreTesting />
      <NextPhase />
      <PreOpen />
      <Footer />
    </main>
  )
}

/** 상단 바. 한 줄 · 높이 72px.
 *  R&D 고지가 여기 붙어 있다. 히어로 안에 넣으면 첫 화면이 안내문 묶음이 되고,
 *  맨 아래에만 두면 낯선 방문자가 "출시된 서비스" 로 오해한 채 한참 내려간다.
 *  **사이트 바는 원래 그 사이트가 뭔지 말하는 자리다.** 전문은 마지막 섹션에 있다. */
/* ═══ 구간 목차 (오른쪽 점) ═══════════════════════════════════════════════════
   참고한 AI컨닝데이 페이지의 오른쪽 점 목차. 긴 스크롤 페이지에서 **지금 어디쯤인지** 보여 주고, 누르면 그 구간으로 간다.
   `data-nav` 가 붙은 구간을 스스로 모은다(목차를 따로 적어 두면 구간을 옮길 때 어긋난다).
   · 화면에 안 보이는 구간(폰 전용 StageFlow 등)은 뺀다.
   · 이름은 **지금 구간만** 보인다. hover 로 여는 건 터치 기기에서 못 쓴다.
   · 넓은 화면(lg)에서만 띄운다 - 폰·세로 태블릿에서는 글자 위에 얹힌다. */
function SectionNav() {
  const [items, setItems] = useState<{ label: string; el: HTMLElement }[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-nav]')).filter((e) => e.getClientRects().length > 0)
    setItems(els.map((el) => ({ label: el.dataset.nav ?? '', el })))
    // 화면 한가운데 줄에 걸친 구간이 '지금' 이다
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(els.indexOf(e.target as HTMLElement))
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <nav aria-label="페이지 구간" className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <ul>
        {items.map((it, i) => {
          const on = i === active
          return (
            <li key={it.label}>
              <button
                type="button"
                onClick={() => it.el.scrollIntoView({ behavior: 'smooth' })}
                className="flex min-h-[44px] w-full items-center justify-end gap-3 pl-6 pr-1"
                aria-current={on ? 'true' : undefined}
                aria-label={it.label}
              >
                <span
                  className="whitespace-nowrap text-[11.5px] font-semibold text-white transition-opacity duration-300"
                  style={{ opacity: on ? 0.95 : 0 }}
                >
                  {it.label}
                </span>
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: on ? 9 : 5,
                    height: on ? 9 : 5,
                    background: on ? '#fff' : 'rgba(255,255,255,0.4)',
                    boxShadow: on ? `0 0 12px ${BLUE}` : undefined,
                  }}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      {/* 위쪽에 얇게 깔아 주는 그늘. 히어로 인물이 커지면서 밝은 머리카락이 화면 꼭대기까지
          올라와 오른쪽 고지가 묻혔다(실측). 바를 색으로 덮으면 띠가 생기니 그라데이션으로. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[120px]"
        style={{ background: 'linear-gradient(180deg, rgba(8,16,32,0.72), transparent)' }}
        aria-hidden
      />
      <div className="relative mx-auto flex h-[72px] max-w-[1560px] items-center justify-between px-6 sm:px-10">
        <span className="text-[13px] font-bold tracking-[0.2em]">YBM</span>
        <span className="text-[11px] tracking-[0.16em] text-white/70">AI Academy · 개발 중인 R&amp;D 프로젝트</span>
      </div>
    </header>
  )
}

function Title({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      data-reveal
      className={`reveal display text-[clamp(1.7rem,3.4vw,3rem)] leading-[1.3] tracking-[-0.01em] ${className}`}
    >
      {children}
    </h2>
  )
}

/* ═══ 체험 세션 ══════════════════════════════════════════════════════════════
   기획서 04 SESSION DEMO 의 실체. 원래 "영상 시연형" 이었는데 **실제로 눌러 보는 것**으로
   바꿨다(09-23 사용자 결정). 보여 주는 것과 해 보는 것은 다른 일이고, 11/02 방문자는
   "이게 뭔지" 보다 "어떤 느낌인지" 를 알고 싶어 할 것이다.

   ── 왜 무대(01~06) 안이 아니라 여기인가 ─────────────────────────────────────
   무대는 스크롤로 돌아가고 체험은 화면을 눌러야 한다. 수업을 누르려고 손을 대는 순간
   스크롤이 무대를 밀어서 **둘이 싸운다.** 그래서 여기는 스크롤 연출이 하나도 없는
   평범한 섹션이다. 들어오면 멈춰서 만지는 자리다.

   ── 무엇이 도는가 ─────────────────────────────────────────────────────────
   `/intro/trial/LC-P1-01?instructor=lee_doyun` = **FGI 에서 쓴 그 수업 그대로**다.
   따로 만든 데모가 아니라 정본 플레이어를 공개 경로로 한 번 더 연 것이라(그 파일 주석 참고)
   수업이 고쳐지면 여기도 같이 고쳐진다.

   ── 눌러야 열린다 ─────────────────────────────────────────────────────────
   iframe 을 처음부터 걸어 두지 않는다. 수업 화면은 무거운 앱이고(문항·음원·레일을 다 읽는다)
   소개 페이지를 스치는 사람 대부분은 여기까지 안 온다. **누른 사람에게만 받아 온다.**
   그리고 소리와 마이크는 사용자 제스처 다음에만 열린다 - 누르는 행위가 곧 그 제스처다.

   ponytail: 수업 화면은 태블릿 가로(1180x820)로 짠 화면이다. 좁은 곳에서는 억지로 쑤셔넣는
     대신 **녹화 영상으로 물러선다.** 폰 세로에서 이 수업은 눌러도 못 쓴다 - 되는 척하는 것이
     안 되는 것보다 나쁘다. */
const TRIAL_W = 1180
const TRIAL_H = 820
const TRIAL_SRC = '/intro/trial/LC-P1-01?instructor=lee_doyun'

/** 주어진 상자에 수업 화면(1180x820)을 넣는 가장 큰 배율.
 *  돌려서 넣는 쪽이 더 크면 돌린다 - 세로로 긴 폰에서는 **화면의 긴 변**을 써야 한다.
 *  (390x844 폰: 그냥 넣으면 0.33, 돌려 넣으면 0.48. 같은 화면인데 절반이 더 보인다.) */
function fitTrial(w: number, h: number) {
  /* 1 을 넘기지 않는다. 늘리면 수업 화면이 1180px 로 그려진 뒤 확대돼서 글자가 흐려진다. */
  const flat = Math.min(1, w / TRIAL_W, h / TRIAL_H)
  const turned = Math.min(1, h / TRIAL_W, w / TRIAL_H)
  return turned > flat * 1.15 ? { scale: turned, rotate: true } : { scale: flat, rotate: false }
}

function Trial() {
  const box = useRef<HTMLDivElement>(null)
  const [inline, setInline] = useState(0) // 페이지 안에 넣었을 때의 배율
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState({ scale: 0, rotate: false })

  /* 태블릿이 **살짝 뒤로 누운 채** 들어오다가 화면 가운데쯤 오면 똑바로 선다(사용자 요청 "약간만").
     스크롤마다 리렌더하지 않게 스타일을 직접 쓴다. 움직임 줄이기 설정이면 처음부터 똑바로. */
  const tilt = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = tilt.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const draw = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 윗변이 화면 바닥에 닿을 때 0 → 화면 35% 높이까지 올라오면 1
      const k = ease(seg(vh - r.top, 0, vh * 0.65))
      el.style.transform = `perspective(1600px) rotateX(${lerp(14, 0, k)}deg) scale(${lerp(0.94, 1, k)})`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => {
      setInline(Math.min(1, el.clientWidth / TRIAL_W, (window.innerHeight * 0.62) / TRIAL_H))
      setFull(fitTrial(window.innerWidth, window.innerHeight))
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [])

  /* 페이지 안에 넣어도 충분히 큰 화면이면 그 자리에서 연다.
     좁으면 **전체화면으로 띄운다** - 기기를 가리지 말고 화면을 다 쓰면 된다. */
  const roomy = inline >= 0.8

  useEffect(() => {
    if (!open || roomy) return
    // 전체화면인 동안 뒤 페이지가 같이 스크롤되면 수업을 만지다 페이지가 밀린다.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', esc)
    }
  }, [open, roomy])

  const frame = (scale: number, rotate: boolean) => (
    <iframe
      src={TRIAL_SRC}
      title="AI 강사 수업 체험"
      allow="microphone; autoplay; clipboard-write"
      className="absolute left-1/2 top-1/2 border-0"
      style={{
        width: TRIAL_W,
        height: TRIAL_H,
        transform: `translate(-50%, -50%) ${rotate ? 'rotate(90deg) ' : ''}scale(${scale})`,
      }}
    />
  )

  return (
    <section id="trial" data-nav="수업 체험" className="on-blue px-6 py-28 sm:px-10 md:px-16 md:py-36" style={{ background: BLUE_BLOCK }}>
      <div className="mx-auto max-w-[1240px]">
        <Title className="max-w-4xl">
          AI 선생님이 이끌어주는 수업,
          <br />
          <span className="em">지금 체험해 보세요</span>
        </Title>
        <p data-reveal className="reveal mt-8 max-w-2xl text-[15px] leading-[1.95] text-white/85">
          아래는 지금 만들고 있는 수업 화면 그대로입니다. 이도윤 선생님의 LC 1강을 직접 눌러
          보실 수 있습니다.
        </p>

        <div ref={box} className="mt-12 flex justify-center">
          <div
            ref={tilt}
            className="relative overflow-hidden rounded-[24px] border border-white/25 bg-[#0A1526] p-2"
            style={{
              transformOrigin: '50% 100%',
              willChange: 'transform',
              width: inline ? TRIAL_W * inline + 16 : '100%',
              height: inline ? TRIAL_H * inline + 16 : undefined,
              boxShadow: '0 60px 120px -40px rgba(3,10,30,0.7)', // 파란 면 위라 파란 빛무리 대신 그림자
            }}
          >
            <div
              className="relative overflow-hidden rounded-[16px] bg-black"
              style={{ width: inline ? TRIAL_W * inline : '100%', height: inline ? TRIAL_H * inline : 0 }}
            >
              {open && roomy ? (
                frame(inline, false)
              ) : (
                <>
                  {/* 누르기 전에는 녹화 영상이 소리 없이 돈다. 빈 화면을 눌러 달라고 하면
                      무엇이 열릴지 모르는 채로 누르게 된다. */}
                  <video
                    src="/video/intro-lesson.mp4"
                    muted
                    loop
                    playsInline
                    autoPlay
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover opacity-45"
                  />
                  <div className="absolute inset-0 bg-[#0A1526]/55" aria-hidden />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
                    <button
                      type="button"
                      onClick={() => setOpen(true)}
                      className="inline-flex min-h-[54px] items-center rounded-full px-8 text-[15px] font-medium text-white transition-transform active:scale-[0.98]"
                      style={{ background: BLUE, boxShadow: `0 16px 44px -14px ${BLUE}` }}
                    >
                      수업 체험 시작하기
                    </button>
                    <p className="text-[12px] leading-[1.8] text-white/70">
                      소리가 재생됩니다. 말로 답하는 단계에서는 마이크 권한을 물어봅니다.
                      {!roomy && ' 화면을 가로로 돌리면 더 크게 보입니다.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-[12px] leading-[1.9] text-white/70">
          개발 중인 화면이라 일부 단계는 아직 다듬는 중입니다. 체험 내용은 저장되지 않습니다.
        </p>
      </div>

      {/* 좁은 화면용 전체화면. 수업 화면이 1180x820 고정이라 좁은 곳에서는 페이지 안에 넣는 대신
          **화면을 통째로 내준다.** 세로로 긴 기기에서는 돌려서 긴 변에 맞춘다. */}
      {open && !roomy && (
        <div className="fixed inset-0 z-[80] bg-[#05080F]">
          <div className="absolute inset-0">{full.scale > 0 && frame(full.scale, full.rotate)}</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/25 bg-black/60 px-5 text-[14px] text-white backdrop-blur"
          >
            닫기
          </button>
        </div>
      )}
    </section>
  )
}

/* ═══ 07. PARK HYE WON ═══════════════════════════════════════════════════════
   무대가 끝나는 자리. 여기서부터 인물이 바뀐다.
   기획 포인트(기획서): **V3 의 메인 컨셉은 특정 강사가 아니라 AI 휴먼 선생님이고,
   박혜원은 실제 YBM 강사 자산을 쓴 대표 구현 사례다.** 그래서 페이지 앞이 아니라 여기 있고,
   앞의 AI 휴먼과 얼굴이 다른 것도 그래서 문제가 아니다.
   전환 자체가 이 섹션이 하는 말이라 글로 "구현했습니다" 를 반복하지 않는다. */
function ParkHyeWon() {
  const ref = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(ref)
  const toAi = ease(seg(p, 0.2, 0.5))

  return (
    <section id="park" data-nav="AI 휴먼" ref={ref} className="relative md:h-[150vh]" style={{ background: BASE }}>
      <div className="px-6 py-24 sm:px-10 md:sticky md:top-0 md:flex md:h-[100dvh] md:items-center md:overflow-hidden md:px-16 md:py-0">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <Title>
              실제 강사를 기반으로 한
              <br />
              <span className="em">AI 휴먼의 가능성</span>
            </Title>
            <p data-reveal className="reveal mt-8 max-w-md text-[15px] leading-[1.95] text-white/65">
              YBM 토익 스타강사 박혜원. 얼굴과 목소리와 말투를 기반으로 AI 휴먼을 구현하고, 학습자와 상호작용하는
              경험으로 어디까지 확장될 수 있을지 확인하고 있습니다.
            </p>

            {/* 영상이 보여주는 네 장면. 전환이 끝날 즈음 하나씩 켜진다. */}
            <div className="mt-9 space-y-3">
              {['실제 박혜원 강사', 'AI HUMAN 전환', 'AI 휴먼이 말하는 장면', '학습 상황에 반응하는 장면'].map((t, i) => {
                const on = seg(p, 0.44 + i * 0.07, 0.54 + i * 0.07)
                return (
                  <div
                    key={t}
                    className="flex items-center gap-4"
                    style={{ opacity: on, transform: `translateY(${lerp(10, 0, on)}px)` }}
                  >
                    <span className="block h-px w-7" style={{ background: BLUE }} aria-hidden />
                    <span className="text-[14px] text-white/75">{t}</span>
                  </div>
                )
              })}
            </div>

            <p className="mt-9 text-[12px] leading-[1.9] text-white/40">
              실제 박혜원 강사가 실시간으로 학습을 관리하는 것은 아닙니다. 박혜원 강사를 기반으로 구현한 AI 휴먼의
              시연 영상입니다.
            </p>
          </div>

          {/* 사진 → 영상. 전환 중에 프레임이 살짝 돌아 평면이 공간에 놓인다. */}
          <div style={{ perspective: '1400px' }}>
            <div
              className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[24px] border border-white/12"
              style={{
                transform: `rotateY(${lerp(10, 0, toAi)}deg) rotateX(${lerp(-6, 0, toAi)}deg) scale(${lerp(0.94, 1, toAi)})`,
                boxShadow: `0 40px 120px -40px ${BLUE}`,
              }}
            >
              <img
                src="/instructor/park.png"
                alt="YBM 토익 강사 박혜원"
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: 1 - toAi }}
              />
              <video
                src="/video/video-park.mp4"
                muted
                loop
                playsInline
                autoPlay
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: toAi }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-5">
                <span className="rounded-full bg-black/50 px-3 py-1.5 text-[10px] font-semibold tracking-[0.24em] backdrop-blur">
                  {toAi > 0.5 ? 'AI HUMAN' : 'REAL'}
                </span>
                <span className="text-[12px] text-white/70">박혜원</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══ 08. LEARNING FLOW ══════════════════════════════════════════════════════
   **나흘치 수업 카드로 보여 준다.** 추상 도형 말고 실물로.
   윗줄(흐리게) = 교재 순서대로: Unit 1·2·3·4, 서로 모른다.
   아랫줄(밝게) = AI 선생님과: 그날의 결과 칩이 **빛줄기를 타고 다음 날 카드로 건너가** 그 카드를 만든다.
   스크롤로 하루씩 이어진다(`md:h-[240vh]` + sticky, 박혜원 섹션과 같은 방식).

   거쳐 온 것(같은 걸 또 하지 말 것):
   1. START·LEARN·ANALYZE·ADJUST·CONTINUE 다섯 칸 + 되돌아오는 화살표 → "너무 PPT 같다".
   2. 끝나는 선 vs 빛이 도는 동그라미 → "누가 저렇게 단순하게 해". 도형은 뜻을 설명만 하고 보여 주지 않았다.
   → 무엇이 이어지는지(막힌 곳 → 다음 수업)가 **글자로 보이게** 했다. 예시는 05·06 무대의 '품사 자리' 와 같은 이야기다.

   폰에서는 스크롤로 잠그지 않는다 - 전부 펼친 채 세로로 쌓는다(가로 네 칸이 설 자리가 없다). */
const PLAIN_DAYS = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4']
const AI_DAYS = [
  { title: 'Part 5 기본 문제', why: '첫 수업', result: '품사 자리 4/5 막힘' },
  { title: '품사 자리 다시 보기', why: '어제 막힌 곳부터', result: '품사 자리 안정 ✓' },
  { title: '시제로 넘어가기', why: '안정된 곳은 넘어가고', result: '시제 3/5 막힘' },
  { title: '시제 + 품사 섞어 풀기', why: '약한 둘을 함께', result: '' },
]

function LearningFlow() {
  const ref = useRef<HTMLElement>(null)
  const p = useTrackProgress(ref)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const k = wide ? p : 1 // 폰은 다 펼친 채

  /* 박자: 윗줄이 한 번에 깔리고(0.04~0.14) → 아랫줄 첫 카드(0.18) → 칩이 건너가고 다음 카드가 선다 ×3 → 남는다(0.86~).
     칸마다 [칩 출발, 칩 도착=다음 카드 등장] 을 붙여 둔다. */
  const plain = ease(seg(k, 0.04, 0.14))
  const dayOn = (i: number) => ease(seg(k, 0.18 + i * 0.2, 0.24 + i * 0.2))
  const travel = (i: number) => ease(seg(k, 0.25 + i * 0.2, 0.37 + i * 0.2)) // i 번째 칩이 i+1 로 건너간다

  return (
    <section ref={ref} data-nav="학습 흐름" className="relative md:h-[240vh]" style={{ background: INK }}>
      <div className="px-6 py-28 sm:px-10 md:sticky md:top-0 md:flex md:h-[100dvh] md:flex-col md:justify-center md:overflow-hidden md:px-16 md:py-0">
        <div className="mx-auto w-full max-w-[1240px]">
          <Title className="max-w-4xl">
            한 번의 수업보다
            <br />
            <span className="em">계속 이어지는 학습 경험</span>
          </Title>

          {/* 윗줄: 교재 순서대로 */}
          <div className="mt-12 md:mt-14" style={{ opacity: 0.35 + 0.65 * plain }}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <span className="text-[13px] font-semibold text-white/50">교재 순서대로</span>
              <span className="text-[12.5px] text-white/40">어제 어디서 막혔든, 오늘은 다음 단원</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-[4%]">
              {PLAIN_DAYS.map((u, i) => (
                <div
                  key={u}
                  className="rounded-2xl border border-white/10 px-5 py-4"
                  style={{ opacity: plain, transform: `translateY(${lerp(10, 0, plain)}px)` }}
                >
                  <span className="text-[11.5px] text-white/35">Day {i + 1}</span>
                  <p className="mt-1 text-[15px] text-white/50">{u}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 아랫줄: AI 선생님과 */}
          <div className="mt-10 md:mt-12">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <span className="text-[13px] font-semibold" style={{ color: '#7fa6ff' }}>
                AI 선생님과
              </span>
              <span className="text-[12.5px] text-white/70">어제 막힌 곳이 오늘의 수업이 됩니다</span>
            </div>
            <div className="relative grid gap-3 md:grid-cols-4 md:gap-[4%]">
              {AI_DAYS.map((d, i) => {
                const on = dayOn(i)
                const go = i < AI_DAYS.length - 1 ? travel(i) : 0
                const arrived = i > 0 ? travel(i - 1) : 1 // 앞 칩이 도착해야 '왜' 줄이 켜진다
                return (
                  <div key={d.title} className="relative h-full">
                    <div
                      className="relative h-full rounded-2xl border px-5 pb-5 pt-4"
                      style={{
                        borderColor: `rgba(46,107,255,${0.25 + 0.5 * on})`,
                        background: BASE,
                        boxShadow: on > 0.5 ? `0 20px 60px -30px ${BLUE}` : undefined,
                        opacity: on,
                        transform: `translateY(${lerp(16, 0, on)}px)`,
                      }}
                    >
                      <span className="text-[11.5px] text-white/45">Day {i + 1}</span>
                      <p className="mt-1 text-[16px] font-semibold leading-[1.4]">{d.title}</p>
                      <p className="mt-1 text-[12.5px]" style={{ color: '#7fa6ff', opacity: arrived }}>
                        {d.why}
                      </p>
                      {d.result && (
                        <span
                          className="mt-4 inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                          style={{ background: 'rgba(46,107,255,0.18)', color: '#CFE0FF', opacity: seg(on, 0.6, 1) }}
                        >
                          {d.result}
                        </span>
                      )}
                    </div>

                    {/* 다음 날로 건너가는 빛줄기 + 칩. 넓은 화면에서만(카드 사이 4% 틈을 건넌다) */}
                    {d.result && (
                      <div className="pointer-events-none absolute left-full top-1/2 hidden h-px md:block" style={{ width: '17%' }} aria-hidden>
                        <div
                          className="h-px origin-left"
                          style={{ background: `linear-gradient(90deg, ${BLUE}, #CFE0FF)`, transform: `scaleX(${go})`, boxShadow: `0 0 10px ${BLUE}` }}
                        />
                        <span
                          className="absolute top-1/2 block h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white"
                          style={{
                            left: `${go * 100}%`,
                            opacity: go > 0 && go < 1 ? 1 : 0,
                            boxShadow: `0 0 14px 3px ${BLUE}`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══ 09. WHAT WE ARE TESTING ════════════════════════════════════════════════
   이 구간의 메시지: **이해하고, 조정하고, 선생님처럼 전달할 수 있는지 확인하는 R&D.**
   즉 기능 소개가 아니라 **아직 답이 안 난 질문 세 개**다.
   ⚠️ 한때 낱말을 "이해한다/바꾼다/함께 간다" 로 세웠다가 지적받았다 - 단정형이라 기능 목록으로
   읽히고 "확인하는 중" 이라는 뜻이 사라졌다. 그래서 칸마다 **물음표로 끝나는 질문**이 주인공이고,
   '확인 중' 표시가 붙는다.
   레이아웃: 깊어지는 세 칸. 이해 → 조정 → 전달 은 앞 단계 위에 다음 단계가 서는 사슬이라
   오른쪽으로 갈수록 레일이 밝아지고 칸이 파래진다.
   그 전에는 엇갈린 들여쓰기 목록이었다(세 줄 무게가 같아 뭉개지고 영문 태그가 안 읽혔다). */
const TESTING = [
  ['이해', '학습할수록 나를\n더 깊이 이해할 수 있을까?', '쌓이는 학습 기록에서 패턴과 어려움을 읽어 낼 수 있는지 확인합니다.'],
  ['조정', '이해한 만큼\n수업을 바꿀 수 있을까?', '학습 상태가 달라질 때 다음 수업의 내용과 순서도 함께 달라지는지 확인합니다.'],
  ['전달', '그 변화를\n선생님처럼 전할 수 있을까?', 'AI 휴먼이 설명하고 제안하며 다음 학습으로 자연스럽게 이어 주는지 확인합니다.'],
] as const

/** 칸이 깊어질수록 진해지는 파랑. 셋뿐이라 식 대신 값으로 둔다. */
const DEPTH = [0.04, 0.1, 0.2]

function WhatWeAreTesting() {
  return (
    <section data-nav="R&D" className="px-6 py-28 sm:px-10 md:px-16 md:py-36" style={{ background: BASE }}>
      <div className="mx-auto max-w-[1240px]">
        <Title className="max-w-4xl">
          AI 선생님은
          <br />
          <span className="em">어디까지 나를 이해할 수 있을까요</span>
        </Title>
        <p data-reveal className="reveal mt-7 max-w-xl text-[15px] leading-[1.9] text-white/60">
          아직 정답이 나오지 않은 질문입니다. 이번 R&amp;D에서 세 가지를 직접 확인하고 있습니다.
        </p>

        {/* 깊이 레일. 점 셋이 아래 세 칸 위에 하나씩 앉는다. 넓은 화면에서만. */}
        <div className="relative mt-16 hidden h-3 md:block" aria-hidden>
          <div
            className="absolute inset-x-[16.6%] top-1/2 h-px -translate-y-1/2"
            style={{ background: `linear-gradient(90deg, rgba(255,255,255,0.12), ${BLUE})` }}
          />
          {DEPTH.map((d, i) => (
            <span
              key={i}
              className="absolute top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${16.6 + i * 33.4}%`,
                width: 8 + i * 3,
                height: 8 + i * 3,
                background: i === 2 ? '#CFE0FF' : BLUE,
                opacity: 0.45 + i * 0.27,
                boxShadow: `0 0 ${10 + i * 10}px ${BLUE}`,
              }}
            />
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:mt-8 md:grid-cols-3 md:gap-5">
          {TESTING.map(([k, q, d], i) => (
            <div
              key={k}
              data-reveal
              className="reveal relative isolate flex flex-col overflow-hidden rounded-3xl border p-8 md:min-h-[340px] md:p-9"
              style={{
                transitionDelay: `${i * 140}ms`,
                background: `rgba(46,107,255,${DEPTH[i]})`,
                borderColor: `rgba(46,107,255,${0.15 + i * 0.25})`,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium tracking-[0.02em]" style={{ color: i === 2 ? '#CFE0FF' : '#7fa6ff' }}>
                  {k}
                </p>
                <span className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[11.5px] text-white/65">
                  <span className="block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse" style={{ background: BLUE }} />
                  확인 중
                </span>
              </div>
              {/* 카드 뒤에 깔린 큰 숫자. 읽히는 글이 아니라 결이다 - 흐리게, 카드 밖으로 잘리게.
                  `isolate` + `-z-10` 이라 카드 바탕 위·글자 아래에 앉는다. */}
              <span
                aria-hidden
                className="display pointer-events-none absolute -bottom-12 -right-3 -z-10 select-none text-[200px] leading-none"
                style={{ fontWeight: 800, color: `rgba(255,255,255,${0.04 + i * 0.015})` }}
              >
                0{i + 1}
              </span>
              <p className="mt-8 whitespace-pre-line text-[clamp(1.35rem,2vw,1.7rem)] font-medium leading-[1.4] tracking-[-0.01em]">
                {q}
              </p>
              <p className="mt-auto pt-8 text-[13.5px] leading-[1.8] text-white/55 md:min-h-[3.6em]">{d}</p>
            </div>
          ))}
        </div>

        <p data-reveal className="reveal mt-16 break-keep text-center text-[clamp(1.2rem,2.6vw,2.1rem)] font-light leading-[1.55]">
          이해하고, 조정하고, 선생님처럼 전달할 수 있는지.
          <br />
          <span className="em">그것을 확인하는 R&amp;D입니다.</span>
        </p>
      </div>
    </section>
  )
}

/* ═══ 10. NEXT PHASE ═════════════════════════════════════════════════════════ */
function NextPhase() {
  return (
    <section data-nav="로드맵" className="px-6 py-28 sm:px-10 md:px-16 md:py-36" style={{ background: INK }}>
      <div className="mx-auto max-w-[1240px]">
        <Title className="max-w-4xl">
          나를 이해하는 AI를
          <br />
          <span className="em">실제 학습 경험으로</span>
        </Title>

        <div className="mt-14 grid max-w-3xl items-center gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-0">
          <div data-reveal className="reveal rounded-2xl border border-white/12 p-7">
            <span className="text-[11px] font-semibold tracking-[0.26em] text-white/45">NOW</span>
            <p className="mt-4 text-2xl font-light">R&amp;D Prototype</p>
            <p className="mt-1 text-[13px] tracking-[0.16em] text-white/45">2026.11</p>
          </div>
          <div className="flex items-center justify-center py-2 sm:px-6" aria-hidden>
            <span className="text-[20px] font-light text-white/25 sm:hidden">↓</span>
            <span className="hidden text-[20px] font-light text-white/25 sm:inline">→</span>
          </div>
          <div
            data-reveal
            className="reveal rounded-2xl border p-7"
            style={{ borderColor: BLUE, background: 'rgba(46,107,255,0.08)', transitionDelay: '130ms' }}
          >
            <span className="text-[11px] font-semibold tracking-[0.26em]" style={{ color: BLUE }}>
              NEXT
            </span>
            <p className="mt-4 text-2xl font-light">Open Beta</p>
            <p className="mt-1 text-[13px] tracking-[0.16em] text-white/45">2027.03 Target</p>
          </div>
        </div>

        <p data-reveal className="reveal mt-14 max-w-2xl text-[15px] leading-[1.95] text-white/60">
          지금 공개하는 것은 완성된 서비스를 미리 보여드리는 화면이 아닙니다. AI가 학습자의 상태를 이해하고, 그에 맞춰
          다음 학습을 조정하고, AI 휴먼이 선생님처럼 전달하는 경험을 실제 서비스 안에서 어떻게 구현할 수 있을지
          하나씩 만들어가고 있습니다.
        </p>
      </div>
    </section>
  )
}

/* ═══ 11. PRE-OPEN ═══════════════════════════════════════════════════════════
   마지막은 가운데 정렬이다. 여기서는 메시지 자체가 화면이고, 할 일이 하나뿐이다.
   ponytail: 수집 엔드포인트는 아직 배선하지 않았다. 개인정보 동의와 처리방침이
     정리되면 여기서 POST 한다. 그때까지 아무 데도 보내지 않고 화면으로만 정직하게 막는다. */
function PreOpen() {
  return (
    <section
      id="cta"
      data-nav="사전 알림"
      className="on-blue relative overflow-hidden px-6 py-32 sm:px-10 md:py-40"
      style={{ background: BLUE_BLOCK }}
    >
      <div data-reveal className="reveal mx-auto max-w-[820px] text-center">
        <h2 className="display text-[clamp(1.8rem,3.6vw,3.2rem)] leading-[1.3] tracking-[-0.01em]">
          나를 가장 잘 이해하는
          <br />
          <span className="em">AI 선생님</span>
        </h2>
        <p className="mt-8 text-[15px] leading-[2] text-white/85">
          내가 어디에서 막히는지 알고, 지금 필요한 공부를 알고,
          <br />
          오늘의 결과에 따라 다음 수업을 다시 준비하는 선생님.
        </p>
        <p className="mt-6 text-[15px] leading-[2] text-white/75">2027년 3월 오픈 베타를 목표로 개발 중입니다.</p>

        <form className="mx-auto mt-12 flex max-w-lg flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="v3-email" className="sr-only">
            이메일
          </label>
          <input
            id="v3-email"
            type="email"
            required
            inputMode="email"
            placeholder="이메일 주소"
            className="min-h-[54px] flex-1 rounded-full border border-white/40 bg-white/[0.12] px-6 text-[15px] text-white placeholder:text-white/70 focus:border-white focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-[54px] whitespace-nowrap rounded-full bg-white px-8 text-[14px] font-semibold transition-transform active:scale-[0.98]"
            style={{ color: BLUE_BLOCK, boxShadow: '0 16px 44px -18px rgba(0,0,0,0.45)' }}
          >
            사전 알림 신청
          </button>
        </form>

        <p className="mx-auto mt-8 max-w-lg text-[12px] leading-[1.9] text-white/65">
          YBM AI 어학원은 현재 개발 중인 R&amp;D 프로젝트이며, 정식으로 다운로드하거나 수강할 수 있는 서비스는
          아닙니다. 사전 알림 등록은 오픈 베타 참여 또는 정식 서비스 이용을 보장하지 않습니다. 개발 일정과 제공 방식은
          변경될 수 있으며 관련 내용이 정해지는 대로 안내드립니다.
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="px-6 pb-14 sm:px-10 md:px-16" style={{ background: BASE }}>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 border-t border-white/12 pt-8 text-[11px] tracking-[0.24em] text-white/35 sm:flex-row sm:justify-between">
        <span>YBM · Language brings a bigger world</span>
        <span>R&amp;D Project · Open Beta Target 2027.03</span>
      </div>
    </footer>
  )
}
