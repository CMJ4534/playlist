/** 추천 다양성 티어 */
export type NoveltyTier = 'familiar' | 'mid' | 'hidden';

/**
 * 재생·추천·DB가 공유하는 곡 모델 (앱 단일 소스).
 * Supabase tracks 행은 mapDbTrackToTrack()으로 변환한다.
 */
export type Track = {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSec?: number;
  moodTags?: string[];
  /** DB energy_level — 추천·필터용 (1–10) */
  energyLevel?: number;
  /** DB novelty_tier — familiar / mid / hidden */
  noveltyTier?: NoveltyTier;
};
