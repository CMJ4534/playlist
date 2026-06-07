import { getMoodStrategyIntent } from '@/constants/moodStrategies';
import {
  getDiscoveryPressureInstruction,
  resolveDiscoveryPressure,
} from '@/constants/discoveryPressure';
import { resolveCandidateCount, selectMoodStrategy } from '@/services/strategy/strategySelector';
import { generateLocalRecommendation } from '@/services/localRecommendation';
import { fetchRecommendation, type RecommendResponse } from '@/services/moodplayApi';
import { getTastePreferencesPayload } from '@/stores/tastePreferencesStore';
import { useMoodStrategySessionStore } from '@/stores/moodStrategySessionStore';
import type { EmotionId } from '@/types/emotion';
import type { MoodStrategyId, StrategyRequestContext } from '@/types/moodStrategy';

export type StrategyRecommendationOptions = {
  /** true: 같은 session에서 재추천 (attempt_count >= 1) */
  isRetry?: boolean;
  /** true: 강제로 session 초기화 후 새 session */
  resetSession?: boolean;
};

function buildStrategyContext(
  session: NonNullable<ReturnType<typeof useMoodStrategySessionStore.getState>['session']>,
  strategyId: MoodStrategyId
): StrategyRequestContext {
  const attemptCount = session.history.attempt_count;
  const discoveryPressure = session.state.current_pressure ?? resolveDiscoveryPressure(attemptCount);

  return {
    sessionId: session.session_id,
    strategyId,
    strategyIntent: getMoodStrategyIntent(strategyId),
    attemptCount,
    discoveryPressure,
    discoveryPressureInstruction: getDiscoveryPressureInstruction(discoveryPressure),
    excludeTracks: session.history.shown_tracks.map((t) => ({
      title: t.title,
      artist: t.artist,
    })),
    excludeVideoIds: session.history.shown_track_ids,
    excludeArtists: session.history.shown_artist_ids,
    candidateCount: resolveCandidateCount(attemptCount),
  };
}

/**
 * Strategy Layer — Gemini 호출 전 session/strategy/pressure 준비 → fetchRecommendation 위임.
 */
export async function runStrategyRecommendation(
  emotionId: EmotionId,
  diary?: string,
  options?: StrategyRecommendationOptions
): Promise<RecommendResponse> {
  const store = useMoodStrategySessionStore.getState();
  const diaryText = diary?.trim() ?? '';

  if (options?.resetSession) {
    store.clearSession();
  }

  let session = store.getSession();

  if (options?.isRetry && session) {
    // 동일 session 유지
  } else if (
    !session ||
    session.emotion !== emotionId ||
    session.diary_text !== diaryText ||
    options?.resetSession
  ) {
    store.clearSession();
    session = store.startSession(emotionId, diaryText);
  } else {
    session = store.startSession(emotionId, diaryText);
  }

  const attemptCount = session.history.attempt_count;
  const discoveryPressure = resolveDiscoveryPressure(attemptCount);
  const strategyId = selectMoodStrategy(session);

  store.setCurrentStrategy(strategyId);
  store.setCurrentPressure(discoveryPressure);

  const refreshed = useMoodStrategySessionStore.getState().session!;
  const strategyContext = buildStrategyContext(refreshed, strategyId);
  const tastePreferences = getTastePreferencesPayload() ?? undefined;

  console.log('[strategyLayer] request', {
    sessionId: strategyContext.sessionId,
    strategy: strategyContext.strategyId,
    pressure: strategyContext.discoveryPressure,
    attempt: strategyContext.attemptCount,
    excludeTracks: strategyContext.excludeTracks.length,
  });

  const result = await fetchRecommendation(
    emotionId,
    diaryText || undefined,
    tastePreferences,
    strategyContext
  );

  useMoodStrategySessionStore.getState().commitRecommendation(
    result.playback.videos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      artist: v.artist,
    }))
  );

  return result;
}

/** API/local fallback 결과를 session history에 반영 (재추천 attempt·exclude 추적) */
export function commitRecommendationResult(result: RecommendResponse): void {
  const store = useMoodStrategySessionStore.getState();
  if (!store.session?.state.current_strategy) {
    console.warn('[strategyLayer] commit skipped — no active strategy on session');
    return;
  }

  store.commitRecommendation(
    result.playback.videos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      artist: v.artist,
    }))
  );
}

export function buildLocalFallback(
  emotionId: EmotionId,
  diary?: string
): RecommendResponse {
  const session = useMoodStrategySessionStore.getState().session;
  return generateLocalRecommendation(emotionId, diary?.trim() || undefined, {
    excludeVideoIds: session?.history.shown_track_ids,
    attemptOffset: session?.history.attempt_count ?? 0,
  });
}

/** 재추천 — session 업데이트 후 새 strategy + pressure로 요청 */
export async function runStrategyRetryRecommendation(
  emotionId: EmotionId,
  diary?: string
): Promise<RecommendResponse> {
  return runStrategyRecommendation(emotionId, diary, { isRetry: true });
}
