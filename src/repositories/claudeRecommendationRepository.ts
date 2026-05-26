import { getEmotionCurationProfile } from '@/constants/emotionCuration';
import { invokeRecommendEdge } from '@/lib/edgeRecommendationClient';
import { orderTracksByEnergyArc } from '@/lib/playlistFlow';
import { mapApiTrackToAppTrack, type RecommendApiTrack } from '@/types/recommendApi';
import { trackEvent } from '@/services/analytics';
import { useBetaDiagnosticsStore } from '@/stores/betaDiagnosticsStore';
import { getFallbackRecommendation, RecommendationError } from '@/services/recommendationFallback';
import type { PlaylistRecommendation } from '@/types/recommendation';
import type { Track } from '@/types/track';

import type {
  RecommendationRepository,
  RecommendationRequest,
  TracksRepository,
  YoutubeRepository,
} from './types';

type Deps = {
  tracks: TracksRepository;
  youtube: YoutubeRepository;
  edgeTimeoutMs?: number;
};

/**
 * Edge Function (/recommend) → 응답 검증 → 클라이언트 track/youtube resolve → fallback.
 *
 * EmotionScreen → recommendationService → [여기] → sessionStore → playerStore
 */
export class ClaudeRecommendationRepository implements RecommendationRepository {
  constructor(private readonly deps: Deps) {}

  async getRecommendation(request: RecommendationRequest): Promise<PlaylistRecommendation> {
    const startedAt = Date.now();
    try {
      const api = await invokeRecommendEdge(
        {
          emotion: request.emotionId,
          situation: request.situation,
          excludeYoutubeIds: request.excludeYoutubeIds,
          userTasteProfile: request.userTasteProfile ?? null,
        },
        { timeoutMs: this.deps.edgeTimeoutMs }
      );

      let tracks = await this.resolveTracksClient(api.tracks);

      if (!tracks.length) {
        throw new RecommendationError('재생 가능한 곡이 없습니다.', 'empty_tracks');
      }

      const profile = getEmotionCurationProfile(request.emotionId);
      tracks = orderTracksByEnergyArc(tracks, profile.energyArc);

      const result = {
        title: api.playlistName,
        description: api.playlistComment,
        tracks,
      };
      trackEvent('recommendation_success', {
        emotionId: request.emotionId,
        source: 'edge',
        trackCount: tracks.length,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (err) {
      const reason =
        err instanceof RecommendationError ? err.reason : 'edge_error';
      console.warn('[ClaudeRecommendationRepository] fallback:', reason, err);
      const fallback = getFallbackRecommendation(
        request.emotionId,
        request.situation,
        reason,
        request.excludeYoutubeIds
      );
      trackEvent('recommendation_fallback', {
        emotionId: request.emotionId,
        reason,
        trackCount: fallback.tracks.length,
        durationMs: Date.now() - startedAt,
      });
      useBetaDiagnosticsStore.getState().setLastFallback(reason, request.emotionId);
      return fallback;
    }
  }

  /** Edge tracks 보완 — youtubeId 누락 시 youtubeRepository.resolveTrack */
  private async resolveTracksClient(apiTracks: RecommendApiTrack[]): Promise<Track[]> {
    const resolved: Track[] = [];

    for (const raw of apiTracks) {
      let track = mapApiTrackToAppTrack(raw);

      if (!track.youtubeId?.trim()) {
        const fromYoutube = await this.deps.youtube.resolveTrack({
          title: track.title,
          artist: track.artist,
          searchQuery: `${track.title} ${track.artist}`,
        });
        if (fromYoutube) track = fromYoutube;
      }

      if (!track.youtubeId?.trim() && track.id) {
        const fromDb = await this.deps.tracks.getByIds([track.id]);
        if (fromDb[0]?.youtubeId) track = fromDb[0];
      }

      if (track.youtubeId?.trim()) {
        resolved.push(track);
      }
    }

    return resolved;
  }
}
