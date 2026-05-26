import { normalizeTrack, type TrackInput } from '@/lib/trackUtils';
import type { Track } from '@/types/track';

import { getActiveSeedDefs } from './catalogMeta';
import type { SeedCategory, SeedTrackDef } from './types';

import replacementsFile from './replacements.json';

const seenYoutubeIds = new Set<string>();

type ReplacementEntry = {
  reason: string;
  replacement: Partial<SeedTrackDef> & { youtubeId: string };
};

const REPLACEMENTS: Record<string, ReplacementEntry> =
  (replacementsFile as { replacements: Record<string, ReplacementEntry> })
    .replacements ?? {};

function applyReplacement(def: SeedTrackDef): SeedTrackDef {
  const entry = REPLACEMENTS[def.youtubeId];
  if (!entry) return def;
  return {
    ...def,
    ...entry.replacement,
    moodTags: entry.replacement.moodTags ?? def.moodTags,
  };
}

/**
 * 카테고리별 Track[] 생성.
 * - youtube_id 중복 제거 (전역)
 * - thumbnailUrl 자동 (normalizeTrack)
 * - mood_tags = 카테고리 기본 + def.moodTags
 */
export function buildSeedTracks(
  category: SeedCategory,
  categoryTags: string[],
  defs: SeedTrackDef[]
): Track[] {
  const tracks: Track[] = [];

  const activeDefs = getActiveSeedDefs(defs);

  for (const rawDef of activeDefs) {
    const def = applyReplacement(rawDef);
    if (seenYoutubeIds.has(def.youtubeId)) {
      console.warn(`[seeds] skip duplicate youtube_id: ${def.youtubeId} (${def.title})`);
      continue;
    }
    seenYoutubeIds.add(def.youtubeId);

    const moodTags = [...new Set([...categoryTags, ...(def.moodTags ?? [])])];

    const input: TrackInput = {
      id: `seed-${category}-${def.youtubeId}`,
      youtubeId: def.youtubeId,
      title: def.title,
      artist: def.artist,
      durationSec: def.durationSec,
      moodTags,
      energyLevel: def.energyLevel,
      noveltyTier: def.noveltyTier,
    };

    tracks.push(normalizeTrack(input));
  }

  return tracks;
}

/** seed 스크립트용: 전역 중복 체크 리셋 */
export function resetSeedDedupeRegistry() {
  seenYoutubeIds.clear();
}

export function trackInputToDbRow(track: Track) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    youtube_id: track.youtubeId,
    thumbnail_url: track.thumbnailUrl,
    mood_tags: track.moodTags ?? [],
    energy_level: track.energyLevel ?? null,
    duration_sec: track.durationSec ?? null,
    novelty_tier: track.noveltyTier ?? null,
  };
}
