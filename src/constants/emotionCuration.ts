import type { EmotionId } from '@/types/emotion';
import type { NoveltyTier } from '@/types/track';
import type { EnergyArcProfile } from '@/lib/playlistFlow';

export type EmotionCurationProfile = {
  moodTags: string[];
  priorityTags: string[];
  energyMin: number;
  energyMax: number;
  energyArc: EnergyArcProfile;
  noveltyRatio: Record<NoveltyTier, number>;
  maxPerArtist: number;
  limit: number;
};

const PROFILES: Record<EmotionId, EmotionCurationProfile> = {
  sad: {
    moodTags: ['우울', '감성', '잔잔한', '이별'],
    priorityTags: ['우울', '잔잔한', '이별', '감성'],
    energyMin: 2,
    energyMax: 5,
    energyArc: 'wave',
    noveltyRatio: { familiar: 0.4, mid: 0.4, hidden: 0.2 },
    maxPerArtist: 1,
    limit: 12,
  },
  dawn: {
    moodTags: ['새벽', '몽환적', '감성', '잔잔한'],
    priorityTags: ['새벽', '몽환적', '잔잔한'],
    energyMin: 2,
    energyMax: 5,
    energyArc: 'steady',
    noveltyRatio: { familiar: 0.35, mid: 0.4, hidden: 0.25 },
    maxPerArtist: 1,
    limit: 12,
  },
  focus: {
    moodTags: ['집중', '몰입'],
    priorityTags: ['집중'],
    energyMin: 5,
    energyMax: 8,
    energyArc: 'gentle-lift',
    noveltyRatio: { familiar: 0.55, mid: 0.3, hidden: 0.15 },
    maxPerArtist: 2,
    limit: 12,
  },
  rain: {
    moodTags: ['비', '잔잔한', '감성'],
    priorityTags: ['비', '잔잔한'],
    energyMin: 2,
    energyMax: 5,
    energyArc: 'calm-settle',
    noveltyRatio: { familiar: 0.5, mid: 0.3, hidden: 0.2 },
    maxPerArtist: 2,
    limit: 12,
  },
  walk: {
    moodTags: ['산책', '감성', '잔잔한'],
    priorityTags: ['산책', '감성', '잔잔한'],
    energyMin: 3,
    energyMax: 6,
    energyArc: 'gentle-lift',
    noveltyRatio: { familiar: 0.4, mid: 0.4, hidden: 0.2 },
    maxPerArtist: 1,
    limit: 12,
  },
  blank: {
    moodTags: ['멍', '잔잔한', '배경'],
    priorityTags: ['멍', '잔잔한'],
    energyMin: 1,
    energyMax: 4,
    energyArc: 'calm-settle',
    noveltyRatio: { familiar: 0.4, mid: 0.4, hidden: 0.2 },
    maxPerArtist: 2,
    limit: 12,
  },
};

export function getEmotionCurationProfile(emotionId: EmotionId): EmotionCurationProfile {
  return PROFILES[emotionId];
}
