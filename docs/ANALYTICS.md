# Analytics 이벤트 카탈로그

## 사용

```ts
import { trackEvent, buildAnalyticsInsights } from '@/services/analytics';

trackEvent('recommendation_requested', {
  emotionId: 'sad',
  hasSituation: true,
  excludeCount: 12,
});
```

## 이벤트

| Event | 용도 |
|-------|------|
| `recommendation_requested` | 추천 요청 |
| `recommendation_success` | Edge/mock 성공 |
| `recommendation_fallback` | 오프라인·Edge 실패 fallback |
| `track_play` | 재생 시작 |
| `track_skip` | 다음/자동 skip |
| `playback_error` | 재생 불가 |
| `playlist_completed` | 마지막 곡까지 재생 |

## KPI 매핑

| KPI | 계산 |
|-----|------|
| 추천 성공률 | success / (success + fallback) |
| 재생 시작률 | track_play / recommendation_success (근사) |
| skip 비율 | track_skip / track_play |
| 감정별 사용량 | recommendation_requested by emotionId |
| 플레이리스트 완주율 | playlist_completed / sessions with play |
| playback error 비율 | playback_error / track_play |

## 로컬 인사이트 (DEV)

```ts
import { logAnalyticsInsights } from '@/services/analytics';
logAnalyticsInsights();
```

## Provider 연동 (추후)

`registerAnalyticsProvider(mixpanelProvider)` — `AnalyticsProvider` 인터페이스 구현.
