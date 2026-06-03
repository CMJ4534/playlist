import { getGenreLabels } from '../constants/musicGenres.js';
import type { GeminiPlaylistResponse } from '../types/recommend.js';
import type { EmotionId } from './emotionKeywords.js';
import { getEmotionProfile } from './emotionKeywords.js';

const TARGET_SONG_COUNT = 10;

export type GeminiRecommendInput = {
  emotionId: EmotionId;
  diary: string | null;
  tastePreferences?: {
    favoriteGenres: string[];
    favoriteArtists: [string, string, string];
  };
};

function buildUserPrompt(input: GeminiRecommendInput): string {
  const profile = getEmotionProfile(input.emotionId);
  const emotionLabel = profile?.label ?? input.emotionId;

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

  return `${tasteBlock}

현재 감정:
${emotionLabel}

현재 상황:
${situation}

위 정보를 반영해 실제로 존재하는 곡 정확히 ${TARGET_SONG_COUNT}곡을 골라 주세요.`;
}

const SYSTEM_INSTRUCTION = `당신은 음악 플레이리스트 큐레이터입니다.
- 반드시 실제로 존재하는 곡만 추천하고, 제목과 아티스트 이름을 정확히 쓰세요.
- 사용자 선호 장르·아티스트를 반영하되, 현재 감정·상황에 맞게 구성하세요.
- 좋아하는 아티스트 곡은 전체의 약 30~50% 이내로 하고, 나머지는 취향에 맞는 다른 아티스트 곡으로 채우세요.
- 동일 곡·동일 아티스트 중복을 피하세요.
- songs 배열 길이는 정확히 ${TARGET_SONG_COUNT}개여야 합니다.
- JSON만 출력하세요. 다른 설명은 금지합니다.

출력 스키마:
{
  "playlistName": "string",
  "playlistComment": "string",
  "songs": [{ "title": "string", "artist": "string" }]
}`;

export async function fetchGeminiPlaylist(
  input: GeminiRecommendInput
): Promise<GeminiPlaylistResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input) }] }],
      generationConfig: {
        temperature: 0.6,
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
  const parsed = parseGeminiJson(rawText);
  validateGeminiPlaylist(parsed);
  return parsed;
}

function parseGeminiJson(text: string): GeminiPlaylistResponse {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenced ? fenced[1].trim() : text.trim();
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  const slice =
    start >= 0 && end > start ? jsonStr.slice(start, end + 1) : jsonStr;
  return JSON.parse(slice) as GeminiPlaylistResponse;
}

function validateGeminiPlaylist(data: GeminiPlaylistResponse): void {
  if (!data.playlistName || !Array.isArray(data.songs)) {
    throw new Error('Invalid Gemini playlist shape');
  }
  if (data.songs.length < TARGET_SONG_COUNT) {
    throw new Error(
      `Gemini returned ${data.songs.length} songs, expected ${TARGET_SONG_COUNT}`
    );
  }
  for (const s of data.songs.slice(0, TARGET_SONG_COUNT)) {
    if (!s.title?.trim() || !s.artist?.trim()) {
      throw new Error('Gemini song missing title or artist');
    }
  }
}
