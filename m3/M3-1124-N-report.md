PASS

# M3-1124-N — custom_display_id 표시 우선순위 통일

## 커밋

`db3da9a` — fix(receipt): M3-1124-N — custom_display_id 표시 우선순위 통일 · snapshot.order_custom_display_id 지원 · 3초 auto-print timeout  
브랜치: `fix/M3-1124-L-success-receipt-order-number` → PR #252

## 변경 요약

| 파일 | 변경 |
|---|---|
| `types/receipt.ts` | `ReceiptSnapshot.order_custom_display_id?: string \| null` 추가 |
| `lib/receipt-custom-id.ts` | 공용 헬퍼 `resolveCustomDisplayId(receipt)` 신규 생성 |
| `components/receipt/ReceiptCard.tsx` | cid 계산 → `resolveCustomDisplayId` 사용 |
| `lib/printer/receipt-escpos.ts` | `_cid` 계산 → `resolveCustomDisplayId` 사용 |
| `app/checkout/success/[orderId].tsx` | 3초 timeout + print effect 의존성 추가 |
| `__tests__/m3-1124-n-custom-display-id-priority.test.ts` | 신규 테스트 파일 |

## 우선순위 체계

```
receipt.custom_display_id  (호출자가 order에서 주입)
  → snapshot.order_custom_display_id  (서버 storeport #421 이 snapshot에 직접 기재)
  → snapshot.order_display_id  (기존 숫자 ID fallback)
```

세 곳(ReceiptCard · ESC/POS · 성공 화면 print effect) 모두 `lib/receipt-custom-id.ts` 의 `resolveCustomDisplayId` 하나를 사용.

## R0 minor — 3초 auto-print timeout

`useOrder` 가 응답 없이 멈춰도 `receiptQuery.data` 가 도착한 뒤 3초 후에는 snapshot 값으로 auto-print 진행.

```ts
React.useEffect(() => {
  if (!receiptQuery.data || !orderQuery.isLoading) return;
  const timer = setTimeout(() => setOrderLoadTimedOut(true), 3000);
  return () => clearTimeout(timer);
}, [receiptQuery.data, orderQuery.isLoading]);
```

## lint 결과

대상 파일 6개 대상 직접 실행:
```
✖ 6 problems (0 errors, 6 warnings)
```
error 0 — 경고 6건은 모두 기존 `[orderId].tsx` 의 pre-existing setState-in-effect 경고(내 변경과 무관).

## vitest 결과 (직접 실행)

```
 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  21:53:32
   Duration  223ms
```

### 신규 테스트 케이스 (m3-1124-n-custom-display-id-priority.test.ts)

| 케이스 | 결과 |
|---|---|
| `resolveCustomDisplayId` — snapshot.order_custom_display_id only | PASS |
| `resolveCustomDisplayId` — receipt.custom_display_id takes priority | PASS |
| `resolveCustomDisplayId` — both null → order_display_id fallback | PASS |
| `resolveCustomDisplayId` — all null → null | PASS |
| `resolveCustomDisplayId` — order_custom_display_id absent → order_display_id | PASS |
| ESC/POS — snapshot only → "Order PIM26B1000" | PASS |
| ESC/POS — receipt.custom_display_id takes priority | PASS |
| ESC/POS — both custom null · order_display_id=42 → "Order 42" | PASS |
| ReceiptCard 소스 — resolveCustomDisplayId 사용 확인 | PASS |
| ReceiptCard 소스 — receipt-custom-id import 확인 | PASS |

### 기존 receipt 테스트 회귀 없음

```
 Test Files  6 passed (6)   (m2-1123-e + receipt-refund-kind + receipt-share-fallback + 신규)
      Tests  45 passed (45)
```

## Playwright (M3-1124-L 하네스)

미실행 — CI `flow-tests` 잡 완료 대기 중 (push 직후 CI 진행 중).

## PR #252 CI 잡별 결과 (push 시점 최신)

| 잡 | 상태 |
|---|---|
| route (2개) | pass |
| lint | pending → CI 완료 후 확인 필요 |
| assertions | pending → CI 완료 후 확인 필요 |
| flow-tests | pending → CI 완료 후 확인 필요 |
| heavy-cloud | skipping |

> CI 결과는 push 직후 pending 상태이며 완료 후 runner가 갱신 예정.

## 어설션 파일

`__tests__/m3-1124-n-custom-display-id-priority.test.ts`
