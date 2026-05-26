import type { UserTasteProfile as ApiUserTasteProfile } from '@/types/recommendApi';
import type { AnalyzedUserTasteProfile } from '@/types/userTasteProfile';
import type { EmotionId } from '@/types/emotion';
import type { PlaybackSignal } from '@/types/listeningActivity';
import { useListeningActivityStore } from '@/stores/listeningActivityStore';
import { useRecommendationHistoryStore } from '@/stores/recommendationHistoryStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';

const DEFAULT_ENERGY: [number, number] = [2, 6];

function topKeys(
  counts: Record<string, number>,
  limit: number,
  minCount = 1
): string[] {
  return Object.entries(counts)
    .filter(([, n]) => n >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function avg(nums: number[]): number {
  if (!nums.length) return 5;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * listening activity + recommendation history → 분석 가능한 취향 프로필.
 */
export function buildAnalyzedUserTasteProfile(): AnalyzedUserTasteProfile {
  const activity = useListeningActivityStore.getState();
  const history = useRecommendationHistoryStore.getState();
  const library = useUserLibraryStore.getState();
  const signals = activity.playbackSignals;

  const emotionCounts: Partial<Record<EmotionId, number>> = {};
  for (const e of activity.emotionHistory) {
    emotionCounts[e.emotionId] = (emotionCounts[e.emotionId] ?? 0) + 1;
  }

  const frequentEmotionIds = topKeys(
    emotionCounts as Record<string, number>,
    3,
    1
  ) as EmotionId[];

  const artistPlay = new Map<string, number>();
  const artistSkip = new Map<string, number>();
  const moodPlay = new Map<string, number>();
  const moodSkip = new Map<string, number>();
  const playCountById = new Map<string, number>();
  const energies: number[] = [];

  for (const s of signals) {
    const artistKey = s.artist.trim().toLowerCase();
    if (s.kind === 'skip') {
      artistSkip.set(artistKey, (artistSkip.get(artistKey) ?? 0) + 1);
      for (const tag of s.moodTags) {
        moodSkip.set(tag, (moodSkip.get(tag) ?? 0) + 1);
      }
    } else {
      artistPlay.set(artistKey, (artistPlay.get(artistKey) ?? 0) + 1);
      for (const tag of s.moodTags) {
        moodPlay.set(tag, (moodPlay.get(tag) ?? 0) + 1);
      }
      if (s.energyLevel != null) energies.push(s.energyLevel);
      if (s.kind === 'play' || s.kind === 'complete') {
        playCountById.set(
          s.youtubeId,
          (playCountById.get(s.youtubeId) ?? 0) + 1
        );
      }
    }
  }

  const favoriteArtists = topKeys(Object.fromEntries(artistPlay), 8, 2);
  const favoriteMoodTags = topKeys(Object.fromEntries(moodPlay), 10, 2);
  const skippedMoodTags = topKeys(Object.fromEntries(moodSkip), 8, 2);

  for (const liked of Object.values(library.likedByYoutubeId)) {
    playCountById.set(liked.youtubeId, (playCountById.get(liked.youtubeId) ?? 0) + 3);
    const key = liked.artist.trim().toLowerCase();
    artistPlay.set(key, (artistPlay.get(key) ?? 0) + 2);
    for (const tag of liked.moodTags ?? []) {
      moodPlay.set(tag, (moodPlay.get(tag) ?? 0) + 2);
    }
  }

  const replayBoostIds = Object.keys(library.replayCountByPlaylistId).flatMap(
    (plId) =>
      activity.playlistHistory
        .find((p) => p.id === plId)
        ?.tracks.map((t) => t.youtubeId)
        .filter(Boolean) ?? []
  );
  for (const id of replayBoostIds) {
    playCountById.set(id, (playCountById.get(id) ?? 0) + 2);
  }

  const repeatPlayYoutubeIds = [...playCountById.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([id]) => id);

  const likedYoutubeIds = library.getLikedYoutubeIds();

  const preferredEnergyLevel = Math.round(avg(energies) * 10) / 10;
  const spread = energies.length ?
    Math.max(1, Math.round(Math.max(...energies) - Math.min(...energies)) / 2)
  : 2;
  const preferredEnergyMin = Math.max(1, Math.round(preferredEnergyLevel - spread));
  const preferredEnergyMax = Math.min(10, Math.round(preferredEnergyLevel + spread));

  const exposureEntries = Object.entries(history.exposureCountByYoutubeId);
  const familiarCount = exposureEntries.filter(([, n]) => n >= 2).length;
  const discoveryRatio =
    exposureEntries.length ?
      Math.min(1, Math.max(0, 1 - familiarCount / exposureEntries.length))
    : 0.35;

  return {
    analyzedAt: Date.now(),
    sampleSize: signals.length + activity.emotionHistory.length,
    frequentEmotionIds,
    emotionCounts,
    preferredEnergyMin: preferredEnergyMin || DEFAULT_ENERGY[0],
    preferredEnergyMax: preferredEnergyMax || DEFAULT_ENERGY[1],
    preferredEnergyLevel,
    favoriteArtists,
    favoriteMoodTags,
    skippedMoodTags,
    repeatPlayYoutubeIds,
    likedYoutubeIds,
    savedPlaylistCount: library.savedPlaylists.length,
    discoveryRatio,
  };
}

/** Edge / recommend API body */
export function toApiUserTasteProfile(
  profile: AnalyzedUserTasteProfile
): ApiUserTasteProfile {
  return {
    favoriteArtists: profile.favoriteArtists,
    favoriteMoodTags: profile.favoriteMoodTags,
    preferredEnergyLevel: profile.preferredEnergyLevel,
    preferredEnergyMin: profile.preferredEnergyMin,
    preferredEnergyMax: profile.preferredEnergyMax,
    frequentEmotionIds: profile.frequentEmotionIds,
    skippedMoodTags: profile.skippedMoodTags,
    repeatPlayYoutubeIds: profile.repeatPlayYoutubeIds,
    likedYoutubeIds: profile.likedYoutubeIds,
    discoveryRatio: profile.discoveryRatio,
  };
}

export function getUserTasteProfileForRecommendation(): ApiUserTasteProfile | null {
  const analyzed = buildAnalyzedUserTasteProfile();
  if (analyzed.sampleSize < 3) return null;
  return toApiUserTasteProfile(analyzed);
}
