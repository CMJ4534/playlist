/** Edge Function 내부 DTO */

export type RecommendRequest = {
  emotion: string;
  situation?: string;
  userTasteProfile?: UserTasteProfile | null;
  /** 최근 추천·재생 곡 제외 (youtube_id) */
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
  discoveryRatio?: number;
};

export type RecommendResponse = {
  playlistName: string;
  playlistComment: string;
  tracks: RecommendTrackDto[];
  meta?: {
    source: 'claude' | 'mock' | 'fallback';
    resolvedCount?: number;
  };
};

export type RecommendTrackDto = {
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

/**
 * Claude 역할: 플레이리스트 메타 + 큐레이션 스펙.
 * 실제 곡은 trackResolver가 DB에서 diverse 샘플링.
 */
export type ClaudeRecommendationPlan = {
  playlistName: string;
  playlistComment: string;
  moodTags: string[];
  energyMin: number;
  energyMax: number;
  limit?: number;
  noveltyRatio?: { familiar?: number; mid?: number; hidden?: number };
  maxPerArtist?: number;
  excludeYoutubeIds?: string[];
  energyArc?: 'calm-settle' | 'gentle-lift' | 'wave' | 'steady';
  userTasteProfile?: UserTasteProfile | null;
  /** @deprecated — DB diverse resolve 사용 */
  trackRefs?: TrackRef[];
};

export type TrackRef = {
  trackId?: string;
  title?: string;
  artist?: string;
  /** youtubeId 없을 때 검색 쿼리 */
  searchQuery?: string;
};
