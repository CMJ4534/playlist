export type MoodStrategyId = 'comfort' | 'recovery' | 'escape' | 'motivation';

export type MoodStrategyDefinition = {
  id: MoodStrategyId;
  intent: string;
};

export const MOOD_STRATEGIES: Record<MoodStrategyId, MoodStrategyDefinition> = {
  comfort: {
    id: 'comfort',
    intent: '감정을 바꾸려 하지 않고, 지금 기분을 따뜻하게 안아주는 곡 위주로 후보를 제안한다.',
  },
  recovery: {
    id: 'recovery',
    intent: '잔잔한 분위기에서 점차 희망과 가벼움으로 이어지는 흐름의 곡 후보를 제안한다.',
  },
  escape: {
    id: 'escape',
    intent: '현재 감정을 직접 다루지 않고, 몽환적·가벼운 분위기로 기분을 환기하는 곡 후보를 제안한다.',
  },
  motivation: {
    id: 'motivation',
    intent: '지금의 감정을 에너지와 고양감으로 전환할 수 있는 힘찬 곡 후보를 제안한다.',
  },
};

export function getMoodStrategyIntent(id: MoodStrategyId): string {
  return MOOD_STRATEGIES[id]?.intent ?? MOOD_STRATEGIES.comfort.intent;
}
