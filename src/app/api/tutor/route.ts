import { NextRequest, NextResponse } from 'next/server'
import { getTutorQuestion, type TutorQuestion, type TutorStep } from '@/data/tutorContent'

/**
 * 튜터링 엔진 (manyfast F-ZBZTSD / S-CKLHED / S-XXPUSD / S-XTAZHH / S-PKUSSP / S-ESQCOF)
 *
 * 역할분담 확정: 서버가 레일·정오판정·단계전진·힌트·Fading을 소유한다.
 * 에이전트는 여기서 내려주는 directive(말투 렌더용 지시)만 받아 발화한다.
 * 모든 근거(evidence)는 DB 원문 인용만 — 에이전트는 사실을 생성하지 않는다 (S-CHNXPN).
 *
 * 목업 구동 모드: 클라이언트가 이 엔드포인트를 직접 호출하고 directive를 ElevenLabs
 * Contextual Update로 주입한다. 운영 모드에서는 동일 로직을 ElevenLabs Server Tools로 등록 (S-SGUUMH).
 */

interface Session {
  id: string
  studentId: string
  type: string
  qNumber: number
  stepIdx: number
  attempts: number   // 현재 체크포인트 누적 오답 수
  steps: TutorStep[] // Fading으로 선별된 레일
  correctCount: number
  fadingLevel: FadingLevel
}

type FadingLevel = 'full' | 'reduced' | 'minimal'

// ── mockup용 인메모리 저장소 (dev 단일 프로세스 기준) ──
const sessions = new Map<string, Session>()
// 유형별 연속 정답 누적 → Fading 판정 (S-ESQCOF / F-ZBZTSD 표)
const mastery = new Map<string, number>() // key: `${studentId}:${type}`

const TURN_RULES = [
  '── 진행 규칙 (반드시 지킨다) ──',
  '나는 매 턴 "지금 단계"로 목표를 딱 하나만 준다. 너는 그 한 가지에 대해서만 질문한다.',
  '한 턴에 질문은 딱 하나. 한두 문장 이내로 짧게 말하고 바로 멈춰서 학생 대답을 기다린다.',
  '여러 단계를 한 턴에 몰아서 진행하지 마라. 학생이 답하기 전에 절대 다음 단계로 넘어가지 마라.',
  '정답·근거는 너만 아는 정보다. 내가 "근거 공개"라고 지시하기 전에는 정답을 먼저 말하지 마라.',
  '학생 답에는 한 마디로만 짧게 반응한 뒤(맞으면 "맞아" 정도), 내가 주는 다음 지시를 따른다.',
].join('\n')

function buildFacts(q: TutorQuestion): string {
  const choices = q.choices.map((c) => `${c.id}) ${c.text}`).join('  ')
  return [
    '[현재 화면 수업 자료 — 이 내용을 근거로 직접 수업을 이끈다. 어떤 문장도 그대로 낭독하지 마라.]',
    '',
    `지문:\n${q.passage}`,
    '',
    `오늘 다루는 문제 ${q.number}번 (${q.type}):`,
    q.text,
    choices,
    `정답: ${q.answer}`,
    `정답 근거: ${q.evidence}`,
  ].join('\n')
}

function fadingLevelFor(studentId: string, type: string): FadingLevel {
  const n = mastery.get(`${studentId}:${type}`) ?? 0
  if (n >= 5) return 'minimal'
  if (n >= 3) return 'reduced'
  return 'full'
}

function selectSteps(rail: TutorStep[], level: FadingLevel): TutorStep[] {
  if (level === 'full') return rail
  if (level === 'reduced') return rail.filter((s) => s.kind === 'checkpoint') // 진행용 스텝 축소
  // minimal: 정답 선택 체크포인트만 (문제+즉시채점에 가까움)
  const core = rail.filter((s) => s.id === 's6')
  return core.length ? core : rail.filter((s) => s.kind === 'checkpoint').slice(-1)
}

function stepInstruction(step: TutorStep): string {
  return `지금 단계: ${step.objective}\n이 한 가지만 짧게 물어라. 묻고 바로 멈춰서 학생 대답을 기다려라.`
}

/** S-XXPUSD 키워드 매칭. 음성→텍스트 변환 답변과 대조 */
function grade(step: TutorStep, text: string): { matched: string[] } {
  const t = text.toLowerCase()
  const matched = (step.keywords ?? []).filter((k) => t.includes(k.toLowerCase()))
  return { matched }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action: string = body.action

    // ── 세션 시작 ──
    if (action === 'start') {
      const studentId: string = body.studentId ?? 'demo'
      const qNumber: number = body.questionNumber ?? 148
      const q = getTutorQuestion(qNumber)
      if (!q) return NextResponse.json({ error: 'question not found' }, { status: 404 })

      const level = fadingLevelFor(studentId, q.type)
      const steps = selectSteps(q.rail, level)
      const id = crypto.randomUUID()
      sessions.set(id, {
        id, studentId, type: q.type, qNumber, stepIdx: 0,
        attempts: 0, steps, correctCount: 0, fadingLevel: level,
      })

      const contextual = `${buildFacts(q)}\n\n${TURN_RULES}\n\n${stepInstruction(steps[0])}`
      return NextResponse.json({ sessionId: id, fadingLevel: level, contextual })
    }

    // ── 학생 답변 처리 (체크포인트 채점 + 단계 전진/힌트, S-XTAZHH) ──
    if (action === 'answer') {
      const s = sessions.get(body.sessionId)
      if (!s) return NextResponse.json({ error: 'session not found' }, { status: 404 })
      const q = getTutorQuestion(s.qNumber)!
      const cur = s.steps[s.stepIdx]
      const text: string = String(body.text ?? '')

      // 이미 모든 단계 완료된 세션 → 추가 발화는 마무리 대화로 흘린다
      if (!cur) {
        return NextResponse.json({
          grade: 'done',
          done: true,
          contextual: '수업은 이미 끝났다. 새 문제를 풀지 말고, 학생의 말에 가볍게 응답하며 마무리 인사만 해라.',
        })
      }

      // 진행용 스텝은 채점 없이 통과
      const isCorrect = cur.kind === 'progress' ? true : grade(cur, text).matched.length > 0

      // 마지막 단계 + 정답 → 수업 종료
      const advance = (): { contextual: string; done: boolean } => {
        s.stepIdx += 1
        s.attempts = 0
        if (s.stepIdx >= s.steps.length) {
          // 회차 완료 → Fading 누적
          const key = `${s.studentId}:${s.type}`
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
          grade: 'correct',
          done: nxt.done,
          contextual: nxt.done ? nxt.contextual : `${lead}${nxt.contextual}`,
          fadingLevel: s.fadingLevel,
        })
      }

      // 오답이지만 특정 오개념 매칭 → 입력 분기 교정 (S-XTAZHH 확장)
      const t = text.toLowerCase()
      const branch = (cur.branches ?? []).find((b) =>
        b.keywords.some((k) => t.includes(k.toLowerCase())),
      )
      if (branch && s.attempts < 2) {
        s.attempts += 1
        return NextResponse.json({
          grade: 'branch',
          done: false,
          attempts: s.attempts,
          contextual: branch.directive,
        })
      }

      // 오답 → 힌트 레이어링 (S-PKUSSP). 2회까지 힌트, 그 다음 근거 공개 후 전진
      s.attempts += 1
      const hints = cur.hints ?? ['', '', '']
      if (s.attempts < 3) {
        const hint = hints[Math.min(s.attempts - 1, 2)]
        return NextResponse.json({
          grade: 'wrong',
          done: false,
          attempts: s.attempts,
          contextual:
            `학생 답이 핵심을 빗나갔다. 정답을 먼저 말하지 말고, 아래 힌트 하나만 네 말투로 짧게 주고 같은 걸 다시 물어라:\n힌트: ${hint}`,
        })
      }

      // 3회 이상 → ⑥ 정답 근거 공개 후 다음 단계 (❌→⑥ reveal→진행, S-XTAZHH)
      const reveal = cur.reveal ?? q.evidence
      const nxt = advance()
      return NextResponse.json({
        grade: 'revealed',
        done: nxt.done,
        contextual:
          `학생이 계속 막힌다. 근거만 공개해라: DB 원문 "${reveal}" 을(를) 인용하고 한 줄로 이유를 설명해라. 그 다음 ${nxt.done ? '수업을 마무리해라.' : '아래로 진행:\n' + nxt.contextual}`,
        fadingLevel: s.fadingLevel,
      })
    }

    // ── 요청형 힌트 (학생이 힌트 버튼을 눌렀을 때, S-DSIAPA) ──
    if (action === 'hint') {
      const s = sessions.get(body.sessionId)
      if (!s) return NextResponse.json({ error: 'session not found' }, { status: 404 })
      const cur = s.steps[s.stepIdx]
      const level: number = Math.min(Math.max(Number(body.level ?? 1), 1), 3)
      const hint = (cur.hints ?? ['', '', ''])[level - 1]
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
