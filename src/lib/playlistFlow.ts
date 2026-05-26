import type { Track } from '@/types/track';

export type EnergyArcProfile = 'calm-settle' | 'gentle-lift' | 'wave' | 'steady';

/** 12곡 기준 목표 energy 곡선 — 감정 이어짐을 위해 완만한 단계 */
const ENERGY_CURVES: Record<EnergyArcProfile, number[]> = {
  'calm-settle': [3, 3, 3, 4, 4, 4, 3, 3, 3, 3, 2, 2],
  'gentle-lift': [3, 3, 3, 4, 4, 5, 5, 5, 4, 4, 3, 3],
  wave: [3, 3, 4, 4, 5, 5, 4, 4, 4, 3, 3, 3],
  steady: [2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5],
};

function moodOverlap(a: Track, b: Track): number {
  const ta = new Set(a.moodTags ?? []);
  const tb = b.moodTags ?? [];
  return tb.filter((t) => ta.has(t)).length;
}

function energyDiffScore(track: Track, target: number): number {
  return Math.abs((track.energyLevel ?? 5) - target);
}

/**
 * 플레이리스트 내 감정 흐름 — energy_level 기준 곡선 매칭.
 */
export function orderTracksByEnergyArc(
  tracks: Track[],
  profile: EnergyArcProfile
): Track[] {
  if (tracks.length <= 2) return tracks;

  const curve = ENERGY_CURVES[profile].slice(0, tracks.length);
  const remaining = [...tracks];
  const ordered: Track[] = [];

  for (let i = 0; i < curve.length; i++) {
    const target = curve[i];
    if (!remaining.length) break;

    let bestIndex = 0;
    let bestScore = Infinity;

    for (let j = 0; j < remaining.length; j++) {
      const candidate = remaining[j];
      let score = energyDiffScore(candidate, target);

      if (ordered.length > 0) {
        const overlap = moodOverlap(ordered[ordered.length - 1], candidate);
        score -= overlap * 0.35;
        const prevEnergy = ordered[ordered.length - 1].energyLevel ?? 5;
        const step = Math.abs((candidate.energyLevel ?? 5) - prevEnergy);
        if (step > 2) score += 0.5;
      }

      if (score < bestScore) {
        bestScore = score;
        bestIndex = j;
      }
    }

    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }

  return smoothMoodTransitions([...ordered, ...remaining]);
}

/**
 * 인접 곡 mood_tags 연속성 — 한 곡씩 감정이 이어지도록 스왑.
 */
export function smoothMoodTransitions(tracks: Track[]): Track[] {
  if (tracks.length < 3) return tracks;

  const result = [...tracks];
  const maxPasses = 2;

  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;

    for (let i = 1; i < result.length; i++) {
      const overlap = moodOverlap(result[i - 1], result[i]);
      if (overlap >= 1) continue;

      let bestJ = -1;
      let bestOverlap = overlap;

      for (let j = i + 1; j < Math.min(i + 4, result.length); j++) {
        const o = moodOverlap(result[i - 1], result[j]);
        if (o > bestOverlap) {
          bestOverlap = o;
          bestJ = j;
        }
      }

      if (bestJ > i) {
        const tmp = result[i];
        result[i] = result[bestJ];
        result[bestJ] = tmp;
        improved = true;
      }
    }

    if (!improved) break;
  }

  return result;
}
