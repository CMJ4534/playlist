import { getYoutubeThumbnailUrl } from '@/lib/youtubeThumbnail';
import type { TrackRow } from '@/types/database';
import type { NoveltyTier, Track } from '@/types/track';

/** API·mock 입력 — thumbnailUrl 생략 시 YouTube에서 유도 */
export type TrackInput = {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  durationSec?: number;
  moodTags?: string[];
  energyLevel?: number;
  noveltyTier?: NoveltyTier;
};

export function resolveThumbnailUrl(
  youtubeId: string,
  thumbnailUrl?: string | null
): string {
  if (thumbnailUrl?.trim()) return thumbnailUrl.trim();
  return getYoutubeThumbnailUrl(youtubeId, 'hq');
}

export function normalizeTrack(input: TrackInput): Track {
  return {
    id: input.id,
    youtubeId: input.youtubeId,
    title: input.title,
    artist: input.artist,
    thumbnailUrl: resolveThumbnailUrl(input.youtubeId, input.thumbnailUrl),
    durationSec: input.durationSec,
    moodTags: input.moodTags,
    energyLevel: input.energyLevel,
    noveltyTier: input.noveltyTier,
  };
}

export function normalizeTracks(inputs: TrackInput[]): Track[] {
  return inputs.map(normalizeTrack);
}

/** Supabase `tracks` 행 → 앱 Track */
export function mapDbTrackToTrack(row: TrackRow): Track {
  return normalizeTrack({
    id: row.id,
    youtubeId: row.youtube_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
    durationSec: row.duration_sec ?? undefined,
    moodTags: row.mood_tags ?? undefined,
    energyLevel: row.energy_level ?? undefined,
    noveltyTier: (row.novelty_tier as NoveltyTier | null) ?? undefined,
  });
}
