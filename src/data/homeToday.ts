/* ── 홈 '오늘 학습' — 시연 고정 데이터 ──
 *
 * 홈 A/B(강사형 ↔ 태스크형)는 **같은 할 일 목록**을 쓴다. 실험에서 바뀌는 변수는 강사 존재
 * 하나뿐이라, 할 일 정보가 한쪽에만 있으면 반응 차이가 강사 때문인지 정보 때문인지 못 가른다.
 *
 * 진짜 진도는 lectures 테이블에서 온다. 여기 고정해 둔 이유는 curriculumSchedule.DEMO_DDAY 와
 * 같다 — FGI 는 계정 50개를 돌려 쓰는 자리라 누가 열어도 같은 화면이어야 한다.
 * 시연이 끝나면 이 파일을 실제 진도 조회로 갈아끼우면 되고, 화면은 그대로 두면 된다.
 *
 * 구성은 커리큘럼 시간표와 같은 모양이다 — 강의 3(LC 1 + RC 2) + 복습 1.
 */
import type { CoachSituation } from './instructorData'

export type TaskStatus = 'done' | 'current' | 'locked'

export interface TodayTask {
  id: string
  /** 복습은 강의와 성격이 달라서 따로 센다 (진행률·남은 시간 계산에서 갈린다) */
  kind: 'LC' | 'RC' | 'REVIEW'
  partLabel: string
  title: string
  minutes: number
  status: TaskStatus
  href: string
  /** 잠긴 줄에 붙는 사유 한 마디 */
  lockNote?: string
}

export const TODAY_TASKS: TodayTask[] = [
  { id: 't1', kind: 'LC', partLabel: 'Part 1', title: '사진 묘사 유형 잡기', minutes: 10, status: 'done', href: '/lesson/LC-P1-01' },
  { id: 't2', kind: 'RC', partLabel: 'Part 5', title: '수동태 기초 이해', minutes: 12, status: 'done', href: '/part5' },
  { id: 't3', kind: 'RC', partLabel: 'Part 5', title: '수동태 vs 능동태 구별', minutes: 12, status: 'current', href: '/part5' },
  { id: 't4', kind: 'REVIEW', partLabel: '복습', title: '동일 유형 오답 문제 풀이', minutes: 8, status: 'locked', href: '/review/1', lockNote: '오늘 강의를 끝내면 열려요' },
]

export interface TodaySummary {
  /** 강의만 센다 — 복습은 별도 */
  done: number
  total: number
  remainMin: number
  /** 지금 눌러야 할 한 줄. 강의가 다 끝났으면 복습, 그것도 끝났으면 null */
  next: TodayTask | null
  started: boolean
  /** 강의 3개를 다 끝냈는가 (복습 열림 조건) */
  lecturesDone: boolean
}

export function summarizeToday(tasks: readonly TodayTask[] = TODAY_TASKS): TodaySummary {
  const lectures = tasks.filter((t) => t.kind !== 'REVIEW')
  const done = lectures.filter((t) => t.status === 'done').length
  const lecturesDone = done === lectures.length
  /* 잠긴 복습은 남은 시간에 넣지 않는다 — 아직 할 수 없는 것을 "남았다"고 세면 숫자가 겁을 준다 */
  const remainMin = tasks
    .filter((t) => t.status === 'current' || (t.status === 'locked' && lecturesDone))
    .reduce((sum, t) => sum + t.minutes, 0)
  const next = tasks.find((t) => t.status === 'current')
    ?? (lecturesDone ? tasks.find((t) => t.kind === 'REVIEW' && t.status !== 'done') ?? null : null)
  return { done, total: lectures.length, remainMin, next, started: done > 0, lecturesDone }
}

/** 말풍선이 고를 상황. 상태에서 뽑는다 — 문구를 무작위로 돌리면 강사가 나를 모르는 티가 난다 */
export function coachSituation(s: TodaySummary): CoachSituation {
  if (s.lecturesDone) return 'done'
  return s.started ? 'resume' : 'start'
}

/** 히어로 CTA 한 줄. A·B 두 홈이 같은 문구를 쓴다 */
export function ctaLabel(s: TodaySummary): string {
  if (!s.next) return '오늘 학습 완료'
  if (s.next.kind === 'REVIEW') return '오늘 복습 열기'
  return s.started ? '이어서 학습하기' : '오늘 학습 시작하기'
}
