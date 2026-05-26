/**
 * Seed / catalog 검증 (스키마·중복)
 *   npm run verify:tracks
 *
 * 재생 가능성 (oEmbed / YouTube API):
 *   npm run verify:tracks:playback
 */
import { ALL_SEED_TRACKS, getSeedStats } from '../src/data/seeds';
import { getYoutubeThumbnailUrl } from '../src/lib/youtubeThumbnail';
import type { Track } from '../src/types/track';

type Issue = { track: Track; reasons: string[] };

const warnings: string[] = [];
const invalid: Issue[] = [];

function verify(track: Track): string[] {
  const reasons: string[] = [];

  if (!track.youtubeId?.trim()) reasons.push('missing_youtube_id');
  if (!track.title?.trim()) reasons.push('missing_title');
  if (!track.artist?.trim()) reasons.push('missing_artist');
  if (!track.thumbnailUrl?.trim()) reasons.push('missing_thumbnail');
  if (!track.moodTags?.length) reasons.push('empty_mood_tags');
  if (
    track.durationSec != null &&
    (track.durationSec <= 0 || track.durationSec > 3600)
  ) {
    reasons.push('invalid_duration');
  }
  if (
    track.energyLevel != null &&
    (track.energyLevel < 1 || track.energyLevel > 10)
  ) {
    reasons.push('invalid_energy_level');
  }
  if (
    track.noveltyTier &&
    !['familiar', 'mid', 'hidden'].includes(track.noveltyTier)
  ) {
    reasons.push('invalid_novelty_tier');
  }

  const expectedThumb = getYoutubeThumbnailUrl(track.youtubeId, 'hq');
  if (
    track.thumbnailUrl &&
    !track.thumbnailUrl.includes(track.youtubeId) &&
    track.thumbnailUrl !== expectedThumb
  ) {
    warnings.push(
      `custom thumbnail: ${track.title} (${track.youtubeId}) → ${track.thumbnailUrl}`
    );
  }

  return reasons;
}

const youtubeIds = new Map<string, Track[]>();
const artistTitle = new Map<string, Track[]>();

for (const track of ALL_SEED_TRACKS) {
  const yid = track.youtubeId?.trim();
  if (yid) {
    const list = youtubeIds.get(yid) ?? [];
    list.push(track);
    youtubeIds.set(yid, list);
  }

  const atKey = `${track.artist.trim().toLowerCase()}::${track.title.trim().toLowerCase()}`;
  const atList = artistTitle.get(atKey) ?? [];
  atList.push(track);
  artistTitle.set(atKey, atList);

  const reasons = verify(track);
  if (reasons.length) {
    invalid.push({ track, reasons });
  }
}

for (const [yid, list] of youtubeIds) {
  if (list.length > 1) {
    warnings.push(
      `duplicate youtube_id: ${yid} → ${list.map((t) => `${t.title} (${t.artist})`).join(', ')}`
    );
  }
}

for (const [key, list] of artistTitle) {
  if (list.length > 1) {
    warnings.push(`duplicate artist+title: ${key}`);
  }
}

const stats = getSeedStats();

console.log('\n=== Seed verification summary ===');
console.log(JSON.stringify(stats, null, 2));
console.log(`\nTotal tracks: ${ALL_SEED_TRACKS.length}`);
console.log(`Invalid rows: ${invalid.length}`);
console.log(`Warnings: ${warnings.length}`);

if (invalid.length) {
  console.log('\n--- Invalid ---');
  for (const { track, reasons } of invalid) {
    console.log(`• [${reasons.join(', ')}] ${track.artist} - ${track.title} (${track.youtubeId})`);
  }
}

if (warnings.length) {
  console.log('\n--- Warnings ---');
  for (const w of warnings) {
    console.log(`• ${w}`);
  }
}

if (!invalid.length && !warnings.length) {
  console.log('\nAll checks passed.');
}

process.exit(invalid.length ? 1 : 0);
