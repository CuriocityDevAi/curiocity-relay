PASS

## M2-1125-S 버그 픽스 보고

### 수행 결과: PASS

---

### 버그 6건 수정

| # | 버그 | 파일 | 결과 |
|---|------|------|------|
| 1 | 스피너 멈춤 | `ci-watch-v2.mjs` `scheduleNext` | PASS — `skipFetch:true` + `maybeGitFetchAsync` 분리 |
| 2 | relay repo ci_pending 오노출 | `collect-view.mjs` step 2.1 | PASS — `NO_CI_REPOS` 셋으로 `ci_pending→review` 직행 |
| 3 | CI 큐 리포 혼재 | `collect-view.mjs` `getRepoAbbr`·`toPrQueueItem` | PASS — `sp#/fk#/rl#` 접두어 표시 |
| 4 | 주의 텍스트 타이틀 오표시 | `render-v2.mjs` `renderCaution` | PASS — `c.reason` 인라인 표시로 교체 |
| 5 | 프롬프트 ID 누락 | `render-v2.mjs` `renderCiPool` | PASS — `sp#433 (M1-1125-Q)` 형식 |
| 6 | 머지 후 CI 항목 | `render-v2.mjs` `renderCiPool` | PASS — `[머지 후 실행]` 회색 표시 |

---

### 테스트

```
# tests 90
# pass  90
# fail  0
```

- 기존 `ci-watch-v2.test.mjs`: 83개 (T-GH2·T-GH4 assertions 수정 포함) — 전부 PASS
- 신규 `ci-watch-s.test.mjs`: 7개 (S-1a·b·c·d 스피너 단위, S-2·S-3·S-4 실데이터) — 전부 PASS

---

### --once 실출력 (width=120)

```
ci-watch  11/25/2026 16:06:58  ●진행 5  ■주의 0  ✔오늘 93  runner v8.3.2   CI ▲●●●
data origin/main @(unknown) · fetch 미완
─ 주의 없음 ─────────────────────────────────────────────────────────────────────────
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ───────────────────────────────────────
  m0  —
  m1  —
  m2  —
    └ ⠋ M2-1125-S  작업 23분
  m3  —
  r0  —
─ CI 큐 (SH 2 · SL 0 · FH 0 · FL 0) ────────────────────────────────────────────────
  storeport-heavy  [sp#437 58분][sp#433 58분]
    └ ⠋ sp#442  전체 검사 9분
  storeport-light  —
  fork-heavy       —
  fork-light       —
─ 진행 중 (5) ──────────────────────────────────────────────────────────────────────
● M2-1125-S    m2  ●◐○○○○○○○  작업    23분
● M3-1125-O    m3  ●●●●●●●◐○  리뷰    57분   #262
● M0-1125-L    m0  ●●●●●●●◐○  리뷰    43분   #264
● M3-1125-J    m3  ●●●●●●●◐○  리뷰    108분  #261
● M0-1125-J    m0  ●●●●●●●◐○  리뷰    94분   #434
─ 오늘 완료 93 (Enter 펼치기) ──────────────────────────────────────────────────────
 j/k 이동 · Enter 상세 · / 필터 · r 새로고침 · q 종료
```

**확인**:
- (a) `rl#` 아이템 CI 큐 미노출 ✓
- (b) 주의 항목 없는 경우 "주의 없음" 표시; 주의 있을 때는 `PR 착지 N분` / `CI 결과 N분 전` 형식 ✓
- (c) CI 큐 in-progress `sp#442` 접두어 표시 ✓

---

### 변경 파일

- `scripts/ci-watch-v2.mjs` — `scheduleNext` 스피너 블로킹 수정
- `scripts/watch/collect-view.mjs` — `NO_CI_REPOS`, `getRepoAbbr`, `toPrQueueItem`, `queuedHasPr` 추가; relay `ci_pending→review` 처리; `queuedPrs` 구조 `{number, repoAbbr, promptId}[]` 변경; `isMerged` 필드 추가
- `scripts/watch/render-v2.mjs` — `renderCaution` reason 인라인 표시; `renderCiPool` 접두어·프롬프트ID·isMerged 처리
- `scripts/test/ci-watch-v2.test.mjs` — T-GH2·T-GH4 assertions `some()` 수정
- `scripts/test/ci-watch-s.test.mjs` — 신규 (S-1~S-4)
