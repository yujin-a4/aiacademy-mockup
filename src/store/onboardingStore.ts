// 온보딩 상태 관리 스토어
// PHASE 1에서 개발자 A가 구현
import { create } from "zustand";

interface OnboardingState {
  userName: string;
  learningStyle: string | null; // '꼼꼼' | '빠르게'
  managementStyle: string | null; // '스스로' | '강하게'
  motivationType: string | null; // '점수' | '성취감'
  targetScore: number | null;
  studyPeriod: string | null;
  examDate: string | null;
  dailyTime: string | null;
  selectedInstructor: string | null;

  setUserName: (name: string) => void;
  setLearningStyle: (style: string) => void;
  setManagementStyle: (style: string) => void;
  setMotivationType: (type: string) => void;
  setTargetScore: (score: number) => void;
  setStudyPeriod: (period: string) => void;
  setExamDate: (date: string) => void;
  setDailyTime: (time: string) => void;
  setSelectedInstructor: (instructor: string) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  userName: "",
  learningStyle: null,
  managementStyle: null,
  motivationType: null,
  targetScore: null,
  studyPeriod: null,
  examDate: null,
  dailyTime: null,
  selectedInstructor: null,

  setUserName: (name) => set({ userName: name }),
  setLearningStyle: (style) => set({ learningStyle: style }),
  setManagementStyle: (style) => set({ managementStyle: style }),
  setMotivationType: (type) => set({ motivationType: type }),
  setTargetScore: (score) => set({ targetScore: score }),
  setStudyPeriod: (period) => set({ studyPeriod: period }),
  setExamDate: (date) => set({ examDate: date }),
  setDailyTime: (time) => set({ dailyTime: time }),
  setSelectedInstructor: (instructor) => set({ selectedInstructor: instructor }),
}));
