import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { selectDiverseTracks } from './diverseSelect.ts';
import { orderTracksByEnergyArc } from './playlistFlow.ts';
import { resolveYoutubeForTrack } from './youtubeResolver.ts';
import type { ClaudeRecommendationPlan, RecommendTrackDto } from './types.ts';

const POOL_LIMIT = 150;
const MIN_TRACKS = 10;

type DbTrackRow = {
  id: string;
  title: string;
  artist: string;
  youtube_id: string | null;
  thumbnail_url: string | null;
  mood_tags: string[] | null;
  energy_level: number | null;
  duration_sec: number | null;
  novelty_tier: string | null;
};

export function createServiceClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Claude 큐레이션 스펙 → tracks DB diverse resolve (실제 곡 선택).
 */
export async function resolveTracks(
  supabase: SupabaseClient | null,
  plan: ClaudeRecommendationPlan
): Promise<RecommendTrackDto[]> {
  if (!supabase) return [];

  const pool = await fetchTrackPool(supabase, plan);
  if (!pool.length) return [];

  const limit = plan.limit ?? 12;
  const diverse = selectDiverseTracks(pool, {
    limit,
    minTracks: MIN_TRACKS,
    moodTags: plan.moodTags,
    energyMin: plan.energyMin,
    energyMax: plan.energyMax,
    noveltyRatio: plan.noveltyRatio,
    maxPerArtist: plan.maxPerArtist ?? 2,
    excludeYoutubeIds: plan.excludeYoutubeIds,
    userTasteProfile: plan.userTasteProfile,
  });

  const arcProfile = plan.energyArc ?? 'calm-settle';
  const ordered = orderTracksByEnergyArc(diverse, arcProfile);

  return await hydratePlayableTracks(ordered);
}

/** mood_tags 우선 매칭 풀 */
async function getTracksByMood(
  supabase: SupabaseClient,
  moodTags: string[],
  limit: number
): Promise<RecommendTrackDto[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .overlaps('mood_tags', moodTags)
    .limit(limit);

  if (error) throw error;
  return rowsToDtos((data ?? []) as DbTrackRow[]);
}

/** mood + energy_level 범위 */
async function getTracksByMoodAndEnergy(
  supabase: SupabaseClient,
  moodTags: string[],
  energyMin: number,
  energyMax: number,
  limit: number
): Promise<RecommendTrackDto[]> {
  let query = supabase.from('tracks').select('*').limit(limit);

  if (moodTags.length) {
    query = query.overlaps('mood_tags', moodTags);
  }
  query = query.gte('energy_level', energyMin).lte('energy_level', energyMax);

  const { data, error } = await query;
  if (error) throw error;
  return rowsToDtos((data ?? []) as DbTrackRow[]);
}

async function fetchTrackPool(
  supabase: SupabaseClient,
  plan: ClaudeRecommendationPlan
): Promise<RecommendTrackDto[]> {
  let pool = await getTracksByMoodAndEnergy(
    supabase,
    plan.moodTags,
    plan.energyMin,
    plan.energyMax,
    POOL_LIMIT
  );

  if (pool.length < MIN_TRACKS) {
    const byMood = await getTracksByMood(supabase, plan.moodTags, POOL_LIMIT);
    pool = mergeUnique(pool, byMood);
  }

  if (pool.length < MIN_TRACKS) {
    const { data } = await supabase.from('tracks').select('*').limit(POOL_LIMIT);
    pool = mergeUnique(pool, rowsToDtos((data ?? []) as DbTrackRow[]));
  }

  return pool;
}

function mergeUnique(a: RecommendTrackDto[], b: RecommendTrackDto[]): RecommendTrackDto[] {
  const seen = new Set(a.map((t) => t.youtubeId));
  const out = [...a];
  for (const t of b) {
    if (!seen.has(t.youtubeId)) {
      seen.add(t.youtubeId);
      out.push(t);
    }
  }
  return out;
}

async function hydratePlayableTracks(
  tracks: RecommendTrackDto[]
): Promise<RecommendTrackDto[]> {
  const out: RecommendTrackDto[] = [];
  for (const t of tracks) {
    if (t.youtubeId?.trim()) {
      out.push(t);
      continue;
    }
    const resolved = await resolveYoutubeForTrack(
      {
        id: t.id,
        title: t.title,
        artist: t.artist,
        youtube_id: null,
        thumbnail_url: t.thumbnailUrl,
        mood_tags: t.moodTags ?? null,
        energy_level: t.energyLevel ?? null,
        duration_sec: t.durationSec ?? null,
        novelty_tier: t.noveltyTier ?? null,
      },
      `${t.title} ${t.artist}`
    );
    if (resolved) out.push(resolved);
  }
  return out;
}

function rowsToDtos(rows: DbTrackRow[]): RecommendTrackDto[] {
  return rows
    .filter((r) => r.youtube_id?.trim())
    .map(rowToDto);
}

function rowToDto(row: DbTrackRow): RecommendTrackDto {
  const youtubeId = row.youtube_id!.trim();
  return {
    id: row.id,
    youtubeId,
    title: row.title,
    artist: row.artist,
    thumbnailUrl:
      row.thumbnail_url?.trim() ||
      `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    durationSec: row.duration_sec,
    moodTags: row.mood_tags ?? undefined,
    energyLevel: row.energy_level,
    noveltyTier: (row.novelty_tier as RecommendTrackDto['noveltyTier']) ?? 'mid',
  };
}
