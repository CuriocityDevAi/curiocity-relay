PR #189 · 담기 1요청 · 재조회 제거 · 폴백 OK

## M3-1117-U — POS 담기·수량변경 3요청 → oneshot 1요청 교체

- **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/189
- **브랜치**: `perf/M3-1117-U-cart-oneshot`

### 구현 요약

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `POST /admin/pos/draft-orders/:id/items` (서버 PR #340) |
| 대상 훅 | `useAddToDraftOrder` · `useUpdateDraftOrderItem` |
| 삭제(qty=0) | 기존 3-req 경로 유지 |
| 폴백 조건 | `FetchError.status === 404 \|\| 405 \|\| >= 500` → `_oneshotFallback = true` (세션 동안 기억) |
| 캐시 갱신 | `mergeOneshotDraftOrder()` → 썸네일 등 기존 필드 보존 + 서버 subtotal/tax_total/total 반영 |
| 재조회 제거 | `onSettled`: `_oneshotUpdated: true` 플래그 확인 → `invalidateQueries` 스킵 |
| 연타 catch-up | accQty > originalQty → oneshot update 로 처리 |

### 테스트 결과
- `__tests__/m3-1117-u.test.ts` → **24 PASS**
- `tsc --noEmit` → 신규 에러 **0**
- 기존 테스트 m3-1117-c / m3-1117-i / m1-1117-b → **33 PASS** (회귀 없음)

### PR 본문 3줄
1. POS 담기 2초 원인 = beginEdit + addItems + confirmEdit 3 HTTP 왕복. `POST /admin/pos/draft-orders/:id/items` 1요청으로 서버 안에서 셋을 묶어 처리.
2. 404/405/5xx → 세션 동안 폴백 기억 · 기존 3-req 경로 자동 전환 · 삭제(qty:0)는 기존 경로 유지 (서버 리포트 remove 라인 잔류 이슈).
3. 응답 `draft_order`로 캐시 즉시 갱신 → `invalidateQueries` 스킵으로 재조회 제거 · 서버 #340 배포 후 실기.
