import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { usePlaybackHealthStore } from '@/stores/playbackHealthStore';
import { getDisabledSeedYoutubeIds } from '@/data/seeds/catalogMeta';
import { STORAGE_LIMITS } from '@/lib/storageMaintenance';
import type { EmotionId } from '@/types/emotion';
import type { Track } from '@/types/track';

const MAX_RECENT_GLOBAL = 72;
const MAX_RECENT_PER_EMOTION = 32;
const OVERUSE_THRESHOLD = 3;

type RecommendationHistoryStore = {
  recentYoutubeIds: string[];
  recentByEmotion: Partial<Record<EmotionId, string[]>>;
  exposureCountByYoutubeId: Record<string, number>;

  recordTracks: (tracks: Track[], emotionId?: EmotionId) => void;
  getExcludeYoutubeIds: (emotionId?: EmotionId) => string[];
  getOverusedYoutubeIds: () => string[];
  clear: () => void;
};

function mergeUniqueIds(...lists: string[][]): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const id of list) {
      const trimmed = id?.trim();
      if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    }
  }
  return out;
}

function trimExposure(exposure: Record<string, number>): Record<string, number> {
  const entries = Object.entries(exposure);
  if (entries.length <= STORAGE_LIMITS.maxExposureCountEntries) return exposure;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(sorted.slice(0, STORAGE_LIMITS.maxExposureCountEntries));
}

export const useRecommendationHistoryStore = create<RecommendationHistoryStore>()(
  persist(
    (set, get) => ({
      recentYoutubeIds: [],
      recentByEmotion: {},
      exposureCountByYoutubeId: {},

      recordTracks: (tracks, emotionId) => {
        const incoming = tracks
          .map((t) => t.youtubeId?.trim())
          .filter((id): id is string => Boolean(id));

        if (!incoming.length) return;

        const exposure = { ...get().exposureCountByYoutubeId };
        for (const id of incoming) {
          exposure[id] = (exposure[id] ?? 0) + 1;
        }

        const global = mergeUniqueIds(incoming, get().recentYoutubeIds).slice(0, MAX_RECENT_GLOBAL);

        const nextByEmotion = { ...get().recentByEmotion };
        if (emotionId) {
          const prev = nextByEmotion[emotionId] ?? [];
          nextByEmotion[emotionId] = mergeUniqueIds(incoming, prev).slice(0, MAX_RECENT_PER_EMOTION);
        }

        set({
          recentYoutubeIds: global,
          recentByEmotion: nextByEmotion,
          exposureCountByYoutubeId: trimExposure(exposure),
        });
      },

      getExcludeYoutubeIds: (emotionId) => {
        const global = get().recentYoutubeIds;
        const emotion = emotionId ? (get().recentByEmotion[emotionId] ?? []) : [];
        const blocked = usePlaybackHealthStore.getState().getBlockedYoutubeIds();
        const disabledCatalog = getDisabledSeedYoutubeIds();
        return mergeUniqueIds(emotion, global, blocked, disabledCatalog);
      },

      getOverusedYoutubeIds: () => {
        const counts = get().exposureCountByYoutubeId;
        return Object.entries(counts)
          .filter(([, n]) => n >= OVERUSE_THRESHOLD)
          .map(([id]) => id);
      },

      clear: () =>
        set({
          recentYoutubeIds: [],
          recentByEmotion: {},
          exposureCountByYoutubeId: {},
        }),
    }),
    {
      name: 'moodplay-recommendation-history',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        recentYoutubeIds: s.recentYoutubeIds,
        recentByEmotion: s.recentByEmotion,
        exposureCountByYoutubeId: s.exposureCountByYoutubeId,
      }),
    }
  )
);
