import type { RecommendTrackDto } from './types.ts';

type DbTrackRow = {
  id: string;
  title: string;
  artist: string;
  youtube_id: string | null;
  thumbnail_url: string | null;
  mood_tags: string[] | null;
  energy_level: number | null;
  duration_sec: number | null;
};

/**
 * youtube_id 없는 행·검색 쿼리 보완.
 * YOUTUBE_API_KEY 있으면 Data API, 없으면 DB title/artist 매칭 또는 placeholder.
 */
export async function resolveYoutubeForTrack(
  partial: Pick<DbTrackRow, 'id' | 'title' | 'artist' | 'youtube_id' | 'thumbnail_url' | 'mood_tags' | 'energy_level' | 'duration_sec'>,
  searchQuery?: string
): Promise<RecommendTrackDto | null> {
  if (partial.youtube_id?.trim()) {
    return rowToDto(partial as DbTrackRow);
  }

  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  const query = searchQuery?.trim() || `${partial.title} ${partial.artist}`.trim();

  if (apiKey && query) {
    try {
      const found = await youtubeSearch(apiKey, query);
      if (found) {
        return {
          id: partial.id,
          youtubeId: found.youtubeId,
          title: partial.title,
          artist: partial.artist,
          thumbnailUrl: found.thumbnailUrl,
          durationSec: partial.duration_sec,
          moodTags: partial.mood_tags ?? undefined,
          energyLevel: partial.energy_level,
        };
      }
    } catch (e) {
      console.warn('[youtubeResolver] search failed:', e);
    }
  }

  return null;
}

async function youtubeSearch(
  apiKey: string,
  query: string
): Promise<{ youtubeId: string; thumbnailUrl: string } | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const item = data.items?.[0];
  const videoId = item?.id?.videoId;
  if (!videoId) return null;

  const thumb =
    item.snippet?.thumbnails?.high?.url ??
    item.snippet?.thumbnails?.default?.url ??
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return { youtubeId: videoId, thumbnailUrl: thumb };
}

function rowToDto(row: DbTrackRow): RecommendTrackDto {
  const youtubeId = row.youtube_id!;
  const thumbnailUrl =
    row.thumbnail_url?.trim() ||
    `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  return {
    id: row.id,
    youtubeId,
    title: row.title,
    artist: row.artist,
    thumbnailUrl,
    durationSec: row.duration_sec,
    moodTags: row.mood_tags ?? undefined,
    energyLevel: row.energy_level,
  };
}
