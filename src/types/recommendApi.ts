import type { Track } from './track';

/** Edge Function POST /recommend 요청 (snake·camel 모두 수용) */
export type RecommendApiRequest = {
  emotion: string;
  situation?: string;
  userTasteProfile?: UserTasteProfile | null;
  excludeYoutubeIds?: string[];
};

export type UserTasteProfile = {
  favoriteArtists?: string[];
  favoriteMoodTags?: string[];
  preferredEnergyLevel?: number;
  preferredEnergyMin?: number;
  preferredEnergyMax?: number;
  frequentEmotionIds?: string[];
  skippedMoodTags?: string[];
  repeatPlayYoutubeIds?: string[];
  likedYoutubeIds?: string[];
  /** 0 = 익숙함, 1 = 발견 */
  discoveryRatio?: number;
};

/** Edge Function 응답 */
export type RecommendApiResponse = {
  playlistName: string;
  playlistComment: string;
  tracks: RecommendApiTrack[];
  meta?: {
    source: 'claude' | 'mock' | 'fallback';
    resolvedCount?: number;
  };
};

/** Edge·DB 공통 트랙 DTO (camelCase) */
export type RecommendApiTrack = {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSec?: number | null;
  moodTags?: string[];
  energyLevel?: number | null;
  noveltyTier?: 'familiar' | 'mid' | 'hidden' | null;
};

export function isRecommendApiResponse(value: unknown): value is RecommendApiResponse {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.playlistName === 'string' &&
    typeof o.playlistComment === 'string' &&
    Array.isArray(o.tracks)
  );
}

export function mapApiTrackToAppTrack(t: RecommendApiTrack): Track {
  return {
    id: t.id,
    youtubeId: t.youtubeId,
    title: t.title,
    artist: t.artist,
    thumbnailUrl: t.thumbnailUrl,
    durationSec: t.durationSec ?? undefined,
    moodTags: t.moodTags,
    energyLevel: t.energyLevel ?? undefined,
    noveltyTier: t.noveltyTier ?? undefined,
  };
}
