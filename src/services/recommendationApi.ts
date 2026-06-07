import type { RecommendResponse } from '@/services/moodplayApi';
import {
  buildLocalFallback,
  commitRecommendationResult,
  runStrategyRecommendation,
  runStrategyRetryRecommendation,
  type StrategyRecommendationOptions,
} from '@/services/strategy/recommendStrategyLayer';
import type { EmotionId } from '@/types/emotion';

async function withLocalFallback(
  emotionId: EmotionId,
  diary: string | undefined,
  run: () => Promise<RecommendResponse>
): Promise<RecommendResponse> {
  try {
    return await run();
  } catch (err) {
    console.warn('[recommendationApi] API failed, using local fallback:', err);
    const fallback = buildLocalFallback(emotionId, diary);
    commitRecommendationResult(fallback);
    return fallback;
  }
}

/**
 * Backend AI 추천 (Strategy Layer → Gemini + YouTube) → 실패 시 localRecommendation fallback.
 */
export async function fetchAiRecommendation(
  emotionId: EmotionId,
  diary?: string,
  options?: StrategyRecommendationOptions
): Promise<RecommendResponse> {
  return withLocalFallback(emotionId, diary, () =>
    runStrategyRecommendation(emotionId, diary, options)
  );
}

/** 재추천 — 동일 session에서 strategy 재선택 */
export async function fetchAiRecommendationRetry(
  emotionId: EmotionId,
  diary?: string
): Promise<RecommendResponse> {
  return withLocalFallback(emotionId, diary, () =>
    runStrategyRetryRecommendation(emotionId, diary)
  );
}
