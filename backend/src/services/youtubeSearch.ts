import {
  buildYoutubeSearchQueries,
  type DiscoveryPressure,
} from '../constants/discoveryPressure.js';

export type YoutubeSearchHit = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

type SearchContext = {
  songTitle: string;
  songArtist: string;
  pressure: DiscoveryPressure;
};

export type YoutubeSearchAttemptLog = {
  pressure: string;
  query_variant: 1 | 2 | 3;
  query_string: string;
  result_count: number;
  fallback_used: boolean;
  final_match: boolean;
};

type SearchOnceResult = {
  hit: YoutubeSearchHit | null;
  resultCount: number;
};

function logSearchAttempt(entry: YoutubeSearchAttemptLog): void {
  console.log(`[youtubeSearch] ${JSON.stringify(entry)}`);
}

async function searchYoutubeOnce(
  apiKey: string,
  query: string,
  ctx: SearchContext
): Promise<SearchOnceResult> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '5');
  url.searchParams.set('videoCategoryId', '10');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    console.warn(
      `[youtubeSearch] HTTP ${res.status} title="${ctx.songTitle}" artist="${ctx.songArtist}" query="${query}" body=${text.slice(0, 160)}`
    );
    return { hit: null, resultCount: 0 };
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

  const items = data.items ?? [];
  const resultCount = items.length;
  const item = items[0];
  const videoId = item?.id?.videoId;

  if (!videoId) {
    return { hit: null, resultCount };
  }

  const thumbs = item.snippet?.thumbnails;
  return {
    hit: {
      videoId,
      title: item.snippet?.title ?? ctx.songTitle,
      channelTitle: item.snippet?.channelTitle ?? ctx.songArtist,
      thumbnailUrl:
        thumbs?.high?.url ??
        thumbs?.default?.url ??
        `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    },
    resultCount,
  };
}

/**
 * YouTube Data API v3 — pressure별 3단계 fallback으로 videoId 해석
 */
export async function searchYoutubeVideo(
  apiKey: string,
  title: string,
  artist: string,
  pressure: DiscoveryPressure = 'mainstream'
): Promise<YoutubeSearchHit | null> {
  const ctx: SearchContext = { songTitle: title, songArtist: artist, pressure };
  const queries = buildYoutubeSearchQueries(pressure, title, artist);

  if (queries.length === 0) {
    console.warn(
      `[youtubeSearch] skip — no valid queries title="${title}" artist="${artist}" pressure=${pressure}`
    );
    return null;
  }

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const variant = (i + 1) as 1 | 2 | 3;
    const fallbackUsed = variant > 1;

    const { hit, resultCount } = await searchYoutubeOnce(apiKey, query, ctx);

    if (hit) {
      logSearchAttempt({
        pressure,
        query_variant: variant,
        query_string: query,
        result_count: resultCount,
        fallback_used: fallbackUsed,
        final_match: true,
      });
      return hit;
    }

    logSearchAttempt({
      pressure,
      query_variant: variant,
      query_string: query,
      result_count: resultCount,
      fallback_used: fallbackUsed,
      final_match: false,
    });
  }

  console.warn(
    `[youtubeSearch] all queries failed title="${title}" artist="${artist}" pressure=${pressure} tried=${queries.length}`
  );
  return null;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
