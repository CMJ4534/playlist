const YT_BASE = 'https://www.googleapis.com/youtube/v3';

type YouTubeError = {
  error: { code: number; message: string };
};

async function ytFetch<T>(
  endpoint: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${YT_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const err: YouTubeError = await res.json().catch(() => ({
      error: { code: res.status, message: res.statusText },
    }));
    throw new Error(`YouTube API ${res.status}: ${err.error.message}`);
  }

  return res.json();
}

type PlaylistInsertResponse = {
  id: string;
  snippet: { title: string };
};

type PlaylistItemInsertResponse = {
  id: string;
  snippet: { resourceId: { videoId: string } };
};

/**
 * YouTube 재생목록 생성 (playlists.insert)
 */
export async function createYouTubePlaylist(
  accessToken: string,
  title: string,
  description: string
): Promise<{ playlistId: string }> {
  const data = await ytFetch<PlaylistInsertResponse>(
    '/playlists?part=snippet,status',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        snippet: { title, description },
        status: { privacyStatus: 'private' },
      }),
    }
  );

  return { playlistId: data.id };
}

/**
 * 재생목록에 영상 추가 (playlistItems.insert)
 */
export async function addVideoToPlaylist(
  accessToken: string,
  playlistId: string,
  videoId: string
): Promise<boolean> {
  try {
    await ytFetch<PlaylistItemInsertResponse>(
      '/playlistItems?part=snippet',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        }),
      }
    );
    return true;
  } catch (err) {
    console.warn(`[youtubeApi] failed to add video ${videoId}:`, err);
    return false;
  }
}

export type SavePlaylistResult = {
  success: boolean;
  playlistId?: string;
  playlistUrl?: string;
  addedCount: number;
  totalCount: number;
  error?: string;
};

/**
 * 추천 곡 전체를 YouTube 재생목록으로 저장하는 통합 함수.
 *
 * 1. playlists.insert로 새 재생목록 생성
 * 2. playlistItems.insert로 각 곡 추가 (실패해도 계속 진행)
 * 3. 결과 반환
 */
export async function saveTracksAsPlaylist(
  accessToken: string,
  videoIds: string[],
  title: string,
  description: string
): Promise<SavePlaylistResult> {
  try {
    const { playlistId } = await createYouTubePlaylist(
      accessToken,
      title,
      description
    );

    let addedCount = 0;

    for (const videoId of videoIds) {
      const ok = await addVideoToPlaylist(accessToken, playlistId, videoId);
      if (ok) addedCount++;
      // YouTube API 쿼터 보호: 살짝 대기
      await new Promise((r) => setTimeout(r, 300));
    }

    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    console.log(
      `[youtubeApi] playlist created: ${playlistId}, added ${addedCount}/${videoIds.length}`
    );

    return {
      success: true,
      playlistId,
      playlistUrl,
      addedCount,
      totalCount: videoIds.length,
    };
  } catch (err: any) {
    console.error('[youtubeApi] saveTracksAsPlaylist error:', err);
    return {
      success: false,
      addedCount: 0,
      totalCount: videoIds.length,
      error: err?.message ?? 'YouTube 재생목록 생성 실패',
    };
  }
}
