/**
 * 출시 전 위험도 자동 평가 — P0 / P1 / P2 항목 산출.
 * Beta QA 화면에서 호출하여 현재 상태의 출시 위험도를 표시한다.
 */
import { buildPlaybackStabilityReport } from './playbackStabilityReport';
import { buildSeedQualityReport } from './seedQualityReport';
import { getQaSummary } from './qaChecklist';
import { buildOperationsMetrics } from '@/services/operations/operationsMetrics';

export type RiskSeverity = 'P0' | 'P1' | 'P2';

export type RiskItem = {
  id: string;
  severity: RiskSeverity;
  title: string;
  detail: string;
  /** 지표값 (UI 표시용) */
  metric?: string;
};

export type ReleaseRiskReport = {
  generatedAt: string;
  items: RiskItem[];
  p0Count: number;
  p1Count: number;
  p2Count: number;
  verdict: 'BLOCK' | 'WARN' | 'GO';
};

export function buildReleaseRiskReport(): ReleaseRiskReport {
  const items: RiskItem[] = [];

  const ops = buildOperationsMetrics();
  const playback = buildPlaybackStabilityReport();
  const seed = buildSeedQualityReport();
  const qa = getQaSummary();

  // ── P0: 출시 차단 ────────────────────────────────

  if (ops.rates.recommendation_success_rate < 0.7) {
    items.push({
      id: 'risk-rec-fail',
      severity: 'P0',
      title: '추천 성공률 위험',
      detail: '추천 성공률이 70% 미만 — Edge 또는 seed DB 장애',
      metric: `${(ops.rates.recommendation_success_rate * 100).toFixed(1)}%`,
    });
  }

  if (playback.totalTracked > 5 && playback.totalBlocked / playback.totalTracked > 0.3) {
    items.push({
      id: 'risk-blocked-high',
      severity: 'P0',
      title: '차단 트랙 비율 위험',
      detail: `전체 트랙의 30%+ 차단됨 (${playback.totalBlocked}/${playback.totalTracked})`,
      metric: `${((playback.totalBlocked / playback.totalTracked) * 100).toFixed(1)}%`,
    });
  }

  if (qa.fail > 0) {
    items.push({
      id: 'risk-qa-fail',
      severity: 'P0',
      title: 'QA 체크 실패 항목 존재',
      detail: `${qa.fail}개 항목이 FAIL 상태`,
      metric: `${qa.fail} fail`,
    });
  }

  // ── P1: 주요 경고 ────────────────────────────────

  if (ops.rates.playback_skip_rate > 0.35) {
    items.push({
      id: 'risk-skip-high',
      severity: 'P1',
      title: '재생 스킵률 높음',
      detail: '스킵률 35%+ — embed 제한·카탈로그 품질 점검 필요',
      metric: `${(ops.rates.playback_skip_rate * 100).toFixed(1)}%`,
    });
  }

  if (seed.failedRatio > 0.2) {
    items.push({
      id: 'risk-fail-ratio',
      severity: 'P1',
      title: '트랙 실패 비율 높음',
      detail: `실패 비율 ${(seed.failedRatio * 100).toFixed(1)}% — 20% 초과`,
      metric: `${(seed.failedRatio * 100).toFixed(1)}%`,
    });
  }

  if (seed.embeddingRestrictedCount >= 5) {
    items.push({
      id: 'risk-embed-restricted',
      severity: 'P1',
      title: 'embed 제한 곡 다수',
      detail: `${seed.embeddingRestrictedCount}곡이 embed 제한 — 카탈로그 교체 필요`,
      metric: `${seed.embeddingRestrictedCount}곡`,
    });
  }

  if (ops.rates.playlist_completion_rate < 0.15) {
    items.push({
      id: 'risk-completion-low',
      severity: 'P1',
      title: '플레이리스트 완주율 매우 낮음',
      detail: '완주율 15% 미만 — 첫 곡 품질 또는 큐 길이 문제',
      metric: `${(ops.rates.playlist_completion_rate * 100).toFixed(1)}%`,
    });
  }

  if (playback.bufferingStuckCount >= 3) {
    items.push({
      id: 'risk-buffering-stuck',
      severity: 'P1',
      title: 'buffering stuck 반복 발생',
      detail: `${playback.bufferingStuckCount}회 buffering에서 재생 전환 실패`,
      metric: `${playback.bufferingStuckCount}회`,
    });
  }

  // ── P2: 개선 권장 ────────────────────────────────

  if (seed.duplicateArtistRatio > 0.3) {
    items.push({
      id: 'risk-dup-artist',
      severity: 'P2',
      title: '아티스트 중복 비율 높음',
      detail: '동일 아티스트 곡이 30%+ — 다양성 부족',
      metric: `${(seed.duplicateArtistRatio * 100).toFixed(1)}%`,
    });
  }

  if (playback.remountRatio > 3) {
    items.push({
      id: 'risk-remount-high',
      severity: 'P2',
      title: 'iframe remount 과도',
      detail: `remount 비율 ${playback.remountRatio.toFixed(1)}x — 성능 확인 필요`,
      metric: `${playback.remountRatio.toFixed(1)}x`,
    });
  }

  if (qa.pending > qa.total * 0.5) {
    items.push({
      id: 'risk-qa-pending',
      severity: 'P2',
      title: 'QA 미검증 항목 다수',
      detail: `${qa.pending}/${qa.total} 항목 아직 pending 상태`,
      metric: `${qa.pending} pending`,
    });
  }

  if (ops.rates.recommendation_success_rate >= 0.7 && ops.rates.recommendation_success_rate < 0.85) {
    items.push({
      id: 'risk-rec-warn',
      severity: 'P2',
      title: '추천 성공률 개선 필요',
      detail: `추천 성공률 ${(ops.rates.recommendation_success_rate * 100).toFixed(1)}% — 85% 목표`,
      metric: `${(ops.rates.recommendation_success_rate * 100).toFixed(1)}%`,
    });
  }

  // ── verdict ──
  const p0Count = items.filter((i) => i.severity === 'P0').length;
  const p1Count = items.filter((i) => i.severity === 'P1').length;
  const p2Count = items.filter((i) => i.severity === 'P2').length;

  let verdict: 'BLOCK' | 'WARN' | 'GO' = 'GO';
  if (p0Count > 0) verdict = 'BLOCK';
  else if (p1Count > 0) verdict = 'WARN';

  return {
    generatedAt: new Date().toISOString(),
    items: items.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)),
    p0Count,
    p1Count,
    p2Count,
    verdict,
  };
}

function severityOrder(s: RiskSeverity): number {
  return s === 'P0' ? 0 : s === 'P1' ? 1 : 2;
}
