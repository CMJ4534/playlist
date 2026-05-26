# Social Platform Architecture

> MoodPlay를 "감정 기반 플레이리스트 커뮤니티"로 확장하기 위한 SNS 구조 설계

## 1. 핵심 개념

```
┌─────────────────────────────────────────────────┐
│                   MoodPlay SNS                   │
│                                                   │
│  User ──creates──▶ Playlist ──tagged──▶ Emotion  │
│    │                  │                           │
│    ├── follows ──▶ User                           │
│    ├── likes ────▶ Playlist                       │
│    ├── saves ────▶ Playlist (to library)          │
│    ├── reposts ──▶ Playlist (to own feed)         │
│    └── comments ─▶ Playlist                       │
│                                                   │
│  Feed = Playlist Cards ranked by engagement       │
│  Discovery = Emotion-first exploration            │
└─────────────────────────────────────────────────┘
```

## 2. DB Schema 초안 (Supabase PostgreSQL)

### users
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '🎵',
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  
  -- 집계 (denormalized for performance)
  followers_count  INT DEFAULT 0,
  following_count  INT DEFAULT 0,
  playlists_count  INT DEFAULT 0,
  total_likes_received INT DEFAULT 0
);
```

### playlists
```sql
CREATE TABLE playlists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   UUID REFERENCES users(id) NOT NULL,
  title        TEXT NOT NULL,
  caption      TEXT,
  emotion_id   TEXT NOT NULL,  -- 'sad' | 'dawn' | 'focus' | 'rain' | 'walk' | 'blank'
  
  visibility   TEXT DEFAULT 'public',  -- 'private' | 'unlisted' | 'public'
  
  -- 생성 메타 (추천 엔진 정보)
  generation_strategy TEXT,
  situation_text      TEXT,
  
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  
  -- 집계
  likes_count    INT DEFAULT 0,
  saves_count    INT DEFAULT 0,
  reposts_count  INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views_count    INT DEFAULT 0
);

CREATE INDEX idx_playlists_emotion ON playlists(emotion_id);
CREATE INDEX idx_playlists_creator ON playlists(creator_id);
CREATE INDEX idx_playlists_created ON playlists(created_at DESC);
```

### playlist_tracks
```sql
CREATE TABLE playlist_tracks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  position    INT NOT NULL,
  
  youtube_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec  INT,
  
  UNIQUE(playlist_id, position)
);

CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
```

### likes
```sql
CREATE TABLE likes (
  user_id     UUID REFERENCES users(id),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, playlist_id)
);
```

### saves
```sql
CREATE TABLE saves (
  user_id     UUID REFERENCES users(id),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, playlist_id)
);
```

### reposts
```sql
CREATE TABLE reposts (
  user_id     UUID REFERENCES users(id),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  caption     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, playlist_id)
);
```

### comments
```sql
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  text        TEXT NOT NULL CHECK(length(text) <= 200),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_playlist ON comments(playlist_id, created_at DESC);
```

### follows
```sql
CREATE TABLE follows (
  follower_id  UUID REFERENCES users(id),
  following_id UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);
```

### feed_events (피드 소스 테이블)
```sql
CREATE TABLE feed_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),     -- 이벤트 발생 유저
  event_type  TEXT NOT NULL,                  -- 'create' | 'repost' | 'like'
  playlist_id UUID REFERENCES playlists(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  
  -- 랭킹용 사전 계산
  engagement_score FLOAT DEFAULT 0
);

CREATE INDEX idx_feed_events_created ON feed_events(created_at DESC);
CREATE INDEX idx_feed_events_user ON feed_events(user_id, created_at DESC);
```

## 3. Feed Ranking 전략

### 피드 소스
1. **Following Feed**: 팔로잉한 유저의 `create` + `repost` 이벤트
2. **Discover Feed**: 전체 공개 플레이리스트 (팔로잉 무관)
3. **Emotion Feed**: 특정 감정 필터링

### Ranking Algorithm (v1 — Simple)

```
score = base_score × time_decay × emotion_boost × diversity_bonus

base_score:
  likes_count × 1.0
  + saves_count × 2.0      (저장이 좋아요보다 강한 신호)
  + comments_count × 1.5
  + reposts_count × 3.0    (리포스트가 가장 강한 신호)
  + views_count × 0.1

time_decay:
  1 / (1 + hours_since_created × 0.05)
  
  → 48시간 후 score 70%로 감소
  → 7일 후 score 30%로 감소

emotion_boost:
  사용자의 최근 감정 히스토리와 일치 시 × 1.5

diversity_bonus:
  연속으로 같은 감정 플리가 나오지 않도록 감점
  같은 크리에이터 연속 시 감점
```

### Ranking v2 (향후)
- 사용자별 개인화: 좋아요/저장 패턴 기반 collaborative filtering
- 시간대 감정 패턴: "새벽 3시에는 dawn 플리 부스트"
- 신규 크리에이터 부스트: 첫 3개 플레이리스트 노출 가산점

## 4. Playlist Engagement Metrics

### 트래킹 이벤트
```typescript
type PlaylistEngagement = {
  playlistId: string;
  
  // 기본 지표
  viewCount: number;         // 카드 노출
  detailViewCount: number;   // 상세 화면 진입
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  repostsCount: number;
  
  // 외부 전환
  youtubeExportCount: number;  // YouTube에 내보내기
  externalOpenCount: number;   // YouTube/Spotify에서 열기
  shareCount: number;          // 카드 이미지 공유
  
  // 파생 지표
  engagementRate: number;      // (likes + saves + comments) / views
  conversionRate: number;      // exports / detailViews
  virality: number;            // reposts / views
};
```

### 크리에이터 대시보드 (향후)
- 내 플레이리스트별 engagement 요약
- 가장 인기 있는 감정 카테고리
- 팔로워 증가 추이
- 총 좋아요/저장 수

## 5. Discovery Flow

### 탐색 경로

```
[홈]
  ├── 감정 선택 → 추천 생성 → 저장/공유
  ├── 피드 탭 → 공개 플레이리스트 탐색
  │     ├── 최신 / 인기 / 감정별 필터
  │     └── 카드 탭 → 상세 → 저장/좋아요/YouTube 열기
  ├── 검색 (향후)
  │     ├── 감정 검색 ("새벽에 듣기 좋은")
  │     ├── 아티스트 검색
  │     └── 크리에이터 검색
  └── 프로필 → 팔로잉 크리에이터의 플레이리스트
```

### Emotion-First Discovery
기존 MoodPlay의 강점을 SNS에 그대로 적용:

```
"오늘 기분이 어때요?" → 감정 선택
  ├── AI 추천 생성 (기존 curatedPlaylist 엔진)
  └── 같은 감정의 인기 공개 플레이리스트 추천
       → "다른 사람들은 이 기분에 이런 곡을 들어요"
```

## 6. Recommendation Synergy

### 기존 추천 엔진 재활용

```
현재: curatedPlaylist → Track[] (재생용)
전환: curatedPlaylist → PublicPlaylist (공유용)

curatedPlaylist.ts        → 변경 없음
trackSelection.ts         → 변경 없음
playlistFlow.ts           → 변경 없음
recommendationDiversity   → 변경 없음
emotionCuration           → 변경 없음
```

### 새로운 추천 소스
1. **Collaborative**: "이 플리를 좋아한 사람들이 좋아한 다른 플리"
2. **Content-based**: 곡 구성이 비슷한 플레이리스트
3. **Social**: "팔로잉하는 사람의 최신 플리"
4. **Temporal**: 시간대/요일별 감정 패턴 매칭

### Seed Catalog 확장
- 사용자가 공개한 플레이리스트의 곡 → 자동으로 catalog 풍부화
- 인기 곡 자동 수집 → seed 확장
- YouTube Music 트렌딩 연동 (향후)

## 7. 기존 Store 재활용 매핑

| 현재 Store | 전환 후 | 변경사항 |
|-----------|---------|---------|
| `userLibraryStore` | `userLibraryStore` | `meta.feedPostId` 활용 확대 |
| `publicFeedStore` | `feedStore` (Supabase 연동) | mock → API |
| `feedbackStore` | `feedbackStore` | 카테고리 확장 |
| `recommendationSessionStore` | `curationSessionStore` | 이름 변경 |
| `listeningActivityStore` | `curationActivityStore` | "재생" → "큐레이션" |
| `growthSessionStore` | `growthSessionStore` | 유지 |
| `onboardingStore` | `onboardingStore` | 유지 |

## 8. 구현 우선순위

### Phase 1: 로컬 MVP (현재 → 2주)
- mock 데이터 기반 피드 (완료)
- 좋아요/저장/댓글 로컬 상태 (완료)
- "YouTube에서 열기" 딥링크

### Phase 2: Supabase 백엔드 (2-4주)
- 위 DB 스키마 마이그레이션
- 인증 (Supabase Auth + Google OAuth)
- 플레이리스트 CRUD API
- 피드 쿼리 최적화

### Phase 3: SNS 핵심 (4-8주)
- 유저 프로필
- 팔로우/팔로잉
- 피드 랭킹 v1
- 알림 (좋아요/댓글/팔로우)

### Phase 4: 외부 플랫폼 (8-12주)
- YouTube Playlist 내보내기
- Spotify 연동
- 크로스 플랫폼 공유
