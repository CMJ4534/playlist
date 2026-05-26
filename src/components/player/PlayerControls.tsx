import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayer } from '@/hooks/usePlayer';

/** MVP 1단계: queue·재생 컨트롤 검증용 최소 UI */
export function PlayerControls() {
  const { track, isPlaying, queue, currentIndex, togglePlay, next, prev } =
    usePlayer();

  if (!track) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>재생할 곡이 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{track.title}</Text>
      <Text style={styles.artist}>{track.artist}</Text>
      <Text style={styles.meta}>
        {currentIndex + 1} / {queue.length}
      </Text>

      <View style={styles.row}>
        <Pressable onPress={prev} style={styles.btn}>
          <Text style={styles.btnLabel}>이전</Text>
        </Pressable>
        <Pressable onPress={togglePlay} style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryLabel}>{isPlaying ? '일시정지' : '재생'}</Text>
        </Pressable>
        <Pressable onPress={() => next()} style={styles.btn}>
          <Text style={styles.btnLabel}>다음</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  artist: {
    fontSize: 15,
    color: '#666',
  },
  meta: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  btnLabel: {
    fontWeight: '600',
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  btnPrimaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    padding: 20,
  },
  emptyText: {
    color: '#888',
  },
});
