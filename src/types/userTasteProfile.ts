import type { EmotionId } from '@/types/emotion';

/**
 * 로컬 분석 결과 — 추천·analytics·Edge API에 매핑 가능한 구조.
 */
export type AnalyzedUserTasteProfile = {
  analyzedAt: number;
  sampleSize: number;

  frequentEmotionIds: EmotionId[];
  emotionCounts: Partial<Record<EmotionId, number>>;

  preferredEnergyMin: number;
  preferredEnergyMax: number;
  preferredEnergyLevel: number;

  favoriteArtists: string[];
  favoriteMoodTags: string[];
  skippedMoodTags: string[];
  repeatPlayYoutubeIds: string[];
  likedYoutubeIds: string[];
  savedPlaylistCount: number;

  /** 0 = 익숙함 선호, 1 = 발견 선호 */
  discoveryRatio: number;
};
