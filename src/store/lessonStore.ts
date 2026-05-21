import { create } from 'zustand'

export type LessonScreen = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface LessonState {
  currentScreen: LessonScreen
  practiceResults: (boolean | null)[]

  nextScreen: () => void
  goToScreen: (screen: LessonScreen) => void
  setPracticeResult: (idx: number, correct: boolean) => void
  reset: () => void
}

export const useLessonStore = create<LessonState>((set) => ({
  currentScreen: 0,
  practiceResults: [null, null, null],

  nextScreen: () =>
    set((s) => ({
      currentScreen: Math.min(s.currentScreen + 1, 6) as LessonScreen,
    })),

  goToScreen: (screen) => set({ currentScreen: screen }),

  setPracticeResult: (idx, correct) =>
    set((s) => {
      const next = [...s.practiceResults]
      next[idx] = correct
      return { practiceResults: next }
    }),

  reset: () => set({ currentScreen: 0, practiceResults: [null, null, null] }),
}))
