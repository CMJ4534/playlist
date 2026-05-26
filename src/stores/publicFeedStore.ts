import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_PUBLIC_PLAYLISTS } from '@/data/mockFeed';
import type {
  PublicPlaylist,
  PlaylistComment,
  FeedFilter,
} from '@/types/publicPlaylist';

type PublicFeedState = {
  playlists: PublicPlaylist[];
  likedPlaylistIds: Set<string>;
  filter: FeedFilter;
};

type PublicFeedActions = {
  setFilter: (f: FeedFilter) => void;
  getFiltered: () => PublicPlaylist[];
  toggleLike: (playlistId: string) => void;
  isLiked: (playlistId: string) => boolean;
  addComment: (playlistId: string, userName: string, text: string) => void;
  getById: (id: string) => PublicPlaylist | undefined;
  incrementSaves: (playlistId: string) => void;
};

export const usePublicFeedStore = create<PublicFeedState & PublicFeedActions>()(
  persist(
    (set, get) => ({
      playlists: MOCK_PUBLIC_PLAYLISTS,
      likedPlaylistIds: new Set<string>(),
      filter: 'latest' as FeedFilter,

      setFilter: (f) => set({ filter: f }),

      getFiltered: () => {
        const { playlists, filter } = get();
        let filtered = [...playlists];

        if (filter === 'popular') {
          filtered.sort((a, b) => b.likesCount - a.likesCount);
        } else if (filter === 'latest') {
          filtered.sort((a, b) => b.createdAt - a.createdAt);
        } else {
          filtered = filtered
            .filter((p) => p.emotionId === filter)
            .sort((a, b) => b.createdAt - a.createdAt);
        }

        return filtered;
      },

      toggleLike: (playlistId) =>
        set((state) => {
          const next = new Set(state.likedPlaylistIds);
          const playlists = state.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            if (next.has(playlistId)) {
              next.delete(playlistId);
              return { ...p, likesCount: Math.max(0, p.likesCount - 1) };
            }
            next.add(playlistId);
            return { ...p, likesCount: p.likesCount + 1 };
          });
          return { likedPlaylistIds: next, playlists };
        }),

      isLiked: (playlistId) => get().likedPlaylistIds.has(playlistId),

      addComment: (playlistId, userName, text) =>
        set((state) => {
          const comment: PlaylistComment = {
            id: `c-${Date.now()}`,
            userId: 'local-user',
            userName,
            text,
            createdAt: Date.now(),
          };
          const playlists = state.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, comments: [...p.comments, comment] }
              : p
          );
          return { playlists };
        }),

      getById: (id) => get().playlists.find((p) => p.id === id),

      incrementSaves: (playlistId) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId ? { ...p, savesCount: p.savesCount + 1 } : p
          ),
        })),
    }),
    {
      name: 'moodplay-public-feed',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        likedPlaylistIds: [...state.likedPlaylistIds],
      }),
      merge: (persisted, current) => {
        const p = persisted as { likedPlaylistIds?: string[] } | undefined;
        return {
          ...current,
          likedPlaylistIds: new Set(p?.likedPlaylistIds ?? []),
        };
      },
    }
  )
);
