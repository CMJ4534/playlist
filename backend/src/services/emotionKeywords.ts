export type EmotionId = 'sad' | 'dawn' | 'focus' | 'rain' | 'walk' | 'blank';

type EmotionProfile = {
  label: string;
  emoji: string;
  moodTag: string;
};

const EMOTION_MAP: Record<EmotionId, EmotionProfile> = {
  sad:   { label: '우울',     emoji: '😔', moodTag: '감성' },
  dawn:  { label: '새벽감성', emoji: '🌙', moodTag: '새벽' },
  focus: { label: '집중',     emoji: '🔥', moodTag: '집중' },
  rain:  { label: '비오는날', emoji: '🌧', moodTag: '비' },
  walk:  { label: '혼자걷기', emoji: '🚶', moodTag: '산책' },
  blank: { label: '멍때리기', emoji: '☁️', moodTag: '힐링' },
};

export function getEmotionProfile(emotionId: EmotionId): EmotionProfile | null {
  return EMOTION_MAP[emotionId] ?? null;
}

export function getMoodTag(emotionId: EmotionId): string {
  return EMOTION_MAP[emotionId]?.moodTag ?? '';
}

export function isValidEmotion(id: string): id is EmotionId {
  return id in EMOTION_MAP;
}
