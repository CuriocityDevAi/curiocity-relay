# M2-1117-F 진단 리포트 (확정)

원인(확정): 클라이언트 `LiveSnapshotSource.getSnapshot()` 이 서버 래퍼 `{ snapshot, server_now, config_version }` 를 unwrap 하지 않고 전체를 `OrderSnapshot` 으로 캐스팅 → `snapshot_state`·`status` 모두 `undefined` → 상태 머신 영구 "main" 고착 · 고칠 곳: storeport `apps/customer-display/src/mocks/snapshot-source.ts:73`

---

## [REQ-1] 손님 화면이 결제 상태를 무슨 키로 어디서 가져오는가

- **엔드포인트**: `GET /customer-display/snapshots/active`  
  `apps/customer-display/src/mocks/snapshot-source.ts:65-74`
- **인증 키**: `X-Device-Token` 헤더 (localStorage `cd_device_token`)  
  `apps/customer-display/src/lib/pairing.ts:1-21`
- **폴링 간격**: 2000ms
- **미들웨어가 device_token → 주입하는 값**: `stock_location_id`  
  `apps/commerce-core/src/api/middlewares.ts:49` → `result.stock_location_id` → `req[DEVICE_REGISTER_ID_KEY]`

---

## [REQ-2] 서버가 그 키로 무엇을 돌려주고, 누가 어떤 API로 쓰는가

- **파일**: `apps/commerce-core/src/api/customer-display/snapshots/active/route.ts`
- **조회 체인**:
  1. `stock_location_id` → `getActiveSnapshotByStockLocation()` (서비스:574)
  2. `listRegisterSessions({ stock_location_id, status:"open" })` → `session.id`
  3. `getActiveSnapshotForRegister(session.id)` → `listOrderSnapshots({ register_session_id: session.id })`
- **실제 서버 응답 형식** (최초 93da7e1 커밋부터 항상 래퍼):
  ```json
  { "snapshot": { ...OrderSnapshot 필드 }, "server_now": "...", "config_version": n }
  ```
- **클라이언트 타입 선언** (`order-snapshot.ts:44`): `config_version?: number` 를 `OrderSnapshot` 직속 필드로 선언 → 서버 위치(`wrapper.config_version`)와 불일치

---

## [REQ-3] POS fork가 Checkout 진입 시 쓰기 API를 실제로 호출하는가

**호출함** · 키: `register_session_id`

- **진입 시 호출**: fork `app/checkout/[draftOrderId].tsx:68-74`
  ```ts
  const openSession = useCurrentOpenSession(settings.data?.stock_location?.id);
  startSnapshot(orderId, openSession.data?.id); // id = register_session.id
  ```
- **API**: `POST /admin/pos/orders/:id/checkout-snapshot` body `{ register_session_id: session.id }`  
  `fork api/hooks/pos-loyalty.ts:88-96`
- **서버 처리**: `regSvc.upsertSnapshotForRegister({ register_session_id, ... })`  
  `storeport api/admin/pos/orders/[id]/checkout-snapshot/route.ts:111`
- **결제 완료 → paid 전이**: subscriber `order-snapshot-paid.ts:81`  
  이벤트 `order.updated`, `payment.captured` → `markSnapshotPaidByOrder(orderId)` → snapshot_state = "paid" ✓

---

## [REQ-4] 1·2·3 키 일치 표

| 단계 | 파일:줄 | 키 | 일치? |
|------|---------|-----|-------|
| POS 쓰기 | fork `app/checkout/[draftOrderId].tsx:72` + `api/hooks/pos-loyalty.ts:88` | `register_session_id` = `openSession.data?.id` | ✓ |
| 서버 snapshot 저장 | storeport `checkout-snapshot/route.ts:111` | `register_session_id` | ✓ |
| 서버 읽기 체인 | storeport `snapshots/active/route.ts:29-37` | `stock_location_id` → open session → `session.id` | ✓ |
| 서버 응답 형식 | `snapshots/active/route.ts:46-62` | 래퍼 `{ snapshot, server_now, config_version }` | ❌ 래퍼 |
| **클라이언트 파싱** | storeport **`src/mocks/snapshot-source.ts:73`** | `(await res.json()) as OrderSnapshot` — 래퍼 전체 캐스팅 | ❌ **BUG** |
| 앱 state machine | `app/index.tsx:150` + `lib/display-machine.ts:92` | `snapshot.snapshot_state` → `undefined` → 전이 불가 | ❌ 파생 |

**#317 (M3-1116-S) 영향 분석**: 미들웨어 주입값이 `register_session_id` → `stock_location_id` 로 바뀌고, 서버 쿼리도 함께 `getActiveSnapshotByStockLocation` 로 갱신 → 서버-서버 체인 정합. 클라이언트 unwrap 버그는 M2-1116-G (11-16) 첫 live 연결 커밋부터 존재 — #317과 무관.

**fork #157 (M3-1116-R) 영향 분석**: POS 뱃지 폴링 `GET /admin/pos/registers/:id/snapshot` 의 `registerId` 를 `stock_location_id` → `register_session_id` 로 수정. 손님 화면 메인 폴링 체인(`/customer-display/snapshots/active`)과는 별도 경로 — 손님 화면 무반응의 원인이 아님.

---

## [REQ-5] 수정안

**리포**: storeport  
**파일**: `apps/customer-display/src/mocks/snapshot-source.ts:73`  
**방향**: `res.json()` 결과를 `body` 에 받은 뒤 `body.snapshot ? { ...body.snapshot, config_version: body.config_version } : null` 로 unwrap + config_version 병합해 반환. 서버 응답 형식·타입 체인 변경 불필요.

