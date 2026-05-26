import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { trackEvent } from '@/services/analytics/analyticsService';
import type { SubmitFeedbackInput, FeedbackPayload } from './feedbackTypes';

const QUEUE_KEY = 'moodplay-feedback-queue';
const MAX_LOCAL_QUEUE = 50;

function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function appEnv(): string {
  return (
    process.env.EXPO_PUBLIC_APP_ENV ??
    process.env.APP_ENV ??
    'development'
  );
}

async function loadQueue(): Promise<FeedbackPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FeedbackPayload[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: FeedbackPayload[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, MAX_LOCAL_QUEUE)));
}

/**
 * 피드백 제출 — 현재는 로컬 큐 + analytics 이벤트 (서버 미연동).
 */
export async function submitFeedback(
  input: SubmitFeedbackInput
): Promise<FeedbackPayload> {
  const entry: FeedbackPayload = {
    ...input,
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    appVersion: appVersion(),
    appEnv: appEnv(),
  };

  const queue = await loadQueue();
  queue.unshift(entry);
  await saveQueue(queue);

  const sentiment =
    input.meta?.sentiment === 'great' ||
    input.meta?.sentiment === 'ok' ||
    input.meta?.sentiment === 'poor' ?
      (input.meta.sentiment as 'great' | 'ok' | 'poor')
    : undefined;

  trackEvent('feedback_submitted', {
    category: input.category,
    rating: input.rating,
    hasComment: Boolean(input.comment?.trim()),
    emotionId: input.emotionId,
    sentiment,
  });

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info('[feedback] queued locally', entry.id);
  }

  return entry;
}

export async function getPendingFeedback(): Promise<FeedbackPayload[]> {
  return loadQueue();
}

export async function clearPendingFeedback(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
