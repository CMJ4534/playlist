/**
 * 수집된 곡 검증: schema + playback 가능성 + 중복 확인.
 *
 * 사용:
 *   npx tsx scripts/catalog/validateTracks.ts scripts/catalog/collected/sad-12345.json
 *
 * 출력: 검증 결과를 콘솔에 표시하고, 통과 항목만 별도 JSON으로 저장.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { ALL_SEED_TRACKS } from '../../src/data/seeds';
import {
  checkOEmbed,
  checkEmbeddableViaApi,
} from '../lib/youtubePlaybackVerify';

type CollectedTrack = {
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSec: number | null;
  channelTitle: string;
  publishedAt: string | null;
  source: string;
  collectedAt: string;
  category: string;
  status: string;
};

type ValidationResult = CollectedTrack & {
  validationStatus: 'pass' | 'fail';
  validationErrors: string[];
};

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/catalog/validateTracks.ts <collected-file.json>');
    process.exit(1);
  }

  const raw = readFileSync(inputPath, 'utf8');
  const { tracks } = JSON.parse(raw) as { tracks: CollectedTrack[] };

  const existingIds = new Set(ALL_SEED_TRACKS.map((t) => t.youtubeId));
  const apiKey =
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY?.trim();

  console.log(`\n=== Validate ${tracks.length} tracks ===`);
  console.log(`Existing seed tracks: ${existingIds.size}`);
  console.log(`YouTube API: ${apiKey ? 'enabled' : 'disabled'}\n`);

  const results: ValidationResult[] = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const errors: string[] = [];

    // schema checks
    if (!YOUTUBE_ID_RE.test(track.youtubeId)) {
      errors.push('invalid youtubeId format');
    }
    if (!track.title || track.title === 'Unknown') {
      errors.push('missing title');
    }
    if (!track.artist || track.artist === 'Unknown') {
      errors.push('missing artist');
    }

    // duplicate check
    if (existingIds.has(track.youtubeId)) {
      errors.push('duplicate: already in seed catalog');
    }

    // playback check (if no schema errors)
    if (!errors.length) {
      process.stdout.write(`[${i + 1}/${tracks.length}] ${track.title}… `);

      const oembed = await checkOEmbed(track.youtubeId);
      if (oembed === 'not_found') {
        errors.push('playback: oEmbed not found');
      } else if (oembed === 'network_error') {
        errors.push('playback: network error');
      }

      if (!errors.length && apiKey) {
        const embed = await checkEmbeddableViaApi(track.youtubeId, apiKey);
        if (embed === 'embedding_restricted') {
          errors.push('playback: embedding restricted');
        } else if (embed === 'not_found') {
          errors.push('playback: API not found');
        }
      }

      console.log(errors.length ? `FAIL (${errors.join(', ')})` : 'PASS');
      await sleep(150);
    } else {
      console.log(`[${i + 1}/${tracks.length}] ${track.youtubeId} — SKIP (${errors.join(', ')})`);
    }

    results.push({
      ...track,
      validationStatus: errors.length ? 'fail' : 'pass',
      validationErrors: errors,
    });
  }

  const passed = results.filter((r) => r.validationStatus === 'pass');
  const failed = results.filter((r) => r.validationStatus === 'fail');

  console.log('\n--- Summary ---');
  console.log(`  Total: ${results.length}`);
  console.log(`  Pass:  ${passed.length}`);
  console.log(`  Fail:  ${failed.length}`);

  if (failed.length) {
    console.log('\nFailed:');
    for (const f of failed) {
      console.log(`  • ${f.youtubeId} — ${f.validationErrors.join(', ')}`);
    }
  }

  if (passed.length) {
    const outPath = join(
      dirname(inputPath),
      `validated-${basename(inputPath)}`
    );
    writeFileSync(outPath, JSON.stringify({ tracks: passed }, null, 2), 'utf8');
    console.log(`\n✅ Validated tracks → ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
