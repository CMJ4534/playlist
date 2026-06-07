import Constants from 'expo-constants';

import { resolveApiBase } from '@/constants/apiConfig';

import type { TastePreferencesPayload } from '@/types/tastePreferences';
import type { StrategyRequestContext } from '@/types/moodStrategy';

const RECOMMEND_TIMEOUT_MS = 45_000;

export type VideoItem = {
  videoId: string;
  title: string;
  artist: string;
  channelTitle: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  mood: string;
  moodTag: string;
};

export type PlaybackResult = {
  tier: 'videoIds';
  videos: VideoItem[];
  totalCount: number;
};

export type RecommendResponse = {
  emotion: string;
  emotionLabel: string;
  emotionEmoji: string;
  moodTag: string;
  diary: string | null;
  playback: PlaybackResult;
  meta: {
    videoCount: number;
    source: string;
    timestamp: number;
    playlistName?: string;
    playlistComment?: string;
  };
};

export type RecommendRequestBody = {
  emotion: string;
  diary?: string;
  tastePreferences?: TastePreferencesPayload;
  strategyContext?: StrategyRequestContext;
};

/**
 * 감정 + 일기 + 취향 + Strategy 컨텍스트 기반 AI 플레이리스트 추천.
 */
export async function fetchRecommendation(
  emotion: string,
  diary?: string,
  tastePreferences?: TastePreferencesPayload,
  strategyContext?: StrategyRequestContext
): Promise<RecommendResponse> {
  console.log('ENV_BACKEND_URL =', process.env.EXPO_PUBLIC_BACKEND_URL);
  console.log('EXPO_EXTRA_BACKEND_URL =', Constants.expoConfig?.extra?.backendUrl);
  console.log('RESOLVED_API_BASE =', resolveApiBase());
  console.log('REQUEST_URL =', `${resolveApiBase()}/api/recommend`);

  const apiBase = resolveApiBase();
  const url = `${apiBase}/api/recommend`;
  const body: RecommendRequestBody = {
    emotion,
    ...(diary?.trim() ? { diary: diary.trim() } : {}),
    ...(tastePreferences ? { tastePreferences } : {}),
    ...(strategyContext ? { strategyContext } : {}),
  };

  console.log('[FLOW][API] resolved apiBase:', apiBase);
  console.log('[FLOW][API] POST url:', url);
  console.log('[FLOW][API] body:', JSON.stringify(body));

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log(`[FLOW][API] TIMEOUT — ${RECOMMEND_TIMEOUT_MS / 1000}s exceeded, aborting`);
    controller.abort();
  }, RECOMMEND_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    console.log('[FLOW][API] response status:', res.status);

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[FLOW][API] error body:', errorBody);
      throw new Error(`API error: ${res.status}`);
    }

    const data = (await res.json()) as RecommendResponse;
    console.log(
      '[FLOW][API] parsed response — videos:',
      data?.playback?.videos?.length,
      'source:',
      data?.meta?.source
    );

    if (!data?.playback?.videos?.length) {
      throw new Error('API returned empty playlist');
    }

    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FLOW][API] fetch EXCEPTION:', message, '| url:', url);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  const healthUrl = `${resolveApiBase()}/api/recommend/health`;
  console.log('[FLOW][API] health check:', healthUrl);
  try {
    const res = await fetch(healthUrl);
    return res.ok;
  } catch {
    return false;
  }
}

export type CreatePlaylistRequest = {
  accessToken: string;
  videoIds: string[];
  title?: string;
  description?: string;
};

export type CreatePlaylistResponse = {
  success: boolean;
  playlistId?: string;
  playlistUrl?: string;
  videoCount: number;
  error?: string;
};

export async function createPlaylist(
  request: CreatePlaylistRequest
): Promise<CreatePlaylistResponse> {
  try {
    const res = await fetch(`${resolveApiBase()}/api/playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await res.json();
    return data as CreatePlaylistResponse;
  } catch {
    return {
      success: false,
      error: 'Network error — backend unreachable',
      videoCount: 0,
    };
  }
}
