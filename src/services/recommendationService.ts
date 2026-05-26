import { LOADING_MESSAGES } from '@/constants/emotions';
import { isDevEnvironment } from '@/constants/dev';
import { getRepositories } from '@/repositories/createRepositories';
import { captureException } from '@/observability/sentry';
import { ALL_SEED_TRACKS } from '@/data/seeds';
import { applyEmbedSafeFilter } from '@/lib/embedSafeFilter';
import { trackEvent } from '@/services/analytics';
import { useBetaDiagnosticsStore } from '@/stores/betaDiagnosticsStore';
import {
  getFallbackRecommendation,
  RecommendationError,
} from '@/services/recommendationFallback';
import { getUserTasteProfileForRecommendation } from '@/lib/userTasteProfile';
import { useRecommendationHistoryStore } from '@/stores/recommendationHistoryStore';
import type { EmotionId } from '@/types/emotion';
import type { PlaylistRecommendation } from '@/types/recommendation';

const MIN_LOADING_MS = 1200;
const MESSAGE_INTERVAL_MS = 900;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export type RecommendationProgress = {
  message: string;
};

/**
 * UI 로딩 UX + repository 오케스트레이션.
 * supabase 소스: Edge /recommend → ClaudeRecommendationRepository.
 * mock 소스: MockRecommendationRepository.
 */
export async function fetchRecommendation(
  emotionId: EmotionId,
  situation: string,
  onProgress?: (progress: RecommendationProgress) => void
): Promise<PlaylistRecommendation> {
  const { recommendation } = getRepositories();
  const startedAt = Date.now();
  let messageIndex = 0;

  onProgress?.({ message: LOADING_MESSAGES[0] });

  const tick = setInterval(() => {
    messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
    onProgress?.({ message: LOADING_MESSAGES[messageIndex] });
  }, MESSAGE_INTERVAL_MS);

  const excludeYoutubeIds = useRecommendationHistoryStore
    .getState()
    .getExcludeYoutubeIds(emotionId);

  // ── embed-safe 진단 로그 ──
  const { diagnostics } = applyEmbedSafeFilter(ALL_SEED_TRACKS);
  if (isDevEnvironment()) {
    console.info('[recommendationService] embed-safe pool diagnostics', {
      emotionId,
      candidateCount: diagnostics.candidateCount,
      verifiedCount: diagnostics.verifiedCount,
      playableRatio: diagnostics.playableRatio.toFixed(2),
      fallbackReason: diagnostics.fallbackReason,
      degradeLevel: diagnostics.degradeLevel,
    });
  }

  trackEvent('recommendation_requested', {
    emotionId,
    hasSituation: Boolean(situation.trim()),
    excludeCount: excludeYoutubeIds.length,
    candidateCount: diagnostics.candidateCount,
    verifiedCount: diagnostics.verifiedCount,
    playableRatio: Math.round(diagnostics.playableRatio * 100),
  });

  try {
    let result: PlaylistRecommendation;

    try {
      result = await recommendation.getRecommendation({
        emotionId,
        situation,
        excludeYoutubeIds,
        userTasteProfile: getUserTasteProfileForRecommendation(),
      });
    } catch (err) {
      const reason =
        err instanceof RecommendationError ? err.reason : 'edge_error';
      console.warn('[recommendationService] repository error, fallback:', reason);
      captureException(err, { tags: { flow: 'recommendation' }, extra: { emotionId } });
      const durationMs = Date.now() - startedAt;
      result = getFallbackRecommendation(
        emotionId,
        situation,
        reason,
        excludeYoutubeIds
      );
      trackEvent('recommendation_fallback', {
        emotionId,
        reason,
        trackCount: result.tracks.length,
        durationMs,
      });
      useBetaDiagnosticsStore.getState().setLastFallback(reason, emotionId);
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await delay(MIN_LOADING_MS - elapsed);
    }

    return result;
  } finally {
    clearInterval(tick);
  }
}
