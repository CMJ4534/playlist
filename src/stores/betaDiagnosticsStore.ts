import { create } from 'zustand';

import type { RecommendationFailureReason } from '@/services/analytics/analyticsEvents';

type BetaDiagnosticsStore = {
  lastFallbackReason: RecommendationFailureReason | null;
  lastFallbackAt: number | null;
  lastFallbackEmotionId: string | null;
  setLastFallback: (
    reason: RecommendationFailureReason,
    emotionId: string
  ) => void;
  clear: () => void;
};

export const useBetaDiagnosticsStore = create<BetaDiagnosticsStore>((set) => ({
  lastFallbackReason: null,
  lastFallbackAt: null,
  lastFallbackEmotionId: null,

  setLastFallback: (reason, emotionId) =>
    set({
      lastFallbackReason: reason,
      lastFallbackAt: Date.now(),
      lastFallbackEmotionId: emotionId,
    }),

  clear: () =>
    set({
      lastFallbackReason: null,
      lastFallbackAt: null,
      lastFallbackEmotionId: null,
    }),
}));
