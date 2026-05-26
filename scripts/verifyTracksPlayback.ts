/**
 * Seed 곡 YouTube 재생 가능성 검증 + embed 제한 자동 처리
 *
 *   npx tsx scripts/verifyTracksPlayback.ts
 *   YOUTUBE_API_KEY=... npx tsx scripts/verifyTracksPlayback.ts
 *   YOUTUBE_API_KEY=... npx tsx scripts/verifyTracksPlayback.ts --auto-disable --suggest-replacements
 *
 * 옵션:
 *   --auto-disable         embedding_restricted 곡을 catalogMeta에 자동 disabled
 *   --suggest-replacements embed 제한 곡에 대해 embed-safe 대체 후보 검색
 *
 * 리포트: scripts/reports/track-playback-report.json
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_SEED_TRACKS } from '../src/data/seeds';
import {
  verifyTrackPlayback,
  searchEmbedSafeCandidates,
  type EmbedSafeCandidate,
  type PlaybackVerifyResult,
  type PlaybackVerifyStatus,
} from './lib/youtubePlaybackVerify';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, 'reports');
const REPORT_PATH = join(REPORT_DIR, 'track-playback-report.json');
const META_PATH = join(__dirname, '../src/data/seeds/catalogMeta.json');
const REPLACEMENTS_PATH = join(__dirname, '../src/data/seeds/replacements.json');

const apiKey =
  process.env.YOUTUBE_API_KEY?.trim() ||
  process.env.EXPO_PUBLIC_YOUTUBE_API_KEY?.trim();

const autoDisable = process.argv.includes('--auto-disable');
const suggestReplacements = process.argv.includes('--suggest-replacements');

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type ReplacementSuggestion = {
  originalYoutubeId: string;
  artist: string;
  title: string;
  seedId: string;
  candidates: EmbedSafeCandidate[];
  bestCandidate: EmbedSafeCandidate | null;
};

async function main() {
  console.log('\n=== Moodplay track playback verification ===\n');
  console.log(`Tracks: ${ALL_SEED_TRACKS.length}`);
  console.log(
    apiKey
      ? 'YouTube Data API: enabled (embedding check)'
      : 'YouTube Data API: disabled (oEmbed only — set YOUTUBE_API_KEY for embed check)'
  );
  if (autoDisable) console.log('--auto-disable: embedding_restricted → catalogMeta disabled');
  if (suggestReplacements) console.log('--suggest-replacements: will search embed-safe candidates');
  console.log('');

  const results: PlaybackVerifyResult[] = [];

  for (let i = 0; i < ALL_SEED_TRACKS.length; i++) {
    const track = ALL_SEED_TRACKS[i];
    process.stdout.write(`[${i + 1}/${ALL_SEED_TRACKS.length}] ${track.title}… `);
    const result = await verifyTrackPlayback(track, {
      youtubeApiKey: apiKey,
      delayMs: 150,
    });
    results.push(result);
    const icon = result.severity === 'critical' ? '❌' : result.severity === 'warning' ? '⚠️' : '✅';
    console.log(`${icon} ${result.status}${result.channelTitle ? ` [${result.channelTitle}]` : ''}`);
  }

  const byStatus = (status: PlaybackVerifyStatus) =>
    results.filter((r) => r.status === status);

  const needsFix = results.filter((r) => r.status !== 'playable');
  const embedRestricted = byStatus('embedding_restricted');

  // ── replacement 후보 검색 ──
  const replacementSuggestions: ReplacementSuggestion[] = [];
  if (suggestReplacements && apiKey && embedRestricted.length) {
    console.log(`\n--- Searching embed-safe replacements for ${embedRestricted.length} tracks ---\n`);
    for (const r of embedRestricted) {
      process.stdout.write(`  🔍 ${r.track.artist} - ${r.track.title}… `);
      const candidates = await searchEmbedSafeCandidates(
        r.track.artist,
        r.track.title,
        apiKey,
        5
      );
      const best = candidates[0] ?? null;
      replacementSuggestions.push({
        originalYoutubeId: r.youtubeId,
        artist: r.track.artist,
        title: r.track.title,
        seedId: r.track.id,
        candidates,
        bestCandidate: best,
      });
      if (best) {
        console.log(`→ ${best.youtubeId} "${best.title}" [${best.channelTitle}]${best.isOfficialAudio ? ' ★official' : ''}${best.isTopicChannel ? ' ★topic' : ''}`);
      } else {
        console.log('→ (후보 없음)');
      }
      await sleep(300);
    }
  }

  // ── 카테고리별 분류 ──
  const bySeedCategory = new Map<string, PlaybackVerifyResult[]>();
  for (const r of needsFix) {
    const cat = r.track.id.replace(/^seed-/, '').replace(/-.*$/, '');
    const list = bySeedCategory.get(cat) ?? [];
    list.push(r);
    bySeedCategory.set(cat, list);
  }

  // ── 리포트 ──
  const report = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    summary: {
      playable: byStatus('playable').length,
      invalid_id: byStatus('invalid_id').length,
      not_found: byStatus('not_found').length,
      embedding_restricted: embedRestricted.length,
      blocked: byStatus('blocked').length,
      network_error: byStatus('network_error').length,
      api_error: byStatus('api_error').length,
    },
    needsFix: needsFix.map((r) => ({
      youtubeId: r.youtubeId,
      title: r.track.title,
      artist: r.track.artist,
      status: r.status,
      severity: r.severity,
      detail: r.detail,
      seedId: r.track.id,
      channelTitle: r.channelTitle,
      category: r.track.id.replace(/^seed-/, '').replace(/-.*$/, ''),
      youtubeUrl: `https://www.youtube.com/watch?v=${r.youtubeId}`,
    })),
    replacementSuggestions: replacementSuggestions.map((s) => ({
      ...s,
      candidates: s.candidates.map((c) => ({
        youtubeId: c.youtubeId,
        title: c.title,
        channelTitle: c.channelTitle,
        isOfficialAudio: c.isOfficialAudio,
        isTopicChannel: c.isTopicChannel,
        youtubeUrl: `https://www.youtube.com/watch?v=${c.youtubeId}`,
      })),
    })),
    byCategory: Object.fromEntries(
      [...bySeedCategory.entries()].map(([cat, items]) => [
        cat,
        {
          total: items.length,
          critical: items.filter((i) => i.severity === 'critical').length,
          items: items.map((i) => ({
            youtubeId: i.youtubeId,
            title: i.track.title,
            artist: i.track.artist,
            status: i.status,
            severity: i.severity,
          })),
        },
      ])
    ),
    results,
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  // ── 콘솔 요약 ──
  console.log('\n--- Summary ---');
  console.log(JSON.stringify(report.summary, null, 2));

  if (needsFix.length) {
    console.log('\n--- Needs fix (by category) ---');
    for (const [cat, items] of bySeedCategory) {
      console.log(`\n  [${cat}] ${items.length} issues:`);
      for (const r of items) {
        const icon = r.severity === 'critical' ? '🔴' : '🟡';
        console.log(`    ${icon} [${r.status}] ${r.track.artist} - ${r.track.title} (${r.youtubeId})`);
      }
    }
  }

  // ── auto-disable ──
  if (autoDisable && embedRestricted.length) {
    console.log('\n--- Auto-disabling embedding_restricted tracks ---');
    const meta = JSON.parse(readFileSync(META_PATH, 'utf8')) as {
      byYoutubeId: Record<string, Record<string, unknown>>;
    };
    const now = new Date().toISOString();
    for (const r of embedRestricted) {
      meta.byYoutubeId[r.youtubeId] = {
        ...meta.byYoutubeId[r.youtubeId],
        disabled: true,
        disabledReason: 'embedding_restricted',
        verifiedAt: now,
        verifiedStatus: 'embedding_restricted',
      };
      console.log(`  disabled: ${r.youtubeId} (${r.track.artist} - ${r.track.title})`);
    }
    writeFileSync(
      META_PATH,
      JSON.stringify(
        { $comment: '운영 메타 — disabled/verifiedAt. verify:tracks:playback 후 npm run seed:sync-meta', byYoutubeId: meta.byYoutubeId },
        null,
        2
      ) + '\n',
      'utf8'
    );
    console.log(`\n  ✅ catalogMeta.json updated (${embedRestricted.length} tracks disabled)`);
  }

  // ── replacement suggestions → replacements.json 추가 ──
  if (suggestReplacements && replacementSuggestions.some((s) => s.bestCandidate)) {
    console.log('\n--- Suggested replacements ---');
    const replacementsFile = JSON.parse(readFileSync(REPLACEMENTS_PATH, 'utf8')) as {
      replacements: Record<string, unknown>;
    };
    let added = 0;
    for (const s of replacementSuggestions) {
      if (!s.bestCandidate) continue;
      if (replacementsFile.replacements[s.originalYoutubeId]) continue;
      console.log(`  ${s.artist} - ${s.title}:`);
      console.log(`    ${s.originalYoutubeId} → ${s.bestCandidate.youtubeId} "${s.bestCandidate.title}" [${s.bestCandidate.channelTitle}]`);
      replacementsFile.replacements[s.originalYoutubeId] = {
        reason: 'embedding_restricted — auto-suggested',
        replacement: {
          youtubeId: s.bestCandidate.youtubeId,
        },
      };
      added++;
    }
    if (added) {
      writeFileSync(REPLACEMENTS_PATH, JSON.stringify(replacementsFile, null, 2) + '\n', 'utf8');
      console.log(`\n  ✅ replacements.json updated (${added} suggestions added)`);
      console.log('  ⚠️  리뷰 후 npm run seed:apply-replacements 실행');
    }
  }

  console.log(`\nFull report: ${REPORT_PATH}`);
  process.exit(needsFix.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
