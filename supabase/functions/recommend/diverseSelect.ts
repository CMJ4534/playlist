import type { RecommendTrackDto, UserTasteProfile } from './types.ts';

export type NoveltyTier = 'familiar' | 'mid' | 'hidden';

const DEFAULT_RATIO: Record<NoveltyTier, number> = {
  familiar: 0.5,
  mid: 0.3,
  hidden: 0.2,
};

export type DiverseSelectOptions = {
  limit?: number;
  minTracks?: number;
  moodTags: string[];
  energyMin?: number;
  energyMax?: number;
  noveltyRatio?: Partial<Record<NoveltyTier, number>>;
  maxPerArtist?: number;
  excludeYoutubeIds?: string[];
  userTasteProfile?: UserTasteProfile | null;
};

function tastePickScore(
  track: RecommendTrackDto,
  moodTags: string[],
  taste?: UserTasteProfile | null
): number {
  let score = moodScore(track, moodTags) * 3 + Math.random() * 0.35;
  if (!taste) return score;

  const artistKey = track.artist.trim().toLowerCase();
  const boostArtists = new Set(
    (taste.favoriteArtists ?? []).map((a) => a.trim().toLowerCase())
  );
  if (boostArtists.has(artistKey)) score += 2.5;

  score += moodScore(track, taste.favoriteMoodTags ?? []) * 1.5;
  score -= moodScore(track, taste.skippedMoodTags ?? []) * 2;

  const boostIds = new Set([
    ...(taste.repeatPlayYoutubeIds ?? []),
    ...(taste.likedYoutubeIds ?? []),
  ]);
  if (boostIds.has(track.youtubeId)) score += 1.8;

  return score;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tierOf(t: RecommendTrackDto): NoveltyTier {
  return (t.noveltyTier as NoveltyTier) ?? 'mid';
}

function moodScore(track: RecommendTrackDto, moodTags: string[]): number {
  const tags = track.moodTags ?? [];
  return moodTags.filter((t) => tags.includes(t)).length;
}

function matchesEnergy(t: RecommendTrackDto, min?: number, max?: number): boolean {
  const e = t.energyLevel ?? 5;
  if (min != null && e < min) return false;
  if (max != null && e > max) return false;
  return true;
}

/**
 * DB 풀 → mood 우선 정렬 → energy → novelty 비율 → 아티스트·중복 제외.
 */
export function selectDiverseTracks(
  pool: RecommendTrackDto[],
  options: DiverseSelectOptions
): RecommendTrackDto[] {
  const limit = options.limit ?? 12;
  const minTracks = options.minTracks ?? 10;
  const maxPerArtist = options.maxPerArtist ?? 2;
  const ratio = { ...DEFAULT_RATIO, ...options.noveltyRatio };
  const exclude = new Set(options.excludeYoutubeIds ?? []);

  let filtered = pool.filter(
    (t) =>
      t.youtubeId &&
      !exclude.has(t.youtubeId) &&
      matchesEnergy(t, options.energyMin, options.energyMax)
  );

  filtered.sort((a, b) => moodScore(b, options.moodTags) - moodScore(a, options.moodTags));

  const moodMatched = filtered.filter((t) => moodScore(t, options.moodTags) > 0);
  if (moodMatched.length >= minTracks) {
    filtered = moodMatched;
  }

  if (filtered.length < minTracks) {
    filtered = pool.filter((t) => t.youtubeId && !exclude.has(t.youtubeId));
  }

  const byTier: Record<NoveltyTier, RecommendTrackDto[]> = {
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

  const picked: RecommendTrackDto[] = [];
  const artistCount = new Map<string, number>();
  const pickedIds = new Set<string>();

  const tryPick = (track: RecommendTrackDto) => {
    const artistKey = track.artist.trim().toLowerCase();
    if ((artistCount.get(artistKey) ?? 0) >= maxPerArtist) return false;
    if (pickedIds.has(track.youtubeId)) return false;
    picked.push(track);
    pickedIds.add(track.youtubeId);
    artistCount.set(artistKey, (artistCount.get(artistKey) ?? 0) + 1);
    return true;
  };

  for (const tier of ['familiar', 'mid', 'hidden'] as NoveltyTier[]) {
    let n = targets[tier];
    const tierPool = [...byTier[tier]].sort(
      (a, b) =>
        tastePickScore(b, options.moodTags, options.userTasteProfile) -
        tastePickScore(a, options.moodTags, options.userTasteProfile)
    );
    for (const track of tierPool) {
      if (n <= 0 || picked.length >= limit) break;
      if (tryPick(track)) n--;
    }
  }

  if (picked.length < limit) {
    for (const track of shuffle(filtered)) {
      if (picked.length >= limit) break;
      tryPick(track);
    }
  }

  if (picked.length < minTracks) {
    for (const track of shuffle(pool)) {
      if (picked.length >= minTracks) break;
      if (!track.youtubeId || exclude.has(track.youtubeId)) continue;
      tryPick(track);
    }
  }

  return picked.slice(0, limit);
}
