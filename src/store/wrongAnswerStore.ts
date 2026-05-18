import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface WrongAnswer {
  id: string
  partId: string        // 'p5' | 'p6' | 'p7'
  partLabel: string     // 'Part 5' | 'Part 6' | 'Part 7'
  questionText: string  // 문장(P5), 문제(P7), 빈칸번호 텍스트(P6)
  choices: string[]
  chosenAnswer: number
  correctAnswer: number
  category?: string
  explanation: string
  passageTitle?: string
  timestamp: number
}

interface WrongAnswerState {
  wrongAnswers: WrongAnswer[]
  addWrongAnswer: (item: Omit<WrongAnswer, 'id' | 'timestamp'>) => void
  removeWrongAnswer: (id: string) => void
  clearAll: () => void
}

export const SCAFFOLDING: Record<string, string> = {
  '수동태': '주어가 동작을 "하는" 건지 "당하는" 건지 먼저 확인하세요. 주어가 동작의 대상이 되면 be + p.p. 형태(수동태)를 선택합니다. 빈칸 앞 주어와 동사의 관계를 항상 먼저 체크하는 습관을 들이세요.',
  '시제': '"since/for/already/yet"이 보이면 현재완료, "yesterday/last~/when + 과거절"이 보이면 단순 과거 신호예요. 시간 부사를 먼저 찾는 것이 시제 문제 풀이의 첫 번째 단계입니다.',
  '품사': '빈칸의 위치를 먼저 분석하세요. 동사를 수식 → 부사(-ly), be동사·remain 뒤 → 형용사, 관사·형용사 뒤 → 명사. 문장 구조(S+V+O+C)에서 빈칸이 어느 자리인지 파악하는 게 핵심입니다.',
  '전치사': '전치사는 의미 + 패턴 암기가 핵심이에요. by = "기한까지", until = "상태가 계속되는 동안", during = "~하는 기간 내내". 문맥에서 어떤 의미가 필요한지 먼저 생각하세요.',
  '어휘': '빈칸 앞뒤 문맥을 먼저 읽고 "어떤 의미가 필요한가"를 생각하세요. 그 다음 각 보기의 뜻과 어울리는 짝 표현(colocation)을 확인하세요. 뜻이 비슷해 보여도 쓰임새가 다른 경우가 많아요.',
  '접속사': '빈칸 뒤에 "절(주어+동사)"이 오면 접속사, "구(명사/동명사)"가 오면 전치사예요. 의미도 함께 확인: 역접(although/even though), 원인(since/because), 조건(if/unless).',
  '수일치': '"each/every/one of + 복수명사"처럼 수식어에 현혹되지 마세요. 진짜 주어만 찾아서 단수·복수를 판단하세요. 관계절이나 전치사구가 주어를 가리는 경우가 많습니다.',
  '관계대명사': '① 선행사가 사람인지 사물인지, ② 관계절 안에서 주어/목적어/소유격 중 무슨 역할인지, 두 가지를 동시에 확인하세요. 목적격은 생략 가능하다는 것도 기억하세요.',
  '동사형': '조동사(should/can/must/may) 뒤에는 반드시 동사원형이 와요. "to" 뒤도 동사원형(to부정사). remain/become/seem 뒤에는 형용사가 와야 합니다.',
}

export const useWrongAnswerStore = create<WrongAnswerState>()(
  persist(
    (set) => ({
      wrongAnswers: [],
      addWrongAnswer: (item) =>
        set((state) => ({
          wrongAnswers: [
            {
              ...item,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: Date.now(),
            },
            ...state.wrongAnswers,
          ],
        })),
      removeWrongAnswer: (id) =>
        set((state) => ({
          wrongAnswers: state.wrongAnswers.filter((w) => w.id !== id),
        })),
      clearAll: () => set({ wrongAnswers: [] }),
    }),
    {
      name: 'wrong-answers',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
