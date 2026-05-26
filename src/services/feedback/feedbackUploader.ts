import { useFeedbackStore } from '@/stores/feedbackStore';
import type { FeedbackEntry, FeedbackUploadPayload } from '@/types/feedback';

const MAX_RETRY_ATTEMPTS = 3;
const BATCH_SIZE = 10;

/**
 * pending/failed 피드백을 서버에 업로드.
 * 현재 단계: Supabase 연결 전 local queue 관리 + 구조 준비.
 * 서버 연결 시 uploadSingle의 TODO를 구현하면 됨.
 */
export async function processFeedbackQueue(): Promise<{
  uploaded: number;
  failed: number;
  skipped: number;
}> {
  const store = useFeedbackStore.getState();
  const pending = store.getPending();
  const retriable = store
    .getFailed()
    .filter((e) => e.uploadAttempts < MAX_RETRY_ATTEMPTS);

  const toProcess = [...pending, ...retriable].slice(0, BATCH_SIZE);

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of toProcess) {
    try {
      await uploadSingle(entry);
      store.markUploaded(entry.id);
      uploaded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      store.markFailed(entry.id, msg);
      failed++;
    }
  }

  const overRetry = store
    .getFailed()
    .filter((e) => e.uploadAttempts >= MAX_RETRY_ATTEMPTS);
  skipped = overRetry.length;

  return { uploaded, failed, skipped };
}

function toUploadPayload(entry: FeedbackEntry): FeedbackUploadPayload {
  return {
    id: entry.id,
    sentiment: entry.sentiment,
    comment: entry.comment,
    category: entry.category,
    emotionId: entry.emotionId,
    playlistSessionId: entry.playlistSessionId,
    strategyId: entry.strategyId,
    strategyVersion: entry.strategyVersion,
    experimentVariant: entry.experimentVariant,
    tracksPlayed: entry.tracksPlayed,
    tracksSkipped: entry.tracksSkipped,
    queueLength: entry.queueLength,
    createdAt: entry.createdAt,
  };
}

/**
 * 단일 피드백 업로드.
 * TODO: Supabase Edge Function 또는 REST 연동 시 여기만 교체.
 */
async function uploadSingle(entry: FeedbackEntry): Promise<void> {
  const _payload = toUploadPayload(entry);

  // ── Supabase 연결 시 아래 주석 해제 ──
  // const { data, error } = await supabase
  //   .from('feedback_inbox')
  //   .insert(mapToInboxRow(payload));
  // if (error) throw new Error(error.message);

  if (__DEV__) {
    console.log('[feedbackUploader] would upload:', _payload.id, _payload.sentiment);
  }

  // 현재는 local-only: 즉시 성공 처리
  return;
}

/** 큐 상태 요약 (DEV/QA 화면용) */
export function getFeedbackQueueSummary() {
  const all = useFeedbackStore.getState().getAll();
  return {
    total: all.length,
    pending: all.filter((e) => e.status === 'pending').length,
    uploaded: all.filter((e) => e.status === 'uploaded').length,
    failed: all.filter((e) => e.status === 'failed').length,
  };
}
