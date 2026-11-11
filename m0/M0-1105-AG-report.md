# M0-1105-AG · 배달 주문 courier 없음 서버 거절 (fulfill 400 가드)

## 변경 요약

- **`apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts`**
  - order fetch 직후 (idempotency·method 검증·재고/예약/상태 변화 전) 에
    `order_type === "delivery"` + `courier.trim().length === 0` → **400**
    `{ type: "invalid_data", message: "Courier is required for delivery orders." }` 거절.
  - stage 무관 (hand_over 포함). `order_type` 은 `order.metadata.order_type`
    저장값 기준 (body.method 만 delivery 로 보낸 주문은 영향 없음).
- **`apps/commerce-core/integration-tests/pos/fulfill-delivery-guard.spec.ts`** (신규)
  - #1 delivery · courier 생략 → 400 · stocked/reserved 불변 · metadata 불변
  - #2 delivery · courier `"   "` 공백 → 400
  - #3 delivery · stage=`hand_over` · courier 없음 → 400 (stage 무관)
  - #4 delivery · courier="Grab Express" · hand_over → 200 · fulfilled · completed · stocked -1
  - #5 takeaway · hand_over → 200 (회귀 가드 · delivery 분기 영향 없음)

금지 준수: `tenders.spec.ts` · void/refund/return 라우트 미건드림 (#207·#208 머지 대기).

## 테스트 · CI

- `pnpm --filter commerce-core typecheck` → **pass**
- `TEST_TYPE=unit pnpm exec jest` → **33/33 pass**
- `bash scripts/naming-check.sh` → pass
- CI `pos-integration` → PR #209 체크로 가동 (push 완료 직후 pending).

## PR

- https://github.com/CuriocityDevAi/storeport/pull/209
- branch: `fix/m0-1105-ag-delivery-courier-guard`
- commit: `7f17e96` (lint-staged prettier 이후 rehash)
- 본문에 선택지 · 채택 · 이유 3줄 + fixture (400 응답 · 재고/예약/상태 불변 명시) 포함.

## 이연 순증감

- 없음. 가드 1개 + 테스트 5건 · feature-map `commerce-core.pos-tenders-fulfill` 범위 내 (라우트·tests glob 이미 커버).
EOF