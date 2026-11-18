PR #372 · QRIS 반품 환불액 0 재현 O · 수정 후 금액 정상 O · 추가 발견 1곳

## 작업 요약 (M0-1118-G)

`/admin/pos/orders/:id/return` 의 QRIS 분기 (route.ts 263-286) 가 Medusa v2 remote query 에서 `items.quantity` 를 `items.detail.quantity` 와 함께 요청하지 않아, 모든 라인이 `quantity: 0` → `oriQty=0 → share=0 → refundAmount=0` 이 조용히 성립, Xendit `/v3/refunds` 가 amount=0 으로 호출되는 금액 버그를 수정.

#365 (5496fc1 · fulfill route) 와 같은 뿌리 · 1:1 패턴.

## 변경 사항

- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts`
  - QRIS items 재조회 fetchFields 에 `items.detail.quantity` 추가.
- `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-cancel.ts`
  - 함수 본문에서 읽히지 않는 `items.quantity` fetch 제거 (같은 뿌리 리스크 사전 차단).
- `apps/commerce-core/src/workflows/pos-return/__tests__/pos-return-route-qris-qty.unit.spec.ts` (신규)
  - #G-1 regression guard — fields 에 `items.detail.quantity` 포함 확인.
  - #G-2 정상 산정 — 2 개 중 1 반품 · line total 100000 → refundAmount 50000.
  - #G-3 **버그 재현** — quantity 누락 시 refundAmount=0 조용히 성립.

## 테스트 로그

### 신규 unit spec
```
PASS src/workflows/pos-return/__tests__/pos-return-route-qris-qty.unit.spec.ts (5.014 s)
  POST /admin/pos/orders/:id/return · QRIS refundAmount (M0-1118-G)
    ✓ #G-1 · QRIS items 재조회 fields 에 items.detail.quantity 포함 (regression guard)
    ✓ #G-2 · quantity 정상 반환 시 refundAmount 가 부분 환불 비율로 산정
    ✓ #G-3 · 버그 재현 — quantity 누락 (undefined) 시 refundAmount=0 (조용히 틀리는 돈 문제)
Tests: 3 passed, 3 total
```

### 전체 unit
```
Test Suites: 46 passed, 46 total
Tests:       531 passed, 531 total
Snapshots:   18 passed, 18 total
Time:        19.9 s
```

### typecheck
```
npx tsc --noEmit  → 에러 0
```

### IT (partial-refund-anytime · void-refund-restock)
- 로컬 Medusa 부트 (seeded Postgres) 환경 필요 — 본 워크트리에서 실행 불가.
- CI 에서 실행 (pos-integration job). unit #G-3 가 분기 (refundAmount 산정) 를 직접 커버.

## [REQ] 2 — 같은 계열 grep 표 (items.quantity fetch · 실제 읽음 여부)

| 파일 | 줄 | entity | 읽음 여부 | 영향 |
|---|---|---|---|---|
| src/workflows/pos-void/steps.ts | 299 | fulfillment | fi.quantity (fulfillment items) | 안 영향 (다른 entity · computed 아님) |
| src/api/admin/register-sessions/[id]/fulfill/route.ts | 61 | — | retrieveOrder 경유 | 안 영향 (graph 아님 · 모듈 retrieveOrder) |
| **src/api/admin/register-sessions/[id]/pos-complete/route.ts** | **52** | **order (graph)** | **it.quantity 폴백 분기에서 읽음** | **같은 계열 리스크 1곳 — 별도 티켓 후보** (total/subtotal 둘 다 0 이면 quantity 로 폴백 · 본 경로가 silent 로 틀릴 조건은 더 좁지만 뿌리 동일) |
| src/api/admin/pos/orders/[id]/return/route.ts | 268 | order (graph) | oriQty 로 읽음 | **본 커밋 fix 대상** |
| src/api/admin/pos/orders/[id]/fulfill/route.ts | 54 | order (graph) | — | #365 (5496fc1) 에서 이미 fix (same file :59 has items.detail.quantity) |

## 선택지 · 채택 · 이유 (3줄)

- A) fetchFields 에 `items.detail.quantity` 추가 (#365 와 1:1 패턴) — ✓ 채택
- B) refundAmount 산정 로직을 workflow 안으로 흡수 (route 선계산 제거) — 범위 초과 · W1 리팩터와 충돌 가능
- C) 가드만 추가 (refundAmount=0 → 400) — 뿌리 미수정 · 다음 리팩터에서 재발

이유: #365 와 1:1 패턴으로 최소 수정 · 즉시 회귀 테스트로 재발 차단.

## #368 과의 관계

#368 (fix/M1-1118-H-dynamic-imports) 가 같은 return/route.ts 의 import 줄 (dynamic → static) 을 수정. 본 PR 은 fetchFields 블록 (263-286) 과 전혀 다른 위치를 수정하므로 충돌 없음. #368 머지 뒤 가벼운 rebase 로 충분.

## 상태

- 커밋: 559d7a6 · 브랜치: fix/M0-1118-G-return-qty
- 푸시: ✓ (origin/fix/M0-1118-G-return-qty)
- PR: #372 (open · 머지 X)
- 워크트리: /Users/kyu.lee/curiocity-live/storeport-wts/hub-m0
