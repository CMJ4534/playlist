import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isDevEnvironment } from '@/constants/dev';
import { STORAGE_LIMITS } from '@/lib/storageMaintenance';
import {
  normalizeFailReason,
  type PlaybackErrorKind,
  type PlaybackFailReason,
} from '@/types/playback';

export const PLAYBACK_BLOCK_FAIL_THRESHOLD = 2;

export type TrackPlaybackHealth = {
  youtubeId: string;
  title?: string;
  artist?: string;
  failCount: number;
  lastFailedAt: number;
  failReason: PlaybackFailReason;
  reasonCounts: Partial<Record<PlaybackFailReason, number>>;
};

type PlaybackHealthStore = {
  byYoutubeId: Record<string, TrackPlaybackHealth>;
  globalReasonCounts: Partial<Record<PlaybackFailReason, number>>;

  recordFailure: (record: {
    youtubeId: string;
    title?: string;
    artist?: string;
    kind: PlaybackErrorKind;
  }) => void;

  getHealth: (youtubeId: string) => TrackPlaybackHealth | undefined;
  getBlockedYoutubeIds: () => string[];
  getFailureStats: () => {
    blocked: number;
    tracked: number;
    globalReasonCounts: Partial<Record<PlaybackFailReason, number>>;
  };
  clear: () => void;
};

function bumpReasonCount(
  counts: Partial<Record<PlaybackFailReason, number>>,
  reason: PlaybackFailReason
): Partial<Record<PlaybackFailReason, number>> {
  return { ...counts, [reason]: (counts[reason] ?? 0) + 1 };
}

function trimHealthMap(byYoutubeId: Record<string, TrackPlaybackHealth>): Record<string, TrackPlaybackHealth> {
  const entries = Object.values(byYoutubeId);
  if (entries.length <= STORAGE_LIMITS.maxPlaybackHealthEntries) return byYoutubeId;
  const sorted = [...entries].sort((a, b) => b.lastFailedAt - a.lastFailedAt);
  return Object.fromEntries(
    sorted.slice(0, STORAGE_LIMITS.maxPlaybackHealthEntries).map((e) => [e.youtubeId, e])
  );
}

export const usePlaybackHealthStore = create<PlaybackHealthStore>()(
  persist(
    (set, get) => ({
      byYoutubeId: {},
      globalReasonCounts: {},

      recordFailure: (record) => {
        const youtubeId = record.youtubeId?.trim();
        if (!youtubeId) return;

        const reason = normalizeFailReason(record.kind);
        const now = Date.now();
        const prev = get().byYoutubeId[youtubeId];

        const nextEntry: TrackPlaybackHealth = {
          youtubeId,
          title: record.title ?? prev?.title,
          artist: record.artist ?? prev?.artist,
          failCount: (prev?.failCount ?? 0) + 1,
          lastFailedAt: now,
          failReason: reason,
          reasonCounts: bumpReasonCount(prev?.reasonCounts ?? {}, reason),
        };

        const globalReasonCounts = bumpReasonCount(get().globalReasonCounts, reason);
        const updated = { ...get().byYoutubeId, [youtubeId]: nextEntry };

        set({
          byYoutubeId: trimHealthMap(updated),
          globalReasonCounts,
        });

        if (isDevEnvironment()) {
          console.info('[playbackHealth]', {
            youtubeId, reason,
            failCount: nextEntry.failCount,
            blocked: nextEntry.failCount >= PLAYBACK_BLOCK_FAIL_THRESHOLD,
          });
        }
      },

      getHealth: (youtubeId) => get().byYoutubeId[youtubeId?.trim()],

      getBlockedYoutubeIds: () =>
        Object.values(get().byYoutubeId)
          .filter((h) => h.failCount >= PLAYBACK_BLOCK_FAIL_THRESHOLD)
          .map((h) => h.youtubeId),

      getFailureStats: () => ({
        blocked: get().getBlockedYoutubeIds().length,
        tracked: Object.keys(get().byYoutubeId).length,
        globalReasonCounts: get().globalReasonCounts,
      }),

      clear: () => set({ byYoutubeId: {}, globalReasonCounts: {} }),
    }),
    {
      name: 'moodplay-playback-health-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        byYoutubeId: s.byYoutubeId,
        globalReasonCounts: s.globalReasonCounts,
      }),
      version: 2,
      migrate: (persisted) => {
        const p = persisted as {
          failures?: Array<{ youtubeId: string; kind: PlaybackErrorKind; at: number }>;
          byYoutubeId?: Record<string, TrackPlaybackHealth>;
        };
        if (p?.byYoutubeId) return persisted;
        if (!p?.failures?.length) return { byYoutubeId: {}, globalReasonCounts: {} };

        const byYoutubeId: Record<string, TrackPlaybackHealth> = {};
        for (const f of p.failures) {
          const reason = normalizeFailReason(f.kind);
          const prev = byYoutubeId[f.youtubeId];
          byYoutubeId[f.youtubeId] = {
            youtubeId: f.youtubeId,
            failCount: (prev?.failCount ?? 0) + 1,
            lastFailedAt: f.at,
            failReason: reason,
            reasonCounts: bumpReasonCount(prev?.reasonCounts ?? {}, reason),
          };
        }
        return { byYoutubeId, globalReasonCounts: {} };
      },
    }
  )
);
