import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * 파트별 연습의 **날짜별 성적표**.
 *
 * 왜 따로 두나 — 연습은 끝이 정해져 있지 않아서 "한 세션"이라는 단위가 없다. 화면 안의
 * `tally` 는 컴포넌트 state 라 뒤로 한 번 나가면 사라진다. 그러면 "오늘 몇 개 풀었나"를
 * 학습자도 우리도 못 본다. 틀린 것만 오답노트(`wrong-answers`)에 남고 **맞은 것은 아무 데도
 * 안 남던** 구멍이 여기다.
 *
 * ⚠️ 이건 브라우저 localStorage 다 — 기기를 옮기면 따라가지 않고 서버에도 안 쌓인다.
 *    계정에 붙는 학습 기록은 Supabase `learning_events` 인데, 그건 수업(lectureCode 가 있는
 *    경로)만 쓴다. 파트별 연습을 서버에 남기려면 그쪽에 붙여야 한다.
 */
export interface DayTally {
  solved: number
  correct: number
}

/** 로컬 시간 기준 YYYY-MM-DD. UTC 로 자르면 자정 넘겨 푼 게 어제로 간다 */
export const dayKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 오늘 0시 (오답노트에서 '오늘 틀린 것'을 셀 때 쓴다) */
export const startOfToday = (): number => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const EMPTY_TALLY: DayTally = { solved: 0, correct: 0 }

interface PracticeStatsState {
  /** days['2026-09-01']['p5'] = { solved, correct } */
  days: Record<string, Record<string, DayTally>>
  addResult: (partId: string, solved: number, correct: number) => void
}

export const usePracticeStatsStore = create<PracticeStatsState>()(
  persist(
    (set) => ({
      days: {},
      addResult: (partId, solved, correct) =>
        set((state) => {
          const k = dayKey()
          const day = state.days[k] ?? {}
          const prev = day[partId] ?? EMPTY_TALLY
          return {
            days: {
              ...state.days,
              [k]: { ...day, [partId]: { solved: prev.solved + solved, correct: prev.correct + correct } },
            },
          }
        }),
    }),
    {
      name: 'practice-stats',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** 오늘 이 파트 성적 (파트를 안 주면 오늘 전체 합) */
export function todayTally(
  days: PracticeStatsState['days'],
  partId?: string,
): DayTally {
  const day = days[dayKey()] ?? {}
  if (partId) return day[partId] ?? EMPTY_TALLY
  return Object.values(day).reduce(
    (a, t) => ({ solved: a.solved + t.solved, correct: a.correct + t.correct }),
    { ...EMPTY_TALLY },
  )
}
