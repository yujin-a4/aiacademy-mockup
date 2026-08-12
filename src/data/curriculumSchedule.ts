/* ── FGI 커리큘럼 시간표 (2주) ──
 *
 * 원본: "박혜원 · W형(골고루) — 750+ 2주" 표 (image_reference/스크린샷 2026-08-11 151148.png)
 *
 * **FGI 에서는 강사가 누구든 이 시간표 하나를 쓴다.** 원래는 강사 × 학습자 유형 × 목표점수 ×
 * 기간의 격자에서 한 칸이지만, FGI 는 스캐폴딩 하나만 보는 자리라 커리큘럼을 변수로 두지 않는다.
 * 나중에 조합이 늘면 이 파일이 아니라 DB 테이블로 옮겨야 한다(그때 화면은 그대로 두면 된다).
 *
 * 하루 = 강의 3 + 복습 1.
 *   강의 3 : LC 1 + RC 2 로 고정 — 'W형(골고루)'이 이 배치로 나타난다
 *   복습 1 : 그날 세 강의에서 **틀린 유형으로 새 문제를 내주는** 세션. 순서가 아니라 오답에 매달린다
 *
 * 숫자는 lectures.seq (커리큘럼 42강 번호) 다. 제목은 여기 적지 않는다 — DB 가 정본이고,
 * 제목을 두 군데 두면 반드시 어긋난다.
 *
 * 순서가 번호순이 아닌 곳이 있다(D5=6강 → D6=5강, D11=39강 → 38강). 표를 그대로 옮긴 것이다.
 * 42강 중 **36강만 쓴다.** 2주에 안 들어간 6강: 8·11·13·15(LC P3·P4), 41·42(P7 이중·삼중 지문).
 */

/** 시연 동안 화면에 고정으로 띄우는 D-day.
 *
 *  원래 이 값은 학습자 프로필의 시험일에서 계산된다 — 그래서 **계정마다 다른 숫자가 뜬다.**
 *  FGI 는 참가자 계정을 50개 돌려 쓰는 자리라, 누가 열어도 같은 화면이어야 한다.
 *  시연이 끝나면 `null` 로 되돌리면 원래 계산이 다시 산다(지우는 곳은 이 한 줄뿐이다).
 *  12일 = 이 시간표의 길이 — 플랜을 마치는 날이 곧 시험날이라는 그림이다. */
export const DEMO_DDAY: string | null = 'D-12'

export interface ScheduleDay {
  /** D1 ~ D12 */
  day: number
  week: 1 | 2
  /** 그날 강의 세 개 (lectures.seq). 표의 강의1·2·3 순서 그대로 */
  lectures: [number, number, number]
}

export const FGI_SCHEDULE: ScheduleDay[] = [
  { day: 1,  week: 1, lectures: [1, 17, 18] },
  { day: 2,  week: 1, lectures: [2, 19, 20] },
  { day: 3,  week: 1, lectures: [3, 21, 22] },
  { day: 4,  week: 1, lectures: [4, 23, 24] },
  { day: 5,  week: 1, lectures: [6, 25, 26] },
  { day: 6,  week: 1, lectures: [5, 27, 28] },
  { day: 7,  week: 2, lectures: [7, 29, 30] },
  { day: 8,  week: 2, lectures: [9, 31, 32] },
  { day: 9,  week: 2, lectures: [10, 35, 36] },
  { day: 10, week: 2, lectures: [12, 33, 34] },
  { day: 11, week: 2, lectures: [16, 39, 38] },
  { day: 12, week: 2, lectures: [14, 37, 40] },
]

/** 매일 마지막에 도는 복습 세션의 이름 — 화면 여러 곳에서 같은 말을 써야 해서 여기 둔다 */
export const REVIEW_LABEL = '동일 유형 오답 문제 풀이'

/** FGI 에서 실제로 시연할 강의(표의 노란 칸). **화면에는 드러내지 않는다** —
 *  참가자가 보는 목록에 '시연용' 표시가 뜨면 그 강의만 특별한 것처럼 보인다. 내부 확인용. */
export const FGI_DEMO_SEQ = new Set([1, 24])

/** 이 시간표에 들어간 강의 번호 전부 (36개) */
export const SCHEDULED_SEQ = new Set(FGI_SCHEDULE.flatMap((d) => d.lectures))

/** 그날 강의 중 FGI 시연 대상 (없으면 빈 배열) */
export const demoLecturesOf = (day: ScheduleDay) => day.lectures.filter((s) => FGI_DEMO_SEQ.has(s))

/* ── 복습이 열리는 조건 ──
   기본은 **그날 강의를 다 들어야** 열린다. 복습이 그날 틀린 것을 모아 다시 내는 자리라,
   덜 들은 채로 열면 낼 것이 없다.
   다만 **시연 강의가 있는 날은 그 한 강의만 들어도 연다.** FGI 는 앉은 자리에서 한 강의를 보고
   흐름의 끝(복습)까지 확인하는 자리다. 세 강의를 다 듣게 하면 시연이 거기서 끊긴다. */
export function isReviewUnlocked(day: ScheduleDay, doneSeq: ReadonlySet<number>): boolean {
  const demo = demoLecturesOf(day)
  if (demo.length) return demo.some((s) => doneSeq.has(s))
  return day.lectures.every((s) => doneSeq.has(s))
}
