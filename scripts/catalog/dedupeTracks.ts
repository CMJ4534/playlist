/**
 * 전체 seed 중복 분석 + enriched 파일 교차 중복 제거.
 *
 * 사용:
 *   npx tsx scripts/catalog/dedupeTracks.ts                           # seed 내부 중복만 분석
 *   npx tsx scripts/catalog/dedupeTracks.ts scripts/catalog/collected/enriched-sad-12345.json
 *
 * seed 내부 분석:
 *   - 동일 youtubeId
 *   - 동일 title+artist (다른 ID)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { ALL_SEED_TRACKS, getSeedStats } from '../../src/data/seeds';
import type { Track } from '../../src/types/track';

type SeedLikeEntry = {
  youtubeId: string;
  title: string;
  artist: string;
};

function normalizeKey(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}:::${artist.trim().toLowerCase()}`;
}

function analyzeSeedDuplicates() {
  console.log('\n=== Seed catalog duplicate analysis ===\n');

  const stats = getSeedStats();
  console.log(`Total seed tracks: ${stats.total}`);
  for (const cat of stats.byCategory) {
    console.log(`  ${cat.category}: ${cat.count} (familiar=${cat.familiar}, mid=${cat.mid}, hidden=${cat.hidden})`);
  }

  // youtubeId 중복
  const idCounts = new Map<string, Track[]>();
  for (const t of ALL_SEED_TRACKS) {
    const list = idCounts.get(t.youtubeId) ?? [];
    list.push(t);
    idCounts.set(t.youtubeId, list);
  }

  const idDupes = [...idCounts.entries()].filter(([, tracks]) => tracks.length > 1);
  if (idDupes.length) {
    console.log(`\n⚠ youtubeId 중복: ${idDupes.length}건`);
    for (const [id, tracks] of idDupes) {
      console.log(`  ${id}: ${tracks.map((t) => `${t.artist} - ${t.title}`).join(' / ')}`);
    }
  } else {
    console.log('\n✅ youtubeId 중복 없음');
  }

  // title+artist 중복 (다른 youtubeId)
  const titleArtistMap = new Map<string, Track[]>();
  for (const t of ALL_SEED_TRACKS) {
    const key = normalizeKey(t.title, t.artist);
    const list = titleArtistMap.get(key) ?? [];
    list.push(t);
    titleArtistMap.set(key, list);
  }

  const titleDupes = [...titleArtistMap.entries()]
    .filter(([, tracks]) => tracks.length > 1 && new Set(tracks.map((t) => t.youtubeId)).size > 1);

  if (titleDupes.length) {
    console.log(`\n⚠ 같은 곡 다른 ID: ${titleDupes.length}건`);
    for (const [, tracks] of titleDupes) {
      console.log(`  ${tracks[0].artist} - ${tracks[0].title}: ${tracks.map((t) => t.youtubeId).join(', ')}`);
    }
  } else {
    console.log('✅ title+artist 중복 없음');
  }

  // 아티스트 분포
  const artistCounts = new Map<string, number>();
  for (const t of ALL_SEED_TRACKS) {
    const key = t.artist.trim().toLowerCase();
    artistCounts.set(key, (artistCounts.get(key) ?? 0) + 1);
  }

  const topArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log('\n--- 상위 아티스트 분포 ---');
  for (const [artist, count] of topArtists) {
    const ratio = ((count / ALL_SEED_TRACKS.length) * 100).toFixed(1);
    console.log(`  ${artist}: ${count}곡 (${ratio}%)`);
  }

  return { idDupes, titleDupes, topArtists };
}

function dedupeEnrichedFile(filepath: string) {
  const raw = readFileSync(filepath, 'utf8');
  const { tracks } = JSON.parse(raw) as { tracks: SeedLikeEntry[] };

  const existingIds = new Set(ALL_SEED_TRACKS.map((t) => t.youtubeId));
  const existingKeys = new Set(ALL_SEED_TRACKS.map((t) => normalizeKey(t.title, t.artist)));

  console.log(`\n=== Dedupe enriched file: ${filepath} ===`);
  console.log(`Input: ${tracks.length} tracks`);

  const unique: SeedLikeEntry[] = [];
  const seenIds = new Set<string>();
  let removedDupId = 0;
  let removedDupTitle = 0;

  for (const t of tracks) {
    if (existingIds.has(t.youtubeId) || seenIds.has(t.youtubeId)) {
      removedDupId++;
      console.log(`  skip (dup ID): ${t.youtubeId} — ${t.artist} - ${t.title}`);
      continue;
    }

    const key = normalizeKey(t.title, t.artist);
    if (existingKeys.has(key)) {
      removedDupTitle++;
      console.log(`  skip (dup title): ${t.artist} - ${t.title}`);
      continue;
    }

    seenIds.add(t.youtubeId);
    existingKeys.add(key);
    unique.push(t);
  }

  console.log(`\nRemoved: ${removedDupId} dup ID, ${removedDupTitle} dup title`);
  console.log(`Remaining: ${unique.length}`);

  if (unique.length < tracks.length) {
    const outPath = join(dirname(filepath), `deduped-${basename(filepath)}`);
    writeFileSync(outPath, JSON.stringify({ tracks: unique }, null, 2), 'utf8');
    console.log(`✅ Deduped → ${outPath}`);
  }
}

async function main() {
  analyzeSeedDuplicates();

  const inputFile = process.argv[2];
  if (inputFile) {
    dedupeEnrichedFile(inputFile);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
