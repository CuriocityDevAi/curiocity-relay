# M3-1116-Z 판정: #317 변경으로 생긴 실패 — customer_display_device 테이블에 deleted_at 컬럼 누락

## 실패 테스트 (CI run 43889000288 · job 133374870462)

| spec | 실패 테스트 | 에러 줄 | 받은 상태 |
|------|-----------|---------|----------|
| `integration-tests/loyalty/checkout-snapshot.spec.ts` | Checkout 진입 → GET /customer-display/snapshots/active | :156 | 400 |
| `integration-tests/loyalty/checkout-snapshot.spec.ts` | POST checkout-snapshot 재호출(수량 변경) → snapshot 갱신 | :222 | 400 |
| `integration-tests/loyalty/checkout-snapshot.spec.ts` | Checkout 취소 → DELETE checkout-snapshot → GET active = null | :274 | 400 |
| `integration-tests/loyalty/checkout-snapshot.spec.ts` | 결제(tenders) 후 GET /customer-display/snapshots/active → snapshot paid | :327 | 400 |
| `integration-tests/loyalty/checkout-snapshot.spec.ts` | 결제 후 DELETE checkout-snapshot → snapshot 여전히 paid | :394 | 400 |
| `integration-tests/loyalty/checkout-snapshot.spec.ts` | 결제 없이 DELETE → GET active = null | :444 | 400 |
| `integration-tests/loyalty/customer-display-link-phone.spec.ts` | 유효 X-Device-Token + 자기 계산대 스냅샷 → 200 | :134 | 400 |
| `integration-tests/loyalty/customer-display-link-phone.spec.ts` | 다른 계산대(stock_location) 스냅샷 id → 403 register_mismatch | :203 | 400 |
| `integration-tests/loyalty/customer-display-link-phone.spec.ts` | 같은 계산대에서 세션 교체 후 기존 token 으로 새 스냅샷 접근 → 200 | :252 | 400 |
| `integration-tests/loyalty/customer-display-link-phone.spec.ts` | link_open_until 경과 → 409 link_window_closed | 미확인 | 400 |

## 근본 원인

M3-1116-S에서 추가한 `customer_display_device` 테이블(Migration20261116000001)에  
`deleted_at timestamptz null` 컬럼이 누락됐다.

Medusa v2 `model.define`은 소프트 딜리트를 자동으로 처리하므로  
`listCustomerDisplayDevices({ device_token_hash: hash })` 쿼리에  
`WHERE c0.deleted_at IS NULL` 조건이 자동 삽입된다.  
테이블에 해당 컬럼이 없으므로 ORM이 `column c0.deleted_at does not exist` 에러를 throw.  
미들웨어 `deviceTokenMiddleware`에서 에러가 propagate → Medusa가 400 반환.

## 수정 내용

`Migration20261116000001.ts` up() SQL에 `"deleted_at" timestamptz null` 컬럼 추가 (1줄).

## 자기 검증: 로컬 PASS 로그

### checkout-snapshot.spec.ts
```
PASS integration-tests/loyalty/checkout-snapshot.spec.ts (12.747 s)
  ✓ Checkout 진입 → GET /customer-display/snapshots/active 즉시 items·grand_total 반환 (743 ms)
  ✓ POST checkout-snapshot 재호출(수량 변경) → snapshot 갱신 (896 ms)
  ✓ Checkout 취소 → DELETE checkout-snapshot → GET active = null (486 ms)
  ✓ 결제(tenders) 후 GET /customer-display/snapshots/active → snapshot paid (649 ms)
  ✓ 결제 후 DELETE checkout-snapshot → snapshot 여전히 paid (손님 화면 유지) (551 ms)
  ✓ 결제 없이 DELETE → GET active = null (대기 화면 복귀) (605 ms)
  ✓ X-Device-Token 헤더 없음 → 401 (369 ms)
Tests: 7 passed, 7 total
```

### customer-display-link-phone.spec.ts
```
PASS integration-tests/loyalty/customer-display-link-phone.spec.ts (10.843 s)
  ✓ 유효 X-Device-Token + 자기 계산대 스냅샷 → 200 (693 ms)
  ✓ X-Device-Token 미제공 → 401 missing_device_token (548 ms)
  ✓ 다른 계산대(stock_location) 스냅샷 id → 403 register_mismatch (429 ms)
  ✓ 같은 계산대에서 세션 교체 후 기존 token 으로 새 스냅샷 접근 → 200 (456 ms)
  ✓ link_open_until 경과 → 409 link_window_closed (455 ms)
  ✓ 페어링 실패 카운터 동시 5회 → attempts 정확히 5 · 코드 폐기 (501 ms)
Tests: 6 passed, 6 total
```

### 전체 pos-integration suite 회귀 없음
모든 spec PASS (pos/* + loyalty/* 전체).
