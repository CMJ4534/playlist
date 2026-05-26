# MoodPlay

> 감정 기반 YouTube 음악 추천 앱 — **"추천은 실패해도 된다. 재생은 절대 실패하면 안 된다."**

## 핵심 원칙

- 어떤 경우에도 사용자가 음악을 재생할 수 있어야 한다 (FAIL-SAFE)
- 앱 내부 재생 금지 → YouTube 앱 또는 웹으로 이동
- YouTube Data API v3 기반 실시간 검색
- 3단계 Fallback으로 재생 보장

---

## 시스템 아키텍처

```
┌─────────────────────────────┐
│   React Native (Expo)       │
│                             │
│  감정 선택 → 추천 요청       │
│  추천 결과 → YouTube 열기    │
└──────────┬──────────────────┘
           │ POST /api/recommend
           ▼
┌─────────────────────────────┐
│   Node.js Backend           │
│                             │
│  1. 감정 → 키워드 매핑       │
│  2. YouTube Data API 검색    │
│  3. 3단계 Fallback 생성     │
└─────────────────────────────┘
```

---

## 3단계 Fallback 구조 (핵심)

```
[1단계] Playlist 생성 성공 → playlist URL 반환
   │ 실패 ↓
[2단계] videoId 리스트 → 개별 영상 URL 반환
   │ 0개 ↓
[3단계] YouTube search URL 반환 (절대 실패 불가)
   예: https://youtube.com/results?search_query=lofi+music
```

| Tier | 조건 | 결과 |
|------|------|------|
| `playlist` | OAuth 인증 + API 성공 | YouTube 플레이리스트 URL |
| `videoIds` | API 키 있음 + 검색 성공 | 개별 영상 URL 목록 |
| `searchUrl` | 모든 것 실패해도 | YouTube 검색 URL (100% 보장) |

---

## 프로젝트 구조

```
moodplay/
├── backend/                    ← Node.js API 서버
│   ├── src/
│   │   ├── index.ts            ← Express 서버 진입점
│   │   ├── routes/
│   │   │   └── recommend.ts    ← POST /api/recommend
│   │   └── services/
│   │       ├── youtube.ts      ← YouTube Data API v3 래퍼
│   │       ├── emotionKeywords.ts  ← 감정 → 키워드 매핑
│   │       └── fallback.ts     ← 3단계 Fallback 로직
│   ├── .env                    ← YOUTUBE_API_KEY
│   └── package.json
│
├── app/                        ← Expo Router 화면
│   ├── _layout.tsx             ← 루트 레이아웃
│   ├── (tabs)/
│   │   ├── index.tsx           ← 홈 (감정 빠른 선택)
│   │   └── feed.tsx            ← 피드
│   ├── emotion/index.tsx       ← 감정 선택 + 추천 요청
│   └── recommendation/index.tsx ← 추천 결과 + YouTube 열기
│
├── src/
│   ├── services/
│   │   ├── moodplayApi.ts      ← 백엔드 API 클라이언트 + 오프라인 fallback
│   │   └── youtubeOpen.ts      ← YouTube 앱/웹 열기 유틸
│   ├── components/
│   │   └── recommendation/
│   │       ├── PlaylistResultView.tsx  ← 결과 화면 (YouTube 열기 버튼)
│   │       └── TrackListItem.tsx       ← 개별 곡 (탭 → YouTube)
│   ├── constants/
│   │   ├── emotions.ts         ← 6가지 감정 정의
│   │   └── moodTheme.ts        ← 다크 테마
│   └── types/
│       └── emotion.ts          ← EmotionId 타입
│
└── package.json
```

---

## 감정 → 키워드 매핑

| 감정 | Emoji | 키워드 |
|------|-------|--------|
| sad | 😔 | 슬픈 노래, sad korean ballad, 감성 발라드, lofi sad |
| dawn | 🌙 | 새벽 감성 음악, late night korean, 몽환적인 음악 |
| focus | 🔥 | 집중 음악, focus music, lofi study beats |
| rain | 🌧 | 비오는날 음악, rainy day music, 잔잔한 피아노 |
| walk | 🚶 | 산책 음악, walking music chill, 기분좋은 음악 |
| blank | ☁️ | 멍때리기 음악, ambient chill, 배경음악 잔잔한 |

---

## 핵심 데이터 흐름

```
사용자: 감정 선택 (sad) + "시험 끝나고 집 가는 중"
        │
        ▼
  앱 → POST /api/recommend { emotion: "sad", situation: "시험 끝나고..." }
        │
        ▼
  백엔드:
  1. 감정 → 키워드 ["슬픈 노래", "sad korean ballad", ...]
  2. 각 키워드로 YouTube search.list 호출
  3. videoId 수집 (null 제외, 중복 제거)
  4. (Optional) OAuth → playlist 생성
  5. 3단계 fallback 결과 생성
        │
        ▼
  앱 ← 응답: { playback: { tier, primaryUrl, videos[], searchUrl } }
        │
        ▼
  사용자: "YouTube에서 재생하기" 탭 → Linking.openURL() → YouTube 앱/웹
```

---

## API 명세

### POST /api/recommend

**Request:**
```json
{
  "emotion": "sad",
  "situation": "시험 끝나고 집 가는 중",
  "accessToken": "ya29..." // optional, YouTube OAuth
}
```

**Response:**
```json
{
  "emotion": "sad",
  "emotionLabel": "우울",
  "emotionEmoji": "😔",
  "situation": "시험 끝나고 집 가는 중",
  "playback": {
    "tier": "videoIds",
    "primaryUrl": "https://www.youtube.com/watch?v=abc123",
    "videos": [
      {
        "videoId": "abc123",
        "title": "잔잔한 발라드",
        "channelTitle": "Artist",
        "thumbnailUrl": "https://...",
        "youtubeUrl": "https://www.youtube.com/watch?v=abc123"
      }
    ],
    "playlistUrl": null,
    "searchUrl": "https://www.youtube.com/results?search_query=슬픈+노래"
  },
  "meta": {
    "videoCount": 8,
    "tier": "videoIds",
    "hasPlaylist": false,
    "timestamp": 1700000000000
  }
}
```

### GET /api/recommend/health

```json
{
  "status": "ok",
  "youtubeApiConfigured": true,
  "timestamp": 1700000000000
}
```

---

## 빠른 시작

### 1. 백엔드

```bash
cd backend
npm install

# .env에 YouTube API 키 설정
echo "YOUTUBE_API_KEY=your_key_here" > .env
echo "PORT=3001" >> .env

# 서버 시작
npm run dev
```

> API 키 없이도 search URL fallback은 동작합니다.

### 2. 프론트엔드

```bash
# 루트에서
npm install
npx expo start --tunnel
```

### YouTube Data API 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성
3. YouTube Data API v3 활성화
4. API 키 생성
5. `backend/.env`에 입력

---

## 앞으로 할 일 (우선순위순)

### Phase 1: 재생 안정화 (현재)
- [x] 3단계 Fallback 구조
- [x] YouTube 외부 열기 (앱/웹)
- [x] 감정 → 키워드 매핑
- [x] 백엔드 API (Express)
- [x] 프론트엔드 연동
- [ ] YouTube Data API 키 발급 + 실제 videoId 검색 테스트
- [ ] 에러 핸들링 강화 (네트워크 타임아웃 등)

### Phase 2: 사용자 데이터
- [ ] UserAction 로깅 (emotion, videoIds, clickedPlay, timestamp)
- [ ] 최근 추천 이력 저장

### Phase 3: OAuth (optional)
- [ ] Google OAuth 연동
- [ ] YouTube Playlist 자동 생성

### Phase 4: 루틴
- [ ] 시간대별 자동 감정 추천
- [ ] 즐겨찾기 감정 패턴

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Expo SDK 54, Expo Router v6, React Native 0.81 |
| Backend | Node.js, Express, TypeScript |
| API | YouTube Data API v3 |
| State | Zustand 5 |
| Theme | Custom dark theme (`moodTheme`) |
