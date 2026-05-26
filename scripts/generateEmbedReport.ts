/**
 * Seed 전체 곡의 embed 리스크 분석 + 교체 후보 리포트
 *
 *   npx tsx scripts/generateEmbedReport.ts
 *
 * 리포트: scripts/reports/embed-restriction-report.json
 *         scripts/reports/embed-restriction-report.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SEED_TRACKS_BY_CATEGORY, ALL_SEED_TRACKS } from '../src/data/seeds';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, 'reports');
const PLAYBACK_REPORT_PATH = join(REPORT_DIR, 'track-playback-report.json');
const META_PATH = join(__dirname, '../src/data/seeds/catalogMeta.json');
const JSON_OUT = join(REPORT_DIR, 'embed-restriction-report.json');
const MD_OUT = join(REPORT_DIR, 'embed-restriction-report.md');

type PlaybackReportRow = {
  youtubeId: string;
  title: string;
  artist: string;
  status: string;
  severity?: string;
  detail?: string;
  seedId?: string;
  channelTitle?: string;
  category?: string;
};

type PlaybackReport = {
  generatedAt?: string;
  total?: number;
  summary?: Record<string, number>;
  needsFix?: PlaybackReportRow[];
  replacementSuggestions?: Array<{
    originalYoutubeId: string;
    artist: string;
    title: string;
    bestCandidate: { youtubeId: string; title: string; channelTitle: string } | null;
    candidates: Array<{
      youtubeId: string;
      title: string;
      channelTitle: string;
      isOfficialAudio: boolean;
      isTopicChannel: boolean;
    }>;
  }>;
};

const KNOWN_EMBED_RISK_LABELS: Record<string, string> = {
  'HYBE': 'high',
  'Big Hit': 'high',
  'SM Entertainment': 'high',
  'JYP Entertainment': 'high',
  'YG Entertainment': 'high',
  'Universal Music': 'medium',
  'Sony Music': 'medium',
  'Warner Music': 'medium',
};

const MAJOR_LABEL_ARTISTS = new Set([
  '방탄소년단', 'BTS', 'RM',
  'NewJeans',
  'aespa',
  'Stray Kids',
  'NCT 127', 'NCT DREAM',
  'SEVENTEEN',
  'ENHYPEN',
  '아이유',
  '태연', 'Taeyeon',
  '소녀시대',
  'MAMAMOO',
  'Adele',
  'Lady Gaga',
  'Kanye West',
  'Justin Bieber',
  'Coldplay',
  'Lana Del Rey',
  'Maroon 5',
]);

function estimateEmbedRisk(artist: string): 'high' | 'medium' | 'low' {
  if (MAJOR_LABEL_ARTISTS.has(artist)) return 'high';
  if (/대형 기획사|official/i.test(artist)) return 'medium';
  return 'low';
}

function main() {
  let playbackReport: PlaybackReport | null = null;
  if (existsSync(PLAYBACK_REPORT_PATH)) {
    try {
      playbackReport = JSON.parse(readFileSync(PLAYBACK_REPORT_PATH, 'utf8'));
    } catch {
      console.warn('⚠ track-playback-report.json 파싱 실패 — 예측 기반으로 진행');
    }
  }

  type MetaEntry = { verifiedStatus?: string; source?: string; disabled?: boolean };
  let catalogMeta: Record<string, MetaEntry> = {};
  if (existsSync(META_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(META_PATH, 'utf8')) as { byYoutubeId?: Record<string, MetaEntry> };
      catalogMeta = raw.byYoutubeId ?? {};
    } catch { /* ignore */ }
  }

  const needsFixMap = new Map<string, PlaybackReportRow>();
  if (playbackReport?.needsFix) {
    for (const row of playbackReport.needsFix) {
      needsFixMap.set(row.youtubeId, row);
    }
  }

  const replacementMap = new Map<string, PlaybackReport['replacementSuggestions']>();
  if (playbackReport?.replacementSuggestions) {
    for (const s of playbackReport.replacementSuggestions) {
      replacementMap.set(s.originalYoutubeId, [s] as never);
    }
  }

  type TrackAnalysis = {
    youtubeId: string;
    title: string;
    artist: string;
    category: string;
    seedId: string;
    youtubeUrl: string;
    verifiedStatus: string | null;
    verifiedSeverity: string | null;
    estimatedRisk: string;
    isEmbedRestricted: boolean;
    isTopicChannel: boolean;
    replacementCandidate: string | null;
    replacementTitle: string | null;
    replacementChannel: string | null;
  };

  const allAnalysis: TrackAnalysis[] = [];
  const restrictedList: TrackAnalysis[] = [];

  for (const [category, tracks] of Object.entries(SEED_TRACKS_BY_CATEGORY)) {
    for (const track of tracks) {
      const verified = needsFixMap.get(track.youtubeId);
      const meta = catalogMeta[track.youtubeId];
      const isTopicSafe = meta?.source === 'topic_channel' && meta?.verifiedStatus === 'playable';
      const risk = isTopicSafe ? 'low' : estimateEmbedRisk(track.artist);
      const isRestricted = verified?.status === 'embedding_restricted';

      let replCandidate: string | null = null;
      let replTitle: string | null = null;
      let replChannel: string | null = null;

      if (playbackReport?.replacementSuggestions) {
        const sugg = playbackReport.replacementSuggestions.find(
          (s) => s.originalYoutubeId === track.youtubeId
        );
        if (sugg?.bestCandidate) {
          replCandidate = sugg.bestCandidate.youtubeId;
          replTitle = sugg.bestCandidate.title;
          replChannel = sugg.bestCandidate.channelTitle;
        }
      }

      const analysis: TrackAnalysis = {
        youtubeId: track.youtubeId,
        title: track.title,
        artist: track.artist,
        category,
        seedId: track.id,
        youtubeUrl: `https://www.youtube.com/watch?v=${track.youtubeId}`,
        verifiedStatus: verified?.status ?? meta?.verifiedStatus ?? null,
        verifiedSeverity: verified?.severity ?? null,
        estimatedRisk: risk,
        isEmbedRestricted: isRestricted,
        isTopicChannel: isTopicSafe,
        replacementCandidate: replCandidate,
        replacementTitle: replTitle,
        replacementChannel: replChannel,
      };

      allAnalysis.push(analysis);
      if (isRestricted || (risk === 'high' && !verified && !isTopicSafe)) {
        restrictedList.push(analysis);
      }
    }
  }

  const priorityCategories = ['sad', 'dawn', 'rain'];
  const priorityRestricted = restrictedList.filter((a) =>
    priorityCategories.includes(a.category)
  );

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    totalTracks: allAnalysis.length,
    verifiedCount: allAnalysis.filter((a) => a.verifiedStatus).length,
    confirmedRestricted: allAnalysis.filter((a) => a.isEmbedRestricted).length,
    highRiskUnverified: allAnalysis.filter(
      (a) => a.estimatedRisk === 'high' && !a.verifiedStatus
    ).length,
    byCategory: Object.fromEntries(
      Object.entries(SEED_TRACKS_BY_CATEGORY).map(([cat, tracks]) => {
        const catAnalysis = allAnalysis.filter((a) => a.category === cat);
        return [
          cat,
          {
            total: tracks.length,
            restricted: catAnalysis.filter((a) => a.isEmbedRestricted).length,
            highRisk: catAnalysis.filter((a) => a.estimatedRisk === 'high').length,
            safe: catAnalysis.filter(
              (a) => a.verifiedStatus === null && a.estimatedRisk === 'low'
            ).length,
          },
        ];
      })
    ),
    restrictedTracks: restrictedList,
    priorityReplacements: priorityRestricted,
    allTracks: allAnalysis,
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify(jsonReport, null, 2), 'utf8');

  // ── Markdown 리포트 ──
  const lines: string[] = [
    '# Moodplay Embed Restriction Report',
    '',
    `Generated: ${jsonReport.generatedAt}`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total seed tracks | ${jsonReport.totalTracks} |`,
    `| Verified (API checked) | ${jsonReport.verifiedCount} |`,
    `| Confirmed embed restricted | ${jsonReport.confirmedRestricted} |`,
    `| High-risk (unverified) | ${jsonReport.highRiskUnverified} |`,
    '',
    '## By Category',
    '',
    '| Category | Total | Restricted | High Risk | Safe |',
    '|----------|-------|------------|-----------|------|',
  ];

  for (const [cat, stats] of Object.entries(jsonReport.byCategory) as [
    string,
    { total: number; restricted: number; highRisk: number; safe: number },
  ][]) {
    const priority = priorityCategories.includes(cat) ? ' ⭐' : '';
    lines.push(
      `| ${cat}${priority} | ${stats.total} | ${stats.restricted} | ${stats.highRisk} | ${stats.safe} |`
    );
  }

  if (restrictedList.length) {
    lines.push('', '## Confirmed Embed Restricted Tracks', '');
    lines.push(
      '| Category | Artist | Title | YouTube ID | Replacement |',
      '|----------|--------|-------|------------|-------------|'
    );
    for (const t of restrictedList.filter((a) => a.isEmbedRestricted)) {
      const repl = t.replacementCandidate
        ? `[${t.replacementTitle ?? t.replacementCandidate}](https://www.youtube.com/watch?v=${t.replacementCandidate})`
        : '—';
      lines.push(
        `| ${t.category} | ${t.artist} | ${t.title} | [${t.youtubeId}](${t.youtubeUrl}) | ${repl} |`
      );
    }
  }

  if (priorityRestricted.length) {
    lines.push('', '## Priority Replacements (sad / dawn / rain)', '');
    for (const t of priorityRestricted) {
      lines.push(`### ${t.artist} - ${t.title} (${t.category})`);
      lines.push(`- Current: [${t.youtubeId}](${t.youtubeUrl})`);
      if (t.replacementCandidate) {
        lines.push(
          `- Suggested: [${t.replacementCandidate}](https://www.youtube.com/watch?v=${t.replacementCandidate}) "${t.replacementTitle}" [${t.replacementChannel}]`
        );
      } else {
        lines.push('- Suggested: 수동 검색 필요');
      }
      lines.push('');
    }
  }

  lines.push(
    '',
    '## Embed-Safe Replacement Guidelines',
    '',
    '### 우선 추천 소스',
    '1. **YouTube Music - Topic 채널** (artist 이름 + " - Topic")',
    '   - 대부분 embed 허용',
    '   - 예: "Adele - Topic", "아이유 - Topic"',
    '2. **Official Audio / Lyric Video**',
    '   - MV보다 embed 허용 비율 높음',
    '3. **아티스트 공식 채널의 audio-only 업로드**',
    '',
    '### 검증 방법',
    '```bash',
    '# 전체 embed 검증 + auto-disable + 대체 후보 검색',
    'YOUTUBE_API_KEY=YOUR_KEY npm run verify:embed',
    '',
    '# embed 리포트 생성',
    'npm run verify:embed:report',
    '```',
    '',
    '### 교체 프로세스',
    '1. `npm run verify:embed` → 제한 곡 자동 탐지 + 대체 후보',
    '2. `scripts/reports/track-playback-report.json` 확인',
    '3. `src/data/seeds/replacements.json` 수동 리뷰',
    '4. `npm run seed:apply-replacements` 적용',
    ''
  );

  writeFileSync(MD_OUT, lines.join('\n'), 'utf8');

  // ── 콘솔 요약 ──
  console.log('\n=== Embed Restriction Report ===\n');
  console.log(`Total: ${jsonReport.totalTracks} tracks`);
  console.log(`Verified: ${jsonReport.verifiedCount}`);
  console.log(`Confirmed restricted: ${jsonReport.confirmedRestricted}`);
  console.log(`High-risk (unverified): ${jsonReport.highRiskUnverified}`);
  console.log('\nBy category:');
  for (const [cat, stats] of Object.entries(jsonReport.byCategory) as [
    string,
    { total: number; restricted: number; highRisk: number; safe: number },
  ][]) {
    const priority = priorityCategories.includes(cat) ? ' ⭐ priority' : '';
    console.log(
      `  ${cat}: ${stats.total} total, ${stats.restricted} restricted, ${stats.highRisk} high-risk${priority}`
    );
  }

  if (restrictedList.length) {
    console.log(`\n🔴 Restricted/high-risk tracks (${restrictedList.length}):`);
    for (const t of restrictedList) {
      const status = t.isEmbedRestricted ? '🔴 RESTRICTED' : '🟡 HIGH RISK';
      console.log(`  ${status} [${t.category}] ${t.artist} - ${t.title} (${t.youtubeId})`);
    }
  }

  console.log(`\nJSON: ${JSON_OUT}`);
  console.log(`MD:   ${MD_OUT}`);
}

main();
