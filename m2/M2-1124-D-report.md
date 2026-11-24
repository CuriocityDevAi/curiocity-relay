M2-1124-D — DONE
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/13
브랜치: feat/M2-1124-D-ci-watch-queue (base: feat/M2-1124-C-ci-watch-summary)

## 구현 요약

`scripts/ci-watch.mjs` 에 두 함수 추가:

1. `listHubPendingIds(hub)` — hub-runner-v7.8 의 listQueue+pickNext 규칙 읽기 전용 복제
   - queue/<hub>/*.md 렉시컬 정렬 (localeCompare)
   - `-report.md` / `-selftest.md` 접미사 제외
   - !claim || claim.state === 'issued' → pending 판정
   - 러너 규칙과 다르면 표시가 틀릴 수 있음 (PR 명시)

2. `appendHubPending(lines, hubPending)` — renderCompact 출력 후처리
   - ANSI 코드 제거 후 `/^  ([a-z][0-9])  /` 패턴으로 허브 줄 감지
   - m0/m1/m2/m3/r0 허브만 처리 (HUB_LINE_SET)
   - 대기 ID를 dim 색상으로 `[ID1, ID2]` 형태로 오른쪽에 추가

## 자기 검증: 실제 relay 상태 캡처 (2026-11-24 11:40 KST)

```
m0: []
m1: []
m2: [M2-1124-E, M2-1124-F]
m3: []
r0: [R0-1124-C, R0-1124-D, R0-1124-E]
```

- 허브 줄 샘플 출력 (ANSI 제거):
  ```
  m2  M2-1124-C  5분  [M2-1124-E, M2-1124-F]
  r0  R0-1124-B  2분  [R0-1124-C, R0-1124-D, R0-1124-E]
  ```

## 과거 파일 오판 0건 확인

- R0-1105-AF-selftest.md, R0-1105-AH-selftest.md → `-selftest.md` 필터로 제외 ✓
- M2-1105-O-selftest.md, M2-1105-S-selftest.md → 동일 ✓
- M2-1120-F-report.md, M2-1121-D-report.md → `-report.md` 필터로 제외 ✓
- M2-1105-AD ~ M2-1123-K 등 구 파일 → 모두 done/blocked claim → 미표시 ✓

node --check 통과 ✓
