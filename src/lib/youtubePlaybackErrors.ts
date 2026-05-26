import type { PlaybackErrorKind } from '@/types/playback';

/** react-native-youtube-iframe PLAYER_ERRORS → 내부 분류 */
export function mapYoutubePlayerError(error: string): PlaybackErrorKind {
  switch (error) {
    case 'embed_not_allowed':
      return 'embed_not_allowed';
    case 'video_not_found':
      return 'video_not_found';
    case 'HTML5_error':
      return 'html5_error';
    case 'invalid_parameter':
      return 'invalid_parameter';
    default:
      return 'unknown_error';
  }
}

export function playbackErrorLabel(kind: PlaybackErrorKind): string {
  switch (kind) {
    case 'embed_not_allowed':
      return '재생 제한된 곡';
    case 'video_not_found':
      return '영상을 찾을 수 없음';
    case 'html5_error':
      return '재생 오류';
    case 'invalid_parameter':
      return '잘못된 영상 ID';
    case 'timeout':
      return '로딩 시간 초과';
    case 'unknown_error':
    case 'unknown':
      return '재생할 수 없음';
  }
}

/** 자동 skip 대상 오류 */
export function isSkippablePlaybackError(kind: PlaybackErrorKind): boolean {
  return kind !== 'unknown';
}
