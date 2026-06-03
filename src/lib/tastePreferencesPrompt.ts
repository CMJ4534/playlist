import { getGenreLabels } from '@/constants/musicGenres';
import type { TastePreferencesPayload } from '@/types/tastePreferences';

/** Gemini·백엔드 프롬프트용 텍스트 블록 (Step 2+에서 사용) */
export function buildTasteContextBlock(prefs: TastePreferencesPayload): string {
  const genres = getGenreLabels(prefs.favoriteGenres);
  const artists = prefs.favoriteArtists.join('\n');

  return `사용자 취향

장르:
${genres}

좋아하는 아티스트:
${artists}`;
}

export function buildRecommendationContextBlock(
  prefs: TastePreferencesPayload,
  emotionLabel: string,
  diary: string | null | undefined
): string {
  const taste = buildTasteContextBlock(prefs);
  const situation = diary?.trim()
    ? diary.trim()
    : '(일기 없음 — 감정만 반영)';

  return `${taste}

현재 감정:
${emotionLabel}

현재 상황:
${situation}`;
}
