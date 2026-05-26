import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import type { VideoItem } from '@/services/moodplayApi';
import { openYouTubeVideo } from '@/services/youtubeOpen';

type Props = {
  video: VideoItem;
  index: number;
};

export function TrackListItem({ video, index }: Props) {
  const handleOpen = () => {
    openYouTubeVideo(video.videoId);
  };

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.index}>{index + 1}</Text>

      {video.thumbnailUrl ? (
        <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbIcon}>🎵</Text>
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {video.artist || video.channelTitle}
        </Text>
        {video.mood ? (
          <View style={styles.tagRow}>
            <View style={styles.moodTag}>
              <Text style={styles.moodTagText}>#{video.mood}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.playBtn}>
        <Text style={styles.playIcon}>▶</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: moodTheme.border,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: moodTheme.surfaceElevated,
  },
  index: {
    width: 22,
    fontSize: 13,
    color: moodTheme.textDim,
    fontWeight: '700',
    textAlign: 'center',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: moodTheme.surfaceElevated,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 20,
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: moodTheme.text,
    lineHeight: 19,
  },
  artist: {
    fontSize: 12,
    color: moodTheme.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  moodTag: {
    backgroundColor: 'rgba(139, 124, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  moodTagText: {
    fontSize: 10,
    color: moodTheme.primary,
    fontWeight: '600',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 12,
    color: '#FF0000',
  },
});
