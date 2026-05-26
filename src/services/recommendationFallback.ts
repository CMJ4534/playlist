import { buildMockRecommendation } from '@/data/mockRecommendations';
import type { EmotionId } from '@/types/emotion';
import type { PlaylistRecommendation } from '@/types/recommendation';

export type RecommendationFailureReason =
  | 'timeout'
  | 'network'
  | 'malformed'
  | 'empty_tracks'
  | 'edge_error'
  | 'not_configured';

export class RecommendationError extends Error {
  constructor(
    message: string,
    readonly reason: RecommendationFailureReason,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

/** Edge·Claude 실패 시 로컬 목 플레이리스트 */
export function getFallbackRecommendation(
  emotionId: EmotionId,
  situation: string,
  reason?: RecommendationFailureReason,
  excludeYoutubeIds?: string[]
): PlaylistRecommendation {
  const base = buildMockRecommendation(emotionId, situation, excludeYoutubeIds);
  if (!reason) return base;

  return {
    ...base,
    description: `${base.description}\n\n(오프라인 추천 — ${reason})`,
  };
}
