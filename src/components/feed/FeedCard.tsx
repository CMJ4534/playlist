import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { moodTheme, moodTypography } from '@/constants/moodTheme';
import type { PublicPlaylist } from '@/types/publicPlaylist';

const EMOTION_META: Record<string, { emoji: string; label: string }> = {
  sad: { emoji: '😔', label: '우울' },
  dawn: { emoji: '🌙', label: '새벽감성' },
  focus: { emoji: '🔥', label: '집중' },
  rain: { emoji: '🌧', label: '비오는날' },
  walk: { emoji: '🚶', label: '혼자걷기' },
  blank: { emoji: '☁️', label: '멍때리기' },
};

type Props = {
  playlist: PublicPlaylist;
  isLiked: boolean;
  onPress: () => void;
  onLike: () => void;
};

export function FeedCard({ playlist, isLiked, onPress, onLike }: Props) {
  const emotion = EMOTION_META[playlist.emotionId] ?? { emoji: '🎵', label: '' };
  const top3 = playlist.tracks.slice(0, 3);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.avatar}>{playlist.creator.avatarEmoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.creatorName}>{playlist.creator.name}</Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(playlist.createdAt)}</Text>
        </View>
        <View style={styles.emotionBadge}>
          <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
          <Text style={styles.emotionLabel}>{emotion.label}</Text>
        </View>
      </View>

      {/* Title + Caption */}
      <Text style={styles.title}>{playlist.title}</Text>
      <Text style={styles.caption}>{playlist.caption}</Text>

      {/* Track previews */}
      <View style={styles.tracksRow}>
        {top3.map((track, i) => (
          <View key={track.id} style={styles.trackItem}>
            <Image
              source={{ uri: track.thumbnailUrl }}
              style={styles.trackThumb}
            />
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
            {i < top3.length - 1 && <View style={styles.trackDivider} />}
          </View>
        ))}
      </View>

      {/* Footer: likes, saves, comments */}
      <View style={styles.footer}>
        <Pressable
          style={styles.footerBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onLike();
          }}
          hitSlop={8}>
          <FontAwesome
            name={isLiked ? 'heart' : 'heart-o'}
            size={16}
            color={isLiked ? '#FF6B8A' : moodTheme.textDim}
          />
          <Text style={[styles.footerText, isLiked && styles.likedText]}>
            {playlist.likesCount}
          </Text>
        </Pressable>

        <View style={styles.footerBtn}>
          <FontAwesome name="bookmark-o" size={16} color={moodTheme.textDim} />
          <Text style={styles.footerText}>{playlist.savesCount}</Text>
        </View>

        <View style={styles.footerBtn}>
          <FontAwesome name="comment-o" size={16} color={moodTheme.textDim} />
          <Text style={styles.footerText}>{playlist.comments.length}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.lg,
    borderWidth: 1,
    borderColor: moodTheme.border,
    padding: moodTheme.spacing.md,
    marginBottom: moodTheme.spacing.md,
  },
  pressed: { opacity: 0.88 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moodTheme.spacing.sm,
  },
  avatar: { fontSize: 28, marginRight: moodTheme.spacing.sm },
  headerText: { flex: 1 },
  creatorName: {
    color: moodTheme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  timeAgo: {
    color: moodTheme.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: moodTheme.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: moodTheme.radius.sm,
  },
  emotionEmoji: { fontSize: 14, marginRight: 4 },
  emotionLabel: {
    color: moodTheme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  title: {
    ...moodTypography.title,
    color: moodTheme.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  caption: {
    ...moodTypography.caption,
    color: moodTheme.textMuted,
    marginBottom: moodTheme.spacing.md,
  },

  tracksRow: {
    backgroundColor: moodTheme.surfaceElevated,
    borderRadius: moodTheme.radius.md,
    padding: moodTheme.spacing.sm,
    marginBottom: moodTheme.spacing.md,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  trackThumb: {
    width: 40,
    height: 40,
    borderRadius: moodTheme.radius.sm,
    marginRight: moodTheme.spacing.sm,
  },
  trackInfo: { flex: 1 },
  trackTitle: {
    color: moodTheme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  trackArtist: {
    color: moodTheme.textDim,
    fontSize: 12,
    marginTop: 1,
  },
  trackDivider: {
    position: 'absolute',
    bottom: 0,
    left: 48,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: moodTheme.border,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moodTheme.spacing.lg,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: moodTheme.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  likedText: { color: '#FF6B8A' },
});
