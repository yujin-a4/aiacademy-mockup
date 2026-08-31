'use client'

/* ── 강사 도크 — 강사 창 하나의 배치 ──
 *
 *   우측 패널  ⇄  최소화(작은 창, 끌어서 이동)
 *
 * 강사 사진·말·선택지·행동 지시·입력이 전부 이 창 안에 산다. 배치는 두 가지뿐이다:
 *   · 우측 패널 = 세로 스택 (아바타 → 모드 토글 → 강사 말/채팅 → 선택지·지시 → 입력)
 *   · 최소화   = 얼굴 + 말풍선(내용 전부) + 선택지/지시. 얼굴을 끌어 원하는 자리에 둔다.
 *
 * 두 대화 모드(음성·텍스트)는 **아바타까지 완전히 같고**, 아바타 아래만 갈린다:
 *   · 음성 = 지금 하는 말 한 박스 + 선택지/지시 영역 + 파형(마이크 버튼 없음 — 자동 인식)
 *   · 텍스트 = 채팅창(강사 회색 / 나 파랑 말풍선) + 선택지·지시도 채팅 흐름 안 + 입력창
 */

import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'

export type DockMode = 'sidebar' | 'mini'
export interface ChatMsg {
  role: 'ai' | 'user'
  text: string
  /** 대본 밖 질문·답변인가 — 수업 흐름과 섞이지 않게 노란 결로 묶어 보여준다 */
  aside?: boolean
  /** 앱이 만든 줄인가(판정·힌트). 따옴표를 강조로 읽지 않는다 — TutorText 의 plain 참고 */
  plain?: boolean
}

/* ── 대화 모드 토글 — 강사 아바타 바로 아래에 산다 ──
   버튼 하나지만 **두 칸이 다 보이고 지금 칸만 채워진다**(세그먼트 스위치).
   "텍스트로" 처럼 갈 곳만 적으면, 그게 지금 상태인지 누르면 될 상태인지 매번 헷갈린다 —
   지금 모드가 파랗게 켜져 있고 반대쪽은 꺼져 있으면 읽을 필요 없이 보인다. 어디를 눌러도 뒤집힌다. */
export function ChatModeToggle({ chatMode, setChatMode, compact }: {
  chatMode: 'text' | 'voice'; setChatMode: (m: 'text' | 'voice') => void; compact?: boolean
}) {
  const voice = chatMode === 'voice'
  const cell = (on: boolean) => `flex items-center gap-1 rounded-full font-bold transition-all ${
    compact ? 'px-2 py-[3px] text-[10px]' : 'px-2.5 py-1 text-[11px]'
  } ${on ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#94A3B8]'}`
  return (
    <button
      onClick={() => setChatMode(voice ? 'text' : 'voice')}
      role="switch" aria-checked={!voice}
      aria-label={voice ? '지금 음성 모드 · 눌러서 텍스트 모드로' : '지금 텍스트 모드 · 눌러서 음성 모드로'}
      title={voice ? '지금 음성 모드 — 누르면 텍스트 모드' : '지금 텍스트 모드 — 누르면 음성 모드'}
      className="inline-flex items-center gap-0.5 rounded-full bg-[#EEF2F7] p-[3px] active:scale-[0.98] transition-transform">
      <span className={cell(voice)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
        </svg>
        음성
      </span>
      <span className={cell(!voice)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
          <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
        </svg>
        텍스트
      </span>
    </button>
  )
}

/* ── 마이크 파형 — 음성 모드에서 "내가 지금 말하고 있다"를 보여주는 자리 ──
   마이크 버튼은 없다. 연결되면 계속 듣고 있고, 학생이 말하면 파형만 움직인다.
   에이전트 연결 시 실제 입력 스펙트럼(getInputByteFrequencyData)을 그리고,
   연결 전에는 잠잠한 바만 둔다. 초당 ~20회만 갱신한다(프레임마다 setState 하면 과하다). */
function MicWave({ active, speaking, getFreq }: {
  active: boolean; speaking: boolean; getFreq?: () => Uint8Array | undefined
}) {
  const N = 26
  const [bars, setBars] = useState<number[]>(() => Array(N).fill(0.08))

  useEffect(() => {
    if (!active) { setBars(Array(N).fill(0.08)); return }
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 50) return           // ~20fps
      last = t
      try {
        const d = getFreq?.()
        if (d && d.length) {
          const step = Math.max(1, Math.floor(d.length / N))
          setBars(Array.from({ length: N }, (_, i) => Math.min(1, (d[i * step] ?? 0) / 180)))
          return
        }
      } catch { /* 연결 전이면 스펙트럼을 못 읽는다 — 아래 잠잠한 바로 폴백 */ }
      setBars(Array(N).fill(0.08))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, getFreq])

  return (
    <div className="flex-1 flex items-center justify-center gap-[3px] h-9">
      {bars.map((v, i) => (
        <span key={i}
          className={`w-[3px] rounded-full transition-[height] duration-75 ${
            speaking ? 'bg-[#C7D2FE]' : active ? 'bg-[#2563EB]' : 'bg-gray-300'
          }`}
          style={{ height: `${Math.max(4, v * 26)}px` }} />
      ))}
    </div>
  )
}

/** 음성 모드 하단 — 마이크 버튼 없이 파형만. "지금 듣고 있다"는 상태 한 줄. */
function VoiceListener({ connected, connecting, isSpeaking, getFreq, onStartAgent, micActive }: {
  connected: boolean; connecting: boolean; isSpeaking: boolean
  /** 학생 차례인가 — undefined 면 예전처럼 '연결됐으면 듣는 중' */
  micActive?: boolean
  getFreq?: () => Uint8Array | undefined
  onStartAgent: () => void
}) {
  return (
    <div className="shrink-0 px-3 md:px-4 pt-2 pb-3 border-t border-gray-100">
      {connected ? (
        /* 학생 차례가 아니면 입력칸을 흐리게 둔다 — 파형이 뛰면 "지금 말해도 된다" 는 거짓말이 된다 */
        <div className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 transition-colors ${
          micActive === false ? 'bg-[#FAFAFA] border-[#EEF0F4] opacity-60' : 'bg-[#F8FAFF] border-[#DBEAFE]'
        }`}>
          <MicWave active={micActive ?? connected} speaking={isSpeaking} getFreq={getFreq} />
        </div>
      ) : (
        <button onClick={connecting ? undefined : onStartAgent} disabled={connecting}
          className="w-full rounded-2xl border border-dashed border-[#CBD5E1] bg-[#FAFAFA] px-3 py-2.5 text-[12px] font-semibold text-[#94A3B8] disabled:opacity-70">
          {connecting ? '강사와 연결 중…' : '연결이 끊겼어요 — 눌러서 다시 연결'}
        </button>
      )}
      <p className={`mt-1.5 text-center text-[11px] font-bold ${micActive === false ? 'text-[#9CA3AF]' : 'text-[#2563EB]'}`}>
        {!connected ? ''
          : isSpeaking ? '강사가 말하는 중…'
            : micActive === false ? '잠시 기다려 주세요'
              : '듣고 있어요 — 그냥 말하면 돼요'}
      </p>
    </div>
  )
}

/** 텍스트 모드 입력창 */
function TextComposer({ connected, connecting, inputText, setInputText, onSend, onStartAgent }: {
  connected: boolean; connecting: boolean
  inputText: string; setInputText: (s: string) => void
  onSend: () => void; onStartAgent: () => void
}) {
  return (
    <div className="shrink-0 px-3 md:px-4 pt-2 pb-3 border-t border-gray-100">
      <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-2xl px-3.5 py-2">
        <input className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
          placeholder={connected ? '메시지를 입력하세요' : connecting ? '연결 중…' : '대화를 시작하면 입력할 수 있어요'}
          value={inputText} disabled={!connected} maxLength={300}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend() }} />
        <button onClick={connected ? onSend : onStartAgent} disabled={connected ? !inputText.trim() : connecting}
          aria-label={connected ? '전송' : '대화 시작'}
          className="w-9 h-9 bg-[#2563EB] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ── 강사 아바타 — 원형 사진 + 강사 음량에 반응하는 파동 링 ──
   **음성·텍스트 모드가 똑같이 쓴다.** 강사가 말하는 동안(speaking) 출력 음량(getFreq)에 따라 링이
   커졌다 작아진다. 음량 데이터가 없으면(브라우저 TTS 폴백) 잔잔한 기본 맥동으로 뛴다. */
/* ── 아바타 안의 영상 ──
   클립을 갈아끼우는 방식(src 교체)은 쓰지 않는다 — 바꿀 때마다 디코딩이 처음부터 다시 돌아서
   원이 까맣게 한 번 깜빡이고, 단계가 넘어갈 때마다 그 깜빡임이 보인다.
   그래서 **클립 셋을 다 겹쳐 깔아두고 opacity 로만 넘긴다.** 안 보이는 클립도 계속 돌지만
   무음 3~5초짜리 작은 파일이라 이게 싸다. 얼굴이 이어져 보이는 값이 화면에서는 더 크다. */
function ClipStack({ clips, active, name }: { clips: string[]; active: string; name: string }) {
  return (
    <>
      {clips.map((src) => (
        <video key={src} src={src} autoPlay muted loop playsInline preload="auto"
          aria-label={src === active ? name : undefined}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ objectPosition: '50% 16%', opacity: src === active ? 1 : 0 }} />
      ))}
    </>
  )
}

export function PulseAvatar({ src, clipSrc, allClips, name, speaking, getFreq, size = 120 }: {
  src: string; name: string; speaking: boolean; getFreq?: () => Uint8Array | undefined; size?: number
  /** 지금 상황에 맞는 영상 클립. 없으면 사진(src)을 그대로 쓴다 */
  clipSrc?: string | null
  /** 이 강사가 가진 클립 전부 — 겹쳐 깔아두고 크로스페이드하기 위해 */
  allClips?: string[]
}) {
  const [level, setLevel] = useState(0)
  useEffect(() => {
    if (!speaking) { setLevel(0); return }
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 50) return          // ~20fps
      last = t
      let v = 0.35 + Math.random() * 0.15 // 음량 데이터 없을 때 기본 맥동
      try {
        const d = getFreq?.()
        if (d && d.length) {
          let sum = 0
          for (let i = 0; i < d.length; i++) sum += d[i]
          v = Math.min(1, (sum / d.length) / 90)
        }
      } catch { /* 출력 스펙트럼을 못 읽으면 기본 맥동 유지 */ }
      setLevel(v)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [speaking, getFreq])

  /* 파동 링은 **얇게, 조금만** 퍼진다 — 크게 튀면 강사 얼굴보다 파형이 먼저 보인다.
     최대 배율 ~1.33배(컨테이너 1.4배 안에서 안 잘린다). */
  return (
    <div className="relative flex items-center justify-center" style={{ width: size * 1.4, height: size * 1.4 }}>
      {speaking && [0, 1, 2].map((i) => (
        <span key={i} className="absolute rounded-full border border-[#2563EB]"
          style={{
            width: size, height: size,
            transform: `scale(${1 + level * (0.14 + i * 0.07)})`,
            opacity: Math.max(0, 0.4 - level * 0.12 - i * 0.11),
            transition: 'transform 90ms linear, opacity 120ms linear',
          }} />
      ))}
      <div className="relative rounded-full overflow-hidden border-[3px] border-white bg-gradient-to-b from-[#EAF1FF] to-white"
        style={{ width: size, height: size, boxShadow: speaking ? `0 0 ${12 + level * 20}px rgba(37,99,235,${0.16 + level * 0.24})` : '0 4px 16px rgba(0,0,0,0.12)' }}>
        {clipSrc ? (
          <ClipStack clips={allClips?.length ? allClips : [clipSrc]} active={clipSrc} name={name} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt={name} className="w-full h-full object-cover" style={{ objectPosition: '50% 16%' }} />
        )}
      </div>
    </div>
  )
}

/* 채팅 말풍선 — 강사=회색(왼쪽) / 나=파랑(오른쪽).
   질문(aside)은 노란 결로 묶는다: 수업 대본과 학생이 따로 물어본 것은 성격이 다른 대화라,
   같은 색으로 쌓이면 나중에 다시 읽을 때 어디까지가 수업이었는지 구분이 안 된다. */
/** 강사가 말을 준비하는 동안 도는 점 세 개.
 *  **글자가 비어 있는 것 자체가 신호다** — 화면은 소리가 나가기 전까지 한 글자도 내보내지
 *  않으므로(TypeLessonPlayer 의 armReveal), 강사 자리가 비었다면 그건 곧 준비 중이라는 뜻이다.
 *  그래서 "지금 기다리는 중인가" 를 따로 넘겨받지 않는다 — 두 곳이 어긋날 여지를 없앤다. */
export function SpeechDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1 align-middle" aria-label="강사가 말을 준비하는 중">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-speech-dot"
          style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  )
}

/* ── 강사 말에서 **핵심**을 굵게 ──
   발화가 평균 99자라 통으로 흘러가면 무엇이 중요한지 눈에 안 들어온다(실측 지적).
   두 가지를 굵게 잡는다:
     · '…'   — 시트가 이미 뜻풀이·핵심 표현에 쓰고 있다(대본 따옴표 168개). 따옴표는 남긴다.
     · **…** — 콘텐츠팀이 따로 찍고 싶을 때. 별표는 화면에서 감추고, 읽을 때도 뗀다(api/tts).

   ⚠️ **굵힐지 말지는 언어가 아니라 '누가 한 말인가' 로 가른다.**
      대본이 따옴표 친 것은 콘텐츠팀이 중요하다고 친 것이라 영어든 한글이든 굵다
      ('물로 헹구다' · 'be + p.p.'). 반대로 **앱이 학생 오답을 인용한 줄**은 굵히지 않는다 —
      "'over'은 아니에요. 다시 한번 표시해 볼까요?" 에서 over 는 중요한 게 아니라 틀린 것이다.
      그건 부르는 쪽이 `plain` 으로 알려준다(TutorText·ChatMsg·TutorDock 의 같은 이름).

   ⚠️ 영어 축약형을 강조로 오해하면 안 된다("He's reviewing" → 여기서 굵어지기 시작한다).
      **여는 쪽**은 앞이 글자가 아닐 때만, **닫는 쪽**은 뒤가 글자가 아닐 때만 따옴표로 본다.
      닫는 쪽을 안 보면 아포스트로피가 닫기로 잡혀 문장이 엉뚱한 데서 끊긴 채 굵어졌다
      (【'The layout of Pierce University'】s new residence hall — 대본에 6군데).
   ⚠️ 글자는 소리에 맞춰 하나씩 드러나므로 **잘린 문자열이 들어온다.** 여는 표시만 오고 닫는
      표시가 아직 안 온 토막도 굵게 보여야 강조가 뒤늦게 튀어 들어오지 않는다. */
type Seg = { t: string; b: boolean }

function parseEmphasis(src: string): Seg[] {
  const segs: Seg[] = []
  const push = (t: string, b: boolean) => { if (t) segs.push({ t, b }) }
  const isWord = (c: string | undefined) => !!c && /[A-Za-z0-9]/.test(c)
  /** 닫는 따옴표 자리 — 뒤가 글자면 아포스트로피다(University's). 지나쳐서 다음 것을 본다. */
  const closeAt = (from: number) => {
    let j = src.indexOf("'", from)
    while (j !== -1 && isWord(src[j + 1])) j = src.indexOf("'", j + 1)
    return j
  }
  let buf = ''
  let i = 0
  while (i < src.length) {
    if (src.startsWith('**', i)) {
      push(buf, false); buf = ''
      const end = src.indexOf('**', i + 2)
      if (end === -1) { push(src.slice(i + 2), true); return segs }
      push(src.slice(i + 2, end), true)
      i = end + 2
      continue
    }
    if (src[i] === "'" && !isWord(src[i - 1])) {
      const end = closeAt(i + 1)
      push(buf, false); buf = ''
      if (end === -1) { push(src.slice(i), true); return segs }
      push(src.slice(i, end + 1), true)      // 따옴표째 굵게 — 길이가 그대로라 글자 흐름이 안 어긋난다
      i = end + 1
      continue
    }
    buf += src[i]
    i += 1
  }
  push(buf, false)
  return segs
}

/** 강사 말 한 줄 — 핵심만 굵게. 학생 말·일반 글자에는 쓰지 않는다.
 *  @param plain 앱이 만든 줄(판정·힌트)인가. 대본이 아니라 앱이 학생 답을 인용한 자리라
 *    따옴표를 강조로 읽으면 **틀린 것이 굵어진다** — 그럴 때는 글자를 그대로 둔다. */
export function TutorText({ text, plain }: { text: string; plain?: boolean }) {
  if (plain) return <>{text}</>
  return (
    <>
      {parseEmphasis(text).map((s, i) => (
        s.b ? <strong key={i} className="font-bold text-[#111827]">{s.t}</strong> : <span key={i}>{s.t}</span>
      ))}
    </>
  )
}

function Bubble({ role, text, aside, plain }: ChatMsg) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
        aside
          ? mine
            ? 'bg-[#FDE68A] text-[#78350F] rounded-2xl rounded-br-sm'
            : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] rounded-2xl rounded-bl-sm'
          : mine
            ? 'bg-[#2563EB] text-white rounded-2xl rounded-br-sm'
            : 'bg-[#F1F5F9] text-[#334155] rounded-2xl rounded-bl-sm'
      }`}>{text ? (mine ? text : <TutorText text={text} plain={plain} />) : (mine ? null : <SpeechDots />)}</div>
    </div>
  )
}

export interface TutorDockProps {
  mode: DockMode
  setMode: (m: DockMode) => void
  /** 우측 패널로 펼 수 있는 폭인가. 좁은 화면에서는 최소화만 가능하다(펴면 둘 다 못 읽는다) */
  canSidebar?: boolean
  name: string
  imgSrc: string
  /** 단계별 강사 포즈 컷아웃(배경 투명). 아바타 원 안에 쓰인다. 없으면 imgSrc. */
  poseSrc?: string | null
  /** 단계별 강사 영상 클립. 있으면 사진 대신 이게 원 안에서 돈다 */
  clipSrc?: string | null
  /** 이 강사의 클립 전부 — 미리 깔아두고 크로스페이드하려고 받는다 */
  allClips?: string[]
  /** 학생 입력 모드 — 아바타 아래 영역이 갈린다 (음성=발화 박스 / 텍스트=채팅창) */
  chatMode: 'voice' | 'text'
  setChatMode: (m: 'voice' | 'text') => void
  /** 강사(에이전트) 출력 음량 스펙트럼 — 아바타 파동 링용 */
  getTutorFreq?: () => Uint8Array | undefined
  /** 학생 마이크 입력 스펙트럼 — 음성 모드 파형용 */
  getMicFreq?: () => Uint8Array | undefined
  connected: boolean
  connecting: boolean
  /** 강사가 **지금 소리를 내고 있는가.** 음원을 받는 동안은 false — 그동안 말하는 클립을
   *  돌리면 소리 없이 입만 움직인다. 그 몇 초는 preparing 이 맡는다. */
  isSpeaking: boolean
  /** 말할 것은 정해졌는데 소리가 아직 안 나가는 몇 초. 글자 대신 점 세 개가 도는 구간이다. */
  preparing?: boolean
  /** 지금 강사가 하는 말 (음성 모드 박스 · 최소화 말풍선) */
  lastLine: string
  /** 그 줄이 앱이 만든 것인가(판정·힌트) — 따옴표를 강조로 읽지 않는다 */
  lastLinePlain?: boolean
  /** 지금 학생이 말해도 되는가 — 대본 수업에서 마이크가 열린 동안만 true.
   *  주지 않으면(에이전트 모드) 예전처럼 연결돼 있으면 늘 듣는 것으로 본다. */
  micActive?: boolean
  /** 입력칸 **아래**에 붙는 자리 — 질문 버튼처럼 수업 진행과 층이 다른 것 */
  footer?: ReactNode
  /** 텍스트 모드 채팅 흐름 */
  messages: ChatMsg[]
  /** 선택지·다음 버튼 등 — 발화 박스 아래(음성) / 채팅 흐름 안(텍스트) */
  actions?: ReactNode
  /** 지금 선택지·지시가 어느 단계 것인가(턴 번호). 이 값이 바뀌면 채팅에서 **새 말풍선처럼** 다시 꽂힌다 */
  actionKey?: number | string
  /** 행동 지시 알림(필기해 보세요·탭해 보세요…) — 수업 영역이 아니라 여기 뜬다 */
  hint?: ReactNode
  /** 텍스트 모드 입력 */
  inputText: string
  setInputText: (s: string) => void
  onSend: () => void
  onStartAgent: () => void
  /** 스크롤 컨테이너 ref — 턴 전환 시 자동 스크롤용 */
  bodyRef?: React.Ref<HTMLDivElement>
}

export default function TutorDock({
  mode, setMode, canSidebar = true, name, imgSrc, poseSrc, clipSrc, allClips, micActive, footer,
  chatMode, setChatMode, getTutorFreq, getMicFreq, connected, connecting, isSpeaking, preparing = false,
  lastLine, lastLinePlain, messages, actions, hint, actionKey,
  inputText, setInputText, onSend, onStartAgent, bodyRef,
}: TutorDockProps) {
  const voiceMode = chatMode === 'voice'
  const faceSrc = poseSrc || imgSrc

  /* ── 텍스트 모드에서 선택지·지시 카드가 앉을 자리 ──
     카드는 채팅 한 칸이다. 이번 단계의 지시가 나온 그 시점에 꽂히고, 뒤에 대화가 오면 위로 밀려 올라간다.
     (예전엔 늘 맨 끝에 렌더돼서 새 말이 와도 바닥에 눌러앉아 있었다)
     꽂는 시점 = 단계가 바뀐 뒤 **강사가 그 단계를 말한 직후**. 그전까지는 맨 아래를 따라간다.

     ⚠️ "마지막 말풍선이 강사 것인가" 만 보면 안 된다 — 단계가 넘어오는 순간 마지막 말풍선은
     **직전 단계의 맞장구**("좋아요, 맞았어요.")라 이미 강사 것이다. 그래서 카드가 거기에 걸려
     이번 단계 발화보다 **위에** 앉는다(실측). 단계가 바뀐 시점의 말풍선 수를 기억해 두고,
     그보다 늘어난 강사 말풍선이 나왔을 때만 꽂는다. */
  const [anchor, setAnchor] = useState<number | null>(null)
  const baseRef = useRef(0)
  useEffect(() => {
    baseRef.current = messages.length
    setAnchor(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionKey])
  useEffect(() => {
    if (anchor !== null) return
    if (messages.length <= baseRef.current) return              // 이번 단계 말이 아직 안 나왔다
    if (messages[messages.length - 1]?.role !== 'ai') return
    setAnchor(messages.length)
  }, [messages, anchor])
  const cardAt = anchor ?? messages.length

  /* ── 음성모드 '지금 하는 말' 상자를 따라 내려가게 (구현 중 메모 57행) ──
     글자가 소리에 맞춰 하나씩 늘어나므로 lastLine 이 바뀔 때마다 바닥으로 붙인다.
     smooth 를 안 쓰는 이유는 아래 대화창과 같다 — 매 글자 부드러운 스크롤을 걸면 서로 밀려 덜컹인다. */
  const liveRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = liveRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastLine])

  /* ── 최소화 — 얼굴을 끌어 원하는 자리에 두는 작은 창 ── */
  if (mode === 'mini') {
    return (
      <MiniDock
        faceSrc={faceSrc} clipSrc={clipSrc} allClips={allClips}
        name={name} connected={connected} connecting={connecting} isSpeaking={isSpeaking} preparing={preparing}
        getTutorFreq={getTutorFreq} lastLine={lastLine} lastLinePlain={lastLinePlain}
        chatMode={chatMode} setChatMode={setChatMode}
        inputText={inputText} setInputText={setInputText} onSend={onSend} onStartAgent={onStartAgent}
        actions={actions} hint={hint}
        onRestore={canSidebar ? () => setMode('sidebar') : undefined} />
    )
  }

  /* ── 우측 패널(기본) — 화면 오른쪽 기둥 ── */
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* 최소화 — 강사 창의 우측 상단. 배치 전환은 이 버튼 하나뿐이다(하단 도크 없음).
          아이콘만 두면 있는 줄도 모른다 — **'접기' 글자를 붙인 알약 버튼**으로 둔다. */}
      <button onClick={() => setMode('mini')} aria-label="강사 창 접기" title="강사 창을 작게 접어 옆으로 치웁니다"
        className="absolute top-2 right-2 z-10 flex items-center gap-1 h-7 pl-2 pr-2.5 rounded-full
                   bg-white/90 border border-[#E2E8F0] shadow-sm text-[11px] font-bold text-[#64748B]
                   hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#2563EB] transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
          <path d="M9 6l6 6-6 6" />
        </svg>
        접기
      </button>

      {/* 아바타 + 모드 토글 — 두 모드 공통. 단계 표시가 빠진 만큼 위로 붙는다 */}
      <div className="shrink-0 flex flex-col items-center pt-1.5 pb-2 bg-gradient-to-b from-[#F5F8FF] to-white">
        <PulseAvatar src={faceSrc} clipSrc={clipSrc} allClips={allClips} name={name} speaking={isSpeaking} getFreq={getTutorFreq} size={118} />
        <div className="-mt-2 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`}
            title={connected ? '연결됨' : '연결 안 됨'} />
          <ChatModeToggle chatMode={chatMode} setChatMode={setChatMode} />
        </div>
      </div>

      {voiceMode ? (
        <>
          {/* 강사가 지금 하는 말 — 실시간으로 이 박스에 뜬다.
              ⚠️ **이 상자는 스스로 따라 내려가야 한다**(구현 중 메모 57행). 아래 bodyRef 의 자동
                 스크롤은 선택지 자리의 것이라 여기까지 오지 않는다. 말이 길어지면 26vh 를 넘겨
                 지금 읽는 대목이 상자 밖으로 밀려났다. */}
          <div className="shrink-0 px-3 md:px-4 pt-1">
            <div ref={liveRef} className="rounded-2xl bg-[#F8FAFC] border border-[#E9EEF6] px-3.5 py-2.5 max-h-[26vh] overflow-y-auto">
              <p className="text-[13.5px] leading-relaxed text-[#334155] font-medium whitespace-pre-wrap">
                {lastLine ? <TutorText text={lastLine} plain={lastLinePlain} /> : <SpeechDots />}
              </p>
            </div>
          </div>
          {/* 선택지 · 행동 지시가 뜨는 자리 (수업 영역이 아니라 여기) */}
          <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 pt-2.5 pb-3 space-y-2.5">
            {hint}
            {actions}
          </div>
          <VoiceListener connected={connected} connecting={connecting} isSpeaking={isSpeaking}
            getFreq={getMicFreq} onStartAgent={onStartAgent} micActive={micActive} />
          {footer && <div className="shrink-0 px-3 md:px-4 pb-3">{footer}</div>}
        </>
      ) : (
        <>
          {/* 채팅창 — 강사 회색 / 나 파랑. 선택지·지시도 이 흐름 안에서 뜬다 */}
          <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 pt-2 pb-3 space-y-2">
            {messages.slice(0, cardAt).map((m, i) => <Bubble key={i} role={m.role} text={m.text} aside={m.aside} plain={m.plain} />)}
            {/* 선택지·행동 지시도 채팅 한 칸 — 강사 말풍선 쪽(왼쪽)에 붙는 카드.
                이번 턴에 할 일이 없으면(둘 다 null) 빈 카드가 남지 않게 empty:hidden 으로 접는다. */}
            <div className="flex justify-start empty:hidden">
              <div className="max-w-[92%] w-full space-y-2 rounded-2xl rounded-bl-sm bg-[#F8FAFF] border border-[#DBEAFE] px-3 py-2.5 empty:hidden">
                {hint}
                {actions}
              </div>
            </div>
            {messages.slice(cardAt).map((m, i) => <Bubble key={cardAt + i} role={m.role} text={m.text} aside={m.aside} plain={m.plain} />)}
          </div>
          <TextComposer connected={connected} connecting={connecting}
            inputText={inputText} setInputText={setInputText} onSend={onSend} onStartAgent={onStartAgent} />
          {footer && <div className="shrink-0 px-3 md:px-4 pb-3">{footer}</div>}
        </>
      )}
    </div>
  )
}

/* ── 최소화 창 ──
   · 얼굴을 끌면 창이 통째로 따라온다(끌지 않고 탭하면 원래 패널로 복원)
   · 말풍선은 **자르지 않는다** — 발화가 길면 박스가 커지고, 아주 길면 그 안에서 스크롤한다
   · 선택지·행동 지시도 이 안에서 작은 UI로 보인다 */
function MiniDock({ faceSrc, clipSrc, allClips, name, connected, connecting, isSpeaking, preparing, getTutorFreq, lastLine, lastLinePlain, chatMode, setChatMode,
  inputText, setInputText, onSend, onStartAgent, actions, hint, onRestore }: {
  faceSrc: string; clipSrc?: string | null; allClips?: string[]
  name: string; connected: boolean; connecting: boolean; isSpeaking: boolean; preparing?: boolean
  getTutorFreq?: () => Uint8Array | undefined
  lastLine: string
  lastLinePlain?: boolean
  chatMode: 'voice' | 'text'; setChatMode: (m: 'voice' | 'text') => void
  inputText: string; setInputText: (s: string) => void; onSend: () => void; onStartAgent: () => void
  actions?: ReactNode; hint?: ReactNode
  /** 없으면 = 펼 수 없는 폭. 탭해도 안 열리고 '강사 창 열기'도 숨긴다 */
  onRestore?: () => void
}) {
  /* 위치 — 기본은 우하단. 한 번 끌면 그 좌표로 고정된다(창 밖으로는 못 나가게 잡아둔다) */
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null)

  const onPointerDown = (e: ReactPointerEvent) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = dragRef.current
    const r = wrapRef.current?.getBoundingClientRect()
    if (!d || !r) return
    const nx = e.clientX - d.dx
    const ny = e.clientY - d.dy
    if (!d.moved && Math.abs(nx - r.left) < 4 && Math.abs(ny - r.top) < 4) return
    d.moved = true
    setPos({
      x: Math.min(Math.max(8, nx), window.innerWidth - r.width - 8),
      y: Math.min(Math.max(8, ny), window.innerHeight - r.height - 8),
    })
  }
  const onPointerUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (d && !d.moved) onRestore?.()    // 끌지 않고 탭 = 원래 패널로 복원 (좁은 화면에서는 못 편다)
  }

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 16, bottom: 20 }

  return (
    <div ref={wrapRef} className="fixed z-40 flex flex-col items-end gap-2 w-[min(320px,80vw)]" style={style}>
      {/* 하얀 네모 — 발화 전체 + 선택지/지시 */}
      {/* 말을 준비하는 중(isSpeaking 인데 글자가 아직 없다)에도 창을 띄워 둔다 —
          조건에서 빼면 음원을 기다리는 몇 초 동안 창이 사라졌다가 다시 나타난다 */}
      {(lastLine || isSpeaking || preparing || hint || actions) && (
        <div className="w-full rounded-2xl bg-white border border-gray-200 overflow-hidden"
          style={{ boxShadow: '0 6px 24px rgba(37,99,235,0.16), 0 1px 4px rgba(0,0,0,0.08)' }}>
          <div className="max-h-[46vh] overflow-y-auto px-3.5 py-2.5 space-y-2">
            {lastLine ? (
              <p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap"><TutorText text={lastLine} plain={lastLinePlain} /></p>
            ) : (isSpeaking || preparing) ? <SpeechDots /> : null}
            {/* 선택지·행동 지시 — 작은 창 안에서는 글자를 한 단계 줄여 보여준다 */}
            <div className="pt-2 border-t border-dashed border-[#E5E7EB] space-y-2 empty:hidden empty:border-0 empty:pt-0
                            [&_button]:text-[12px] [&_p]:text-[12px]">
              {hint}
              {actions}
            </div>
          </div>
          {/* 텍스트 모드는 마이크가 꺼져 있다 — 작은 창에도 입력줄이 없으면 학생이 답할 길이 없다 */}
          {chatMode === 'text' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-t border-gray-100">
              <input className="flex-1 min-w-0 bg-transparent text-[12.5px] text-gray-800 placeholder-gray-400 outline-none"
                placeholder={connected ? '메시지를 입력하세요' : connecting ? '연결 중…' : '연결이 끊겼어요'}
                value={inputText} disabled={!connected} maxLength={300}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSend() }} />
              <button onClick={connected ? onSend : onStartAgent} disabled={connected ? !inputText.trim() : connecting}
                aria-label={connected ? '전송' : '대화 시작'}
                className="w-7 h-7 bg-[#2563EB] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-gray-100 bg-[#FAFBFF]">
            <ChatModeToggle chatMode={chatMode} setChatMode={setChatMode} compact />
            {onRestore && (
              <button onClick={onRestore} className="text-[10.5px] font-bold text-[#94A3B8] hover:text-[#475569] px-1.5">
                강사 창 열기
              </button>
            )}
          </div>
        </div>
      )}
      {/* 얼굴 — 끌면 창이 따라오고, 탭하면 복원 */}
      <button
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        aria-label={onRestore ? '강사 창 — 끌어서 이동, 탭하면 열기' : '강사 창 — 끌어서 이동'}
        className={`relative shrink-0 touch-none cursor-grab active:cursor-grabbing rounded-full transition-all ${
          isSpeaking ? 'shadow-[0_0_18px_rgba(37,99,235,0.55)]' : 'shadow-lg'
        }`}>
        <span className="pointer-events-none block">
          <PulseAvatar src={faceSrc} clipSrc={clipSrc} allClips={allClips} name={name} speaking={isSpeaking} getFreq={getTutorFreq} size={56} />
        </span>
        <span className={`absolute bottom-2 right-2 w-3 h-3 rounded-full border-2 border-white ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
      </button>
    </div>
  )
}
