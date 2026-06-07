import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaylistResultView } from '@/components/recommendation';
import { moodTheme } from '@/constants/moodTheme';
import type { RecommendResponse } from '@/services/moodplayApi';
import { fetchAiRecommendationRetry } from '@/services/recommendationApi';
import type { EmotionId } from '@/types/emotion';

export default function RecommendationScreen() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  const [response, setResponse] = useState<RecommendResponse | null>(null);
  const [retrying, setRetrying] = useState(false);

  const initialResponse = useMemo<RecommendResponse | null>(() => {
    if (!data) return null;
    try {
      return JSON.parse(data) as RecommendResponse;
    } catch {
      return null;
    }
  }, [data]);

  useEffect(() => {
    if (initialResponse) setResponse(initialResponse);
  }, [initialResponse]);

  useEffect(() => {
    if (!response && !data) {
      router.replace('/emotion');
    }
  }, [response, data]);

  const handleRetry = useCallback(async () => {
    if (!response || retrying) return;
    setRetrying(true);
    try {
      const next = await fetchAiRecommendationRetry(
        response.emotion as EmotionId,
        response.diary ?? undefined
      );
      setResponse(next);
    } catch (err) {
      console.error('[FLOW][RECO] retry FAILED:', err);
    } finally {
      setRetrying(false);
    }
  }, [response, retrying]);

  if (!response) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>추천 결과를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.topBarSide}>
          <Text style={styles.back}>← 감정</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          나의 플레이리스트
        </Text>
        <Pressable
          onPress={handleRetry}
          disabled={retrying}
          hitSlop={12}
          style={styles.topBarSide}>
          {retrying ?
            <ActivityIndicator size="small" color={moodTheme.primary} />
          : <Text style={styles.retryText}>다른 추천</Text>}
        </Pressable>
      </View>
      <PlaylistResultView
        key={`${response.meta.timestamp}-${response.meta.source}`}
        response={response}
        onRetry={handleRetry}
        retrying={retrying}
      />
      {retrying ? (
        <View style={styles.retryOverlay}>
          <ActivityIndicator size="large" color={moodTheme.primary} />
          <Text style={styles.retryOverlayText}>다른 곡 추천 중...</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: moodTheme.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: moodTheme.border,
  },
  topBarSide: {
    minWidth: 72,
  },
  back: {
    color: moodTheme.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: moodTheme.text,
    marginHorizontal: 8,
  },
  retryText: {
    color: moodTheme.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: moodTheme.bg,
  },
  fallbackText: {
    color: moodTheme.textMuted,
    fontSize: 15,
  },
  retryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  retryOverlayText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
