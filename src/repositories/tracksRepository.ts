import { getEmotionCurationProfile } from '@/constants/emotionCuration';
import { ALL_SEED_TRACKS } from '@/data/seeds';
import { buildCuratedTrackList } from '@/lib/curatedPlaylist';
import { orderTracksByEnergyArc } from '@/lib/playlistFlow';
import { mapDbTrackToTrack } from '@/lib/trackUtils';
import { selectDiverseTracks, selectRandomTracks, type DiverseTracksOptions } from '@/lib/trackSelection';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { EmotionId } from '@/types/emotion';
import type { TrackRow } from '@/types/database';
import type { Track } from '@/types/track';

import type { TrackCurationSpec, TrackQueryFilters, TracksRepository } from './types';

const POOL_FETCH_LIMIT = 120;

async function fetchTrackPoolFromDb(filters: TrackQueryFilters): Promise<Track[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase.from('tracks').select('*').limit(filters.limit ?? POOL_FETCH_LIMIT);

  if (filters.moodTags?.length) {
    query = query.overlaps('mood_tags', filters.moodTags);
  }
  if (filters.energyMin != null) {
    query = query.gte('energy_level', filters.energyMin);
  }
  if (filters.energyMax != null) {
    query = query.lte('energy_level', filters.energyMax);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as TrackRow[]).map(mapDbTrackToTrack);
}

function filterPoolLocally(pool: Track[], filters: TrackQueryFilters): Track[] {
  let list = [...pool];

  if (filters.moodTags?.length) {
    list = list.filter((t) =>
      filters.moodTags!.some((tag) => t.moodTags?.includes(tag))
    );
  }
  if (filters.energyMin != null) {
    list = list.filter((t) => (t.energyLevel ?? 5) >= filters.energyMin!);
  }
  if (filters.energyMax != null) {
    list = list.filter((t) => (t.energyLevel ?? 5) <= filters.energyMax!);
  }

  return list.slice(0, filters.limit ?? POOL_FETCH_LIMIT);
}

abstract class BaseTracksRepository implements TracksRepository {
  protected abstract loadPool(filters: TrackQueryFilters): Promise<Track[]>;

  async getByIds(ids: string[]): Promise<Track[]> {
    const pool = await this.loadPool({ limit: POOL_FETCH_LIMIT });
    return pool.filter((t) => ids.includes(t.id));
  }

  async getByMoodTags(tags: string[], limit = 20): Promise<Track[]> {
    return this.getTracksByMood(tags, limit);
  }

  async queryForRecommendation(filters: TrackQueryFilters): Promise<Track[]> {
    return this.loadPool(filters);
  }

  async getTracksByMood(moodTags: string[], limit = 20): Promise<Track[]> {
    return this.loadPool({ moodTags, limit });
  }

  async getTracksByMoodAndEnergy(
    moodTags: string[],
    energyMin: number,
    energyMax: number,
    limit = 20
  ): Promise<Track[]> {
    return this.loadPool({ moodTags, energyMin, energyMax, limit });
  }

  async getRandomTracks(limit = 12, filters: TrackQueryFilters = {}): Promise<Track[]> {
    const pool = await this.loadPool({ ...filters, limit: POOL_FETCH_LIMIT });
    return selectRandomTracks(pool, limit);
  }

  async getDiverseTracks(options: DiverseTracksOptions): Promise<Track[]> {
    const pool = await this.loadPool({
      moodTags: options.moodTags,
      energyMin: options.energyMin,
      energyMax: options.energyMax,
      limit: POOL_FETCH_LIMIT,
      excludeYoutubeIds: options.excludeYoutubeIds,
    });
    const filtered =
      options.excludeYoutubeIds?.length ?
        pool.filter((t) => !options.excludeYoutubeIds!.includes(t.youtubeId))
      : pool;
    return selectDiverseTracks(filtered.length ? filtered : pool, options);
  }

  /** Claude 큐레이션 스펙 → DB 다양성 샘플링 + energy arc */
  async resolveCuratedTracks(spec: TrackCurationSpec): Promise<Track[]> {
    const diverse = await this.getDiverseTracks({
      moodTags: spec.moodTags,
      energyMin: spec.energyMin,
      energyMax: spec.energyMax,
      limit: spec.limit ?? 12,
      minTracks: spec.minTracks ?? 10,
      noveltyRatio: spec.noveltyRatio,
      maxPerArtist: spec.maxPerArtist ?? 2,
      excludeYoutubeIds: spec.excludeYoutubeIds,
    });

    if (spec.energyArc) {
      return orderTracksByEnergyArc(diverse, spec.energyArc);
    }
    return diverse;
  }

  /** 감정 프로필 기반 큐레이션 (로컬 seed 풀) */
  async getCuratedForEmotion(
    emotionId: EmotionId,
    pool: Track[],
    excludeYoutubeIds?: string[]
  ): Promise<Track[]> {
    return buildCuratedTrackList(pool, emotionId, { excludeYoutubeIds });
  }
}

export class SupabaseTracksRepository extends BaseTracksRepository {
  protected async loadPool(filters: TrackQueryFilters): Promise<Track[]> {
    return fetchTrackPoolFromDb(filters);
  }

  async getByIds(ids: string[]): Promise<Track[]> {
    if (!ids.length || !isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('tracks').select('*').in('id', ids);
    if (error) throw error;
    return (data as TrackRow[]).map(mapDbTrackToTrack);
  }
}

export class MockTracksRepository extends BaseTracksRepository {
  protected async loadPool(filters: TrackQueryFilters): Promise<Track[]> {
    return filterPoolLocally(ALL_SEED_TRACKS, filters);
  }
}

export async function queryTracksForEmotion(
  repo: TracksRepository,
  emotionId: EmotionId,
  limit = 12,
  excludeYoutubeIds?: string[]
): Promise<Track[]> {
  const profile = getEmotionCurationProfile(emotionId);
  return repo.resolveCuratedTracks({
    moodTags: profile.moodTags,
    energyMin: profile.energyMin,
    energyMax: profile.energyMax,
    limit,
    noveltyRatio: profile.noveltyRatio,
    energyArc: profile.energyArc,
    excludeYoutubeIds,
  });
}
