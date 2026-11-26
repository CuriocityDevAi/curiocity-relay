PASS 458 1944852

# M0-1126-K — V4-5 cashier_name 서버 조회 · 매장 logo_url

PR: https://github.com/CuriocityDevAi/storeport/pull/458
브랜치: `feat/M0-1126-K` (베이스 `feat/M0-1126-J` · #457 위에서 스택)
커밋: `1944852 feat(cd/commerce-core): M0-1126-K — V4-5 cashier_name 서버 조회 · 매장 logo_url`
워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1126-K`

## 원장 / 요구

decision-cd-pos-sync-v4-20261126 V4-5 남은 조각 — 영수증 머리에 서버에서 조회한 캐셔 표시 이름 + 매장 로고. 하드코딩 폴백 금지(이름 없으면 CD 가 줄 숨김), 이메일 전체·내부 id 손님 화면 노출 금지.

## 변경 파일

- `apps/commerce-core/src/lib/resolve-cashier-name.ts` (신규) — `pickCashierDisplayName(user)` + `resolveCashierName(container, user_id)` helper. first_name/last_name 조합 → email 로컬 파트 → null.
- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` — cash/edc 경로: buildSnapshot `cashier.name` 서버 조회. QRIS 경로: `order.metadata.cashier_user_id` 로 심어 subscriber 가 꺼내 쓰도록 한다 (webhook 은 로그인 세션이 없음).
- `apps/commerce-core/src/subscribers/order-snapshot-paid.ts` — settings.logo_url 을 `receipt.store.logo_url` 로, Receipt.cashier_user_id 또는 order.metadata.cashier_user_id 역추적 + helper 로 표시 이름 조회 → `receipt.cashier.{id,name}` 머지. 어느 쪽도 없으면 null (하드코딩 폴백 금지).
- `apps/customer-display/src/screens/__tests__/receipt-view.test.ts` — LeftPaymentPanel 렌더 가드 unit (`view.storeLogoUrl` · `view.cashierName` 값 있을 때 노출, 없을 때 null → 줄 숨김).
- `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4-next-customer.spec.ts` — ④ V4-5-K · QRIS 결제 end-to-end — tenders 가 심은 cashier_user_id 를 subscriber 가 풀어 receipt.cashier.name 으로, store.logo_url 도 함께 전달하는지 대조.
- `docs/feature-map.yaml` — 신규 helper 를 `customer-display-snapshot` 피처에 편입.

## 실행 검증 (로컬 직접)

- `pnpm exec tsc --noEmit` (commerce-core) → exit 0
- `pnpm test` (commerce-core) → 75 suites / 877 tests passed · 18 snapshots
- `pnpm exec vitest run` (customer-display) → 16 files / 328 tests passed
- `bash scripts/it.sh cd-pos-sync-v4-next-customer` → 4/4 PASS (V4-1 · V4-5 · V4-5-K · V4-6, 10.3s)
- `bash scripts/naming-check.sh` → PASS

## Kyu 확인 선택지 (3줄)

1. QRIS 캐셔 전달 경로 — **채택**: `order.metadata.cashier_user_id` · 대안 A: payment_collection.metadata · 대안 B: xendit webhook 수정(파일 범위 밖).
2. 이름 폴백 순서 — **채택**: first/last name → email 로컬 파트 → null · 대안: email 금지(이름만) → null.
3. 통합 테스트 subscriber 트리거 — **채택**: 통합 환경에서 derived `payment_status` 가 retrieveOrder 결과에 비어 subscriber 조기 return 하므로, subscriber 가 하는 두 작업(resolveCashierName + markSnapshotPaidByOrder)을 테스트에서 직접 호출. 대안: subscriber 를 query.graph 로 전환(본 라운드 범위 밖).

## 범위 밖

- xendit webhook 쪽 cashier resolve (queue 지시 "건드릴 파일" 에 미포함).
- subscriber payment_status 가드의 query.graph 리팩터 (본 PR 은 통합테스트 안정성을 위해 shape 검증만).

processes: [commerce.cd-sync, customer-display.snapshot]
