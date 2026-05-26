/**
 * 재생 안정성 통계 — playbackHealthStore + playbackDebugStore 기반.
 * reason별 분류·비율·top failed IDs를 집계한다.
 */
import { usePlaybackDebugStore } from '@/stores/playbackDebugStore';
import {
  PLAYBACK_BLOCK_FAIL_THRESHOLD,
  usePlaybackHealthStore,
  type TrackPlaybackHealth,
} from '@/stores/playbackHealthStore';
import type { PlaybackFailReason } from '@/types/playback';

export type ReasonStat = {
  reason: PlaybackFailReason;
  count: number;
  ratio: number;
};

export type FailedTrackEntry = {
  youtubeId: string;
  title?: string;
  artist?: string;
  failCount: number;
  topReason: PlaybackFailReason;
  blocked: boolean;
};

export type PlaybackStabilityReport = {
  generatedAt: string;

  totalTracked: number;
  totalBlocked: number;
  totalFailEvents: number;

  reasonBreakdown: ReasonStat[];
  topFailedTracks: FailedTrackEntry[];

  iframeMountCount: number;
  recentSkipReasons: string[];
  lastError: string | null;

  /** buffering stuck 감지: 최근 로그에서 buffering 진입 후 playing 미진입 카운트 */
  bufferingStuckCount: number;
  /** remount 과도 감지: mountCount / totalTracked */
  remountRatio: number;
};

export function buildPlaybackStabilityReport(): PlaybackStabilityReport {
  const health = usePlaybackHealthStore.getState();
  const debug = usePlaybackDebugStore.getState();

  const allEntries = Object.values(health.byYoutubeId);
  const totalFailEvents = allEntries.reduce((sum, e) => sum + e.failCount, 0);
  const blocked = allEntries.filter(
    (e) => e.failCount >= PLAYBACK_BLOCK_FAIL_THRESHOLD
  );

  // reason breakdown
  const global = health.globalReasonCounts;
  const totalReasonCount = Object.values(global).reduce(
    (s, n) => s + (n ?? 0),
    0
  );
  const reasonBreakdown: ReasonStat[] = (
    Object.entries(global) as [PlaybackFailReason, number | undefined][]
  )
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([reason, count]) => ({
      reason,
      count: count ?? 0,
      ratio: totalReasonCount > 0 ? (count ?? 0) / totalReasonCount : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // top failed tracks
  const topFailedTracks: FailedTrackEntry[] = [...allEntries]
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 15)
    .map((e) => ({
      youtubeId: e.youtubeId,
      title: e.title,
      artist: e.artist,
      failCount: e.failCount,
      topReason: topReasonOf(e),
      blocked: e.failCount >= PLAYBACK_BLOCK_FAIL_THRESHOLD,
    }));

  // debug log analysis
  const recentSkipReasons = debug.entries
    .filter((e) => e.tag === 'skip')
    .slice(-20)
    .map((e) => e.message);

  const bufferingStuckCount = countBufferingStuck(debug.entries);
  const remountRatio =
    allEntries.length > 0 ? debug.mountCount / allEntries.length : 0;

  return {
    generatedAt: new Date().toISOString(),
    totalTracked: allEntries.length,
    totalBlocked: blocked.length,
    totalFailEvents,
    reasonBreakdown,
    topFailedTracks,
    iframeMountCount: debug.mountCount,
    recentSkipReasons,
    lastError: debug.lastError,
    bufferingStuckCount,
    remountRatio,
  };
}

function topReasonOf(entry: TrackPlaybackHealth): PlaybackFailReason {
  const counts = entry.reasonCounts;
  let top: PlaybackFailReason = entry.failReason;
  let max = 0;
  for (const [reason, count] of Object.entries(counts)) {
    if ((count ?? 0) > max) {
      max = count ?? 0;
      top = reason as PlaybackFailReason;
    }
  }
  return top;
}

function countBufferingStuck(
  entries: readonly { tag: string; message: string }[]
): number {
  let stuck = 0;
  let wasBuffering = false;
  for (const e of entries) {
    if (e.tag === 'state') {
      if (e.message.includes('buffering')) {
        wasBuffering = true;
      } else if (e.message.includes('playing')) {
        wasBuffering = false;
      } else if (wasBuffering && (e.message.includes('skip') || e.message.includes('timeout'))) {
        stuck++;
        wasBuffering = false;
      }
    }
    if (wasBuffering && (e.tag === 'skip' || e.tag === 'timeout')) {
      stuck++;
      wasBuffering = false;
    }
  }
  return stuck;
}
