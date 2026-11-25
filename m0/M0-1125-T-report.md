# M0-1125-T — PASS

**원인**: `api/admin/pos/customer-flow/route.ts` 가 body 에서 `snapshot_id` 를 필수로 요구 → POS(#266)가 계약서 v1.1 §2 대로 `{action, phone?}` 만 보내면 400 → link_phone/reset 전부 실패.

**수정**: `snapshot_id` 를 선택으로 바꾸고 서버가 활성 CD snapshot 을 자체 조회. 아무 식별자도 없거나 활성 snapshot 이 없으면 `200 {ok:false, reason:'no_active_snapshot', customer_flow:null}` (v1.1 추가 사유).

## 설계

### POS `/admin/pos/customer-flow` (body 검증 로직)

- 입력 (계약 §2 "추가 필드 허용" 조항 활용):
  `{ action, phone?, snapshot_id?, register_session_id?, stock_location_id? }`
- 해결 순서:
  1. `snapshot_id` 명시 → `retrieveOrderSnapshot`. `stock_location_id`/`register_session_id` 함께 오면 교차 검증 → 다른 매장이면 **403 register_mismatch**.
  2. `register_session_id` → `getActiveSnapshotForRegister(id, now)`. `stock_location_id` 함께 오면 session 의 소유 매장과 교차 검증.
  3. `stock_location_id` → `getActiveSnapshotByStockLocation(sloc, now)`.
  4. 아무 식별자도 없거나 조회 결과 null → `no_active_snapshot`.

### CD `/customer-display/customer-flow` (디바이스 토큰 기반)

- 입력: `{ action, phone?, snapshot_id? }`, 디바이스 토큰이 `DEVICE_REGISTER_ID_KEY` 로 `stock_location_id` 주입.
- 해결:
  1. `snapshot_id` 명시 → retrieve + 디바이스 매장 교차 검증 (기존 M3-1116-S 가드 유지).
  2. 없으면 `getActiveSnapshotByStockLocation(deviceStockLocationId, now)` 로 자동 조회.
  3. 결과 null → `no_active_snapshot`.

### 돈 안전/크로스 스토어 보호

- POS: snapshot_id 명시 + 디바이스 지시 매장과 소유 매장 불일치 → 403 (적립/변이 호출 전 차단).
- CD: 기존 register_mismatch 가드 유지 — 디바이스 토큰 외 매장 snapshot_id 접근 불가.

## 테스트

신규 유닛 테스트 14종:

- `src/api/admin/pos/customer-flow/__tests__/route.unit.spec.ts` (8 cases)
  - snapshot_id 없이 link_phone + stock_location_id → 자동 조회 성공
  - snapshot_id 없이 reset + register_session_id → register 기반 자동 조회
  - 활성 snapshot 없음 → 200 no_active_snapshot + customer_flow:null
  - 아무 식별자도 없음 → 200 no_active_snapshot
  - 다른 매장 snapshot_id → 403 register_mismatch (orchestrator 미호출)
  - snapshot_id 명시인데 없음 → 404 snapshot_not_found
  - action 누락 → 400
  - 허용 안 된 action (submit_phone 은 CD 전용) → 400
- `src/api/customer-display/customer-flow/__tests__/route.unit.spec.ts` (6 cases)
  - snapshot_id 없이 start_entry → 디바이스 매장 활성 snapshot 자동 조회
  - 활성 snapshot 없음 → 200 no_active_snapshot
  - 디바이스 토큰 없음 → 401
  - 다른 매장 snapshot_id 접근 → 403 register_mismatch
  - snapshot_id 명시인데 없음 → 404 snapshot_not_found
  - 허용 안 된 action (link_phone 은 POS 전용) → 400

## QC 꼬리

### typecheck

```
> commerce-core@0.0.1 typecheck /Users/kyu.lee/projects/curiocity-relay-wts/M0-1125-T/apps/commerce-core
> tsc --noEmit
```

에러 0.

### test (전체 unit)

```
Test Suites: 74 passed, 74 total
Tests:       855 passed, 855 total
Snapshots:   18 passed, 18 total
Time:        31.3 s
```

(기존 830 → 신규 2 spec · 14 tests 로 855).

### 신규 spec 단독

```
PASS src/api/customer-display/customer-flow/__tests__/route.unit.spec.ts
PASS src/api/admin/pos/customer-flow/__tests__/route.unit.spec.ts

Test Suites: 2 passed, 2 total
Tests:       14 passed, 14 total
Time:        1.6 s
```

### feature-map

```
Feature-map v2 · round=M0-0917-A · project=storeport
scanned: 1325 files → matched=1325 unmatched=0 (0.0%)
```

(새 POS 테스트 파일을 `customer-display-customer-flow` leaf 에 추가.)

### 커밋 · push

- commit SHA: `27ad85c3b98e47b295699e7e95272d42e7b63006`
- branch: `feat/M0-1125-R-cd-sync-server` (PR #445)
- push: `d3f22b4..27ad85c  feat/M0-1125-R-cd-sync-server -> feat/M0-1125-R-cd-sync-server`
- pre-push: 전체 unit 855 pass + customer-display vitest 246 pass

셀프 머지 금지 (리포트 규약).

## 변경 파일 (5)

- `apps/commerce-core/src/api/admin/pos/customer-flow/route.ts` (수정 — snapshot 해결 로직 신설)
- `apps/commerce-core/src/api/customer-display/customer-flow/route.ts` (수정 — snapshot_id 선택)
- `apps/commerce-core/src/api/admin/pos/customer-flow/__tests__/route.unit.spec.ts` (신규)
- `apps/commerce-core/src/api/customer-display/customer-flow/__tests__/route.unit.spec.ts` (신규)
- `docs/feature-map.yaml` (POS 테스트 파일 등록)
