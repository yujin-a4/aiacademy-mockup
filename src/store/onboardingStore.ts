import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  userName: string;
  learningStyle: string | null;
  managementStyle: string | null;
  motivationType: string | null;
  targetScore: number | null;
  studyPeriod: string | null;
  examDate: string | null;
  dailyTime: string | null;
  selectedInstructor: string | null;
}

interface OnboardingState extends UserProfile {
  savedProfiles: UserProfile[];

  setUserName: (name: string) => void;
  setLearningStyle: (style: string) => void;
  setManagementStyle: (style: string) => void;
  setMotivationType: (type: string) => void;
  setTargetScore: (score: number) => void;
  setStudyPeriod: (period: string) => void;
  setExamDate: (date: string) => void;
  setDailyTime: (time: string) => void;
  setSelectedInstructor: (instructor: string) => void;

  saveCurrentProfile: () => void;
  loadProfile: (name: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      userName: "",
      learningStyle: null,
      managementStyle: null,
      motivationType: null,
      targetScore: null,
      studyPeriod: null,
      examDate: null,
      dailyTime: null,
      selectedInstructor: null,
      savedProfiles: [],

      setUserName: (name) => set({ userName: name }),
      setLearningStyle: (style) => set({ learningStyle: style }),
      setManagementStyle: (style) => set({ managementStyle: style }),
      setMotivationType: (type) => set({ motivationType: type }),
      setTargetScore: (score) => set({ targetScore: score }),
      setStudyPeriod: (period) => set({ studyPeriod: period }),
      setExamDate: (date) => set({ examDate: date }),
      setDailyTime: (time) => set({ dailyTime: time }),
      setSelectedInstructor: (instructor) => set({ selectedInstructor: instructor }),

      saveCurrentProfile: () => {
        const { userName, learningStyle, managementStyle, motivationType, targetScore, studyPeriod, examDate, dailyTime, selectedInstructor, savedProfiles } = get();
        if (!userName) return;
        const profile: UserProfile = { userName, learningStyle, managementStyle, motivationType, targetScore, studyPeriod, examDate, dailyTime, selectedInstructor };
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
