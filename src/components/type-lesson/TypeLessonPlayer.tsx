'use client'

/* ── 유형학습 플레이어 (턴 기반) ──
   이도윤 스캐폴딩 레일(TypeLesson.turns)을 순회하며 턴마다
   ① 강사 발화(말풍선+TTS) ② 음원 재생(문장 단위) ③ 스크립트/지문 점진 공개
   ④ 상호작용(퀵버튼·정답선택·주관식·마킹·쉐도잉·매칭)을 하단 독에 렌더한다.
   진행 상태(공개 범위)는 turns[0..idx]에서 매번 파생 — 이전/건너뛰기가 안전하다. */

import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { TypeLesson, Turn, AudioCue, Interaction, RecapSentence } from '@/data/typeLearning'
import ContentView, { targetTokens, type ContentState } from '@/components/type-lesson/ContentView'
import MicButton from '@/components/type-lesson/MicButton'
import { DrawingOverlay, DrawPalette, useDrawingTool } from '@/components/DrawingOverlay'
import { speakEnglishSeq, speakKorean, stopVoice } from '@/lib/voice'
import { INST_NAME, INST_THUMBS, tutorAgentFor, instPose, type InstPose } from '@/data/instructorData'
import audioManifest from '@/data/typeLearning/audioManifest.json'
import LessonIntro from '@/components/lesson/LessonIntro'
import TutorDock, { TutorComposer, type DockMode } from '@/components/type-lesson/TutorDock'
import { useConversation } from '@11labs/react'
import { buildTutorVars } from '@/lib/learnerProfile'
import { useOnboardingStore } from '@/store/onboardingStore'
import RailInspector from '@/components/type-lesson/RailInspector'
import { useLessonLog } from '@/data/db/learningEventStore'
import type { RailDiag } from '@/data/typeLearning/fromSteps'

/* 레일 정본이 이도윤 ver 한 벌뿐 — 온보딩에서 다른 강사를 골라도 짚는 순서는 이 레일을 따르고
   목소리·얼굴·화법만 그 강사가 된다. (강사별 레일이 채워지면 lesson.turns를 강사별로 고르게 바꾼다) */
const RAIL_OWNER = 'lee_doyun'

/** 상호작용 종류 → 학생이 이번 턴에 해야 할 일 (에이전트에게만 주는 지시) */
const INTERACTION_HINT: Record<Interaction['kind'], string> = {
  next: '',
  choice: '제시된 보기 중에서 하나를 고르게 한다.',
  pickAnswer: '문항의 정답을 직접 고르게 한다.',
  solveAll: '남은 문항을 스스로 풀게 한다.',
  subjective: '학생이 자기 말로 설명하게 한다.',
  mark: '지문·보기에서 해당하는 단어를 직접 짚게 한다.',
  shadow: '영어 문장을 따라 말하게 한다. 영어 문장은 음원이 들려주니 네가 읽지 마라.',
  match: '지문에서 근거가 되는 문장을 직접 탭하게 한다.',
}

/** 학생이 할 일이 있는 턴인가 — 진행 규칙이 여기서 갈린다.
 *  'next'(AI 진행)는 들려주고 넘어가는 턴이라 응답을 기다리면 답답해지고,
 *  나머지는 응답을 안 받고 넘어가면 스캐폴딩이 무의미해진다. */
const needsAnswer = (turn: Turn) => turn.interaction.kind !== 'next'

/** 응답 없는 턴에서 다시 물어볼 최대 횟수. 넘으면 붙잡아두지 않고 낮춰서 진행한다(Fading). */
const MAX_REASK = 2
/** 재질문 사이 최소 간격(ms). 에이전트는 거절당하면 **곧바로 다시 호출**하는 습성이 있어서,
 *  횟수만 세면 2회가 1~2초에 소진되고 그냥 넘어간 것처럼 보인다. 실제로 물어볼 시간을 강제한다. */
const REASK_MIN_GAP = 6000
/** 마지막 재질문 뒤 이만큼은 더 기다린다 — 학생이 답할 시간을 주고 나서야 포기한다. */
const GIVEUP_WAIT = 8000
/** 내용 없는 응답인가 — 학생이 가만히 있으면 STT 가 침묵을 "..." 로 전사해서 보낸다.
 *  그걸 답으로 세면 응답 게이트가 그냥 열린다(실측: 답 안 해도 넘어가던 원인).
 *  문장부호·말줄임·감탄사만 남는 것은 답이 아니다. "네"·"몰라요" 같은 짧은 답은 답으로 센다. */
function isEmptyAnswer(text: string): boolean {
  const t = text.replace(/[\s.,!?~\-·"'’”…‥。]/g, '')
  if (!t) return true                  // "..." 처럼 부호만 남는 것
  return /^[음어아으엄흠허]$/.test(t)   // 한 글자 감탄사 ("네"·"응"·"몰라요"는 답으로 센다)
}

/** 진행 판단을 콘솔에 남긴다 — "왜 넘어갔지"를 눈으로 확인해야 페이싱을 맞출 수 있다.
 *  (프로토타입이라 개발 중엔 켜 둔다. 끄려면 false) */
const PACE_LOG = true

/** 턴 하나를 에이전트 지시(directive)로 — 강사는 이걸 자기 말투로 바꿔 말한다(낭독 금지). */
function directiveOf(turn: Turn): string {
  const todo = INTERACTION_HINT[turn.interaction.kind]
  const it = turn.interaction
  /* ⚠️ 화면에 뜬 질문·선택지를 반드시 같이 준다.
     이게 없으면 에이전트는 자기 나름의 질문을 만들고 화면은 다른 선택지를 띄운다
     — "강사가 묻는 것과 선택지가 안 맞는다"의 원인이었다. */
  const ask = 'prompt' in it ? (it as { prompt?: string }).prompt : undefined
  const choices = it.kind === 'choice'
    ? it.choices.map((c, i) => `${i + 1}) ${c.text}`).join('  ')
    : undefined
  return [
    `[단계] ${turn.stage}`,
    `[이번 턴에 전달할 내용] ${turn.tutor}`,
    ask ? `[학생에게 물을 질문 — 화면에 뜬 문구] ${ask}` : '',
    choices ? `[화면에 뜬 선택지] ${choices}` : '',
    ask || choices
      ? '질문은 화면 문구와 같은 뜻으로 물어라. 화면에 없는 선택지를 새로 만들지 마라.' : '',
    todo ? `[학생이 할 일] ${todo}` : '',
    needsAnswer(turn)
      ? '위 내용만 네 말투로 짧게 전달하고 학생의 반응을 기다려라. 다음 단계로 혼자 넘어가지 마라.'
      // 들려주고 넘어가는 턴 — 대기를 지시하면 음원이 끝나고도 멈춰 있어 답답해진다
      : '위 내용만 네 말투로 짧게 전달하고 멈춰라. 학생에게 질문하지 말고, 다음 단계는 화면이 알아서 넘긴다.',
  ].filter(Boolean).join('\n')
}

/* ── 턴(단계) → 강사 포즈 ──
   스캐폴딩 의미에 맞춰 포즈를 고른다. 강사가 실제로 말하는 중(speaking)이면 입 벌린 설명 포즈로
   맞춰 발화와 그림이 어긋나지 않게 한다. 학생이 말할 차례(쉐도잉·주관식)엔 듣는 자세.
   ※ 지금 이도윤은 2장(calm/talk)뿐이라 폴백상 대부분 두 상태로 수렴하지만, 5포즈가 채워지면
     이 매핑 그대로 세밀해진다. */
function poseForTurn(turn: Turn, speaking: boolean): InstPose {
  const k = turn.interaction.kind
  const s = turn.stage
  if (speaking) return /^S[145]/.test(s) || k === 'mark' || k === 'match' ? 'point' : 'explain'
  if (k === 'shadow' || k === 'subjective') return 'listen'
  if (s.startsWith('S7') || s.includes('표현 정리')) return 'praise'
  if (k === 'mark' || k === 'match' || /^S[145]/.test(s)) return 'point'
  if (turn.no === 0) return 'greeting'
  return 'explain'
}

/* ── 에이전트 그라운딩용 "이번 수업 사실" ──
   /type-lesson은 그동안 에이전트에 단계 지시(turn.tutor)만 줬고 문항의 실제 내용(사진 묘사·보기·정답·근거)은
   안 줬다 → 에이전트가 사진/지문을 지어내거나(할루시네이션), 오답을 교정하지 못했다.
   세션이 붙으면 이 사실 뭉치를 sendContextualUpdate로 한 번 주입해 에이전트를 실제 문항에 묶는다. */
/**
 * @param itemSeq 지금 도는 아이템(레일 한 바퀴). 주면 **그 아이템의 문항·지문만** 넣는다.
 *   강의 하나가 아이템 여러 개(사진 3장·문장 5개)로 돌기 때문에(STEP 4), 전체를 한 번에 주면
 *   에이전트가 지금 화면에 없는 문항 이야기를 한다. 아이템이 넘어갈 때마다 다시 주입한다.
 */
function buildLessonFacts(lesson: TypeLesson, itemSeq?: number): string {
  const c = lesson.content
  const ref = itemSeq != null ? lesson.items?.find((i) => i.seq === itemSeq) : undefined
  const questions = ref ? c.questions.slice(ref.qFrom, ref.qTo) : c.questions
  const passages = ref
    ? (c.passages ?? []).filter((p) => ref.passageIds.includes(p.id))
    : (c.passages ?? [])
  const total = lesson.items?.length ?? 1

  const lines: string[] = [
    '[이번 수업의 실제 자료 — 아래 사실만 근거로 삼는다. 여기 없는 사진·지문 내용을 절대 지어내지 마라.]',
    `유형: Part ${lesson.part} · ${lesson.typeLabel}`,
  ]
  if (ref && total > 1) {
    lines.push(`지금 다루는 것: ${total}개 중 ${ref.seq}번째. 아래 자료만이 지금 화면에 있는 것이다. 이전 문항 이야기로 돌아가지 마라.`)
  }
  const photo = questions.find((q) => q.photo)?.photo ?? c.photo
  if (photo) lines.push(`사진 속 내용: ${c.photoDesc ?? '(설명 없음 — 사진 세부를 임의로 단정하지 말고 학생 관찰을 따라가라)'}`)
  for (const p of passages) {
    const body = p.sentences?.map((s) => s.en).join(' ') ?? ''
    if (body) lines.push(`지문(${p.label ?? p.kind}): ${body}`)
  }
  questions.forEach((q, i) => {
    lines.push(`문항 ${i + 1}: ${q.q}`)
    q.options.forEach((o) =>
      lines.push(`  ${o.label}) ${o.text}${o.correct ? ' ← 정답' : ''}${o.why ? `  (${o.why})` : ''}`))
  })
  lines.push('규칙: 학생이 오답을 고르면 정답을 바로 말하지 말고 위 근거로 왜 틀렸는지 짚고 다시 생각하게 하라. 학생이 물으면 위 사실 범위에서 답하라. 사실에 없는 건 모른다고 하라.')
  return lines.join('\n')
}

/* 강사 발화 → UI에 짧게: 대본 통짜 대신 핵심 첫 문장 1개만 (음성은 전체 발화 유지) */
function keySentence(t: string): string {
  const m = t.match(/^[\s\S]*?[.!?。](?=\s|$)/)
  return (m ? m[0] : t).trim()
}

/* 단계명(S코드/Q번호 접두어)에서 사람이 읽을 라벨만 뽑는다. 남는 게 'S2+S4'처럼 코드성이면 버린다 —
   그런 조각은 노트 제목으로 노출하기엔 의미가 없다. */
function cleanStageLabel(stage: string): string | null {
  const s = stage
    .replace(/^S\d+(\+S\d+)*\s*/, '')
    .replace(/^Q\d+\s*·\s*/, '')
    .replace(/\s*·\s*S\d+(\/S\d+)*$/, '')
    .trim()
  if (!s || /^S\d/.test(s)) return null
  return s
}

/* S1~S7은 스캐폴딩 시트 전체에서 공통된 의미(관찰→유형판별→코칭→구조파악→정답연결→오답제거→정리)를 갖는다
   — 유형마다 다른 소재라도 "이 단계에서 뭘 하는지"는 재사용 가능. 강사가 실제로 할 구체적 설명·질문은
   여기 없다(강사 에이전트가 대화로 전달할 몫), 대신 그 단계의 일반적인 접근 방법을 불릿으로 안내한다. */
const S_HEADING: Record<string, string> = {
  '1': '핵심 단서 찾기', '2': '유형 파악', '3': '개념·표현 확인', '4': '구조 파악·읽기',
  '5': '정답 연결', '6': '오답 제거', '7': '핵심 정리',
}
/* S코드가 없는 자유 단계명(Q번호 진행, 실전형 등)은 인터랙션 종류 기준으로 대체 */
const KIND_HEADING: Record<Interaction['kind'], string> = {
  next: '다음으로', choice: '선택해 보기', pickAnswer: '정답 고르기', solveAll: '문제 풀기',
  subjective: '생각 말하기', mark: '단서 찾기', shadow: '따라 말하기', match: '근거 연결',
}

/* 단계 표시용 사람이 읽을 라벨 — TutorNote 헤딩과 같은 규칙(단계명 → S헤딩 → 인터랙션 헤딩) */
function stageHeading(turn: Turn): string {
  const sNum = turn.stage.match(/^S(\d)/)?.[1]
  return cleanStageLabel(turn.stage) ?? (sNum ? S_HEADING[sNum] : undefined) ?? KIND_HEADING[turn.interaction.kind]
}

/* 생성된 mp3 경로 — scripts/gen_type_lesson_audio.mjs가 만든 매니페스트.
   없는 단위는 src가 undefined가 되고, voice.ts가 브라우저 TTS로 폴백한다. */
const srcOf = (lessonId: string, id: string): string | undefined =>
  (audioManifest as Record<string, string>)[`${lessonId}/${id}`]

/* 보기 음원은 DB 행(content.questions[].options[].audio)이 매니페스트보다 우선한다.
   매니페스트는 로컬 샘플 대본으로 만든 것이라, DB 문항으로 갈아끼운 화면에서는 소리가 어긋난다. */
function optionSrc(lesson: TypeLesson, id: string): string | undefined {
  const q = id.match(/^qaudio:(\d+)$/)          // 문항 통음원 (실제 시험처럼 보기 4개 연속)
  if (q) return lesson.content.questions[Number(q[1])]?.audio
  const m = id.match(/^opt:(\d+):(.+)$/)
  if (!m) return undefined
  return lesson.content.questions[Number(m[1])]?.options.find((o) => o.label === m[2])?.audio
}

/** 문장 음원 (DB `passage_sentences.audio_url`) — LC 질문 발화·대화·담화가 여기서 나온다.
 *  이게 없어서 보기는 성우인데 **문제 음원만 브라우저 TTS**로 나갔다. */
function sentenceSrc(lesson: TypeLesson, id: string): string | undefined {
  const inScript = lesson.content.audioScript?.find((s) => s.id === id)?.audio
  if (inScript) return inScript
  for (const p of lesson.content.passages ?? []) {
    const hit = p.sentences?.find((s) => s.id === id)?.audio
    if (hit) return hit
  }
  return undefined
}

/** 재생 아이템에 mp3 경로를 붙인다 (DB 음원 → 매니페스트 → 없으면 브라우저 TTS) */
const withSrc = (lesson: TypeLesson, items: { id: string; text: string }[]) =>
  items.map((it) => ({
    ...it,
    src: optionSrc(lesson, it.id) ?? sentenceSrc(lesson, it.id) ?? srcOf(lesson.id, it.id),
  }))

/* 음원 지시 → 재생 아이템 목록 */
function cueItems(lesson: TypeLesson, cue: AudioCue): { id: string; text: string; src?: string }[] {
  return withSrc(lesson, rawCueItems(lesson, cue))
}

function rawCueItems(lesson: TypeLesson, cue: AudioCue): { id: string; text: string }[] {
  const script = lesson.content.audioScript ?? []
  switch (cue.kind) {
    case 'sentences':
      return script.filter((s) => cue.ids.includes(s.id)).map((s) => ({ id: s.id, text: s.en }))
    case 'full':
      return script.map((s) => ({ id: s.id, text: s.en }))
    case 'option': {
      const o = lesson.content.questions[cue.qIdx]?.options.find((x) => x.label === cue.label)
      return o ? [{ id: `opt:${cue.qIdx}:${o.label}`, text: `${o.label}. ${o.text}` }] : []
    }
    case 'options': {
      const q = lesson.content.questions[cue.qIdx]
      return cue.labels
        .map((l) => q?.options.find((x) => x.label === l))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ id: `opt:${cue.qIdx}:${o.label}`, text: `${o.label}. ${o.text}` }))
    }
    /* 발화 + 보기 — Part2 는 실제 시험에서 질문 발화 뒤에 보기가 이어진다.
       두 재료가 다른 표(passage_sentences / question_options)에 있어서 여기서 이어 붙인다. */
    case 'mix': {
      const q = lesson.content.questions[cue.qIdx]
      return [
        ...script.filter((s) => cue.ids.includes(s.id)).map((s) => ({ id: s.id, text: s.en })),
        ...cue.labels
          .map((l) => q?.options.find((x) => x.label === l))
          .filter((o): o is NonNullable<typeof o> => !!o)
          .map((o) => ({ id: `opt:${cue.qIdx}:${o.label}`, text: `${o.label}. ${o.text}` })),
      ]
    }
  }
}

const PRIMARY_BTN = 'px-6 py-3 rounded-xl bg-[#2563EB] text-white text-[14px] font-bold hover:bg-[#1D4ED8] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed'

/* ── 4단계(도입·수업·실전·정리) 매핑 ──
   시트 스캐폴딩 레일(턴)을 4개 매크로 단계로 접는다. 레일 순서가 유형마다 달라
   (예: Part3은 실전 풀이 후 문항별 수업 복습) 현재 턴 기준으로 어느 단계인지만 표시한다. */
type Macro = '수업' | '실전' | '정리'
function macroOf(t: Turn): Macro {
  const s = t.stage
  const k = t.interaction.kind
  if (s.includes('표현 정리') || s.startsWith('S7')) return '정리'
  if (k === 'solveAll' || k === 'pickAnswer' || s.includes('정답 선택') || s.includes('답 선택') || s.includes('전체 듣기')) return '실전'
  return '수업'
}
const MACRO_IDX: Record<Macro, number> = { 수업: 1, 실전: 2, 정리: 3 }

/* 상단 4단계 스텝퍼 (Part6 화면과 동일 톤) */
function PhaseStepper({ active, onEnd, extra }: { active: number; onEnd: () => void; extra?: ReactNode }) {
  const labels = ['도입', '수업', '실전', '정리']
  return (
    <div className="flex items-center justify-between gap-2 px-3 md:px-6 py-2.5 md:py-3 bg-white border-b border-[#EBEBF0] shrink-0">
      <button onClick={onEnd} className="p-1 shrink-0" aria-label="나가기">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-1 md:gap-2 shrink-0">
            <div className={`px-2.5 py-1 md:px-4 md:py-1.5 rounded-full text-[11px] md:text-[14px] font-bold whitespace-nowrap ${i === active ? 'bg-[#2563EB] text-white' : i < active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{label}</div>
            {i < labels.length - 1 && <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 shrink-0"><path d="M9 18l6-6-6-6" /></svg>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 shrink-0">{extra}</div>
    </div>
  )
}

/* 스캐폴딩 레일 — 턴별 단계(S코드)를 칩으로. 현재=파랑, 완료=초록. 칩을 탭하면 그 턴으로 바로 이동한다
   (원래는 강사 에이전트 발화로 자동 전환될 예정 — 지금은 UI 확인용으로 수동 이동만 구현).
   스크롤바 숨기고 포인터 드래그(터치/마우스)로 좌우 이동

   **기본은 접혀 있다.** 칩을 전부 펼쳐두면 학생 화면 위쪽을 레일이 차지하는데, 학생이 볼 것은
   지금 어느 단계인지 하나뿐이다. 접힌 줄에도 현재 단계명과 n/총은 남겨서 위치는 늘 보인다.
   펼치면 전체 레일 + 턴 점프가 나온다(검토·시연용). */
function ScaffoldRail({ turns, turnIdx, onJump }: { turns: Turn[]; turnIdx: number; onJump: (i: number) => void }) {
  const [open, setOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; left: number; dragging: boolean; pointerId: number } | null>(null)
  const DRAG_THRESHOLD = 6 // px — 이보다 적게 움직이면 드래그가 아니라 칩 탭(클릭)으로 본다
  const onDown = (e: ReactPointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    dragRef.current = { x: e.clientX, left: el.scrollLeft, dragging: false, pointerId: e.pointerId }
    // 여기서 바로 setPointerCapture를 걸면 마우스로 살짝만 눌러도 캡처가 칩 버튼 대신 이 컨테이너로
    // 넘어가면서 버튼의 click이 씹힌다 — 실제로 드래그가 시작될 때(onMove에서 임계값 넘을 때)만 건다.
  }
  const onMove = (e: ReactPointerEvent) => {
    const el = scrollRef.current
    const d = dragRef.current
    if (!el || !d) return
    const dx = e.clientX - d.x
    if (!d.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      d.dragging = true
      try { (e.currentTarget as HTMLElement).setPointerCapture(d.pointerId) } catch { /* noop */ }
    }
    el.scrollLeft = d.left - dx
  }
  const onUp = () => { dragRef.current = null }
  return (
    <div className="bg-[#F7FAFF] border-b border-[#E5EDFA] shrink-0">
      {/* 접힘 줄 — 항상 보인다. 통째로 토글 버튼이라 어디를 눌러도 열린다 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 md:px-5 py-1.5 text-left hover:bg-[#EEF4FF] transition-colors"
      >
        <span className="text-[10px] font-black text-[#94A3B8] tracking-wide shrink-0">스캐폴딩</span>
        {!open && turns[turnIdx] && (
          <span className="text-[11px] font-bold text-[#2563EB] truncate">{turns[turnIdx].stage}</span>
        )}
        <span className="ml-auto text-[10px] font-bold text-[#94A3B8] shrink-0 tabular-nums">
          {turnIdx + 1}/{turns.length}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div ref={scrollRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          className="px-3 md:px-5 pb-2 overflow-x-auto cursor-grab active:cursor-grabbing select-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5 min-w-max">
            {turns.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => onJump(i)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  i === turnIdx ? 'bg-[#2563EB] text-white'
                    : i < turnIdx ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]'
                      : 'bg-white border border-gray-200 text-gray-400 hover:border-[#93C5FD] hover:text-[#2563EB]'
                }`}>{t.stage}</button>
                {i < turns.length - 1 && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* 재생 중인 항목 라벨 (선택지/화자/음원) */
function playbackLabel(lesson: TypeLesson, id: string): string {
  const m = id.match(/^opt:(\d+):(.+)$/)
  if (m) return `선택지 ${m[2]}`
  const s = lesson.content.audioScript?.find((x) => x.id === id)
  if (s?.speaker) return s.speaker === 'W' ? '여자 음성' : '남자 음성'
  return '음원'
}

/* 전체 음원 = 스크립트 문장 + (보기가 음성인 유형은) 1번 문항의 보기들.
   P1은 스크립트가 없고 보기 4개가 곧 음원, P2는 질문 1문장 + 응답 3개, P3·P4는 대화/담화 스크립트. */
function fullAudioItems(lesson: TypeLesson): { id: string; text: string; src?: string }[] {
  const items = (lesson.content.audioScript ?? []).map((s) => ({ id: s.id, text: s.en }))
  if (lesson.content.optionAudio) {
    for (const o of lesson.content.questions[0]?.options ?? []) {
      items.push({ id: `opt:0:${o.label}`, text: `${o.label}. ${o.text}` })
    }
  }
  return withSrc(lesson, items)
}

/* ── 전체 음원 재생 바 (LC) ──
   1차 청취(문제 푸는 단계) 중에는 학생이 조작할 수 없고, 1차 청취가 끝나야 재생·멈춤·이동이 열린다.
   ⚠️ 지금 음원은 브라우저 TTS라 임의 위치 탐색(seek)이 불가능하다 — 바를 문장 단위 세그먼트로 쪼개
   "그 문장부터 다시 재생"으로 근사한다. 문장별 mp3로 바꿀 때 실제 탐색으로 교체할 것. */
function AudioBar({ items, unlocked, playing, idx, onPlay, onPause, onSeek }: {
  items: { id: string; text: string }[]
  unlocked: boolean
  playing: boolean
  idx: number
  onPlay: (from: number) => void
  onPause: () => void
  onSeek: (i: number) => void
}) {
  return (
    <div className="shrink-0 px-3 md:px-6 pt-3">
      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
        unlocked ? 'border-[#BFDBFE] bg-[#F8FAFF]' : 'border-[#E5E7EB] bg-[#FAFAFA]'
      }`}>
        <button
          disabled={!unlocked}
          onClick={() => (playing ? onPause() : onPlay(playing ? idx : idx >= items.length - 1 ? 0 : idx))}
          aria-label={playing ? '멈춤' : '전체 음원 재생'}
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            unlocked ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]' : 'bg-[#E5E7EB] text-[#B0B7C3] cursor-not-allowed'
          }`}>
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-0.5"><polygon points="6 4 20 12 6 20 6 4" /></svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[3px]">
            {items.map((it, i) => (
              <button key={it.id} disabled={!unlocked} onClick={() => onSeek(i)}
                aria-label={`${i + 1}번째 구간부터 듣기`}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  !unlocked ? 'bg-[#E5E7EB] cursor-not-allowed'
                    : i < idx ? 'bg-[#93C5FD] hover:bg-[#60A5FA] cursor-pointer'
                    : i === idx ? 'bg-[#2563EB] cursor-pointer'
                    : 'bg-[#DBEAFE] hover:bg-[#BFDBFE] cursor-pointer'
                }`} />
            ))}
          </div>
          {!unlocked && (
            <p className="text-[10px] font-semibold text-[#9CA3AF] mt-1">1차 청취 중에는 조작할 수 없어요</p>
          )}
        </div>

        <span className={`shrink-0 text-[10px] font-bold tabular-nums ${unlocked ? 'text-[#2563EB]' : 'text-[#B0B7C3]'}`}>
          {Math.min(idx + 1, items.length)} / {items.length}
        </span>
      </div>
    </div>
  )
}

/* ── 음원 재생 바 — 듣기 중 오른쪽 영역에 시각 표시(이퀄라이저) ── */
function PlaybackBar({ label, onReplay }: { label: string; onReplay?: () => void }) {
  return (
    <div className="px-4 md:px-6 pb-1 shrink-0">
      <div className="flex items-center gap-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-3.5 py-2.5 shadow-[0_1px_8px_rgba(37,99,235,0.08)]">
        <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-[#1D4ED8] mb-1.5 truncate">음원 재생 중 · {label}</p>
          <div className="flex items-end gap-[3px] h-3.5">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} className="flex-1 max-w-[5px] h-full rounded-full bg-[#2563EB] origin-bottom animate-eq"
                style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
        {onReplay && (
          <button onClick={onReplay} aria-label="다시 듣기"
            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#2563EB] border border-[#BFDBFE] bg-white rounded-lg px-2.5 py-1.5 hover:bg-[#EFF6FF]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            다시
          </button>
        )}
      </div>
    </div>
  )
}

/* ── 콘텐츠 액션 안내 — 지문/문항에서 직접 할 일(단어 마킹·정답 선택·전체 풀기·근거 연결)을
   콘텐츠(지문/문항) 바로 위에 작게 띄운다. 강사 설명 영역에서 뺀 지시가 여기로 온다.
   실제 상호작용은 지문/문항에서 일어나므로, 지시도 그 옆에 있는 게 맞다. */
function ContentActionHint({ turn, lesson, answers, graded, matchTapped }: {
  turn: Turn; lesson: TypeLesson
  answers: Record<number, string>; graded: Set<number>; matchTapped: Set<string>
}) {
  const it = turn.interaction
  let icon = ''
  let text = ''
  let sub = ''
  let done = false
  if (it.kind === 'mark') {
    icon = '🖍️'; text = it.prompt; sub = '지문에서 단어를 탭하면 형광펜'
  } else if (it.kind === 'pickAnswer') {
    done = graded.has(it.qIdx)
    icon = '🎯'; text = it.prompt ?? '위 문항의 보기에서 정답을 선택하세요'
    sub = done ? '정답 선택 완료' : `Q${it.qIdx + 1} 보기를 탭하세요`
  } else if (it.kind === 'solveAll') {
    const total = lesson.content.questions.length
    const answered = lesson.content.questions.filter((_, i) => answers[i]).length
    done = answered === total
    icon = '✍️'; text = it.prompt ?? '모든 문항의 답을 선택하세요'; sub = `${answered}/${total} 선택`
  } else if (it.kind === 'match') {
    const totalTargets = it.evidence.reduce((n, ev) => n + ev.targetIds.length, 0)
    const matched = it.evidence.reduce((n, ev) => n + ev.targetIds.filter((tid) => matchTapped.has(`${ev.passageId}:${tid}`)).length, 0)
    done = matched >= totalTargets
    icon = '🔗'; text = it.prompt; sub = done ? '근거 모두 연결됨' : `근거 ${matched}/${totalTargets}`
  } else {
    return null
  }
  return (
    <div className={`shrink-0 mx-3 md:mx-6 mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${
      done ? 'border-[#86EFAC] bg-[#F0FDF4]' : 'border-[#FDBA74] bg-[#FFF7ED]'
    }`}>
      <span className="text-[13px] shrink-0">{icon}</span>
      <span className={`text-[12px] font-bold truncate ${done ? 'text-[#15803D]' : 'text-[#C2410C]'}`}>{text}</span>
      {sub && <span className={`ml-auto shrink-0 text-[11px] font-semibold ${done ? 'text-[#16A34A]' : 'text-[#9A3412]'}`}>{sub}</span>}
    </div>
  )
}

export default function TypeLessonPlayer({ lesson, instructor = RAIL_OWNER, rail, lectureCode, draftId, preparing }: {
  lesson: TypeLesson
  instructor?: string
  /** DB 레일로 돌 때의 해석 결과 — 넘기면 좌하단에 검토 패널이 뜬다 (콘텐츠팀 확인용) */
  rail?: { diags: RailDiag[]; source: string; generated?: Record<number, string>; status?: string }
  /** 대사 생성이 아직 안 끝났는가 — 끝나기 전에 수업을 시작하면 옛 문구를 말한다 */
  preparing?: boolean
  /** 강의 코드. 넘기면 학습 로그를 남긴다(STEP 6). 없으면 기록하지 않는다 */
  lectureCode?: string
  /** 레일 편집기 드래프트로 열렸는가 — 배너를 띄운다. 정본과 헷갈리면 안 된다 */
  draftId?: string | null
}) {
  const router = useRouter()
  const turns = lesson.turns
  const [turnIdx, setTurnIdx] = useState(0)
  const turnIdxRef = useRef(0)              // clientTool은 최신 turnIdx를 ref로 읽는다(클로저 고정 방지)
  turnIdxRef.current = turnIdx
  /* ⚠️ turns 도 ref 로 읽는다. lesson 은 화면이 뜬 뒤에도 **여러 번 갈린다**
     (정적 폴백 → DB 아이템 조립 → LLM 학생문구 반영). 에이전트 clientTool 이 잡은 클로저는
     세션 시작 시점 배열이라, 그걸 쓰면 "S1(필기)" 인데 폴백 레일의 다른 종류로 판정돼
     응답 게이트가 그냥 열린다 — 실제로 그렇게 새고 있었다. */
  const turnsRef = useRef(turns)
  turnsRef.current = turns
  /* 음원을 끝까지 들려준 턴 번호. next_step이 "음원 있는 단계"를 다 재생하기 전에 넘어가지 못하게 막는다
     (에이전트가 여러 단계를 몰아 말하며 next_step을 연달아 부를 때 듣기 음원이 스킵되던 문제 방지). */
  const audioDoneRef = useRef<Set<number>>(new Set())
  /* 학생이 응답한 턴 번호 — 말/타이핑(onMessage)과 화면 행동(reportAction) 둘 다 응답으로 센다.
     "사진에 뭐가 보이는지 말해봐" 같은 턴을 응답 없이 넘어가지 않게 하는 근거. */
  const respondedRef = useRef<Set<number>>(new Set())
  /* 턴별로 "다시 물어본" 횟수. MAX_REASK 를 넘으면 더 붙잡지 않는다 —
     못 하는 학생을 무한히 세워두는 게 더 나쁘다(정답·근거를 보여주고 진행). */
  const reaskRef = useRef<Map<number, number>>(new Map())
  /** 그 턴에서 마지막으로 "다시 물어라"를 돌려준 시각 — 재호출 폭주로 횟수가 날아가는 걸 막는다 */
  const reaskAtRef = useRef<Map<number, number>>(new Map())
  /** 화면 표시용 재질문 횟수 (ref 는 리렌더를 안 일으켜서 별도 state) */
  const [reaskShown, setReaskShown] = useState(0)
  /** 학생 답에 강사가 실제로 반응한 턴 — 답만 들어왔다고 바로 넘기면 수업이 아니라 통과의식이다 */
  const agentReactedRef = useRef<Set<number>>(new Set())

  /* 강사 = 온보딩 선택(페이지가 내려줌). 레일은 이도윤 ver 한 벌이라 짚는 순서는 동일하고,
     목소리·얼굴·화법만 갈린다. 전용 에이전트가 없는 강사는 박혜원 에이전트로 폴백. */
  const teacherName = INST_NAME[instructor] ?? INST_NAME[RAIL_OWNER]
  const teacherImg = INST_THUMBS[instructor] ?? INST_THUMBS[RAIL_OWNER]
  const agentId = tutorAgentFor(instructor)
  const profile = useOnboardingStore()
  /* 'wrap' = 세션 전체 정리(4단계 프레임의 마지막 단계, 실전 이후) — 수업 중 S7 "표현 정리" 턴과는
     별개 화면이다. 그건 수업 워크스루의 마지막 코칭 포인트일 뿐, 세션 전체 정리가 아니다. */
  const [phase, setPhase] = useState<'lesson' | 'practice' | 'wrap' | 'done'>('lesson')
  const [practiceScore, setPracticeScore] = useState<{ correct: number; total: number } | null>(null)
  const turn: Turn = turns[Math.min(turnIdx, turns.length - 1)]

  /* 진행 상태 */
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const [tutorMarks, setTutorMarks] = useState<Set<string>>(new Set())
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState<Set<number>>(new Set())
  const [answeredQ, setAnsweredQ] = useState<Set<number>>(new Set()) // pickAnswer로 텍스트 공개된 문항
  const [showKo, setShowKo] = useState(false)
  const [started, setStarted] = useState(false)            // 도입(LessonIntro) → 수업 진입 여부
  /* 강사 창 크기 — 사이드바(기본) ⇄ 모달창 ⇄ 작은 창. 강사 말·단계 내용·상호작용·대화가 한 흐름으로 이 창 안에 있다 */
  const [dockMode, setDockMode] = useState<DockMode>('sidebar')
  const feedRef = useRef<HTMLDivElement>(null)   // 대화 흐름 — 새 발화·새 단계가 오면 아래로 따라간다
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('voice')
  const [inputText, setInputText] = useState('')
  const [chatLog, setChatLog] = useState<{ role: 'ai' | 'user'; text: string }[]>([])

  /* ── 강사 에이전트 (일레븐랩스) ──
     진행 주체는 에이전트다: 학생이 답하면 에이전트가 next_step을 호출 → 여기서 턴을 한 칸 넘기고
     다음 턴 지시를 돌려준다. 화면(강사 패널·공개 범위·레일 위치)은 전부 turnIdx에서 파생되므로
     턴만 움직이면 자동으로 따라온다.
     에이전트에 연결하지 않으면 기존 방식(브라우저 TTS + 단계 버튼 클릭)이 그대로 폴백으로 남는다. */
  const conversation = useConversation({
    micMuted: chatMode === 'text',
    onMessage: (p: { source: string; message: string }) => {
      /* 우리가 에이전트에 밀어넣은 지시([학생 행동]·[진행])는 user 메시지로 되돌아올 수 있다.
         그걸 학생 응답으로 세면 응답 게이트가 그냥 열린다 → 되돌아온 것은 응답으로 세지 않고
         화면 대화에도 안 띄운다. */
      const injected = injectedRef.current.has(p.message)
      if (injected) { injectedRef.current.delete(p.message); return }
      const cur = turnIdxRef.current
      if (p.source === 'user') {
        /* 침묵이 "..." 로 전사돼 오는 걸 답으로 세면 안 된다 — 그게 게이트가 열리던 원인 */
        if (isEmptyAnswer(p.message)) {
          if (PACE_LOG) console.log('[pace] 빈 응답 무시', cur, JSON.stringify(p.message))
          return
        }
        // 답이 들어왔다 = 응답 있음. 단, 강사가 그 내용에 반응하기 전에는 진행을 막는다(아래 게이트)
        respondedRef.current.add(cur)
        agentReactedRef.current.delete(cur)
        if (PACE_LOG) console.log('[pace] 응답 인식', cur, p.message.slice(0, 20))
      } else if (respondedRef.current.has(cur)) {
        // 강사가 학생 답 뒤에 말을 했다 = 그 답에 반응했다 → 이제 다음 단계로 가도 된다
        agentReactedRef.current.add(cur)
      }
      setChatLog((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }])
    },
    clientTools: {
      next_step: async () => {
        const cur = turnIdxRef.current
        /* 게이트: 이 단계에 음원이 있는데 아직 다 안 들려줬으면 넘어가지 않는다 —
           음원은 앱이 "턴에 진입할 때" 재생하는데, 에이전트가 그 전에 next_step을 부르면
           듣기 음원이 스킵된다. 다 들려준 뒤(다음 호출)에야 전진하게 막는다. */
        const live = turnsRef.current            // 낡은 클로저의 turns 를 쓰면 판정이 틀린다(위 주석)
        const curTurn = live[cur]
        if (PACE_LOG) console.log('[pace] next_step 요청', cur, curTurn?.stage,
          curTurn?.interaction.kind, needsAnswer(curTurn ?? live[0]) ? '응답대기턴' : '들려주는턴',
          respondedRef.current.has(cur) ? '응답있음' : '응답없음')
        if (curTurn?.audio && !audioDoneRef.current.has(cur)) {
          return needsAnswer(curTurn)
            ? '지금 이 단계의 음원을 아직 다 들려주지 않았다. 다음 단계로 넘어가지 말고, 음원이 끝나고 학생이 답할 때까지 짧게 기다려라.'
            // 들려주고 넘어가는 턴 — 여기서 "답을 기다려라"고 하면 답할 게 없는데 멈춰 있게 된다
            : '지금 이 단계의 음원을 아직 다 들려주지 않았다. 음원이 끝날 때까지 조용히 기다렸다가 다음 단계로 넘어가라.'
        }

        /* ── 응답 게이트 ──
           "사진에 뭐가 보이는지 말해봐" 처럼 학생이 할 일이 있는 턴은, 응답이 없으면 넘기지 않는다.
           대신 **최대 MAX_REASK 번까지만** 다시 묻게 하고, 그래도 없으면 정답·근거를 보여주며 진행한다.
           (무한히 되묻는 것도, 대답 안 했는데 넘어가는 것도 둘 다 수업이 아니다) */
        /* 답은 들어왔지만 강사가 아직 그 내용에 반응하지 않았다 → 반응이 먼저다.
           (답이 오면 곧바로 다음 단계로 가버리면, 학생 말을 듣고도 무시하는 수업이 된다) */
        if (curTurn && needsAnswer(curTurn) && respondedRef.current.has(cur)
            && !agentReactedRef.current.has(cur)) {
          if (PACE_LOG) console.log('[pace] 반응 먼저 — 진행 보류', cur)
          return '학생이 방금 답했다. 다음 단계로 넘어가기 전에 **그 답 내용에 먼저 반응하라** — 맞으면 근거를 한 줄 확인하고, 틀리거나 어긋나면 정답을 말하지 말고 무엇이 어긋났는지 짚어라.'
        }

        const waiting = !!curTurn && needsAnswer(curTurn) && !respondedRef.current.has(cur)
        let gaveUp = false
        if (waiting) {
          const used = reaskRef.current.get(cur) ?? 0
          const since = Date.now() - (reaskAtRef.current.get(cur) ?? 0)
          const REASK = [
            '학생이 아직 답하지 않았다. 다음 단계로 넘어가지 마라. 같은 것을 더 쉽게, 한 문장으로 다시 물어라.',
            '학생이 여전히 답하지 않았다. 다음 단계로 넘어가지 마라. 답의 방향을 알려주는 힌트를 하나 주고 마지막으로 한 번만 더 물어라.',
          ]
          if (used >= MAX_REASK && since >= GIVEUP_WAIT) {
            gaveUp = true                       // 두 번 물었고 기다릴 만큼 기다렸다 → 답을 짚어주고 진행
          } else if (since < (used >= MAX_REASK ? GIVEUP_WAIT : REASK_MIN_GAP)) {
            /* 방금 거절했는데 또 부른 것 — 횟수를 소진시키지 않는다.
               (이 재호출을 세면 재질문 2회가 1~2초에 날아가 "그냥 넘어간다"가 된다) */
            return `아직 학생의 답을 기다리는 중이다. 다음 단계로 넘어가지 마라. ${REASK[Math.min(used, 1)]}`
          } else {
            reaskRef.current.set(cur, used + 1)
            reaskAtRef.current.set(cur, Date.now())
            setReaskShown(used + 1)
            return REASK[Math.min(used, 1)]
          }
        }

        if (cur >= live.length - 1) {
          stopVoice()
          setPhase('practice')
          return (gaveUp ? '학생이 끝내 답하지 않았다. 답과 근거를 한 문장으로 짚어 준 다음, ' : '')
            + '수업 단계가 끝났다. 학생에게 이제 실전 문제를 풀어보자고 짧게 말하고 멈춰라.'
        }
        const nextIdx = cur + 1
        setTurnIdx(nextIdx)
        if (PACE_LOG) console.log('[pace] 에이전트 진행', cur, '→', nextIdx, gaveUp ? '(응답 없이 포기)' : '')
        const next = directiveOf(live[nextIdx])
        return gaveUp
          ? '학생이 끝내 답하지 않았다. 이번 단계의 답과 근거를 한 문장으로 짚어 주고(혼내지 말고), 바로 아래 단계로 넘어가라.\n' + next
          : next
      },
    },
  })
  const agentConnected = conversation.status === 'connected'
  const agentConnecting = conversation.status === 'connecting'
  const agentOnRef = useRef(false)        // 턴 효과가 에이전트 발화를 기다릴지 판단
  agentOnRef.current = agentConnected
  const agentSpeakingRef = useRef(false)  // 매 렌더 최신 발화 상태 반영 (음원 겹침 방지용)
  agentSpeakingRef.current = conversation.isSpeaking

  const startAgent = () => {
    setChatLog([])
    conversation.startSession({
      agentId,
      dynamicVariables: buildTutorVars(profile, {
        study_range: `${lesson.partName} · ${lesson.typeLabel}`,
        /* 첫 마디는 프롬프트상 "그대로 말한다" — 지시문(directiveOf)을 넣으면 메타 지시까지 읽어버린다.
           그래서 여기에는 0번 턴의 강사 발화 원문(=자연스러운 말)만 넣는다.
           1번 턴부터는 next_step 반환값으로 지시를 주고, 에이전트가 자기 말투로 바꿔 말한다. */
        instructor_greeting: turns[0].tutor,
      }),
    }).catch(() => {})
  }
  const endAgent = () => { try { conversation.endSession() } catch { /* noop */ } }
  useEffect(() => () => { try { conversation.endSession() } catch { /* noop */ } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* 수업 화면 진입(도입에서 "수업 시작" 클릭 → started=true) 시 강사 대화를 자동으로 시작한다.
     그 클릭이 사용자 제스처라 세션 시작/마이크 권한이 허용된다. 이미 연결 중/연결됨이면 건드리지 않고,
     started는 세션 동안 한 번만 true로 바뀌므로 "다시 해보기"로 재시작해도 중복 연결되지 않는다.
     (학생이 직접 '대화 종료'를 누른 경우엔 이 효과가 다시 안 돌아 자동 재연결도 없다) */
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (!started || autoStartedRef.current) return
    if (conversation.status !== 'disconnected') return
    autoStartedRef.current = true
    startAgent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  /* ── 비언어 행동을 강사 에이전트에 전달 ──
     음성/텍스트만이 아니라 화면에서 한 행동(보기 선택·정답 선택·단어 마킹·근거 연결)도 '학생의 응답'으로
     에이전트에 보내야, 에이전트가 그걸 인식해 반응하고 next_step으로 스캐폴딩을 진행한다.
     연결 전이면 무시(그땐 수동 진행). key로 같은 행동의 중복 전송을 막는다(예: 마킹이 조금씩 완성될 때). */
  const reportedRef = useRef<Set<string>>(new Set())
  /** 우리가 에이전트에 밀어넣은 메시지 원문 — onMessage 로 되돌아왔을 때 걸러낸다 */
  const injectedRef = useRef<Set<string>>(new Set())
  const sendToAgent = (text: string) => {
    injectedRef.current.add(text)
    try {
      (conversation as unknown as { sendUserMessage?: (t: string) => void }).sendUserMessage?.(text)
    } catch { /* noop */ }
  }
  const reportAction = (key: string, message: string) => {
    // 화면 행동도 응답이다 — 보기 선택·마킹·근거 연결을 하고도 "안 답했다"로 보면 안 된다
    respondedRef.current.add(turnIdxRef.current)
    if (PACE_LOG) console.log('[pace] 화면 행동 = 응답', turnIdxRef.current, key)
    if (!agentConnected || reportedRef.current.has(key)) return
    reportedRef.current.add(key)
    /* 에이전트에만 보낸다 — 이 지시형 메시지는 화면 "내 답변"에 노출하지 않는다
       (sendToAgent 가 원문을 기억해 두고, onMessage 로 되돌아오면 걸러낸다). */
    sendToAgent(message)
  }
  /* 행동 → 에이전트 지시형 메시지. 결과(정/오답)와 근거를 함께 줘서, 오답이면 "좋아요"가 아니라
     실제로 교정하게 만든다. (정답은 짧게 칭찬, 오답은 정답 노출 없이 왜 틀렸는지 짚기) */
  const actionMessage = (label: string, ok?: boolean, reason?: string) => {
    if (ok === true) return `[학생 행동] ${label} — 정답이다. 짧게 칭찬하고 근거 한 줄만 확인해 줘라.`
    if (ok === false) return `[학생 행동] ${label} — 오답이다. 정답을 바로 알려주지 말고, 왜 틀렸는지 짚어주고 다시 생각하게 하라.${reason ? ` 참고 근거(원문): "${reason}"` : ''}`
    return `[학생 행동] ${label} 이 행동에 맞춰 짧게 반응하라.`
  }

  /* "이번 수업의 실제 사실"을 주입 — 에이전트가 사진/지문을 지어내지 않고
     오답을 실제 근거로 교정하게 한다(Contextual Update: 화면·음성엔 안 나오는 귓속말).
     세션이 붙을 때 한 번, 그리고 **아이템이 넘어갈 때마다 다시**(STEP 4).
     아이템 순회 전에는 주입이 1회뿐이었는데, 강의 하나가 사진 3장·문장 5개로 도는 지금은
     그러면 에이전트가 2번째 바퀴에서도 1번째 사진 이야기를 한다. */
  const curItemSeq = turn.itemSeq
  const factsSentRef = useRef<string | null>(null)
  useEffect(() => {
    if (!agentConnected) { factsSentRef.current = null; return }
    const key = String(curItemSeq ?? 'all')
    if (factsSentRef.current === key) return
    factsSentRef.current = key
    try {
      ;(conversation as unknown as { sendContextualUpdate?: (t: string) => void })
        .sendContextualUpdate?.(buildLessonFacts(lesson, curItemSeq))
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentConnected, curItemSeq])

  /* ── 학습 로그 (STEP 6) ──
     이게 없으면 FGI를 돌려도 "어느 변종을 몇 번째 바퀴에 받았을 때 맞췄나"가 안 남아
     스캐폴딩이 통하는지(H3)를 사후에 볼 수 없다. 기록 실패는 수업을 막지 않는다. */
  const log = useLessonLog(lesson, lectureCode, instructor, phase === 'practice' ? 'practice' : 'lesson')
  const turnEnteredAtRef = useRef<number>(Date.now())
  useEffect(() => {
    if (!log.ready || !started) return
    turnEnteredAtRef.current = Date.now()
    log.turnShown(turn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.ready, started, turnIdx])

  /** 학생의 응답을 기록 — 턴에 머문 시간(latency)도 같이 */
  const logResponse = (response: string, isCorrect: boolean | null) => {
    if (!log.ready) return
    log.response(turn, response, isCorrect, Date.now() - turnEnteredAtRef.current)
  }

  const completeLoggedRef = useRef(false)
  useEffect(() => {
    if (!log.ready || completeLoggedRef.current) return
    if (phase !== 'wrap' && phase !== 'done') return
    completeLoggedRef.current = true
    log.complete(turn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.ready, phase])

  /* 대화 흐름은 항상 마지막 발화가 보이게 — 턴이 넘어가거나 새 메시지가 오면 아래로 */
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turnIdx, chatLog.length, dockMode])

  // 실전·정리로 넘어가면 강사 세션 종료 — 문제 풀이 중 강사가 계속 말하지 않게.
  useEffect(() => {
    if (phase === 'practice' || phase === 'wrap' || phase === 'done') endAgent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* 도입 화면 "오늘 배울 내용" — 수업 단계 S코드에서 파생 */
  const introPoints = useMemo(() => {
    const seen = new Set<string>()
    const pts: string[] = []
    for (const t of turns) {
      if (macroOf(t) !== '수업') continue
      const label = t.stage.replace(/^S\d+\s*/, '').trim()
      if (label && !seen.has(label)) { seen.add(label); pts.push(label) }
      if (pts.length >= 4) break
    }
    return pts.length ? pts : [lesson.desc]
  }, [turns, lesson.desc])

  /* 좌(지문/문제) · 우(설명) 분할 리사이즈 — 강사 영역은 기본으로 최대한 좁게(허용 범위의 최솟값) */
  const [leftFrac, setLeftFrac] = useState(0.72)
  const splitRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const onResizeStart = (e: ReactPointerEvent) => { resizingRef.current = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onResizeMove = (e: ReactPointerEvent) => { if (!resizingRef.current || !splitRef.current) return; const r = splitRef.current.getBoundingClientRect(); setLeftFrac(Math.min(0.72, Math.max(0.28, (e.clientX - r.left) / r.width))) }
  const onResizeEnd = () => { resizingRef.current = false }

  /* 턴별 상호작용 로컬 상태 */
  const [choicePicked, setChoicePicked] = useState<number | null>(null)
  const [subjText, setSubjText] = useState('')
  const [subjSent, setSubjSent] = useState(false)
  const [markDone, setMarkDone] = useState(false)
  const [shadowSaid, setShadowSaid] = useState('')
  /** 근거 연결(match) — 지문에서 직접 탭한 근거. `${passageId}:${targetId}` 키로 저장 */
  const [matchTapped, setMatchTapped] = useState<Set<string>>(new Set())

  /* 단어 마킹(mark) — 목표 단어를 모두 형광펜으로 표시하면 완료로 보고 에이전트에 알린다 */
  useEffect(() => {
    const it = turn.interaction
    if (it.kind !== 'mark' || !it.targetWords?.length) return
    const targets = targetTokens(it.targetWords)
    const allMarked = Array.from(targets).every((w) => marks.has(w))
    if (allMarked) reportAction(`${turnIdx}:mark`, actionMessage('지문에서 핵심 단어를 형광펜으로 표시했습니다'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, turnIdx])

  /* 근거 연결(match) — 모든 근거를 지문에서 탭해 연결하면 완료로 보고 알린다 */
  useEffect(() => {
    const it = turn.interaction
    if (it.kind !== 'match') return
    const total = it.evidence.reduce((n, ev) => n + ev.targetIds.length, 0)
    const matched = it.evidence.reduce((n, ev) => n + ev.targetIds.filter((tid) => matchTapped.has(`${ev.passageId}:${tid}`)).length, 0)
    if (total > 0 && matched >= total) reportAction(`${turnIdx}:match`, actionMessage('지문에서 근거를 모두 찾아 연결했습니다'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchTapped, turnIdx])

  const draw = useDrawingTool()
  const contentRef = useRef<HTMLDivElement>(null)

  /* ── 전체 음원 바 (LC) ── */
  const audioItems = useMemo(() => fullAudioItems(lesson), [lesson])
  const hasFullCue = useMemo(() => turns.some((t) => t.audio?.kind === 'full'), [turns])
  const [fullDone, setFullDone] = useState(false)   // 'full' 큐(전체 듣기) 턴을 끝까지 들었는가
  const [barIdx, setBarIdx] = useState(0)
  const [barPlaying, setBarPlaying] = useState(false)
  const barTokenRef = useRef(0)
  /* 잠금 해제 = 1차 청취 완료. 전체 듣기 턴이 있는 유형(P3·P4)은 그 턴을 지나야 하고,
     전체 듣기 턴이 없는 P1·P2는 보기가 곧 음원이라 정답이 공개된 시점부터 자유롭게 듣게 한다. */
  const barUnlocked = hasFullCue
    ? fullDone || turns.slice(0, turnIdx).some((t) => t.audio?.kind === 'full')
    : graded.size > 0

  const barPlayFrom = (from: number) => {
    const start = Math.max(0, Math.min(from, audioItems.length - 1))
    stopVoice()
    setBarIdx(start)
    setBarPlaying(true)
    const my = ++barTokenRef.current
    void (async () => {
      await speakEnglishSeq(audioItems.slice(start), (id) => {
        if (barTokenRef.current !== my) return
        setPlayingId(id)
        if (id) {
          const k = audioItems.findIndex((x) => x.id === id)
          if (k >= 0) setBarIdx(k)
        }
      })
      if (barTokenRef.current === my) setBarPlaying(false)
    })()
  }
  const barPause = () => { barTokenRef.current += 1; stopVoice(); setBarPlaying(false); setPlayingId(null) }

  /* 스크립트 문장 하나만 재생 — 바 재생/턴 음원과 겹치지 않게 토큰을 올리고 끊는다 */
  const playSentence = (id: string, text: string) => {
    barTokenRef.current += 1
    setBarPlaying(false)
    stopVoice()
    void speakEnglishSeq([{ id, text, src: optionSrc(lesson, id) ?? srcOf(lesson.id, id) }], setPlayingId)
  }

  /* 공개 범위 — turns[0..turnIdx]에서 파생 (뒤로가기/건너뛰기 안전) */
  const { revealedScript, revealedOptions, activePassageId } = useMemo(() => {
    let script: Set<string> | 'all' = new Set<string>()
    const options: Record<number, Set<string> | 'all'> = {}
    /* 지문은 잠그지 않는다(학생이 자유롭게 오감) — reveal.passageIds는 "이 턴이 다루는 지문"
       신호로만 쓰여 탭을 자동 전환한다. 마지막으로 지목된 지문이 현재 지문. */
    let activeDoc: string | undefined
    for (let i = 0; i <= turnIdx && i < turns.length; i++) {
      const r = turns[i].reveal
      if (!r) continue
      if (r.scriptIds === 'all') script = 'all'
      else if (r.scriptIds && script !== 'all') r.scriptIds.forEach((id) => (script as Set<string>).add(id))
      if (Array.isArray(r.passageIds) && r.passageIds.length) activeDoc = r.passageIds[r.passageIds.length - 1]
      for (const o of r.optionText ?? []) {
        if (o.labels === 'all') options[o.qIdx] = 'all'
        else if (options[o.qIdx] !== 'all') {
          const cur = (options[o.qIdx] as Set<string> | undefined) ?? new Set<string>()
          o.labels.forEach((l) => cur.add(l))
          options[o.qIdx] = cur
        }
      }
    }
    // 정답을 고른 문항은 보기 텍스트 전체 공개 (음성 전용 보기라도 채점 후엔 근거 확인 가능해야)
    answeredQ.forEach((q) => { options[q] = 'all' })
    return { revealedScript: script, revealedOptions: options, activePassageId: activeDoc }
  }, [turns, turnIdx, answeredQ])

  /** 앱이 턴을 넘길 때 — 에이전트에도 다음 단계 지시를 밀어준다.
   *  이걸 안 하면 진행 주체가 앱인 턴에서 에이전트가 지시를 못 받아 그냥 침묵한다
   *  (지시는 원래 next_step 의 반환값으로만 갔다). */
  const advanceByApp = (nextIdx: number) => {
    /* 관문 — 앱 자동 전진은 "들려주는 턴"에서만 허용한다. 클로저가 낡아 종류를 잘못 봤더라도
       여기서 라이브 값으로 한 번 더 막는다(응답 대기 턴이 조용히 넘어가던 사고 방지). */
    const from = turnIdxRef.current
    const live = turnsRef.current[from]
    if (live && needsAnswer(live) && !respondedRef.current.has(from)) {
      if (PACE_LOG) console.log('[pace] 자동 전진 차단 — 응답 대기 턴', from, live.stage)
      return
    }
    setTurnIdx(nextIdx)
    if (PACE_LOG) console.log('[pace] 화면이 진행(들려주는 턴)', from, '→', nextIdx)
    if (!agentConnected) return
    sendToAgent(`[진행] 다음 단계로 넘어갔다.\n${directiveOf(turnsRef.current[nextIdx])}`)
  }

  /* 턴 진입: 발화 → 음원. 로컬 상호작용 상태 리셋 (도입 전에는 재생 안 함) */
  useEffect(() => {
    if (!started) return
    setChoicePicked(null); setSubjText(''); setSubjSent(false); setMarkDone(false); setShadowSaid(''); setMatchTapped(new Set())
    setPlayingId(null)
    setReaskShown(reaskRef.current.get(turnIdx) ?? 0)
    barTokenRef.current += 1   // 학생이 바로 돌리던 재생은 턴이 바뀌면 끝난다
    setBarPlaying(false)
    stopVoice()
    let alive = true
    ;(async () => {
      /* 강사 발화는 에이전트(일레븐랩스) 몫 — 브라우저 기본 TTS는 쓰지 않는다.
         에이전트가 말하는 중이면 그 발화가 끝난 뒤 음원을 재생한다(겹침 방지, 최대 10초 대기).
         에이전트에 연결하지 않은 상태면 대기 없이 바로 음원으로 간다. */
      if (agentOnRef.current) {
        /* 주의: 턴이 바뀐 직후엔 에이전트가 아직 "생성 중"이라 isSpeaking=false다.
           그 상태만 보고 재생하면 강사가 "에이 보기 들려줄게요" 하기도 전에 음원이 나간다.
           그래서 ①발화가 시작될 때까지 기다리고 ②시작했으면 끝날 때까지 기다린다.
           문장 사이 순간 끊김을 발화 종료로 오인하지 않도록 400ms 정적을 확인한다. */
        await new Promise<void>((res) => {
          const t0 = Date.now()
          let sawSpeaking = false
          let quietSince = 0
          const tick = () => {
            if (!alive) { res(); return }
            const now = Date.now()
            const speaking = agentSpeakingRef.current
            if (speaking) { sawSpeaking = true; quietSince = 0 }
            else if (quietSince === 0) quietSince = now

            const spokeAndStopped = sawSpeaking && !speaking && now - quietSince > 400
            const neverSpoke = !sawSpeaking && now - t0 > 3000  // 끝내 말을 안 하면 그냥 진행
            if (spokeAndStopped || neverSpoke || now - t0 > 15000) res()
            else setTimeout(tick, 120)
          }
          tick()
        })
      }
      if (!alive) return
      if (turn.audio) {
        await speakEnglishSeq(cueItems(lesson, turn.audio), (id) => { if (alive) setPlayingId(id) })
        // 이 턴 음원을 끝까지 들려줬다 — next_step 게이트 해제 (이제 다음 단계로 넘어가도 됨)
        if (alive) audioDoneRef.current.add(turnIdx)
        // 전체 듣기(1차 청취)를 끝까지 들었으면 그때부터 음원 바 조작을 연다
        if (alive && turn.audio.kind === 'full') setFullDone(true)
      }

      /* ── 들려주고 넘어가는 턴은 앱이 전진시킨다 ──
         "들어보자"처럼 학생이 할 일이 없는 턴을 에이전트의 next_step 에 맡기면, 발화·음원이 끝나고도
         에이전트가 다시 말을 걸 때까지 멈춰 있어 답답하다. 발화 종료(위 400ms 정적)와 음원 종료를
         이미 알고 있으므로 여기서 짧은 여유만 두고 넘긴다.
         · 에이전트 없이 도는 폴백은 버튼으로 진행하므로 자동 전진하지 않는다(읽을 시간이 필요하다)
         · 마지막 턴은 넘기지 않는다 — 실전 문제로 튀지 않고 [실전 문제 풀기] 버튼을 학생이 누르게 한다 */
      if (alive && agentOnRef.current && !needsAnswer(turn) && turnIdx < turns.length - 1) {
        await new Promise((res) => setTimeout(res, 700))
        if (alive && turnIdxRef.current === turnIdx) advanceByApp(turnIdx + 1)
      }
    })()
    return () => { alive = false; stopVoice() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, started])

  useEffect(() => () => stopVoice(), [])

  const goNext = () => {
    if (turnIdx < turns.length - 1) setTurnIdx(turnIdx + 1)
    else { stopVoice(); setPhase('practice') }   // 수업(스캐폴딩) 끝 → 실전 문제
  }

  const replayCue = () => {
    if (!turn.audio) return
    stopVoice()
    void speakEnglishSeq(cueItems(lesson, turn.audio), setPlayingId)
  }

  /* 정답 선택 처리 */
  const onSelect = (qIdx: number, label: string) => {
    const it = turn.interaction
    if (it.kind === 'pickAnswer') {
      setAnswers((p) => ({ ...p, [qIdx]: label }))
      setGraded((p) => new Set(p).add(qIdx))
      setAnsweredQ((p) => new Set(p).add(qIdx))
      const opt = lesson.content.questions[qIdx]?.options.find((o) => o.label === label)
      reportAction(`${turnIdx}:pick`, actionMessage(`${label}번 보기를 정답으로 선택했습니다`, opt?.correct, opt?.correct ? undefined : opt?.why))
      logResponse(label, opt?.correct ?? null)
    } else if (it.kind === 'solveAll') {
      setAnswers((p) => ({ ...p, [qIdx]: label }))
    }
  }
  const submitAll = () => {
    setGraded((p) => {
      const n = new Set(p)
      lesson.content.questions.forEach((_, i) => n.add(i))
      return n
    })
    lesson.content.questions.forEach((_, i) => setAnsweredQ((p) => new Set(p).add(i)))
  }

  const matchIt = turn.interaction
  const matchState = matchIt.kind === 'match' ? {
    evidence: matchIt.evidence,
    matchedTargets: matchTapped,
    onTap: (passageId: string, targetId: string) => {
      const valid = matchIt.evidence.some((ev) => ev.passageId === passageId && ev.targetIds.includes(targetId))
      if (!valid) return
      setMatchTapped((p) => new Set(p).add(`${passageId}:${targetId}`))
    },
  } : undefined

  const st: ContentState = {
    revealedScript, revealedOptions, activePassageId,
    playingId, marks, tutorMarks,
    onTapWord: (w) => setMarks((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n }),
    onPlaySentence: playSentence,
    /* 강사 주도 쉐도잉 턴을 한 번 지나면, 그 뒤로는 학생이 문장별로 스스로 반복할 수 있다 */
    shadowUnlocked: turns.slice(0, turnIdx + 1).some((t) => t.interaction.kind === 'shadow'),
    // 지금 도는 아이템의 문항만 보여준다 — 강의 하나가 여러 바퀴를 돌면(사진 3장·문장 5개)
    // 문항이 세로로 다 쌓여서 한눈에 안 들어온다. 나머지는 단계가 넘어가면 나온다.
    visibleQ: lesson.items?.find((it) => it.seq === turn.itemSeq)
      ? { from: lesson.items.find((it) => it.seq === turn.itemSeq)!.qFrom,
          to:   lesson.items.find((it) => it.seq === turn.itemSeq)!.qTo }
      : undefined,
    focusQ: turn.focusQ,
    answerMode: turn.interaction.kind === 'pickAnswer' ? 'single' : turn.interaction.kind === 'solveAll' ? 'all' : 'none',
    answers, graded, onSelect, showKo,
    matchState,
  }

  const macroActive = MACRO_IDX[macroOf(turn)]
  /* 강사가 지금 말하는 중인가 — 에이전트 연결 시 실제 발화, 아니면 음원/TTS 재생 여부.
     포즈(입 벌린 설명 ↔ 차분) 선택과 도크 하이라이트에 함께 쓴다. */
  const tutorSpeaking = agentConnected ? conversation.isSpeaking : playingId !== null

  /* 강사 창 대화 영역 — 지난 대화를 쌓지 않고 **이번 턴의 주고받은 말만** 보여준다.
     에이전트가 붙어 있으면 실제 마지막 발화/학생 발화, 아니면 레일 발화 + 이번 턴에 학생이 한 응답. */
  const lastAgentAi = [...chatLog].reverse().find((m) => m.role === 'ai')?.text
  const lastAgentUser = [...chatLog].reverse().find((m) => m.role === 'user')?.text
  const tutorLine = (agentConnected && lastAgentAi) || turn.tutor

  const studentLine = (() => {
    if (agentConnected) return lastAgentUser ?? null
    const it = turn.interaction
    if (it.kind === 'choice' && choicePicked !== null) return it.choices[choicePicked]?.text ?? null
    if (it.kind === 'subjective' && subjSent && subjText.trim()) return subjText.trim()
    if (it.kind === 'shadow' && shadowSaid.trim()) return shadowSaid.trim()
    if (it.kind === 'mark' && markDone) return '표시했어요'
    if (it.kind === 'pickAnswer' && graded.has(it.qIdx)) {
      const picked = lesson.content.questions[it.qIdx]?.options.find((o) => o.label === answers[it.qIdx])
      return picked ? `${picked.label}) ${picked.text}` : null
    }
    return null
  })()

  /* ── 도입 (LessonIntro — 4단계 프레임의 첫 단계) ── */
  if (!started) {
    return (
      <LessonIntro
        tag={`Part ${lesson.part} · ${lesson.typeLabel}`}
        script={`${lesson.desc} ${teacherName} 강사와 스캐폴딩 단계에 따라 하나씩 짚어볼게요.`}
        points={introPoints.map((text) => ({ text }))}
        teacherName={`${teacherName} 선생님`}
        teacherImg={teacherImg}
        preparing={preparing}
        onStart={() => setStarted(true)}
        onEnd={() => { stopVoice(); router.push('/lessons') }}
      />
    )
  }

  /* ── 실전 문제 (수업 뒤 — 배운 전략으로 직접 풀기) ── */
  if (phase === 'practice') {
    return (
      <PracticeStage
        lesson={lesson}
        onExit={() => { stopVoice(); router.push('/lessons') }}
        onDone={(score) => { setPracticeScore(score); setPhase('wrap') }}
      />
    )
  }

  /* ── 세션 정리 (4단계 프레임의 마지막 — 실전 문제 이후) ── */
  if (phase === 'wrap') {
    return (
      <WrapStage
        lesson={lesson}
        practiceScore={practiceScore}
        teacherName={teacherName}
        teacherImg={teacherImg}
        onExit={() => { stopVoice(); router.push('/lessons') }}
        onDone={() => { stopVoice(); setPhase('done') }}
      />
    )
  }

  if (phase === 'done') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-[#F5F8FE] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-3xl">🎉</div>
        <div>
          <p className="text-lg font-bold text-[#1C1B33]">{lesson.title} 완료!</p>
          <p className="text-[13px] text-[#6B7280] mt-1">{lesson.partName} · {lesson.typeLabel}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { audioDoneRef.current = new Set(); respondedRef.current = new Set(); reaskRef.current = new Map(); reaskAtRef.current = new Map(); agentReactedRef.current = new Set(); setPhase('lesson'); setTurnIdx(0); setAnswers({}); setGraded(new Set()); setAnsweredQ(new Set()); setMarks(new Set()); setTutorMarks(new Set()); setPracticeScore(null) }}
            className="px-5 py-2.5 rounded-xl border border-[#C7D2FE] text-[#2563EB] text-sm font-bold hover:bg-[#EFF6FF]">다시 해보기</button>
          <button onClick={() => router.push('/lessons')} className={PRIMARY_BTN}>다른 유형 보러 가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
      {/* ── 레일 검토 패널 (DB 레일로 돌 때만) ── */}
      {rail && (
        <RailInspector
          diags={rail.diags} currentNo={turnIdx + 1} source={rail.source}
          generated={rail.generated} status={rail.status}
        />
      )}
      {/* ── 드래프트 미리보기 배너 ──
           정본과 헷갈리면 "학생한테 이게 나가고 있나?" 를 착각한다. 화면 맨 위에 항상 띄운다.
           학습 로그도 이 모드에서는 꺼져 있다(호출부에서 lectureCode 를 안 넘긴다). */}
      {draftId && (
        <div className="shrink-0 flex items-center gap-2 px-3 md:px-5 py-1.5 bg-[#FFF7ED] border-b border-[#FED7AA]">
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#EA580C] text-white shrink-0">드래프트</span>
          <span className="text-[11px] font-bold text-[#9A3412] truncate">{draftId}</span>
          <span className="text-[11px] text-[#C2410C] hidden sm:inline">· 학생에게 안 나갑니다 · 학습 기록 안 남김</span>
        </div>
      )}
      {/* ── 4단계 스텝퍼 (도입·수업·실전·정리) ── */}
      <PhaseStepper
        active={macroActive}
        onEnd={() => { stopVoice(); router.push('/lessons') }}
        extra={
          <>
            {lesson.area === 'RC' && (
              <button onClick={() => setShowKo(!showKo)}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${showKo ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'}`}>해석</button>
            )}
            <button onClick={draw.toggleDraw}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${draw.drawMode ? 'bg-[#F97316] border-[#F97316] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#FDBA74]'}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              <span className="hidden md:inline">필기</span>
            </button>
          </>
        }
      />

      {/* ── 스캐폴딩 레일 (턴별 단계) ── */}
      <ScaffoldRail turns={turns} turnIdx={turnIdx} onJump={setTurnIdx} />

      {/* ── 본문: 강사 창 배치에 따라 골격이 바뀐다 ──
           우측 패널(sidebar) = 좌 콘텐츠 · 우 기둥 (가로) · 하단 도크(bottom) = 콘텐츠 위 · 바 아래 (세로)
           최소화(mini)는 fixed라 자리를 차지하지 않아 콘텐츠가 전체 폭 */}
      <div ref={splitRef} className={`flex-1 flex min-h-0 bg-white ${dockMode === 'bottom' ? 'flex-col' : 'flex-col lg:flex-row'}`}>
        {/* 좌(또는 위): 지문/문제/사진 (파트별 ContentView) — 필기 켜면 상단에 도구 바(인라인, 콘텐츠 위로 밀어냄) */}
        <div className={`min-h-0 flex flex-col border-b lg:border-b-0 border-gray-100 ${
          dockMode === 'sidebar' ? 'h-[42%] lg:h-full lg:w-[var(--lf)]' : 'flex-1 h-full w-full'
        }`} style={{ ['--lf' as string]: `${leftFrac * 100}%` }}>
          {draw.drawMode && <DrawPalette tool={draw.tool} setTool={draw.setTool} clearCanvas={draw.clearCanvas} setDrawMode={draw.setDrawMode} />}
          {/* 전체 음원 바 — LC만. 1차 청취 전에는 잠겨 있다 */}
          {lesson.area === 'LC' && audioItems.length > 0 && (
            <AudioBar items={audioItems} unlocked={barUnlocked} playing={barPlaying} idx={barIdx}
              onPlay={barPlayFrom} onPause={barPause} onSeek={barPlayFrom} />
          )}
          {/* 지문/문항에서 직접 할 일 — 콘텐츠 바로 위 작은 안내 (설명 영역에서 뺀 지시) */}
          <ContentActionHint turn={turn} lesson={lesson} answers={answers} graded={graded} matchTapped={matchTapped} />
          {/* 파트1 수업(문항 1개)도 P6·P7과 같이 **높이를 주고 스크롤을 막는다** —
              사진과 보기가 한 화면에 있어야 하는 수업이라 스크롤이 생기면 안 된다.
              실전(문항 여러 개)은 사진이 장마다 달라 세로로 쌓이므로 스크롤을 유지한다. */}
          <div ref={contentRef} className={`flex-1 min-h-0 px-3 md:px-6 py-4 ${
            lesson.part === 6 || lesson.part === 7
              || (lesson.part === 1 && lesson.content.questions.length === 1)
              ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
          }`}>
            <ContentView lesson={lesson} st={st} readingSideBySide={dockMode === 'bottom'} />
          </div>
        </div>

        {/* 세로 리사이즈 핸들 (데스크탑) — 사이드바일 때만 */}
        {dockMode === 'sidebar' && (
          <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
            className="hidden lg:flex w-4 shrink-0 items-center justify-center cursor-col-resize touch-none bg-gray-50 border-x border-gray-100 hover:bg-gray-100">
            <div className="h-12 w-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* 우(또는 하단): 강사 창 — 우측 패널 ⇄ 하단 도크 ⇄ 플로팅 ⇄ 작은 창.
            플로팅·작은 창은 fixed라 여기 자리를 차지하지 않는다. 내용은 슬롯으로 넘기고 배치는 도크가 정한다. */}
        <TutorDock
          mode={dockMode} setMode={setDockMode}
          name={teacherName} imgSrc={teacherImg}
          poseSrc={instPose(instructor, poseForTurn(turn, tutorSpeaking))}
          /* PACE_LOG 동안 단계 라벨 뒤에 진행 판정을 붙인다 — "왜 넘어갔지"를 콘솔 없이 보게.
             이 꼬리표가 안 보이면 **화면이 옛 코드로 돌고 있다는 뜻**(새로고침 필요). */
          step={{ idx: turnIdx + 1, total: turns.length,
            label: stageHeading(turn) + (PACE_LOG
              ? (needsAnswer(turn) ? ` · 응답대기 ${reaskShown}/${MAX_REASK}` : ' · 자동진행')
              : '') }}
          chatMode={chatMode}
          getTutorFreq={() => { try { return conversation.getOutputByteFrequencyData?.() } catch { return undefined } }}
          connected={agentConnected}
          isSpeaking={tutorSpeaking}
          /* 작은 창엔 "지금 하는 말" 한 줄 */
          lastLine={agentConnected && lastAgentAi ? lastAgentAi : keySentence(turn.tutor)}
          bodyRef={feedRef}
          /* ── ① 강사 말 — 사진 바로 아래(세로)/좌측(가로). 시안: 심플 텍스트 ── */
          speech={
            <>
              <p className="text-[13.5px] leading-relaxed text-[#475569] font-medium">{tutorLine}</p>
              {studentLine && (
                <div className="mt-2 rounded-xl border border-[#C7D2FE] bg-[#F5F8FF] px-3 py-2">
                  <span className="block text-[10px] font-black tracking-wide text-[#2563EB] mb-0.5">내 답변</span>
                  <p className="text-[12.5px] text-[#1C1B33] leading-snug">{studentLine}</p>
                </div>
              )}
            </>
          }
          /* ── ② 선택지 / 간단한 설명 ── */
          body={
            <>
              <InteractionDock
                key={turnIdx}
                turn={turn} lesson={lesson}
                goNext={goNext}
                answers={answers} graded={graded} submitAll={submitAll}
                choicePicked={choicePicked} setChoicePicked={setChoicePicked}
                onChoicePick={(c) => {
                  const it = turn.interaction
                  if (it.kind !== 'choice') return
                  /* 정답 선택지가 있는 문항이면, 고른 게 정답 선택지가 아닐 때 명백한 오답(false)으로 넘긴다.
                     (틀린 선택지는 correct가 undefined라, 그대로 넘기면 '채점 없음'으로 흘러가 교정을 못 했다) */
                  const graded = it.choices.some((ch) => !!ch.correct)
                  const ok = graded ? c.correct === true : undefined
                  const label = `'${it.prompt}'에 대해 '${c.text}'라고 답함`
                  reportAction(`${turnIdx}:choice`, actionMessage(label, ok, ok === false ? it.feedback : undefined))
                  logResponse(c.text, ok ?? null)
                }}
                subjText={subjText} setSubjText={setSubjText} subjSent={subjSent} setSubjSent={setSubjSent}
                markDone={markDone}
                onMarkDone={() => {
                  const it = turn.interaction
                  if (it.kind === 'mark' && it.targetWords) setTutorMarks((p) => { const n = new Set(p); targetTokens(it.targetWords).forEach((w) => n.add(w)); return n })
                  setMarkDone(true)
                }}
                shadowSaid={shadowSaid} setShadowSaid={setShadowSaid}
                matchTapped={matchTapped}
                setPlayingId={setPlayingId}
              />
              {/* 스캐폴딩 마지막 턴에서만 — 다음 단계(실전 문제)로 이동 */}
              {turnIdx === turns.length - 1 && (
                <button onClick={goNext} className={PRIMARY_BTN + ' w-full'}>실전 문제 풀기 →</button>
              )}
            </>
          }
          /* 음원 재생 바 (듣기 재생 중에만) */
          playback={playingId ? <PlaybackBar label={playbackLabel(lesson, playingId)} onReplay={turn.audio ? replayCue : undefined} /> : undefined}
          /* ── ③ 학생 응답 입력 — 맨 아래(세로)/우측(가로) ── */
          composer={
            <TutorComposer
              connected={agentConnected} connecting={agentConnecting}
              isSpeaking={conversation.isSpeaking}
              topFlush={dockMode === 'bottom'}
              chatMode={chatMode} setChatMode={setChatMode}
              inputText={inputText} setInputText={setInputText}
              getFreq={() => { try { return conversation.getInputByteFrequencyData?.() } catch { return undefined } }}
              onSend={() => {
                const t = inputText.trim()
                if (!t || !agentConnected) { setInputText(''); return }
                conversation.sendUserMessage(t)
                setChatLog((prev) => [...prev, { role: 'user', text: t }])
                setInputText('')
              }}
              onStartAgent={startAgent}
              onEndSession={endAgent}
            />
          }
        />
      </div>

      <DrawingOverlay {...draw} bounds={contentRef} hidePalette />
    </div>
  )
}

/* ── 실전 문제 단계 — 스캐폴딩 없이 전 문항을 직접 풀고 채점 ── */
function PracticeStage({ lesson, onExit, onDone }: { lesson: TypeLesson; onExit: () => void; onDone: (score: { correct: number; total: number }) => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState(false)
  const [showKo, setShowKo] = useState(false)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const [playingId, setPlayingId] = useState<string | null>(null)
  const draw = useDrawingTool()
  const contentRef = useRef<HTMLDivElement>(null)

  /* 실전 세트가 있으면 그걸 푼다. 없으면(로컬 샘플 유형) 수업에서 다룬 문항을 그대로 다시 푼다. */
  const pLesson = lesson.practice ? { ...lesson, content: lesson.practice } : lesson
  const qs = pLesson.content.questions

  /* 듣기 파트 실전은 음원이 있어야 문제가 성립한다 — 문항 통음원/보기 음원 재생 */
  const playMedia = (id: string, text: string) => {
    stopVoice()
    void speakEnglishSeq([{ id, text, src: optionSrc(pLesson, id) ?? srcOf(pLesson.id, id) }], setPlayingId)
  }
  useEffect(() => () => stopVoice(), [])
  const total = qs.length
  const answered = qs.filter((_, i) => answers[i]).length
  const correct = qs.filter((q, i) => answers[i] === q.options.find((o) => o.correct)?.label).length

  const allOptions: Record<number, 'all'> = {}
  qs.forEach((_, i) => { allOptions[i] = 'all' })

  const st: ContentState = {
    revealedScript: 'all', revealedOptions: allOptions,
    playingId, onPlaySentence: playMedia, marks, tutorMarks: new Set(),
    onTapWord: (w) => setMarks((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n }),
    answerMode: graded ? 'none' : 'all',
    answers, graded: graded ? new Set(qs.map((_, i) => i)) : new Set(),
    onSelect: (q, l) => { if (!graded) setAnswers((p) => ({ ...p, [q]: l })) },
    showKo,
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
      <PhaseStepper
        active={2}
        onEnd={onExit}
        /* 해석 토글은 문장 해석(ko)이 실제로 있을 때만 — DB 구동 지문엔 아직 해석이 없어 빈 버튼이 된다 */
        extra={pLesson.area === 'RC' && (pLesson.content.passages ?? []).some((p) => p.sentences?.some((s) => s.ko)) ? (
          <button onClick={() => setShowKo(!showKo)}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${showKo ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#C7D2FE]'}`}>해석</button>
        ) : undefined}
      />

      {/* 실전 안내 배너 */}
      <div className="shrink-0 bg-white border-b border-[#EBEBF0] px-4 md:px-6 py-2.5">
        <div className="max-w-[900px] mx-auto flex items-center gap-2">
          <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309]">실전 문제</span>
          <p className="text-[12px] font-bold text-[#1C1B33] truncate">{lesson.title} — 배운 전략으로 직접 풀어보세요 ({qs.length}문항)</p>
        </div>
      </div>

      {/* 필기 도구 바 (인라인) */}
      {draw.drawMode && <DrawPalette tool={draw.tool} setTool={draw.setTool} clearCanvas={draw.clearCanvas} setDrawMode={draw.setDrawMode} />}

      {/* 문항 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4 min-h-0">
        <div className="max-w-[900px] mx-auto"><ContentView lesson={pLesson} st={st} /></div>
      </div>

      {/* 제출/채점 바 */}
      <div className="shrink-0 bg-white border-t border-[#EBEBF0] px-4 md:px-6 py-3">
        <div className="max-w-[900px] mx-auto flex items-center justify-between gap-3">
          {graded ? (
            <p className="text-[13px] font-bold text-[#1C1B33]">채점 결과 <span className="text-[#2563EB]">{correct}/{total}</span> 정답</p>
          ) : (
            <p className="text-[12px] font-bold text-[#6B7280]"><span className={answered === total ? 'text-[#16A34A]' : 'text-[#9CA3AF]'}>{answered}/{total}</span> 선택</p>
          )}
          {graded
            ? <button onClick={() => onDone({ correct, total })} className={PRIMARY_BTN}>정리로 →</button>
            : <button onClick={() => setGraded(true)} disabled={answered < total} className={PRIMARY_BTN}>채점하기</button>}
        </div>
      </div>

      <DrawingOverlay {...draw} bounds={contentRef} hidePalette />
    </div>
  )
}

/* 빈칸 포함 문장 렌더 — 채우기 전엔 빈 슬롯, 채운 뒤엔 정오답 색으로 표시 */
function RecapBlankSentence({ text, filled, correct }: { text: string; filled?: string; correct?: boolean }) {
  const [pre, post] = text.split('___')
  return (
    <p className="text-[14px] md:text-[15px] font-semibold text-[#1C1B33] leading-relaxed">
      {pre}
      <span className={`inline-block min-w-[76px] text-center mx-1 px-2 py-0.5 rounded-md border-b-2 font-black align-baseline ${
        filled === undefined ? 'border-[#CBD5E1] bg-[#F8FAFC] text-[#94A3B8]'
          : correct ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]' : 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
      }`}>{filled ?? '____'}</span>
      {post}
    </p>
  )
}

/* 정리 카드 하나 — 클릭 선택 + 음성 입력 둘 다 가능 */
function RecapCard({ index, sentence, filled, correct, onPick, onSpeak }: {
  index: number; sentence: RecapSentence; filled?: string; correct?: boolean
  onPick: (choice: string) => void; onSpeak: (transcript: string) => void
}) {
  const done = filled !== undefined
  return (
    <div className={`rounded-2xl border bg-white p-4 transition-all ${done ? (correct ? 'border-[#86EFAC]' : 'border-[#FCA5A5]') : 'border-[#E5E7EB]'}`}>
      <div className="flex items-start gap-2.5 mb-2.5">
        <span className={`shrink-0 w-7 h-7 rounded-full text-[12px] font-black flex items-center justify-center ${
          done ? (correct ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]') : 'bg-[#EFF6FF] text-[#2563EB]'
        }`}>{done ? (correct ? '✓' : '✗') : index + 1}</span>
        <RecapBlankSentence text={sentence.en} filled={filled} correct={correct} />
      </div>
      {done && <p className="text-[12px] text-[#6B7280] mb-2.5 pl-9">{sentence.ko}</p>}
      <div className="flex flex-wrap items-center gap-2 pl-9">
        {sentence.choices.map((c) => {
          const picked = filled === c
          return (
            <button key={c} onClick={() => onPick(c)}
              className={`text-[12px] font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                picked ? (correct ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]' : 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]')
                  : 'border-[#E5E7EB] text-[#374151] hover:border-[#93C5FD] hover:bg-[#EFF6FF]'
              }`}>{c}</button>
          )
        })}
        <MicButton lang="en-US" onResult={onSpeak} />
      </div>
    </div>
  )
}

/* ── 세션 정리 단계 — 4단계 프레임의 마지막(실전 이후). 핵심 문장 3개 빈칸 채우기 + 강사 마무리 멘트 ── */
function WrapStage({ lesson, practiceScore, teacherName, teacherImg, onExit, onDone }: {
  lesson: TypeLesson; practiceScore: { correct: number; total: number } | null
  teacherName: string; teacherImg: string
  onExit: () => void; onDone: () => void
}) {
  const [fills, setFills] = useState<Record<string, string>>({})
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({})
  const [showClosing, setShowClosing] = useState(false)
  const spokenRef = useRef(false)

  const sentences = lesson.recap.sentences
  const allDone = sentences.every((s) => fills[s.id] !== undefined)

  useEffect(() => {
    if (!allDone || spokenRef.current) return
    spokenRef.current = true
    setShowClosing(true)
    void speakKorean(lesson.recap.closing)
    return () => stopVoice()
  }, [allDone, lesson.recap.closing])

  useEffect(() => () => stopVoice(), [])

  const pick = (s: RecapSentence, choice: string) => {
    setFills((p) => ({ ...p, [s.id]: choice }))
    setCorrectMap((p) => ({ ...p, [s.id]: choice === s.answer }))
  }
  const speak = (s: RecapSentence, transcript: string) => {
    if (!transcript.trim()) return
    const ok = s.keywords.some((k) => transcript.toLowerCase().includes(k))
    setFills((p) => ({ ...p, [s.id]: transcript }))
    setCorrectMap((p) => ({ ...p, [s.id]: ok }))
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
      <PhaseStepper active={3} onEnd={onExit} />

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="max-w-[640px] mx-auto space-y-4">
          <div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#EDE9FE] text-[#6D28D9]">정리</span>
            <p className="text-[15px] font-bold text-[#1C1B33] mt-2">오늘 배운 핵심 문장을 직접 채워보세요</p>
            <p className="text-[12px] text-[#6B7280] mt-0.5">보기를 탭하거나 🎤를 눌러 말해보세요.</p>
          </div>

          {practiceScore && (
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5">
              <span className="text-[11px] font-bold text-[#6B7280]">실전 결과</span>
              <span className="text-[13px] font-black text-[#2563EB]">{practiceScore.correct}/{practiceScore.total} 정답</span>
            </div>
          )}

          <div className="space-y-3">
            {sentences.map((s, i) => (
              <RecapCard key={s.id} index={i} sentence={s} filled={fills[s.id]} correct={correctMap[s.id]}
                onPick={(c) => pick(s, c)} onSpeak={(t) => speak(s, t)} />
            ))}
          </div>

          {showClosing && (
            <div className="flex items-start gap-2.5 bg-[#F0F5FF] border border-[#BFD9FF] rounded-2xl p-4 animate-fade-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teacherImg} alt={teacherName}
                className="w-9 h-9 rounded-full object-cover object-top border border-[#2563EB]/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-[#374151]">{teacherName} 강사</span>
                <p className="text-[13px] text-[#374151] leading-relaxed mt-1">{lesson.recap.closing}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 bg-white border-t border-[#EBEBF0] px-4 md:px-6 py-3">
        <div className="max-w-[640px] mx-auto flex justify-end">
          <button onClick={onDone} disabled={!showClosing} className={PRIMARY_BTN}>완료하기</button>
        </div>
      </div>
    </div>
  )
}

/* ── 상호작용 독 — 인터랙션 종류별 UI ── */
function InteractionDock(props: {
  turn: Turn; lesson: TypeLesson
  goNext: () => void
  answers: Record<number, string>; graded: Set<number>; submitAll: () => void
  choicePicked: number | null; setChoicePicked: (i: number) => void
  /** 퀵 선택지를 고르면 그 행동을 강사 에이전트에 알린다(반응·진행) */
  onChoicePick?: (choice: { text: string; correct?: boolean }) => void
  subjText: string; setSubjText: (t: string) => void; subjSent: boolean; setSubjSent: (b: boolean) => void
  markDone: boolean; onMarkDone: () => void
  shadowSaid: string; setShadowSaid: (t: string) => void
  matchTapped: Set<string>
  setPlayingId: (id: string | null) => void
}) {
  const { turn, lesson } = props
  const it: Interaction = turn.interaction

  /* AI 진행 — 강사 발화만으로 넘어가는 턴. 확인 버튼 없음(에이전트 음성이 대신 판단해 전환할 예정) */
  if (it.kind === 'next') {
    return null
  }

  /* 선택 응답 (퀵버튼) — 고르면 바로 피드백. "다음" 버튼 없음 */
  if (it.kind === 'choice') {
    const picked = props.choicePicked
    const done = picked !== null
    return (
      <div>
        <p className="text-[12px] font-bold text-[#1C1B33] mb-2">{it.prompt}</p>
        <div className="space-y-2">
          {it.choices.map((c, i) => {
            const isPicked = picked === i
            const cls = done
              ? c.correct ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]'
                : isPicked ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#E5E7EB] bg-white text-[#9CA3AF]'
              : 'border-[#DBEAFE] bg-white text-[#1C1B33] hover:border-[#2563EB] hover:bg-[#F8FAFF]'
            const badgeCls = done
              ? c.correct ? 'bg-[#DCFCE7] text-[#15803D]' : isPicked ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#F1F5F9] text-[#94A3B8]'
              : 'bg-[#EFF6FF] text-[#2563EB]'
            return (
              <button key={i} disabled={done} onClick={() => { props.setChoicePicked(i); props.onChoicePick?.(c) }}
                className={`w-full flex items-center gap-2.5 text-[13px] font-semibold border rounded-xl px-3.5 py-3 text-left transition-all active:scale-[0.99] ${cls}`}>
                <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-black ${badgeCls}`}>{i + 1}</span>
                <span className="flex-1">{c.text}</span>
                {done && c.correct && <span className="shrink-0 text-[#15803D]">✓</span>}
              </button>
            )
          })}
        </div>
        {done && (
          <p className={`text-[12px] leading-relaxed mt-2.5 ${it.choices[picked!]?.correct ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
            {it.choices[picked!]?.correct ? '✓ ' : ''}{it.feedback ?? (it.choices[picked!]?.correct ? '정확해요!' : '다시 한번 근거를 확인해 보세요.')}
          </p>
        )}
      </div>
    )
  }

  /* 지문·문항에서 직접 하는 지시(정답 선택·전체 풀기·주관식·단어 마킹)는 설명 영역에서 빼고,
     콘텐츠(지문/문항) 위 작은 안내 배너로 옮겼다(ContentActionHint). 여기선 렌더 안 함. */
  if (it.kind === 'pickAnswer' || it.kind === 'solveAll' || it.kind === 'subjective' || it.kind === 'mark') {
    return null
  }

  /* 쉐도잉 — 듣기·마이크는 유지, "완료" 버튼 없음 */
  if (it.kind === 'shadow') {
    const playChunks = () => {
      const script = lesson.content.audioScript ?? []
      const items = it.audioIds?.length
        ? script.filter((s) => it.audioIds!.includes(s.id)).map((s) => ({ id: s.id, text: s.en, src: srcOf(lesson.id, s.id) }))
        : [{ id: 'chunk', text: it.chunks.join(' ') }]
      void speakEnglishSeq(items, props.setPlayingId)
    }
    return (
      <div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <span className="text-[12px] font-bold text-[#1C1B33] mr-1">🔁 따라 말해보세요</span>
          {it.chunks.map((c, i) => (
            <span key={i} className="text-[13px] font-mono font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-2.5 py-1">
              {c}{i < it.chunks.length - 1 && <span className="text-[#93C5FD] ml-2">/</span>}
            </span>
          ))}
        </div>
        {/* 실제 따라 말하기는 강사 에이전트와의 대화로 — 여기선 원음 다시 듣기만 */}
        <button onClick={playChunks}
          className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-[#2563EB] border border-[#BFDBFE] bg-white rounded-xl px-3.5 py-2.5 hover:bg-[#EFF6FF]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          듣기
        </button>
      </div>
    )
  }

  /* 근거 연결 (이중·삼중 지문) — 지문에서 직접 근거를 탭한다. 지시·진행은 지문 위 안내 배너로 옮겨서
     설명 영역에선 렌더 안 함. (진행 상태는 지문의 초록 하이라이트 + 배너 카운트로 확인) */
  if (it.kind === 'match') {
    return null
  }

  return null
}
