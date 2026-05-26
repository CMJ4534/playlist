/**
 * 실기기 QA Action — DEV에서 재생 테스트 시나리오를 직접 수행하기 위한 도구.
 * queue 강제 생성, youtubeId 직접 재생, retry 강제 실행, autoplay 테스트 등.
 */
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaybackDebugStore } from '@/stores/playbackDebugStore';
import type { Track } from '@/types/track';

const SAMPLE_TRACKS: Track[] = [
  {
    id: 'qa-1',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    durationSec: 212,
  },
  {
    id: 'qa-2',
    youtubeId: 'kJQP7kiw5Fk',
    title: 'Despacito',
    artist: 'Luis Fonsi',
    thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
    durationSec: 282,
  },
  {
    id: 'qa-3',
    youtubeId: '9bZkp7q19f0',
    title: 'Gangnam Style',
    artist: 'PSY',
    thumbnailUrl: 'https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg',
    durationSec: 252,
  },
  {
    id: 'qa-4',
    youtubeId: 'JGwWNGJdvx8',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg',
    durationSec: 263,
  },
  {
    id: 'qa-5',
    youtubeId: 'RgKAFK5djSk',
    title: 'See You Again',
    artist: 'Wiz Khalifa ft. Charlie Puth',
    thumbnailUrl: 'https://i.ytimg.com/vi/RgKAFK5djSk/mqdefault.jpg',
    durationSec: 237,
  },
];

// ─── 100% Embed-Safe Test Tracks ──────────────────
// Topic 채널 / Official Audio만 사용.
// catalogMeta verifiedStatus='playable' 확인 완료 또는 Topic 채널 패턴.
// embed_not_allowed 가능성 0%인 곡만 포함.

function t(
  idx: number,
  youtubeId: string,
  title: string,
  artist: string,
  source: string,
): Track {
  return {
    id: `playable-${idx}`,
    youtubeId,
    title,
    artist,
    thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
    moodTags: [source],
  };
}

export const TEST_PLAYABLE_TRACKS: Track[] = [
  // ── catalogMeta verified (Topic 채널) ──
  t(1,  'UQ8cXH7qbVU', 'Someone Like You',    'Adele',         'topic-verified'),
  t(2,  'fRQg_9ulGuI', 'Summertime Sadness',   'Lana Del Rey',  'topic-verified'),
  t(3,  'ZO1xdXOXarc', '봄날 (Spring Day)',     'BTS',           'topic-verified'),
  t(4,  'iOKRYIMhaDk', 'Love poem',            'IU',            'topic-verified'),
  t(5,  '5_IYVichXbA', 'eight',                'IU',            'topic-verified'),
  t(6,  'AlwmaGcMjNE', 'ON (Feat. Sia)',       'BTS',           'topic-verified'),
  t(7,  '9qnqYL0eNNI', 'Yellow',              'Coldplay',      'topic-verified'),
  // ── Lofi / Ambient (채널 자체가 embed 허용) ──
  t(8,  'jfKfPfyJRdk', 'lofi hip hop radio',   'Lofi Girl',     'lofi-channel'),
  t(9,  'rUxyKA_-grg', 'jazz/lofi radio',      'Lofi Girl',     'lofi-channel'),
  // ── Topic 채널 (인디/클래식 — embed 제한 극히 낮음) ──
  t(10, 'pZ31pyTZdh0', 'Apocalypse',           'Cigarettes After Sex', 'topic-indie'),
  t(11, 'RxabLA7UQ9k', 'Time',                'Hans Zimmer',   'topic-ost'),
  t(12, 'hN_q-_nGUG4', 'Experience',          'Ludovico Einaudi', 'topic-classical'),
];

/** 100% embed-safe 검증 트랙으로 큐 구성 + 즉시 autoplay */
export function qaLoadPlayableTestQueue(): void {
  usePlaybackDebugStore
    .getState()
    .log('qaAction', `playable test queue (${TEST_PLAYABLE_TRACKS.length} tracks)`);
  usePlayerStore.getState().setQueue(TEST_PLAYABLE_TRACKS, 0);
}

/** 유효한 YouTube 영상 3곡으로 큐를 즉시 구성 */
export function qaForceQueue(): void {
  usePlaybackDebugStore.getState().log('qaAction', 'force queue (3 tracks)');
  usePlayerStore.getState().setQueue(SAMPLE_TRACKS.slice(0, 3), 0);
}

/** 5곡 큐 구성 */
export function qaForceQueueFull(): void {
  usePlaybackDebugStore.getState().log('qaAction', 'force queue (5 tracks)');
  usePlayerStore.getState().setQueue(SAMPLE_TRACKS, 0);
}

/** 특정 youtubeId 1곡만 즉시 재생 */
export function qaPlaySingleId(youtubeId: string): void {
  const track: Track = {
    id: `qa-single-${Date.now()}`,
    youtubeId,
    title: `QA Test (${youtubeId})`,
    artist: 'QA',
    thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
  };
  usePlaybackDebugStore.getState().log('qaAction', `play single: ${youtubeId}`);
  usePlayerStore.getState().setQueue([track], 0);
}

/** embed 불가능한 영상으로 에러 핸들링 테스트 */
export function qaPlayEmbedRestricted(): void {
  const track: Track = {
    id: 'qa-restricted',
    youtubeId: 'INVALID_ID_XXXX',
    title: 'Embed Restricted Test',
    artist: 'QA',
    thumbnailUrl: '',
  };
  usePlaybackDebugStore.getState().log('qaAction', 'play embed-restricted test');
  usePlayerStore.getState().setQueue([track, ...SAMPLE_TRACKS.slice(0, 2)], 0);
}

/** queueRevision 강제 증가 (remount 테스트) */
export function qaForceRevisionBump(): void {
  const store = usePlayerStore.getState();
  usePlaybackDebugStore.getState().log('qaAction', 'force revision bump');
  usePlayerStore.setState({ queueRevision: store.queueRevision + 1 });
}

/** 현재 재생 중인 곡에서 play toggle 테스트 */
export function qaTogglePlayPause(): void {
  usePlaybackDebugStore.getState().log('qaAction', 'toggle play/pause');
  usePlayerStore.getState().togglePlay();
}

/** 현재 상태 snapshot을 JSON 문자열로 반환 */
export function qaGetPlayerSnapshot(): string {
  const ps = usePlayerStore.getState();
  const dbg = usePlaybackDebugStore.getState();
  return JSON.stringify(
    {
      isPlaying: ps.isPlaying,
      playbackStatus: ps.playbackStatus,
      currentIndex: ps.currentIndex,
      queueLength: ps.queue.length,
      queueRevision: ps.queueRevision,
      youtubeId: ps.getCurrentYoutubeId(),
      positionSec: ps.positionSec,
      durationSec: ps.durationSec,
      errorKind: ps.playbackErrorKind,
      errorMessage: ps.playbackErrorMessage,
      iframeReady: dbg.iframeReady,
      iframeState: dbg.iframeState,
      mountCount: dbg.mountCount,
      lastSkip: dbg.lastSkipReason,
      lastError: dbg.lastError,
    },
    null,
    2
  );
}
