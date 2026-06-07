import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import { isGoogleAuthConfigured } from '@/services/googleAuth';
import type { RecommendResponse } from '@/services/moodplayApi';
import { openYouTubeUrl, openYouTubeVideo } from '@/services/youtubeOpen';
import { saveTracksAsPlaylist } from '@/services/youtubeApi';
import { useAuthStore } from '@/stores/authStore';

import { TrackListItem } from './TrackListItem';

type Props = {
  response: RecommendResponse;
  onRetry?: () => void;
  retrying?: boolean;
};

type SaveStatus = 'idle' | 'signing_in' | 'creating' | 'done' | 'error';

export function PlaylistResultView({ response, onRetry, retrying = false }: Props) {
  const { playback, emotionEmoji, emotionLabel, moodTag, diary } = response;

  const { isSignedIn, user, signIn, getValidToken } = useAuthStore();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedPlaylistUrl, setSavedPlaylistUrl] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trackCount = playback.videos.length;
  const hasVideos = trackCount > 0;
  const isBusy = saveStatus === 'signing_in' || saveStatus === 'creating';

  const handlePlayFirst = () => {
    if (hasVideos) openYouTubeVideo(playback.videos[0].videoId);
  };

  const handleSavePlaylist = useCallback(async () => {
    if (isBusy || !hasVideos) return;
    setErrorMessage(null);

    try {
      let token = getValidToken();

      if (!token) {
        setSaveStatus('signing_in');
        const ok = await signIn();
        if (!ok) {
          setSaveStatus('error');
          setErrorMessage('Google 로그인에 실패했습니다. 다시 시도해 주세요.');
          return;
        }
        token = useAuthStore.getState().accessToken;
      }

      if (!token) {
        setSaveStatus('error');
        setErrorMessage('인증 토큰을 가져올 수 없습니다.');
        return;
      }

      setSaveStatus('creating');

      const videoIds = playback.videos.map((v) => v.videoId);
      const title = `${emotionEmoji} ${emotionLabel} — MoodPlay`;
      const description = diary
        ? `MoodPlay 감정 큐레이션: ${emotionLabel}\n"${diary}"`
        : `MoodPlay 감정 큐레이션: ${emotionLabel}`;

      const result = await saveTracksAsPlaylist(token, videoIds, title, description);

      if (result.success && result.playlistUrl) {
        setSavedPlaylistUrl(result.playlistUrl);
        setSavedCount(result.addedCount);
        setSaveStatus('done');
        Alert.alert(
          '재생목록 저장 완료!',
          `${result.addedCount}곡이 YouTube에 저장되었습니다.`,
          [
            { text: '확인', style: 'cancel' },
            { text: 'YouTube에서 열기', onPress: () => openYouTubeUrl(result.playlistUrl!) },
          ]
        );
      } else {
        setSaveStatus('error');
        setErrorMessage(result.error ?? '재생목록 저장에 실패했습니다.');
      }
    } catch {
      setSaveStatus('error');
      setErrorMessage('오류가 발생했습니다. 다시 시도해 주세요.');
    }
  }, [playback.videos, emotionEmoji, emotionLabel, diary, hasVideos, isBusy, signIn, getValidToken]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* 로그인 상태 배너 */}
      {isSignedIn && user ? (
        <View style={styles.authBanner}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.authInfo}>
            <Text style={styles.authName}>{user.name}</Text>
            <Text style={styles.authEmail}>{user.email}</Text>
          </View>
          <View style={styles.authBadge}>
            <Text style={styles.authBadgeText}>YouTube 연결됨</Text>
          </View>
        </View>
      ) : null}

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

      {/* 곡 리스트 */}
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

      {/* 하단 액션 버튼들 */}
      <View style={styles.actions}>
        {onRetry && hasVideos ? (
          <Pressable
            onPress={onRetry}
            disabled={retrying}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.btnPressed,
              retrying && styles.btnDisabled,
            ]}>
            {retrying ?
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={moodTheme.primary} />
                <Text style={styles.retryBtnLabel}>다른 곡 추천 중...</Text>
              </View>
            : <Text style={styles.retryBtnLabel}>🔄 다른 곡 추천받기</Text>}
          </Pressable>
        ) : null}

        {/* Google 로그인 버튼 (미로그인 시) */}
        {!isSignedIn && hasVideos ? (
          <Pressable
            onPress={async () => {
              if (!isGoogleAuthConfigured()) {
                Alert.alert(
                  'Google 설정 필요',
                  'EXPO_PUBLIC_GOOGLE_CLIENT_ID 환경변수를 설정해주세요.\n\n자세한 방법은 README를 참고하세요.'
                );
                return;
              }
              await signIn();
            }}
            style={({ pressed }) => [styles.googleBtn, pressed && styles.btnPressed]}>
            <Text style={styles.googleBtnLabel}>G  Google로 로그인</Text>
          </Pressable>
        ) : null}

        {/* YouTube 재생목록 저장 */}
        {hasVideos && saveStatus !== 'done' ? (
          <Pressable
            onPress={handleSavePlaylist}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.btnPressed,
              isBusy && styles.btnDisabled,
            ]}>
            {isBusy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.saveBtnLabel}>
                  {saveStatus === 'signing_in' ? 'Google 로그인 중...' : '재생목록 저장 중...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.saveBtnLabel}>
                YouTube 재생목록으로 저장
              </Text>
            )}
          </Pressable>
        ) : null}

        {/* 저장 완료 후 열기 */}
        {saveStatus === 'done' && savedPlaylistUrl ? (
          <Pressable
            onPress={() => openYouTubeUrl(savedPlaylistUrl)}
            style={({ pressed }) => [styles.openBtn, pressed && styles.btnPressed]}>
            <Text style={styles.openBtnLabel}>YouTube 재생목록 열기 ({savedCount}곡)</Text>
          </Pressable>
        ) : null}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {/* 첫 곡 재생 */}
        {hasVideos ? (
          <Pressable
            onPress={handlePlayFirst}
            style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}>
            <Text style={styles.playBtnLabel}>첫 곡 YouTube에서 재생</Text>
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

  /* Auth 배너 */
  authBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: moodTheme.surface, borderRadius: 12,
    padding: 12, marginTop: 8, marginBottom: 4,
    borderWidth: 1, borderColor: moodTheme.border,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    backgroundColor: moodTheme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  authInfo: { flex: 1, gap: 2 },
  authName: { fontSize: 14, fontWeight: '600', color: moodTheme.text },
  authEmail: { fontSize: 11, color: moodTheme.textDim },
  authBadge: {
    backgroundColor: 'rgba(15,157,88,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  authBadgeText: { fontSize: 11, color: '#0f9d58', fontWeight: '600' },

  /* 헤더 */
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

  /* 리스트 */
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

  /* 버튼 영역 */
  actions: { gap: 10 },

  retryBtn: {
    backgroundColor: moodTheme.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: moodTheme.primary,
  },
  retryBtnLabel: { color: moodTheme.primary, fontSize: 16, fontWeight: '700' },

  googleBtn: {
    backgroundColor: '#4285F4', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  googleBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#1a73e8', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
