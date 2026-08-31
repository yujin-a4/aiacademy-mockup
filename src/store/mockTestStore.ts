import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * 실전 모의고사 응시 기록.
 *
 * 한 회차는 **LC 100문항 · RC 100문항이 따로 도는 두 판**이다(시간도 45분·75분으로 다르다).
 * 그래서 기록도 영역 단위로 남긴다 — LC 만 풀고 RC 는 다음 날 볼 수 있어야 한다.
 *
 * 어디에 남기나
 *   서버가 없다(이 레포는 프로토타입이고 학습자 상태는 전부 클라이언트에 있다).
 *   localStorage 에 둔다 — 브라우저를 닫았다 열어도 이어서 풀 수 있으면 충분하다.
 *   ⚠️ 기기를 옮기면 사라진다. 실제 제품은 서버에 남겨야 한다.
 */
export type MockArea = 'LC' | 'RC'

/** `${vol}-${test}-${area}` — 1권 3회차 LC = '1-3-LC' */
export type AttemptKey = string

export const attemptKey = (vol: number, test: number, area: MockArea): AttemptKey =>
  `${vol}-${test}-${area}`

export interface MockAttempt {
  /** progress = 풀다 만 것(이어하기) · done = 채점까지 끝난 것 */
  status: 'progress' | 'done'
  /** 문항번호 → 고른 보기 */
  answers: Record<number, string>
  /** 그어 지운 보기 `${문항번호}-${라벨}` — 이어할 때 그은 자국이 남아 있어야 한다 */
  eliminated: Record<string, boolean>
  /** 남은 시간(초). 이어하면 여기서부터 다시 흐른다 */
  timeLeft: number
  activePart: number
  groupIdx: number
  /** 이미 들은 음원의 판 키 — 이어하기로 돌아왔을 때 안 들은 척 다시 틀면 실전이 아니다 */
  played: string[]
  /** 채점 결과 (status === 'done' 일 때만) */
  correct?: number
  total?: number
  score?: number
  updatedAt: number
}

interface MockTestState {
  attempts: Record<AttemptKey, MockAttempt>
  /** 푸는 중 상태를 덮어쓴다. 채점이 끝난 회차는 건드리지 않는다 */
  saveProgress: (key: AttemptKey, patch: Omit<MockAttempt, 'status' | 'updatedAt'>) => void
  /** 채점 완료로 확정 */
  finish: (key: AttemptKey, result: { correct: number; total: number; score: number }) => void
  /** 처음부터 다시 — 기록을 지운다 */
  reset: (key: AttemptKey) => void
}

export const useMockTestStore = create<MockTestState>()(
  persist(
    (set) => ({
      attempts: {},
      saveProgress: (key, patch) =>
        set((s) => ({
          attempts: {
            ...s.attempts,
            [key]: { ...s.attempts[key], ...patch, status: 'progress', updatedAt: Date.now() },
          },
        })),
      finish: (key, result) =>
        set((s) => ({
          attempts: {
            ...s.attempts,
            [key]: { ...s.attempts[key], ...result, status: 'done', updatedAt: Date.now() },
          },
        })),
      reset: (key) =>
        set((s) => {
          const next = { ...s.attempts }
          delete next[key]
          return { attempts: next }
        }),
    }),
    {
      name: 'mock-test-attempts',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** 회차 카드가 보여줄 상태 — 아직 안 봤나 / 풀다 말았나 / 끝냈나 */
export type AttemptStatus = 'none' | 'progress' | 'done'

export function statusOf(a: MockAttempt | undefined): AttemptStatus {
  if (!a) return 'none'
  return a.status
}

/**
 * 한 회차(LC+RC)의 합산 예상 점수.
 * **둘 다 끝냈을 때만** 낸다 — 토익 총점은 LC 495 + RC 495 라, 한쪽만 풀고 총점을 내면
 * 실제보다 반토막 난 숫자가 '내 점수'로 남는다.
 */
export function totalScore(lc: MockAttempt | undefined, rc: MockAttempt | undefined): number | null {
  if (lc?.status !== 'done' || rc?.status !== 'done') return null
  return (lc.score ?? 0) + (rc.score ?? 0)
}
