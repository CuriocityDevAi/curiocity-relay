PASS

# M2-1124-V 리포트 · 2026-11-25

리포: `CuriocityDevAi/agilo-medusa-pos-fork`  
브랜치: `feat/M3-1124-O-checkout-b` (PR #254)  
HEAD: `725bb18`

---

## 작업 내역

### REQ A: m3-1105-d-assertions.mjs 갱신 (commit `ce027ad`)

`checkout-pay`(단일) → B안 3버튼 + Pay in parts 검사로 교체 (섹션 6):

| 변경 전 | 변경 후 |
|---|---|
| `check('Pay 버튼 (testID="checkout-pay")')` | `check('Cash 버튼 (testID="checkout-pay-cash")')` |
| (삭제) | `check('Card 버튼 (testID="checkout-pay-card")')` |
| (삭제) | `check('QRIS 버튼 (testID="checkout-pay-qris")')` |
| (삭제) | `check('Pay in parts 링크 (testID="checkout-pay-in-parts")')` |
| `'Pay → /checkout/tender-cash/[draftOrderId] 라우팅'` | `'3버튼 → /checkout/tender-cash/[draftOrderId] method 라우팅'` (유지) |

로컬 실행: **31/31 passed**

### REQ B: m3-1124-o-checkout-b-playwright.mjs 신규 추가 (commit `ce027ad`)

4 라운드 CI 하네스:
- Round A: `checkout-pay-bar` + 3버튼(cash/card/qris) + `checkout-pay-in-parts` 보임
- Round B/C/D: tender-cash `method=cash/card/qris` → 제목 "Cash payment"/"Card payment"/"QRIS payment" 각각 확인

로컬 실행: **8/8 passed**

### 추가 수정: 기존 playwright 하네스 4개 (commit `725bb18`)

B안으로 `testID="checkout-pay"` 단일 버튼이 삭제됨 → 기존 하네스의 `.click()`/`.isDisabled()`/`.count()`/`.boundingBox()` 호출을 `checkout-pay-cash`로 교체:

| 파일 | 변경 |
|---|---|
| `m3-1105-d-playwright.mjs` | `checkout-pay` → `checkout-pay-cash` (2곳) |
| `m3-1105-m-preorder-playwright.mjs` | `checkout-pay` → `checkout-pay-cash` (1곳) |
| `m1-1105-aj-playwright.mjs` | `checkout-pay` → `checkout-pay-cash` (5곳) |
| `m3-1105-y-preorder-pay-playwright.mjs` | `checkout-pay` → `checkout-pay-cash` (5곳) |

---

## 로컬 실행 결과

```
node scripts/m3-1105-d-assertions.mjs  → 31/31 passed
node scripts/run-all.mjs assertions    → 47 개 · 47 PASS · 0 FAIL
node scripts/m3-1124-o-checkout-b-playwright.mjs → 8/8 passed
```

---

## CI 잡별 결과 (run 45446878082 · HEAD 725bb18)

| 잡 | 결과 | 소요 |
|---|---|---|
| CI / route | ✅ pass | 7s |
| CI / flow-tests | ✅ pass | 52s |
| CI / assertions | ✅ pass | 1m 14s |
| CI / heavy-cloud | ⏭ skipping | — |
| CI / playwright | ✅ pass | 5m 40s |
| Lint / route | ✅ pass | 7s |
| Lint / lint | ✅ pass | 55s |
