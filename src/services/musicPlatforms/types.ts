/**
 * External Music Platform Abstraction Layer
 *
 * MoodPlay는 직접 재생하지 않고, 외부 플랫폼(YouTube, Spotify, Apple Music)으로
 * 플레이리스트를 내보내거나 곡을 열어주는 역할.
 */

export type MusicPlatformId = 'youtube' | 'spotify' | 'apple_music';

export type PlatformAuthStatus =
  | 'not_connected'
  | 'connected'
  | 'expired'
  | 'revoked';

export type PlatformAuth = {
  platform: MusicPlatformId;
  status: PlatformAuthStatus;
  userId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  connectedAt?: number;
};

export type ExternalPlaylistRef = {
  platform: MusicPlatformId;
  externalId: string;
  url: string;
  title: string;
  trackCount: number;
  exportedAt: number;
};

export type TrackSearchResult = {
  platform: MusicPlatformId;
  externalId: string;
  title: string;
  artist: string;
  albumName?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  url: string;
};

export type CreatePlaylistInput = {
  title: string;
  description?: string;
  privacy?: 'private' | 'unlisted' | 'public';
  tracks: { youtubeId: string; title: string; artist: string }[];
};

export type CreatePlaylistResult = {
  success: boolean;
  externalRef?: ExternalPlaylistRef;
  error?: string;
  failedTracks?: { youtubeId: string; reason: string }[];
};

/**
 * 각 음악 플랫폼이 구현해야 하는 공통 인터페이스.
 *
 * Phase 1: YouTube만 구현
 * Phase 2: Spotify, Apple Music 추가
 */
export interface MusicPlatformService {
  readonly platformId: MusicPlatformId;

  /** 현재 인증 상태 확인 */
  getAuthStatus(): Promise<PlatformAuth>;

  /** OAuth 인증 시작 (브라우저 열림) */
  connect(): Promise<PlatformAuth>;

  /** 연결 해제 (토큰 삭제) */
  disconnect(): Promise<void>;

  /** 플레이리스트 생성 + 트랙 추가 */
  createPlaylist(input: CreatePlaylistInput): Promise<CreatePlaylistResult>;

  /** 기존 플레이리스트에 트랙 추가 */
  addTracksToPlaylist(
    externalPlaylistId: string,
    tracks: { youtubeId: string; title: string; artist: string }[]
  ): Promise<{ added: number; failed: number }>;

  /** 외부 앱에서 플레이리스트 열기 (딥링크) */
  openPlaylist(externalPlaylistId: string): Promise<void>;

  /** 외부 앱에서 단일 곡 열기 (딥링크) */
  openTrack(trackId: string): Promise<void>;

  /** 곡 검색 (cross-platform 매칭용) */
  searchTrack(
    title: string,
    artist: string
  ): Promise<TrackSearchResult | null>;
}
