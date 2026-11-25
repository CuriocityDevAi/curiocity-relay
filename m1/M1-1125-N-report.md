PASS · 원인 C (서버가 CD snapshot에 최소 receipt만 저장 — full receipt 미반영)

---

## 원인 분리

### 결론: 원인 (C) — 서버 snapshot 필드 불완전

| 후보 | 판정 | 근거 |
|------|------|------|
| (A) Kyu iPad 앱이 옛 JS 번들 | **보조 가능성** | PR #427(2026-11-25 머지) EAS OTA 미배포 시 옛 코드 실행. 그러나 (C)가 먼저 해소돼야 의미 있음 |
| (B) #427 구현이 다른 화면에만 적용 | **해당 없음** | `app/index.tsx` LiveIndexRoute `screen === "receipt"` → `ReceiptScreen` 정상 연결. `receipt.tsx` 라우트도 동일. 구현 누락 없음 |
| (C) 서버 snapshot이 POS와 다른 필드 | **주원인 확정** | `order-snapshot-paid.ts` subscriber가 `markSnapshotPaidByOrder`를 최소 receipt로만 호출 (파일:줄 `subscribers/order-snapshot-paid.ts:90-100`). `mintSaleReceiptStep`의 `buildSnapshot` 출력은 `receipts` 테이블에만 저장되고 CD `OrderSnapshot.receipt`에 머지되지 않음 |

**상세 원인 추적:**

```
order-snapshot-paid.ts:90  → markSnapshotPaidByOrder({ receipt: { payment_method, earned, ... } })
                                └→ CD snapshot.receipt = { payment_method: "cash", earned: 0, ... }
                                   (store/items/tax/tenders/order_custom_display_id 없음)

mintSaleReceiptStep (mint-sale-receipt.ts:170)
  → receiptSvc.buildSnapshot(...)   // full receipt 생성
  → createReceiptForOrder(...)       // receipts 테이블 저장
  // 여기서 CD snapshot 업데이트 없음 ← 버그
```

`resolveReceiptView`(receipt-view.ts:86) 는 `snapshot.receipt.items`가 null이면 `snapshot.items`(legacy) 폴백. `snapshot.items[i].total`은 Medusa v2가 PB1 세금을 per-item에 반영할 경우 세금 포함 금액(33,000). `taxRatePct`는 `receipt.tax`가 null이면 `store.taxRate = 11`(DEFAULT_LIVE_STORE 폴백값) 사용.

---

## Kyu iPad 손님화면 앱 최신 JS 받는 방법

앱 설정: `eas.json` channel `production` / `runtimeVersion: { policy: "appVersion" }` / `version: "0.1.0"`.

**JS-only 변경(PR #427 + 이번 PR #437)이므로 새 native 빌드 불필요. EAS OTA로 충분:**

```bash
cd apps/customer-display
npx eas update --branch production --message "M1-1125-N receipt fix"
```

앱이 다음 실행 시 자동 다운로드. 즉시 적용하려면 iPad에서 앱 완전 종료 후 재시작.

---

## 수정 내용

### 1. `RegisterSessionModuleService.patchSnapshotReceiptByOrder`
파일: `apps/commerce-core/src/modules/register_session/service.ts` (추가 위치: 672~)

order_id로 최신 CD snapshot 조회 → 기존 receipt(payment_method/earned/new_balance 보존) + buildSnapshot 출력 spread 머지 → `updateOrderSnapshots`.

### 2. `mintSaleReceiptStep` CD snapshot 패치
파일: `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts`

`createReceiptForOrder` 직후 `patchSnapshotReceiptByOrder(order_id, snapshot)` 호출. 실패는 non-fatal(console.warn). REGISTER_SESSION_MODULE import 추가.

### 3. `line_total` pre-tax 수정
동일 파일 items 매핑:
```diff
- line_total: toNum(it.total ?? it.subtotal),
+ line_total:
+   toNum(it.subtotal) > 0
+     ? toNum(it.subtotal)
+     : toNum(it.unit_price) * Number(it.quantity ?? 0),
```
Medusa v2가 PB1을 per-item에 포함할 경우 `it.total`이 세금 포함(33,000)이 되어 POS 표시(단가×수량=30,000)와 어긋나는 버그 해소.

---

## 전후 렌더 비교

| 항목 | 수정 전 (CD, 실기 Order #190) | 수정 후 (CD = POS) |
|------|------------------------------|-------------------|
| **a. 품목 금액** | Coffee Latte Rp 33,000 (세금 포함) | Rp 30,000 (pre-tax) |
| | Iced Tea Rp 19,800 | Rp 18,000 |
| | 품목 합(52,800) ≠ Subtotal(48,000) | 품목 합(48,000) = Subtotal ✓ |
| **b. PB1 라벨** | 11% (DEFAULT_LIVE_STORE fallback) | 10% (receipt.tax.rate_pct) |
| **c. 매장 헤더** | 없음 | Soopsok Sweets / Pondok Indah Mall 3 LG / WA: 0813… |
| | 영수증 번호·날짜·캐셔 없음 | receipt.header에 R-… 포함 |
| **d. 하단 주문번호** | #190 (draft display_id) | PIM26B… (custom_display_id) |
| **Cash Received** | 없음 | Received 52,800 / Change 0 |

---

## 테스트 로그

**commerce-core 단위:**
```
PASS src/modules/register_session/__tests__/receipt-passthrough.unit.spec.ts
PASS src/workflows/pos-fulfill/__tests__/mint-sale-receipt-pb1.unit.spec.ts
Tests: 10 passed — 1.347s
```

새 케이스 (`receipt-passthrough.unit.spec.ts`):
- `M1-1125-N · patchSnapshotReceiptByOrder 머지 — Order #190: 품목 30,000·PB1 10%·PIM26B0190 ✓`

**customer-display 단위 (`receipt-view.test.ts`):**
```
Tests: 11 passed (신규 6 포함) — 195ms
```

신규 케이스:
- `a. 품목 줄 금액 = 세금 전 단가 (30,000 · 18,000) ✓`
- `b. PB1 라벨 = 실제 10% (not 11%) ✓`
- `c. 매장 헤더 — 이름·주소 노출 ✓`
- `d. 하단 주문번호 = custom_display_id (PIM26B…) ✓`
- `Cash tender — Received·거스름돈 노출 ✓`
- `전체 합계 = 52,800 ✓`

---

## PR 링크

https://github.com/CuriocityDevAi/storeport/pull/437

브랜치: `feat/M1-1125-N-cd-receipt-full-snapshot` → `main`  
커밋: `6f4fc8c`  
변경 파일 5개 · +239 −1
