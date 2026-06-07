import type { EmotionId } from '@/types/emotion';

/** 감정 기반 추천 전략 (comfort / recovery / escape / motivation) */
export type MoodStrategyId = 'comfort' | 'recovery' | 'escape' | 'motivation';

/** attempt별 Gemini 탐색 풀 범위 */
export type DiscoveryPressure = 'mainstream' | 'deep_cuts' | 'niche' | 'global';

export type TimeOfDay =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'latenight';

export type ShownTrackRef = {
  videoId: string;
  title: string;
  artist: string;
};

export type MoodStrategySession = {
  session_id: string;
  emotion: EmotionId;
  diary_text: string;
  time_of_day: TimeOfDay;
  user_preferences: {
    genres: string[];
    artists: string[];
  };
  history: {
    attempt_count: number;
    used_strategies: MoodStrategyId[];
    shown_track_ids: string[];
    shown_artist_ids: string[];
    shown_tracks: ShownTrackRef[];
  };
  state: {
    available_strategies: MoodStrategyId[];
    current_strategy: MoodStrategyId | null;
    current_pressure: DiscoveryPressure | null;
  };
};

/** API → backend Gemini layer */
export type StrategyRequestContext = {
  sessionId: string;
  strategyId: MoodStrategyId;
  strategyIntent: string;
  attemptCount: number;
  discoveryPressure: DiscoveryPressure;
  discoveryPressureInstruction: string;
  excludeTracks: Array<{ title: string; artist: string }>;
  excludeArtists: string[];
  excludeVideoIds?: string[];
  candidateCount: number;
};
