import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import {
  signInWithGoogle,
  isGoogleAuthConfigured,
} from '@/services/googleAuth';
import {
  createPlaylist,
  type RecommendResponse,
} from '@/services/moodplayApi';
import { openYouTubeUrl, openYouTubeVideo } from '@/services/youtubeOpen';

import { TrackListItem } from './TrackListItem';

type Props = {
  response: RecommendResponse;
};

type PlaylistStatus = 'idle' | 'signing_in' | 'creating' | 'done' | 'error';

export function PlaylistResultView({ response }: Props) {
  const { playback, emotionEmoji, emotionLabel, moodTag, diary } = response;

  console.log('[FLOW][VIEW] PlaylistResultView rendered');
  console.log('[FLOW][VIEW] videos:', playback.videos.length, 'tier:', playback.tier, 'emoji:', emotionEmoji);

  const [playlistStatus, setPlaylistStatus] = useState<PlaylistStatus>('idle');
  const [createdPlaylistUrl, setCreatedPlaylistUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trackCount = playback.videos.length;
  const hasVideos = trackCount > 0;
  console.log('[FLOW][VIEW] hasVideos:', hasVideos, 'trackCount:', trackCount);
  const isCreating = playlistStatus === 'signing_in' || playlistStatus === 'creating';

  const handlePlayFirst = () => {
    if (hasVideos) openYouTubeVideo(playback.videos[0].videoId);
  };

  const handleCreatePlaylist = useCallback(async () => {
    if (isCreating || !hasVideos) return;
    setErrorMessage(null);

    try {
      setPlaylistStatus('signing_in');
      const accessToken = await signInWithGoogle();

      if (!accessToken) {
        setPlaylistStatus('error');
        setErrorMessage('Google 로그인이 필요합니다');
        return;
      }

      setPlaylistStatus('creating');

      const videoIds = playback.videos.map((v) => v.videoId);
      const title = `${emotionEmoji} ${emotionLabel} — MoodPlay`;
      const description = diary
        ? `MoodPlay 감정 큐레이션: ${emotionLabel}\n"${diary}"`
        : `MoodPlay 감정 큐레이션: ${emotionLabel}`;

      const result = await createPlaylist({ accessToken, videoIds, title, description });

      if (result.success && result.playlistUrl) {
        setCreatedPlaylistUrl(result.playlistUrl);
        setPlaylistStatus('done');
        Alert.alert(
          '플레이리스트 생성 완료!',
          `${result.videoCount}곡이 YouTube에 저장되었습니다.`,
          [
            { text: '확인', style: 'cancel' },
            { text: 'YouTube에서 열기', onPress: () => openYouTubeUrl(result.playlistUrl!) },
          ]
        );
      } else {
        setPlaylistStatus('error');
        setErrorMessage(result.error ?? '플레이리스트 생성에 실패했습니다');
      }
    } catch {
      setPlaylistStatus('error');
      setErrorMessage('오류가 발생했습니다. 다시 시도해 주세요.');
    }
  }, [playback.videos, emotionEmoji, emotionLabel, diary, hasVideos, isCreating]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* 플레이리스트 헤더 */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{emotionEmoji}</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.playlistTitle}>{emotionLabel} 플레이리스트</Text>
          <Text style={styles.trackCount}>
            {trackCount}곡{moodTag ? ` · #${moodTag}` : ''}
          </Text>
        </View>
      </View>

      {diary ? (
        <View style={styles.diaryChip}>
          <Text style={styles.diaryText} numberOfLines={2}>"{diary}"</Text>
        </View>
      ) : null}

      {/* 곡 리스트 — 화면의 핵심 */}
      {hasVideos ? (
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>곡 목록</Text>
            <Text style={styles.listHint}>탭 → YouTube 재생</Text>
          </View>
          <View style={styles.list}>
            {playback.videos.map((video, index) => (
              <TrackListItem key={`${video.videoId}-${index}`} video={video} index={index} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎵</Text>
          <Text style={styles.emptyText}>추천 곡이 없습니다</Text>
          <Text style={styles.emptyHint}>다른 감정을 선택해 보세요</Text>
        </View>
      )}

      {/* 하단 액션 */}
      <View style={styles.actions}>
        {/* YouTube Playlist 저장 */}
        {hasVideos && playlistStatus !== 'done' ? (
          <Pressable
            onPress={handleCreatePlaylist}
            disabled={isCreating}
            style={({ pressed }) => [
              styles.createBtn,
              pressed && styles.btnPressed,
              isCreating && styles.btnDisabled,
            ]}>
            {isCreating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.createBtnLabel}>
                  {playlistStatus === 'signing_in' ? 'Google 로그인 중...' : '저장 중...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.createBtnLabel}>
                {isGoogleAuthConfigured()
                  ? '📋 YouTube에 플레이리스트 저장'
                  : '📋 YouTube에 플레이리스트 저장 (설정 필요)'}
              </Text>
            )}
          </Pressable>
        ) : null}

        {playlistStatus === 'done' && createdPlaylistUrl ? (
          <Pressable
            onPress={() => openYouTubeUrl(createdPlaylistUrl)}
            style={({ pressed }) => [styles.openBtn, pressed && styles.btnPressed]}>
            <Text style={styles.openBtnLabel}>✅ YouTube 플레이리스트 열기</Text>
          </Pressable>
        ) : null}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {hasVideos ? (
          <Pressable
            onPress={handlePlayFirst}
            style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}>
            <Text style={styles.playBtnLabel}>▶ 첫 곡 YouTube에서 재생</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.notice}>
        각 곡을 탭하면 YouTube에서 바로 재생됩니다
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: moodTheme.bg },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingTop: 12, paddingBottom: 16,
  },
  emoji: { fontSize: 48 },
  headerMeta: { flex: 1, gap: 4 },
  playlistTitle: {
    fontSize: 24, fontWeight: '800', color: moodTheme.text, letterSpacing: -0.3,
  },
  trackCount: { fontSize: 14, color: moodTheme.textMuted, fontWeight: '500' },

  diaryChip: {
    alignSelf: 'flex-start', backgroundColor: moodTheme.surface,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: moodTheme.border, marginBottom: 20,
  },
  diaryText: { fontSize: 13, color: moodTheme.textDim, fontStyle: 'italic' },

  listContainer: { marginBottom: 24 },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 10,
  },
  listTitle: { fontSize: 16, fontWeight: '700', color: moodTheme.text },
  listHint: { fontSize: 12, color: moodTheme.textDim },
  list: {
    backgroundColor: moodTheme.surface, borderRadius: 16,
    paddingHorizontal: 14, borderWidth: 1, borderColor: moodTheme.border,
  },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: moodTheme.text },
  emptyHint: { fontSize: 13, color: moodTheme.textDim },

  actions: { gap: 10 },

  createBtn: {
    backgroundColor: '#1a73e8', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  createBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  openBtn: {
    backgroundColor: '#0f9d58', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  openBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },

  playBtn: {
    backgroundColor: '#FF0000', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  playBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },

  btnPressed: { opacity: 0.8 },
  btnDisabled: { opacity: 0.6 },
  errorText: { fontSize: 13, color: '#FF8A8A', textAlign: 'center', lineHeight: 18 },
  notice: { marginTop: 24, textAlign: 'center', fontSize: 12, color: moodTheme.textDim },
});
