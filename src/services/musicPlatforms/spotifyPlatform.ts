/**
 * Spotify Music Platform Service (Stub)
 *
 * Phase 2+: Spotify Web API 연동
 * 현재는 딥링크 열기만 지원
 */
import { Linking } from 'react-native';

import type {
  MusicPlatformService,
  PlatformAuth,
  CreatePlaylistInput,
  CreatePlaylistResult,
  TrackSearchResult,
} from './types';

export class SpotifyPlatformService implements MusicPlatformService {
  readonly platformId = 'spotify' as const;

  async getAuthStatus(): Promise<PlatformAuth> {
    return { platform: 'spotify', status: 'not_connected' };
  }

  async connect(): Promise<PlatformAuth> {
    throw new Error('Spotify OAuth not yet implemented.');
  }

  async disconnect(): Promise<void> {}

  async createPlaylist(
    _input: CreatePlaylistInput
  ): Promise<CreatePlaylistResult> {
    return { success: false, error: 'Spotify integration coming soon.' };
  }

  async addTracksToPlaylist(
    _id: string,
    _tracks: { youtubeId: string; title: string; artist: string }[]
  ): Promise<{ added: number; failed: number }> {
    return { added: 0, failed: 0 };
  }

  async openPlaylist(_id: string): Promise<void> {
    await Linking.openURL('https://open.spotify.com');
  }

  async openTrack(spotifyUri: string): Promise<void> {
    const url = spotifyUri.startsWith('spotify:')
      ? spotifyUri
      : `https://open.spotify.com/track/${spotifyUri}`;
    await Linking.openURL(url);
  }

  async searchTrack(
    _title: string,
    _artist: string
  ): Promise<TrackSearchResult | null> {
    return null;
  }
}
