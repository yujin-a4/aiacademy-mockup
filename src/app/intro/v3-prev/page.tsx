'use client'

/**
 * /intro/v3-prev — **개편 전 V3 의 보존본.** 손대지 말 것.
 *
 * 2026-09-23 V3 를 새 기획("나를 가장 잘 이해하는 AI 선생님", 10섹션)으로 전면 개편하면서
 * 그 전 판을 그대로 남겨 둔 것이다. 남긴 이유 둘:
 *   1. 롤백 — `cp src/app/intro/v3-prev/page.tsx src/app/intro/v3/page.tsx` 한 줄이면 되돌아간다.
 *   2. 비교 — /intro 는 회의에서 버전을 나란히 여는 자리다. 새 판이 나은지 눈으로 대보려면
 *      옛 판이 URL 로 살아 있어야 한다.
 * 새 판이 확정되면 이 폴더는 지운다.
 */

/**
 * (아래는 보존본의 원래 주석) /intro/v3 — **AI 휴먼 기반 관리형 학습 서비스** 버전.
 * 기획 정본: 구글문서 "YBM AI 어학원 소개 페이지 기획안" VERSION 3 (8섹션).
 *
 * ⭐ V2 와 무엇이 다른가: V2 는 "AI 가 한 문제를 어떻게 가르치는가"였다.
 *   V3 는 **"수업과 수업 사이"** 다 — 혼자 공부할 때 학습 흐름을 누가 이어주는가.
 *   그래서 이 페이지의 연출 축은 '깊이로 들어가기'가 아니라 **'흩어진 것이 하나로 이어지기'** 다.
 *   02 에서 3D 공간에 흩어진 카드(TODAY·PROGRESS·LESSON·COMPLETE·NEXT)가 스크롤에 따라
 *   한 줄로 정렬되는 장면이 이 버전의 심장이다.
 *
 * 디자인 언어는 사용자가 준 시안(project_page_reference.png) 기준 — 딥 네이비 그라데이션,
 * 곡선 경계, 글래스 카드, 파란 글로우, 좌측 섹션 번호 레일, 한글 대형 제목 + 영문 보조 라벨.
 * MotionSites 템플릿은 쓰지 않았다(사용자 지시).
 *
 * ponytail: 3D 는 전부 CSS `perspective` + `transform` 이다. Three.js 를 안 쓴 이유는
 *   렌더링할 3D '물체'가 없어서다 — 여기서 움직이는 건 카드와 인물, 즉 평면이다.
 *   평면을 공간에 놓는 데 WebGL 컨텍스트를 띄울 이유가 없다(태블릿 배터리도 먹는다).
 */

import { useEffect, useRef } from 'react'

import { ease, lerp, seg, usePointer, useReveal, useSmoothScroll, useTrackProgress } from '../_lib'

/* ── 디자인 토큰. 이 페이지 안에서만 쓴다 — 앱의 v2 토큰(primary/accent)과 섞지 않는다. */
const INK = '#0B1830' // 가장 깊은 배경
const BLUE = '#2E6BFF' // 강조

/** 영문 보조 라벨 — 시안의 좌측/상단 작은 글자. */
function Eyebrow({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <span
      className={`block text-[11px] font-semibold uppercase tracking-[0.34em] ${
        tone === 'light' ? 'text-white/45' : 'text-[#0B1830]/45'
      }`}
    >
      {children}
    </span>
  )
}

/** 섹션 사이 곡선 경계. 시안이 직선 대신 호(arc)로 면을 나눈다 — 그 느낌을 그대로 쓴다. */
function Arc({ from, to, flip = false }: { from: string; to: string; flip?: boolean }) {
  return (
    <div className="relative -mt-px h-[9vw] min-h-[60px] w-full overflow-hidden" style={{ background: from }} aria-hidden>
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path
          d={flip ? 'M0,120 C420,0 1020,0 1440,120 L1440,120 L0,120 Z' : 'M0,0 C420,140 1020,140 1440,0 L1440,120 L0,120 Z'}
          fill={to}
        />
      </svg>
    </div>
  )
}

/** 유리 카드 — 시안의 반투명 패널. 어두운 면에서만 쓴다(밝은 면에서는 그냥 흰 카드가 낫다). */
function Glass({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-white/12 bg-white/[0.06] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */

export default function IntroV3Prev() {
  useSmoothScroll()
  useReveal()

  /* ⚠️ main 에 `overflow-x: hidden` 을 쓰면 **하위의 position:sticky 가 전부 죽는다**
     (실측: 02 섹션이 스크롤에 딸려 올라가 사라졌다). 조상에 overflow 가 있으면 그게
     스크롤 컨테이너가 되기 때문이다. `clip` 은 같은 일을 하면서 컨테이너를 만들지 않는다. */

  return (
    <main className="bg-[#0B1830] text-white [overflow-x:clip]">
      <div className="intro-grain" aria-hidden />
      <TopBar />
      <Hero />
      <PainPoint />
      <Arc from={INK} to="#F2F5FA" />
      <ManagedLearning />
      <Arc from="#F2F5FA" to={INK} flip />
      <ParkHyeWon />
      <SessionDemo />
      <Arc from={INK} to="#F2F5FA" />
      <WhatWeAreTesting />
      <Arc from="#F2F5FA" to={INK} flip />
      <NextPhase />
      <PreOpenCta />
      <Footer />
    </main>
  )
}

function TopBar() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-[13px] font-bold tracking-[0.2em]">YBM</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/45">
          AI Academy · R&amp;D Project
        </span>
      </div>
    </header>
  )
}

/* ═══ SECTION 01. HERO ═══
   시안의 첫 화면: 좌측에 번호 레일과 대형 제목, 우측에 인물 + 글로우 + 떠 있는 유리 칩.
   칩은 스크롤과 마우스에 따라 서로 다른 깊이로 움직인다(=패럴랙스가 깊이를 만든다). */
function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(ref)
  const pt = usePointer()


  return (
    <div ref={ref} className="relative h-[140vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* 배경: 중앙에서 퍼지는 파란 글로우 두 겹 */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(1100px 640px at 72% 38%, rgba(46,107,255,0.34), transparent 62%),
                         radial-gradient(900px 520px at 18% 82%, rgba(46,107,255,0.14), transparent 60%),
                         ${INK}`,
          }}
        />

        {/* 히어로 이미지 — **실존 인물 사진이 아니다.**
            AI 휴먼이 오늘 학습·진행률·완료·다음 일정 패널을 고리 모양 선으로 이어 들고 있는
            개념 이미지(gpt-image-2 생성). 박혜원 사진을 여기 쓰면 "이 사람이 관리해 준다"는
            약속으로 읽히는데, 관리형 학습은 아직 기획 방향이지 제품이 아니다.
            이미지 자체가 왼쪽을 비워 둔 구도라 글자 자리는 따로 만들 필요가 없다. */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(${pt.x * -10}px, ${lerp(0, -70, ease(p)) + pt.y * -8}px, 0) scale(${lerp(1.08, 1.02, ease(seg(p, 0, 0.6)))})`,
          }}
        >
          <img
            src="/intro/v3-hero.webp"
            alt="AI 휴먼이 오늘 학습·진행률·다음 일정을 하나의 흐름으로 이어주는 모습을 표현한 이미지"
            className="h-full w-full object-cover object-right"
          />
          {/* 글자 쪽으로 어둡게 — 이미지가 이미 왼쪽이 비어 있지만, 좁은 화면에서는 인물이
              왼쪽까지 들어와서 스크림이 없으면 제목이 안 읽힌다. */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${INK} 0%, rgba(11,24,48,0.88) 22%, rgba(11,24,48,0.35) 48%, transparent 66%)`,
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: `linear-gradient(0deg, ${INK}, transparent)` }} />
        </div>

        {/* 좌측 번호 레일 */}
        <div className="pointer-events-none absolute left-6 top-1/2 hidden -translate-y-1/2 md:block">
          {['01', '02', '03', '04', '05'].map((n, i) => (
            <div key={n} className="mb-5 flex items-center gap-3">
              <span className={`text-[11px] tracking-[0.2em] ${i === 0 ? 'text-white' : 'text-white/25'}`}>{n}</span>
              <span className={`block h-px ${i === 0 ? 'w-8 bg-white' : 'w-4 bg-white/25'}`} />
            </div>
          ))}
        </div>

        {/* 카피 */}
        <div className="relative flex h-full items-center px-6 sm:px-10 md:pl-24 lg:pl-32">
          <div
            className="max-w-[640px]"
            style={{ transform: `translateY(${lerp(0, -80, ease(p))}px)`, opacity: 1 - seg(p, 0.62, 0.9) }}
          >
            <Eyebrow>01 — Managed learning</Eyebrow>
            <p className="mt-7 text-[15px] text-white/60">사람이 만드는 더 큰 가능성, AI가 이어갑니다.</p>
            <h1 className="mt-4 text-[clamp(2rem,4.4vw,4rem)] font-light leading-[1.22]">
              혼자 공부할 때,
              <br />
              <span className="font-medium">누가 계속 학습을 이어준다면</span>
              <br />
              어떨까요?
            </h1>
            <p className="mt-8 max-w-lg text-[15px] leading-[1.95] text-white/65">
              YBM은 AI 휴먼이 학습자의 곁에서 공부의 시작과 다음 단계를 이어주는{' '}
              <strong className="font-medium text-white">AI 휴먼 기반 관리형 학습 서비스</strong>를 연구합니다.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                href="#demo"
                className="inline-flex min-h-[52px] items-center rounded-full px-7 text-[14px] font-medium"
                style={{ background: BLUE, boxShadow: `0 14px 40px -12px ${BLUE}` }}
              >
                AI 휴먼 시연 보기
              </a>
              <a
                href="#cta"
                className="inline-flex min-h-[52px] items-center rounded-full border border-white/25 px-7 text-[14px] text-white/85"
              >
                오픈 베타 사전 알림
              </a>
            </div>

            <p className="mt-10 text-[12px] leading-[1.9] text-white/40">
              YBM AI 어학원은 현재 개발 중인 R&amp;D 프로젝트입니다. 정식으로 다운로드하거나 수강할 수 있는 서비스는
              아닙니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ SECTION 02. PAIN POINT ═══
   기획서: "혼자 공부하면 수업 밖의 순간까지 내가 관리해야 한다."
   앞서 카드를 정렬시키는 연출을 썼는데 **무슨 뜻인지 안 읽혔다**(사용자 지적).
   정렬은 '정리됨'을 보여줄 뿐 이 섹션이 말해야 할 **부담**을 보여주지 못했다.
   그래서 뒤집었다 — 혼자 내려야 하는 결정들이 **위에서 쏟아져 바닥에 쌓인다.**
   쌓일수록 숫자가 올라가고, 다 쌓이면 한 줄이 뜬다. 해소는 다음 섹션(03)의 몫이다.
   ponytail: 물리엔진 없음. 낙하는 진행률 → translateY 하나, 착지 지점은 미리 박아 둔 값. */
const DECISIONS = [
  '오늘 뭐부터 하지',
  '어디까지 했더라',
  '이 유형 또 틀렸는데',
  '복습을 해야 하나',
  '문제집을 바꿔야 하나',
  '오늘은 몇 개나',
  '시간이 없는데',
  '내일도 할 수 있을까',
  '이 강의가 맞나',
  '단어부터 할까',
  '다시 처음부터?',
  '지금 잘하고 있나',
  '어제 건 넘어갈까',
  '주말에 몰아서?',
]

/** 카드가 떨어져 멈추는 자리. 손으로 박았다 — 난수를 쓰면 새로고침마다 그림이 달라진다. */
const PILE = [
  { x: 8, y: 9, r: -9 },
  { x: 26, y: 7, r: 6 },
  { x: 45, y: 10, r: -4 },
  { x: 63, y: 8, r: 11 },
  { x: 80, y: 11, r: -7 },
  { x: 15, y: 22, r: 8 },
  { x: 35, y: 20, r: -12 },
  { x: 54, y: 23, r: 5 },
  { x: 72, y: 21, r: -6 },
  { x: 88, y: 24, r: 9 },
  { x: 22, y: 35, r: -5 },
  { x: 44, y: 37, r: 7 },
  { x: 64, y: 34, r: -10 },
  { x: 82, y: 38, r: 4 },
]

function PainPoint() {
  const ref = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(ref)

  /* 카드마다 떨어지기 시작하는 시점을 어긋나게 둔다 — 한꺼번에 떨어지면 '전환'으로 보이고,
     어긋나게 떨어져야 '쏟아진다'로 보인다. */
  const fallOf = (i: number) => {
    const start = 0.12 + (i / DECISIONS.length) * 0.5
    return ease(seg(p, start, start + 0.16))
  }
  const landed = DECISIONS.filter((_, i) => fallOf(i) > 0.92).length
  const closing = seg(p, 0.84, 0.95)

  return (
    <div ref={ref} className="relative h-[240vh]" style={{ background: INK }}>
      <div className="sticky top-0 h-screen overflow-hidden px-6 sm:px-10 md:px-16">
        <div className="mx-auto h-full w-full max-w-[1240px]">
          <div className="pt-[14vh]">
            <Eyebrow>02 — The gap between classes</Eyebrow>
            <h2 className="mt-6 max-w-2xl text-[clamp(1.5rem,3vw,2.6rem)] font-light leading-[1.35]">
              혼자 공부할 때는, 수업 밖의 순간까지
              <br />
              <span className="font-medium">내가 관리해야 합니다.</span>
            </h2>
          </div>

          {/* 쏟아지는 결정들 */}
          <div className="pointer-events-none absolute inset-x-6 bottom-0 top-[30vh] sm:inset-x-10 md:inset-x-16">
            <div className="relative mx-auto h-full max-w-[1240px]" style={{ perspective: '900px' }}>
              {DECISIONS.map((d, i) => {
                const f = fallOf(i)
                const slot = PILE[i]
                return (
                  <div
                    key={d}
                    className="absolute"
                    style={{
                      left: `${slot.x}%`,
                      bottom: `${slot.y}%`,
                      opacity: f > 0 ? Math.min(1, f * 4) * (1 - closing * 0.75) : 0,
                      transform: `translate(-50%, ${lerp(-62, 0, f)}vh) rotate(${lerp(slot.r * 2.4, slot.r, f)}deg)`,
                      willChange: 'transform, opacity',
                    }}
                  >
                    <span className="block whitespace-nowrap rounded-xl border border-white/12 bg-white/[0.07] px-4 py-3 text-[13px] text-white/80 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] backdrop-blur-sm md:text-[14px]">
                      {d}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 쌓인 개수 — 애니메이션이 무슨 뜻인지 숫자로 못 박는다 */}
          <div className="absolute right-6 top-[14vh] text-right sm:right-10 md:right-16">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
              Decisions you make alone
            </span>
            <p className="mt-3 text-[clamp(2rem,5vw,3.6rem)] font-light tabular-nums" style={{ color: BLUE }}>
              {String(landed).padStart(2, '0')}
              <span className="ml-2 text-[0.4em] tracking-[0.2em] text-white/40">/ {DECISIONS.length}</span>
            </p>
          </div>

          {/* 다 쌓이면 화면 한가운데에 크게 — 쏟아진 것들 위로 결론이 얹힌다.
              뒤에 카드가 깔려 있어서 글자 뒤를 어둡게 깔아 준다(안 그러면 안 읽힌다). */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
            style={{ opacity: closing, transform: `translateY(${lerp(18, 0, closing)}px)` }}
          >
            <div
              className="max-w-[860px] rounded-3xl px-8 py-10 text-center"
              style={{ background: `radial-gradient(60% 60% at 50% 50%, rgba(11,24,48,0.92), rgba(11,24,48,0.55) 70%, transparent)` }}
            >
              <p className="text-[clamp(1.15rem,2.4vw,2rem)] font-light leading-[1.6] text-white">
                공부할 콘텐츠가 있어도, 내가 잘하고 있는지,
                <br className="hidden sm:block" /> 뭘 더 해야 하는지{' '}
                <strong className="font-medium">혼자 이어가는 일이 어려울 때가 많습니다.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ SECTION 03. MANAGED LEARNING ═══ 밝은 면. 다섯 단계를 실제 카드로 세운다. */
/* 관리형 학습의 다섯 장면.
   ⚠️ 처음엔 '학습 시작 → 오늘 학습 확인 → 수업 진행 → 학습 완료 → 다음 학습 연결' 로 적었는데
   그건 **흐름의 이름**일 뿐 관리가 아니었다(사용자 지적). 그래서 "사람 담임이 수업 밖에서
   실제로 해주는 일"로 다시 뽑았다. 전부 **학습자가 안 해도 되는 일**의 목록이고,
   02 에서 쏟아진 결정들과 하나씩 짝이 맞는다.
   순서는 시간 순이다: 오늘 시작 → 나를 앎 → 틀림 → 밀림 → 안 옴. 마지막이 관계로 끝나서
   다음 섹션(AI 휴먼)으로 자연스럽게 넘어간다. */
const STEPS = [
  {
    n: '01',
    k: 'Decide',
    t: '오늘 분량을 정해서 가져옵니다',
    d: '뭘 얼마나 할지 고민하는 시간을 없앱니다. 시험일까지 남은 날, 어제까지의 진도, 최근 오답을 보고 오늘 할 몫을 정해 옵니다.',
  },
  {
    n: '02',
    k: 'Remember',
    t: '내가 어디서 흔들리는지 기억합니다',
    d: '한 번 틀린 문제가 아니라, 여러 번 반복해서 놓치는 자리를 기억합니다. 매번 처음 만난 학습자로 대하지 않습니다.',
  },
  {
    n: '03',
    k: 'Carry over',
    t: '틀린 건 그냥 지나가지 않습니다',
    d: '오늘 틀린 유형이 다음 학습에 다시 올라옵니다. 언제 복습해야 하는지 학습자가 기억하고 있지 않아도 됩니다.',
  },
  {
    n: '04',
    k: 'Adjust',
    t: '밀리면 계획을 다시 짭니다',
    d: '계획대로 안 되는 날이 있습니다. 밀린 분량을 남은 기간에 다시 나눠, 그만두는 대신 이어가게 합니다.',
  },
  {
    n: '05',
    k: 'Reach out',
    t: '며칠 비면, 먼저 말을 겁니다',
    d: '돌아오는 일을 학습자의 의지에만 맡기지 않습니다. 비어 있는 날을 알아채고, 다시 시작할 지점을 들고 먼저 말을 겁니다.',
  },
]

function ManagedLearning() {
  return (
    <section className="bg-[#F2F5FA] px-6 py-28 text-[#0B1830] sm:px-10 md:px-16">
      <div className="mx-auto max-w-[1240px]">
        <Eyebrow tone="dark">03 — Managed learning</Eyebrow>
        <h2 data-reveal className="reveal mt-6 max-w-3xl text-[clamp(1.5rem,3vw,2.6rem)] font-light leading-[1.35]">
          강의하는 AI를 넘어,
          <br />
          <span className="font-medium">나를 기억하고 관리해 주는 AI 휴먼으로.</span>
        </h2>

        <div className="mt-16 grid gap-5 md:grid-cols-5" style={{ perspective: '1400px' }}>
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              data-reveal
              className="reveal group rounded-2xl border border-[#0B1830]/8 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(11,24,48,0.5)]"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: BLUE }}>
                {s.k}
              </span>
              <p className="mt-4 text-[17px] font-medium">{s.t}</p>
              <p className="mt-3 text-[13px] leading-[1.8] text-[#0B1830]/60">{s.d}</p>
              <span className="mt-6 block h-px w-full bg-[#0B1830]/10" />
              <span className="mt-3 block text-[11px] tracking-[0.2em] text-[#0B1830]/35">{s.n}</span>
            </div>
          ))}
        </div>

        <p data-reveal className="reveal mt-12 max-w-2xl text-[13px] leading-[1.9] text-[#0B1830]/50">
          여기 보여드리는 흐름은 현재 연구 중인 방향입니다. 실제로 제공되는 기능과 방식은 개발 범위에 따라 달라질 수
          있습니다.
        </p>
      </div>
    </section>
  )
}

/* ═══ SECTION 04. PARK HYE WON AI HUMAN ═══
   실제 강사 → AI 휴먼 전환을 스크롤로 넘긴다. */
function ParkHyeWon() {
  const ref = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(ref)
  const toAi = ease(seg(p, 0.22, 0.52))

  return (
    <div ref={ref} className="relative h-[210vh]" style={{ background: INK }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-6 sm:px-10 md:px-16">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Eyebrow>04 — Park Hye Won</Eyebrow>
            <h2 className="mt-6 text-[clamp(1.5rem,2.9vw,2.4rem)] font-light leading-[1.35]">
              관리형 학습 서비스의 얼굴도,
              <br />
              <span className="font-medium">실제 강사를 기반으로 만들 수 있습니다.</span>
            </h2>
            <p className="mt-7 max-w-md text-[15px] leading-[1.95] text-white/65">
              YBM 토익 스타강사 박혜원. 강사의 얼굴과 목소리, 말투를 기반으로 만든 AI 휴먼이 학습을 이어주는 역할을
              맡을 수 있을지 확인하고 있습니다.
            </p>
            <ul className="mt-8 space-y-2.5">
              {['오늘 학습을 시작해볼까요? — 말을 거는 장면', '학습 화면을 함께 확인하는 장면', '끝난 뒤 다음 학습을 안내하는 장면'].map(
                (t, i) => (
                  <li
                    key={t}
                    className="flex items-start gap-3 text-[13px] leading-[1.8] text-white/55"
                    style={{ opacity: seg(p, 0.45 + i * 0.08, 0.55 + i * 0.08) }}
                  >
                    <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full" style={{ background: BLUE }} />
                    {t}
                  </li>
                ),
              )}
            </ul>
            <p className="mt-9 text-[12px] leading-[1.9] text-white/40">
              실제 박혜원 강사가 실시간으로 학습을 관리하는 것이 아닙니다. 박혜원 강사를 기반으로 구현한 AI 휴먼을
              활용한 시연 영상입니다.
            </p>
          </div>

          {/* 사진 → 영상. 전환 중에 프레임이 살짝 돌아간다(평면을 공간에 놓는다). */}
          <div style={{ perspective: '1400px' }}>
            <div
              className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/12"
              style={{
                transform: `rotateY(${lerp(10, 0, toAi)}deg) rotateX(${lerp(-6, 0, toAi)}deg) scale(${lerp(0.94, 1, toAi)})`,
                boxShadow: `0 40px 120px -40px ${BLUE}`,
              }}
            >
              <img
                src="/instructor/park.png"
                alt="실제 박혜원 강사"
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: 1 - toAi }}
              />
              <video
                src="/video/video-park.mp4"
                muted
                loop
                playsInline
                autoPlay
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: toAi }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-5">
                <span className="rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] backdrop-blur">
                  {toAi > 0.5 ? 'AI Human' : 'Real Instructor'}
                </span>
                <span className="text-[11px] tracking-[0.2em] text-white/60">박혜원</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ SECTION 05. SESSION DEMO ═══ 영상 시연형(B안). 스크롤이 재생 위치를 움직인다. */
function SessionDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(ref)
  const v = useRef<HTMLVideoElement>(null)
  const scrub = seg(p, 0.18, 0.92)

  /* 렌더 중에 currentTime 을 건드리면 안 된다 — 부수효과는 effect 에서. */
  useEffect(() => {
    const el = v.current
    if (!el || !el.duration || Number.isNaN(el.duration)) return
    const t = scrub * el.duration
    if (Math.abs(el.currentTime - t) > 0.04) el.currentTime = t
  }, [scrub])

  const caption =
    p < 0.38 ? ['수업 시작 전', '오늘 학습을 확인합니다'] : p < 0.7 ? ['수업 중', 'AI 강사가 질문으로 짚어줍니다'] : ['수업 이후', '다음 학습으로 이어집니다']

  return (
    <div id="demo" ref={ref} className="relative h-[230vh]" style={{ background: INK }}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6 sm:px-10">
        <div className="w-full max-w-[1100px]">
          <Eyebrow>05 — Session demo</Eyebrow>
          <h2 className="mt-5 max-w-2xl text-[clamp(1.4rem,2.7vw,2.3rem)] font-light leading-[1.35]">
            AI 휴먼과 함께하는 학습은,
            <br />
            <span className="font-medium">수업 전후까지 이어집니다.</span>
          </h2>

          <div className="mt-10" style={{ perspective: '1600px' }}>
            <div
              className="relative overflow-hidden rounded-[24px] border border-white/15 bg-black/50 p-2.5"
              style={{
                transform: `rotateX(${lerp(12, 0, ease(seg(p, 0, 0.22)))}deg) scale(${lerp(0.9, 1, ease(seg(p, 0, 0.22)))})`,
                boxShadow: `0 60px 140px -50px ${BLUE}`,
              }}
            >
              <div className="relative aspect-[1180/820] overflow-hidden rounded-[16px] bg-black">
                {/* 임시 소재: 실제 수업 화면(LC 1강, 이도윤)을 녹화한 것. play() 는 부르지 않는다. */}
                <video ref={v} src="/video/intro-lesson.mp4" muted playsInline preload="auto" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: BLUE }}>
                {caption[0]}
              </span>
              <p className="mt-2 text-[14px] text-white/65">{caption[1]}</p>
            </div>
            {/* 재생 진행 막대 = 스크롤 진행 */}
            <div className="hidden h-px w-56 bg-white/15 sm:block" aria-hidden>
              <div className="h-full" style={{ width: `${scrub * 100}%`, background: BLUE }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══ SECTION 06. WHAT WE ARE TESTING ═══ 밝은 면. 연구 질문 셋 + 다섯 단어의 선. */
function WhatWeAreTesting() {
  return (
    <section className="bg-[#F2F5FA] px-6 py-28 text-[#0B1830] sm:px-10 md:px-16">
      <div className="mx-auto max-w-[1240px]">
        <Eyebrow tone="dark">06 — What we are testing</Eyebrow>
        <h2 data-reveal className="reveal mt-6 text-[clamp(1.5rem,3vw,2.6rem)] font-light leading-[1.35]">
          YBM이 지금 확인하고 있는 것은
          <br />
          <span className="font-medium">세 가지입니다.</span>
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            ['01', 'AI human as a continuous presence', 'AI 휴먼이 한 번의 설명이 아니라 학습 과정 전체에서 계속 존재할 수 있는가.'],
            ['02', 'Class → learning flow', '한 번의 수업을 오늘의 학습과 다음 학습까지 이어지는 흐름으로 연결할 수 있는가.'],
            ['03', 'Content → relationship', '콘텐츠를 보여주는 서비스를 넘어 학습자가 계속 돌아와 공부를 이어가는 관계를 만들 수 있는가.'],
          ].map(([n, k, d], i) => (
            <div
              key={n}
              data-reveal
              className="reveal border-t-2 pt-6"
              style={{ borderColor: BLUE, transitionDelay: `${i * 110}ms` }}
            >
              <span className="text-[11px] tracking-[0.2em] text-[#0B1830]/40">{n}</span>
              <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: BLUE }}>
                {k}
              </p>
              <p className="mt-4 text-[15px] leading-[1.85]">{d}</p>
            </div>
          ))}
        </div>

        {/* 다섯 단어가 하나의 선으로 — 기획서의 화면 지시 */}
        <div data-reveal className="reveal mt-20 flex items-center gap-3 overflow-x-auto pb-2">
          {['Start', 'Today', 'Lesson', 'Complete', 'Next'].map((w, i) => (
            <div key={w} className="flex shrink-0 items-center gap-3">
              <span className="rounded-full border border-[#0B1830]/12 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
                {w}
              </span>
              {i < 4 && <span className="block h-px w-8 md:w-16" style={{ background: BLUE }} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══ SECTION 07. NEXT PHASE ═══ */
function NextPhase() {
  return (
    <section className="px-6 py-28 sm:px-10 md:px-16" style={{ background: INK }}>
      <div className="mx-auto max-w-[1240px]">
        <Eyebrow>07 — Next phase</Eyebrow>
        <h2 data-reveal className="reveal mt-6 max-w-3xl text-[clamp(1.5rem,3vw,2.6rem)] font-light leading-[1.35]">
          AI 휴먼을, 실제 학습 생활 안으로
          <br />
          <span className="font-medium">연결하는 다음 단계를 준비합니다.</span>
        </h2>

        <div className="mt-14 grid max-w-3xl gap-8 sm:grid-cols-2">
          <div data-reveal className="reveal rounded-2xl border border-white/12 p-7">
            <Eyebrow>Now</Eyebrow>
            <p className="mt-4 text-2xl font-light">R&amp;D Prototype</p>
            <p className="mt-1 text-[13px] tracking-[0.2em] text-white/45">2026.11</p>
          </div>
          <div
            data-reveal
            className="reveal rounded-2xl border p-7"
            style={{ borderColor: BLUE, background: 'rgba(46,107,255,0.08)', transitionDelay: '120ms' }}
          >
            <Eyebrow>Next</Eyebrow>
            <p className="mt-4 text-2xl font-light">Open Beta</p>
            <p className="mt-1 text-[13px] tracking-[0.2em] text-white/45">2027.03 Target</p>
          </div>
        </div>

        <p data-reveal className="reveal mt-12 max-w-2xl text-[15px] leading-[1.95] text-white/60">
          지금 공개하는 것은 완성된 서비스를 미리 약속하는 화면이 아닙니다. AI 휴먼이 학습자의 하루 공부 안에서 어떤
          역할을 할 수 있을지, 그 가능성을 먼저 보여드리는 단계입니다.
        </p>
      </div>
    </section>
  )
}

/* ═══ SECTION 08. PRE-OPEN CTA ═══ */
function PreOpenCta() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden px-6 py-36 sm:px-10"
      style={{
        background: `radial-gradient(900px 500px at 50% 120%, rgba(46,107,255,0.4), transparent 60%), ${INK}`,
      }}
    >
      <div data-reveal className="reveal mx-auto max-w-[820px] text-center">
        <Eyebrow>08 — Pre-open</Eyebrow>
        <h2 className="mt-6 text-[clamp(1.6rem,3.2vw,2.8rem)] font-light leading-[1.35]">
          혼자 공부하는 시간에도,
          <br />
          <span className="font-medium">강사가 곁에 있다면.</span>
        </h2>
        <p className="mt-8 text-[15px] leading-[2] text-white/65">
          수업을 시작하는 순간부터, 오늘 학습을 끝내는 순간까지. 그리고 다시 다음 학습을 시작할 때까지.
          <br />
          현재 2027년 3월 오픈 베타를 목표로 개발 중입니다.
        </p>

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
            className="min-h-[54px] flex-1 rounded-full border border-white/20 bg-white/5 px-6 text-[15px] placeholder:text-white/35 focus:border-white focus:outline-none"
          />
          {/* ponytail: 수집 엔드포인트 미배선. 개인정보 동의·처리방침이 정리되면 여기서 POST 한다. */}
          <button
            type="submit"
            className="min-h-[54px] rounded-full px-8 text-[14px] font-medium"
            style={{ background: BLUE, boxShadow: `0 16px 44px -14px ${BLUE}` }}
          >
            오픈 베타 사전 알림 신청
          </button>
        </form>

        <p className="mx-auto mt-8 max-w-lg text-[12px] leading-[1.9] text-white/40">
          사전 알림 등록은 오픈 베타 참여 또는 정식 서비스 이용을 보장하지 않습니다. 개발 일정과 제공 방식은 변경될 수
          있으며, 관련 내용이 정해지는 대로 안내드립니다.
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="px-6 pb-14 sm:px-10 md:px-16" style={{ background: INK }}>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 border-t border-white/12 pt-8 text-[11px] uppercase tracking-[0.3em] text-white/35 sm:flex-row sm:justify-between">
        <span>YBM · Language brings a bigger world</span>
        <span>R&amp;D Project · Open Beta Target 2027.03</span>
      </div>
    </footer>
  )
}
