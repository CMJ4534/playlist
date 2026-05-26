import {
  getPlayabilityTier,
  type PlayabilityTier,
} from '@/data/seeds/catalogMeta';
import { usePlaybackHealthStore, PLAYBACK_BLOCK_FAIL_THRESHOLD } from '@/stores/playbackHealthStore';
import type { Track } from '@/types/track';

export type EmbedSafeDiagnostics = {
  totalPool: number;
  verifiedCount: number;
  pendingCount: number;
  unknownCount: number;
  blockedCount: number;
  healthBlockedCount: number;
  candidateCount: number;
  playableRatio: number;
  fallbackReason: string | null;
  degradeLevel: 'strict' | 'relaxed' | 'emergency';
};

const PRIORITY_ORDER: PlayabilityTier[] = ['verified', 'pending', 'unknown'];

/**
 * embed-safe 정책에 따라 추천 풀을 필터링.
 *
 * 단계적 degrade:
 *   1. strict — verified만
 *   2. relaxed — verified + pending + unknown (blocked 제외)
 *   3. emergency — 전체 (마지막 수단, 사실상 기존 동작)
 *
 * failCount 기반 감점도 이 단계에서 적용.
 */
export function applyEmbedSafeFilter(
  pool: Track[],
  options?: {
    minCandidates?: number;
  }
): { filtered: Track[]; diagnostics: EmbedSafeDiagnostics } {
  const minCandidates = options?.minCandidates ?? 8;

  const healthStore = usePlaybackHealthStore.getState();
  const healthBlocked = new Set(healthStore.getBlockedYoutubeIds());

  const stats = {
    totalPool: pool.length,
    verifiedCount: 0,
    pendingCount: 0,
    unknownCount: 0,
    blockedCount: 0,
    healthBlockedCount: 0,
  };

  const byTier: Record<PlayabilityTier | 'healthBlocked', Track[]> = {
    verified: [],
    pending: [],
    unknown: [],
    blocked: [],
    healthBlocked: [],
  };

  for (const track of pool) {
    if (healthBlocked.has(track.youtubeId)) {
      stats.healthBlockedCount++;
      byTier.healthBlocked.push(track);
      continue;
    }

    const tier = getPlayabilityTier(track.youtubeId);
    byTier[tier].push(track);

    if (tier === 'verified') stats.verifiedCount++;
    else if (tier === 'pending') stats.pendingCount++;
    else if (tier === 'unknown') stats.unknownCount++;
    else stats.blockedCount++;
  }

  let filtered: Track[] = [];
  let degradeLevel: EmbedSafeDiagnostics['degradeLevel'] = 'strict';
  let fallbackReason: string | null = null;

  // 1단계: verified only
  filtered = byTier.verified;

  if (filtered.length >= minCandidates) {
    // strict 통과
  } else {
    // 2단계: verified + pending + unknown
    degradeLevel = 'relaxed';
    fallbackReason = `verified(${stats.verifiedCount}) < min(${minCandidates}), adding pending+unknown`;
    filtered = [];
    for (const tier of PRIORITY_ORDER) {
      filtered.push(...byTier[tier]);
    }
  }

  if (filtered.length < minCandidates) {
    // 3단계: emergency — blocked는 여전히 제외하되, healthBlocked는 부활
    degradeLevel = 'emergency';
    fallbackReason = `all non-blocked(${filtered.length}) < min(${minCandidates}), emergency mode`;
    filtered = pool.filter((t) => {
      const tier = getPlayabilityTier(t.youtubeId);
      return tier !== 'blocked';
    });
  }

  // failCount 기반 정렬 감점: 실패 이력 있는 곡을 뒤로 밀기
  filtered = applyFailCountPenalty(filtered);

  const candidateCount = filtered.length;
  const playableRatio = stats.totalPool > 0 ? candidateCount / stats.totalPool : 0;

  return {
    filtered,
    diagnostics: {
      ...stats,
      candidateCount,
      playableRatio,
      fallbackReason,
      degradeLevel,
    },
  };
}

/**
 * failCount > 0인 곡을 풀 뒤로 밀어서 우선순위 하락.
 * 완전 제거하지 않고 순서만 조정하여 추천 후보가 부족해지는 것을 방지.
 */
function applyFailCountPenalty(tracks: Track[]): Track[] {
  const healthStore = usePlaybackHealthStore.getState();

  return [...tracks].sort((a, b) => {
    const fa = healthStore.getHealth(a.youtubeId)?.failCount ?? 0;
    const fb = healthStore.getHealth(b.youtubeId)?.failCount ?? 0;
    return fa - fb;
  });
}

/**
 * 추천 후보 풀에서 embed-safe 트랙만 포함하는 간편 필터.
 * Track[] 를 받아 playable한 것만 반환 (strict=false: blocked만 제외).
 */
export function filterPlayableTracks(pool: Track[]): Track[] {
  const healthBlocked = new Set(
    usePlaybackHealthStore.getState().getBlockedYoutubeIds()
  );

  return pool.filter((t) => {
    if (healthBlocked.has(t.youtubeId)) return false;
    const tier = getPlayabilityTier(t.youtubeId);
    return tier !== 'blocked';
  });
}
