import type { EmotionId } from '@/types/emotion';
import type { NoveltyTier, Track } from '@/types/track';

/**
 * 감정별 추천 플레이리스트 다양성 점수 (0~1, 높을수록 다양).
 * 운영·DEV 검증·향후 A/B에 사용.
 */
export type PlaylistDiversityScore = {
  artistDiversity: number;
  moodVariety: number;
  noveltyMix: number;
  /** 가중 평균 */
  overall: number;
};

const NOVELTY_IDEAL: Record<NoveltyTier, number> = {
  familiar: 0.45,
  mid: 0.35,
  hidden: 0.2,
};

function uniqueArtists(tracks: Track[]): number {
  return new Set(tracks.map((t) => t.artist.trim().toLowerCase())).size;
}

function uniqueMoodTags(tracks: Track[]): number {
  const tags = new Set<string>();
  for (const t of tracks) {
    for (const tag of t.moodTags ?? []) tags.add(tag);
  }
  return tags.size;
}

function noveltyMixScore(tracks: Track[]): number {
  if (!tracks.length) return 0;
  const counts: Record<NoveltyTier, number> = {
    familiar: 0,
    mid: 0,
    hidden: 0,
  };
  for (const t of tracks) {
    const tier = t.noveltyTier ?? 'mid';
    counts[tier]++;
  }
  const n = tracks.length;
  let deviation = 0;
  for (const tier of ['familiar', 'mid', 'hidden'] as NoveltyTier[]) {
    const actual = counts[tier] / n;
    deviation += Math.abs(actual - NOVELTY_IDEAL[tier]);
  }
  return Math.max(0, 1 - deviation / 2);
}

/**
 * 플레이리스트 다양성 점수 계산.
 */
export function scorePlaylistDiversity(tracks: Track[]): PlaylistDiversityScore {
  if (!tracks.length) {
    return { artistDiversity: 0, moodVariety: 0, noveltyMix: 0, overall: 0 };
  }

  const n = tracks.length;
  const artistDiversity = uniqueArtists(tracks) / n;
  const moodVariety = Math.min(1, uniqueMoodTags(tracks) / Math.max(4, n * 0.6));
  const noveltyMix = noveltyMixScore(tracks);
  const overall =
    artistDiversity * 0.4 + moodVariety * 0.35 + noveltyMix * 0.25;

  return {
    artistDiversity: round2(artistDiversity),
    moodVariety: round2(moodVariety),
    noveltyMix: round2(noveltyMix),
    overall: round2(overall),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** DEV 로그용 — emotion 라벨 포함 */
export function logPlaylistDiversity(
  emotionId: EmotionId,
  tracks: Track[],
  score: PlaylistDiversityScore
): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.info(`[recommendation:diversity] ${emotionId}`, score, {
    artists: uniqueArtists(tracks),
    tracks: tracks.length,
  });
}
