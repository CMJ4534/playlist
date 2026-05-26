import { useRevisitStore } from '@/stores/revisitStore';
import type { EmotionId } from '@/types/emotion';
import type { PlaylistRecommendation } from '@/types/recommendation';

export function captureRecommendationForRevisit(
  emotionId: EmotionId,
  situation: string,
  result: PlaylistRecommendation
): void {
  useRevisitStore.getState().setLastRecommendation({
    emotionId,
    situation,
    result,
  });
}

export function getResumableRecommendation() {
  return useRevisitStore.getState().getActiveLastRecommendation();
}
