#207 CHANGES · 경쟁상태 처리 O · 테스트 O · Slip 일치 O · assertions 46/47 (1 FAIL) · flow-tests 177/183 (6 expected-fail) · lint 0 errors · #208 rebase 필요 X

## #207 판정: CHANGES

**실패한 CI 검사:** `m3-1105-aa-assertions.mjs` 32개 중 1개 FAIL
- 오류 항목: `SuccessReceiptAnim · 보조 버튼 3개 한 줄 (flex-row)`
- assertion 조건 (line 116): `/<View className="flex-row gap-2"\s+testID="success-actions-secondary"/.test(src)`
- 실제 코드: `<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} testID="success-actions-secondary">`
- PR이 Tailwind className → inline style 로 변경했지만 `m3-1105-aa-assertions.mjs`를 갱신하지 않음.
- `m2-1119-s` 테스트의 `flexWrap: 'wrap'` 검사는 통과하지만, 기존 가드 assertion이 여전히 구버전 패턴을 요구해 CI가 블록됨.

**수정 항목 ①**: `scripts/m3-1105-aa-assertions.mjs` line 116:
  - 현행: `/<View className="flex-row gap-2"\s+testID="success-actions-secondary"/.test(successSrc)`
  - 변경: `/<View\s+style=\{[^}]*flexDirection:\s*'row'[^}]*\}\s+testID="success-actions-secondary"/.test(successSrc)` (또는 testID + flexWrap 분리 체크)

---

## 검토 근거

### REQ 1 — quote 계약 형태 ✓
- `OrderQuote` 타입: 최상위 `header/footer/logo_mode/store` ✓, `tenders[]: method/amount/at/approval_code/qris_receipt_id/reference_no` ✓
- Ref 우선순위: `qris_receipt_id → reference_no → null` (buildSlipData/tenderToSlipData 모두 동일, REQ 1-e 테스트 통과)
- slipStore 는 `quote.data.header ?? null` (최상위, store.header 아님) 코드 확인 (line 480) ✓
- PR 본문에 "store.header" 오기재가 있지만 실제 코드는 올바름

### REQ 2 — 경쟁 상태 (qris-status captured → webhook 미완료) ✓ (테스트 O)
- 코드 경로: `checkStatus` → `captured` → `fetchOrderQuoteDirect` (1회 조회) → `navigateToSuccess(res.receipt_id ?? null, qrisTender)`
- `navigateToSuccess` 내부에서 receipt_id null 이면 `order.metadata.receipt_id` 최대 5×2s=10s 재조회 ✓
- **완료 화면 Slip 2**: `success/[orderId].tsx`가 `useReceipt(receiptId)` → `receipt.snapshot.tenders[1]` → `tenderToSlipData` 사용. `receiptId`가 확정된 뒤 navigate하므로 webhook 완료 후 서버값이 반영됨 ✓
- 테스트: `m2-1119-s` "QRIS Slip 2" 테스트가 split-tender Slip 2 (null qris_receipt_id) vs 완료 화면 Slip 2 (qri_e2e_02) 디자인 의도를 검증 ✓; REQ AB 테스트가 signal 전달 경로 검증 ✓

### REQ 3 — Slip 텍스트 일치 ✓
- `buildSlipData ≡ tenderToSlipData` 동일 입력→동일 출력 (REQ 1-e, REQ 1-e' 테스트 통과)
- storeHeader `'Soopsok Sweets\nPondok Indah Mall 3 LG\nWA : 0813-xxx'` 양쪽 경로 모두 전달 ✓
- Next customer 버튼: `testID="next-customer"`, `onNextCustomer` prop ✓
- 미연결 entering 금지: `hasPolledSincePayment = !paid_at || !polled_at || polled_at >= paid_at` 가드 존재 ✓
- 주문 상세 버튼: `flex-row flex-wrap gap-2` 컨테이너, 비-Done 버튼 flex-1 제거 ✓

### REQ 4 — CI 실행 결과
| 검사 | 결과 | 상세 |
|------|------|------|
| assertions (custom) | ❌ 46/47 FAIL | m3-1105-aa flex-row guard 미갱신 |
| flow-tests (vitest tests/flows) | ✅ 11 files · 177 passed + 6 expected-fail (183) | PASS |
| lint (eslint) | ✅ 0 errors · 60 warnings | PASS |
| playwright | ⏭ skipping | (expo build 필요) |
| tsc | CI 미실행 | 저자 주장: 신규 0, 기준 14 (master 동일) |

### REQ 5 — #208 rebase 필요 여부
- #208 HEAD(8d53525)는 `0951b938 Merge branch 'fix/M2-1119-S-pos-slip-nextcustomer' into fix/M3-1119-O-cd-emit` 및 `8d535255 Merge …origin/fix/M2-1119-S-pos-slip-nextcustomer…` 를 포함
- #207 HEAD(4f2c00c)가 #208의 조상에 있음 → **rebase 불필요**
