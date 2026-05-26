/**
 * track-playback-report.json → catalogMeta.json 반영
 *
 *   npx tsx scripts/syncSeedMetaFromReport.ts
 *   npx tsx scripts/syncSeedMetaFromReport.ts --disable-embedding
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = join(__dirname, 'reports/track-playback-report.json');
const META_PATH = join(__dirname, '../src/data/seeds/catalogMeta.json');

const disableEmbedding = process.argv.includes('--disable-embedding');

type ReportRow = {
  youtubeId: string;
  status: string;
  severity?: string;
  title?: string;
  artist?: string;
  category?: string;
};

type Report = {
  needsFix: ReportRow[];
};

type MetaEntry = {
  disabled?: boolean;
  disabledReason?: string | null;
  verifiedAt?: string | null;
  verifiedStatus?: string | null;
  severity?: string | null;
};

function main() {
  const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as Report;
  const meta = JSON.parse(readFileSync(META_PATH, 'utf8')) as {
    byYoutubeId: Record<string, MetaEntry>;
  };

  const now = new Date().toISOString();
  let updated = 0;
  let disabled = 0;

  for (const row of report.needsFix ?? []) {
    const shouldDisable =
      disableEmbedding && row.status === 'embedding_restricted';

    const existing = meta.byYoutubeId[row.youtubeId] ?? {};
    meta.byYoutubeId[row.youtubeId] = {
      ...existing,
      verifiedAt: now,
      verifiedStatus: row.status,
      severity: row.severity ?? null,
      disabled: shouldDisable || existing.disabled,
      disabledReason: shouldDisable ? row.status : existing.disabledReason,
    };
    updated++;
    if (shouldDisable) disabled++;
  }

  writeFileSync(
    META_PATH,
    JSON.stringify(
      {
        $comment:
          '운영 메타 — disabled/verifiedAt. verify:tracks:playback 후 npm run seed:sync-meta',
        byYoutubeId: meta.byYoutubeId,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(`Updated ${REPORT_PATH} → ${META_PATH}`);
  console.log(`Processed ${updated} rows${disabled ? ` (${disabled} disabled)` : ''}`);
}

main();
