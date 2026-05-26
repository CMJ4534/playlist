import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FullPlayerView } from '@/components/player/FullPlayerView';
import { moodTheme } from '@/constants/moodTheme';

export default function PlayerScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '지금 재생 중',
          headerStyle: { backgroundColor: moodTheme.bg },
          headerTintColor: moodTheme.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.back}>닫기</Text>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <FullPlayerView />
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
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});
