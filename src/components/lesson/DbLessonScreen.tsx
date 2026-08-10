'use client'

import { useEffect, useRef, useState } from 'react'
import { useConversation } from '@11labs/react'
import { fetchLectureQuestions, type UiDbQuestion, type UiDbOption } from '@/data/db/questionStore'
import LessonIntro from '@/components/lesson/LessonIntro'
import { INST_NAME, INST_THUMBS, tutorAgentFor } from '@/data/instructorData'
import { speakTTS, stopCurrentAudio } from '@/lib/tts'
import { buildTutorVars } from '@/lib/learnerProfile'
import { useOnboardingStore } from '@/store/onboardingStore'

// ── DB 기반 유형학습 수업 화면 (파트 공용, 신버전 UI) ──
// 흐름: 도입(개념/핵심표현) → 문항 1..N 순차 풀이(다음 문항) → 완료(실전 준비 중).
// 좌: 도입 카드 / 파트별 문항(사진·질문·대화 등, DB content) + 보기.
// 우: 박혜원 ElevenLabs 에이전트 — /api/tutor(lessonType='lesson', 시트 레일)가 진행을 소유하고
//     에이전트는 directive를 말투로 렌더한다. 문항을 넘길 때마다 새 questionCode로 start를 다시 호출.
const TEACHER_IMG = '/instructor/park.png'
const STUDENT_ID  = 'demo'

interface Props {
  lectureCode: string
  instructor?: string // 강사별 스캐폴딩 레일 선택 (기본 박혜원=common). /api/tutor가 instructor_code로 변환.
  onEnd: () => void
}

const PART_NAMES: Record<number, string> = {
  1: 'Part 1 사진 묘사', 2: 'Part 2 질의응답', 3: 'Part 3 짧은 대화', 4: 'Part 4 짧은 담화',
  5: 'Part 5 단문 공란', 6: 'Part 6 장문 공란', 7: 'Part 7 독해',
}

/* 강의별 도입 콘텐츠 — 공용 LessonIntro(tag/script/points)에 그대로 넘긴다.
   DB에 도입 필드가 없어 프로토타입 단계에선 여기 둔다. */
interface LectureIntro {
  tag: string
  script: string
  points: string[]
}
const LECTURE_INTRO: Record<string, LectureIntro> = {
  'LC-P1-01': {
    tag: 'Part 1 · 사람 중심 vs 사물·상태 사진',
    script: '오늘은 사진을 인물·사물·혼합 세 종류로 나눠서, 종류마다 자주 나오는 정답 표현과 오답 함정을 잡아볼 거예요.',
    points: [
      '인물 중심 사진 — 사람 동작(be ~ing)이 정답',
      '사물·풍경 사진 — 사물 상태(be p.p.)가 정답, 사람 동작 함정 주의',
      '혼합 사진 — “사람이냐 사물이냐”를 먼저 판단',
    ],
  },
  'LC-P1-02': {
    tag: 'Part 1 · 동작 표현 vs 상태 표현',
    script: '이번엔 지금 하는 동작인지, 이미 끝난 상태인지를 구분해요. wearing과 putting on, is being p.p.와 have been p.p.처럼 헷갈리는 짝을 집중해서 잡아볼게요.',
    points: [
      'be ~ing(동작) vs be p.p.(상태) 구분',
      'wearing(착용 상태) vs putting on(입는 동작)',
      'is being p.p.(지금 되는 중) vs have been p.p.(이미 된 상태)',
    ],
  },
}

/* 강의별 정리(마무리) 콘텐츠 — 핵심 요약 빈칸 3개 + 강사 마무리 멘트.
   LECTURE_INTRO와 같은 이유로 DB 대신 여기 둔다. accept: 정답으로 인정할 표현들(부분일치·소문자·공백무시). */
interface LectureSummary {
  sentences: { before: string; blank: string; after: string; accept: string[] }[]
  closing: string
}
const LECTURE_SUMMARY: Record<string, LectureSummary> = {
  'LC-P1-01': {
    sentences: [
      { before: '사진 묘사는 주어가 ', blank: '사람', after: '인지 사물인지 먼저 확인한다.', accept: ['사람', '인물'] },
      { before: '사람 사진은 주로 ', blank: '현재진행형', after: '(be + -ing) 동작 묘사가 정답이다.', accept: ['현재진행', '진행형', 'ing', '동작'] },
      { before: '사물·풍경 사진은 ', blank: '상태', after: ' 묘사(be + p.p.)가 정답, 사람 동작 함정에 주의한다.', accept: ['상태', '수동', 'pp', 'p.p'] },
    ],
    closing: '오늘 배운 Part 1 핵심! 주어가 사람인지 사물인지 먼저 확인하고, 사람은 현재진행형 동작, 사물은 상태 묘사에 집중하세요. 잘하셨어요!',
  },
  'LC-P1-02': {
    sentences: [
      { before: '지금 하는 동작은 ', blank: '현재진행형', after: '(be + -ing)으로 묘사한다.', accept: ['현재진행', '진행형', 'ing'] },
      { before: '이미 끝난 상태는 ', blank: '완료', after: '(have + p.p.)나 상태 묘사로 나타난다.', accept: ['완료', '상태'] },
      { before: '지금 되는 중인 동작은 ', blank: '진행 수동', after: '(is being + p.p.)에 주의한다.', accept: ['진행수동', '진행 수동', '수동', 'being'] },
    ],
    closing: '오늘 배운 Part 1 동작·상태 구분! wearing과 putting on, is being p.p.와 have been p.p.를 꼭 나눠서 보세요. 지금 하는 동작인지 이미 끝난 상태인지가 핵심이에요. 수고했어요!',
  },
}

async function callTutor(payload: Record<string, unknown>): Promise<{ contextual?: string; sessionId?: string; step?: string; playAudio?: boolean }> {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return {}
  return res.json()
}

export default function DbLessonScreen({ lectureCode, instructor = 'park_hyewon', onEnd }: Props) {
  // 온보딩에서 고른 강사 이름·썸네일 (없으면 박혜원 기본). 스캐폴딩 레일은 instructor로 /api/tutor가 선택.
  const teacherName = INST_NAME[instructor] ?? '박혜원'
  const teacherImg = INST_THUMBS[instructor] ?? TEACHER_IMG
  const agentId = tutorAgentFor(instructor) // 강사별 튜터 에이전트 (윤다은 등), 없으면 박혜원
  const profile = useOnboardingStore()      // 온보딩 4축 진단·목표 → 에이전트 dynamic variables
  const [questions, setQuestions] = useState<UiDbQuestion[] | null>(null)
  const [phase, setPhase] = useState<'intro' | 'lesson' | 'practice' | 'coaching' | 'summary'>('intro')
  const [stepIdx, setStepIdx] = useState(0)
  // 오답 코칭 대상: 실전에서 틀린 문항 + 학생이 고른 오답 라벨 (PracticeView에서 채점 후 올려줌)
  const [coachItems, setCoachItems] = useState<{ q: UiDbQuestion; chosen?: string }[]>([])
  const [coachIdx, setCoachIdx] = useState(0)
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text')
  const [inputText, setInputText] = useState('')
  const [panelOpen, setPanelOpen] = useState(false) // UI 실험 안2: 평소엔 플로팅 위젯, 클릭하면 모달

  // 강사 모달 드래그 — 헤더를 잡고 이동 (딤드 없음, 뒤 화면 보면서 사용)
  const modalRef        = useRef<HTMLElement | null>(null)
  const modalDragging   = useRef(false)
  const modalDragOffset = useRef({ x: 0, y: 0 })
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null)

  const onModalDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const el = modalRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY
    modalDragging.current = true
    modalDragOffset.current = { x: cx - rect.left, y: cy - rect.top }
    setModalPos({ x: rect.left, y: rect.top })
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!modalDragging.current) return
      e.preventDefault()
      const cx = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
      const cy = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      const el = modalRef.current
      if (!el) return
      const x = Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, cx - modalDragOffset.current.x))
      const y = Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, cy - modalDragOffset.current.y))
      setModalPos({ x, y })
    }
    const onUp = () => { modalDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  // 듣기 음원 재생 상태 — 강사(에이전트)가 play_audio tool로 재생하는 동안만 true (채팅창 하단 표시용).
  const [audioPlaying, setAudioPlaying] = useState(false)
  // 유형학습 보기 텍스트 공개 여부 — 처음엔 숨기고(음성만), 음원을 다 들은 뒤 전부 공개.
  const [optionsRevealed, setOptionsRevealed] = useState(false)

  const sessionIdRef   = useRef<string | null>(null)
  const startedCodeRef = useRef<string | null>(null) // 튜터를 start한 questionCode (문항 전환 감지용)
  const audioElRef     = useRef<HTMLAudioElement | null>(null)
  // 항상 "현재 문항의 음원"을 재생하도록 매 렌더에서 최신 클로저로 갱신 (clientTool이 이 ref를 호출)
  const playAudioRef   = useRef<() => Promise<void>>(async () => {})
  const playOptionRef  = useRef<(sel: unknown) => Promise<string>>(async () => '')
  // 강사 발화 중 여부를 폴링 루프에서 최신값으로 읽기 위한 ref (클로저 스냅샷 회피)
  const isSpeakingRef  = useRef(false)
  const lastPlayRef    = useRef<{ src: string; t: number }>({ src: '', t: 0 }) // 중복 재생 방지용

  const conversation = useConversation({
    // 텍스트 모드에서는 마이크를 음소거 → 입력은 오직 텍스트로만 (음성 모드로 바꾸면 해제)
    micMuted: chatMode === 'text',
    onMessage: (p: { source: string; message: string }) =>
      setMessages((prev) => [...prev, { role: p.source === 'user' ? 'user' : 'ai', text: p.message }]),
    clientTools: {
      // 매 턴의 핵심: 학생이 답하면 강사가 이 tool을 호출 → 튜터 엔진이 다음 스캐폴딩 단계 지시를 반환.
      // 강사는 그 지시(반환값)대로만 발화한다. 이렇게 해야 지시가 "발화 전에" 도착해 단계가 안 샌다.
      next_step: async (params: { student_reply?: string }) => {
        if (!sessionIdRef.current) return '아직 수업 준비 중이야. 학생에게 잠깐만 기다려 달라고 해.'
        const res = await callTutor({ action: 'answer', sessionId: sessionIdRef.current, text: String(params?.student_reply ?? '') })
        if (res.playAudio) void playAudioRef.current() // 듣기 단계면 음원 재생(강사 발화 뒤 자동)
        return res.contextual ?? '지금은 학생 말에 짧게 반응하고 다음 지시를 기다려라.'
      },
      // 강사가 "들어보자"/"다시 들어보자"라고 판단하면 호출 → 현재 문항 음원 재생.
      play_audio: async () => {
        await playAudioRef.current()
        return '음원 재생을 마쳤습니다. 이제 학생에게 무엇을 들었는지 짧게 확인 질문을 하세요.'
      },
      // 보기 하나만 다시 듣기. index(A=1) 또는 label('B') 어느 쪽으로 와도 받는다.
      replay_sentence: async (params: { index?: number | string; label?: string }) =>
        playOptionRef.current(params?.label ?? params?.index),
    },
  })
  const connected  = conversation.status === 'connected'
  const connecting = conversation.status === 'connecting'
  isSpeakingRef.current = conversation.isSpeaking // 매 렌더 최신 발화 상태 반영

  useEffect(() => {
    let alive = true
    fetchLectureQuestions(lectureCode).then((rows) => { if (alive) setQuestions(rows) })
    return () => { alive = false }
  }, [lectureCode])

  // 유형학습 문항(stage!=='practice')과 실전 문항(stage==='practice') 분리.
  // 실전용이 아직 없으면 유형학습 문항을 임시 재사용(실전 사진 준비되면 stage='practice'로 교체).
  const lessonQuestions   = (questions ?? []).filter((q) => q.content.stage !== 'practice')
  const practiceQuestions = (questions ?? []).filter((q) => q.content.stage === 'practice')
  const practiceSet = practiceQuestions.length ? practiceQuestions : lessonQuestions
  const total     = lessonQuestions.length
  const currentQ  =
    phase === 'lesson'   ? (lessonQuestions[stepIdx] ?? null) :
    phase === 'coaching' ? (coachItems[coachIdx]?.q ?? null) : null
  const partNo    = questions?.[0]?.part ?? 1
  const partName  = PART_NAMES[partNo] ?? `파트 ${partNo}`
  const intro     = LECTURE_INTRO[lectureCode]

  // 음원 하나를 재생하고 끝날 때까지 대기. 재생 중엔 audioPlaying=true.
  //  · revealOptions=true(1차 청취, 통합 음원)면 다 들은 뒤 보기 텍스트를 공개한다.
  //  · 보기 하나만 다시 듣는 경우(revealOptions=false)는 공개 상태를 건드리지 않는다.
  const playAudioSrc = async (src: string | undefined, revealOptions: boolean) => {
    if (!src) return
    // 중복 재생 방지: 시스템 자동재생과 에이전트 play_audio가 거의 동시에 들어와도 3초 내 같은 음원은 한 번만.
    const now = Date.now()
    if (lastPlayRef.current.src === src && now - lastPlayRef.current.t < 3000) return
    lastPlayRef.current = { src, t: now }
    // 강사 발화와 겹치지 않게: 강사가 "말을 시작했다가 끝날 때까지" 기다린 뒤 재생.
    //  · tool이 발화 TTS 시작 전에 먼저 실행될 수 있어(그 순간 isSpeaking=false) 바로 재생하면 겹친다.
    //  · 그래서 최대 2초간 발화 시작을 지켜보고, 시작했으면 끝날 때까지 대기. 전체 상한 12초.
    await new Promise<void>((res) => {
      const t0 = Date.now()
      let sawSpeaking = false
      let quietSince = 0 // 발화가 멈춘 시각 (문장 사이 순간 끊김을 흡수하려 400ms 유지 확인)
      const tick = () => {
        const now = Date.now()
        const speaking = isSpeakingRef.current
        if (speaking) { sawSpeaking = true; quietSince = 0 }
        else if (quietSince === 0) quietSince = now
        const spokeAndStopped = sawSpeaking && !speaking && now - quietSince > 400
        const neverSpoke = !sawSpeaking && now - t0 > 2000
        if (spokeAndStopped || neverSpoke || now - t0 > 12000) res()
        else setTimeout(tick, 120)
      }
      tick()
    })
    stopCurrentAudio() // 전역 오디오 정리
    await new Promise<void>((resolve) => {
      const a = audioElRef.current ?? new Audio()
      audioElRef.current = a
      a.src = src
      a.currentTime = 0
      setAudioPlaying(true)
      const finish = () => {
        a.removeEventListener('ended', finish)
        a.removeEventListener('error', finish)
        setAudioPlaying(false)
        if (revealOptions) setOptionsRevealed(true) // 1차 청취를 마치면 보기 텍스트 전부 공개
        resolve()
      }
      a.addEventListener('ended', finish)
      a.addEventListener('error', finish)
      a.play().catch(() => finish())
    })
  }

  // 1차 청취/전체 다시 듣기 — 보기 A~D 통합 내레이션.
  const playCurrentAudio = () => playAudioSrc(currentQ?.content.audio_url, true)
  playAudioRef.current = playCurrentAudio

  /** 에이전트가 넘긴 보기 지정을 옵션으로 해석. 'B' / 'b' / 2 / '2' 전부 받는다(A=1 기준). */
  const resolveOption = (sel: unknown): UiDbOption | undefined => {
    const opts = currentQ?.options
    if (!opts?.length) return undefined
    const raw = String(sel ?? '').trim()
    if (!raw) return undefined
    const byLabel = opts.find((o) => o.label.toUpperCase() === raw.toUpperCase())
    if (byLabel) return byLabel
    const n = Number(raw)
    if (!Number.isFinite(n)) return undefined
    // 1-based(A=1)가 기본. 0을 보내오면 A로 본다.
    return opts[n <= 0 ? 0 : n - 1]
  }

  /** 보기 하나만 다시 재생. 보기별 음원이 아직 없으면 통합 음원으로 폴백하고 그 사실을 에이전트에 알린다. */
  const playOptionAudio = async (sel: unknown): Promise<string> => {
    const opt = resolveOption(sel)
    if (!opt) {
      await playCurrentAudio()
      return '어느 보기인지 알 수 없어 전체를 다시 들려줬습니다. 이어서 설명하세요.'
    }
    if (!opt.audioUrl) {
      await playCurrentAudio()
      return `${opt.label} 보기만 따로 들려줄 음원이 없어 전체를 다시 들려줬습니다. 특정 보기만 들려줬다고 말하지 마세요.`
    }
    await playAudioSrc(opt.audioUrl, false)
    return `${opt.label} 보기를 다시 들려줬습니다. 이어서 설명하세요.`
  }
  playOptionRef.current = playOptionAudio

  // 새 문항: 보기 다시 숨김 + 재생 상태 리셋. 이전 음원은 정지.
  useEffect(() => {
    setOptionsRevealed(false)
    setAudioPlaying(false)
    return () => { audioElRef.current?.pause() }
  }, [currentQ])

  const sendContextual = (text: string) => {
    try {
      ;(conversation as unknown as { sendContextualUpdate?: (t: string) => void }).sendContextualUpdate?.(text)
    } catch { /* noop */ }
  }

  // 문항 진입/전환 시 튜터 세션 start → 해당 문항 directive 주입.
  //  · 유형학습(lesson): sheetRail 모드로 개념 수업 레일 진행.
  //  · 오답 코칭(coaching): tag 모드(lessonType='practice')로 start한 뒤, 학생이 실전에서 고른
  //    오답 라벨을 곧바로 answer로 넣어 태그 진단→스캐폴딩 코칭 단계로 바로 진입시킨다.
  useEffect(() => {
    if (connected && currentQ && startedCodeRef.current !== currentQ.code) {
      startedCodeRef.current = currentQ.code
      const coaching = phase === 'coaching'
      const chosen = coaching ? coachItems[coachIdx]?.chosen : undefined
      // 음원 있는 문항: 보기는 음성(듣기 음원)으로 들려주므로, 강사가 보기 문장을 소리 내어 읽지 않게 한다.
      const audioNudge = currentQ.content.audio_url
        ? '\n\n(이 문항의 보기 A~D는 학생이 듣기 음원으로 듣는다. 보기 문장을 네가 소리 내어 읽지 마라. 학생이 들은 내용을 바탕으로만 대화하라.)'
        : ''
      ;(async () => {
        const res = await callTutor({
          action: 'start', studentId: await (await import('@/lib/profile')).getLearnerId(STUDENT_ID), questionCode: currentQ.code,
          lessonType: coaching ? 'practice' : 'lesson', instructor,
        })
        if (res.sessionId) sessionIdRef.current = res.sessionId
        if (coaching && chosen && res.sessionId) {
          // 학생이 고른 오답을 자력풀이 응답으로 주입 → 엔진이 오답 태그 진단 후 코칭 시작
          const ans = await callTutor({ action: 'answer', sessionId: res.sessionId, text: chosen })
          if (ans.contextual) sendContextual(ans.contextual + audioNudge)
          if (ans.playAudio) void playAudioRef.current()
        } else if (res.contextual) {
          sendContextual(res.contextual + audioNudge)
          if (res.playAudio) void playAudioRef.current()
        }
      })()
    }
    if (!connected) startedCodeRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, currentQ])

  // (단계 진행은 이제 에이전트의 next_step 클라이언트 tool이 담당한다 — 지시가 발화 전에 도착하도록.
  //  옛 방식: 학생 발화를 클라이언트가 엔진에 보내고 지시를 사후 주입 → 지시가 한 박자 늦어 단계가 샜음.)

  /* 화면을 벗어나면 강사 세션을 무조건 끊는다 — 안 끊으면 다른 화면에서도 마이크가 열려 있고
     강사가 계속 말한다. 정리 effect 가 렌더 0번의 conversation 을 물고 있으면 세션을 다시 연 뒤에는
     헛돌아서 최신 것을 ref 로 부르고, 탭 닫기·새로고침은 언마운트가 안 도는 경우가 있어 pagehide 로
     한 번 더 건다. (TypeLessonPlayer 와 같은 처리) */
  const convRef = useRef(conversation)
  convRef.current = conversation
  useEffect(() => {
    const bye = () => { try { convRef.current.endSession() } catch { /* noop */ } }
    window.addEventListener('pagehide', bye)
    return () => { window.removeEventListener('pagehide', bye); bye() }
  }, [])

  // 실전/정리로 넘어가면 강사(라이브 에이전트) 세션 종료 — 듣기 음원·정리 TTS 위로 겹치지 않게.
  useEffect(() => {
    if (phase === 'practice' || phase === 'summary') {
      try { conversation.endSession() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!questions) {
    return <div className="h-dvh flex items-center justify-center bg-[#f0f4f8] text-sm text-gray-400">수업 자료를 불러오는 중…</div>
  }
  if (total === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#f0f4f8]">
        <p className="text-sm text-gray-500">이 강의({lectureCode})에 등록된 문항이 아직 없어요.</p>
        <button onClick={onEnd} className="px-5 py-2.5 rounded-xl bg-[#2277F0] text-white text-sm font-bold">돌아가기</button>
      </div>
    )
  }

  // 도입 화면 — 공용 LessonIntro (박혜원 강사 + 도입·수업·실전·정리 스텝퍼)
  if (phase === 'intro') {
    return (
      <LessonIntro
        tag={intro?.tag ?? partName}
        script={intro?.script ?? `${partName} 유형학습을 시작할게요.`}
        points={(intro?.points ?? []).map((t) => ({ text: t }))}
        teacherName={`${teacherName} 선생님`}
        teacherImg={teacherImg}
        onStart={() => { setStepIdx(0); setPhase('lesson') }}
        onEnd={onEnd}
      />
    )
  }

  // 실전 화면 — 혼자 풀기 → 채점 → (틀린 문제 있으면) 강사 오답 코칭으로 인계
  if (phase === 'practice') {
    return (
      <PracticeView
        questions={practiceSet}
        partName={partName}
        isPlaceholder={practiceQuestions.length === 0}
        onFinish={(wrong) => {
          if (wrong.length) { setCoachItems(wrong); setCoachIdx(0); setMessages([]); setPhase('coaching') }
          else setPhase('summary')
        }}
        onEnd={onEnd}
      />
    )
  }

  // 정리 화면 — 핵심 요약 빈칸(텍스트/음성) + 박혜원 강사 마무리 (full-screen)
  if (phase === 'summary') {
    return <SummaryView data={LECTURE_SUMMARY[lectureCode]} partName={partName} onEnd={onEnd} teacherName={teacherName} teacherImg={teacherImg} />
  }

  // 인사말은 에이전트가 처음에 스스로 말하는 유일한 발화 = "처음부터 질문으로" 여는 부분(따로 고정).
  // 유형학습 첫 단계(S2 유형 판별)에 맞춰 질문으로 연다. 음원은 오프닝이 아니라 뒤의 듣기 단계(S5)에서 재생됨.
  const greeting = phase === 'coaching'
    ? '자, 아까 실전에서 틀린 문제 같이 볼게. 이 문제 풀 때 왜 그 답을 골랐는지 기억나? 편하게 말해줘.'
    : `자, 오늘은 ${partName} 같이 볼게. 화면에 사진 보이지? 이 사진, 사람이 중심인 사진이야 아니면 사물·풍경이 중심인 사진이야? 편하게 말해줘.`

  const startAgent = () => {
    setMessages([])
    conversation.startSession({
      agentId,
      dynamicVariables: buildTutorVars(profile, {
        study_range: partName,
        instructor_greeting: greeting,
      }),
    }).catch(() => {})
  }
  const sendText = () => {
    const t = inputText.trim()
    if (!t || !connected) return
    conversation.sendUserMessage(t)
    setMessages((prev) => [...prev, { role: 'user', text: t }])
    setInputText('')
  }
  const lastAi = [...messages].reverse().find((m) => m.role === 'ai')?.text ?? ''

  const goNext = () => {
    if (stepIdx < total - 1) setStepIdx(stepIdx + 1)
    else setPhase('practice') // 유형학습 끝 → 실전
  }

  const goNextCoach = () => {
    if (coachIdx < coachItems.length - 1) { setCoachIdx(coachIdx + 1); setMessages([]) } // 다음 오답 = 새 코칭
    else setPhase('summary') // 오답 코칭 끝 → 정리
  }

  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${phase === 'coaching' ? 'bg-[#F59E0B]/15 text-[#B45309]' : 'bg-[#2277F0]/10 text-[#2277F0]'}`}>{partName}</span>
          <span className="text-[13px] font-bold text-gray-600">{phase === 'coaching' ? '오답 코칭' : '유형학습'}</span>
          {phase === 'lesson' && (
            <span className="text-[12px] font-semibold text-gray-400">문항 {stepIdx + 1} / {total}</span>
          )}
          {phase === 'coaching' && (
            <span className="text-[12px] font-semibold text-gray-400">오답 {coachIdx + 1} / {coachItems.length}</span>
          )}
        </div>
        <button onClick={onEnd} className="text-[13px] font-bold text-gray-400 hover:text-gray-600">수업 종료 ✕</button>
      </div>

      <div className="flex-1 flex flex-col-reverse lg:flex-row-reverse min-h-0">
        {/* 강사 대화 — 플로팅 위젯 + 드래그 가능한 창 (UI 실험 안2). 딤드 없음, 닫아도 세션 유지. */}
        {panelOpen && (
          <aside
            ref={modalRef}
            className="fixed z-40 w-[min(400px,92vw)] bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col"
            style={{
              height: 'min(600px, 80dvh)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              ...(modalPos ? { left: modalPos.x, top: modalPos.y } : { right: 16, bottom: 80 }),
            }}
          >
          <div
            onMouseDown={onModalDragStart}
            onTouchStart={onModalDragStart}
            className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teacherImg} alt={teacherName} className="w-7 h-7 rounded-full object-cover object-top border border-[#2277F0]/40" />
              <span className="text-[13px] font-bold text-gray-600">{teacherName} AI 강사</span>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-gray-50 rounded-full p-0.5">
                <button onClick={() => setChatMode('text')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${chatMode === 'text' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M8 16h8" /></svg>
                  텍스트
                </button>
                <button onClick={() => setChatMode('voice')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${chatMode === 'voice' ? 'bg-[#2277F0] text-white' : 'text-gray-400'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></svg>
                  음성
                </button>
              </div>
              <button onClick={() => setPanelOpen(false)} aria-label="강사 창 닫기" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>


          {!connected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teacherImg} alt={teacherName} className="w-20 h-20 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
              <p className="text-sm text-gray-500 text-center">{connecting ? '강사와 연결 중…' : `${teacherName} 강사와 대화를 시작해요`}</p>
              <button onClick={startAgent} disabled={connecting}
                className="px-5 py-3 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] disabled:opacity-60">
                {connecting ? '연결 중…' : '▶ 강사와 대화 시작'}
              </button>
            </div>
          ) : chatMode === 'text' ? (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
                {messages.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">강사가 곧 말을 걸어요…</p>}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'ai' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#2277F0] text-white rounded-tr-sm'}`}>{m.text}</div>
                  </div>
                ))}
                {/* 강사 말풍선 바로 아래에 재생 중에만 떴다가 사라지는 스피커 표시 */}
                {audioPlaying && <div className="flex justify-start"><AudioListeningChip /></div>}
              </div>
              <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
                <div className="flex-1 bg-gray-100 rounded-full px-4 py-2.5">
                  <input className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none" placeholder="메시지 입력..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendText() }} />
                </div>
                <button onClick={sendText} disabled={!inputText.trim()} className="w-9 h-9 bg-[#2277F0] rounded-full flex items-center justify-center shrink-0 disabled:opacity-40" aria-label="전송">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-5 min-h-0">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-4 mb-3 transition-all ${conversation.isSpeaking ? 'border-[#2277F0] shadow-[0_0_24px_rgba(34,119,240,0.55)]' : 'border-[#2277F0]/25'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={teacherImg} alt={teacherName} className="w-full h-full object-cover object-top" />
              </div>
              <p className="text-gray-500 text-[12px] font-semibold mb-1">{teacherName} AI 강사</p>
              {lastAi && (
                <div className="bg-gray-100 rounded-xl p-3 w-full my-3 text-center max-h-24 overflow-y-auto">
                  <p className="text-gray-600 text-[13px] leading-relaxed">{lastAi}</p>
                </div>
              )}
              {audioPlaying && <div className="mb-1"><AudioListeningChip /></div>}
              <p className="text-gray-400 text-[11px] mt-1">{conversation.isSpeaking ? '강사가 말하는 중…' : '말하면 강사가 들어요'}</p>
              <button onClick={() => { try { conversation.endSession() } catch { /* noop */ } }} className="mt-4 text-[12px] font-semibold text-gray-400">통화 종료</button>
            </div>
          )}
          </aside>
        )}

        {/* 평소 상태 — 플로팅 강사 위젯 (탭하면 모달) */}
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            aria-label="강사와 대화 열기"
            className="fixed bottom-5 right-4 z-30 flex items-end gap-2.5 text-left"
          >
            {(lastAi || !connected) && (
              <span className="block max-w-[240px] bg-white border border-gray-200 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] text-gray-700 leading-snug shadow-lg line-clamp-2"
                style={{ boxShadow: '0 4px 20px rgba(34,119,240,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}>
                {lastAi || `${teacherName} 강사와 대화를 시작해요`}
              </span>
            )}
            <span className={`relative shrink-0 block w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg transition-all ${connected && conversation.isSpeaking ? 'border-[#2277F0] shadow-[0_0_18px_rgba(34,119,240,0.55)]' : 'border-white'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teacherImg} alt={teacherName} className="w-full h-full object-cover object-top" />
              <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white ${connected ? 'bg-green-400' : 'bg-gray-300'}`} />
            </span>
          </button>
        )}

        {/* 좌: 유형학습 문항 / 오답 코칭 문항 / 완료 (도입·실전은 위에서 조기 반환) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-y-auto">
          {phase === 'lesson' && currentQ && (
            <QuestionView q={currentQ} idx={stepIdx} total={total} onNext={goNext} revealed={optionsRevealed} />
          )}
          {phase === 'coaching' && currentQ && (
            <CoachQuestionView q={currentQ} chosen={coachItems[coachIdx]?.chosen} idx={coachIdx} total={coachItems.length} onNext={goNextCoach} teacherName={teacherName} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 음원 재생 중 표시 (강사 말풍선 바로 아래, 재생 중에만) ── */
function AudioListeningChip() {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#EFF6FF] border border-[#BFD9FF] text-[#2277F0] text-[11px] font-bold px-3 py-1.5 rounded-full">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
      <span className="animate-pulse">음원 듣는 중…</span>
    </span>
  )
}

/* ── 문항 화면 (진행 표시 + 파트별 본문 + 보기 + 다음) ── */

function QuestionView({ q, idx, total, onNext, revealed }: {
  q: UiDbQuestion; idx: number; total: number; onNext: () => void; revealed: boolean
}) {
  // 듣기 문항: 보기 텍스트를 감췄다가(음성만), 음원을 다 들으면(revealed) 전부 공개.
  const hideText = !!q.content.audio_url && !revealed
  // Part 1(사진 묘사)은 사진 좌 · 보기 우 2분할 + 가운데 핸들로 폭 조절, 나머지는 세로 배치.
  const isPhoto = q.part === 1
  const splitRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const [leftFrac, setLeftFrac] = useState(0.58) // 사진(좌) 폭 비율
  const onResizeStart = (e: React.PointerEvent) => { resizingRef.current = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onResizeMove = (e: React.PointerEvent) => { if (!resizingRef.current || !splitRef.current) return; const r = splitRef.current.getBoundingClientRect(); setLeftFrac(Math.min(0.75, Math.max(0.3, (e.clientX - r.left) / r.width))) }
  const onResizeEnd = () => { resizingRef.current = false }

  const optionsBlock = (
    <div className="flex flex-col gap-2 md:gap-2.5">
      {q.options.map((o) => (
        <div key={o.label} className="flex items-center gap-3 rounded-xl px-4 py-3 border border-gray-200 bg-white">
          <span className="w-6 h-6 rounded-full border-2 border-gray-300 text-gray-400 flex items-center justify-center shrink-0 text-xs font-bold">{o.label}</span>
          {hideText
            ? <span className="text-sm text-gray-400 font-medium">🔊 음성으로 들려요</span>
            : <span className="text-sm md:text-[15px] leading-snug text-[#1A2B4B]">{o.text}</span>}
        </div>
      ))}
    </div>
  )

  return (
    <div className="px-5 md:px-8 py-4 md:py-5">
      {/* 진행 인디케이터 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-[#2277F0]">문항 {idx + 1} <span className="text-gray-400 font-semibold">/ {total}</span></span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#2277F0]' : i < idx ? 'w-1.5 bg-[#2277F0]/40' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {isPhoto ? (
        <div ref={splitRef} className="flex flex-col lg:flex-row min-h-[380px] lg:h-[58vh]">
          {/* 좌: 사진 */}
          <div className="min-h-0 overflow-y-auto lg:w-[var(--lf)]" style={{ ['--lf' as string]: `${leftFrac * 100}%` }}>
            <PartContent q={q} />
          </div>
          {/* 가운데 세로 리사이즈 핸들 (데스크탑) */}
          <div onPointerDown={onResizeStart} onPointerMove={onResizeMove} onPointerUp={onResizeEnd}
            className="hidden lg:flex w-4 shrink-0 items-center justify-center cursor-col-resize touch-none bg-gray-50 border-x border-gray-100 hover:bg-gray-100 rounded">
            <div className="h-12 w-1 rounded-full bg-gray-300" />
          </div>
          {/* 우: 보기 */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto pt-4 lg:pt-0 lg:pl-5">{optionsBlock}</div>
        </div>
      ) : (
        <>
          <PartContent q={q} />
          <div className="mt-4">{optionsBlock}</div>
        </>
      )}

      <button onClick={onNext}
        className="mt-5 w-full py-3.5 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] transition-colors">
        {idx < total - 1 ? '다음 문항 →' : '유형학습 마치기 →'}
      </button>
    </div>
  )
}

/* ── 오답 코칭 문항 화면 (좌 패널) ──
   실전에서 틀린 문항을 보여준다. 학생이 고른 오답은 빨강, 정답은 초록으로 표시(채점 결과에서 이미 공개됨).
   실제 스캐폴딩 코칭은 우측 강사(tag 모드)가 대화로 진행하고, 여기 버튼으로 다음 오답으로 넘어간다. */
function CoachQuestionView({ q, chosen, idx, total, onNext, teacherName }: {
  q: UiDbQuestion; chosen?: string; idx: number; total: number; onNext: () => void; teacherName: string
}) {
  const correct = q.options.find((o) => o.correct)?.label
  return (
    <div className="px-5 md:px-8 py-4 md:py-5">
      {/* 진행 인디케이터 (오답 N/M) */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-[#B45309]">오답 복습 {idx + 1} <span className="text-gray-400 font-semibold">/ {total}</span></span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#F59E0B]' : i < idx ? 'w-1.5 bg-[#F59E0B]/40' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] px-3.5 py-2.5 text-[12px] font-semibold text-[#B45309] leading-relaxed">
        실전에서 틀린 문제예요. {teacherName} 강사가 왜 틀렸는지 오른쪽에서 같이 짚어줄 거예요.
      </div>

      <PartContent q={q} />

      <div className="flex flex-col gap-2 md:gap-2.5 mt-4">
        {q.options.map((o) => {
          const isChosen = chosen === o.label
          const isCorrect = o.label === correct
          const cls = isCorrect ? 'border-green-300 bg-green-50'
            : isChosen ? 'border-red-300 bg-red-50'
            : 'border-gray-200 bg-white'
          const badge = isCorrect ? 'border-green-400 text-green-600'
            : isChosen ? 'border-red-400 text-red-500'
            : 'border-gray-300 text-gray-400'
          return (
            <div key={o.label} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${cls}`}>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${badge}`}>{o.label}</span>
              <span className="text-sm md:text-[15px] leading-snug text-[#1A2B4B]">{o.text}</span>
              {isChosen && !isCorrect && <span className="ml-auto text-[11px] font-bold text-red-500 shrink-0">내가 고른 답</span>}
              {isCorrect && <span className="ml-auto text-[11px] font-bold text-green-600 shrink-0">정답</span>}
            </div>
          )
        })}
      </div>

      <button onClick={onNext}
        className="mt-5 w-full py-3.5 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] transition-colors">
        {idx < total - 1 ? '다음 오답 →' : '코칭 마치기 →'}
      </button>
    </div>
  )
}

/* ── 정리(마무리) 빈칸 입력 — 타이핑 또는 🎤 음성(Web Speech API, ko-KR) ── */

function BlankField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => () => { try { recRef.current?.stop() } catch { /* noop */ } }, [])

  const toggleMic = () => {
    if (listening) { try { recRef.current?.stop() } catch { /* noop */ } setListening(false); return }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = 'ko-KR'
    rec.interimResults = true
    rec.maxAlternatives = 1
    let finalBuf = ''
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalBuf += t; else interim += t
      }
      onChange((finalBuf || interim).trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    try { rec.start(); setListening(true) } catch { setListening(false) }
  }

  return (
    <span className="inline-flex items-center gap-1 mx-1 align-middle">
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-28 text-center border-b-2 border-[#2277F0] bg-[#EFF6FF] rounded-sm px-1 py-0.5 font-bold text-[#2277F0] outline-none"
        placeholder={listening ? '듣는 중…' : '빈칸'} />
      {supported && (
        <button type="button" onClick={toggleMic} aria-label="말로 채우기"
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-colors ${listening ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-white border-[#BFD9FF] text-[#2277F0] hover:bg-[#EFF6FF]'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
        </button>
      )}
    </span>
  )
}

/* ── 정리(마무리) 화면 — 핵심 요약 빈칸 채우기 + 박혜원 강사 마무리(TTS) ── */

function SummaryView({ data, partName, onEnd, teacherName, teacherImg }: { data: LectureSummary | undefined; partName: string; onEnd: () => void; teacherName: string; teacherImg: string }) {
  const [inputs, setInputs] = useState<string[]>(() => (data?.sentences ?? []).map(() => ''))
  const [checked, setChecked] = useState(false)

  useEffect(() => () => { stopCurrentAudio() }, [])

  // 요약 데이터가 없는 강의 → 간단 완료 카드로 폴백 (graceful degrade)
  if (!data) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#f0f4f8] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2277F0]/10 flex items-center justify-center text-3xl">🎉</div>
        <p className="text-lg font-bold text-[#1A2B4B]">오늘 수업 완료!</p>
        <p className="text-sm text-gray-500">유형학습과 실전 문제를 모두 마쳤어요.</p>
        <button onClick={onEnd} className="mt-2 px-5 py-2.5 rounded-xl bg-[#2277F0] text-white text-sm font-bold hover:bg-[#1a66d4]">돌아가기</button>
      </div>
    )
  }

  const results = data.sentences.map((c, i) => c.accept.some((a) => inputs[i].replace(/\s/g, '').toLowerCase().includes(a.toLowerCase())))
  const allFilled = inputs.every((s) => s.trim().length > 0)
  const correctCount = results.filter(Boolean).length
  const setAt = (i: number, v: string) => setInputs((prev) => prev.map((x, idx) => (idx === i ? v : x)))

  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs font-bold px-3 py-1 rounded-full">{partName}</span>
          <span className="text-[13px] font-bold text-gray-600">정리</span>
        </div>
        <button onClick={onEnd} className="text-[13px] font-bold text-gray-400 hover:text-gray-600">수업 종료 ✕</button>
      </div>

      <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teacherImg} alt={teacherName} className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/30" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-[#1A2B4B]">오늘 수업 마무리!</h2>
              <p className="text-xs md:text-sm text-gray-500">{partName} · 핵심 요약</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2277F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <p className="text-sm md:text-base font-bold text-[#1A2B4B]">핵심 요약 — 빈칸을 채워보세요 <span className="text-[12px] font-semibold text-gray-400">(타이핑하거나 🎤로 말해요)</span></p>
          </div>

          <div className="space-y-3 mb-6">
            {data.sentences.map((c, i) => {
              const ok = results[i]
              return (
                <div key={i} className={`rounded-2xl border p-4 transition-colors ${checked ? (ok ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50') : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#D6EAFF] text-[#2277F0] text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-sm md:text-base text-[#1A2B4B] leading-loose">
                      {c.before}
                      {checked
                        ? <span className={`font-bold ${ok ? 'text-green-700' : 'text-red-500 line-through'}`}>{inputs[i].trim() || '　'}</span>
                        : <BlankField value={inputs[i]} onChange={(v) => setAt(i, v)} />}
                      {checked && !ok && <span className="font-bold text-green-700 mx-1">→ {c.blank}</span>}
                      {c.after}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {!checked ? (
            <button onClick={() => { setChecked(true); void speakTTS(data.closing, 'park') }} disabled={!allFilled}
              className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg transition-all ${allFilled ? 'bg-[#2277F0] text-white hover:bg-[#1a66d4]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>채점하기</button>
          ) : (
            <>
              <p className="text-center text-sm font-bold text-[#2277F0] mb-3">요약 {correctCount}/{data.sentences.length} 정답!</p>
              <div className="rounded-2xl border border-[#BFD9FF] bg-[#F0F5FF] p-4 md:p-5 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={teacherImg} alt={teacherName} className="w-12 h-12 rounded-full object-cover object-top border-2 border-[#2277F0]/40" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2B4B]">{teacherName} AI 강사</p>
                    <p className="text-[11px] text-[#2277F0] font-semibold">오늘 학습 마무리 🎓</p>
                  </div>
                  <button onClick={() => void speakTTS(data.closing, 'park')} className="w-9 h-9 rounded-full bg-white border border-[#BFD9FF] flex items-center justify-center text-[#2277F0] hover:bg-[#EFF6FF]" title="다시 듣기" aria-label="강사 마무리 다시 듣기">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                  </button>
                </div>
                <p className="text-sm md:text-[15px] text-[#374151] leading-relaxed">{data.closing}</p>
              </div>
              <button onClick={() => { stopCurrentAudio(); onEnd() }} className="w-full py-4 rounded-2xl bg-[#2277F0] text-white font-bold text-base md:text-lg hover:bg-[#1a66d4]">학습 마치기 →</button>
              <button onClick={() => { stopCurrentAudio(); setChecked(false); setInputs(data.sentences.map(() => '')) }} className="w-full mt-2 py-3 text-sm font-bold text-gray-400 hover:text-gray-600">다시 채우기</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 듣기 음원 플레이어 (실전 Part 1~4) ──
   content.audio_url(로컬 mp3 = 보기 A~D 내레이션)을 재생. 문항이 바뀌면 이전 음원을 끊고
   자동 재생을 시도한다(autoplay 차단 시 재생 버튼으로 폴백). 진행바는 실제 재생 위치.
   실제 시험처럼 처음 1회 재생 + "다시 듣기" 1회만 허용 — 그 뒤에는 다시 들을 수 없다. */
function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [prog, setProg] = useState(0)
  const [replaysLeft, setReplaysLeft] = useState(1) // 처음 재생 외에 허용되는 "다시 듣기" 횟수

  useEffect(() => {
    stopCurrentAudio() // 강사(전역 tts) 음성이 남아있으면 정리
    const audio = new Audio(src)
    ref.current = audio
    setProg(0)
    setReplaysLeft(1) // 문항이 바뀌면 다시 듣기 1회 부여
    const onTime = () => { if (audio.duration) setProg((audio.currentTime / audio.duration) * 100) }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => { setPlaying(false); setProg(100) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnd)
    audio.play().catch(() => { /* autoplay 차단 → 재생 버튼으로 */ })
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnd)
      if (ref.current === audio) ref.current = null
    }
  }, [src])

  // 처음부터 다시 재생 — "다시 듣기" 1회를 소진. 남은 횟수 없으면 무시.
  const startOver = () => {
    if (replaysLeft <= 0) return
    const a = ref.current; if (!a) return
    setReplaysLeft((n) => n - 1)
    a.currentTime = 0
    void a.play().catch(() => {})
  }
  // 기본 버튼: 재생 끝난 뒤 다시 누르면 처음부터 재생(=다시 듣기 소진), 일시정지 상태면 이어재생(무료).
  const toggle = () => {
    const a = ref.current; if (!a) return
    if (a.ended) { startOver(); return }
    if (a.paused) void a.play().catch(() => {})
    else a.pause()
  }
  const canReplay = replaysLeft > 0

  return (
    <div className="bg-[#F0F5FF] border border-[#BFD9FF] rounded-2xl p-4 flex items-center gap-3 mt-4">
      <button onClick={toggle} aria-label={playing ? '일시정지' : '재생'}
        className="w-12 h-12 rounded-full bg-[#2277F0] flex items-center justify-center shrink-0 shadow-md active:scale-95">
        {playing
          ? <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          : <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5"><polygon points="6 4 20 12 6 20 6 4" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm font-bold text-[#1A2B4B] mb-1.5">듣기 음원 · 보기 A~D{playing ? ' · 재생 중…' : ''}</p>
        <div className="h-1.5 bg-[#DBEAFE] rounded-full overflow-hidden"><div className="h-full bg-[#2277F0] rounded-full transition-all duration-100" style={{ width: `${prog}%` }} /></div>
      </div>
      <button onClick={startOver} disabled={!canReplay} aria-label="다시 듣기"
        title={canReplay ? '다시 듣기 (1회)' : '다시 듣기 완료'}
        className="flex items-center gap-1 h-9 pl-2.5 pr-3 rounded-full bg-white border border-[#BFD9FF] text-[#2277F0] hover:bg-[#EFF6FF] shrink-0 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
        {canReplay ? '다시 듣기' : '완료'}
      </button>
    </div>
  )
}

/* ── 실전 화면 (학생 주도: 혼자 풀기 → 채점 → 오답 강사 해설) ── */

function PracticeView({ questions, partName, isPlaceholder, onFinish, onEnd }: {
  questions: UiDbQuestion[]
  partName: string
  isPlaceholder: boolean
  onFinish: (wrong: { q: UiDbQuestion; chosen?: string }[]) => void
  onEnd: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [graded, setGraded] = useState(false)

  const total = questions.length
  const q = questions[idx]
  const chosen = q ? answers[q.code] : undefined
  const correctLabelOf = (qq: UiDbQuestion) => qq.options.find((o) => o.correct)?.label

  const pick = (label: string) => { if (q) setAnswers((a) => ({ ...a, [q.code]: label })) }
  const next = () => { if (idx < total - 1) setIdx(idx + 1); else setGraded(true) }

  const TopBar = ({ label }: { label: string }) => (
    <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-2">
        <span className="bg-[#F59E0B]/15 text-[#B45309] text-xs font-bold px-3 py-1 rounded-full">{partName}</span>
        <span className="text-[13px] font-bold text-gray-600">{label}</span>
      </div>
      <button onClick={onEnd} className="text-[13px] font-bold text-gray-400 hover:text-gray-600">수업 종료 ✕</button>
    </div>
  )

  if (total === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 bg-[#f0f4f8]">
        <p className="text-sm text-gray-500">실전 문제가 아직 없어요.</p>
        <button onClick={() => onFinish([])} className="px-5 py-2.5 rounded-xl bg-[#2277F0] text-white text-sm font-bold">계속</button>
      </div>
    )
  }

  /* 채점 결과 + 오답 해설 */
  if (graded) {
    const correctCount = questions.filter((qq) => answers[qq.code] === correctLabelOf(qq)).length
    // 강사 오답 코칭 대상 — 틀린(또는 미응답) 문항 + 학생이 고른 오답 라벨
    const wrong = questions
      .filter((qq) => answers[qq.code] !== correctLabelOf(qq))
      .map((qq) => ({ q: qq, chosen: answers[qq.code] }))
    return (
      <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
        <TopBar label="실전 결과" />
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5">
          <div className="max-w-2xl mx-auto">
            {/* 점수 카드 */}
            <div className="rounded-2xl bg-white border border-gray-100 px-6 py-5 text-center mb-5">
              <p className="text-[13px] font-semibold text-gray-400 mb-1">정오답 결과</p>
              <p className="text-3xl font-black text-[#1A2B4B]">{correctCount} <span className="text-gray-300">/ {total}</span></p>
            </div>

            {/* 문항별 리뷰 */}
            <div className="flex flex-col gap-3">
              {questions.map((qq, i) => {
                const correctOpt = qq.options.find((o) => o.correct)
                const userLabel  = answers[qq.code]
                const userOpt    = qq.options.find((o) => o.label === userLabel)
                const ok = userLabel === correctOpt?.label
                return (
                  <div key={qq.code} className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                      <span className="text-[13px] font-bold text-gray-500">문항 {i + 1}</span>
                      <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{ok ? '정답' : '오답'}</span>
                    </div>
                    <div className="px-4 py-3">
                      {qq.content.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={qq.content.image_url} alt="" className="w-full max-h-40 object-cover rounded-lg mb-3" />
                      )}
                      <p className="text-[13px] text-gray-600 mb-1">
                        내 선택: <span className={ok ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{userLabel ? `${userLabel}) ${userOpt?.text}` : '미응답'}</span>
                      </p>
                      <p className="text-[13px] text-gray-600">정답: <span className="text-[#1A2B4B] font-semibold">{correctOpt?.label}) {correctOpt?.text}</span></p>
                      {!ok && (
                        <div className="mt-3 rounded-xl bg-[#f0f4f8] px-3.5 py-3 space-y-1.5">
                          {userOpt?.explanation && (
                            <p className="text-[12px] text-red-500 leading-relaxed"><span className="font-bold">왜 오답:</span> {userOpt.explanation}</p>
                          )}
                          {correctOpt?.evidence && (
                            <p className="text-[12px] text-[#1A2B4B] leading-relaxed"><span className="font-bold text-[#2277F0]">정답 근거:</span> {correctOpt.evidence}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={() => onFinish(wrong)} className="mt-6 w-full py-3.5 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] transition-colors">
              {wrong.length ? `틀린 문제 ${wrong.length}개, 강사와 오답 복습하기 →` : '수업 마무리 →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* 풀이 모드 (선택지 클릭, 코칭 없음) */
  return (
    <div className="h-dvh flex flex-col bg-[#f0f4f8] overflow-hidden">
      <TopBar label={`실전 문제 · ${idx + 1} / ${total}`} />
      {isPlaceholder && (
        <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 md:px-8 py-2 text-[11px] text-[#B45309]">
          ※ 실전용 문항이 아직 없어 유형학습 문항으로 시연 중이에요. 실전 사진을 주면 별도 세트로 교체할게요.
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="px-5 md:px-8 py-4 md:py-5 max-w-2xl mx-auto">
          {/* 진행 인디케이터 */}
          <div className="flex items-center gap-1.5 mb-4">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#F59E0B]' : i < idx ? 'w-1.5 bg-[#F59E0B]/40' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>

          <PartContent q={q} />

          {/* 듣기 음원 — 보기 A~D가 mp3로 재생된다. 문항 전환 시 key로 새 플레이어 */}
          {q.content.audio_url && <AudioPlayer key={q.code} src={q.content.audio_url} />}

          <div className="flex flex-col gap-2 md:gap-2.5 mt-4">
            {q.options.map((o) => {
              const selected = chosen === o.label
              // 듣기 문항(음원 있음)은 보기 텍스트를 감춰 실제 듣기처럼 — 정답 리뷰에서만 텍스트 공개.
              return (
                <button key={o.label} onClick={() => pick(o.label)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border text-left transition-colors ${selected ? 'border-[#2277F0] bg-[#2277F0]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${selected ? 'border-[#2277F0] text-[#2277F0]' : 'border-gray-300 text-gray-400'}`}>{o.label}</span>
                  {q.content.audio_url
                    ? <span className="text-sm text-gray-400 font-medium">🔊 음성으로 들려요</span>
                    : <span className="text-sm md:text-[15px] leading-snug text-[#1A2B4B]">{o.text}</span>}
                </button>
              )
            })}
          </div>

          <button onClick={next} disabled={!chosen}
            className="mt-5 w-full py-3.5 rounded-xl bg-[#2277F0] text-white font-bold text-sm hover:bg-[#1a66d4] transition-colors disabled:opacity-40 disabled:hover:bg-[#2277F0]">
            {idx < total - 1 ? '다음 문항 →' : '채점하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 파트별 문항 본문 렌더러 ── */

function Label({ children }: { children: React.ReactNode }) {
  return <span className="bg-[#2277F0]/10 text-[#2277F0] text-xs md:text-sm font-bold px-3 py-1 rounded-full">{children}</span>
}

function PartContent({ q }: { q: UiDbQuestion }) {
  const c = q.content
  switch (q.part) {
    case 1:
      // 실제 사진(image_url)이 있으면 이미지를 띄운다. key_elements(정답 단서)는
      // 학생 화면에 노출하지 않는다 — 튜터 엔진(/api/tutor)만 코칭용으로 사용.
      return (
        <div>
          <div className="mb-3"><Label>사진</Label></div>
          {c.image_url ? (
            <figure className="rounded-xl overflow-hidden border border-gray-200 bg-[#0e1525]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image_url} alt={c.photo_type ?? '사진 묘사'} className="w-full max-h-[440px] object-contain" />
            </figure>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-[#f0f4f8] px-6 py-12 text-center">
              <p className="text-3xl mb-3">📷</p>
              <p className="text-sm font-semibold text-[#1A2B4B] mb-1">{c.photo_type ?? ''}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{c.key_elements ?? ''}</p>
            </div>
          )}
        </div>
      )
    case 2:
      return (
        <div>
          <div className="mb-3"><Label>질문</Label></div>
          <p className="text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">{c.question_text ?? ''}</p>
        </div>
      )
    case 3:
    case 4: {
      const lines = q.part === 3
        ? [c.dialogue_open, c.dialogue_mid, c.dialogue_end]
        : [c.talk_open, c.talk_mid, c.talk_end]
      return (
        <div>
          <div className="mb-3"><Label>{q.part === 3 ? '대화' : '담화'}</Label></div>
          <div className="flex flex-col gap-2">
            {lines.filter(Boolean).map((line, i) => (
              <p key={i} className="bg-[#f0f4f8] rounded-xl px-4 py-2.5 text-sm leading-relaxed text-[#1A2B4B]">{line}</p>
            ))}
          </div>
          {c.question_text && (
            <p className="mt-4 text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">{c.question_text}</p>
          )}
        </div>
      )
    }
    case 5:
      return (
        <div>
          <div className="mb-3"><Label>문장</Label></div>
          <p className="text-[15px] md:text-lg leading-relaxed text-[#1A2B4B] font-medium">{c.blank_sentence ?? ''}</p>
        </div>
      )
    case 6:
      return (
        <div>
          <div className="mb-3"><Label>지문</Label></div>
          <p className="whitespace-pre-line leading-relaxed text-[#1A2B4B] text-sm md:text-base">{c.passage_context ?? ''}</p>
          {c.question_text && (
            <p className="mt-4 text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">{c.question_text}</p>
          )}
        </div>
      )
    case 7:
    default:
      return (
        <div>
          <div className="mb-3"><Label>지문</Label></div>
          <p className="whitespace-pre-line leading-relaxed text-[#1A2B4B] text-sm md:text-base">{c.passage_text ?? ''}</p>
          {c.question_text && (
            <p className="mt-4 text-[15px] md:text-lg font-semibold text-[#1A2B4B] leading-relaxed">
              {c.question_number ? <span className="text-[#2277F0] font-bold mr-1.5">{c.question_number}.</span> : null}
              {c.question_text}
            </p>
          )}
        </div>
      )
  }
}
