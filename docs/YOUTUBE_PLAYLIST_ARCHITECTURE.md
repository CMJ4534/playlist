# YouTube Playlist 연동 아키텍처

## 개요

MoodPlay가 생성한 감정 기반 플레이리스트를 사용자의 YouTube 계정에 직접 저장하는 구조.
실제 재생은 YouTube / YouTube Music 앱에서 수행.

## 1. OAuth Flow

### 필요한 Google OAuth 2.0 Scopes

```
https://www.googleapis.com/auth/youtube           ← 플레이리스트 CRUD
https://www.googleapis.com/auth/youtube.readonly   ← 사용자 채널/플리 읽기
https://www.googleapis.com/auth/userinfo.profile   ← 프로필 (이름, 아바타)
```

> `youtube` scope는 플레이리스트 생성/수정에 필수.
> `youtube.force-ssl` 은 HTTPS 강제이므로 Expo 환경에서는 자동 충족.

### Flow (Expo + AuthSession)

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│  MoodPlay    │────▶│ Google OAuth 2.0   │────▶│ Consent      │
│  (AuthSession)│     │ Authorization      │     │ Screen       │
└──────────────┘     └───────────────────┘     └──────┬───────┘
                                                       │
       ┌───────────────────────────────────────────────┘
       ▼
┌──────────────┐     ┌───────────────────┐
│  MoodPlay    │◀────│ Authorization Code │
│  (redirect)  │     │ + exchange for     │
└──────┬───────┘     │ access_token +     │
       │              │ refresh_token      │
       ▼              └───────────────────┘
┌──────────────┐
│ SecureStore  │  ← access_token, refresh_token, expiry 저장
│ (encrypted)  │
└──────────────┘
```

### 구현 패키지
- `expo-auth-session` — OAuth flow
- `expo-secure-store` — 토큰 보안 저장
- `expo-web-browser` — Google consent 화면

### Token Lifecycle
```typescript
type YouTubeAuth = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;        // Date.now() + expires_in * 1000
  channelId: string;
  channelTitle: string;
  avatarUrl: string | null;
};
```
- `accessToken`: 1시간 유효 → 만료 시 `refreshToken`으로 갱신
- `refreshToken`: 영구 (사용자가 접근 해제하지 않는 한)
- 갱신: `POST https://oauth2.googleapis.com/token` + `grant_type=refresh_token`

## 2. Playlist Creation Flow

### API 호출 순서

```
1. POST /youtube/v3/playlists
   → 플레이리스트 생성 (title, description, privacy)
   → playlistId 반환

2. POST /youtube/v3/playlistItems (× N곡)
   → 각 트랙의 youtubeId를 playlistId에 추가
   → 순서대로 삽입

3. GET /youtube/v3/playlists?id={playlistId}
   → 생성 확인 + URL 반환
```

### Request 예시

```typescript
// 1. 플레이리스트 생성
const createRes = await fetch(
  'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        title: '🌙 새벽 3시의 창가 — MoodPlay',
        description: 'MoodPlay 감정 큐레이션: 새벽감성\n이 플레이리스트는 MoodPlay에서 생성되었습니다.',
      },
      status: {
        privacyStatus: 'private',  // 'private' | 'unlisted' | 'public'
      },
    }),
  }
);
const { id: playlistId } = await createRes.json();

// 2. 트랙 추가 (각 곡마다)
for (const track of tracks) {
  await fetch(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: track.youtubeId,
          },
        },
      }),
    }
  );
}
```

## 3. Rate Limit / Quota 전략

### YouTube Data API v3 Quota
- 기본 할당량: **10,000 units/day** per project
- 읽기 (GET): **1 unit**
- 쓰기 (POST/PUT/DELETE): **50 units**

### 플레이리스트 내보내기 비용 계산
```
1 playlist create = 50 units
N track inserts  = N × 50 units
1 playlist read  = 1 unit

12곡 플레이리스트 1개 = 50 + (12 × 50) + 1 = 651 units
일일 한도(10,000)로 = ~15개 플레이리스트/일 가능
```

### 최적화 전략
1. **배치 생성**: 한 번에 1개 플레이리스트만 허용, 쿨다운 적용
2. **캐시**: 이미 내보낸 플레이리스트는 `playlistId` 저장 → 중복 생성 방지
3. **점진적 삽입**: 트랙 삽입 실패 시 재시도 (429 Too Many Requests → exponential backoff)
4. **Quota 모니터링**: 일일 사용량 추적 → 한도 80% 도달 시 UI 알림
5. **향후**: Quota increase 요청 (프로덕션 앱 심사 통과 후 무제한 가능)

## 4. Local ↔ YouTube Sync 구조

### 데이터 모델

```typescript
type ExportedPlaylist = {
  localPlaylistId: string;       // MoodPlay 내부 ID
  youtubePlaylistId: string;     // YouTube playlist ID
  youtubePlaylistUrl: string;    // 직접 열기 URL
  exportedAt: number;
  trackCount: number;
  syncStatus: 'synced' | 'stale' | 'failed';
  lastSyncAt: number;
};
```

### Sync 전략

```
[MoodPlay 저장] ──export──▶ [YouTube Playlist]
      │                           │
      │   (local이 source of truth)
      │                           │
      └───── 단방향 동기화 ────────┘

YouTube → MoodPlay 역동기화는 Phase 1에서 하지 않음.
```

**단방향 이유:**
- YouTube에서 곡 삭제/순서 변경 시 MoodPlay와 불일치 발생
- 양방향 sync는 conflict resolution 복잡도 급증
- MoodPlay가 "큐레이션 원본" 역할, YouTube는 "재생 수단"

### Stale 감지
- 로컬 플레이리스트 수정 시 → `syncStatus: 'stale'` 마킹
- UI에서 "YouTube에 업데이트" 버튼 표시
- 업데이트: 기존 YouTube 플레이리스트의 아이템 전체 교체 (delete all + re-insert)

## 5. 앱 내 UX Flow

```
[추천 결과 화면]
  ├── "내 라이브러리에 저장" → userLibraryStore (기존)
  └── "YouTube에 내보내기" → YouTube OAuth 확인
        ├── (미인증) → OAuth 동의 화면
        └── (인증됨) → 플레이리스트 생성 + 트랙 삽입
              └── 완료 → "YouTube에서 열기" 딥링크 제공

[저장된 플레이리스트 상세]
  ├── "YouTube에서 듣기" → 딥링크 (이미 내보낸 경우)
  ├── "YouTube에 내보내기" → 최초 내보내기
  └── "YouTube 업데이트" → stale인 경우 재동기화
```

### 딥링크 구조
```typescript
// YouTube 앱으로 직접 열기
const youtubeAppUrl = `youtube://www.youtube.com/playlist?list=${playlistId}`;
// 웹 폴백
const youtubeWebUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

await Linking.openURL(youtubeAppUrl).catch(() =>
  Linking.openURL(youtubeWebUrl)
);
```

## 6. 보안 고려사항

1. **토큰 저장**: `expo-secure-store` (AES-256 암호화)
2. **scope 최소화**: `youtube` (읽기+쓰기) + `userinfo.profile`
3. **consent 투명성**: 왜 YouTube 접근이 필요한지 사전 안내 화면
4. **revoke 지원**: 설정에서 "YouTube 연결 해제" → `POST https://oauth2.googleapis.com/revoke`
5. **토큰 갱신 실패**: 조용히 재인증 요청 (UX 중단 최소화)

## 7. 향후 확장

- **Spotify Connect**: Spotify Web API로 동일 패턴 적용
- **Apple Music**: MusicKit JS로 플레이리스트 생성
- **Cross-platform sync**: 하나의 MoodPlay 플레이리스트를 여러 플랫폼에 동시 내보내기
- **Import**: YouTube/Spotify 기존 플레이리스트를 MoodPlay로 가져오기 → 감정 태깅
