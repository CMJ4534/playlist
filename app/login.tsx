import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { moodTheme } from '@/constants/moodTheme';
import { isGoogleAuthConfigured } from '@/services/googleAuth';
import { useAuthStore } from '@/stores/authStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn, loading } = useAuthStore();
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert(
        'Google 설정 필요',
        'EXPO_PUBLIC_GOOGLE_CLIENT_ID 환경변수를 설정해주세요.'
      );
      return;
    }

    setBusy(true);
    const ok = await signIn();
    setBusy(false);

    if (ok) {
      router.back();
    }
  };

  const isLoading = loading || busy;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎵</Text>
        <Text style={styles.title}>MoodPlay</Text>
        <Text style={styles.subtitle}>
          {'감정 기반 음악 추천을 시작하려면\nGoogle 계정으로 로그인하세요'}
        </Text>

        <Pressable
          disabled={isLoading}
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.googleBtn,
            isLoading && styles.disabled,
            pressed && styles.pressed,
          ]}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.googleBtnText}>G  Google로 로그인</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.skipBtn}>
          <Text style={styles.skipText}>나중에 하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: moodTheme.bg },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moodTheme.spacing.screen,
    gap: 12,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: moodTheme.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: moodTheme.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  googleBtn: {
    width: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  skipBtn: { paddingVertical: 12 },
  skipText: { fontSize: 14, color: moodTheme.textDim },
});
