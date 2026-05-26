import type { EmotionId } from '@/types/emotion';

/** 감정 → DB mood_tags 매핑 (클라이언트·Edge 공용 로직) */
export const EMOTION_MOOD_TAGS: Record<EmotionId, string[]> = {
  sad: ['우울', '잔잔한', '몽환적'],
  dawn: ['새벽', '몽환적', '잔잔한'],
  focus: ['집중', '몽환적'],
  rain: ['비', '잔잔한', '감성'],
  walk: ['산책', '감성', '잔잔한'],
  blank: ['멍', '잔잔한', '배경'],
};

export function moodTagsForEmotion(emotionId: EmotionId): string[] {
  return EMOTION_MOOD_TAGS[emotionId] ?? ['감성'];
}
