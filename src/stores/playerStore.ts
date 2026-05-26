import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_LIMITS } from '@/lib/storageMaintenance';
import { normalizeTracks } from '@/lib/trackUtils';
import {
  selectCurrentTrack,
  selectCurrentYoutubeId,
} from '@/stores/selectors/playerSelectors';
import type { PlaybackErrorKind, PlaybackStatus } from '@/types/playback';
import type { RepeatMode, Track } from '@/types';

const ADVANCE_COOLDOWN_MS = 900;

type PlayerState = {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  repeatMode: RepeatMode;
  queueRevision: number;
  advanceBlockedUntil: number;
  playbackStatus: PlaybackStatus;
  playbackErrorKind: PlaybackErrorKind | null;
  playbackErrorMessage: string | null;
  positionSec: number;
  durationSec: number;
};

type PlayerActions = {
  setQueue: (tracks: Track[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  tryAdvance: () => boolean;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  setProgress: (positionSec: number, durationSec?: number) => void;
  clearPlaybackError: () => void;
  getCurrentTrack: () => Track | null;
  getCurrentYoutubeId: () => string | null;
};

export type PlayerStore = PlayerState & PlayerActions;

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

function resetPlaybackUi(track: Track | null): Partial<PlayerState> {
  return {
    playbackStatus: 'loading',
    playbackErrorKind: null,
    playbackErrorMessage: null,
    positionSec: 0,
    durationSec: track?.durationSec ?? 0,
  };
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      repeatMode: 'off',
      queueRevision: 0,
      advanceBlockedUntil: 0,
      playbackStatus: 'idle',
      playbackErrorKind: null,
      playbackErrorMessage: null,
      positionSec: 0,
      durationSec: 0,

      tryAdvance: () => {
        const now = Date.now();
        if (now < get().advanceBlockedUntil) return false;
        set({ advanceBlockedUntil: now + ADVANCE_COOLDOWN_MS });
        return true;
      },

      setPlaybackStatus: (status) => set({ playbackStatus: status }),

      setProgress: (positionSec, durationSec) => {
        const dur = durationSec ?? get().durationSec ?? get().getCurrentTrack()?.durationSec ?? 0;
        set({
          positionSec: Math.max(0, positionSec),
          durationSec: dur > 0 ? dur : get().durationSec,
        });
      },

      clearPlaybackError: () =>
        set({ playbackErrorKind: null, playbackErrorMessage: null }),

      setQueue: (tracks, startIndex = 0) => {
        const capped = tracks.slice(0, STORAGE_LIMITS.maxPersistedQueueTracks);
        const normalized = normalizeTracks(capped);

        if (!normalized.length) {
          set({
            queue: [],
            currentIndex: 0,
            isPlaying: false,
            queueRevision: get().queueRevision + 1,
            playbackStatus: 'idle',
            playbackErrorKind: null,
            playbackErrorMessage: null,
            positionSec: 0,
            durationSec: 0,
          });
          return;
        }

        const index = clampIndex(startIndex, normalized.length);
        const track = normalized[index];
        set({
          queue: normalized,
          currentIndex: index,
          isPlaying: false,
          queueRevision: get().queueRevision + 1,
          ...resetPlaybackUi(track),
        });
      },

      play: () =>
        set((s) => ({
          isPlaying: true,
          playbackStatus:
            s.playbackStatus === 'error' ? s.playbackStatus :
            s.playbackStatus === 'paused' ? 'playing' : s.playbackStatus,
        })),

      pause: () => set({ isPlaying: false, playbackStatus: 'paused' }),

      togglePlay: () => {
        if (get().isPlaying) get().pause();
        else get().play();
      },

      setRepeatMode: (mode) => set({ repeatMode: mode }),

      getCurrentTrack: () => selectCurrentTrack(get()),
      getCurrentYoutubeId: () => selectCurrentYoutubeId(get()),

      next: () => {
        if (!get().tryAdvance()) return;
        const { queue, currentIndex, repeatMode } = get();
        if (!queue.length) return;

        const isLast = currentIndex >= queue.length - 1;

        if (repeatMode === 'one') {
          set({
            isPlaying: true,
            queueRevision: get().queueRevision + 1,
            ...resetPlaybackUi(queue[currentIndex]),
          });
          return;
        }

        if (isLast && repeatMode !== 'all') {
          set({ isPlaying: false, playbackStatus: 'paused', positionSec: 0 });
          return;
        }

        const nextIndex = isLast ? 0 : currentIndex + 1;
        set({
          currentIndex: nextIndex,
          isPlaying: true,
          queueRevision: get().queueRevision + 1,
          ...resetPlaybackUi(queue[nextIndex]),
        });
      },

      prev: () => {
        if (!get().tryAdvance()) return;
        const { queue, currentIndex, repeatMode } = get();
        if (!queue.length) return;

        const isFirst = currentIndex <= 0;
        if (isFirst && repeatMode !== 'all') return;

        const prevIndex = isFirst ? queue.length - 1 : currentIndex - 1;
        set({
          currentIndex: prevIndex,
          isPlaying: true,
          queueRevision: get().queueRevision + 1,
          ...resetPlaybackUi(queue[prevIndex]),
        });
      },
    }),
    {
      name: 'moodplay-player',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        queue: state.queue,
        currentIndex: state.currentIndex,
        repeatMode: state.repeatMode,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        state.isPlaying = false;
        state.queueRevision = (state.queueRevision ?? 0) + 1;
        state.advanceBlockedUntil = 0;
        state.playbackStatus = state.queue?.length ? 'paused' : 'idle';
        state.playbackErrorKind = null;
        state.playbackErrorMessage = null;
        state.positionSec = 0;
        if (state.queue?.length) {
          state.currentIndex = clampIndex(state.currentIndex, state.queue.length);
          state.durationSec = state.queue[state.currentIndex]?.durationSec ?? 0;
        }
      },
    }
  )
);
