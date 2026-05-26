import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import type { ShareCardModel } from '@/services/library/playlistShareService';

type Props = {
  model: ShareCardModel;
};

/**
 * 감성 공유 카드 — captureRef 대상 (화면 밖 렌더 또는 모달 내).
 */
export const PlaylistShareCard = forwardRef<View, Props>(function PlaylistShareCard(
  { model },
  ref
) {
  return (
    <View ref={ref} style={[styles.card, { borderColor: model.accentColor + '55' }]}>
      <View style={[styles.glow, { backgroundColor: model.accentColor + '22' }]} />
      <Text style={styles.brand}>Moodplay</Text>
      <View style={styles.emotionRow}>
        <Text style={styles.emoji}>{model.emotionEmoji}</Text>
        <Text style={[styles.emotionLabel, { color: model.accentColor }]}>
          {model.emotionLabel}
        </Text>
      </View>
      <Text style={styles.playlistName}>{model.playlistName}</Text>
      <View style={styles.divider} />
      {model.highlightTracks.map((t, i) => (
        <View key={`${t.title}-${i}`} style={styles.trackRow}>
          <Text style={styles.trackIndex}>{i + 1}</Text>
          <View style={styles.trackMeta}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {t.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {t.artist}
            </Text>
          </View>
        </View>
      ))}
      <Text style={styles.footer}>
        {model.trackCount}곡 · 감정으로 만든 플레이리스트
      </Text>
    </View>
  );
});

const CARD_WIDTH = 320;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#0B0D14',
    borderWidth: 1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  brand: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: moodTheme.textDim,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
  },
  emotionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  playlistName: {
    fontSize: 22,
    fontWeight: '800',
    color: moodTheme.text,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: moodTheme.border,
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  trackIndex: {
    width: 20,
    fontSize: 12,
    fontWeight: '700',
    color: moodTheme.textDim,
    textAlign: 'center',
  },
  trackMeta: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: moodTheme.text,
  },
  trackArtist: {
    fontSize: 12,
    color: moodTheme.textMuted,
  },
  footer: {
    marginTop: 8,
    fontSize: 11,
    color: moodTheme.textDim,
    textAlign: 'center',
  },
});
