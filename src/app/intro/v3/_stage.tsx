'use client'

/**
 * /intro/v3 의 **01~06 구간.** 여섯 섹션이 아니라 **하나의 무대**다.
 *
 * 왜 한 덩어리인가: 기획서가 섹션마다 '화면 연출'에 같은 말을 적어 뒀다.
 *   01 "스크롤을 시작해도 AI 휴먼이 바로 사라지지 않고 초반 주요 섹션까지 이어지는 비주얼"
 *   02 "키워드와 학습 기록이 화면 한쪽의 AI 휴먼 쪽으로 이동"
 *   03 "오른쪽에 있던 AI 휴먼이 본격적으로 말을 시작"
 *   04 "AI 휴먼을 영상 전반에 계속 보이게"
 *   05 "AI 휴먼은 화면 한쪽에 계속 유지. 주변으로 정보가 나타나고"
 *   06 "마지막에는 AI 휴먼이 새로 만들어진 다음 수업 카드를 직접 건네는 듯한 연출"
 * 즉 **선생님이 페이지의 주인공이고 나머지가 그 주위를 도는 것**이다. 섹션을 따로 만들면
 * 인물이 섹션마다 나타났다 사라지고, 그러면 "계속 곁에 있다" 는 이 페이지의 주장이 무너진다.
 *
 * 구조: 긴 트랙 하나(`h-[750vh]`) + 그 안에 `sticky` 화면 하나.
 *   · 인물 층은 **한 번만** 그린다. 전체 진행률로 위치·크기·빛이 변한다.
 *   · 다섯 장면은 각자 자기 구간의 진행률만 받아 위성(카드·말풍선·칩)을 그린다.
 *   · 자기 구간 근처가 아니면 **아예 안 그린다**(`near`). 안 그러면 20장짜리 카드 더미와
 *     HUD 칩이 스크롤 내내 DOM 에 남아 매 프레임 계산된다.
 *
 * 인물 소재: `public/intro/human/pose-{1,2,3}.webp` (gpt-image-2, 배경 없는 컷아웃 세 포즈).
 *   서 있는 포즈 · 손을 들고 말하는 포즈 · 손을 내미는 포즈. 장면에 따라 갈아탄다.
 *   ⚠️ **정지 이미지 세 장이지 말하는 영상이 아니다.** 입이 움직이지 않는다.
 *   본선에서 더 살리려면 매트(투명 배경) 영상이 필요하고, 그건 AI 휴먼 업체 쪽 일이다.
 *
 * ponytail: 물리엔진·WebGL·모션 라이브러리 없음. 전부 진행률 하나에서 나온 transform/opacity 다.
 *   움직이는 게 전부 평면이라 WebGL 을 띄울 이유가 없다(태블릿 배터리도 먹는다).
 */

import { useEffect, useRef, useState } from 'react'

import { BLOCK_H, BLOCK_W, usePile } from './_pile'

import { ease, lerp, seg, usePointer, useTrackProgress } from '../_lib'

/** 떨어지고 튕기는 곡선. 0 = 떨어지기 직전, 1 = 바닥에 붙어 멈춤.
 *
 *  앞구간이 `u*u` 라 **속도가 점점 빨라진다**(중력). 그다음 세 번 튕기는데 튕길 때마다
 *  높이가 줄어든다(반발계수). 스크롤을 되감으면 거꾸로 올라갔다가 다시 떨어진다.
 *  ponytail: 물리엔진을 붙이지 않은 이유는 **되감기** 때문이다. 시뮬레이션은 시간이 한쪽으로만
 *    흐르는데 이 화면의 시간은 스크롤이라 양쪽으로 간다. 닫힌 식은 그 걱정이 없다. */
function bounce(u: number) {
  const n = 7.5625
  const d = 2.75
  if (u < 1 / d) return n * u * u
  if (u < 2 / d) { const v = u - 1.5 / d; return n * v * v + 0.75 }
  if (u < 2.5 / d) { const v = u - 2.25 / d; return n * v * v + 0.9375 }
  const v = u - 2.625 / d
  return n * v * v + 0.984375
}

/** 바닥에 닿는 순간들. 위 곡선이 1 에 닿는 지점이다. 여기서 카드가 눌린다. */
const IMPACTS: Array<[number, number, number]> = [
  [1 / 2.75, 0.16, 0.055], // 첫 착지: 가장 세게
  [2 / 2.75, 0.09, 0.04],
  [2.5 / 2.75, 0.045, 0.03],
]
/** 착지 순간의 눌림. 세로로 납작해지고 가로로 퍼진다. 이게 있어야 '무게'가 느껴진다. */
function squash(u: number) {
  let s = 0
  for (const [c, amp, w] of IMPACTS) s += amp * Math.max(0, 1 - Math.abs(u - c) / w)
  return s
}

/** 여러 단계를 한 자리에서 갈아입힐 때 쓰는 봉투.
 *  ⚠️ `min(inner/f, (1-inner)/f)` 만 쓰면 단계가 딱 바뀌는 지점에서 값이 0 이 되어
 *  **화면이 한 순간 통째로 빈다**(실측: 06 장면에서 카드도 말풍선도 없는 프레임이 나왔다).
 *  들어오는 문턱을 짧게 잡고, **마지막 단계는 걷어내지 않는다** - 걷으면 장면 끝이 빈 화면이 된다. */
const fadeStep = (inner: number, isLast: boolean) =>
  Math.max(0, Math.min(1, inner / 0.06, isLast ? 1 : (1 - inner) / 0.06))

/** 진행률을 n 단계로 쪼갠다. 지금 몇 번째이고 그 안에서 얼마나 왔는지.
 *
 *  ⚠️ 여기 함정이 있다. `inner = prog % 1` 로 쓰면 **마지막 단계가 영영 안 뜬다.**
 *  구간 끝에서 prog 가 정확히 n 이 되고, `n % 1 === 0` 이라 마지막 걸음은 진행률 0 에
 *  붙박인다. 그리고 그 위에 걸린 fade 가 0 이라 화면이 빈다(실측: 세 장면 전부 그랬다).
 *  마지막 단계에서는 나머지를 자르지 말고 **0 에서 1 까지 끝까지 가게** 둬야 한다. */
function stepAt(t: number, a: number, b: number, n: number) {
  const prog = seg(t, a, b) * n
  const step = Math.min(n - 1, Math.floor(prog))
  return { step, inner: Math.min(1, prog - step), isLast: step === n - 1 }
}

export const INK = '#0A1526'
export const BASE = '#0B1830'
export const RAISE = '#101F3C'
export const BLUE = '#2E6BFF'

/* 다섯 장면이 트랙에서 차지하는 몫. 70 / **260** / 170 / 130 / 120 = **750vh**.
 * 02 를 170 에서 260 으로 늘렸다 - 거기만 유독 스크롤이 짧게 느껴졌는데, 길이보다 더 큰
 * 이유가 따로 있었다(아래 ScenePain 의 '가라앉기 전엔 정렬 안 한다' 참고).
 *
 * 원래 여섯이었다. 04 SESSION DEMO(지난 학습 → 오늘 → 분석 → 조정 → 다음)를 뺐다.
 *   이유: **같은 사이클을 페이지가 네 번 말하고 있었다** - 04 · 05 · 06 · 08 이 전부 그 얘기다.
 *   게다가 영상이 체험 섹션으로 빠지면서 04 에는 추상적인 카드 다섯 장만 남아 제일 안 읽혔다.
 *   그 자리의 제목("그 선생님과 공부하면 이런 경험이 이어집니다")은 체험 섹션이 그대로 쓴다.
 *   카드로 설명하느니 직접 눌러 보게 하는 게 낫다.
 *
 * ⭐ 이 숫자보다 중요한 건 **장면 안에서 움직임과 멈춤을 어떻게 나누느냐**다.
 *   1030vh 짜리 첫 판은 길기만 하고 스크롤 내내 뭔가가 계속 변해서 멈춰 읽을 자리가 없었다.
 *   700vh 로 줄였더니 이번엔 내용이 휙휙 지나가 읽을 새가 없었다(사용자 지적 두 번).
 *   길이의 문제가 아니라 **박자**의 문제였다.
 *
 * 그래서 규칙을 하나로 잡았다: **움직임은 짧고 빠르게, 멈춤은 길게.**
 *   움직이는 동안은 읽을 수 없으니 스크롤을 쓸 가치가 없고, 멈춰 있는 동안만 읽힌다.
 *   그래서 각 장면 안에서 대략 **1/4 은 움직이고 3/4 은 멈춰 있다.** 스크롤을 굴리면
 *   일이 후딱 일어나고 그 자리에 머문다. 총 길이는 그대로인데 "빨리 되고 오래 남는다" 로 읽힌다.
 *
 * 고칠 때 지킬 것: 구간을 늘리고 싶으면 **멈춤 쪽을 늘린다.** 움직임을 늘리면
 *   길어지기만 하고 읽히는 건 그대로다. */
const BEAT = {
  hero: [0, 0.0933],
  pain: [0.0933, 0.44],
  human: [0.44, 0.6667],
  powered: [0.6667, 0.84],
  cont: [0.84, 1],
} as const

type Range = readonly [number, number]
/** 그 장면 안에서의 진행률 */
const at = (p: number, r: Range) => seg(p, r[0], r[1])
/** 지금 화면에 있나. 앞뒤로 여유를 조금 줘서 들어올 때 이미 그려져 있게 한다. */
const near = (p: number, r: Range) => p > r[0] - 0.04 && p < r[1] + 0.04
/** 장면이 켜져 있는 정도.
 *  ⚠️ `near` 는 **그릴지**만 정하고 **보일지**는 안 정했다. 그래서 경계에서 두 장면이
 *  동시에 불투명하게 그려져 제목 두 개가 포개졌다(실측). 여유 구간에서 확실히 꺼 준다. */
function lit(p: number, r: Range) {
  /* 첫 장면은 시작하자마자 온전히 켜져 있어야 한다. 앞쪽 여유 구간을 그냥 쓰면
     스크롤 0 에서 90% 로 뜬다(구간 앞이 음수라 seg 가 1 에 못 닿는다). */
  /* 들어오는 쪽은 **자기 구간이 시작되기 조금 전에 이미 다 켜져 있어야 한다.** 구간 시작에
     맞춰 켜면, 앞 장면이 물러나는 동안 뒤 장면이 아직 흐려서 그 사이가 훤히 빈다(실측). */
  const enter = r[0] <= 0 ? 1 : seg(p, r[0] - 0.03, r[0] - 0.004)
  /* 나가는 쪽은 **짧게** 끊는다. 넉넉히 잡았더니 앞 장면의 마무리 문장이 다음 장면 위에
     유령처럼 26% 로 남아 있었다(실측: 03 배경에 02 의 문장이 비쳤다). */
  return Math.min(enter, 1 - seg(p, r[1] - 0.002, r[1] + 0.02))
}

/* ══════════════════════════════════════════════════════════════════════════
   인물
   ══════════════════════════════════════════════════════════════════════════ */

/** 장면마다 인물이 서는 자리. 사이는 부드럽게 이어 붙인다.
 *  x = 화면 가로 비율, h = **세로 길이(vh)**, glow = 뒤에서 퍼지는 빛의 세기,
 *  y = 위쪽 자리(vh). 안 주면 `100 - h` = **바닥에 선다.**
 *  히어로만 y 를 직접 준다. 거기서는 인물을 화면보다 크게 키워 **상체만 보이게** 잘라야 해서
 *  바닥에 세울 수가 없다(바닥에 세우면서 키우면 머리가 화면 위로 올라가 버린다).
 *
 *  ⚠️ 전에는 크기를 `46vw` 처럼 **가로 기준**으로 줬다. 사람은 세로로 긴데 가로로 재니까
 *  화면이 옆으로 넓어질수록 인물이 세로로 넘쳤다. 1512x900 에서 상자가 1046px 이라
 *  화면(900)보다 146px 크고, 가운데 정렬이라 **위아래가 73px 씩 잘렸다 = 얼굴이 잘렸다**(실측).
 *  세로로 재면 어느 화면비에서도 안 잘린다.
 *
 *  그리고 가운데가 아니라 **바닥에 세운다**(top = 100 - h). 가운데를 기준으로 크기를 바꾸면
 *  작아질 때 공중으로 떠오른다. 바닥을 기준으로 해야 '멀어진다' 로 읽힌다.
 *  생각의 순서: **말을 할 때 가까이 오고, 남에게 자리를 내줄 때 물러선다.** */
const POSES: Array<{ at: number; x: number; h: number; glow: number; y?: number }> = [
  { at: 0.0, x: 80, h: 152, y: 1, glow: 0.34 }, // 01 히어로. 크게 잡아 상체만 보인다
  { at: 0.27, x: 86, h: 66, glow: 0.2 }, // 02 고민이 쏟아진다. 자리를 내주고 끝으로 물러선다
  { at: 0.55, x: 67, h: 96, glow: 0.42 }, // 03 말을 건다. 가장 가까이 온다
  { at: 0.76, x: 75, h: 86, glow: 0.36 }, // 05 판단의 근거가 주위에 뜬다
  { at: 0.94, x: 78, h: 80, glow: 0.3 }, // 06 다음 수업 카드를 건넨다
]

function pose(p: number) {
  let i = 0
  while (i < POSES.length - 1 && p > POSES[i + 1].at) i++
  const a = POSES[i]
  const b = POSES[Math.min(i + 1, POSES.length - 1)]
  const t = b.at === a.at ? 0 : ease(seg(p, a.at, b.at))
  const ay = a.y ?? 100 - a.h
  const by = b.y ?? 100 - b.h
  return { x: lerp(a.x, b.x, t), h: lerp(a.h, b.h, t), y: lerp(ay, by, t), glow: lerp(a.glow, b.glow, t) }
}

/** 지금 어느 포즈인가. 세 장을 겹쳐 두고 가중치로 갈아탄다.
 *  포즈가 붙은 자리는 **그 장면에서 선생님이 실제로 하는 일**이다:
 *  듣고 있을 때는 서 있고, 말할 때는 손을 들고, 건넬 때는 손을 내민다. */
/** 다섯 장(`pose-1..5.webp`) 중 지금 어느 것인가.
 *  0 = 서 있기 · 1 = 한 손 들고 말하기 · 2 = 손 내밀어 건네기 ·
 *  3 = 팔짱 끼고 지켜보기 · 4 = 두 팔 벌려 펼쳐 보이기 ·
 *  5 = 빛으로 된 수업 화면에 손 대기 (히어로 전용 - "학습 서비스의" AI 휴먼이라는 뜻을
 *      소품이 아니라 **인물 안에** 담는다. 태블릿을 옆에 세워 봤다가 걷어낸 자리다).
 *  **장면에서 선생님이 실제로 하는 일**에 맞춘다. 서 있는 자세 하나로 전부 때우면
 *  "계속 곁에 있다" 가 "사진 한 장 붙여놨다" 로 읽힌다(사용자 지적).
 *
 *  ⚠️ 포즈가 바뀌는 구간은 **짧게(0.015)** 잡는다. 두 장이 반반 겹쳐 있는 동안은
 *  팔다리가 두 벌 보여서 이중노출처럼 읽힌다. */
const POSE_KEYS = [
  { at: 0.0, i: 5 }, // 01 히어로: 빛으로 된 수업 화면에 손을 댄다
  { at: 0.078, i: 5 },
  { at: 0.093, i: 3 }, // 02 고민이 쏟아진다: 팔짱 끼고 지켜본다
  { at: 0.425, i: 3 },
  { at: 0.44, i: 1 }, // 03 말을 건다: 한 손을 든다 (구간 내내)
  { at: 0.652, i: 1 },
  { at: 0.667, i: 4 }, // 05 판단의 근거가 주위에 뜬다: 두 팔을 벌린다
  { at: 0.825, i: 4 },
  { at: 0.84, i: 2 }, // 06 다음 수업 카드를 건넨다: 손을 내민다
  { at: 1.0, i: 2 },
]
const POSE_COUNT = 6

/** 다섯 장의 가중치. 이웃한 두 열쇠 사이만 섞이고 나머지는 0 이다. */
function poseMix(p: number) {
  const w = new Array(POSE_COUNT).fill(0)
  let i = 0
  while (i < POSE_KEYS.length - 1 && p > POSE_KEYS[i + 1].at) i++
  const a = POSE_KEYS[i]
  const b = POSE_KEYS[Math.min(i + 1, POSE_KEYS.length - 1)]
  const t = b.at === a.at ? 0 : ease(seg(p, a.at, b.at))
  w[a.i] += 1 - t
  w[b.i] += t
  return w
}

/** AI 휴먼. 한 번만 그리고 평생 여기 산다.
 *
 *  소재: `public/intro/human/pose-{1,2,3}.webp`. gpt-image-2 로 만든 **배경 없는 컷아웃**이고,
 *  세 장 모두 **같은 캔버스에 맞춰 잘라 뒀다**(세 장의 내용 영역 합집합). 각자 꽉 채워 자르면
 *  포즈를 갈아탈 때 인물의 크기와 위치가 튄다. 다시 만들 일이 있으면 그 규칙을 지킬 것.
 *  캔버스가 팔 뻗은 포즈까지 담느라 넓어서, 몸통 중심은 캔버스 가운데가 아니라 **48% 지점**이다.
 *
 *  전에는 `/intro/v3-hero.webp` 를 크롭하고 타원 마스크로 가장자리를 녹여 썼다. 그때 배운 것:
 *  마스크 반경이 50% 를 넘으면 그라데이션이 상자 밖에서 끝나서 **잘린 사각형이 그대로 보인다.**
 *  지금은 알파가 있어서 마스크 자체가 필요 없다. */
function AiHuman({ p, pt }: { p: number; pt: { x: number; y: number } }) {
  const q = pose(p)
  const w = poseMix(p)
  return (
    <div
      className="pointer-events-none absolute z-[1] hidden lg:block"
      style={{
        left: `${q.x}%`,
        top: `${q.y}vh`, // 보통은 바닥에 선다(100 - h). 히어로만 따로 준다
        height: `${q.h}vh`,
        aspectRatio: '0.665 / 1', // 가로는 여기서 따라 나온다
        transform: `translate(-48%, 0) translate3d(${pt.x * -12}px, ${pt.y * -10}px, 0)`,
        willChange: 'left, top, height, transform',
      }}
      aria-hidden
    >
      {/* 뒤에서 퍼지는 빛. 인물보다 크게 깔아야 윤곽이 배경에 녹는다. */}
      <div
        className="absolute left-[48%] top-[38%] -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '150%',
          aspectRatio: '1 / 1',
          background: `radial-gradient(circle, rgba(46,107,255,${q.glow * 0.7}) 0%, transparent 62%)`,
        }}
      />
      {/* 세 포즈를 겹쳐 두고 가중치로 갈아탄다. 세 장이 같은 캔버스라 겹쳐도 어긋나지 않는다. */}
      {/* 다섯 장을 겹쳐 두고 가중치로 갈아탄다. 세 장이 같은 캔버스라 겹쳐도 어긋나지 않는다.
          **가중치가 0 인 장은 아예 안 그린다** - 다섯 장을 늘 깔아 두면 보이지도 않는 층을
          매 프레임 합성한다. 실제로 살아 있는 건 언제나 한두 장뿐이다. */}
      <div className="relative h-full w-full">
        {w.map((weight, i) =>
          weight > 0.002 ? (
            <img
              key={i}
              src={`/intro/human/pose-${i + 1}.webp`}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              style={{ opacity: weight }}
            />
          ) : null,
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   공용 조각
   ══════════════════════════════════════════════════════════════════════════ */

/** 한 장면이 앉는 자리. 경계에서 확실히 꺼지도록 감싼다. */
function Slot({ on, children }: { on: number; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0" style={{ opacity: on }} aria-hidden={on < 0.5}>
      {children}
    </div>
  )
}

/** 무대 위 글자가 앉는 자리. 인물이 오른쪽에 있으니 글은 왼쪽에 머문다. */
function Copy({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="absolute left-0 top-1/2 w-full max-w-[660px] -translate-y-1/2 px-6 sm:px-10 lg:px-16" style={style}>
      {children}
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[clamp(1.5rem,2.9vw,2.6rem)] font-light leading-[1.32] tracking-[-0.01em]">{children}</h2>
  )
}

/** 스크롤한 만큼 글자가 찍힌다.
 *
 *  이 페이지에서 "AI 같다" 를 만드는 방법으로 고른 것. 빛나는 테두리나 도는 궤도를 얹지 않고
 *  **말하는 방식 자체**에 넣었다. 모델이 글을 뱉는 모습이 원래 이렇게 생겼고, 이 장면이 하려는
 *  말도 "AI 가 지금 나를 읽고 말을 만들고 있다" 라서 장식이 아니라 내용이 된다.
 *
 *  ⚠️ 글자가 늘어나면 상자가 같이 커져서 화면이 들썩인다. 그래서 **전체 문장을 안 보이게 깔아
 *  자리를 잡아 두고** 그 위에 찍히는 만큼만 덧그린다. 상자 크기는 처음부터 끝까지 그대로다. */
function Typed({ text, p }: { text: string; p: number }) {
  const n = Math.round(Math.max(0, Math.min(1, p)) * text.length)
  return (
    <span className="relative block whitespace-pre-line">
      <span className="invisible">{text}</span>
      <span className="absolute inset-0 whitespace-pre-line">
        {text.slice(0, n)}
        {n < text.length && (
          <span
            className="ml-[2px] inline-block w-[2px] translate-y-[0.16em] align-baseline"
            style={{ height: '1em', background: BLUE }}
            aria-hidden
          />
        )}
      </span>
    </span>
  )
}

/** 인물이 하는 말.
 *
 *  ⚠️ 처음엔 화면 한가운데 위쪽(`-translate-y-[130%]`)에 뒀다가 **섹션 제목과 겹쳤다**(사용자 지적).
 *  제목은 `top-[13vh]` 에 두 줄이라 대략 28vh 까지 내려온다. 그래서 자리를 `y` 로 받아
 *  장면마다 정하게 하고, 기본값을 제목 아래(56%)로 내렸다.
 *
 *  그리고 **꼬리를 달았다.** 꼬리가 없으면 그냥 떠 있는 상자라 누가 하는 말인지 안 읽힌다.
 *  오른쪽으로 뾰족하게 - 이 페이지에서 말하는 사람은 늘 오른쪽에 서 있다. */
function Bubble({
  children,
  o,
  x = 46,
  y = 56,
}: {
  children: React.ReactNode
  o: number
  x?: number
  y?: number
}) {
  const skin = { borderColor: 'rgba(46,107,255,0.55)', background: 'rgba(10,21,38,0.94)' }
  return (
    <div
      className="absolute z-[2] w-[min(34vw,440px)] rounded-[22px] border px-7 py-6 text-[clamp(1rem,1.45vw,1.25rem)] font-light leading-[1.7] backdrop-blur-md"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        ...skin,
        boxShadow: `0 28px 80px -26px ${BLUE}`,
        opacity: o,
        transform: `translateY(-50%) translateY(${lerp(14, 0, o)}px)`,
      }}
    >
      {children}
      {/* 꼬리. 네모를 45도 돌려서 바깥쪽 두 변에만 테두리를 남긴다(삼각형 하나면 된다). */}
      <span
        className="absolute right-[-10px] top-[62%] h-[20px] w-[20px] rotate-45 border-b border-r"
        style={skin}
        aria-hidden
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   장면 데이터
   ══════════════════════════════════════════════════════════════════════════ */

/** 혼자 공부할 때 떠오르는 고민 스무 개를 **언제 하는 고민인지**로 묶었다.
 *
 *  전에는 묶음 이름이 START / DIRECTION / WEAKNESS / PACE / CONTINUE 였는데 눈에 안 들어왔다
 *  (사용자 지적). 영문 대문자 라벨은 장식으로 읽히지 뜻으로 안 읽힌다. 한글로 바꾸면서
 *  **"무엇에 대한 고민인가"(방향·약점) 가 아니라 "언제 하는 고민인가"(시작할 때·다시 할 때)** 로
 *  기준도 바꿨다. 전자는 분류고 후자는 장면이다. 읽는 사람은 자기 장면에서 자기를 찾는다. */
export const CONCERNS = [
  { k: '시작할 때', d: '뭐부터 해야 할지 모를 때', items: ['뭐부터 하지', '오늘은 어디까지 하지', '지금 시작해도 될까', '또 계획부터 짜야 하나'] },
  { k: '방향을 정할 때', d: '이 순서가 맞는지 모를 때', items: ['지금 이걸 공부하는 게 맞나', '다음에는 뭘 해야 하지', '이 순서가 맞을까', '내가 제대로 가고 있는 걸까'] },
  { k: '자꾸 틀릴 때', d: '같은 자리에서 또 막힐 때', items: ['왜 여기서 계속 막히지', '또 같은 실수를 했네', '뭘 다시 봐야 하지', '내가 정확히 뭘 모르는 거지'] },
  { k: '분량을 정할 때', d: '얼마나 해야 할지 모를 때', items: ['오늘은 얼마나 해야 하지', '너무 많이 하고 있나', '요즘 너무 밀렸는데', '지금 페이스로 괜찮을까'] },
  { k: '다시 시작할 때', d: '멈췄다가 돌아왔을 때', items: ['어디까지 했더라', '며칠 쉬었는데 어디서 다시 시작하지', '어제 하던 건 다시 봐야 하나', '이번에도 중간에 멈추는 건 아닐까'] },
]

const FLAT = CONCERNS.flatMap((g, gi) => g.items.map((text, pi) => ({ text, gi, pi })))

/* ─── 02 LEARNER PAIN POINTS ──────────────────────────────────────────────
   우르르 쏟아진다 → **다섯 가지가 뽑혀 올라온다** → 선생님 쪽으로 넘어간다.

   ⭐ 원래는 스무 블록을 다섯 줄 × 네 칸으로 **정렬**했다. 그러면 표가 되고 읽을 게 스무 개다.
   스무 문장은 **재료**고 결론은 다섯 가지다(사용자 제안). 그래서 블록은 바닥으로 가라앉고
   그 자리에서 다섯 가지가 떠오른다. 각 가지 옆에 대표 문구를 한 줄 붙여 학습자의 말투를 남긴다.

   ⭐ 낙하는 **진짜 물리**다(`_pile.tsx`). 블록끼리 부딪히고 쌓이고, 커서가 있는 기기에서는
   집어서 던질 수도 있다.

   ⚠️ 그래서 **낙하만은 스크롤에 안 물려 있다.** 시뮬레이션의 시간은 한쪽으로만 흐르는데
   스크롤은 양쪽으로 간다. 장면에 들어오면 한 번 쏟아지고, 그다음부터 스크롤이 맡는다. */
function ScenePain({ t }: { t: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const pile = usePile(hostRef, itemRefs, FLAT.length, true)
  const frozen = useRef<{ x: number; y: number; a: number }[] | null>(null)

  /* ⭐ **블록이 다 떨어지기 전에는 다음 단계를 시작하지 않는다.**
     물리는 실제 시간으로 흐르고 스크롤은 위치로 흐른다 - 둘이 안 맞는다. 빨리 굴리면
     블록이 공중에 있는 채로 얼어붙어 끌려갔다(사용자 지적). 그래서 더미가 가라앉을 때까지
     잠가 두고, 풀리는 순간의 스크롤 위치에서 시작한다(이미 내려와 있었으면 거기서 바로 -
     그래야 안 튄다). 0.72 상한은 아무리 빨리 지나가도 볼 자리를 남겨 두려는 것이다. */
  const [unlock, setUnlock] = useState<number | null>(null)
  const tNow = useRef(t)
  tNow.current = t
  useEffect(() => {
    const id = setTimeout(() => setUnlock(Math.min(0.62, Math.max(0.3, tNow.current))), 1500)
    return () => clearTimeout(id)
  }, [])

  const s0 = unlock ?? 2 // 아직 안 가라앉았으면 어떤 값도 구간에 못 들어온다
  /* 뽑아내기. 한 묶음씩 차례로 빨려 들어가므로 구간이 넉넉해야 한 바퀴가 다 보인다. */
  const distill = seg(t, s0, s0 + 0.3)
  const absorb = ease(seg(t, s0 + 0.46, s0 + 0.56)) // 다섯 가지가 선생님에게 넘어간다
  const closing = seg(t, s0 + 0.52, s0 + 0.62)
  const headOut = seg(t, s0, s0 + 0.1)

  /* 묶음(gi)이 제 차례에 얼마나 빨려 들어갔나. 0 = 더미에 그대로, 1 = 다 들어감.
     ⭐ **네 블록이 자기 페인포인트 자리로 모여서 그게 된다.** 전에는 블록이 그냥 가라앉고
     다섯 가지가 따로 떠올랐는데, 그러면 둘이 남남으로 보인다(사용자 지적).
     한 묶음씩 차례로 들어가야 "이 넷이 저거였구나" 가 눈으로 읽힌다. */
  const suck = (gi: number) => ease(seg(distill, gi * 0.1, gi * 0.1 + 0.45))

  /* 뽑아내기가 시작되면 엔진을 멈추고, 멈춘 자리에서 블록을 가라앉힌다. */
  useEffect(() => {
    if (distill <= 0.001) {
      if (frozen.current) {
        frozen.current = null
        pile.current?.resume()
      }
      return
    }
    if (!frozen.current) frozen.current = pile.current?.freeze() ?? null
    const from = frozen.current
    if (!from) return
    const host = hostRef.current
    if (!host) return
    const W = host.clientWidth
    const H = host.clientHeight
    for (let i = 0; i < FLAT.length; i++) {
      const el = itemRefs.current[i]
      if (!el) continue
      const c = FLAT[i]
      const f = from[i]
      const k = suck(c.gi)
      /* 목적지 = 그 묶음의 페인포인트 줄. 넷이 한 점에 겹치지 않게 아주 조금만 벌린다
         (완전히 같은 점으로 보내면 마지막 순간에 네 장이 한 장처럼 보여서 '넷이 모였다' 가 안 읽힌다). */
      const tx = W * (0.09 + c.pi * 0.014)
      const ty = H * ((23 + c.gi * 12.5) / 100)
      const x = lerp(f.x, tx, k) - BLOCK_W / 2
      const y = lerp(f.y, ty, k) - BLOCK_H / 2
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${lerp(f.a, 0, k)}rad) scale(${lerp(1, 0.3, k)})`
      el.style.opacity = String(1 - k)
      el.style.zIndex = k > 0.05 ? '4' : '0' // 빨려 들어가는 동안에는 인물보다 앞
    }
  }, [distill, pile])

  return (
    <>
      <div className="absolute left-0 top-[11vh] z-10 px-6 sm:px-10 lg:px-16" style={{ opacity: 1 - headOut }}>
        <Head>
          사람마다
          <br />
          <span className="font-medium">막히는 지점은 다릅니다</span>
        </Head>
      </div>

      {/* 블록이 사는 자리. 물리 엔진이 여기 크기로 벽을 세운다. */}
      <div ref={hostRef} className="absolute inset-0">
        {FLAT.map((c, i) => (
          <span
            key={c.text}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className="absolute left-0 top-0 flex items-center justify-center rounded-2xl border border-white/14 bg-white/[0.08] px-3 text-center text-[12.5px] leading-[1.45] text-white/85 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)] backdrop-blur-sm"
            style={{ width: BLOCK_W, height: BLOCK_H, willChange: 'transform', cursor: 'grab' }}
          >
            {c.text}
          </span>
        ))}
      </div>

      {/* 더미에서 뽑아낸 다섯 가지. 아래에서 차례로 떠오른다. */}
      <div className="absolute inset-0 z-[3]" aria-hidden={distill < 0.4}>
        {CONCERNS.map((g, i) => {
          /* 줄은 자기 블록들이 거의 다 들어온 **다음에** 뜬다. 먼저 떠 있으면
             블록이 이미 있는 것에 흡수되는 것처럼 보여서 인과가 뒤집힌다. */
          const on = ease(seg(distill, i * 0.1 + 0.3, i * 0.1 + 0.52))
          // 마지막에는 다섯 가지가 통째로 선생님 쪽으로 건너간다
          const ax = lerp(0, 40, absorb)
          const ay = lerp(0, (48 - (23 + i * 12.5)) * 0.9, absorb)
          return (
            <div
              key={g.k}
              className="absolute left-[6%] flex items-baseline gap-6"
              style={{
                top: `${23 + i * 12.5}%`,
                opacity: on * (1 - absorb),
                transform: `translate(${ax}%, calc(-50% + ${lerp(44, 0, on)}px + ${ay}vh)) scale(${lerp(1, 0.72, absorb)})`,
                filter: absorb > 0 ? `blur(${absorb * 5}px)` : '',
                willChange: 'transform, opacity',
              }}
            >
              <span className="w-[1.5rem] shrink-0 text-[13px] tabular-nums" style={{ color: BLUE }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="shrink-0 text-[clamp(1.15rem,1.8vw,1.5rem)] font-medium leading-[1.4]">{g.k}</span>
              <span className="text-[14px] leading-[1.7] text-white/45">{g.d}</span>
              <span className="text-[14px] leading-[1.7] text-white/70">“{g.items[0]}”</span>
            </div>
          )
        })}
      </div>

      <Copy style={{ opacity: closing, transform: `translateY(calc(-50% + ${lerp(16, 0, closing)}px))` }}>
        <p className="text-[clamp(1.1rem,2vw,1.7rem)] font-light leading-[1.6]">
          어려운 건 <strong className="font-medium">지금의 나에게 필요한 다음 행동을 계속 찾아가는 일</strong>입니다.
        </p>
      </Copy>
    </>
  )
}

export const UTTERANCES = [
  { say: '지난번에 이 부분에서 조금 오래 걸렸어요.\n오늘은 여기부터 다시 해볼까요?', info: '지난 학습' },
  { say: '최근 학습 흐름을 봤을 때\n오늘은 이 내용을 먼저 보는 게 좋겠어요.', info: '오늘의 시작점' },
  { say: '며칠 쉬었으니\n부담 없이 여기서 다시 시작해볼까요?', info: '다시 시작할 지점' },
  { say: '이 부분은 이제 꽤 안정적이에요.\n다음 단계로 넘어가볼까요?', info: '다시 볼 부분' },
]

/** 인물 주위에 뜨는 칩. x·y 는 화면 비율(칩의 **중심**).
 *  자리를 고를 때 지킨 것 셋: 왼쪽 위(제목 자리)를 비운다 · x 는 20~50% 안(그 밖이면
 *  잘리거나 인물에 겹친다) · 서로 세로로 18% 이상 떨어뜨린다(칩 높이가 대략 13%). */
export const HUD = [
  { k: 'WEAKNESS', t: '자주 막히는 데에는 패턴이 있습니다', f: '학습 기록 → 반복 패턴 → 약점 분석', x: 26, y: 47 },
  { k: 'PRIORITY', t: '지금 더 필요한 공부부터', f: '전체 학습 → 현재 상태 → 우선 학습', x: 20, y: 66 },
  { k: 'DAILY PLAN', t: '오늘 할 만큼', f: '현재 상태 → 오늘의 학습', x: 30, y: 85 },
  { k: 'DYNAMIC CURRICULUM', t: '내가 달라지면 학습 계획도 달라집니다', f: '기존 계획 → 현재 상태 → 새로운 학습 경로', x: 50, y: 31 },
  { k: 'REVIEW', t: '오늘의 어려움이 다음 수업에 반영됩니다', f: '오늘의 결과 → 다음 학습', x: 50, y: 66 },
]

/* 건네면서 하는 말. 줄바꿈이 들어가서 JSX 안에 직접 쓰기보다 여기 두는 게 읽기 낫다. */
const HANDOVER_LINE = `“지난번에 어려워했던 부분부터
다시 시작해볼까요?”`

export const PIPELINE = [
  { head: '이전 학습', items: ['개념 A 반복 오답', '학습 속도 저하', '일부 학습 미완료'] },
  { head: 'AI 분석', items: ['반복 약점 확인', '학습 진행 상태 확인', '우선순위 재조정'] },
  { head: '다음 학습', items: ['개념 A 복습 우선', '학습량 조정', '미완료 학습 재배치'] },
]

/* ══════════════════════════════════════════════════════════════════════════
   무대
   ══════════════════════════════════════════════════════════════════════════ */

export function Stage() {
  const ref = useRef<HTMLDivElement>(null)
  const p = useTrackProgress(ref)
  const pt = usePointer()

  return (
    <div ref={ref} className="relative hidden lg:block lg:h-[750vh]" style={{ background: BASE }}>
      <div className="sticky top-0 h-[100dvh] overflow-hidden break-keep">
        {/* 바닥에 깔리는 빛. 인물이 움직이는 쪽을 따라간다. */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(1000px 620px at ${pose(p).x}% 42%, rgba(46,107,255,0.14), transparent 64%), ${BASE}`,
          }}
        />
        <AiHuman p={p} pt={pt} />

        <div className="relative mx-auto h-full w-full max-w-[1560px]">
          {near(p, BEAT.hero) && (
            <Slot on={lit(p, BEAT.hero)}>
              <SceneHero t={at(p, BEAT.hero)} pt={pt} />
            </Slot>
          )}
          {near(p, BEAT.pain) && (
            <Slot on={lit(p, BEAT.pain)}>
              <ScenePain t={at(p, BEAT.pain)} />
            </Slot>
          )}
          {near(p, BEAT.human) && (
            <Slot on={lit(p, BEAT.human)}>
              <SceneHuman t={at(p, BEAT.human)} />
            </Slot>
          )}
          {near(p, BEAT.powered) && (
            <Slot on={lit(p, BEAT.powered)}>
              <ScenePowered t={at(p, BEAT.powered)} />
            </Slot>
          )}
          {near(p, BEAT.cont) && (
            <Slot on={lit(p, BEAT.cont)}>
              <SceneContinuous t={at(p, BEAT.cont)} />
            </Slot>
          )}
        </div>
      </div>
    </div>
  )
}

/** 인물을 도는 고리. 토성 고리처럼 **기울어진 채** 돌고, 고리 위의 점이 같이 실려 간다.
 *
 *  ⭐ 이 효과의 요점은 고리가 **인물 뒤로 들어갔다 앞으로 나오는 것**이다. 전부 앞에 그리면
 *  인물에 두른 테두리로 보이고, 전부 뒤에 그리면 배경 무늬로 보인다. 감싸고 도는 것처럼
 *  보이려면 한 바퀴 도는 동안 앞뒤가 바뀌어야 한다.
 *
 *  방법: **같은 고리를 두 번 그리고 화면 좌표로 반씩 자른다.** 위 반쪽은 인물보다 뒤(z-0),
 *  아래 반쪽은 앞(z-[3]). 기울여 놓으면 타원의 위쪽이 '먼 쪽' 이라 그게 뒤로 가는 게 맞다.
 *  두 벌은 애니메이션 설정이 같아서 저절로 맞물려 돈다(동기화 코드가 필요 없다).
 *
 *  ponytail: 3D 도 캔버스도 아니다. `rotateX` 로 원을 눕히고 `rotate` 로 돌리는 게 전부다.
 *    고리를 진짜 3D 로 만들면 앞뒤 자르기가 공짜로 되지만, 그러려면 WebGL 을 띄워야 한다.
 */
/*  r = 반지름(vh) · tilt = 눕힌 각도 · spin = 한 바퀴 도는 시간(초) · o = 선의 밝기.
 *  ⚠️ 처음엔 r 27~36, tilt 74~78, o 0.2~0.34 로 잡았다가 **거의 안 보였다.**
 *  이유 둘: 고리가 인물 몸 위에만 걸쳐서 밝은 인물에 1px 선이 묻혔고, 78도로 눕히니
 *  타원 높이가 지름의 20% 밖에 안 돼 선 두 개로 보였다.
 *  → **인물 바깥 어두운 데까지 나오게 키우고**, 덜 눕히고, 밝기를 올리고 빛무리를 줬다. */
const ORBITS = [
  { r: 38, tilt: 66, spin: 34, dots: [0, 140, 250], w: 1.5, o: 0.5 },
  { r: 50, tilt: 71, spin: 54, dots: [60, 210], w: 1, o: 0.3 },
  { r: 27, tilt: 60, spin: 22, dots: [200, 330], w: 2, o: 0.62 },
]

/** 고리 한 벌. `half` 로 위/아래 어느 쪽만 보일지 정한다. */
function OrbitRing({ o: ring, half }: { o: (typeof ORBITS)[number]; half: 'back' | 'front' }) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: `${ring.r * 2}vh`,
        height: `${ring.r * 2}vh`,
        transform: 'translate(-50%, -50%)',
        /* 화면 좌표로 자른다. 기울인 요소 안에서 자르면 잘리는 선도 같이 기울어진다. */
        clipPath: half === 'back' ? 'inset(0 0 50% 0)' : 'inset(50% 0 0 0)',
      }}
    >
      <div className="absolute inset-0" style={{ perspective: '900px' }}>
        <div className="absolute inset-0" style={{ transform: `rotateX(${ring.tilt}deg)` }}>
          <div
            className="intro-orbit absolute inset-0"
            style={{ animationDuration: `${ring.spin}s` }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: `${ring.w}px solid ${BLUE}`,
                opacity: ring.o,
                // 선 자체에 빛무리. 없으면 밝은 인물 위를 지날 때 선이 사라진다.
                boxShadow: `0 0 14px ${BLUE}, inset 0 0 14px ${BLUE}`,
              }}
            />
            {ring.dots.map((a) => (
              <span
                key={a}
                className="absolute left-1/2 top-1/2 block h-[9px] w-[9px] rounded-full"
                style={{
                  background: '#CFE0FF',
                  boxShadow: `0 0 16px 3px ${BLUE}`,
                  transform: `rotate(${a}deg) translateX(${ring.r}vh) translate(-50%, -50%)`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 고리 세 벌 + 떠다니는 점 몇 개. 인물의 가슴께를 중심으로 돈다. */
function HeroField({ pt, o }: { pt: { x: number; y: number }; o: number }) {
  const layer = (half: 'back' | 'front') => (
    <div
      className={`pointer-events-none absolute inset-0 hidden lg:block ${half === 'back' ? 'z-0' : 'z-[3]'}`}
      style={{ opacity: o }}
      aria-hidden
    >
      <div
        className="absolute"
        style={{
          left: '79%',
          top: '46%',
          width: 0,
          height: 0,
          transform: `translate3d(${pt.x * -16}px, ${pt.y * -12}px, 0)`,
          willChange: 'transform',
        }}
      >
        {ORBITS.map((ring) => (
          <OrbitRing key={ring.r} o={ring} half={half} />
        ))}
      </div>
    </div>
  )

  return (
    <>
      {layer('back')}
      {layer('front')}
      {/* 고리와 별개로 떠다니는 점 몇 개. 고리만 있으면 기계 장치 같고, 흩어진 점이
          몇 개 섞여야 '떠 있는 공간' 이 된다. 얼굴 위는 비운다 - 거기 점이 있으면 먼지로 보인다. */}
      <div className="pointer-events-none absolute inset-0 z-[3] hidden lg:block" style={{ opacity: o }} aria-hidden>
        {FIELD.map((f, i) => (
          <span
            key={i}
            className="absolute block"
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              transform: `translate3d(${pt.x * -22 * f.d}px, ${pt.y * -16 * f.d}px, 0)`,
              willChange: 'transform',
            }}
          >
            <span
              className="intro-float block rounded-full"
              style={{
                width: f.r * 2,
                height: f.r * 2,
                background: BLUE,
                opacity: 0.18 + f.d * 0.32,
                boxShadow: `0 0 ${f.r * 5}px ${BLUE}`,
                animationDelay: `${f.t}s`,
                animationDuration: `${7 + f.d * 4}s`,
              }}
            />
          </span>
        ))}
      </div>
    </>
  )
}

/** 고리에 안 실린 점들. 인물 왼쪽(글자 쪽이 아닌 빈 자리)에만 둔다. */
const FIELD = [
  { x: 55, y: 20, r: 2, d: 1.2, t: 0 },
  { x: 50, y: 52, r: 1.5, d: 0.6, t: 2.1 },
  { x: 58, y: 78, r: 2.5, d: 1.1, t: 4.3 },
  { x: 63, y: 12, r: 1.5, d: 0.5, t: 1.2 },
  { x: 47, y: 34, r: 1, d: 0.4, t: 3.4 },
  { x: 96, y: 26, r: 2, d: 0.9, t: 5.5 },
  { x: 93, y: 66, r: 1.5, d: 0.6, t: 2.8 },
  { x: 71, y: 90, r: 2, d: 1.15, t: 0.7 },
]

/* ─── 01 HERO ─────────────────────────────────────────────────────────────
   요소는 셋뿐이다: 제목 2줄 · 짧은 본문 · 버튼 2개.
   R&D 고지는 상단 바로 올렸다. 히어로는 한 장면이지 안내문 묶음이 아니다.

   ⭐ 인물만 세워 두면 "AI 휴먼" 까지만 읽히고 **"학습 서비스의"** 가 안 읽힌다(사용자 지적).
   처음엔 수업 화면이 도는 **태블릿을 인물 앞에 붙였다가 걷어냈다.** 기기 덩어리가 떡하니
   놓이니 고급스럽지도 않고 인물과 따로 놀았다. 학습이라는 뜻은 소품을 얹어서가 아니라
   **인물 이미지 자체**에 담아야 한다 - 그래서 히어로 전용 포즈를 따로 만들었다(pose-6). */
function SceneHero({ t, pt }: { t: number; pt: { x: number; y: number } }) {
  const out = seg(t, 0.5, 0.95)
  return (
    <>
      <HeroField pt={pt} o={1 - out} />
      <Copy style={{ opacity: 1 - out, transform: `translateY(calc(-50% - ${out * 70}px))` }}>
        {/* 등장은 `.stage-rise` 로 한다. `.reveal`(IntersectionObserver) 은 여기서 못 쓴다 -
            장면이 스크롤에 따라 붙었다 떨어지는데 관찰자는 한 번 쏘고 그만둬서,
            내려갔다 올라오면 글자가 영영 안 돌아온다(실측). */}
        <h1 className="stage-rise break-keep text-[clamp(2rem,3.9vw,3.6rem)] font-light leading-[1.18] tracking-[-0.02em]">
          나를 가장 잘 이해하는
          <br />
          <span className="font-medium">AI 선생님</span>
        </h1>
        <p className="stage-rise mt-9 text-[clamp(0.95rem,1.25vw,1.1rem)] leading-[2] text-white/70" style={{ animationDelay: '150ms' }}>
          내가 어디에서 자주 막히는지,
          <br />
          어떤 방식으로 공부하고 있는지,
          <br />
          지금 무엇이 필요한지.
        </p>
        <div className="stage-rise mt-11 flex flex-wrap gap-3" style={{ animationDelay: '300ms' }}>
          <a
            href="#trial"
            className="inline-flex min-h-[52px] items-center whitespace-nowrap rounded-full px-7 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
            style={{ background: BLUE, boxShadow: `0 16px 44px -14px ${BLUE}` }}
          >
            수업 체험해보기
          </a>
          <a
            href="#cta"
            className="inline-flex min-h-[52px] items-center whitespace-nowrap rounded-full border border-white/25 px-7 text-[14px] text-white/85 transition-colors hover:border-white/55 active:scale-[0.98]"
          >
            오픈 베타 알림
          </a>
        </div>
      </Copy>
    </>
  )
}

/* ─── 03 AI HUMAN ─────────────────────────────────────────────────────────
   선생님이 방금 삼킨 고민을 읽고 말을 건다. 네 마디가 차례로 갈아탄다.
   대시보드를 안 그린다 - 기획서가 "숫자나 대시보드 대신 선생님의 말" 이라고 못 박았다.
   주변에는 지금 무엇을 보고 하는 말인지 한 조각만 띄운다. */
function SceneHuman({ t }: { t: number }) {
  const head = 1 - seg(t, 0.62, 0.8)
  // 갈아타는 순간에만 잠깐 흐려진다. 늘 서서히 변하면 읽는 중에 흔들려서 거슬린다.
  const { step, inner, isLast } = stepAt(t, 0.1, 0.96, UTTERANCES.length)
  const o = fadeStep(inner, isLast)

  return (
    <>
      <div className="absolute left-0 top-[13vh] px-6 sm:px-10 lg:px-16" style={{ opacity: head }}>
        <Head>
          나를 이해한 AI가
          <br />
          <span className="font-medium">선생님의 모습으로 말을 겁니다</span>
        </Head>
      </div>

      <Bubble o={o} x={24} y={58}>
        {/* 한글에는 자간을 벌리지 않는다. 라틴 대문자 라벨의 버릇을 그대로 옮기면
            `지 난  학 습` 처럼 낱글자가 흩어져 읽기 나빠진다(실측). */}
        <span className="mb-3 block text-[12px] font-semibold" style={{ color: BLUE }}>
          {UTTERANCES[step].info}
        </span>
        {/* 빨리 찍히고 **오래 남는다.** 찍히는 동안은 못 읽으니 그 구간은 짧을수록 좋다. */}
        <Typed text={`“${UTTERANCES[step].say}”`} p={seg(inner, 0.03, 0.28)} />
      </Bubble>

      {/* 네 마디 중 몇 번째인지. 숫자를 안 쓰고 선의 길이로만 말한다. */}
      <div className="absolute bottom-[12vh] left-0 flex gap-2 px-6 sm:px-10 lg:px-16" aria-hidden>
        {UTTERANCES.map((u, i) => (
          <span
            key={u.info}
            className="block h-px w-12 transition-colors"
            style={{ background: i === step ? BLUE : 'rgba(255,255,255,0.18)' }}
          />
        ))}
      </div>
    </>
  )
}

/* ─── 05 AI POWERED LEARNING ──────────────────────────────────────────────
   기획서: "AI 휴먼 주변에 약점·우선순위·오늘 분량 등 정보가 HUD 처럼 나타나는 연출."
   다섯 칸을 나란히 세우지 않는 이유가 여기 있다. 나란히 세우면 **기능 목록**이 되고,
   인물 주위에 뜨면 **이 선생님이 나를 아는 근거**가 된다. 같은 다섯 개인데 뜻이 달라진다.
   마지막에 다섯 개가 한 장의 '다음 수업' 으로 모인다. */
function ScenePowered({ t }: { t: number }) {
  const head = 1 - seg(t, 0.3, 0.42)
  /* 박자: 칩이 하나씩 차오르고(~0.45) → **다섯을 같이 읽고**(~0.68) → 한 장으로 모이고(~0.78) → 남는다. */
  const merge = ease(seg(t, 0.68, 0.78)) // 다섯 개가 한 장으로 모인다
  const card = seg(t, 0.66, 0.78) // 모이는 동안 이미 자라기 시작한다(사이가 비면 안 된다)

  return (
    <>
      <div className="absolute left-0 top-[12vh] px-6 sm:px-10 lg:px-16" style={{ opacity: head }}>
        <Head>
          다음 수업을 정하는 건
          <br />
          교재의 다음 페이지가 아니라
          <br />
          <span className="font-medium">오늘의 나입니다</span>
        </Head>
      </div>

      {/* 인물과 칩을 잇는 실. 정보가 인물에게서 나온다는 것을 선 하나로 말한다. */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        {HUD.map((h, i) => {
          const on = seg(t, 0.05 + i * 0.08, 0.13 + i * 0.08)
          /* 인물 쪽(x1)에서 칩 쪽(x2)으로 **그어진다.** 그냥 켜면 선이 거기 원래 있던 것처럼
             보이고, 그어지면 정보가 저 사람에게서 나왔다는 뜻이 된다.
             `pathLength="1"` 로 길이를 1 로 정규화하면 화면 크기와 무관하게 비율로 그릴 수 있다
             (실제 길이를 재서 dasharray 에 넣을 필요가 없다). */
          return (
            <line
              key={h.k}
              x1="72%"
              y1="48%"
              x2={`${h.x + 5}%`}
              y2={`${h.y}%`}
              stroke={BLUE}
              strokeOpacity={0.3 * (1 - merge)}
              strokeWidth="1"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - ease(on)}
            />
          )
        })}
      </svg>

      {HUD.map((h, i) => {
        const on = ease(seg(t, 0.05 + i * 0.08, 0.15 + i * 0.08))
        return (
          <div
            key={h.k}
            className="absolute w-[min(21vw,262px)] rounded-2xl border px-5 py-4 backdrop-blur-md"
            style={{
              left: `${lerp(h.x, 70, merge)}%`,
              top: `${lerp(h.y, 48, merge)}%`,
              borderColor: 'rgba(46,107,255,0.34)',
              background: 'rgba(11,24,48,0.78)',
              opacity: on * (1 - merge),
              transform: `translate(-50%, -50%) translateY(${lerp(18, 0, on)}px) scale(${lerp(1, 0.5, merge)})`,
              willChange: 'transform, opacity',
            }}
            aria-hidden
          >
            <span className="text-[10.5px] font-semibold tracking-[0.22em]" style={{ color: BLUE }}>
              {h.k}
            </span>
            <p className="mt-2.5 text-[14px] font-medium leading-[1.5]">{h.t}</p>
            <p className="mt-2 text-[11.5px] leading-[1.6] text-white/45">{h.f}</p>
          </div>
        )
      })}

      {/* 다섯이 모여 한 장이 된다 */}
      <div
        className="absolute left-[10%] top-1/2 w-[min(30vw,380px)] rounded-2xl border p-8"
        style={{
          borderColor: BLUE,
          background: 'rgba(46,107,255,0.1)',
          opacity: card,
          transform: `translateY(-50%) scale(${lerp(0.92, 1, card)})`,
        }}
      >
        <span className="text-[11px] font-semibold tracking-[0.26em]" style={{ color: BLUE }}>
          NEXT LESSON
        </span>
        <p className="mt-4 text-[clamp(1.05rem,1.6vw,1.3rem)] font-medium leading-[1.5]">
          다음에 무엇을 얼마나 어떤 순서로.
          <br />
          지금의 학습 상태에 맞춰 다시 정합니다.
        </p>
      </div>
    </>
  )
}

/* ─── 06 CONTINUOUS LEARNING ──────────────────────────────────────────────
   기획서: "어제의 학습 카드가 AI 분석 영역으로 이동하고 새로운 다음 수업 카드로 재조립.
   마지막에는 AI 휴먼이 그 카드를 직접 건네는 듯한 연출."
   그래서 세 장을 나란히 놓지 않고 **한 자리에서 갈아입힌다.** 나란히 놓으면 '세 단계'고,
   한 자리에서 바뀌면 '같은 것이 달라졌다' 가 된다. 이 섹션이 하려는 말이 후자다. */
function SceneContinuous({ t }: { t: number }) {
  const head = 1 - seg(t, 0.5, 0.6)
  const { step, inner, isLast } = stepAt(t, 0.06, 0.6, PIPELINE.length)
  const o = fadeStep(inner, isLast)
  const hand = ease(seg(t, 0.64, 0.76)) // 선생님이 카드를 건넨다
  const cur = PIPELINE[step]

  return (
    <>
      <div className="absolute left-0 top-[13vh] px-6 sm:px-10 lg:px-16" style={{ opacity: head }}>
        <Head>
          다음 수업은
          <br />
          <span className="font-medium">오늘 이미 시작됩니다</span>
        </Head>
      </div>

      {/* 한 장이 세 번 갈아입는다. 마지막 장이 인물 쪽으로 건너간다. */}
      <div
        className="absolute top-1/2 w-[min(30vw,380px)] rounded-2xl border p-8"
        style={{
          left: `${lerp(12, 52, hand)}%`,
          borderColor: step === 1 ? BLUE : 'rgba(255,255,255,0.14)',
          background: step === 1 ? 'rgba(46,107,255,0.08)' : RAISE,
          opacity: o * (1 - hand * 0.15),
          transform: `translateY(-50%) scale(${lerp(0.96, 1, o) * lerp(1, 0.86, hand)})`,
          willChange: 'transform, opacity, left',
        }}
      >
        <span
          className="text-[11px] font-semibold tracking-[0.26em]"
          style={{ color: step === 1 ? BLUE : 'rgba(255,255,255,0.45)' }}
        >
          {cur.head}
        </span>
        <ul className="mt-5 space-y-2.5 text-[15px] leading-[1.7] text-white/70">
          {cur.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>

      <Bubble o={hand} x={16} y={52}>
        <Typed text={HANDOVER_LINE} p={seg(hand, 0.1, 0.45)} />
      </Bubble>

      <div className="absolute bottom-[12vh] left-0 px-6 sm:px-10 lg:px-16" style={{ opacity: hand }}>
        <p className="text-[15px] leading-[1.9] text-white/60">
          학습은 하루마다 끊기지 않습니다. 어제의 학습이 오늘의 출발점이 됩니다.
        </p>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   작은 화면용
   ══════════════════════════════════════════════════════════════════════════
   무대는 `lg` 부터만 돈다. 인물이 오른쪽 3할을 차지하는 구성이라 그 아래 폭에서는
   글과 카드가 설 자리가 없다. 그렇다고 같은 내용을 안 보여줄 수는 없으니
   **같은 데이터로 평범하게 쌓은 판**을 따로 둔다. 화면을 줄이는 게 아니라 다시 짜는 것이다.
   (인물은 작게 한 번만 나온다. 작은 화면에서 계속 따라다니면 글 읽을 자리를 먹는다.) */
export function StageFlow() {
  return (
    <div className="break-keep lg:hidden">
      {/* 히어로 */}
      <section className="relative overflow-hidden px-6 pb-16 pt-28 sm:px-10" style={{ background: BASE }}>
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(760px 420px at 76% 30%, rgba(46,107,255,0.26), transparent 62%)` }}
        />
        <div className="relative">
          {/* 작은 화면에서는 인물이 따라다니지 않는다. 여기서 한 번 보여주고 끝낸다.
              배경이 없는 소재라 상자도 테두리도 필요 없다. */}
          <img
            src="/intro/human/pose-2.webp"
            alt="AI 휴먼 선생님이 학습자에게 말을 거는 모습을 표현한 이미지"
            className="mx-auto mb-4 h-[300px] w-auto object-contain"
          />
          <h1 className="text-[clamp(2rem,8vw,2.8rem)] font-light leading-[1.18] tracking-[-0.02em]">
            나를 가장 잘 이해하는
            <br />
            <span className="font-medium">AI 선생님</span>
          </h1>
          <p className="mt-7 text-[15px] leading-[2] text-white/70">
            내가 어디에서 자주 막히는지, 어떤 방식으로 공부하고 있는지, 지금 무엇이 필요한지.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#trial"
              className="inline-flex min-h-[52px] items-center rounded-full px-7 text-[14px] font-medium"
              style={{ background: BLUE }}
            >
              수업 체험해보기
            </a>
            <a
              href="#cta"
              className="inline-flex min-h-[52px] items-center rounded-full border border-white/25 px-7 text-[14px] text-white/85"
            >
              오픈 베타 알림
            </a>
          </div>
        </div>
      </section>

      {/* 02 고민 */}
      <section className="px-6 py-24 sm:px-10" style={{ background: INK }}>
        <h2 className="text-[clamp(1.5rem,6vw,2rem)] font-light leading-[1.35]">
          사람마다
          <br />
          <span className="font-medium">막히는 지점은 다릅니다</span>
        </h2>
        <div className="mt-12 space-y-8">
          {CONCERNS.map((g) => (
            <div key={g.k}>
              <span className="text-[11px] font-semibold tracking-[0.26em]" style={{ color: BLUE }}>
                {g.k}
              </span>
              <ul className="mt-3 space-y-1.5 text-[14px] leading-[1.7] text-white/65">
                {g.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 border-t border-white/10 pt-8 text-[clamp(1.05rem,4.5vw,1.35rem)] font-light leading-[1.65]">
          어려운 건 <strong className="font-medium">지금의 나에게 필요한 다음 행동을 계속 찾아가는 일</strong>입니다.
        </p>
      </section>

      {/* 03 AI 휴먼의 말 */}
      <section className="px-6 py-24 sm:px-10" style={{ background: BASE }}>
        <h2 className="text-[clamp(1.5rem,6vw,2rem)] font-light leading-[1.35]">
          나를 이해한 AI가
          <br />
          <span className="font-medium">선생님의 모습으로 말을 겁니다</span>
        </h2>
        <div className="mt-10 space-y-4">
          {UTTERANCES.map((u) => (
            <div key={u.info} className="rounded-2xl border border-white/12 px-6 py-6" style={{ background: RAISE }}>
              <span className="text-[11px] font-semibold tracking-[0.24em]" style={{ color: BLUE }}>
                {u.info}
              </span>
              <p className="mt-3 whitespace-pre-line text-[15px] font-light leading-[1.75]">“{u.say}”</p>
            </div>
          ))}
        </div>
      </section>

      {/* 05 판단의 근거 */}
      <section className="px-6 py-24 sm:px-10" style={{ background: BASE }}>
        <h2 className="text-[clamp(1.5rem,6vw,2rem)] font-light leading-[1.35]">
          다음 수업을 정하는 건
          <br />
          교재의 다음 페이지가 아니라
          <br />
          <span className="font-medium">오늘의 나입니다</span>
        </h2>
        <div className="mt-10">
          {HUD.map((h, i) => (
            <div key={h.k} className={`py-7 ${i > 0 ? 'border-t border-white/10' : ''}`}>
              <span className="text-[10.5px] font-semibold tracking-[0.22em]" style={{ color: BLUE }}>
                {h.k}
              </span>
              <p className="mt-3 text-[16px] font-medium leading-[1.5]">{h.t}</p>
              <p className="mt-2 text-[12.5px] leading-[1.7] text-white/45">{h.f}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[12px] leading-[1.9] text-white/40">
          위 내용은 현재 연구 중인 서비스 방향입니다. 실제 제공 기능과 방식은 개발 과정에서 달라질 수 있습니다.
        </p>
      </section>

      {/* 06 이어짐 */}
      <section className="px-6 py-24 sm:px-10" style={{ background: INK }}>
        <h2 className="text-[clamp(1.5rem,6vw,2rem)] font-light leading-[1.35]">
          다음 수업은
          <br />
          <span className="font-medium">오늘 이미 시작됩니다</span>
        </h2>
        <div className="mt-10 space-y-3">
          {PIPELINE.map((c, i) => (
            <div key={c.head}>
              {i > 0 && (
                <p className="py-2 text-center text-[20px] font-light text-white/25" aria-hidden>
                  ↓
                </p>
              )}
              <div
                className="rounded-2xl border p-6"
                style={{
                  borderColor: i === 1 ? BLUE : 'rgba(255,255,255,0.12)',
                  background: i === 1 ? 'rgba(46,107,255,0.08)' : RAISE,
                }}
              >
                <p className="text-[15px] font-medium" style={{ color: i === 1 ? BLUE : undefined }}>
                  {c.head}
                </p>
                <ul className="mt-4 space-y-2 text-[14px] leading-[1.7] text-white/65">
                  {c.items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p
          className="mt-8 rounded-2xl border px-6 py-6 text-[15px] font-light leading-[1.7]"
          style={{ borderColor: 'rgba(46,107,255,0.45)', background: 'rgba(46,107,255,0.08)' }}
        >
          “지난번에 어려워했던 부분부터 다시 시작해볼까요?”
        </p>
        <p className="mt-8 text-[15px] leading-[1.9] text-white/60">
          학습은 하루마다 끊기지 않습니다. 어제의 학습이 오늘의 출발점이 됩니다.
        </p>
      </section>
    </div>
  )
}
