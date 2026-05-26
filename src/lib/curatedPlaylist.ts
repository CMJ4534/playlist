import { getEmotionCurationProfile } from '@/constants/emotionCuration';
import { isDevEnvironment } from '@/constants/dev';
import { buildPlaylistGenerationMeta } from '@/constants/recommendationStrategy';
import {
  logPlaylistDiversity,
  scorePlaylistDiversity,
} from '@/lib/recommendationDiversity';
import { applyEmbedSafeFilter, type EmbedSafeDiagnostics } from '@/lib/embedSafeFilter';
import type { PlaylistGenerationMeta } from '@/types/recommendationStrategy';
import { orderTracksByEnergyArc } from '@/lib/playlistFlow';
import { selectDiverseTracks, type DiverseTracksOptions } from '@/lib/trackSelection';
import { useRecommendationHistoryStore } from '@/stores/recommendationHistoryStore';
import type { EmotionId } from '@/types/emotion';
import type { UserTasteProfile } from '@/types/recommendApi';
import type { Track } from '@/types/track';

function priorityMoodScore(track: Track, priorityTags: string[]): number {
  const tags = track.moodTags ?? [];
  return (
    priorityTags.filter((t) => tags.includes(t)).length * 2 +
    tags.filter((t) => priorityTags.includes(t)).length
  );
}

/**
 * 감정 프로필 + diverse 선택 + energy arc 정렬.
 */
export type CuratedPlaylistResult = {
  tracks: Track[];
  generationMeta: PlaylistGenerationMeta;
};

export function buildCuratedTrackList(
  pool: Track[],
  emotionId: EmotionId,
  options?: {
    excludeYoutubeIds?: string[];
    limit?: number;
    userTasteProfile?: UserTasteProfile | null;
  }
): Track[] {
  return buildCuratedPlaylistResult(pool, emotionId, options).tracks;
}

export function buildCuratedPlaylistResult(
  pool: Track[],
  emotionId: EmotionId,
  options?: {
    excludeYoutubeIds?: string[];
    limit?: number;
    userTasteProfile?: UserTasteProfile | null;
  }
): CuratedPlaylistResult {
  const profile = getEmotionCurationProfile(emotionId);
  const limit = options?.limit ?? profile.limit;

  // ── embed-safe 필터 (최상위 게이트) ──
  const { filtered: safePool, diagnostics } = applyEmbedSafeFilter(pool, {
    minCandidates: Math.min(limit, 8),
  });

  if (isDevEnvironment()) {
    console.info('[curatedPlaylist] embed-safe diagnostics', {
      emotionId,
      ...diagnostics,
    });
  }

  const history = useRecommendationHistoryStore.getState();
  const excludeYoutubeIds = mergeExclude(
    options?.excludeYoutubeIds,
    history.getExcludeYoutubeIds(emotionId)
  );
  const overusedYoutubeIds = history.getOverusedYoutubeIds();

  const boosted = [...safePool].sort(
    (a, b) =>
      priorityMoodScore(b, profile.priorityTags) -
      priorityMoodScore(a, profile.priorityTags)
  );

  const taste = options?.userTasteProfile;
  let energyMin = profile.energyMin;
  let energyMax = profile.energyMax;
  if (taste?.preferredEnergyMin != null && taste?.preferredEnergyMax != null) {
    energyMin = Math.round((energyMin + taste.preferredEnergyMin) / 2);
    energyMax = Math.round((energyMax + taste.preferredEnergyMax) / 2);
  }

  let noveltyRatio = { ...profile.noveltyRatio };
  if (taste?.discoveryRatio != null) {
    const d = taste.discoveryRatio;
    noveltyRatio = {
      familiar: Math.max(0.25, 0.55 - d * 0.22),
      mid: 0.3,
      hidden: Math.min(0.35, 0.12 + d * 0.28),
    };
  }

  const diverseOpts: DiverseTracksOptions = {
    moodTags: profile.moodTags,
    energyMin,
    energyMax,
    limit,
    minTracks: Math.min(10, limit),
    noveltyRatio,
    maxPerArtist: profile.maxPerArtist,
    excludeYoutubeIds,
    overusedYoutubeIds,
    overusePenalty: 5,
    boostArtists: taste?.favoriteArtists,
    boostMoodTags: taste?.favoriteMoodTags,
    penalizeMoodTags: taste?.skippedMoodTags,
    boostYoutubeIds: [
      ...(taste?.repeatPlayYoutubeIds ?? []),
      ...(taste?.likedYoutubeIds ?? []),
    ],
    exposureCounts: history.exposureCountByYoutubeId,
    exposureDecayWeight: 1.5,
    hiddenGemMinRatio: 0.15,
    maxConsecutiveSameMood: 3,
  };

  const picked = selectDiverseTracks(boosted, diverseOpts);
  const ordered = orderTracksByEnergyArc(picked, profile.energyArc);

  const diversity = scorePlaylistDiversity(ordered);
  logPlaylistDiversity(emotionId, ordered, diversity);

  const generationMeta = buildPlaylistGenerationMeta(
    emotionId,
    ordered.length,
    diversity
  );

  return { tracks: ordered, generationMeta };
}

function mergeExclude(...lists: (string[] | undefined)[]): string[] {
  const out: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const id of list) {
      const t = id?.trim();
      if (t && !out.includes(t)) out.push(t);
    }
  }
  return out;
}
