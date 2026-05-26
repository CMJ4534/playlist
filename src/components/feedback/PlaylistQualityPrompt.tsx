import { useEffect, useState } from 'react';
import {
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import { isFeatureEnabled } from '@/config/featureFlags';
import { submitPlaylistQualityFeedback } from '@/services/feedback/playlistQualityFeedback';
import { trackEvent } from '@/services/analytics/analyticsService';
import { useFeedbackPromptStore } from '@/stores/feedbackPromptStore';
import type { FeedbackSentiment } from '@/types/feedback';

const OPTIONS: Array<{
  sentiment: FeedbackSentiment;
  emoji: string;
  label: string;
}> = [
  { sentiment: 'great', emoji: '👍', label: '좋았어요' },
  { sentiment: 'ok', emoji: '😐', label: '보통' },
  { sentiment: 'poor', emoji: '👎', label: '별로였어요' },
];

const COMMENT_HINTS = [
  '곡이 너무 반복돼요',
  '분위기가 안 맞았어요',
  '더 잔잔한 곡이 좋겠어요',
  '완벽했어요!',
];

export function PlaylistQualityPrompt() {
  const pending = useFeedbackPromptStore((s) => s.pending);
  const dismiss = useFeedbackPromptStore((s) => s.dismiss);
  const [selectedSentiment, setSelectedSentiment] =
    useState<FeedbackSentiment | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!pending || !isFeatureEnabled('enablePlaylistFeedbackPrompt')) return;
    trackEvent('playlist_quality_prompt_shown', {
      playlistSessionId: pending.playlistSessionId,
      trigger: pending.trigger,
    });
    setSelectedSentiment(null);
    setComment('');
    setSubmitted(false);
  }, [pending?.playlistSessionId, pending?.trigger]);

  if (!pending || !isFeatureEnabled('enablePlaylistFeedbackPrompt')) {
    return null;
  }

  const handlePick = (sentiment: FeedbackSentiment) => {
    setSelectedSentiment(sentiment);
  };

  const handleSubmit = async () => {
    if (!selectedSentiment) return;
    Keyboard.dismiss();
    await submitPlaylistQualityFeedback(
      selectedSentiment,
      {
        emotionId: pending.emotionId,
        playlistSessionId: pending.playlistSessionId,
      },
      comment.trim() || undefined
    );
    setSubmitted(true);
    setTimeout(() => dismiss(), 1200);
  };

  const handleQuickSubmit = async (sentiment: FeedbackSentiment) => {
    if (selectedSentiment) return;
    handlePick(sentiment);
  };

  if (submitted) {
    return (
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.thankYou}>피드백 감사합니다! 🎵</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {selectedSentiment
              ? '한줄 의견이 있다면? (선택)'
              : '이 플레이리스트 어땠나요?'}
          </Text>
          <Pressable onPress={dismiss} hitSlop={12}>
            <Text style={styles.skip}>건너뛰기</Text>
          </Pressable>
        </View>

        {!selectedSentiment ? (
          <View style={styles.row}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.sentiment}
                onPress={() => handleQuickSubmit(opt.sentiment)}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                <Text style={styles.chipLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.selectedRow}>
              {OPTIONS.map((opt) => (
                <View
                  key={opt.sentiment}
                  style={[
                    styles.chipMini,
                    opt.sentiment === selectedSentiment && styles.chipSelected,
                  ]}>
                  <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                </View>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="예: 곡이 너무 반복돼요"
              placeholderTextColor={moodTheme.textDim}
              value={comment}
              onChangeText={setComment}
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <View style={styles.hintRow}>
              {COMMENT_HINTS.slice(0, 2).map((hint) => (
                <Pressable
                  key={hint}
                  onPress={() => setComment(hint)}
                  style={styles.hintChip}>
                  <Text style={styles.hintText}>{hint}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.submitLabel}>보내기</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 100,
    zIndex: 50,
  },
  card: {
    backgroundColor: moodTheme.surfaceElevated,
    borderRadius: moodTheme.radius.lg,
    borderWidth: 1,
    borderColor: moodTheme.border,
    padding: moodTheme.spacing.md,
    gap: moodTheme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: moodTheme.text,
  },
  skip: {
    fontSize: 12,
    color: moodTheme.textDim,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: moodTheme.radius.md,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    borderColor: moodTheme.border,
    gap: 4,
  },
  pressed: { opacity: 0.88 },
  chipEmoji: { fontSize: 22 },
  chipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: moodTheme.textMuted,
    textAlign: 'center',
  },
  selectedRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  chipMini: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: moodTheme.surface,
    opacity: 0.4,
  },
  chipSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: moodTheme.primary,
    backgroundColor: moodTheme.surfaceElevated,
  },
  input: {
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.md,
    borderWidth: 1,
    borderColor: moodTheme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: moodTheme.text,
  },
  hintRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  hintChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    borderColor: moodTheme.border,
  },
  hintText: {
    fontSize: 11,
    color: moodTheme.textDim,
  },
  submitBtn: {
    backgroundColor: moodTheme.primary,
    borderRadius: moodTheme.radius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  thankYou: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: moodTheme.text,
    paddingVertical: 12,
  },
});
