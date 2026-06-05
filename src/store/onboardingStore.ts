import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  userName: string;
  rangeAxis: 'W' | 'N' | null;
  rhythm: 'B' | 'G' | null;
  difficulty: 'C' | 'S' | null;
  motivation: 'R' | 'P' | null;
  targetScore: number | null;
  studyPeriod: string | null;
  examDate: string | null;
  dailyTime: string | null;
  selectedInstructor: string | null;
  studyRange: 'LC+RC' | 'LC' | 'RC' | null;
}

interface OnboardingState extends UserProfile {
  savedProfiles: UserProfile[];

  setUserName: (name: string) => void;
  setRangeAxis: (axis: 'W' | 'N') => void;
  setRhythm: (rhythm: 'B' | 'G') => void;
  setDifficulty: (difficulty: 'C' | 'S') => void;
  setMotivation: (motivation: 'R' | 'P') => void;
  setTargetScore: (score: number) => void;
  setStudyPeriod: (period: string) => void;
  setExamDate: (date: string) => void;
  setDailyTime: (time: string) => void;
  setSelectedInstructor: (instructor: string) => void;
  setStudyRange: (range: 'LC+RC' | 'LC' | 'RC') => void;

  saveCurrentProfile: () => void;
  loadProfile: (name: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      userName: "",
      rangeAxis: null,
      rhythm: null,
      difficulty: null,
      motivation: null,
      targetScore: null,
      studyPeriod: null,
      examDate: null,
      dailyTime: null,
      selectedInstructor: null,
      studyRange: null,
      savedProfiles: [],

      setUserName: (name) => set({ userName: name }),
      setRangeAxis: (axis) => set({ rangeAxis: axis }),
      setRhythm: (rhythm) => set({ rhythm }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setMotivation: (motivation) => set({ motivation }),
      setTargetScore: (score) => set({ targetScore: score }),
      setStudyPeriod: (period) => set({ studyPeriod: period }),
      setExamDate: (date) => set({ examDate: date }),
      setDailyTime: (time) => set({ dailyTime: time }),
      setSelectedInstructor: (instructor) => set({ selectedInstructor: instructor }),
      setStudyRange: (range) => set({ studyRange: range }),

      saveCurrentProfile: () => {
        const { userName, rangeAxis, rhythm, difficulty, motivation, targetScore, studyPeriod, examDate, dailyTime, selectedInstructor, studyRange, savedProfiles } = get();
        if (!userName) return;
        const profile: UserProfile = { userName, rangeAxis, rhythm, difficulty, motivation, targetScore, studyPeriod, examDate, dailyTime, selectedInstructor, studyRange };
        const idx = savedProfiles.findIndex((p) => p.userName === userName);
        if (idx >= 0) {
          const updated = [...savedProfiles];
          updated[idx] = profile;
          set({ savedProfiles: updated });
        } else {
          set({ savedProfiles: [...savedProfiles, profile] });
        }
      },

      loadProfile: (name: string) => {
        const { savedProfiles } = get();
        const profile = savedProfiles.find((p) => p.userName === name);
        if (profile) set({ ...profile });
      },
    }),
    { name: "ybm-user-data" }
  )
);
