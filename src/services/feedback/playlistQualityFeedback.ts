import { trackEvent } from '@/services/analytics/analyticsService';
import { useFeedbackPromptStore } from '@/stores/feedbackPromptStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { usePlayerStore } from '@/stores/playerStore';
import { resolveActiveRecommendationStrategy, RECOMMENDATION_STRATEGY_VERSION } from '@/constants/recommendationStrategy';
import { submitFeedback } from './feedbackService';
import type { FeedbackSentiment } from '@/types/feedback';
import type { EmotionId } from '@/types/emotion';

type QualityFeedbackContext = {
  emotionId?: EmotionId;
  playlistSessionId?: string;
};

/**
 * PlaylistQualityPrompt에서 호출.
 * sentiment → feedbackStore queue + analytics event.
 */
export async function submitPlaylistQualityFeedback(
  sentiment: FeedbackSentiment,
  context: QualityFeedbackContext,
  comment?: string
): Promise<void> {
  const ratingMap: Record<FeedbackSentiment, 1 | 3 | 5> = {
    great: 5,
    ok: 3,
    poor: 1,
  };

  const { queue, currentIndex } = usePlayerStore.getState();
  const strategyId = resolveActiveRecommendationStrategy();

  const entry = useFeedbackStore.getState().submit({
    sentiment,
    comment: comment ?? null,
    category: 'playlist_quality',
    emotionId: context.emotionId,
    playlistSessionId: context.playlistSessionId,
    strategyId,
    strategyVersion: RECOMMENDATION_STRATEGY_VERSION,
    experimentVariant: strategyId,
    tracksPlayed: currentIndex + 1,
    tracksSkipped: 0,
    queueLength: queue.length,
  });

  trackEvent('playlist_quality_rated', {
    playlistSessionId: context.playlistSessionId ?? '',
    rating: ratingMap[sentiment],
    sentiment,
    emotionId: context.emotionId,
  });

  trackEvent('feedback_submitted', {
    category: 'playlist_quality',
    rating: ratingMap[sentiment],
    hasComment: Boolean(comment),
    emotionId: context.emotionId,
    sentiment,
  });

  // legacy 로컬 큐에도 기록 (기존 feedbackService 호환)
  submitFeedback({
    category: 'playlist_quality',
    emotionId: context.emotionId,
    playlistSessionId: context.playlistSessionId,
    strategyId,
    strategyVersion: RECOMMENDATION_STRATEGY_VERSION,
    rating: ratingMap[sentiment],
    comment: comment?.trim(),
    meta: { sentiment },
  }).catch(() => {});

  trackEvent('feedback_detailed', {
    feedbackId: entry.id,
    sentiment,
    category: 'playlist_quality',
    hasComment: Boolean(comment),
    commentLength: comment?.length ?? 0,
    emotionId: context.emotionId,
    strategyId,
    experimentVariant: strategyId,
    tracksPlayed: currentIndex + 1,
    tracksSkipped: 0,
    queueLength: queue.length,
  });

  useFeedbackPromptStore.getState().dismiss();
}
