import type { MoodStrategyId } from '@/types/moodStrategy';

export type MoodStrategyDefinition = {
  id: MoodStrategyId;
  label: string;
  /** Gemini 프롬프트용 의도 한 줄 (BPM/장르 세부는 포함하지 않음) */
  intent: string;
  energy: string;
  mood: string;
};

export const MOOD_STRATEGY_IDS: MoodStrategyId[] = [
  'comfort',
  'recovery',
  'escape',
  'motivation',
];

export const MOOD_STRATEGIES: Record<MoodStrategyId, MoodStrategyDefinition> = {
  comfort: {
    id: 'comfort',
    label: 'Comfort',
    intent: '감정을 바꾸려 하지 않고, 지금 기분을 따뜻하게 안아주는 곡 위주로 후보를 제안한다.',
    energy: '낮음',
    mood: '따뜻하고 감성적',
  },
  recovery: {
    id: 'recovery',
    label: 'Recovery',
    intent: '잔잔한 분위기에서 점차 희망과 가벼움으로 이어지는 흐름의 곡 후보를 제안한다.',
    energy: '초반 낮음 → 후반 중간',
    mood: '잔잔함에서 희망으로',
  },
  escape: {
    id: 'escape',
    label: 'Escape',
    intent: '현재 감정을 직접 다루지 않고, 몽환적·가벼운 분위기로 기분을 환기하는 곡 후보를 제안한다.',
    energy: '중간',
    mood: '몽환적, 가볍고 자유로움',
  },
  motivation: {
    id: 'motivation',
    label: 'Motivation',
    intent: '지금의 감정을 에너지와 고양감으로 전환할 수 있는 힘찬 곡 후보를 제안한다.',
    energy: '중간~높음',
    mood: '힘차고 고양감',
  },
};

export function getMoodStrategyIntent(id: MoodStrategyId): string {
  return MOOD_STRATEGIES[id]?.intent ?? MOOD_STRATEGIES.comfort.intent;
}
