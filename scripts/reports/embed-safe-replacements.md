# Embed-Safe Replacement Candidates (sad / dawn / rain 우선)

> YouTube Music Topic 채널, Official Audio, Lyric Video 우선 추천.
> `YOUTUBE_API_KEY` 설정 후 `npm run verify:embed` 실행 시 자동 검증됨.

---

## sad (5 high-risk)

### 1. 태연 - Fine (`Qflf2aw79G8`)
- 리스크: SM Entertainment MV → embed 제한 가능성 높음
- **추천 대체 후보:**
  - `태연 - Topic` 채널의 "Fine" (YouTube Music auto-generated)
  - 검색: `태연 Fine official audio`
  - 대안: Lyric 버전이 있으면 우선

### 2. 방탄소년단 - 봄날 (`x6_Q2h3A7qY`)
- 리스크: HYBE MV → embed 제한 가능성 높음
- **추천 대체 후보:**
  - `BTS - Topic` 채널의 "봄날 Spring Day"
  - 검색: `BTS Spring Day official audio topic`

### 3. Adele - Someone Like You (`hLQl3WQQo4U`)
- 리스크: Universal Music MV
- **추천 대체 후보:**
  - `Adele - Topic` 채널의 "Someone Like You"
  - 검색: `Adele Someone Like You topic`
  - 대안: Live performance 버전 (embed 허용 확률 높음)

### 4. Lana Del Rey - Summertime Sadness (`TdrL3QxjyVw`)
- 리스크: Universal Music MV
- **추천 대체 후보:**
  - `Lana Del Rey - Topic` 채널
  - 검색: `Lana Del Rey Summertime Sadness topic`

### 5. Coldplay - Fix You (`k4V3Mo61fJM`)
- 리스크: Warner Music MV
- **추천 대체 후보:**
  - `Coldplay - Topic` 채널의 "Fix You"
  - 검색: `Coldplay Fix You official audio`

---

## dawn (6 high-risk)

### 1. RM - Seoul (`4YIvXoJYiuo`)
- 리스크: HYBE
- **추천 대체 후보:**
  - `RM - Topic` 또는 `mono.` 앨범 Topic 버전
  - 검색: `RM Seoul mono official audio`

### 2. 아이유 - Blueming (`D1LvR11qQoU`)
- 리스크: EDAM / Kakao Entertainment
- **추천 대체 후보:**
  - `IU - Topic` 채널의 "Blueming"
  - 검색: `IU Blueming topic`
  - **참고**: IU 공식 채널은 일부 embed 허용하는 경우도 있음

### 3. 아이유 - Palette (`d9IxdwEFk1c`)
- **추천 대체 후보:**
  - `IU - Topic` 채널
  - 검색: `IU Palette official audio topic`

### 4. NewJeans - Ditto (`Km71Rr9K-Bw`)
- 리스크: ADOR/HYBE
- **추천 대체 후보:**
  - `NewJeans - Topic` 채널
  - 검색: `NewJeans Ditto topic`

### 5. NewJeans - Hype Boy (`11t7c7UJfNM`)
- **추천 대체 후보:**
  - `NewJeans - Topic` 채널
  - 검색: `NewJeans Hype Boy topic`

### 6. 아이유 - Peach (`y6O5t8gK47E`)
- **추천 대체 후보:**
  - `IU - Topic` 채널
  - 검색: `IU Peach official audio`

---

## rain (2 high-risk)

### 1. Taeyeon - Rain (`nQWFzMvCfLE`)
- 리스크: SM Entertainment
- **추천 대체 후보:**
  - `TAEYEON - Topic` 채널의 "Rain"
  - 검색: `Taeyeon Rain topic`

### 2. Adele - Set Fire to the Rain (`RgKAFK5djSk`)
- 리스크: Universal Music
- **참고**: 이 ID는 사실 `Wiz Khalifa - See You Again` 의 유명 ID임 → **ID 자체가 잘못되었을 수 있음**
- **추천 대체 후보:**
  - 올바른 `Adele - Set Fire to the Rain` 검색 필요
  - `Adele - Topic` 채널
  - 검색: `Adele Set Fire to the Rain topic`

---

## Embed-Safe 소스 우선순위

| 우선순위 | 소스 유형 | embed 허용 확률 | 설명 |
|---------|----------|----------------|------|
| 1 | YouTube Music Topic 채널 | ~95% | `Artist - Topic` 형태, auto-generated |
| 2 | Official Audio 업로드 | ~85% | 아티스트 공식 채널의 audio-only |
| 3 | Lyric Video | ~80% | 가사 영상, MV보다 제한 적음 |
| 4 | Fan Upload (verified) | ~90% | embed 거의 항상 허용, 삭제 리스크 |
| 5 | Official MV | ~50% | 대형 기획사는 embed 제한 높음 |

## 자동 교체 프로세스

```bash
# 1. YouTube API Key 설정
export YOUTUBE_API_KEY=YOUR_KEY

# 2. 전체 검증 + auto-disable + 대체 후보 자동 검색
npm run verify:embed

# 3. 리포트 확인
cat scripts/reports/track-playback-report.json | jq '.replacementSuggestions'

# 4. replacements.json 수동 리뷰
# src/data/seeds/replacements.json 확인

# 5. 적용
npm run seed:apply-replacements

# 6. 재검증
npm run verify:tracks:playback
```

## 교체 시 유의사항

1. **Topic 채널 ID 확인**: Topic 채널의 youtubeId가 11자리 맞는지 확인
2. **음질 확인**: Topic 채널은 보통 128kbps이지만 재생에 문제없음
3. **Region 제한**: 일부 Topic 채널 트랙은 특정 국가에서만 재생 가능
4. **삭제 위험**: Topic 채널은 라이선스 변경 시 삭제될 수 있으므로 주기적 검증 필요
5. **Duration 차이**: Official Audio vs MV 길이가 다를 수 있음 → durationSec 업데이트
