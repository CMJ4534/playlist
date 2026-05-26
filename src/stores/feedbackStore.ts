import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  FeedbackCategory,
  FeedbackEntry,
  FeedbackSentiment,
  FeedbackUploadStatus,
} from '@/types/feedback';
import type { EmotionId } from '@/types/emotion';
import type { RecommendationStrategyId } from '@/types/recommendationStrategy';

const MAX_QUEUE_SIZE = 200;

type SubmitFeedbackInput = {
  sentiment: FeedbackSentiment;
  comment?: string | null;
  category?: FeedbackCategory;
  emotionId?: EmotionId | null;
  playlistSessionId?: string | null;
  strategyId?: RecommendationStrategyId | null;
  strategyVersion?: string | null;
  experimentVariant?: string | null;
  tracksPlayed?: number;
  tracksSkipped?: number;
  queueLength?: number;
};

type FeedbackStoreState = {
  queue: FeedbackEntry[];
};

type FeedbackStoreActions = {
  submit: (input: SubmitFeedbackInput) => FeedbackEntry;
  markUploaded: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  getPending: () => FeedbackEntry[];
  getFailed: () => FeedbackEntry[];
  getByStatus: (status: FeedbackUploadStatus) => FeedbackEntry[];
  getAll: () => FeedbackEntry[];
  removeUploaded: () => void;
  clear: () => void;
};

export const useFeedbackStore = create<FeedbackStoreState & FeedbackStoreActions>()(
  persist(
    (set, get) => ({
      queue: [],

      submit: (input) => {
        const entry: FeedbackEntry = {
          id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          sentiment: input.sentiment,
          comment: input.comment ?? null,
          category: input.category ?? 'playlist_quality',
          emotionId: input.emotionId ?? null,
          playlistSessionId: input.playlistSessionId ?? null,
          strategyId: input.strategyId ?? null,
          strategyVersion: input.strategyVersion ?? null,
          experimentVariant: input.experimentVariant ?? null,
          tracksPlayed: input.tracksPlayed ?? 0,
          tracksSkipped: input.tracksSkipped ?? 0,
          queueLength: input.queueLength ?? 0,
          status: 'pending',
          createdAt: Date.now(),
          uploadedAt: null,
          uploadAttempts: 0,
          lastError: null,
        };

        set((s) => ({
          queue: [entry, ...s.queue].slice(0, MAX_QUEUE_SIZE),
        }));

        return entry;
      },

      markUploaded: (id) =>
        set((s) => ({
          queue: s.queue.map((e) =>
            e.id === id
              ? { ...e, status: 'uploaded' as const, uploadedAt: Date.now() }
              : e
          ),
        })),

      markFailed: (id, error) =>
        set((s) => ({
          queue: s.queue.map((e) =>
            e.id === id
              ? {
                  ...e,
                  status: 'failed' as const,
                  uploadAttempts: e.uploadAttempts + 1,
                  lastError: error,
                }
              : e
          ),
        })),

      getPending: () => get().queue.filter((e) => e.status === 'pending'),
      getFailed: () => get().queue.filter((e) => e.status === 'failed'),
      getByStatus: (status) => get().queue.filter((e) => e.status === status),
      getAll: () => get().queue,

      removeUploaded: () =>
        set((s) => ({
          queue: s.queue.filter((e) => e.status !== 'uploaded'),
        })),

      clear: () => set({ queue: [] }),
    }),
    {
      name: 'moodplay-feedback-queue',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ queue: s.queue }),
    }
  )
);
