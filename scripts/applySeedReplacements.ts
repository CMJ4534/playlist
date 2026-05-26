/**
 * replacements.json → seed TS 파일 일괄 치환
 *
 *   npx tsx scripts/applySeedReplacements.ts
 *   npx tsx scripts/applySeedReplacements.ts --dry-run
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = join(__dirname, '../src/data/seeds');
const REPLACEMENTS_PATH = join(SEEDS_DIR, 'replacements.json');

type ReplacementEntry = {
  reason: string;
  replacement: {
    youtubeId: string;
    title?: string;
    artist?: string;
    energyLevel?: number;
    noveltyTier?: string;
    moodTags?: string[];
  };
};

type ReplacementsFile = {
  replacements: Record<string, ReplacementEntry>;
};

const dryRun = process.argv.includes('--dry-run');

function loadReplacements(): ReplacementsFile {
  const raw = readFileSync(REPLACEMENTS_PATH, 'utf8');
  return JSON.parse(raw) as ReplacementsFile;
}

function main() {
  const { replacements } = loadReplacements();
  const ids = Object.keys(replacements);

  if (!ids.length) {
    console.log('No replacements defined in replacements.json');
    return;
  }

  const seedFiles = readdirSync(SEEDS_DIR).filter(
    (f) => f.endsWith('.ts') && f !== 'helpers.ts' && f !== 'index.ts' && f !== 'types.ts'
  );

  let totalReplacements = 0;

  for (const file of seedFiles) {
    const path = join(SEEDS_DIR, file);
    let content = readFileSync(path, 'utf8');
    let fileCount = 0;

    for (const [oldId, entry] of Object.entries(replacements)) {
      if (!content.includes(oldId)) continue;

      const next = entry.replacement;
      content = content.replace(
        new RegExp(
          `youtubeId:\\s*'${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`,
          'g'
        ),
        `youtubeId: '${next.youtubeId}'`
      );

      if (next.title) {
        content = content.replace(
          new RegExp(
            `(title:\\s*')([^']*)(',\\s*artist:[^\\n]*youtubeId:\\s*'${next.youtubeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}')`,
            'g'
          ),
          `$1${next.title}$3`
        );
      }

      fileCount++;
      totalReplacements++;
      console.log(
        `${dryRun ? '[dry-run] ' : ''}${file}: ${oldId} → ${next.youtubeId} (${entry.reason})`
      );
    }

    if (fileCount && !dryRun) {
      writeFileSync(path, content, 'utf8');
    }
  }

  console.log(`\nDone. ${totalReplacements} replacement(s)${dryRun ? ' (dry-run)' : ''}.`);
  if (!dryRun) {
    console.log('Run: npm run verify:tracks && npm run verify:tracks:playback');
  }
}

main();
