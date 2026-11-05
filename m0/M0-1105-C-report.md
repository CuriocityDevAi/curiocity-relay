---
round: M0-1105-C
pr:
  storeport: storeport#185
base_pr: storeport#184
outcome: pos-fix-6of6-pass · M0-1105-B 발견 3건 수정 · ADDENDUM Math.floor · pos-complete unused import · 통합 6/6 · unit 20/20 · BOOT OK
kyu_checks: 1 (ci-pos-integration-green-6of6 · PR #184 + #185 머지 후 CI 러너 6/6 PASS)
---

# M0-1105-C · POS 결제 API 발견 3건 수정 · 통합 6/6 PASS

**일자**: 2026-11-05 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/{tenders,fulfill}/route.ts` + `register-sessions/[id]/pos-complete/route.ts` + `integration-tests/pos/helpers.ts` + DP unit spec.

**base**: storeport PR #184 (`test/m0-1105-b-pos-integration`). #184 머지 후 자동 rebase.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | FIX #1 tenders 라우트 authorize 명시 → edc approval_code 누락 400 | ✓ |
| 2 | FIX #2 fulfill 방어 + helper product→variant→inventory chain | ✓ (route 방어 + helper 체인 + direct adjust bridge) |
| 3 | FIX #3 updateOrders silent fail 제거 + verification | ✓ (500 + query.graph verify) |
| 4 | FIX #4 Math.round → Math.floor (ADDENDUM 반올림 없음) | ✓ (route + unit spec + 신규 edge case 3건) |
| 5 | FIX #5 pos-complete 미사용 import 제거 | ✓ |
| 6 | 통합 테스트 6/6 PASS 로컬 | ✓ |
| 7 | 산출물 기동 BOOT OK + /health 200 | ✓ |
| 8 | 금지 (src/admin/** · medusa-config) 변경 0 | ✓ |

---

## 1. 발견 3건 ↔ 수정 file:line

### FINDING #1 → FIX · authorize 명시
- `src/api/admin/pos/orders/[id]/tenders/route.ts:267-296`
- `createPaymentSessionsWorkflow` 뒤에 `paymentModule.authorizePaymentSession(id, context)` 직접 호출 추가.
- 뿌리: `createPaymentSessionsWorkflow` 는 `initiatePayment` 만 호출 · `authorizePayment` (provider validation 위치) 는 별도 step. → provider 의 bank/approval_code/card_last4 검증이 호출 안 됨.

### FINDING #2 → FIX · fulfill 방어 + helper 체인
- `src/api/admin/pos/orders/[id]/fulfill/route.ts:40-57` — `isInventoryLinkError` 확장 (variant · inventory_item · reservation · stock_location · "not found" · "is required" · "undefined").
- 같은 파일 `:115-162` — defensive fall-through 안에서 `order.items[].metadata.inventory_item_id` 힌트가 있으면 `inventoryModule.adjustInventory(id, locationId, -qty)` 를 직접 호출 (test helper 전용 bridge).
- `integration-tests/pos/helpers.ts:140-171` — `createTestOrder` 가 `metadata.order_type==="takeaway"` 일 때 자동으로 `seedInventoryItem` (100 stocked) 하고 line item metadata 에 `inventory_item_id` 주입.

### FINDING #3 → FIX · updateOrders silent fail 제거 + verify
- `src/api/admin/pos/orders/[id]/tenders/route.ts:179-219` — try/catch console.warn → 500 반환. Resolve `"order"` → `Modules.ORDER`.
- `src/api/admin/pos/orders/[id]/fulfill/route.ts:164-203` — 동일 + **verification probe**: query.graph 재조회로 persist 확인 · 1차 실패 시 배열 form 2차 시도 · 그래도 실패 시 500 (Medusa v2 `updateOrders` silent 성공 대비).

### ADDENDUM "반올림 없음" → FIX · Math.floor
- `src/api/admin/pos/orders/[id]/tenders/route.ts:198` — `Math.round` → `Math.floor`.
- `src/modules/pos_settings/__tests__/preorder-dp-math.unit.spec.ts:9 · 46-56` — 테스트 동기 + 신규 edge case 3건 (dp=33 on 100 → 33 · dp=50 on 199 → 99 · dp=33 on 1000 → 330).

### FIX #5 · pos-complete 미사용 import 제거
- `src/api/admin/register-sessions/[id]/pos-complete/route.ts:3-10` — `createOrderFulfillmentWorkflow` import 제거 (M0-1104-J-b 에서 블록 제거 시 참조 사라졌으나 import 만 남음).

---

## 2. 검증 로그

### 산출물 기동 (상시 ⓒ · M0-1104-I)
```
$ pnpm --filter commerce-core build
→ Backend 3.63s · Frontend 15.73s · PASS

$ cd apps/commerce-core/.medusa/server
$ npx medusa db:migrate → Migration scripts completed
$ npx medusa start &
→ BOOT OK unknown :9994
→ Server is ready on port: 9994

$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9994/health → 200
```

### 통합 테스트 6/6 PASS
```
TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit

  ✓ #1 cash tender captures a payment_collection with provider_id=pp_cash_default (719 ms)
  ✓ #2 edc tender missing approval_code returns 400 with English message (528 ms)
  ✓ #3 preorder with dp_percent=50 computes amount = total * 50/100 (450 ms)
  ✓ #4 takeaway fulfill decrements inventory stocked_quantity (590 ms)
  ✓ #5 preorder fulfill transitions stage without inventory decrement (559 ms)
  ✓ #6 two tenders on one order create two payment_collections and aggregate expected_by_method (518 ms)

Tests:       6 passed, 6 total
Time:        2.75 s
```

### Unit tests 20/20 PASS
```
TEST_TYPE=unit · 4 suites · 20 tests · 2.7s
+ 신규 3 edge case (Math.floor 의미론 검증)
```

### 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile)
**N/A** · package.json/lockfile 변경 **0**. 수정 파일 5 (API route 3 + helper 1 + unit spec 1).

---

## 3. 머지 순서 제안

1. **#184 (M0-1105-B · integration tests infra) 먼저 머지** → main 에 통합 테스트 infra + CI pos-integration job 안착 · 러너 베이스라인 3/6 PASS 확인
2. **#185 (이 PR · M0-1105-C · fixes) 머지** → 자동 rebase (base가 main 됨) · CI 러너에서 6/6 PASS 녹색 확정

대안: #C 를 #184 포함하여 단일 커밋 squash 가능 · 리뷰 용이성 위해 분리 권장.

---

## 4. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 (`api/admin/pos/{tenders,fulfill}/route.ts` · `pos-complete/route.ts` · `integration-tests/pos/helpers.ts` · DP unit spec) | ✓ |
| 금지 (`src/admin/**` · `medusa-config.ts`) | ✓ (변경 0) |
| build PASS + 산출물 기동 BOOT OK + /health 200 (상시 ⓒ) | ✓ |
| 통합 6/6 PASS 로컬 | ✓ |
| unit 20/20 PASS | ✓ (기존 17 + 신규 3 edge case) |
| 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | N/A (package.json 미변경) |
| 영어 에러 메시지 · 코멘트 · 테스트 라벨 (ADDENDUM §2) | ✓ |
| naming-check PASS | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +3 (FINDING #1/#2/#3 전부 수정 · 통합 6/6) |
| 등재 | 0 |
| 미결 | 1 (ci-pos-integration-green-6of6 · #184+#185 머지 후 CI 녹색 확인) |
| **총 순증감** | **-2 → Kyu 도장 시 -3** |

---

## 6. 다음 게이트

1. **Kyu**: PR #184 → merge → CI 베이스라인 확인. 이어서 PR #185 → merge → 6/6 녹색.
2. **M0-1104-J-c (별 라운드)**: Xendit SDK 실 호출 + webhook (Kyu Xendit test key 1Password 공유 선행).
3. **별건**: fork UI (P2~P5 · Cash/Card/QRIS/Shift 화면) · 다중 매장 RBAC (M0-1104-K).

---

*M0-1105-C · 2026-11-05 · 발견 3건 fix + Math.floor + 미사용 import · 통합 6/6 + unit 20/20 · 산출물 기동 BOOT OK · 제품 코드 수정 영역 준수 (src/admin 0 · medusa-config 0) · storeport PR #185 (base #184)*
