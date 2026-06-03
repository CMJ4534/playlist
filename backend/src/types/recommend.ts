import type { EmotionId } from '../services/emotionKeywords.js';

/** POST /api/recommend 요청 */
export type RecommendRequestBody = {
  emotion: string;
  diary?: string;
  situation?: string;
  tastePreferences?: {
    favoriteGenres: string[];
    favoriteArtists: [string, string, string];
  };
};

/** Gemini가 반환해야 하는 JSON (내부) */
export type GeminiPlaylistResponse = {
  playlistName: string;
  playlistComment: string;
  songs: Array<{ title: string; artist: string }>;
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
