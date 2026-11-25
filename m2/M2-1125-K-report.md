PASS

# ci-watch 머지 완료 카드 진행 중 적체 해소

## 근본 원인 2가지

1. **state 대소문자 불일치** — GitHub GraphQL `state: "MERGED"` (대문자) vs 코드 `=== 'merged'` (소문자) → 머지 감지 실패
2. **PR 매핑 공백** — 리포트 mtime > 20분이면 `extra.pr` 미설정 → `fetchPrState` 미호출

## 변경 내역

### sources-local.mjs
- `extractPrUrl`: `{url, number}` → `{url, owner, repo, number}` (3-리포 멀티 소스 지원)
- `readQueueTitle`: 원장 대사 / `[REQ]` 첫 문장 / 첫 비-ID 줄 순 폴백 (기존 첫 줄만)

### pipeline-view.mjs
- hub/review 카드: 큐 파일 제목 우선 적용 (기존 리포트 제목 우선)
- R0 카드 `isR0` 가드: R0 리포트의 PR URL은 검토 대상 PR이므로 R0 카드에 `extra.pr` 설정 금지
- 최근 리포트 step: 큐 제목 → 리포트 제목 순 폴백

### collect-view.mjs
- `defaultFetchPrState(prNumber, fullRepo)`: 선택적 `fullRepo` 파라미터 추가, `${repo}#${pr}` 캐시 키
- 멀티소스 PR 해결 (step 1.5): 리포트 파일 → pipeline events → `gh pr list --search "<ID>"` 3-리포
- state 비교: `.toLowerCase()` 적용 (`'MERGED'` → `'merged'` 정규화)
- 머지 카드 `_hideFromInProgress` 플래그 + `doneToday` 재집계

### ci-watch-v2.test.mjs
- T-URL1~T-URL3: storeport · relay · fork 3-리포 URL 파싱 검증
- T-K1: R0 no-PR 완료 카드 진행 중 미노출
- T-K2: 오래된 리포트(>20분) PR 멀티소스 매핑
- T-K3: 머지 카드 진행 중 미노출 스냅샷
- 합계: 60 → 66 테스트, 전체 pass

## 실 relay 데이터 --once 출력 (폭 100, 2026-11-25 12:15 기준)

```
ci-watch  11/25/2026 12:15:28  ●진행 8  ■주의 1  ✔오늘 4  runner v8.3.2   CI ●●▲●
─ 진행 중 (8) ──────────────────────────────────────────────────────────────────
● M0-1125-H    m0  ●◐○○○○○○○  작업    10분         PS 매장 먼저
● M1-1125-J    m1  ●◐○○○○○○○  작업    10분         POS Cart 세금 0 / Checkout PB1
● M2-1125-K    m2  ●◐○○○○○○○  작업    22분         ci-watch 터미널 UI
● R0-1125-O    r0  ●●◐○○○○○○  리포트   3분
● R0-1125-N    r0  ●●◐○○○○○○  리포트  11분
■ M3-1125-G    m3  ●●●●◐○○○○  CI대기  13분  #431
● M0-1125-G    m0  ●●◐○○○○○○  리포트  14분
● R0-1125-K    r0  ●●●●●●●◐○  리뷰    53분
─ 오늘 완료 4 ───────────────────────────────────────────────────────────────────
```

**진행 중에 머지 완료 카드 없음 확인** (수정 전: 진행 12 / 오늘 1 → 수정 후: 진행 8 / 오늘 4).
오늘 완료 4 = M2-1125-H · M0-1125-F · M3-1125-D · M3-1125-F (실제 머지 확인).

## 커밋

`21ba1ed59` on `feat/M2-1125-I-ci-watch-layout` → `origin` push 완료 (PR #34)

https://github.com/CuriocityDevAi/curiocity-relay/pull/34
