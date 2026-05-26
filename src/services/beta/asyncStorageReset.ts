import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearAnalyticsBuffer } from '@/services/analytics/analyticsBuffer';
import { useBetaDiagnosticsStore } from '@/stores/betaDiagnosticsStore';
import { usePlaybackHealthStore } from '@/stores/playbackHealthStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useRecommendationHistoryStore } from '@/stores/recommendationHistoryStore';
import { useGrowthSessionStore } from '@/stores/growthSessionStore';
import { useListeningActivityStore } from '@/stores/listeningActivityStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';
import { useFeedbackPromptStore } from '@/stores/feedbackPromptStore';
import { useRevisitStore } from '@/stores/revisitStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useRecommendationSessionStore } from '@/stores/recommendationSessionStore';

const MOODPLAY_PREFIXES = [
  'moodplay-',
  '@moodplay',
];

const EXACT_KEYS = [
  'moodplay-feedback-queue',
];

/**
 * Beta QA — 로컬 상태 초기화 (재현 테스트용).
 */
export async function resetMoodplayLocalStorage(): Promise<string[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  const toRemove = allKeys.filter(
    (k) => EXACT_KEYS.includes(k) || MOODPLAY_PREFIXES.some((p) => k.includes(p))
  );

  if (toRemove.length) {
    await AsyncStorage.multiRemove(toRemove);
  }

  clearAnalyticsBuffer();
  usePlaybackHealthStore.getState().clear();
  useRecommendationHistoryStore.getState().clear();
  useListeningActivityStore.getState().clear();
  useGrowthSessionStore.getState().clear();
  useUserLibraryStore.getState().clear();
  useFeedbackPromptStore.getState().clear();
  useRevisitStore.getState().clearLastRecommendation();
  useBetaDiagnosticsStore.getState().clear();
  useRecommendationSessionStore.getState().clear();
  usePlayerStore.getState().setQueue([], 0);
  useOnboardingStore.getState().resetOnboarding();

  return toRemove;
}
