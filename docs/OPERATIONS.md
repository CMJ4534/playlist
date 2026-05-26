# Moodplay 베타 운영 가이드

실제 사용자 데이터로 **추천 품질·이탈·재방문**을 판단하기 위한 운영 문서입니다.

---

## 1. 매일 확인할 지표

Beta QA → **Export** 또는 `buildOperationsMetrics()` 스냅샷.

| 지표 | 의미 | 건강 기준 (베타) |
|------|------|------------------|
| `recommendation_success_rate` | success / (success + fallback) | **≥ 85%** |
| `playback_skip_rate` | skip / play | **≤ 35%** |
| `playlist_completion_rate` | completed / play 세션 | **≥ 15%** (큐 길이 고려) |
| `repeat_play_rate` | replay / queue_start | 상승 추세면 D1 신호 양호 |
| `home_revisit_rate` | (home 방문−1) / (앱 오픈−1) | **≥ 40%** 목표 |
| `routine_usage_rate` | routine_used / pinned routines | 루틴 노출 대비 사용 |
| `recommendation_satisfaction_rate` | 👍 / (👍+😐+👎) | **≥ 55%** |

### 감정별 (`emotionBreakdown`)

- **fallbackRate** — 감정별 Edge/seed 문제
- **skipRate** — 재생 품질·곡 적합도
- **satisfactionRate** — 추천 만족도

### 이탈 (`funnel`)

`recommendation_requested` → `success` → `queue_start` → `track_play` → `playlist_completed` → `feedback_submitted`

단계별 `dropoffFromPrevious`가 큰 구간 = UX·품질 개선 우선순위.

### 스킵 핫스팟 (`topSkippedTracks`)

`skipCount` 상위 `youtubeId` → `catalogMeta` / `replacements.json` / `verify:tracks:playback` 재검증.

---

## 2. Fallback 비율

| 수준 | 전체 fallback / requested | 조치 |
|------|---------------------------|------|
| 정상 | < 15% | 모니터링만 |
| 주의 | 15–30% | 감정별 breakdown, Edge 로그 |
| 위험 | ≥ 30% | Claude 키, Supabase, seed, 타임아웃 |

감정 단위 **fallback ≥ 30%** (요청 3회 이상) → 해당 감정 seed·프롬프트 우선 점검.

---

## 3. Skip rate

| 수준 | skip / play | 조치 |
|------|-------------|------|
| 정상 | < 25% | — |
| 주의 | 25–40% | 상위 skip 곡 catalog 처리 |
| 위험 | ≥ 40% | embed 정책, 첫 곡 품질, 큐 길이 단축 검토 |

`isAutoSkip: true` 비율이 높으면 **YouTube 재생 실패**가 주원인.

---

## 4. 추천 품질 이상 징후

- 👎 비율이 특정 **감정**에만 집중
- fallback ↑ 인데 satisfaction 유지 → seed 품질 문제 (AI 스펙은 정상)
- completion ↓ + skip ↑ → 첫 3곡 mismatch
- `repeat_play_rate` ↑ 인데 satisfaction ↓ → 같은 곡만 반복 노출
- 홈 `home_revisit_rate` ↓ → 홈 UX·이어듣기·다시듣기 마찰

`operations.alerts` 배열에 휴리스틱 경고가 자동 생성됩니다.

---

## 5. Seed 품질 관리

```bash
npm run verify:tracks
YOUTUBE_API_KEY=xxx npm run verify:tracks:playback
npm run seed:sync-meta
```

| 작업 | 주기 |
|------|------|
| `verify:tracks:playback` (sad/dawn/walking) | 배포 전·fallback ↑ 시 |
| `replacements.json` 반영 | skip 상위 ID 발견 시 |
| `catalogMeta` disabled 플래그 | playback_error 반복 시 |
| 감정별 곡 수 ≥ 30 | 신규 감정 추가 시 |

---

## 6. Beta 운영 루틴

### 매일 (10분)

1. TestFlight 크래시 / Sentry (연결 시)
2. Beta QA Export 1–2건 (문제 재현 유저)
3. `operations.rates` 6개 + `alerts` 확인
4. fallback·skip 상위 감정·곡 메모

### 매주

1. 감정별 satisfaction·fallback 트렌드
2. seed playback 검증 재실행
3. `remote config` / feature flag 조정 (피드백 프롬프트, 전략 rollout)
4. `GROWTH.md` 지표와 교차 검토

### 배포 전

- [ ] `verify:tracks:playback` 통과
- [ ] preview `EXPO_PUBLIC_BETA_QA=1`
- [ ] production fallback 알림 임계값 확인

---

## 7. 구조 참고

| 영역 | 경로 |
|------|------|
| 운영 지표 | `src/services/operations/operationsMetrics.ts` |
| Feature flags | `src/config/featureFlags.ts` |
| Remote config | `src/config/remoteConfig.ts` |
| 전략 rollout | `src/config/recommendationRollout.ts` |
| Analytics 교체 | `src/config/analyticsBootstrap.ts` |
| 좋아요·저장 | `src/stores/userLibraryStore.ts` |
| 품질 피드백 UI | `src/components/feedback/PlaylistQualityPrompt.tsx` |
| Growth 세션 | `src/stores/growthSessionStore.ts` |

---

## 8. 100명 → 1,000명 — 먼저 터질 가능성 높은 부분

### 높음 (사용자 체감·서비스 중단)

1. **Supabase Edge `/recommend` + Claude** — 동시 요청·타임아웃·비용. 1000 DAU 시 피크 QPS·`RECOMMEND_TIMEOUT_MS`·캐시 없음.
2. **YouTube embed 제한** — 스킵·error 급증, 지원 이슈 폭증. 인프라가 아닌 **콘텐츠 정책** 한계.
3. **tracks DB 풀 크기** — diverse select 품질 저하·반복. seed·DB 확장 없으면 만족도 하락.

### 중간 (데이터·성능)

4. **클라이언트 AsyncStorage** — analytics buffer·history·library 누적. `runStorageMaintenance` 필수, 서버 sync 전까지 기기별 상한.
5. **로컬 analytics만** — 1000명 운영 판단 불가. **warehouse + Mixpanel/Amplitude** 조기 연결 권장.
6. **피드백 큐 로컬만** — `moodplay-feedback-queue` 서버 미전송 시 인사이트 유실.

### 낮음 (초기)

7. **Remote config 미연동** — env만으로는 A/B·kill switch 느림.
8. **단일 region Edge** — 글로벌 latency.

### 완화 우선순위

1. 서버 analytics + 일일 대시보드 (6개 rate)
2. Edge fallback 모니터링·알림
3. seed playback CI 게이트
4. recommend 응답 캐시 (emotion + situation hash)
5. userTasteProfile 서버 persist (기기 변경)

---

## 9. Feature flags (기본)

| Flag | 기본 | 용도 |
|------|------|------|
| `enablePlaylistFeedbackPrompt` | on | 👍😐👎 프롬프트 |
| `enableLikeSave` | on | 좋아요·저장 |
| `enableBetaQa` | preview | Dev 화면 |
| `enablePlaybackDebug` | dev | 오버레이 |

`remoteConfig` 캐시 갱신: 앱 시작 시 `fetchRemoteConfig()` (현재 로컬 defaults, URL 연동 TODO).
