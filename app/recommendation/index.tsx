import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaylistResultView } from '@/components/recommendation';
import { moodTheme } from '@/constants/moodTheme';
import type { RecommendResponse } from '@/services/moodplayApi';

export default function RecommendationScreen() {
  const { data } = useLocalSearchParams<{ data?: string }>();

  console.log('[FLOW][RECO] RecommendationScreen mounted, data exists:', !!data, 'data length:', data?.length ?? 0);

  const response = useMemo<RecommendResponse | null>(() => {
    if (!data) {
      console.log('[FLOW][RECO] data param is EMPTY — no recommendation data received');
      return null;
    }
    try {
      const parsed = JSON.parse(data);
      console.log('[FLOW][RECO] parsed OK — emotion:', parsed?.emotion, 'videos:', parsed?.playback?.videos?.length);
      return parsed;
    } catch (e) {
      console.error('[FLOW][RECO] JSON.parse FAILED:', e);
      return null;
    }
  }, [data]);

  useEffect(() => {
    if (!response) {
      console.log('[FLOW][RECO] response is null — redirecting to /emotion');
      router.replace('/emotion');
    }
  }, [response]);

  if (!response) {
    console.log('[FLOW][RECO] rendering fallback (loading text)');
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>추천 결과를 불러오는 중...</Text>
      </View>
    );
  }

  console.log('[FLOW][RECO] rendering PlaylistResultView with', response.playback.videos.length, 'videos');

  return (
    <>
      <Stack.Screen
        options={{
          title: '나의 플레이리스트',
          headerStyle: { backgroundColor: moodTheme.bg },
          headerTintColor: moodTheme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.back}>← 감정</Text>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <PlaylistResultView response={response} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: moodTheme.bg,
  },
  back: {
    color: moodTheme.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  fallback: {
    flex: 1,
    backgroundColor: moodTheme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: moodTheme.textMuted,
  },
});
