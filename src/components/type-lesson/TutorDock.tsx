'use client'

/* ── 강사 도크 — 한 강사 창의 배치 ──
 *
 *   우측 패널(안1)  ⇄  하단 도크(안3)  ⇄  최소화(작은 창)
 *
 * 강사 사진·말·상호작용·입력이 전부 이 창 안에 산다. 내용(슬롯)은 같고 배치만 바뀐다:
 *   · 우측 패널 = 세로 스택 (사진 위 → 말 → 선택지 → 입력)
 *   · 하단 도크 = 가로 3열 (좌: 사진 · 중: 단계+말+선택지 · 우: 입력)
 *   · 최소화 = 얼굴 + 발화 한 줄로 접힌 작은 창(탭하면 직전 배치로 복원)
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type DockMode = 'sidebar' | 'bottom' | 'mini'

const ICON = 'w-4 h-4'

/* 배치 전환 아이콘 — 우측 패널 / 하단 도크 / 최소화 */
const PanelRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M14 4v16" />
  </svg>
)
const PanelBottomIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 14h18" />
  </svg>
)
const MinimizeIcon = () => (   // 작은 창으로 최소화
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON}>
    <path d="M5 12h14" />
  </svg>
)

/* ── 대화 모드 토글 (음성 ⇄ 텍스트) ──
   강사 창 헤더에 산다. 예전엔 입력창(Composer) 위에 있었는데, 그 자리는 모드가 바뀌면
   통째로 갈아치워지는 영역이라 토글이 같이 흔들렸다 — 고정된 헤더로 올렸다. */
export function ChatModeSwitch({ chatMode, setChatMode, compact }: {
  chatMode: 'text' | 'voice'; setChatMode: (m: 'text' | 'voice') => void; compact?: boolean
}) {
  const item = (m: 'voice' | 'text', label: string, icon: ReactNode) => (
    <button onClick={() => setChatMode(m)} aria-label={`${label} 모드`} title={`${label} 모드`}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-colors ${
        chatMode === m ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#64748B] hover:text-[#334155]'
      }`}>
      {icon}
      {/* 좁은 칸(하단 도크 중앙 칼럼)에선 아이콘만 — 글자까지 넣으면 단계명을 밀어낸다 */}
      <span className={compact ? 'hidden xl:inline' : ''}>{label}</span>
    </button>
  )
  return (
    <div className="shrink-0 inline-flex items-center bg-[#F1F5F9] rounded-full p-0.5">
      {item('voice', '음성', (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      ))}
      {item('text', '텍스트', (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
          <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
        </svg>
      ))}
    </div>
  )
}

/** 배치 전환 컨트롤 — 우측 패널(안1) / 하단 도크(안3) / 최소화.
 *  강사 창 헤더가 아니라 **화면 상단 도구줄**(해석·필기 옆)에 놓는다 — 화면 전체 배치 설정이지
 *  강사 창의 내용이 아니고, 최소화 상태에선 헤더 자체가 없어서 창 안에 두면 접근이 끊긴다. */
export function LayoutSwitch({ mode, setMode }: { mode: DockMode; setMode: (m: DockMode) => void }) {
  const item = (m: DockMode, label: string, icon: ReactNode) => (
    <button key={m} onClick={() => setMode(m)} aria-label={label} title={label}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
        mode === m ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      }`}>{icon}</button>
  )
  return (
    <div className="flex items-center gap-0.5">
      {item('sidebar', '우측 패널', <PanelRightIcon />)}
      {item('bottom', '하단 도크', <PanelBottomIcon />)}
      {item('mini', '최소화', <MinimizeIcon />)}
    </div>
  )
}

/* 단계 표시 'STEP n/총 · 단계명'. 누르면 위쪽 스캐폴딩 레일 바가 열린다 —
   레일은 평소 숨겨두고(학생에게 필요한 건 지금 단계 하나뿐), 필요할 때 여기서 펼친다. */
function StepLabel({ step, onToggleRail, railOpen }: {
  step: { idx: number; total: number; label: string }
  onToggleRail?: () => void; railOpen?: boolean
}) {
  const inner = (
    <>
      <span className="shrink-0 text-[12px] font-black text-[#2563EB]">STEP {step.idx}/{step.total}</span>
      {step.label && <span className="text-[12.5px] font-bold text-[#475569] truncate">· {step.label}</span>}
      {onToggleRail && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 w-3 h-3 text-[#94A3B8] transition-transform ${railOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      )}
    </>
  )
  if (!onToggleRail) return <div className="flex items-center gap-1.5 min-w-0">{inner}</div>
  return (
    <button onClick={onToggleRail} aria-expanded={!!railOpen} title="스캐폴딩 단계 전체 보기"
      className="flex items-center gap-1.5 min-w-0 rounded-lg px-1.5 -mx-1.5 py-0.5 hover:bg-[#EFF6FF] transition-colors">
      {inner}
    </button>
  )
}

/** 헤더 — 단계 표시(STEP x/y · 단계명) + 대화 모드 토글 (우측 패널/하단 도크 공통).
 *  step이 주어지면 시안처럼 단계 표시형(사진이 아래 크게 서므로 얼굴/이름은 생략),
 *  없으면 기존 강사 얼굴·이름 표시형으로 폴백한다. */
function DockHeader({ name, imgSrc, connected, isSpeaking, step, chatMode, setChatMode, onToggleRail, railOpen }: {
  name: string; imgSrc: string; connected: boolean; isSpeaking: boolean
  step?: { idx: number; total: number; label: string }
  chatMode: 'text' | 'voice'; setChatMode: (m: 'text' | 'voice') => void
  onToggleRail?: () => void; railOpen?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2.5 border-b border-gray-100 shrink-0 select-none">
      {step ? (
        <StepLabel step={step} onToggleRail={onToggleRail} railOpen={railOpen} />
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <span className={`relative shrink-0 block w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
            isSpeaking ? 'border-[#2563EB] shadow-[0_0_14px_rgba(37,99,235,0.5)]' : 'border-[#2563EB]/25'
          }`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt={name} className="w-full h-full object-cover object-top" />
          </span>
          <span className="text-[13px] font-bold text-[#374151] truncate">{name} 강사</span>
          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </div>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 연결 점만 남긴다 — '자동 전환' 글자는 모드 토글에 자리를 내줬다(상태는 점으로 충분) */}
        {step && <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} title={connected ? '연결됨 · 자동 전환' : '연결 안 됨'} />}
        <ChatModeSwitch chatMode={chatMode} setChatMode={setChatMode} />
      </div>
    </div>
  )
}

/* ── 마이크 파형 — 음성 모드에서 "내가 지금 말하고 있다"를 보여주는 자리 ──
   에이전트 연결 시 실제 입력 스펙트럼(getInputByteFrequencyData)을 그리고,
   연결 전에는 잠잠한 바만 둔다. 초당 ~20회만 갱신한다(프레임마다 setState 하면 과하다). */
function MicWave({ active, speaking, getFreq }: {
  active: boolean; speaking: boolean; getFreq?: () => Uint8Array | undefined
}) {
  const N = 22
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
    <div className="flex-1 flex items-center justify-center gap-[3px] h-10 px-3 rounded-full bg-gray-50 border border-gray-100">
      {bars.map((v, i) => (
        <span key={i}
          className={`w-[3px] rounded-full transition-[height] duration-75 ${
            speaking ? 'bg-[#93C5FD]' : active ? 'bg-[#2563EB]' : 'bg-gray-300'
          }`}
          style={{ height: `${Math.max(4, v * 28)}px` }} />
      ))}
    </div>
  )
}

/** 대화 하단 입력 — 강사 에이전트(일레븐랩스) 연결/텍스트/음성. 대화 흐름 아래에 붙는다. */
export function TutorComposer({
  connected, connecting, isSpeaking, chatMode,
  inputText, setInputText, onSend, onStartAgent, onEndSession, getFreq, topFlush,
}: {
  connected: boolean; connecting: boolean; isSpeaking: boolean
  /** 음성/텍스트 전환 버튼은 여기 없다 — 강사 창 헤더(ChatModeSwitch)로 올라갔다 */
  chatMode: 'text' | 'voice'
  inputText: string; setInputText: (s: string) => void
  onSend: () => void; onStartAgent: () => void; onEndSession: () => void
  /** 마이크 입력 스펙트럼 — 파형용 (에이전트 연결 시에만 값이 나온다) */
  getFreq?: () => Uint8Array | undefined
  /** 상단 경계선 제거(하단 도크처럼 별도 칼럼에 top-align으로 놓일 때) */
  topFlush?: boolean
}) {
  return (
    <div className={`shrink-0 px-3 md:px-4 pt-2.5 pb-3 space-y-2.5 ${topFlush ? '' : 'border-t border-gray-100'}`}>
      {/* 캡션 — 지금 뭘 하면 되는지 한 줄 (모드 토글은 헤더로 올라갔다) */}
      <p className="text-[12px] font-bold text-[#2563EB] truncate">
        {chatMode === 'voice'
          ? (!connected ? '마이크를 켜고 답해보세요' : isSpeaking ? '강사가 말하는 중…' : '말로 답변해보세요')
          : '텍스트로 답변해보세요'}
      </p>

      {chatMode === 'voice' ? (
        <>
          <div className="flex items-center gap-2.5 bg-[#F8FAFF] border border-[#DBEAFE] rounded-2xl px-3 py-2.5">
            <button onClick={connected ? undefined : onStartAgent} disabled={connecting}
              aria-label={connected ? '마이크 켜짐' : '마이크 켜기'}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-60 ${
                connected ? 'bg-[#2563EB] shadow-[0_0_16px_rgba(37,99,235,0.45)]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
              }`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </button>
            {connected ? (
              <MicWave active={connected} speaking={isSpeaking} getFreq={getFreq} />
            ) : (
              <span className="flex-1 text-center text-[12px] font-semibold text-[#94A3B8]">{connecting ? '연결 중…' : '마이크 켜기'}</span>
            )}
          </div>
          {connected && (
            <div className="flex justify-end">
              <button onClick={onEndSession} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600">대화 종료</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-2xl px-3.5 py-2">
            <input className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
              placeholder={connected ? '말할 내용을 입력하세요' : '대화를 시작하면 입력할 수 있어요'}
              value={inputText} disabled={!connected} maxLength={300}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSend() }} />
            <span className="shrink-0 text-[10px] font-semibold text-gray-300 tabular-nums">{inputText.length}/300</span>
            <button onClick={connected ? onSend : onStartAgent} disabled={connected ? !inputText.trim() : connecting}
              aria-label={connected ? '전송' : '대화 시작'}
              className="w-9 h-9 bg-[#2563EB] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          {connected && (
            <div className="flex justify-end">
              <button onClick={onEndSession} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600">대화 종료</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── 강사 포즈 스테이지 — 배경 투명 컷아웃을 상단에 크게 세운다 ──
   단계에 따라 poseSrc가 바뀌면 크로스페이드로 슥 교체된다(얼굴이 프레임 동일 지점이라 안 튐).
   상반신 포트레이트를 위쪽으로 당겨 얼굴~가슴이 보이게(object-position) 크롭하고, 잘린 허리는
   하단 페이드로 배경에 녹인다. big=모달(존재감 최대), 기본=사이드바. */
function PoseStage({ src, name, isSpeaking, big }: { src: string; name: string; isSpeaking: boolean; big?: boolean }) {
  return (
    <div className={`relative shrink-0 overflow-hidden bg-gradient-to-b from-[#EAF1FF] via-[#F3F7FF] to-white ${
      big ? 'h-[300px]' : 'h-[210px]'
    }`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={src} src={src} alt={name}
        style={{ objectPosition: '50% 16%' }}
        className="w-full h-full object-cover animate-pose-in" />
      {/* 잘린 허리를 배경으로 — 컷아웃이 카드 위에 자연스럽게 서 있게 */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      {isSpeaking && (
        <span className="absolute top-2.5 right-3 flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-2.5 py-1 text-[10.5px] font-bold text-[#1D4ED8] shadow-sm">
          <span className="flex items-end gap-[2px] h-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-[2.5px] rounded-full bg-[#2563EB] animate-eq" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </span>
          말하는 중
        </span>
      )}
    </div>
  )
}

/* ── 음성 모드 아바타 — 원형 사진 + 강사 음량에 반응하는 파동 링 ──
   음성 모드에선 강사 대본을 숨기고 이 아바타만 보여준다. 강사가 말하는 동안(speaking) 출력 음량
   (getFreq=에이전트 출력 스펙트럼)에 따라 링이 커졌다 작아진다. 음량 데이터가 없으면(브라우저 TTS
   폴백) 잔잔한 기본 맥동으로 뛴다. */
function PulseAvatar({ src, name, speaking, getFreq, size = 120 }: {
  src: string; name: string; speaking: boolean; getFreq?: () => Uint8Array | undefined; size?: number
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

  return (
    <div className="relative flex items-center justify-center" style={{ width: size * 1.75, height: size * 1.75 }}>
      {speaking && [0, 1, 2].map((i) => (
        <span key={i} className="absolute rounded-full border-2 border-[#2563EB]"
          style={{
            width: size, height: size,
            transform: `scale(${1 + level * (0.4 + i * 0.22)})`,
            opacity: Math.max(0, 0.45 - level * 0.15 - i * 0.13),
            transition: 'transform 90ms linear, opacity 120ms linear',
          }} />
      ))}
      <div className="relative rounded-full overflow-hidden border-[3px] border-white bg-gradient-to-b from-[#EAF1FF] to-white"
        style={{ width: size, height: size, boxShadow: speaking ? `0 0 ${16 + level * 44}px rgba(37,99,235,${0.2 + level * 0.4})` : '0 4px 16px rgba(0,0,0,0.12)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="w-full h-full object-cover" style={{ objectPosition: '50% 16%' }} />
      </div>
    </div>
  )
}

export interface TutorDockProps {
  mode: DockMode
  setMode: (m: DockMode) => void
  name: string
  imgSrc: string
  /** 단계별 강사 포즈 컷아웃 (배경 투명). 없으면(null) 포즈 스테이지 없이 기존 헤더 UI만. */
  poseSrc?: string | null
  /** 헤더에 표시할 스캐폴딩 단계 (STEP idx/total · label). 시안 헤더와 동일. */
  step?: { idx: number; total: number; label: string }
  /** STEP 글자를 누르면 위쪽 스캐폴딩 레일 바를 열고 닫는다 (레일은 기본 숨김) */
  onToggleRail?: () => void
  railOpen?: boolean
  /** 학생 입력 모드 — 음성 모드면 강사 대본을 숨기고 원형 아바타+파동만 보여준다 */
  chatMode: 'voice' | 'text'
  /** 헤더의 음성/텍스트 토글용 */
  setChatMode: (m: 'voice' | 'text') => void
  /** 강사(에이전트) 출력 음량 스펙트럼 — 음성 모드 파동 링용 */
  getTutorFreq?: () => Uint8Array | undefined
  connected: boolean
  isSpeaking: boolean
  /** 작은 창에 보여줄 지금 발화 한 줄 */
  lastLine: string
  /* ── 내용 슬롯 (배치만 모드별로 바뀐다) ── */
  /** 강사 말 — 사진 바로 아래(세로) 또는 좌측 하단(가로) */
  speech: ReactNode
  /** 선택지 / 간단한 설명 — 스크롤 영역 */
  body: ReactNode
  /** 음원 재생 바 (재생 중에만) */
  playback?: ReactNode
  /** 학생 응답 입력 — 맨 아래(세로) 또는 우측(가로) */
  composer: ReactNode
  /** 선택지 스크롤 컨테이너 ref — 턴 전환 시 자동 스크롤용 */
  bodyRef?: React.Ref<HTMLDivElement>
}

export default function TutorDock({
  mode, setMode, name, imgSrc, poseSrc, step, onToggleRail, railOpen,
  chatMode, setChatMode, getTutorFreq, connected, isSpeaking, lastLine,
  speech, body, playback, composer, bodyRef,
}: TutorDockProps) {
  const voiceMode = chatMode === 'voice'
  /* 최소화(mini) 전 배치를 기억해 뒀다가 작은 창을 다시 열면 그리로 복원한다(우측/하단 유지). */
  const lastPanelRef = useRef<DockMode>('sidebar')
  if (mode !== 'mini') lastPanelRef.current = mode

  /* ── 세로 스택 (우측 패널·작은창 공통 본문) ──
     텍스트 모드: 사진(컷아웃) → 강사 말 → 선택지 → 입력 (기존)
     음성 모드: 원형 아바타+파동(대본 숨김) → 선택지 → 입력 */
  const verticalBody = (
    <>
      {poseSrc && (voiceMode ? (
        <div className="shrink-0 flex items-center justify-center py-4">
          <PulseAvatar src={poseSrc} name={name} speaking={isSpeaking} getFreq={getTutorFreq} size={120} />
        </div>
      ) : (
        <PoseStage src={poseSrc} name={name} isSpeaking={isSpeaking} />
      ))}
      {!voiceMode && <div className="shrink-0 px-4 md:px-5 pt-3 pb-2.5 max-h-[30%] overflow-y-auto">{speech}</div>}
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-5 pb-3 pt-2 space-y-2.5">{body}</div>
      {playback}
      {composer}
    </>
  )

  /* ── 작은 창 — 얼굴 + 지금 하는 말. 탭하면 이전 배치(우측/하단)로 복원한다 ── */
  if (mode === 'mini') {
    const restore = () => setMode(lastPanelRef.current)
    return (
      <div className="fixed bottom-5 right-4 z-40 flex items-end gap-2.5">
        {lastLine && (
          <button onClick={restore}
            className="max-w-[240px] text-left rounded-2xl rounded-br-sm bg-white border border-gray-200 px-3.5 py-2.5 text-[13px] leading-snug text-gray-700 line-clamp-3"
            style={{ boxShadow: '0 4px 20px rgba(37,99,235,0.14), 0 1px 4px rgba(0,0,0,0.08)' }}>
            {lastLine}
          </button>
        )}
        <button onClick={restore} aria-label="강사 창 열기"
          className={`relative shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg transition-all ${
            isSpeaking ? 'border-[#2563EB] shadow-[0_0_18px_rgba(37,99,235,0.55)]' : 'border-white'
          }`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poseSrc || imgSrc} alt={name} className="w-full h-full object-cover object-top" />
          <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </button>
      </div>
    )
  }

  /* ── 하단 도크(안3) — 화면 아래 가로 바.
     좌: 강사 사진 · 중: 단계 → 강사 대본 → 설명/선택지(대본 아래 세로 스택) · 우: 입력 ── */
  if (mode === 'bottom') {
    return (
      <div className="shrink-0 border-t border-gray-200 bg-white flex flex-col h-[240px] md:h-[264px]">
        <div className="flex-1 min-h-0 flex items-stretch">
          {/* 좌: 강사 사진 — 텍스트 모드=컷아웃, 음성 모드=원형 아바타+파동 */}
          {poseSrc && (voiceMode ? (
            <div className="shrink-0 w-[150px] md:w-[184px] flex items-center justify-center border-r border-gray-100 bg-gradient-to-b from-[#F3F7FF] to-white">
              <PulseAvatar src={poseSrc} name={name} speaking={isSpeaking} getFreq={getTutorFreq} size={112} />
            </div>
          ) : (
            <div className="relative shrink-0 w-[116px] md:w-[148px] overflow-hidden bg-gradient-to-b from-[#EAF1FF] to-white border-r border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={poseSrc} src={poseSrc} alt={name} style={{ objectPosition: '50% 12%' }}
                className="w-full h-full object-cover animate-pose-in" />
              {isSpeaking && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-end gap-[2px] h-3 px-1.5 py-0.5 rounded-full bg-white/85 backdrop-blur shadow-sm">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-[2.5px] rounded-full bg-[#2563EB] animate-eq" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </span>
              )}
            </div>
          ))}
          {/* 중앙: 단계 → (텍스트 모드는 강사 대본) → 설명/선택지 */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-gray-100">
            <div className="flex items-center justify-between gap-2 px-3 md:px-4 pt-2.5 pb-1.5 border-b border-gray-100 shrink-0">
              {step
                ? <StepLabel step={step} onToggleRail={onToggleRail} railOpen={railOpen} />
                : <span className="min-w-0" />}
              <ChatModeSwitch chatMode={chatMode} setChatMode={setChatMode} compact />
            </div>
            <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 py-2.5 space-y-2.5">
              {/* 강사 대본 (텍스트 모드만) */}
              {!voiceMode && <div>{speech}</div>}
              {/* 설명 / 선택지 */}
              {body}
            </div>
          </div>
          {/* 우: 학생 응답 입력 — 위로 붙여 단계 헤더와 맞춘다(상단 여백 제거) */}
          <div className="shrink-0 w-[290px] md:w-[336px] flex flex-col min-h-0 overflow-y-auto">
            {playback}
            {composer}
          </div>
        </div>
      </div>
    )
  }

  /* ── 우측 패널(안1·기본) — 화면 오른쪽 기둥. 폭은 부모의 리사이즈 핸들이 남긴 공간을 채운다 ── */
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <DockHeader name={name} imgSrc={imgSrc} step={step} connected={connected} isSpeaking={isSpeaking}
        chatMode={chatMode} setChatMode={setChatMode} onToggleRail={onToggleRail} railOpen={railOpen} />
      {verticalBody}
    </div>
  )
}
