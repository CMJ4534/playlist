export type YoutubeSearchHit = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

/**
 * YouTube Data API v3 — title + artist 검색 → videoId
 */
export async function searchYoutubeVideo(
  apiKey: string,
  title: string,
  artist: string
): Promise<YoutubeSearchHit | null> {
  const q = `${title} ${artist}`.trim();
  if (!q) return null;

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('q', q);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.warn('[youtubeSearch] HTTP', res.status, text.slice(0, 200));
    return null;
  }

  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: { high?: { url?: string }; default?: { url?: string } };
      };
    }>;
  };

  const item = data.items?.[0];
  const videoId = item?.id?.videoId;
  if (!videoId) return null;

  const thumbs = item.snippet?.thumbnails;
  return {
    videoId,
    title: item.snippet?.title ?? title,
    channelTitle: item.snippet?.channelTitle ?? artist,
    thumbnailUrl:
      thumbs?.high?.url ??
      thumbs?.default?.url ??
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
