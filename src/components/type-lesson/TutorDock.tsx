'use client'

/* ── 강사 도크 — 강사 창 하나의 배치 ──
 *
 *   우측 패널  ⇄  최소화(작은 창, 끌어서 이동)
 *
 * 강사 사진·말·선택지·행동 지시·입력이 전부 이 창 안에 산다. 배치는 두 가지뿐이다:
 *   · 우측 패널 = 세로 스택 (아바타 → 모드 토글 → 강사 말/채팅 → 선택지·지시 → 입력)
 *   · 최소화   = 얼굴 + 말풍선(내용 전부) + 선택지/지시. 얼굴을 끌어 원하는 자리에 둔다.
 *
 * ── 09-17 개편: **스위치 하나가 하나만 바꾼다** (docs/redesign/tutor-mode/DECISION.md) ──
 * 예전에는 음성/텍스트 토글 하나가 ①입력 ②강사 말 표시 ③선택지 위치를 한꺼번에 바꿨다.
 * 이름은 입력만 말하는데 눈에 크게 바뀌는 건 강사 말이라 학생이 무엇을 고르는지 몰랐고,
 * 앞 대화를 **읽으려고** 텍스트 모드로 넘어가는 사람이 나왔다(FGI 14번). 축을 셋으로 쪼갰다:
 *   ① 답하는 방식 — 말로 / 키보드. **하단 입력 줄에 있다**(바꾸는 것 옆에 둔다).
 *                    잠그지 않고 권하기만 한다 — 어느 쪽이든 말해도 되고 눌러도 된다
 *   ② 자막(CC)    — 얼굴 아래 작은 스위치 하나. 켜면 주고받은 말이 쭉 흐르고(ChatFlow),
 *                    끄면 같은 자리에 파형(TutorWave). 대화 내역을 따로 여는 버튼은 없다
 *                    — **자막이 곧 대화 내역이다**(09-18)
 * 그래서 **아바타·강사 말·선택지/지시는 두 모드가 완전히 같다.** 갈리는 것은 맨 아래 한 줄뿐이다.
 * (좁은 화면의 BottomDock 이 원래 이 꼴이었다 — 우측 패널을 거기에 맞춘 것이다)
 */

import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { stripAudioTags } from '@/lib/ttsText'

/** 강사 창 배치
 *   sidebar — 화면 오른쪽 기둥(기본, 가로로 넘은 태블릿)
 *   bottom  — 화면 아래에 깔때로 깔린 간소판. **세로 화면·핸드폰**은 이쪽이다 —
 *             옆에 세울 폭도 안 되고, 띄우는 작은 창은 지문을 덮는다
 *   mini    — 끌어 옮기는 작은 창. 넓은 화면에서 학생이 직접 접었을 때만 */
export type DockMode = 'sidebar' | 'mini' | 'bottom'
export interface ChatMsg {
  role: 'ai' | 'user'
  text: string
  /** 대본 밖 질문·답변인가 — 수업 흐름과 섞이지 않게 노란 결로 묶어 보여준다 */
  aside?: boolean
  /** 앱이 만든 줄인가(판정·힌트). 따옴표를 강조로 읽지 않는다 — TutorText 의 plain 참고 */
  plain?: boolean
}

/* ── 답하는 방식 전환 — **갈 곳 하나만 말한다**(09-18) ──
   예전에는 [말로|입력] 두 칸이 다 보이는 세그먼트 스위치였다. 두 칸이 보이면 "지금 어느
   칸인가" 를 먼저 읽어야 하고, 그 읽기가 한 번도 쉬웠던 적이 없다(FGI 에서 모드를 착각한
   장면이 반복됐다). **지금 상태는 하단 UI 가 통째로 말한다** — 큰 마이크가 떠 있으면 음성,
   입력칸이 떠 있으면 키보드다. 그러니 버튼은 **갈 곳**만 말하면 된다(말해보카와 같은 꼴).
   ⚠️ aria-label 은 '지금 음성 …' / '지금 텍스트 …' 를 유지한다 — 캡처 도구가 이걸로 상태를
      읽는다(scripts/shots.mjs). 화면 글자와 다른 건 의도다. */
export function ChatModeToggle({ chatMode, setChatMode, compact }: {
  chatMode: 'text' | 'voice'; setChatMode: (m: 'text' | 'voice') => void; compact?: boolean
}) {
  const voice = chatMode === 'voice'
  return (
    <button
      onClick={() => setChatMode(voice ? 'text' : 'voice')}
      role="switch" aria-checked={!voice}
      aria-label={voice ? '지금 음성 모드 · 눌러서 텍스트 모드로' : '지금 텍스트 모드 · 눌러서 음성 모드로'}
      /* 흰 알약에 회색 글씨라 배경에 묻혔다 — 옅은 파랑으로 채워 **눌러서 바꾸는 것**임을 보인다 */
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#CFE0FB] bg-[#EEF4FF] font-bold
                  text-[#2563EB] hover:bg-[#E2EDFF] hover:border-[#A9CBF7] active:scale-[0.98] transition-all ${
        compact ? 'px-2.5 py-1 text-[10px]' : 'px-4 py-2 text-[12.5px]'}`}>
      {voice ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
          <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      )}
      {voice ? '키보드 모드' : '음성 모드'}
    </button>
  )
}

/* ── 강사 얼굴 아래 — **CC 하나뿐** ──
   여기 있을 것은 "지금 하는 말을 글로 볼까" 하나다. 대화 내역까지 끌어오면 성격이 다른 둘이
   한 줄에 앉아, 대화 내역을 여는 순간 CC 가 켜진 것도 꺼진 것도 아닌 상태가 된다(09-18 실측).
   대화 내역은 **창 맨 위 줄**(토익 TIP·핵심 어휘 옆)로 갔다 — 거기가 모아 보는 것들의 자리다. */
function CCToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    /* 얼굴 칸에 **살짝 올라타게** 둔다(-mt) — 얼굴과 말 칸 사이에 낀 작은 손잡이로 보여야지,
       한 줄을 따로 차지하면 그만큼 아래 말 칸이 좁아진다. */
    <div className="shrink-0 flex justify-center px-3 md:px-4 -mt-4 pb-0.5">
      <button onClick={onToggle} role="switch" aria-checked={on}
        aria-label={on ? '자막 끄기' : '자막 켜기'} title={on ? '자막 끄기' : '자막 켜기'}
        className={`inline-flex items-center justify-center h-[22px] w-9 rounded-md border text-[10px] font-black
                    leading-none tracking-tight transition-colors active:scale-[0.97] ${
          on ? 'border-[#2563EB] bg-[#2563EB] text-white'
            : 'border-[#DDE3EC] bg-white text-[#A3AEBE] hover:border-[#93C5FD] hover:text-[#2563EB]'}`}>
        CC
      </button>
    </div>
  )
}

/* ── 자막을 끄면 **파형이 대신 선다** ──
   끄는 순간 칸이 통째로 사라지면 화면이 덜컥 움직이고, 강사가 말하는 중인지도 알 수 없다.
   같은 자리·같은 높이에 파형을 둔다 — 글자는 없지만 **말이 흐르고 있다는 것**은 남는다.
   ⚠️ 프레임마다 그리지 않는다(~20fps). 태블릿에서 이 창은 영상·오디오와 자리를 다툰다. */
function TutorWave({ speaking, getFreq }: { speaking: boolean; getFreq?: () => Uint8Array | undefined }) {
  const N = 28
  const [bars, setBars] = useState<number[]>(() => Array(N).fill(0.06))
  useEffect(() => {
    if (!speaking) { setBars(Array(N).fill(0.06)); return }
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 50) return
      last = t
      try {
        const d = getFreq?.()
        if (d && d.length) {
          const step = Math.max(1, Math.floor(d.length / N))
          setBars(Array.from({ length: N }, (_, i) => Math.min(1, (d[i * step] ?? 0) / 170)))
          return
        }
      } catch { /* 음량을 못 읽는 기기 — 아래 기본 맥동으로 */ }
      /* ── 여기 오면 **소리를 못 읽은 것이다** ──
         (브라우저 TTS 폴백처럼 분석기를 못 문 자리). 죽은 화면으로 두지는 않되, 진짜 파형과
         헷갈리지 않게 **잔잔하게만** 흔든다 — 소리와 무관한 움직임이 크면 그게 더 거짓말이다. */
      const phase = Date.now() / 220
      setBars(Array.from({ length: N }, (_, i) => 0.10 + 0.14 * Math.abs(Math.sin(phase + i * 0.55))))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [speaking, getFreq])

  return (
    /* 테두리 없이 — 자막 칸과 같은 규칙이다(읽거나 보는 자리는 카드처럼 보이지 않게).
       위에 여백을 둬서 **얼굴에서 한 뼘 떨어뜨린다** — 붙어 있으면 얼굴의 일부처럼 보인다. */
    <div className="mt-3">
      <div className="h-[52px] flex items-center justify-center gap-[3px] px-4">
        {bars.map((v, i) => (
          <span key={i} className={`w-[3px] rounded-full transition-[height] duration-75 ${speaking ? 'bg-[#93B4F7]' : 'bg-[#DCE3EC]'}`}
            style={{ height: `${Math.max(3, v * 28)}px` }} />
        ))}
      </div>
      {/* 자막을 끄면 글자가 하나도 없어서, 파형이 잔잔할 때 **멈춘 화면과 구분이 안 된다.**
          말하는 동안만 한 줄 적는다 — 안 할 때도 띄우면 그 줄이 거짓말이 된다.
          자리는 늘 잡아 둔다(h-4): 떴다 사라질 때마다 아래 선택지가 들썩이지 않게. */}
      <p className="h-4 text-center text-[10.5px] font-bold text-[#A3AEBE] leading-4">
        {speaking ? '선생님이 지금 말하고 있어요' : ''}
      </p>
    </div>
  )
}

/* ── "눌러도 돼요" — 보기가 뜰 때 **잠깐** 뜨는 손가락 ──
   음성 모드에서 큰 마이크가 아래에 떠 있으니, 보기가 나와도 **말로만 답해야 하는 줄 안다**
   (사용자 지적 09-18). 둘 다 되는데 한쪽만 보이는 것이다. 그렇다고 "눌러도 되고 말해도 돼요"
   를 상시로 걸면 글자가 하나 더 늘어 보기를 가린다 — **보기가 처음 뜰 때 2.4초만** 보여주고
   사라진다. 손가락이 한 번 톡 누르는 시늉을 하므로 글을 안 읽어도 뜻이 전해진다.
   ⚠️ 사라질 때 **자리째 사라진다**(unmount) — 투명해지기만 하면 그 자리가 계속 비어 있다. */
export function TapHint() {
  const [state, setState] = useState<'in' | 'out' | 'gone'>('in')
  useEffect(() => {
    const a = setTimeout(() => setState('out'), 2800)
    const b = setTimeout(() => setState('gone'), 3200)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  if (state === 'gone') return null
  return (
    <div className="flex justify-center pointer-events-none transition-opacity duration-300"
      style={{ opacity: state === 'out' ? 0 : 1 }}>
      {/* ⚠️ 색은 **불투명하게** 쓴다. `bg-[#1F2A44]/92` 처럼 기본 눈금에 없는 투명도(92)를 붙이면
          테일윈드가 그 클래스를 아예 안 만든다 — 바탕이 사라지고 흰 글씨만 남아 **빈 흰 상자**로
          보였다(09-18 실측). 굳이 반투명이 필요하면 `/90` 처럼 눈금 위의 값이거나 `/[0.92]` 다. */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1F2A44] px-3 py-1.5
                       text-[11.5px] font-bold text-white shadow-md animate-fade-in">
        <span className="relative inline-flex items-center justify-center w-4 h-4">
          {/* 톡 — 손가락 끝에서 물결이 퍼진다 */}
          <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative w-4 h-4">
            <path d="M9 11V6a2 2 0 0 1 4 0v5" />
            <path d="M13 9a2 2 0 0 1 4 0v3" />
            <path d="M17 11a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-1a2 2 0 0 1 4 0" />
          </svg>
        </span>
        눌러도 되고, 말해도 돼요
      </span>
    </div>
  )
}

/* ── 자막 = **주고받은 말이 쭉 흐르는 칸**(09-18) ──
   자막 한 줄과 대화 내역을 따로 두지 않는다. 학생이 보고 싶은 것은 결국 "무슨 말이 오갔나"
   하나이고, 지금 하는 말은 그 흐름의 **맨 아래 한 줄**이다(소리에 맞춰 글자가 늘어나는 것도
   거기서 그대로 보인다 — 부르는 쪽의 revealLast).
   · 아래 선택지·알림은 **덮지 않는다** — 읽는 동안에도 문제를 풀 수 있어야 한다.
   · 새 말이 오면 바닥으로 붙는다. CC 를 끄면 이 칸이 파형으로 바뀐다. */
export function ChatFlow({ messages }: { messages: ChatMsg[] }) {
  const boxRef = useRef<HTMLDivElement>(null)
  /* 마지막 말은 소리에 맞춰 길어진다 — 길이가 바뀔 때마다 바닥에 붙인다(구현 중 메모 57행) */
  const lastLen = messages[messages.length - 1]?.text.length ?? 0
  useEffect(() => { const el = boxRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages.length, lastLen])
  return (
    <div ref={boxRef} className="h-full w-full overflow-y-auto pr-0.5 space-y-2">
      {messages.length === 0
        ? <p className="text-[12px] font-semibold text-[#94A3B8] text-center py-3">아직 오간 말이 없어요.</p>
        : messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} aside={m.aside} plain={m.plain} />)}
    </div>
  )
}

/** ── 음성 모드 하단 — **큰 동그라미 마이크가 주인공이다**(09-18 개편) ──
 *  예전에는 파형 상자 하나와 글자 두 줄이었다. 태블릿을 세워 두고 보면 "지금 내가 말할 차례인가"
 *  가 글자로만 있어서, 말해도 되는 자리인지 매번 읽어야 했다. 큰 원 하나면 **색과 크기로** 말한다.
 *  · 학생 차례  → 파랗게 살아 있고, 둘레가 목소리에 맞춰 뛴다
 *  · 강사 말하는 중 → 회색으로 잠긴다(눌러도 되는 것처럼 보이지 않는다)
 *  · 서버 전사 기기(iOS) → **그 원을 누르면 '다 말했어요'** 다. 버튼을 따로 두지 않는다. */
function VoiceListener({ connected, connecting, isSpeaking, getFreq, onStartAgent, micActive, onEndUtterance, sttSending, sttNotice, toggle }: {
  connected: boolean; connecting: boolean; isSpeaking: boolean
  /** 학생 차례인가 — undefined 면 예전처럼 '연결됐으면 듣는 중' */
  micActive?: boolean
  getFreq?: () => Uint8Array | undefined
  onStartAgent: () => void
  /** 말을 여기서 끊고 보낸다 — **서버 전사(iOS)** 일 때만 온다. 없으면 원은 표시만 한다 */
  onEndUtterance?: () => void
  /** 말한 것을 서버로 옮기는 중 */
  sttSending?: boolean
  /** 보냈는데 받은 말이 없을 때 잠깐 뜨는 한 줄 — 있으면 '듣고 있어요' 자리를 대신한다 */
  sttNotice?: string | null
  /** 답하는 방식 전환 — **마이크 아래**에 산다(말해보카와 같은 자리) */
  toggle?: ReactNode
}) {
  const live = connected && micActive !== false && !isSpeaking
  return (
    <div className="shrink-0 px-3 md:px-4 pt-2 pb-3 border-t border-gray-100">
      {/* ── 전환 버튼은 **답하는 자리 맨 위**다 (09-18) ──
          맨 아래에 뒀더니 잘 안 보였다(사용자 지적). 창 바닥은 브라우저 주소창·홈 인디케이터와
          겹치는 자리고, 키보드 모드에서는 자판이 올라오면 그대로 가려진다.
          입력 줄 **위**로 올리면 두 경우 다 살아남는다(말해보카도 자판 위에 둔다). */}
      {toggle && <div className="flex items-center justify-center pb-2">{toggle}</div>}
      {connected ? (
        <div className="flex flex-col items-center gap-1.5">
          <MicOrb live={live} sending={!!sttSending} getFreq={getFreq}
            onClick={live && onEndUtterance ? onEndUtterance : undefined} />
          {/* ⚠️ **누르라고 하지 않는다**(09-18). 말이 멎으면 알아서 넘어가는데도 "다 말하면
              마이크를 누르세요" 라고 해서, 누르지 않아도 넘어가는 것을 고장으로 읽게 만들었다.
              마이크 누르기는 **안 넘어갈 때의 뒷길**이다 — 그 말만 작게 덧붙인다. */}
          <p className={`text-center text-[12px] font-bold ${
            !live ? 'text-[#9CA3AF]' : sttNotice && !sttSending ? 'text-[#DC2626]' : 'text-[#2563EB]'}`}>
            {isSpeaking ? '강사가 말하는 중…'
              : micActive === false ? '잠시 기다려 주세요'
                : sttSending ? '말한 내용을 옮기는 중…'
                  : sttNotice || '듣고 있어요 — 그냥 말하면 돼요'}
          </p>
          {live && onEndUtterance && (
            <p className="text-center text-[10.5px] font-semibold text-[#B6BECB] -mt-1">안 넘어가면 마이크를 눌러요</p>
          )}
        </div>
      ) : (
        <button onClick={connecting ? undefined : onStartAgent} disabled={connecting}
          className="w-full rounded-2xl border border-dashed border-[#CBD5E1] bg-[#FAFAFA] px-3 py-2.5 text-[12px] font-semibold text-[#94A3B8] disabled:opacity-70">
          {connecting ? '강사와 연결 중…' : '연결이 끊겼어요 — 눌러서 다시 연결'}
        </button>
      )}
    </div>
  )
}

/** 큰 동그라미 마이크 — 둘레가 목소리에 맞춰 뛴다.
 *  파동은 강사 아바타(PulseAvatar)와 같은 방식이다: 프레임마다 그리지 않고 ~20fps 로만 갱신한다. */
function MicOrb({ live, sending, getFreq, onClick }: {
  live: boolean; sending: boolean
  getFreq?: () => Uint8Array | undefined
  /** 누르면 지금 말을 끊어 보낸다 — 서버 전사 기기에서만 온다 */
  onClick?: () => void
}) {
  const [level, setLevel] = useState(0)
  useEffect(() => {
    if (!live) { setLevel(0); return }
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 50) return          // ~20fps
      last = t
      let v = 0
      try {
        const d = getFreq?.()
        if (d && d.length) {
          let sum = 0
          for (let i = 0; i < d.length; i++) sum += d[i]
          v = Math.min(1, (sum / d.length) / 70)
        }
      } catch { /* 계측을 못 읽는 기기 — 잠잠한 원으로 둔다 */ }
      setLevel(v)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live, getFreq])

  /* ── **버튼이 아니라 살아 있는 동그라미** (09-18) ──
     예전 꼴(파란 원 + 마이크 아이콘 + 그림자)은 누르라고 만든 것처럼 보였다. 실제로는
     누를 필요가 없는데도 학생이 누르고 싶어진다(사용자 지적). 눌러야 하는 것처럼 보이면
     안 눌렀을 때 "내가 뭘 안 한 건가" 가 된다.
     그래서 **말하면 반응하는 덩어리**로 바꾼다: 아이콘도 테두리도 그림자도 없이, 숨 쉬듯
     천천히 커졌다 작아지고, 학생이 말하면 그 소리 크기만큼 부풀고 옅은 무리가 퍼진다.
     ⚠️ 서버 전사 기기(iOS)에서는 여기를 눌러 말을 끊어 보낼 수 있어야 한다 — 그때만 button
        으로 그리고, 생김새는 **그대로 둔다**(뒷길이지 시키는 일이 아니다). */
  const size = 84
  /** 소리 크기 → 크기. 숨 쉬는 폭(±4%)에 말소리를 얹는다 */
  const scale = live ? 1 + level * 0.26 : 1
  const Shape = onClick ? 'button' : 'div'
  return (
    <div className="relative flex items-center justify-center" style={{ width: size * 1.35, height: size * 1.35 }}>
      {/* 옅은 무리 — 동그라미에 **바짝 붙여** 얇게 두른다. 넓게 퍼뜨렸더니 파란 안개가
          창의 반을 덮어 동그라미보다 무리가 먼저 보였다(사용자 지적 09-18).
          말할 때만 조금 번지고, 조용하면 거의 사라진다. */}
      {live && (
        <span className="absolute rounded-full bg-[#60A5FA]"
          style={{
            width: size, height: size, filter: 'blur(8px)',
            transform: `scale(${scale + 0.04 + level * 0.1})`,
            opacity: Math.max(0, 0.16 * (0.25 + level)),
            transition: 'transform 110ms ease-out, opacity 140ms ease-out',
          }} />
      )}
      <Shape
        {...(onClick ? { onClick, type: 'button' as const } : {})}
        aria-label={onClick ? '지금 말을 보내기' : live ? '듣고 있어요' : '지금은 말할 차례가 아니에요'}
        title={onClick ? '말이 안 넘어갈 때 눌러서 바로 보냅니다' : undefined}
        className={`relative rounded-full ${live ? 'animate-breathe' : ''}`}
        style={{
          width: size, height: size,
          transform: `scale(${scale})`,
          transition: 'transform 100ms ease-out, background 200ms linear',
          background: sending
            ? 'radial-gradient(circle at 35% 30%, #DBEAFE 0%, #93C5FD 60%, #93C5FD 100%)'
            : live
              ? 'radial-gradient(circle at 35% 30%, #93C5FD 0%, #3B82F6 55%, #2563EB 100%)'
              : 'radial-gradient(circle at 35% 30%, #F1F5F9 0%, #E2E8F0 60%, #DDE3EC 100%)',
        }} />
    </div>
  )
}

/** ── 입력 모드의 답하는 자리 ──
 *  09-17 개편: 토글이 이 줄에 같이 살고, **마이크가 하나 붙는다.**
 *  예전에는 입력 모드면 마이크를 아예 꺼 버려서(`micMuted`), 말로 답한 학생에게는
 *  "말해도 아무 일이 없는 화면" 이 됐다 — 한 참가자가 4강 내내 그걸 반복했다.
 *  이제 모드는 **권하는 것이지 잠그는 것이 아니다.** 다만 여기서는 **누를 때만** 듣는다 —
 *  계속 열어 두면 혼잣말·주변 소리가 답으로 들어간다(핵심요약에서 실제로 났던 사고). */
function TextComposer({ connected, connecting, inputText, setInputText, onSend, onStartAgent, toggle, focusInput }: {
  connected: boolean; connecting: boolean
  inputText: string; setInputText: (s: string) => void
  onSend: () => void; onStartAgent: () => void
  toggle?: ReactNode
  /** 지금이 **글로 답하는 자리**인가 — 켜지면 입력칸에 커서를 준다(키보드가 올라온다).
   *  ⚠️ 기기가 허락할 때만 올라온다: iOS 사파리는 사용자가 건드리지 않은 focus 로는 키보드를
   *     열지 않는다. 그래서 이건 **거드는 것**이지 보장이 아니다 — 못 열려도 입력칸은 이미
   *     커서를 물고 있으니 학생이 한 번 탭하면 바로 쓴다. */
  focusInput?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!focusInput || !connected) return
    /* 화면이 바뀐 **뒤에** 줘야 한다 — 같은 프레임에 주면 턴 전환 렌더에 씻겨 나간다 */
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [focusInput, connected])
  return (
    <div className="shrink-0 px-3 md:px-4 pt-2 pb-3 border-t border-gray-100">
      {/* 전환 버튼은 입력칸 **위** — 자판이 올라오면 아래는 가려진다(음성 모드와 같은 이유) */}
      {toggle && <div className="flex items-center justify-center pb-2">{toggle}</div>}
      {/* 입력칸 왼쪽 마이크는 뺐다(09-18) — 키보드 모드는 **글로 답하는 자리**다.
          말로 하고 싶으면 아래 [음성 모드] 한 번이면 되고, 버튼이 둘이면 어느 쪽이 지금
          쓰는 것인지 매번 판단해야 한다. */}
      <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-2xl px-3.5 py-2">
        <input ref={inputRef} className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
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
  /* ── 오디오 태그는 **소리로만** 나간다 ──
     대본에 `[whispers]` 같은 v3 연기 지시가 섞여 있다(scripts/tone/lee_doyun_wit.json).
     읽는 문자열에는 그대로 실어 보내지만 말풍선에 뜨면 학생이 대괄호를 읽게 된다. */
  const shown = stripAudioTags(text)
  if (plain) return <>{shown}</>
  return (
    <>
      {parseEmphasis(shown).map((s, i) => (
        s.b ? <strong key={i} className="font-bold">{s.t}</strong> : <span key={i}>{s.t}</span>
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
  /** 한 마디를 여기서 끊고 보낸다 — 서버 전사(iOS)일 때만 온다. 없으면 버튼이 안 뜬다 */
  onEndUtterance?: () => void
  /** 말한 것을 서버로 옮기는 중 */
  sttSending?: boolean
  /** 보냈는데 받은 말이 없을 때 잠깐 뜨는 한 줄 */
  sttNotice?: string | null
  /** 입력칸 **아래**에 붙는 자리 — 질문 버튼처럼 수업 진행과 층이 다른 것 */
  footer?: ReactNode
  /** 텍스트 모드 채팅 흐름 */
  messages: ChatMsg[]
  /** 선택지·다음 버튼 등 — **두 모드 모두** 강사 말 아래 고정 영역에 뜬다 */
  actions?: ReactNode
  /** 입력 모드에서 **눌러서 말하는 중인가** — 이게 켜지면 부르는 쪽이 마이크를 연다 */
  pushTalk?: boolean
  setPushTalk?: (b: boolean) => void
  /** 행동 지시 알림(필기해 보세요·탭해 보세요…) — 수업 영역이 아니라 여기 뜬다 */
  hint?: ReactNode
  /** 지금이 **글로 답하는 자리**인가(주관식 턴) — 키보드 모드면 입력칸에 커서를 준다 */
  focusInput?: boolean
  /** 텍스트 모드 입력 */
  inputText: string
  setInputText: (s: string) => void
  onSend: () => void
  onStartAgent: () => void
  /** 창 **맨 위**에 얹는 줄 — 토익 TIP·핵심 어휘 버튼이 여기 앉는다.
   *  아바타보다 위다: 수업 내내 자리가 변하지 않아야 학생이 눈으로 찾는다. */
  topBar?: React.ReactNode
  /** 창 **전체를 덮는** 판 — 모아 보기. 수업 칸은 덮지 않는다(그러라고 모아 두는 것이다).
   *  `absolute inset-0` 로 그리므로 이 창의 뿌리가 `relative` 여야 한다. */
  overlay?: React.ReactNode
  /** 스크롤 컨테이너 ref — 턴 전환 시 자동 스크롤용 */
  bodyRef?: React.Ref<HTMLDivElement>
}

export default function TutorDock({
  mode, setMode, canSidebar = true, name, imgSrc, poseSrc, clipSrc, allClips, micActive, footer,
  onEndUtterance, sttSending, sttNotice,
  chatMode, setChatMode, getTutorFreq, getMicFreq, connected, connecting, isSpeaking, preparing = false,
  lastLine, lastLinePlain, messages, actions, hint, topBar, overlay,
  inputText, setInputText, onSend, onStartAgent, bodyRef, pushTalk, setPushTalk, focusInput,
}: TutorDockProps) {
  const voiceMode = chatMode === 'voice'
  const faceSrc = poseSrc || imgSrc

  /* ── 자막(CC)을 켜 둘 것인가 — **모드와 무관하다** (09-18) ──
     예전에는 기본값이 모드마다 달랐다(말로 답하면 끄고, 키보드면 켜고). 그랬더니 키보드 모드로
     바꾸는 순간 CC 가 **저 혼자 켜졌다** — 스위치가 제멋대로 움직이는 것으로 보인다(사용자 지적).
     이제 기본은 **꺼짐** 하나이고, 켜는 것은 학생이다. 자막이 늘 떠 있으면 문제보다 자막을
     본다는 관찰(FGI 15번)의 기본값이기도 하다.
     예외는 하나: **글로 보내면 켜진다**(아래 onSend) — 보낸 글이 안 보이면 안 되니까. */
  const [linePref, setLinePref] = useState<boolean | null>(null)
  const lineOpen = linePref ?? false
  /** 강사 말 칸에 무엇을 둘 것인가 — CC 가 고른다. 켜면 주고받은 말이 쭉, 끄면 파형. */
  const view: 'caption' | 'wave' = lineOpen ? 'caption' : 'wave'

  /* ── 하단 간소판 — 세로 화면·핸드폰 ── */
  if (mode === 'bottom') {
    return (
      <BottomDock
        faceSrc={faceSrc} clipSrc={clipSrc} allClips={allClips} name={name}
        connected={connected} connecting={connecting} isSpeaking={isSpeaking} preparing={preparing}
        getTutorFreq={getTutorFreq} lastLine={lastLine} lastLinePlain={lastLinePlain}
        chatMode={chatMode} setChatMode={setChatMode} micActive={micActive}
        inputText={inputText} setInputText={setInputText} onSend={onSend} onStartAgent={onStartAgent}
        actions={actions} hint={hint} footer={footer} topBar={topBar} overlay={overlay}
        onExpand={canSidebar ? () => setMode('sidebar') : undefined} />
    )
  }

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
    /* data-shot 은 **캡처 도구가 잡는 손잡이**다(scripts/shots.mjs). 화면에는 아무 영향이 없고,
       비포/애프터를 같은 자리로 잘라 내려면 이 창을 이름으로 부를 수 있어야 한다. */
    <div data-shot="dock" className="flex-1 flex flex-col min-h-0 relative">
      {topBar}

      {/* ── ① 누가 말하는가 — 모드와 무관하게 늘 같다 ──
          크기는 **자막을 켜든 끄든 그대로다**(사용자 지시 09-18). 자막이 빠진 자리는 아래
          파형 칸이 받는다 — 얼굴이 커졌다 작아졌다 하면 그 움직임 자체가 화면을 흔든다. */}
      <div className="shrink-0 flex flex-col items-center pt-1.5 pb-1.5 bg-gradient-to-b from-[#F5F8FF] to-white">
        <PulseAvatar src={faceSrc} clipSrc={clipSrc} allClips={allClips} name={name} speaking={isSpeaking} getFreq={getTutorFreq}
          size={118} />
      </div>

      {/* ── ② CC + 강사 말 칸 ──
          얼굴 바로 아래 CC 하나, 그 아래 한 칸. **CC 켜짐 = 주고받은 말이 쭉 / 꺼짐 = 파형.**
          대화 내역을 따로 여는 버튼은 없다 — 자막이 곧 대화 내역이다. */}
      <CCToggle on={lineOpen} onToggle={() => setLinePref(!lineOpen)} />
      {/* ⚠️ 말 칸은 **남는 자리만큼만** 차지한다(flex-1 + min-h-0). vh 로 높이를 주면
             말이 쌓일수록 아래 마이크·입력칸을 창 밖으로 밀어내 잘려 보였다(실측 09-18). */}
      <div className={`px-3 md:px-4 pb-0.5 ${view === 'caption' ? 'flex-1 min-h-0 flex' : 'shrink-0'}`}>
        {view === 'caption' ? <ChatFlow messages={messages} />
          : <TutorWave speaking={isSpeaking || preparing} getFreq={getTutorFreq} />}
      </div>

      {/* ── ③ 이번에 할 일 — **모드와 무관하게 늘 같은 자리다** ──
          예전에는 입력 모드일 때 선택지가 채팅 흐름 안의 카드였다. 뒤에 말이 오면 위로 밀려
          올라가서, 눌러야 할 것을 찾으려면 스크롤을 거슬러 올라가야 했다
          (docs/redesign/tutor-mode/v1-before/lc-choices-text-dock.png 이 그 장면이다). */}
      {/* 자막(대화 흐름)을 켜도 **선택지·알림은 그대로 뜬다** — 읽는 동안 문제를 못 풀면 안 된다.
          그때는 이 칸이 자기 높이만 가져가고(최대 45%), 남는 자리는 말 칸이 쓴다. */}
      <div ref={bodyRef} className={`min-h-0 overflow-y-auto flex flex-col px-3 md:px-4 pt-2.5 pb-3 ${
        view === 'caption' ? 'shrink-0 max-h-[45%]' : 'flex-1'}`}>
        {/* 남는 세로는 위아래로 나눠 가진다(`my-auto`): 내용이 짧으면 가운데, 길면 margin 이
            0이 되어 위부터 차곡차곡 쌓이고 그 안에서 스크롤한다. */}
        <div className="w-full space-y-2.5 my-auto">
          {hint}
          {actions}
        </div>
      </div>

      {/* ── ④ 답하는 자리 — **여기만 모드에 따라 갈린다** ── */}
      {voiceMode ? (
        <VoiceListener connected={connected} connecting={connecting} isSpeaking={isSpeaking}
          getFreq={getMicFreq} onStartAgent={onStartAgent} micActive={micActive}
          onEndUtterance={onEndUtterance} sttSending={sttSending} sttNotice={sttNotice}
          toggle={<ChatModeToggle chatMode={chatMode} setChatMode={setChatMode} />} />
      ) : (
        <TextComposer connected={connected} connecting={connecting}
          inputText={inputText} setInputText={setInputText} onStartAgent={onStartAgent}
          /* ── 보낸 글은 **반드시 보이게** 한다 (09-18) ──
             CC 를 끈 채(파형만) 키보드로 보내면 내 글도 강사 답도 화면에 한 글자도 안 남아서
             *전송이 안 되는 것처럼* 보였다(실제로는 보내지고 강사도 답한다). 글로 주고받기
             시작하는 순간 자막을 켠다 — 끄고 싶으면 CC 로 다시 끄면 된다. */
          onSend={() => { if (!lineOpen) setLinePref(true); onSend() }}
          toggle={<ChatModeToggle chatMode={chatMode} setChatMode={setChatMode} />}
          focusInput={focusInput} />
      )}
      {footer && <div className="shrink-0 px-3 md:px-4 pb-3">{footer}</div>}

      {/* 모아 보기는 **창 전체를 덮는다** — 뿌리의 마지막 자식이라야 위에 얹힌다 */}
      {overlay}
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

/* ── 하단 간소판 (bottom) ──
   세로 화면·핸드폰에서 강사가 앉는 자리. 옆 기둥(sidebar)은 이 폭에서 둘 다 못 읽고,
   끌어 옮기는 작은 창(mini)은 문제 위에 떠서 지문·보기를 덮는다. 그래서 **아래에 깔고**,
   그 자리에서 꼭 필요한 것만 남긴다.

   남기는 것 넷 — 얼굴(누가 말하는가) · 방금 한 말 · 지금 할 일(지시·선택지) · 답하는 자리.
   빼는 것 — 대화 이력, 리사이즈, 창 옮기기. 좁은 화면에서 이력을 펴면 문제가 사라진다.

   ⚠️ **떠 있지 않고 자리를 차지한다**(fixed 아님). 수업 칸이 그만큼 줄어야 사진·보기가
      이 판에 가려지지 않는다 — 그 배치는 TypeLessonPlayer 가 flex-col 로 잡는다. */
function BottomDock({
  faceSrc, clipSrc, allClips, name, connected, connecting, isSpeaking, preparing, getTutorFreq,
  lastLine, lastLinePlain, chatMode, setChatMode, micActive, footer,
  inputText, setInputText, onSend, onStartAgent, actions, hint, onExpand, topBar, overlay,
}: {
  faceSrc: string; clipSrc?: string | null; allClips?: string[]
  name: string; connected: boolean; connecting: boolean; isSpeaking: boolean; preparing?: boolean
  getTutorFreq?: () => Uint8Array | undefined
  lastLine: string; lastLinePlain?: boolean
  chatMode: 'voice' | 'text'; setChatMode: (m: 'voice' | 'text') => void
  micActive?: boolean
  footer?: ReactNode
  inputText: string; setInputText: (s: string) => void; onSend: () => void; onStartAgent: () => void
  actions?: ReactNode; hint?: ReactNode
  topBar?: ReactNode; overlay?: ReactNode
  /** 옆 기둥으로 펼 수 있는 폭이면 그 문을 하나 둔다. 좁으면 없음 */
  onExpand?: () => void
}) {
  /* 말이 길어지면 아래로 따라 내려간다 — 화면이 좁아 두세 줄만 보이는 자리라 더 중요하다 */
  const liveRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = liveRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastLine])

  return (
    <div className="shrink-0 w-full border-t border-[#E5E7EB] bg-white relative"
      style={{ boxShadow: '0 -6px 20px rgba(15,23,42,0.06)' }}>
      {topBar}
      {/* ① 누가 말하는가 + 방금 한 말 */}
      <div className="flex items-start gap-2.5 px-3 pt-2.5">
        <span className="relative shrink-0">
          <PulseAvatar src={faceSrc} clipSrc={clipSrc} allClips={allClips} name={name}
            speaking={isSpeaking} getFreq={getTutorFreq} size={44} />
          <span className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div ref={liveRef} className="max-h-[20vh] overflow-y-auto text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap">
            {lastLine ? <TutorText text={lastLine} plain={lastLinePlain} />
              : (isSpeaking || preparing) ? <SpeechDots />
                : <span className="text-[12px] text-gray-400">{connecting ? '연결 중…' : `${name} 선생님`}</span>}
          </div>
          {/* 지금 말해도 되는가 — **강사 말 바로 밑에** 둔다. 왼쪽 끝(얼굴 아래)에 두면
              무엇에 대한 말인지 안 보인다 — 물은 말 아래 답하는 자리가 맞다(사용자 지시 09-01). */}
          {micActive && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              지금 말해 보세요
            </span>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <ChatModeToggle chatMode={chatMode} setChatMode={setChatMode} compact />
          {onExpand && (
            <button onClick={onExpand} className="text-[10.5px] font-bold text-[#94A3B8] hover:text-[#475569] px-1">
              옆으로 펴기
            </button>
          )}
        </div>
      </div>

      {/* ② 지금 할 일 — 행동 지시와 선택지. 글자는 한 단계 줄인다 */}
      <div className="px-3 py-2 space-y-2 max-h-[34vh] overflow-y-auto empty:hidden
                      [&_button]:text-[12.5px] [&_p]:text-[12.5px]">
        {hint}
        {actions}
      </div>

      {/* ③ 답하는 자리 — 텍스트 모드는 마이크가 닫혀 있어 이 줄이 유일한 길이다 */}
      {chatMode === 'text' && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100">
          <input className="flex-1 min-w-0 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
            placeholder={connected ? '메시지를 입력하세요' : connecting ? '연결 중…' : '연결이 끊겼어요'}
            value={inputText} disabled={!connected} maxLength={300}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSend() }} />
          <button onClick={connected ? onSend : onStartAgent} disabled={connected ? !inputText.trim() : connecting}
            aria-label={connected ? '전송' : '대화 시작'}
            className="w-8 h-8 bg-[#2563EB] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      )}
      {footer && <div className="px-3 pb-2">{footer}</div>}
      {/* 모아 보기는 **창 전체를 덮는다** — 뿌리의 마지막 자식이라야 위에 얹힌다 */}
      {overlay}
    </div>
  )
}
