'use client'

/* ── 유형학습 플레이어 (턴 기반) ──
   이도윤 스캐폴딩 레일(TypeLesson.turns)을 순회하며 턴마다
   ① 강사 발화(말풍선+TTS) ② 음원 재생(문장 단위) ③ 스크립트/지문 점진 공개
   ④ 상호작용(퀵버튼·정답선택·주관식·마킹·매칭)을 하단 독에 렌더한다.
   진행 상태(공개 범위)는 turns[0..idx]에서 매번 파생 — 이전/건너뛰기가 안전하다. */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { TypeLesson, Turn, AudioCue, Interaction, RecapSentence, RecapGroup } from '@/data/typeLearning'
import ContentView, { targetTokens, markedWords, type ContentState } from '@/components/type-lesson/ContentView'
import MicButton from '@/components/type-lesson/MicButton'
import { DrawingOverlay, PenFab, useDrawingTool } from '@/components/DrawingOverlay'
import { speakEnglishSeq, stopVoice as stopCueAudio } from '@/lib/voice'
import { speakTTS, prefetchTTS, koLetters, stopCurrentAudio, playbackProgress } from '@/lib/tts'
import { INST_NAME, INST_PERSONA, INST_THUMBS, INST_SCRIPT_ONLY, INST_OPEN_ALL_OPTIONS, tutorAgentFor, instPose, instClip, instClips, type InstPose } from '@/data/instructorData'
import audioManifest from '@/data/typeLearning/audioManifest.json'
import LessonIntro from '@/components/lesson/LessonIntro'
import TutorDock, { PulseAvatar, SpeechDots, TutorText, type DockMode, type ChatMsg } from '@/components/type-lesson/TutorDock'
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
import { track, secSince, trackLessonStart } from '@/lib/analytics'

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

/* ── 말하기 답 판정 (대본 수업) ──
   시트의 '학생 예시 답변'을 정답 삼아 **핵심 낱말이 겹치는가**로만 본다. 문장이 똑같아야 한다고
   보면 말로 하는 답은 거의 다 틀린 것이 된다("그림을 그리고 있어요" vs "그림 그려요").
   LLM 판정을 붙이지 않는 이유: 판정이 느려지면 그 사이가 침묵이고, 시연에서 그 침묵이 제일 나쁘다. */
/* ── 대본 수업의 학생 음성 입력 ──
   에이전트가 없으니 **브라우저가 직접** 듣는다. 화면은 에이전트 모드와 똑같이 둔다 —
   아래쪽 파형이 뜨고, 그냥 말하면 된다. 학생 눈에는 두 모드가 같아 보여야 한다.
     · 전사: Web Speech (SpeechRecognition)
     · 파형: getUserMedia + AnalyserNode — 에이전트의 getInputByteFrequencyData 자리를 대신한다 */
function useScriptedVoice(enabled: boolean, listening: boolean, onFinal: (text: string) => void) {
  const dataRef = useRef<Uint8Array<ArrayBuffer> | undefined>(undefined)
  const anaRef = useRef<AnalyserNode | null>(null)
  const finalRef = useRef(onFinal)
  finalRef.current = onFinal

  /* ── 마이크·파형은 한 번만 잡는다 ──
     학생 차례가 될 때마다 새로 잡으면 AudioContext 가 계속 쌓인다. 브라우저는 동시에 열 수 있는
     개수가 정해져 있어서(크롬 ~6개) 넘는 순간 예외가 나고, 그게 탭을 통째로 죽인다(실측).
     그래서 **음성 모드에 있는 동안 하나만** 열어두고, 여닫는 것은 아래 인식기만 한다. */
  useEffect(() => {
    if (!enabled) return
    let alive = true
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    void navigator.mediaDevices?.getUserMedia({ audio: true }).then((st) => {
      if (!alive) { st.getTracks().forEach((t) => t.stop()); return }
      stream = st
      ctx = new AudioContext()
      const ana = ctx.createAnalyser()
      ana.fftSize = 256
      ctx.createMediaStreamSource(st).connect(ana)
      anaRef.current = ana
      dataRef.current = new Uint8Array(new ArrayBuffer(ana.frequencyBinCount))
    }).catch(() => { /* 마이크가 없거나 권한 거부 — 텍스트 모드로 답할 수 있다 */ })
    return () => {
      alive = false
      stream?.getTracks().forEach((t) => t.stop())
      void ctx?.close().catch(() => {})
      anaRef.current = null
      dataRef.current = undefined
    }
  }, [enabled])

  /* ── 인식기 ──
     한 마디마다 끝나므로(continuous=false) 끝나면 다시 켠다. 다만 **그냥 다시 켜면 안 된다** —
     권한 거부·기기 없음처럼 시작하자마자 실패하는 상황에서는 start→error→end→start 가
     초당 수천 번 돌아 탭이 죽는다. 그래서 최소 간격을 두고, 연달아 실패하면 포기한다. */
  useEffect(() => {
    if (!enabled || !listening) return
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    let alive = true
    let fails = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const rec = new Ctor()
    rec.lang = 'ko-KR'
    rec.interimResults = true
    rec.continuous = false

    const restart = () => {
      if (!alive || fails >= 3) return
      timer = setTimeout(() => {
        if (!alive) return
        try { rec.start() } catch { fails += 1; restart() }
      }, 400)
    }
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let buf = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) buf += e.results[i][0].transcript
      }
      const t = buf.trim()
      if (t) { fails = 0; finalRef.current(t) }
    }
    rec.onerror = () => { fails += 1 }
    rec.onend = () => restart()
    try { rec.start() } catch { fails += 1; restart() }

    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      rec.onend = null
      rec.onerror = null
      rec.onresult = null
      try { rec.stop() } catch { /* noop */ }
    }
  }, [enabled, listening])

  return useCallback(() => {
    const ana = anaRef.current
    const d = dataRef.current
    if (!ana || !d) return undefined
    ana.getByteFrequencyData(d)
    return d
  }, [])
}

const KO_STOP = new Set(['그리고', '있어요', '있다', '해요', '한다', '이에요', '예요', '입니다', '같아요', '거예요', '너무', '정말'])
/** 말하기 답 판정 — 기대 답과 낱말이 겹치면 받아준다.
 *  `accepts` 는 시트가 예시 답변을 여러 줄 적어 둔 경우("-옷이 걸려 있어요 -신발이 놓여 있어요")로,
 *  **하나만 맞아도 통과**다. 사진을 묘사하라는 질문에 정답이 하나일 수 없다. */
function subjectiveOk(said: string, expected?: string, accepts?: string[]): boolean {
  const wanted = [expected, ...(accepts ?? [])].filter(Boolean) as string[]
  if (!wanted.length) return true                  // 기대 답이 없으면 무엇을 말해도 받아준다
  const words = (t: string) => (t.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, ' ').split(/\s+/)
    .map((w) => w.replace(/(이에요|예요|어요|아요|해요|이다|다|요)$/, ''))
    /* 조사를 뗀다 — "그림을" 과 "그림" 이 다른 낱말로 잡히면 맞은 답이 오답이 된다 */
    .map((w) => (w.length > 2 ? w.replace(/(으로|에서|에게|한테|까지|부터|을|를|이|가|은|는|에|와|과|도|의)$/, '') : w))
    .filter((w) => w.length >= 2 && !KO_STOP.has(w)))
  /* ── 부정·포기가 섞인 답은 낱말이 겹쳐도 즉시 받지 않는다 ──
     기대 "그림을 그리고 있어요" 에 "그림 몰라요" 를 치면 '그림' 이 겹쳐 정답이 됐다(실측).
     기대 답에도 부정이 들어 있으면("없어요", "넘어져 있지 않고") 그건 정상이니 그대로 둔다.
     여기 걸린 답은 틀렸다는 뜻이 아니라 **채점기가 뜻으로 봐야 한다**는 뜻이다. */
  const NEG = /(몰라|모르|아니|없|안\s)/
  if (NEG.test(said) && !wanted.some((w) => NEG.test(w))) return false
  const got = new Set(words(said))
  return wanted.some((one) => {
    const want = words(one)
    if (!want.length) return true
    const hit = want.filter((w) => got.has(w) || Array.from(got).some((g) => g.includes(w) || w.includes(g))).length
    /* 낱말 **하나가 스친 것**으로는 부족하다 — 기대 답이 여러 낱말이면 둘 이상 겹쳐야
       즉시 받아준다. 못 미친 답은 틀린 것이 아니라 채점기로 넘어간다. */
    return hit >= Math.min(2, want.length)
  })
}

/** 이 화면에서 나는 소리를 **전부** 멈춘다.
 *  재생기가 둘이다 — 자료 음원(lib/voice 의 오디오 엘리먼트)과 **강사 낭독**(lib/tts 의 `_currentAudio`).
 *  전에는 `stopVoice()`(자료 음원 쪽)만 불렀다 → 수업 화면을 나가도 강사 목소리는 끝까지 따라왔다.
 *  나가기·턴 전환·질문 모드가 전부 이 함수 하나를 지나게 둔다(CLAUDE.md §5 — 화면을 나갈 때 stopCurrentAudio). */
function stopVoice() {
  stopCueAudio()
  stopCurrentAudio()
}

/** 대본 발화가 **앞의 답을 받아주는 말로 시작하는가** ("맞아요. 사람이 중심인 사진이니까…").
 *  콘텐츠팀은 강사가 학생 답을 받아주고 이어가도록 쓴다 — 시트 42개 답하는 턴 중 25개가 이 꼴이다.
 *  그 앞에 앱이 "좋아요, 맞았어요." 를 또 붙이면 강사가 같은 말을 두 번 한다.
 *
 *  ⚠️ **띄어쓰기를 사람이 맞춰 주지 않는다.** 시트에 "잘 했어요" 처럼 띄어 쓴 줄이 있어서
 *  "잘했어요" 만 보던 예전 목록이 그것들을 놓쳤고, 앱이 맞장구를 하나 더 얹어
 *  "잘했어요. 잘 했어요. are이 있죠?" 가 나갔다(실측). 낱말 사이 공백을 허용한다.
 *
 *  ⚠️ **목록에 없는 칭찬은 그대로 겹친다.** 24강 밑줄 턴 일곱 곳이 "잘 찾았어요." 로 시작하는데
 *     그게 목록에 없어 앱이 "좋아요, 맞았어요." 를 또 얹었다(실측). 대본을 새로 받으면
 *     **첫 문장의 칭찬 표현을 다시 훑어야 한다** — scripts 로 전수 확인하는 편이 빠르다. */
const ACK_OPENER = /^(맞\s*아요|맞\s*습니다|좋\s*아요|좋\s*습니다|좋\s*네요|그렇\s*죠|그래\s*요|정확\s*해요|정확\s*합니다|잘\s*했어요|잘\s*찾았어요|잘\s*하셨어요|완벽\s*해요|훌륭\s*해요|바로\s*그거|네[,\s])/

/** **학생에게 무엇을 물은** 턴들 — 이 뒤에 오는 대본 줄은 그 대답에 대한 반응이다.
 *  (여기 있는 종류는 전부 답을 받을 때 `prevOkRef` 를 채운다: choice·subjective →
 *   handleScriptedAnswer, mark·match → finishMark, pickAnswer → handleScriptedPick) */
const ASKING_KINDS = new Set(['choice', 'pickAnswer', 'subjective', 'mark', 'match'])
/** 대본 첫머리의 맞장구를 뗀다 — "맞아요. 인물이 …" → "인물이 …".
 *  뗄 것이 없거나 떼면 문장이 없어지는 줄은 그대로 둔다(맞장구만 있는 줄도 있다). */
/** 맞았을 때 앱이 넣는 맞장구 — **돌려 쓴다.**
 *  한 수업에서 답하는 턴이 스무 번 넘는데 매번 "좋아요, 맞았어요." 면 녹음을 트는 것처럼 들린다.
 *  ⚠️ 지어낸 칭찬을 늘리지 않는다: 다 짧은 맞장구뿐이고, **내용은 대본이 말한다.**
 *  ⚠️ 여기 문구는 ACK_OPENER 로 시작해야 한다 — 다음 대본이 같은 말로 시작하면 앱이 비켜서는데
 *     (scriptWillAck), 그 판단이 이 목록과 같은 낱말을 본다. */
const ACKS = ['좋아요, 맞았어요.', '네, 맞아요.', '정확해요.', '그렇죠.', '잘했어요.', '맞습니다.'] as const
const ackLine = (n: number) => ACKS[n % ACKS.length]

/* ── 답 문장을 **확인하듯** 바꾼다 ── "그림을 그리고 있어요" → "그림을 그리고 있죠?"
   오답 뒤에 "제가 짚어 줄게요. 이렇게 답하면 돼요. 그림을 그리고 있어요." 를 얹으면 받아쓰기를
   시키는 것처럼 들린다(실측). 답은 알려주되 강사가 짚어 주는 말투로 둔다 — 두 강사 대본 다
   "~죠?" 를 즐겨 쓴다.
   ⚠️ 한국어 어미 변환을 일반 규칙으로 만들면 틀린 말이 나온다("그려요" → "그려죠?").
      **시트에 실제로 있는 끝맺음만** 바꾼다(있어요 12 · 없어요 4 · 보여요 2 = 문장형 답의 대부분).
      모르는 꼴은 그대로 둔다 — 어색한 것보다 틀린 말이 나쁘다. */
const CONFIRM_TAIL: Array<[RegExp, string]> = [
  [/있어요$/, '있죠?'],
  [/없어요$/, '없죠?'],
  [/보여요$/, '보이죠?'],
]

function asConfirm(s: string): string {
  const t = s.trim().replace(/[.!?]+$/, '')
  for (const [re, rep] of CONFIRM_TAIL) if (re.test(t)) return t.replace(re, rep)
  return `${t}.`
}

function stripAck(text: string): string {
  let t = text.trim()
  /* **맞장구 한 마디만** 뗀다. 문장째로 자르면 맞장구 뒤에 붙은 내용까지 사라진다 —
     "맞아요, is painting이 핵심이에요." 에서 답을 알려주는 말이 통째로 날아갔다(실측).
     "네, 맞아요." 처럼 두 마디가 겹칠 수 있어 두 번까지 본다. */
  for (let i = 0; i < 2; i++) {
    const m = t.match(ACK_OPENER)
    if (!m) break
    const cut = t.slice(m[0].length).replace(/^[\s,.!?~…]+/, '')
    /* 너무 짧게 남으면 되돌린다 — 맞장구가 문장의 전부인 줄("좋아요, 잘했어요!")도 있다 */
    if (cut.length < 10) break
    t = cut
  }
  return t === text.trim() ? text : t
}

/** 학생이 **모른다고 말한** 것인가 — 틀린 답과 다르게 다뤄야 한다.
 *  "몰라요" 에 "그건 조금 달라요, 다시 생각해 볼까요?" 로 답하면 말이 안 되고, 다시 물어도
 *  나올 것이 없다. 여기 걸리면 되묻지 않고 답을 보여주고 넘어간다.
 *  ⚠️ '모르' 만 보면 "모르는 단어가 있어요" 같은 문장도 걸린다 — 그래서 **문장 전체가**
 *     그 뜻일 때만 잡는다(앞뒤에 다른 말이 거의 없을 때). */
/** 학생이 **다시 들려달라고** 한 것인가 — 버튼을 두지 않고 말로 청하게 한다(강사에게 부탁하듯).
 *  못 들었는데 그냥 찍게 두면 그 문항은 데이터로도 못 쓰고 학생도 배우는 게 없다. */
function isReplayAsk(text: string): boolean {
  const t = text.replace(/[\s.,!?~·"'’”]/g, '')
  if (/^다시(요|한번|한번요)?$/.test(t)) return true          // "다시요" 한 마디
  /* 두 갈래를 다 만족해야 한다 — '다시/한번 더' 같은 **요청**이면서 '듣기'를 가리켜야 한다.
     한쪽만 보면 "다시 한번 생각해 볼게요" 같은 답까지 재생 요청으로 잡힌다. */
  return /(다시|한번더|한번만더|또|재생|들려|들을|못들|안들)/.test(t)
    && /(들려|들을|들었|들렸|듣|재생|틀어|플레이|한번더|한번만더)/.test(t)
}

function isGiveUp(text: string): boolean {
  const t = text.replace(/[\s.,!?~·"'’”…]/g, '')
  return /^(잘|음|아|어)?(모르겠어요|모르겠는데요|모르겠다|모르겠어|모르겠네요|몰라요|몰라|모르겠습니다|글쎄요|글쎄|패스|스킵|넘어갈게요|넘어가요|안떠올라요|생각안나요|기억안나요)$/.test(t)
}

const normKo = (t: string) => t.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, ' ')

/** 말이 아닌 입력인가 — 자판을 누른 자국("ㅇㅁㄴㄹㄹ"), 기호나 공백뿐인 줄.
 *  자모(ㅇ·ㅁ)는 **음절이 아니다.** 마이크가 잡소리를 흘릴 때도 이런 꼴로 들어온다.
 *  이런 건 채점기에 물어볼 것이 아니라 **못 알아들었다고 말하고 다시 받아야** 한다. */
function isGibberish(text: string): boolean {
  return !text.replace(/[^가-힣a-zA-Z0-9]/g, '')
}

/** 답에서 **찾아볼 낱말**만 뽑는다 (조사·정중어미·군말을 뗀 뒤 두 글자 이상). */
function answerKeys(answer: string): string[] {
  return normKo(answer).split(/\s+/)
    .map((w) => (w.length > 2 ? w.replace(/(으로|에서|에게|한테|까지|부터|을|를|이|가|은|는|에|와|과|도|의)$/, '') : w))
    .filter((w) => w.length >= 2 && !KO_STOP.has(w))
}

/** 다음 대본 줄이 **이 답을 이미 말하고 있는가.**
 *
 *  개념을 묻는 자리는 다음 줄이 곧 그 답의 설명이다 — "지금 하고 있는 동작은 어떤 형태로
 *  표현할까요?" 다음에 "인물이 지금 하고 있는 동작은 주로 be + -ing 형태로 표현해요" 가 온다.
 *  그 앞에 앱이 "답은 be + -ing 예요" 를 얹으면 학생은 같은 답을 두 번 듣는다(실측).
 *
 *  ⚠️ 낱말이 **다 들어 있기를** 요구하면 안 된다. 대본은 어미를 바꿔 쓴다 —
 *     "놓여 있는 상태"(답) ↔ "놓여 있을 때"(대본). 대부분 겹치면 같은 말을 한 것으로 본다. */
function lineCovers(line: string, keys: string[]): boolean {
  if (!keys.length) return false
  const hay = normKo(line)
  return keys.filter((w) => hay.includes(w)).length / keys.length >= 0.6
}

/** 시트가 예시 답을 여러 줄 적어 둔 자리("- 남자가 있고 컵이 보여요. - 남자가 컵을…")에서
 *  **하나만** 골라낸다. 사진 묘사에 정답이 하나일 수 없어 그렇게 쓴 것이니, 읽어 줄 때는 하나면 된다. */
function firstExample(hint: string): string {
  const t = hint.trim()
  return t.startsWith('-') ? (t.replace(/^-\s*/, '').split(/\s+-\s+/)[0]?.trim() || t) : t
}

/** 낱말로 답하는 자리인가 — 맞으면 정중어미를 뗀 낱말, **문장으로 답하는 자리면 null.**
 *  "동작이요." → "동작" / "위치나 상태요." → "위치나 상태" / "그림을 그리고 있어요." → null.
 *  가르는 이유: 낱말 답에 "이렇게 답하면 돼요" 를 붙이면 말하기 연습처럼 들리고,
 *  문장 답을 "답은 '…' 예요" 에 끼우면 문장이 겹쳐 읽힌다. */
function bareWord(s: string): string | null {
  /* 시트가 한 칸에 두 가지로 적어 둔 답("네 / 목적어예요")은 **긴 쪽**만 읽는다 —
     빗금을 그대로 읽히면 "네 슬래시 목적어" 가 된다. */
  const one = s.includes('/') ? s.split('/').map((p) => p.trim()).sort((a, b) => b.length - a.length)[0]! : s
  const t = one.trim().replace(/[.!?…]+$/, '')
  if (/(이에요|예요|이요)$/.test(t)) return t.replace(/(이에요|예요|이요)$/, '').trim() || null
  /* '요' 앞 글자가 용언 어미면 문장이다("없어요"), 아니면 명사에 붙은 것이다("상태요") */
  if (/요$/.test(t)) return /[어아해워려여세게죠네]요$/.test(t) ? null : (t.slice(0, -1).trim() || null)
  if (/(습니다|합니다|입니다|이다|죠)$/.test(t)) return null
  /* 정중어미가 아예 없는 답은 낱말로 본다 — 어절이 넷을 넘으면 사진 묘사 같은 문장이다 */
  return t.split(/\s+/).length > 3 ? null : t
}

/** 받침이 있으면 '이에요', 없으면 '예요' — 읽어 주는 말이라 어긋나면 바로 들린다. */
function koCopula(word: string): string {
  const code = word.trim().slice(-1).charCodeAt(0)
  if (!(code >= 0xac00 && code <= 0xd7a3)) return '예요'
  return (code - 0xac00) % 28 ? '이에요' : '예요'
}

/** 보기 해석을 **인용문**으로 바꾼다 — "여자가 물감 한 개를 들고 있다." → "여자가 물감 한 개를 들고 있다고"
 *  (`question_options.option_explanation` 에는 오답 이유가 아니라 **보기 해석**이 들어 있다.
 *   그대로 읽으면 "아니에요. 여자가 물감 한 개를 들고 있다." 처럼 번역문만 튀어나온다 — 실측) */
function quoted(trans: string): string {
  const t = trans.trim().replace(/[.\s]+$/, '')
  if (/이다$/.test(t)) return `${t.slice(0, -2)}이라고`    // '…편집장이다' → '…편집장이라고'
  return /다$/.test(t) ? `${t}고` : `${t}라고`
}

/** 오답을 짚을 때 "그건 자료에 없다" 를 무엇으로 말하는가 — 파트마다 근거가 다르다 */
function contraOf(part: number): string {
  if (part === 1) return '사진에 그런 모습이 없죠?'
  if (part >= 2 && part <= 4) return '음원에서는 그런 내용이 아니었죠?'
  return '문장과는 맞지 않죠?'
}

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
function poseForTurn(turn: Turn, speaking: boolean, cuePlaying = false): InstPose {
  const k = turn.interaction.kind
  const s = turn.stage
  /* ── 자료 음원이 나가는 동안 ──
     소리의 주인이 강사가 아니다. 말하는 클립을 돌리면 **강사가 말하는데 목소리는 다른 사람**인
     꼴이 된다(실측). 같이 듣는 자세 — 끄덕임(listen)으로 둔다.
     칭찬(S7)보다도 이게 먼저다: 지금 화면에서 일어나는 일은 '듣고 있는 것' 이다. */
  if (cuePlaying) return 'listen'
  if (speaking) return /^S[145]/.test(s) || k === 'mark' || k === 'match' ? 'point' : 'explain'
  /* 여기부터는 **강사가 말하지 않는 동안**이다. 학생이 답하거나 화면을 보는 시간이므로
     손짓하며 말하는 그림을 계속 두면 소리 없이 입만 움직이는 꼴이 된다 → 듣는 자세로 모은다.
     칭찬·마무리(S7)만 예외로 박수. 단, 그때도 학생이 말하는 중이면 듣는 게 먼저다. */
  if (k === 'subjective') return 'listen'
  if (s.startsWith('S7') || s.includes('표현 정리')) return 'praise'
  return 'listen'
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
const srcOf = (lesson: TypeLesson, id: string): string | undefined =>
  /* DB 문항으로 갈아끼운 수업에서는 매니페스트를 보지 않는다 — 키가 `t01/opt:0:A` 처럼
     **샘플 강의 id + 보기 자리**라 문항이 바뀌어도 그대로 맞아서, 새 사진에 옛 음원이 얹힌다. */
  lesson.dbBacked ? undefined : (audioManifest as Record<string, string>)[`${lesson.id}/${id}`]

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
    src: optionSrc(lesson, it.id) ?? sentenceSrc(lesson, it.id) ?? srcOf(lesson, it.id),
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
function PhaseStepper({ active, subtitle, onEnd, extra, onJump, steps }: {
  active: number; subtitle?: string; onEnd: () => void; extra?: ReactNode
  /** 개발용 단계 점프 (DEV_PHASE_JUMP) — 넘기면 각 단계가 눌린다 */
  onJump?: (i: number) => void
  /** 단계 이름. 기본은 수업 한 판의 4단계 흐름이다.
   *  **복습처럼 그 흐름 밖에 있는 화면**은 자기 이름 하나만 세운다 — 지나오지도 않을
   *  '도입·유형 학습' 이 회색으로 떠 있으면 아직 남은 단계처럼 읽힌다. */
  steps?: string[]
}) {
  const labels = steps ?? ['도입', '유형 학습', '실전 문제', '핵심 요약']
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
  markDone, markChecking, markVerdict, cuePlaying }: {
  turn: Turn; lesson: TypeLesson
  answers: Record<number, string>; graded: Set<number>; matchTapped: Set<string>
  /** 강사가 틀어 준 자료 음원이 나가는 중인가 */
  cuePlaying?: boolean
  markDone?: boolean; markChecking?: boolean
  markVerdict?: { read: string | null; ok: boolean; hint: string } | null
}) {
  const it = turn.interaction
  let icon = ''
  let text = ''
  let sub = ''
  let done = false
  if (it.kind === 'mark') {
    /* ── 여기에 **대본을 그대로 옮기지 않는다** ──
       예전에는 it.prompt(= 강사 발화에서 뽑은 질문)를 그대로 적었다. 그런데 그 말은 강사가
       방금 소리로 했고 말풍선에도 남아 있다 — 같은 문장이 화면에 두 번 있는 셈이고, 대본이
       길면 이 배너가 그것으로 꽉 찬다(실측). 여기는 **무엇을 하면 되는지**만 말하는 자리다.
       자료에 맞는 안내만 — 사진에는 탭할 단어가 없다. */
    const onPhoto = !!lesson.content.photo || lesson.content.questions.some((q) => q.photo)
    icon = '🖍️'
    text = onPhoto ? '펜으로 사진에 동그라미 치기' : '단어를 탭하거나 펜으로 밑줄'
    sub = markChecking ? '표시한 것 확인 중…'
      : markVerdict?.read ? `${markVerdict.ok ? '✓' : '✗'} ${markVerdict.read}`
        : markDone ? '표시 완료' : ''
    done = !!markDone && markVerdict?.ok !== false
  } else if (it.kind === 'pickAnswer') {
    done = graded.has(it.qIdx)
    icon = '🎯'; text = it.prompt ?? '보기에서 정답을 선택하세요'
    /* 음원이 아직 나가는 중이면 **기다리는 중이라고 말해 준다** — 답을 고른 뒤 강사가 조용하면
       학생은 앱이 멈춘 줄 안다. 실제 시험처럼 보기는 끝까지 들려주고 그 뒤에 이어간다. */
    sub = cuePlaying ? '음원이 끝나면 이어갈게요'
      : done ? '정답 선택 완료' : `Q${it.qIdx + 1} 보기를 탭하세요`
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
    </div>
  )
}

export default function TypeLessonPlayer({ lesson: lessonProp, instructor = RAIL_OWNER, lectureCode, lectureTitle, draftId, preparing, initialStage, scripted, scriptedReview, scriptedPracticeOutro, scriptedIntro, scriptedSummary }: {
  lesson: TypeLesson
  instructor?: string
  /** DB 레일로 돌 때의 해석 결과. 지금은 화면에 쓰지 않는다 —
   *  좌하단 '레일 검토' 버튼은 필기 연필 버튼에 자리를 내주고 사라졌다(호출부 호환용으로만 남긴다). */
  rail?: { diags: RailDiag[]; source: string; generated?: Record<number, string>; status?: string }
  /** 대사 생성이 아직 안 끝났는가 — 끝나기 전에 수업을 시작하면 옛 문구를 말한다 */
  preparing?: boolean
  /** 강의 코드. 넘기면 학습 로그를 남긴다(STEP 6). 없으면 기록하지 않는다 */
  lectureCode?: string
  /** 강의 제목(DB lectures.title) — 도입 화면에 뜬다. 없으면 예전처럼 파트·유형 라벨 */
  lectureTitle?: string
  /** 대본 수업(FGI 시연 강의)인가 — 강사가 할 말이 시트에 다 정해져 있다.
   *  이때는 **에이전트를 켜지 않는다**: 진행·판정·낭독을 전부 앱이 소유한다.
   *  에이전트에 맡기면 학생 답을 못 받아들이고 같은 요구를 반복하다 대본을 벗어난다(실측). */
  scripted?: boolean
  /** 실전 뒤 코칭도 대본이 있는가 (시트 '실전 1~4' 블록).
   *  대본은 문항 전부를 짚도록 쓰여 있지만, **트는 것은 틀린 문항뿐이다** — 시트 진행 규칙이
   *  "맞은 문제는 pass, 틀린 문제만 진행"(두 강사 공통)이라 reviewTurns 가 focusQ 로 걸러낸다.
   *  대본이 없으면 예전대로 화면이 틀린 문항을 골라 턴을 스스로 만든다(reviewTurns). */
  scriptedReview?: Turn[]
  /** 실전을 풀고 난 뒤 **오답이 있을 때만** 코칭 첫 마디로 하는 말 (시트 '실전 문제 풀이 후 멘트').
   *  '{전체수}'·'{맞은수}' 는 여기서 채점 결과로 채운다 — 대본에 박아 둘 수 없는 숫자다.
   *  다 맞히면 코칭 단계 자체가 열리지 않으므로 따로 막지 않는다. */
  scriptedPracticeOutro?: string
  /** 도입 화면 대본 — 강사 발화와 '오늘 배울 내용'. 없으면 단계명에서 뽑는다 */
  scriptedIntro?: { script: string; points: string[] }
  /** 마지막 정리 화면의 퀴즈 대본 (시트 '핵심요약'). 없으면 강의에 박아 둔 문장 3개를 쓴다.
   *  묶음이 여럿일 수 있다 — 이도윤은 전략 정리와 빈출 표현을 나눠 쓰고 제목을 따로 달았다 */
  scriptedSummary?: RecapGroup[]
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
  /* 스캐폴딩 단계를 다 마친 뒤 실전으로 넘어가기 전 구간 — 학생이 혼자 음원을 들어보는 자리.
     phase 를 새로 만들지 않는다: 화면은 그대로 수업 화면이고, 달라지는 건 '이제 눌린다' 뿐이다. */
  const [afterLesson, setAfterLesson] = useState(false)
  /* 지금 나가는 음원을 학생이 직접 틀었는가 (음원 듣기 버튼) */
  const [selfPlaying, setSelfPlaying] = useState(false)
  /* 대본을 읽는 중인가 — 에이전트가 없으면 아바타·파형이 볼 신호가 이것뿐이다 */
  const [narrating, setNarrating] = useState(false)
  /** 말할 것은 정해졌는데 **소리가 아직 안 나가는** 동안 (음원을 받는 중, v3 는 몇 초 걸린다).
   *
   *  `narrating` 과 갈라 둔 이유: 이 시간은 **강사 차례이지만 강사가 말하고 있지는 않은** 상태라
   *  두 가지가 서로 반대를 원한다.
   *    · 마이크(voiceOn)  — 닫아 둬야 한다. 열면 곧 시작될 강사 목소리를 학생 답으로 전사한다
   *    · 그림(포즈·파형)  — 말하는 클립을 돌리면 안 된다. 소리 없이 입만 움직이는 꼴이 된다
   *  그래서 마이크는 `narrating`(차례)을, 그림은 `tutorVoicing`(실제 발성)을 본다. */
  const [voiceLoading, setVoiceLoading] = useState(false)
  /** 강사가 **이 턴에서 할 말을 끝낸** 턴 번호. 선택지를 그 뒤에 내보내는 문이다.
   *
   *  `narrating` 을 그대로 보면 안 된다 — 턴이 바뀐 직후 발화가 시작되기 전까지 잠깐 false 라
   *  선택지가 한 프레임 번쩍였다 사라진다. "이 턴의 발화가 끝났는가"는 턴 번호로 잡아야 한다. */
  const [spokenTurn, setSpokenTurn] = useState<number | null>(null)
  /** 턴 안에서 선택지를 **다시 열 때** 올린다(오답 재시도). 강사 창이 이 값으로 카드 자리를
   *  다시 잡아, 방금 한 말 아래로 내려간다. */
  const [dockTick, setDockTick] = useState(0)
  /* 지금 읽고 있는 문장과 **어디까지 드러났는가** — 말과 글자를 맞추는 데 쓴다(startReveal).
     대화 스크롤이 이 값을 보고 따라 내려가므로 선언이 그 효과보다 위에 있어야 한다. */
  const [typed, setTyped] = useState<{ text: string; shown: number } | null>(null)
  /* 수업 화면에 있을 때만 뜻이 있다 — 실전·리뷰로 넘어간 뒤에도 켜져 있으면
     리뷰 화면에 '수업이 끝났어요' 가 그대로 뜬다 */
  const freePlay = afterLesson && phase === 'lesson'
  const [practiceScore, setPracticeScore] = useState<PracticeResult | null>(null)
  const [recapScore, setRecapScore] = useState<{ correct: number; total: number } | null>(null)

  /* ── 단계별 체류 (GA) ──
     단계가 바뀔 때마다 **직전 단계에 얼마나 있었는지**를 남긴다. 이 하나로
     "수업이 길어 지쳤나 · 오답 같이 보기를 실제로 붙잡고 있나 · 어디서 나갔나" 가 다 보인다.
     화면을 떠날 때(pagehide·언마운트)도 같은 값을 흘려서, 도중에 나간 경우가 빠지지 않게 한다. */
  const phaseAtRef = useRef(Date.now())
  const prevPhaseRef = useRef(phase)
  useEffect(() => {
    if (prevPhaseRef.current === phase) return
    track('stage_left', {
      stage: prevPhaseRef.current, next: phase,
      sec: secSince(phaseAtRef.current), lecture: lessonProp.id, part: lessonProp.part,
    })
    prevPhaseRef.current = phase
    phaseAtRef.current = Date.now()
  }, [phase, lessonProp.id, lessonProp.part])
  useEffect(() => {
    const send = () => track('stage_left', {
      stage: prevPhaseRef.current, next: 'exit',
      sec: secSince(phaseAtRef.current), lecture: lessonProp.id, part: lessonProp.part,
    })
    window.addEventListener('pagehide', send)
    return () => { window.removeEventListener('pagehide', send); send() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    /* ── 대본이 있으면 만들지 않는다 — 시트에 문항별 코칭이 이미 다 적혀 있다 ──
       다만 **틀린 문항만** 남긴다. 시트는 문항 전부를 짚도록 쓰여 있어서 그대로 틀면
       맞힌 문제까지 보기 하나하나 O/X 로 다시 훑는다 — 이미 맞힌 학생에게 그건 해설이
       아니라 벌이다(실측: 다 맞혀도 4문항 32턴을 그대로 지나갔다).
       리뷰 턴은 **전부 focusQ 로 자기 문항을 가리킨다**(시트 4블록 138턴 전수 확인) —
       그러니 focusQ 하나로 고를 수 있다. 새 대본을 받으면 그 전제를 다시 확인할 것.
       채점 결과가 아직 없으면(실전을 건너뛴 진입) 고를 근거가 없으니 손대지 않는다. */
    if (scriptedReview?.length) {
      if (!results.length) return scriptedReview
      const wrong = new Set(wrongIdx)
      const only = scriptedReview.filter((t) => t.focusQ != null && wrong.has(t.focusQ))
      /* ── 실전 결과 한 마디 ──
         시트 '실전 문제 풀이 후 멘트' — "5문제 중 3문제 맞혔어요. 틀린 문제 같이 보러 갈까요?".
         점수가 들어가야 해서 대본에 박아 둘 수 없다. 여기서 채워 **코칭 첫 마디**로 붙인다.
         실전 화면에는 강사 자리가 없어 결과를 말할 데가 여기뿐이고, 다 맞히면 이 단계로
         오지 않으므로 "오답 없으면 하지 않는다" 는 저절로 지켜진다. */
      if (!scriptedPracticeOutro || !only.length) return only
      const said = scriptedPracticeOutro
        .replace('{전체수}', String(results.length))
        .replace('{맞은수}', String(results.filter(Boolean).length))
      return [{ no: 0, stage: '실전 결과', tutor: said, focusQ: only[0].focusQ, interaction: { kind: 'next' } }, ...only]
    }
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
  }, [practiceScore, practiceContent, scriptedReview, scriptedPracticeOutro])

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
  /* 대본을 읽어줄 목소리 — api/tts 의 persona 키 (강사별 목소리가 없으면 기본 강사 목소리) */
  const ttsPersona = INST_PERSONA[instructor] ?? 'park'
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
  /* ── 첫 마디를 도입 화면에서 미리 받아둔다 ──
     둘째 줄부터는 앞 발화가 대기를 가려 주지만(say 안의 prefetch), **첫 마디는 가려 줄 것이 없다.**
     학생이 도입 화면을 읽고 [시작하기]를 누르기까지 몇 초가 그냥 비어 있으므로 그동안 받아둔다.
     시작하지 않고 나가면 한 번 버려지는 셈이지만, 첫 인상이 걸린 자리라 그 값은 싸다. */
  const warmedRef = useRef(false)
  useEffect(() => {
    if (started || warmedRef.current) return
    const first = turns[0]?.tutor
    if (!first) return
    warmedRef.current = true
    prefetchTTS(koLetters(first), ttsPersona, instructor)
  }, [started, turns, ttsPersona, instructor])
  /* 수업 한 판 시작 — 몇 번째 수업인지, 앱을 처음 연 뒤 얼마 만인지가 여기서 붙는다
     (두 번째 수업으로 이어지는지 = FGI 규모에서 리텐션의 유일한 실물) */
  const lessonStartSentRef = useRef(false)
  useEffect(() => {
    if (!started || lessonStartSentRef.current) return
    lessonStartSentRef.current = true
    trackLessonStart({ lecture: lessonProp.id, part: lessonProp.part, area: lessonProp.area, entry: initialStage ?? 'lesson' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])
  /* 강사 창 배치 — 우측 패널(기본) ⇄ 최소화(작은 창). 강사 말·선택지·행동 지시·입력이 전부 이 창 안에 있다 */
  const [dockMode, setDockMode] = useState<DockMode>('sidebar')
  const dockModeRef = useRef(dockMode)
  dockModeRef.current = dockMode
  /* ── 측정 (GA) ──
     "강사 패널을 언제 접는가" 가 FGI 관찰 항목이라, 접힘/펼침을 **누가 시켰는지까지** 남긴다.
     화면이 좁아 코드가 자동으로 접는 경우가 있어(아래 matchMedia), 안 가르면 학생이 접은 것으로 읽힌다. */
  const lessonStartRef = useRef(Date.now())
  /* 지금 어느 단계인가 — 같은 강사 패널을 **수업**에서 접는 것과 **오답 같이 보기**에서 접는 것은
     전혀 다른 신호다. 이벤트마다 단계를 실어야 나중에 갈라 볼 수 있다. */
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const setDock = (m: DockMode, by: 'user' | 'auto' = 'user') => {
    if (dockModeRef.current !== m) {
      track('tutor_panel_toggled', {
        to: m, by, turn: turnIdxRef.current + 1, sec: secSince(lessonStartRef.current),
        lecture: lesson.id, part: lesson.part, stage: phaseRef.current,
      })
    }
    setDockMode(m)
  }
  const feedRef = useRef<HTMLDivElement>(null)   // 대화 흐름 — 새 발화·새 단계가 오면 아래로 따라간다
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('voice')
  /* 에이전트 콜백은 세션 시작 시점 클로저를 잡는다 — 지금 모드는 ref 로 읽어야 최신이다 */
  const chatModeRef = useRef(chatMode)
  chatModeRef.current = chatMode
  /* 음성·텍스트 중 무엇을 쓰는가 — 바꾼 시점(몇 번째 턴)까지 남겨야 "언제 말하기를 포기했나" 가 보인다 */
  const setChat = (m: 'text' | 'voice') => {
    if (chatModeRef.current !== m) {
      track('tutor_mode_changed', {
        to: m, turn: turnIdxRef.current + 1, sec: secSince(lessonStartRef.current),
        lecture: lesson.id, part: lesson.part, stage: phaseRef.current,
      })
    }
    setChatMode(m)
  }
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
      /* ── 대화량 측정 ──
         **내용은 보내지 않는다.** GA 파라미터는 100자에서 잘리고, 참가자 발화 전문을 넘기는 건
         개인정보 문제다. 여기서는 글자 수·턴 번호·모드만 남기고 전문은 DB 로 따로 간다.
         이 값들로 "대화가 얼마나 길었나 / 몇 번 오갔나 / 음성인가 텍스트인가" 가 전부 나온다. */
      const trackTurn = () => track('tutor_turn', {
        role: p.source === 'user' ? 'user' : 'ai',
        chars: p.message.trim().length,
        /* 시키는 것만 하는가, 자기가 묻는가 — 강사를 '선생님'으로 받아들였는지의 대리 지표.
           내용은 안 보낸다. 물음표가 있었는지만 남긴다 */
        is_question: p.source === 'user' ? /[?？]/.test(p.message) : undefined,
        turn: cur + 1,
        mode: chatModeRef.current,
        sec: secSince(lessonStartRef.current),
        stage: phaseRef.current,
        lecture: lesson.id,
        part: lesson.part,
      })
      if (p.source !== 'user') trackTurn()
      if (p.source === 'user') {
        /* 침묵이 "..." 로 전사돼 오는 걸 답으로 세면 안 된다 — 그게 게이트가 열리던 원인 */
        if (isEmptyAnswer(p.message)) {
          /* 침묵·잡음이 "..." 로 전사돼 온 것. 이게 잦으면 STT 가 학생 말을 못 받고 있다는 뜻이라
             참가자는 "말이 안 통한다"고 느낀다 — FGI 를 통째로 오염시키는 종류의 결함이다. */
          track('stt_empty', { turn: cur + 1, stage: phaseRef.current, lecture: lesson.id, part: lesson.part })
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
          trackTurn()
          return
        }
        // 답이 들어왔다 = 응답 있음. 단, 강사가 그 내용에 반응하기 전에는 진행을 막는다(아래 게이트)
        respondedRef.current.add(cur)
        agentReactedRef.current.delete(cur)
        trackTurn()
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
            track('tutor_reask', {
              turn: cur + 1, nth: used + 1, step: live[cur]?.stage,
              stage: phaseRef.current, lecture: lesson.id, part: lesson.part,
            })
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
        /* ── 스캐폴딩이 실제로 작동했는가 (H3) ──
           이 단계에서 학생이 **입을 열었는지**, 강사가 **몇 번 되물었는지**, 끝내 답을 못 했는지.
           어느 단계에서 학생이 닫히는지가 이 이벤트 하나로 문항 단위까지 나온다. */
        track('turn_advanced', {
          turn: cur + 1,
          responded: respondedRef.current.has(cur),
          gave_up: gaveUp,
          reasks: reaskRef.current.get(cur) ?? 0,
          sec: Math.round((Date.now() - enteredAtRef.current) / 1000),
          step: live[cur]?.stage,
          stage: phaseRef.current,
          lecture: lesson.id,
          part: lesson.part,
        })
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
    }).catch((e: unknown) => {
      /* 강사 세션이 안 붙으면 이 제품은 그냥 문제집이다 — FGI 에서 가장 먼저 알아야 할 사고 */
      track('tutor_session_failed', {
        stage: phaseRef.current, lecture: lesson.id, part: lesson.part,
        reason: e instanceof Error ? e.name : 'unknown',
      })
    })
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
    /* 대본 수업은 에이전트를 안 켠다 — 낭독도 진행도 앱이 한다 */
    if (scripted) { autoStartedRef.current = true; return }
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

  /* ── 문제 한 바퀴의 턴 범위 ──
     강의 하나가 사진 3장·문장 5개로 돈다(STEP 4). 턴은 itemSeq 로 자기 문제를 가리키므로
     "이 문제의 스캐폴딩이 어디서 끝나는지"는 그 번호가 바뀌는 지점이다.
     turns 는 문제 순으로 이어져 있다 — 같은 itemSeq 가 떨어져 나타나지 않는다. */
  /** 아래 진행 줄이 '문제' 로 세는 단위.
   *  수업은 아이템(itemSeq) 이고, **리뷰는 문항(focusQ)** 이다 — 실전 문항은 수업 아이템 표에
   *  없어서 itemSeq 가 비어 있다. 리뷰도 "문제 하나를 마치면 다음 문제" 로 도는 것은 같다. */
  const navKeyOf = (t: Turn) => (phase === 'review' ? t.focusQ : t.itemSeq)
  const itemSpan = useMemo(() => {
    const map = new Map<number, { first: number; last: number }>()
    turns.forEach((t, i) => {
      const key = phase === 'review' ? t.focusQ : t.itemSeq
      if (key == null) return
      const cur = map.get(key)
      if (cur) cur.last = i
      else map.set(key, { first: i, last: i })
    })
    return map
  }, [turns, phase])

  /* 지금 문제의 다음 문제 첫 턴 — 없으면(마지막 문제) null. 강사 창의 '수업 마치기' 가 그 자리를 잇는다 */
  const nextItemAt = useMemo(() => {
    const key = navKeyOf(turn)
    if (key == null) return null
    const cur = itemSpan.get(key)
    if (!cur) return null
    let best: number | null = null
    itemSpan.forEach(({ first }) => {
      if (first > cur.last && (best === null || first < best)) best = first
    })
    return best
  }, [turn, itemSpan])

  /* ── 문제 경계 ──
     **문제는 자동으로 넘어가지 않는다.** 한 문제의 마지막 턴에 오면 거기서 멈추고, 학생이
     [다음 문제] 를 눌러야 넘어간다. 자동 전진(아래 effect)과 next_step 도 이 경계를 넘지 못한다.
       atItemEnd : 지금 턴이 이 문제의 마지막 턴이고, 뒤에 문제가 더 있다
       itemDone  : 그 마지막 턴까지 실제로 끝났다(답을 받는 턴이면 채점까지) = 버튼이 열리는 시점
     **리뷰도 같은 규칙으로 돈다** — 틀린 문제를 다시 푸는 자리도 문제 단위라, 수업과 다른
     방식으로 넘기면 학생이 방금 익힌 조작을 다시 배워야 한다. */
  const navKey = navKeyOf(turn)
  const curSpan = navKey != null ? itemSpan.get(navKey) : undefined
  /* 아래 '앞으로 가는 줄' 이 전진을 맡는 단계인가 — 아이템 순회로 만든 수업(대부분의 DB 강의)과 리뷰.
     아이템이 없는 옛 방식 강의는 강사 창의 버튼이 그대로 그 일을 한다. */
  const stripNav = (phase === 'lesson' || phase === 'review') && navKey != null
  /* 마지막 문제의 끝도 경계다 — 거기서도 자동으로 실전으로 넘어가면 안 된다 */
  const atItemEnd = (phase === 'lesson' || phase === 'review') && !!curSpan && turnIdx >= curSpan.last
  const itemLastTurn = curSpan ? turns[curSpan.last] : undefined
  const itemDone = atItemEnd
    && (itemLastTurn?.interaction.kind !== 'pickAnswer' || graded.has(itemLastTurn.interaction.qIdx))
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

  /* 대화 흐름은 항상 마지막 발화가 보이게 — 턴이 넘어가거나 새 메시지가 오면 아래로.
     **말풍선이 자라는 동안에도** 따라가야 한다: 글자가 소리에 맞춰 하나씩 드러나므로(typed)
     메시지 수는 그대로인 채 높이만 늘어난다. 그것만 보고 있으면 말풍선이 길어질수록
     아래가 화면 밖으로 밀려 나간다(실측: 강사가 말하는데 스크롤이 안 따라갔다).
     자라는 중에는 smooth 를 쓰지 않는다 — 매 프레임 부드러운 스크롤을 걸면 서로 밀려 덜컹인다. */
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: typed ? 'auto' : 'smooth' })
  }, [turnIdx, chatLog.length, typed, dockMode, chatMode])

  /* 실전·정리로 넘어가면 강사 세션 종료 — 문제 풀이 중 강사가 계속 말하지 않게.
     **리뷰는 예외다** — 틀린 문제를 강사와 같이 푸는 단계라 다시 연결한다.
     실전에서 한 번 끊겼으므로 여기서 새로 연다(연결에 몇 초 걸린다). */
  useEffect(() => {
    if (phase === 'practice' || phase === 'wrap' || phase === 'done') endAgent()
    /* 대본 수업은 리뷰에서도 에이전트를 켜지 않는다 — 켜면 진행 도구를 든 쪽이 둘이 된다
       (앱이 대본을 읽는 동안 에이전트가 자기 판단으로 단계를 넘긴다). */
    if (phase === 'review' && !scripted && conversation.status === 'disconnected') startAgent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ── 스캐폴딩 단계 끝 = 대화 종료 ──
     마지막 턴을 마치면 강사와의 대화는 거기서 끝난다. 열어둔 채로 두면 학생이 혼자 음원을 듣는
     동안 강사가 그 소리에 반응해 말을 얹는다(마이크가 계속 열려 있다). 실전 전환을 기다렸다가
     끊으면 그 사이가 통째로 그 상태다. */
  useEffect(() => { if (freePlay) endAgent() }, [freePlay, endAgent])
  /* 도입 화면 "오늘 배울 내용" — 대본이 있으면 그대로, 없으면 수업 단계 S코드에서 파생.
     파생본은 'S1 핵심 단서 찾기' 같은 **단계 이름**이라 학생에게는 아무 말도 아니다.
     시연 강의처럼 무엇을 배우는지 적어 둔 곳이 있으면 그쪽이 언제나 낫다. */
  const introPoints = useMemo(() => {
    if (scriptedIntro?.points.length) return scriptedIntro.points
    const seen = new Set<string>()
    const pts: string[] = []
    for (const t of turns) {
      if (macroOf(t) !== '수업') continue
      const label = t.stage.replace(/^S\d+\s*/, '').trim()
      if (label && !seen.has(label)) { seen.add(label); pts.push(label) }
      if (pts.length >= 4) break
    }
    return pts.length ? pts : [lesson.desc]
  }, [turns, lesson.desc, scriptedIntro])

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
        if (dockModeRef.current === 'sidebar') { autoMiniRef.current = true; setDock('mini', 'auto') }
      } else if (autoMiniRef.current) {
        autoMiniRef.current = false
        setDock('sidebar', 'auto')        // 학생이 직접 접은 건 되돌리지 않는다
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

  /** 표시를 마쳤을 때 **대본 수업을 다음 단계로 넘긴다.**
   *  예전에는 완료를 reportAction 으로 에이전트에만 알렸다 — 대본 수업에는 에이전트가 없어서
   *  학생이 다 짚어 놓고도 화면이 멈춰 있었다(실측). 넘길 사람이 없으면 앱이 넘긴다.
   *  한 턴에 한 번만 — 필기 판정과 단어 탭이 같이 끝나면 두 번 넘어간다. */
  const markAdvancedRef = useRef(-1)
  /** 이 턴에 들어설 때 **이미 있던 표시** — 형광펜으로 칠한 낱말과 필기 획 수.
   *
   *  표시는 턴을 넘어 쌓인다(시험지에 그대로 남는다). 지금 있는 것만 보고 판단하면
   *  **앞 문항에서 한 표시 때문에 새 턴이 손도 대기 전에 넘어간다** — 24강 2·3번이
   *  들어서자마자 넘어간 것이 이것이다(실측: 1번에서 한 번 그은 획을 계속 세고 있었다).
   *
   *  ⚠️ 기준선을 **턴 진입 효과에서 잡으면 한 박자 늦는다.** 아래 두 효과가 그것보다 먼저
   *     돌기 때문이다(선언 순서대로 실행된다). 그래서 먼저 도는 쪽이 스스로 잡는다. */
  const enterBaseRef = useRef({ turn: -1, marks: new Set<string>(), strokes: 0 })
  const enterBase = () => {
    if (enterBaseRef.current.turn !== turnIdx) {
      enterBaseRef.current = { turn: turnIdx, marks: markedWords(marks), strokes: draw.strokeCount }
    }
    return enterBaseRef.current
  }
  const finishMark = async (ok: boolean | null) => {
    if (!scripted || markAdvancedRef.current === turnIdx) return
    markAdvancedRef.current = turnIdx
    /* 엉뚱한 곳을 짚었으면 맞장구를 넣지 않는다 — 다음 대본의 "잘 했어요" 도
       prevOkRef 를 보고 떨어져 나간다(stripAck). */
    prevOkRef.current = ok
    if (ok !== false && !scriptWillAck()) await say(ackLine(ackNoRef.current++))
    goNext()
  }

  /* 단어 마킹(mark) — 목표 단어를 모두 형광펜으로 표시하면 완료로 본다 */
  useEffect(() => {
    const it = turn.interaction
    if (it.kind !== 'mark' || !it.targetWords?.length) return
    const targets = targetTokens(it.targetWords)
    /* 표시 키는 `자리|토큰번호|단어` 다(같은 단어가 여러 군데 있어도 짚은 자리만 칠하려고).
       완료 판정은 여전히 **단어** 기준이므로 키에서 단어만 뽑아 비교한다. */
    const words = markedWords(marks)
    const base = enterBase()
    const allMarked = Array.from(targets).every((w) => words.has(w))
    const alreadyAtEnter = Array.from(targets).every((w) => base.marks.has(w))
    if (allMarked && !alreadyAtEnter) {
      setMarkDone(true)
      reportAction(`${turnIdx}:mark`, actionMessage('지문에서 핵심 단어를 형광펜으로 표시했습니다'))
      void finishMark(true)
    }
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

  /** 학생이 **어느 보기 위에** 필기했는가 — "이거 왜 답이에요?" 의 '이거' 를 찾는다.
   *
   *  사진은 그림이라 캔버스와 합성해 그대로 보여줄 수 있지만(composeMarkedImage), **보기는 글자다.**
   *  글자를 캔버스에 못 담아서, 보기에 밑줄을 긋고 물으면 강사가 무엇을 가리키는지 몰랐다(실측).
   *  그래서 그림 대신 좌표로 푼다 — 보기 상자(data-opt)와 겹치는 자리에 잉크가 있는지 본다.
   *  vision 에 맡기는 것보다 정확하다: 밑줄이 흐리거나 짧아도 픽셀 하나면 잡힌다. */
  const inkedOptions = (): string[] => {
    const canvas = draw.canvasRef.current
    const root = contentRef.current
    if (!canvas || !root || !draw.strokeCount) return []
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return []
    const cr = canvas.getBoundingClientRect()
    const sx = canvas.width / cr.width
    const sy = canvas.height / cr.height
    const hit: string[] = []
    root.querySelectorAll<HTMLElement>('[data-opt]').forEach((el) => {
      const r = el.getBoundingClientRect()
      const x = Math.max(0, Math.round((r.left - cr.left) * sx))
      const y = Math.max(0, Math.round((r.top - cr.top) * sy))
      const w = Math.min(canvas.width - x, Math.round(r.width * sx))
      const h = Math.min(canvas.height - y, Math.round(r.height * sy))
      if (w <= 0 || h <= 0) return
      const { data } = ctx.getImageData(x, y, w, h)
      // 알파만 본다(색은 도구에 따라 다르다). 네 픽셀 걸러 훑어도 밑줄 한 줄은 반드시 걸린다
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] > 8) { hit.push(el.dataset.opt ?? ''); return }
      }
    })
    /* "0:B" → "B" (문항은 지금 화면에 하나뿐이라 라벨만으로 통한다) */
    return Array.from(new Set(hit.map((k) => k.split(':')[1]).filter(Boolean)))
  }

  const checkMark = async () => {
    const it = turn.interaction
    if (it.kind !== 'mark' || markChecking) return
    const image = composeMarkedImage()
    if (!image) {
      // 사진이 없는 화면(지문 파트)은 아직 좌표 판정을 안 붙였다 — 표시만 완료로 본다
      setMarkDone(true)
      reportAction(`${turnIdx}:mark`, actionMessage('화면에 핵심 단서를 표시했습니다'))
      void finishMark(null)
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
      void finishMark(verdict.read ? verdict.ok : null)
    } catch {
      setMarkDone(true)
      reportAction(`${turnIdx}:mark`, actionMessage('화면에 핵심 단서를 표시했습니다'))
      void finishMark(null)
    } finally { setMarkChecking(false) }
  }

  /* 필기가 멈추면 **버튼 없이** 알아서 판정한다 — 학생이 표시하고 나서 확인 버튼을 또 눌러야
     하면 흐름이 끊긴다. 획을 그을 때마다 타이머를 미루고, 1.2초 조용하면 그때 본다.
     (그리는 중에 보내면 반쯤 그린 동그라미를 판정한다) */
  useEffect(() => {
    const base = enterBase()
    if (turn.interaction.kind !== 'mark' || markChecking) return
    /* ⚠️ 획 수는 **시험지 전체의 누적**이다. "획이 있으면" 으로 걸면 앞 문항에서 그은 획 때문에
       이 턴에 손도 대기 전에 판정이 돈다 — 지문 화면은 판정할 사진이 없어 그대로 통과하고
       다음 단계로 넘어가 버렸다(실측: 24강 2·3번). **이 턴에서 새로 그었을 때만** 본다. */
    if (draw.strokeCount <= base.strokes) {
      /* 지우개로 되돌렸으면 기준선도 내린다 — 안 내리면 다시 그어도 판정이 안 돈다 */
      if (draw.strokeCount < base.strokes) base.strokes = draw.strokeCount
      return
    }
    const t = setTimeout(() => { void checkMark() }, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw.strokeCount, turnIdx])

  /* 문제가 바뀌면 필기를 지운다 — **턴이 아니라 문제 단위다.**
     한 문제 안에서는 시험지처럼 그대로 남아야 한다(위 enterBase 주석). 그런데 다음 사진·문장으로
     넘어간 뒤에도 남아 있으면 앞 문제에 친 동그라미가 새 사진 위에 떠 있다(실측 보고 08-18).
     필기 도구를 껐다 켜면 다시 보이는 것도 같은 뿌리다 — 획이 ref 에 그대로 있어서다. */
  const drawnItemRef = useRef<number | null>(null)
  const curNavKey = navKeyOf(turn) ?? null
  useEffect(() => {
    if (drawnItemRef.current !== null && drawnItemRef.current !== curNavKey) draw.clearCanvas()
    drawnItemRef.current = curNavKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curNavKey])

  /* ── 음원 재생 토큰 ──
     학생이 직접 돌린 재생(문장/보기)과 턴이 트는 음원이 겹치지 않게 세대를 센다.
     전체 재생 바는 없앴다 — "지금 어디가 나오는지"는 음원이 나오는 곳(보기·문항 옆 스피커)에서 보여준다. */
  const barTokenRef = useRef(0)

  /* 스크립트 문장 하나만 재생 — 바 재생/턴 음원과 겹치지 않게 토큰을 올리고 끊는다 */
  const playSentence = (id: string, text: string) => {
    barTokenRef.current += 1
    stopVoice()
    setSelfPlaying(false)          // 강사 쪽 재생 — 아바타 파동이 정상으로 돌아온다
    /* sentenceSrc 도 본다 — 이게 없으면 LC 질문·대화 발화가 성우 mp3 를 못 찾고 브라우저 TTS 로 샌다 */
    void speakEnglishSeq([{ id, text, src: optionSrc(lesson, id) ?? sentenceSrc(lesson, id) ?? srcOf(lesson, id) }], setPlayingId)
  }

  /* ── 수업 화면의 음원 재생 (스캐폴딩이 끝난 뒤 학생이 직접) ──
     파트마다 '한 번 듣기'의 단위가 다르다.
       P1·P2 : 문항 하나 = 음원 하나  → 그 문항 통음원
       P3·P4 : 담화 하나 = 문항 여럿  → 스크립트를 통째로 이어 재생
     실전과 달리 **횟수 제한을 두지 않는다** — 여기는 시험이 아니라 들어보는 자리다. */
  const playLessonAudio = (qIdx: number) => {
    barTokenRef.current += 1
    stopVoice()
    /* 이 재생은 **학생이 튼 것**이다 — 강사 아바타의 파동은 강사 목소리 몫이라 여기서 뛰면 안 된다.
       재생이 끝나면 setPlayingId(null) 이 오므로 그때 같이 내린다(아래 tutorSpeaking). */
    setSelfPlaying(true)
    const script = lesson.content.audioScript ?? []
    const items = (lesson.part === 3 || lesson.part === 4) && script.length
      ? script.map((s) => ({ id: s.id, text: s.en }))
      : [{ id: `qaudio:${qIdx}`, text: lesson.content.questions[qIdx]?.options.map((o) => `${o.label}. ${o.text}`).join(' ') ?? '' }]
    void speakEnglishSeq(withSrc(lesson, items), (id) => { setPlayingId(id); if (id === null) setSelfPlaying(false) })
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
    /* ── 정답을 고른 문항의 보기 텍스트 ──
       평소 수업: 고르는 순간 네 개를 다 연다(음성 전용 보기라도 채점 뒤엔 근거를 봐야 하니까).
       **대본 수업은 다르다.** 강사가 "A를 볼게요" 하며 하나씩 짚어가는데 네 개가 이미 다 열려
       있으면 지금 어느 보기 이야기인지 화면에서 읽히지 않는다(실측). 그래서 대본 수업에서는
         · 짚는 동안 — 그 턴이 지목한 보기만 열고 (위 reveal.optionText)
         · 그 문제의 마지막 턴에 오면([다음 문제] 가 열리는 그 시점) — 그때 네 개를 다 연다
       혼자 다시 보라고 열어 두는 자리가 거기다. */
    const cur = turns[Math.min(turnIdx, turns.length - 1)]
    /* 이 문항을 다루는 마지막 턴인가 — 다음 턴이 다른 문항으로 넘어가면 여기서 끝난 것이다.
       수업의 '마무리 멘트'·실전 코칭의 'S7 표현 정리' 가 여기 걸린다([다음 문제] 가 열리는 그 시점). */
    const lastOfQ = !!cur && (!turns[turnIdx + 1] || turns[turnIdx + 1].focusQ !== cur.focusQ)
    /* 강사에 따라 **답을 고른 즉시** 네 개를 여는 경우가 있다(INST_OPEN_ALL_OPTIONS — 윤다은).
       강사 설명이 진행되는 동안 보기 네 문장을 같이 보라는 뜻이다. */
    if (!scripted || lastOfQ || freePlay || INST_OPEN_ALL_OPTIONS[instructor]) {
      answeredQ.forEach((q) => { options[q] = 'all' })
    }
    if (scripted && (lastOfQ || freePlay) && cur?.focusQ !== undefined) {
      /* 다시 고르지 않는 단계(실전 코칭)는 answeredQ 가 비어 있어 위에서 안 열린다 — 여기서 연다 */
      options[cur.focusQ] = 'all'
    }
    return { revealedScript: script, revealedOptions: options, activePassageId: activeDoc }
  }, [turns, turnIdx, answeredQ, scripted, freePlay, instructor])

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
    /* 발화는 **수업·리뷰 화면일 때만** 한다. 실전·정리는 다른 화면이라 여기서 말하면
       학생이 문제를 푸는 동안 강사 목소리가 얹힌다.
       phase 를 의존성에 넣는 이유: 실전 → 리뷰로 넘어갈 때 턴 번호가 0 그대로인 경우가 있어
       (실전으로 바로 들어온 진입) 턴만 보면 효과가 안 돌고 **리뷰 첫 마디가 통째로 빈다**. */
    if (phase !== 'lesson' && phase !== 'review') return
    setChoicePicked(null); setSubjText(''); setSubjSent(false); setMarkDone(false); setMatchTapped(new Set())
    setPlayingId(null)
    setReaskShown(reaskRef.current.get(turnIdx) ?? 0)
    setMarkVerdict(null); setMarkChecking(false)
    setWrongPicks(new Set())
    setSpokenTurn(null)        // 이 턴 발화는 아직 시작도 안 했다 — 선택지를 닫아 둔다
    enteredAtRef.current = Date.now()
    barTokenRef.current += 1   // 학생이 바로 돌리던 재생은 턴이 바뀌면 끝난다
    stopVoice()
    let alive = true
    ;(async () => {
      /* 강사 발화는 에이전트(일레븐랩스) 몫 — 브라우저 기본 TTS는 쓰지 않는다.
         에이전트가 말하는 중이면 그 발화가 끝난 뒤 음원을 재생한다(겹침 방지, 최대 10초 대기).
         에이전트에 연결하지 않은 상태면 대기 없이 바로 음원으로 간다. */
      /* ── 대본 낭독 ──
         시트 문장을 글자 그대로 읽는다. LLM 이 끼어들 자리가 없어야 대본대로 흐른다.
         강사 목소리(ElevenLabs)가 없으면 lib/tts 가 브라우저 TTS 로 알아서 내려간다. */
      if (scripted) {
        /* ── 앞의 답이 틀렸으면 대본의 맞장구를 뗀다 ──
           대본은 학생이 맞힐 것을 전제로 쓰여 있다: "맞아요. 인물이 지금 하고 있는 동작은 …".
           그런데 학생이 "몰라" 라고 해서 답을 알려주고 넘어온 자리에서도 그 "맞아요" 가 그대로
           나간다(실측). 방금 못 맞힌 학생에게 맞았다고 하는 셈이라 수업이 거짓말이 된다.
           **문장을 새로 짓지는 않는다** — 첫머리 한 마디만 떼고 나머지는 시트 그대로 읽는다. */
        /* ── 정답·오답 갈래 (tutorIfWrong) ──
           시트가 한 칸에 두 경우를 다 적어 둔 줄이 있다. **무엇을 기준으로 고르느냐가 갈린다.**

             · 문항 정오답을 알려주는 자리(S5 정답 근거 연결) → **그 문항을 맞혔는가**
               근거는 화면에 남은 사실이다(고른 보기가 정답인가). 사이에 들려주는 턴이 껴도
               흔들리지 않는다.
             · 그 밖의 스캐폴딩 응답            → **직전 답을 맞혔는가**(prevOk)
               "(오답) 다시 한번 봐보세요. 빈칸 바로 앞에 단어에 동그라미 쳐보세요." 같은 줄은
               바로 앞 단계(필기·2지선다)에 대한 대답이지 문항 정답과는 상관이 없다. 문항 기준으로
               고르면 문항을 맞힌 학생이 스캐폴딩을 틀려도 "잘했어요" 를 듣는다. */
        const q = turn.focusQ !== undefined ? lesson.content.questions[turn.focusQ] : undefined
        const picked = turn.focusQ !== undefined ? answers[turn.focusQ] : undefined
        const gotIt = !!picked && picked === q?.options.find((o) => o.correct)?.label
        /* ⚠️ 단계 이름만 보면 안 된다 — **바로 앞 턴이 학생에게 무엇을 물었는지**가 먼저다.
           S5 안에도 스캐폴딩 질문이 있다("여기서 핵심 동작을 나타내는 표현이 뭐였죠? 1) is painting
           2) on an easel"). 그 대답에 붙는 반응 줄까지 문항 기준으로 고르는 바람에, 문항을 틀린
           학생이 스캐폴딩을 **맞혀도** 오답 갈래를 들었다(실측 보고 08-20, 이도윤 LC 1번).
           앞 턴이 물어본 턴이면 이 줄은 그 대답에 대한 반응이다 — prevOk 로 고른다. */
        const askedJustBefore = ASKING_KINDS.has(turns[turnIdx - 1]?.interaction.kind ?? '')
        const verdictTurn = !askedJustBefore && /S5|정답\s*근거/.test(turn.stage) && picked !== undefined
        const wrongNow = verdictTurn ? !gotIt : prevOkRef.current === false
        const useWrong = !!turn.tutorIfWrong && wrongNow
        const scripted0 = useWrong ? turn.tutorIfWrong! : turn.tutor
        /* 오답 갈래를 골랐으면 맞장구를 떼지 않는다 — 그 줄은 이미 못 맞힌 학생에게 쓴 문장이라
           첫머리를 자르면 시트가 의도한 말이 사라진다("아쉽지만 아니에요. 다시 봐볼게요."). */
        const line = !useWrong && prevOkRef.current === false ? stripAck(scripted0) : scripted0
        prevOkRef.current = null
        await say(line)
        if (!alive) return
      } else if (agentOnRef.current) {
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
        setSelfPlaying(false)   // 이건 강사가 들려주는 자료다
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

      /* ── 여기서부터 학생 차례 ──
         강사가 할 말을 다 했고 들려줄 것도 다 틀었다. 이제 선택지를 내보낸다.
         (전에는 턴에 들어서자마자 버튼이 떠서, 강사가 질문을 채 하기도 전에 답이 눌렸다) */
      if (alive) setSpokenTurn(turnIdx)

      /* ── 들려주고 넘어가는 턴은 앱이 전진시킨다 ──
         "들어보자"처럼 학생이 할 일이 없는 턴을 에이전트의 next_step 에 맡기면, 발화·음원이 끝나고도
         에이전트가 다시 말을 걸 때까지 멈춰 있어 답답하다. 발화 종료(위 400ms 정적)와 음원 종료를
         이미 알고 있으므로 여기서 짧은 여유만 두고 넘긴다.
         · 에이전트 없이 도는 폴백은 버튼으로 진행하므로 자동 전진하지 않는다(읽을 시간이 필요하다)
         · 마지막 턴은 넘기지 않는다 — 실전 문제로 튀지 않고 [실전 문제 풀기] 버튼을 학생이 누르게 한다 */
      if (alive && !askingRef.current && (scripted || agentOnRef.current) && !needsAnswer(turn) && turnIdx < turns.length - 1 && !atItemEnd) {
        await new Promise((res) => setTimeout(res, 700))
        /* 기다리는 **사이에** 학생이 물어봤을 수 있다 — 그 700ms 안에 들어온 질문을 놓치면
           강사가 답하는 동안 화면이 다음 단계로 넘어간다(두 목소리가 겹친다). 한 번 더 본다. */
        if (alive && !askingRef.current && turnIdxRef.current === turnIdx) advanceByApp(turnIdx + 1)
      }
    })().catch(() => {
      /* 낭독이나 음원이 실패해도 **선택지는 열어야 한다.** 안 열면 학생이 아무것도 못 누르는
         화면에 갇힌다 — 소리가 안 난 것보다 그게 훨씬 나쁘다. */
      if (alive) setSpokenTurn(turnIdx)
    })
    return () => { alive = false; stopVoice() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, started, phase])

  useEffect(() => () => stopVoice(), [])

  const goNext = () => {
    /* 문제 경계에서는 아무 일도 하지 않는다 — 넘기는 것은 [다음 문제] 버튼 하나뿐이다.
       에이전트의 next_step 이 여기로도 들어오는데, 그걸 열어두면 대화를 닫아놓고도
       화면만 다음 문제로 넘어가 버린다. */
    if (atItemEnd) return
    if (turnIdx < turns.length - 1) { setTurnIdx(turnIdx + 1); return }
    stopVoice()
    /* ── 수업(스캐폴딩) 끝 ──
       바로 실전으로 밀지 않고 **혼자 들어보는 구간**을 하나 둔다. 수업 내내 음원은 강사가 틀어줬고
       학생은 손댈 수 없었다 — 실전에 들어가면 시험처럼 1회뿐이라, 그 사이에 스스로 눌러 보는
       자리가 없으면 "듣기 연습"을 한 번도 자기 손으로 못 해보고 시험을 본다.
       리뷰(틀린 문제 다시 풀기)는 그럴 자리가 아니라 그대로 정리로 간다. */
    if (phase === 'review') { setPhase('wrap'); return }
    setAfterLesson(true)
  }

  /* ── 대본 수업의 답 처리 ──
     **되묻기는 한 번뿐이다.** 지금 에이전트가 앓는 병이 정확히 "같은 요구를 끝없이 반복"이라,
     횟수를 코드가 못 박는다. 두 번째에는 짚어주고 넘어간다 — 시연이 거기서 멈추면 안 된다. */
  const triesRef = useRef<Map<number, number>>(new Map())
  /** 직전 턴의 답이 맞았는가 — 다음 대본 첫머리의 맞장구를 뗄지 정한다.
   *  null 이면 판단할 것이 없다(들려주기 턴 등). 한 번 쓰고 비운다. */
  const prevOkRef = useRef<boolean | null>(null)
  /** 맞장구를 몇 번 했나 — 같은 말을 반복하지 않으려고 돌려 쓴다(ackLine) */
  const ackNoRef = useRef(0)
  /* 질문에 답하는 동안 대본을 세워 두는 스위치. 학생이 켜는 것이 아니라(버튼은 없앴다)
     대본 밖 질문이 들어오면 앱이 켠다 — 진행 게이트가 이 값을 본다 */
  const [asking, setAsking] = useState(false)
  const askingRef = useRef(false)
  askingRef.current = asking
  const [askBusy, setAskBusy] = useState(false)
  /** 지금 대본 밖 질문에 답하는 중인가.
   *  멈춤은 `asking` 이 맡는다 — 진행 게이트(자동 전진 차단)가 거기 걸려 있어서 따로 만들면
   *  질문에 답하는 동안 화면이 다음 단계로 넘어간다. 이 값은 **겉모습**만 정한다:
   *  수업을 세운 티를 내지 않고, 답하는 동안 한 줄만 띄운다. */
  const [autoAsk, setAutoAsk] = useState(false)
  /* ── 말과 글자를 맞춘다 ──
     전에는 발화 전체가 한 번에 툭 떴다. 강사는 아직 첫 마디인데 화면에는 끝 문장까지 다 있으니
     학생은 글자를 먼저 읽고 소리를 기다린다 — 듣기 수업에서 그건 그냥 읽기다.
     **시간으로 흘려보내지 않고 음원의 재생 위치를 따라간다**(playbackProgress). 그래야 어긋나지
     않는다: 문장이 길든 짧든, 목소리가 빠르든 느리든 글자는 정확히 소리를 따라온다.
     음원이 없을 때(브라우저 TTS 폴백)만 글자 수로 대략 잡는다. */
  const revealRef = useRef<number | null>(null)
  /** 글자를 **0에 세워 둔다.** 음원을 받는 동안 말풍선이 비어 있어야 그 자리에 점 세 개가 돈다.
   *  흘리기 시작하는 것은 소리가 나가는 순간(speakTTS 의 onStart)이지 이때가 아니다. */
  const armReveal = (text: string) => {
    if (revealRef.current) cancelAnimationFrame(revealRef.current)
    revealRef.current = null
    setTyped({ text, shown: 0 })
  }
  /** @param hasAudio 강사 음원인가(false = 브라우저 TTS). 음원이면 재생 위치를 따라가고,
   *    아니면 읽을 위치가 없으니 글자 수로 흘린다. */
  const startReveal = (text: string, hasAudio: boolean) => {
    if (revealRef.current) cancelAnimationFrame(revealRef.current)
    const t0 = Date.now()
    let sawAudio = false
    setTyped({ text, shown: 0 })
    const tick = () => {
      const p = playbackProgress()
      let ratio: number
      if (p) { sawAudio = true; ratio = p.current / p.duration }
      else if (sawAudio) ratio = 1                       // 재생이 끝났다
      /* 음원이 있는데 아직 길이를 못 읽는 동안(메타데이터 로딩·autoplay 차단 해제 대기)은
         한 글자도 내보내지 않는다. 소리 없이 글자만 흐르면 그게 제일 이상하다.
         ⚠️ 예전에는 여기가 "1.5초 지나면 음원이 없는 것으로 친다" 였다 — v3 목소리는 받는 데
            그보다 오래 걸려서, 글자가 먼저 흐르고 소리가 뒤늦게 따라붙었다(실측).
            지금은 **소리가 나가기 시작한 뒤에야** 이 루프가 도니까 추측할 이유가 없다.
            8초는 재생이 영영 안 시작되는 경우(제스처 대기)에 글자가 갇히지 않게 하는 안전판. */
      else if (!hasAudio || Date.now() - t0 > 8000) {
        const base = hasAudio ? 8000 : 0
        ratio = (Date.now() - t0 - base) / Math.max(900, text.length * 95)
      }
      else ratio = 0
      const want = Math.round(text.length * Math.min(1, Math.max(0, ratio)))
      /* 값이 그대로면 **같은 객체를 돌려준다** — 안 그러면 프레임마다 리렌더가 돈다 */
      setTyped((cur) => (cur && cur.text === text && want > cur.shown ? { text, shown: want } : cur))
      /* 다 드러났으면 루프를 끝낸다. 말이 끊겨(stopVoice) 재생 promise 가 끝나지 않는 경우가
         있어서, 여기서 스스로 멈추지 않으면 rAF 가 화면이 바뀔 때까지 계속 돈다. */
      if (want >= text.length) { revealRef.current = null; return }
      revealRef.current = requestAnimationFrame(tick)
    }
    revealRef.current = requestAnimationFrame(tick)
    return () => { if (revealRef.current) cancelAnimationFrame(revealRef.current); revealRef.current = null }
  }
  useEffect(() => () => { if (revealRef.current) cancelAnimationFrame(revealRef.current) }, [])

  /* 낭독은 반드시 이걸로 부른다 — 말하는 동안 아바타가 움직이고 파형이 떠야 한다.
     speakTTS 를 직접 부르면 화면은 강사가 말하는 줄 모른다(실측: 영상도 파형도 안 나왔다). */
  const say = async (text: string, aside = false) => {
    /* 말한 것은 그대로 채팅에도 쌓는다 — 텍스트 모드에서 대화가 남아야 앞을 다시 볼 수 있다.
       낭독·피드백·질문 답변이 전부 이 문을 지나므로 여기 한 곳에서만 쌓으면 된다. */
    setChatLog((prev) => (prev[prev.length - 1]?.text === text ? prev : [...prev, { role: 'ai', text, aside }]))
    setNarrating(true)
    /* 말풍선은 **비어 있는 채로** 먼저 세운다(자리는 잡되 글자는 없다) — 그 사이 점 세 개가 돈다.
       글자는 소리가 나가는 순간부터 흐른다. 이 순서가 뒤집히면 학생이 글자를 먼저 읽어 버려서
       듣기 수업이 읽기 수업이 된다. 아바타도 같은 시점에 맞춘다(voiceLoading). */
    setVoiceLoading(true)
    armReveal(text)
    /* 채팅·화면에는 시트 문장 그대로, **읽을 때만** 홀로 선 알파벳을 한글 음으로 바꾼다
       ("D에서는" → "디에서는"). 한국어 목소리에 알파벳을 그대로 주면 발음이 뭉개진다. */
    try {
      await speakTTS(koLetters(text), ttsPersona, instructor, (hasAudio) => {
        setVoiceLoading(false)
        startReveal(text, hasAudio)
        /* ── 다음 줄을 지금 받아둔다 ──
           소리가 나가기 시작한 이 순간부터 몇 초는 **네트워크가 놀고 있다.** 그동안 다음 턴의
           발화를 받아두면 다음 대기가 0이 된다. 발화가 음원 받는 시간보다 길기만 하면 그렇다.
           ⚠️ koLetters 를 여기서도 거쳐야 한다 — 실제로 보내는 문자열과 한 글자라도 다르면
              캐시가 빗나가서 미리 받은 것이 버려진다. */
        const next = turnsRef.current[turnIdxRef.current + 1]?.tutor
        if (next) prefetchTTS(koLetters(next), ttsPersona, instructor)
      })
    }
    finally {
      if (revealRef.current) cancelAnimationFrame(revealRef.current)
      revealRef.current = null
      setTyped(null); setVoiceLoading(false); setNarrating(false)
    }
  }

  /** 맞았을 때 앱이 추임새를 넣어야 하는가 — **다음 대본이 이미 받아주면 넣지 않는다.**
   *  대본이 정본이라 시트에서 "맞아요" 를 빼는 대신 앱이 비켜선다(빼면 강사 말이 뚝 시작한다).
   *  문제 끝(atItemEnd)에서는 다음 발화가 바로 이어지지 않으므로 앱이 반응해야 한다 —
   *  안 그러면 답을 맞히고도 아무 소리 없이 [다음 문제] 버튼만 뜬다. */
  const scriptWillAck = () => {
    if (atItemEnd) return false
    const nx = turnsRef.current[turnIdxRef.current + 1]
    return !!nx && ACK_OPENER.test(nx.tutor.trim())
  }

  /** 붙잡기를 끝내고 넘어갈 때 하는 말 — **무엇이 왜 아니고 답이 무엇인지**를 담는다.
   *
   *  전에는 정답 문구만 끼워 넣어 "이번엔 제가 짚어 줄게요. 아니에요 이렇게 보면 돼요." 가 나갔다.
   *  두 번이나 틀린 학생에게 그건 아무것도 알려주지 않는다 — 자기 답이 왜 아닌지도, 답이 뭔지도.
   *
   *  근거는 **지어내지 않는다.** 이 턴이 어느 보기를 짚는지(reveal.optionText)와 그 보기의 해석
   *  (question_options.option_explanation)이 있을 때만 "보기가 뭐라고 했는지"를 읽어 준다.
   *  없으면 고른 것과 답만 분명히 말한다. */
  /** O/X 선택지는 **화면엔 기호, 입엔 말**이다. 'X' 를 그대로 읽히면 한국어 목소리가
   *  영어 알파벳으로 뭉개 읽는다(koLetters 는 A~D 만 한글 음으로 바꾼다). */
  const asWord = (t: string) => (t === 'O' ? '맞아요' : t === 'X' ? '아니에요' : t)
  /** 답을 매듭짓는 한 마디. O/X 를 "답은 '아니에요' 예요" 로 만들면 말이 겹쳐 들린다 —
   *  O/X 는 판정이지 낱말이 아니라서 그대로 서술형으로 말한다. */
  const verdict = (t: string) => (t === 'X' ? '이건 아니에요.' : t === 'O' ? '이건 맞아요.'
    : `답은 '${t}' ${koCopula(t)}.`)

  const closingLine = (picked?: string): string => {
    const it = turn.interaction
    if (it.kind === 'subjective') {
      if (!it.hint) return '이건 같이 보고 넘어갈게요.'
      /* 문장으로 답하는 자리와 낱말로 답하는 자리를 가른다 — 낱말 답에 "이렇게 답하면 돼요" 를
         붙이면 말하기 연습처럼 들리고("이렇게 답하면 돼요. 동작이요."), 문장 답을
         "답은 '…' 예요" 에 끼우면 문장이 겹쳐 읽힌다. */
      const one = firstExample(it.hint)
      const word = bareWord(one)
      return word === null ? asConfirm(one) : `답은 '${word}' ${koCopula(word)}.`
    }
    if (it.kind !== 'choice') return '이건 같이 보고 넘어갈게요.'

    const right = it.choices.find((c) => c.correct)?.text
    if (!right) return '이건 같이 보고 넘어갈게요.'
    const label = turn.reveal?.optionText?.[0]?.labels?.[0]
    const q = turn.focusQ !== undefined ? lesson.content.questions[turn.focusQ] : undefined
    const trans = label ? q?.options.find((o) => o.label === label)?.why : undefined
    const mine = picked && picked !== right ? `방금 고른 '${asWord(picked)}' 는 답이 아니에요. ` : ''

    /* O/X 는 근거의 방향이 정해져 있다 — X 면 자료에 없다는 뜻, O 면 그대로라는 뜻 */
    if (trans && label && (right === 'X' || right === 'O')) {
      const no = right === 'X'
      /* 이어주는 말이 방향을 만든다 — 아닐 때는 '했는데'(반전), 맞을 때는 '했고'(순접) */
      const ground = no ? contraOf(lesson.part) : lesson.part === 1 ? '사진 그대로죠?' : '자료와 맞죠?'
      return `${mine}${label}에서는 ${quoted(trans)} 했${no ? '는데' : '고'}, ${ground} 그래서 ${verdict(right)}`
    }
    return `${mine}${verdict(right)}`
  }

  /** 붙잡기를 끝낼 때, **다음 대본이 답을 이미 말해 주는가.** 그러면 앱은 답을 얹지 않는다.
   *
   *  개념을 묻는 자리는 다음 줄이 곧 그 답의 설명이다 — "여자가 무엇을 하고 있나요?" 다음에
   *  "여자가 앉아서 붓으로 그림을 그리고 있죠?" 가 온다. 그 앞에 앱이 "이렇게 답하면 돼요.
   *  그림을 그리고 있어요" 를 얹으면 같은 답을 두 번 듣는다(실측).
   *
   *  대본이 답을 말하지 않고 지나가는 자리도 있다. 보기를 하나씩 지우는 O/X 턴이 그렇다 —
   *  다음 줄이 곧장 다음 보기로 간다("이제 C를 볼게요"). 그런 자리에서만 앱이 답을 매듭짓는다. */
  const scriptWillTell = (): boolean => {
    /* ⚠️ 문제 끝에서는 다음 발화가 **바로 이어지지 않는다**([다음 문제] 버튼이 먼저 뜬다).
       거기서 대본에 맡기면 학생은 답을 못 듣고 버튼만 본다 — 그 자리는 앱이 매듭짓는다. */
    if (atItemEnd) return false
    const it = turn.interaction
    const answer = firstExample(it.kind === 'subjective' ? (it.hint ?? '')
      : it.kind === 'choice' ? (it.choices.find((c) => c.correct)?.text ?? '')
        : '')
    const keys = answerKeys(answer)
    /* 낱말이랄 게 없는 답("네", "X")은 대본에서 찾을 수가 없다. 말하기 답이면 다음 줄이
       어차피 다 풀어 주므로 맡기고, O/X 는 앱이 말해 준다. */
    if (!keys.length) return it.kind === 'subjective'
    /* 다음 줄은 **맞장구를 뗀 뒤**의 모습으로 본다 — 못 맞힌 뒤라 그 줄은 stripAck 을
       지나서 나간다. 떼기 전 문장으로 재면 이미 사라진 말을 "대본이 해 준다"고 착각한다. */
    return lineCovers(stripAck(turnsRef.current[turnIdxRef.current + 1]?.tutor ?? ''), keys)
  }

  /** @param mode  'giveUp' 모른다고 했다 · 'unsure' **채점기가 판정을 못 했다** */
  const handleScriptedAnswer = async (ok: boolean, picked?: string, mode?: 'giveUp' | 'unsure') => {
    await waitForCue()          // 들려주던 음원이 끝나고 나서 말한다(위 waitForCue)
    const tries = (triesRef.current.get(turnIdx) ?? 0) + 1
    triesRef.current.set(turnIdx, tries)
    prevOkRef.current = ok
    if (ok) {
      if (!scriptWillAck()) await say(ackLine(ackNoRef.current++))
      goNext()
      return
    }
    /* ── 판정을 못 했으면 **아무 판정도 하지 않는다** ──
       맞다고 하면 틀린 답에 "좋습니다" 가 나가고, 틀렸다고 하면 맞은 답을 나무란다.
       맞장구만 떼고(prevOk=false → stripAck) 대본으로 조용히 이어간다. */
    if (mode === 'unsure') { goNext(); return }
    /* ── "몰라요" 는 오답이 아니다 ──
       모른다고 말한 학생에게 "그건 조금 달라요, 다시 생각해 볼까요?" 는 앞뒤가 안 맞고,
       모르는 걸 한 번 더 물어봐야 나올 것도 없다. 되묻지 않고 바로 넘어간다. */
    if (mode === 'giveUp') {
      /* 고른 것을 넘기지 않는다 — "방금 고른 '몰라' 는 답이 아니에요" 가 되면 안 된다.
         다독이지 않는 강사(INST_SCRIPT_ONLY)는 그냥 다음 단계를 말한다 — prevOk 가 false 라
         대본이 맞장구로 시작해도 stripAck 이 떼어 주므로, 모른다는 학생에게 맞았다고 하지 않는다. */
      if (!INST_SCRIPT_ONLY[instructor]) {
        await say(scriptWillTell() ? '괜찮아요, 이건 같이 볼게요.' : `괜찮아요, 같이 볼게요. ${closingLine()}`)
      }
      goNext()
      return
    }
    /* 되묻지 않는 강사면(INST_SCRIPT_ONLY) 이 갈래를 건너뛰고 바로 아래로 간다 — 짚어 주고 넘어간다.
       대본이 다음 줄에서 답을 풀어 주면 앱은 거기서도 비켜선다(scriptWillTell). */
    if (tries === 1 && !INST_SCRIPT_ONLY[instructor]) {
      /* "음, 그건 조금 달라요." 는 뺐다 — 틀렸다는 것은 화면이 이미 말하고 있고,
         말로 한 번 더 얹으면 나무라는 것처럼 들린다. 다시 해보자는 말만 남긴다. */
      await say('다시 한번 생각해 볼까요?')
      /* ⚠️ subjSent 를 반드시 되돌린다. 이게 켜져 있으면 answerSubjective 가 들어오는 답을
         그대로 버리고(1575행), voiceOn 도 false 라 마이크가 다시 안 열린다 →
         "다시 한번 생각해 볼까요?" 라고 해놓고 **두 번째 답을 받을 방법이 없다**(실측). */
      setSubjText(''); setSubjSent(false); setChoicePicked(null)
      /* 선택지를 다시 열었으니 카드도 **방금 한 말 아래로** 다시 내려가야 한다.
         안 내리면 "다시 한번 생각해 볼까요?" 말풍선이 버튼 밑에 붙어 순서가 뒤집힌다. */
      setDockTick((n) => n + 1)
      return
    }
    /* 못 맞혔다 — **다음 대본이 답을 말해 주면 앱은 아무 말도 얹지 않는다.**
       "제가 짚어 줄게요. 이렇게 답하면 돼요. 그림을 그리고 있어요" 바로 뒤에 대본이
       "여자가 앉아서 붓으로 그림을 그리고 있죠?" 라고 하면 같은 답이 두 번이다.
       ⚠️ scriptWillTell 은 다음 줄이 답을 말하는지를 **글자로** 가늠하는 어림짐작이라 놓칠 때가
          있다(실측: "뭐가 보이나요?" → 앱이 "제가 짚어 줄게요. 옷장, 행거에 걸린 옷, 선반" 을
          얹고 곧바로 대본이 "행거에 옷이 걸려있고 …" 를 말했다). 대본만 읽는 강사는
          (INST_SCRIPT_ONLY) 가늠하지 말고 언제나 비켜선다 — 답은 대본이 말한다. */
    /* "제가 짚어 줄게요." 는 뗐다 — 짚어 주겠다고 예고하는 말은 그 자체로 내용이 없고,
       뒤에 붙는 답까지 훈수처럼 들리게 만든다. 답만 강사 말투로 바로 말한다(asConfirm). */
    if (!scriptWillTell() && !INST_SCRIPT_ONLY[instructor]) await say(closingLine(picked))
    goNext()
  }

  /* 정답 고르기(A~D)의 반응. 선택지 버튼과 달리 **오답마다 근거(why)가 있어** 그걸 실어 되묻는다.
     첫 오답에는 정답을 열지 않는다 — 열어 버리면 다시 고를 것이 없다. 두 번째에 열고 넘어간다. */
  /** 이 턴이 **들려주던 음원이 끝날 때까지** 기다린다.
   *
   *  실제 시험은 네 보기를 끝까지 들려준다. 그런데 학생이 두 번째 보기쯤에서 답을 고르면
   *  강사가 곧바로 말을 시작해 **남은 보기와 목소리가 겹쳐 들렸다**(실측).
   *  고른 것은 그대로 받아 화면에 표시하고(그건 즉시 보여야 한다), **말과 진행만** 미룬다.
   *  에이전트 경로에는 같은 게이트가 이미 있다(next_step 의 audioDoneRef 검사) — 대본 경로에만 없었다.
   *
   *  턴이 바뀌거나 20초가 지나면 그만 기다린다. 음원이 끝났다는 신호를 영영 못 받는 경우
   *  (재생 실패·파일 없음)에 학생을 세워 두면 안 된다. */
  const waitForCue = async () => {
    if (!turn.audio) return
    const at = turnIdxRef.current
    const until = Date.now() + 20000
    while (!audioDoneRef.current.has(at) && turnIdxRef.current === at && Date.now() < until) {
      await new Promise((r) => setTimeout(r, 120))
    }
  }

  /** 음원을 기다리는 동안 학생이 **다시 고를 수 있다.** 그때 앞의 것까지 진행하면 두 칸 넘어간다.
   *  표를 하나 두고 마지막에 고른 것만 살린다. */
  const pickTokenRef = useRef(0)

  const handleScriptedPick = async (qIdx: number, ok: boolean, why?: string, label?: string) => {
    const token = ++pickTokenRef.current
    await waitForCue()
    /* 음원이 나가는 동안 학생이 몇 번을 고쳐 골랐든, **여기까지 온 것은 마지막 클릭뿐이다.**
       앞선 클릭들은 토큰이 밀려 여기서 되돌아간다. 그래서 채점·기록·대화를 이 자리에서 한다 —
       클릭마다 하면 보기가 잠기고, 말풍선이 쌓이고, 학습 기록에 중간에 눌러 본 답이 다 남는다. */
    if (pickTokenRef.current !== token) return
    /* 대화에 남기는 것은 두 경로 공통 — 다만 여기서 해야 고쳐 고른 흔적이 쌓이지 않는다 */
    const optText = lesson.content.questions[qIdx]?.options.find((o) => o.label === label)?.text ?? ''
    setChatLog((prev) => [...prev, { role: 'user', text: `${label}. ${optText}`.trim() }])
    /* 채점·학습기록은 **수업에서만** 여기로 미뤘다. 코칭은 되묻는 자리라 클릭 즉시 해야 하고
       (onSelect), 여기서 또 하면 두 번 기록된다. */
    if (phase !== 'review') {
      setGraded((p) => new Set(p).add(qIdx))
      if (!ok && label) setWrongPicks((p) => new Set(p).add(`${qIdx}:${label}`))
      logResponse(label ?? '', ok)
    }
    const key = turnIdx
    const tries = (triesRef.current.get(key) ?? 0) + 1
    triesRef.current.set(key, tries)
    prevOkRef.current = ok

    /* ── 이도윤: 학생 풀이 단계에서 앱은 **아무 말도 하지 않는다** ──
       이 강사는 정오답 확인을 대본이 정해 둔 자리에서 한다 — "S5 정답 근거 연결" 이 두 갈래를
       다 갖고 있다("정답은 B죠? 잘 맞혔어요!" / tutorIfWrong "정답은 B였어요…"). 문제를 풀자마자
       앱이 한 마디 얹으면 같은 자리가 두 번이 되고, 사이에 낀 S3 개념 코칭을 지나기도 전에 답을
       알아 버린다 — 개념을 짚는 단계가 통째로 김이 샌다.
       ⚠️ 맞장구도 안 된다. "맞아요" 한 마디가 곧 정답 공개다.
       ⚠️ **강사별이다.** 콘텐츠팀 메모가 이도윤 단계에 대한 것이고, 실제로 이 강사 대본에만
          오답 갈래가 있다(이도윤 3/3, 윤다은 0/11). 윤다은에 걸면 틀린 학생이 아무 반응도
          못 받은 채 정답 기준으로 쓰인 S5 를 듣게 된다.
       prevOkRef 는 남겨 둔다 — 다음 대본이 맞장구로 시작하면 stripAck 이 떼어 준다. */
    if (phase !== 'review' && INST_SCRIPT_ONLY[instructor]) { goNext(); return }

    if (ok) {
      if (!scriptWillAck()) await say(ackLine(ackNoRef.current++))
      goNext()
      return
    }

    /* ── 학생 풀이 단계는 **다시 고르게 하지 않는다** (강사 공통) ──
       스캐폴딩 질문은 생각을 고쳐 잡는 자리라 되묻는 값이 있지만(handleScriptedAnswer 가 그쪽),
       문항 정답 고르기는 실제 시험과 같은 자리다. 한 번 고르면 그걸로 끝낸다.
       고른 보기를 되짚어 준다 — "아니에요." 만 하면 무엇이 아니라는 건지 붕 뜬다. 조사는 언제나
       **는** 이다: A~D 는 읽을 때 에이·비·씨·디 로 모두 모음(이)으로 끝난다(koLetters 가 낭독
       직전에 바꾼다. 화면 글자는 A~D 그대로다). 라벨이 A~D 가 아니면 붙이지 않는다.
       **정답이 무엇인지는 말하지 않는다** — 여기서 알려주면 뒤따르는 풀이 단계가 빈다. */
    if (phase !== 'review') {
      await say(label && /^[A-Z]$/.test(label) ? `${label}는 아니에요.` : '아니에요.')
      goNext()
      return
    }

    /* ── 여기부터는 코칭(실전 오답 리뷰)뿐이다 ──
       이미 채점 결과를 본 자리라 감출 것이 없고, 한 번 더 고쳐 볼 기회를 주는 것이 목적이다. */
    if (tries === 1) {
      /* **고른 보기가 무슨 말이었는지**를 학생 말로 되짚고, 자료에 그게 없다는 것만 짚는다.
         정답이 무엇인지는 아직 말하지 않는다 — 말해 버리면 다시 고를 것이 없다. */
      await say(why && label
        ? `${label}에서는 ${quoted(why)} 했는데, ${contraOf(lesson.part)} 다시 한번 골라 볼까요?`
        : '아니에요. 다시 한번 골라 볼까요?')
      return
    }
    const q = lesson.content.questions[qIdx]
    const right = q?.options.find((o) => o.correct)
    setGraded((p) => new Set(p).add(qIdx))
    /* 라벨과 '번' 을 띄운다 — 붙이면 낭독이 "비번이에요"(비밀번호) 로 들린다 (koLetters: B→비) */
    await say(right ? `정답은 ${right.label} 번이에요.` : '정답을 같이 볼게요.')
    goNext()
  }

  /* 말하기 턴의 답 — 음성 전사와 텍스트 입력이 같은 문으로 들어온다.
     받았으면 true. **거짓을 돌려주면 그 입력은 아무 데도 안 갔다는 뜻이다** — 부르는 쪽이
     입력칸을 비우지 않아야 학생이 자기 문장을 잃지 않는다. */
  const answerSubjective = (text: string): boolean => {
    const it = turn.interaction
    if (it.kind !== 'subjective' || subjSent) return false
    setChatLog((prev) => [...prev, { role: 'user', text }])
    setSubjSent(true)
    setSubjText(text)
    if (isGiveUp(text)) { logResponse(text, false); void handleScriptedAnswer(false, text, 'giveUp'); return true }
    /* ── 말이 아닌 입력은 **답으로 치지 않는다** ──
       채점기에 보내 봐야 의미가 없고, 오답으로 몰면 "다시 생각해 볼까요?" 가 나가는데
       생각이 아니라 입력이 문제다. 되돌려서 다시 받는다(질문 갈래와 같은 처리).
       ⚠️ **되묻기는 이 턴에 한 번뿐이다.** 이 갈래가 횟수를 안 세는 바람에 자판을 계속 누르면
          "잘 못 알아들었어요" 만 끝없이 나갔다(실측). 이미 한 번 되물었으면 짚고 넘어간다. */
    if (isGibberish(text)) {
      if ((triesRef.current.get(turnIdx) ?? 0) >= 1) {
        logResponse(text, false); void handleScriptedAnswer(false, text); return true
      }
      triesRef.current.set(turnIdx, 1)
      logResponse(text, null)
      setSubjSent(false); setSubjText('')
      void (async () => { await waitForCue(); await say('음, 잘 못 알아들었어요. 다시 한번 말해 줄래요?') })()
      return true
    }
    if (subjectiveOk(text, it.hint, it.accepts)) { logResponse(text, true); void handleScriptedAnswer(true, text); return true }
    /* ── 낱말이 안 겹친다고 바로 틀렸다고 하지 않는다 ──
       기대 답 "그림을 그리고 있어요" 에 학생이 "이젤 페인팅" 이라고 하면 겹치는 낱말이 없다.
       뜻은 맞는데 말이 다를 뿐이다(실측). 이때만 한 번 물어보고 판정한다 —
       **낱말이 겹치면 묻지 않으므로**(위에서 끝난다) 대부분의 답은 예전처럼 즉시 반응한다. */
    void (async () => {
      const v = await judgeSubjective(text, it)
      /* ── 답이 아니라 **질문**이었다 ──
         "easel이 무슨 뜻이에요?" 를 답으로 채점하면 "그건 조금 달라요" 가 나간다(실측).
         답한 것으로 치지 말고 되돌린 뒤 답해 주고, 이 턴에 그대로 머문다 — 학생은 아직 답을
         안 한 것이므로 다시 말할 수 있어야 한다.
         ⚠️ 이 갈래는 **낱말이 하나도 안 겹친 답**에만 닿는다. 기대 답과 겹치면 위에서 이미
         끝나므로, 진짜 답이 질문으로 오해될 자리는 애초에 없다. */
      if (v === 'Q') {
        setSubjSent(false); setSubjText('')
        await askAside(text, true)      // 학생 말은 위에서 이미 대화에 남겼다
        return
      }
      if (v === '?') { logResponse(text, null); void handleScriptedAnswer(false, text, 'unsure'); return }
      const ok = v === 'O'
      logResponse(text, ok)
      void handleScriptedAnswer(ok, text)
    })()
    return true
  }

  /** 뜻으로 판정 — `O` 맞음 · `X` 틀림 · `Q` 강사에게 묻는 말 · `?` **판정 못 함.**
   *
   *  ⚠️ 예전에는 실패·타임아웃을 **O 로 떨어뜨렸다.** 맞은 답을 틀렸다고 하는 것이 더 나쁘다는
   *     이유였는데, 그 바람에 자판을 누른 자국("ㅇㅁㄴㄹㄹ")에도 대본의 "좋습니다" 가 그대로
   *     나갔다(실측). 못 했으면 못 했다고 하고, 부르는 쪽이 중립으로 넘긴다.
   *  판정을 기다리느라 침묵이 길어지는 것도 나쁘므로 3.5초에서 끊는다(첫 호출이 느리다). */
  const judgeSubjective = async (said: string, it: { hint?: string; accepts?: string[] }): Promise<'O' | 'X' | 'Q' | '?'> => {
    const expected = [it.hint, ...(it.accepts ?? [])].filter(Boolean).join(' / ')
    if (!expected) return 'O'                // 기대 답이 없는 자리는 무엇을 말해도 받아준다
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 3500)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          judge: true,
          message: `[강사 질문] ${turn.tutor}\n[기대 답] ${expected}\n[학생 답] ${said}`,
        }),
      })
      const data = await res.json()
      const v = String(data.dialogue ?? '').trim().toUpperCase()
      if (v.startsWith('Q')) return 'Q'
      if (v.startsWith('X')) return 'X'
      if (v.startsWith('O')) return 'O'
      console.warn('[judge] 판정을 못 읽었다', data)
      return '?'
    } catch (e) { console.warn('[judge] 판정 실패', e); return '?' } finally { clearTimeout(timer) }
  }

  /* ── 학생 질문 (대본 밖) ──
     세션을 열지 않는다. **한 번 묻고 한 번 답한다.** 에이전트를 다시 열면 그쪽이 진행 도구를
     들고 있어서 답하다가 단계를 넘겨 버릴 수 있다(방금 고친 병이 그것이다).
     지금 단계에서 알아도 되는 사실만 실어 보낸다(buildLessonFacts + 게이트) — 그래야 질문에
     답하다 정답을 흘리지 않는다. */
  const askTutor = async (question: string, alreadyLogged = false) => {
    if (!question.trim() || askBusy) return
    setAskBusy(true)
    stopVoice()
    if (!alreadyLogged) setChatLog((prev) => [...prev, { role: 'user', text: question, aside: true }])
    try {
      /* ── 학생이 화면에 남긴 것도 같이 보낸다 ──
         질문은 대개 **화면의 무언가를 가리키며** 나온다("이거 왜 답이에요?"). 그 '이거' 를
         빼고 물으면 강사는 엉뚱한 것을 설명한다. 둘을 실어 보낸다.
           · 노란 형광펜 — 학생이 탭한 낱말(글자라 그대로 적어 보내면 된다)
           · 필기 — 좌표로 풀 수 없으므로 **사진 + 필기 캔버스를 합성해 그림으로** 보낸다
             (표시 판정에 이미 쓰던 방법이다. /api/gemini 는 imageBase64 를 받는다) */
      const penned = Array.from(markedWords(marks))
      const drawn = draw.strokeCount > 0 ? composeMarkedImage() : null
      const inked = inkedOptions()
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: ttsPersona,
          /* 말투는 **강사**가 정한다 — persona 는 목소리 파라미터 키일 뿐이다(옛 페르소나가
             대신 답하던 원인). 강사별 프롬프트가 없으면 서버가 알아서 persona 로 떨어진다. */
          instructor,
          ...(drawn ? { imageBase64: drawn.replace(/^data:image\/\w+;base64,/, '') } : {}),
          message: `${buildLessonFacts(lesson, curItemSeq, gate)}

`
            + `[지금 단계] ${turn.stage}
[방금 강사가 한 말] ${turn.tutor}

`
            + (penned.length ? `[학생이 형광펜으로 칠한 낱말] ${penned.join(', ')}

` : '')
            + (drawn ? `[학생이 사진 위에 직접 표시한 것] 함께 보낸 그림에 학생의 필기가 얹혀 있다.
무엇을 동그라미·밑줄로 짚었는지 그림에서 보고, 그것을 가리키는 질문으로 읽어라.

` : '')
            /* 보기 위의 필기는 그림으로 못 보낸다(글자라서) — 어느 보기인지를 글로 알려준다.
               이게 없으면 "이거 왜 아니에요?" 의 '이거' 를 강사가 못 찾는다(실측). */
            + (inked.length ? `[학생이 필기로 짚은 보기] ${inked.join(', ')}번 보기 위에 직접 표시했다.
학생의 '이거'·'여기' 는 그 보기를 가리킨다.

` : '')
            + `[학생 질문] ${question}

`
            + '위 사실 범위에서 두 문장 안으로 짧게 답하라. 사실에 없으면 모른다고 하라. '
            + '다음 단계로 넘어가자는 말은 하지 마라 — 진행은 화면이 한다. '
            /* ⚠️ 되묻지 못하게 막는다. 답 끝에 물음표를 달면 학생이 거기에 대답하고, 그 대답이
               또 질문으로 들어와 **대본으로 영영 못 돌아온다**(실측: 여덟 번을 주고받았다). */
            + '**되묻지 마라.** 물어본 것에만 답하고 문장을 끝내라 — 답 끝에 질문을 달면 '
            + '학생이 계속 대화하게 되어 수업으로 돌아오지 못한다.',
        }),
      })
      const data = await res.json()
      /* LLM 답에는 **·*·`* 같은 기호가 섞여 나온다 — 그대로 읽으면 TTS 가 별표를 발음한다 */
      const answer = String(data.dialogue ?? '').replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim()
        || '음, 그건 지금 단계에서는 답하기 어려워요.'
      await say(answer, true)
    } catch {
      await say('지금은 답을 가져오지 못했어요. 수업을 계속할게요.', true)
    } finally {
      setAskBusy(false)
    }
  }

  /** 선택지 하나를 고른 결과를 처리한다 — **버튼과 타이핑이 같은 문을 지나야** 한다.
   *  (두 군데로 나뉘면 통로에 따라 같은 답이 다르게 채점된다) */
  const pickChoice = (c: { text: string; correct?: boolean }) => {
    const it = turn.interaction
    if (it.kind !== 'choice') return
    if (scripted) {
      /* 정답 표시가 있는 선택지면 맞고 틀림을 앱이 안다 — 에이전트에 물어볼 것이 없다.
         정답 표시가 없는 선택지(양쪽 다 받아주는 질문)는 무엇을 골라도 통과시킨다. */
      const isGraded = it.choices.some((ch) => !!ch.correct)
      const ok = isGraded ? c.correct === true : true
      setChatLog((prev) => [...prev, { role: 'user', text: c.text }])
      logResponse(c.text, isGraded ? ok : null)
      /* 넘기는 것은 **학생이 고른 것** 이다 — 짚어줄 때 '방금 고른 X 는 답이 아니에요' 로 쓴다 */
      void handleScriptedAnswer(ok, c.text)
      return
    }
    /* 정답 선택지가 있는 문항이면, 고른 게 정답 선택지가 아닐 때 명백한 오답(false)으로 넘긴다.
       (틀린 선택지는 correct가 undefined라, 그대로 넘기면 '채점 없음'으로 흘러가 교정을 못 했다) */
    const isGraded = it.choices.some((ch) => !!ch.correct)
    const ok = isGraded ? c.correct === true : undefined
    reportAction(`${turnIdx}:choice`, actionMessage(`'${it.prompt}'에 대해 '${c.text}'라고 답함`,
      ok, ok === false ? it.feedback : undefined))
    logResponse(c.text, ok ?? null)
  }

  /** 친 글자가 **이 턴의 선택지 중 하나인가.** 없으면 -1.
   *
   *  선택지 턴에서도 학생은 그냥 타이핑한다("사람", "인물", "1", "O"). 그걸 답으로 안 받으면
   *  화면은 아무 반응이 없고, 질문으로 넘기면 강사가 대화만 이어가며 대본으로 못 돌아온다(실측).
   *  버튼을 눌러야만 답이 되는 것은 앱의 사정이지 학생의 사정이 아니다. */
  const matchTypedChoice = (text: string, choices: { text: string }[]): number => {
    const norm = (s: string) => s.toLowerCase().replace(/[\s.,!?'"·]/g, '')
    const t = norm(text)
    if (!t) return -1
    /* 번호로 답하는 꼴 — "1", "1번", "①" */
    const n = /^([1-9])번?$/.exec(t)?.[1] ?? (t === '①' ? '1' : t === '②' ? '2' : null)
    if (n && Number(n) <= choices.length) return Number(n) - 1
    /* O/X 는 기호로도 말로도 온다 */
    const ox = /^(o|ㅇ|네|응|맞아|맞아요|예)$/.test(t) ? 'O' : /^(x|ㅌ|아니|아니요|아니에요)$/.test(t) ? 'X' : null
    if (ox) {
      const at = choices.findIndex((c) => norm(c.text) === ox.toLowerCase())
      if (at >= 0) return at
    }
    /* 글자로 — 완전히 같거나 한쪽이 다른 쪽을 품으면 그 선택지다.
       **둘 이상 걸리면 고르지 않는다** — 애매한 것을 임의로 정하느니 질문으로 보내는 편이 낫다. */
    const hits = choices
      .map((c, i) => ({ i, c: norm(c.text) }))
      .filter(({ c }) => c && (c === t || c.includes(t) || t.includes(c)))
    return hits.length === 1 ? hits[0].i : -1
  }

  /** 버튼을 안 누르고 그냥 물어본 경우 — **묻고 답하고 스스로 수업으로 돌아온다.**
   *
   *  `asking` 을 켜는 이유는 하나다: 진행 게이트가 거기에 걸려 있다(턴 효과의 자동 전진이
   *  askingRef 를 본다). 따로 만들면 강사가 답하는 동안 화면이 다음 단계로 넘어가 버린다.
   *  state 반영 전에 ref 를 직접 올려 그 틈까지 막는다. */
  const askAside = async (question: string, alreadyLogged = false) => {
    const at = turnIdxRef.current
    setAsking(true); setAutoAsk(true)
    askingRef.current = true
    try { await askTutor(question, alreadyLogged) }
    finally { setAsking(false); setAutoAsk(false); askingRef.current = false }

    /* ── 답했으면 **대본으로 데려다 놓는다** ──
       이게 없으면 학생이 질문 자리에 갇힌다(실측): 강사는 계속 대화를 이어가고, 화면은
       멈춘 채로 다음 단계로 가지 않는다. 답이 끝나는 곳이 곧 수업으로 돌아오는 곳이어야 한다. */
    if (turnIdxRef.current !== at) return          // 그 사이 화면이 옮겨갔다면 둘 것이 없다
    const t = turnsRef.current[at]
    if (!t) return
    if (needsAnswer(t)) {
      /* 학생이 답할 차례였다 — **무엇을 물었는지 다시 말해 준다.** 질문에 답하는 동안
         원래 물음이 대화 위로 밀려 올라가서, 그냥 돌아오면 뭘 하라는 건지 알 수 없다. */
      const it = t.interaction
      const again = (it.kind === 'choice' || it.kind === 'subjective' || it.kind === 'mark' || it.kind === 'match')
        ? it.prompt : ''
      await say(again ? `자, 다시 볼게요. ${again}` : '자, 다시 볼게요.')
      return
    }
    /* 들려주고 넘어가는 턴이었다 — 자동 전진이 질문 때문에 멈춰 있다. 여기서 이어 준다 */
    if (turnIdxRef.current === at && at < turnsRef.current.length - 1 && !atItemEnd) advanceByApp(at + 1)
  }

  /* 다시 들려준 턴 — **한 턴에 한 번뿐이다.** 못 들었다고 하면 한 번은 더 들려주는 게 맞지만,
     무제한이면 "듣고 고르는" 문제가 "여러 번 듣고 맞히는" 문제가 된다(실전은 아예 1회다). */
  const [replayed, setReplayed] = useState<Set<number>>(new Set())

  /** "다시 들려주세요" 를 받았을 때 — 학생 말을 대화에 남기고, 한 번만 다시 틀어준다.
   *  버튼을 두지 않는 이유: 버튼이 있으면 누구나 습관적으로 누른다. 청하게 두면 정말 못 들은
   *  학생만 청하고, 그 요청 자체가 FGI 에서 볼 만한 기록이 된다. */
  const replayOnAsk = async (asked: string) => {
    setChatLog((prev) => [...prev, { role: 'user', text: asked }])
    if (replayed.has(turnIdx)) {
      await say('다시 듣기는 한 번만 할 수 있어요. 들은 것까지로 한번 골라 볼까요?', true)
      return
    }
    setReplayed((p) => new Set(p).add(turnIdx))
    await say('네, 한 번 더 들려줄게요.', true)
    replayCue()
  }

  const replayCue = () => {
    if (!turn.audio) return
    stopVoice()
    setSelfPlaying(false)
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
      /* ── 수업의 학생 풀이 단계는 **채점을 클릭 시점에 하지 않는다** ──
         채점(graded)은 보기를 잠근다. 클릭 즉시 켜면 음원이 아직 나가는 중인데 답을 고칠 수
         없다 — 실제 시험은 네 보기를 다 듣고 바꾼다. 게다가 잠기는 건 **정답을 눌러 본 학생만**
         이라(오답은 graded 를 안 켰다) 먼저 맞힌 쪽이 손해를 보는 이상한 규칙이 된다(실측).
         채점·기록은 강사가 반응하는 시점으로 미룬다(handleScriptedPick, 음원이 끝난 뒤).
         그때까지는 파란 선택만 보기 사이를 옮겨 다닌다.
         ⚠️ 코칭(실전 오답 리뷰)은 예전 그대로다 — 음원을 듣는 자리가 아니라 이미 채점된 것을
            짚는 자리라, 고른 즉시 표시해 주지 않으면 같은 보기를 또 누른다. */
      const deferVerdict = scripted && phase !== 'review'
      if (!deferVerdict) {
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
        logResponse(label, ok)
      }
      /* 대본 수업은 에이전트가 없다 — reportAction 은 에이전트로 가는 통로라 아무 데도 닿지 않는다.
         정오답 반응을 여기서 직접 말하고 진행까지 한다.
         ⚠️ 대화에 남기는 것도 handleScriptedPick 이 한다 — 여기서 남기면 고쳐 고를 때마다
            말풍선이 쌓여서 "A. …" "C. …" "B. …" 가 줄줄이 남는다. 보낸 것은 마지막 하나다. */
      if (scripted) {
        void handleScriptedPick(qIdx, ok, opt?.why, label)
        return
      }
      // 키에 보기까지 넣어야 **두 번째 시도도 강사에게 전달**된다 (턴 단위 키는 한 번만 보낸다)
      reportAction(`${turnIdx}:pick:${label}`,
        actionMessage(`${label}번 보기를 골랐습니다`, ok, ok ? undefined : opt?.why))
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
    /* ── 음원 버튼이 풀리는 시점 ──
       수업 중에는 잠겨 있다(강사가 튼다). **그 문제의 단계가 끝나면 그 자리에서 풀린다** —
       [다음 문제] 가 열리는 시점과 같다. 대화도 그때 닫히므로, 학생이 혼자 다시 들어보는
       동안 강사가 끼어들지 않는다. 문제를 넘기면 다음 문제 단계가 시작되며 다시 잠긴다.
       freePlay(수업 전체 종료)는 마지막 문제 뒤의 같은 상태다. */
    audioFree: freePlay || itemDone,
    /* 대본 수업은 강사가 지목한 보기의 스크립트를 그때그때 연다 (reveal.optionText) */
    autoScript: !!scripted,
    onPlayAudio: playLessonAudio,
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
    /* 수업에서는 정오답을 색으로 내지 않는다 — 고른 보기가 파랗게만 남고, 맞고 틀림은 강사가
       말로만 짚는다. 코칭(실전 오답 리뷰)은 이미 채점 결과를 본 자리라 색을 그대로 낸다 —
       "내가 고른 보기·정답 보기가 색으로 남아야 강사 말과 화면이 맞는다"(아래 review 진입부). */
    hideVerdict: phase !== 'review',
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
  /* 강사가 말하는 중인가 — 아바타 파동·포즈가 이 값을 본다.
     에이전트가 붙어 있으면 그쪽 발화가 기준이고, 아니면 화면이 트는 음원(강사가 들려주는 자료)이 기준이다.
     **학생이 직접 튼 음원은 뺀다** — 그건 강사의 소리가 아니다(파형은 그 버튼 안에서 뛴다). */
  /* ── 말하는 것과 틀어주는 것을 가른다 ──
     예전에는 둘을 한 값으로 묶어서, **보기 음원이 나가는 동안에도 강사가 말하는 그림**(입이 움직이는
     클립)이 돌고 아바타 둘레에 파형이 떴다. 소리의 주인이 강사가 아닌데 강사가 말하는 것처럼 보인다.
       tutorSpeaking : 강사가 **자기 목소리로** 말하는 중 — 말하는 클립 + 파형
       cuePlaying    : 강사가 **틀어준 자료 음원**이 나가는 중 — 끄덕임, 파형 없음
     학생이 직접 튼 음원(selfPlaying)은 둘 다 아니다 — 그건 강사와 아무 상관이 없다. */
  const tutorSpeaking = agentConnected ? conversation.isSpeaking : narrating
  const cuePlaying = playingId !== null && !selfPlaying
  /** 강사가 **지금 실제로 소리를 내고 있는가.** 그림(포즈·클립·파동)은 전부 이걸 본다.
   *  `tutorSpeaking` 은 "강사 차례" 라서 음원을 받는 몇 초 동안에도 켜져 있다 — 그걸 그대로
   *  그림에 물리면 소리도 없이 손짓하며 말하는 클립이 돈다. 그동안은 듣는 자세(끄덕임)로 둔다. */
  const tutorVoicing = tutorSpeaking && !voiceLoading

  /* 대본 모드에서 마이크를 여는 때 — 학생 차례이고 강사가 말하지 않는 동안만.
     낭독 중에 열어 두면 강사 목소리를 학생 답으로 전사한다. */
  /** ── 마이크를 여는 **단계** ──
   *  ⚠️ 이 조건이 없어서 수업 마이크가 **실전·정리 화면에서도 계속 열려 있었다.**
   *     단계를 넘어가도 `turn` 은 수업에서 멈춘 자리에 그대로라, 그 턴이 주관식이면 조건이
   *     계속 참이다. 그러면 정리 화면에서 학생이 말한 문장을 **수업 쪽 인식기가 먼저 먹고**
   *     (거기서는 쓸 데가 없어 그냥 버려진다), 정리 화면 마이크는 같은 마이크를 두고 다툰다.
   *     "음성으로 답해도 하나도 입력이 안 된다" 가 이것이었다(실측 08-20).
   *  말로 답하는 자리는 수업(스캐폴딩)과 오답 코칭뿐이다. 실전은 보기를 누르고, 정리는
   *  자기 마이크 버튼을 쓴다. */
  const voicePhase = phase === 'lesson' || phase === 'review'
  const voiceOn = !!scripted && voicePhase && chatMode === 'voice' && !tutorSpeaking && !cuePlaying
    && (asking || (turn.interaction.kind === 'subjective' && !subjSent))
  const getScriptedMicFreq = useScriptedVoice(!!scripted && voicePhase && chatMode === 'voice', voiceOn, (text) => {
    if (asking) void askTutor(text)
    else answerSubjective(text)
  })

  /* ── 문제 하나 = 대화 한 판 ──
     그 문제의 스캐폴딩이 끝나면 대화를 닫는다. 열어둔 채 두면 마이크가 계속 열려 있어서
     학생이 다음 문제로 넘어가기 전에 한 말이나 주변 소리에 강사가 반응해 말을 얹는다.
     [다음 문제] 를 누르면 그 자리에서 다시 연다(위 onClick 의 startAgent).

     **바로 끊지 않는다.** 마지막 턴은 강사가 그 문제를 마무리하는 말을 하는 자리라,
     도착하자마자 닫으면 그 말이 중간에 잘린다. 말이 멎고 1.5초 조용하면 그때 닫는다. */
  useEffect(() => {
    if (!itemDone || phase !== 'lesson' || !agentConnected) return
    if (tutorSpeaking || cuePlaying) return
    const t = setTimeout(() => endAgent(), 1500)
    return () => clearTimeout(t)
  }, [itemDone, phase, agentConnected, tutorSpeaking, cuePlaying, endAgent])

  /* 강사 창 대화 영역 — 지난 대화를 쌓지 않고 **이번 턴의 주고받은 말만** 보여준다.
     에이전트가 붙어 있으면 실제 마지막 발화/학생 발화, 아니면 레일 발화 + 이번 턴에 학생이 한 응답. */
  const lastAgentAi = [...chatLog].reverse().find((m) => m.role === 'ai')?.text
  /* 음성 모드의 '지금 하는 말' — 읽는 중이면 **거기까지만** 보여준다(말과 글자를 맞춘다).
     읽는 문장은 대본 발화만이 아니다(피드백·질문 답변도 이 자리를 쓴다) → typed 를 먼저 본다. */
  const tutorLine = typed ? typed.text.slice(0, typed.shown)
    : (agentConnected && lastAgentAi) || turn.tutor

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
  /* 텍스트 모드 말풍선도 같은 규칙 — **마지막 강사 말풍선만** 읽는 만큼 자라고, 지나간 말은
     온전한 문장으로 남는다(기록은 온전해야 다시 읽을 수 있다). */
  const revealLast = (log: ChatMsg[]): ChatMsg[] => {
    if (!typed) return log
    const i = log.length - 1
    if (i < 0 || log[i].role !== 'ai' || log[i].text !== typed.text) return log
    return [...log.slice(0, i), { ...log[i], text: typed.text.slice(0, typed.shown) }]
  }
  const chatMessages: ChatMsg[] = (agentConnected || scripted) && chatLog.length
    ? revealLast(chatLog)
    : [
      { role: 'ai' as const, text: turn.tutor },
      ...(studentLine ? [{ role: 'user' as const, text: studentLine }] : []),
    ]

  /* ── 개발용 단계 점프 ── (DEV_PHASE_JUMP)
     4단계는 원래 순서대로만 흘러간다. 화면을 확인하려고 매번 수업을 처음부터 도는 건 낭비라
     상단 단계를 눌러 바로 건너뛰게 열어둔다. 학생 빌드에서는 플래그를 끈다. */
  const jumpPhase = DEV_PHASE_JUMP ? (i: number) => {
    stopVoice()
    if (i === 0) { setPhase('lesson'); setStarted(false); setAfterLesson(false); return }
    if (i === 1) { setPhase('lesson'); setStarted(true); setAfterLesson(false); return }
    if (i === 2) { setPhase('practice'); return }
    setPhase('wrap')
  } : undefined

  /* ── 도입 (LessonIntro — 4단계 프레임의 첫 단계) ── */
  if (!started) {
    return (
      <LessonIntro
        tag={lectureTitle ?? `Part ${lesson.part} · ${lesson.typeLabel}`}
        /* 대본이 있으면 강사가 실제로 할 말을 그대로 — 없을 때만 강의 설명으로 때운다 */
        script={scriptedIntro?.script ?? `${lesson.desc} ${teacherName} 강사와 스캐폴딩 단계에 따라 하나씩 짚어볼게요.`}
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
        /* 버튼 문구는 넘기지 않는다 — PracticeStage 가 점수를 보고 고른다
           ('틀린 문제 같이 보기 →' / 다 맞혔으면 '핵심 요약으로 →'). 대본이 있다고 해서
           '강사와 문제 같이 보기' 로 덮으면, 다 맞혀 정리로 가는 학생에게도 그 문구가 뜬다. */
        onExit={() => { stopVoice(); router.push('/lessons') }}
        onDone={(score) => {
          setPracticeScore(score)
          /* 채점 결과를 문항별로 남긴다 — 하루 끝의 복습이 이 기록에서 틀린 문항을 고른다 */
          log.practiceGraded(practiceContent.questions, score.results, score.answers)
          /* ── 대본이 있는 실전 ──
             **틀린 문항이 있을 때만** 코칭으로 넘어간다. 다 맞혔으면 짚을 것이 없어 정리로 간다
             (아래 갈래가 그대로 받는다). 짚을 턴은 reviewTurns 가 틀린 문항만 남겨 준다.
             채점 상태(graded)는 전부 켠다 — 이미 풀고 결과까지 본 문항이라 감출 것이 없고,
             내가 고른 보기·정답 보기가 색으로 남아야 강사 말과 화면이 맞는다.
             보기 **글자**는 미리 열지 않는다 — 강사가 "A를 볼게요" 하는 순간 그 보기만 열린다
             (턴의 reveal.optionText + st.autoScript). 네 개를 처음부터 펼치면 짚는 자리가 안 보인다. */
          if (scriptedReview?.length && score.correct < score.total) {
            setTurnIdx(0)
            const all = practiceContent.questions.map((_, i) => i)
            setAnswers({ ...score.answers })
            setGraded(new Set(all)); setAnsweredQ(new Set()); setWrongPicks(new Set())
            audioDoneRef.current = new Set(); respondedRef.current = new Set()
            triesRef.current = new Map()
            setPhase('review')
            return
          }
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
        scriptedSummary={scriptedSummary}
        onJumpPhase={jumpPhase}
        practiceScore={practiceScore}
        teacherName={teacherName}
        teacherImg={teacherImg}
        instructor={instructor}
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
        {/* id="zoom-host" — 사진 크게 보기가 **이 칸 안에서만** 커진다(강사 창은 덮지 않는다).
            PhotoZoom 이 이 id 를 찾아 여기에 띄운다. 실전 화면에는 이 칸이 없어 화면 전체가 된다. */}
        <div
          id="zoom-host"
          className={`relative min-h-0 flex flex-col border-gray-100 ${
            /* 오른쪽 테두리는 두지 않는다 — 경계선은 리사이즈 핸들이 그리는 1px 하나뿐이다.
               둘 다 그리면 10px 간격을 두고 선이 두 줄 생긴다 */
            dockMode === 'sidebar' ? 'h-full shrink-0' : 'flex-1 h-full w-full'
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

          {/* ── 앞으로 가는 줄 ──
              **문제 영역 아래 이 한 줄이 전진을 통째로 맡는다.** 다음 문제든, 수업을 닫는 것이든,
              실전으로 넘어가는 것이든 버튼은 늘 여기 있다 — 마지막 문제에서만 강사 창으로 옮겨가면
              학생은 그때 버튼을 다시 찾아야 한다.
              강사 창의 단계 버튼과는 섞지 않는다. 저건 이 단계 안에서 할 일이고 이건 나가는 것이라
              층이 다르다. 잠겨 있을 때도 자리는 보인다 — 몇 문제짜리 수업인지가 이 줄에서 읽힌다. */}
          {stripNav && (() => {
            const order = Array.from(itemSpan.keys()).sort((a, b) => a - b)
            const nth = order.indexOf(navKey!) + 1
            /* 갈래는 넷이다. 문제가 더 있으면 다음 문제, 마지막 문제를 마쳤으면 수업을 닫고,
               닫은 뒤(혼자 듣는 구간)에는 실전으로 간다. **리뷰의 마지막은 핵심 요약으로.** */
            const nav = nextItemAt !== null
              ? { label: '다음 문제 →', can: itemDone, hint: '이 문제의 단계를 마치면 열려요',
                  /* 다음 문제로 넘어가면 대화도 다시 연다 — 문제 하나가 곧 대화 한 판이다.
                     **대본 수업은 열지 않는다.** 열면 에이전트가 자기 인사말부터 시작해서
                     앱이 읽는 대본과 목소리가 두 개로 겹친다(실측: 2번 문제로 넘어가는 순간). */
                  go: () => { stopVoice(); setTurnIdx(nextItemAt); if (!scripted) startAgent() } }
              : phase === 'review'
                ? { label: '핵심 요약으로 →', can: itemDone, hint: '이 문제를 마치면 열려요',
                    go: () => { stopVoice(); setPhase('wrap') } }
                : !freePlay
                  ? { label: '유형 학습 마치기 →', can: itemDone, hint: '마지막 문제의 단계를 마치면 열려요',
                      go: () => { stopVoice(); setAfterLesson(true) } }
                  : { label: '실전 문제 풀기 →', can: true, hint: '',
                      go: () => setPhase('practice') }
            return (
              <div className="shrink-0 border-t border-[#EBEBF0] px-3 md:px-6 py-2.5 flex items-center gap-3">
                <span className="text-[11px] font-bold text-[#9CA3AF] shrink-0">
                  {freePlay ? '수업 완료' : `문제 ${nth} / ${order.length}`}
                </span>
                <button onClick={nav.go} disabled={!nav.can}
                  title={nav.can ? undefined : nav.hint}
                  className={`ml-auto shrink-0 text-[13px] font-bold rounded-xl px-4 py-2 transition-colors ${
                    nav.can ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:scale-[0.99]'
                      : 'bg-[#F1F3F7] text-[#C4C9D4] cursor-not-allowed'
                  }`}>
                  {nav.label}
                </button>
              </div>
            )
          })()}
        </div>

        {/* ── 세로 리사이즈 핸들 ──
            **잡는 자리는 넓고, 보이는 것은 선 하나다.** 회색 띠로 칠하면 화면이 두 쪽으로
            갈라져 보여서, 수업(왼쪽)과 강사(오른쪽)가 한 화면이라는 느낌이 깨진다.
            그래서 폭 10px 은 손가락 몫으로 두되 배경은 비우고, 가운데 1px 선만 그린다.
            만질 수 있다는 신호는 커서(col-resize)와 hover 색으로 준다. */}
        {dockMode === 'sidebar' && (
          <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
            role="separator" aria-orientation="vertical" aria-label="수업 화면과 강사 창의 너비 조절"
            title="드래그해서 너비를 조절할 수 있어요"
            className="group relative flex w-2.5 shrink-0 items-stretch justify-center cursor-col-resize touch-none">
            <div className="w-px bg-[#EBEBF0] transition-colors group-hover:bg-[#93C5FD]" />
            {/* 손잡이 — 선만 있으면 **만질 수 있는 줄 모른다**(실측). 짧은 알약 하나로 그것만 말한다.
                띠를 칠하지 않으니 화면이 두 쪽으로 갈라져 보이지도 않는다. */}
            <span aria-hidden
              className="absolute top-1/2 -translate-y-1/2 h-9 w-[5px] rounded-full bg-[#D8DCE5] transition-colors group-hover:bg-[#60A5FA]" />
          </div>
        )}

        {/* 우: 강사 창 — 우측 패널 ⇄ 최소화(작은 창).
            작은 창은 fixed라 여기 자리를 차지하지 않는다. 내용은 슬롯으로 넘기고 배치는 도크가 정한다. */}
        <TutorDock
          mode={dockMode} setMode={setDock}
          /* 좁은 화면에서는 접힌 채로 둔다 — 펴 봐야 지문도 강사도 못 읽는 폭이다 */
          canSidebar={!narrow}
          name={teacherName} imgSrc={teacherImg}
          poseSrc={instPose(instructor, poseForTurn(turn, tutorVoicing, cuePlaying))}
          /* 영상 클립이 있는 강사면 사진 대신 이게 원 안에서 돈다. 상황을 고르는 판단(poseForTurn)은
             사진과 똑같이 쓴다 — 판단이 한 군데 있어야 둘이 어긋나지 않는다. */
          clipSrc={instClip(instructor, poseForTurn(turn, tutorVoicing, cuePlaying))}
          allClips={instClips(instructor)}
          chatMode={chatMode} setChatMode={setChat}
          getTutorFreq={() => { try { return conversation.getOutputByteFrequencyData?.() } catch { return undefined } }}
          /* 대본 모드는 브라우저 마이크에서 파형을 받는다 — 에이전트가 없어도 아래쪽이 똑같이 보인다 */
          getMicFreq={scripted ? getScriptedMicFreq
            : () => { try { return conversation.getInputByteFrequencyData?.() } catch { return undefined } }}
          /* 대본 모드에는 연결할 세션이 없다. connected=false 로 두면 강사 창이
             '연결이 끊겼어요 — 눌러서 다시 연결' 버튼을 띄워 **학생이 입력을 못 한다**(실측). */
          connected={scripted ? true : agentConnected} connecting={scripted ? false : agentConnecting}
          /* 대본 모드는 **학생 차례에만** 마이크가 열린다 — 아래 입력칸도 그때만 살아 있어야
             "지금 말해도 되는가"가 화면에서 읽힌다(강사가 말하는 동안 파형이 뛰면 거짓말이다) */
          micActive={scripted ? voiceOn : undefined}
          isSpeaking={tutorVoicing}
          /* 소리는 아직인데 곧 말한다 — 최소화 창이 이 몇 초 동안 사라지지 않게 하는 신호 */
          preparing={voiceLoading}
          /* 음성 모드 발화 박스 · 최소화 말풍선에 실시간으로 뜨는 "지금 하는 말" */
          lastLine={tutorLine}
          /* ── '질문 있어요' 버튼은 없앴다 ──
             그냥 물어보면 알아서 답하고 대본으로 돌아오므로, 먼저 모드를 켜라고 시킬 이유가
             없어졌다. 남은 것은 **답하는 동안의 한 줄**뿐이다 — 아무 표시도 없으면 학생이
             "보낸 게 맞나" 를 알 수 없다. */
          footer={scripted && autoAsk && (
            <div className="w-full rounded-xl border border-[#FDE68A] bg-[#FFFBEB] py-2 text-center text-[12px] font-bold text-[#B45309]">
              강사가 답하는 중…
            </div>
          )}
          /* 텍스트 모드 채팅 — 에이전트가 붙어 있으면 실제 대화, 아니면 레일 발화 + 이번 턴 응답 */
          messages={chatMessages}
          bodyRef={feedRef}
          inputText={inputText} setInputText={setInputText}
          onSend={() => {
            const t = inputText.trim()
            if (!t) return
            if (scripted) {
              /* 앞 질문에 아직 답하는 중이면 **입력칸을 비우지 않는다.** 비우면 askTutor 가
                 askBusy 로 되돌아가면서 학생 문장만 조용히 사라진다("전송이 안 된다"). */
              if (askBusy) return
              if (asking) { setInputText(''); void askTutor(t); return }
              if (answerSubjective(t)) { setInputText(''); return }
              /* 음원이 있는 턴에서 "다시 들려주세요" 는 답이 아니라 **부탁**이다 — 받아준다 */
              if (turn.audio && isReplayAsk(t)) { setInputText(''); void replayOnAsk(t); return }
              /* ── 선택지 턴에서 친 글자는 **답이 먼저다** ──
                 "사람과 사물 중에서?" 에 학생이 '인물' 이라고 치면 그건 답이지 질문이 아니다.
                 이걸 질문으로 넘기면 강사가 대화만 이어가고 대본으로 못 돌아온다(실측). */
              {
                const it = turn.interaction
                if (it.kind === 'choice' && choicePicked === null) {
                  const at = matchTypedChoice(t, it.choices)
                  if (at >= 0) { setInputText(''); setChoicePicked(at); pickChoice(it.choices[at]); return }
                  /* 선택지 턴의 "모르겠어요" 도 질문이 아니다 — 아래로 흘려보내면 강사가 대화로
                     받아 대본이 멈춘다. 주관식과 똑같이 짚어주고 넘어간다. */
                  if (isGiveUp(t)) {
                    setInputText('')
                    setChatLog((prev) => [...prev, { role: 'user', text: t }])
                    logResponse(t, false)
                    void handleScriptedAnswer(false, undefined, 'giveUp')
                    return
                  }
                  /* 말이 아닌 입력도 질문이 아니다 — 주관식과 같게 한 번만 되묻고 넘어간다 */
                  if (isGibberish(t)) {
                    setInputText('')
                    setChatLog((prev) => [...prev, { role: 'user', text: t }])
                    if ((triesRef.current.get(turnIdx) ?? 0) >= 1) {
                      logResponse(t, false)
                      void handleScriptedAnswer(false, undefined, 'giveUp')
                      return
                    }
                    triesRef.current.set(turnIdx, 1)
                    logResponse(t, null)
                    void (async () => { await waitForCue(); await say('음, 잘 못 알아들었어요. 보기 중에서 골라 볼래요?') })()
                    return
                  }
                }
              }
              /* ── 답을 받는 자리가 아니면, 그건 질문이다 ──
                 예전에는 "지금은 말로 답하는 차례가 아니에요" 로 잘라냈다. 답이 아닌 게 확실한
                 자리라서(듣기 턴, 이미 답한 주관식, 선택지에 없는 말) **되물을 것도 없이 질문이다.**
                 '질문 있어요' 를 먼저 누르게 하는 것은 학생에게 앱의 사정을 시키는 일이다. */
              setInputText('')
              void askAside(t)
              return
            }
            if (!agentConnected) { setInputText(''); return }
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
              markDone={markDone} markChecking={markChecking} markVerdict={markVerdict}
              cuePlaying={cuePlaying} />
          }
          /* ── ② 선택지 / 다음 단계 버튼 ── */
          /* 단계가 바뀌면 텍스트 모드 채팅에서 카드가 새 말풍선처럼 다시 꽂힌다 */
          actionKey={`${turnIdx}:${dockTick}`}
          actions={
            <>
              <InteractionDock
                key={turnIdx}
                turn={turn} lesson={lesson}
                goNext={goNext}
                spoken={spokenTurn === turnIdx}
                answers={answers} graded={graded} submitAll={submitAll}
                choicePicked={choicePicked} setChoicePicked={setChoicePicked}
                onChoicePick={pickChoice}
                subjText={subjText} setSubjText={setSubjText} subjSent={subjSent} setSubjSent={setSubjSent}
                scripted={scripted}
                /* 판정은 answerSubjective 한 곳에만 둔다 — 두 군데서 따로 판정하면
                   같은 답이 통로에 따라 다르게 처리된다(여기는 낱말 겹침만 보고 있었다) */
                onSubjectiveSubmit={(text) => { answerSubjective(text) }}
                markDone={markDone}
                onMarkDone={() => {
                  const it = turn.interaction
                  if (it.kind === 'mark' && it.targetWords) setTutorMarks((p) => { const n = new Set(p); targetTokens(it.targetWords).forEach((w) => n.add(w)); return n })
                  setMarkDone(true)
                }}
                matchTapped={matchTapped}
                setPlayingId={setPlayingId}
              />
              {/* 스캐폴딩 마지막 턴 — 수업을 닫는다. 실전으로 바로 가지 않고 들어보는 구간을 지난다 */}
              {turnIdx === turns.length - 1 && !freePlay && !stripNav && (
                <button onClick={goNext} className={PRIMARY_BTN + ' w-full'}>{phase === 'review' ? '핵심 요약으로 →' : '유형 학습 마치기 →'}</button>
              )}
              {/* ── 혼자 들어보는 구간 ──
                  강사와의 대화는 여기서 끝났다(위 useEffect 가 세션을 닫는다). 화면에 그 말을 적어준다 —
                  강사가 조용해진 이유를 모르면 학생은 고장 난 줄 안다. */}
              {freePlay && (
                <div className="space-y-2">
                  <div className="rounded-xl border border-[#BFDBFE] bg-[#F8FAFF] px-3 py-2.5">
                    <p className="text-[12px] font-bold text-[#2563EB]">유형 학습이 끝났어요</p>
                    <p className="text-[11px] text-[#6B7280] leading-relaxed mt-0.5">
                      실전 문제에 들어가기 전에 음원을 직접 눌러 다시 들어보세요. 여기서는 몇 번이든 들을 수 있어요.
                    </p>
                  </div>
                  {/* 실전으로 가는 버튼은 아래 '앞으로 가는 줄' 에 있다 — 여기 또 두면 같은 일을 하는
                      버튼이 화면에 둘이다. 아이템이 없는 옛 강의에서만 이 자리가 그 일을 한다. */}
                  {!stripNav && (
                    <button onClick={() => setPhase('practice')} className={PRIMARY_BTN + ' w-full'}>실전 문제 풀기 →</button>
                  )}
                </div>
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
      {/* 실전과 같은 높이(bottom-20)로 올린다 — 기본 위치(bottom-5)는 아래 '앞으로 가는 줄' 을 덮는다.
          두 화면에서 연필이 다른 자리에 있으면 실전에 들어갈 때마다 다시 찾아야 한다. */}
      <PenFab drawMode={draw.drawMode} toggleDraw={draw.toggleDraw} bottomClass="bottom-20"
        /* 표시(mark) 턴 = 필기로 짚어보라는 단계 — 다 짚기 전까지 버튼이 뛴다 */
        attention={turn.interaction.kind === 'mark' && !markDone}
        tool={draw.tool} setTool={draw.setTool} clearCanvas={draw.clearCanvas} setDrawMode={draw.setDrawMode} />
      <DrawingOverlay {...draw} bounds={contentRef} hidePalette />
    </div>
  )
}

/* 실전 페이저의 이전/다음 버튼 */
function PagerBtn({ onClick, disabled, cued, children }: {
  onClick: () => void; disabled?: boolean
  /** 지금 눌러야 할 버튼인가 — 이 문항을 다 풀었고 다음 문항이 남아 있을 때 */
  cued?: boolean
  children: ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
        disabled ? 'border-[#F1F2F5] text-[#C4C9D4] cursor-not-allowed'
          : cued ? 'border-[#2563EB] bg-[#2563EB] text-white animate-cue'
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
export function PracticeStage({ lesson, onExit, onDone, onJumpPhase, nextLabel, steps, solvingHint }: {
  lesson: TypeLesson; onExit: () => void
  onDone: (score: PracticeResult) => void
  /** 개발용 단계 점프 (DEV_PHASE_JUMP) */
  onJumpPhase?: (i: number) => void
  /** 단계 표시줄 이름. 수업 안에서 열리면 4단계 흐름의 '실전 문제' 칸이지만,
   *  복습 세션처럼 혼자 서는 화면은 ['복습'] 하나만 넘긴다 */
  steps?: string[]
  /** 푸는 동안 단계 이름 옆에 붙는 한 줄. 기본은 수업 뒤 실전 기준 문구다 */
  solvingHint?: string
  /** 채점 뒤 버튼 문구. 대본 코칭이 붙은 강의는 **다 맞혀도** 강사와 문항을 다시 보므로
   *  '틀린 문제 같이 보기' 가 거짓말이 된다 */
  nextLabel?: string
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [graded, setGraded] = useState(false)
  const [marks, setMarks] = useState<Set<string>>(new Set())
  const [playingId, setPlayingId] = useState<string | null>(null)
  /* 지금 보고 있는 문항 — 실전은 한 문항씩 넘겨 푼다(아래 visibleQ 주석) */
  const [page, setPage] = useState(0)
  /* P6 에서 학생이 고른 문항 탭 — 지문의 그 빈칸을 켜는 데 쓴다(아래 focusQ) */
  const [tabQ, setTabQ] = useState(0)
  /* 비동기 재생 루프 안에서 '지금 몇 번째 화면인가' 를 최신값으로 읽는다 —
     state 를 클로저로 잡으면 판이 시작될 때의 값에 머문다 */
  const pageRef = useRef(0)
  pageRef.current = page
  const draw = useDrawingTool()
  const contentRef = useRef<HTMLDivElement>(null)

  /* 문항을 넘기면 필기를 지운다 — 획은 판 하나짜리 캔버스에 쌓이므로, 안 지우면 앞 문항에 친
     동그라미가 다음 문항 위에 그대로 떠 있다(실측 보고 08-18). 음원이 자동으로 넘긴 경우도 같다. */
  const drawnPageRef = useRef(0)
  useEffect(() => {
    if (drawnPageRef.current !== page) { draw.clearCanvas(); drawnPageRef.current = page }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  /* ── 풀이 시간 ──
     실전은 시험처럼 푸는 단계라 "얼마나 걸렸는지"가 곧 실력의 일부다. 초 단위로 올라가다가
     채점하면 그 자리에서 멈춘다(멈춘 값이 곧 기록). 제한 시간은 두지 않는다 — 재촉이 목적이 아니다. */
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (graded) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [graded])
  /* 측정용 — 콜백 안에서 지금 경과 초를 읽는다(state 를 클로저로 잡으면 옛 값이 온다) */
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed
  /* 음원이 자동으로 넘긴 페이지 번호 — 학생이 그 자리에서 뒤로 돌아오는지 보려고 들고 있는다 */
  const autoAdvancedRef = useRef<number | null>(null)
  /* 채점한 시각 — 결과 화면을 얼마나 들여다보는지 잰다 */
  const gradedAtRef = useRef<number | null>(null)
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  /* 실전 세트가 있으면 그걸 푼다. 없으면(로컬 샘플 유형) 수업에서 다룬 문항을 그대로 다시 푼다. */
  const pLesson = lesson.practice ? { ...lesson, content: lesson.practice } : lesson
  const qs = pLesson.content.questions

  /* 지문이 있는 읽기 파트(P6·P7)는 지문(좌)|문항(우) 2분할로 — 실전은 강사 패널이 없어 폭이 통째로
     남는데, 세로로 쌓으면 보기를 볼 때마다 지문이 화면 밖으로 밀려나 실제 시험처럼 대조가 안 된다.
     이때만 페이지 스크롤을 끄고 높이를 통째로 넘긴다(각 칸이 따로 스크롤). */
  const splitReading = (pLesson.part === 6 || pLesson.part === 7) && (pLesson.content.passages?.length ?? 0) > 0
  const multi = qs.length > 1

  /* ── 적정 풀이 시간 (RC 전용) ──
     실제 시험 RC 는 75분에 100문항이고, 그 75분을 파트별로 나눠 쓰는 배분이 정석으로 통한다.
       Part 5 : 30문항 10분  → 문항당 20초
       Part 6 : 16문항  8분  → 문항당 30초 (지문을 읽어야 하므로 P5 보다 길다)
       Part 7 : 54문항 55분  → 문항당 60초 (지문 읽는 시간 포함)
     이 값 × 문항 수가 '보통 이 정도면 푼다' 는 선이다. 넘으면 주황(warn), 1.5배를 넘으면 빨강(over).
     LC 는 색을 바꾸지 않는다 — 속도를 정하는 건 음원이지 학생이 아니라서, 늦었다고 경고하면 거짓말이다. */
  const RC_SEC_PER_Q: Record<number, number> = { 5: 20, 6: 30, 7: 60 }
  const paceBudget = pLesson.area === 'RC' ? (RC_SEC_PER_Q[pLesson.part] ?? 30) * qs.length : null
  const pace: 'none' | 'ok' | 'warn' | 'over' = paceBudget === null ? 'none'
    : elapsed > paceBudget * 1.5 ? 'over' : elapsed > paceBudget ? 'warn' : 'ok'
  /* 색만 바뀌면 왜 바뀌었는지 모른다 — 기준 시간을 툴팁으로 같이 준다(재촉하는 배너는 두지 않는다) */
  const paceHint = paceBudget === null ? null
    : `적정 ${Math.floor(paceBudget / 60)}분 ${String(paceBudget % 60).padStart(2, '0')}초 (문항 ${qs.length}개)`

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

  /* ── 넘기는 단위 ──
     **한 자료에 문항 여럿**인 파트는 페이지가 문항이 아니라 **세트**다.
       P3·P4 : 자료가 음원(대화·담화)  P6·P7 : 자료가 지문(단일·이중·삼중)
     지문 하나에 딸린 4문항을 한 장씩 넘기게 하면, 지문을 훑으며 문항을 오가는 이 파트의
     푸는 법 자체가 화면에서 사라진다 → 세트 안은 다 펼치고 세트로 넘긴다. */
  const pagedBySet = setAudio || !!pLesson.content.sets

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
  /* 실전 음원은 시험처럼 **1회**다. 다 쓴 뒤에도 또 틀려고 했다면 그 규칙이 답답하다는 뜻 —
     `lc_returned_back` 과 같이 보면 "실전 듣기가 너무 빠른가"가 숫자로 나온다. */
  const blockedRef = useRef(0)
  const trackBlocked = (id: string) => {
    blockedRef.current += 1
    track('audio_replay_blocked', {
      lecture: pLesson.id, part: pLesson.part, target: countKey(id),
      nth: blockedRef.current, sec: elapsedRef.current,
    })
  }

  /* ── 듣기 진행 상태 ──
     runId  : 진행 중인 시퀀스 토큰. 끊으면 올려서 뒤따르던 await 들이 스스로 빠져나간다
     owner  : 지금 나가는 음원의 주인
     (학생이 손으로 넘겼는지는 더 이상 보지 않는다 — 화면은 언제나 음원을 따라간다) */
  const runId = useRef(0)
  const owner = useRef<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  /** 듣기 한 판의 상태 — idle(아직 안 틀었다) · running(흐르는 중) · done(끝났다).
   *  버튼 세 개(P1 문항별·P2 카드·P3·P4 세트 바)가 이 하나를 보고 같은 얼굴을 한다:
   *  **시작 전에만 누를 수 있고**, 그 뒤로는 '재생 중…' / '재생 완료' 로 잠긴다. */
  const [runState, setRunState] = useState<'idle' | 'running' | 'done'>('idle')
  /** 넘기는 단위의 개수 — P3·P4 는 세트, 나머지는 문항 */
  const unitCount = pagedBySet ? sets.length : qs.length
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

  /* ── 실전 듣기 ──
     **시험은 한 번 시작하면 끝까지 흐른다.** 문항마다 학생이 재생을 누르는 것이 아니라,
     [시작하기] 한 번에 마지막 문항까지 이어서 나간다. 그래서 이 함수는 '한 문항'이 아니라
     **한 판 전체**를 맡는다.
       Part 1·2 : 문항 음원 → 5초 → 다음 문항
       Part 3·4 : (안내 → 담화 → 문항 읽어주기 → 8초) 를 세트 끝까지, 그리고 다음 세트로
     학생이 문항을 손으로 넘겨도 **음원은 멈추지 않는다** — 실제 시험에서 시험지를 넘긴다고
     방송이 멈추지 않는 것과 같다. 다만 그 뒤로는 화면을 대신 넘겨주지 않는다(학생 손이 우선).

     단위(unit) = 넘기는 단위와 같다. P3·P4 는 세트, 나머지는 문항. */
  const playUnit = async (my: number, u: number): Promise<boolean> => {
    const script = pLesson.content.audioScript ?? []

    if (setAudio) {
      const set = sets[u]
      if (!set) return false
      const setScript = set.script ?? script
      /* 실제 시험은 담화 **앞**에 내레이터 안내가 먼저 나온다 —
         "Questions 1 through 3 refer to the following conversation." */
      if (set.intro) {
        if (!(await say(my, [{ id: `intro:${set.from}`, text: set.intro.text, src: set.intro.audio }]))) return false
      }
      // 담화·대화 전체
      if (!(await say(my, setScript.map((s) => ({
        id: s.id, text: s.en, src: sentenceSrc(pLesson, s.id) ?? srcOf(pLesson, s.id),
      }))))) return false
      /* 실제 시험처럼 문항을 하나씩 읽어주고 답할 시간을 준다.
         세 문항이 한 페이지에 다 있으므로 문항 사이에서는 페이지를 넘기지 않는다 — 짚는 문항만 옮긴다. */
      for (let i = set.from; i < set.to; i += 1) {
        setReadingQ(i)
        /* 문항 낭독도 내레이터 음원이 있으면 그걸 쓴다("Number 2. Why is the woman …").
           없으면 say() 가 브라우저 TTS 로 떨어진다. */
        if (!(await say(my, [{ id: `qread:${i}`, text: qs[i]?.q ?? '', src: qs[i]?.readAudio }]))) return false
        if (!(await countDown(my, gapSec))) return false
      }
      setReadingQ(null)
      return true
    }

    // 문항 통음원 mp3 가 있으면 그걸, 없으면 질문 발화 + 보기를 이어 붙여 재생
    const whole = `qaudio:${u}`
    const wholeSrc = optionSrc(pLesson, whole) ?? srcOf(pLesson, whole)
    const items: { id: string; text: string; src?: string }[] = []
    if (wholeSrc) {
      items.push({ id: whole, text: '', src: wholeSrc })
    } else {
      const s = script[u]   // P2 — 문항 i ↔ 질문 발화 i
      if (s) items.push({ id: s.id, text: s.en, src: sentenceSrc(pLesson, s.id) ?? srcOf(pLesson, s.id) })
      for (const o of qs[u]?.options ?? []) {
        const id = `opt:${u}:${o.label}`
        items.push({ id, text: `${o.label}. ${o.text}`, src: optionSrc(pLesson, id) })
      }
    }
    if (!(await say(my, items))) return false
    return await countDown(my, gapSec)
  }

  /** 한 판을 처음부터 끝까지. 시작은 [시작하기] 한 번뿐이고, 다시 부를 수 없다(시험이니까). */
  const runAll = async () => {
    if (owner.current !== null || runState !== 'idle') return
    const my = ++runId.current
    stopVoice()
    setRunState('running')
    track('lc_run_started', { lecture: pLesson.id, part: pLesson.part, units: unitCount })

    for (let u = 0; u < unitCount; u += 1) {
      owner.current = ownerOf(u)
      /* 재생 횟수는 **판이 지나가면서** 하나씩 쓴다 — 지나간 문항은 '재생 완료' 가 된다 */
      countPlay(setAudio ? `item:${sets[u]?.from ?? u}` : `item:${u}`)
      /* ── 음원이 화면을 끌고 간다 ──
         **학생이 어디를 보고 있든** 지금 나가는 문항으로 옮긴다. 앞뒤로 넘겨보다가 음원을 놓치면
         지금 몇 번을 읽어주는지 알 수 없다(실측: 손으로 한 번 넘긴 뒤로는 자동 이동이 멈췄다).
         실제 시험장에서도 방송은 학생 사정을 봐주지 않는다 — 학생이 따라오는 것이다. */
      if (pageRef.current !== u) {
        autoAdvancedRef.current = u
        track('lc_auto_advanced', { lecture: pLesson.id, part: pLesson.part, from_set: pageRef.current + 1, to_set: u + 1 })
        setPage(u)
      }
      if (!(await playUnit(my, u))) return    // 끊겼다(채점·이탈) — 상태는 끊은 쪽이 정리한다
    }
    owner.current = null
    setRunState('done')
  }

  /* 문항 이동 — 학생이 직접 옮긴 경우다. 음원은 건드리지 않는다(계속 흐르고, 다음 문항이
     시작되면 화면은 다시 음원을 따라간다). 여기서 남기는 것은 "따라가지 못했는가" 뿐이다. */
  const goPage = (p: number) => {
    setCountdown(null)
    /* 음원이 자동으로 넘긴 자리에서 **뒤로** 돌아왔다 = 못 따라갔다는 신호.
       실전 듣기가 너무 빠른지 판단하는 근거라 따로 남긴다. */
    if (!graded && p < page && autoAdvancedRef.current === page) {
      track('lc_returned_back', {
        lecture: pLesson.id, part: pLesson.part, from_set: page + 1, to_set: p + 1,
        sec: elapsedRef.current,
      })
    }
    /* ⚠️ 여기서 음원을 끊지 않는다. 실제 시험에서 시험지를 넘긴다고 방송이 멈추지 않는다 —
       예전에는 주인이 바뀌면 stopRun() 을 불러서, 학생이 앞 문항을 다시 보려고 넘기는 순간
       듣기가 통째로 끝나 버렸다. 넘김은 화면만 옮긴다(위 manual 로 자동 넘김만 멈춘다). */
    setPage(p)
  }

  /* 듣기 파트 실전은 음원이 있어야 문제가 성립한다 — 문항 통음원/보기 음원 재생.
     문항 통음원(`qaudio:i`)은 ContentView 의 재생 버튼이 부르는 경로 = 실전 듣기 한 판이다. */
  const playMedia = (id: string, text: string) => {
    /* 문항별 재생 버튼은 이제 **한 판을 여는 스위치**다 — 어느 문항에서 눌러도 처음부터 끝까지
       흐른다(시작 전에만 눌린다). 시작한 뒤에는 버튼이 잠겨 여기로 들어오지 않는다. */
    if (/^qaudio:(\d+)$/.test(id)) { void runAll(); return }
    if (playsLeft(id) <= 0) { trackBlocked(id); return }
    countPlay(id)
    stopVoice()
    void speakEnglishSeq([{ id, text, src: optionSrc(pLesson, id) ?? srcOf(pLesson, id) }], setPlayingId)
  }
  const total = qs.length
  const answered = qs.filter((_, i) => answers[i]).length
  const results = qs.map((q, i) => answers[i] === q.options.find((o) => o.correct)?.label)
  const correct = results.filter(Boolean).length
  /* 나가는 순간(언마운트) 결과 체류를 남길 때 쓴다 — 그 시점엔 이 값이 클로저에 안 잡힌다 */
  const correctRef = useRef(0)
  correctRef.current = correct

  /* ── 지금 눌러야 할 곳을 화면이 가리킨다 ──
     실전에는 강사가 없다. 수업에서는 "이제 골라 보세요" 를 강사가 말해주지만 여기서는 아무도
     말해주지 않아서, 학생이 보기를 고르고 나면 다음에 뭘 할지 모른 채 멈춘다(실측).
     **한 번에 한 곳만** 켠다 — 두 곳이 동시에 깜빡이면 가리키는 게 아니라 어지러운 것이다.
       듣기를 아직 시작 안 했다 → [시작하기] (버튼 쪽에서 audioRun='idle' 로 켠다)
       답을 고른 문항          → [다음 →]
     채점한 뒤에는 둘 다 끈다. 그때는 해설을 보는 자리라 재촉할 것이 없다. */
  const curSet = pagedBySet ? sets[Math.min(page, sets.length - 1)] : null
  const pageQs = curSet
    ? Array.from({ length: curSet.to - curSet.from }, (_, k) => curSet.from + k)
    : [page]
  const cueNext = !graded && pageQs.every((i) => !!answers[i])

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

  /* 실전에 들어온 순간 — 여기서부터 소요 시간을 잰다 */
  useEffect(() => {
    track('practice_started', {
      lecture: pLesson.id, part: pLesson.part, area: pLesson.area,
      questions: qs.length, sets: sets.length,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 결과 화면을 얼마나 보는지 — 나가는 순간(언마운트·탭 닫기)에 체류 시간을 남긴다.
     "채점 결과를 얼마나 들여다보는가" 는 해설을 실제로 읽는지 판단하는 근거다. */
  useEffect(() => {
    const send = () => {
      if (gradedAtRef.current === null) return
      track('practice_result_viewed', {
        lecture: pLesson.id, part: pLesson.part,
        dwell_sec: secSince(gradedAtRef.current),
        correct: correctRef.current, total: qs.length,
      })
      gradedAtRef.current = null
    }
    window.addEventListener('pagehide', send)
    return () => { window.removeEventListener('pagehide', send); send() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const st: ContentState = {
    revealedScript: hideUntilGraded ? new Set<string>() : 'all',
    revealedOptions: allOptions,
    /* 실전은 강사가 없다 — 음원을 학생이 직접 튼다(수업에서는 버튼 없이 강사가 틀어준다) */
    playingId, onPlaySentence: playMedia, selfAudio: true, playsLeft, audioRun: runState,
    marks, tutorMarks: new Set(),
    /* 실전에는 형광펜이 없다 — 시험지에 표시하고 싶으면 좌하단 연필(필기)을 쓴다 */
    tapWords: false,
    /* 채점 전 LC는 실제 시험지처럼 (A)(B)(C)(D) 마킹만 — 채점하면 보기·스크립트가 열린다 */
    answerSheet: hideUntilGraded && !!pLesson.content.optionAudio,
    onTapWord: (w) => setMarks((p) => { const n = new Set(p); if (n.has(w)) n.delete(w); else n.add(w); return n }),
    answerMode: graded ? 'none' : 'all',
    answers, graded: graded ? new Set(qs.map((_, i) => i)) : new Set(),
    onSelect: (q, l) => {
      if (graded) return
      /* 골랐던 답을 **바꾸는가** — 확신 없이 찍고 있는지의 대리 지표.
         처음 고르는 것과 바꾸는 것을 갈라야 의미가 있다(처음 고르기는 그냥 푸는 것이다). */
      const before = answers[q]
      if (before && before !== l) {
        track('answer_changed', {
          lecture: pLesson.id, part: pLesson.part, q: q + 1,
          sec: elapsedRef.current,
        })
      }
      setAnswers((p) => ({ ...p, [q]: l }))
    },
    showKo: false,
    /* 한 화면에 한 문항. 전 문항을 세로로 이어 붙이면 스크롤로 뭉개져서 지금 몇 번을 푸는지
       감이 안 오고, 지문 2분할에서는 오른쪽 칸이 끝없이 길어진다 — 아래 페이저로 넘긴다.
       ⚠️ **P3·P4 는 세트가 단위다.** 실제 시험지는 한 세트의 세 문항이 한 페이지에 다 인쇄돼 있고,
       학생은 담화를 들으며 세 문항을 눈으로 훑는다. 한 문항씩 넘기면 다음 문항을 미리 못 봐서
       실전 감각이 안 잡힌다 → 세트 안은 다 펼치고(음원이 읽는 문항만 focusQ 로 짚는다),
       **넘기는 단위는 세트**로 한다(page = 세트 번호). 9문항을 한 화면에 이어 붙이면 스크롤만 길다. */
    visibleQ: pagedBySet
      ? { from: sets[Math.min(page, sets.length - 1)].from, to: sets[Math.min(page, sets.length - 1)].to }
      : (multi ? { from: page, to: page + 1 } : undefined),
    /* 짚는 문항 — LC 는 지금 읽어주는 문항.
       P7 세트는 짚을 게 없다(문항마다 근거가 지문 여기저기라 학생이 스스로 찾는다).
       **P6 는 다르다** — 문항 하나가 지문의 빈칸 하나다. 학생이 문항 탭을 옮기면 지문의 그 빈칸이
       켜져야 어디를 채우는 건지 안다(그게 없으면 화면에 '빈칸 (2)' 라는 글자만 남는다). */
    focusQ: setAudio ? (readingQ ?? undefined)
      : pLesson.part === 6 ? tabQ
      : (pagedBySet ? undefined : (multi ? page : undefined)),
    onFocusQ: pLesson.part === 6 ? setTabQ : undefined,
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
      // 세트로 넘기는 파트는 그 문항이 든 세트로, 그 외에는 그 문항으로 간다
      const si = sets.findIndex((s) => missing >= s.from && missing < s.to)
      goPage(pagedBySet ? Math.max(0, si) : missing)
      return
    }
    stopRun()
    setRunState('done')   // 채점하면 듣기는 끝난 것이다 — 버튼이 다시 열리면 안 된다
    setSpotQ(null)
    setPage(0)          // 채점하면 처음부터 결과를 훑는다
    setGraded(true)
    gradedAtRef.current = Date.now()
    track('practice_submitted', {
      lecture: pLesson.id, part: pLesson.part, area: pLesson.area,
      elapsed_sec: elapsedRef.current,
      /* 적정 시간 대비 얼마나 걸렸나 — "맞혔지만 두 배 걸렸다" 를 점수와 같이 봐야 실력이 보인다 */
      pace_budget_sec: paceBudget ?? undefined,
      pace_ratio: paceBudget ? Math.round((elapsedRef.current / paceBudget) * 100) / 100 : undefined,
      correct, total, score_pct: total ? Math.round((correct / total) * 100) : 0,
    })
  }

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      <PhaseStepper
        steps={steps}
        active={steps ? steps.length - 1 : 2}
        subtitle={graded ? '채점 결과 확인' : (solvingHint ?? '배운 전략으로 직접 풀기')}
        onEnd={onExit}
        onJump={onJumpPhase}
        extra={
          <>
            {/* 풀이 시간 — 시험처럼 재되 재촉하지 않는다. 채점하면 멈추고 그 값이 기록으로 남는다.
                RC 는 적정 시간을 넘기면 주황, 한참 넘기면 빨강으로 색만 바뀐다(위 paceBudget).
                끊거나 넘기지는 않는다 — 실전 감각을 주는 것이 목적이지 탈락시키는 게 아니다. */}
            <span className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums transition-colors ${
              pace === 'over' ? 'bg-[#FEF2F2] text-[#DC2626]'
                : pace === 'warn' ? 'bg-[#FFF7ED] text-[#EA580C]'
                  : graded ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-[#EFF6FF] text-[#2563EB]'
            }`} title={[graded ? '걸린 시간' : '푸는 중', paceHint].filter(Boolean).join(' · ')}>
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
      {/* 문항 영역 — 시작 전에는 그 위에 [시작하기] 가 덮인다(아래 오버레이) */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div ref={contentRef} className={`flex-1 px-3 md:px-6 py-4 min-h-0 ${splitReading ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`mx-auto ${splitReading ? 'h-full max-w-[1440px]' : 'max-w-[900px]'}`}>
            <ContentView lesson={pLesson} st={st} readingSideBySide={splitReading} />
          </div>
        </div>

        {/* ── 시작 오버레이 ──
            **시험을 여는 버튼은 문항 옆 작은 칩일 수 없다.** 그걸 못 찾으면 학생은 화면 앞에서 멈춘다.
            화면 한가운데를 덮고 서서 "여기부터" 를 한 번에 말한다. 누르면 사라진다.
            덮는 것에는 두 번째 뜻이 있다 — **아직 듣지도 않은 보기를 미리 고를 수 없다.**
            배경은 옅게만 가린다: 사진은 미리 볼 수 있어야 한다(시험도 음원 전에 사진을 본다).
            **Part 1 에서만** 둔다. Part 2 는 질문 카드가, Part 3·4 는 세트 바가 이미 크게 서 있어
            여기 또 두면 같은 일을 하는 버튼이 화면에 둘이 된다. 작은 칩뿐인 건 Part 1 이다. */}
        {pLesson.part === 1 && !graded && runState === 'idle' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 px-6">
            <button onClick={() => void runAll()}
              className="rounded-3xl bg-[#2563EB] text-white px-9 py-6 flex flex-col items-center gap-2.5 shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-all hover:bg-[#1D4ED8] active:scale-[0.98] animate-cue">
              <span aria-hidden className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </span>
              <span className="text-[19px] font-black leading-none">시작하기</span>
              {/* 한 판에 사진이 여러 장이면 끝까지 이어서 나간다(수업 실전).
                  자율학습은 한 판이 사진 한 장이라 '마지막 문제까지' 라고 하면 거짓말이 된다. */}
              <span className="text-[12px] text-white/80 text-center leading-relaxed">
                {qs.length > 1 && <>한 번 시작하면 마지막 문제까지 이어서 나가요<br /></>}
                음원은 한 번만 재생돼요
              </span>
            </button>
          </div>
        )}
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
                const idle = runState === 'idle'
                return (
                  <button onClick={() => void runAll()} disabled={!idle}
                    className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold rounded-lg border px-2.5 py-1.5 transition-colors ${
                      !idle
                        ? runState === 'running' ? 'border-[#2563EB] bg-[#2563EB] text-white'
                          : 'border-[#EEF0F4] bg-[#FAFAFA] text-[#C4C9D4] cursor-not-allowed'
                        : 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] animate-cue'
                    }`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`w-3.5 h-3.5 shrink-0 ${playingId ? 'animate-pulse' : ''}`}>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                    {idle ? '시작하기' : runState === 'running' ? '재생 중…' : '재생 완료'}
                  </button>
                )
              })()
            )}
          </div>

          {/* 페이저 — P1·P2·P5 는 문항 단위, P3·P4·P6·P7 은 **세트 단위**로 넘긴다.
              세트가 하나뿐이면(지금 대부분의 RC 실전) 넘길 데가 없으니 페이저 자체를 안 그린다 */}
          {(pagedBySet ? sets.length > 1 : multi) && (() => {
            const pages = pagedBySet ? sets.length : total
            /* 칩 하나의 상태 — 세트 칩은 그 세트 문항 전체를 묶어 본다(다 맞으면 초록, 하나라도 틀리면 빨강) */
            const stateOf = (p: number) => {
              const from = pagedBySet ? sets[p].from : p
              const to = pagedBySet ? sets[p].to : p + 1
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
                      <button key={i} onClick={() => goPage(i)} aria-label={pagedBySet ? `${i + 1}번 세트` : `${i + 1}번 문항`}
                        className={`w-7 h-7 rounded-lg border text-[11px] font-black transition-colors hover:border-[#93C5FD] ${cls}`}>
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
                <PagerBtn onClick={() => goPage(Math.min(pages - 1, page + 1))} disabled={page === pages - 1}
                  cued={cueNext && page < pages - 1}>다음 →</PagerBtn>
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
                  {nextLabel ?? (correct === total ? '핵심 요약으로 →' : '틀린 문제 같이 보기 →')}
                </button>
              /* ── 아직 다 안 풀었으면 옅은 파랑 ──
                 잠그지는 않는다. 이 버튼은 다 안 푼 상태에서 누르면 **안 푼 문제로 데려가는** 일을
                 하고 있어서(submit 의 앞부분), 잠그면 그 길이 막힌다. 색으로만 "아직이다" 를 말한다. */
              : <button onClick={submit}
                  className={answered === total ? PRIMARY_BTN
                    : 'px-6 py-3 rounded-xl bg-[#DBEAFE] text-[#2563EB] text-[14px] font-bold hover:bg-[#BFDBFE] transition-all active:scale-[0.98]'}>
                  채점하기
                </button>}
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

/** 뜻 고르기 장인가 — 시트가 "line up = ( )" 꼴로만 채운 장(빈출 표현 정리).
 *  전략 정리와 **하는 일이 다르다**: 그쪽은 배운 것을 되짚는 자리라 정답만 입력하면 되지만,
 *  어휘는 아는지 모르는지 확인하는 자리라 **틀린 것이 곧 정보**다. 그래서 그대로 채점한다. */
const VOCAB_RE = /^(.+?)\s*=\s*___\s*$/
const isVocabGroup = (items: RecapSentence[]) => items.length >= 3 && items.every((s) => VOCAB_RE.test(s.en))

/** ── 말한 문장 안에서 답 하나를 찾는다 ──
 *  받아쓰기가 아니다. **한국어 STT 는 문장을 통째로 받으면 낱말을 흘린다** — 실측(08-20):
 *    말한 것: "사물·풍경 사진에서는 사물의 위치와 상태를 먼저 확인한다"
 *    들은 것: "서울 풍경 사진에서는 3월의 위치를 먼저 확인한다"   ← '와 상태' 가 통째로 날아갔다
 *  그래서 답을 통째로 대조하면 제대로 말한 학생이 계속 튕긴다.
 *
 *  ① 답이 그대로 들어 있으면 그것으로 끝(가장 확실하다).
 *  ② 아니면 답을 낱말로 쪼개 **조사를 떼고**('위치와'→'위치') 순서대로 찾아, **절반 이상**이
 *     들어 있으면 맞은 것으로 본다. 한 낱말짜리 답('능동태')은 절반이 곧 전부라 느슨해지지 않는다.
 *  어느 쪽이든 **찾은 자리**를 돌려준다 — 빈칸이 여럿일 때 순서를 따져야 하기 때문이다. */
const PARTICLE = /(와|과|를|을|이|가|은|는|의|로|으로)$/
function findAnswer(hay: string, from: number, answer: string): { at: number; len: number } | null {
  const whole = answer.toLowerCase().replace(/[\s+·・.,()~]/g, '')
  if (whole) {
    const at = hay.indexOf(whole, from)
    if (at >= 0) return { at, len: whole.length }
  }
  const parts = answer.split(/[\s·・/]+/).map((w) => w.replace(PARTICLE, '').toLowerCase().replace(/[+.,()~]/g, '')).filter((w) => w.length >= 1)
  if (parts.length < 2) return null
  const need = Math.ceil(parts.length / 2)
  let cur = from, got = 0, first = -1, last = -1
  for (const p of parts) {
    const at = hay.indexOf(p, cur)
    if (at < 0) continue
    got += 1
    if (first < 0) first = at
    last = at + p.length
    cur = last
  }
  return got >= need && first >= 0 ? { at: first, len: last - first } : null
}

/** 정리 화면에서 **글자로 답을 받는가.**
 *  08-20 결정으로 껐다 — 빈칸만 한 낱말씩 채우면 문장을 읽지 않고 칸만 메운다. 지금은 빈칸을
 *  채운 문장 전체를 소리 내어 읽게 한다. 되돌리려면 이 한 줄을 true 로. */
const RECAP_TEXT_INPUT = false

/** 이 문항의 빈칸들 — 하나뿐이면 `answer`/`keywords` 가 그 칸이다.
 *  화면·채점·강사 멘트가 전부 이 배열 하나만 보게 해서, 칸이 하나든 둘이든 길이 갈리지 않는다. */
const blanksOf = (s: RecapSentence) => s.blanks?.length ? s.blanks : [{ answer: s.answer, keywords: s.keywords }]

/* 빈칸 포함 문장 렌더 — 빈칸은 **여러 개일 수 있다.**
   "주어가 하는 주체이면 ( ), 받는 대상이면 ( )를 쓴다" 처럼 한 문장이 두 개념을 짝지어
   묻는 줄이 시트에 있다. 예전에는 '___' 하나만 앞뒤로 갈라서 그런 문항을 통째로 버렸다. */
function RecapBlankSentence({ text, filled, corrects, answers, activeBlank }: {
  text: string
  /** 칸마다 학생이 넣은 말 (아직이면 undefined) */
  filled?: (string | undefined)[]
  /** 칸마다 맞았는가 */
  corrects?: (boolean | undefined)[]
  /** 칸마다 정답 */
  answers: string[]
  /** 지금 답할 차례인 칸 — 한 칸씩 순서대로 받으므로 그 자리를 파랗게 띄운다 */
  activeBlank?: number
}) {
  /* ── 무엇을 빈칸에 넣을 것인가 ──
     전략 정리(correct 가 늘 true)는 **정답을 넣어야만** 입력되므로 빈칸에는 늘 정답이 들어간다.
     어휘 확인은 틀려도 그대로 채점하므로 **내가 고른 답**이 들어가고 빨갛게 칠해진다 —
     "line up = 흩어 놓다" 는 틀린 말이니 빨강이 맞고, 진짜 답은 아래 초록 버튼이 알려준다.
     (정답을 빈칸에 초록으로 넣으면 틀렸는데 맞은 것처럼 보인다 — 예전에 그래서 이상했다) */
  const parts = text.split('___')
  return (
    <p className="text-[14px] md:text-[15px] font-semibold text-[#1C1B33] leading-relaxed">
      {parts.map((part, i) => {
        if (i === parts.length - 1) return <span key={i}>{part}</span>
        const mine = filled?.[i]
        const ok = corrects?.[i]
        const shown = mine === undefined ? undefined : ok === false ? mine : answers[i]
        return (
          <span key={i}>
            {part}
            <span className={`inline-block min-w-[76px] text-center mx-1 px-2 py-0.5 rounded-md border-b-2 font-black align-baseline transition-colors ${
              shown === undefined
                ? activeBlank === i ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#94A3B8]'
                : ok === false ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
                  : 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]'
            }`}>{shown ?? '____'}</span>
          </span>
        )
      })}
    </p>
  )
}

/** 주관식 답 한 칸 — 문장 사이 빈칸을 직접 적는 자리.
 *  틀리면 **지우지 않는다.** 적은 말을 남겨 둬야 무엇을 고쳐야 할지 보인다(흔들림으로만 알린다). */
function RecapAnswerInput({ onSubmit, shaking, order }: {
  onSubmit: (said: string) => void; shaking?: boolean
  /** 빈칸이 여럿인 문항에서 **지금 몇 번째 칸을 받는가** (0-based). 하나뿐이면 넘기지 않는다.
   *  칸을 한꺼번에 늘어놓지 않고 순서대로 받는다 — 입력칸 두 개를 나란히 두면 어느 것이
   *  어느 빈칸인지 알 수 없다(문장 안 빈칸에는 번호가 없다). */
  order?: number
}) {
  const [text, setText] = useState('')
  const send = () => { const t = text.trim(); if (t) { onSubmit(t); setText('') } }
  const nth = order === undefined ? '' : `${['첫', '두', '세', '네', '다섯'][order] ?? String(order + 1)} 번째 `
  return (
    <div className={`flex items-center gap-2 ${shaking ? 'animate-shake' : ''}`}>
      {order !== undefined && (
        <span className="text-[11.5px] font-bold text-[#2563EB] bg-[#EFF6FF] rounded-md px-2 py-1 whitespace-nowrap">{nth}빈칸</span>
      )}
      <input value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
        placeholder={`${nth}빈칸에 들어갈 말을 적어 보세요`}
        aria-label={`${nth}빈칸에 들어갈 말`}
        className={`w-[220px] max-w-full text-[13px] font-semibold rounded-lg border px-3 py-1.5 outline-none transition-colors
                    placeholder:text-[#9CA3AF] placeholder:font-medium
                    ${shaking ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
                              : 'border-[#E5E7EB] bg-white text-[#1C1B33] focus:border-[#2563EB]'}`} />
      <button onClick={send} disabled={!text.trim()}
        className={`text-[12px] font-bold rounded-lg px-3 py-1.5 border transition-colors ${
          text.trim() ? 'border-[#2563EB] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                      : 'border-[#E5E7EB] bg-white text-[#CBD5E1]'}`}>확인</button>
    </div>
  )
}

/* ── 정리 카드 하나 ──
   **정답을 눌러야 입력된다.** 오답을 누르면 그 버튼만 빨갛게 흔들리고 아무것도 기록되지 않는다.
   그래서 빈칸에는 **정답만** 들어간다 — 틀린 답이 문장에 박히는 일도, 정답 글자를 초록으로
   칠할지 빨강으로 칠할지 고민할 일도 없어진다(색이 두 뜻을 지던 문제가 사라진다). */
function RecapCard({ index, sentence, filled, corrects, wrong, onPick, onSpeak, active }: {
  index: number; sentence: RecapSentence
  /** 칸마다 학생이 넣은 말 — 빈칸이 하나면 길이 1이다 */
  filled?: (string | undefined)[]
  /** 답한다 — `blank` 는 몇 번째 빈칸인가(하나뿐이면 0) */
  onPick: (choice: string, blank: number) => void
  onSpeak: (transcript: string, blank: number) => void
  /** 칸마다 맞았는가 — 전략 정리는 늘 true(정답만 입력된다), 어휘 확인은 틀리면 false */
  corrects?: (boolean | undefined)[]
  /** 방금 넣은 오답 — 잠깐 흔들리고 스스로 사라진다 */
  wrong?: string
  /** 강사가 **지금 이 칸을 짚고 있는가** — 말과 화면이 같은 곳을 가리켜야 따라갈 수 있다 */
  active?: boolean
}) {
  const blanks = blanksOf(sentence)
  const answers = blanks.map((b) => b.answer)
  /** 지금 받을 빈칸 — 앞에서부터 아직 안 찬 칸. 다 찼으면 -1 */
  const at = blanks.findIndex((_, i) => filled?.[i] === undefined)
  const done = at === -1
  /** 한 칸이라도 틀렸는가 — 칸 색·테두리를 정한다 */
  const anyWrong = corrects?.some((c) => c === false)
  return (
    /* 짚는 중인 칸은 파란 링으로 띄운다 — 어느 것을 말하는지 한눈에 보인다 */
    <div className={`rounded-2xl border bg-white p-4 transition-all ${
      active ? 'border-[#2563EB] ring-2 ring-[#BFDBFE] shadow-[0_2px_14px_rgba(37,99,235,0.14)] scale-[1.01]'
        : !done ? 'border-[#E5E7EB]'
          : anyWrong ? 'border-[#FCA5A5]' : 'border-[#86EFAC]'
    }`}>
      <div className="flex items-start gap-2.5 mb-2.5">
        {/* ── 번호는 ✓ 로 바뀌지 않는다 ──
            ① 정답을 눌러야만 입력되므로 ✓ 는 '맞았다' 가 아니라 '답했다' 밖에 못 말한다.
               그건 초록 빈칸과 잠긴 선택지가 이미 말하고 있어서 한 번 더 할 필요가 없다.
            ② 강사가 순서대로 짚어 줄 때 **번호가 가리키는 자리**다. 다 풀고 나면 번호가
               전부 ✓ 로 바뀌어, 정작 강사가 "두 번째 것" 을 말할 때 셀 것이 없어진다.
            대신 색만 초록으로 바꿔 채워진 칸을 알린다. */}
        <span className={`shrink-0 w-7 h-7 rounded-full text-[12px] font-black flex items-center justify-center transition-colors ${
          !done ? 'bg-[#EFF6FF] text-[#2563EB]'
            : anyWrong ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#15803D]'
        }`}>{index + 1}</span>
        <RecapBlankSentence text={sentence.en} filled={filled} corrects={corrects} answers={answers}
          activeBlank={blanks.length > 1 && at >= 0 ? at : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-9">
        {/* ── 보기가 없으면 **문장을 통째로 말한다** ──
            문장 사이 빈칸(전략 정리)은 주관식인데, 08-20 결정으로 **글자 입력을 받지 않는다.**
            빈칸만 한 낱말씩 채우면 문장을 읽지 않고 칸만 메우게 된다 — 배운 말을 문장 안에서
            꺼내 쓰는 것까지가 이 자리의 목적이라, 빈칸을 채운 **문장 전체**를 소리 내어 읽게 한다.
            한 번 말하면 칸을 순서대로 찾아 한꺼번에 채운다(fillFromSpeech).
            뜻 고르기(어휘)는 그대로 보기다 — 그쪽은 고르는 것이 문제 자체다.
            ⚠️ 글자 입력은 지운 것이 아니라 꺼 둔 것이다(RECAP_TEXT_INPUT) — 되돌리려면 여기 한 줄. */}
        {RECAP_TEXT_INPUT && sentence.choices.length === 0 && at >= 0 && (
          <RecapAnswerInput shaking={!!wrong} onSubmit={(said) => onPick(said, at)}
            order={blanks.length > 1 ? at : undefined} />
        )}
        {sentence.choices.map((c) => {
          const isAnswer = c === sentence.answer
          const shaking = wrong === c
          /* ⚠️ hover 에 **배경색을 주지 않는다.** 오답으로 빨개졌다가 풀리는 순간 마우스가
             그 버튼 위에 그대로 있어서, 빨강이 곧바로 hover 하늘색으로 바뀐다 —
             "빨강 → 하늘색" 으로 읽혀 무슨 뜻인지 알 수 없다(실측). 채워진 칸(초록)과도
             헷갈린다. hover 는 테두리로만 알린다. */
          return (
            <button key={c} disabled={done} onClick={() => onPick(c, 0)}
              className={`text-[12px] font-semibold border rounded-lg px-3 py-1.5 transition-colors ${shaking ? 'animate-shake' : ''} ${
                done
                  /* 다 고른 뒤 — 정답은 초록, 내가 고른 오답은 빨강 취소선, 나머지는 흐림 */
                  ? isAnswer ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]'
                    : filled?.[0] === c ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C] line-through'
                      : 'border-[#E5E7EB] text-[#CBD5E1]'
                  : shaking ? 'border-[#EF4444] bg-[#FEF2F2] text-[#B91C1C]'
                    : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#2563EB] hover:text-[#1D4ED8]'
              }`}>{c}</button>
          )
        })}
        {/* 받아쓸 말이 어느 나라 말인가 — 기본 정리는 영어 문장 빈칸이지만, 대본 강의의 핵심요약은
            "사람의 (___) 확인" 같은 **한국어 전략 퀴즈**다. en-US 로 받으면 한 마디도 못 알아듣는다.
            ⚠️ 문장을 통째로 말하는 자리는 **다 말한 뒤 한 번만** 받는다(finalOnly) — 중간 토막마다
               판정이 돌면 문장을 반쯤 읽은 자리에서 "다시 말해 보세요" 가 끼어든다. */}
        {at >= 0 && <MicButton lang={/[가-힣]/.test(sentence.en + sentence.answer) ? 'ko-KR' : 'en-US'}
          finalOnly={!sentence.choices.length}
          label={!sentence.choices.length ? '빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요' : undefined}
          onResult={(t) => onSpeak(t, at)} />}
      </div>

    </div>
  )
}

/* ── 세션 정리 단계 — 4단계 프레임의 마지막(실전 이후). 핵심 문장 3개 빈칸 채우기 + 강사 마무리 멘트 ── */
function WrapStage({ lesson, practiceScore, teacherName, teacherImg, instructor, onExit, onDone, onJumpPhase, scriptedSummary }: {
  lesson: TypeLesson; practiceScore: { correct: number; total: number } | null
  teacherName: string; teacherImg: string
  /** 강사 코드 — 목소리·영상 클립을 고른다. 정리 화면도 **그 강사**여야 한다 */
  instructor: string
  /** 대본 수업의 정리 퀴즈 (시트 '핵심요약'). 대본 강의는 영어 문장 빈칸이 아니라
   *  그 강의에서 세운 **판단 순서**를 되짚는 한국어 퀴즈다. 묶음이 여럿일 수 있다 */
  scriptedSummary?: RecapGroup[]
  onExit: () => void
  /** 개발용 단계 점프 (DEV_PHASE_JUMP) */
  onJumpPhase?: (i: number) => void
  /** 정리 정답률 — 완료 화면의 성취 배지에 쓴다 */
  onDone: (recap: { correct: number; total: number }) => void
}) {
  /** 문항 id → **칸별** 학생 답. 빈칸이 하나면 길이 1이다 */
  const [fills, setFills] = useState<Record<string, (string | undefined)[]>>({})

  /* 대본 강의는 정리 퀴즈도 시트가 정본이다 — 없으면 강의에 박아 둔 기본 문장 3개 */
  const scripted = !!scriptedSummary?.length
  const groups: RecapGroup[] = scripted ? scriptedSummary!
    : [{ title: '', intro: '', items: lesson.recap.sentences }]

  /* ── 묶음 하나가 화면 한 장이다 ──
     시트가 정리를 '핵심 요약 (1) 전략' · '(2) 빈출 표현' 으로 나눠 쓰고 묶음마다 제목과
     강사 도입을 달아 뒀다 — 그건 **두 화면**으로 그린 것이다. 한 장에 이어 붙이면
     이도윤 24강이 15칸짜리 한 판이 되어, 다 채워야 채점이 열린다. */
  const [page, setPage] = useState(0)
  const group = groups[Math.min(page, groups.length - 1)]
  const items = group.items
  const lastPage = page >= groups.length - 1

  const allDone = items.every((s) => blanksOf(s).every((_, i) => fills[s.id]?.[i] !== undefined))
  /** 이 장이 어휘 확인인가 — 그러면 **틀려도 그대로 채점한다**(전략 정리는 정답만 입력된다) */
  const vocabPage = isVocabGroup(items)
  /** 방금 누른 오답 (칸 id → 그 보기). 잠깐 흔들리고 스스로 사라진다 */
  const [wrong, setWrong] = useState<Record<string, string>>({})
  const shakeTimers = useRef<number[]>([])

  /** 이 답이 맞는가 — 클릭이면 정답과 같은지, 음성이면 정답 표현이 들어 있는지 */
  /** 이 답이 맞는가 — 보기를 누른 것이면 정답과 같은지, 직접 적거나 말한 것이면 넉넉히 본다.
   *  ⚠️ 넉넉한 비교는 **주관식(보기 없는 칸)에만** 쓴다. 어휘 확인에 걸면 뜻이 겹치는 보기끼리
   *     서로 정답으로 통과한다 — 거기는 고른 그대로 채점해야 무엇을 모르는지 보인다. */
  const loose = (x: string) => x.toLowerCase().replace(/[\s+·・.,()~]/g, '')
  const isRight = (s: RecapSentence, said: string, blank = 0) => {
    const b = blanksOf(s)[blank] ?? blanksOf(s)[0]
    if (said === b.answer) return true
    if (s.choices.length) return b.keywords.some((k) => said.toLowerCase().includes(k))
    /* 적은 말은 기호·띄어쓰기가 제각각이다("be + -ing" ↔ "be ing"). 조사만 붙여 쓴 답
       ("동작이요")과 핵심만 쓴 답("동작")도 받아 준다 — 여기는 배운 말을 꺼내는 자리지
       받아쓰기가 아니다. */
    const a = loose(said)
    if (a.length < 1) return false
    return b.keywords.some((k) => { const c = loose(k); return !!c && (a.includes(c) || (c.includes(a) && a.length >= 2)) })
  }

  /** 채운 답이 맞았는가 — 전략 정리는 정답만 입력되므로 늘 true, 어휘 확인은 갈린다 */
  const correctsOf = (s: RecapSentence): (boolean | undefined)[] =>
    blanksOf(s).map((_, i) => { const f = fills[s.id]?.[i]; return f === undefined ? undefined : isRight(s, f, i) })
  /** 문항 하나가 맞았는가 — **칸이 전부 맞아야** 맞은 것이다(아직 덜 찼으면 undefined) */
  const correctOf = (s: RecapSentence): boolean | undefined => {
    const cs = correctsOf(s)
    if (cs.some((c) => c === undefined)) return undefined
    return cs.every((c) => c === true)
  }
  /* 완료 화면에 넘기는 성적 — 전체 장을 합친다 */
  const allItems = groups.flatMap((g) => g.items)
  const correctCount = allItems.filter((s) => correctOf(s) === true).length

  /* ── 강사가 직접 짚어 준다 ──
     정리는 **학생이 답할 것이 없는 자리**라 화면을 강사에게 내줘도 잃을 게 없다 —
     얼굴을 위에 세우고, 말풍선은 '지금 하는 말' 한 자리다(TutorDock 음성 모드와 같은 규칙).
     ⚠️ 목소리는 반드시 speakTTS(강사) 다. 예전 speakKorean 은 브라우저 TTS 라, 수업 내내
     강사 목소리로 듣다가 **마지막 화면에서만 기계 음성**으로 바뀌었다(실측). */
  const ttsPersona = INST_PERSONA[instructor] ?? 'park'
  /* 시트에 도입 문구가 없을 때만 쓰는 기본 안내 — 보기가 있으면 '골라', 없으면 '적어' 다.
     화면에 없는 조작을 시키면 학생이 없는 버튼을 찾는다. */
  const FILL_HINT = items[0]?.choices.length
    ? '빈칸에 들어갈 말을 골라 보세요. 다 채우면 채점하고 하나씩 짚어 줄게요.'
    : '빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요. 다 채우면 채점하고 하나씩 짚어 줄게요.'
  /** 못 채웠을 때 강사가 하는 한 마디 (시트 진행 규칙). 고를 보기도 적을 칸도 없는 자리라
   *  '선택해보세요' 가 아니라 **무엇을 해야 하는지** 그대로 말한다. */
  const RETRY_LINE = '다시 한번, 빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요.'
  const [line, setLine] = useState(group.intro || FILL_HINT)
  const [speaking, setSpeaking] = useState(false)

  const say = async (text: string) => {
    if (!text) return
    stopCurrentAudio()                    // 앞 칸 피드백이 남아 있으면 끊는다
    /* 글자는 **소리가 나갈 때** 띄운다(onStart) — 먼저 띄우면 학생이 읽어 버린 뒤에 강사가
       같은 말을 시작한다. 비워 둔 동안에는 그 자리에 점 세 개가 돈다.
       finally 에서 다시 넣는 이유: 화면 전환 등으로 소리가 아예 안 나가도 글자는 남아야 한다. */
    setLine('')
    /* 아바타도 **소리가 나갈 때** 말하는 클립으로 바뀐다. 먼저 켜면 음원을 받는 몇 초 동안
       소리 없이 입만 움직인다 — 그동안은 끄덕임(listen)이 돈다. */
    try { await speakTTS(koLetters(text), ttsPersona, instructor, () => { setLine(text); setSpeaking(true) }) }
    finally { setLine(text); setSpeaking(false) }
  }

  /* ── 정리는 **다 채운 뒤 한 번에** 듣는다 ──
     칸을 채울 때마다 강사가 끼어들면 여러 번 끊긴다. 학생은 이 장을 자기 속도로 먼저 채우고,
     버튼을 눌러 정리를 듣는다. 말하는 동안 **그 칸이 켜져서** 어느 것을 짚는지 눈으로 따라간다. */
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [played, setPlayed] = useState(false)
  /** 건너뛰기·장 넘김·언마운트로 끊을 때 쓰는 표 — 지난 회차의 남은 await 가 화면을 되돌리지 못하게 한다 */
  const runRef = useRef(0)

  /** 그 칸의 피드백 — 시트 '정답 후 강사 피드백' 그대로. 첫머리 맞장구만 뗀다
   *  ("맞아요. 사람 중심 사진은 …" → "사람 중심 사진은 …"). 틀렸는데 "맞아요" 로 시작하면 거짓말이 된다. */
  const feedbackOf = (s: RecapSentence) => stripAck(s.ko ?? '')

  const runWrapUp = async () => {
    const token = ++runRef.current
    setPlaying(true)
    for (let i = 0; i < items.length; i++) {
      const text = feedbackOf(items[i])
      if (!text) continue
      if (runRef.current !== token) return
      setActiveIdx(i)
      await say(text)
    }
    if (runRef.current !== token) return
    setActiveIdx(null)
    /* 마지막 장의 마무리 한마디. **대본 강의에는 붙이지 않는다** — recap.closing 은 옛 샘플
       강의에 박아 둔 문장이라 시트 대본에 없는 내용을 정리라며 읊게 된다. */
    if (!scripted && lastPage && lesson.recap.closing) await say(lesson.recap.closing)
    if (runRef.current !== token) return
    setPlaying(false)
    setPlayed(true)
  }

  const skipWrapUp = () => {
    runRef.current += 1
    stopCurrentAudio()
    setActiveIdx(null); setSpeaking(false); setPlaying(false); setPlayed(true)
    setLine(lastPage ? '정리를 건너뛰었어요. 완료하기를 눌러 마치면 돼요.'
      : '정리를 건너뛰었어요. 다음 장으로 넘어갈게요.')
  }

  /** 장이 바뀌면 **맨 위부터** 보여준다 — 10문항짜리 장을 끝까지 내려간 자리에서 다음 장을
   *  열면 새 장의 중간이 나온다(제목도 첫 문항도 화면 밖이다) */
  const pageRef = useRef<HTMLDivElement>(null)

  /** 다음 장 — 이 장의 상태를 접고 새 장의 도입을 강사가 말한다 */
  const nextPage = () => {
    runRef.current += 1
    stopCurrentAudio()
    setPage((p) => p + 1)
    setPlayed(false); setPlaying(false); setActiveIdx(null); setSpeaking(false)
    pageRef.current?.scrollTo({ top: 0 })
  }

  /* 장이 열리면 그 장의 강사 도입을 말한다 — 시트가 묶음마다 'AI 강사 도입' 을 따로 써 뒀다.
     첫 장은 화면에 들어오자마자 말하면 실전 채점 소리와 겹칠 수 있어 글자로만 둔다. */
  const openedRef = useRef(0)
  useEffect(() => {
    if (openedRef.current === page) return
    const first = openedRef.current === 0 && page === 0
    openedRef.current = page
    if (first) { setLine(group.intro || FILL_HINT); return }
    void say(group.intro || FILL_HINT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  /* ── 마지막 칸을 채우면 **강사가 바로 짚기 시작한다** ──
     누를 것을 하나 더 두지 않는다. 장마다 한 번만 돈다(장 번호로 표를 남긴다). */
  const startedRef = useRef(-1)
  useEffect(() => {
    if (!allDone || startedRef.current === page) return
    startedRef.current = page
    void runWrapUp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, page])

  useEffect(() => () => {
    runRef.current += 1; stopVoice(); stopCurrentAudio()
    shakeTimers.current.forEach(clearTimeout)
  }, [])

  /** 오답을 눌렀다 — **기록하지 않고** 그 버튼만 잠깐 흔든다. 글자로 "틀렸어요" 라고 적지
   *  않는 이유: 정리는 확인하는 자리라, 되돌릴 수 있는 실수에 판정문을 붙일 필요가 없다. */
  const shake = (id: string, choice: string) => {
    setWrong((p) => ({ ...p, [id]: choice }))
    const t = window.setTimeout(() => setWrong((p) => { const n = { ...p }; delete n[id]; return n }), 420)
    shakeTimers.current.push(t)
  }

  /** 답 하나를 받는다.
   *  · 어휘 확인(vocabPage) — **틀려도 그대로 채점한다.** 아는지 모르는지 보는 자리라
   *    틀린 것이 곧 정보다. 고친 기회를 주면 전부 정답이 되어 아무것도 못 본다.
   *  · 전략 정리 — 정답을 눌러야 입력된다. 배운 것을 되짚는 자리라 틀린 문장이 화면에
   *    남으면 안 되고, 오답은 흔들림으로만 알린다.
   *  어느 쪽이든 마지막 칸이 채워지면 강사가 알아서 짚기 시작한다. */
  const answerOne = (s: RecapSentence, said: string, blank = 0) => {
    if (!said.trim()) return
    /** 칸 하나만 갈아 끼운다 — 나머지 칸에 이미 넣은 답은 그대로 둔다 */
    const put = (v: string) => setFills((p) => {
      const cur = p[s.id] ? [...p[s.id]] : blanksOf(s).map(() => undefined as string | undefined)
      cur[blank] = v
      return { ...p, [s.id]: cur }
    })
    if (vocabPage) { put(said); return }
    if (!isRight(s, said, blank)) {
      shake(s.id, said)
      /* 보기가 없는 칸은 흔들림만으로는 무슨 일이 일어났는지 모른다 — 시트가 정한 대로
         강사가 한 마디 한다("정답 틀리면 … AI 강사 문구"). 말하는 중이면 얹지 않는다. */
      if (!s.choices.length && !speaking) void say(RETRY_LINE)
      return
    }
    put(blanksOf(s)[blank]?.answer ?? s.answer)
  }
  const pick = (s: RecapSentence, choice: string, blank = 0) => answerOne(s, choice, blank)

  /** ── 말한 문장 하나에서 칸을 **순서대로** 찾는다 ──
   *  학생은 빈칸을 채운 문장 전체를 읽는다("주어가 동작을 직접 하는 주체이면 능동태, …").
   *  칸마다 따로 듣지 않고 그 한 번의 말에서 앞 칸부터 차례로 찾아 나간다.
   *
   *  ⚠️ **순서를 지켜야 한다.** 찾은 자리 뒤에서만 다음 칸을 찾는다 — 그냥 "들어 있는가" 로
   *     보면 능동태·수동태를 **바꿔 말해도** 둘 다 통과한다. 그 문항이 잡으려는 실수가 바로
   *     그것이라, 자리가 어긋나면 못 맞힌 것으로 본다. */
  const fillFromSpeech = (s: RecapSentence, said: string): (string | undefined)[] => {
    const hay = loose(said)
    const out: (string | undefined)[] = []
    let from = 0
    for (const b of blanksOf(s)) {
      let hit: { at: number; len: number } | null = null
      for (const k of (b.keywords.length ? b.keywords : [b.answer])) {
        const at = findAnswer(hay, from, k)
        if (at && (hit === null || at.at < hit.at)) hit = at
      }
      if (hit) { out.push(b.answer); from = hit.at + hit.len } else out.push(undefined)
    }
    return out
  }

  /** 음성 답. 보기가 있는 자리(어휘)는 예전처럼 한 칸을 받고,
   *  보기가 없는 자리(전략 정리)는 **문장 하나로 칸을 한꺼번에** 채운다. */
  const speakAnswer = (s: RecapSentence, transcript: string, blank = 0) => {
    if (!transcript.trim()) return
    if (s.choices.length) { answerOne(s, transcript, blank); return }
    const found = fillFromSpeech(s, transcript)
    /* 칸이 하나뿐이면 예전 판정도 한 번 더 본다 — 답의 일부만 말한 경우까지 받아 주던 자리다
       ("be + -ing" 를 "비 아이엔지" 로 말하는 식). 칸이 여럿이면 자리를 따져야 해서 쓰지 않는다. */
    if (found.length === 1 && found[0] === undefined && isRight(s, transcript, 0)) found[0] = blanksOf(s)[0].answer
    setFills((p) => {
      const cur = p[s.id] ? [...p[s.id]] : blanksOf(s).map(() => undefined as string | undefined)
      found.forEach((v, i) => { if (v !== undefined) cur[i] = v })
      return { ...p, [s.id]: cur }
    })
    /* 한 칸이라도 못 찾았으면 흔들고 강사가 한 마디 한다 — 찾은 칸은 그대로 남는다(다시 읽으면
       나머지가 채워진다). 무엇이 비었는지는 문장의 빈칸이 보여 준다. */
    const missed = found.some((v, i) => v === undefined && fills[s.id]?.[i] === undefined)
    /* 들린 말은 **화면에 띄우지 않는다**(08-20 결정) — 학생에게 보여줄 것이 아니다.
       다만 인식이 낱말을 흘리는 일이 잦아(실측: "사물의 위치와 상태를" → "3월의 위치를")
       못 채운 경우만 콘솔에 남긴다. 무엇 때문에 안 됐는지 확인할 자리가 없으면 손댈 수가 없다. */
    if (missed) console.log('[정리] 못 채움 — 들린 말:', transcript)
    if (missed) {
      shake(s.id, transcript)
      if (!speaking) void say(RETRY_LINE)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-[#F5F8FE] overflow-hidden">
      <PhaseStepper active={3} subtitle="오늘 배운 핵심 요약" onEnd={onExit} onJump={onJumpPhase} />

      {/* ── 강사 히어로 — 정리 내내 위에 있다 ──
          말풍선은 **지금 하는 말** 한 자리다(TutorDock 음성 모드와 같은 규칙). 학생이 답할 것이
          없는 화면이라 대화창·입력창은 두지 않는다 — 얼굴과 말만 있으면 된다. */}
      <div className="shrink-0 bg-white border-b border-[#EBEBF0] px-4 md:px-6 py-3">
        <div className="max-w-[640px] mx-auto flex items-center gap-3.5">
          <div className="shrink-0">
            <PulseAvatar src={teacherImg} name={teacherName} speaking={speaking} size={88}
              clipSrc={instClip(instructor, speaking ? 'explain' : 'listen')}
              allClips={instClips(instructor)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-[#6B7280]">{teacherName} 강사</span>
            <p className="text-[13.5px] leading-relaxed text-[#334155] font-medium mt-0.5 max-h-[7.5em] overflow-y-auto">
              {line ? <TutorText text={line} /> : <SpeechDots />}
            </p>
          </div>
        </div>
      </div>

      <div ref={pageRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="max-w-[640px] mx-auto space-y-4">
          {/* 카드 위의 안내 줄글(제목·"직접 채워보세요"·"탭하거나 🎤")은 두지 않는다 —
              그 말은 이제 **강사가 위에서 직접 한다.** 같은 말이 화면에 두 번 있으면
              어느 쪽을 읽어야 할지 흐려지고, 단계 이름은 상단 표시줄에 이미 있다. */}

          {practiceScore && (
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5">
              <span className="text-[11px] font-bold text-[#6B7280]">실전 결과</span>
              <span className="text-[13px] font-black text-[#2563EB]">{practiceScore.correct}/{practiceScore.total} 정답</span>
            </div>
          )}

          {/* 이 장의 제목 — 장이 여럿일 때만 뜬다(윤다은은 한 장이라 제목이 없다) */}
          {group.title && (
            <div className="flex items-baseline gap-2 pt-1">
              <p className="text-[13px] font-black text-[#1C1B33]">{group.title}</p>
              <span className="text-[11px] font-bold text-[#9CA3AF]">{items.length}문항</span>
              {groups.length > 1 && (
                <span className="ml-auto text-[11px] font-bold text-[#94A3B8] tabular-nums">
                  {page + 1} / {groups.length}
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {items.map((s, i) => (
              <RecapCard key={s.id} index={i} sentence={s} filled={fills[s.id]}
                corrects={correctsOf(s)}
                wrong={wrong[s.id]} active={activeIdx === i}
                onPick={(c, b) => pick(s, c, b)} onSpeak={(t, b) => speakAnswer(s, t, b)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── 버튼은 '다음' 하나뿐이다 ──
          채점은 고르는 자리에서 바로 되고, 마지막 칸을 채우면 **강사가 알아서** 짚기 시작한다.
          누를 것을 하나 더 두면 학생이 "왜 아무 일도 안 일어나지" 하고 버튼을 찾게 된다.
          말하는 동안만 [건너뛰기] 로 바뀐다. */}
      <div className="shrink-0 bg-white border-t border-[#EBEBF0] px-4 md:px-6 py-3">
        <div className="max-w-[640px] mx-auto flex justify-end">
          {playing ? (
            <button onClick={skipWrapUp}
              className="px-5 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[#334155] text-sm font-bold">
              건너뛰기
            </button>
          ) : !lastPage ? (
            <button disabled={!played} className={PRIMARY_BTN} onClick={nextPage}>다음 →</button>
          ) : (
            <button disabled={!played} className={PRIMARY_BTN}
              onClick={() => onDone({ correct: correctCount, total: allItems.length })}>완료하기</button>
          )}
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
  /** 강사가 이 턴에서 할 말을 끝냈는가. 선택지는 **그 뒤에** 나온다 —
   *  질문이 끝나기도 전에 버튼이 떠 있으면 학생이 듣지 않고 눌러버린다. */
  spoken: boolean
  /** 대본 수업 — 말하기 답을 여기서 직접 받는다(에이전트가 없다) */
  scripted?: boolean
  onSubjectiveSubmit?: (text: string) => void
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
    /* 강사가 아직 말하는 중이면 내보내지 않는다. 한 번 나온 뒤에는(고른 뒤 피드백 낭독 등)
       도로 감추지 않는다 — 눌렀던 자리가 눈앞에서 사라지면 무엇을 골랐는지 알 수 없다. */
    if (!props.spoken && !done) return null
    /* ── O/X 는 글이 아니라 기호다 ──
       "맞아요/아니에요" 처럼 문장으로 세로로 쌓으면 읽고 나서 누르게 된다. O·X 는 시험지에
       치는 표시 그대로라, **좌우로 크게** 두면 눈으로 보고 바로 눌린다. */
    const isOX = it.choices.length === 2 && it.choices[0]?.text === 'O' && it.choices[1]?.text === 'X'
    if (isOX) {
      return (
        <div>
          <div className="grid grid-cols-2 gap-2">
            {it.choices.map((c, i) => {
              const isPicked = picked === i
              const cls = done
                ? c.correct ? 'border-[#22C55E] bg-[#F0FDF4] text-[#15803D]'
                  : isPicked ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#E5E7EB] bg-white text-[#CBD5E1]'
                : 'border-[#DBEAFE] bg-white text-[#334155] hover:border-[#2563EB] hover:bg-[#F8FAFF]'
              return (
                <button key={i} disabled={done} onClick={() => { props.setChoicePicked(i); props.onChoicePick?.(c) }}
                  aria-label={c.text === 'O' ? '맞아요' : '아니에요'}
                  className={`flex items-center justify-center h-14 rounded-xl border text-[26px] font-black leading-none
                              transition-all active:scale-[0.98] ${cls}`}>
                  {c.text}
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
    /* 질문 문구(it.prompt)는 **여기 적지 않는다.** 강사가 방금 그 말을 했고 말풍선에도 남아 있어서,
       선택지 바로 위에 또 적으면 같은 문장이 화면에 두 번 있다. 여기는 고르는 자리다. */
    return (
      <div>
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
