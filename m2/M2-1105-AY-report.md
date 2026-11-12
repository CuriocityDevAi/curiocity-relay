# M2-1105-AY — Report

## 원인 (1줄)
`prod-shape-seed.ts` 의 `preReserved` 기본값 11 이 `seedProdShape(container, { initialStock: 10 })` 호출 시 초과 → `createReservationItems "Not enough stock available"` → p6-e2e (b)·(b-restock) RED.

## #223 CI 통과 경위
PR의 첫 커밋(M2-1105-AV, `initialStock:10` 없음)에 대해 CI 통과 후, `(b-restock) + initialStock:10` 변경을 force-push로 추가하고 재실행 없이 Squash Merge → seed drift.

## 로컬 4 spec 로그

| spec | 결과 |
|------|------|
| p6-e2e | ✅ 10/10 |
| stock-cleanup | ✅ 1/1 |
| tenders | ✅ 88/88 (기존 #61·#82 RED → restock 계약·inventory_item_id 보존 반영으로 수정) |
| open-order-reservations | spec 파일 없음 |

## CI run 번호
run **43186280864** / job **131074182242** (pos-integration) → **pass**

## PR 번호
#226 — https://github.com/CuriocityDevAi/storeport/pull/226
