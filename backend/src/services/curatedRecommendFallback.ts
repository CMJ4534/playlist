import type { RecommendApiResponse, StrategyRequestContext } from '../types/recommend.js';
import { getCuratedPlaylist } from './curatedCatalog.js';
import {
  getEmotionProfile,
  getMoodTag,
  type EmotionId,
} from './emotionKeywords.js';

const TARGET_PLAYLIST_SIZE = 10;

/** Gemini·YouTube 실패 시 내부 카탈로그 (재추천 시 exclude·attempt 반영) */
export function buildCuratedRecommendResponse(
  emotionId: EmotionId,
  diary: string | null,
  source = 'curated_catalog',
  strategyContext?: StrategyRequestContext
): RecommendApiResponse {
  const profile = getEmotionProfile(emotionId);
  const moodTag = getMoodTag(emotionId);

  const excludeVideoIds = strategyContext?.excludeVideoIds ?? [];
  const attemptOffset = strategyContext?.attemptCount ?? 0;

  const tracks = getCuratedPlaylist(emotionId, TARGET_PLAYLIST_SIZE, {
    excludeVideoIds,
    attemptOffset,
  });

  const videos = tracks.map((t) => ({
    videoId: t.videoId,
    title: t.title,
    artist: t.artist,
    channelTitle: t.artist,
    thumbnailUrl: t.thumbnailUrl,
    youtubeUrl: `https://www.youtube.com/watch?v=${t.videoId}`,
    mood: t.mood,
    moodTag: t.mood,
  }));

  return {
    emotion: emotionId,
    emotionLabel: profile?.label ?? emotionId,
    emotionEmoji: profile?.emoji ?? '🎵',
    moodTag,
    diary,
    playback: {
      tier: 'videoIds',
      videos,
      totalCount: videos.length,
    },
    meta: {
      videoCount: videos.length,
      source,
      timestamp: Date.now(),
    },
  };
}
