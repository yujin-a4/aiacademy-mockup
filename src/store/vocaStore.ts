import { create } from 'zustand';
import { VOCA_DATA, VocaWord } from '@/data/vocaData';

export type FlashcardStatus = 'know' | 'confused' | 'unknown';

interface VocaState {
  todayWords: VocaWord[];
  currentIndex: number;
  
  // Results keyed by word ID
  flashcardResults: Record<number, FlashcardStatus>;
  quizResults: Record<number, boolean>;
  dictationResults: Record<number, boolean>;

  // Actions
  initTodayWords: () => void;
  nextWord: () => void;
  setFlashcardResult: (wordId: number, status: FlashcardStatus) => void;
  setQuizResult: (wordId: number, isCorrect: boolean) => void;
  setDictationResult: (wordId: number, isCorrect: boolean) => void;
  resetProgress: () => void;
}

export const useVocaStore = create<VocaState>((set, get) => ({
  todayWords: [],
  currentIndex: 0,
  flashcardResults: {},
  quizResults: {},
  dictationResults: {},

  initTodayWords: () => {
    // 300개 중 30개 추출 (데모 목적상 첫 30개로 고정)
    const words = VOCA_DATA.slice(0, 30);
    set({
      todayWords: words,
      currentIndex: 0,
      flashcardResults: {},
      quizResults: {},
      dictationResults: {},
    });
  },

  nextWord: () => {
    const { currentIndex, todayWords } = get();
    if (currentIndex < todayWords.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  setFlashcardResult: (wordId, status) => {
    set((state) => ({
      flashcardResults: { ...state.flashcardResults, [wordId]: status }
    }));
    get().nextWord();
  },

  setQuizResult: (wordId, isCorrect) => {
    set((state) => ({
      quizResults: { ...state.quizResults, [wordId]: isCorrect }
    }));
    get().nextWord();
  },

  setDictationResult: (wordId, isCorrect) => {
    set((state) => ({
      dictationResults: { ...state.dictationResults, [wordId]: isCorrect }
    }));
    get().nextWord();
  },

  resetProgress: () => {
    set({
      currentIndex: 0,
      flashcardResults: {},
      quizResults: {},
      dictationResults: {},
    });
  }
}));
