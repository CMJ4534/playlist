/**
 * 카탈로그 심층 분석 — seed 데이터 기반 감정별 imbalance + 아티스트 과다 + novelty 부족 감지.
 * seedQualityReport와 별개로, 순수 seed 구조에 대한 정적 분석.
 */
import {
  ALL_SEED_TRACKS,
  SEED_TRACKS_BY_CATEGORY,
  getSeedStats,
} from '@/data/seeds';
import type { SeedCategory } from '@/data/seeds/types';
import type { NoveltyTier, Track } from '@/types/track';

// ─── 타입 ─────────────────────────────────────────

export type CategoryBalance = {
  category: SeedCategory;
  trackCount: number;
  /** 전체 대비 비율 */
  ratio: number;
  /** 이상적 비율(균등) 대비 편차 (-: 부족, +: 과다) */
  deviationFromIdeal: number;
  noveltyBreakdown: Record<NoveltyTier, number>;
  noveltyRatios: Record<NoveltyTier, number>;
  uniqueArtists: number;
  artistDensity: number;
  topArtists: Array<{ artist: string; count: number }>;
  avgEnergyLevel: number;
  energyRange: { min: number; max: number };
};

export type ArtistOveruse = {
  artist: string;
  totalCount: number;
  categories: Array<{ category: string; count: number }>;
  overuseRatio: number;
};

export type CatalogAnalysisReport = {
  generatedAt: string;
  totalTracks: number;
  totalCategories: number;

  /** 감정별 균형 분석 */
  categoryBalance: CategoryBalance[];
  /** 전체 imbalance 지수 (0=완벽, 1=극심) */
  overallImbalanceScore: number;

  /** 아티스트 과다 노출 */
  artistOveruse: ArtistOveruse[];
  /** 전체 unique 아티스트 수 */
  totalUniqueArtists: number;
  /** top5 아티스트가 차지하는 비율 */
  top5ArtistConcentration: number;

  /** novelty 부족 카테고리 */
  lowNoveltyCategories: Array<{
    category: string;
    hiddenCount: number;
    hiddenRatio: number;
  }>;

  /** 에너지 분포 (1~10) */
  energyDistribution: Record<number, number>;

  /** 주요 경고 */
  warnings: string[];
  /** 개선 제안 */
  suggestions: string[];
};

// ─── 분석 ─────────────────────────────────────────

export function buildCatalogAnalysisReport(): CatalogAnalysisReport {
  const stats = getSeedStats();
  const categories = Object.keys(SEED_TRACKS_BY_CATEGORY) as SeedCategory[];
  const totalTracks = stats.total;
  const idealRatio = 1 / categories.length;

  // ── 감정별 균형 ──
  const categoryBalance: CategoryBalance[] = categories.map((cat) => {
    const tracks = SEED_TRACKS_BY_CATEGORY[cat];
    const n = tracks.length;
    const ratio = totalTracks > 0 ? n / totalTracks : 0;

    const noveltyBreakdown: Record<NoveltyTier, number> = {
      familiar: tracks.filter((t) => (t.noveltyTier ?? 'mid') === 'familiar').length,
      mid: tracks.filter((t) => (t.noveltyTier ?? 'mid') === 'mid').length,
      hidden: tracks.filter((t) => (t.noveltyTier ?? 'mid') === 'hidden').length,
    };

    const noveltyRatios: Record<NoveltyTier, number> = {
      familiar: n > 0 ? noveltyBreakdown.familiar / n : 0,
      mid: n > 0 ? noveltyBreakdown.mid / n : 0,
      hidden: n > 0 ? noveltyBreakdown.hidden / n : 0,
    };

    const artistMap = new Map<string, number>();
    let energySum = 0;
    let energyMin = 10;
    let energyMax = 1;
    for (const t of tracks) {
      const key = t.artist.trim().toLowerCase();
      artistMap.set(key, (artistMap.get(key) ?? 0) + 1);
      const e = t.energyLevel ?? 5;
      energySum += e;
      energyMin = Math.min(energyMin, e);
      energyMax = Math.max(energyMax, e);
    }

    const topArtists = [...artistMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => ({ artist, count }));

    return {
      category: cat,
      trackCount: n,
      ratio: round3(ratio),
      deviationFromIdeal: round3(ratio - idealRatio),
      noveltyBreakdown,
      noveltyRatios: {
        familiar: round3(noveltyRatios.familiar),
        mid: round3(noveltyRatios.mid),
        hidden: round3(noveltyRatios.hidden),
      },
      uniqueArtists: artistMap.size,
      artistDensity: n > 0 ? round3(artistMap.size / n) : 0,
      topArtists,
      avgEnergyLevel: n > 0 ? round3(energySum / n) : 0,
      energyRange: { min: n > 0 ? energyMin : 0, max: n > 0 ? energyMax : 0 },
    };
  });

  // ── imbalance score ──
  const deviations = categoryBalance.map((c) => Math.abs(c.deviationFromIdeal));
  const overallImbalanceScore = round3(
    deviations.reduce((s, d) => s + d, 0) / categories.length / idealRatio
  );

  // ── 아티스트 과다 ──
  const globalArtistMap = new Map<string, { total: number; cats: Map<string, number> }>();
  for (const cat of categories) {
    for (const t of SEED_TRACKS_BY_CATEGORY[cat]) {
      const key = t.artist.trim().toLowerCase();
      const entry = globalArtistMap.get(key) ?? { total: 0, cats: new Map() };
      entry.total++;
      entry.cats.set(cat, (entry.cats.get(cat) ?? 0) + 1);
      globalArtistMap.set(key, entry);
    }
  }

  const artistOveruse: ArtistOveruse[] = [...globalArtistMap.entries()]
    .filter(([, e]) => e.total >= 3)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([artist, e]) => ({
      artist,
      totalCount: e.total,
      categories: [...e.cats.entries()].map(([c, n]) => ({ category: c, count: n })),
      overuseRatio: round3(e.total / totalTracks),
    }));

  const totalUniqueArtists = globalArtistMap.size;
  const sortedArtists = [...globalArtistMap.entries()].sort((a, b) => b[1].total - a[1].total);
  const top5Count = sortedArtists.slice(0, 5).reduce((s, [, e]) => s + e.total, 0);
  const top5ArtistConcentration = totalTracks > 0 ? round3(top5Count / totalTracks) : 0;

  // ── novelty 부족 ──
  const lowNoveltyCategories = categoryBalance
    .filter((c) => c.noveltyRatios.hidden < 0.1 && c.trackCount >= 5)
    .map((c) => ({
      category: c.category,
      hiddenCount: c.noveltyBreakdown.hidden,
      hiddenRatio: c.noveltyRatios.hidden,
    }));

  // ── 에너지 분포 ──
  const energyDistribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) energyDistribution[i] = 0;
  for (const t of ALL_SEED_TRACKS) {
    const e = t.energyLevel ?? 5;
    energyDistribution[e] = (energyDistribution[e] ?? 0) + 1;
  }

  // ── 경고·제안 ──
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (overallImbalanceScore > 0.3) {
    warnings.push(`감정 간 곡 수 불균형 심함 (score: ${overallImbalanceScore})`);
  }

  for (const c of categoryBalance) {
    if (c.trackCount < 12) {
      warnings.push(`${c.category}: ${c.trackCount}곡 — 추천 다양성 부족 (최소 12곡 권장)`);
    }
    if (c.trackCount < 20) {
      suggestions.push(`${c.category}: ${c.trackCount}곡 → 20곡 이상으로 확장 권장`);
    }
  }

  if (top5ArtistConcentration > 0.3) {
    warnings.push(`상위 5 아티스트가 전체의 ${(top5ArtistConcentration * 100).toFixed(0)}% — 다양성 부족`);
  }

  for (const ao of artistOveruse) {
    if (ao.totalCount >= 5) {
      suggestions.push(`${ao.artist}: ${ao.totalCount}곡 — 카테고리 분산 또는 축소 검토`);
    }
  }

  for (const lnc of lowNoveltyCategories) {
    suggestions.push(`${lnc.category}: hidden gem ${lnc.hiddenCount}곡 — 발견형 곡 추가 권장`);
  }

  if (totalTracks < 100) {
    warnings.push(`전체 ${totalTracks}곡 — 반복 체감 높음. 최소 150곡 권장`);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalTracks,
    totalCategories: categories.length,
    categoryBalance,
    overallImbalanceScore,
    artistOveruse,
    totalUniqueArtists,
    top5ArtistConcentration,
    lowNoveltyCategories,
    energyDistribution,
    warnings,
    suggestions,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
