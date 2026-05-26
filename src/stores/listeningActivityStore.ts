import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EMOTIONS } from '@/constants/emotions';
import type { EmotionId } from '@/types/emotion';
import type {
  EmotionHistoryEntry,
  EmotionRoutine,
  EmotionRoutineTimeHint,
  PlaybackSignal,
  PlaylistHistoryEntry,
  PlaylistHistoryTrack,
} from '@/types/listeningActivity';
import type { PlaylistRecommendation } from '@/types/recommendation';
import type { Track } from '@/types/track';

const MAX_EMOTION_HISTORY = 20;
const MAX_PLAYLIST_HISTORY = 12;
const MAX_ROUTINES = 6;
const MAX_SIGNALS = 150;
const MAX_TRACKS_PER_ENTRY = 20;

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function snapshotTracks(tracks: Track[]): PlaylistHistoryTrack[] {
  return tracks.slice(0, MAX_TRACKS_PER_ENTRY).map((t) => ({
    id: t.id,
    youtubeId: t.youtubeId,
    title: t.title,
    artist: t.artist,
    thumbnailUrl: t.thumbnailUrl,
    moodTags: t.moodTags,
    energyLevel: t.energyLevel,
    noveltyTier: t.noveltyTier,
  }));
}

function routineLabel(emotionId: EmotionId, hint: EmotionRoutineTimeHint): string {
  const emotion = EMOTIONS.find((e) => e.id === emotionId);
  const base = emotion?.label ?? emotionId;
  if (hint === 'dawn') return `${base} · 새벽 루틴`;
  if (hint === 'night') return `${base} · 밤 루틴`;
  if (hint === 'focus') return `${base} · 집중 루틴`;
  return `${base} 루틴`;
}

type ListeningActivityStore = {
  emotionHistory: EmotionHistoryEntry[];
  playlistHistory: PlaylistHistoryEntry[];
  routines: EmotionRoutine[];
  playbackSignals: PlaybackSignal[];

  recordRecommendation: (
    emotionId: EmotionId,
    situation: string,
    result: PlaylistRecommendation,
    playlistSessionId?: string
  ) => void;
  recordPlaybackSignal: (signal: Omit<PlaybackSignal, 'at'> & { at?: number }) => void;
  touchPlaylistPlayed: (playlistId: string) => void;
  pinRoutine: (emotionId: EmotionId, timeHint?: EmotionRoutineTimeHint) => void;
  markRoutineUsed: (routineId: string) => void;
  getPlaylistById: (id: string) => PlaylistHistoryEntry | undefined;
  clear: () => void;
};

export const useListeningActivityStore = create<ListeningActivityStore>()(
  persist(
    (set, get) => ({
      emotionHistory: [],
      playlistHistory: [],
      routines: [],
      playbackSignals: [],

      recordRecommendation: (emotionId, situation, result, playlistSessionId) => {
        const now = Date.now();
        const entry: EmotionHistoryEntry = {
          id: uid('emo'),
          emotionId,
          situation: situation.trim(),
          playlistTitle: result.title,
          trackCount: result.tracks.length,
          createdAt: now,
        };

        const playlistEntry: PlaylistHistoryEntry = {
          id: uid('pl'),
          emotionId,
          title: result.title,
          description: result.description,
          tracks: snapshotTracks(result.tracks),
          playlistSessionId,
          createdAt: now,
          lastPlayedAt: now,
        };

        const emotionHistory = [entry, ...get().emotionHistory].slice(
          0,
          MAX_EMOTION_HISTORY
        );
        const playlistHistory = [playlistEntry, ...get().playlistHistory].slice(
          0,
          MAX_PLAYLIST_HISTORY
        );

        set({ emotionHistory, playlistHistory });
        maybeAutoPinRoutine(get, emotionId);
      },

      recordPlaybackSignal: (signal) => {
        const full: PlaybackSignal = {
          ...signal,
          at: signal.at ?? Date.now(),
        };
        const playbackSignals = [full, ...get().playbackSignals].slice(
          0,
          MAX_SIGNALS
        );
        set({ playbackSignals });
      },

      touchPlaylistPlayed: (playlistId) => {
        const playlistHistory = get().playlistHistory.map((p) =>
          p.id === playlistId ? { ...p, lastPlayedAt: Date.now() } : p
        );
        set({ playlistHistory });
      },

      pinRoutine: (emotionId, timeHint = 'any') => {
        const routines = get().routines;
        if (routines.some((r) => r.emotionId === emotionId && r.timeHint === timeHint)) {
          return;
        }
        const routine: EmotionRoutine = {
          id: uid('rt'),
          emotionId,
          label: routineLabel(emotionId, timeHint),
          timeHint,
          pinnedAt: Date.now(),
        };
        set({ routines: [routine, ...routines].slice(0, MAX_ROUTINES) });
      },

      markRoutineUsed: (routineId) => {
        set({
          routines: get().routines.map((r) =>
            r.id === routineId ? { ...r, lastUsedAt: Date.now() } : r
          ),
        });
      },

      getPlaylistById: (id) => get().playlistHistory.find((p) => p.id === id),

      clear: () =>
        set({
          emotionHistory: [],
          playlistHistory: [],
          routines: [],
          playbackSignals: [],
        }),
    }),
    {
      name: 'moodplay-listening-activity',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        emotionHistory: s.emotionHistory,
        playlistHistory: s.playlistHistory,
        routines: s.routines,
        playbackSignals: s.playbackSignals,
      }),
    }
  )
);

function maybeAutoPinRoutine(
  get: () => ListeningActivityStore,
  emotionId: EmotionId
): void {
  const hour = new Date().getHours();
  const recent = get().emotionHistory.filter((e) => e.emotionId === emotionId);
  if (recent.length < 2) return;

  if (emotionId === 'dawn' && hour >= 0 && hour < 7) {
    get().pinRoutine('dawn', 'dawn');
  } else if (emotionId === 'focus' && hour >= 9 && hour < 18) {
    get().pinRoutine('focus', 'focus');
  } else if ((emotionId === 'sad' || emotionId === 'rain') && hour >= 20) {
    get().pinRoutine(emotionId, 'night');
  }
}
