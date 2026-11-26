#273 CHANGES — 테스트 전용 PR 계약 미충족 · 결정 4 경로(PhoneFlowScreen·deriveTender) storeport master 미구현으로 미확인

---

## REQ 1 · 제품 코드 0줄 여부 ❌

PR 타이틀 "test(qris)" · body "코드 수정 없음"과 달리 제품 코드 8파일 변경 포함:

```
api/hooks/pos-payments.ts              +6/-1   M3-1126-D POS-6 formatIDR NaN 방어
components/customer-display/CustomerPhoneStatus.tsx  +23/-9  M3-1126-D POS-1/2/3
components/order-chips/OrderChips.tsx   +3/-1   M3-1126-E elapsedMs null 가드
components/order-chips/types.ts        +11/-6   M3-1126-E number|null · formatElapsed 포맷
components/payment/SuccessReceiptAnim.tsx +19/-13 M3-1126-D POS-4/5
components/receipt/ReceiptCard.tsx      +3/-2   M3-1126-D POS-6 resolveLineTotal
lib/printer/receipt-escpos.ts           +3/-2   M3-1126-D POS-6 resolveLineTotal
types/receipt.ts                       +19/-1   M3-1126-D POS-6 ReceiptItem 타입·함수
```

M3-1126-D/E 버그픽스가 M3-1126-G 테스트 커밋에 묶여 있음 → PR 범위 초과.

---

## REQ 2 · E2E 어설션 실제성 ✅

```
$ cd /Users/kyu.lee/projects/pos-m3  # feat/M3-1126-G 브랜치
$ npx expo export -p web
  Exported: dist

$ npx playwright test e2e/flows/M3-1126-G-qris-snapshot.spec.ts
  ✓  QRIS 화면 진입 → checkout-snapshot body 에 qr_string · amount 포함 (1.7s)
  ✓  QR regenerate → 새 qr_string 이 checkout-snapshot 에 재전송 (1.5s)
  2 passed (4.8s)
```

`page.route()` LIFO intercept로 실제 POST body 캡처:
- `entry.body.qr_string.slice(0,20) === '00020101021226690016'` (EMVCo 헤더 실값)
- `entry.body.amount === 95000`
- `regenEntry.body.qr_string.includes('REGEN')` (regenerate 후 새 QR 실값)

mockBaseAuth catch-all(`${API}/**`)보다 나중 등록된 테스트 핸들러가 LIFO 우선 → 가짜 통과 아님. ✅

---

## REQ 3 · 서버→CD 전달 경로

**QrisScreen 경로 ✅**
- `tender-qris/[draftOrderId].tsx:343-345`: `setPosScreenHint({ pos_screen: screen, extras: { amount: total, qr_string: currentQrString }, ... })` — deps: `[currentQrString, ...]` ✓
- `usePosScreen.ts:73`: `if (item.qr_string) body.qr_string = item.qr_string` → checkout-snapshot POST ✓
- `storeport lifecycle.ts:253`: `qr_string: snapshot.qr_string ?? null` ✓
- `QrisScreen.tsx:124`: `const qrString = snapshot.qr_string ?? null` ✓

**결정 4 · PhoneFlowScreen 경로 ❌ 미확인**
- `deriveTender` 함수 → storeport master 에 없음 (worktree M1-1125-Z 등에만 존재)
- `PhoneFlowScreen` 파일 → storeport CD 에 없음
- 현재 `KeypadScreen`은 `summary: OrderSnapshot` prop으로 주문 요약만 표시, QR 렌더링 없음
- "번호 입력 중 좌 1/3 QR" (decision-cd-pos-sync-flow-20261125.md 결정 4) 경로 미구현 상태

→ M3 결론 "서버→CD 전달 OK"는 QrisScreen 경로에만 성립. 결정 4 경로는 미확인.

---

## 판정

**CHANGES** — ① PR 범위: 테스트 전용 계약 위반(제품 코드 8파일), ② 결정 4(PhoneFlowScreen) 미구현으로 경로 미검증.
