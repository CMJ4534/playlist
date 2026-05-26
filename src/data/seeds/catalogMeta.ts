import catalogMetaFile from './catalogMeta.json';
import { BLOCKED_STATUSES, type CatalogMetaEntry, type VerifiedStatus } from './types';

export type { CatalogMetaEntry as SeedCatalogMetaEntry };

type CatalogMetaFile = {
  byYoutubeId: Record<string, CatalogMetaEntry>;
};

const catalog = catalogMetaFile as CatalogMetaFile;

/** 전체 catalogMeta 접근 (분석·리포트용) */
export function getAllCatalogMeta(): Record<string, CatalogMetaEntry> {
  return catalog.byYoutubeId;
}

export function getSeedCatalogMeta(youtubeId: string): CatalogMetaEntry | undefined {
  return catalog.byYoutubeId[youtubeId?.trim()];
}

export function isSeedTrackDisabled(youtubeId: string): boolean {
  const meta = getSeedCatalogMeta(youtubeId);
  return meta?.disabled === true;
}

export function getActiveSeedDefs<T extends { youtubeId: string }>(defs: T[]): T[] {
  return defs.filter((d) => !isSeedTrackDisabled(d.youtubeId));
}

export function getDisabledSeedYoutubeIds(): string[] {
  return Object.entries(catalog.byYoutubeId)
    .filter(([, m]) => m.disabled === true)
    .map(([id]) => id);
}

// ─── Embed-safe 정책 유틸 ─────────────────────────

export type PlayabilityTier = 'verified' | 'pending' | 'unknown' | 'blocked';

/**
 * youtubeId의 재생 가능 여부를 catalogMeta 기반으로 판정.
 * - verified: playable + not disabled
 * - blocked: disabled 또는 embedding_restricted / invalid_id / not_found
 * - pending: verifiedStatus === 'pending'
 * - unknown: catalogMeta에 엔트리 없거나 status null
 */
export function getPlayabilityTier(youtubeId: string): PlayabilityTier {
  const meta = getSeedCatalogMeta(youtubeId);

  if (!meta) return 'unknown';
  if (meta.disabled === true) return 'blocked';

  const status = meta.verifiedStatus;
  if (!status) return 'unknown';

  if (BLOCKED_STATUSES.includes(status)) return 'blocked';
  if (status === 'playable') return 'verified';
  if (status === 'pending') return 'pending';

  return 'unknown';
}

/**
 * embed-safe 정책 기준 재생 가능 여부.
 * strict=true: verified만 허용
 * strict=false: verified + pending + unknown 허용 (blocked만 제외)
 */
export function isTrackPlayable(youtubeId: string, strict = true): boolean {
  const tier = getPlayabilityTier(youtubeId);
  if (strict) return tier === 'verified';
  return tier !== 'blocked';
}

/** 카탈로그 전체 통계 */
export function getCatalogPlayabilityStats(): {
  total: number;
  verified: number;
  pending: number;
  unknown: number;
  blocked: number;
} {
  const entries = Object.entries(catalog.byYoutubeId);
  let verified = 0;
  let pending = 0;
  let unknown = 0;
  let blocked = 0;

  for (const [id] of entries) {
    const tier = getPlayabilityTier(id);
    if (tier === 'verified') verified++;
    else if (tier === 'pending') pending++;
    else if (tier === 'blocked') blocked++;
    else unknown++;
  }

  return { total: entries.length, verified, pending, unknown, blocked };
}
