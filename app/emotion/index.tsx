import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmotionCard, RecommendLoadingOverlay } from '@/components/emotion';
import { EMOTIONS, LOADING_MESSAGES } from '@/constants/emotions';
import { moodTheme } from '@/constants/moodTheme';
import { fetchAiRecommendation } from '@/services/recommendationApi';
import type { EmotionId } from '@/types/emotion';

export default function EmotionScreen() {
  const { emotionId: paramEmotionId } = useLocalSearchParams<{ emotionId?: string }>();
  const [selectedId, setSelectedId] = useState<EmotionId | null>(null);
  const [diary, setDiary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);

  useEffect(() => {
    if (!paramEmotionId) return;
    const match = EMOTIONS.find((e) => e.id === paramEmotionId);
    if (match) setSelectedId(match.id);
  }, [paramEmotionId]);

  const selectedEmotion = EMOTIONS.find((e) => e.id === selectedId);

  const handleRecommend = useCallback(async () => {
    console.log('[FLOW] handleRecommend called, selectedId=', selectedId, 'loading=', loading);
    if (!selectedId || loading) {
      console.log('[FLOW] BLOCKED — selectedId:', selectedId, 'loading:', loading);
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingMessage(LOADING_MESSAGES[0]);

    let msgIndex = 0;
    const tick = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[msgIndex]);
    }, 900);

    try {
      console.log('[FLOW] generating AI recommendation — emotion:', selectedId);
      const result = await fetchAiRecommendation(selectedId, diary || undefined, {
        resetSession: true,
      });
      console.log(
        '[FLOW] recommendation ready — videos:',
        result.playback.videos.length,
        'source:',
        result.meta.source
      );

      const dataStr = JSON.stringify(result);
      console.log('[FLOW] navigating to /recommendation, data length:', dataStr.length);
      router.push({
        pathname: '/recommendation',
        params: { data: dataStr },
      });
      console.log('[FLOW] router.push executed');
    } catch (err) {
      console.error('[FLOW] recommendation FAILED:', err);
      setError('추천을 불러오지 못했어요. 다시 시도해 주세요.');
    } finally {
      clearInterval(tick);
      setLoading(false);
      console.log('[FLOW] loading set to false');
    }
  }, [selectedId, diary, loading]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '오늘의 감정',
          headerStyle: { backgroundColor: moodTheme.bg },
          headerTintColor: moodTheme.text,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>지금, 어떤 기분인가요?</Text>
            <Text style={styles.sub}>
              감정을 고르면 나만의 플레이리스트를{'\n'}만들어 드려요.
            </Text>

            <View style={styles.grid}>
              {EMOTIONS.map((emotion) => (
                <EmotionCard
                  key={emotion.id}
                  emotion={emotion}
                  selected={selectedId === emotion.id}
                  onPress={() => setSelectedId(emotion.id)}
                />
              ))}
            </View>

            {selectedId ? (
              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  {selectedEmotion ? (
                    <Text style={styles.detailEmoji}>{selectedEmotion.emoji}</Text>
                  ) : null}
                  <Text style={styles.detailTitle}>
                    {selectedEmotion?.label} — 오늘의 한 줄
                  </Text>
                </View>
                <Text style={styles.detailHint}>
                  지금 기분을 적어 보세요 — 플레이리스트에 태그로 남겨요 (선택)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder='예: "시험 끝나고 집 가는 중"'
                  placeholderTextColor={moodTheme.textDim}
                  value={diary}
                  onChangeText={setDiary}
                  multiline
                  maxLength={120}
                />
                {error ? (
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  onPress={handleRecommend}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.recommendBtn,
                    pressed && styles.recommendBtnPressed,
                    loading && styles.recommendBtnDisabled,
                  ]}>
                  <Text style={styles.recommendBtnLabel}>🎵 플레이리스트 만들기</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.hint}>감정을 하나 선택해 주세요</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <RecommendLoadingOverlay visible={loading} message={loadingMessage} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: moodTheme.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  heading: {
    fontSize: 24, fontWeight: '800', color: moodTheme.text,
    marginTop: 8, letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14, lineHeight: 21, color: moodTheme.textMuted,
    marginTop: 8, marginBottom: 24,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', rowGap: 12, marginBottom: 8,
  },
  detailSection: {
    marginTop: 20, padding: 18, borderRadius: 18,
    backgroundColor: moodTheme.surface, borderWidth: 1,
    borderColor: moodTheme.border, gap: 10,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailEmoji: { fontSize: 22 },
  detailTitle: { fontSize: 17, fontWeight: '700', color: moodTheme.text },
  detailHint: { fontSize: 13, color: moodTheme.textDim },
  input: {
    minHeight: 88, borderRadius: 12, borderWidth: 1,
    borderColor: moodTheme.border, backgroundColor: moodTheme.surfaceElevated,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: moodTheme.text, textAlignVertical: 'top',
  },
  recommendBtn: {
    marginTop: 6, backgroundColor: moodTheme.primary,
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  recommendBtnPressed: { opacity: 0.85 },
  recommendBtnDisabled: { opacity: 0.6 },
  recommendBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { fontSize: 14, color: '#FF8A8A', lineHeight: 20, marginBottom: 4 },
  hint: { marginTop: 24, textAlign: 'center', fontSize: 14, color: moodTheme.textDim },
});
