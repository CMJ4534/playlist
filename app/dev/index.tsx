import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isBetaQaEnabled } from '@/constants/beta';
import { moodTheme } from '@/constants/moodTheme';
import { getCatalogPlayabilityStats } from '@/data/seeds/catalogMeta';
import { ALL_SEED_TRACKS } from '@/data/seeds';
import { applyEmbedSafeFilter } from '@/lib/embedSafeFilter';
import {
  getQaChecklist,
  getQaSummary,
  updateCheckStatus,
  QA_CATEGORIES,
  type QaCategory,
  type QaCheckItem,
  type QaStatus,
} from '@/dev/qaChecklist';
import {
  buildPlaybackStabilityReport,
  type PlaybackStabilityReport,
} from '@/dev/playbackStabilityReport';
import { buildSeedQualityReport, type SeedQualityReport } from '@/dev/seedQualityReport';
import {
  buildReleaseRiskReport,
  type ReleaseRiskReport,
  type RiskItem,
} from '@/dev/releaseRiskAssessment';
import {
  qaForceQueue,
  qaForceQueueFull,
  qaPlaySingleId,
  qaPlayEmbedRestricted,
  qaForceRevisionBump,
  qaTogglePlayPause,
  qaGetPlayerSnapshot,
  qaLoadPlayableTestQueue,
  TEST_PLAYABLE_TRACKS,
} from '@/dev/qaActions';
import { runStorageMaintenance } from '@/lib/storageMaintenance';
import {
  buildAnalyticsExportBundle,
  getBetaDiagnosticsSnapshot,
} from '@/services/beta/betaDiagnostics';
import { buildOperationsMetrics } from '@/services/operations/operationsMetrics';
import { resetMoodplayLocalStorage } from '@/services/beta/asyncStorageReset';
import { useBetaDiagnosticsStore } from '@/stores/betaDiagnosticsStore';
import { usePlaybackDebugStore } from '@/stores/playbackDebugStore';
import { usePlayerStore } from '@/stores/playerStore';
import {
  buildFeedbackInsightReport,
  type FeedbackInsightReport,
  type FeedbackInsight,
} from '@/dev/feedbackInsights';
import { useFeedbackStore } from '@/stores/feedbackStore';
import {
  processFeedbackQueue,
  getFeedbackQueueSummary,
} from '@/services/feedback/feedbackUploader';

// ─── 공통 컴포넌트 ────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function Btn({
  title,
  onPress,
  variant = 'secondary',
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const btnStyle =
    variant === 'primary'
      ? styles.btn
      : variant === 'danger'
        ? styles.btnDanger
        : styles.btnSecondary;
  const textStyle =
    variant === 'secondary' ? styles.btnSecondaryText : styles.btnText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [btnStyle, pressed && styles.pressed]}>
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

// ─── 탭 타입 ──────────────────────────────────────

type DevTab = 'overview' | 'playback' | 'qa' | 'risk' | 'feedback' | 'actions';

const TAB_LABELS: Record<DevTab, string> = {
  overview: '개요',
  playback: '재생',
  qa: 'QA',
  risk: '위험도',
  feedback: '피드백',
  actions: '도구',
};

// ─── 메인 스크린 ──────────────────────────────────

export default function DevScreen() {
  const enabled = isBetaQaEnabled();
  const [activeTab, setActiveTab] = useState<DevTab>('overview');
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Beta QA' }} />
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>
            Beta QA는 개발·프리뷰 빌드에서만 사용할 수 있어요.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Beta QA / Ops',
          headerStyle: { backgroundColor: moodTheme.bg },
          headerTintColor: moodTheme.text,
        }}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(Object.keys(TAB_LABELS) as DevTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {TAB_LABELS[tab]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'overview' && <OverviewTab busy={busy} setBusy={setBusy} />}
        {activeTab === 'playback' && <PlaybackTab />}
        {activeTab === 'qa' && <QaTab />}
        {activeTab === 'risk' && <RiskTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'actions' && <ActionsTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Overview Tab ─────────────────────────────────

function OverviewTab({
  busy,
  setBusy,
}: {
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const snap = getBetaDiagnosticsSnapshot();
  const ops = buildOperationsMetrics();
  const lastFallback = useBetaDiagnosticsStore((s) => s.lastFallbackReason);
  const lastEmotion = useBetaDiagnosticsStore((s) => s.lastFallbackEmotionId);

  const handleExport = useCallback(async () => {
    const bundle = buildAnalyticsExportBundle();
    await Share.share({
      message: JSON.stringify(bundle, null, 2),
      title: 'Moodplay analytics export',
    });
  }, []);

  const handleMaintenance = useCallback(() => {
    const report = runStorageMaintenance();
    Alert.alert(
      'Storage maintenance',
      report.trimmed.length
        ? `Trimmed: ${report.trimmed.join(', ')}`
        : 'Nothing to trim right now.'
    );
  }, []);

  const handleReset = useCallback(() => {
    Alert.alert(
      'AsyncStorage 초기화',
      '로컬 큐·히스토리·재생 상태가 모두 삭제됩니다. 계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const removed = await resetMoodplayLocalStorage();
              Alert.alert('완료', `${removed.length}개 키를 제거했습니다.`);
            } catch (e) {
              Alert.alert('오류', e instanceof Error ? e.message : '초기화 실패');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }, [setBusy]);

  return (
    <>
      <SectionHeader title="진단" />
      <View style={styles.card}>
        <Row label="App version" value={snap.appVersion} />
        <Row label="Environment" value={snap.appEnv} />
        <Row label="Rec source" value={snap.recommendationSource} />
        <Row label="Strategy" value={snap.recommendationStrategy} />
        <Row label="Analytics buffer" value={String(snap.analyticsBufferCount)} />
        <Row
          label="Playback fail (tracked/blocked)"
          value={`${snap.playbackFailTracked} / ${snap.playbackFailBlocked}`}
        />
        <Row
          label="Last fallback"
          value={
            lastFallback
              ? `${lastFallback}${lastEmotion ? ` (${lastEmotion})` : ''}`
              : '—'
          }
        />
        <Row label="Queue size" value={String(snap.queuePersistSize)} />
      </View>

      <SectionHeader title="운영 지표" />
      <View style={styles.card}>
        <Row
          label="Rec success"
          value={`${(ops.rates.recommendation_success_rate * 100).toFixed(1)}%`}
        />
        <Row
          label="Skip rate"
          value={`${(ops.rates.playback_skip_rate * 100).toFixed(1)}%`}
        />
        <Row
          label="Completion rate"
          value={`${(ops.rates.playlist_completion_rate * 100).toFixed(1)}%`}
        />
        <Row
          label="Repeat play"
          value={`${(ops.rates.repeat_play_rate * 100).toFixed(1)}%`}
        />
        <Row
          label="Satisfaction (👍)"
          value={`${(ops.rates.recommendation_satisfaction_rate * 100).toFixed(1)}%`}
        />
      </View>
      {ops.alerts.length > 0 && (
        <View style={styles.card}>
          {ops.alerts.map((a) => (
            <Text key={a} style={styles.alertText}>
              ⚠ {a}
            </Text>
          ))}
        </View>
      )}

      <SectionHeader title="Embed-Safe 정책" />
      <EmbedSafeStats />

      <SectionHeader title="도구" />
      <Btn title="Analytics Export (Share)" onPress={handleExport} variant="primary" />
      <Btn title="Storage maintenance" onPress={handleMaintenance} />
      {busy ? (
        <ActivityIndicator color={moodTheme.primary} />
      ) : (
        <Btn title="AsyncStorage 초기화" onPress={handleReset} variant="danger" />
      )}
    </>
  );
}

function EmbedSafeStats() {
  const catalogStats = getCatalogPlayabilityStats();
  const { diagnostics } = applyEmbedSafeFilter(ALL_SEED_TRACKS);

  const playableColor =
    diagnostics.playableRatio > 0.7
      ? '#44CC44'
      : diagnostics.playableRatio > 0.4
        ? '#FFB444'
        : '#FF4444';

  return (
    <View style={styles.card}>
      <Row label="총 seed tracks" value={String(ALL_SEED_TRACKS.length)} />
      <Row
        label="추천 가능 (playable)"
        value={`${diagnostics.candidateCount} (${Math.round(diagnostics.playableRatio * 100)}%)`}
      />
      <View style={{ flexDirection: 'row', gap: 4, marginVertical: 4 }}>
        <View style={{ flex: diagnostics.verifiedCount, height: 6, backgroundColor: '#44CC44', borderRadius: 3 }} />
        <View style={{ flex: diagnostics.pendingCount || 0.1, height: 6, backgroundColor: '#FFB444', borderRadius: 3 }} />
        <View style={{ flex: diagnostics.unknownCount || 0.1, height: 6, backgroundColor: '#888', borderRadius: 3 }} />
        <View style={{ flex: diagnostics.blockedCount + diagnostics.healthBlockedCount || 0.1, height: 6, backgroundColor: '#FF4444', borderRadius: 3 }} />
      </View>
      <Row label="✅ verified" value={String(diagnostics.verifiedCount)} />
      <Row label="⏳ pending" value={String(diagnostics.pendingCount)} />
      <Row label="❓ unknown" value={String(diagnostics.unknownCount)} />
      <Row label="🚫 blocked (catalog)" value={String(diagnostics.blockedCount)} />
      <Row label="🚫 blocked (health)" value={String(diagnostics.healthBlockedCount)} />
      <Row label="degrade level" value={diagnostics.degradeLevel} />
      {diagnostics.fallbackReason && (
        <Row label="fallback reason" value={diagnostics.fallbackReason} />
      )}
      <Row label="catalogMeta entries" value={String(catalogStats.total)} />
    </View>
  );
}

// ─── Playback Tab ─────────────────────────────────

function PlaybackTab() {
  const report = buildPlaybackStabilityReport();
  const dbg = usePlaybackDebugStore();
  const ps = usePlayerStore();

  const currentYoutubeId = dbg.youtubeId;

  const openInYouTube = useCallback(() => {
    if (!currentYoutubeId) return;
    const url = `https://www.youtube.com/watch?v=${currentYoutubeId}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('열기 실패', url)
    );
  }, [currentYoutubeId]);

  return (
    <>
      <SectionHeader title="플레이어 상태" />
      <View style={styles.card}>
        <Row label="youtubeId" value={dbg.youtubeId ?? '—'} />
        <Row
          label="iframe"
          value={`${dbg.iframeReady ? 'READY' : 'NOT READY'} · ${dbg.iframeState}`}
        />
        <Row
          label="store"
          value={`${ps.isPlaying ? '▶' : '⏸'} ${ps.playbackStatus} · idx ${ps.currentIndex}/${ps.queue.length}`}
        />
        <Row
          label="progress"
          value={`${ps.positionSec.toFixed(0)}s / ${ps.durationSec.toFixed(0)}s`}
        />
        <Row label="queueRevision" value={String(ps.queueRevision)} />
        <Row label="iframe mounts" value={String(report.iframeMountCount)} />
        {ps.playbackErrorKind && (
          <Row label="error" value={`${ps.playbackErrorKind}: ${ps.playbackErrorMessage ?? ''}`} />
        )}
      </View>

      {currentYoutubeId && (
        <Btn
          title={`YouTube에서 열기 (${currentYoutubeId})`}
          onPress={openInYouTube}
          variant="primary"
        />
      )}

      <SectionHeader title="재생 안정성 리포트" />
      <View style={styles.card}>
        <Row
          label="tracked / blocked"
          value={`${report.totalTracked} / ${report.totalBlocked}`}
        />
        <Row label="total fail events" value={String(report.totalFailEvents)} />
        <Row label="buffering stuck" value={String(report.bufferingStuckCount)} />
        <Row label="remount ratio" value={report.remountRatio.toFixed(2)} />
      </View>

      {report.reasonBreakdown.length > 0 && (
        <>
          <SectionHeader title="reason 분류" />
          <View style={styles.card}>
            {report.reasonBreakdown.map((r) => (
              <Row
                key={r.reason}
                label={r.reason}
                value={`${r.count}건 (${(r.ratio * 100).toFixed(0)}%)`}
              />
            ))}
          </View>
        </>
      )}

      {report.topFailedTracks.length > 0 && (
        <>
          <SectionHeader title="Top Failed Tracks" />
          <View style={styles.card}>
            {report.topFailedTracks.slice(0, 8).map((t) => (
              <View key={t.youtubeId} style={styles.row}>
                <Text style={styles.rowLabel}>
                  {t.blocked ? '🚫' : '⚠'} {t.youtubeId.slice(0, 11)}
                </Text>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {t.title ?? '—'} · {t.failCount}fail · {t.topReason}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {report.recentSkipReasons.length > 0 && (
        <>
          <SectionHeader title="최근 skip 사유" />
          <View style={styles.card}>
            {report.recentSkipReasons.slice(0, 10).map((reason, i) => (
              <Text key={i} style={styles.logLine}>
                {reason}
              </Text>
            ))}
          </View>
        </>
      )}
    </>
  );
}

// ─── QA Checklist Tab ─────────────────────────────

function QaTab() {
  const [, forceUpdate] = useState(0);
  const summary = getQaSummary();
  const checklist = getQaChecklist();

  const toggle = (id: string, current: QaStatus) => {
    const next: QaStatus = current === 'pass' ? 'fail' : current === 'fail' ? 'pending' : 'pass';
    updateCheckStatus(id, next);
    forceUpdate((n) => n + 1);
  };

  const statusEmoji = (s: QaStatus) =>
    s === 'pass' ? '✅' : s === 'fail' ? '❌' : '⬜';

  return (
    <>
      <SectionHeader title="QA 요약" />
      <View style={styles.card}>
        <Row label="total" value={String(summary.total)} />
        <Row label="pass" value={String(summary.pass)} />
        <Row label="fail" value={String(summary.fail)} />
        <Row label="pending" value={String(summary.pending)} />
      </View>

      {QA_CATEGORIES.map((cat) => {
        const items = checklist.filter((c) => c.category === cat);
        const catSummary = summary.byCategory[cat];
        return (
          <View key={cat}>
            <SectionHeader
              title={`${cat.toUpperCase()} (${catSummary.pass}/${items.length})`}
            />
            <View style={styles.card}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggle(item.id, item.status)}
                  style={styles.qaRow}>
                  <Text style={styles.qaStatus}>{statusEmoji(item.status)}</Text>
                  <View style={styles.qaContent}>
                    <Text style={styles.qaTitle}>{item.title}</Text>
                    <Text style={styles.qaDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
}

// ─── Release Risk Tab ─────────────────────────────

function RiskTab() {
  const [report, setReport] = useState<ReleaseRiskReport | null>(null);
  const [seedReport, setSeedReport] = useState<SeedQualityReport | null>(null);

  const handleRun = () => {
    setReport(buildReleaseRiskReport());
    setSeedReport(buildSeedQualityReport());
  };

  const severityColor = (s: string) =>
    s === 'P0' ? '#FF4444' : s === 'P1' ? '#FFB444' : '#88CC88';

  const verdictColor = (v: string) =>
    v === 'BLOCK' ? '#FF4444' : v === 'WARN' ? '#FFB444' : '#44CC44';

  return (
    <>
      <Btn title="위험도 평가 실행" onPress={handleRun} variant="primary" />

      {report && (
        <>
          <View style={[styles.card, { borderColor: verdictColor(report.verdict), borderWidth: 2 }]}>
            <Text style={[styles.verdictText, { color: verdictColor(report.verdict) }]}>
              {report.verdict === 'BLOCK'
                ? '🚫 BLOCK — 출시 불가'
                : report.verdict === 'WARN'
                  ? '⚠️ WARN — 조건부 출시'
                  : '✅ GO — 출시 가능'}
            </Text>
            <Row label="P0 (차단)" value={String(report.p0Count)} />
            <Row label="P1 (경고)" value={String(report.p1Count)} />
            <Row label="P2 (개선)" value={String(report.p2Count)} />
          </View>

          {report.items.map((item) => (
            <View key={item.id} style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <Text style={[styles.riskBadge, { backgroundColor: severityColor(item.severity) }]}>
                  {item.severity}
                </Text>
                <Text style={styles.riskTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.metric && (
                  <Text style={styles.riskMetric}>{item.metric}</Text>
                )}
              </View>
              <Text style={styles.riskDetail}>{item.detail}</Text>
            </View>
          ))}
        </>
      )}

      {seedReport && (
        <>
          <SectionHeader title="Seed 품질" />
          <View style={styles.card}>
            <Row
              label="played / failed"
              value={`${seedReport.totalTracksPlayed} / ${seedReport.totalTracksFailed}`}
            />
            <Row
              label="fail ratio"
              value={`${(seedReport.failedRatio * 100).toFixed(1)}%`}
            />
            <Row
              label="embed restricted"
              value={`${seedReport.embeddingRestrictedCount} (${(seedReport.embeddingRestrictedRatio * 100).toFixed(0)}%)`}
            />
            <Row
              label="dup artist ratio"
              value={`${(seedReport.duplicateArtistRatio * 100).toFixed(1)}%`}
            />
            <Row
              label="blocked tracks"
              value={String(seedReport.blockedTrackCount)}
            />
          </View>
          {seedReport.topBlockedTracks.length > 0 && (
            <View style={styles.card}>
              {seedReport.topBlockedTracks.map((t) => (
                <Row
                  key={t.youtubeId}
                  label={`🚫 ${t.youtubeId.slice(0, 11)}`}
                  value={`${t.title ?? '?'} · ${t.failCount}fail · ${t.reason}`}
                />
              ))}
            </View>
          )}
        </>
      )}
    </>
  );
}

// ─── Feedback Tab ─────────────────────────────────

function FeedbackTab() {
  const [report, setReport] = useState<FeedbackInsightReport | null>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(() => {
    setReport(buildFeedbackInsightReport());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = useCallback(async () => {
    setUploading(true);
    try {
      const result = await processFeedbackQueue();
      Alert.alert(
        '피드백 큐 처리',
        `업로드: ${result.uploaded}\n실패: ${result.failed}\n건너뜀: ${result.skipped}`
      );
      refresh();
    } finally {
      setUploading(false);
    }
  }, [refresh]);

  const queueSummary = getFeedbackQueueSummary();

  return (
    <View>
      <SectionHeader title="피드백 큐" />
      <Row label="전체" value={String(queueSummary.total)} />
      <Row label="대기 (pending)" value={String(queueSummary.pending)} />
      <Row label="업로드 완료" value={String(queueSummary.uploaded)} />
      <Row label="실패" value={String(queueSummary.failed)} />
      <View style={styles.gap8}>
        <Btn
          title={uploading ? '처리 중...' : '큐 업로드 실행'}
          onPress={handleUpload}
          disabled={uploading}
        />
        <Btn title="새로고침" onPress={refresh} variant="secondary" />
        <Btn
          title="큐 초기화"
          onPress={() => {
            useFeedbackStore.getState().clear();
            refresh();
          }}
          variant="danger"
        />
      </View>

      {report && (
        <>
          <SectionHeader title="전체 만족도" />
          <Row label="총 피드백" value={String(report.totalFeedback)} />
          <Row
            label="만족도"
            value={`${(report.overallSatisfaction * 100).toFixed(0)}%`}
          />
          <Row label="반복 불만" value={String(report.repetitionComplaints)} />
          <Row label="분위기 불일치" value={String(report.moodMismatchComplaints)} />
          <Row label="재생 문제" value={String(report.playbackComplaints)} />

          {report.byEmotion.length > 0 && (
            <>
              <SectionHeader title="감정별 피드백" />
              {report.byEmotion.map((es) => (
                <View key={es.emotionId} style={styles.riskCard}>
                  <Text style={styles.rowLabel}>
                    {es.emotionId} ({es.total}건)
                  </Text>
                  <Text style={styles.rowValue}>
                    👍{es.great} 😐{es.ok} 👎{es.poor} · dislike{' '}
                    {(es.dislikeRatio * 100).toFixed(0)}%
                  </Text>
                  {es.topComments.length > 0 && (
                    <Text style={styles.commentText} numberOfLines={2}>
                      "{es.topComments[0]}"
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          {report.byStrategy.length > 0 && (
            <>
              <SectionHeader title="전략별 만족도" />
              {report.byStrategy.map((ss) => (
                <Row
                  key={ss.strategyId}
                  label={ss.strategyId}
                  value={`${(ss.satisfactionScore * 100).toFixed(0)}% (${ss.total}건)`}
                />
              ))}
            </>
          )}

          {report.insights.length > 0 && (
            <>
              <SectionHeader title="자동 Insights" />
              {report.insights.map((ins) => (
                <View key={ins.id} style={styles.riskCard}>
                  <View style={styles.riskHeader}>
                    <Text
                      style={[
                        styles.riskBadge,
                        {
                          backgroundColor:
                            ins.severity === 'critical'
                              ? '#FF4444'
                              : ins.severity === 'warning'
                                ? '#FFB444'
                                : '#88CC88',
                        },
                      ]}>
                      {ins.severity.toUpperCase()}
                    </Text>
                    <Text style={styles.riskTitle}>{ins.title}</Text>
                  </View>
                  <Text style={styles.riskDetail}>{ins.detail}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

// ─── Actions Tab (QA Test Tools) ──────────────────

function ActionsTab() {
  const [singleId, setSingleId] = useState('');
  const [snapshot, setSnapshot] = useState('');

  return (
    <>
      <SectionHeader title="✅ Embed-Safe 재생 테스트" />
      <View style={styles.card}>
        <Text style={styles.rowLabel}>
          {TEST_PLAYABLE_TRACKS.length}곡 · Topic/Official Audio only · 100% playable
        </Text>
      </View>
      <Btn
        title={`▶ Load Playable Test Queue (${TEST_PLAYABLE_TRACKS.length}곡)`}
        onPress={qaLoadPlayableTestQueue}
        variant="primary"
      />

      <SectionHeader title="큐 테스트" />
      <Btn title="▶ 3곡 큐 강제 생성" onPress={qaForceQueue} variant="primary" />
      <Btn title="▶ 5곡 큐 강제 생성" onPress={qaForceQueueFull} />
      <Btn title="▶ embed 제한 테스트" onPress={qaPlayEmbedRestricted} variant="danger" />

      <SectionHeader title="단일 재생" />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="youtubeId"
          placeholderTextColor={moodTheme.textDim}
          value={singleId}
          onChangeText={setSingleId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Btn
          title="재생"
          onPress={() => {
            if (singleId.trim()) qaPlaySingleId(singleId.trim());
          }}
          variant="primary"
        />
      </View>

      <SectionHeader title="플레이어 제어" />
      <Btn title="⏯ Play/Pause 토글" onPress={qaTogglePlayPause} />
      <Btn title="🔄 queueRevision 강제 증가" onPress={qaForceRevisionBump} />

      <SectionHeader title="진단" />
      <Btn
        title="📋 Player Snapshot"
        onPress={() => setSnapshot(qaGetPlayerSnapshot())}
      />
      {snapshot ? (
        <View style={styles.card}>
          <Text style={styles.snapshotText} selectable>
            {snapshot}
          </Text>
        </View>
      ) : null}

      <SectionHeader title="데이터" />
      <Btn
        title="Debug log 초기화"
        onPress={() => usePlaybackDebugStore.getState().reset()}
      />
    </>
  );
}

// ─── 스타일 ───────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: moodTheme.bg,
  },
  scroll: {
    padding: moodTheme.spacing.screen,
    gap: moodTheme.spacing.md,
    paddingBottom: 60,
  },
  blocked: {
    flex: 1,
    justifyContent: 'center',
    padding: moodTheme.spacing.screen,
    gap: moodTheme.spacing.lg,
  },
  blockedText: {
    color: moodTheme.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: moodTheme.border,
    backgroundColor: moodTheme.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: moodTheme.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: moodTheme.textDim,
  },
  tabTextActive: {
    color: moodTheme.primary,
  },

  section: {
    fontSize: 11,
    fontWeight: '700',
    color: moodTheme.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
  },
  card: {
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.lg,
    borderWidth: 1,
    borderColor: moodTheme.border,
    padding: moodTheme.spacing.md,
    gap: 10,
  },
  row: {
    gap: 3,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: moodTheme.textDim,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 13,
    color: moodTheme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Buttons
  btn: {
    backgroundColor: moodTheme.primary,
    borderRadius: moodTheme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: '#C44B4B',
    borderRadius: moodTheme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: moodTheme.border,
  },
  btnSecondaryText: {
    color: moodTheme.text,
    fontWeight: '600',
    fontSize: 14,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.88,
  },
  alertText: {
    fontSize: 12,
    color: '#FFB4B4',
    lineHeight: 18,
  },

  // QA checklist
  qaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  qaStatus: {
    fontSize: 16,
    marginTop: 1,
  },
  qaContent: {
    flex: 1,
  },
  qaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: moodTheme.text,
  },
  qaDesc: {
    fontSize: 11,
    color: moodTheme.textMuted,
    lineHeight: 16,
  },

  // Risk
  riskCard: {
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.md,
    padding: moodTheme.spacing.md,
    borderWidth: 1,
    borderColor: moodTheme.border,
    gap: 6,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskBadge: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: moodTheme.text,
  },
  riskMetric: {
    fontSize: 12,
    fontWeight: '700',
    color: moodTheme.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  riskDetail: {
    fontSize: 11,
    color: moodTheme.textMuted,
    lineHeight: 16,
  },
  verdictText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Actions
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    borderColor: moodTheme.border,
    borderRadius: moodTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: moodTheme.text,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  snapshotText: {
    fontSize: 10,
    color: moodTheme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  logLine: {
    fontSize: 11,
    color: moodTheme.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  commentText: {
    fontSize: 11,
    color: moodTheme.textDim,
    fontStyle: 'italic',
    marginTop: 2,
  },
  gap8: {
    gap: 8,
    marginTop: 8,
  },
});
