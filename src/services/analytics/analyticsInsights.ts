import type { EmotionId } from '@/types/emotion';

import type { AnalyticsEvent } from './types';
import { getAnalyticsEvents, getAnalyticsEventsByName } from './analyticsBuffer';

/**
 * 운영·개선용 집계 스냅샷 — 로컬 버퍼 또는 추후 warehouse 쿼리와 동일 shape.
 */
export type AnalyticsInsightsSnapshot = {
  generatedAt: string;
  totals: {
    recommendationRequested: number;
    recommendationSuccess: number;
    recommendationFallback: number;
    recommendationSuccessRate: number;
    trackPlay: number;
    trackSkip: number;
    skipRate: number;
    playbackError: number;
    playbackErrorRate: number;
    playlistCompleted: number;
    playlistCompletionRate: number;
  };
  /** 감정별 fallback 비율 (높을수록 Edge/seed 문제) */
  fallbackRateByEmotion: Partial<Record<EmotionId, number>>;
  /** 감정별 완주율 */
  completionRateByEmotion: Partial<Record<EmotionId, number>>;
  /** 감정별 사용량 (requested 기준) */
  usageByEmotion: Partial<Record<EmotionId, number>>;
  /** 자주 실패하는 youtubeId */
  topFailedYoutubeIds: Array<{
    youtubeId: string;
    count: number;
    kinds: string[];
  }>;
  /** 개선 후보 (휴리스틱) */
  improvementHints: string[];
};

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

export function buildAnalyticsInsights(
  events: readonly AnalyticsEvent[] = getAnalyticsEvents()
): AnalyticsInsightsSnapshot {
  const requested = events.filter((e) => e.name === 'recommendation_requested');
  const success = events.filter((e) => e.name === 'recommendation_success');
  const fallback = events.filter((e) => e.name === 'recommendation_fallback');
  const plays = events.filter((e) => e.name === 'track_play');
  const skips = events.filter((e) => e.name === 'track_skip');
  const errors = events.filter((e) => e.name === 'playback_error');
  const completed = events.filter((e) => e.name === 'playlist_completed');

  const recDenom = requested.length;
  const playDenom = plays.length;

  const fallbackByEmotion: Record<string, { fb: number; total: number }> = {};
  for (const e of requested) {
    const id = (e.payload as { emotionId: EmotionId }).emotionId;
    fallbackByEmotion[id] = fallbackByEmotion[id] ?? { fb: 0, total: 0 };
    fallbackByEmotion[id].total += 1;
  }
  for (const e of fallback) {
    const id = (e.payload as { emotionId: EmotionId }).emotionId;
    fallbackByEmotion[id] = fallbackByEmotion[id] ?? { fb: 0, total: 0 };
    fallbackByEmotion[id].fb += 1;
  }

  const usageByEmotion: Partial<Record<EmotionId, number>> = {};
  const fallbackRateByEmotion: Partial<Record<EmotionId, number>> = {};
  for (const [emotion, counts] of Object.entries(fallbackByEmotion)) {
    usageByEmotion[emotion as EmotionId] = counts.total;
    fallbackRateByEmotion[emotion as EmotionId] = rate(counts.fb, counts.total);
  }

  const completedByEmotion: Record<string, number> = {};
  const playsByEmotion: Record<string, number> = {};
  for (const e of getAnalyticsEventsByName('track_play')) {
    const emotionId = e.payload.emotionId;
    if (emotionId) {
      playsByEmotion[emotionId] = (playsByEmotion[emotionId] ?? 0) + 1;
    }
  }
  for (const e of getAnalyticsEventsByName('playlist_completed')) {
    const emotionId = e.payload.emotionId;
    if (emotionId) {
      completedByEmotion[emotionId] = (completedByEmotion[emotionId] ?? 0) + 1;
    }
  }
  const completionRateByEmotion: Partial<Record<EmotionId, number>> = {};
  for (const emotion of Object.keys(playsByEmotion)) {
    completionRateByEmotion[emotion as EmotionId] = rate(
      completedByEmotion[emotion] ?? 0,
      playsByEmotion[emotion] ?? 0
    );
  }

  const failMap = new Map<string, { count: number; kinds: Set<string> }>();
  for (const e of getAnalyticsEventsByName('playback_error')) {
    const id = e.payload.youtubeId;
    const cur = failMap.get(id) ?? { count: 0, kinds: new Set<string>() };
    cur.count += 1;
    cur.kinds.add(e.payload.kind);
    failMap.set(id, cur);
  }
  const topFailedYoutubeIds = [...failMap.entries()]
    .map(([youtubeId, v]) => ({
      youtubeId,
      count: v.count,
      kinds: [...v.kinds],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const improvementHints: string[] = [];
  for (const [emotion, fbRate] of Object.entries(fallbackRateByEmotion)) {
    if (fbRate >= 0.3) {
      improvementHints.push(
        `감정 "${emotion}" fallback 비율 ${(fbRate * 100).toFixed(0)}% — Edge/seed 점검`
      );
    }
  }
  for (const row of topFailedYoutubeIds.slice(0, 5)) {
    improvementHints.push(
      `youtubeId ${row.youtubeId} playback_error ${row.count}회 — catalogMeta/replacements`
    );
  }
  if (rate(skips.length, playDenom) >= 0.4) {
    improvementHints.push('skip 비율 높음 — embed 제한·seed 검증');
  }

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      recommendationRequested: requested.length,
      recommendationSuccess: success.length,
      recommendationFallback: fallback.length,
      recommendationSuccessRate: rate(success.length, recDenom),
      trackPlay: plays.length,
      trackSkip: skips.length,
      skipRate: rate(skips.length, playDenom),
      playbackError: errors.length,
      playbackErrorRate: rate(errors.length, playDenom),
      playlistCompleted: completed.length,
      playlistCompletionRate: rate(completed.length, plays.length),
    },
    fallbackRateByEmotion,
    completionRateByEmotion,
    usageByEmotion,
    topFailedYoutubeIds,
    improvementHints,
  };
}

/** DEV — 콘솔에 인사이트 출력 */
export function logAnalyticsInsights(): void {
  const snapshot = buildAnalyticsInsights();
  console.info('[analytics:insights]', JSON.stringify(snapshot, null, 2));
}
