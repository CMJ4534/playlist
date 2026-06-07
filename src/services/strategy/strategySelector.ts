import { MOOD_STRATEGY_IDS } from '@/constants/moodStrategies';
import { getTimeOfDay } from '@/lib/timeOfDay';
import type { EmotionId } from '@/types/emotion';
import type { MoodStrategyId, MoodStrategySession, TimeOfDay } from '@/types/moodStrategy';

const FALLBACK_STRATEGY: MoodStrategyId = 'comfort';

/** 감정 ID → 첫 추천 기본 strategy */
const EMOTION_DEFAULT_STRATEGY: Record<EmotionId, MoodStrategyId> = {
  sad: 'recovery',
  dawn: 'comfort',
  focus: 'motivation',
  rain: 'comfort',
  walk: 'escape',
  blank: 'escape',
};

const RETRY_PRIORITY: Record<MoodStrategyId, MoodStrategyId[]> = {
  comfort: ['motivation', 'escape'],
  motivation: ['comfort', 'recovery'],
  escape: ['comfort', 'recovery'],
  recovery: ['motivation', 'escape'],
};

function applyTimeCorrections(
  strategy: MoodStrategyId,
  timeOfDay: TimeOfDay
): MoodStrategyId {
  if (timeOfDay === 'latenight' && strategy === 'motivation') {
    return 'recovery';
  }
  if (timeOfDay === 'night' && (strategy === 'recovery' || strategy === 'motivation')) {
    return 'escape';
  }
  return strategy;
}

function pickFirstAvailable(
  preferred: MoodStrategyId[],
  available: MoodStrategyId[],
  exclude?: MoodStrategyId
): MoodStrategyId | null {
  for (const id of preferred) {
    if (id === exclude) continue;
    if (available.includes(id)) return id;
  }
  return null;
}

function selectFirstStrategy(emotion: EmotionId, timeOfDay: TimeOfDay): MoodStrategyId {
  const base = EMOTION_DEFAULT_STRATEGY[emotion] ?? FALLBACK_STRATEGY;
  return applyTimeCorrections(base, timeOfDay);
}

function selectRetryStrategy(session: MoodStrategySession): MoodStrategyId {
  const last = session.history.used_strategies.at(-1);
  let available = [...session.state.available_strategies];

  if (session.history.attempt_count >= 4 && available.length === 0) {
    available = [...MOOD_STRATEGY_IDS];
  }

  if (last) {
    const preferred = RETRY_PRIORITY[last] ?? MOOD_STRATEGY_IDS;
    const picked = pickFirstAvailable(preferred, available, last);
    if (picked) return picked;

    const fallback = available.find((id) => id !== last);
    if (fallback) return fallback;
  }

  const any = available[0] ?? FALLBACK_STRATEGY;
  return any !== last ? any : MOOD_STRATEGY_IDS.find((id) => id !== last) ?? FALLBACK_STRATEGY;
}

export function resolveCandidateCount(attemptCount: number): number {
  return attemptCount >= 3 ? 25 : 22;
}

/**
 * Strategy 선택 — 실패 시 comfort fallback.
 */
export function selectMoodStrategy(session: MoodStrategySession): MoodStrategyId {
  try {
    if (session.history.attempt_count === 0) {
      return selectFirstStrategy(session.emotion, session.time_of_day);
    }
    return selectRetryStrategy(session);
  } catch (err) {
    console.warn('[strategySelector] fallback to comfort:', err);
    return FALLBACK_STRATEGY;
  }
}

export function createInitialAvailableStrategies(): MoodStrategyId[] {
  return [...MOOD_STRATEGY_IDS];
}

export function getTimeOfDayForSession(): TimeOfDay {
  return getTimeOfDay();
}
