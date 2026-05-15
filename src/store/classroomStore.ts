// 수업 세션 상태 관리 스토어
// PHASE 2에서 개발자 B가 구현
import { create } from "zustand";

type ViewMode = "instructor-on" | "instructor-off" | "note" | "question";
type InstructorPersona = "driller" | "mentor" | "realist";

interface ClassroomState {
  sessionId: string | null;
  currentProblemIndex: number;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  viewMode: ViewMode;
  persona: InstructorPersona;
  scaffoldingStep: 0 | 1 | 2 | 3; // 0=없음, 1=방향, 2=근거, 3=정답
  isSpeechActive: boolean;

  setSessionId: (id: string) => void;
  nextProblem: () => void;
  setSelectedAnswer: (answer: string) => void;
  setIsCorrect: (correct: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setPersona: (persona: InstructorPersona) => void;
  nextScaffolding: () => void;
  resetScaffolding: () => void;
  toggleSpeech: () => void;
}

export const useClassroomStore = create<ClassroomState>((set) => ({
  sessionId: null,
  currentProblemIndex: 0,
  selectedAnswer: null,
  isCorrect: null,
  viewMode: "instructor-on",
  persona: "mentor",
  scaffoldingStep: 0,
  isSpeechActive: false,

  setSessionId: (id) => set({ sessionId: id }),
  nextProblem: () =>
    set((s) => ({
      currentProblemIndex: s.currentProblemIndex + 1,
      selectedAnswer: null,
      isCorrect: null,
      scaffoldingStep: 0,
    })),
  setSelectedAnswer: (answer) => set({ selectedAnswer: answer }),
  setIsCorrect: (correct) => set({ isCorrect: correct }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setPersona: (persona) => set({ persona }),
  nextScaffolding: () =>
    set((s) => ({
      scaffoldingStep: Math.min(s.scaffoldingStep + 1, 3) as 0 | 1 | 2 | 3,
    })),
  resetScaffolding: () => set({ scaffoldingStep: 0 }),
  toggleSpeech: () => set((s) => ({ isSpeechActive: !s.isSpeechActive })),
}));
