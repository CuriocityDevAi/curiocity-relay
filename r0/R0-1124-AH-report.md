APPROVE

## PR #252 — fix(success-receipt): M3-1124-L + M3-1124-N 재리뷰

### 리뷰 결과: APPROVE

직전 R0-1124-AD 의 CHANGES 2건(지점 A·B) 모두 해소 확인.

---

### REQ 1 — 표시 우선순위 공용 헬퍼 통일

**판정: OK**

`lib/receipt-custom-id.ts` 신규 파일 (`resolveCustomDisplayId`) 확인:

```ts
export function resolveCustomDisplayId(receipt: Receipt): string | null {
  const snap = receipt.snapshot;
  return (
    receipt.custom_display_id ??
    snap.order_custom_display_id ??
    (snap.order_display_id != null ? String(snap.order_display_id) : null)
  );
}
```

우선순위 `receipt.custom_display_id → snapshot.order_custom_display_id → snapshot.order_display_id` 세 곳 적용:

| 경로 | 변경 | 상태 |
|---|---|---|
| `components/receipt/ReceiptCard.tsx` | `cid = resolveCustomDisplayId(receipt)` | ✓ |
| `lib/printer/receipt-escpos.ts` | `_cid = resolveCustomDisplayId(receipt)` | ✓ |
| `app/checkout/success/[orderId].tsx` print effect | `receipt.custom_display_id = customDisplayId ?? ...` → 하위 renderReceiptEscPos 가 resolveCustomDisplayId 경유 | ✓ |

성공 화면 경로 보완 확인:
- order 로드 성공 → `receipt.custom_display_id = order.custom_display_id` → `resolveCustomDisplayId` 반환 ✓
- order 타임아웃(3초) → `receipt.custom_display_id = null` → `resolveCustomDisplayId` 가 `snap.order_custom_display_id` fallback 적용 ✓ (R0-1124-AD 지점 A 해소)

ReceiptCard: 직접 `resolveCustomDisplayId` 사용으로 R0-1124-AD 지점 B 해소 ✓

`types/receipt.ts` 에 `ReceiptSnapshot.order_custom_display_id?: string | null` 타입 추가 확인 ✓

---

### REQ 2 — order 조회 멈춤 시 자동 출력 대기 상한 · 이중 출력 없음

**판정: OK**

**3초 타임아웃 (`orderLoadTimedOut`):**

```ts
React.useEffect(() => {
  if (!receiptQuery.data || !orderQuery.isLoading) return;
  const timer = setTimeout(() => setOrderLoadTimedOut(true), 3000);
  return () => clearTimeout(timer);
}, [receiptQuery.data, orderQuery.isLoading]);
```

- `receiptQuery.data` 도착 + `orderQuery.isLoading=true` 조건에서만 타이머 시작 ✓
- 3초 내 order 로드 완료 시 cleanup(`clearTimeout`) 으로 타이머 취소 ✓
- 3초 경과 시 `orderLoadTimedOut=true` → print effect 재실행 → snapshot 값으로 출력 진행 ✓

**이중 출력 방지:**

- `hasPrintedRef.current` 플래그 — print 로직 첫 줄에서 `true` 세팅, 이후 effect 재실행 차단 ✓
- print effect dependency: `[receiptQuery.data, orderQuery.isLoading, customDisplayId, orderLoadTimedOut]`
- guard: `if (orderQuery.isLoading && !orderLoadTimedOut) return;` — 타임아웃 전까지 대기, 이후 단 한 번만 통과 ✓

---

### REQ 3 — CI 전 잡

**판정: OK (로컬 확인 · CI 직접 접근 불가)**

- PR `mergeable_state: "clean"` ✓
- CI check runs: 403 (접근 불가 — R0-1124-AD 와 동일)
- 로컬 vitest: 45/45 pass (신규 10케이스 포함)
  - `resolveCustomDisplayId` 우선순위 5케이스 ✓
  - ESC/POS snapshot-only 3케이스 ✓
  - ReceiptCard 소스 검증 2케이스 ✓
- lint: 0 errors (warnings 6건 — 모두 pre-existing `setState-in-effect`, 내 변경 무관) ✓
- Playwright 스크린샷 (`M3-1124-L-success-pim-id.png`, `M3-1124-L-success-fallback-id.png`) 커밋 포함 ✓

---

### 총평

R0-1124-AD CHANGES 2건(지점 A·B) 모두 `lib/receipt-custom-id.ts` 단일 헬퍼로 해소. 우선순위 체인이 세 경로에서 일관 적용되고, 3초 타임아웃으로 order hang 시 무기한 출력 차단 문제도 해결됨. APPROVE.
