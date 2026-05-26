/**
 * YouTube 재생 가능성 검증 (Node — verify:tracks:playback)
 */
import type { Track } from '../../src/types/track';

export type PlaybackVerifyStatus =
  | 'playable'
  | 'invalid_id'
  | 'not_found'
  | 'embedding_restricted'
  | 'blocked'
  | 'network_error'
  | 'api_error';

export type PlaybackVerifySeverity = 'critical' | 'warning' | 'info';

export type PlaybackVerifyResult = {
  track: Track;
  youtubeId: string;
  status: PlaybackVerifyStatus;
  severity: PlaybackVerifySeverity;
  detail?: string;
  /** embed check 시 채널 정보 */
  channelTitle?: string;
};

/** embed 허용 후보 검색 결과 */
export type EmbedSafeCandidate = {
  youtubeId: string;
  title: string;
  channelTitle: string;
  isOfficialAudio: boolean;
  isTopicChannel: boolean;
};

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function severityOf(status: PlaybackVerifyStatus): PlaybackVerifySeverity {
  switch (status) {
    case 'playable':
      return 'info';
    case 'embedding_restricted':
    case 'not_found':
    case 'blocked':
      return 'critical';
    case 'invalid_id':
      return 'critical';
    case 'network_error':
    case 'api_error':
      return 'warning';
  }
}

export async function checkOEmbed(
  youtubeId: string
): Promise<'ok' | 'not_found' | 'network_error'> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`
  )}&format=json`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.status === 404 || res.status === 401) return 'not_found';
    if (!res.ok) return 'network_error';
    return 'ok';
  } catch {
    return 'network_error';
  }
}

export async function checkEmbeddableViaApi(
  youtubeId: string,
  apiKey: string
): Promise<{
  result: 'embeddable' | 'embedding_restricted' | 'not_found' | 'api_error';
  channelTitle?: string;
}> {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'status,snippet');
  url.searchParams.set('id', youtubeId);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url);
    if (!res.ok) return { result: 'api_error' };
    const data = (await res.json()) as {
      items?: Array<{
        snippet?: { channelTitle?: string };
        status?: { embeddable?: boolean };
      }>;
    };
    const item = data.items?.[0];
    if (!item) return { result: 'not_found' };
    const channelTitle = item.snippet?.channelTitle ?? '';
    if (item.status?.embeddable === false) {
      return { result: 'embedding_restricted', channelTitle };
    }
    return { result: 'embeddable', channelTitle };
  } catch {
    return { result: 'api_error' };
  }
}

/**
 * YouTube Search API로 embed-safe 대체 후보 검색.
 * "Artist - Title" official audio 우선.
 */
export async function searchEmbedSafeCandidates(
  artist: string,
  title: string,
  apiKey: string,
  maxResults = 5
): Promise<EmbedSafeCandidate[]> {
  const query = `${artist} ${title} official audio`;
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: { title?: string; channelTitle?: string };
      }>;
    };

    return (data.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item) => {
        const ch = item.snippet?.channelTitle ?? '';
        const t = item.snippet?.title ?? '';
        return {
          youtubeId: item.id!.videoId!,
          title: t,
          channelTitle: ch,
          isOfficialAudio: /official\s*(audio|video|mv)/i.test(t),
          isTopicChannel: /- topic$/i.test(ch) || /official/i.test(ch),
        };
      })
      .sort((a, b) => {
        const scoreA = (a.isOfficialAudio ? 2 : 0) + (a.isTopicChannel ? 1 : 0);
        const scoreB = (b.isOfficialAudio ? 2 : 0) + (b.isTopicChannel ? 1 : 0);
        return scoreB - scoreA;
      });
  } catch {
    return [];
  }
}

export async function verifyTrackPlayback(
  track: Track,
  options?: { youtubeApiKey?: string; delayMs?: number }
): Promise<PlaybackVerifyResult> {
  const youtubeId = track.youtubeId?.trim() ?? '';
  const delayMs = options?.delayMs ?? 120;

  if (!YOUTUBE_ID_RE.test(youtubeId)) {
    return {
      track,
      youtubeId,
      status: 'invalid_id',
      severity: 'critical',
      detail: 'youtube_id must be 11 characters',
    };
  }

  const oembed = await checkOEmbed(youtubeId);
  await sleep(delayMs);

  if (oembed === 'network_error') {
    return { track, youtubeId, status: 'network_error', severity: 'warning', detail: 'oEmbed failed' };
  }
  if (oembed === 'not_found') {
    return { track, youtubeId, status: 'not_found', severity: 'critical', detail: 'oEmbed 404' };
  }

  if (options?.youtubeApiKey) {
    const { result: api, channelTitle } = await checkEmbeddableViaApi(youtubeId, options.youtubeApiKey);
    await sleep(delayMs);

    if (api === 'not_found') {
      return { track, youtubeId, status: 'not_found', severity: 'critical', detail: 'Data API: no item' };
    }
    if (api === 'embedding_restricted') {
      return {
        track,
        youtubeId,
        status: 'embedding_restricted',
        severity: 'critical',
        detail: 'status.embeddable=false',
        channelTitle,
      };
    }
    if (api === 'api_error') {
      return { track, youtubeId, status: 'api_error', severity: 'warning', detail: 'YouTube Data API error' };
    }
  }

  return { track, youtubeId, status: 'playable', severity: 'info' };
}
