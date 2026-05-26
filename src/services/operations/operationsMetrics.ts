import type { EmotionId } from '@/types/emotion';

import { buildAnalyticsInsights } from '@/services/analytics/analyticsInsights';
import type { AnalyticsEventMap } from '@/services/analytics/analyticsEvents';
import type { AnalyticsEvent } from '@/services/analytics/types';
import { getAnalyticsEvents } from '@/services/analytics/analyticsBuffer';
import { useGrowthSessionStore } from '@/stores/growthSessionStore';
import { useListeningActivityStore } from '@/stores/listeningActivityStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

export type OperationsRates = {
  recommendation_success_rate: number;
  playback_skip_rate: number;
  playlist_completion_rate: number;
  repeat_play_rate: number;
  home_revisit_rate: number;
  routine_usage_rate: number;
  /** 👍(5) / 전체 품질 피드백 */
  recommendation_satisfaction_rate: number;
};

export type SkipHotspot = {
  youtubeId: string;
  skipCount: number;
  playCount: number;
  skipRate: number;
  autoSkipCount: number;
};

export type EmotionOpsRow = {
  emotionId: EmotionId;
  requests: number;
  success: number;
  fallback: number;
  fallbackRate: number;
  plays: number;
  skips: number;
  skipRate: number;
  completions: number;
  completionRate: number;
  qualityRatings: { great: number; ok: number; poor: number };
  satisfactionRate: number;
};

export type DropoffFunnelStep = {
  step: string;
  count: number;
  dropoffFromPrevious?: number;
};

export type OperationsMetricsSnapshot = {
  generatedAt: string;
  rates: OperationsRates;
  funnel: DropoffFunnelStep[];
  emotionBreakdown: EmotionOpsRow[];
  topSkippedTracks: SkipHotspot[];
  topEmotionsByUsage: Array<{ emotionId: EmotionId; count: number }>;
  library: {
    likedTrackCount: number;
    savedPlaylistCount: number;
    totalReplays: number;
  };
  growth: {
    openCount: number;
    homeVisitCount: number;
    activeDays: number;
    routineUseCount: number;
    routinesPinned: number;
  };
  alerts: string[];
};

function buildSkipHotspots(events: readonly AnalyticsEvent[]): SkipHotspot[] {
  const playMap = new Map<string, number>();
  const skipMap = new Map<string, { total: number; auto: number }>();

  for (const e of events) {
    if (e.name === 'track_play') {
      const id = (e.payload as AnalyticsEventMap['track_play']).youtubeId;
      playMap.set(id, (playMap.get(id) ?? 0) + 1);
    }
    if (e.name === 'track_skip') {
      const p = e.payload as AnalyticsEventMap['track_skip'];
      const cur = skipMap.get(p.youtubeId) ?? { total: 0, auto: 0 };
      cur.total += 1;
      if (p.isAutoSkip) cur.auto += 1;
      skipMap.set(p.youtubeId, cur);
    }
  }

  return [...skipMap.entries()]
    .map(([youtubeId, s]) => ({
      youtubeId,
      skipCount: s.total,
      playCount: playMap.get(youtubeId) ?? 0,
      skipRate: rate(s.total, (playMap.get(youtubeId) ?? 0) + s.total),
      autoSkipCount: s.auto,
    }))
    .sort((a, b) => b.skipCount - a.skipCount)
    .slice(0, 20);
}

function buildEmotionRows(
  events: readonly AnalyticsEvent[],
  qualityBySession: Record<string, 1 | 3 | 5>
): EmotionOpsRow[] {
  const emotions = new Set<EmotionId>();
  for (const e of events) {
    const p = e.payload as { emotionId?: EmotionId };
    if (p.emotionId) emotions.add(p.emotionId);
  }

  const rows: EmotionOpsRow[] = [];

  for (const emotionId of emotions) {
    const requested = events.filter(
      (e) =>
        e.name === 'recommendation_requested' &&
        (e.payload as { emotionId: EmotionId }).emotionId === emotionId
    ).length;
    const success = events.filter(
      (e) =>
        e.name === 'recommendation_success' &&
        (e.payload as { emotionId: EmotionId }).emotionId === emotionId
    ).length;
    const fallback = events.filter(
      (e) =>
        e.name === 'recommendation_fallback' &&
        (e.payload as { emotionId: EmotionId }).emotionId === emotionId
    ).length;
    const plays = events.filter((e) => {
      if (e.name !== 'track_play') return false;
      return (e.payload as AnalyticsEventMap['track_play']).emotionId === emotionId;
    }).length;
    const skips = events.filter((e) => {
      if (e.name !== 'track_skip') return false;
      return (e.payload as AnalyticsEventMap['track_skip']).emotionId === emotionId;
    }).length;
    const completions = events.filter((e) => {
      if (e.name !== 'playlist_completed') return false;
      return (
        (e.payload as AnalyticsEventMap['playlist_completed']).emotionId === emotionId
      );
    }).length;

    const sessionIds = new Set(
      events
        .filter((e) => {
          if (e.name !== 'playlist_completed') return false;
          return (
            (e.payload as AnalyticsEventMap['playlist_completed']).emotionId ===
            emotionId
          );
        })
        .map(
          (e) =>
            (e.payload as AnalyticsEventMap['playlist_completed']).playlistSessionId
        )
    );

    let great = 0;
    let ok = 0;
    let poor = 0;
    for (const sid of sessionIds) {
      const r = qualityBySession[sid];
      if (r === 5) great += 1;
      else if (r === 3) ok += 1;
      else if (r === 1) poor += 1;
    }
    const rated = great + ok + poor;

    rows.push({
      emotionId,
      requests: requested,
      success,
      fallback,
      fallbackRate: rate(fallback, requested),
      plays,
      skips,
      skipRate: rate(skips, plays),
      completions,
      completionRate: rate(completions, plays),
      qualityRatings: { great, ok, poor },
      satisfactionRate: rate(great, rated),
    });
  }

  return rows.sort((a, b) => b.requests - a.requests);
}

function buildFunnel(events: readonly AnalyticsEvent[]): DropoffFunnelStep[] {
  const requested = events.filter((e) => e.name === 'recommendation_requested').length;
  const success = events.filter((e) => e.name === 'recommendation_success').length;
  const queueStarts = events.filter((e) => {
    if (e.name !== 'track_play') return false;
    return (e.payload as AnalyticsEventMap['track_play']).trigger === 'queue_start';
  }).length;
  const plays = events.filter((e) => e.name === 'track_play').length;
  const completed = events.filter((e) => e.name === 'playlist_completed').length;
  const feedback = events.filter((e) => e.name === 'feedback_submitted').length;

  const steps: DropoffFunnelStep[] = [
    { step: 'recommendation_requested', count: requested },
    { step: 'recommendation_success', count: success },
    { step: 'queue_start', count: queueStarts },
    { step: 'track_play', count: plays },
    { step: 'playlist_completed', count: completed },
    { step: 'feedback_submitted', count: feedback },
  ];

  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1].count;
    const cur = steps[i].count;
    steps[i].dropoffFromPrevious = prev > 0 ? rate(prev - cur, prev) : 0;
  }
  return steps;
}

/**
 * 베타 운영용 핵심 지표 — 로컬 버퍼 + growth/library 스토어 집계.
 * 서버 warehouse 동일 shape로 export 가능.
 */
export function buildOperationsMetrics(
  events: readonly AnalyticsEvent[] = getAnalyticsEvents()
): OperationsMetricsSnapshot {
  const insights = buildAnalyticsInsights(events);
  const growth = useGrowthSessionStore.getState();
  const library = useUserLibraryStore.getState();
  const listening = useListeningActivityStore.getState();
  const qualityBySession = library.qualityRatingBySessionId;

  const success = insights.totals.recommendationSuccess;
  const fallback = insights.totals.recommendationFallback;
  const recResolved = success + fallback;

  const totalReplays = Object.values(library.replayCountByPlaylistId).reduce(
    (a, b) => a + b,
    0
  );
  const playlistStarts = events.filter((e) => {
    if (e.name !== 'track_play') return false;
    return (e.payload as AnalyticsEventMap['track_play']).trigger === 'queue_start';
  }).length;

  const qualityRatings = Object.values(qualityBySession);
  const greatCount = qualityRatings.filter((r) => r === 5).length;
  const ratedCount = qualityRatings.length;

  const returningHome =
    growth.openCount > 1 ?
      Math.max(0, growth.homeVisitCount - 1)
    : 0;

  const rates: OperationsRates = {
    recommendation_success_rate: rate(success, recResolved),
    playback_skip_rate: insights.totals.skipRate,
    playlist_completion_rate: insights.totals.playlistCompletionRate,
    repeat_play_rate: rate(totalReplays, Math.max(1, playlistStarts)),
    home_revisit_rate: rate(returningHome, Math.max(1, growth.openCount - 1)),
    routine_usage_rate: rate(
      growth.routineUseCount,
      Math.max(1, listening.routines.length)
    ),
    recommendation_satisfaction_rate: rate(greatCount, ratedCount),
  };

  const emotionBreakdown = buildEmotionRows(events, qualityBySession);
  const topEmotionsByUsage = emotionBreakdown.map((r) => ({
    emotionId: r.emotionId,
    count: r.requests,
  }));

  const alerts: string[] = [];
  if (rates.recommendation_success_rate < 0.85 && recResolved >= 5) {
    alerts.push(
      `추천 성공률 ${(rates.recommendation_success_rate * 100).toFixed(0)}% — Edge/seed 점검`
    );
  }
  if (rates.playback_skip_rate >= 0.35 && insights.totals.trackPlay >= 10) {
    alerts.push(`스킵률 ${(rates.playback_skip_rate * 100).toFixed(0)}% — embed·catalog 점검`);
  }
  if (rates.playlist_completion_rate < 0.15 && insights.totals.trackPlay >= 10) {
    alerts.push('플레이리스트 완주율 낮음 — 큐 길이·첫 곡 품질 확인');
  }
  for (const row of emotionBreakdown) {
    if (row.fallbackRate >= 0.3 && row.requests >= 3) {
      alerts.push(
        `감정 ${row.emotionId} fallback ${(row.fallbackRate * 100).toFixed(0)}%`
      );
    }
  }
  alerts.push(...insights.improvementHints.slice(0, 3));

  return {
    generatedAt: new Date().toISOString(),
    rates,
    funnel: buildFunnel(events),
    emotionBreakdown,
    topSkippedTracks: buildSkipHotspots(events),
    topEmotionsByUsage,
    library: {
      likedTrackCount: Object.keys(library.likedByYoutubeId).length,
      savedPlaylistCount: library.savedPlaylists.length,
      totalReplays,
    },
    growth: {
      openCount: growth.openCount,
      homeVisitCount: growth.homeVisitCount,
      activeDays: growth.activeDays.length,
      routineUseCount: growth.routineUseCount,
      routinesPinned: listening.routines.length,
    },
    alerts: [...new Set(alerts)].slice(0, 12),
  };
}
