import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isPlaybackDebugEnabled } from '@/constants/dev';
import { usePlaybackDebugStore } from '@/stores/playbackDebugStore';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * DEV 모드 전용 playback 디버그 오버레이.
 * 현재 iframe 상태, youtubeId, ready/play state, 최근 로그를 표시한다.
 * 좌상단 ▶DBG 버튼을 누르면 펼쳐진다.
 */
export function PlaybackDebugOverlay() {
  const [expanded, setExpanded] = useState(false);

  if (!isPlaybackDebugEnabled()) return null;

  return expanded ? <ExpandedOverlay onCollapse={() => setExpanded(false)} /> : (
    <Pressable style={styles.fab} onPress={() => setExpanded(true)}>
      <Text style={styles.fabText}>▶DBG</Text>
    </Pressable>
  );
}

function ExpandedOverlay({ onCollapse }: { onCollapse: () => void }) {
  const {
    iframeReady,
    youtubeId,
    storeIsPlaying,
    iframeState,
    lastSkipReason,
    lastError,
    mountCount,
    entries,
  } = usePlaybackDebugStore();

  const playbackStatus = usePlayerStore((s) => s.playbackStatus);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const queueLen = usePlayerStore((s) => s.queue.length);
  const queueRevision = usePlayerStore((s) => s.queueRevision);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);

  const recent = entries.slice(-20).reverse();

  return (
    <View style={styles.overlay}>
      <Pressable onPress={onCollapse} style={styles.header}>
        <Text style={styles.headerText}>Playback Debug ✕</Text>
      </Pressable>

      <View style={styles.row}>
        <Text style={styles.label}>youtubeId</Text>
        <Text style={styles.value} numberOfLines={1}>{youtubeId ?? '—'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>iframe</Text>
        <Text style={[styles.value, iframeReady ? styles.ok : styles.warn]}>
          {iframeReady ? 'READY' : 'NOT READY'} · {iframeState}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>store</Text>
        <Text style={styles.value}>
          {storeIsPlaying ? '▶' : '⏸'} {playbackStatus} · {currentIndex + 1}/{queueLen} · rev{queueRevision}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>progress</Text>
        <Text style={styles.value}>
          {positionSec.toFixed(0)}s / {durationSec.toFixed(0)}s
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>mounts</Text>
        <Text style={styles.value}>{mountCount}</Text>
      </View>
      {lastSkipReason ? (
        <View style={styles.row}>
          <Text style={styles.label}>skip</Text>
          <Text style={[styles.value, styles.warn]}>{lastSkipReason}</Text>
        </View>
      ) : null}
      {lastError ? (
        <View style={styles.row}>
          <Text style={styles.label}>error</Text>
          <Text style={[styles.value, styles.err]}>{lastError}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, { marginTop: 6 }]}>Log (recent {recent.length})</Text>
      <ScrollView style={styles.logBox}>
        {recent.map((e, i) => (
          <Text key={i} style={styles.logLine} numberOfLines={2}>
            {new Date(e.ts).toLocaleTimeString()} [{e.tag}] {e.message}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 52,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 9999,
  },
  fabText: { color: '#0f0', fontSize: 11, fontFamily: 'monospace' },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
    maxHeight: 380,
    backgroundColor: 'rgba(0,0,0,0.88)',
    borderRadius: 10,
    padding: 10,
    zIndex: 9999,
  },
  header: { marginBottom: 6 },
  headerText: { color: '#0f0', fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { color: '#888', fontSize: 11, width: 70, fontFamily: 'monospace' },
  value: { color: '#ddd', fontSize: 11, flex: 1, fontFamily: 'monospace' },
  ok: { color: '#0f0' },
  warn: { color: '#fa0' },
  err: { color: '#f44' },
  logBox: { maxHeight: 140, marginTop: 4 },
  logLine: { color: '#aaa', fontSize: 10, lineHeight: 15, fontFamily: 'monospace' },
});
