import { buildMockRecommendation } from '@/data/mockRecommendations';
import { trackEvent } from '@/services/analytics';

import type {
  RecommendationRepository,
  RecommendationRequest,
} from './types';

/** 로컬 목 — Claude/Supabase 연동 전 */
export class MockRecommendationRepository implements RecommendationRepository {
  async getRecommendation(request: RecommendationRequest) {
    const startedAt = Date.now();
    const result = buildMockRecommendation(
      request.emotionId,
      request.situation,
      request.excludeYoutubeIds,
      request.userTasteProfile
    );
    trackEvent('recommendation_success', {
      emotionId: request.emotionId,
      source: 'mock',
      trackCount: result.tracks.length,
      durationMs: Date.now() - startedAt,
    });
    return result;
  }
}
