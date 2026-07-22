'use client'

/**
 * DB(questions/question_options) → TypeLesson 어댑터. (Phase 3-3 콘텐츠 이식 — Part1)
 *
 * 폴리시된 TypeLessonPlayer UI는 그대로 두고, 데이터 소스만 로컬 하드코딩 → DB로 바꾼다.
 * 콘텐츠(사진·보기·근거)와 레일(턴)을 실제 문항에서 만들어, 사진과 강사 발화가 어긋나지 않게 한다.
 *
 * 원칙: DB 로드 실패 시 로컬 lesson으로 폴백 (useDbQuestions). Part1만 우선 지원.
 * Part1 레일은 규칙적(관찰 → 표현 코칭 → 보기 A~D 청취 → 표현 정리)이라 문항에서 생성 가능하고,
 * 강사 발화는 콘텐츠 중립 템플릿 + DB 근거/오답이유로 채워 특정 사진에 종속되지 않는다.
 */
import type { UiDbQuestion } from '@/data/db/questionStore'
import type { TypeLesson, Turn } from './types'

/** Part1 문항 하나 → 유형학습 레일(턴 배열) */
function part1Turns(q: UiDbQuestion): Turn[] {
  const opts = q.options
  const correct = opts.find((o) => o.correct)
  const listen: Turn[] = opts.map((o, i) => ({
    no: 3 + i,
    stage: `선택지 ${o.label} · S6/S5`,
    tutor: `${o.label} 들어볼게요. 들리는 내용이 사진 속 동작·상태와 맞는지 보세요.`,
    audio: { kind: 'option', qIdx: 0, label: o.label },
    reveal: { optionText: [{ qIdx: 0, labels: [o.label] }] },
    interaction: {
      kind: 'choice',
      prompt: `${o.label}는 사진과 맞나요?`,
      choices: o.correct
        ? [{ text: '사진과 맞아요', correct: true }, { text: '사진과 달라요' }]
        : [{ text: '사진과 맞아요' }, { text: '사진과 달라요', correct: true }],
      feedback: o.correct
        ? (o.evidence ?? '사진과 일치하는 정답이에요.')
        : (o.explanation ?? '사진과 맞지 않아요.'),
    },
  }))

  return [
    {
      no: 1,
      stage: 'S1 핵심 관찰',
      tutor: '바로 보기 기다리지 말고 사진부터 볼게요. 먼저 눈에 들어오는 건 뭔가요? 사람이 중심인가요, 사물이나 배경이 중심인가요? 필기 버튼으로 사진에 직접 표시해도 좋아요.',
      interaction: { kind: 'subjective', prompt: '사진에서 먼저 눈에 들어오는 것을 말해보세요', hint: '예) 사람이 무언가를 하고 있어요' },
    },
    {
      no: 2,
      stage: 'S3 표현 코칭',
      tutor: '좋아요. 이런 사진에서는 동작(be+-ing)과 상태(be+p.p.) 표현이 정답으로 나와요. 특히 putting on(입는 중)과 wearing(이미 입은 상태)처럼 동작·상태를 바꿔치기한 함정을 조심하세요. 이제 보기를 하나씩 들어볼게요.',
      interaction: { kind: 'next', label: '선택지 듣기 시작' },
    },
    ...listen,
    {
      no: 3 + opts.length,
      stage: 'S7 표현 정리',
      tutor: correct
        ? `정리하면 정답은 ${correct.label}) ${correct.text} 예요. ${correct.evidence ?? ''}`.trim()
        : '정리해 볼게요.',
      interaction: { kind: 'next', label: '실전 문제 풀기' },
    },
  ]
}

/** 로컬 Part1 lesson + DB 문항 → DB 구동 lesson. rows[0]을 대표 문항으로 사용. */
export function buildPart1LessonFromDb(local: TypeLesson, rows: UiDbQuestion[]): TypeLesson {
  const q = rows[0]
  if (!q || q.part !== 1 || q.options.length === 0) return local
  return {
    ...local,
    content: {
      ...local.content,
      photo: q.content.image_url ?? local.content.photo,
      photoDesc: q.content.key_elements ?? q.content.photo_type ?? local.content.photoDesc,
      optionAudio: true,
      questions: [
        {
          q: q.content.question_text ?? '사진을 가장 잘 묘사한 보기를 고르시오.',
          options: q.options.map((o) => ({
            label: o.label,
            text: o.text,
            correct: o.correct,
            why: o.correct ? (o.evidence ?? undefined) : (o.explanation ?? undefined),
          })),
        },
      ],
    },
    turns: part1Turns(q),
    // recap은 세션 정리용(DB 미보유) — 로컬 유지.
  }
}
