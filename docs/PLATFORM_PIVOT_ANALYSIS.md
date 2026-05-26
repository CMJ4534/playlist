# Platform Pivot Analysis

> MoodPlay: "YouTube iframe 재생 앱" → "감정 기반 플레이리스트 플랫폼 + 음악 취향 SNS"

## 1. 현재 코드베이스 아키텍처 맵

```
app/
├── (tabs)/index.tsx        ← 홈 (추천·저장·루틴·감정)
├── (tabs)/feed.tsx         ← 공개 피드
├── emotion/                ← 감정 선택 플로우
├── recommendation/         ← 추천 결과
├── player/                 ← 전체 플레이어 ❌ 제거 대상
├── library/                ← 저장된 플레이리스트
├── feed/[id].tsx           ← 피드 상세
├── settings/               ← 설정
├── dev/                    ← QA 도구
└── onboarding/             ← 온보딩

src/
├── components/
│   ├── player/             ← ❌ HiddenYoutubePlayer, MiniPlayerBar, FullPlayerView
│   ├── home/               ← ✅ HomeSections (재사용 가치 높음)
│   ├── feed/               ← ✅ FeedCard, FeedFilterBar
│   └── onboarding/         ← ✅ OnboardingGate
├── stores/
│   ├── playerStore.ts      ← ⚠️ 축소 → playlistSessionStore
│   ├── playbackHealthStore ← ❌ 제거
│   ├── playbackDebugStore  ← ❌ 제거
│   ├── userLibraryStore    ← ✅ 핵심 유지
│   ├── publicFeedStore     ← ✅ 확장
│   ├── feedbackStore       ← ✅ 유지
│   └── ...                 ← ✅ 대부분 유지
├── services/
│   ├── recommendationService     ← ✅ 핵심 유지
│   ├── recommendationFallback    ← ✅ 유지
│   ├── analytics/                ← ✅ 유지 + 확장
│   └── feedback/                 ← ✅ 유지
├── lib/
│   ├── curatedPlaylist.ts        ← ✅ 핵심 유지
│   ├── trackSelection.ts         ← ✅ 핵심 유지
│   ├── embedSafeFilter.ts        ← ⚠️ → externalPlatformFilter로 진화
│   ├── playlistFlow.ts           ← ✅ 유지
│   └── recommendationDiversity.ts← ✅ 유지
└── data/
    ├── seeds/                    ← ✅ 핵심 유지
    └── mockFeed.ts               ← ✅ 유지
```

## 2. 유지 가치 높은 시스템 (Core Assets)

### 추천 엔진 (최고 가치)
| 파일 | 역할 | 전환 영향 |
|------|------|-----------|
| `curatedPlaylist.ts` | 감정 프로필 기반 큐레이션 | 변경 없음 |
| `trackSelection.ts` | diversity + novelty 알고리즘 | 변경 없음 |
| `playlistFlow.ts` | 에너지 아크 정렬 | 변경 없음 |
| `recommendationDiversity.ts` | 다양성 점수 | 변경 없음 |
| `emotionCuration.ts` | 감정별 프로필 | 변경 없음 |
| `recommendationStrategy.ts` | 전략 메타데이터 | 변경 없음 |
| `recommendationService.ts` | 오케스트레이터 | embed 관련 로그만 제거 |

**결론: 추천 엔진은 100% 재사용 가능. 재생과 완전히 분리되어 있음.**

### 데이터/상태 관리
| 시스템 | 전환 후 역할 |
|--------|------------|
| `userLibraryStore` | 저장된 플레이리스트 → 핵심 유지 |
| `publicFeedStore` | SNS 피드 → 확장 |
| `feedbackStore` | 사용자 반응 → 유지 |
| `recommendationHistoryStore` | 중복 방지 → 유지 |
| `listeningActivityStore` | 취향 분석 → "큐레이션 히스토리"로 진화 |
| `growthSessionStore` | 그로스 지표 → 유지 |

### UI 컴포넌트
| 컴포넌트 | 전환 후 |
|----------|---------|
| `HomeSections` (10+ 섹션) | 홈 리디자인 기반 |
| `FeedCard / FeedFilterBar` | SNS 피드 핵심 |
| `OnboardingGate` | 유지 |
| `PlaylistShareCard` | 공유 카드 → 핵심 |

## 3. 축소 가능한 시스템

### playerStore → playlistSessionStore
현재 `playerStore`는 iframe 재생 상태 위주:
```
queue, currentIndex, isPlaying, repeatMode, queueRevision,
playbackStatus, playbackErrorKind, positionSec, durationSec, ...
```

**전환 후 필요한 것:**
```
currentPlaylist: Track[]      ← 현재 보고 있는 플레이리스트
currentIndex: number          ← 선택된 곡 (하이라이트용)
sessionEmotionId: EmotionId   ← 세션 감정
generationMeta: ...           ← 추천 메타
```

`isPlaying`, `playbackStatus`, `queueRevision`, `positionSec`, `durationSec` 등은 불필요.

### embedSafeFilter → externalAvailabilityFilter
embed 제한 필터링 대신 "외부 플랫폼에서 재생 가능한지" 필터링으로 진화:
- YouTube Music에 존재하는지
- Spotify에 매칭되는 트랙이 있는지
- Apple Music 카탈로그에 있는지

## 4. 제거 가능한 시스템

### 즉시 제거 (iframe/WebView 의존)
| 파일 | 이유 |
|------|------|
| `src/components/player/HiddenYoutubePlayer.tsx` | iframe 렌더링 |
| `src/components/player/GlobalPlayerChrome.tsx` | HiddenPlayer + MiniBar + Toast 래퍼 |
| `src/components/player/MiniPlayerBar.tsx` | 재생 컨트롤 UI |
| `src/components/player/FullPlayerView.tsx` | 전체 플레이어 UI |
| `src/components/player/PlayerControls.tsx` | 재생/정지/스킵 버튼 |
| `src/components/player/PlaybackDebugOverlay.tsx` | iframe 디버그 |
| `app/player/index.tsx` | 전체 플레이어 라우트 |
| `src/stores/playbackDebugStore.ts` | iframe 디버그 상태 |
| `src/stores/playbackHealthStore.ts` | 재생 실패 트래킹 |
| `src/dev/qaActions.ts` (일부) | iframe 테스트 액션 |

### 의존성 제거
| 패키지 | 이유 |
|--------|------|
| `react-native-youtube-iframe` | iframe 재생 |
| `react-native-web-webview` | WebView 폴리필 |
| metro.config.js WebView alias | 더 이상 불필요 |

### 제거 시 영향 범위
- `app/_layout.tsx`: `GlobalPlayerChrome` 래퍼 제거 → Toast만 유지하는 간단한 래퍼로 교체
- `app/(tabs)/index.tsx`: `HomeContinueCard` (현재 재생 중) → "최근 생성한 플레이리스트" 카드로 교체
- `usePlayerHydrated` 훅 → 불필요

## 5. 재활용 가능한 Analytics / Feedback

### Analytics 이벤트 (확장)
| 현재 이벤트 | 전환 후 |
|------------|---------|
| `recommendation_requested` | 유지 |
| `track_play` | → `track_opened_external` |
| `track_skip` | → 제거 |
| `playback_error` | → 제거 |
| `playlist_completed` | → `playlist_viewed_complete` |
| `feedback_submitted` | 유지 |
| `playlist_saved` | 유지 |
| `playlist_quality_rated` | 유지 |
| — | `playlist_shared` (신규) |
| — | `playlist_liked` (신규) |
| — | `playlist_exported_youtube` (신규) |
| — | `profile_viewed` (신규) |
| — | `user_followed` (신규) |

### Feedback 시스템
- `feedbackStore` + `feedbackUploader` → 100% 재사용
- 피드백 카테고리에 "플레이리스트 피드" 관련 항목 추가만 필요

## 6. 전환 우선순위

### Phase 1: 구조 전환 (즉시)
1. `GlobalPlayerChrome` → `AppChrome` (Toast만 유지)
2. `playerStore` → `playlistSessionStore` (축소)
3. iframe/WebView 코드 deprecated 마킹
4. "재생" 버튼 → "YouTube에서 열기" 전환
5. `MiniPlayerBar` → `MiniPlaylistBar` (현재 플레이리스트 요약)

### Phase 2: 외부 플랫폼 레이어 (1-2주)
1. `src/services/musicPlatforms/` 구축
2. YouTube Playlist API OAuth 구현
3. "플레이리스트 내보내기" 기능

### Phase 3: SNS 확장 (2-4주)
1. 사용자 프로필
2. 팔로잉/팔로워
3. 피드 랭킹 알고리즘
4. 리포스트/공유

### Phase 4: 정리 (Phase 2 이후)
1. iframe/WebView 코드 물리적 삭제
2. 불필요한 패키지 제거
3. 테스트 업데이트
