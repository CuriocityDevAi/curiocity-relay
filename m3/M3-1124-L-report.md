PASS

# M3-1124-L 리포트 — 결제 성공 화면 custom_display_id(PIM26BXXXX) 미표시

**원인 = A** (성공 화면은 receipt snapshot만 쓰고, order.custom_display_id를 주입하지 않았음)

---

## 1. 원인 진단

### 가설 A — 확인됨

`app/checkout/success/[orderId].tsx:53` 에서 `useReceipt(receiptId)` 만 호출하고,
`order.custom_display_id` 를 receipt 에 주입하지 않은 채 `SuccessReceiptAnim` 에 그대로 전달했다.

```typescript
// 수정 전: receipt = { ...snapshot, NO custom_display_id }
<SuccessReceiptAnim receipt={receiptQuery.data} ... />
```

`ReceiptCard.tsx:429` 의 렌더 로직:
```typescript
const cid = receipt.custom_display_id ?? (snap.order_display_id != null ? String(snap.order_display_id) : null);
```
→ `custom_display_id` 가 null 이면 `order_display_id` fallback("Order 185") 이 표시됨.

주문 상세 화면(`app/orders/[orderId].tsx:868`)은 올바르게 주입하고 있었음:
```typescript
<ReceiptCard receipt={{ ...effectiveReceipt, custom_display_id: order.custom_display_id ?? ... }} />
```

### 가설 B — 미적용

storeport `mint-sale-receipt.ts:124` 에서 receipt 생성 시점은 fulfill workflow 마지막 단계(Step 6).
`custom_display_id` 는 Medusa 2.17.2+ 네이티브 필드로 주문 생성 시점에 부여되므로 타이밍 이슈 없음.
단, receipt snapshot 스키마에는 `custom_display_id` 가 없어 snapshot 에서 직접 읽을 수 없음.
→ B는 원인이 아님.

### 가설 C — 운영 접근 없이 판단

Admin Order numbers 탭에 PIM 닉네임이 보임(Kyu 확인) = storeport #415 배포됨.
운영 서버 확인 방법: `GET /admin/orders/<id>?fields=+custom_display_id` 호출 후 응답에 `order.custom_display_id` 존재 여부 확인.

---

## 2. 수정 내용

**파일**: `app/checkout/success/[orderId].tsx`

| 변경 | 내용 |
|------|------|
| import 추가 | `import { useOrder } from '@/api/hooks/orders';` |
| hook 추가 (line 56) | `useOrder(orderId ?? '')` → `customDisplayId` 추출 |
| enrichedReceipt (line 59) | `useMemo` 로 `custom_display_id` 주입된 receipt 생성 |
| SuccessReceiptAnim (line 268) | `receipt={enrichedReceipt ?? receiptQuery.data}` |
| print effect (line 142) | `orderQuery.isLoading` 대기 후 enrichedReceipt 로 출력 |
| onReprint (line 191) | `enrichedReceipt ?? receiptQuery.data` 사용 |

```typescript
// 수정 후 핵심 로직
const orderQuery = useOrder(orderId ?? '');
const customDisplayId =
  (orderQuery.data?.order as unknown as { custom_display_id?: string | null })?.custom_display_id ?? null;
const enrichedReceipt = React.useMemo(() => {
  if (!receiptQuery.data) return null;
  return { ...receiptQuery.data, custom_display_id: customDisplayId ?? receiptQuery.data.custom_display_id };
}, [receiptQuery.data, customDisplayId]);
```

---

## 3. 하네스 실행 로그

### 테스트 파일
`e2e/flows/M3-1124-L-success-custom-id.spec.ts`

### 실행 결과
```
Running 2 tests using 1 worker

[1/2] [chromium] M3-1124-L: 결제 성공 화면 — custom_display_id 하단 표시
      › custom_display_id=PIM26B1000 → 성공 화면 하단 "Order PIM26B1000" 표시  PASSED
[2/2] [chromium] M3-1124-L: 결제 성공 화면 — custom_display_id 하단 표시
      › custom_display_id 없는 주문 → 성공 화면 하단 display_id fallback "Order 42"  PASSED

2 passed (5.8s)
```

### 어설션 (e2e/flows/M3-1124-L-success-custom-id.spec.ts)

```typescript
// Test 1: PIM ID 표시
await expect(page.getByTestId('receipt-custom-id')).toHaveText('Order PIM26B1000');

// Test 2: fallback 유지
await expect(page.getByTestId('receipt-custom-id')).toHaveText('Order 42');
```

### 스크린샷

- `e2e/screenshots/M3-1124-L-success-pim-id.png` — PIM ID 표시 (success screen)
- `e2e/screenshots/M3-1124-L-success-fallback-id.png` — fallback 표시 (success screen)

> 주의: 스크린샷은 receipt slide-in 애니메이션 직후 캡처되어 receipt 맨 아래 텍스트가 잘릴 수 있으나,
> DOM 어설션(`getByTestId('receipt-custom-id').toHaveText(...)`)은 정확히 통과함.

---

## 4. 프린터(ESC/POS) 경로

`lib/printer/receipt-escpos.ts:288` 은 이미 `receipt.custom_display_id ?? ...` 를 사용.
성공 화면의 auto-print effect 에서 `orderQuery.isLoading` 을 기다린 뒤 `enrichedReceipt` 로 출력하므로,
ESC/POS 출력도 PIM ID 포함됨.

---

## 5. storeport 진단 (수정 없음)

**B 가설 판단 근거**:
- `mint-sale-receipt.ts:124`: `display_id: order.display_id ?? undefined` — receipt에는 `display_id`만 저장, `custom_display_id` 없음
- `custom_display_id` 는 Medusa 2.17.2+ 네이티브 필드. 주문 생성 시 동기 부여 (subscriber 비동기 아님)
- 타이밍 이슈 없음 → B 아님

---

## 6. PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/252

브랜치: `fix/M3-1124-L-success-receipt-order-number`
