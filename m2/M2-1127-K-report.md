#288: 해소 · CI 시작 됨 · #289: 해소 · CI 시작 됨

## 충돌 파일 목록

| 파일 | 충돌 원인 | 해소 방법 |
|------|-----------|-----------|
| `scripts/spec-guard-map.json` | master(efc9593 #283)가 SELL-HAND-OVER 등 항목 추가 · PR#288/289도 같은 파일에 POS-TYPING-DOTS · SELL-PRODUCT-SHEET-POS 추가 | 양쪽 항목 모두 보존 (HEAD 버전이 master 항목 + 2개 추가) |
| `scripts/spec-guard-pos-playwright.mjs` | master와 PR#288이 같은 라인들을 서로 다른 포맷으로 변경 + PR#288이 SELL-PRODUCT-SHEET-POS 섹션 추가 | SELL-PRODUCT-SHEET-POS 섹션 보존 · 포맷팅 충돌(6곳)은 HEAD 스타일 유지 |

`docs/spec-guard/sell-hand-over-trace.md` — 충돌 없이 auto-merge 완료

## deletions 305 확인

`scripts/spec-guard-map.json`: JSON 멀티라인→단일라인 포맷 압축(e449c7c · M3-1127-C) + `maxTodo` 9→1 감소.
**의도된 변경** — 항목 삭제 없음, 데이터 손실 없음.

## push 결과

| PR | 브랜치 | 이전 SHA | push SHA | mergeable |
|----|--------|---------|---------|-----------|
| #288 | fix/M3-1127-G-sheet-typing-dots | 368d4f6 | d61432f | MERGEABLE |
| #289 | fix/M3-1127-H-draft-duplicate | cd45f9c | 2e8e1eb | MERGEABLE |

## CI 워크플로 확인

**#288** (run 45959947320 · 45959947350):
- flow-tests: pass · lint: pass · unit-tests: pass · route: pass × 2 · assertions: pending · heavy-cloud: skipping

**#289** (run 45960354444 · 45960354458):
- route: pending × 2 (방금 시작)

두 PR 모두 `mergeable: MERGEABLE` / `mergeStateStatus: BLOCKED(CI 진행중)` 확인.

## DIRTY PR 목록 (오늘 기준)

### agilo-medusa-pos-fork (open 9개)
| PR | 브랜치 | 상태 |
|----|--------|------|
| #291 | feat/M3-1127-K-cd-preview-edge | DIRTY / CONFLICTING |

### storeport (open 13개)
DIRTY PR 없음.
