# Growth · D1 유지 · 추천 품질

Moodplay는 **로컬 listening activity + recommendation history**가 쌓일수록 추천·홈 UX가 좋아지도록 설계되어 있습니다.

---

## 1. D1 유지율을 위한 UX (구현)

| 요소 | 저장소 | 역할 |
|------|--------|------|
| 이어 듣기 | `playerStore` (persist) | 큐·인덱스 복원, 홈 상단 카드 |
| 오늘의 감정 추천 | `homeSuggestions` | 시간대 + 취향 기반 감정 |
| Quick mood | 홈 칩 → `/emotion?emotionId=` | 밤·비·집중 등 1탭 진입 |
| 최근 감정 | `listeningActivityStore.emotionHistory` | 최근 사용 감정 칩 |
| 다시 듣기 | `listeningActivityStore.playlistHistory` | 플레이리스트 스냅샷 재생 |
| 감정 루틴 | `listeningActivityStore.routines` | 반복 패턴 자동·수동 핀 |
| 감성 카피 | `homeCopy.getHomeGreeting()` | 시간·취향 기반 헤드라인 |

**핵심 루프:** 홈 → (이어 듣기 | 오늘 추천 | 다시 듣기) → 재생 → 다음날 홈에서 복원·히스토리 노출.

---

## 2. 취향 프로필 (`userTasteProfile`)

### 분석 소스

- `listeningActivityStore.playbackSignals` — play / skip / complete
- `listeningActivityStore.emotionHistory` — 감정 빈도
- `recommendationHistoryStore.exposureCountByYoutubeId` — 익숙함 vs 발견

### `AnalyzedUserTasteProfile` 필드

| 필드 | 의미 |
|------|------|
| `frequentEmotionIds` | 자주 듣는 감정 |
| `preferredEnergyMin/Max/Level` | 선호 에너지 구간 |
| `favoriteArtists` | 반복 재생·완주 아티스트 |
| `favoriteMoodTags` | 잘 들은 mood 태그 |
| `skippedMoodTags` | 스킵이 많은 mood 태그 |
| `repeatPlayYoutubeIds` | 2회 이상 재생 곡 |
| `discoveryRatio` | 0=익숙함, 1=새 곡 선호 |

`buildAnalyzedUserTasteProfile()` → `getUserTasteProfileForRecommendation()` (sampleSize ≥ 3일 때만 API 전달).

---

## 3. AI 추천 역할 분리

| 단계 | 담당 | 출력 |
|------|------|------|
| Claude (Edge) | 무드·에너지·novelty **스펙** | `playlistName`, `moodTags`, `energyMin/Max`, `noveltyRatio` |
| DB + `selectDiverseTracks` | **실제 곡** | `tracks[]` |
| `userTasteProfile` | 곡 선택 가중치 | 아티스트·mood boost, 스킵 mood penalty |

클라이언트 mock 경로도 동일: `buildCuratedPlaylistResult(..., userTasteProfile)`.

---

## 4. 어떤 데이터가 쌓이면 추천이 좋아지는가

| 데이터 | 최소 효과 | 충분히 쌓이면 |
|--------|-----------|----------------|
| `emotionHistory` | 오늘의 감정·최근 칩 | 시간대별 루틴 자동 핀 |
| `playbackSignals` (skip) | — | 스킵 mood 제외, 에너지 구간 조정 |
| `playbackSignals` (play/complete) | — | favorite artist/mood, repeat boost |
| `exposureCount` | overuse 제외 | discoveryRatio 조정 |
| `playlistHistory` | 다시 듣기 | D1 복귀 동기 (재생 마찰 ↓) |

**권장:** 베타 3일 사용 후 `sampleSize ≥ 10`부터 체감 품질 상승.

---

## 5. 저장해야 하는 이벤트

### 이미 계측 (`analyticsEvents`)

- `recommendation_requested` / `success` / `fallback`
- `track_play` / `track_skip` / `playback_error`
- `playlist_completed`
- `feedback_submitted`

### 로컬 growth 신호 (`listeningActivityStore`)

- 추천 성공 시: `recordRecommendation`
- 재생: `play`, 스킵: `skip`, 플리 완주: `complete`

### 서버 연동 시 추가 권장 (미구현)

- `home_section_tap` (continue / today / replay / quick)
- `session_return` (앱 cold start, days since last open)
- `playlist_replay` vs `playlist_new`

---

## 6. 봐야 할 지표 (운영)

### D1 · 리텐션

| 지표 | 정의 | 목표 방향 |
|------|------|-----------|
| D1 retention | 설치 다음날 재실행 | ↑ |
| D1 replay rate | D0 플리 → D1 `replay` 또는 `continue` | ↑ |
| Time to second session | 첫 세션 종료 → 재방문 | ↓ |

### 추천 품질

| 지표 | 정의 |
|------|------|
| Skip rate / play | `track_skip` / `track_play` |
| Playlist completion rate | `playlist_completed` / 큐 시작 |
| Fallback rate | `recommendation_fallback` / `requested` |
| Avg tracks before abandon | 세션당 play 수 |

### 홈 UX

| 지표 | 정의 |
|------|------|
| Continue tap rate | 이어 듣기 카드 노출 대비 탭 |
| Replay from history | `다시 듣기` 탭 비율 |
| Quick mood → recommend | 칩 → 추천 완료 퍼널 |

---

## 7. 파일 맵

| 영역 | 경로 |
|------|------|
| Listening persist | `src/stores/listeningActivityStore.ts` |
| Taste 분석 | `src/lib/userTasteProfile.ts` |
| 홈 카피·추천 | `src/lib/homeCopy.ts`, `homeSuggestions.ts` |
| 다시 듣기 | `src/lib/replayPlaylist.ts` |
| 홈 UI | `app/(tabs)/index.tsx`, `src/components/home/*` |
| Mock taste | `src/lib/curatedPlaylist.ts`, `trackSelection.ts` |
| Edge taste | `supabase/functions/recommend/diverseSelect.ts` |

---

## 8. 다음 단계 (선택)

- 서버에 `UserTasteProfile` 동기화 → 기기 간 취향 유지
- `home_section_tap` analytics → 섹션별 A/B
- 플리 완주 시 루틴 핀 제안 UI
- D7 푸시: “어제 들었던 ○○ 플레이리스트”
