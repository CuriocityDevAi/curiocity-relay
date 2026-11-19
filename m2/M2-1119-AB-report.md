# M2-1119-AB 작업 리포트

fork #207 QRIS Ref·Time 서버값 O · Slip2 텍스트 일치 O · fork #208 paid emit order_id O · hook 테스트 O · lint 0

---

## fork #207 — fix/M2-1119-S-pos-slip-nextcustomer

### 커밋 SHA
`c1131bf` — `fix(slip): M2-1119-AB #207 — QRIS paid 후 Ref·Time 서버값으로 갱신 · null 고정 제거`

### 변경한 파일

| 파일 | 변경 내용 |
|------|-----------|
| `api/hooks/pos-qris.ts` | `QrisStatusResponse` 에 `qris_receipt_id?: string \| null`, `reference_no?: string \| null` 추가 |
| `lib/split-qris-state.ts` | `SplitQrisSecondPayload` 에 `qris_receipt_id?`, `reference_no?` 추가 |
| `app/checkout/tender-qris/[draftOrderId].tsx` | `navigateToSuccess` 파라미터 2개 추가, `checkStatus` 에서 `res.qris_receipt_id` · `res.reference_no` 전달 |
| `app/checkout/split-tender/[draftOrderId].tsx` | `secondQrisReceiptId` · `secondQrisReferenceNo` 상태 추가, `consumeSplitQrisSecondDone` 에서 채움, `secondSlipData` null 고정 제거 |
| `fixtures/m1-1117-e.qris-status-2nd-paid.json` | `qris_receipt_id: "qri_split_e2e_02"` 추가 |
| `__tests__/m2-1119-s-pos-slip-fixes.test.ts` | REQ AB 테스트 6건 추가 (SplitQrisSecondPayload 필드 · source 패턴 · buildSlipData 반영) |

### 테스트 결과
- vitest: **42/42 passed** (신규 6건 포함, 기존 36건 유지)
- tsc 에러: **14개 (기존 동일 · 신규 없음)**
- lint: **0 errors**

---

## fork #208 — fix/M3-1119-O-cd-emit

### 커밋 SHA
`8b66d46` — `fix(emit): M2-1119-AB #208 — paid hint 에 order_id 넣기 · autoEmit hint.order_id 우선`

### 선행 작업
- `git merge fix/M2-1119-S-pos-slip-nextcustomer` 로 #207 최신 커밋 반영

### 변경한 파일

| 파일 | 변경 내용 |
|------|-----------|
| `hooks/usePosScreenAutoEmit.ts` | `Hint` 타입에 `order_id?: string \| null` 추가, `usePosScreenAutoEmit` 에서 `hint.order_id` 우선 사용 로직, dep array 에 `hint?.order_id` 추가 |
| `app/checkout/success/[orderId].tsx` | `setPosScreenHint({ pos_screen: 'paid', freezeCart: true, order_id: orderId })` 로 변경, `revertDisplayToPaid` 동일, `useEffect` dep 에 `orderId` 추가 |
| `__tests__/m3-1119-o-cd-emit.test.ts` | 신규 테스트 11건 (Hint 타입 · autoEmit 로직 · success 화면 · 전체 흐름 시뮬) |

### 핵심 버그 수정 메커니즘
- 문제: `useCreateTender.onSuccess` 에서 `DRAFT_ORDER_ID_STORAGE_KEY` 삭제 → `useCurrentDraftOrder` 가 null 반환 → `usePosScreenAutoEmit` 의 `orderId = null` → CD 가 올바른 주문으로 이동 불가
- 수정: `Hint` 에 `order_id` 를 직접 담아 전달, `autoEmit` 에서 `hint.order_id` 우선 사용

### 테스트 결과
- vitest: **831 passed** (신규 11건 포함 · pre-existing `docs/plans/splitview-capture.spec.ts` 1건만 fail)
- tsc 에러: **12개 (pre-existing 전부 · 신규 없음)**
- lint: **0 errors**

---

## push 결과
- `fix/M2-1119-S-pos-slip-nextcustomer` → `4dae9df..c1131bf`
- `fix/M3-1119-O-cd-emit` → `217b695..8b66d46`
