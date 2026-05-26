import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { EmotionId } from '@/types/emotion';
import type { PlaylistRecommendation } from '@/types/recommendation';

const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export type LastRecommendationSnapshot = {
  emotionId: EmotionId;
  situation: string;
  result: PlaylistRecommendation;
  savedAt: number;
};

type RevisitStore = {
  lastRecommendation: LastRecommendationSnapshot | null;
  setLastRecommendation: (payload: Omit<LastRecommendationSnapshot, 'savedAt'>) => void;
  clearLastRecommendation: () => void;
  getActiveLastRecommendation: () => LastRecommendationSnapshot | null;
};

export const useRevisitStore = create<RevisitStore>()(
  persist(
    (set, get) => ({
      lastRecommendation: null,

      setLastRecommendation: (payload) =>
        set({
          lastRecommendation: {
            ...payload,
            savedAt: Date.now(),
          },
        }),

      clearLastRecommendation: () => set({ lastRecommendation: null }),

      getActiveLastRecommendation: () => {
        const snap = get().lastRecommendation;
        if (!snap) return null;
        if (Date.now() - snap.savedAt > MAX_AGE_MS) return null;
        if (!snap.result?.tracks?.length) return null;
        return snap;
      },
    }),
    {
      name: 'moodplay-revisit',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ lastRecommendation: s.lastRecommendation }),
    }
  )
);
