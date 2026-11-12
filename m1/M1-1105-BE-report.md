# M1-1105-BE 리포트 — 앱→서버 결제 흐름 자동 테스트 1차

**작성**: 2026-11-12  
**브랜치**: `test/m1-1105-be-flow-e2e`  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/105  

---

## 대사표 — 현재 앱 테스트 체계

| 체계 | 상태 |
|------|------|
| vitest (Node 환경) | ✅ 기존 3개 파일 (`__tests__/`) |
| `scripts/run-all.mjs assertions` | ✅ CI assertions 잡 |
| `scripts/run-all.mjs playwright` | ✅ CI playwright 잡 (Expo 웹 export 필요) |
| Maestro (iOS 시뮬레이터) | ✅ 로컬 전용 (`sim:test:*`) |
| **앱 컴포넌트 E2E** | ❌ 없음 (R0 리포트 "앱 컴포넌트 E2E 없음" 확인) |
| **흐름 계약 테스트** | ❌ 없음 → **이번에 추가** |

### 오늘 버그 5개 — 어느 층에서 잡을 수 있었나

| 버그 | 요청 body 계약 | 화면 계산 | 서버 | 이번 테스트 |
|------|--------------|---------|------|------------|
| 나눠 결제 2차 `split:true` 누락 | ✅ 잡힘 | — | 서버는 통과(별도 주문 처리) | `split-tender-contract` |
| variant 재고 189 합산 | — | ✅ 잡힘 | — | `screen-calcs` |
| Void `restock:true` 누락 → reserved +1 | ✅ 잡힘 | — | 서버는 통과 | `void-restock-contract` |
| `pos_totals` SC 금액 환불 누락 | — | ✅ 잡힘 | — | `screen-calcs` |
| Void 토스트 미표시 | 간접(receipt_id 계약) | — | — | `void-restock-contract` |

---

## REQ 1 — 흐름 계약 테스트

### `tests/flows/split-tender-contract.test.ts`

**검증 대상**: 나눠 결제 2차 `split:true` 누락 버그 (fix: commit `0218c5d`, PR #99)

**수정 전 코드 (commit `5f2c752`)** — 직접 checkout하여 확인:
```ts
// onProcessSecond (2차 현금) — split:true 없음
const tender = await createTender.mutateAsync({
  order_id: draftOrderId,
  provider_id: PROVIDER_CASH,
  input: { received_amount: receivedAmount ?? remaining },
  amount: remaining,
  ...commonExtras,  // split:true 없음
});

// onConfirmSecondCard (2차 카드) — 동일하게 split:true 없음
```

**수정 후 코드 (현재)** — `buildSplitBody` 헬퍼로 4조합 모두 `split: true as const` 고정.

| 테스트 | 수정 전 | 수정 후 |
|--------|---------|---------|
| `it.fails` OLD 2차 현금 split:true 없음 | FAIL (expected) ✓ | — |
| `it.fails` OLD 2차 카드 split:true 없음 | FAIL (expected) ✓ | — |
| 1차 현금 split:true | — | PASS ✓ |
| 1차 카드 split:true | — | PASS ✓ |
| 2차 현금 split:true + amount=remaining | — | PASS ✓ |
| 2차 카드 split:true (1차 현금 후 remaining=70000) | — | PASS ✓ |
| 1차 응답 is_complete=false · receipt_id=null | — | PASS ✓ |
| 2차 응답 remaining=0 · is_complete=true · receipt_id non-null | — | PASS ✓ |

### `tests/flows/void-restock-contract.test.ts`

**검증 대상**: Void `restock:true` 누락 + 토스트 미표시 (fix: commit `381691d`, PR #98)

| 테스트 | 수정 전 | 수정 후 |
|--------|---------|---------|
| `it.fails` OLD void cash body restock:true 없음 | FAIL (expected) ✓ | — |
| `it.fails` OLD void card body restock:true 없음 | FAIL (expected) ✓ | — |
| buildRefundBody cash restock:true | — | PASS ✓ |
| buildRefundBody card_terminal restock:true | — | PASS ✓ |
| buildMixedRefundBody restock:true | — | PASS ✓ |
| fixture request body restock:true | — | PASS ✓ |
| void 성공 ok=true · receipt_id non-null (토스트 조건) | — | PASS ✓ |
| voided 주문 exposure → kind:voided | — | PASS ✓ |

### `tests/flows/return-items-contract.test.ts`

| 테스트 | 결과 |
|--------|------|
| return body items 배열 + method 필수 | PASS ✓ |
| 복수 품목 반품 body | PASS ✓ |
| card_terminal: terminal_approval_code 필수 | PASS ✓ |
| fixture 400: quantity exceeds purchased 메시지 | PASS ✓ |
| split 반품 refund_distribution CASH 먼저 (S3) | PASS ✓ |
| remaining_refundable = total_captured - total_refunded | PASS ✓ |
| partial_returns failed_tenders 기록 | PASS ✓ |

---

## REQ 2 — 화면 계산 테스트

### `tests/flows/screen-calcs.test.ts`

**A. 재고 — variant 합산 금지 (189 버그)**

| 테스트 | 수정 전 | 수정 후 |
|--------|---------|---------|
| `it.fails` OLD computeInventoryStatus([A=120, B=69]) → 69 기대 (실제 189) | FAIL (expected) ✓ | — |
| computeInventoryStatus([selectedVariant=69]) → 69 | — | PASS ✓ |
| available_quantity 우선 · inventory_quantity 대체 | — | PASS ✓ |
| managed variant 없으면 unknown | — | PASS ✓ |
| available_quantity=0 → sold-out | — | PASS ✓ |

**B. 주문 Total / Outstanding — SC 포함 (pos_totals)**

| 테스트 | 수정 전 | 수정 후 |
|--------|---------|---------|
| `it.fails` OLD pos_totals 무시 → 180000 ≠ 198000 | FAIL (expected) ✓ | — |
| pos_totals 없으면 order.total | — | PASS ✓ |
| pos_totals.grand_total 있으면 그것 사용 (SC/PB1 포함) | — | PASS ✓ |
| outstanding = grandTotal - paidTotal (정상) | — | PASS ✓ |
| fixture outstanding 계산 (60000) | — | PASS ✓ |

**C. Payments 표 — Sale/Void/Refund 행**

| 테스트 | 결과 |
|--------|------|
| 현금 판매: type=sale · status=captured | PASS ✓ |
| 부분 환불: type=refund · status=refunded · amount 음수 | PASS ✓ |
| metadata.void → void 행 합성 | PASS ✓ |
| refunds[].note=void → type=void 행 | PASS ✓ |
| fixture Sale Paid + Void Refunded 행 | PASS ✓ |

---

## 실행 명령 · 시간

```bash
npm run test:flows
# → 4 test files · 46 passed | 6 expected fail · ~200ms
```

---

## PR 번호

**PR #105** — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/105

---

## REQ 5 — 2차 제안 (Playwright E2E)

### 필요한 것

| 항목 | 비용 |
|------|------|
| Expo 웹 export (`npx expo export -p web`) | ~5–8분 |
| Playwright 브라우저 설치 (`playwright-chromium`) | ~1분 (캐시 후 무료) |
| 테스트 작성: checkout → split-tender flow | 2–4시간 |
| CI 추가 시간 | +10–15분/PR |

### 구체 흐름 (다음 라운드)

1. `page.goto('/checkout/[draftOrderId]')` → Split 버튼 클릭
2. Step 1: 금액 입력 → 1차 결제 → 서버 mock 응답 `is_complete:false`
3. Step 2: 2차 결제 → `split:true` body 검증 (network intercept)
4. 완료 → success 화면 · receipt_id 표시 확인

현재 CI에 playwright 잡이 이미 있으나 앱 컴포넌트 흐름 테스트 없음. Expo 웹 환경에서 실행 가능하나 React Native 전용 컴포넌트(카메라 등)는 별도 모킹 필요.

---

## `git ls-tree`

```
100644 blob 516f4c09  tests/flows/return-items-contract.test.ts
100644 blob 7bbc906b  tests/flows/screen-calcs.test.ts
100644 blob c5060fba  tests/flows/split-tender-contract.test.ts
100644 blob e0a2dfc3  tests/flows/void-restock-contract.test.ts
```

---

## 이연 순증감

| | |
|--|--|
| 새 테스트 | +4 파일 (52개 테스트) |
| 수정 파일 | package.json · vitest.config.ts · .github/workflows/ci.yml |
| 앱 소스 변경 | 없음 |
| 이연 항목 | Playwright E2E (REQ 5 — 다음 라운드) |
