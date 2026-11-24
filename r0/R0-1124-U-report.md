APPROVE

## PR #250 · M2-1124-N custom_display_id 표시 · 재리뷰 결과

### 판정: APPROVE

---

## R0-1124-P CHANGES 해소 확인

### 1. `m2-1124-n-order-number-display-playwright.mjs` URL 체크 수정

| 항목 | 결과 |
|------|------|
| check(1) 정규식 `/products|sell/.test(page.url())` 반영 | ✅ |
| (3a) `order-row_ord_custom_id_1` row 노출 어설션 유지 | ✅ |
| (5a) `order-detail-custom-id` 노출 어설션 유지 | ✅ |
| (5b) 헤더 텍스트 `"PIM26B1000"` 체크 유지 | ✅ |
| (6a) `receipt-custom-id` 노출 어설션 유지 | ✅ |
| (6b) ReceiptCard 하단 텍스트 `"Order PIM26B1000"` 체크 유지 | ✅ |
| (7a·7b) pageerror·console.error 0 체크 유지 | ✅ |
| 로컬 검증 9/9 passed | ✅ |

**판단**: 기능 어설션 약화 없음. URL 체크만 `sell|products` 허용으로 수정, 나머지 7개 체크 모두 원형 유지.

---

### 2. `m3-1124-c-receipt-scroll-playwright.mjs` 하네스 전환

**원인 제거**: `spawnSync+playwright.config → @playwright/test@1.65.0` 방식에서 `_harness.mjs` 직접 사용으로 완전 전환.
CI `playwright-chromium@1.64.1` 버전 불일치로 발생하던 webServer 시작 실패 경로 소멸.

| 어설션 항목 | 원본 spec 대응 | 결과 |
|-------------|----------------|------|
| `payment-success` 보임 | ✅ 유지 | ✅ |
| `next-customer-footer` 보임 | ✅ 유지 | ✅ |
| footer `y ≥ viewport.height - 160` bounding box | ✅ 유지 | ✅ |
| `Item #15 scroll-bottom-marker` count=1 + 스크롤 후 보임 | ✅ 유지 | ✅ |
| `reprint` 보임 + `bottom ≤ viewport` | ✅ 유지 | ✅ |
| Split: slip-btn-1·slip-panel-1 열림 | ✅ 유지 | ✅ |
| Split: Item #15·reprint·footer 스크롤 체크 | ✅ 유지 | ✅ |

스펙 커버리지: 원본 12 케이스(3뷰포트 × 4시나리오) → 117 어설션(10 assertion × 12 시나리오). 질적 약화 없음, 오히려 bounding-box 세부 체크가 추가됨.
로컬 검증 117/117 passed.

---

## CI 상태

M3-1124-H 리포트 (CI run #45364661074) 기준:
- assertions: **pass** 1m12s
- flow-tests: **pass** 41s
- playwright: **pass** 5m28s
- lint: **pass** 1m5s
- route: **pass** (×2)

PR `mergeable_state: clean` 확인.

---

## 기능 diff 확인 (회귀 없음)

| 파일 | 변경 | 판단 |
|------|------|------|
| `api/hooks/orders.ts` | fields에 `+custom_display_id` 추가 | ✅ |
| `app/orders/[orderId].tsx` | 헤더에 `order-detail-custom-id` + ReceiptCard에 주입 | ✅ |
| `components/receipt/ReceiptCard.tsx` | 하단 `receipt-custom-id` 블록 | ✅ |
| `lib/pos-order-adapter.ts` | `PosOrderRow.custom_display_id?` 타입 추가 | ✅ |
| `lib/printer/receipt-escpos.ts` | footer 아래·cut 전 `Order ${cid}` 출력 | ✅ |
| `types/receipt.ts` | `Receipt.custom_display_id?` 타입 추가 | ✅ |

---

R0-1124-P 지적 2건 모두 해소, CI 초록, 기능 어설션 약화 없음 → APPROVE.
