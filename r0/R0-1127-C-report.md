# R0-1127-C 리뷰 리포트

fork#283: CHANGES · 필수 1건 · 권고 1건 · CI ✅ all green (Lint/CI/Playwright 전체 · heavy-cloud 스킵)

---

## 직접 실행한 명령과 결과

### 1. git fetch origin
```
git fetch origin feat/M3-1127-C
```
결과: `FETCH_HEAD` = `e449c7cf6a82f6c381761cdad6bde5cdcfd2c14a` (PR head)

### 2. CI 코멘트 확인 (GitHub MCP pull_request_read get_comments)
```
mcp: get_comments PR#283
```
결과: ci-summary 코멘트 존재 · `e449c7c` · 2026-11-27 04:07 UTC
```
Lint/route ✅ 27s · Lint/lint ✅ 47s · CI/route ✅ 17s
CI/flow-tests ✅ 42s · CI/assertions ✅ 1m 11s · CI/unit-tests ✅ 48s
CI/heavy-cloud ⏭ · CI/playwright ✅ 6m 53s
```

### 3. Hand over 추적 — 직접 실행
```bash
git log -S "Hand over" --all -- "app/(tabs)/products.tsx" --oneline
```
결과: 커밋 1건만 (`7d747d1`, M3-1121-C). 내용은 JSX 주석:
```
Next customer 가 풀폭이므로 텍스트 줄바꿈 없이 Hand over 와 같은 높이 유지.
```
→ 버튼 컴포넌트 아님. 추가·삭제된 Hand over 버튼 없음.

```bash
git log -S "hand-over" --all --oneline   # e449c7c(이 PR), 05c4bac, 7d747d1 등 — 모두 success/orders 파일
git log -S "handOver" --all --oneline    # b50b1be, 7d747d1, ... — products.tsx 없음
```

판정: Sell 탭(products.tsx)에 Hand over 버튼이 구현된 적 없음. M3-1121-C 주석 오독으로 명세에 "일치" 오기재된 것이 사실임. 추적 문서(`docs/spec-guard/sell-hand-over-trace.md`)의 판정 정확.

**다른 컴포넌트가 Sell 탭에 Hand over를 그리는 경로 없음**: `git log -S "hand-over"` 에서 `products.tsx` 경유 커밋 0건. `hand-over` testID는 `components/payment/SuccessReceiptAnim.tsx:167` 과 `app/orders/[orderId].tsx:910` 에만 존재.

### 4. maxTodo 확인 — 직접 실행
```bash
git show FETCH_HEAD:scripts/spec-guard-map.json | python3 -c "import json,sys; d=json.load(sys.stdin); todos=[k for k,v in d.items() if isinstance(v,dict) and v.get('todo')]; print('maxTodo:', d.get('maxTodo')); print('todo items:', todos)"
```
결과:
```
maxTodo: 1
todo items: ['SELL-HAND-OVER']
```
→ 9→1 감소 확인. 잔여 todo SELL-HAND-OVER: 구현 없어 보존 테스트 추가 불가 — 타당.

### 5. products.tsx:262-264 실제 코드 확인 — 직접 실행
```bash
git show FETCH_HEAD:app/(tabs)/products.tsx | sed -n '255,275p'
```
결과: JSX 주석만 존재, Hand over 버튼 렌더 코드 없음 (확인).

### 6. ORDER-PHONE-ENTRY 조건부 렌더 확인 — 직접 실행
```bash
git show FETCH_HEAD:app/orders/[orderId].tsx | grep -n "PhoneEntry\|eligible"
```
결과:
```
22: import { PhoneEntryButton } from '@/components/customer-display/PhoneEntryButton';
962: <PhoneEntryButton orderId={order.id} variant="button" />
```
```bash
git show FETCH_HEAD:app/orders/[orderId].tsx | sed -n '955,975p'
```
결과: `{!isVoidedOrCanceled && !hasExistingCustomer && payState === 'paid' ? <PhoneEntryButton .../> : null}`

---

## todo 8건 SRC/렌더 분류표

| ID | 체크 파일 | 체크 방식 | 화면 소실 시 false-pass | 판정 |
|---|---|---|---|---|
| `CART-CHECKOUT-BTN` | CartPanel.tsx | SRC (testID + Checkout 문자열) | 낮음 | 허용 |
| `CART-ORDER-CHIP` | OrderChips.tsx + CartSheet.tsx + types.ts | SRC (testID + 사용 + 타입 + 부재) | 중간 | **권고** |
| `CHECKOUT-TITLE` | checkout/[draftOrderId].tsx | SRC (checkout-title testID) | 낮음 | 허용 |
| `TENDER-QRIS-TITLE` | tender-qris 화면 | SRC (title 프롭 텍스트) | 낮음(navigator title = SRC 적합) | 허용 |
| `SPLIT-TITLE` | split-tender 화면 | SRC (split-title testID + 텍스트) | 낮음 | 허용 |
| `ORDER-RECEIPT` | orders/[orderId].tsx | SRC (order-receipt-section testID) | 낮음 | 허용 |
| `ORDER-PHONE-ENTRY` | **PhoneEntryButton.tsx만** | SRC (component file testID 문자열) | **높음** — orders/[orderId].tsx 조건부 렌더 미검증 | **필수 수정** |
| `POS-SUCC-PHONEENTRY` | SuccessReceiptAnim.tsx + success 화면 | SRC **부재** 체크 | N/A — 부재엔 SRC 적합 | 허용 |

---

## 필수 수정 (1건)

**`scripts/spec-guard-pos-playwright.mjs:129-135`** (`ORDER-PHONE-ENTRY`)

현재:
```js
const phoneEntryBtnSrc = src('components/customer-display/PhoneEntryButton.tsx');
check('[ORDER-PHONE-ENTRY] order-phone-entry testID 존재',
  phoneEntryBtnSrc.includes("testID ?? 'order-phone-entry'") || ...);
```

문제: `orders/[orderId].tsx` 에서 `PhoneEntryButton` 이 제거되거나 조건이 항상 `false` 가 되어도 통과.
결정 근거: `decision-internal-testing-20261125` §4 "소스 문자열 테스트 금지" 취지 + spec-guard-20261126 §4 "보존 테스트".

최소 수정: `orderDetailSrc.includes('PhoneEntryButton')` 추가
권장 수정: Playwright 브라우저 블록 `eligible:true` mock → `order-phone-entry` visible assert

## 권고 (1건)

**`scripts/spec-guard-pos-playwright.mjs:137-148`** (`CART-ORDER-CHIP`)

`cartSheetSrc.includes('OrderChips')` 가 JSX 사용은 확인하나 브라우저 렌더 미확인. 권고: draft order 목 → cart sheet → `order-chips` testID visible.

---

## PR 코멘트

GitHub MCP `pull_request_review_write` → COMMENT (자기 PR REQUEST_CHANGES 불가 → COMMENT 대체)
코멘트 URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/283
라인 코멘트 2건 (`scripts/spec-guard-pos-playwright.mjs:129-135`, `137-148`)

---

## 판정 근거 요약

- Hand over 추적: git log 직접 실행 → products.tsx에 버튼 없음 확인 ✅
- CI: all green ✅
- maxTodo: 9→1 ✅
- 필수 수정 1건: ORDER-PHONE-ENTRY SRC false-pass (conditional render in orders/[orderId].tsx 미검증)
- 권고 1건: CART-ORDER-CHIP 렌더 확인 없음
- "없어야 함" 부재 확인(POS-SUCC-PHONEENTRY): SRC 적합 ✅
