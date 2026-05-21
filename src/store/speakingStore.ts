import { create } from 'zustand'

export type SpeakingScreen = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

interface SpeakingState {
  currentScreen: SpeakingScreen
  nextScreen: () => void
  prevScreen: () => void
  goToScreen: (screen: SpeakingScreen) => void
  reset: () => void
}

export const useSpeakingStore = create<SpeakingState>((set) => ({
  currentScreen: 0,
  nextScreen: () =>
    set((s) => ({ currentScreen: Math.min(s.currentScreen + 1, 7) as SpeakingScreen })),
  prevScreen: () =>
    set((s) => ({ currentScreen: Math.max(s.currentScreen - 1, 0) as SpeakingScreen })),
  goToScreen: (screen) => set({ currentScreen: screen }),
  reset: () => set({ currentScreen: 0 }),
}))
