import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { isFeatureEnabled } from '@/config/featureFlags';
import { MINI_PLAYER_HEIGHT } from '@/constants/miniPlayer';
import { moodTheme } from '@/constants/moodTheme';
import { usePlayer } from '@/hooks/usePlayer';
import { usePlayerStore } from '@/stores/playerStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';

import { PlayerProgressBar } from './PlayerProgressBar';

function statusLine(
  playbackStatus: string,
  isPlaying: boolean,
  errorMessage: string | null
): string | null {
  if (errorMessage) return errorMessage;
  if (playbackStatus === 'loading') return '로딩 중…';
  if (playbackStatus === 'buffering') return '버퍼링…';
  if (playbackStatus === 'error') return '재생할 수 없음';
  if (!isPlaying && playbackStatus === 'paused') return '일시정지';
  return null;
}

/**
 * 탭바 위 고정 MiniPlayer — playerStore·HiddenYoutubePlayer와 동기화.
 */
export function MiniPlayerBar() {
  const {
    track,
    isPlaying,
    togglePlay,
    next,
    playbackStatus,
    playbackErrorMessage,
    progress,
  } = usePlayer();

  const embedSkipNotice = usePlayerStore((s) => s.embedSkipNotice);
  const embedSkipNoticeExpiry = usePlayerStore((s) => s.embedSkipNoticeExpiry);
  const clearEmbedSkipNotice = usePlayerStore((s) => s.clearEmbedSkipNotice);

  const [showEmbedNotice, setShowEmbedNotice] = useState(false);

  useEffect(() => {
    if (!embedSkipNotice || embedSkipNoticeExpiry <= Date.now()) {
      setShowEmbedNotice(false);
      return;
    }
    setShowEmbedNotice(true);
    const remaining = embedSkipNoticeExpiry - Date.now();
    const timer = setTimeout(() => {
      setShowEmbedNotice(false);
      clearEmbedSkipNotice();
    }, remaining);
    return () => clearTimeout(timer);
  }, [embedSkipNotice, embedSkipNoticeExpiry, clearEmbedSkipNotice]);

  const isLiked = useUserLibraryStore((s) =>
    track?.youtubeId ? s.isTrackLiked(track.youtubeId) : false
  );
  const toggleLike = useUserLibraryStore((s) => s.toggleLikeTrack);

  if (!track) return null;

  const openFullPlayer = () => {
    router.push('/player');
  };

  const subline = showEmbedNotice && embedSkipNotice
    ? embedSkipNotice
    : statusLine(playbackStatus, isPlaying, playbackErrorMessage);
  const showSpinner =
    playbackStatus === 'loading' || playbackStatus === 'buffering';

  const BlurOrFallback =
    Platform.OS === 'web' ? (
      <View style={[StyleSheet.absoluteFill, styles.webFallback]} />
    ) : (
      <BlurView
        intensity={Platform.OS === 'ios' ? 55 : 80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
    );

  return (
    <View style={styles.wrap}>
      {BlurOrFallback}
      <View style={styles.tint} />

      <View style={styles.progressRow}>
        <PlayerProgressBar progress={progress} variant="mini" />
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={openFullPlayer}
          style={styles.mainTap}
          accessibilityRole="button"
          accessibilityLabel="전체 플레이어 열기">
          <Image source={{ uri: track.thumbnailUrl }} style={styles.thumb} />
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>
              {track.title}
            </Text>
            {subline ? (
              <Text
                style={[styles.subline, (playbackErrorMessage || showEmbedNotice) && styles.sublineEmbed]}
                numberOfLines={1}>
                {subline}
              </Text>
            ) : (
              <Text style={styles.artist} numberOfLines={1}>
                {track.artist}
              </Text>
            )}
          </View>
        </Pressable>

        <View style={styles.controls}>
          {isFeatureEnabled('enableLikeSave') ?
            <Pressable
              onPress={() => toggleLike(track)}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? '좋아요 취소' : '좋아요'}>
              <FontAwesome
                name={isLiked ? 'heart' : 'heart-o'}
                size={20}
                color={isLiked ? '#FF6B8A' : moodTheme.textMuted}
              />
            </Pressable>
          : null}
          {showSpinner ? (
            <View style={styles.iconBtn}>
              <ActivityIndicator size="small" color={moodTheme.textMuted} />
            </View>
          ) : null}
          <Pressable
            onPress={togglePlay}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? '일시정지' : '재생'}>
            <FontAwesome
              name={isPlaying ? 'pause' : 'play'}
              size={22}
              color={moodTheme.text}
              style={!isPlaying ? styles.playOffset : undefined}
            />
          </Pressable>
          <Pressable
            onPress={() => next()}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="다음 곡">
            <FontAwesome name="step-forward" size={20} color={moodTheme.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: MINI_PLAYER_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(15,17,24,0.92)' : 'transparent',
  },
  webFallback: {
    backgroundColor: 'rgba(15, 17, 24, 0.88)',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 13, 20, 0.45)',
  },
  progressRow: {
    paddingHorizontal: 12,
    paddingTop: 6,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    zIndex: 1,
  },
  mainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 12,
    minWidth: 0,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: moodTheme.surfaceElevated,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: moodTheme.text,
  },
  artist: {
    fontSize: 13,
    color: moodTheme.textMuted,
  },
  subline: {
    fontSize: 12,
    color: moodTheme.textMuted,
  },
  sublineError: {
    color: '#FF9A9A',
  },
  sublineEmbed: {
    color: '#FFD08A',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  playOffset: {
    marginLeft: 3,
  },
});
