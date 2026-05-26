import { BLANK_SEED_TRACKS } from './blank';
import { DAWN_SEED_TRACKS } from './dawn';
import { FOCUS_SEED_TRACKS } from './focus';
import { RAIN_SEED_TRACKS } from './rain';
import { SAD_SEED_TRACKS } from './sad';
import { WALKING_SEED_TRACKS } from './walking';
import type { Track } from '@/types/track';
import type { SeedCategory } from './types';

export { SAD_SEED_TRACKS } from './sad';
export { DAWN_SEED_TRACKS } from './dawn';
export { FOCUS_SEED_TRACKS } from './focus';
export { RAIN_SEED_TRACKS } from './rain';
export { WALKING_SEED_TRACKS } from './walking';
export { BLANK_SEED_TRACKS } from './blank';

/** 카테고리 → seed 트랙 (emotionId walk → walking) */
export const SEED_TRACKS_BY_CATEGORY: Record<SeedCategory, Track[]> = {
  sad: SAD_SEED_TRACKS,
  dawn: DAWN_SEED_TRACKS,
  focus: FOCUS_SEED_TRACKS,
  rain: RAIN_SEED_TRACKS,
  walking: WALKING_SEED_TRACKS,
  blank: BLANK_SEED_TRACKS,
};

/** 전체 seed (중복 youtube_id 제거 후) — 약 80~120곡 */
export const ALL_SEED_TRACKS: Track[] = [
  ...SAD_SEED_TRACKS,
  ...DAWN_SEED_TRACKS,
  ...FOCUS_SEED_TRACKS,
  ...RAIN_SEED_TRACKS,
  ...WALKING_SEED_TRACKS,
  ...BLANK_SEED_TRACKS,
];

export function getSeedTracksForCategory(category: SeedCategory): Track[] {
  return SEED_TRACKS_BY_CATEGORY[category] ?? [];
}

/** 통계 (seed 검증·로그용) */
export function getSeedStats() {
  const byCategory = Object.entries(SEED_TRACKS_BY_CATEGORY).map(([cat, tracks]) => ({
    category: cat,
    count: tracks.length,
    familiar: tracks.filter((t) => t.noveltyTier === 'familiar').length,
    mid: tracks.filter((t) => t.noveltyTier === 'mid').length,
    hidden: tracks.filter((t) => t.noveltyTier === 'hidden').length,
  }));

  return {
    total: ALL_SEED_TRACKS.length,
    byCategory,
  };
}
