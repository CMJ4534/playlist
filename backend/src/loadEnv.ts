import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** backend/ 루트 — 실행 cwd와 무관하게 .env 경로 고정 */
export const BACKEND_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

export const ENV_FILE_PATH = path.join(BACKEND_ROOT, '.env');

const loaded = dotenv.config({ path: ENV_FILE_PATH });

if (loaded.error) {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    console.warn(`[env] .env not found at ${ENV_FILE_PATH}`);
  } else {
    console.warn(`[env] failed to load .env: ${loaded.error.message}`);
  }
}

const PLACEHOLDER_MARKERS = ['your_', '_here', 'changeme', 'replace_me', 'xxx'];

export function isPlaceholderEnvValue(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const lower = value.trim().toLowerCase();
  return PLACEHOLDER_MARKERS.some((m) => lower.includes(m));
}

export function maskEnvValue(value: string | undefined): string {
  if (!value?.trim()) return '(unset)';
  const v = value.trim();
  if (v.length <= 8) return '****';
  return `${v.slice(0, 4)}…${v.slice(-4)} (${v.length} chars)`;
}

export function logEnvStatus(): void {
  const youtube = process.env.YOUTUBE_API_KEY?.trim();
  const gemini = process.env.GEMINI_API_KEY?.trim();

  console.log(`[env] loaded from ${ENV_FILE_PATH}`);
  console.log(`[env] GEMINI_API_KEY: ${gemini ? maskEnvValue(gemini) : '(unset)'}`);
  console.log(`[env] YOUTUBE_API_KEY: ${youtube ? maskEnvValue(youtube) : '(unset)'}`);

  if (isPlaceholderEnvValue(youtube)) {
    console.warn(
      '[env] YOUTUBE_API_KEY looks like a placeholder — set a real YouTube Data API v3 key in backend/.env'
    );
  }
  if (isPlaceholderEnvValue(gemini)) {
    console.warn(
      '[env] GEMINI_API_KEY looks like a placeholder — set a real key in backend/.env'
    );
  }
}
