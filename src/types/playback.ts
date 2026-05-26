/** YouTube WebView 재생 상태 — MiniPlayer·HiddenPlayer 동기화 */
export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'error';

export type PlaybackErrorKind =
  | 'embed_not_allowed'
  | 'video_not_found'
  | 'html5_error'
  | 'invalid_parameter'
  | 'timeout'
  | 'unknown_error'
  | 'unknown';

/** 운영·헬스 집계용 (unknown → unknown_error 통일) */
export type PlaybackFailReason =
  | PlaybackErrorKind
  | 'embedding_restricted';

export function normalizeFailReason(
  kind: PlaybackErrorKind
): 'embedding_restricted' | 'timeout' | 'unknown_error' | PlaybackErrorKind {
  if (kind === 'embed_not_allowed') return 'embedding_restricted';
  if (kind === 'unknown') return 'unknown_error';
  if (kind === 'timeout') return 'timeout';
  if (
    kind === 'video_not_found' ||
    kind === 'html5_error' ||
    kind === 'invalid_parameter'
  ) {
    return kind;
  }
  return 'unknown_error';
}
