# Moodplay Embed Restriction Report

Generated: 2026-05-26T03:53:45.671Z

## Summary

| Metric | Count |
|--------|-------|
| Total seed tracks | 105 |
| Verified (API checked) | 40 |
| Confirmed embed restricted | 0 |
| High-risk (unverified) | 0 |

## By Category

| Category | Total | Restricted | High Risk | Safe |
|----------|-------|------------|-----------|------|
| sad ⭐ | 17 | 0 | 2 | 12 |
| dawn ⭐ | 18 | 0 | 5 | 11 |
| focus | 18 | 0 | 14 | 3 |
| rain ⭐ | 18 | 0 | 2 | 16 |
| walking | 16 | 0 | 4 | 12 |
| blank | 18 | 0 | 6 | 11 |

## Confirmed Embed Restricted Tracks

| Category | Artist | Title | YouTube ID | Replacement |
|----------|--------|-------|------------|-------------|

## Priority Replacements (sad / dawn / rain)

### 태연 - Fine (sad)
- Current: [Qflf2aw79G8](https://www.youtube.com/watch?v=Qflf2aw79G8)
- Suggested: 수동 검색 필요

### Coldplay - Fix You (sad)
- Current: [k4V3Mo61fJM](https://www.youtube.com/watch?v=k4V3Mo61fJM)
- Suggested: 수동 검색 필요

### RM - Seoul (dawn)
- Current: [4YIvXoJYiuo](https://www.youtube.com/watch?v=4YIvXoJYiuo)
- Suggested: 수동 검색 필요

### 아이유 - Blueming (dawn)
- Current: [D1LvR11qQoU](https://www.youtube.com/watch?v=D1LvR11qQoU)
- Suggested: 수동 검색 필요

### NewJeans - Ditto (dawn)
- Current: [Km71Rr9K-Bw](https://www.youtube.com/watch?v=Km71Rr9K-Bw)
- Suggested: 수동 검색 필요

### NewJeans - Hype Boy (dawn)
- Current: [11t7c7UJfNM](https://www.youtube.com/watch?v=11t7c7UJfNM)
- Suggested: 수동 검색 필요

### 아이유 - Peach (dawn)
- Current: [y6O5t8gK47E](https://www.youtube.com/watch?v=y6O5t8gK47E)
- Suggested: 수동 검색 필요

### Taeyeon - Rain (rain)
- Current: [nQWFzMvCfLE](https://www.youtube.com/watch?v=nQWFzMvCfLE)
- Suggested: 수동 검색 필요

### Adele - Set Fire to the Rain (rain)
- Current: [RgKAFK5djSk](https://www.youtube.com/watch?v=RgKAFK5djSk)
- Suggested: 수동 검색 필요


## Embed-Safe Replacement Guidelines

### 우선 추천 소스
1. **YouTube Music - Topic 채널** (artist 이름 + " - Topic")
   - 대부분 embed 허용
   - 예: "Adele - Topic", "아이유 - Topic"
2. **Official Audio / Lyric Video**
   - MV보다 embed 허용 비율 높음
3. **아티스트 공식 채널의 audio-only 업로드**

### 검증 방법
```bash
# 전체 embed 검증 + auto-disable + 대체 후보 검색
YOUTUBE_API_KEY=YOUR_KEY npm run verify:embed

# embed 리포트 생성
npm run verify:embed:report
```

### 교체 프로세스
1. `npm run verify:embed` → 제한 곡 자동 탐지 + 대체 후보
2. `scripts/reports/track-playback-report.json` 확인
3. `src/data/seeds/replacements.json` 수동 리뷰
4. `npm run seed:apply-replacements` 적용
