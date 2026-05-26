import type { EmotionId } from '@/types/emotion';
import type { PlaylistRecommendation } from '@/types/recommendation';
import type { UserTasteProfile } from '@/types/recommendApi';
import type { NoveltyTier, Track } from '@/types/track';
import type { EnergyArcProfile } from '@/lib/playlistFlow';
import type { DiverseTracksOptions } from '@/lib/trackSelection';

export type RecommendationRequest = {
  emotionId: EmotionId;
  situation: string;
  excludeYoutubeIds?: string[];
  userTasteProfile?: UserTasteProfile | null;
};

export interface RecommendationRepository {
  getRecommendation(request: RecommendationRequest): Promise<PlaylistRecommendation>;
}

export type YoutubeSearchResult = {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec?: number;
};

export type ResolveTrackInput = {
  title: string;
  artist: string;
  searchQuery?: string;
  id?: string;
};

export interface YoutubeRepository {
  searchVideos(query: string, limit?: number): Promise<YoutubeSearchResult[]>;
  resolveTrack(input: ResolveTrackInput): Promise<Track | null>;
}

export type TrackQueryFilters = {
  moodTags?: string[];
  energyMin?: number;
  energyMax?: number;
  limit?: number;
  excludeYoutubeIds?: string[];
};

/** Claude → DB resolve용 큐레이션 스펙 */
export type TrackCurationSpec = {
  moodTags: string[];
  energyMin?: number;
  energyMax?: number;
  limit?: number;
  minTracks?: number;
  noveltyRatio?: Partial<Record<NoveltyTier, number>>;
  maxPerArtist?: number;
  excludeYoutubeIds?: string[];
  energyArc?: EnergyArcProfile;
};

export interface TracksRepository {
  getByIds(ids: string[]): Promise<Track[]>;
  getByMoodTags(tags: string[], limit?: number): Promise<Track[]>;
  queryForRecommendation(filters: TrackQueryFilters): Promise<Track[]>;

  getTracksByMood(moodTags: string[], limit?: number): Promise<Track[]>;
  getTracksByMoodAndEnergy(
    moodTags: string[],
    energyMin: number,
    energyMax: number,
    limit?: number
  ): Promise<Track[]>;
  getRandomTracks(limit?: number, filters?: TrackQueryFilters): Promise<Track[]>;
  getDiverseTracks(options: DiverseTracksOptions): Promise<Track[]>;
  resolveCuratedTracks(spec: TrackCurationSpec): Promise<Track[]>;
}
