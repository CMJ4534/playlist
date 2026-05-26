import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';

type Props = {
  visible: boolean;
  message: string;
};

export function RecommendLoadingOverlay({ visible, message }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={moodTheme.primary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: moodTheme.surfaceElevated,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: moodTheme.border,
  },
  message: {
    fontSize: 16,
    color: moodTheme.text,
    textAlign: 'center',
    lineHeight: 24,
  },
});
