'use client'

/**
 * 토익 TIP · 핵심 어휘 — **쌓이는 노트**
 *
 * 수업이 흘러가면서 문항마다 나온 팁과 어휘를 사라지지 않게 모아 둔다.
 *   ① TipCard    — 그 팁이 나오는 턴에 **수업 칸**에 뜨는 카드 (강사 창이 아니다)
 *   ② TipButtons — 강사 창 위의 버튼 둘. 지나간 만큼 숫자가 오른다
 *   ③ TipSheet   — 버튼을 누르면 열리는 모아 보기
 *
 * ── 왜 '지나간 만큼' 인가 ──
 * 처음부터 다 보이면 이건 수업이 아니라 요약본이다. 학생이 **지나온 만큼만** 쌓여야
 * "내가 여기까지 왔다" 가 눈에 보이고, FGI 에서 볼 것도 그 행동이다(누르는가·언제 누르는가).
 * 그래서 모으는 쪽(TypeLessonPlayer)이 `turnIdx` 까지의 턴만 넘긴다 — 여기서는 상태를 안 든다.
 *
 * ⚠️ **어휘 모음은 마지막 퀴즈의 답안지다.** 강의 끝 '핵심 빈출 표현 정리' 10문항이 여기
 *    쌓인 어휘와 거의 같다(line up · stack · pour · be positioned …). 그래서 그 퀴즈를 푸는
 *    동안에는 `locked` 로 잠근다 — 없애지는 않는다. 잠긴 이유를 말해 주는 편이 낫다.
 */

import { useEffect, useRef, useState } from 'react'
import type { LessonTip } from '@/data/typeLearning/types'

/** 쌓인 팁 하나 — 몇 번 문제에서 나왔는지 함께 든다(모아 보기에서 되짚는 실마리) */
export interface SeenTip { qNo: number; tip: LessonTip }

export type TipSheetKind = 'tip' | 'vocab'

/* ── 핵심어에 **펜을 긋는다** ──
   강사가 노트에 손으로 밑줄 친 것처럼 보이게 하는 것이 목적이다. 무엇에 긋는가는 셋:
     ① `**…**` — **사람이 찍은 것이 언제나 우선한다.** 시트 대본에는 이미 이 관습이 있고
        (sanitizeForTts 가 소리에서 이 표시를 떼어낸다), TIP 칸에는 아직 안 쓴다(실측 15칸 중 0).
        먼저 지원해 두면 콘텐츠팀이 찍는 순간 그대로 먹는다.
     ② 영어 덩어리 — 토익 수업에서 핵심어는 대개 영어 형태 그 자체다(`be being p.p.`, `is hanging`).
     ③ 작은따옴표 안 — 뜻풀이(`'~을 조립하다'`)다. 굵게만 하고 밑줄은 긋지 않는다:
        한 줄에 빨간 줄이 두 겹 이상 그이면 노트가 아니라 낙서로 보인다.
   ⚠️ 자동 규칙이라 **과하게 그일 수 있다.** 그래도 밑줄이 정보를 지우지는 않으므로,
      못 긋고 넘어가는 쪽보다 낫다고 보고 이렇게 뒀다. */
const PEN = 'linear-gradient(transparent 58%, rgba(239,68,68,0.42) 58%, rgba(239,68,68,0.42) 82%, transparent 82%)'

function Pen({ children }: { children: React.ReactNode }) {
  return <strong className="font-black text-[#1C1B33]" style={{ backgroundImage: PEN, paddingBottom: '0.05em' }}>{children}</strong>
}

/** 한 줄을 조각으로 갈라 표시한다. 정규식 하나로 세 규칙을 한 번에 훑는다 —
 *  따로 훑으면 이미 감싼 조각을 또 감싸서 태그가 겹친다. */
function marked(text: string): React.ReactNode[] {
  const re = /\*\*(.+?)\*\*|([A-Za-z][A-Za-z0-9'’.+\-]*(?:\s+[A-Za-z0-9'’.+\-]+)*)|['‘]([^'’]+)['’]/g
  const out: React.ReactNode[] = []
  let at = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > at) out.push(text.slice(at, m.index))
    const [full, bold, eng, quoted] = m
    if (bold) out.push(<Pen key={m.index}>{bold}</Pen>)
    else if (eng) out.push(<Pen key={m.index}>{eng}</Pen>)
    else out.push(<strong key={m.index} className="font-black text-[#1C1B33]">‘{quoted}’</strong>)
    at = m.index + full.length
  }
  if (at < text.length) out.push(text.slice(at))
  return out
}

/* ── 줄머리로 모양을 가른다 ──
   시트가 자유롭게 쓰므로(소제목 `*…` · 번호 `1. …` · 보조 설명 `→ …`) 틀을 씌우지 않고
   줄머리만 보고 들여쓰기와 색을 준다. 모르는 꼴은 그냥 본문으로 나간다 — 내용이 잘리는 것보다 낫다. */
function TipLine({ text }: { text: string }) {
  if (text.startsWith('*')) {
    const t = text.replace(/^\*\s*/, '')
    return (
      <p className="mt-3 mb-1 flex items-center gap-1.5 text-[12px] font-black text-[#2563EB]">
        <span className="w-1 h-3 rounded-sm bg-[#93C5FD]" />{marked(t)}
      </p>
    )
  }
  if (text.startsWith('→')) {
    return <p className="pl-4 text-[12px] leading-relaxed text-[#64748B]">{marked(text)}</p>
  }
  if (/^\d+\s*[.)]/.test(text)) {
    return <p className="pl-1 text-[13px] leading-relaxed text-[#334155]">{marked(text)}</p>
  }
  return <p className="text-[13.5px] leading-[1.75] text-[#1C1B33]">{marked(text)}</p>
}

function VocabRow({ en, ko }: { en: string; ko: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      {/* 어휘에는 **펜을 긋지 않는다** — 줄마다 영어가 오므로 목록 전체가 빨개진다.
          펜은 본문에서 '여기가 핵심' 을 가리키는 표시라, 다 그으면 아무것도 안 가리킨다. */}
      <span className="text-[13px] font-black text-[#1C1B33]">{en}</span>
      <span className="flex-1 border-b border-dashed border-[#E2E8F0] translate-y-[-3px]" />
      <span className="text-[12.5px] text-[#475569] shrink-0">{ko}</span>
    </div>
  )
}

/* ══ ① 수업 칸에 뜨는 카드 ══════════════════════════════════════════════
   `#zoom-host`(왼쪽 수업 칸) 안에 **덮어서** 띄운다. 이 턴은 사진을 다시 볼 자리가 아니라
   강사가 정리를 말하는 자리다. 뒤가 살짝 비치게 두는 이유는 하나 — 학생이 방금 보던 문제에서
   튕겨 나온 느낌을 받지 않게 하려는 것이다. */
export function TipCard({ tip, flying }: {
  tip: LessonTip
  /** 이 턴이 끝나 **버튼으로 빨려 들어가는 중**인가. 부르는 쪽이 잠깐 더 띄워 두고 이걸 켠다 */
  flying?: boolean
}) {
  /* 들어올 때만 한 번 부드럽게. 매 렌더 애니메이션을 걸면 강사가 말하는 동안 덜컹인다 */
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), 20); return () => clearTimeout(t) }, [])

  /* ── 빨려 들어가는 자리를 **재어서** 정한다 ──
     강사 창은 오른쪽 기둥 · 아래 간소판 · 작은 창으로 모양이 바뀐다. 방향을 코드에 박아 두면
     그중 하나에서 엉뚱한 데로 날아간다. 버튼 줄에 붙은 id 를 찾아 그 중심까지의 거리를 잰다
     (`#zoom-host` 와 같은 방식 — 이 레포가 컴포넌트를 가로질러 자리를 잡을 때 쓰는 길이다).
     못 찾으면 그냥 제자리에서 작아지며 사라진다 — 애니메이션 하나 때문에 화면이 깨지면 안 된다. */
  const boxRef = useRef<HTMLDivElement>(null)
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!flying) return
    const box = boxRef.current?.getBoundingClientRect()
    const target = document.getElementById('tip-buttons')?.getBoundingClientRect()
    if (!box || !target) { setFly({ x: 0, y: 0 }); return }
    setFly({
      x: (target.left + target.width / 2) - (box.left + box.width / 2),
      y: (target.top + target.height / 2) - (box.top + box.height / 2),
    })
  }, [flying])

  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center p-4 md:p-6 transition-colors duration-300
                     ${flying ? 'bg-transparent pointer-events-none' : 'bg-white/70 backdrop-blur-[2px]'}`}>
      <div
        ref={boxRef}
        style={fly ? { transform: `translate(${fly.x}px, ${fly.y}px) scale(0.06)`, opacity: 0 } : undefined}
        className={`w-full max-w-[520px] max-h-full overflow-y-auto rounded-2xl bg-white border border-[#E3EBF6]
                    shadow-[0_12px_44px_rgba(37,99,235,0.13)]
                    ${flying ? 'transition-all duration-[600ms] ease-[cubic-bezier(0.55,0,0.85,0.35)]'
                      : `transition-all duration-300 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}`}>

        {/* 노트 머리 — 왼쪽에 굵은 빨간 세로줄 하나. 손으로 접어 둔 노트의 가장자리다 */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#EEF2F7] rounded-t-2xl bg-white">
          <span className="w-[3px] h-3.5 rounded-full bg-[#EF4444]" />
          <span className="text-[13px] font-black text-[#1C1B33] tracking-tight">토익 TIP</span>
        </div>

        {/* 본문 — 아주 옅은 괘선을 깔아 공책처럼 보이게 한다.
            줄 간격(1.75)과 괘선 간격을 맞추지는 않는다 — 맞추려 들면 글자 크기가 조금만 달라져도
            글이 줄 위에 떠 보인다. 여기서는 '종이' 느낌만 내면 된다. */}
        <div className="px-4 py-3.5 space-y-1"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #F1F5FB 27px, #F1F5FB 28px)' }}>
          {tip.body.map((line, i) => <TipLine key={i} text={line} />)}
        </div>

        {tip.vocab.length > 0 && (
          <div className="px-4 pb-4 pt-1">
            <div className="rounded-xl bg-[#FFFBF5] border border-[#F5E7D0] px-3 py-2">
              <p className="text-[11px] font-black text-[#B98B3E] mb-1">핵심 어휘</p>
              {tip.vocab.map((v, i) => <VocabRow key={i} en={v.en} ko={v.ko} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══ ② 강사 창 위 버튼 둘 ═══════════════════════════════════════════════ */
export function TipButtons({ tips, vocabCount, locked, onOpen }: {
  tips: SeenTip[]
  vocabCount: number
  /** 마지막 퀴즈를 푸는 동안 — 눌러도 안 열린다(어휘가 곧 그 퀴즈의 답이라서) */
  locked?: boolean
  onOpen: (kind: TipSheetKind) => void
}) {
  /* 새로 쌓였을 때만 잠깐 강조한다 — 학생이 화면 어디를 봐야 하는지 알려주는 유일한 신호다.
     ⚠️ 개수가 **줄 때는** 튀지 않게 한다(되감기·다시 풀기로 turnIdx 가 뒤로 갈 수 있다). */
  const [bump, setBump] = useState<TipSheetKind | null>(null)
  const prev = useRef({ t: tips.length, v: vocabCount })
  useEffect(() => {
    const grewTip = tips.length > prev.current.t
    const grewVocab = vocabCount > prev.current.v
    prev.current = { t: tips.length, v: vocabCount }
    if (!grewTip && !grewVocab) return
    setBump(grewTip ? 'tip' : 'vocab')
    const timer = setTimeout(() => setBump(null), 900)
    return () => clearTimeout(timer)
  }, [tips.length, vocabCount])

  /* ── 비어 있어도 **자리를 지킨다** ──
     수업이 시작되면 바로 보이고, 첫 팁이 들어오는 순간 회색에서 살아난다. 그 변화 자체가
     "여기에 쌓인다" 를 말해 준다. 나타났다 사라지는 버튼은 학생이 눈으로 찾지 못한다. */
  const btn = (kind: TipSheetKind, label: string, n: number) => {
    const empty = n === 0
    const off = empty || locked
    return (
      <button
        key={kind}
        onClick={() => !off && onOpen(kind)}
        disabled={off}
        title={locked ? '지금은 정리 퀴즈를 푸는 중이에요. 다 풀고 나면 다시 열려요.'
          : empty ? '수업이 진행되면 여기에 쌓여요.'
            : `${label} 모아 보기`}
        className={`flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full border text-[11.5px] font-bold transition-all
          ${off
            ? 'border-[#DCE7F8] bg-[#EDF3FD] text-[#A3B4CC] cursor-not-allowed'
            : 'border-[#BFD8FA] bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#CFE1FD] hover:border-[#93C0F7] active:scale-[0.97]'}`}>
        <span>{label}</span>
        <span className={`min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full
                          text-[10px] font-black transition-transform duration-300
                          ${off ? 'bg-white/70 text-[#A3B4CC]'
                            : bump === kind ? 'scale-125 bg-[#1D4ED8] text-white' : 'bg-white text-[#1D4ED8]'}`}>
          {n}
        </span>
      </button>
    )
  }

  /* 바탕을 아래 아바타 칸과 **같은 파랑**으로 둔다 — 두 칸이 하나의 머리처럼 보여야
     버튼이 강사 창에 얹힌 것이 아니라 그 창의 일부로 읽힌다(TutorDock 아바타 칸의 gradient 시작색). */
  return (
    <div id="tip-buttons" className="shrink-0 flex items-center gap-1.5 px-3 md:px-4 pt-2 pb-1 bg-[#F5F8FF]">
      {btn('tip', '토익 TIP', tips.length)}
      {btn('vocab', '핵심 어휘', vocabCount)}
    </div>
  )
}

/* ══ ③ 모아 보기 ═══════════════════════════════════════════════════════
   **강사 창 영역만** 덮는다. 수업 칸은 그대로 둔다 — 학생이 사진·보기를 보면서 팁을
   확인할 수 있어야 한다(그러라고 모아 두는 것이다). */
export function TipSheet({ kind, tips, onClose }: {
  kind: TipSheetKind
  tips: SeenTip[]
  onClose: () => void
}) {
  /* Esc 로 닫기 — 모아 보기는 **읽기 전용**이라 되돌릴 것이 없다. 닫는 길을 넓게 둔다 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* 최근 것이 위 — 방금 본 팁을 다시 보려고 여는 경우가 가장 많다 */
  const ordered = [...tips].reverse()

  /* 어휘는 **중복을 지운다** — 같은 표현이 여러 문항의 팁에 겹쳐 나온다.
     먼저 나온 자리를 남긴다(처음 배운 문항으로 되짚는 게 맞다). */
  const seen = new Set<string>()
  const vocab: { en: string; ko: string; qNo: number }[] = []
  for (const s of tips) {
    for (const v of s.tip.vocab) {
      const key = v.en.toLowerCase().replace(/\s+/g, ' ').trim()
      if (seen.has(key)) continue
      seen.add(key)
      vocab.push({ ...v, qNo: s.qNo })
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white">
      <div className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 border-b border-[#EEF2F7] bg-[#F8FAFF]">
        <span className="text-[14px]">{kind === 'tip' ? '💡' : '📖'}</span>
        <span className="text-[13px] font-black text-[#1C1B33]">
          {kind === 'tip' ? '토익 TIP' : '핵심 어휘'}
        </span>
        <span className="text-[11px] font-bold text-[#94A3B8]">
          {kind === 'tip' ? `${tips.length}개` : `${vocab.length}개`}
        </span>
        <button onClick={onClose} aria-label="모아 보기 닫기"
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-full text-[#64748B]
                     hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-3">
        {kind === 'tip'
          ? ordered.map((s, i) => (
            <div key={i} className="rounded-xl border border-[#EEF2F7] bg-white px-3 py-2.5">
              <p className="text-[10.5px] font-black text-[#94A3B8] mb-1">{s.qNo}번 문제</p>
              <div className="space-y-0.5">
                {s.tip.body.map((line, j) => <TipLine key={j} text={line} />)}
              </div>
            </div>
          ))
          : (
            <div className="rounded-xl border border-[#EEF2F7] bg-white px-3 py-1.5">
              {vocab.map((v, i) => (
                <div key={i} className="border-b border-[#F4F7FB] last:border-0">
                  <VocabRow en={v.en} ko={v.ko} />
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
