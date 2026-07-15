import type { TypeLesson } from './types'
import { LC_LESSONS } from './lessonsLC'
import { RC_LESSONS } from './lessonsRC'

export * from './types'

/** 15유형 전체 — 내 학습 그리드 + /type-lesson 플레이어에서 사용 */
export const TYPE_LESSONS: TypeLesson[] = [...LC_LESSONS, ...RC_LESSONS]

export function getTypeLesson(id: string): TypeLesson | undefined {
  return TYPE_LESSONS.find((t) => t.id === id)
}
