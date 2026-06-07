import type { SongCandidate } from '../types/recommend.js';
import {
  BANNED_TITLE_PATTERN,
  normalizeSongField,
  type GeminiRecommendInput,
} from './geminiSongClient.js';

function candidateKey(c: SongCandidate): string {
  return `${c.title.toLowerCase()}|${c.artist.toLowerCase()}`;
}

/**
 * Gemini 후보 필터링 (YouTube resolve 전).
 * - 빈 필드·금지 패턴·중복 제거
 */
export function filterCandidates(candidates: SongCandidate[]): SongCandidate[] {
  const seen = new Set<string>();
  const out: SongCandidate[] = [];

  for (const raw of candidates) {
    const title = normalizeSongField(raw.title);
    const artist = normalizeSongField(raw.artist);
    if (!title || !artist) continue;
    if (BANNED_TITLE_PATTERN.test(title)) continue;

    const key = candidateKey({ title, artist });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, artist });
  }

  return out;
}

function artistMatchScore(artist: string, favorites: string[]): number {
  const a = artist.toLowerCase();
  let best = 0;
  for (const f of favorites) {
    const fav = f.trim().toLowerCase();
    if (!fav) continue;
    if (a === fav) best = Math.max(best, 20);
    else if (a.includes(fav) || fav.includes(a)) best = Math.max(best, 12);
  }
  return best;
}

/**
 * 후보 랭킹 (YouTube resolve 순서 결정).
 * - 취향 아티스트 가산 + Gemini 순서 tie-break
 * - 동일 아티스트 연속 배치 완화
 */
export function rankCandidates(
  candidates: SongCandidate[],
  input: GeminiRecommendInput
): SongCandidate[] {
  const favorites = input.tastePreferences?.favoriteArtists ?? [];

  const scored = candidates.map((c, index) => ({
    c,
    score:
      (favorites.length ? artistMatchScore(c.artist, favorites) : 0) +
      Math.max(0, 15 - index * 0.5),
  }));

  scored.sort((a, b) => b.score - a.score);
  return reorderForArtistDiversity(scored.map((s) => s.c));
}

function reorderForArtistDiversity(ordered: SongCandidate[]): SongCandidate[] {
  const result: SongCandidate[] = [];
  const remaining = [...ordered];

  while (remaining.length > 0) {
    let pickIdx = 0;
    if (result.length > 0) {
      const lastArtist = result[result.length - 1].artist.toLowerCase();
      const alt = remaining.findIndex(
        (c) => c.artist.toLowerCase() !== lastArtist
      );
      if (alt >= 0) pickIdx = alt;
    }
    result.push(remaining.splice(pickIdx, 1)[0]);
  }

  return result;
}
