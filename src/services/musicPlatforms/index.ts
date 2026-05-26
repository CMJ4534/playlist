export type { MusicPlatformService, MusicPlatformId } from './types';
export { YouTubePlatformService } from './youtubePlatform';
export { SpotifyPlatformService } from './spotifyPlatform';
export { AppleMusicPlatformService } from './appleMusicPlatform';

import type { MusicPlatformId, MusicPlatformService } from './types';
import { YouTubePlatformService } from './youtubePlatform';
import { SpotifyPlatformService } from './spotifyPlatform';
import { AppleMusicPlatformService } from './appleMusicPlatform';

const platforms: Record<MusicPlatformId, MusicPlatformService> = {
  youtube: new YouTubePlatformService(),
  spotify: new SpotifyPlatformService(),
  apple_music: new AppleMusicPlatformService(),
};

export function getMusicPlatform(id: MusicPlatformId): MusicPlatformService {
  return platforms[id];
}

export function getYouTubePlatform(): YouTubePlatformService {
  return platforms.youtube as YouTubePlatformService;
}
