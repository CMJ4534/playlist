/**
 * Supabase tracks seed upsert
 *
 * Usage:
 *   npx tsx scripts/seedTracks.ts
 *
 * Requires .env or env:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (권장) 또는 EXPO_PUBLIC_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { ALL_SEED_TRACKS, getSeedStats } from '../src/data/seeds';
import { trackInputToDbRow } from '../src/data/seeds/helpers';
import { normalizeTrack } from '../src/lib/trackUtils';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function main() {
  loadEnvFile();

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const stats = getSeedStats();
  console.log('Seed stats:', JSON.stringify(stats, null, 2));

  const byYoutube = new Map<string, ReturnType<typeof trackInputToDbRow>>();

  for (const raw of ALL_SEED_TRACKS) {
    const track = normalizeTrack(raw);
    if (!track.youtubeId?.trim()) {
      console.warn('skip: missing youtubeId', track.title);
      continue;
    }
    if (byYoutube.has(track.youtubeId)) {
      console.warn('skip duplicate youtube_id:', track.youtubeId, track.title);
      continue;
    }
    byYoutube.set(track.youtubeId, trackInputToDbRow(track));
  }

  const rows = [...byYoutube.values()];
  console.log(`Upserting ${rows.length} tracks (youtube_id unique)...`);

  supabase
    .from('tracks')
    .upsert(rows, { onConflict: 'youtube_id' })
    .select('id')
    .then(({ data, error }) => {
      if (error) {
        console.error('Upsert failed:', error.message);
        process.exit(1);
      }
      console.log(`Done. ${data?.length ?? rows.length} rows affected.`);
    });
}

main();
