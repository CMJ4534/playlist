/**
 * seed 품질 점검 — 로컬 playbackHealth + analytics 기반으로
 * 운영에 필요한 카탈로그 품질 지표를 산출한다.
 */
import { getAnalyticsEvents } from '@/services/analytics/analyticsBuffer';
import type { AnalyticsEventMap } from '@/services/analytics/analyticsEvents';
import type { AnalyticsEvent } from '@/services/analytics/types';
import {
  PLAYBACK_BLOCK_FAIL_THRESHOLD,
  usePlaybackHealthStore,
} from '@/stores/playbackHealthStore';

export type SeedQualityReport = {
  generatedAt: string;

  totalTracksPlayed: number;
  totalTracksFailed: number;
  failedRatio: number;

  embeddingRestrictedCount: number;
  embeddingRestrictedRatio: number;

  duplicateArtistRatio: number;
  topDuplicateArtists: Array<{ artist: string; count: number }>;

  moodDistribution: Record<string, number>;
  moodImbalanceScore: number;

  noveltyDistribution: Record<string, number>;
  lowNoveltyRatio: number;

  blockedTrackCount: number;
  topBlockedTracks: Array<{
    youtubeId: string;
    title?: string;
    artist?: string;
    failCount: number;
    reason: string;
  }>;
};

export function buildSeedQualityReport(): SeedQualityReport {
  const events = getAnalyticsEvents();
  const health = usePlaybackHealthStore.getState();

  // track play 이벤트에서 youtubeId 집계
  const playedIds = new Set<string>();
  const artistCounts: Record<string, number> = {};
  const moodCounts: Record<string, number> = {};
  const noveltyCounts: Record<string, number> = {};

  for (const e of events) {
    if (e.name === 'track_play') {
      const p = e.payload as AnalyticsEventMap['track_play'];
      playedIds.add(p.youtubeId);
    }
  }

  // analytics에 트랙 메타가 없으므로 health store에서 보완
  const allHealth = Object.values(health.byYoutubeId);
  const failedIds = new Set(allHealth.map((h) => h.youtubeId));

  // embedding restricted
  const embeddingRestricted = allHealth.filter(
    (h) => h.failReason === 'embedding_restricted' || h.failReason === 'embed_not_allowed'
  );

  // blocked
  const blocked = allHealth.filter(
    (h) => h.failCount >= PLAYBACK_BLOCK_FAIL_THRESHOLD
  );

  // artist 중복률은 health store의 artist 필드 기반
  for (const h of allHealth) {
    if (h.artist) {
      artistCounts[h.artist] = (artistCounts[h.artist] ?? 0) + 1;
    }
  }
  const topDuplicateArtists = Object.entries(artistCounts)
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist, count]) => ({ artist, count }));

  const totalArtists = Object.keys(artistCounts).length;
  const duplicateArtistCount = topDuplicateArtists.reduce((s, d) => s + d.count - 1, 0);
  const totalTracks = allHealth.length;
  const duplicateArtistRatio =
    totalTracks > 0 ? duplicateArtistCount / totalTracks : 0;

  // mood/novelty는 실제 track 데이터가 있을 때만 유효 (placeholder)
  const moodImbalanceScore = computeImbalance(moodCounts);
  const familiarCount = noveltyCounts['familiar'] ?? 0;
  const totalNov = Object.values(noveltyCounts).reduce((s, n) => s + n, 0);
  const lowNoveltyRatio = totalNov > 0 ? familiarCount / totalNov : 0;

  const totalTracksPlayed = playedIds.size;
  const totalTracksFailed = failedIds.size;
  const failedRatio =
    totalTracksPlayed > 0
      ? totalTracksFailed / (totalTracksPlayed + totalTracksFailed)
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    totalTracksPlayed,
    totalTracksFailed,
    failedRatio,
    embeddingRestrictedCount: embeddingRestricted.length,
    embeddingRestrictedRatio:
      totalTracksFailed > 0
        ? embeddingRestricted.length / totalTracksFailed
        : 0,
    duplicateArtistRatio,
    topDuplicateArtists,
    moodDistribution: moodCounts,
    moodImbalanceScore,
    noveltyDistribution: noveltyCounts,
    lowNoveltyRatio,
    blockedTrackCount: blocked.length,
    topBlockedTracks: blocked
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10)
      .map((h) => ({
        youtubeId: h.youtubeId,
        title: h.title,
        artist: h.artist,
        failCount: h.failCount,
        reason: h.failReason,
      })),
  };
}

function computeImbalance(counts: Record<string, number>): number {
  const values = Object.values(counts);
  if (values.length <= 1) return 0;
  const total = values.reduce((s, n) => s + n, 0);
  if (total === 0) return 0;
  const expected = total / values.length;
  const variance =
    values.reduce((s, n) => s + (n - expected) ** 2, 0) / values.length;
  return Math.sqrt(variance) / expected;
}
