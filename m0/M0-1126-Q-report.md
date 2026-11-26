PASS 465 20265d3

## 현재 `#N` 출처 (§[REQ] 0)

- `#N` = `order_snapshot.pos_order_num` (integer, M2-1124-B · `Migration20261124000001`).
- **draft/order display_id 가 아님.** 별도 숫자 필드다.
- 현재 **POS fork** (M1-1124-B/C) 가 자체 카운터를 계산해 PATCH
  `/admin/pos/customer-display/snapshots/:id {pos_order_num}` 로 서버에 올려 저장.
  서버는 그대로 저장, `lifecycle.serializeSnapshot` 이 `snapshot.pos_order_num` 으로
  포함, CD 는 `<PosChipBadge orderNum={snapshot.pos_order_num} />` 로 opaque 렌더.

## 변경 (M0-1126-Q)

- 새 테이블 `pos_short_number (stock_location_id PK · last_value int 0..99)` ·
  `Migration20261126000001`.
- 새 메서드 `svc.allocatePosShortNumber(stock_location_id, pgConnection)`:
  SQL UPSERT `set last_value=(last_value%99)+1 returning last_value`.
  Postgres row lock 으로 원자적 (동시 2건이 서로 다른 번호).
- `startSnapshotForRegister` / `upsertSnapshotForRegister` 신규 snapshot 1건당 1회
  할당 (`stock_location_id` + `pgConnection` 둘 다 주어진 경우). 기존 snapshot 갱신
  때는 재할당 없음 → 주문에 저장된 번호 보존.
- `checkout-snapshot` route 가 `stock_location_id` + `pgConnection` 전달 (시작점).
- PATCH `pos_order_num` 는 서버 발급 후 **silent no-op** (양쪽 route 동일: admin 과
  device-token). 레거시 (서버 할당 전) 만 수용.
- 긴 번호 (`order.display_id` · `order.metadata.custom_display_id` `PIM-26B1001`) 불변.
- 기존 주문 백필 없음.

## POS fork 변경 필요 여부

- **디스플레이**: 변경 **불필요**. snapshot.pos_order_num 을 opaque 렌더 그대로.
  서버 발급 번호를 자동으로 본다.
- **쓰기**: POS fork 가 자체 PATCH 중 — 서버 발급 후에는 silent no-op 라 그대로
  둬도 안전. 후속 정리로 POS fork 가 자체 카운터 로직을 제거하면 네트워크 왕복
  1회 절감 (선택적).

## PR 본문 Kyu 확인 항목

- POS·CD·영수증 모든 화면의 `#N` 이 매장별 1..99 순환 (99 다음 1)
- 두 결제대 동시 결제가 서로 다른 번호 (원자성)
- 매장 2개가 서로 독립 (A 가 99 여도 B 는 자기 궤도)
- 긴 번호 `PIM-26B1001` 형식 · 영수증 `R-…` 그대로
- 기존 주문 (M0-1126-Q 이전 발급) 은 옛 번호 그대로 표시 (백필 없음)
- POS fork 자체 카운터 유지 OK (서버가 이긴다)

## 로그

- `pnpm --filter commerce-core typecheck` → 0 err
- `pnpm --filter commerce-core lint` → 9 warn (0 err · 전부 사전 경고)
- `pnpm --filter commerce-core test` → **75 suites / 877 tests pass**
- `bash scripts/it.sh short-order-num` → **5/5 pass**
  (1→99→1 순환 · 매장 격리 · 동시 10건 중복 없음 · 긴 번호 불변 · POS PATCH no-op)
- `bash scripts/it.sh cd-pos-sync-v4` → **8/8 pass** (회귀 없음)
- `bash scripts/naming-check.sh` → PASS
- `node scripts/feature-map-check.mjs` → 신규 파일 전부 매칭 (사전 미매칭 1건은 M0-1126-Q
  무관 `apps/customer-display/src/lib/__tests__/live-cd-connect.test.ts`)

## 파일

- `apps/commerce-core/src/modules/register_session/models/pos-short-number.ts` (new)
- `apps/commerce-core/src/modules/register_session/migrations/Migration20261126000001.ts` (new)
- `apps/commerce-core/src/modules/register_session/service.ts` (service register + allocator + 할당 훅)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/checkout-snapshot/route.ts` (pgConnection + stock_location_id 전달)
- `apps/commerce-core/src/api/admin/pos/customer-display/snapshots/[id]/route.ts` (PATCH no-op guard)
- `apps/commerce-core/src/api/customer-display/snapshots/[id]/route.ts` (PATCH no-op guard)
- `apps/commerce-core/integration-tests/pos/short-order-num.spec.ts` (new · 5 cases)
- `docs/contracts/cd-sync-contract-v1.4.md` §6 신설
- `docs/feature-map.yaml` 등록
