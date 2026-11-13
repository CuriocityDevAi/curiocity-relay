# R0-1105-DQ — storeport #243 M0-1105-BP 리뷰 리포트

**판정: APPROVE**
**head SHA**: `525125af464c257c584b5b5b4364a673608228a3`
**CI pos-integration**: success (2026-11-13T12:30:18Z)
**mergeable_state**: CLEAN / MERGEABLE

---

## REQ1 · kind 판정 단일 함수 · 잔액 대비 아닌지

✅ `resolveRefundReceiptKind` 함수 1개로 집중됨.
- 정의: `apps/commerce-core/src/modules/receipt/service.ts:33`
- `/refund` 호출: `refund/route.ts:504`
- `/return` 호출: `return/route.ts:993`
- 기준: `order.metadata.pos_totals.grand_total` (우선) → `order.total` (폴백). 잔액 대비 아님 ✓

`/refund-retry` 는 현재 영수증 신규 발행 지점 없어 호출 없음 — PR 본문 명시 일치.

## REQ2 · 금액 비교 단위 · 나눠 결제 · 선주문 정합

✅ `Math.round(thisRefundTotal) === Math.round(original)` — IDR 정수 환경 적합. BigNumber 불필요.
- 나눠 결제: `pos_totals.grand_total` = 주문 총액(tender 합계 아님). #BP-4 split cash 2건으로 검증.
- 선주문(계약금): `pos_totals.grand_total` = 주문 총 금액(계약금 아님) — 직접 테스트는 없으나 필드 의미 정합.

## REQ3 · 테스트 4건 · 기존 영수증 미변경

✅ `refund-receipt-kind.spec.ts` 에 4건 전부 존재:
- #BP-1: /refund 전액 → `kind='refund'`
- #BP-2: /return 1 품목 → `kind='partial_refund'`
- #BP-3: /return 나머지 → `kind='partial_refund'` (앞선 부분 환불 뒤도 partial · Kyu 원문)
- #BP-4: split cash 2건 주문 /return 1 품목 → `kind='partial_refund'`

CI pos-integration 통과 ✓. 기존 영수증에 대한 수정 로직 없음 ✓.

`tenders.spec.ts:3639` 기대값 변경(`refund` → `partial_refund`) — 60000 환불 ≠ 120000 주문총액 — 의도된 수정.

## REQ4 · webhook.ts · xendit-qris-provider · QRIS 미변경

✅ 변경 파일 8개:
- `integration-tests/pos/refund-receipt-kind.spec.ts` (신규)
- `integration-tests/pos/tenders.spec.ts` (기대값 1건)
- `package.json` (test 스크립트)
- `src/api/admin/pos/orders/[id]/refund/route.ts`
- `src/api/admin/pos/orders/[id]/return/route.ts`
- `src/modules/receipt/migrations/Migration20261113000001.ts`
- `src/modules/receipt/models/receipt.ts`
- `src/modules/receipt/service.ts`

webhook.ts, xendit-qris-provider, QRIS 경로 미변경 ✓.

## REQ5 · CI · mergeable_state · head SHA

- **pos-integration**: success (run 43425047437 · 2026-11-13T12:30:18Z)
- **unit-commerce-core**: success
- **mergeable_state**: CLEAN
- **head SHA**: `525125af464c257c584b5b5b4364a673608228a3`

## 주의

**[주의] `service.ts:29` 주석 불일치** — `resolveRefundReceiptKind` 주석 호출자 목록에 `· POST /admin/pos/orders/:id/refund-retry` 가 포함되어 있으나 실제 diff에 `refund-retry/route.ts` 변경 없음. 현재 refund-retry에 영수증 신규 발행 지점이 없어 호출 불필요한 것은 맞지만, 주석이 "호출자"로 표기해 오해 소지. 머지 블로커 아님 — 차기 refund-retry 영수증 발행 작업(운영 재발행 트랙) 시 반드시 연동할 것.

---

**최종 판정: APPROVE** — kind 판정 단일 함수 집중·기준 준수·4건 테스트 통과·QRIS/webhook 미변경 모두 충족.
