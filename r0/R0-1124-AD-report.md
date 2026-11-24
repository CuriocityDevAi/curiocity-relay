CHANGES

## PR #252 — fix(success-receipt): M3-1124-L 결제 성공 화면 custom_display_id 주입

### 리뷰 결과: CHANGES (2건)

---

### REQ 1 — print effect 로딩 대기·이중 출력·실패 fallback

**판정: OK**

`orderQuery.isLoading` 가드 패턴이 올바르게 구현됨.

- **이중 출력 방지** `hasPrintedRef.current` 플래그 + effect dependency `[receiptQuery.data, orderQuery.isLoading, customDisplayId]` 조합으로 single-fire 보장 OK
- **order 실패 fallback** React Query에서 에러 발생 시 `isLoading=false`로 전환 → effect 재실행 → `customDisplayId=null` → `receiptQuery.data.custom_display_id ?? snap.order_display_id` fallback 작동 OK
- **E2E 커버** PIM ID 표시 + fallback(Order 42) 2 케이스 모두 `M3-1124-L-success-custom-id.spec.ts`로 커버 OK

**Minor note (non-blocking)**: 네트워크 완전 hang 시 React Query 기본 timeout 없음 → `isLoading=true` 무기한 유지 → print 블록 가능. 실운영 조건에서 minor로 판단. 추후 `networkMode` 또는 fetch timeout 설정 고려 권장.

---

### REQ 2 — `snap.order_custom_display_id` fallback 누락 → CHANGES 요청

**판정: CHANGES (2지점)**

storeport PR #421이 snapshot에 `order_custom_display_id` 키를 추가하면 현재 체인에서 해당 값이 무시됨.

#### 지점 A — `app/checkout/success/[orderId].tsx` print effect (line 149)

```ts
// 현재
custom_display_id: customDisplayId ?? receiptQuery.data.custom_display_id,

// 보완
custom_display_id:
  customDisplayId ??
  receiptQuery.data.custom_display_id ??
  (receiptQuery.data.snapshot as { order_custom_display_id?: string | null })
    ?.order_custom_display_id,
```

`useOrder` 실패 시에도 snapshot에 PIM ID가 있으면 프린트에 반영됨.

#### 지점 B — `components/receipt/ReceiptCard.tsx` cid 계산 (이 PR 미변경 → 별도 커밋)

```ts
// 현재
const cid = receipt.custom_display_id ??
            (snap.order_display_id != null ? String(snap.order_display_id) : null);

// 보완
const cid =
  receipt.custom_display_id ??
  snap.order_custom_display_id ??
  (snap.order_display_id != null ? String(snap.order_display_id) : null);
```

`useOrder` 실패 시에도 snapshot 기반 렌더링에서 PIM ID 표시 가능.

GitHub 리뷰: COMMENT(자기 PR — REQUEST_CHANGES API 불가) with 인라인 코멘트 on line 149.

---

### REQ 3 — CI 전 잡

GitHub API check runs 403(접근 불가). PR `mergeable_state: "clean"` 확인 — conflict 없음. E2E 스크린샷 파일(`M3-1124-L-success-pim-id.png`, `M3-1124-L-success-fallback-id.png`)이 커밋에 포함되어 있어 로컬 실행 완료는 확인됨. CI 워크플로 결과는 직접 확인 불가.

---

### 총평

핵심 로직(`useOrder` 주입 + `isLoading` 가드 + `hasPrintedRef`)은 견고하고 E2E 커버리지도 충분함. CHANGES 요청 2건은 PR #421 대비 `snap.order_custom_display_id` fallback 누락으로 작은 보완임. 수정 후 APPROVE 가능.
