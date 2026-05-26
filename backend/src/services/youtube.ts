const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export type PlaylistResult = {
  playlistId: string;
  playlistUrl: string;
};

/**
 * YouTube playlist 생성 (OAuth 필요).
 * 추천은 내부 카탈로그에서 생성 — 이 모듈은 "저장" 전용.
 */
export async function createPlaylist(
  title: string,
  description: string,
  videoIds: string[],
  accessToken: string
): Promise<PlaylistResult | null> {
  try {
    const createRes = await fetch(
      `${YOUTUBE_API_BASE}/playlists?part=snippet,status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: { title, description },
          status: { privacyStatus: 'private' },
        }),
      }
    );

    if (!createRes.ok) {
      console.error('[youtube] playlist create failed:', createRes.status);
      return null;
    }

    const playlist = await createRes.json();
    const playlistId = playlist.id;

    for (const videoId of videoIds) {
      try {
        await fetch(
          `${YOUTUBE_API_BASE}/playlistItems?part=snippet`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                playlistId,
                resourceId: { kind: 'youtube#video', videoId },
              },
            }),
          }
        );
      } catch {
        console.warn(`[youtube] failed to add ${videoId} to playlist`);
      }
    }

    return {
      playlistId,
      playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
    };
  } catch (err) {
    console.error('[youtube] playlist creation error:', err);
    return null;
  }
}
