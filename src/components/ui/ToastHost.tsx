import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { moodTheme } from '@/constants/moodTheme';
import { useToastStore } from '@/stores/toastStore';

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const current = useToastStore((s) => s.current);

  if (!current) return null;

  return (
    <View
      style={[styles.wrap, { top: insets.top + 12 }]}
      pointerEvents="none">
      <View style={styles.toast}>
        <Text style={styles.text}>{current.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: moodTheme.surfaceElevated,
    borderRadius: moodTheme.radius.lg,
    borderWidth: 1,
    borderColor: moodTheme.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: moodTheme.text,
    textAlign: 'center',
  },
});
