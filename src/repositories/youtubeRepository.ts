import { normalizeTrack } from '@/lib/trackUtils';
import { getYoutubeThumbnailUrl } from '@/lib/youtubeThumbnail';
import { MOCK_TRACKS } from '@/data/mockTracks';
import type { Track } from '@/types/track';

import type {
  ResolveTrackInput,
  YoutubeRepository,
  YoutubeSearchResult,
} from './types';

/**
 * YouTube Data API v3 — EXPO_PUBLIC_YOUTUBE_API_KEY 설정 시 활성화.
 */
export class YoutubeDataApiRepository implements YoutubeRepository {
  constructor(private readonly apiKey: string) {}

  async searchVideos(query: string, limit = 5): Promise<YoutubeSearchResult[]> {
    if (!this.apiKey) {
      throw new Error('YoutubeDataApiRepository: EXPO_PUBLIC_YOUTUBE_API_KEY가 없습니다.');
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(limit));
    url.searchParams.set('q', query);
    url.searchParams.set('key', this.apiKey);

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.items ?? []).map((item: Record<string, unknown>) => {
      const id = (item.id as { videoId?: string })?.videoId ?? '';
      const snippet = item.snippet as {
        title?: string;
        channelTitle?: string;
        thumbnails?: {
          high?: { url?: string };
          default?: { url?: string };
        };
      } | undefined;
      const thumbs = snippet?.thumbnails;
      return {
        youtubeId: id,
        title: snippet?.title ?? '',
        channelTitle: snippet?.channelTitle ?? '',
        thumbnailUrl:
          thumbs?.high?.url ??
          thumbs?.default?.url ??
          getYoutubeThumbnailUrl(id, 'hq'),
      };
    });
  }

  async resolveTrack(input: ResolveTrackInput): Promise<Track | null> {
    const query = input.searchQuery?.trim() || `${input.title} ${input.artist}`.trim();
    const results = await this.searchVideos(query, 1);
    const hit = results[0];
    if (!hit?.youtubeId) return null;

    return normalizeTrack({
      id: input.id ?? `yt-${hit.youtubeId}`,
      youtubeId: hit.youtubeId,
      title: input.title || hit.title,
      artist: input.artist || hit.channelTitle,
      thumbnailUrl: hit.thumbnailUrl,
      durationSec: hit.durationSec,
    });
  }
}

/** 개발용 — MOCK에서 title/artist 매칭 후 없으면 null */
export class StubYoutubeRepository implements YoutubeRepository {
  async searchVideos(): Promise<YoutubeSearchResult[]> {
    return [];
  }

  async resolveTrack(input: ResolveTrackInput): Promise<Track | null> {
    const q = `${input.title} ${input.artist}`.toLowerCase();
    const hit = MOCK_TRACKS.find(
      (t) =>
        t.title.toLowerCase().includes(input.title.toLowerCase()) ||
        q.includes(t.title.toLowerCase())
    );
    return hit ?? null;
  }
}

export function createYoutubeRepository(): YoutubeRepository {
  const key = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
  if (key) return new YoutubeDataApiRepository(key);
  return new StubYoutubeRepository();
}
