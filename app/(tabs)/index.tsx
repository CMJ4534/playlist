import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EMOTIONS } from '@/constants/emotions';
import { moodTheme, moodTypography } from '@/constants/moodTheme';

function getGreeting(): { headline: string; subline: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { headline: '늦은 밤이에요', subline: '새벽 감성에 어울리는 음악을 찾아볼까요?' };
  if (hour < 12) return { headline: '좋은 아침이에요', subline: '오늘 하루를 여는 음악은 어때요?' };
  if (hour < 18) return { headline: '좋은 오후예요', subline: '지금 기분에 맞는 음악을 추천받아 보세요' };
  return { headline: '좋은 저녁이에요', subline: '오늘 하루 어땠나요? 음악으로 마무리해요' };
}

export default function HomeScreen() {
  const greeting = getGreeting();

  const openEmotionFlow = useCallback(() => {
    router.push('/emotion');
  }, []);

  const openWithEmotion = useCallback((emotionId: string) => {
    router.push({ pathname: '/emotion', params: { emotionId } });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* 인사말 */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.heading}>{greeting.headline}</Text>
            <Text style={styles.sub}>{greeting.subline}</Text>
          </View>
        </View>

        {/* 감정 빠른 선택 */}
        <Text style={styles.sectionTitle}>지금 기분은?</Text>
        <View style={styles.emotionGrid}>
          {EMOTIONS.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => openWithEmotion(e.id)}
              style={({ pressed }) => [
                styles.emotionCard,
                { borderColor: e.accent + '40' },
                pressed && styles.pressed,
              ]}>
              <Text style={styles.emotionEmoji}>{e.emoji}</Text>
              <Text style={styles.emotionLabel}>{e.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 메인 CTA */}
        <Pressable
          onPress={openEmotionFlow}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaTitle}>감정 · 상황 직접 고르기</Text>
          <Text style={styles.ctaSub}>
            한 줄만 적어도 YouTube 음악을 추천받을 수 있어요
          </Text>
        </Pressable>

        {/* 안내 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>MoodPlay 사용법</Text>
          <Text style={styles.infoText}>1. 지금 기분에 맞는 감정을 선택하세요</Text>
          <Text style={styles.infoText}>2. 상황을 한 줄로 적어주세요 (선택)</Text>
          <Text style={styles.infoText}>3. YouTube에서 바로 재생되는 음악을 받아보세요</Text>
          <Text style={styles.infoNote}>
            음악은 YouTube 앱 또는 브라우저에서 재생됩니다
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: moodTheme.bg,
  },
  scroll: {
    paddingTop: 16,
    paddingHorizontal: moodTheme.spacing.screen,
    paddingBottom: 60,
    gap: moodTheme.spacing.lg,
  },
  headerRow: {
    gap: moodTheme.spacing.xs,
  },
  headerText: {
    gap: moodTheme.spacing.xs,
  },
  heading: {
    ...moodTypography.titleLarge,
    color: moodTheme.text,
  },
  sub: {
    ...moodTypography.body,
    color: moodTheme.textMuted,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: moodTheme.text,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  emotionCard: {
    width: '31%',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  emotionEmoji: {
    fontSize: 28,
  },
  emotionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: moodTheme.text,
  },
  cta: {
    padding: moodTheme.spacing.md,
    borderRadius: moodTheme.radius.lg,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    borderColor: moodTheme.border,
    gap: 4,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: moodTheme.text,
  },
  ctaSub: {
    fontSize: 13,
    color: moodTheme.textMuted,
  },
  infoBox: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: moodTheme.surfaceElevated,
    gap: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: moodTheme.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: moodTheme.textMuted,
    lineHeight: 20,
  },
  infoNote: {
    fontSize: 12,
    color: moodTheme.textDim,
    marginTop: 8,
    textAlign: 'center',
  },
});
