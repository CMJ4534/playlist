import type { NoveltyTier, Track } from '@/types/track';

export const DEFAULT_NOVELTY_RATIO: Record<NoveltyTier, number> = {
  familiar: 0.5,
  mid: 0.3,
  hidden: 0.2,
};

export type DiverseTracksOptions = {
  moodTags: string[];
  energyMin?: number;
  energyMax?: number;
  limit?: number;
  minTracks?: number;
  noveltyRatio?: Partial<Record<NoveltyTier, number>>;
  maxPerArtist?: number;
  excludeYoutubeIds?: string[];
  /** 추천·재생 빈도가 높은 곡 — pick 점수 감점 */
  overusedYoutubeIds?: string[];
  overusePenalty?: number;
  /** userTasteProfile 기반 가중치 */
  boostArtists?: string[];
  boostMoodTags?: string[];
  penalizeMoodTags?: string[];
  boostYoutubeIds?: string[];

  // ─── 반복감 감소 (v2) ──────────────────────────
  /** youtubeId → 최근 노출 횟수 (exposure decay 계산용) */
  exposureCounts?: Record<string, number>;
  /** 노출 decay 가중치 (기본 1.5 — 클수록 최근 노출 곡 감점) */
  exposureDecayWeight?: number;
  /** hidden gem 최소 보장 비율 (기본 0.15) */
  hiddenGemMinRatio?: number;
  /** picked 내 연속 동일 mood 제한 (기본 3) */
  maxConsecutiveSameMood?: number;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function moodScore(track: Track, moodTags: string[]): number {
  const tags = track.moodTags ?? [];
  return moodTags.filter((t) => tags.includes(t)).length;
}

function matchesMood(track: Track, moodTags: string[]): boolean {
  if (!moodTags.length) return true;
  return moodScore(track, moodTags) > 0;
}

function matchesEnergy(track: Track, min?: number, max?: number): boolean {
  const e = track.energyLevel ?? 5;
  if (min != null && e < min) return false;
  if (max != null && e > max) return false;
  return true;
}

function tierOf(track: Track): NoveltyTier {
  return track.noveltyTier ?? 'mid';
}

function moodOverlapWithPicked(track: Track, picked: Track[]): number {
  if (!picked.length) return 0;
  const tags = new Set(track.moodTags ?? []);
  let overlap = 0;
  for (const p of picked) {
    for (const t of p.moodTags ?? []) {
      if (tags.has(t)) overlap++;
    }
  }
  return overlap;
}

function exposureDecayPenalty(
  youtubeId: string,
  exposureCounts: Record<string, number> | undefined,
  weight: number
): number {
  if (!exposureCounts) return 0;
  const count = exposureCounts[youtubeId] ?? 0;
  if (count <= 0) return 0;
  // 지수 감쇄: 1회 노출 → weight*0.5, 2회 → weight*0.75, 3회+ → weight*~1.0
  return weight * (1 - Math.exp(-count * 0.5));
}

function consecutiveMoodPenalty(
  track: Track,
  picked: Track[],
  maxConsecutive: number
): number {
  if (picked.length < maxConsecutive) return 0;
  const trackTags = new Set(track.moodTags ?? []);
  if (!trackTags.size) return 0;

  const recentPicked = picked.slice(-maxConsecutive);
  let allShareMood = true;
  for (const p of recentPicked) {
    const pTags = p.moodTags ?? [];
    if (!pTags.some((t) => trackTags.has(t))) {
      allShareMood = false;
      break;
    }
  }

  return allShareMood ? 3 : 0;
}

function pickScore(
  track: Track,
  picked: Track[],
  options: DiverseTracksOptions
): number {
  let score = moodScore(track, options.moodTags) * 3;
  score += Math.random() * 0.4;

  // ── 기존 overuse 감점 ──
  const overuse = new Set(options.overusedYoutubeIds ?? []);
  if (overuse.has(track.youtubeId)) {
    score -= options.overusePenalty ?? 4;
  }

  // ── exposure decay (v2) ──
  score -= exposureDecayPenalty(
    track.youtubeId,
    options.exposureCounts,
    options.exposureDecayWeight ?? 1.5
  );

  // ── mood overlap 감점 ──
  const moodOverlap = moodOverlapWithPicked(track, picked);
  if (moodOverlap > 2) score -= (moodOverlap - 2) * 1.2;

  // ── 연속 동일 mood 제한 (v2) ──
  score -= consecutiveMoodPenalty(
    track,
    picked,
    options.maxConsecutiveSameMood ?? 3
  );

  // ── 아티스트 다양성 강화 ──
  const artistKey = track.artist.trim().toLowerCase();
  const sameArtist = picked.filter(
    (p) => p.artist.trim().toLowerCase() === artistKey
  ).length;
  if (sameArtist > 0) score -= sameArtist * 2.5;

  // ── 아티스트 boost ──
  const boostArtists = new Set(
    (options.boostArtists ?? []).map((a) => a.trim().toLowerCase())
  );
  if (boostArtists.has(artistKey)) score += 2.5;

  const boostMoods = options.boostMoodTags ?? [];
  score += moodScore(track, boostMoods) * 1.5;

  const penalizeMoods = options.penalizeMoodTags ?? [];
  score -= moodScore(track, penalizeMoods) * 2;

  const boostIds = new Set(options.boostYoutubeIds ?? []);
  if (boostIds.has(track.youtubeId)) score += 1.8;

  // ── hidden gem 보너스 (v2) ──
  if (tierOf(track) === 'hidden') score += 0.8;

  return score;
}

/**
 * 풀에서 mood/energy 필터 → novelty 비율 → 아티스트·mood·과다노출 최소화.
 */
export function selectDiverseTracks(
  pool: Track[],
  options: DiverseTracksOptions
): Track[] {
  const limit = options.limit ?? 12;
  const minTracks = options.minTracks ?? 10;
  const maxPerArtist = options.maxPerArtist ?? 2;
  const ratio = { ...DEFAULT_NOVELTY_RATIO, ...options.noveltyRatio };
  const exclude = new Set(options.excludeYoutubeIds ?? []);

  let filtered = pool.filter(
    (t) =>
      t.youtubeId?.trim() &&
      !exclude.has(t.youtubeId) &&
      matchesEnergy(t, options.energyMin, options.energyMax)
  );

  const moodMatched = filtered.filter((t) => matchesMood(t, options.moodTags));
  if (moodMatched.length >= minTracks) {
    filtered = moodMatched;
  }

  if (!filtered.length) {
    filtered = pool.filter(
      (t) => t.youtubeId?.trim() && !exclude.has(t.youtubeId)
    );
  }

  const byTier: Record<NoveltyTier, Track[]> = {
    familiar: shuffle(filtered.filter((t) => tierOf(t) === 'familiar')),
    mid: shuffle(filtered.filter((t) => tierOf(t) === 'mid')),
    hidden: shuffle(filtered.filter((t) => tierOf(t) === 'hidden')),
  };

  const targets: Record<NoveltyTier, number> = {
    familiar: Math.round(limit * ratio.familiar),
    mid: Math.round(limit * ratio.mid),
    hidden: Math.max(
      0,
      limit - Math.round(limit * ratio.familiar) - Math.round(limit * ratio.mid)
    ),
  };

  const picked: Track[] = [];
  const artistCount = new Map<string, number>();
  const pickedYoutube = new Set<string>();

  const tryPick = (track: Track) => {
    const key = track.artist.trim().toLowerCase();
    if ((artistCount.get(key) ?? 0) >= maxPerArtist) return false;
    if (pickedYoutube.has(track.youtubeId)) return false;
    picked.push(track);
    pickedYoutube.add(track.youtubeId);
    artistCount.set(key, (artistCount.get(key) ?? 0) + 1);
    return true;
  };

  const pickBestFrom = (candidates: Track[]) => {
    if (!candidates.length) return null;
    const ranked = [...candidates].sort(
      (a, b) => pickScore(b, picked, options) - pickScore(a, picked, options)
    );
    return ranked[0] ?? null;
  };

  for (const tier of ['familiar', 'mid', 'hidden'] as NoveltyTier[]) {
    let n = targets[tier];
    const tierPool = byTier[tier].filter((t) => !pickedYoutube.has(t.youtubeId));
    while (n > 0 && picked.length < limit && tierPool.length) {
      const best = pickBestFrom(tierPool);
      if (!best) break;
      const idx = tierPool.indexOf(best);
      if (idx >= 0) tierPool.splice(idx, 1);
      if (tryPick(best)) n--;
    }
  }

  // ── hidden gem 최소 보장 (v2) ──
  const hiddenGemMinRatio = options.hiddenGemMinRatio ?? 0.15;
  const currentHiddenCount = picked.filter((t) => tierOf(t) === 'hidden').length;
  const requiredHidden = Math.ceil(limit * hiddenGemMinRatio);
  if (currentHiddenCount < requiredHidden) {
    const hiddenCandidates = shuffle(
      filtered.filter((t) => tierOf(t) === 'hidden' && !pickedYoutube.has(t.youtubeId))
    );
    for (const track of hiddenCandidates) {
      if (picked.filter((t) => tierOf(t) === 'hidden').length >= requiredHidden) break;
      if (picked.length >= limit) break;
      tryPick(track);
    }
  }

  if (picked.length < limit) {
    const remaining = shuffle(
      filtered.filter((t) => !pickedYoutube.has(t.youtubeId))
    );
    for (const track of remaining) {
      if (picked.length >= limit) break;
      tryPick(track);
    }
  }

  if (picked.length < minTracks) {
    for (const track of shuffle(pool)) {
      if (picked.length >= minTracks) break;
      if (!track.youtubeId?.trim() || exclude.has(track.youtubeId)) continue;
      if (pickedYoutube.has(track.youtubeId)) continue;
      tryPick(track);
    }
  }

  return picked.slice(0, limit);
}

export function selectRandomTracks(pool: Track[], limit: number): Track[] {
  return shuffle(pool).slice(0, limit);
}
