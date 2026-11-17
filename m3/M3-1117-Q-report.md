#181 · #183 rebase · 충돌 2파일 · mergeable

## PR #181 — fix/M3-1117-N-cart-instant-total

| 파일 | 충돌 내용 | 해소 방식 |
|------|-----------|-----------|
| `api/hooks/draft-orders.tsx` | HEAD(master)에만 있는 `cart-timing` console.log 라인 vs 브랜치 커밋(bbfa005) | HEAD 보존 (console.log 유지) |
| `components/SplashReceiptAnim.tsx` | HEAD에 M1-1117-I runOnJS 설명 주석 3줄 vs 브랜치 커밋(189aa61) | HEAD 보존 (주석 유지) |

- 선행 커밋 5개(M3-1117-G·H·I·J·K) already upstream → git이 자동 drop
- tsc 에러: 16줄 (master 동일, 신규 없음)
- vitest: 48 files, 599 passed | 6 expected fail | 2 todo
- push --force-with-lease 완료

## PR #183 — feat/M3-1117-O-slip-merge-sleek

| 파일 | 충돌 내용 | 해소 방식 |
|------|-----------|-----------|
| `api/hooks/draft-orders.tsx` | 동일 패턴 (cart-timing log) | HEAD 보존 |
| `components/SplashReceiptAnim.tsx` | 동일 패턴 (M1-1117-I 주석) | HEAD 보존 |

- 선행 커밋 5개 already upstream → 자동 drop
- tsc 에러: 16줄 (신규 없음)
- vitest: 48 files, 599 passed | 6 expected fail | 2 todo
- push --force-with-lease 완료

## 결론

두 PR 모두 origin/master 최신 위로 rebase 완료. mergeable 상태.
