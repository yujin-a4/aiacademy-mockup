'use client'

/* ── 유형학습 플레이어 (턴 기반) ──
   이도윤 스캐폴딩 레일(TypeLesson.turns)을 순회하며 턴마다
   ① 강사 발화(말풍선+TTS) ② 음원 재생(문장 단위) ③ 스크립트/지문 점진 공개
   ④ 상호작용(퀵버튼·정답선택·주관식·마킹·매칭)을 하단 독에 렌더한다.
   진행 상태(공개 범위)는 turns[0..idx]에서 매번 파생 — 이전/건너뛰기가 안전하다. */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { TypeLesson, Turn, AudioCue, Interaction, RecapSentence } from '@/data/typeLearning'
import ContentView, { targetTokens, markedWords, type ContentState } from '@/components/type-lesson/ContentView'
import MicButton from '@/components/type-lesson/MicButton'
import { DrawingOverlay, PenFab, useDrawingTool } from '@/components/DrawingOverlay'
import { speakEnglishSeq, speakKorean, stopVoice } from '@/lib/voice'
import { INST_NAME, INST_THUMBS, tutorAgentFor, instPose, type InstPose } from '@/data/instructorData'
import audioManifest from '@/data/typeLearning/audioManifest.json'
import LessonIntro from '@/components/lesson/LessonIntro'
import TutorDock, { type DockMode, type ChatMsg } from '@/components/type-lesson/TutorDock'
import { useConversation } from '@11labs/react'
import { buildTutorVars } from '@/lib/learnerProfile'
import { gateLevels, GATE_RULE, GATE_NAME, type Gate } from '@/data/typeLearning/stageGate'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useLessonLog } from '@/data/db/learningEventStore'
import { useCurriculumLectures } from '@/data/db/questionStore'
import SessionEndFlow from '@/components/session/SessionEndFlow'
import type { PartKey } from '@/lib/sessionHistory'
import { getTodayProgress, markLectureDone } from '@/lib/todayPlan'
import type { RailDiag } from '@/data/typeLearning/fromSteps'

/* 레일 정본이 이도윤 ver 한 벌뿐 — 온보딩에서 다른 강사를 골라도 짚는 순서는 이 레일을 따르고
   목소리·얼굴·화법만 그 강사가 된다. (강사별 레일이 채워지면 lesson.turns를 강사별로 고르게 바꾼다) */
const RAIL_OWNER = 'lee_doyun'

/** 리뷰 단계에서 한 문항을 다시 틀릴 수 있는 횟수. 이만큼 틀리면 정답을 열고 넘어간다 */
const REVIEW_MAX_TRIES = 2

/** 상호작용 종류 → **학생이 화면에서 할 구체적 행동** (에이전트에게만 주는 지시).
 *
 *  ⚠️ 여기가 흐리면 강사가 "…파악해야 해" 처럼 서술로 끝내고, 학생은 뭘 해야 할지 모른다.
 *  그래서 **행동 + 도구 + 대상**을 명시한다 — 화면이 실제로 받을 수 있는 조작만 적을 것
 *  (탭·펜 표시·보기 선택·말하기). 화면에 없는 조작을 쓰면 학생이 못 한다. */
const INTERACTION_HINT: Record<Interaction['kind'], string> = {
  next: '',
  choice: '화면 아래 보기 버튼 중 하나를 **누르게** 한다. "골라서 눌러봐" 처럼 누르라고 분명히 말한다.',
  pickAnswer: '문항의 보기(에이·비·씨·디) 중 정답을 **탭하게** 한다. "정답 보기를 눌러봐" 라고 분명히 말한다.',
  solveAll: '화면의 모든 문항에 답을 **하나씩 골라 누르게** 한다. "세 문제 다 답을 눌러봐" 처럼 말한다.',
  subjective: '학생이 **소리 내어 말하게** 한다. "말해봐" 로 끝내지 말고 무엇을 말할지 짚어준다.',
  mark: '화면에 **펜으로 직접 표시하게** 한다 — 사진이면 해당 부분에 동그라미, 지문이면 그 단어에 밑줄(또는 단어를 탭). '
    + '"어디에 무엇으로 표시하라" 를 한 문장으로 분명히 말한다. 표시하면 화면이 바로 읽어서 알려준다.',
  match: '지문에서 근거가 되는 문장을 **직접 탭하게** 한다. "근거 문장을 눌러봐" 라고 분명히 말한다.',
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

/** 발화 규칙 — 대시보드 System prompt 로 넣는 게 정석이지만 그건 레포 밖이라, 세션마다
 *  귓속말(Contextual Update)로 같이 준다. 대시보드에 반영되면 여기서 빼도 된다.
 *  이름 호격 조사: TTS 가 "와옹아"를 [와옹가]로 읽는다 → 이름만 부르게 한다. */
const SPEECH_RULES = [
  '[발화 규칙]',
  '- 학생 이름은 이름만 부른다. 뒤에 "아"·"야" 같은 호격 조사를 붙이지 마라.',
  '  ("와옹아" 처럼 부르지 말고 "와옹" 으로 부른다. 음성 합성이 조사를 붙여 엉뚱하게 읽는다)',
  '- 이름을 아예 부르지 않아도 된다. 부를 때만 이 규칙을 지킨다.',
  /* TTS 가 연음을 놓쳐 "맞아"를 [마야]로 읽는다(실측). 발음 사전(scripts/el-pronunciation.js)이
     에이전트에 붙기 전까지의 회피책 — 같은 뜻의 다른 말을 쓰게 한다. */
  '- 맞장구는 "맞아" 대신 "그렇지", "정확해", "좋아" 를 써라. ("맞아"는 음성 합성이 잘못 읽는다)',
].join('\n')

/** 진행 판단을 콘솔에 남긴다 — "왜 넘어갔지"를 눈으로 확인해야 페이싱을 맞출 수 있다.
 *  (프로토타입이라 개발 중엔 켜 둔다. 끄려면 false) */
const PACE_LOG = true
/* ⚠️ 개발 편의 — 상단 4단계를 눌러 그 단계로 바로 건너뛴다. **학생에게 나갈 때는 false**.
   (실제 수업은 앞 단계를 거쳐야 다음 단계가 성립한다 — 실전 없이 정리로 가면 채점 결과가 없다) */
const DEV_PHASE_JUMP = true

/** 턴 하나를 에이전트 지시(directive)로 — 강사는 이걸 자기 말투로 바꿔 말한다(낭독 금지). */
function directiveOf(turn: Turn, gate: Gate = 4): string {
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
      ? '질문은 화면 문구를 **그대로** 물어라. 화면에 뜬 선택지는 위에 적힌 것이 전부다 — '
        + '거기 없는 보기(다른 알파벳)를 고르라고 하지 마라. 설명에서 다른 보기를 언급했더라도, '
        + '고르라고 시킬 때는 화면에 있는 것만 말한다.' : '',
    todo ? `[학생이 할 일] ${todo}` : '',
    /* 정보 차단(stageGate)의 **보조** 규칙 — 못 주게 막는 게 1차, 말하지 말라는 게 2차 */
    `[이 단계 제한] ${GATE_RULE[gate]}`,
    /* ⚠️ 음원은 **네가 말한 뒤** 화면이 튼다. 이 사실을 안 주면 재생 전에 "지금 들은 보기 중에"
       라고 과거형으로 말한다(실측). 재생이 끝나면 시스템이 [진행] 신호로 알려준다. */
    turn.audio
      ? '[음원] 이 단계는 네 말이 끝난 뒤 화면이 음원을 재생한다. 아직 학생은 듣지 않았다. '
        + '"들었지?" 처럼 이미 들은 것처럼 말하지 마라. 지금은 무엇을 들을지만 한 문장으로 짧게 안내하고 멈춰라. '
        + '음원이 끝나면 시스템이 알려준다 — 그때 학생이 할 일을 시켜라.'
      : '',
    needsAnswer(turn)
      ? '위 내용만 네 말투로 짧게 전달하고 학생의 반응을 기다려라. 다음 단계로 혼자 넘어가지 마라. '
        /* 실측: "사진 속 정보를 파악해야 해" 처럼 서술로 끝내서 학생이 뭘 할지 몰랐다.
           마지막 문장은 반드시 **시키는 말**이어야 한다. */
        + '⚠️ 마지막 문장은 반드시 [학생이 할 일]을 **시키는 말**로 끝내라 — 무엇을 어떻게 하라고 한 문장으로. '
        + '"파악해야 해", "중요해" 처럼 설명으로 끝내지 마라.'
      // 들려주고 넘어가는 턴 — 대기를 지시하면 음원이 끝나고도 멈춰 있어 답답해진다
      : '위 내용만 네 말투로 짧게 전달하고 멈춰라. 학생에게 질문하지 말고, 다음 단계는 화면이 알아서 넘긴다.',
  ].filter(Boolean).join('\n')
}

/* ── 턴(단계) → 강사 포즈 ──
   스캐폴딩 의미에 맞춰 포즈를 고른다. 강사가 실제로 말하는 중(speaking)이면 입 벌린 설명 포즈로
   맞춰 발화와 그림이 어긋나지 않게 한다. 학생이 말할 차례(주관식)엔 듣는 자세.
   ※ 지금 이도윤은 2장(calm/talk)뿐이라 폴백상 대부분 두 상태로 수렴하지만, 5포즈가 채워지면
     이 매핑 그대로 세밀해진다. */
function poseForTurn(turn: Turn, speaking: boolean): InstPose {
  const k = turn.interaction.kind
  const s = turn.stage
  if (speaking) return /^S[145]/.test(s) || k === 'mark' || k === 'match' ? 'point' : 'explain'
  if (k === 'subjective') return 'listen'
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
function buildLessonFacts(lesson: TypeLesson, itemSeq: number | undefined, gate: Gate): string {
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
  /* ── 게이트 ──
     보기·정답·오답 이유는 **그 단계에서 필요할 때만** 준다. 처음부터 다 주면 첫 턴부터
     "에이 비 씨 디 중에 골라봐"가 나온다(실측). 모르면 말할 수 없다 — stageGate.ts */
  questions.forEach((q, i) => {
    lines.push(`문항 ${i + 1}: ${q.q}`)
    if (gate === 1) return                       // 단서 단계 — 보기 자체를 주지 않는다
    q.options.forEach((o) => {
      const mark = gate >= 3 && o.correct ? ' ← 정답' : ''
      // 오답 이유는 오답 제거 단계(4)부터. 정답 근거는 정답 공개(3)와 함께.
      const why = (gate >= 4 || (gate === 3 && o.correct)) && o.why ? `  (${o.why})` : ''
      lines.push(`  ${o.label}) ${o.text}${mark}${why}`)
    })
  })
  lines.push(`[지금 단계에서 말해도 되는 범위] ${GATE_RULE[gate]}`)
  lines.push('규칙: 학생이 오답을 고르면 정답을 바로 말하지 말고 위 근거로 왜 틀렸는지 짚고 다시 생각하게 하라. 학생이 물으면 위 사실 범위에서 답하라. 사실에 없는 건 모른다고 하라.')
  return lines.join('\n')
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

/* 단계명(S코드/Q번호 접두어)에서 사람이 읽을 라벨만 뽑는다. 남는 게 'S2+S4'처럼 코드성이면 버린다 —
   그런 조각은 화면 제목으로 노출하기엔 의미가 없다. */
function cleanStageLabel(stage: string): string | null {
  const s = stage
    .replace(/^S\d+(\+S\d+)*\s*/, '')
    .replace(/^Q\d+\s*·\s*/, '')
    .replace(/\s*·\s*S\d+(\/S\d+)*$/, '')
    .trim()
  if (!s || /^S\d/.test(s)) return null
  return s
}

/* S1~S7은 스캐폴딩 시트 전체에서 공통된 의미(관찰→유형판별→코칭→구조파악→정답연결→오답제거→정리)를 갖는다 */
const S_HEADING: Record<string, string> = {
  '1': '핵심 단서 찾기', '2': '유형 파악', '3': '개념·표현 확인', '4': '구조 파악·읽기',
  '5': '정답 연결', '6': '오답 제거', '7': '핵심 정리',
}
/* S코드가 없는 자유 단계명(Q번호 진행, 실전형 등)은 인터랙션 종류 기준으로 대체 */
const KIND_HEADING: Record<Interaction['kind'], string> = {
  next: '다음으로', choice: '선택해 보기', pickAnswer: '정답 고르기', solveAll: '문제 풀기',
  subjective: '생각 말하기', mark: '단서 찾기', match: '근거 연결',
}

/* 화면 머리말에 띄울 "지금 하는 일" 한 줄 — 단계명 → S헤딩 → 인터랙션 헤딩 순으로 고른다 */
function stageHeading(turn: Turn): string {
  const sNum = turn.stage.match(/^S(\d)/)?.[1]
  return cleanStageLabel(turn.stage) ?? (sNum ? S_HEADING[sNum] : undefined) ?? KIND_HEADING[turn.interaction.kind]
}

/* ── 턴의 성격 대략 분류 ──
   **상단 4단계 표시는 이걸 쓰지 않는다**(화면 phase 를 따른다 — macroActive 주석 참고).
   지금 쓰는 곳은 도입의 '오늘 배울 내용' 목록뿐이다: 수업 성격의 턴만 골라 소제목을 뽑는다. */
type Macro = '수업' | '실전' | '정리'
function macroOf(t: Turn): Macro {
  const s = t.stage
  const k = t.interaction.kind
  if (s.includes('표현 정리') || s.startsWith('S7')) return '정리'
  if (k === 'solveAll' || k === 'pickAnswer' || s.includes('정답 선택') || s.includes('답 선택') || s.includes('전체 듣기')) return '실전'
  return '수업'
}
const MACRO_IDX: Record<Macro, number> = { 수업: 1, 실전: 2, 정리: 3 }

/* ── 상단 머리말 ──
   예전엔 도입·수업·실전·정리가 알약 버튼 네 개였다 — 누를 수 있어 보이는데 안 눌리고, 상단을 다 먹었다.
   지금은 **지금 하는 일의 소제목**이 주인공이다(펠로톤·애플 피트니스식):
     · 현재 단계만 작은 칩 하나 + 점 네 개로 "4개 중 몇 번째"만 표시 (나머지 단계명은 안 읽힌다)
     · 굵은 줄 = 지금 단계의 소제목 — 단계가 넘어가면 이 줄이 바뀐다 */
function PhaseStepper({ active, subtitle, onEnd, extra, onJump }: {
  active: number; subtitle?: string; onEnd: () => void; extra?: ReactNode
  /** 개발용 단계 점프 (DEV_PHASE_JUMP) — 넘기면 각 단계가 눌린다 */
  onJump?: (i: number) => void
}) {
  const labels = ['도입', '수업', '실전', '정리']
  return (
    <div className="shrink-0 flex items-center gap-4 md:gap-8 px-3 md:px-5 py-2 bg-white border-b border-[#EBEBF0]">
      <button onClick={onEnd} className="p-1 shrink-0 -ml-1" aria-label="나가기">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      {/* 알약도 동그라미도 쓰지 않는다 — 글자 + 그 아래 얇은 트랙(탭 밑줄 방식).
          지금 단계 칸만 늘어나면서 밑줄이 길어지고, 그 옆에 "지금 하는 일"이 붙는다.
          폭은 다 쓰지 않는다 — 최대 폭을 두고 가운데 두면 양옆이 숨을 쉰다. */}
      <div className="flex-1 min-w-0 flex justify-center">
        <div className="w-full max-w-[680px] flex items-end gap-4 md:gap-6">
          {labels.map((label, i) => (
            <div key={label} onClick={onJump ? () => onJump(i) : undefined}
              title={onJump ? `${label} 단계로 이동 (개발용)` : undefined}
              className={`min-w-0 ${i === active ? 'flex-1' : 'shrink-0 w-11 md:w-14'} ${
                onJump ? 'cursor-pointer group' : ''
              }`}>
              <div className="flex items-baseline gap-2 min-w-0">
                <span className={`shrink-0 text-[12px] md:text-[13px] transition-colors ${
                  i === active ? 'font-black text-[#1C1B33]'
                    : i < active ? 'font-bold text-[#94A3B8]' : 'font-bold text-[#CBD5E1]'
                } ${onJump && i !== active ? 'group-hover:text-[#2563EB]' : ''}`}>{label}</span>
                {i === active && subtitle && (
                  <span className="min-w-0 truncate text-[11.5px] md:text-[12.5px] font-medium text-[#64748B]">{subtitle}</span>
                )}
              </div>
              <span className={`mt-1 block h-[2px] rounded-full transition-colors ${
                i === active ? 'bg-[#2563EB]' : i < active ? 'bg-[#C7D2E0]' : 'bg-[#EDF1F7]'
              } ${onJump && i !== active ? 'group-hover:bg-[#93C5FD]' : ''}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">{extra}</div>
    </div>
  )
}


/* ── 콘텐츠 액션 안내 — 지문/문항에서 직접 할 일(단어 마킹·정답 선택·전체 풀기·근거 연결)을
   콘텐츠(지문/문항) 바로 위에 작게 띄운다. 강사 설명 영역에서 뺀 지시가 여기로 온다.
   실제 상호작용은 지문/문항에서 일어나므로, 지시도 그 옆에 있는 게 맞다. */
function ContentActionHint({ turn, lesson, answers, graded, matchTapped,
  markDone, markChecking, markVerdict, onCheckMark }: {
  turn: Turn; lesson: TypeLesson
  answers: Record<number, string>; graded: Set<number>; matchTapped: Set<string>
  markDone?: boolean; markChecking?: boolean
  markVerdict?: { read: string | null; ok: boolean; hint: string } | null
  onCheckMark?: () => void
}) {
  const it = turn.interaction
  let icon = ''
  let text = ''
  let sub = ''
  let done = false
  if (it.kind === 'mark') {
    // 자료에 맞는 안내만 — 사진에는 탭할 단어가 없다
    const onPhoto = !!lesson.content.photo || lesson.content.questions.some((q) => q.photo)
    icon = '🖍️'; text = it.prompt
    sub = markChecking ? '표시한 것 확인 중…'
      : markVerdict?.read ? `${markVerdict.ok ? '✓' : '✗'} ${markVerdict.read}`
        : markDone ? '표시 완료'
          : onPhoto ? '펜으로 사진에 동그라미 치기' : '단어를 탭하거나 펜으로 밑줄'
    done = !!markDone && markVerdict?.ok !== false
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
  /* 강사 창 안(발화 박스 아래 / 채팅 흐름 안)에 뜬다 — 폭이 좁으므로 두 줄로 접어 쓴다 */
  return (
    <div className={`shrink-0 flex items-start gap-2 rounded-xl border px-3 py-2 ${
      done ? 'border-[#86EFAC] bg-[#F0FDF4]' : 'border-[#FDBA74] bg-[#FFF7ED]'
    }`}>
      <span className="text-[13px] shrink-0 leading-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-bold leading-snug ${done ? 'text-[#15803D]' : 'text-[#C2410C]'}`}>{text}</p>
        {sub && <p className={`mt-0.5 text-[11px] font-semibold ${done ? 'text-[#16A34A]' : 'text-[#9A3412]'}`}>{sub}</p>}
      </div>
      {/* 판정은 필기가 멈추면 자동으로 돈다 — 버튼은 결과가 나온 뒤 다시 보게 할 때만 남긴다 */}
      {it.kind === 'mark' && onCheckMark && markVerdict && !markChecking && (
        <button onClick={onCheckMark}
          className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#FDBA74] bg-white text-[#C2410C] hover:bg-[#FFF7ED]">
          다시 확인
        </button>
      )}
    </div>
  )
}

export default function TypeLessonPlayer({ lesson: lessonProp, instructor = RAIL_OWNER, lectureCode, draftId, preparing, initialStage }: {
  lesson: TypeLesson
  instructor?: string
  /** DB 레일로 돌 때의 해석 결과. 지금은 화면에 쓰지 않는다 —
   *  좌하단 '레일 검토' 버튼은 필기 연필 버튼에 자리를 내주고 사라졌다(호출부 호환용으로만 남긴다). */
  rail?: { diags: RailDiag[]; source: string; generated?: Record<number, string>; status?: string }
  /** 대사 생성이 아직 안 끝났는가 — 끝나기 전에 수업을 시작하면 옛 문구를 말한다 */
  preparing?: boolean
  /** 강의 코드. 넘기면 학습 로그를 남긴다(STEP 6). 없으면 기록하지 않는다 */
  lectureCode?: string
  /** 레일 편집기 드래프트로 열렸는가 — 배너를 띄운다. 정본과 헷갈리면 안 된다 */
  draftId?: string | null
  /** 'practice' 면 도입·수업을 건너뛰고 실전 세트부터 연다 (유형 그리드에서 오는 링크) */
  initialStage?: 'practice'
}) {
  const router = useRouter()

  /* ── 단계 ──
     'review' = 실전에서 틀린 문항만 강사와 다시 푸는 단계 (실전 → **리뷰** → 정리).
     자율학습/오답노트 화면(my-learning/wrong)은 MVP 범위 밖이라 쓰지 않는다. */
  const [phase, setPhase] = useState<'lesson' | 'practice' | 'review' | 'wrap' | 'done'>(
    initialStage === 'practice' ? 'practice' : 'lesson')
  const [practiceScore, setPracticeScore] = useState<PracticeResult | null>(null)
  const [recapScore, setRecapScore] = useState<{ correct: number; total: number } | null>(null)

  /* 실전 세트(없으면 수업 문항 그대로) — 리뷰는 이 문항들을 다시 푼다 */
  const practiceContent = lessonProp.practice ?? lessonProp.content

  /* 틀린 문항 하나당 턴 하나. 강사 발화는 여기서 만들지 않는다 —
     `tutor` 에 **사실만** 담아 directiveOf 로 에이전트에 넘기면, 에이전트(LLM)가 자기 말투로 만들어
     말한다. 백엔드=머리 / 에이전트=입 (docs/tutor-engine.md).
     ⚠️ 정답 보기의 근거는 넣지 않는다. 넣으면 에이전트가 답을 흘린다 — 다시 풀릴 수가 없다. */
  const reviewTurns = useMemo<Turn[]>(() => {
    const results = practiceScore?.results ?? []
    const picked = practiceScore?.answers ?? {}
    const qs = practiceContent.questions
    const wrongIdx = results.map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0)
    return wrongIdx.map((qIdx, n) => {
      const q = qs[qIdx]
      const myLabel = picked[qIdx]
      const my = q?.options.find((o) => o.label === myLabel)
      const facts = [
        `학생이 실전에서 ${qIdx + 1}번 문항을 틀렸다.`,
        q?.q ? `문항: "${q.q}"` : '',
        my ? `학생이 고른 보기: ${my.label}) ${my.text}` : '',
        my?.why ? `그 보기가 답이 될 수 없는 이유: ${my.why}` : '',
        '이 이유를 네 말로 풀어 짧게 짚어주고, 다시 골라보라고 해라.',
        '정답이 무엇인지는 절대 말하지 마라 — 학생이 스스로 다시 고르는 단계다.',
      ].filter(Boolean)
      return {
        no: n,
        stage: `틀린 문제 같이 보기 ${n + 1}/${wrongIdx.length}`,
        tutor: facts.join(' '),
        focusQ: qIdx,
        interaction: { kind: 'pickAnswer', qIdx, prompt: '다시 골라보세요' },
      } as Turn
    })
  }, [practiceScore, practiceContent])

  /* 리뷰 단계에서는 **수업 렌더 경로를 그대로 재사용**한다 — 강사 창·에이전트·진행 게이트가
     이미 거기 붙어 있다. 콘텐츠와 턴만 갈아끼우면 되므로 lesson 자체를 바꿔치기한다. */
  const lesson = phase === 'review'
    ? { ...lessonProp, content: practiceContent, turns: reviewTurns }
    : lessonProp

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
  const gatesRef = useRef<Gate[]>([])
  /** 이 턴에 들어온 시각 — 진행 속도 제한에 쓴다.
   *  (기존 turnEnteredAtRef 는 학습 로그가 켜졌을 때만 갱신돼서 미리보기에서는 못 쓴다) */
  const enteredAtRef = useRef<number>(Date.now())
  /** 마지막으로 턴을 넘긴 시각 — 에이전트가 next_step 을 연달아 불러 여러 단계를 몰아 넘기는 것을 막는다 */
  const advancedAtRef = useRef<number>(0)
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
  /* 스캐폴딩 레일 바 — 기본 숨김. 강사 창 헤더의 'STEP n/총'을 누르면 열린다 */
  /** 리뷰 단계에서 문항별로 다시 틀린 횟수. 두 번 틀리면 정답을 열어주고 넘어간다 */
  const reviewTriesRef = useRef<Map<number, number>>(new Map())
  /** 수업 시작 시각 — 완료 화면의 '풀이 시간' */
  const startedAtRef = useRef(Date.now())

  /* ── 완료 화면이 쓸 '오늘 남은 분량'과 '다음 강의' ──
     다음 강의 = 커리큘럼 순서에서 지금 강의 다음으로 나오는, **문항이 있는(플레이 가능한)** 강의.
     오늘 이미 들은 강의는 건너뛴다. 목록을 못 읽었거나 마지막 강의면 없다(= 내 학습으로). */
  const curriculum = useCurriculumLectures()
  const [todayLeft, setTodayLeft] = useState(0)
  useEffect(() => {
    // 'done' 으로 넘어온 뒤에 읽어야 방금 끝낸 강의가 반영된다
    if (phase === 'done') setTodayLeft(getTodayProgress().remaining)
  }, [phase])
  const nextLecture = useMemo(() => {
    if (!lectureCode || !curriculum.length) return undefined
    const playable = curriculum.filter((l) => l.questionCount > 0)
    const i = playable.findIndex((l) => l.code === lectureCode)
    if (i < 0) return undefined
    const doneCodes = new Set(getTodayProgress().doneCodes)
    return playable.slice(i + 1).find((l) => !doneCodes.has(l.code))
    // phase — 완료로 넘어간 뒤 다시 계산해야 방금 끝낸 강의가 doneCodes 에 반영된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum, lectureCode, phase])
  const turn: Turn = turns[Math.min(turnIdx, turns.length - 1)]

  /* 진행 상태 */
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const [tutorMarks, setTutorMarks] = useState<Set<string>>(new Set())
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState<Set<number>>(new Set())
  const [answeredQ, setAnsweredQ] = useState<Set<number>>(new Set()) // pickAnswer로 텍스트 공개된 문항
  /** 틀리게 고른 보기 `${qIdx}:${label}` — 채점 전에도 "이건 아니다"를 화면에 남긴다 */
  const [wrongPicks, setWrongPicks] = useState<Set<string>>(new Set())
  /* 도입(LessonIntro) → 수업 진입 여부. 실전으로 바로 들어온 경우엔 도입을 지나온 것으로 본다
     (도입 화면이 실전 위에 다시 뜨면 "시작하기"가 수업으로 되돌린다) */
  const [started, setStarted] = useState(initialStage === 'practice')
  /* 강사 창 배치 — 우측 패널(기본) ⇄ 최소화(작은 창). 강사 말·선택지·행동 지시·입력이 전부 이 창 안에 있다 */
  const [dockMode, setDockMode] = useState<DockMode>('sidebar')
  const dockModeRef = useRef(dockMode)
  dockModeRef.current = dockMode
  const feedRef = useRef<HTMLDivElement>(null)   // 대화 흐름 — 새 발화·새 단계가 오면 아래로 따라간다
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('voice')
  /* 에이전트 콜백은 세션 시작 시점 클로저를 잡는다 — 지금 모드는 ref 로 읽어야 최신이다 */
  const chatModeRef = useRef(chatMode)
  chatModeRef.current = chatMode
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
        /* ── 텍스트 모드에서는 **입력창으로 친 것만** 학생 답이다 ──
           마이크는 micMuted 로 꺼두지만, 꺼지기 전에 잡힌 소리나 SDK 쪽 전사가 뒤늦게 올라오면
           말한 적 없는 답이 대화에 끼어든다(실측). 내가 친 문장(typedRef)이 아니면 버린다. */
        const typed = typedRef.current.has(p.message)
        if (typed) typedRef.current.delete(p.message)
        if (chatModeRef.current === 'text') {
          if (!typed) {
            if (PACE_LOG) console.log('[pace] 텍스트 모드 — 음성 전사 무시', JSON.stringify(p.message))
            return
          }
          // 친 문장은 보낼 때 이미 화면에 올렸다 — 응답으로만 세고 대화에는 다시 안 쌓는다
          respondedRef.current.add(cur)
          agentReactedRef.current.delete(cur)
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
            ? '지금 화면이 음원을 재생하는 중이다. **아무 말도 하지 말고** 조용히 기다려라. '
              + '재생이 끝나면 시스템이 [진행] 신호로 알려준다. 이 문장을 소리 내어 옮기지 마라.'
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

        /* ── 진행 속도 가드 ──
           실측: 학생 풀이 다음 단계들이 통째로 건너뛰어지고 갑자기 다음 문제로 갔다.
           에이전트가 next_step 을 연달아 부르면 한 번에 여러 턴이 넘어가기 때문이다.
           ① 방금 넘긴 직후의 재호출은 무시한다(1.2초). */
        if (Date.now() - advancedAtRef.current < 1200) {
          if (PACE_LOG) console.log('[pace] 연속 호출 차단', cur)
          return '방금 다음 단계로 넘어왔다. 지금 단계를 먼저 진행하라. next_step 을 연달아 부르지 마라.'
        }
        /* ② "들려주고 넘어가는 턴"은 **화면이 넘긴다.** 에이전트가 먼저 부르면 발화·음원이
           끝나기도 전에 넘어간다. 다만 화면 쪽이 어떤 이유로 멈추면 수업이 서므로,
           5초가 지나면 에이전트 호출도 허용해 폴백으로 둔다. */
        if (curTurn && !needsAnswer(curTurn) && Date.now() - enteredAtRef.current < 5000) {
          if (PACE_LOG) console.log('[pace] 화면 소유 턴 — 에이전트 진행 보류', cur)
          return '이 단계는 화면이 자동으로 넘긴다. next_step 을 부르지 말고, 할 말만 하고 멈춰라.'
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

        /* 끝내 못 맞히고 넘어가는 경우 — 화면도 답을 공개해야 한다.
           오답은 채점하지 않으므로(재시도 가능하게), 여기서 공개하지 않으면 학생은 답을 못 본 채
           다음 단계로 간다. */
        if (gaveUp && curTurn?.interaction.kind === 'pickAnswer') {
          const qi = curTurn.interaction.qIdx
          setGraded((p) => new Set(p).add(qi))
          setAnsweredQ((p) => new Set(p).add(qi))
        }

        if (cur >= live.length - 1) {
          stopVoice()
          setPhase('practice')
          return (gaveUp ? '학생이 끝내 답하지 않았다. 답과 근거를 한 문장으로 짚어 준 다음, ' : '')
            + '수업 단계가 끝났다. 학생에게 이제 실전 문제를 풀어보자고 짧게 말하고 멈춰라.'
        }
        const nextIdx = cur + 1
        setTurnIdx(nextIdx)
        advancedAtRef.current = Date.now()
        if (PACE_LOG) console.log('[pace] 에이전트 진행', cur, '→', nextIdx, gaveUp ? '(응답 없이 포기)' : '')
        const next = directiveOf(live[nextIdx], gatesRef.current[nextIdx] ?? 1)
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
        /* 리뷰 단계의 0번 턴 tutor 는 **사실 나열**이라 그대로 읽으면 안 된다(첫 마디는 낭독된다).
           그래서 리뷰는 여는 말을 따로 준다. 문항별 짚기는 1번 지시부터 나간다. */
        instructor_greeting: phase === 'review'
          ? '자, 방금 푼 것 중에 틀린 것만 같이 다시 볼게요. 하나씩 짚어봅시다.'
          : turns[0].tutor,
      }),
    }).catch(() => {})
  }
  /* ── 강사 세션은 화면을 벗어나면 무조건 끊는다 ──
     안 끊으면 학생이 다른 화면으로 가도 마이크가 열려 있고 강사가 계속 말한다(요금도 계속 나간다).
     두 군데가 새고 있었다:
       1) 정리 effect 가 **렌더 0번의 conversation** 을 closure 로 물고 있었다. 세션을 다시 열면
          (예: 실전에서 끊었다가 리뷰에서 재연결) 그 closure 의 endSession 은 옛 세션을 가리켜 헛돈다
          → 최신 것을 ref 로 잡아 부른다.
       2) 라우트 이동은 언마운트로 잡히지만 **탭 닫기·새로고침은 언마운트가 안 도는 경우가 있다**
          → pagehide 로 한 번 더 건다(bfcache 때문에 beforeunload 보다 pagehide 가 안전하다). */
  const convRef = useRef(conversation)
  convRef.current = conversation
  const endAgent = useCallback(() => { try { convRef.current.endSession() } catch { /* noop */ } }, [])
  useEffect(() => {
    const bye = () => { endAgent(); stopVoice() }
    window.addEventListener('pagehide', bye)
    return () => { window.removeEventListener('pagehide', bye); bye() }
  }, [endAgent])

  /* 수업 화면 진입(도입에서 "수업 시작" 클릭 → started=true) 시 강사 대화를 자동으로 시작한다.
     그 클릭이 사용자 제스처라 세션 시작/마이크 권한이 허용된다. 이미 연결 중/연결됨이면 건드리지 않고,
     started는 세션 동안 한 번만 true로 바뀌므로 "다시 해보기"로 재시작해도 중복 연결되지 않는다.
     (학생이 직접 '대화 종료'를 누른 경우엔 이 효과가 다시 안 돌아 자동 재연결도 없다) */
  /* 실전으로 바로 들어온 경우엔 자동 연결하지 않는다 — 실전은 학생 혼자 푸는 단계고(아래 phase 효과가
     연결을 끊는다), 무엇보다 **사용자 제스처 없이 페이지 로드만으로 세션이 붙으면** 안 된다 */
  const autoStartedRef = useRef(initialStage === 'practice')
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
  /** 학생이 **입력창에 직접 친** 문장 — 텍스트 모드에서 음성 전사와 구분하는 유일한 근거 */
  const typedRef = useRef<Set<string>>(new Set())
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
  /* 공개 등급 — 단계가 오르면 그때 더 준다(stageGate). 컨텍스트는 누적돼 되돌릴 수 없으므로
     **처음부터 다 주지 않는 것**이 통제의 핵심이다. */
  const gates = useMemo(() => gateLevels(turns), [turns])
  const gate: Gate = gates[turnIdx] ?? 1
  gatesRef.current = gates          // clientTool 은 세션 시작 시점 클로저라 ref 로 읽어야 한다
  const factsSentRef = useRef<string | null>(null)
  useEffect(() => {
    if (!agentConnected) { factsSentRef.current = null; return }
    // 아이템이 바뀌거나 **등급이 오르면** 다시 보낸다
    const key = `${curItemSeq ?? 'all'}:${gate}`
    if (factsSentRef.current === key) return
    const raised = factsSentRef.current?.startsWith(`${curItemSeq ?? 'all'}:`)  // 등급만 오른 경우
    factsSentRef.current = key
    try {
      ;(conversation as unknown as { sendContextualUpdate?: (t: string) => void })
        .sendContextualUpdate?.((raised ? '[공개 범위가 넓어졌다]\n' : SPEECH_RULES + '\n\n')
          + buildLessonFacts(lesson, curItemSeq, gate))
      if (PACE_LOG) console.log('[gate] 사실 전송', GATE_NAME[gate], `item=${curItemSeq ?? 'all'}`)
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentConnected, curItemSeq, gate])

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
  }, [turnIdx, chatLog.length, dockMode, chatMode])

  /* 실전·정리로 넘어가면 강사 세션 종료 — 문제 풀이 중 강사가 계속 말하지 않게.
     **리뷰는 예외다** — 틀린 문제를 강사와 같이 푸는 단계라 다시 연결한다.
     실전에서 한 번 끊겼으므로 여기서 새로 연다(연결에 몇 초 걸린다). */
  useEffect(() => {
    if (phase === 'practice' || phase === 'wrap' || phase === 'done') endAgent()
    if (phase === 'review' && conversation.status === 'disconnected') startAgent()
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

  /* ── 강사 창은 세로 화면에서도 **옆에 그대로 선다** ──
     예전엔 lg(1024) 밑에서 위/아래로 쌓았다. 태블릿 세로(820)에서 지문이 화면의 42%로 눌리고
     강사 창이 아래에 잘려 붙어서, 학생이 지문과 강사를 번갈아 볼 수가 없었다.
     그래서 배치는 하나뿐이다 — **옆에 서거나(sidebar), 너무 좁으면 접히거나(mini)**.
     경계는 폭 700px: 강사 창 최소 320 + 지문 최소 380. 그 밑은 옆에 세워도 둘 다 못 읽는다. */
  const SIDEBAR_MIN_W = 700
  const [narrow, setNarrow] = useState(false)
  const autoMiniRef = useRef(false)      // 좁아서 자동으로 접은 것인가 (넓어지면 되돌린다)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SIDEBAR_MIN_W - 1}px)`)
    const apply = () => {
      setNarrow(mq.matches)
      if (mq.matches) {
        if (dockModeRef.current === 'sidebar') { autoMiniRef.current = true; setDockMode('mini') }
      } else if (autoMiniRef.current) {
        autoMiniRef.current = false
        setDockMode('sidebar')            // 학생이 직접 접은 건 되돌리지 않는다
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

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
  /** 근거 연결(match) — 지문에서 직접 탭한 근거. `${passageId}:${targetId}` 키로 저장 */
  const [matchTapped, setMatchTapped] = useState<Set<string>>(new Set())

  /* 단어 마킹(mark) — 목표 단어를 모두 형광펜으로 표시하면 완료로 보고 에이전트에 알린다 */
  useEffect(() => {
    const it = turn.interaction
    if (it.kind !== 'mark' || !it.targetWords?.length) return
    const targets = targetTokens(it.targetWords)
    /* 표시 키는 `자리|토큰번호|단어` 다(같은 단어가 여러 군데 있어도 짚은 자리만 칠하려고).
       완료 판정은 여전히 **단어** 기준이므로 키에서 단어만 뽑아 비교한다. */
    const words = markedWords(marks)
    const allMarked = Array.from(targets).every((w) => words.has(w))
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

  /* ── 표시(동그라미·밑줄) 판정 ──
     사진 위 표시는 좌표로 풀 수 없다(무엇이 어디 있는지 데이터가 없다). 그래서 **화면을 그대로
     합성해서** 판정 라우트에 보낸다: 사진 <img> 를 그리고 그 위에 필기 캔버스의 해당 영역을 얹는다.
     실패(키 없음·못 읽음)해도 진행을 막지 않는다 — 판정은 코칭을 위한 것이지 관문이 아니다. */
  const [markVerdict, setMarkVerdict] = useState<{ read: string | null; ok: boolean; hint: string } | null>(null)
  const [markChecking, setMarkChecking] = useState(false)

  const composeMarkedImage = (): string | null => {
    const canvas = draw.canvasRef.current
    const img = contentRef.current?.querySelector('img') as HTMLImageElement | null
    if (!img || !img.complete || !img.naturalWidth) return null
    const r = img.getBoundingClientRect()
    const out = document.createElement('canvas')
    out.width = Math.round(r.width)
    out.height = Math.round(r.height)
    const ctx = out.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, out.width, out.height)
    if (canvas) {
      // 필기 캔버스는 contentRef 영역 기준이라, 사진과 겹치는 부분만 잘라 얹는다
      const cr = canvas.getBoundingClientRect()
      const sx = canvas.width / cr.width
      const sy = canvas.height / cr.height
      ctx.drawImage(canvas,
        (r.left - cr.left) * sx, (r.top - cr.top) * sy, r.width * sx, r.height * sy,
        0, 0, out.width, out.height)
    }
    return out.toDataURL('image/png')
  }

  const checkMark = async () => {
    const it = turn.interaction
    if (it.kind !== 'mark' || markChecking) return
    const image = composeMarkedImage()
    if (!image) {
      // 사진이 없는 화면(지문 파트)은 아직 좌표 판정을 안 붙였다 — 표시만 완료로 본다
      setMarkDone(true)
      reportAction(`${turnIdx}:mark`, actionMessage('화면에 핵심 단서를 표시했습니다'))
      return
    }
    setMarkChecking(true)
    try {
      const res = await fetch('/api/mark-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          task: it.prompt,
          /* 판정 기준 = 이 문항의 사실. 표시 판정은 **정답을 알아야** 맞게 짚었는지 볼 수 있으므로
             화면 게이트와 달리 항상 전체(4)를 준다. 이 값은 학생에게 노출되지 않는다(서버 판정용). */
          targets: buildLessonFacts(lesson, turn.itemSeq, 4),
        }),
      })
      const v = await res.json()
      const verdict = { read: (v?.read as string | null) ?? null, ok: !!v?.ok, hint: (v?.hint as string) ?? '' }
      setMarkVerdict(verdict)
      setMarkDone(true)
      /* 강사에게 판정을 넘겨 반응하게 한다 — 잘못 짚었으면 정답을 말하지 않고 어디를 볼지만 짚는다 */
      reportAction(`${turnIdx}:mark`,
        verdict.read
          ? actionMessage(`화면에 "${verdict.read}"를 표시했습니다`, verdict.ok,
            verdict.ok ? undefined : verdict.hint || undefined)
          : actionMessage('화면에 표시했지만 무엇을 표시했는지 읽지 못했습니다 — 무엇을 짚었는지 말로 물어보세요'))
    } catch {
      setMarkDone(true)
      reportAction(`${turnIdx}:mark`, actionMessage('화면에 핵심 단서를 표시했습니다'))
    } finally { setMarkChecking(false) }
  }

  /* 필기가 멈추면 **버튼 없이** 알아서 판정한다 — 학생이 표시하고 나서 확인 버튼을 또 눌러야
     하면 흐름이 끊긴다. 획을 그을 때마다 타이머를 미루고, 1.2초 조용하면 그때 본다.
     (그리는 중에 보내면 반쯤 그린 동그라미를 판정한다) */
  useEffect(() => {
    if (turn.interaction.kind !== 'mark' || !draw.strokeCount || markChecking) return
    const t = setTimeout(() => { void checkMark() }, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw.strokeCount, turnIdx])

  /* ── 음원 재생 토큰 ──
     학생이 직접 돌린 재생(문장/보기)과 턴이 트는 음원이 겹치지 않게 세대를 센다.
     전체 재생 바는 없앴다 — "지금 어디가 나오는지"는 음원이 나오는 곳(보기·문항 옆 스피커)에서 보여준다. */
  const barTokenRef = useRef(0)

  /* 스크립트 문장 하나만 재생 — 바 재생/턴 음원과 겹치지 않게 토큰을 올리고 끊는다 */
  const playSentence = (id: string, text: string) => {
    barTokenRef.current += 1
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
    advancedAtRef.current = Date.now()
    if (PACE_LOG) console.log('[pace] 화면이 진행(들려주는 턴)', from, '→', nextIdx)
    if (!agentConnected) return
    sendToAgent(`[진행] 다음 단계로 넘어갔다.\n${directiveOf(turnsRef.current[nextIdx], gatesRef.current[nextIdx] ?? 1)}`)
  }

  /* 턴 진입: 발화 → 음원. 로컬 상호작용 상태 리셋 (도입 전에는 재생 안 함) */
  useEffect(() => {
    if (!started) return
    setChoicePicked(null); setSubjText(''); setSubjSent(false); setMarkDone(false); setMatchTapped(new Set())
    setPlayingId(null)
    setReaskShown(reaskRef.current.get(turnIdx) ?? 0)
    setMarkVerdict(null); setMarkChecking(false)
    setWrongPicks(new Set())
    enteredAtRef.current = Date.now()
    barTokenRef.current += 1   // 학생이 바로 돌리던 재생은 턴이 바뀌면 끝난다
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
        if (alive) {
          audioDoneRef.current.add(turnIdx)
          /* 에이전트는 화면이 음원을 다 틀었는지 모른다 → 알려줘야 그때 시킬 수 있다.
             이게 없으면 재생 전에 "지금 들은 보기 중에 골라"라고 하고,
             재생이 끝난 뒤에 "아직 재생 중이니 기다려"라고 한다(실측). */
          if (agentOnRef.current && needsAnswer(turn)) {
            sendToAgent('[진행] 음원 재생이 끝났다. 이제 학생에게 이번 단계에서 할 일을 한 문장으로 시켜라.')
          }
        }
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
    // 수업(스캐폴딩) 끝 → 실전 문제 / 리뷰(틀린 문제 다시 풀기) 끝 → 정리
    else { stopVoice(); setPhase(phase === 'review' ? 'wrap' : 'practice') }
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
      const opt = lesson.content.questions[qIdx]?.options.find((o) => o.label === label)
      const ok = !!opt?.correct
      setAnswers((p) => ({ ...p, [qIdx]: label }))
      setAnsweredQ((p) => new Set(p).add(qIdx))
      /* ⚠️ 오답이면 **채점하지 않는다.**
         채점(graded)은 두 가지를 동시에 한다 — 보기를 잠그고, 정답을 초록으로 공개한다.
         그래서 첫 클릭에 채점하면 강사가 "다시 골라봐" 해도 학생은 누를 수 없고,
         이미 정답이 화면에 드러나 있다(실측). 맞혔을 때만 채점하고, 틀린 보기는 따로 표시한다. */
      if (ok) setGraded((p) => new Set(p).add(qIdx))
      else {
        setWrongPicks((p) => new Set(p).add(`${qIdx}:${label}`))
        /* 리뷰는 무한정 붙잡지 않는다 — 한 번 더 기회를 주고, 그래도 틀리면 정답을 열고 넘어간다.
           못 하는 학생을 계속 세워두는 게 더 나쁘다(MAX_REASK 와 같은 판단). */
        if (phase === 'review') {
          const tries = (reviewTriesRef.current.get(qIdx) ?? 0) + 1
          reviewTriesRef.current.set(qIdx, tries)
          if (tries >= REVIEW_MAX_TRIES) setGraded((p) => new Set(p).add(qIdx))
        }
      }
      // 키에 보기까지 넣어야 **두 번째 시도도 강사에게 전달**된다 (턴 단위 키는 한 번만 보낸다)
      reportAction(`${turnIdx}:pick:${label}`,
        actionMessage(`${label}번 보기를 골랐습니다`, ok, ok ? undefined : opt?.why))
      logResponse(label, ok)
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
    // 지금 도는 아이템의 문항만 보여준다 — 강의 하나가 여러 바퀴를 돌면(사진 3장·문장 5개)
    // 문항이 세로로 다 쌓여서 한눈에 안 들어온다. 나머지는 단계가 넘어가면 나온다.
    /* 리뷰는 턴 하나가 곧 문항 하나다 — 틀린 문항이 여러 개여도 세로로 쌓지 않고
       한 화면에 하나만 두고 턴으로 넘긴다(실전 페이저와 같은 방식). */
    visibleQ: phase === 'review'
      ? (turn.focusQ !== undefined ? { from: turn.focusQ, to: turn.focusQ + 1 } : undefined)
      : lesson.items?.find((it) => it.seq === turn.itemSeq)
        ? { from: lesson.items.find((it) => it.seq === turn.itemSeq)!.qFrom,
            to:   lesson.items.find((it) => it.seq === turn.itemSeq)!.qTo }
        : undefined,
    /* 정답 고르기 턴은 **그 문항이 선택 가능해야** 한다.
       focusQ 는 문항이 여러 개일 때만 실리는데(fromSteps), Part1 처럼 아이템당 문항이 1개면
       undefined 가 되어 ContentView 의 `focusQ === qIdx` 가 거짓 → 보기를 아예 못 누른다.
       실측: "정답 보기를 눌러봐" 라고 시키는데 클릭할 수 없었다. 상호작용이 가진 qIdx로 채운다. */
    focusQ: turn.focusQ ?? (turn.interaction.kind === 'pickAnswer' ? turn.interaction.qIdx : undefined),
    answerMode: turn.interaction.kind === 'pickAnswer' ? 'single' : turn.interaction.kind === 'solveAll' ? 'all' : 'none',
    answers, graded, wrongPicks, onSelect, showKo: false,
    matchState,
  }

  /* ── 상단 4단계는 **지금 어느 화면인가**를 따른다 (턴의 상호작용이 아니라) ──
     예전엔 `macroOf(turn)` 으로 현재 턴을 접었는데, 수업 레일 한복판의 '정답 고르기' 턴이
     전부 실전으로 잡혔다. 특히 시트 상호작용이 '선택 응답'인데 **어느 보기인지 안 적혀 있으면**
     fromSteps 가 정답 고르기(pickAnswer)로 낮춘다 — RC-P6-01·02 는 그게 **첫 턴**이라
     수업 시작하자마자 상단이 실전으로 켜졌다(실측). LC-P2·P3·P4 는 중간에 켜졌다.
     단계가 수업 → 실전 → 수업 으로 되돌아가면 학생은 자기가 어디 있는지 읽을 수가 없다.
     4단계는 화면 그 자체다: 도입(LessonIntro) · 수업 · 실전(+오답 리뷰) · 정리(wrap). */
  const macroActive = phase === 'practice' || phase === 'review' ? MACRO_IDX['실전']
    : phase === 'wrap' || phase === 'done' ? MACRO_IDX['정리']
    : MACRO_IDX['수업']
  /* 강사가 지금 말하는 중인가 — 에이전트 연결 시 실제 발화, 아니면 음원/TTS 재생 여부.
     포즈(입 벌린 설명 ↔ 차분) 선택과 도크 하이라이트에 함께 쓴다. */
  const tutorSpeaking = agentConnected ? conversation.isSpeaking : playingId !== null

  /* 강사 창 대화 영역 — 지난 대화를 쌓지 않고 **이번 턴의 주고받은 말만** 보여준다.
     에이전트가 붙어 있으면 실제 마지막 발화/학생 발화, 아니면 레일 발화 + 이번 턴에 학생이 한 응답. */
  const lastAgentAi = [...chatLog].reverse().find((m) => m.role === 'ai')?.text
  const tutorLine = (agentConnected && lastAgentAi) || turn.tutor

  /* 내 답변 표시 — **전달됐다는 확인**이지 대화 기록이 아니다.
     종전에는 chatLog 의 마지막 학생 발화를 계속 띄워서, 답하지 않은 다음 턴에도 남아 있었다.
     에이전트가 붙어 있으면 **강사가 다시 말하는 순간 사라지게** 마지막 메시지 기준으로 본다. */
  const studentLine = (() => {
    if (agentConnected) {
      const last = chatLog[chatLog.length - 1]
      return last?.role === 'user' ? last.text : null
    }
    const it = turn.interaction
    if (it.kind === 'choice' && choicePicked !== null) return it.choices[choicePicked]?.text ?? null
    if (it.kind === 'subjective' && subjSent && subjText.trim()) return subjText.trim()
    if (it.kind === 'mark' && markDone) return '표시했어요'
    if (it.kind === 'pickAnswer' && graded.has(it.qIdx)) {
      const picked = lesson.content.questions[it.qIdx]?.options.find((o) => o.label === answers[it.qIdx])
      return picked ? `${picked.label}) ${picked.text}` : null
    }
    return null
  })()

  /* ── 텍스트 모드 채팅 흐름 ──
     에이전트가 붙어 있으면 실제 대화 로그를 그대로 쌓는다(강사 회색 / 나 파랑).
     연결 전·폴백에서는 대화가 없으므로 이번 턴의 레일 발화 + 학생 응답 한 쌍으로 만든다. */
  const chatMessages: ChatMsg[] = agentConnected && chatLog.length
    ? chatLog
    : [
      { role: 'ai' as const, text: turn.tutor },
      ...(studentLine ? [{ role: 'user' as const, text: studentLine }] : []),
    ]

  /* ── 개발용 단계 점프 ── (DEV_PHASE_JUMP)
     4단계는 원래 순서대로만 흘러간다. 화면을 확인하려고 매번 수업을 처음부터 도는 건 낭비라
     상단 단계를 눌러 바로 건너뛰게 열어둔다. 학생 빌드에서는 플래그를 끈다. */
  const jumpPhase = DEV_PHASE_JUMP ? (i: number) => {
    stopVoice()
    if (i === 0) { setPhase('lesson'); setStarted(false); return }
    if (i === 1) { setPhase('lesson'); setStarted(true); return }
    if (i === 2) { setPhase('practice'); return }
    setPhase('wrap')
  } : undefined

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
        onJumpPhase={jumpPhase}
        onExit={() => { stopVoice(); router.push('/lessons') }}
        onDone={(score) => {
          setPracticeScore(score)
          /* 틀린 게 있으면 강사와 다시 푸는 단계로. 다 맞혔으면 붙잡을 이유가 없어 바로 정리로 간다.
             리뷰는 수업 렌더 경로를 다시 타므로 진행 상태를 처음으로 돌려놓는다. */
          if (score.correct < score.total) {
            setTurnIdx(0)
            /* 실전에서 고른 오답을 그대로 들고 간다 — 강사가 "이걸 골랐죠"라고 짚는데
               화면이 비어 있으면 무슨 말인지 알 수 없다. 채점은 하지 않는다(정답을 열면 안 되고
               다시 고를 수 있어야 한다). 대신 그 보기는 '이미 틀린 보기'로 빨갛게 남는다. */
            const wrongOnly: Record<number, string> = {}
            const tried = new Set<string>()
            score.results.forEach((ok, i) => {
              const label = score.answers[i]
              if (!ok && label) { wrongOnly[i] = label; tried.add(`${i}:${label}`) }
            })
            setAnswers(wrongOnly); setGraded(new Set()); setAnsweredQ(new Set()); setWrongPicks(tried)
            audioDoneRef.current = new Set(); respondedRef.current = new Set()
            reaskRef.current = new Map(); reaskAtRef.current = new Map(); agentReactedRef.current = new Set()
            reviewTriesRef.current = new Map()
            setPhase('review')
          } else {
            setPhase('wrap')
          }
        }}
      />
    )
  }

  /* ── 세션 정리 (4단계 프레임의 마지막 — 실전 문제 이후) ── */
  if (phase === 'wrap') {
    return (
      <WrapStage
        lesson={lesson}
        onJumpPhase={jumpPhase}
        practiceScore={practiceScore}
        teacherName={teacherName}
        teacherImg={teacherImg}
        onExit={() => { stopVoice(); router.push('/lessons') }}
        onDone={(recap) => {
          stopVoice()
          setRecapScore(recap)
          /* 오늘 몫으로 한 강 채웠다 — 완료 화면이 "다음 수업" 을 띄울지 여기서 갈린다.
             드래프트 미리보기(lectureCode 없음)는 세지 않는다. */
          if (lectureCode) markLectureDone(lectureCode)
          setPhase('done')
        }}
      />
    )
  }

  /* ── 완료 — 성취를 하나씩 보여주고(듀오링고식) 마지막에 다음 행동을 고르게 한다 ── */
  if (phase === 'done') {
    /* 오늘 분량이 남았으면 다음 강의로 잇고, 다 했으면 내 학습으로 보낸다.
       '남은 분량'은 하루 목표(todayPlan)와 오늘 끝낸 강의 수로만 판단한다. */
    const goNextLecture = todayLeft > 0 && nextLecture
      ? () => { stopVoice(); router.push(`/lecture/${nextLecture.code}`) }
      : undefined
    return (
      <SessionEndFlow
        partKey={`part${lesson.part}` as PartKey}
        partName={`${lesson.partName} · ${lesson.title}`}
        elapsedSeconds={Math.floor((Date.now() - startedAtRef.current) / 1000)}
        correctCount={practiceScore?.correct ?? 0}
        totalCount={practiceScore?.total ?? 0}
        results={practiceScore?.results ?? []}
        recap={recapScore ?? undefined}
        onNextLesson={goNextLecture}
        nextLessonLabel={nextLecture ? `다음 수업 · ${nextLecture.title}` : undefined}
        homeLabel={goNextLecture ? '내 학습으로' : '내 학습으로 돌아가기'}
        actionTitle={goNextLecture ? `오늘 ${todayLeft}강 남았어요` : '오늘 분량을 다 했어요!'}
        actionSubtitle={goNextLecture
          ? '이어서 하면 오늘 목표를 채울 수 있어요'
          : '내일 이어서 만나요. 오늘은 여기까지!'}
        onHome={() => { stopVoice(); router.push('/lessons') }}
      />
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
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
        /* 지금 하는 일 — 단계가 넘어가면 이 줄이 바뀐다 (리뷰는 '틀린 문제 다시 풀기 n/N') */
        subtitle={stageHeading(turn)}
        /* 상단 도구줄은 비워 둔다 — 필기는 좌하단 연필 버튼(PenFab), 해석 버튼은 삭제했다.
           (수업은 강사가 짚어주며 읽는 단계라, 한국어 해석을 켜면 학생이 영어를 안 읽는다) */
        onEnd={() => { stopVoice(); router.push('/lessons') }}
        onJump={jumpPhase}
      />

      {/* ── 본문: 좌 콘텐츠 · 우 강사 창.
           최소화(mini)는 fixed라 자리를 차지하지 않아 콘텐츠가 전체 폭을 쓴다 */}
      <div ref={splitRef} className="flex-1 flex min-h-0 bg-white flex-row">
        {/* 좌: 지문/문제/사진 (파트별 ContentView) — 필기 켜면 상단에 도구 바(인라인, 콘텐츠 위로 밀어냄).
            폭은 비율이되 **강사 창 몫 320px 은 남긴다** — 세로 화면에서 72% 를 그대로 쓰면
            강사 창이 200px대로 눌려 선택지 버튼이 두 줄로 깨진다. */}
        <div
          className={`min-h-0 flex flex-col border-gray-100 ${
            dockMode === 'sidebar' ? 'h-full shrink-0 border-r' : 'flex-1 h-full w-full'
          }`}
          style={dockMode === 'sidebar'
            /* 320 = 강사 창 최소 폭, 16 = 그 사이 리사이즈 손잡이 */
            ? { width: `min(${(leftFrac * 100).toFixed(1)}%, calc(100% - 336px))` }
            : undefined}>
          {/* 행동 지시(필기해 보세요·탭해 보세요…)는 여기 두지 않는다 — 강사 창의 선택지 영역으로 옮겼다.
              지시와 선택지가 한 자리에 모여야 학생이 어디를 봐야 할지 헷갈리지 않는다. */}
          {/* 파트1 수업(문항 1개)도 P6·P7과 같이 **높이를 주고 스크롤을 막는다** —
              사진과 보기가 한 화면에 있어야 하는 수업이라 스크롤이 생기면 안 된다.
              실전(문항 여러 개)은 사진이 장마다 달라 세로로 쌓이므로 스크롤을 유지한다. */}
          <div ref={contentRef} className={`flex-1 min-h-0 px-3 md:px-6 py-4 ${
            lesson.part === 6 || lesson.part === 7
              || (lesson.part === 1 && lesson.content.questions.length === 1)
              ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
          }`}>
            <ContentView lesson={lesson} st={st} readingSideBySide={dockMode === 'mini'} />
          </div>
        </div>

        {/* 세로 리사이즈 핸들 — 사이드바일 때만. 사이드바 자체가 폭 700 이상에서만 서므로 항상 보인다 */}
        {dockMode === 'sidebar' && (
          <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
            className="flex w-4 shrink-0 items-center justify-center cursor-col-resize touch-none bg-gray-50 border-x border-gray-100 hover:bg-gray-100">
            <div className="h-12 w-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* 우: 강사 창 — 우측 패널 ⇄ 최소화(작은 창).
            작은 창은 fixed라 여기 자리를 차지하지 않는다. 내용은 슬롯으로 넘기고 배치는 도크가 정한다. */}
        <TutorDock
          mode={dockMode} setMode={setDockMode}
          /* 좁은 화면에서는 접힌 채로 둔다 — 펴 봐야 지문도 강사도 못 읽는 폭이다 */
          canSidebar={!narrow}
          name={teacherName} imgSrc={teacherImg}
          poseSrc={instPose(instructor, poseForTurn(turn, tutorSpeaking))}
          chatMode={chatMode} setChatMode={setChatMode}
          getTutorFreq={() => { try { return conversation.getOutputByteFrequencyData?.() } catch { return undefined } }}
          getMicFreq={() => { try { return conversation.getInputByteFrequencyData?.() } catch { return undefined } }}
          connected={agentConnected} connecting={agentConnecting}
          isSpeaking={tutorSpeaking}
          /* 음성 모드 발화 박스 · 최소화 말풍선에 실시간으로 뜨는 "지금 하는 말" */
          lastLine={tutorLine}
          /* 텍스트 모드 채팅 — 에이전트가 붙어 있으면 실제 대화, 아니면 레일 발화 + 이번 턴 응답 */
          messages={chatMessages}
          bodyRef={feedRef}
          inputText={inputText} setInputText={setInputText}
          onSend={() => {
            const t = inputText.trim()
            if (!t || !agentConnected) { setInputText(''); return }
            /* 친 문장임을 표시해 둔다 — 텍스트 모드에서 이게 아닌 user 메시지는 음성 전사로 보고 버린다 */
            typedRef.current.add(t)
            conversation.sendUserMessage(t)
            setChatLog((prev) => [...prev, { role: 'user', text: t }])
            setInputText('')
          }}
          onStartAgent={startAgent}
          /* ── ① 행동 지시 (필기해 보세요·탭해 보세요…) — 수업 영역이 아니라 강사 창에서 뜬다 ── */
          hint={
            <ContentActionHint turn={turn} lesson={lesson} answers={answers} graded={graded} matchTapped={matchTapped}
              /* 표시(mark) 턴 — 학생이 다 짚었다고 알리면 화면을 합성해 무엇을 짚었는지 판정한다.
                 판정 결과는 강사에게 넘어가 코칭이 되고, 실패해도 진행은 막지 않는다. */
              markDone={markDone} markChecking={markChecking} markVerdict={markVerdict} onCheckMark={checkMark} />
          }
          /* ── ② 선택지 / 다음 단계 버튼 ── */
          /* 단계가 바뀌면 텍스트 모드 채팅에서 카드가 새 말풍선처럼 다시 꽂힌다 */
          actionKey={turnIdx}
          actions={
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
                matchTapped={matchTapped}
                setPlayingId={setPlayingId}
              />
              {/* 스캐폴딩 마지막 턴에서만 — 다음 단계(실전 문제)로 이동 */}
              {turnIdx === turns.length - 1 && (
                <button onClick={goNext} className={PRIMARY_BTN + ' w-full'}>{phase === 'review' ? '정리로 →' : '실전 문제 풀기 →'}</button>
              )}
              {/* 리뷰에서 이 문항이 끝났으면(맞혔거나 정답을 열었으면) 다음 틀린 문항으로.
                  수업에서는 에이전트가 next_step 으로 넘기지만, 리뷰까지 그것만 믿으면
                  에이전트가 조용할 때 학생이 갇힌다 — 여기서는 학생이 직접 넘길 수 있어야 한다. */}
              {phase === 'review' && turnIdx < turns.length - 1
                && turn.interaction.kind === 'pickAnswer' && graded.has(turn.interaction.qIdx) && (
                <button onClick={goNext} className={PRIMARY_BTN + ' w-full'}>다음 문제 →</button>
              )}
            </>
          }
        />
      </div>

      {/* 필기 — 좌하단 연필 버튼(레일 검토 버튼이 있던 자리). 누르면 도구 바가 옆으로 늘어난다 */}
      <PenFab drawMode={draw.drawMode} toggleDraw={draw.toggleDraw}
        /* 표시(mark) 턴 = 필기로 짚어보라는 단계 — 다 짚기 전까지 버튼이 뛴다 */
        attention={turn.interaction.kind === 'mark' && !markDone}
        tool={draw.tool} setTool={draw.setTool} clearCanvas={draw.clearCanvas} setDrawMode={draw.setDrawMode} />
      <DrawingOverlay {...draw} bounds={contentRef} hidePalette />
    </div>
  )
}

/* 실전 페이저의 이전/다음 버튼 */
function PagerBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
        disabled ? 'border-[#F1F2F5] text-[#C4C9D4] cursor-not-allowed'
          : 'border-[#E5E7EB] text-[#374151] bg-white hover:border-[#93C5FD] hover:bg-[#EFF6FF]'
      }`}>{children}</button>
  )
}

/** 실전 결과 — 리뷰 단계가 "무엇을 어떻게 틀렸나"를 알아야 해서 답까지 넘긴다 */
export interface PracticeResult {
  correct: number
  total: number
  /** 문항별 정오답 (완료 화면의 점) */
  results: boolean[]
  /** 문항별로 학생이 고른 보기 라벨 — 리뷰에서 "왜 이걸 골랐는지" 짚는 근거 */
  answers: Record<number, string>
}

/* ── 실전 문제 단계 — 스캐폴딩 없이 한 문항씩 넘겨 풀고 채점 ──
   export 는 화면 갤러리(/dev/screens)가 이 단계만 따로 띄우기 위한 것. 수업을 처음부터
   돌리지 않고 파트별 실전 화면을 바로 볼 수 있어야 검토가 된다. */
export function PracticeStage({ lesson, onExit, onDone, onJumpPhase }: {
  lesson: TypeLesson; onExit: () => void
  onDone: (score: PracticeResult) => void
  /** 개발용 단계 점프 (DEV_PHASE_JUMP) */
  onJumpPhase?: (i: number) => void
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState(false)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const [playingId, setPlayingId] = useState<string | null>(null)
  /* 지금 보고 있는 문항 — 실전은 한 문항씩 넘겨 푼다(아래 visibleQ 주석) */
  const [page, setPage] = useState(0)
  const draw = useDrawingTool()
  const contentRef = useRef<HTMLDivElement>(null)

  /* ── 풀이 시간 ──
     실전은 시험처럼 푸는 단계라 "얼마나 걸렸는지"가 곧 실력의 일부다. 초 단위로 올라가다가
     채점하면 그 자리에서 멈춘다(멈춘 값이 곧 기록). 제한 시간은 두지 않는다 — 재촉이 목적이 아니다. */
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (graded) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [graded])
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  /* 실전 세트가 있으면 그걸 푼다. 없으면(로컬 샘플 유형) 수업에서 다룬 문항을 그대로 다시 푼다. */
  const pLesson = lesson.practice ? { ...lesson, content: lesson.practice } : lesson
  const qs = pLesson.content.questions

  /* 지문이 있는 읽기 파트(P6·P7)는 지문(좌)|문항(우) 2분할로 — 실전은 강사 패널이 없어 폭이 통째로
     남는데, 세로로 쌓으면 보기를 볼 때마다 지문이 화면 밖으로 밀려나 실제 시험처럼 대조가 안 된다.
     이때만 페이지 스크롤을 끄고 높이를 통째로 넘긴다(각 칸이 따로 스크롤). */
  const splitReading = (pLesson.part === 6 || pLesson.part === 7) && (pLesson.content.passages?.length ?? 0) > 0
  const multi = qs.length > 1

  /* ── 음원의 주인 ──
     "문항이 바뀌면 음원을 끊는다" 가 아니라 **"음원이 바뀌어야 할 때만 끊는다"** 로 잡는다.
       Part 1·2 : 문항 하나 = 음원 하나  → 문항을 옮기면 주인이 바뀌므로 끊긴다
       Part 3·4 : 세트 하나 = 문항 3개   → 담화 하나로 3문항을 풀므로 옮겨도 안 끊긴다
     이렇게 두면 나중에 한 강의에 세트가 여럿 생겨도 규칙이 그대로 선다. */
  const setAudio = pLesson.part === 3 || pLesson.part === 4
  /* P3·P4 실전은 **세트가 한 페이지**다(음원 1 + 문항 3). page 가 곧 세트 번호가 된다.
     세트 정보가 없으면(옛 데이터·수업) 전체를 한 세트로 본다. */
  const sets = pLesson.content.sets
    ?? [{ script: pLesson.content.audioScript ?? [], from: 0, to: pLesson.content.questions.length }]
  const ownerOf = (p: number) => (setAudio ? `set:${p}` : `q:${p}`)

  /* ── 실제 시험 간격 ──
     Part 1·2 는 보기를 다 읽어준 뒤 5초. Part 3·4 는 문항을 하나씩 읽어주고 문항마다 8초,
     시각자료(표·그래프) 문항은 표를 보며 답해야 해서 12초를 준다. */
  const gapSec = setAudio ? (pLesson.content.visual ? 12 : 8) : 5

  /* ── 음원 재생 횟수 (실전은 시험처럼 1회) ──
     무제한으로 열어두면 듣기 문제가 "여러 번 듣고 맞히는 문제" 가 되어 실전 감각이 안 잡힌다.
     채점 뒤에는 해설 단계라 제한을 푼다.
     문항 통음원은 ContentView 가 `qaudio:i`, 상단 배너가 `item:i` 로 부른다 — 같은 음원이므로
     주인 기준으로 키를 합친다(안 합치면 P1 실전에서 버튼 두 개가 각각 1회씩 갖는다). */
  const MAX_PLAYS = 1
  const [playCount, setPlayCount] = useState<Record<string, number>>({})
  const countKey = (id: string) => {
    const m = /^(?:qaudio|item):(.+)$/.exec(id)
    if (!m) return id
    if (!setAudio) return `listen:${m[1]}`
    /* 세트 음원은 **세트마다** 1회다. 세트가 여럿인데 키를 하나로 묶으면 첫 세트를 듣는 순간
       나머지 세트가 전부 '재생 완료' 로 잠긴다 → 세트 첫 문항 번호로 가른다. */
    const n = Number(m[1])
    const set = sets.find((s) => n >= s.from && n < s.to)
    return `listen:set:${set ? set.from : 0}`
  }
  const playsLeft = (id: string) => (graded ? Infinity : Math.max(0, MAX_PLAYS - (playCount[countKey(id)] ?? 0)))
  const countPlay = (id: string) => { if (!graded) setPlayCount((p) => ({ ...p, [countKey(id)]: (p[countKey(id)] ?? 0) + 1 })) }

  /* ── 듣기 진행 상태 ──
     runId  : 진행 중인 시퀀스 토큰. 끊으면 올려서 뒤따르던 await 들이 스스로 빠져나간다
     manual : 학생이 손으로 문항을 옮겼는가 — 옮겼으면 그 시퀀스의 **자동 넘김만** 끈다.
              음원은 계속 나간다(Part 3·4 는 담화가 아직 흐르는 중일 수 있다)
     owner  : 지금 나가는 음원의 주인 */
  const runId = useRef(0)
  const manual = useRef(false)
  const owner = useRef<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  /* P3·P4 는 세 문항이 한 화면에 다 펼쳐져 있다 → 페이지를 넘기는 대신 **지금 읽어주는 문항**을 짚는다 */
  const [readingQ, setReadingQ] = useState<number | null>(null)

  const stopRun = useCallback(() => {
    runId.current += 1
    owner.current = null
    setCountdown(null)
    setReadingQ(null)
    stopVoice()
    setPlayingId(null)
  }, [])
  useEffect(() => () => { runId.current += 1; stopVoice() }, [])

  const wait = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms) })

  /* 다음 문항까지 n초. 끊기면 false */
  const countDown = async (my: number, sec: number) => {
    for (let s = sec; s >= 1; s -= 1) {
      if (my !== runId.current) return false
      setCountdown(s)
      await wait(1000)
    }
    if (my !== runId.current) return false
    setCountdown(null)
    return true
  }

  const say = async (my: number, items: { id: string; text: string; src?: string }[]) => {
    if (!items.length) return my === runId.current
    await speakEnglishSeq(items, setPlayingId)
    return my === runId.current
  }

  /* ── 실전 듣기 한 판 ──
     Part 1·2 : 이 문항의 음원 → 5초 → 다음 문항
     Part 3·4 : 담화 전체 → (문항 읽어주기 → 8초 → 다음 문항) 을 세트 끝까지
     마지막 문항에서는 넘기지 않고 멈춘다 — 채점은 학생이 누른다(자동 채점은 되돌릴 수가 없다). */
  const runListening = async (from: number) => {
    // 이미 한 판이 돌고 있으면 무시 — 배너 버튼과 ContentView 버튼이 겹쳐 눌리면 음원이 두 겹으로 난다
    if (owner.current !== null) return
    if (playsLeft(`item:${from}`) <= 0) return
    countPlay(`item:${from}`)
    const my = ++runId.current
    manual.current = false
    stopVoice()

    const script = pLesson.content.audioScript ?? []
    const last = qs.length - 1

    if (setAudio) {
      /* 누른 세트의 스크립트와 문항 범위만 돈다 */
      const si = Math.max(0, sets.findIndex((s) => from >= s.from && from < s.to))
      const set = sets[si]
      owner.current = ownerOf(si)
      const setScript = set ? set.script : script
      const setLast = set ? set.to - 1 : last

      /* 실제 시험은 담화 **앞**에 내레이터 안내가 먼저 나온다 —
         "Questions 1 through 3 refer to the following conversation." */
      if (set?.intro) {
        if (!(await say(my, [{ id: `intro:${from}`, text: set.intro.text, src: set.intro.audio }]))) return
      }

      // 담화·대화 전체
      const ok = await say(my, setScript.map((s) => ({
        id: s.id, text: s.en, src: sentenceSrc(pLesson, s.id) ?? srcOf(pLesson.id, s.id),
      })))
      if (!ok) return
      /* 실제 시험처럼 문항을 하나씩 읽어주고 답할 시간을 준다.
         세 문항이 한 페이지에 다 있으므로 문항 사이에서는 페이지를 넘기지 않는다 — 짚는 문항만 옮긴다. */
      for (let i = from; i <= setLast; i += 1) {
        setReadingQ(i)
        /* 문항 낭독도 내레이터 음원이 있으면 그걸 쓴다("Number 2. Why is the woman …").
           없으면 say() 가 브라우저 TTS 로 떨어진다. */
        if (!(await say(my, [{ id: `qread:${i}`, text: qs[i]?.q ?? '', src: qs[i]?.readAudio }]))) return
        if (!(await countDown(my, gapSec))) return
      }
      setReadingQ(null)
      // 세트가 끝나면 다음 세트로 넘긴다 — 시험에서 음원이 다음 세트로 그냥 이어지는 것과 같다
      if (!manual.current && si < sets.length - 1) setPage(si + 1)
    } else {
      owner.current = ownerOf(from)
      // 문항 통음원 mp3 가 있으면 그걸, 없으면 질문 발화 + 보기를 이어 붙여 재생
      const whole = `qaudio:${from}`
      const wholeSrc = optionSrc(pLesson, whole) ?? srcOf(pLesson.id, whole)
      const items: { id: string; text: string; src?: string }[] = []
      if (wholeSrc) {
        items.push({ id: whole, text: '', src: wholeSrc })
      } else {
        const s = script[from]   // P2 — 문항 i ↔ 질문 발화 i
        if (s) items.push({ id: s.id, text: s.en, src: sentenceSrc(pLesson, s.id) ?? srcOf(pLesson.id, s.id) })
        for (const o of qs[from]?.options ?? []) {
          const id = `opt:${from}:${o.label}`
          items.push({ id, text: `${o.label}. ${o.text}`, src: optionSrc(pLesson, id) })
        }
      }
      if (!(await say(my, items))) return
      if (!(await countDown(my, gapSec))) return
      if (manual.current) return
      if (from < last) setPage(from + 1)
    }
    owner.current = null
  }

  /* 문항 이동 — 학생이 직접 옮긴 경우다. 음원 주인이 바뀌면 끊고, 자동 넘김은 멈춘다 */
  const goPage = (p: number) => {
    manual.current = true
    setCountdown(null)
    if (owner.current && owner.current !== ownerOf(p)) stopRun()
    setPage(p)
  }

  /* 듣기 파트 실전은 음원이 있어야 문제가 성립한다 — 문항 통음원/보기 음원 재생.
     문항 통음원(`qaudio:i`)은 ContentView 의 재생 버튼이 부르는 경로 = 실전 듣기 한 판이다. */
  const playMedia = (id: string, text: string) => {
    const m = /^qaudio:(\d+)$/.exec(id)
    if (m) { void runListening(Number(m[1])); return }
    if (playsLeft(id) <= 0) return
    countPlay(id)
    stopVoice()
    void speakEnglishSeq([{ id, text, src: optionSrc(pLesson, id) ?? srcOf(pLesson.id, id) }], setPlayingId)
  }
  const total = qs.length
  const answered = qs.filter((_, i) => answers[i]).length
  const results = qs.map((q, i) => answers[i] === q.options.find((o) => o.correct)?.label)
  const correct = results.filter(Boolean).length

  /* ── 실전은 실제 시험지를 따른다 ──
     P1·P2는 시험지에 보기가 **인쇄되지 않는다**(A/B/C만 있고 내용은 음원). 보기 텍스트를 처음부터
     띄우면 듣기 문제가 읽기 문제가 되어 버린다 — 채점 전까지 가리고, 채점 뒤 근거 확인용으로 연다.
     LC 스크립트도 같은 이유로 채점 전엔 잠근다(ScriptAccordion 이 잠금 안내를 그린다).
     P3·P4 보기는 실제로 인쇄되므로 optionAudio 가 false 라 그대로 보인다. */
  const hideUntilGraded = pLesson.area === 'LC' && !graded
  const allOptions: Record<number, 'all'> = {}
  if (!(hideUntilGraded && pLesson.content.optionAudio)) qs.forEach((_, i) => { allOptions[i] = 'all' })

  /* ── 채점 안내 ──
     예전엔 다 못 풀면 채점 버튼을 잠갔다. 그러면 **왜 안 눌리는지도, 어디가 비었는지도** 알 수 없다.
     지금은 누르게 두고, 안 푼 문항이 있으면 알려주고 그 자리로 데려간다. */
  const [warn, setWarn] = useState<string | null>(null)
  /* 데려간 문항 — 세트 안에서 아래쪽이면 화면 밖이라, 스크롤해 올리고 빨갛게 짚어준다.
     안내 문구는 잠깐 떴다 사라지지만 **이 표시는 답을 고를 때까지 남는다.** */
  const [spotQ, setSpotQ] = useState<number | null>(null)
  const spotRef = useRef<number | null>(null)
  spotRef.current = spotQ
  useEffect(() => {
    if (!warn) return
    const t = setTimeout(() => setWarn(null), 2600)
    return () => clearTimeout(t)
  }, [warn])
  useEffect(() => { if (spotQ !== null && answers[spotQ]) setSpotQ(null) }, [answers, spotQ])

  const st: ContentState = {
    revealedScript: hideUntilGraded ? new Set<string>() : 'all',
    revealedOptions: allOptions,
    /* 실전은 강사가 없다 — 음원을 학생이 직접 튼다(수업에서는 버튼 없이 강사가 틀어준다) */
    playingId, onPlaySentence: playMedia, selfAudio: true, playsLeft, marks, tutorMarks: new Set(),
    /* 실전에는 형광펜이 없다 — 시험지에 표시하고 싶으면 좌하단 연필(필기)을 쓴다 */
    tapWords: false,
    /* 채점 전 LC는 실제 시험지처럼 (A)(B)(C)(D) 마킹만 — 채점하면 보기·스크립트가 열린다 */
    answerSheet: hideUntilGraded && !!pLesson.content.optionAudio,
    onTapWord: (w) => setMarks((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n }),
    answerMode: graded ? 'none' : 'all',
    answers, graded: graded ? new Set(qs.map((_, i) => i)) : new Set(),
    onSelect: (q, l) => { if (!graded) setAnswers((p) => ({ ...p, [q]: l })) },
    showKo: false,
    /* 한 화면에 한 문항. 전 문항을 세로로 이어 붙이면 스크롤로 뭉개져서 지금 몇 번을 푸는지
       감이 안 오고, 지문 2분할에서는 오른쪽 칸이 끝없이 길어진다 — 아래 페이저로 넘긴다.
       ⚠️ **P3·P4 는 세트가 단위다.** 실제 시험지는 한 세트의 세 문항이 한 페이지에 다 인쇄돼 있고,
       학생은 담화를 들으며 세 문항을 눈으로 훑는다. 한 문항씩 넘기면 다음 문항을 미리 못 봐서
       실전 감각이 안 잡힌다 → 세트 안은 다 펼치고(음원이 읽는 문항만 focusQ 로 짚는다),
       **넘기는 단위는 세트**로 한다(page = 세트 번호). 9문항을 한 화면에 이어 붙이면 스크롤만 길다. */
    visibleQ: setAudio
      ? { from: sets[Math.min(page, sets.length - 1)].from, to: sets[Math.min(page, sets.length - 1)].to }
      : (multi ? { from: page, to: page + 1 } : undefined),
    focusQ: setAudio ? (readingQ ?? undefined) : (multi ? page : undefined),
    spotlightQ: spotQ ?? undefined,
  }

  /* 문항을 넘기면 위에서부터 다시 — 앞 문항에서 내려둔 스크롤이 남으면 사진·지문 머리가 잘린다.
     단, 안 푼 문항으로 데려가는 중이면 건드리지 않는다 — 맨 위로 올려 버리면 그 문항이 도로 화면 밖이다. */
  useEffect(() => { if (spotRef.current === null) contentRef.current?.scrollTo({ top: 0 }) }, [page])

  const submit = () => {
    const missing = qs.findIndex((_, i) => !answers[i])
    if (missing >= 0) {
      setWarn('안 푼 문제가 있어요')
      setSpotQ(missing)
      // P3·P4 는 페이지가 세트라 그 문항이 든 세트로, 그 외에는 그 문항으로 간다
      const si = sets.findIndex((s) => missing >= s.from && missing < s.to)
      goPage(setAudio ? Math.max(0, si) : missing)
      return
    }
    stopRun()
    setSpotQ(null)
    setPage(0)          // 채점하면 처음부터 결과를 훑는다
    setGraded(true)
  }

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      <PhaseStepper
        active={2}
        subtitle={graded ? '채점 결과 확인' : '배운 전략으로 직접 풀기'}
        onEnd={onExit}
        onJump={onJumpPhase}
        extra={
          <>
            {/* 풀이 시간 — 시험처럼 재되 재촉하지 않는다. 채점하면 멈추고 그 값이 기록으로 남는다 */}
            <span className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums ${
              graded ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-[#EFF6FF] text-[#2563EB]'
            }`} title={graded ? '걸린 시간' : '푸는 중'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
              {clock}
            </span>
            {/* 해석 버튼은 두지 않는다 — 실전은 영어로 푸는 단계다(수업 화면도 같은 이유로 뺐다).
                필기는 좌하단 연필 버튼(PenFab). 상단 도구줄에는 시간만 남는다. */}
          </>
        }
      />

      {/* 문항 — 상단 안내 줄은 두지 않는다. "배운 전략으로 풀어보세요" 는 한 번 읽으면 그만인
          문장인데 매 문항 화면 높이를 먹는다. 음원 조작은 아래 제출 바로 내렸다. */}
      <div ref={contentRef} className={`flex-1 px-3 md:px-6 py-4 min-h-0 ${splitReading ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className={`mx-auto ${splitReading ? 'h-full max-w-[1440px]' : 'max-w-[900px]'}`}>
          <ContentView lesson={pLesson} st={st} readingSideBySide={splitReading} />
        </div>
      </div>

      {/* 제출/채점 바 — 가운데가 문항 페이저(문항이 여러 개일 때만) */}
      <div className="shrink-0 bg-white border-t border-[#EBEBF0] px-4 md:px-6 py-3">

        {/* ── 다음 문항까지 남은 시간 ──
            페이저(← 1 2 3 →) **바로 위**에 한 줄로 깐다. 카운트다운이 끝나면 그 페이저가 움직이므로
            움직일 대상 바로 위가 제일 읽힌다. 칩으로 어딘가에 끼워 넣으면 작아서 안 보이고,
            화면 폭을 통째로 쓰는 배너로 만들면 너무 크다 — 폭은 넓게, 높이는 한 줄로.
            카운트다운이 도는 동안에만 생겼다 사라진다(평소에는 자리를 안 먹는다). */}
        {countdown !== null && (() => {
          const urgent = countdown <= 3
          return (
            <div className={`mx-auto mb-2 flex items-center gap-2.5 rounded-lg px-3 py-1.5 ${
              urgent ? 'bg-[#FEF2F2]' : 'bg-[#EFF6FF]'
            } ${splitReading ? 'max-w-[1440px]' : 'max-w-[900px]'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`w-3.5 h-3.5 shrink-0 ${urgent ? 'text-[#DC2626]' : 'text-[#2563EB]'}`}>
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
              {/* P3·P4 는 넘어갈 페이지가 없다 — 이 시간은 '지금 이 문항에 답할 시간'이다 */}
              <span className={`shrink-0 text-[11px] font-bold ${urgent ? 'text-[#B91C1C]' : 'text-[#2563EB]'}`}>
                {setAudio ? `${(readingQ ?? 0) + 1}번 답할 시간` : '다음 문항까지'}
              </span>
              <span className={`shrink-0 text-[16px] font-black tabular-nums leading-none w-4 text-center ${urgent ? 'text-[#DC2626]' : 'text-[#2563EB]'}`}>{countdown}</span>
              <span className="flex-1 min-w-0 h-1.5 rounded-full bg-white overflow-hidden">
                <span className={`block h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent ? 'bg-[#DC2626]' : 'bg-[#2563EB]'}`}
                  style={{ width: `${(countdown / gapSec) * 100}%` }} />
              </span>
            </div>
          )
        })()}

        <div className={`mx-auto flex items-center gap-3 ${splitReading ? 'max-w-[1440px]' : 'max-w-[900px]'}`}>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {graded ? (
              <p className="text-[13px] font-bold text-[#1C1B33] truncate">채점 결과 <span className="text-[#2563EB]">{correct}/{total}</span> 정답</p>
            ) : (
              <p className="text-[12px] font-bold text-[#6B7280] truncate shrink-0"><span className={answered === total ? 'text-[#16A34A]' : 'text-[#9CA3AF]'}>{answered}/{total}</span> 선택</p>
            )}

            {/* 화면 안에 이미 재생 자리가 있는 파트는 여기 버튼을 두지 않는다 — 소리 나는 곳과 트는 곳이
                갈라지면 학생이 어디를 봐야 할지 모른다.
                  · 파트1(문항 여러 개) — 사진 옆에 문항별 재생 버튼
                  · 파트2            — 질문 카드 자체가 재생 버튼
                  · 파트3·4          — 세트 맨 위의 '대화/담화 듣기' 바
                남는 건 파트1이 문항 하나인 경우뿐이다. 그때는 사진 옆 버튼이 없어서 여기가 유일한 통로다. */}
            {(
              pLesson.area === 'LC' && !graded && pLesson.part !== 2 && pLesson.part !== 3 && pLesson.part !== 4
                && !(pLesson.part === 1 && qs.length > 1) && (() => {
                const left = playsLeft(`item:${page}`)
                const out = left <= 0
                return (
                  <button onClick={() => void runListening(page)} disabled={out}
                    className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold rounded-lg border px-2.5 py-1.5 transition-colors ${
                      out ? 'border-[#EEF0F4] bg-[#FAFAFA] text-[#C4C9D4] cursor-not-allowed'
                        : playingId ? 'border-[#2563EB] bg-[#2563EB] text-white'
                          : 'border-[#BFDBFE] bg-white text-[#2563EB] hover:bg-[#EFF6FF]'
                    }`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`w-3.5 h-3.5 shrink-0 ${playingId ? 'animate-pulse' : ''}`}>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                    {out ? '재생 완료' : playingId ? '재생 중…' : '음원 듣기 (1회)'}
                  </button>
                )
              })()
            )}
          </div>

          {/* 페이저 — P1·P2·P5 는 문항 단위, P3·P4 는 **세트 단위**로 넘긴다 */}
          {(setAudio ? sets.length > 1 : multi) && (() => {
            const pages = setAudio ? sets.length : total
            /* 칩 하나의 상태 — 세트 칩은 그 세트 문항 전체를 묶어 본다(다 맞으면 초록, 하나라도 틀리면 빨강) */
            const stateOf = (p: number) => {
              const from = setAudio ? sets[p].from : p
              const to = setAudio ? sets[p].to : p + 1
              const idxs = Array.from({ length: to - from }, (_, k) => from + k)
              if (graded) {
                return idxs.every((i) => answers[i] === qs[i].options.find((o) => o.correct)?.label) ? 'ok' : 'no'
              }
              return idxs.every((i) => answers[i]) ? 'done' : 'todo'
            }
            return (
              <div className="shrink-0 flex items-center gap-1.5">
                <PagerBtn onClick={() => goPage(Math.max(0, page - 1))} disabled={page === 0}>← 이전</PagerBtn>
                {/* 번호 칩 — 넘기는 도중에도 어디를 풀었는지/맞았는지 한 줄로 보인다 */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: pages }, (_, i) => {
                    const s = stateOf(i)
                    const cls = i === page ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : s === 'ok' ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#15803D]'
                      : s === 'no' ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]'
                      : s === 'done' ? 'border-[#93C5FD] bg-[#EFF6FF] text-[#2563EB]'
                      : 'border-[#E5E7EB] bg-white text-[#9CA3AF]'
                    return (
                      <button key={i} onClick={() => goPage(i)} aria-label={setAudio ? `${i + 1}번 세트` : `${i + 1}번 문항`}
                        className={`w-7 h-7 rounded-lg border text-[11px] font-black transition-colors hover:border-[#93C5FD] ${cls}`}>
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
                <PagerBtn onClick={() => goPage(Math.min(pages - 1, page + 1))} disabled={page === pages - 1}>다음 →</PagerBtn>
              </div>
            )
          })()}

          <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
            {/* 안 푼 문항 안내 — 버튼 바로 옆이라야 누른 사람이 본다 */}
            {warn && !graded && (
              <span className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-2.5 py-1.5 text-[11px] font-bold text-[#B91C1C] animate-fade-in">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
                  <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" />
                </svg>
                {warn}
              </span>
            )}
            {graded
              ? <button onClick={() => onDone({ correct, total, results, answers })} className={PRIMARY_BTN}>
                  {correct === total ? '정리로 →' : '틀린 문제 같이 보기 →'}
                </button>
              : <button onClick={submit} className={PRIMARY_BTN}>채점하기</button>}
          </div>
        </div>
      </div>

      {/* 필기 — 수업과 같은 좌하단 연필 버튼. 실전이야말로 지문에 밑줄 긋고 사진에 동그라미 치는 단계다.
          다만 실전에는 하단에 제출/채점 바가 깔려 있어 기본 위치(bottom-5)면 그 바를 덮는다 → 그만큼 올린다. */}
      <PenFab drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} bottomClass="bottom-20"
        tool={draw.tool} setTool={draw.setTool} clearCanvas={draw.clearCanvas} setDrawMode={draw.setDrawMode} />
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
function WrapStage({ lesson, practiceScore, teacherName, teacherImg, onExit, onDone, onJumpPhase }: {
  lesson: TypeLesson; practiceScore: { correct: number; total: number } | null
  teacherName: string; teacherImg: string
  onExit: () => void
  /** 개발용 단계 점프 (DEV_PHASE_JUMP) */
  onJumpPhase?: (i: number) => void
  /** 정리 정답률 — 완료 화면의 성취 배지에 쓴다 */
  onDone: (recap: { correct: number; total: number }) => void
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
      <PhaseStepper active={3} subtitle="오늘 배운 것 정리" onEnd={onExit} onJump={onJumpPhase} />

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
          <button disabled={!showClosing} className={PRIMARY_BTN}
            onClick={() => onDone({
              correct: sentences.filter((s) => correctMap[s.id]).length,
              total: sentences.length,
            })}>완료하기</button>
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

  /* 근거 연결 (이중·삼중 지문) — 지문에서 직접 근거를 탭한다. 지시·진행은 지문 위 안내 배너로 옮겨서
     설명 영역에선 렌더 안 함. (진행 상태는 지문의 초록 하이라이트 + 배너 카운트로 확인) */
  if (it.kind === 'match') {
    return null
  }

  return null
}
