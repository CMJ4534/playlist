/**
 * 유저 피드백 + analytics 기반 자동 insight 생성.
 *
 * 분석:
 *  - 감정별 dislike 비율
 *  - 감정별 skip 비율
 *  - 반복 불만 감지 (코멘트 키워드)
 *  - 전략별 만족도 비교
 *  - 곡 반복 불만 패턴
 */
import { useFeedbackStore } from '@/stores/feedbackStore';
import type { FeedbackEntry, FeedbackSentiment } from '@/types/feedback';
import type { EmotionId } from '@/types/emotion';

// ─── 타입 ─────────────────────────────────────────

export type FeedbackInsight = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  detail: string;
  metric?: number;
};

export type EmotionFeedbackSummary = {
  emotionId: EmotionId;
  total: number;
  great: number;
  ok: number;
  poor: number;
  dislikeRatio: number;
  avgSkipRate: number;
  topComments: string[];
};

export type StrategyFeedbackSummary = {
  strategyId: string;
  total: number;
  great: number;
  ok: number;
  poor: number;
  satisfactionScore: number;
};

export type FeedbackInsightReport = {
  generatedAt: string;
  totalFeedback: number;
  overallSatisfaction: number;
  byEmotion: EmotionFeedbackSummary[];
  byStrategy: StrategyFeedbackSummary[];
  insights: FeedbackInsight[];
  repetitionComplaints: number;
  moodMismatchComplaints: number;
  playbackComplaints: number;
};

// ─── 키워드 감지 ──────────────────────────────────

const REPETITION_KEYWORDS = ['반복', '같은 곡', '또 나', '맨날', 'same', 'repeat', '중복'];
const MOOD_MISMATCH_KEYWORDS = ['안 맞', '분위기', '밝', '어둡', '느낌이 다', 'mood', '감정'];
const PLAYBACK_KEYWORDS = ['재생', '소리', '안 나', '끊김', '버퍼', 'play', 'audio'];

function detectKeywords(comment: string, keywords: string[]): boolean {
  const lower = comment.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ─── 분석 ─────────────────────────────────────────

function sentimentScore(sentiment: FeedbackSentiment): number {
  switch (sentiment) {
    case 'great': return 1;
    case 'ok': return 0.5;
    case 'poor': return 0;
  }
}

function computeEmotionSummaries(entries: FeedbackEntry[]): EmotionFeedbackSummary[] {
  const byEmotion = new Map<EmotionId, FeedbackEntry[]>();

  for (const e of entries) {
    if (!e.emotionId) continue;
    const list = byEmotion.get(e.emotionId) ?? [];
    list.push(e);
    byEmotion.set(e.emotionId, list);
  }

  return [...byEmotion.entries()].map(([emotionId, items]) => {
    const great = items.filter((i) => i.sentiment === 'great').length;
    const ok = items.filter((i) => i.sentiment === 'ok').length;
    const poor = items.filter((i) => i.sentiment === 'poor').length;
    const total = items.length;

    const totalSkipped = items.reduce((s, i) => s + i.tracksSkipped, 0);
    const totalPlayed = items.reduce((s, i) => s + i.tracksPlayed, 0);
    const avgSkipRate = totalPlayed > 0 ? totalSkipped / totalPlayed : 0;

    const comments = items
      .map((i) => i.comment)
      .filter((c): c is string => Boolean(c))
      .slice(0, 5);

    return {
      emotionId,
      total,
      great,
      ok,
      poor,
      dislikeRatio: total > 0 ? poor / total : 0,
      avgSkipRate: Math.round(avgSkipRate * 100) / 100,
      topComments: comments,
    };
  });
}

function computeStrategySummaries(entries: FeedbackEntry[]): StrategyFeedbackSummary[] {
  const byStrategy = new Map<string, FeedbackEntry[]>();

  for (const e of entries) {
    const key = e.strategyId ?? 'unknown';
    const list = byStrategy.get(key) ?? [];
    list.push(e);
    byStrategy.set(key, list);
  }

  return [...byStrategy.entries()].map(([strategyId, items]) => {
    const great = items.filter((i) => i.sentiment === 'great').length;
    const ok = items.filter((i) => i.sentiment === 'ok').length;
    const poor = items.filter((i) => i.sentiment === 'poor').length;
    const total = items.length;
    const satisfactionScore =
      total > 0
        ? items.reduce((s, i) => s + sentimentScore(i.sentiment), 0) / total
        : 0;

    return {
      strategyId,
      total,
      great,
      ok,
      poor,
      satisfactionScore: Math.round(satisfactionScore * 100) / 100,
    };
  });
}

function generateInsights(
  entries: FeedbackEntry[],
  byEmotion: EmotionFeedbackSummary[],
  byStrategy: StrategyFeedbackSummary[],
  repetitionCount: number,
  moodMismatchCount: number,
  playbackCount: number
): FeedbackInsight[] {
  const insights: FeedbackInsight[] = [];
  let idx = 0;
  const id = () => `insight_${++idx}`;

  // 감정별 dislike 높은 항목
  for (const es of byEmotion) {
    if (es.total >= 3 && es.dislikeRatio > 0.4) {
      insights.push({
        id: id(),
        severity: 'critical',
        category: 'emotion_dislike',
        title: `${es.emotionId} 감정 불만족 높음`,
        detail: `${es.emotionId}에서 ${(es.dislikeRatio * 100).toFixed(0)}%가 "별로" 평가 (${es.poor}/${es.total}건)`,
        metric: es.dislikeRatio,
      });
    }
  }

  // skip 높은 감정
  for (const es of byEmotion) {
    if (es.total >= 3 && es.avgSkipRate > 0.3) {
      insights.push({
        id: id(),
        severity: 'warning',
        category: 'high_skip',
        title: `${es.emotionId} skip 비율 높음`,
        detail: `평균 skip rate ${(es.avgSkipRate * 100).toFixed(0)}%`,
        metric: es.avgSkipRate,
      });
    }
  }

  // 반복 불만
  if (repetitionCount >= 2) {
    insights.push({
      id: id(),
      severity: repetitionCount >= 5 ? 'critical' : 'warning',
      category: 'repetition',
      title: '곡 반복 불만 증가',
      detail: `"반복" 관련 코멘트 ${repetitionCount}건 — 카탈로그 확장 또는 exclude 강화 필요`,
      metric: repetitionCount,
    });
  }

  // 분위기 불일치
  if (moodMismatchCount >= 2) {
    insights.push({
      id: id(),
      severity: 'warning',
      category: 'mood_mismatch',
      title: '분위기 불일치 피드백',
      detail: `"분위기 안 맞음" 관련 코멘트 ${moodMismatchCount}건`,
      metric: moodMismatchCount,
    });
  }

  // 재생 문제
  if (playbackCount >= 2) {
    insights.push({
      id: id(),
      severity: 'critical',
      category: 'playback_issue',
      title: '재생 문제 피드백',
      detail: `"재생 안 됨" 관련 코멘트 ${playbackCount}건 — 플레이어 안정성 확인 필요`,
      metric: playbackCount,
    });
  }

  // 전략 비교
  if (byStrategy.length >= 2) {
    const sorted = [...byStrategy].sort(
      (a, b) => a.satisfactionScore - b.satisfactionScore
    );
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    if (best.satisfactionScore - worst.satisfactionScore > 0.2) {
      insights.push({
        id: id(),
        severity: 'info',
        category: 'strategy_comparison',
        title: '전략 간 만족도 차이',
        detail: `${best.strategyId}(${best.satisfactionScore}) vs ${worst.strategyId}(${worst.satisfactionScore})`,
        metric: best.satisfactionScore - worst.satisfactionScore,
      });
    }
  }

  // 전체 만족도 낮음
  const overallSat =
    entries.length > 0
      ? entries.reduce((s, e) => s + sentimentScore(e.sentiment), 0) / entries.length
      : 0;
  if (entries.length >= 5 && overallSat < 0.4) {
    insights.push({
      id: id(),
      severity: 'critical',
      category: 'overall_satisfaction',
      title: '전체 만족도 위험 수준',
      detail: `전체 만족도 ${(overallSat * 100).toFixed(0)}% — 즉시 원인 분석 필요`,
      metric: overallSat,
    });
  }

  return insights.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ─── 공개 API ──────────────────────────────────────

export function buildFeedbackInsightReport(): FeedbackInsightReport {
  const entries = useFeedbackStore.getState().getAll();
  const byEmotion = computeEmotionSummaries(entries);
  const byStrategy = computeStrategySummaries(entries);

  const comments = entries
    .map((e) => e.comment)
    .filter((c): c is string => Boolean(c));

  const repetitionComplaints = comments.filter((c) =>
    detectKeywords(c, REPETITION_KEYWORDS)
  ).length;
  const moodMismatchComplaints = comments.filter((c) =>
    detectKeywords(c, MOOD_MISMATCH_KEYWORDS)
  ).length;
  const playbackComplaints = comments.filter((c) =>
    detectKeywords(c, PLAYBACK_KEYWORDS)
  ).length;

  const overallSatisfaction =
    entries.length > 0
      ? Math.round(
          (entries.reduce((s, e) => s + sentimentScore(e.sentiment), 0) /
            entries.length) *
            100
        ) / 100
      : 0;

  const insights = generateInsights(
    entries,
    byEmotion,
    byStrategy,
    repetitionComplaints,
    moodMismatchComplaints,
    playbackComplaints
  );

  return {
    generatedAt: new Date().toISOString(),
    totalFeedback: entries.length,
    overallSatisfaction,
    byEmotion,
    byStrategy,
    insights,
    repetitionComplaints,
    moodMismatchComplaints,
    playbackComplaints,
  };
}
