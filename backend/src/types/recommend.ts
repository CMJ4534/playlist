import type { EmotionId } from '../services/emotionKeywords.js';
import type { MoodStrategyId } from '../constants/moodStrategies.js';
import type { DiscoveryPressure } from '../constants/discoveryPressure.js';

/** Strategy Layer → Gemini 컨텍스트 */
export type StrategyRequestContext = {
  sessionId: string;
  strategyId: MoodStrategyId;
  strategyIntent: string;
  attemptCount: number;
  discoveryPressure: DiscoveryPressure;
  discoveryPressureInstruction: string;
  excludeTracks: Array<{ title: string; artist: string }>;
  excludeArtists: string[];
  /** 재추천 fallback — 이미 재생한 videoId 제외 */
  excludeVideoIds?: string[];
  candidateCount: number;
};

/** POST /api/recommend 요청 */
export type RecommendRequestBody = {
  emotion: string;
  diary?: string;
  situation?: string;
  tastePreferences?: {
    favoriteGenres: string[];
    favoriteArtists: [string, string, string];
  };
  strategyContext?: StrategyRequestContext;
};

/** Gemini 후보 1곡 */
export type SongCandidate = {
  title: string;
  artist: string;
};

/** Gemini candidate generator 출력 (최종 플레이리스트 아님) */
export type GeminiCandidatesResponse = {
  candidates: SongCandidate[];
};

/** @deprecated GeminiCandidatesResponse 사용 */
export type GeminiPlaylistResponse = {
  playlistName: string;
  playlistComment: string;
  songs: SongCandidate[];
};

/** 앱 moodplayApi.RecommendResponse 와 동일 계약 */
export type RecommendApiResponse = {
  emotion: EmotionId;
  emotionLabel: string;
  emotionEmoji: string;
  moodTag: string;
  diary: string | null;
  playback: {
    tier: 'videoIds';
    videos: Array<{
      videoId: string;
      title: string;
      artist: string;
      channelTitle: string;
      thumbnailUrl: string;
      youtubeUrl: string;
      mood: string;
      moodTag: string;
    }>;
    totalCount: number;
  };
  meta: {
    videoCount: number;
    source: string;
    timestamp: number;
    playlistName?: string;
    playlistComment?: string;
  };
};
