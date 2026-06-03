import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { moodTheme, moodTypography } from '@/constants/moodTheme';
import { useOnboardingStore } from '@/stores/onboardingStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🎧',
    title: '기분에 맞는 음악',
    body: '우울, 새벽감성, 산책… 지금 감정과 한 줄 상황을 알려주면 오늘의 플레이리스트를 만들어 드려요.',
  },
  {
    emoji: '▶️',
    title: 'YouTube로 재생',
    body: '곡은 YouTube 영상으로 재생됩니다. 일부 영상은 지역·권리 제한으로 건너뛸 수 있어요.',
  },
  {
    emoji: '📱',
    title: '백그라운드 안내',
    body: '앱을 내리거나 화면을 끄면 재생이 멈출 수 있습니다. 이어 듣기는 홈에서 다시 시작할 수 있어요.',
  },
] as const;

export default function OnboardingScreen() {
  const complete = useOnboardingStore((s) => s.completeOnboarding);
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    complete();
    router.replace('/onboarding/taste');
  };

  const handleNext = () => {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(i);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topRow}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>건너뛰기</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>{isLast ? '시작하기' : '다음'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: moodTheme.bg,
  },
  topRow: {
    alignItems: 'flex-end',
    paddingHorizontal: moodTheme.spacing.screen,
    paddingTop: moodTheme.spacing.sm,
  },
  skip: {
    fontSize: 14,
    color: moodTheme.textMuted,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: moodTheme.spacing.screen + 8,
    paddingBottom: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: moodTheme.spacing.lg,
  },
  title: {
    ...moodTypography.title,
    color: moodTheme.text,
    marginBottom: moodTheme.spacing.md,
  },
  body: {
    ...moodTypography.body,
    color: moodTheme.textMuted,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: moodTheme.spacing.screen,
    paddingBottom: moodTheme.spacing.lg,
    gap: moodTheme.spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: moodTheme.border,
  },
  dotActive: {
    backgroundColor: moodTheme.primary,
    width: 24,
  },
  cta: {
    backgroundColor: moodTheme.primary,
    borderRadius: moodTheme.radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
