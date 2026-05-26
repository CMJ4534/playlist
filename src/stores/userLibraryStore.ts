import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { trackEvent } from '@/services/analytics/analyticsService';
import type { SavePlaylistInput, SavedPlaylistRecord } from '@/types/savedPlaylist';
import type { Track } from '@/types/track';

export const MAX_SAVED_PLAYLISTS = 100;
const MAX_LIKED = 200;

export type LikedTrackEntry = {
  youtubeId: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  moodTags?: string[];
  energyLevel?: number;
  likedAt: number;
};

/** @deprecated SavedPlaylistRecord 사용 */
export type SavedPlaylistEntry = SavedPlaylistRecord;

export type PlaylistQualityRating = 1 | 3 | 5;

type UserLibraryStore = {
  likedByYoutubeId: Record<string, LikedTrackEntry>;
  savedPlaylists: SavedPlaylistRecord[];
  replayCountByPlaylistId: Record<string, number>;
  qualityRatingBySessionId: Record<string, PlaylistQualityRating>;

  toggleLikeTrack: (track: Track) => boolean;
  isTrackLiked: (youtubeId: string) => boolean;
  savePlaylist: (input: SavePlaylistInput) => SavedPlaylistRecord;
  removeSavedPlaylist: (id: string) => boolean;
  getSavedPlaylist: (id: string) => SavedPlaylistRecord | undefined;
  listSavedPlaylists: () => SavedPlaylistRecord[];
  recordSavedReplay: (savedPlaylistId: string) => number;
  recordQualityRating: (
    playlistSessionId: string,
    rating: PlaylistQualityRating
  ) => void;
  getLikedYoutubeIds: () => string[];
  clear: () => void;
};

function uid(): string {
  return `saved_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultMeta(): SavedPlaylistRecord['meta'] {
  return {
    visibility: 'private',
    shareSlug: null,
    ownerUserId: null,
    feedPostId: null,
  };
}

export const useUserLibraryStore = create<UserLibraryStore>()(
  persist(
    (set, get) => ({
      likedByYoutubeId: {},
      savedPlaylists: [],
      replayCountByPlaylistId: {},
      qualityRatingBySessionId: {},

      toggleLikeTrack: (track) => {
        const id = track.youtubeId?.trim();
        if (!id) return false;

        const liked = { ...get().likedByYoutubeId };
        const wasLiked = Boolean(liked[id]);

        if (wasLiked) {
          delete liked[id];
          trackEvent('track_unliked', { youtubeId: id });
        } else {
          liked[id] = {
            youtubeId: id,
            title: track.title,
            artist: track.artist,
            thumbnailUrl: track.thumbnailUrl,
            moodTags: track.moodTags,
            energyLevel: track.energyLevel,
            likedAt: Date.now(),
          };
          trackEvent('track_liked', { youtubeId: id, artist: track.artist });
        }

        const entries = Object.values(liked)
          .sort((a, b) => b.likedAt - a.likedAt)
          .slice(0, MAX_LIKED);
        set({
          likedByYoutubeId: Object.fromEntries(
            entries.map((e) => [e.youtubeId, e])
          ),
        });
        return !wasLiked;
      },

      isTrackLiked: (youtubeId) => Boolean(get().likedByYoutubeId[youtubeId]),

      savePlaylist: (input) => {
        const now = Date.now();
        const entry: SavedPlaylistRecord = {
          id: uid(),
          emotionId: input.emotionId,
          title: input.title,
          description: input.description,
          tracks: input.tracks,
          savedAt: now,
          createdAt: now,
          sourcePlaylistHistoryId: input.sourcePlaylistHistoryId,
          replayCount: 0,
          meta: { ...defaultMeta(), ...input.meta },
        };

        const withoutDup = get().savedPlaylists.filter(
          (p) => p.title !== entry.title || p.emotionId !== entry.emotionId
        );
        const savedPlaylists = [entry, ...withoutDup].slice(0, MAX_SAVED_PLAYLISTS);
        set({ savedPlaylists });

        trackEvent('playlist_saved', {
          emotionId: input.emotionId,
          trackCount: input.tracks.length,
        });
        return entry;
      },

      removeSavedPlaylist: (id) => {
        const prev = get().savedPlaylists;
        if (!prev.some((p) => p.id === id)) return false;
        set({ savedPlaylists: prev.filter((p) => p.id !== id) });
        return true;
      },

      getSavedPlaylist: (id) => get().savedPlaylists.find((p) => p.id === id),

      listSavedPlaylists: () =>
        [...get().savedPlaylists].sort((a, b) => b.savedAt - a.savedAt),

      recordSavedReplay: (savedPlaylistId) => {
        const counts = { ...get().replayCountByPlaylistId };
        const next = (counts[savedPlaylistId] ?? 0) + 1;
        counts[savedPlaylistId] = next;

        const savedPlaylists = get().savedPlaylists.map((p) =>
          p.id === savedPlaylistId ? { ...p, replayCount: next } : p
        );

        set({ replayCountByPlaylistId: counts, savedPlaylists });
        trackEvent('playlist_replayed', {
          playlistHistoryId: savedPlaylistId,
          replayCount: next,
        });
        return next;
      },

      recordQualityRating: (playlistSessionId, rating) => {
        set({
          qualityRatingBySessionId: {
            ...get().qualityRatingBySessionId,
            [playlistSessionId]: rating,
          },
        });
      },

      getLikedYoutubeIds: () => Object.keys(get().likedByYoutubeId),

      clear: () =>
        set({
          likedByYoutubeId: {},
          savedPlaylists: [],
          replayCountByPlaylistId: {},
          qualityRatingBySessionId: {},
        }),
    }),
    {
      name: 'moodplay-user-library',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
