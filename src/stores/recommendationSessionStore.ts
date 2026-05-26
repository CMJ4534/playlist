import { create } from 'zustand';

import type { EmotionId } from '@/types/emotion';
import type { PlaylistRecommendation } from '@/types/recommendation';

type RecommendationSessionStore = {
  emotionId: EmotionId | null;
  situation: string;
  result: PlaylistRecommendation | null;

  setSession: (payload: {
    emotionId: EmotionId;
    situation: string;
    result: PlaylistRecommendation;
  }) => void;

  clear: () => void;
};

export const useRecommendationSessionStore = create<RecommendationSessionStore>(
  (set) => ({
    emotionId: null,
    situation: '',
    result: null,

    setSession: ({ emotionId, situation, result }) => {
      set({ emotionId, situation, result });
    },

    clear: () => set({ emotionId: null, situation: '', result: null }),
  })
);
