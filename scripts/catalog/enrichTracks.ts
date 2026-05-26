/**
 * 곡 보강: 수집된 트랙에 moodTags 추천 + energyLevel 추정 + noveltyTier 분류.
 *
 * 사용:
 *   npx tsx scripts/catalog/enrichTracks.ts scripts/catalog/collected/validated-sad-12345.json
 *
 * 출력: SeedTrackDef[] 형태의 JSON (seed 파일에 복사 가능)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

type CollectedTrack = {
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSec: number | null;
  channelTitle: string;
  publishedAt: string | null;
  category: string;
};

type EnrichedTrack = {
  title: string;
  artist: string;
  youtubeId: string;
  energyLevel: number;
  noveltyTier: 'familiar' | 'mid' | 'hidden';
  moodTags: string[];
  durationSec?: number;
  source: 'youtube_search';
  language: string;
  freshness: number;
};

const CATEGORY_TAGS: Record<string, string[]> = {
  sad: ['우울', '감성', '잔잔한'],
  dawn: ['새벽', '몽환적', '감성'],
  focus: ['집중', '몰입'],
  rain: ['비', '잔잔한', '감성'],
  walking: ['산책', '감성', '잔잔한'],
  blank: ['멍', '잔잔한', '배경'],
};

const ENERGY_BY_CATEGORY: Record<string, { min: number; max: number; default: number }> = {
  sad: { min: 2, max: 5, default: 3 },
  dawn: { min: 2, max: 5, default: 3 },
  focus: { min: 5, max: 8, default: 6 },
  rain: { min: 2, max: 5, default: 3 },
  walking: { min: 3, max: 6, default: 4 },
  blank: { min: 1, max: 4, default: 2 },
};

const WELL_KNOWN_ARTISTS = new Set([
  '아이유', '방탄소년단', 'bts', '악뮤', '태연', '헤이즈', '볼빨간사춘기',
  'newjeans', 'aespa', 'stray kids', 'seventeen', 'nct 127', 'mamamoo',
  'adele', 'ed sheeran', 'coldplay', 'taylor swift', 'billie eilish',
  'kanye west', 'drake', 'the weeknd', 'ariana grande', 'dua lipa',
  'post malone', 'justin bieber', 'bruno mars', 'sam smith',
]);

function estimateNoveltyTier(artist: string, publishedAt: string | null): 'familiar' | 'mid' | 'hidden' {
  const key = artist.trim().toLowerCase();
  if (WELL_KNOWN_ARTISTS.has(key)) return 'familiar';

  if (publishedAt) {
    const year = new Date(publishedAt).getFullYear();
    const current = new Date().getFullYear();
    if (current - year <= 2) return 'mid';
  }

  return 'hidden';
}

function estimateFreshness(publishedAt: string | null): number {
  if (!publishedAt) return 0.5;
  const ageYears = (Date.now() - new Date(publishedAt).getTime()) / (365.25 * 86400000);
  if (ageYears <= 1) return 1.0;
  if (ageYears <= 2) return 0.8;
  if (ageYears <= 5) return 0.5;
  return 0.2;
}

function detectLanguage(title: string, artist: string): string {
  const text = `${title} ${artist}`;
  const hasKorean = /[\uac00-\ud7af]/.test(text);
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  if (hasKorean) return 'ko';
  if (hasJapanese) return 'ja';
  return 'en';
}

function suggestMoodTags(title: string, category: string): string[] {
  const baseTags = CATEGORY_TAGS[category] ?? [];
  const extra: string[] = [];
  const lower = title.toLowerCase();

  if (lower.includes('love') || lower.includes('사랑')) extra.push('사랑');
  if (lower.includes('rain') || lower.includes('비')) extra.push('비');
  if (lower.includes('night') || lower.includes('밤')) extra.push('밤');
  if (lower.includes('dream') || lower.includes('꿈')) extra.push('몽환적');
  if (lower.includes('alone') || lower.includes('혼자')) extra.push('고독');
  if (lower.includes('sunset') || lower.includes('노을')) extra.push('노을');
  if (lower.includes('piano') || lower.includes('acoustic')) extra.push('인스트');

  return [...new Set([...baseTags, ...extra])];
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/catalog/enrichTracks.ts <validated-file.json>');
    process.exit(1);
  }

  const raw = readFileSync(inputPath, 'utf8');
  const { tracks } = JSON.parse(raw) as { tracks: CollectedTrack[] };

  console.log(`\n=== Enrich ${tracks.length} tracks ===\n`);

  const enriched: EnrichedTrack[] = tracks.map((t) => {
    const category = t.category || 'blank';
    const energy = ENERGY_BY_CATEGORY[category] ?? ENERGY_BY_CATEGORY.blank;
    const noveltyTier = estimateNoveltyTier(t.artist, t.publishedAt);
    const moodTags = suggestMoodTags(t.title, category);
    const freshness = estimateFreshness(t.publishedAt);
    const language = detectLanguage(t.title, t.artist);

    const result: EnrichedTrack = {
      title: t.title,
      artist: t.artist,
      youtubeId: t.youtubeId,
      energyLevel: energy.default,
      noveltyTier,
      moodTags,
      source: 'youtube_search',
      language,
      freshness,
    };

    if (t.durationSec) result.durationSec = t.durationSec;

    console.log(`  ${noveltyTier.padEnd(9)} ${t.artist} - ${t.title} [${moodTags.join(', ')}]`);
    return result;
  });

  const outPath = join(
    dirname(inputPath),
    `enriched-${basename(inputPath)}`
  );
  writeFileSync(outPath, JSON.stringify({ tracks: enriched }, null, 2), 'utf8');

  console.log(`\n✅ Enriched tracks → ${outPath}`);
  console.log('다음: enriched 파일을 리뷰 후 해당 seed 파일(예: sad.ts)에 추가하세요.');
  console.log('팁: energyLevel, noveltyTier, moodTags는 자동 추정값이므로 수동 조정을 권장합니다.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
