import type { EnergyArcProfile } from './playlistFlow.ts';
import type { ClaudeRecommendationPlan, RecommendRequest } from './types.ts';

const EMOTION_MOOD: Record<string, string[]> = {
  sad: ['우울', '잔잔한', '몽환적'],
  dawn: ['새벽', '몽환적', '잔잔한'],
  focus: ['집중', '몽환적'],
  rain: ['비', '잔잔한', '감성'],
  walk: ['산책', '감성', '잔잔한'],
  blank: ['멍', '잔잔한', '배경'],
};

const ENERGY_BY_EMOTION: Record<string, [number, number]> = {
  sad: [2, 5],
  dawn: [2, 5],
  focus: [5, 8],
  rain: [2, 5],
  walk: [3, 6],
  blank: [1, 4],
};

const NOVELTY_BY_EMOTION: Record<
  string,
  { familiar: number; mid: number; hidden: number }
> = {
  sad: { familiar: 0.45, mid: 0.35, hidden: 0.2 },
  dawn: { familiar: 0.4, mid: 0.35, hidden: 0.25 },
  focus: { familiar: 0.55, mid: 0.3, hidden: 0.15 },
  rain: { familiar: 0.5, mid: 0.3, hidden: 0.2 },
  walk: { familiar: 0.45, mid: 0.35, hidden: 0.2 },
  blank: { familiar: 0.4, mid: 0.4, hidden: 0.2 },
};

const MAX_ARTIST_BY_EMOTION: Record<string, number> = {
  sad: 1,
  dawn: 1,
  walk: 1,
  focus: 2,
  rain: 2,
  blank: 2,
};

const ARC_BY_EMOTION: Record<string, EnergyArcProfile> = {
  sad: 'wave',
  dawn: 'steady',
  focus: 'gentle-lift',
  rain: 'calm-settle',
  walk: 'gentle-lift',
  blank: 'calm-settle',
};

/**
 * Claude 출력 → trackResolver용 큐레이션 스펙 (곡 ID 목록 아님).
 */
export function buildRecommendationPlan(
  raw: ClaudeRecommendationPlan,
  request: RecommendRequest
): ClaudeRecommendationPlan {
  const emotion = request.emotion || 'blank';
  const playlistName = raw.playlistName?.trim() || '오늘의 플레이리스트';
  const playlistComment =
    raw.playlistComment?.trim() ||
    (request.situation?.trim()
      ? `“${request.situation.trim()}”에 어울리는 선곡`
      : '지금 기분에 맞는 음악');

  const moodTags =
    raw.moodTags?.length ? raw.moodTags : (EMOTION_MOOD[emotion] ?? ['감성']);

  const [defaultMin, defaultMax] = ENERGY_BY_EMOTION[emotion] ?? [2, 6];
  const taste = request.userTasteProfile;

  let energyMin = clampEnergy(raw.energyMin ?? defaultMin);
  let energyMax = clampEnergy(raw.energyMax ?? defaultMax);
  if (taste?.preferredEnergyMin != null && taste?.preferredEnergyMax != null) {
    energyMin = clampEnergy((energyMin + taste.preferredEnergyMin) / 2);
    energyMax = clampEnergy((energyMax + taste.preferredEnergyMax) / 2);
  }

  let noveltyRatio = raw.noveltyRatio ?? NOVELTY_BY_EMOTION[emotion] ?? {
    familiar: 0.5,
    mid: 0.3,
    hidden: 0.2,
  };
  if (taste?.discoveryRatio != null) {
    const d = taste.discoveryRatio;
    noveltyRatio = {
      familiar: Math.max(0.25, 0.55 - d * 0.22),
      mid: 0.3,
      hidden: Math.min(0.35, 0.12 + d * 0.28),
    };
  }

  return {
    playlistName,
    playlistComment,
    moodTags,
    energyMin,
    energyMax,
    limit: raw.limit ?? 12,
    noveltyRatio,
    energyArc: raw.energyArc ?? ARC_BY_EMOTION[emotion] ?? 'calm-settle',
    maxPerArtist: raw.maxPerArtist ?? MAX_ARTIST_BY_EMOTION[emotion] ?? 2,
    excludeYoutubeIds: [
      ...(raw.excludeYoutubeIds ?? []),
      ...(request.excludeYoutubeIds ?? []),
    ],
    userTasteProfile: taste ?? null,
  };
}

function clampEnergy(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n)));
}
