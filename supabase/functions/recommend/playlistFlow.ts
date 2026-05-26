import type { RecommendTrackDto } from './types.ts';

export type EnergyArcProfile = 'calm-settle' | 'gentle-lift' | 'wave' | 'steady';

const ENERGY_CURVES: Record<EnergyArcProfile, number[]> = {
  'calm-settle': [3, 3, 4, 4, 3, 3, 4, 3, 3, 2, 2, 2],
  'gentle-lift': [3, 3, 4, 4, 5, 6, 5, 5, 4, 4, 3, 3],
  wave: [2, 3, 4, 5, 6, 5, 4, 5, 4, 3, 3, 2],
  steady: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5],
};

export function orderTracksByEnergyArc(
  tracks: RecommendTrackDto[],
  profile: EnergyArcProfile
): RecommendTrackDto[] {
  if (tracks.length <= 2) return tracks;

  const curve = ENERGY_CURVES[profile].slice(0, tracks.length);
  const remaining = [...tracks];
  const ordered: RecommendTrackDto[] = [];

  for (const target of curve) {
    if (!remaining.length) break;

    let bestIndex = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const energy = remaining[i].energyLevel ?? 5;
      const score = Math.abs(energy - target);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }

  return [...ordered, ...remaining];
}
