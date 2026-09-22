'use client'

/**
 * /intro — 2026-11-02 YBM 회사 소개 사이트에 붙는 R&D 프로젝트 공개 페이지.
 * 대본 정본은 meeting/project_page_v2.md, 스크롤 줄기는 09-22 사용자 지시.
 *
 * ⭐ 이 페이지의 스크롤은 "다음 내용"이 아니라 **"더 안으로"** 를 뜻한다.
 *   히어로 → 실제 박혜원 → AI 휴먼 → **인물이 태블릿 안으로 들어감** → 태블릿 안에서
 *   대화하는 화면(영상) 위로 메시지 03·04·05 → 07 연구 → 08 다음 단계 → 09 CTA.
 *   섹션을 아홉 개 나열했던 첫 판을 버린 이유가 이것이다 — 인물과 수업이 남남처럼
 *   떨어져 있어서 스크롤이 그냥 페이지 넘기기였다.
 *
 * 없앤 것(09-22 결정): **체험 세션과 라이브 시연.** 방문자는 누르지 않고 본다.
 *   마이크 권한·STT 실패·로딩이 사라져서 낯선 방문자가 중간에 튕길 자리가 없다.
 *
 * 조판 언어는 MotionSites `vectrus-energy`(Editorial) — 네이비 단색, 얇은 대형 제목,
 * 자간 넓힌 라틴 라벨, 풀블리드 미디어. 원본의 WebCodecs 프레임 뱅크는 안 옮겼다.
 * ponytail: 인물→기기 전환은 레이아웃 애니메이션이 아니라 **두 레이어 크로스페이드
 *   + scale** 이다. 실제로 형태가 변형되어 들어가야 하면 그때 FLIP 을 쓴다.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import { lerp, seg, useReveal, useSmoothScroll, useTrackProgress } from '../_lib'

/** 라틴 라벨 — 대문자 + 넓은 자간. 한글 제목에는 쓰지 않는다(자간 벌리면 읽기 나빠진다). */
function Label({ children, tone = 'navy' }: { children: React.ReactNode; tone?: 'navy' | 'white' }) {
  return (
    <span
      className={`block text-[11px] font-medium uppercase tracking-[0.3em] ${
        tone === 'white' ? 'text-white/60' : 'text-[#1D3045]/60'
      }`}
    >
      {children}
    </span>
  )
}

/* 태블릿 안에서 대화하는 화면 위로 차례로 얹히는 메시지.
   대본 03·04·05 를 화면에 얹을 길이로 줄인 것 — 원문은 project_page_v2.md 에 있다. */
const STAGE_MESSAGES = [
  {
    label: 'Beyond human',
    title: '사람처럼 말한다고\n좋은 강사가 되는 건 아닙니다.',
    body: '틀렸을 때 바로 답을 줘야 할까. 어디까지 힌트를 줘야 할까. 그리고 언제 더 이상 도와주지 않아야 할까.',
    kicker: 'When should AI help?',
    from: 0.56,
  },
  {
    label: 'Scaffolding',
    title: '정답 대신,\n다음 생각을 묻습니다.',
    body: '“이 문장에서 먼저 봐야 할 건 뭘까요?” 한 문제를 작은 단계로 나누고, 학습자가 직접 답하면서 다음 판단으로 이동하게 합니다.',
    kicker: '어디부터 볼까 → 무엇을 지울까 → 무엇을 고를까',
    from: 0.71,
  },
  {
    label: 'Less help',
    title: '잘하게 될수록,\nAI는 한 걸음 뒤로 갑니다.',
    body: '처음에는 많이 돕고, 익숙해지면 덜 돕고, 결국에는 혼자 풀 수 있도록. AI의 도움이 점점 덜 필요해지는 학습을 만들고 있습니다.',
    kicker: '4 hints → 2 hints → no hint',
    from: 0.86,
  },
]

export default function IntroPage() {
  useSmoothScroll()
  useReveal()
  const trackRef = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(trackRef)

  /* 인물 단계 → 기기 단계.
     ⚠️ 두 레이어를 겹쳐 페이드하면 태블릿 위에 인물 글자가 비쳐 둘 다 안 읽힌다(실측).
     **앞 레이어가 다 걷힌 뒤에 뒤 레이어가 든다** — 템플릿의 순차 규칙 그대로. */
  /* 스크롤 = 재생 위치. 영상이 혼자 루프를 돌면 배경 장식이지만, 스크롤에 물리면
     **내리는 만큼 수업이 진행된다.** 되감기도 된다.
     재생(play)은 절대 부르지 않는다 — 자동재생 차단에 걸리지 않는 유일한 길이다. */
  const lessonVideo = useRef<HTMLVideoElement>(null)
  const scrub = seg(p, 0.5, 0.98)
  useEffect(() => {
    const v = lessonVideo.current
    if (!v || !v.duration || Number.isNaN(v.duration)) return
    const t = scrub * v.duration
    if (Math.abs(v.currentTime - t) > 0.03) v.currentTime = t
  }, [scrub])

  const toAiHuman = seg(p, 0.1, 0.24)
  const personOut = seg(p, 0.28, 0.38)   // 인물이 가라앉아 사라진다
  const intoDevice = seg(p, 0.4, 0.52)   // 그다음에 태블릿이 들어온다

  return (
    <main className="relative bg-[#F4F5F3] text-[#1D3045]">
      {/* 필름 그레인. 고정이라 스크롤해도 같은 자리에 머물러 '렌즈' 처럼 읽힌다.
          포인터 이벤트를 끄지 않으면 페이지 전체가 클릭을 못 받는다. */}
      <div className="intro-grain" aria-hidden />
      {/* 상단 바는 **고정이 아니다.** sticky 로 뒀더니 다크 섹션 위에 밝은 띠가 계속 떠서
         제목을 잘라 먹었다(실측). 링크가 없는 바를 붙잡아 둘 이유가 없다. */}
      <header className="border-b border-[#1D3045]/10 bg-[#F4F5F3]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5 sm:px-8 md:px-12">
          <span className="text-[11px] font-medium uppercase tracking-[0.3em]">YBM AI Academy</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#1D3045]/50">
            R&amp;D Project · 2026.11
          </span>
        </div>
      </header>

      {/* ═══ 01. HERO ═══
           한 덩어리로 올라오지 않는다 — 라벨·제목 두 줄·본문·상태 고지가 시차를 두고 올라온다.
           같은 0.8s 라도 한꺼번에 뜨면 "페이지가 로드됐다" 로 읽히고, 어긋나서 뜨면
           "연출이다" 로 읽힌다(문서 §05 stagger). */}
      <section className="relative flex min-h-[100vh] items-center px-6 py-24 sm:px-8 md:px-20 lg:px-32">
        <div className="max-w-[1100px]">
          <span data-reveal className="reveal block">
            <Label>01 — Why we started</Label>
          </span>
          <h1 className="mt-8 text-[clamp(2rem,5vw,4.75rem)] font-light leading-[1.25]">
            <span data-reveal className="reveal block" style={{ transitionDelay: '120ms' }}>
              AI가 다 풀어주면,
            </span>
            <span data-reveal className="reveal block" style={{ transitionDelay: '260ms' }}>
              정작 나는 뭘 배우게 될까요?
            </span>
          </h1>
          <p
            data-reveal
            className="reveal mt-10 max-w-2xl text-[clamp(1rem,1.4vw,1.25rem)] leading-[1.9]"
            style={{ transitionDelay: '440ms' }}
          >
            YBM은 AI 휴먼과 스캐폴딩 학습을 결합해{' '}
            <strong className="font-medium">‘가르치는 방식’</strong>을 연구합니다.
          </p>

          <div
            data-reveal
            className="reveal mt-14 max-w-xl border-l-2 border-[#1D3045]/20 pl-6"
            style={{ transitionDelay: '700ms' }}
          >
            <p className="text-sm font-medium">YBM AI 어학원은 현재 개발 중인 R&amp;D 프로젝트입니다.</p>
            <p className="mt-2 text-sm leading-[1.8] text-[#1D3045]/60">
              2026년 11월 2일 현재 정식으로 다운로드하거나 수강할 수 있는 서비스는 아니며, 이 페이지에서는 연구 중인 AI
              강사와 수업 방식을 먼저 공개합니다.
            </p>
          </div>
        </div>

        {/* 스크롤이 이 페이지의 조작 장치라는 것을 알려 준다. 누를 것이 없는 페이지라 더 필요하다. */}
        <div
          data-reveal
          className="reveal absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
          style={{ transitionDelay: '900ms' }}
          aria-hidden
        >
          <span className="text-[10px] uppercase tracking-[0.35em] text-[#1D3045]/40">Scroll</span>
          <span className="intro-scroll-rail" />
        </div>
      </section>

      <Manifesto />

      {/* 밝은 면에서 네이비로 넘어가는 경계. 뚝 끊기면 '다음 섹션' 으로 읽히고,
          섞이면 '같은 장면이 어두워진다' 로 읽힌다. */}
      <div className="h-[36vh] bg-gradient-to-b from-[#F4F5F3] to-[#1D3045]" />

      {/* ═══ 02~05. 박혜원 → AI 휴먼 → 태블릿 안 (스크롤 한 줄기) ═══ */}
      <div ref={trackRef} className="relative h-[680vh] bg-[#1D3045]">
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* ── 뒤 단계: 태블릿 안에서 대화하는 화면 + 메시지.
                 인물 레이어가 걷히면 드러난다(레이아웃이 움직이지 않게 처음부터 깔아 둔다). */}
          <div className="absolute inset-0 grid grid-cols-1 items-center gap-8 px-6 pt-20 sm:px-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.92fr)] md:gap-10 md:px-10 md:pt-0 lg:px-16">
            {/* 태블릿 */}
            <div
              className="mx-auto w-full max-w-[860px] [will-change:transform,opacity]"
              style={{
                opacity: intoDevice,
                /* 기울어진 채 멀리서 다가와 제자리에 선다. Three.js 없이 원근만으로 내는 입체감 —
                   문서(§18)가 말한 대로 3D 를 더 넣는 게 아니라 움직임이 화면을 고급스럽게 만든다. */
                transform: [
                  'perspective(1600px)',
                  `rotateX(${lerp(16, 0, intoDevice)}deg)`,
                  `rotateY(${lerp(-14, 0, intoDevice)}deg)`,
                  `translateY(${lerp(90, 0, intoDevice)}px)`,
                  `scale(${lerp(0.82, 1, intoDevice)})`,
                ].join(' '),
              }}
            >
              <div className="rounded-[22px] border border-white/20 bg-black/40 p-2 shadow-2xl md:rounded-[28px] md:p-3">
                <div className="relative aspect-[1180/820] overflow-hidden rounded-[14px] bg-black md:rounded-[18px]">
                  {/* 실제 우리 수업 화면을 녹화한 것 — 임시 소재다.
                      muted 라 자동재생이 막히지 않는다(iOS·크롬 모두 소리 있는 자동재생은 차단). */}
                  <video
                    ref={lessonVideo}
                    src="/video/intro-lesson.mp4"
                    muted
                    playsInline
                    preload="auto"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] uppercase tracking-[0.3em] text-white/35">
                AI Instructor · Scaffolding in a lesson
              </p>
            </div>

            {/* 메시지 03 · 04 · 05 — 순서대로 갈아탄다 */}
            <div className="relative min-h-[240px] md:min-h-[420px]">
              {STAGE_MESSAGES.map((m, mi) => {
                const inOp = seg(p, m.from, m.from + 0.05)
                // 마지막 메시지는 걷어내지 않는다 — 트랙 끝에서 태블릿만 남으면 빈 화면이 된다.
                const isLast = mi === STAGE_MESSAGES.length - 1
                const outOp = isLast ? 1 : 1 - seg(p, m.from + 0.13, m.from + 0.17)
                const o = Math.min(inOp, outOp)
                return (
                  <div
                    key={m.label}
                    className="absolute inset-x-0 top-0 text-white"
                    style={{
                      opacity: o,
                      transform: `translateY(${lerp(28, 0, inOp)}px)`,
                      filter: `blur(${lerp(5, 0, inOp)}px)`,
                      willChange: 'transform, opacity, filter',
                    }}
                    aria-hidden={o < 0.5}
                  >
                    <Label tone="white">{m.label}</Label>
                    <h2 className="mt-5 whitespace-pre-line text-[clamp(1.3rem,2.2vw,2rem)] font-light leading-[1.4]">
                      {m.title}
                    </h2>
                    <p className="mt-5 max-w-md text-[15px] leading-[1.9] text-white/70">{m.body}</p>
                    <p className="mt-6 text-[12px] uppercase tracking-[0.25em] text-white/45">{m.kicker}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 앞 단계: 실제 박혜원 → AI 휴먼 → 기기 안으로 가라앉는다 ── */}
          <div
            className="absolute inset-0"
            style={{ opacity: 1 - personOut, pointerEvents: personOut > 0.5 ? 'none' : undefined }}
          >
            <div
              className="absolute inset-0 overflow-hidden md:left-[48%]"
              style={{
                /* 줄어들면서 모서리가 둥글어진다 — 안 그러면 잘린 사각형이 떠 있는 것처럼 보인다 */
                borderRadius: `${lerp(0, 40, personOut)}px`,
                transform: `translateY(${lerp(0, -50, personOut)}px) scale(${lerp(1, 0.88, personOut)})`,
                transformOrigin: '50% 45%',
                filter: `blur(${lerp(0, 10, personOut)}px)`,
                willChange: 'transform, filter',
              }}
            >
              <img
                src="/instructor/park.png"
                alt="YBM 토익 강사 박혜원"
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: 1 - toAiHuman }}
              />
              <video
                src="/video/video-park.mp4"
                muted
                loop
                playsInline
                autoPlay
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: toAiHuman }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1D3045] via-[#1D3045]/50 to-transparent md:via-[#1D3045]/15" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#1D3045] via-transparent to-[#1D3045]/30 md:hidden" />

            <div className="relative flex h-full items-center px-6 sm:px-8 md:px-20 lg:px-32">
              <div
                className="max-w-2xl text-white md:max-w-[46%]"
                style={{ transform: `translateY(${lerp(0, -70, personOut)}px)` }}
              >
                <Label tone="white">{toAiHuman > 0.5 ? 'AI Human' : 'Real Instructor'}</Label>
                <h2 className="mt-6 text-[clamp(1.5rem,2.5vw,2.2rem)] font-light leading-[1.35]">
                  YBM 토익 스타강사 박혜원을
                  <br />
                  AI 휴먼으로 구현했습니다.
                </h2>
                <p
                  className="mt-6 text-[15px] leading-[1.9] text-white/70"
                  style={{ opacity: toAiHuman }}
                >
                  얼굴과 목소리, 말투를 기반으로 구현한 AI 휴먼입니다. 학습자가 말을 걸면 반응하고, 문제를 풀다 막히면
                  다시 질문하며 수업을 이어갑니다.
                </p>
                <p className="mt-8 text-xs leading-[1.9] text-white/45">
                  실제 박혜원 강사가 실시간으로 응답하는 것은 아닙니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 07. WHAT WE ARE TESTING ═══ */}
      <section className="px-6 py-28 sm:px-8 md:px-20 lg:px-32">
        <div data-reveal className="reveal mx-auto max-w-[1100px]">
          <Label>07 — What we are testing</Label>
          <h2 className="mt-8 text-[clamp(1.6rem,3.4vw,3rem)] font-light leading-[1.3]">
            AI의 얼굴보다,
            <br />
            강사의 역할을 설계하고 있습니다.
          </h2>

          <div className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
            {[
              [
                'AI Human',
                '실제 강사를 AI 휴먼으로 구현하면, 강사의 역할을 어디까지 확장할 수 있을까.',
                'YBM 토익 스타강사 박혜원을 기반으로 얼굴과 목소리, 말투를 구현한 AI 휴먼이 말하고 반응하는 형태를 실험하고 있습니다.',
              ],
              [
                'Question',
                'AI가 정답보다 질문을 먼저 제시하게 만들 수 있을까.',
                '문제를 작은 단계로 나누고 학습자가 직접 판단하면서 다음 단계로 이동하는 스캐폴딩 학습 방식을 적용합니다.',
              ],
              [
                'Less help',
                '학습자가 익숙해질수록 AI가 덜 개입하게 만들 수 있을까.',
                '성취도가 올라갈수록 도움을 점차 줄여 스스로 문제를 풀도록 돕는 맞춤형 학습을 연구합니다.',
              ],
              [
                'Class',
                '이 방식을 한 번의 대화가 아니라 수업 전체로 연결할 수 있을까.',
                '도입부터 유형학습, 실전문제, 마무리까지 AI 강사가 하나의 수업 흐름 안에서 어떤 역할을 할지 실험합니다.',
              ],
            ].map(([tag, q, a], i) => (
              <div
                key={tag}
                data-reveal
                className="reveal border-t border-[#1D3045]/20 pt-6"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <Label>{`${String(i + 1).padStart(2, '0')} · ${tag}`}</Label>
                <p className="mt-5 text-[clamp(1.05rem,1.7vw,1.35rem)] font-light leading-[1.6]">{q}</p>
                <p className="mt-4 text-sm leading-[1.9] text-[#1D3045]/65">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 08. NEXT PHASE ═══ */}
      <section className="border-y border-[#1D3045]/10 bg-[#EDEEEB] px-6 py-28 sm:px-8 md:px-20 lg:px-32">
        <div data-reveal className="reveal mx-auto max-w-[1100px]">
          <Label>08 — Next phase</Label>
          <h2 className="mt-8 text-[clamp(1.6rem,3.4vw,3rem)] font-light leading-[1.3]">
            다음 단계는, 실제 학습 경험으로
            <br />
            연결하는 일입니다.
          </h2>

          <div className="mt-16 grid max-w-3xl gap-10 sm:grid-cols-2">
            <div className="border-t-2 border-[#1D3045] pt-6">
              <Label>Now</Label>
              <p className="mt-4 text-2xl font-light">R&amp;D Prototype</p>
              <p className="mt-1 text-sm tracking-[0.2em] text-[#1D3045]/50">2026.11</p>
            </div>
            <div className="border-t border-[#1D3045]/25 pt-6">
              <Label>Next</Label>
              <p className="mt-4 text-2xl font-light">Open Beta</p>
              <p className="mt-1 text-sm tracking-[0.2em] text-[#1D3045]/50">2027.03 Target</p>
            </div>
          </div>

          <p className="mt-14 max-w-2xl text-[15px] leading-[2] text-[#1D3045]/70">
            지금 이 페이지에서 공개한 것은 완성된 서비스를 미리 보여주는 것이 아닙니다. AI 휴먼과 스캐폴딩 학습을 실제
            학습자가 사용할 수 있는 경험으로 연결하기 위해 YBM이 현재 만들고 있는 방향과 프로토타입입니다.
          </p>
        </div>
      </section>

      {/* ═══ 09. PRE-OPEN CTA ═══ */}
      <PreOpenCta />

      <footer className="bg-[#1D3045] px-6 pb-16 sm:px-8 md:px-20 lg:px-32">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 border-t border-white/15 pt-8 text-[11px] uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:justify-between">
          <span>YBM AI Academy</span>
          <span>R&amp;D Project · Open Beta Target 2027.03</span>
        </div>
      </footer>
    </main>
  )
}

/** 스크롤에 따라 **한 단어씩 켜지는** 문장.
 *
 *  이 페이지가 하는 말이 "AI 가 대신 생각해 주면 안 된다" 라서, 문장도 한 번에 주지 않고
 *  읽는 사람이 스크롤한 만큼만 보여 준다 — 형식이 내용과 같은 말을 한다.
 *  ponytail: 단어마다 DOM 을 만들되 애니메이션은 opacity 하나뿐이다. 글자 단위로 쪼개면
 *  노드가 네 배가 되는데 눈에 보이는 차이는 거의 없다. */
const MANIFESTO =
  '문제를 보여주면 답을 알려주고, 모르는 걸 물으면 바로 설명해주는 AI. 분명 편리합니다. 하지만 AI가 답을 대신하는 만큼, 학습자는 스스로 생각할 기회를 잃고 있는 건 아닐까.'

function Manifesto() {
  const ref = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(ref)
  const words = useMemo(() => MANIFESTO.split(' '), [])

  return (
    <div ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-screen items-center px-6 sm:px-8 md:px-20 lg:px-32">
        <p className="mx-auto max-w-[1000px] text-[clamp(1.35rem,3.2vw,2.75rem)] font-light leading-[1.6]">
          {words.map((w, i) => {
            /* 0.05~0.85 구간에 단어를 고르게 펼친다. 앞뒤 여유는 들어오고 나가는 자리다. */
            const at = 0.05 + (i / words.length) * 0.8
            const on = Math.min(1, Math.max(0, (p - at) / 0.06))
            return (
              <span key={i} style={{ opacity: 0.16 + on * 0.84 }}>
                {w}{' '}
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )
}

function PreOpenCta() {
  const [sent, setSent] = useState(false)

  return (
    <section className="bg-[#1D3045] px-6 py-32 sm:px-8 md:px-20 lg:px-32">
      <div data-reveal className="reveal mx-auto max-w-[900px] text-center">
        <h2 className="text-[clamp(1.6rem,3.4vw,3rem)] font-light leading-[1.3] text-white">
          AI가 다 풀어주면,
          <br />
          정작 나는 뭘 배우게 될까요?
        </h2>
        <p className="mt-8 text-[15px] leading-[2] text-white/60">
          YBM은 그 질문에서 AI 어학원을 시작했습니다.
          <br />
          현재 2027년 3월 오픈 베타를 목표로 개발 중입니다.
        </p>

        <form
          className="mx-auto mt-14 flex max-w-lg flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            /* ponytail: 수집 엔드포인트 미배선. 개인정보 동의·처리방침이 정리되면
               여기서 POST 한다 — 그때까지 화면만 정직하게 막아 둔다. */
            setSent(true)
          }}
        >
          <label htmlFor="preopen-email" className="sr-only">
            이메일
          </label>
          <input
            id="preopen-email"
            type="email"
            required
            inputMode="email"
            placeholder="이메일 주소"
            className="min-h-[52px] flex-1 rounded-sm border border-white/25 bg-transparent px-4 text-[15px] text-white placeholder:text-white/35 focus:border-white focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-[52px] rounded-sm bg-white px-7 text-[13px] font-medium uppercase tracking-[0.2em] text-[#1D3045] transition-opacity active:opacity-70"
          >
            오픈 베타 사전 알림 받기
          </button>
        </form>

        {sent && (
          <p className="mt-6 text-sm text-white/80" role="status">
            사전 알림 접수는 아직 열리지 않았습니다. 준비되는 대로 이 페이지에서 안내드립니다.
          </p>
        )}

        <p className="mx-auto mt-8 max-w-lg text-xs leading-[1.9] text-white/40">
          사전 알림 등록은 오픈 베타 참여 또는 정식 서비스 이용을 보장하지 않습니다. 개발 일정과 제공 방식은 변경될 수
          있으며, 관련 내용이 정해지는 대로 안내드립니다.
        </p>
      </div>
    </section>
  )
}
