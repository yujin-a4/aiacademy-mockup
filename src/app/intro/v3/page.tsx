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

import { useEffect, useRef, useState } from 'react'

import { ease, lerp, seg, useReveal, useSmoothScroll, useTrackProgress } from '../_lib'
import { BASE, BLUE, INK, Stage, StageFlow } from './_stage'

/* ══════════════════════════════════════════════════════════════════════════ */

export default function IntroV3() {
  useSmoothScroll()
  useReveal()

  /* ⚠️ main 에 `overflow-x: hidden` 을 쓰면 **하위의 position:sticky 가 전부 죽는다**
     (실측: 섹션이 스크롤에 딸려 올라가 사라졌다). 조상에 overflow 가 있으면 그게
     스크롤 컨테이너가 되기 때문이다. `clip` 은 같은 일을 하면서 컨테이너를 만들지 않는다. */
  return (
    <main className="break-keep bg-[#0B1830] text-white [overflow-x:clip]">
      <div className="intro-grain" aria-hidden />
      <TopBar />
      <Stage />
      <StageFlow />
      <Trial />
      <ParkHyeWon />
      <LearningFlow />
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
      className={`reveal text-[clamp(1.5rem,3vw,2.6rem)] font-light leading-[1.35] tracking-[-0.01em] ${className}`}
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
    <section id="trial" className="px-6 py-28 sm:px-10 md:px-16 md:py-36" style={{ background: INK }}>
      <div className="mx-auto max-w-[1240px]">
        <Title className="max-w-2xl">
          AI 선생님이 이끌어주는 수업,
          <br />
          <span className="font-medium">지금 체험해 보세요</span>
        </Title>
        <p data-reveal className="reveal mt-8 max-w-2xl text-[15px] leading-[1.95] text-white/60">
          아래는 지금 만들고 있는 수업 화면 그대로입니다. 이도윤 선생님의 LC 1강을 직접 눌러
          보실 수 있습니다.
        </p>

        <div ref={box} className="mt-12 flex justify-center">
          <div
            className="relative overflow-hidden rounded-[24px] border border-white/15 bg-black/60 p-2"
            style={{
              width: inline ? TRIAL_W * inline + 16 : '100%',
              height: inline ? TRIAL_H * inline + 16 : undefined,
              boxShadow: `0 60px 140px -50px ${BLUE}`,
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

        <p className="mt-6 text-[12px] leading-[1.9] text-white/40">
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
    <section id="park" ref={ref} className="relative md:h-[150vh]" style={{ background: BASE }}>
      <div className="px-6 py-24 sm:px-10 md:sticky md:top-0 md:flex md:h-[100dvh] md:items-center md:overflow-hidden md:px-16 md:py-0">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <Title>
              실제 강사를 기반으로 한
              <br />
              <span className="font-medium">AI 휴먼의 가능성</span>
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
   레이아웃 계열: **닫히는 고리.** 앞에서 겪은 흐름을 구조 한 장으로 정리한다.
   다섯 단계를 한 줄로 늘어놓고 **마지막에서 처음으로 돌아오는 선**을 그린다.
   그 되돌아오는 선이 이 섹션의 전부다. 직선으로 끝나면 "다섯 단계" 고,
   닫히면 "계속 이어지는 학습" 이 된다. 섹션 제목이 말하는 게 정확히 그거다. */
const FLOW_STEPS = [
  ['START', '오늘의 시작점을 찾습니다', '최근 학습 상태를 보고 오늘 어디에서 시작할지 정합니다.'],
  ['LEARN', '오늘의 학습을 진행합니다', '학습자는 공부하고, AI는 과정과 결과를 계속 쌓습니다.'],
  ['ANALYZE', '오늘의 학습을 다시 읽습니다', '어디에서 막혔는지, 어떤 부분이 안정됐는지 확인합니다.'],
  ['ADJUST', '다음 학습을 다시 구성합니다', '오늘의 결과를 바탕으로 다음 학습의 내용과 순서를 조정합니다.'],
  ['CONTINUE', '다음에는 이어서 시작합니다', '지난 학습의 결과가 다음 수업의 출발점이 됩니다.'],
]

function LearningFlow() {
  return (
    <section className="px-6 py-28 sm:px-10 md:px-16 md:py-36" style={{ background: INK }}>
      <div className="mx-auto max-w-[1240px]">
        <Title className="max-w-2xl">
          한 번의 수업보다
          <br />
          <span className="font-medium">계속 이어지는 학습 경험</span>
        </Title>

        <div className="relative mt-16">
          <div className="absolute inset-x-0 top-[7px] hidden h-px bg-white/20 md:block" aria-hidden />
          <div className="grid gap-10 md:grid-cols-5 md:gap-6">
            {FLOW_STEPS.map(([k, t, d], i) => (
              <div key={k} data-reveal className="reveal relative" style={{ transitionDelay: `${i * 100}ms` }}>
                <span
                  className="block h-[15px] w-[15px] rounded-full border-[3px]"
                  style={{ borderColor: BLUE, background: INK }}
                  aria-hidden
                />
                <span className="mt-6 block text-[11px] font-semibold tracking-[0.26em]" style={{ color: BLUE }}>
                  {k}
                </span>
                <p className="mt-3 text-[15px] font-medium leading-[1.5]">{t}</p>
                <p className="mt-3 text-[13px] leading-[1.85] text-white/55">{d}</p>
              </div>
            ))}
          </div>

          {/* 되돌아오는 선. CONTINUE 아래에서 나와 START 아래로 돌아간다. */}
          <div className="relative mt-14 hidden h-16 md:block" aria-hidden>
            <svg viewBox="0 0 1000 64" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <path
                d="M910,0 L910,44 Q910,56 898,56 L102,56 Q90,56 90,44 L90,0"
                fill="none"
                stroke={BLUE}
                strokeOpacity="0.5"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M84,12 L90,0 L96,12"
                fill="none"
                stroke={BLUE}
                strokeOpacity="0.5"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span className="absolute inset-x-0 top-[26px] text-center text-[12px] text-white/45">
              지난 학습의 결과가 다음 수업의 출발점이 됩니다
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══ 09. WHAT WE ARE TESTING ════════════════════════════════════════════════
   레이아웃 계열: **엇갈린 편집형 목록.** 세 개를 균등 카드로 세우지 않는다.
   숫자를 크게 쓰고 단마다 들여쓰기를 달리해서 눈이 한 번에 하나씩 읽게 한다. */
const TESTING = [
  ['01', '학습할수록\n더 깊이 이해할 수 있는가', '시간이 지나며 쌓이는 학습 정보를 통해 학습자의 패턴과 어려움을 더 깊이 이해할 수 있는가.', ['LEARN', 'KNOW']],
  ['02', '이해한 만큼\n수업을 바꿀 수 있는가', '학습 상태가 달라질 때마다 다음 수업의 내용과 순서도 함께 달라질 수 있는가.', ['KNOW', 'ADJUST']],
  ['03', '그 변화를\n선생님처럼 전달할 수 있는가', 'AI 휴먼이 학습자의 상황을 이해하고 자연스럽게 설명하고 제안하며 다음 학습으로 이어줄 수 있는가.', ['ADJUST', 'TEACH']],
] as const

/** 단마다 들여쓰기를 한 칸씩 더 준다. **`md:` 부터만** 준다 (폰에서 들여쓰면 글상자만 좁아진다).
 *  Tailwind 는 클래스 이름을 빌드 때 훑어 가므로 `md:pl-${i*8}` 처럼 만들어 쓰면 안 나온다. */
const INDENT = ['', 'md:pl-8', 'md:pl-16']

function WhatWeAreTesting() {
  return (
    <section className="px-6 py-28 sm:px-10 md:px-16 md:py-36" style={{ background: BASE }}>
      <div className="mx-auto max-w-[1240px]">
        <Title className="max-w-2xl">
          AI 선생님은
          <br />
          <span className="font-medium">어디까지 나를 이해할 수 있을까요</span>
        </Title>

        <div className="mt-14">
          {TESTING.map(([n, t, d, pair], i) => (
            <div
              key={n}
              data-reveal
              className={`reveal grid gap-6 border-t border-white/10 py-11 md:grid-cols-[auto_1fr_auto] md:items-start md:gap-12 ${INDENT[i]}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <span className="text-[clamp(2.2rem,4vw,3.4rem)] font-light leading-none text-white/20 tabular-nums">
                {n}
              </span>
              <div>
                <p className="whitespace-pre-line text-[clamp(1.1rem,1.9vw,1.5rem)] font-medium leading-[1.5]">{t}</p>
                <p className="mt-5 max-w-xl text-[14px] leading-[1.9] text-white/60">{d}</p>
              </div>
              <div
                className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] md:pt-3"
                style={{ color: BLUE }}
              >
                <span>{pair[0]}</span>
                <span className="text-white/25" aria-hidden>
                  →
                </span>
                <span>{pair[1]}</span>
              </div>
            </div>
          ))}
        </div>

        <p data-reveal className="reveal mt-16 text-[clamp(1.3rem,3vw,2.4rem)] font-light leading-[1.5] md:pl-24">
          이해하고, 바꾸고, <span className="font-medium">함께 가는 것.</span>
        </p>
      </div>
    </section>
  )
}

/* ═══ 10. NEXT PHASE ═════════════════════════════════════════════════════════ */
function NextPhase() {
  return (
    <section className="px-6 py-28 sm:px-10 md:px-16 md:py-36" style={{ background: INK }}>
      <div className="mx-auto max-w-[1240px]">
        <Title className="max-w-2xl">
          나를 이해하는 AI를
          <br />
          <span className="font-medium">실제 학습 경험으로</span>
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
      className="relative overflow-hidden px-6 py-32 sm:px-10 md:py-40"
      style={{ background: `radial-gradient(900px 520px at 50% 118%, rgba(46,107,255,0.38), transparent 62%), ${BASE}` }}
    >
      <div data-reveal className="reveal mx-auto max-w-[820px] text-center">
        <h2 className="text-[clamp(1.6rem,3.2vw,2.8rem)] font-light leading-[1.35] tracking-[-0.01em]">
          나를 가장 잘 이해하는
          <br />
          <span className="font-medium">AI 선생님</span>
        </h2>
        <p className="mt-8 text-[15px] leading-[2] text-white/65">
          내가 어디에서 막히는지 알고, 지금 필요한 공부를 알고,
          <br />
          오늘의 결과에 따라 다음 수업을 다시 준비하는 선생님.
        </p>
        <p className="mt-6 text-[15px] leading-[2] text-white/50">2027년 3월 오픈 베타를 목표로 개발 중입니다.</p>

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
            className="min-h-[54px] flex-1 rounded-full border border-white/25 bg-white/[0.06] px-6 text-[15px] text-white placeholder:text-white/50 focus:border-white focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-[54px] whitespace-nowrap rounded-full px-8 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
            style={{ background: BLUE, boxShadow: `0 16px 44px -14px ${BLUE}` }}
          >
            사전 알림 신청
          </button>
        </form>

        <p className="mx-auto mt-8 max-w-lg text-[12px] leading-[1.9] text-white/40">
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
