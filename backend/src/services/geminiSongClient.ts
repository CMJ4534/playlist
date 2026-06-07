import { getGenreLabels } from '../constants/musicGenres.js';
import {
  getDiscoveryPressureInstruction,
  resolveDiscoveryPressure,
} from '../constants/discoveryPressure.js';
import { getMoodStrategyIntent } from '../constants/moodStrategies.js';
import type { GeminiCandidatesResponse, SongCandidate, StrategyRequestContext } from '../types/recommend.js';
import type { EmotionId } from './emotionKeywords.js';
import { getEmotionProfile } from './emotionKeywords.js';



const DEFAULT_CANDIDATE_COUNT = 22;

const MIN_CANDIDATE_COUNT = 20;

const MAX_CANDIDATE_COUNT = 25;



const GEMINI_TEMPERATURE = 0.35;



/** YouTube 검색·필터링에 불리한 제목 패턴 */

export const BANNED_TITLE_PATTERN =

  /\b(remix|re[- ]?mix|live|cover|acoustic version|1[- ]?hour|hour mix|unofficial|fan[- ]?made|nightcore|sped up|slowed|karaoke|instrumental only)\b/i;



export type GeminiRecommendInput = {

  emotionId: EmotionId;

  diary: string | null;

  tastePreferences?: {

    favoriteGenres: string[];

    favoriteArtists: [string, string, string];

  };

  strategyContext?: StrategyRequestContext;

};



function resolveCandidateCount(input: GeminiRecommendInput): number {

  const n = input.strategyContext?.candidateCount ?? DEFAULT_CANDIDATE_COUNT;

  return Math.min(MAX_CANDIDATE_COUNT, Math.max(MIN_CANDIDATE_COUNT, n));

}



function buildUserPrompt(input: GeminiRecommendInput, candidateCount: number): string {

  const profile = getEmotionProfile(input.emotionId);

  const emotionLabel = profile?.label ?? input.emotionId;

  const ctx = input.strategyContext;



  const tasteBlock = input.tastePreferences

    ? `사용자 취향



장르:

${getGenreLabels(input.tastePreferences.favoriteGenres)}



좋아하는 아티스트:

${input.tastePreferences.favoriteArtists.join('\n')}`

    : '사용자 취향: (미설정)';



  const situation = input.diary?.trim()

    ? input.diary.trim()

    : '(일기 없음 — 감정만 반영)';



  const strategyBlock = ctx

    ? `이번 추천 strategy: ${ctx.strategyId}

strategy 의도: ${ctx.strategyIntent || getMoodStrategyIntent(ctx.strategyId)}`

    : '';



  const pressureBlock = ctx
    ? `discovery pressure: ${ctx.discoveryPressure}
탐색 범위 지시 (반드시 따를 것 — pressure 선택 권한 없음):
${ctx.discoveryPressureInstruction || getDiscoveryPressureInstruction(resolveDiscoveryPressure(ctx.attemptCount))}`
    : '';

  const excludeTracksBlock =

    ctx && ctx.excludeTracks.length > 0

      ? `제외할 곡 (이미 추천됨 — title + artist):

${ctx.excludeTracks.map((t) => `- ${t.title} / ${t.artist}`).join('\n')}`

      : '';



  const excludeArtistsBlock =

    ctx && ctx.excludeArtists.length > 0

      ? `제외·과다 반복 방지 아티스트:

${ctx.excludeArtists.map((a) => `- ${a}`).join('\n')}`

      : '';



  return `${tasteBlock}



현재 감정:

${emotionLabel}



일기/상황:

${situation}



${strategyBlock}

${pressureBlock}

${excludeTracksBlock}



${excludeArtistsBlock}



위 맥락에 맞는 **YouTube 검색 가능한 후보 곡**을 정확히 ${candidateCount}곡 제안하세요.

최종 플레이리스트가 아닌 **후보 풀**만 생성합니다.`;

}



function buildSystemInstruction(candidateCount: number): string {

  return `You are a music **candidate generator** (NOT a final playlist curator or strategy picker).



Your job: propose exactly ${candidateCount} real songs searchable on YouTube.

Downstream steps filter, rank, and resolve videos — do NOT finalize a playlist.



Rules (mandatory):

- ONLY real songs findable on YouTube via exact "title + artist" search.

- Use exact official studio track title and primary artist name.

- Prefer globally popular artists when they fit the given strategy intent and user taste.

- Each candidate unique (no duplicate title+artist).

- NEVER: remix, live, cover, 1-hour, unofficial, fan-made, karaoke in titles.

- Do NOT choose strategy — follow the provided strategy intent only.

- Do NOT choose discovery pressure — follow the provided pressure instruction only.

- Do NOT output BPM numbers or genre taxonomy lists.

- Output JSON only.



Required JSON shape (exactly ${candidateCount} items in candidates):

{

  "candidates": [

    { "title": "exact official song title", "artist": "exact primary artist name" }

  ]

}`;

}



/**

 * Gemini API — 후보 20~25곡 생성 (Strategy Layer 컨텍스트 반영).

 */

export async function fetchGeminiCandidates(

  input: GeminiRecommendInput

): Promise<GeminiCandidatesResponse> {

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {

    throw new Error('GEMINI_API_KEY not configured');

  }



  const candidateCount = resolveCandidateCount(input);

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;



  const sessionLog = input.strategyContext?.sessionId

    ? ` session=${input.strategyContext.sessionId} strategy=${input.strategyContext.strategyId} pressure=${input.strategyContext.discoveryPressure}`

    : '';



  const res = await fetch(url, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({

      systemInstruction: { parts: [{ text: buildSystemInstruction(candidateCount) }] },

      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input, candidateCount) }] }],

      generationConfig: {

        temperature: GEMINI_TEMPERATURE,

        responseMimeType: 'application/json',

      },

    }),

  });



  if (!res.ok) {

    const text = await res.text();

    throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);

  }



  const data = (await res.json()) as {

    candidates?: Array<{

      content?: { parts?: Array<{ text?: string }> };

    }>;

  };



  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const parsed = parseGeminiCandidatesJson(rawText);

  validateGeminiCandidates(parsed, candidateCount);

  console.log(

    `[geminiSongClient] generated ${parsed.candidates.length} candidates emotion=${input.emotionId}${sessionLog}`

  );

  return parsed;

}



/** @deprecated fetchGeminiCandidates 사용 */

export async function fetchGeminiPlaylist(

  input: GeminiRecommendInput

): Promise<GeminiCandidatesResponse> {

  return fetchGeminiCandidates(input);

}



function parseGeminiCandidatesJson(text: string): GeminiCandidatesResponse {

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);

  const jsonStr = fenced ? fenced[1].trim() : text.trim();

  const start = jsonStr.indexOf('{');

  const end = jsonStr.lastIndexOf('}');

  const slice =

    start >= 0 && end > start ? jsonStr.slice(start, end + 1) : jsonStr;

  const raw = JSON.parse(slice) as {

    candidates?: Array<{ title?: string; artist?: string }>;

    songs?: Array<{ title?: string; artist?: string }>;

  };



  const list = raw.candidates ?? raw.songs ?? [];

  return {

    candidates: list.map((s) => ({

      title: normalizeSongField(s.title),

      artist: normalizeSongField(s.artist),

    })),

  };

}



/** 괄호 부가 정보 제거 (Live at ..., Official Video 등) */

export function normalizeSongField(value: string | undefined): string {

  if (!value?.trim()) return '';

  return value

    .trim()

    .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, ' ')

    .replace(/\s+/g, ' ')

    .trim();

}



export function validateGeminiCandidates(

  data: GeminiCandidatesResponse,

  expectedCount: number

): void {

  if (!Array.isArray(data.candidates)) {

    throw new Error('Invalid Gemini candidates shape: missing candidates array');

  }

  if (data.candidates.length < expectedCount) {

    throw new Error(

      `Gemini returned ${data.candidates.length} candidates, expected ${expectedCount}`

    );

  }

  for (const s of data.candidates.slice(0, expectedCount)) {

    if (!s.title || !s.artist) {

      throw new Error('Gemini candidate missing title or artist');

    }

    if (BANNED_TITLE_PATTERN.test(s.title)) {

      throw new Error(

        `Gemini candidate title not YouTube-safe (banned pattern): "${s.title}"`

      );

    }

  }

}


