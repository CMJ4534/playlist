/**
 * Apple Music Platform Service (Stub)
 *
 * Phase 3+: MusicKit 연동
 * 현재는 placeholder만 구현
 */
import { Linking } from 'react-native';

import type {
  MusicPlatformService,
  PlatformAuth,
  CreatePlaylistInput,
  CreatePlaylistResult,
  TrackSearchResult,
} from './types';

export class AppleMusicPlatformService implements MusicPlatformService {
  readonly platformId = 'apple_music' as const;

  async getAuthStatus(): Promise<PlatformAuth> {
    return { platform: 'apple_music', status: 'not_connected' };
  }

  async connect(): Promise<PlatformAuth> {
    throw new Error('Apple Music integration not yet implemented.');
  }

  async disconnect(): Promise<void> {}

  async createPlaylist(
    _input: CreatePlaylistInput
  ): Promise<CreatePlaylistResult> {
    return { success: false, error: 'Apple Music integration coming soon.' };
  }

  async addTracksToPlaylist(
    _id: string,
    _tracks: { youtubeId: string; title: string; artist: string }[]
  ): Promise<{ added: number; failed: number }> {
    return { added: 0, failed: 0 };
  }

  async openPlaylist(_id: string): Promise<void> {
    await Linking.openURL('https://music.apple.com');
  }

  async openTrack(appleMusicId: string): Promise<void> {
    await Linking.openURL(
      `https://music.apple.com/song/${appleMusicId}`
    );
  }

  async searchTrack(
    _title: string,
    _artist: string
  ): Promise<TrackSearchResult | null> {
    return null;
  }
}
