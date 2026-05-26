import { Platform } from 'react-native';

const LAN_IP = '10.229.139.158';

const API_BASE = Platform.select({
  android: `http://${LAN_IP}:3001`,
  ios: `http://${LAN_IP}:3001`,
  default: 'http://localhost:3001',
});

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
  };
};

/**
 * 감정 기반 플레이리스트 추천 요청.
 * diary는 메타데이터로만 전달 — 검색어 생성 금지.
 */
export async function fetchRecommendation(
  emotion: string,
  diary?: string
): Promise<RecommendResponse> {
  const url = `${API_BASE}/api/recommend`;
  console.log('[FLOW][API] fetch URL:', url);
  console.log('[FLOW][API] body:', JSON.stringify({ emotion, diary }));

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log('[FLOW][API] TIMEOUT — 8s exceeded, aborting');
    controller.abort();
  }, 8000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion, diary }),
      signal: controller.signal,
    });

    console.log('[FLOW][API] response status:', res.status);

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[FLOW][API] error body:', errorBody);
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    console.log('[FLOW][API] parsed response — videos:', data?.playback?.videos?.length, 'source:', data?.meta?.source);
    return data;
  } catch (err: any) {
    console.error('[FLOW][API] fetch EXCEPTION:', err?.message || err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/recommend/health`);
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
    const res = await fetch(`${API_BASE}/api/playlist`, {
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
