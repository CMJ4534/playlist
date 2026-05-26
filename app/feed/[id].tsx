import React, { useState, useCallback } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { moodTheme, moodTypography } from '@/constants/moodTheme';
import { usePublicFeedStore } from '@/stores/publicFeedStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';
import { useToastStore } from '@/stores/toastStore';
import type { Track } from '@/types/track';
import type { EmotionId } from '@/types/emotion';

const EMOTION_META: Record<string, { emoji: string; label: string }> = {
  sad: { emoji: '😔', label: '우울' },
  dawn: { emoji: '🌙', label: '새벽감성' },
  focus: { emoji: '🔥', label: '집중' },
  rain: { emoji: '🌧', label: '비오는날' },
  walk: { emoji: '🚶', label: '혼자걷기' },
  blank: { emoji: '☁️', label: '멍때리기' },
};

export default function FeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const playlist = usePublicFeedStore((s) => s.getById(id ?? ''));
  const toggleLike = usePublicFeedStore((s) => s.toggleLike);
  const isLiked = usePublicFeedStore((s) => s.isLiked);
  const addComment = usePublicFeedStore((s) => s.addComment);
  const incrementSaves = usePublicFeedStore((s) => s.incrementSaves);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const savePlaylist = useUserLibraryStore((s) => s.savePlaylist);
  const showToast = useToastStore((s) => s.show);

  const [commentText, setCommentText] = useState('');

  if (!playlist) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>플레이리스트를 찾을 수 없어요</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const emotion = EMOTION_META[playlist.emotionId] ?? { emoji: '🎵', label: '' };
  const liked = isLiked(playlist.id);

  const handlePlay = useCallback(() => {
    const tracks: Track[] = playlist.tracks.map((t) => ({
      ...t,
      durationSec: undefined,
      moodTags: [],
      energyLevel: undefined,
      noveltyTier: undefined,
    }));
    setQueue(tracks);
    showToast('재생을 시작합니다');
    router.back();
  }, [playlist, setQueue, showToast, router]);

  const handleSave = useCallback(() => {
    const emotionId = playlist.emotionId as EmotionId;
    savePlaylist({
      emotionId,
      title: playlist.title,
      description: playlist.caption,
      tracks: playlist.tracks.map((t) => ({
        ...t,
        moodTags: [],
        energyLevel: undefined,
        noveltyTier: undefined,
      })),
      meta: {
        visibility: 'private',
        shareSlug: null,
        ownerUserId: null,
        feedPostId: playlist.id,
      },
    });
    incrementSaves(playlist.id);
    showToast('내 라이브러리에 저장했어요');
  }, [playlist, savePlaylist, incrementSaves, showToast]);

  const handleComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addComment(playlist.id, '나', trimmed);
    setCommentText('');
  }, [commentText, playlist.id, addComment]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.topBar}>
          <FontAwesome name="chevron-left" size={18} color={moodTheme.text} />
          <Text style={styles.topBarText}>피드</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.avatarLarge}>{playlist.creator.avatarEmoji}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.creatorName}>{playlist.creator.name}</Text>
            <View style={styles.emotionBadge}>
              <Text style={styles.emotionText}>
                {emotion.emoji} {emotion.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Title + Caption */}
        <Text style={styles.title}>{playlist.title}</Text>
        <Text style={styles.caption}>{playlist.caption}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.playBtn]}
            onPress={handlePlay}>
            <FontAwesome name="play" size={14} color="#fff" />
            <Text style={styles.playBtnText}>재생하기</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleSave}>
            <FontAwesome name="bookmark" size={16} color={moodTheme.primary} />
            <Text style={styles.actionBtnText}>저장</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => toggleLike(playlist.id)}>
            <FontAwesome
              name={liked ? 'heart' : 'heart-o'}
              size={16}
              color={liked ? '#FF6B8A' : moodTheme.textMuted}
            />
            <Text
              style={[styles.actionBtnText, liked && { color: '#FF6B8A' }]}>
              {playlist.likesCount}
            </Text>
          </Pressable>
        </View>

        {/* Track list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수록곡</Text>
          {playlist.tracks.map((track, idx) => (
            <View key={track.id} style={styles.trackRow}>
              <Text style={styles.trackIdx}>{idx + 1}</Text>
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
            </View>
          ))}
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            감상 한줄 ({playlist.comments.length})
          </Text>

          {playlist.comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Text style={styles.commentUser}>{c.userName}</Text>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))}

          {/* Comment input */}
          <View style={styles.commentInput}>
            <TextInput
              style={styles.input}
              placeholder="감상을 남겨보세요..."
              placeholderTextColor={moodTheme.textDim}
              value={commentText}
              onChangeText={setCommentText}
              maxLength={100}
            />
            <Pressable
              style={[
                styles.sendBtn,
                !commentText.trim() && styles.sendBtnDisabled,
              ]}
              onPress={handleComment}
              disabled={!commentText.trim()}>
              <FontAwesome name="send" size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: moodTheme.bg },
  scroll: {
    padding: moodTheme.spacing.screen,
    paddingBottom: 120,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...moodTypography.body, color: moodTheme.textDim },
  backBtn: {
    marginTop: moodTheme.spacing.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.md,
  },
  backBtnText: { color: moodTheme.primary, fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moodTheme.spacing.sm,
    marginBottom: moodTheme.spacing.lg,
  },
  topBarText: {
    color: moodTheme.text,
    fontSize: 16,
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moodTheme.spacing.md,
  },
  avatarLarge: { fontSize: 44, marginRight: moodTheme.spacing.md },
  headerInfo: { flex: 1 },
  creatorName: {
    color: moodTheme.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  emotionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: moodTheme.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: moodTheme.radius.sm,
  },
  emotionText: {
    color: moodTheme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  title: {
    ...moodTypography.title,
    color: moodTheme.text,
    marginBottom: 6,
  },
  caption: {
    ...moodTypography.body,
    color: moodTheme.textMuted,
    marginBottom: moodTheme.spacing.lg,
  },

  actions: {
    flexDirection: 'row',
    gap: moodTheme.spacing.sm,
    marginBottom: moodTheme.spacing.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.md,
    borderWidth: 1,
    borderColor: moodTheme.border,
  },
  playBtn: {
    backgroundColor: moodTheme.primary,
    borderColor: moodTheme.primary,
    flex: 1,
    justifyContent: 'center',
  },
  playBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actionBtnText: { color: moodTheme.textMuted, fontWeight: '600', fontSize: 14 },

  section: { marginBottom: moodTheme.spacing.xl },
  sectionTitle: {
    color: moodTheme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: moodTheme.spacing.md,
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: moodTheme.border,
  },
  trackIdx: {
    color: moodTheme.textDim,
    fontSize: 14,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  trackThumb: {
    width: 44,
    height: 44,
    borderRadius: moodTheme.radius.sm,
    marginRight: moodTheme.spacing.sm,
  },
  trackInfo: { flex: 1 },
  trackTitle: { color: moodTheme.text, fontSize: 14, fontWeight: '600' },
  trackArtist: { color: moodTheme.textDim, fontSize: 12, marginTop: 2 },

  commentRow: {
    backgroundColor: moodTheme.surfaceElevated,
    borderRadius: moodTheme.radius.md,
    padding: moodTheme.spacing.md,
    marginBottom: moodTheme.spacing.sm,
  },
  commentUser: {
    color: moodTheme.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  commentText: { color: moodTheme.text, fontSize: 14 },

  commentInput: {
    flexDirection: 'row',
    gap: moodTheme.spacing.sm,
    marginTop: moodTheme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: moodTheme.surfaceElevated,
    borderRadius: moodTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: moodTheme.text,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: moodTheme.primary,
    borderRadius: moodTheme.radius.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
