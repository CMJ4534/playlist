import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import type { SavedPlaylistRecord } from '@/types/savedPlaylist';
import { EMOTIONS } from '@/constants/emotions';

export type ShareCardModel = {
  emotionLabel: string;
  emotionEmoji: string;
  playlistName: string;
  highlightTracks: Array<{ title: string; artist: string }>;
  trackCount: number;
  accentColor: string;
};

export function buildShareCardModel(
  playlist: SavedPlaylistRecord
): ShareCardModel {
  const emotion = EMOTIONS.find((e) => e.id === playlist.emotionId);
  return {
    emotionLabel: emotion?.label ?? playlist.emotionId,
    emotionEmoji: emotion?.emoji ?? '🎧',
    playlistName: playlist.title,
    highlightTracks: playlist.tracks.slice(0, 3).map((t) => ({
      title: t.title,
      artist: t.artist,
    })),
    trackCount: playlist.tracks.length,
    accentColor: emotion?.accent ?? '#8B7CFF',
  };
}

/**
 * View ref(PlaylistShareCard) → PNG → OS 공유 시트.
 */
export async function exportShareCardPng(
  viewRef: RefObject<View | null>
): Promise<string | null> {
  if (!viewRef.current) return null;

  const uri = await captureRef(viewRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });

  return uri;
}

export async function sharePlaylistCardImage(
  viewRef: RefObject<View | null>,
  playlistName: string
): Promise<boolean> {
  try {
    const uri = await exportShareCardPng(viewRef);
    if (!uri) return false;

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return false;

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: `${playlistName} · Moodplay`,
      UTI: 'public.png',
    });
    return true;
  } catch (err) {
    if (__DEV__) {
      console.warn('[playlistShareService]', err);
    }
    return false;
  }
}
