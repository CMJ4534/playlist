import type { EmotionId } from './emotion';
import type { Track } from './track';

export type PlaylistVisibilityLevel = 'private' | 'unlisted' | 'public';

export type PublicPlaylistTrack = Pick<
  Track,
  'id' | 'youtubeId' | 'title' | 'artist' | 'thumbnailUrl'
>;

export type PlaylistComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
};

export type PublicPlaylist = {
  id: string;
  title: string;
  emotionId: EmotionId;
  creator: {
    id: string;
    name: string;
    avatarEmoji: string;
  };
  tracks: PublicPlaylistTrack[];
  caption: string;
  likesCount: number;
  savesCount: number;
  comments: PlaylistComment[];
  createdAt: number;
  updatedAt: number;
};

export type FeedFilter = 'latest' | 'popular' | EmotionId;
