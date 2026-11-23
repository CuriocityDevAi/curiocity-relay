# M0-1123-F-report — PASS

- PR: https://github.com/CuriocityDevAi/storeport/pull/414
- 브랜치: `feat/M0-1123-F-ask-phone`
- mergeable: `MERGEABLE` (mergeStateStatus=UNSTABLE 는 CI 검사 진행 중 · 충돌 없음)
- 테스트: unit 39/39 · IT cd-parallel-pay 15/15 (신규 5건 · 녹색)

## 1. 진단 (쉬운 말 1단락)

v3 R1 까지 적용된 서버는 1번 손님이 번호 입력을 끝내는 순간 — `customer_phone` 이 세팅되거나 `skip-phone` 으로 `skipped_at` 이 세팅되면 — 그 레지스터의 2번 paid snapshot 이 `pickBestSnapshot` 의 rank 1 (`phone_entry_open`) 로 자동 상승해 CD 에 번호 입력 화면이 즉시 뜬다. 종이 영수증은 이미 뽑혔는데 CD 는 2번 손님에게 번호를 요구하는 상태 — 규칙 B (relay `decision-cd-parallel-20261123.md` §7: "캐시어가 POS의 버튼을 눌러서 … 수동만 가능") 위반. 해결: 2번 paid 를 기본 `phone_deferred=true` 로 저장해 CD 자동 승격을 끊고, 캐셔가 POST `/admin/pos/orders/:id/ask-phone-on-display` 를 호출해야 `phone_deferred=false` 로 해제되어 승격되도록 한다.

## 2. 구현

- 신규 컬럼: `order_snapshot.phone_deferred boolean (default false)` · Migration20261123000001
- `markSnapshotPaid`: 같은 session 에 `phone_entry_open=true` 인 다른 snapshot 이 존재하면 신규 paid 를 `phone_deferred=true` 로 저장
- `isPhoneEntryOpen`: `phone_deferred=true` 면 `false` 반환 → `pickBestSnapshot` rank 1 제외
- `serializeSnapshot` DTO: `phone_deferred: boolean` 노출
- `types/customer-display.ts`: `phone_deferred?: boolean` 추가
- 신규 메서드 `svc.askPhoneOnDisplayForOrder(order_id)` — 매트릭스:
  - ok: 승격(또는 멱등 — 이미 open)
  - no_snapshot / not_paid / already_linked / link_window_closed / phone_entry_busy(+ entering_order_id)
- 신규 라우트 `apps/commerce-core/src/api/admin/pos/orders/[id]/ask-phone-on-display/route.ts`
- `skip-phone` · `nextCustomerForOrder` · `link-phone` 과 자동 호환: 1번 종료 후 다른 손님 deferred 가 수동 승격 가능해지고, 캐셔가 명시적으로 Ask on display 를 다시 눌러야 한다 (멱등 200).
- 하위호환: 기존 엔드포인트·필드·황금 경로(1인 결제) 그대로.

## 3. 테스트 로그

### 3-1. Unit (lifecycle · phone_deferred 4건 추가)

```
PASS src/modules/register_session/__tests__/order-snapshot.unit.spec.ts
Test Suites: 1 passed, 1 total
Tests:       39 passed, 39 total
Time:        0.268 s
```

phone_deferred describe (신규):

- `paid + phone_deferred=true → phone_entry_open=false`
- `deferred=true + 미deferred open paid 공존 → open paid 가 CD 점유`
- `deferred=true 혼자 + active 공존 → active 가 승 (규칙 B: 자동 keypad 금지)`
- `deferred=false (기본) 혼자 → phone_entry_open=true 성립`

### 3-2. Integration (`bash scripts/it.sh cd-parallel-pay`)

```
PASS integration-tests/pos/cd-parallel-pay.spec.ts (17.966 s)
  M0-1123-B · POS 다중 손님 R1 (병렬 결제 서버 레이어)
    ✓ T-01 · startSnapshotForRegister 호출이 기존 paid snapshot 을 expire 하지 않는다
    ✓ T-02 · upsertSnapshotForRegister(cart_building) 가 M3-1119-R/S 가드 없이 paid 를 보존한다
    ✓ T-03 · phone_entry_open paid 가 active 보다 우선 — CD 가 keypad 를 소유
    ✓ T-04/T-06 · 1번 phone_entry_open · 2번 cart→paid 전이 중 CD 는 1번을 유지
    ✓ T-13 · markSnapshotPaid closing_time='22:00' → link_open_until 은 당일 22:00 WIB
    ✓ link-phone · body.order_id 가 snapshot.order_id 와 다르면 409
    ✓ skip-phone · POST → phone_entry_open=false · link_open_until(EOB) 보존 · CD 가 다른 active 복귀
    ✓ skip-phone · 멱등(연타) · 이미 skipped 여도 200 반환
    ✓ next-customer(order 단위) · 2번 종료가 1번 paid 소급 창을 건드리지 않는다
    ✓ ask-phone-on-display · paid 혼자 · phone_entry_open=true → 200 멱등
    ✓ ask-phone-on-display · 1번 keypad 중 2번 paid → phone_entry_busy 409 · 2번은 deferred
    ✓ ask-phone-on-display · 1번 종료 후 2번 캐셔 수동 → 2번 승격 200
    ✓ ask-phone-on-display · already_linked → 409
    ✓ ask-phone-on-display · link_window_closed → 409
    ✓ link-phone · body.order_id 생략(하위호환) 또는 일치 시 정상 처리
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Time:        18.034 s
```

신규 IT 5건 (M0-1123-F):

- `ask-phone-on-display · paid 혼자 · phone_entry_open=true → 200 멱등`
- `ask-phone-on-display · 1번 keypad 중 2번 paid → phone_entry_busy 409 · 2번은 deferred`
- `ask-phone-on-display · 1번 종료 후 2번 캐셔 수동 → 2번 승격 200`
- `ask-phone-on-display · already_linked → 409`
- `ask-phone-on-display · link_window_closed → 409`

## 4. API 요청/응답 예시

### 4-1. 정상 (혼자 paid · 멱등)

```
POST /admin/pos/orders/order_Cust-Ask-Solo/ask-phone-on-display
Authorization: Bearer <admin>
Content-Type: application/json
{}

200 OK
{
  "ok": true,
  "idempotent": true,
  "snapshot": {
    "id": "ordsnap_...",
    "order_id": "order_Cust-Ask-Solo",
    "snapshot_state": "paid",
    "phone_entry_open": true,
    "phone_deferred": false,
    "link_open_until": "2026-11-23T15:00:00.000Z",
    ...
  }
}
```

### 4-2. phone_entry_busy (1번 입력 중 2번 Ask)

```
POST /admin/pos/orders/order_Cust-2/ask-phone-on-display
Authorization: Bearer <admin>
{}

409 Conflict
{
  "type": "phone_entry_busy",
  "message": "another order is currently entering phone",
  "entering_order_id": "order_Cust-1"
}
```

### 4-3. already_linked

```
POST /admin/pos/orders/order_Cust-Linked/ask-phone-on-display
Authorization: Bearer <admin>
{}

409 Conflict
{ "type": "already_linked", "message": "customer already linked" }
```

### 4-4. link_window_closed (EOB 경과)

```
POST /admin/pos/orders/order_Cust-EOB-Gone/ask-phone-on-display
Authorization: Bearer <admin>
{}

409 Conflict
{ "type": "link_window_closed", "message": "link window closed" }
```

## 5. 파일 소유권

- 신규: `apps/commerce-core/src/api/admin/pos/orders/[id]/ask-phone-on-display/route.ts` · `apps/commerce-core/src/modules/register_session/migrations/Migration20261123000001.ts`
- 수정: `apps/commerce-core/src/modules/register_session/{service.ts, lifecycle.ts, order_snapshot/model.ts, __tests__/order-snapshot.unit.spec.ts}` · `apps/commerce-core/src/types/customer-display.ts` · `apps/commerce-core/integration-tests/pos/cd-parallel-pay.spec.ts` · `docs/plans/pos-multi-customer-v3.md` · `docs/feature-map.yaml`
- CD 앱(`apps/customer-display`) 무변경 — pickBestSnapshot 결과만으로 규칙 B 가 서버쪽에서 강제됨 (DTO 의 `phone_entry_open` / `phone_deferred` 는 이미 소비하는 흐름).

## 6. 운영 접근

없음 — SSH · railway CLI · 운영 DB 사용 없음.
