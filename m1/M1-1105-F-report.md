---
round: M1-1105-F
pr:
  fork: agilo-medusa-pos-fork#30
base_pr: null
outcome: cart-checkout-thumbnail-fields-added · draft-order fields 4곳 (184·190·214·661) 에 `+items.thumbnail,+items.product.thumbnail,+items.product.images.*` 추가 · 로직 변경 0 · 하네스 11/11 PASS
kyu_checks: 1 (아이패드 cart → checkout 사진 렌더 · 승인 전)
harness: scripts/m1-1105-d-diagnosis.mjs (상시 ⓐ 등재 · cart→checkout 단계)
---

# M1-1105-F · Cart/Checkout 썸네일 fields 복구

**일자**: 2026-11-06 · **허브**: M1 · **대상**: `api/hooks/draft-orders.tsx` + 신규 `scripts/m1-1105-d-diagnosis.mjs`.

**base**: master `21eb6f3` (M3-1105-B 머지 직후). `app/**` · `components/**` 미건드림 (M3-1105-D 충돌 방지).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | draft-order fields 4곳 (184·190·214·661) 에 썸네일 선택 3건 추가 | ✓ |
| 2 | 로직 변경 0 · 호출부 변경 0 | ✓ |
| 3 | `scripts/m1-1105-d-diagnosis.mjs` 상시 하네스 등재 | ✓ (신규) |
| 4 | 어설션 3건 (렌더 체인 · fields 포함 · Confirm disabled 회귀 가드) | ✓ (11/11 PASS) |
| 5 | 금지 (`app/**` · `components/**`) 변경 0 | ✓ |

---

## 1. 뿌리 (M1-1105-D §3-② 재인용)

Kyu 11-06 실기 ✗ · 아이패드에서 상품을 Cart 에 담으면 **사진이 안 뜨고 회색 박스**. Checkout 진입 후 동일.

실측: `api/hooks/draft-orders.tsx` 의 네 지점 (draft-order 조회) fields 에 썸네일 선택이 없음:
```
+tax_total,+discount_total,+subtotal,+total,
+items.variant.options.*,+items.variant.options.option.*,
+items.variant.inventory_quantity,+customer.*
```
cart/checkout 두 라인 렌더는 이미 `item.thumbnail || item.product?.thumbnail || item.product?.images?.[0]?.url` fallback 체인을 갖고 있었으므로 **필드만 추가하면 복구**.

---

## 2. 변경 ↔ file:line

### `api/hooks/draft-orders.tsx` (4곳 · 추가분 동일)
```diff
- '+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*'
+ '+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*,+items.thumbnail,+items.product.thumbnail,+items.product.images.*'
```
- **184** `useGetDraftOrder` primary path
- **190** `useGetDraftOrder` fallback (order.retrieve)
- **214** `useCurrentDraftOrder`
- **661** `useCompleteDraftOrder` settlement path (`+customer.addresses.*` 가 끝에 있어 그 뒤에 삽입)

### `scripts/m1-1105-d-diagnosis.mjs` (신규 · 상시 ⓐ 하네스)
- 어설션 3건을 **static shape 분석** (React 런타임 없이 · 빠름 · CI 적합).
- 종료 코드 = 실패 건수 → CI 상시 ⓐ 로 등재 가능.

---

## 3. 하네스 로그

```
$ node scripts/m1-1105-d-diagnosis.mjs

--- (1) line-item 썸네일 렌더 (cart + checkout) ---
  ✓ cart.tsx · thumbnail fallback 체인 (item → product → images[0]) 유지
  ✓ checkout/[draftOrderId].tsx · thumbnail fallback 체인 유지
  ✓ cart.tsx · thumbnail 존재 시 <Image> 렌더
  ✓ checkout.tsx · thumbnail 존재 시 <Image> 렌더
--- (2) api/hooks/draft-orders.tsx fields 4곳 +items.thumbnail 포함 ---
  ✓ 선행 draft-order retrieve fields 문자열이 4곳 존재
  ✓ 모든 fields 문자열이 +items.thumbnail · +items.product.thumbnail · +items.product.images.* 를 포함
--- (3) PaymentForm · approval_code 없음 → Confirm disabled 회귀 가드 ---
  ✓ APPROVAL_NUMBER_RE 정규식 정의 (정확히 6자리)
  ✓ needsInvoice = method !== "cash" 식 유지
  ✓ invoiceValid = !needsInvoice || APPROVAL_NUMBER_RE.test(invoice.trim())
  ✓ canSubmit = !disabled && invoiceValid
  ✓ Confirm 버튼 · disabled={!canSubmit}

result: 11 passed · 0 failed
```

---

## 4. Kyu 실기 (아이패드 · 대기)

1. 아이패드 Expo Go → 로그인
2. 상품 목록에서 상품 2개 담기 (서로 다른 카테고리 권장)
3. Cart 탭: **각 라인에 사진 렌더** 확인 (회색 박스 아님)
4. "Checkout" 진입: **같은 사진이 Checkout 라인에도 렌더** 확인

하네스 어설션 (1)·(2) 가 코드 shape 상 사진 렌더 경로를 보장. (3) 은 결제 승인번호 미입력 회귀 가드.

---

## 5. 산출물

- **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/30
- **브랜치**: `fix/m1-1105-f-line-item-thumbnail` (base master `21eb6f3`)
- **커밋**: `d6a06a5` — `fix(cart/checkout): draft-order fields 에 썸네일 선택 추가 (M1-1105-F)`
- **하네스**: `scripts/m1-1105-d-diagnosis.mjs` (신규 · 11/11 PASS)

---

## 6. 다음 후보

- M3-1105-D (M3 측에서 `app/(tabs)/products.tsx` · product-details 리터치) 머지 후 이 PR 자동 rebase.
- 이후 하네스 (3) 번 어설션 대역을 Playwright web harness 로 격상 (실제 UI 클릭 흐름 검증) — 선택.
