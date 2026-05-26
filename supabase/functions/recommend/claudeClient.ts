import type { ClaudeRecommendationPlan, RecommendRequest } from './types.ts';

const EMOTION_MOOD: Record<string, string[]> = {
  sad: ['우울', '잔잔한', '몽환적'],
  dawn: ['새벽', '몽환적', '잔잔한'],
  focus: ['집중', '몽환적'],
  rain: ['비', '잔잔한', '감성'],
  walk: ['산책', '감성', '잔잔한'],
  blank: ['멍', '잔잔한', '배경'],
};

/**
 * Claude Messages API 래퍼.
 * CLAUDE_API_KEY 미설정 시 mock 플랜 반환 (운영 구조 동일).
 */
export async function getClaudeRecommendationPlan(
  request: RecommendRequest
): Promise<ClaudeRecommendationPlan> {
  const apiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!apiKey) {
    return buildMockPlan(request);
  }

  try {
    return await callClaudeApi(apiKey, request);
  } catch (err) {
    console.error('[claudeClient] API error, using mock plan:', err);
    return buildMockPlan(request);
  }
}

async function callClaudeApi(
  apiKey: string,
  request: RecommendRequest
): Promise<ClaudeRecommendationPlan> {
  const model = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-4-20250514';
  const moodTags = EMOTION_MOOD[request.emotion] ?? ['감성'];

  const system = `You are a music playlist curator. Respond ONLY with valid JSON:
{"playlistName":string,"playlistComment":string,"moodTags":string[],"energyMin":number,"energyMax":number,"noveltyRatio":{"familiar":0.5,"mid":0.3,"hidden":0.2}}
Do NOT pick specific songs — only mood/energy/novelty curation spec.`;

  const userContent = JSON.stringify({
    emotion: request.emotion,
    situation: request.situation ?? '',
    moodTags,
    userTasteProfile: request.userTasteProfile ?? null,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  const rawText = textBlock?.text ?? '';
  const json = extractJson(rawText);
  return parseClaudeJson(json, request);
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function parseClaudeJson(json: string, request: RecommendRequest): ClaudeRecommendationPlan {
  const parsed = JSON.parse(json);
  const moodTags = EMOTION_MOOD[request.emotion] ?? ['감성'];
  return {
    playlistName: String(parsed.playlistName ?? '오늘의 플레이리스트'),
    playlistComment: String(parsed.playlistComment ?? ''),
    moodTags: Array.isArray(parsed.moodTags) ? parsed.moodTags : moodTags,
    energyMin: typeof parsed.energyMin === 'number' ? parsed.energyMin : 2,
    energyMax: typeof parsed.energyMax === 'number' ? parsed.energyMax : 6,
    noveltyRatio: parsed.noveltyRatio ?? { familiar: 0.5, mid: 0.3, hidden: 0.2 },
    limit: 12,
    maxPerArtist: 2,
  };
}

function buildMockPlan(request: RecommendRequest): ClaudeRecommendationPlan {
  const moodTags = EMOTION_MOOD[request.emotion] ?? ['감성'];
  const situation = request.situation?.trim();
  const comment = situation
    ? `지금 당신의 순간 — "${situation}"`
    : '지금 이 순간에 어울리는 음악을 골랐어요.';

  const titles: Record<string, { name: string; comment: string }> = {
    sad: { name: '조용히 스며드는 밤', comment: `마음이 무거울 때 곁에 있어 주는 멜로디. ${comment}` },
    dawn: { name: '새벽 3시의 창가', comment: `아직 잠들지 못한 밤의 선율. ${comment}` },
    focus: { name: '깊은 집중의 리듬', comment: `몰입을 돕는 플레이리스트. ${comment}` },
    rain: { name: '빗소리와 함께', comment: `비 오는 날의 감성. ${comment}` },
    walk: { name: '혼자 걷는 거리', comment: `발걸음에 맞춘 곡들. ${comment}` },
    blank: { name: '아무 생각 없이', comment: `멍해도 괜찮은 시간. ${comment}` },
  };

  const meta = titles[request.emotion] ?? {
    name: '오늘의 무드',
    comment,
  };

  const energy = ENERGY_BY_EMOTION[request.emotion] ?? [2, 7];

  return {
    playlistName: meta.name,
    playlistComment: meta.comment,
    moodTags,
    energyMin: energy[0],
    energyMax: energy[1],
    noveltyRatio: { familiar: 0.5, mid: 0.3, hidden: 0.2 },
    limit: 12,
    maxPerArtist: 2,
    excludeYoutubeIds: request.excludeYoutubeIds,
  };
}

const ENERGY_BY_EMOTION: Record<string, [number, number]> = {
  sad: [2, 5],
  dawn: [2, 5],
  focus: [5, 8],
  rain: [2, 5],
  walk: [3, 6],
  blank: [1, 4],
};
