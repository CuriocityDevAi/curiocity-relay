# M1-1105-AU 진단 리포트

**원인 = ② store_id 불일치**

Admin 왼쪽 메뉴 PIN 위젯은 첫 `stock_location.id`(`sl_…`)로 PIN을 계산하는데, void/refund 라우트는 `order.metadata.stock_location_id`가 없을 때 `body.register_session_id`(`rses_…`)로 폴백해 storeId가 달랐다. `computeDailyPin("rses_…")` ≠ `computeDailyPin("sl_…")` 이므로 올바른 PIN(4756)을 입력해도 항상 401 mismatch.

---

## 코드 대조표

| 파일 | 줄 | 내용 | 판정 |
|------|-----|------|------|
| `api/admin/pos/manager-pin/route.ts` | 28–39 | store_id 쿼리파라미터 없으면 첫 `stock_location.id` | 기준 |
| `orders/[id]/void/route.ts` | 232–235 (수정 전) | `order.metadata.stock_location_id ?? submittedSessionId \|\| "default"` | **버그** — `submittedSessionId`=`rses_…` |
| `orders/[id]/refund/route.ts` | 197–200 (수정 전) | `order.metadata.stock_location_id ?? body.register_session_id \|\| "default"` | **버그** — 동일 패턴 |
| `orders/[id]/return/route.ts` | 335–352 | `metadata.stock_location_id` → 없으면 첫 stock_location.id (R0-1105-AZ 선행 수정) | 정상 |
| `_shared/manager-pin.ts` | 106–160 | `verifyManagerPin({ storeId, pin })` — 5회 오답 시 15분 잠금 | 정상 |

**가설 ② 근거**: `order.metadata.stock_location_id`는 storeport 서버의 어떤 라우트도 주문 생성 시 set하지 않는다. 앱(fork)이 명시적으로 넣지 않는 한 항상 null → void/refund가 `rses_…`를 storeId로 쓴다.

---

## 가설 ① (잠금) 검토

Kyu가 틀린 PIN을 입력한 횟수가 5 미만이면 ①은 해당 없음. 단, 5회 이상 틀렸다면 `rses_…` 키 아래 잠금이 걸렸을 것이고 올바른 PIN도 423이 된다. 운영 서버 재시작 시 in-memory 잠금은 초기화된다.

**가설 ① 단위 테스트 결과** (새로 추가, 모두 통과):
- 4회 오답 → 정답 = `ok:true` ✓
- 5회 오답 → 정답 = `ok:false reason:"locked"` ✓
- 5번째 오답 응답: `remaining_attempts:0 · locked:true · locked_until` 포함 ✓

---

## 앱(fork)이 401·423을 받는 방법 (앱 수정 없음)

| HTTP 코드 | Body 필드 | 의미 |
|-----------|-----------|------|
| `401` | `{ ok:false, reason:"mismatch", remaining_attempts: N }` | PIN 불일치 · N번 남음 |
| `423` | `{ ok:false, reason:"locked", locked_until: "ISO8601" }` | 15분 잠금 · `locked_until`까지 UI 표시 |

---

## 수정 내용

**`void/route.ts`** (232–248): `submittedSessionId` 폴백 → 첫 stock_location.id 조회
**`refund/route.ts`** (197–215): `body.register_session_id` 폴백 → 첫 stock_location.id 조회

두 파일 모두 `return/route.ts`의 R0-1105-AZ 수정과 동일한 패턴으로 정렬.

---

## 테스트 실행 로그

```
npm test -- --testPathPattern="manager-pin.unit.spec"
PASS src/admin/routes/manager-pin/__tests__/manager-pin.unit.spec.ts
Tests: 9 passed (기존 5 + 신규 lockout 4)
```

전체 unit 테스트 (pre-push hook): 42 passed ✓  
통합 테스트 `#80 · #81` (void/refund Admin PIN 회귀): 추가됨, CI에서 실행 대상

---

## PR

[#216](https://github.com/CuriocityDevAi/storeport/pull/216) — `fix/m1-1105-au-manager-pin-store-id`

---

이연 순증감: 0
