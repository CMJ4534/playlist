# Embed-Safe 정책

> **핵심 원칙: "모든 곡 재생"이 아니라 "실제로 안정적으로 재생 가능한 감성 큐레이션"**

## 왜 이 정책이 필요한가

MoodPlay는 YouTube iframe embed를 통해 음악을 재생합니다. 그러나 모든 YouTube 영상이 iframe 내에서 재생 가능한 것은 아닙니다.

### YouTube iframe 정책

- YouTube는 영상 소유자에게 **"외부 삽입 허용 여부"** 설정을 제공합니다.
- `embeddable: false`인 영상은 iframe 내에서 재생 불가 → `embed_not_allowed` 에러 발생.
- 이 설정은 영상 소유자가 **언제든 변경 가능**하므로, 한 번 재생되던 곡도 갑자기 막힐 수 있습니다.

### 문제 영상 유형

| 유형 | 위험도 | 예시 |
|------|--------|------|
| **Music Video (MV)** | 높음 | 대형 기획사 공식 MV (HYBE, SM, JYP, YG) |
| **VEVO** | 높음 | 해외 메이저 아티스트 VEVO 채널 |
| **Fan upload** | 중간 | 저작권 클레임으로 갑자기 삭제/차단 |
| **Lyrics video** | 중간 | 비공식 가사 영상 |
| **Performance clip** | 중간 | 방송 출연 영상 |

### 안전한 영상 유형

| 유형 | 안전도 | 설명 |
|------|--------|------|
| **Topic 채널** | 매우 높음 | YouTube가 자동 생성한 "아티스트 - Topic" 채널의 Official Audio |
| **Official Audio** | 높음 | 아티스트가 직접 업로드한 음원 전용 영상 |
| **Provided to YouTube** | 높음 | 음원 유통사가 YouTube에 제공한 음원 |
| **Auto-generated** | 높음 | YouTube Music이 자동 생성한 음원 |

**Topic 채널이 가장 안전한 이유:**
- YouTube 자체가 생성·관리하므로 삭제/차단 가능성이 거의 없음
- 음원 라이선스에 기반하여 자동 생성되므로 embed 제한이 없음
- 모든 주요 아티스트에 존재

## 추천 시스템 적용

### Playability Tier

```
verified   → catalogMeta에서 verifiedStatus='playable' + disabled=false
pending    → verifiedStatus='pending' (검증 대기)
unknown    → catalogMeta에 엔트리 없음
blocked    → disabled=true 또는 embedding_restricted/invalid_id/not_found
```

### 단계적 Degrade

추천 후보가 부족할 경우 다음 순서로 완화:

1. **Strict** (기본): `verified`만 사용
2. **Relaxed**: `verified` + `pending` + `unknown` (blocked만 제외)
3. **Emergency**: 전체 풀에서 blocked만 제외 (마지막 수단)

### 절대 제외 (어떤 상황에서도 추천 불가)

- `verifiedStatus === 'embedding_restricted'`
- `verifiedStatus === 'invalid_id'`
- `verifiedStatus === 'not_found'`
- `disabled === true`
- `playbackHealth.failCount >= 2` (런타임 자동 차단)

### failCount 감점

- 재생 실패 이력이 있는 곡은 추천 우선순위가 자동 하락
- `failCount >= PLAYBACK_BLOCK_FAIL_THRESHOLD`(현재 2)이면 완전 차단
- 차단된 곡은 `playbackHealthStore`에 기록되며 앱 재시작 후에도 유지

## Catalog 관리 도구

| 명령 | 용도 |
|------|------|
| `npm run verify:tracks:playback` | 전체 seed의 embed 가능 여부 검증 |
| `npm run catalog:find-topic` | Topic 채널 대체 ID 자동 검색 |
| `npm run catalog:find-topic:apply` | 검색 결과를 replacements.json에 자동 적용 |
| `npm run seed:embed-report` | embed 제한 리포트 생성 |

## 모니터링

### DEV 화면 (Beta QA)

"Embed-Safe 정책" 섹션에서 실시간 확인 가능:
- 추천 가능(playable) 트랙 수 및 비율
- verified / pending / unknown / blocked 분포
- degrade level (현재 적용 중인 완화 단계)
- fallback reason (완화 사유)

### 추천 로그

DEV 모드에서 매 추천 요청 시 콘솔에 출력:
- `candidateCount`: 추천 후보 수
- `verifiedCount`: 검증 완료 곡 수
- `playableRatio`: 재생 가능 비율
- `fallbackReason`: degrade 사유
- `degradeLevel`: 현재 완화 단계

## 목표 지표

| 지표 | 현재 목표 | 장기 목표 |
|------|-----------|-----------|
| playableRatio | > 40% | > 80% |
| verified tracks | > 7곡 | > 50곡 |
| 감정별 최소 verified | 1곡 | 5곡 이상 |
| 재생 실패율 | < 20% | < 3% |

## 정책 요약

```
추천 품질보다 재생 신뢰성을 우선한다.

곡이 아무리 좋아도 재생되지 않으면 사용자 경험은 0이다.
재생 가능한 곡 중에서 최고의 큐레이션을 제공하는 것이 MoodPlay의 목표다.
```
