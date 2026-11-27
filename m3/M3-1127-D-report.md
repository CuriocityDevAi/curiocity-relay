PASS · 커밋 8cc5be8 · feat/M3-1127-C

## ci-summary

| 체크 | 결과 |
|---|---|
| lint | ✅ pass |
| unit-tests | ✅ pass |
| assertions (spec-guard 48/48) | ✅ pass |
| flow-tests | ✅ pass |
| playwright | ✅ pass |
| route ×2 | ✅ pass |

## 변경 내용

### 필수 — ORDER-PHONE-ENTRY SRC → PW 렌더

`scripts/spec-guard-pos-playwright.mjs` 에서 `PhoneEntryButton.tsx` 소스 문자열 확인(거짓 통과) 삭제.
주문 상세 화면 실제 렌더 2-case PW 블록으로 교체:
- Case 1: `customer_id: null` (게스트) + `payment_status: 'captured'` → `order-phone-entry` 버튼 노출 ✅
- Case 2: `customer_id: 'cust_02'` (실제 고객) → 버튼 숨김 ✅

### 권고 — CART-ORDER-CHIP SRC → PW 렌더

cart-sheet 열어 `order-chips` 렌더 + `posOrderNum=5` → `#5` 칩 텍스트 확인.
`display_id=1` 대비 `#5`로 posOrderNum 사용 증명.

### REQ #3 나머지 SRC 항목

`ORDER-RECEIPT`, `SUCC-NEXT-CUSTOMER`, `SUCC-LINK-CUSTOMER` — 이유 `spec-guard-map.json` 한 줄 기록 후 SRC 유지.

## 보존 테스트 로그 (로컬 48/48)

```
SRC: 30 passed · 0 failed
PW:
  LG-2/LG-3: ✓✓✓
  ORDER-LINK-CUSTOMER: ✓✓✓
  SELL-TAB-LABEL light/dark: ✓✓
  SELL-PRODUCT-SHEET-IMG portrait/landscape: ✓✓✓✓
  ORDER-PHONE-ENTRY: ✓✓
  CART-ORDER-CHIP: ✓✓✓✓
최종: 48/48 passed · 0 failed
```

## 자기 검증 (검증의 검증)

**방법**: dist/ 빌드가 이미 완료된 상태이므로 소스 직접 변경은 dist/에 반영 안 됨.
대신 Case 1 픽스처를 `customer_id: 'cust_02'`(연결 고객)으로 임시 변경 → 렌더 조건 거짓 → 버튼 숨김 → 테스트가 signal 있음을 증명.

**결과 (임시 변경 후)**:
```
✗ [ORDER-PHONE-ENTRY] 미연결 결제완료 주문 → order-phone-entry 버튼 노출
✓ [ORDER-PHONE-ENTRY] 고객 연결 주문 → order-phone-entry 버튼 숨김
최종: 47/48 passed · 1 failed
```

원복 후 48/48 통과 확인.
