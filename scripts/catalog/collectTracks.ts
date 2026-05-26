/**
 * 곡 수집: YouTube URL/ID → 기본 메타데이터 자동 추출.
 *
 * 사용:
 *   npx tsx scripts/catalog/collectTracks.ts <category> <youtubeId|url> [<youtubeId|url> ...]
 *   npx tsx scripts/catalog/collectTracks.ts sad dQw4w9WgXcQ "https://youtu.be/abc123"
 *
 * 출력: scripts/catalog/collected/<category>-<timestamp>.json
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'collected');

type CollectedTrack = {
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  durationSec: number | null;
  channelTitle: string;
  publishedAt: string | null;
  source: 'youtube_search';
  collectedAt: string;
  category: string;
  /** oEmbed + API 기반 상태 */
  status: 'ok' | 'not_found' | 'api_error';
};

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') ?? null;
    }
  } catch {
    // not a URL
  }
  return null;
}

function parseDuration(iso: string): number | null {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return null;
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  return h * 3600 + m * 60 + s;
}

async function fetchViaOEmbed(youtubeId: string): Promise<{ title: string; artist: string } | null> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`
  )}&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return {
      title: data.title ?? 'Unknown',
      artist: data.author_name ?? 'Unknown',
    };
  } catch {
    return null;
  }
}

async function fetchViaDataApi(
  youtubeId: string,
  apiKey: string
): Promise<{
  title: string;
  artist: string;
  channelTitle: string;
  durationSec: number | null;
  publishedAt: string | null;
} | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', youtubeId);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: Array<{
        snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
        contentDetails?: { duration?: string };
      }>;
    };
    const item = data.items?.[0];
    if (!item) return null;

    const title = item.snippet?.title ?? 'Unknown';
    const channelTitle = item.snippet?.channelTitle ?? 'Unknown';
    const durationSec = item.contentDetails?.duration
      ? parseDuration(item.contentDetails.duration)
      : null;
    const publishedAt = item.snippet?.publishedAt ?? null;

    // 아티스트 추출: "Artist - Title" 패턴이면 분리, 아니면 채널명
    const dashIdx = title.indexOf(' - ');
    const artist = dashIdx > 0 ? title.slice(0, dashIdx).trim() : channelTitle;

    return { title, artist, channelTitle, durationSec, publishedAt };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/catalog/collectTracks.ts <category> <youtubeId|url> ...');
    process.exit(1);
  }

  const category = args[0];
  const inputs = args.slice(1);
  const apiKey =
    process.env.YOUTUBE_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY?.trim();

  console.log(`\n=== Collect tracks for: ${category} ===`);
  console.log(`Inputs: ${inputs.length}`);
  console.log(`YouTube API: ${apiKey ? 'enabled' : 'disabled (oEmbed only)'}\n`);

  const results: CollectedTrack[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const raw = inputs[i];
    const youtubeId = extractYoutubeId(raw);
    if (!youtubeId) {
      console.warn(`[${i + 1}] skip invalid input: ${raw}`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${inputs.length}] ${youtubeId}… `);

    let title = 'Unknown';
    let artist = 'Unknown';
    let channelTitle = '';
    let durationSec: number | null = null;
    let publishedAt: string | null = null;
    let status: CollectedTrack['status'] = 'ok';

    if (apiKey) {
      const apiResult = await fetchViaDataApi(youtubeId, apiKey);
      if (apiResult) {
        title = apiResult.title;
        artist = apiResult.artist;
        channelTitle = apiResult.channelTitle;
        durationSec = apiResult.durationSec;
        publishedAt = apiResult.publishedAt;
      } else {
        status = 'api_error';
      }
    } else {
      const oembedResult = await fetchViaOEmbed(youtubeId);
      if (oembedResult) {
        title = oembedResult.title;
        artist = oembedResult.artist;
      } else {
        status = 'not_found';
      }
    }

    console.log(`${status} — ${artist} - ${title}`);

    results.push({
      youtubeId,
      title,
      artist,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
      durationSec,
      channelTitle,
      publishedAt,
      source: 'youtube_search',
      collectedAt: new Date().toISOString(),
      category,
      status,
    });

    await sleep(200);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `${category}-${Date.now()}.json`;
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, JSON.stringify({ tracks: results }, null, 2), 'utf8');

  console.log(`\n✅ ${results.length} tracks collected → ${filepath}`);
  console.log(`  ok: ${results.filter((r) => r.status === 'ok').length}`);
  console.log(`  not_found: ${results.filter((r) => r.status === 'not_found').length}`);
  console.log(`  api_error: ${results.filter((r) => r.status === 'api_error').length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
