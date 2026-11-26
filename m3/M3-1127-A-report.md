# M3-1127-A — spec-guard-audit 자동화 보고서

**PASS** · PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/282 · 커밋: `6f5f528`

---

## audit 실행 로그 (전/후 표)

### 최종 결과 (원복 후)

```
[audit] 명세 로드: local:.../curiocity-relay/specs/screens/pos-payment-flow.md  → 33개 ID
[audit] 명세 로드: local:.../curiocity-relay/specs/screens/pos-order-detail.md  →  3개 ID

====================================================================================================
spec-guard-audit — 명세 ↔ 구현 대조 결과
====================================================================================================
ID                        명세        testID   테스트    todo결과
----------------------------------------------------------------------------------------------------
LG-1                      일치        ✅        ✅          ✅ 커버됨
LG-2                      일치        ✅        ✅          ✅ 커버됨
LG-3                      일치        ✅        ✅          ✅ 커버됨
SELL-TAB-LABEL            일치        ✅        ✅          ✅ 커버됨
SELL-PRODUCT-SHEET-IMG    일치        ✅        ✅          ✅ 커버됨
SELL-NEXT-CUSTOMER        일치        ✅        ✅          ✅ 커버됨
SELL-HAND-OVER            일치        ❌        ❌      📋   ❌ testID·테스트 둘 다 없음
CART-CHECKOUT-BTN         일치        ✅        ✅      📋   ✅ 커버됨
CART-X-44PT               일치        ✅        ✅          ✅ 커버됨
CART-ORDER-CHIP           일치        ✅        ❌      📋   ⚠️  테스트 없음
CART-HDR-PHONE            일치        ✅        ✅          ✅ 커버됨
CHECKOUT-TITLE            일치        ✅        ✅      📋   ✅ 커버됨
CHECKOUT-ORDER-CHIP       일치        ✅        ✅          ✅ 커버됨
CHECKOUT-TENDER-B         일치        ✅        ✅          ✅ 커버됨
CHECKOUT-PAY-IN-PARTS     일치        ✅        ✅          ✅ 커버됨
CHECKOUT-HDR-PHONE        일치        ✅        ✅          ✅ 커버됨
TENDER-CASH-TITLE         일치        ✅        ✅          ✅ 커버됨
TENDER-CARD-TITLE         일치        ✅        ✅          ✅ 커버됨
TENDER-QRIS-TITLE         일치        ❌        ✅      📋   ⚠️  testID 없음
TENDER-CASH-HDR-PHONE     일치        ✅        ✅          ✅ 커버됨
TENDER-QRIS-HDR-PHONE     일치        ✅        ✅          ✅ 커버됨
TENDER-CARD-HDR-PHONE     일치        ✅        ✅          ✅ 커버됨
SPLIT-TITLE               일치        ✅        ✅      📋   ✅ 커버됨
SPLIT-HDR-PHONE           일치        ✅        ✅          ✅ 커버됨
SUCC-TITLE                일치        ✅        ✅          ✅ 커버됨
SUCC-RECEIPT              일치        ✅        ✅          ✅ 커버됨
SUCC-HAND-OVER            일치        ✅        ✅          ✅ 커버됨
SUCC-NEXT-CUSTOMER        일치        ✅        ✅          ✅ 커버됨
SUCC-ASK-PHONE-DEL        일치        ✅        ✅          ✅ 커버됨
SUCC-HDR-PHONE            일치        ✅        ✅          ✅ 커버됨
SUCC-LINK-CUSTOMER        일치        ✅        ✅          ✅ 커버됨
POS-SUCC-PHONEENTRY       불일치       ❌        ❌      📋   ⚠️  불일치
POS-HDR-PHONE             일치        ✅        ✅          ✅ 커버됨
ORDER-LINK-CUSTOMER       일치        ✅        ✅          ✅ 커버됨
ORDER-RECEIPT             일치        ✅        ✅      📋   ✅ 커버됨
ORDER-PHONE-ENTRY         일치        ✅        ✅      📋   ✅ 커버됨
====================================================================================================
총 36개 ID · ✅ OK: 32 · ❌ FAIL: 0 · ⚠️  WARN: 4
📋 todo(이번 라운드 미완): 9개

[audit] ✅ 통과
```

---

## 보존 테스트 실행 로그 (SRC 어설션)

```
=== SRC 어설션 (소스 코드) ===
  ✓ [LG-1] favicon.png 존재
  ✓ [LG-1] favicon-mark.svg 존재
  ✓ [LG-2] MARK_BOX_PATH 정의됨
  ✓ [LG-2] 톱니 path V 150 존재
  ✓ [LG-3] floatingPlaceholder 없음
  ✓ [LG-3] loginEmail testID 존재
  ✓ [SELL-TAB-LABEL] isDark ? TOKEN_ON_SELECTED 분기 존재
  ✓ [SELL-TAB-LABEL] TOKEN_ON_SELECTED import
  ✓ [SELL-PRODUCT-SHEET-IMG] resizeMode="contain" 존재
  ✓ [ORDER-LINK-CUSTOMER] order-link-customer testID 존재
  ✓ [ORDER-LINK-CUSTOMER] LateLinkCustomerSheet import
  ✓ [CART-CHECKOUT-BTN] cart-pay testID 존재
  ✓ [CART-CHECKOUT-BTN] 버튼 텍스트 Checkout (Pay 금지)
  ✓ [CHECKOUT-TITLE] checkout-title testID 존재
  ✓ [TENDER-CASH-TITLE] tender-title testID 존재
  ✓ [TENDER-CASH-TITLE] heading 에 "Cash payment" 텍스트 포함
  ✓ [TENDER-CARD-TITLE] heading 에 "Card payment" 텍스트 포함
  ✓ [TENDER-QRIS-TITLE] "QRIS payment" title 존재
  ✓ [SPLIT-TITLE] split-title testID 존재
  ✓ [SPLIT-TITLE] "Split payment" 텍스트 존재
  ✓ [SUCC-TITLE] success-title testID 존재
  ✓ [SUCC-TITLE] "Payment successful" 텍스트 존재
  ✓ [SUCC-NEXT-CUSTOMER] next-customer testID 존재
  ✓ [SUCC-ASK-PHONE-DEL] askPhoneBtn 이 success 화면에서 SuccessReceiptAnim 에 미전달
  ✓ [SUCC-ASK-PHONE-DEL] Phone entry 칩 제거 주석 존재 (M3-1126-S)
  ✓ [SUCC-LINK-CUSTOMER] link-customer-open testID 존재
  ✓ [SUCC-LINK-CUSTOMER] confirmed 상태 → null 반환 조건 존재
  ✓ [ORDER-RECEIPT] order-receipt-section testID 존재
  ✓ [ORDER-PHONE-ENTRY] order-phone-entry testID 존재
소스 체크 결과: 29 passed · 0 failed
```

---

## 검증의 검증 — testID 임시 제거 후 빨간불 확인

`app/checkout/[draftOrderId].tsx:364`의 `testID="checkout-title"` 임시 제거:

```
# audit: CHECKOUT-TITLE 경고 → exit 0 (todo이므로)
CHECKOUT-TITLE  일치  ❌  ✅  📋  ⚠️  testID 없음

# SRC 어설션: 빨간불
  ✗ [CHECKOUT-TITLE] checkout-title testID 존재
소스 체크 결과: 28 passed · 1 failed
최종: 40/41 passed · 1 failed  → exit 1
```

원복 후 정상 확인.

---

## 발견된 명세↔구현 어긋남 (고치지 않음, 보고만)

| ID | 명세 | 실제 | 파일:줄 |
|---|---|---|---|
| `SELL-HAND-OVER` | "일치" — Sell 탭 products.tsx:262-264 Hand over 버튼 | 해당 위치에 버튼 없음, 레이아웃 주석만 존재 | app/(tabs)/products.tsx:264 |
| `POS-SUCC-PHONEENTRY` | "불일치" — Phone entry 칩 삭제 예정 | M3-1126-S에서 이미 삭제 완료, 명세가 뒤처짐 | app/checkout/success/[orderId].tsx |

---

## CD 쪽 같은 작업을 할 때 필요한 것 (5줄 이내)

1. `specs/screens/customer-display.md` 를 CD 명세 소스로 추가하고 `spec-guard-map.json` 에 CD-* ID 섹션 신설.
2. `e2e/cd-pos/**` 는 M1 소유이므로 CD 보존 테스트는 `e2e/flows/spec-guard-cd.spec.ts` 별도 파일로 분리.
3. CD 화면은 `storeport` 레포 컴포넌트가 소유 — testID grep 경로를 `storeport/apps/customer-display/` 로 별도 지정.
4. `spec-guard-audit.mjs` 의 `REPO_ROOT` 를 CD 쪽 레포 루트로 교체하거나 `--repo` 플래그로 전환 가능하게 추상화.
5. `receipt-same-as-pos.spec.ts`(storeport) 를 map 의 `SUCC-RECEIPT`·`ORDER-RECEIPT` CD 테스트 항목으로 연결.
