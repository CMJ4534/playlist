/**
 * YouTube Music Platform Service
 *
 * Phase 1: 딥링크 열기만 구현 (OAuth 없이)
 * Phase 2: OAuth + Playlist API 연동
 */
import { Linking } from 'react-native';

import type {
  MusicPlatformService,
  PlatformAuth,
  CreatePlaylistInput,
  CreatePlaylistResult,
  TrackSearchResult,
} from './types';

export class YouTubePlatformService implements MusicPlatformService {
  readonly platformId = 'youtube' as const;

  async getAuthStatus(): Promise<PlatformAuth> {
    // Phase 2: SecureStore에서 토큰 확인
    return { platform: 'youtube', status: 'not_connected' };
  }

  async connect(): Promise<PlatformAuth> {
    // Phase 2: expo-auth-session으로 Google OAuth
    throw new Error('YouTube OAuth not yet implemented. Coming in Phase 2.');
  }

  async disconnect(): Promise<void> {
    // Phase 2: SecureStore 토큰 삭제 + Google revoke
  }

  async createPlaylist(
    _input: CreatePlaylistInput
  ): Promise<CreatePlaylistResult> {
    // Phase 2: YouTube Data API v3
    return {
      success: false,
      error: 'YouTube playlist creation not yet implemented. Coming in Phase 2.',
    };
  }

  async addTracksToPlaylist(
    _externalPlaylistId: string,
    _tracks: { youtubeId: string; title: string; artist: string }[]
  ): Promise<{ added: number; failed: number }> {
    return { added: 0, failed: 0 };
  }

  async openPlaylist(externalPlaylistId: string): Promise<void> {
    const appUrl = `youtube://www.youtube.com/playlist?list=${externalPlaylistId}`;
    const webUrl = `https://www.youtube.com/playlist?list=${externalPlaylistId}`;

    const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  }

  async openTrack(youtubeId: string): Promise<void> {
    const appUrl = `youtube://www.youtube.com/watch?v=${youtubeId}`;
    const webUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

    const canOpen = await Linking.canOpenURL(appUrl).catch(() => false);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  }

  async searchTrack(
    _title: string,
    _artist: string
  ): Promise<TrackSearchResult | null> {
    // Phase 2: YouTube Data API search
    return null;
  }
}
