import { create } from 'zustand';

import { createInitialAvailableStrategies } from '@/services/strategy/strategySelector';
import { getTastePreferencesPayload } from '@/stores/tastePreferencesStore';
import type { EmotionId } from '@/types/emotion';
import type {
  DiscoveryPressure,
  MoodStrategyId,
  MoodStrategySession,
  ShownTrackRef,
} from '@/types/moodStrategy';
import { getTimeOfDay } from '@/lib/timeOfDay';

function newSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildUserPreferences(): MoodStrategySession['user_preferences'] {
  const taste = getTastePreferencesPayload();
  if (!taste) {
    return { genres: [], artists: [] };
  }
  return {
    genres: taste.favoriteGenres,
    artists: [...taste.favoriteArtists],
  };
}

function createEmptySession(emotion: EmotionId, diaryText: string): MoodStrategySession {
  return {
    session_id: newSessionId(),
    emotion,
    diary_text: diaryText,
    time_of_day: getTimeOfDay(),
    user_preferences: buildUserPreferences(),
    history: {
      attempt_count: 0,
      used_strategies: [],
      shown_track_ids: [],
      shown_artist_ids: [],
      shown_tracks: [],
    },
    state: {
      available_strategies: createInitialAvailableStrategies(),
      current_strategy: null,
      current_pressure: null,
    },
  };
}

type MoodStrategySessionStore = {
  session: MoodStrategySession | null;

  /** 새 감정/일기 → session 초기화 */
  startSession: (emotion: EmotionId, diaryText: string) => MoodStrategySession;

  /** 재추천 등 기존 session 유지 */
  getSession: () => MoodStrategySession | null;

  setCurrentStrategy: (strategy: MoodStrategyId) => void;

  setCurrentPressure: (pressure: DiscoveryPressure) => void;

  /** 추천 완료 후 history/state 업데이트 */
  commitRecommendation: (tracks: ShownTrackRef[]) => void;

  clearSession: () => void;
};

function normalizeArtistId(artist: string): string {
  return artist.trim().toLowerCase();
}

export const useMoodStrategySessionStore = create<MoodStrategySessionStore>((set, get) => ({
  session: null,

  startSession: (emotion, diaryText) => {
    const normalizedDiary = diaryText.trim();
    const existing = get().session;

    if (
      existing &&
      existing.emotion === emotion &&
      existing.diary_text === normalizedDiary
    ) {
      return existing;
    }

    const session = createEmptySession(emotion, normalizedDiary);
    set({ session });
    return session;
  },

  getSession: () => get().session,

  setCurrentStrategy: (strategy) => {
    const session = get().session;
    if (!session) return;
    set({
      session: {
        ...session,
        state: { ...session.state, current_strategy: strategy },
      },
    });
  },

  setCurrentPressure: (pressure) => {
    const session = get().session;
    if (!session) return;
    set({
      session: {
        ...session,
        state: { ...session.state, current_pressure: pressure },
      },
    });
  },

  commitRecommendation: (tracks) => {
    const session = get().session;
    if (!session?.state.current_strategy) return;

    const strategy = session.state.current_strategy;
    const newTrackIds = tracks.map((t) => t.videoId);
    const newArtistIds = tracks.map((t) => normalizeArtistId(t.artist));

    const shown_track_ids = [
      ...new Set([...session.history.shown_track_ids, ...newTrackIds]),
    ];
    const shown_artist_ids = [
      ...new Set([...session.history.shown_artist_ids, ...newArtistIds]),
    ];
    const shown_tracks = [...session.history.shown_tracks];
    for (const t of tracks) {
      if (!shown_tracks.some((x) => x.videoId === t.videoId)) {
        shown_tracks.push(t);
      }
    }

    let available_strategies = session.state.available_strategies.filter(
      (id) => id !== strategy
    );
    const attempt_count = session.history.attempt_count + 1;

    if (attempt_count >= 4 && available_strategies.length === 0) {
      available_strategies = createInitialAvailableStrategies().filter(
        (id) => id !== strategy
      );
    }

    set({
      session: {
        ...session,
        history: {
          attempt_count,
          used_strategies: [...session.history.used_strategies, strategy],
          shown_track_ids,
          shown_artist_ids,
          shown_tracks,
        },
        state: {
          available_strategies,
          current_strategy: strategy,
          current_pressure: session.state.current_pressure,
        },
      },
    });
  },

  clearSession: () => set({ session: null }),
}));
