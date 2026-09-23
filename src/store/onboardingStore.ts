import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  userName: string;
  rangeAxis: 'W' | 'N' | null;
  rhythm: 'D' | 'M' | null;
  difficulty: 'C' | 'S' | null;
  motivation: 'R' | 'P' | null;
  targetScore: number | null;
  studyPeriod: string | null;
  examDate: string | null;
  dailyTime: string | null;
  selectedInstructor: string | null;
  studyRange: 'LC+RC' | 'LC' | 'RC' | null;
  /** 가장 최근에 치른 토익 시험일. 응시 경험이 없으면 null */
  lastExamDate: string | null;
  /** 가장 최근 시험의 총점 (10~990). 미입력이면 null */
  currentTotalScore: number | null;
  /** 스스로 꼽은 취약 파트 (1~7). 안 고르면 빈 배열 */
  weakParts: number[];
}

interface OnboardingState extends UserProfile {
  savedProfiles: UserProfile[];

  setUserName: (name: string) => void;
  setRangeAxis: (axis: 'W' | 'N') => void;
  setRhythm: (rhythm: 'D' | 'M') => void;
  setDifficulty: (difficulty: 'C' | 'S') => void;
  setMotivation: (motivation: 'R' | 'P') => void;
  setTargetScore: (score: number) => void;
  setStudyPeriod: (period: string) => void;
  setExamDate: (date: string) => void;
  setDailyTime: (time: string) => void;
  setSelectedInstructor: (instructor: string) => void;
  setStudyRange: (range: 'LC+RC' | 'LC' | 'RC') => void;
  /** 최근 시험 결과를 한 번에 설정. 응시 경험이 없으면 둘 다 null로 넘긴다 */
  setLastExamResult: (date: string | null, total: number | null) => void;
  setWeakParts: (parts: number[]) => void;

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
      lastExamDate: null,
      currentTotalScore: null,
      weakParts: [],
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
      setLastExamResult: (date, total) =>
        set({ lastExamDate: date, currentTotalScore: total }),
      setWeakParts: (parts) => set({ weakParts: parts }),

      saveCurrentProfile: () => {
        const { userName, rangeAxis, rhythm, difficulty, motivation, targetScore, studyPeriod, examDate, dailyTime, selectedInstructor, studyRange, lastExamDate, currentTotalScore, weakParts, savedProfiles } = get();
        if (!userName) return;
        const profile: UserProfile = { userName, rangeAxis, rhythm, difficulty, motivation, targetScore, studyPeriod, examDate, dailyTime, selectedInstructor, studyRange, lastExamDate, currentTotalScore, weakParts };
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
