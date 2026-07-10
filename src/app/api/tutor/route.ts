import { NextRequest, NextResponse } from 'next/server'
import { getTutorQuestion, TUTOR_RAILS, type TutorStep } from '@/data/tutorContent'
import {
  loadDbQuestion, loadStepTypes, loadLectureSteps, logAnswer, countPriorTagWrongs, normalizeLearnerId,
  type DbTutorQuestion, type DbOption, type StepTypeInfo, type LectureStep,
} from '@/lib/tutorDb'

/**
 * 튜터링 엔진 (manyfast F-ZBZTSD / S-CKLHED / S-XXPUSD / S-XTAZHH / S-PKUSSP / S-ESQCOF)
 *
 * 역할분담: 서버가 레일·정오판정·단계전진·힌트·Fading을 소유한다.
 * 에이전트(ElevenLabs)는 여기서 내려주는 directive(말투 렌더용 지시)만 받아 발화한다.
 * 모든 사실(지문·보기·정답·근거·오답이유·태그)은 Supabase DB 원문 인용만 (S-CHNXPN).
 *
 * 세 가지 수업 모드 (start의 lessonType으로 선택):
 *  - rail 모드 (유형학습·손질): 문항별로 손질된 레일(TUTOR_RAILS)이 있으면 그 순서로 진행.
 *    keywords/hints/branches 채점 장치 포함 — 대표 문항용.
 *  - sheetRail 모드 (유형학습·시트): lessonType='lesson'이고 손질 레일이 없으면,
 *    강의의 lecture_steps(시트 유형학습_G 탭 이관분)를 순서대로 진행.
 *    채점 장치가 없어 학생 반응마다 다음 단계로 전진하는 "진행 지시"형.
 *  - tag 모드 (실전문제): lessonType='practice' 또는 레일이 전혀 없을 때. 시트 설계 그대로
 *    S0 자력풀이 → 정답: S5 축약 종료 / 오답: 태그 조회 → 태그의 단계 시퀀스 실행.
 *    동일 태그 반복 오답 시 repeat_extra_step의 단계를 추가한다.
 *  lessonType 미지정 시 기존 동작 유지: TUTOR_RAILS 있으면 rail, 없으면 tag.
 */

// 기존 화면들이 쓰던 legacy questionNumber → DB question_code 매핑
const LEGACY_CODE: Record<number, string> = {
  148: 'RC-P7-03-Q006',  // Part7 자동차 광고 — why 이유 문제
  5008: 'RC-P5-08-Q002', // Part5 수동태 (technical issues)
}

/** 온보딩 강사 식별자(InstructorSelect id) → lecture_steps.instructor_code.
 *  스캐폴딩 레일이 이관된 강사만 자기 레일을 쓰고, 나머지는 common(공통 기본 설계)으로 폴백.
 *  · 박혜원  — 강사 레일 미작성 → common
 *  · 윤다은/이도윤 — Part1 레일 이관 완료 → 자기 레일
 *  · 서지안/오정자 — 미이관 → common */
const INSTRUCTOR_CODE: Record<string, string> = {
  park_hyewon: 'common',
  yun_daeun: 'yun_daeun',
  lee_doyun: 'lee_doyun',
  seo_jian: 'common',
  oh_jungja: 'common',
}
function instructorCodeOf(raw: unknown): string {
  const v = typeof raw === 'string' ? raw : ''
  return INSTRUCTOR_CODE[v] ?? (v === 'yun_daeun' || v === 'lee_doyun' ? v : 'common')
}

type FadingLevel = 'full' | 'reduced' | 'minimal'

interface RailSession {
  mode: 'rail'
  id: string
  learnerId: string
  questionCode: string
  lectureCode: string
  stepIdx: number
  attempts: number
  steps: TutorStep[]
  correctCount: number
  fadingLevel: FadingLevel
  facts: RailFacts
}

interface CoachStep {
  code: string      // 'S1' (복합 표기 'S1/S2'는 원문 유지)
  name: string
  role: string
  summary: string | null // 태그 step_summary에서 이 단계에 해당하는 줄
}

interface TagSession {
  mode: 'tag'
  id: string
  learnerId: string
  questionCode: string
  phase: 'answering' | 'coaching' | 'done'
  q: DbTutorQuestion
  chosen?: DbOption
  coach: CoachStep[]
  stepIdx: number
}

interface SheetRailSession {
  mode: 'sheetRail'
  id: string
  learnerId: string
  questionCode: string
  q: DbTutorQuestion
  steps: LectureStep[]
  stepIdx: number
  done: boolean
}

type Session = RailSession | TagSession | SheetRailSession

// mockup용 인메모리 저장소 (dev 단일 프로세스 기준)
const sessions = new Map<string, Session>()
// Server Tool용: (학생+문항) 키 → sessionId. 에이전트가 sessionId를 들고 다니지 않아도 세션을 찾게 함.
const sessionByKey = new Map<string, string>()
const sessionKey = (learnerId: string, questionCode: string) => `${learnerId}:${questionCode}`
// 강의코드별 연속 완료 누적 → Fading 판정 (rail 모드)
const mastery = new Map<string, number>()

const TURN_RULES = [
  '── 진행 규칙 (반드시 지킨다) ──',
  '나는 매 턴 "지금 단계"로 목표를 딱 하나만 준다. 너는 그 한 가지에 대해서만 질문한다.',
  '한 턴에 질문은 딱 하나. 한두 문장 이내로 짧게 말하고 바로 멈춰서 학생 대답을 기다린다.',
  '여러 단계를 한 턴에 몰아서 진행하지 마라. 학생이 답하기 전에 절대 다음 단계로 넘어가지 마라.',
  '정답·근거는 너만 아는 정보다. 내가 "근거 공개"라고 지시하기 전에는 정답을 먼저 말하지 마라.',
  '학생 답에는 한 마디로만 짧게 반응한 뒤(맞으면 "맞아" 정도), 내가 주는 다음 지시를 따른다.',
].join('\n')

/* ── DB 문항 → 에이전트 주입용 facts ── */

interface RailFacts { text: string; evidence: string }

function questionBody(q: DbTutorQuestion): string {
  const c = q.content
  switch (q.part) {
    case 1:
      return `사진 설명: ${c.key_elements ?? ''} (사진 유형: ${c.photo_type ?? ''})`
    case 5:
      return `문장:\n${c.blank_sentence ?? ''}`
    case 6:
      return `지문:\n${c.passage_context ?? ''}\n\n${c.question_text ?? ''}`
    case 7:
      return `지문:\n${c.passage_text ?? ''}\n\n문제: ${c.question_text ?? ''}`
    default:
      return `문제: ${c.question_text ?? ''}`
  }
}

function buildFacts(q: DbTutorQuestion): RailFacts {
  const choices = q.options.map((o) => `${o.label}) ${o.text}`).join('  ')
  const wrongLines = q.options
    .filter((o) => !o.correct)
    .map((o) => `- ${o.label}) ${o.text} → ${o.explanation ?? ''}${o.tag ? ` [오답 태그: ${o.tag.name}]` : ''}`)
    .join('\n')
  const text = [
    '[현재 화면 수업 자료 — 이 내용을 근거로 직접 수업을 이끈다. 어떤 문장도 그대로 낭독하지 마라.]',
    '',
    questionBody(q),
    '',
    `강의: ${q.lectureTitle} (${q.lectureCode})`,
    `보기: ${choices}`,
    `정답: ${q.answerLabel}) ${q.answerText}`,
    `정답 근거: ${q.evidence}`,
    '',
    '보기별 오답 이유 (DB 원문 — 인용만, 새로 지어내지 마라):',
    wrongLines,
  ].join('\n')
  return { text, evidence: q.evidence }
}

/* ── rail 모드 (기존 로직 유지) ── */

function fadingLevelFor(learnerId: string, lectureCode: string): FadingLevel {
  const n = mastery.get(`${learnerId}:${lectureCode}`) ?? 0
  if (n >= 5) return 'minimal'
  if (n >= 3) return 'reduced'
  return 'full'
}

function selectSteps(rail: TutorStep[], level: FadingLevel): TutorStep[] {
  if (level === 'full') return rail
  if (level === 'reduced') return rail.filter((s) => s.kind === 'checkpoint')
  const core = rail.filter((s) => s.id === 's6')
  return core.length ? core : rail.filter((s) => s.kind === 'checkpoint').slice(-1)
}

function stepInstruction(step: TutorStep): string {
  return `지금 단계: ${step.objective}\n이 한 가지만 짧게 물어라. 묻고 바로 멈춰서 학생 대답을 기다려라.`
}

function grade(step: TutorStep, text: string): { matched: string[] } {
  const t = text.toLowerCase()
  const matched = (step.keywords ?? []).filter((k) => t.includes(k.toLowerCase()))
  return { matched }
}

/* ── tag 모드 (실전문제: 시트의 오답태그별 진단 매핑 그대로) ── */

/** 학생 발화에서 선택 보기 판별 (라벨 문자 / 한글 라벨 / 보기 원문 포함) */
function matchOption(q: DbTutorQuestion, text: string): DbOption | null {
  const t = text.trim().toLowerCase()
  const hangul: Record<string, string> = { '에이': 'a', '비': 'b', '씨': 'c', '디': 'd' }
  const label = /^([a-d])\s*[).\s]?/.exec(t)?.[1]
    ?? Object.entries(hangul).find(([k]) => t.startsWith(k))?.[1]
  if (label) {
    const byLabel = q.options.find((o) => o.label.toLowerCase() === label)
    if (byLabel) return byLabel
  }
  return q.options.find((o) => t.includes(o.text.toLowerCase())) ?? null
}

/** step_summary("S1: ... / S6: ...")에서 특정 코드의 요약 줄 추출 */
function summaryFor(stepSummary: string | null, code: string): string | null {
  if (!stepSummary) return null
  for (const part of stepSummary.split(' / ')) {
    const m = /^\s*(S[0-9+/]+)\s*:\s*(.+)$/.exec(part)
    if (m && m[1] === code) return m[2].trim()
  }
  return null
}

/** 복합 표기('S1/S2')는 앞 코드로 step_types를 조회하되 표기는 원문 유지 */
function buildCoachSteps(codes: string[], stepSummary: string | null, stepTypes: Map<string, StepTypeInfo>): CoachStep[] {
  return codes.map((code) => {
    const primary = code.split('/')[0].split('+')[0]
    const st = stepTypes.get(primary)
    return {
      code,
      name: st?.name ?? code,
      role: st?.role ?? '',
      summary: summaryFor(stepSummary, code),
    }
  })
}

/** repeat_extra_step 텍스트에서 추가 단계 코드 추출 (예: "동일 태그 반복 시 S2 ... 추가" → 'S2') */
function extraStepCode(repeatExtra: string | null): string | null {
  if (!repeatExtra) return null
  const m = /S([1-7])/.exec(repeatExtra)
  return m ? `S${m[1]}` : null
}

function coachDirective(s: TagSession, step: CoachStep, isFirst: boolean): string {
  const lines: string[] = []
  if (isFirst && s.chosen?.tag) {
    const t = s.chosen.tag
    lines.push(
      `학생이 오답 ${s.chosen.label}) ${s.chosen.text} 를 골랐다.`,
      `오답 태그: ${t.name} (${t.meaning})`,
      t.missedPoint ? `학생이 놓친 지점: ${t.missedPoint}` : '',
      '정답은 아직 절대 말하지 마라. 아래 단계부터 시작한다.',
      '',
    )
  }
  lines.push(`지금 단계: ${step.code} ${step.name} — ${step.role}`)
  if (step.summary) lines.push(`이 단계에서 제공할 내용: ${step.summary}`)

  const primary = step.code.split('/')[0].split('+')[0]
  if (primary === 'S6' && s.chosen) {
    lines.push(`학생이 고른 오답의 이유(DB 원문 인용): "${s.chosen.explanation ?? ''}"`)
  }
  if (primary === 'S5') {
    lines.push(`근거 공개를 허용한다. 정답 ${s.q.answerLabel}) ${s.q.answerText} 와 근거를 연결해라: "${s.q.evidence}"`)
  }
  lines.push('이 한 가지만 짧게 진행해라. 한두 문장으로 말하고 멈춰서 학생 반응을 기다려라.')
  return lines.filter(Boolean).join('\n')
}

const S0_DIRECTIVE = [
  '지금 단계: S0 자력 풀이.',
  '코칭이나 힌트 없이 문제만 제시하고, 학생이 보기 중 하나를 스스로 고르게 해라.',
  '문제를 짧게 소개하고 "몇 번일 것 같아?" 정도로만 묻고 멈춰라. 정답·근거는 절대 언급하지 마라.',
].join('\n')

/* ── sheetRail 모드 (유형학습: lecture_steps 시트 레일) ── */

function sheetStepDirective(s: SheetRailSession, step: LectureStep): string {
  const lines = [
    `지금 단계: ${step.code} — ${step.rule}`,
  ]
  if (step.dbFields && !step.dbFields.startsWith('(없음')) {
    lines.push(`이 단계에서 참조할 문항 정보: ${step.dbFields} — 세션 자료(위 수업 자료)의 해당 값만 인용하고 새로 지어내지 마라.`)
  }
  const code = step.code
  if (/S6/.test(code)) {
    const wrongs = s.q.options.filter((o) => !o.correct)
      .map((o) => `${o.label}) "${o.explanation ?? ''}"${o.tag ? ` [${o.tag.name}]` : ''}`).join(' / ')
    lines.push(`보기별 오답 이유(DB 원문 인용만): ${wrongs}`)
  }
  if (/S5/.test(code)) {
    lines.push(`근거 공개를 허용한다. 정답 ${s.q.answerLabel}) ${s.q.answerText} 와 근거를 연결해라: "${s.q.evidence}"`)
  } else if (!/S6/.test(code)) {
    lines.push('정답·근거는 아직 말하지 마라.')
  }
  if (step.freeExpression) lines.push(`(말투·표현만 자유: ${step.freeExpression})`)
  lines.push('이 한 가지만 짧게 진행해라. 한두 문장으로 말하고 멈춰서 학생 반응을 기다려라.')
  return lines.join('\n')
}

/* ── 핸들러 ── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action: string = body.action

    if (action === 'start') {
      const learnerId = normalizeLearnerId(body.studentId)
      const questionCode: string | undefined =
        body.questionCode ?? (body.questionNumber != null ? LEGACY_CODE[body.questionNumber] : undefined)
      if (!questionCode) return NextResponse.json({ error: 'questionCode required' }, { status: 400 })

      const q = await loadDbQuestion(questionCode)
      if (!q) {
        // DB 접근 불가(env 미설정 등) 시 legacy 하드코딩으로 폴백 — 데모가 죽지 않게
        const legacy = body.questionNumber != null ? getTutorQuestion(body.questionNumber) : undefined
        if (!legacy) return NextResponse.json({ error: 'question not found' }, { status: 404 })
        return startLegacy(legacy, learnerId)
      }

      const facts = buildFacts(q)
      // lessonType: 'lesson'(유형학습) | 'practice'(실전문제) | 미지정(기존 동작)
      const lessonType: string | undefined = body.lessonType
      const instructorCode = instructorCodeOf(body.instructor) // 강사별 레일 선택 (없으면 common)
      const rail = lessonType === 'practice' ? undefined : TUTOR_RAILS[questionCode]
      const id = crypto.randomUUID()
      sessionByKey.set(sessionKey(learnerId, questionCode), id) // Server Tool이 sessionId 없이 세션 찾게

      // 유형학습 요청 + 손질 레일 없음 → 강의의 시트 레일(lecture_steps)로 진행. 강사별 레일 우선, 없으면 common.
      if (lessonType === 'lesson' && !rail) {
        const steps = await loadLectureSteps(q.lectureCode, instructorCode)
        if (steps.length) {
          const session: SheetRailSession = {
            mode: 'sheetRail', id, learnerId, questionCode, q, steps, stepIdx: 0, done: false,
          }
          sessions.set(id, session)
          const contextual = `${facts.text}\n\n${TURN_RULES}\n\n${sheetStepDirective(session, steps[0])}`
          return NextResponse.json({
            sessionId: id, mode: 'sheetRail', lectureCode: q.lectureCode, instructor: instructorCode,
            steps: steps.map((st) => st.code), contextual,
          })
        }
      }

      if (rail) {
        const level = fadingLevelFor(learnerId, q.lectureCode)
        const steps = selectSteps(rail, level)
        sessions.set(id, {
          mode: 'rail', id, learnerId, questionCode, lectureCode: q.lectureCode,
          stepIdx: 0, attempts: 0, steps, correctCount: 0, fadingLevel: level, facts,
        })
        const contextual = `${facts.text}\n\n${TURN_RULES}\n\n${stepInstruction(steps[0])}`
        return NextResponse.json({ sessionId: id, mode: 'rail', fadingLevel: level, contextual, quickReplies: steps[0].quickReplies })
      }

      sessions.set(id, {
        mode: 'tag', id, learnerId, questionCode, phase: 'answering', q, coach: [], stepIdx: 0,
      })
      const contextual = `${facts.text}\n\n${TURN_RULES}\n\n${S0_DIRECTIVE}`
      return NextResponse.json({
        sessionId: id, mode: 'tag', contextual,
        quickReplies: q.options.map((o) => `${o.label}) ${o.text}`),
      })
    }

    if (action === 'answer') {
      // sessionId 직접 전달(클라이언트) 또는 학생+문항 키로 조회(Server Tool)
      let sid: string | undefined = body.sessionId
      if (!sid && body.studentId && body.questionCode) {
        sid = sessionByKey.get(sessionKey(normalizeLearnerId(body.studentId), String(body.questionCode)))
      }
      const s = sid ? sessions.get(sid) : undefined
      if (!s) return NextResponse.json({ error: 'session not found' }, { status: 404 })
      // Server Tool은 student_reply, 클라이언트는 text 로 학생 발화를 넘긴다
      const text: string = String(body.text ?? body.student_reply ?? '')
      if (s.mode === 'rail') return answerRail(s, text)
      if (s.mode === 'sheetRail') return answerSheetRail(s)
      return await answerTag(s, text)
    }

    if (action === 'hint') {
      const s = sessions.get(body.sessionId)
      if (!s || s.mode !== 'rail') return NextResponse.json({ error: 'session not found' }, { status: 404 })
      const cur = s.steps[s.stepIdx]
      const level: number = Math.min(Math.max(Number(body.level ?? 1), 1), 3)
      const hint = (cur?.hints ?? ['', '', ''])[level - 1]
      return NextResponse.json({
        contextual: `학생이 힌트를 요청했다(${level}단계). 정답을 통째로 말하지 말고 아래만 네 말투로 전달해라:\n힌트: ${hint}`,
        isAnswerReveal: level >= 3,
      })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[/api/tutor] error', e)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

/* ── rail 모드 답변 처리 (기존 로직) ── */

function answerRail(s: RailSession, text: string) {
  const cur = s.steps[s.stepIdx]

  if (!cur) {
    return NextResponse.json({
      grade: 'done', done: true,
      contextual: '수업은 이미 끝났다. 새 문제를 풀지 말고, 학생의 말에 가볍게 응답하며 마무리 인사만 해라.',
    })
  }

  const isCorrect = cur.kind === 'progress' ? true : grade(cur, text).matched.length > 0

  const advance = (): { contextual: string; done: boolean } => {
    s.stepIdx += 1
    s.attempts = 0
    if (s.stepIdx >= s.steps.length) {
      const key = `${s.learnerId}:${s.lectureCode}`
      mastery.set(key, (mastery.get(key) ?? 0) + 1)
      return {
        done: true,
        contextual: '모든 단계 완료. 더 새 질문을 던지지 말고, 학생이 방금 정리한 핵심을 한 문장으로 확인해 주며 수업을 마무리해라.',
      }
    }
    return { done: false, contextual: stepInstruction(s.steps[s.stepIdx]) }
  }

  if (isCorrect) {
    s.correctCount += 1
    const nxt = advance()
    const lead = cur.kind === 'progress' ? '' : '학생 답을 정답으로 처리했다. 짧게 "맞아" 정도로만 반응하고, '
    return NextResponse.json({
      grade: 'correct', done: nxt.done,
      contextual: nxt.done ? nxt.contextual : `${lead}${nxt.contextual}`,
      fadingLevel: s.fadingLevel,
      quickReplies: nxt.done ? undefined : s.steps[s.stepIdx].quickReplies,
    })
  }

  const t = text.toLowerCase()
  const branch = (cur.branches ?? []).find((b) => b.keywords.some((k) => t.includes(k.toLowerCase())))
  if (branch && s.attempts < 2) {
    s.attempts += 1
    return NextResponse.json({
      grade: 'branch', done: false, attempts: s.attempts,
      contextual: branch.directive, quickReplies: cur.quickReplies,
    })
  }

  s.attempts += 1
  const hints = cur.hints ?? ['', '', '']
  if (s.attempts < 3) {
    const hint = hints[Math.min(s.attempts - 1, 2)]
    return NextResponse.json({
      grade: 'wrong', done: false, attempts: s.attempts,
      contextual: `학생 답이 핵심을 빗나갔다. 정답을 먼저 말하지 말고, 아래 힌트 하나만 네 말투로 짧게 주고 같은 걸 다시 물어라:\n힌트: ${hint}`,
      quickReplies: cur.quickReplies,
    })
  }

  const reveal = cur.reveal ?? s.facts.evidence
  const nxt = advance()
  return NextResponse.json({
    grade: 'revealed', done: nxt.done,
    contextual: `학생이 계속 막힌다. 근거만 공개해라: DB 원문 "${reveal}" 을(를) 인용하고 한 줄로 이유를 설명해라. 그 다음 ${nxt.done ? '수업을 마무리해라.' : '아래로 진행:\n' + nxt.contextual}`,
    fadingLevel: s.fadingLevel,
    quickReplies: nxt.done ? undefined : s.steps[s.stepIdx].quickReplies,
  })
}

/* 이 단계가 "선택지를 듣는" 단계인지 — 단계 규칙/역할 문구로 판정.
   맞으면 클라이언트가 이 시점에 듣기 음원을 재생한다("적절한 때"= 스캐폴딩이 정한 듣기 단계). */
function stepWantsAudio(text: string | null | undefined): boolean {
  return /들으|들어|듣기|음원/.test(text ?? '')
}

/* ── sheetRail 모드 답변 처리: 채점 장치가 없으므로 학생 반응마다 다음 단계로 전진 ── */

function answerSheetRail(s: SheetRailSession) {
  if (s.done) {
    return NextResponse.json({
      grade: 'done', done: true,
      contextual: '수업은 이미 끝났다. 학생의 말에 가볍게 응답하며 마무리 인사만 해라.',
    })
  }
  s.stepIdx += 1
  if (s.stepIdx >= s.steps.length) {
    s.done = true
    return NextResponse.json({
      grade: 'done', done: true,
      contextual: '모든 단계 완료. 학생이 오늘 배운 유형에서 뭘 먼저 봐야 하는지 한 문장으로 말하게 하고, 짧게 확인해 주며 수업을 마무리해라.',
    })
  }
  const step = s.steps[s.stepIdx]
  return NextResponse.json({
    grade: 'progress', done: false, step: step.code,
    playAudio: stepWantsAudio(step.rule), // 듣기 단계에 도달하면 클라이언트가 음원 재생
    contextual: sheetStepDirective(s, step),
  })
}

/* ── tag 모드 답변 처리 (S0 → 태그 조회 → 단계 시퀀스) ── */

async function answerTag(s: TagSession, text: string) {
  if (s.phase === 'done') {
    return NextResponse.json({
      grade: 'done', done: true,
      contextual: '수업은 이미 끝났다. 학생의 말에 가볍게 응답하며 마무리 인사만 해라.',
    })
  }

  if (s.phase === 'answering') {
    const chosen = matchOption(s.q, text)
    if (!chosen) {
      return NextResponse.json({
        grade: 'retry', done: false,
        contextual: '학생 답에서 보기를 특정할 수 없다. 보기 A~D 중 하나를 골라 달라고 짧게 다시 안내해라.',
        quickReplies: s.q.options.map((o) => `${o.label}) ${o.text}`),
      })
    }

    await logAnswer(s.learnerId, s.questionCode, chosen.label, chosen.correct)

    if (chosen.correct) {
      // 시트 규칙: 정답 시 S5(근거 연결)만 축약 제시 후 종료. S1~S4, S6, S7 생략.
      s.phase = 'done'
      return NextResponse.json({
        grade: 'correct', done: true,
        contextual: `정답이다. 짧게 칭찬하고, S5 근거 연결만 축약해서 한 문장으로 짚어줘라: "${s.q.evidence}" 그리고 수업을 마무리해라.`,
      })
    }

    s.chosen = chosen
    const tag = chosen.tag
    if (!tag) {
      s.phase = 'done'
      return NextResponse.json({
        grade: 'wrong', done: true,
        contextual: `오답이다. 근거를 공개해라: 정답 ${s.q.answerLabel}) ${s.q.answerText} — "${s.q.evidence}" 를 인용해 한 줄로 설명하고 마무리해라.`,
      })
    }

    // 태그의 기본 단계 시퀀스 + 동일 태그 반복 시 추가 단계 (시트 "반복 오답 시 추가 단계")
    const stepTypes = await loadStepTypes()
    let codes = [...tag.steps]
    const prior = await countPriorTagWrongs(s.learnerId, tag.id) - 1 // 방금 기록한 1건 제외
    const extra = extraStepCode(tag.repeatExtra)
    if (prior >= 1 && extra && !codes.includes(extra)) {
      // 개념·판별 재학습(S2/S3)은 코칭 앞에, 정리(S7 등)는 뒤에 붙인다
      codes = extra === 'S2' || extra === 'S3' ? [extra, ...codes] : [...codes, extra]
    }

    s.coach = buildCoachSteps(codes, tag.stepSummary, stepTypes)
    s.stepIdx = 0
    s.phase = 'coaching'
    return NextResponse.json({
      grade: 'wrong', done: false,
      diagnosis: { tag: tag.name, category: tag.diagnosticName, steps: codes, repeated: prior >= 1 },
      playAudio: stepWantsAudio(s.coach[0].role),
      contextual: coachDirective(s, s.coach[0], true),
    })
  }

  // coaching: 단계는 "제공 단계"이므로 학생 반응마다 다음 단계로 진행 (시트 실전문제 흐름)
  s.stepIdx += 1
  if (s.stepIdx >= s.coach.length) {
    s.phase = 'done'
    return NextResponse.json({
      grade: 'done', done: true,
      contextual: '코칭 단계가 모두 끝났다. 학생이 이해했는지 한 문장으로 확인하고, 같은 유형에서 뭘 먼저 볼지 한 줄로 정리해 주며 마무리해라.',
    })
  }
  return NextResponse.json({
    grade: 'coaching', done: false,
    playAudio: stepWantsAudio(s.coach[s.stepIdx].role),
    contextual: coachDirective(s, s.coach[s.stepIdx], false),
  })
}

/* ── DB 불가 시 legacy 폴백 (기존 tutorContent 하드코딩 그대로) ── */

function startLegacy(q: NonNullable<ReturnType<typeof getTutorQuestion>>, learnerId: string) {
  const level = fadingLevelFor(learnerId, q.type)
  const steps = selectSteps(q.rail, level)
  const id = crypto.randomUUID()
  const choices = q.choices.map((c) => `${c.id}) ${c.text}`).join('  ')
  const factsText = [
    '[현재 화면 수업 자료 — 이 내용을 근거로 직접 수업을 이끈다. 어떤 문장도 그대로 낭독하지 마라.]',
    '', `지문:\n${q.passage}`, '', `오늘 다루는 문제 ${q.number}번 (${q.type}):`, q.text, choices,
    `정답: ${q.answer}`, `정답 근거: ${q.evidence}`,
  ].join('\n')
  sessions.set(id, {
    mode: 'rail', id, learnerId, questionCode: `legacy-${q.number}`, lectureCode: q.type,
    stepIdx: 0, attempts: 0, steps, correctCount: 0, fadingLevel: level,
    facts: { text: factsText, evidence: q.evidence },
  })
  return NextResponse.json({
    sessionId: id, mode: 'rail', fadingLevel: level,
    contextual: `${factsText}\n\n${TURN_RULES}\n\n${stepInstruction(steps[0])}`,
    quickReplies: steps[0].quickReplies,
  })
}
