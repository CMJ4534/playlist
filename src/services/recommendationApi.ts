import { generateLocalRecommendation } from '@/services/localRecommendation';
import { fetchRecommendation, type RecommendResponse } from '@/services/moodplayApi';
import { getTastePreferencesPayload } from '@/stores/tastePreferencesStore';
import type { EmotionId } from '@/types/emotion';

/**
 * Backend AI 추천 (Gemini + YouTube) → 실패 시 localRecommendation fallback.
 */
export async function fetchAiRecommendation(
  emotionId: EmotionId,
  diary?: string
): Promise<RecommendResponse> {
  const tastePreferences = getTastePreferencesPayload() ?? undefined;

  try {
    return await fetchRecommendation(
      emotionId,
      diary?.trim() || undefined,
      tastePreferences
    );
  } catch (err) {
    console.warn('[recommendationApi] API failed, using local fallback:', err);
    return generateLocalRecommendation(emotionId, diary?.trim() || undefined);
  }
}
