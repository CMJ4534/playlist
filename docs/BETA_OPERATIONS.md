# Beta 운영 가이드

## Beta QA 화면

- **경로**: 설정 → Beta QA / Dev (`/dev`)
- **노출**: `isBetaQaEnabled()` — `__DEV__`, non-production `APP_ENV`, 또는 `EXPO_PUBLIC_BETA_QA=1`
- **preview 빌드**: `eas.json` preview 프로필에 `EXPO_PUBLIC_BETA_QA=1` 포함

### 표시 항목

| 항목 | 설명 |
|------|------|
| App version | `expo-constants` |
| Environment | `EXPO_PUBLIC_APP_ENV` |
| Recommendation source | mock / supabase |
| Strategy | `ACTIVE_RECOMMENDATION_STRATEGY` |
| Analytics buffer | 메모리 버퍼 이벤트 수 |
| Playback fail | health store tracked / blocked |
| Last fallback | `recommendation_fallback` 시 기록 |

### 도구

- **Analytics / Export**: Share로 JSON 덤프 (`buildAnalyticsExportBundle`)
- **Storage maintenance**: exposure / playback health / queue trim
- **AsyncStorage reset**: `moodplay-*` 키 제거 + in-memory store 초기화

## 스토리지 상한 (`STORAGE_LIMITS`)

| 영역 | 상한 | trim 시점 |
|------|------|-----------|
| Player queue persist | 40곡 | `setQueue`, 앱 시작 maintenance |
| Playback health | 80 entries | `recordFailure` 후 |
| Exposure map | 120 keys | `recordTracks` 후 |
| Analytics buffer | 500 events | push 시 자동 slice |

## 피드백

`submitFeedback()` → 로컬 큐 `moodplay-feedback-queue` (서버 미연동).  
`feedback_submitted` analytics 이벤트.

## A/B 메타

- `ACTIVE_RECOMMENDATION_STRATEGY` / `RECOMMENDATION_STRATEGY_VERSION`
- `PlaylistRecommendation.generationMeta` (mock·curated 경로)
- env: `EXPO_PUBLIC_RECOMMENDATION_STRATEGY`

## 온보딩

첫 실행 3장 슬라이드 → `moodplay-onboarding` persist.  
Beta reset 시 온보딩도 초기화됨.
