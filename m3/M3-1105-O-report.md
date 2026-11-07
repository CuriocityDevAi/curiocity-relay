---
round: M3-1105-O
pr:
  fork: agilo-medusa-pos-fork#58 (rebased · force-pushed)
commit: eeba5b1 (branch feat/m3-1105-n-quote-receipt-logo · base master 2c447c3)
outcome: PR #58 (M3-1105-N · quote + receipt logo/tax/padding + Pay 연타 가드) 를 master 2c447c3 (#55 cashier · #56 preorder · #57 M1-R 머지됨) 위로 **rebase + force-push**. 충돌 해결 3곳 (checkout tsx · CashTenderPanel auto · ReceiptCard auto · #55 cashier 3-tier fallback 보존 확인). tender-cash 에 useOrderQuote 통합 — DP/takeaway 금액 표시는 서버 quote.grand_total 기준 · 앱 계산 금지 (Kyu 결정 ⓒ). 어설션 16/16 + Playwright 19/19 PASS (m3-1105-m preorder · m3-1105-n 세금·영수증 · m1-1105-q cashier 4-case 모두 포함). lib/printer 미수정 (M2-P claim) · api/hooks/pos-payments.ts 미수정.
kyu_checks: 0 (rebase + 충돌 해결 · 기능 변경 없음 · Kyu 실기 불요)
---

# M3-1105-O · PR #58 rebase onto master + 충돌 3곳 해결 (+ tender-cash quote 통합)

**일자**: 2026-11-07 · **허브**: M3 · **성격**: M3-1105-N (#58) 의 base 가 `baed53a` → `2c447c3` 로 이동 (#55 #56 #57 머지됨). open-requirements Kyu 결정 ⓐⓑⓒ + R0-1105-Y CHANGES "DP 금액 표시는 서버 응답 그대로 · 앱 계산 금지" 반영.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | 브랜치를 master `2c447c3` (#55 #56 #57 머지됨) 위로 rebase | ✓ |
| 2 | `app/checkout/[draftOrderId].tsx` 충돌 해결 — #56 OrderTypePicker/PreorderInputs + #58 quote 세금 줄 공존 · Pay 비활성 조건 2개 머지 | ✓ |
| 3 | `components/payment/CashTenderPanel.tsx` — auto-merge · `#56 allowPartial` prop + N `ProcessButton` 공존 확인 | ✓ |
| 4 | `components/receipt/ReceiptCard.tsx` — auto-merge · **#55 cashier 3-tier fallback (snapshot.cashier.name → /admin/users first_name → email 앞 → 생략) 보존 확인** | ✓ |
| 5 | Pre-order DP 와 quote 세금 줄이 한 화면에 — DP 금액 표시 = 서버 grand_total 기준 (앱 계산 금지) | ✓ (tender-cash useOrderQuote 통합) |
| 6 | Playwright: m3-1105-m preorder + m3-1105-n 세금·영수증 + m1-1105-q cashier 4 case 전부 PASS | ✓ (19/19) |
| 7 | 색 어설션 37/37 | ✓ |
| 8 | force-push 뒤 PR 본문 "rebase 완료 · 충돌 해결 3줄" | ✓ |
| 9 | 금지 영역 (lib/printer · api/hooks/pos-payments.ts) 미수정 | ✓ |
| 10 | CI 전 job 그린 | **진행 중** |

---

## 1. 산출물 (force-push `bdaf783 → eeba5b1`)

### 1-1. rebase 충돌 해결 (3줄)
1. **`app/checkout/[draftOrderId].tsx`** · HEAD(#56) 가 추가한 OrderTypePicker/PreorderInputs 블록과 N(#58) 가 바꾼 Pay 버튼 disabled 조건이 **인접 라인에서 충돌**. 해결: 두 블록을 순서대로 유지 (OrderType → PreorderInputs → Total Pay) + Pay `disabled` 조건을 **AND 조합**:
   ```ts
   disabled={
     !isDraftOrder ||
     !items.length ||
     (orderType === 'preorder' && !pickupAt) ||
     quote.isLoading
   }
   ```
2. **`components/payment/CashTenderPanel.tsx`** · auto-merge 성공. `#56 allowPartial` prop + N `ProcessButton` 서브 컴포넌트가 다른 라인에 있어 자동 공존. 둘 다 유효 — allowPartial=true 시 `insufficient` false, busy/isPending 가드만 작동.
3. **`components/receipt/ReceiptCard.tsx`** · auto-merge 성공. 확인: **#55 M1-Q 의 `snapCashierName || pickCashierDisplayName(userQ.data)` 3-tier fallback** (`api/hooks/users.ts` 경유) 이 그대로 보존. N 의 logo Image 블록 + SC/PB1 줄 + py-12 padding 동시 유지.

### 1-2. 추가 변경 (rebase 중 요구사항 반영)
- **`app/checkout/tender-cash/[draftOrderId].tsx`** — `useOrderQuote(draftOrderId)` 통합.
  ```ts
  const grandFromQuote = quote.data && typeof quote.data.grand_total === 'number' ? quote.data.grand_total : null;
  const total = isBalanceFlow ? balanceAmount : (grandFromQuote ?? draftOrder.data?.total ?? 0);
  ```
  - balance 흐름 → `balanceAmount` (route param).
  - **DP/takeaway → `quote.grand_total`** (서버 SC+PB1 compound 결과 · 앱 계산 금지 · Kyu 결정 ⓒ).
  - quote null → draftOrder.total 폴백 (pre-merge 또는 404 안전망).

---

## 2. 상시 claims (규약 ⓔ)

- `status/claims/M3-1105-O.json` · state=`started` 커밋+푸시 완료 (17:50Z).
- CI green 뒤 state=`done` 예정.

---

## 3. 검증 (로컬 · CI 와 동일)

### 3-1. 전 어설션
```
$ node scripts/run-all.mjs assertions
  총 16 개 · 16 PASS · 0 FAIL · 1.7s
  · m3-1105-a-color-assertions.mjs ... PASS · 37/37
```

### 3-2. 전 Playwright (19/19 · rebase 뒤)
```
$ node scripts/run-all.mjs playwright
  총 19 개 · 19 PASS · 0 FAIL · 349.6s
  · m1-1105-q-playwright.mjs ... PASS · 47.3s   (cashier 4 case)
  · m3-1105-d-playwright.mjs ... PASS · 36.7s   (Takeaway P2 회귀 0)
  · m3-1105-m-preorder-playwright.mjs ... PASS · 33.9s  (Pre-order DP → balance → Hand over)
  · m3-1105-n-quote-receipt-playwright.mjs ... PASS · 45.9s  (SC+PB1 quote · logo · 연타 가드)
```

### 3-3. Lint
`0 errors · 34 pre-existing warnings`.

### 3-4. CI (fork · 재발화) — **진행 중** (PR #58 · force-push 뒤 자동 트리거)
- PR #58: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/58
- Green 확인 뒤 claim state=done.

---

## 4. 설계 포인트

### 4-1. Pay 비활성 조건 2개 공존
- 기존 (#56): `(orderType === 'preorder' && !pickupAt)` — preorder 선택 시 pickup_at 입력 강제.
- 추가 (#58): `quote.isLoading` — quote 로딩 중 (서버 grand_total 확정 전) Pay 비활성.
- OR 조건으로 결합 → **둘 중 하나라도 true 면 Pay 비활성**.

### 4-2. tender-cash 금액 소스 변경 (앱 계산 금지)
- 이전 (N 초안): `draftOrder.data?.total` — Medusa Order.total 사용. 하지만 SC+PB1 미반영 → Checkout 과 tender-cash 금액 불일치 가능.
- 이후 (O): `quote.grand_total` 우선 → Checkout 의 Total 과 **같은 금액** 표시.
- Kyu 결정 ⓒ "SC=Subtotal×%, PB1=(Subtotal+SC)×%" 는 서버가 compound 계산 → 앱은 받아서 쓰기만.

### 4-3. ReceiptCard 3-way 안전 통합
- #55 M1-Q (cashier 3-tier fallback) 와 N (logo · SC/PB1 · padding) 가 같은 파일에서 다른 라인 터치 → auto-merge 성공.
- **보존 확인**: `pickCashierDisplayName` import + `userQ = useAdminUser(fallbackUserId)` + `cashierDisplay = snapCashierName || pickCashierDisplayName(userQ.data)` + testID `receipt-cashier` 전부 존재.

### 4-4. force-push 안전성
- `--force-with-lease` 사용 — origin 최근 ref (`bdaf783`) 가 그대로 있을 때만 교체.
- 리뷰 코멘트 유실 없음 (리뷰 미착수 상태).

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (#58 머지 blocker 해소 · master 최신 반영) |
| 등재 | 0 |
| 미완 (Kyu 실기) | 0 |
| **총 순증감** | **-1** |

---

## 6. 다음 게이트

1. **CI 그린 확인** → claim state=done · M3-1105-N-report.md "CI 그린" 서술 유지.
2. **PR #58 머지** — N 라운드의 모든 기능 (quote · receipt logo · Pay 가드) 반영 완료.
3. **M2-P 완료 뒤** — lib/printer 에 로고 비트맵 + SC/PB1 줄 (ESC/POS).

---

*M3-1105-O · 2026-11-07 · PR #58 rebase onto master (#55 #56 #57 머지됨) · 충돌 3곳 해결 (checkout 수동 · CashTenderPanel auto · ReceiptCard auto with #55 cashier fallback 보존) · tender-cash useOrderQuote 통합 (앱 계산 금지 · 서버 grand_total 그대로) · 어설션 16/16 + Playwright 19/19 PASS · 이연 -1*
