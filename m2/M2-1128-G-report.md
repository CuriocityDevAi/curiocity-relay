PASS feat/M2-1128-D-ci-watch-web-redesign @ 391d5c592

## 수정 내용

`scripts/ci-watch-web/server.mjs` `countStartedClaims()` 에 WIB 날짜 필터 추가.

**원인**: 함수가 `state === 'started'` 인 모든 claim 을 집계 → 오래된 날짜 claim 52건
포함 → `/api/state` 의 `claimStartedCount` 가 실제 진행 중 프롬프트 수와 불일치
("데이터 불일치" 경보가 항상 표시).

**수정**: `todayMmdd()` 로 오늘 MMDD 추출 후 claim ID 패턴 `^[A-Za-z]\d+-(\d{4})-` 로
오늘 날짜 claim 만 집계. `buildTodayTimeline` 과 동일한 규칙.

## 대조 결과

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| countStartedClaims() 반환값 | 52 (전체 오래된 claim 포함) | 3 (오늘 1128 only) |
| 필터 기준 | 없음 (all state=started) | 오늘 MMDD ID 패턴 일치 |

## 커밋

`391d5c592` fix(ci-watch-web): M2-1128-G — countStartedClaims 날짜 필터 추가 (오늘 MMDD 기준)

브랜치: `feat/M2-1128-D-ci-watch-web-redesign` (머지 금지 · R0 조항 ⓒ 준수)
