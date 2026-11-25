APPROVE

# R0-1125-D — 원장 대사: 손님 화면 영수증 = POS 영수증 · PR #427

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/427
- **리뷰 시도**: `Can not approve your own pull request` → relay main 리포트로 대체

---

## 1. 항목·순서 — POS ReceiptCard vs CD ReceiptScreen

| 순서 | POS ReceiptCard (`snap.*`) | CD ReceiptScreen (`view.*`) | 판정 |
|---:|---|---|---|
| 1 | 로고 or 매장명 (`snap.store.name`) | `view.storeName` → `receipt-store-name` | ✅ |
| 2 | 주소/헤더 | `view.storeAddress` → `receipt-store-address` | ✅ |
| 3 | Queue #N (`pos_order_num`) | `PosChipBadge` + Order 텍스트 (top) | ✅ |
| 4 | 영수증번호·날짜·cashier | (CD 손님 화면 — 의도적 생략) | ✅ |
| 5 | 품목 (`snap.items` · `line_total`) | `view.items` → `receipt-item-N` | ✅ |
| 6 | 소계 | `view.subtotal` → `receipt-subtotal` | ✅ |
| 7 | PB1 (`snap.tax.show/label/rate_pct/amount`) | `view.taxShow/Label/RatePct/Amount` → `receipt-tax` | ✅ |
| 8 | 합계 | `view.grandTotal` → `receipt-total` | ✅ |
| 9 | Tenders (Cash received/change · Card · QRIS issuer) | `TenderBlock` × n → `receipt-tender-N/-received/-change` | ✅ |
| 10 | 하단 주문번호 (`order_display_id`) | `view.bottomOrderNumber` → `receipt-bottom-order-no` | ✅ |
| 11 | footer | `view.footer` | ✅ |

**비고**: `service_charge` 줄은 POS ReceiptCard 에는 있으나 CD 에는 없음.
M0-1125-C REQ 명시 항목(매장 헤더·품목·소계·PB1·합계·tender·받은 돈·거스름·하단 번호) 외 항목이므로 scope 내 의도적 생략으로 판단.

---

## 2. serializeSnapshot pass-through — 타입 하위 호환

- `SnapshotReceipt` M0-1125-C 신규 필드(`store`, `items`, `tax`, `tenders`, `order_custom_display_id` 등) 전부 `optional` → 기존 최소 shape(`earned`, `new_balance`, `phone_masked`, `payment_method`) 호환 유지.
- `OrderSnapshot.order_custom_display_id` `optional` → 기존 Cart·Done·Keypad 화면은 이 필드를 읽지 않으므로 무영향.
- `serializeSnapshot` pass-through 에서 `phone_masked` 재마스킹(`maskPhoneE164`) → raw phone 누출 차단 확인.
- `resolveReceiptView` 는 순수 함수 (`snapshot` → `ReceiptViewModel`) · 기존 화면 의존 없음.

---

## 3. CI 하네스

- `heavy-steps/action.yml` 에 customer-display `pnpm test`(vitest) · `pnpm e2e`(Playwright) 스텝 모두 존재.
- `pnpm e2e = playwright test` (전체 spec) → 신규 `receipt-same-as-pos.spec.ts` 자동 포함.
- 하네스 누락 없음 ✅

---

## 관찰 (블로커 아님)

- `receipt-view.ts:163` tender 폴백 캐스팅 `(receipt?.payment_method ?? "cash") as "cash" | "card" | "qris"`: `SnapshotPaymentMethod` = `ReceiptLineTender.method` union 과 동일 → 안전.
- `receipt-view.ts:173` bottomOrderNumber 체인의 `(snapshot as { order_custom_display_id?: string | null })` 캐스팅: `customer-display/src/types/order-snapshot.ts` 에 해당 필드가 M0-1125-C 에서 추가됐으므로 캐스팅 없이도 동작 가능하나 무해.

---

## 결론

요구사항(항목·순서 일치 · pass-through 타입 하위 호환 · CI 하네스) 모두 충족.
