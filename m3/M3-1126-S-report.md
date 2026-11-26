PASS · PR #280

## M3-1126-S — Payment successful Phone entry 칩 제거 · Ask phone/again → phone-entry

### 결정
decision-success-single-phone-button-20261126 · Kyu 23:07
"결제 완료 화면에서는 하나만. Ask phone 이라는 버튼이 그 전단계에서도 있던거라면 그냥 그걸남기는게 나아."

### PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/280
브랜치: `feat/M3-1126-S` → base: `master`
커밋: `3e54d6a`

### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `app/checkout/success/[orderId].tsx` | `PhoneEntryButton` 칩 제거 · `useOpenPostSettlementPhoneEntry` + `REASON_TOAST` 직접 사용 · `onAskPhone` → `phoneEntry.mutate` · `shouldTransitionToSkipped` 관련 dead code 정리 |
| `components/customer-display/PhoneEntryButton.tsx` | `REASON_TOAST` export 추가 |
| `scripts/m3-1126-k-phone-status-playwright.mjs` | V4-7 절 갱신: `phone-entry-chip 없음` 어설션 + `cd-phone-status-ask 클릭 → POST /phone-entry` 어설션 |

### relay spec 갱신
`specs/screens/pos-payment-flow.md`
- `POS-SUCC-PHONEENTRY` 행: 미구현 → 일치(M3-1126-S)
- 상태 표 ① · ⑤ 행: success 화면 phone-entry 호출 예외 명시
- 보존 테스트 목록 `POS-SUCC-PHONEENTRY` 행: 하네스 경로 기재

### 보존 요소 확인

| 보존 항목 | 상태 |
|---|---|
| POS-HDR-PHONE 6상태(Cart·Checkout·Cash/Card/QRIS·나눠결제·Payment successful) | ✅ 유지 |
| Order 상세 Link customer 오른쪽 Phone entry 버튼 | ✅ 미수정 |
| Sell 화면 Phone entry 없음 | ✅ 유지 |
| Next customer | ✅ 유지 |
| 영수증 | ✅ 유지 |

### 미적용
- `scripts/spec-guard-pos-playwright.mjs`: **#277 미머지** — 브랜치에 없어 건드리지 않음. **#277 머지 후 어설션 갱신 필요**.

### Kyu 실기 항목

| # | 확인 항목 | 기대 결과 |
|---|---|---|
| 1 | Payment successful 화면 오른쪽 위 → `phone-entry-chip`(초록 캡슐) **없음** | 헤더에 초록 `Phone entry` 칩 미노출 |
| 2 | `customer_flow.state='none'` 일 때 오른쪽 위 → `Ask phone` 버튼 클릭 | CD에 번호 입력 화면 열림 · `POST /orders/:id/phone-entry` 호출됨 |
| 3 | `customer_flow.state='skipped'` 일 때 오른쪽 위 → `Ask again` 버튼 클릭 | 동일하게 phone-entry 호출 |
| 4 | Cart / Checkout / Cash payment 화면 → Ask phone 클릭 | 기존 `start_entry` 호출 (변경 없음) |
| 5 | Order 상세 `Phone entry` 버튼 | 그대로 존재 · 동작 변경 없음 |
