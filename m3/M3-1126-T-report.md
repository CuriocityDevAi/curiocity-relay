#279 초록 · #275 빨강 · #277 초록

## 작업 요약

| REQ | 내용 | 결과 |
|-----|------|------|
| 1 | feat/M3-1126-R — 세로(390×844) bbox 검증 + 스샷 추가 (commit 71267c9) | ✅ push 완료 |
| 2a | feat/M3-1126-I — origin/master merge (d2dcde2) | ✅ push 완료 |
| 2b | feat/M3-1126-P — origin/master merge (71eaed3) | ✅ push 완료 |
| 3 | CI 결과 리포트 | 아래 표 |

## CI 결과 — #279 (feat/M3-1126-R)

### CI workflow (run 45863322576)

| Job | Runner | 결과 |
|-----|--------|------|
| route | ci-box-fork-light-imac | ✅ success |
| flow-tests | ci-box-fork-light-imac | ✅ success |
| assertions | ci-box-fork-light-imac | ✅ success |
| unit-tests | ci-box-fork-light-imac | ✅ success |
| heavy-cloud | — | ⏭ skipped |
| playwright | ci-box-fork-heavy-imac | ✅ success |

### Lint workflow (run 45863322414)

| Job | Runner | 결과 |
|-----|--------|------|
| route | ci-box-fork-light-imac | ✅ success |
| lint | ci-box-fork-light-imac | ✅ success |

---

## CI 결과 — #275 (feat/M3-1126-I)

### CI workflow (run 45863344293)

| Job | Runner | 결과 |
|-----|--------|------|
| route | ci-box-fork-light-imac | ✅ success |
| flow-tests | ci-box-fork-light-imac | ✅ success |
| assertions | ci-box-fork-light-imac | ✅ success |
| unit-tests | ci-box-fork-light-imac | ✅ success |
| heavy-cloud | — | ⏭ skipped |
| playwright | ci-box-fork-heavy-imac | ✅ success |

### Lint workflow (run 45863344272)

| Job | Runner | 결과 |
|-----|--------|------|
| route | ci-box-fork-light-imac | ✅ success |
| lint | ci-box-fork-light-imac | ❌ failure |

**빨간 원인:** `app/checkout/split-tender/[draftOrderId].tsx` 외 2파일에 `react-hooks/exhaustive-deps` · `no-restricted-syntax` 등 ESLint 오류 70건(에러 1건) — 이 PR(M3-1126-I) 의 변경 전부터 존재했던 pre-existing 실패이며, 이번 master merge 는 CI workflow 파일만 변경함.

---

## CI 결과 — #277 (feat/M3-1126-P)

### CI workflow (run 45863347575)

| Job | Runner | 결과 |
|-----|--------|------|
| route | ci-box-fork-light-imac | ✅ success |
| flow-tests | ci-box-fork-light-imac | ✅ success |
| assertions | ci-box-fork-light-imac | ✅ success |
| unit-tests | ci-box-fork-light-imac | ✅ success |
| heavy-cloud | — | ⏭ skipped |
| playwright | ci-box-fork-heavy-imac | ✅ success |

### Lint workflow (run 45863347565)

| Job | Runner | 결과 |
|-----|--------|------|
| route | ci-box-fork-light-imac | ✅ success |
| lint | ci-box-fork-light-imac | ✅ success |
