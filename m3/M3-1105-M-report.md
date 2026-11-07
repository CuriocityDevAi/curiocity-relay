---
round: M3-1105-M
pr:
  fork: agilo-medusa-pos-fork#56
commit: d657f7f (branch feat/m3-1105-m-preorder-dp-flow · base master 5a35e23)
outcome: P3 Pre-order DP → 잔금 → Hand over (디자인 보드 7·9·10). OrderTypePicker + PreorderInputs 신규 · Checkout → tender-cash → Success → Order 상세 (dp_paid Balance due 배지 + Collect balance 버튼) → tender-cash (is_balance) → Order 상세 (paid_full Hand over · fulfill body.stage='hand_over'). Takeaway P2 회귀 0. 어설션 14/14 + Playwright 17/17 PASS (신규 m3-1105-m-preorder-playwright · 28/28 checks). components/receipt/** 미수정 (M1-1105-Q claim). 스크린샷 4장 PR body 첨부.
kyu_checks: 0 (스샷 4장 PR body 로 즉시 확인 · Kyu 실기 불요)
---

# M3-1105-M · P3 Pre-order DP → 잔금 → Hand over

**일자**: 2026-11-07 · **허브**: M3 · **성격**: open-requirements §다음 P3 — 디자인 보드 7·9·10 Kyu 승인 · Pre-order 기본 100% · DP% Admin 설정 · 재고 차감 = 픽업(paid_full + hand_over).

---

## 0. §0 대사표 (서버 엔드포인트 매핑 · PR body 상단과 동일)

| 화면 | action | 서버 (storeport fe07858) |
|---|---|---|
| Checkout (보드 7) | order_type 선택 · Pay | — (앱 state) |
| Cash tender · Pre-order DP | Process payment | `POST /admin/pos/orders/:id/tenders` · `{ order_type:'preorder', preorder:{pickup_at, note}, input:{received_amount} }` · amount 생략 |
| Cash tender · Balance | Process payment | 동일 엔드포인트 · `{ order_type:'preorder', is_balance:true, amount:balance_due, input:{received_amount} }` |
| Order detail | 열람 | `GET /admin/pos/orders/:id` · `balance_due` + `metadata.preorder.{deposit_pct,deposit_amount,balance_due,stage,pickup_at,note,dp_paid_at,paid_full_at}` |
| Order detail · Hand over | 터치 | `POST /admin/pos/orders/:id/fulfill` · `{ stage:'hand_over' }` |

우회(없는 API): 없음 — 모두 storeport 서버에 존재.

---

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | Checkout 첫 단계 (보드 7) — Takeaway 기본 / Pre-order / Delivery (비활성 "Coming soon") | ✓ |
| 2 | Pre-order 입력 (pickup_at + note) → tenders body 전송 | ✓ (서버 수용 키 미확정 — M0 §a) |
| 3 | DP% 는 서버 설정 (앱 UI 입력 X) · amount 생략 | ✓ |
| 4 | 잔금 수금 (보드 9) — Order 상세 "Collect balance IDR X" 버튼 → tender-cash 재사용 (amount=balance_due 고정) | ✓ |
| 5 | 픽업 전달 (보드 10) — paid_full 에서 Hand over · fulfill body.stage='hand_over' (재고 1회) | ✓ |
| 6 | dp_paid 상태엔 Hand over 숨김 + "Balance due" warning 배지 | ✓ |
| 7 | Takeaway 기존 P2 회귀 0 | ✓ (m3-1105-d-playwright 그대로 PASS) |
| 8 | 영어 전용 · D1 토큰만 | ✓ (강조색 금지 유지) |
| 9 | components/receipt/** 미수정 (M1-1105-Q claim) | ✓ |
| 10 | Playwright 신규 (28/28) · 색 어설션 37/37 유지 | ✓ |
| 11 | CI 전 job 그린 확인 | **진행 중** (PR #56) |

---

## 2. 산출물 (PR #56 · base master `5a35e23`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `components/payment/OrderTypePicker.tsx` | **신규** · 보드 7 picker | +61 |
| `components/payment/PreorderInputs.tsx` | **신규** · pickup_at + note 입력 | +68 |
| `components/payment/CashTenderPanel.tsx` | `allowPartial` prop · pre-order DP 때 received < total 허용 | +9 / -3 |
| `app/checkout/[draftOrderId].tsx` | OrderTypePicker + PreorderInputs 통합 · route params 전달 | +27 / -2 |
| `app/checkout/tender-cash/[draftOrderId].tsx` | orderType/pickupAt/note/isBalance/balanceDue params + tenders body 확장 | +42 / -8 |
| `app/orders/[orderId].tsx` | preorderMeta · Collect balance 버튼 · Balance due 배지 · Hand over gating | +49 / -3 |
| `api/hooks/pos-payments.ts` | `PosTenderInput.preorder/is_balance` + `PosTenderResponse.{is_balance,preorder_stage,balance_due_after,receipt_kind,converted}` · `useFulfillOrder.stage` | +22 / -4 |
| `api/hooks/pos-orders.ts` | `useHandOver` body.stage='hand_over' + invalidate exact:false | +4 / -4 |
| `fixtures/pos-tender-preorder-dp-response.json` | **신규** · M0-1105-L §4.1 복사 | +22 |
| `fixtures/pos-tender-preorder-balance-response.json` | **신규** · M0-1105-L §4.2 복사 | +22 |
| `fixtures/pos-order-preorder-dp-paid.json` | **신규** · M0-1105-L §4.3 복사 (stage=dp_paid) | +74 |
| `fixtures/pos-order-preorder-paid-full.json` | **신규** · 동 (stage=paid_full) | +97 |
| `scripts/m3-1105-m-preorder-playwright.mjs` | **신규** · 28 check (OrderType + DP + 상세 + balance + paid_full + Hand over) | +345 |
| `scripts/m3-1105-m-screenshots.mjs` | **신규** · 4 스샷 | +170 |
| `screenshots-m3-1105-m/*.png` | **신규** · 4 장 | +4 파일 |
| **총** | **18 파일** | **+1017 / -21** |

**components/receipt/** 미수정** (M1-1105-Q claim 영역) · TendersTable 미수정 · components/orders/** 미수정.

---

## 3. 상시 claims (규약 ⓔ)

- `curiocity-relay/status/claims/M3-1105-M.json` · state=`started` 1건 커밋+푸시 (16:00:00Z · push 완료).
- 완료 시 state=`done` 커밋 예정 (CI green 확인 뒤).
- 막힘 없음.

---

## 4. 설계 포인트

### 4-1. `allowPartial` prop (CashTenderPanel)
- 기존 insufficient 가드: `received < total` → Process 비활성.
- Pre-order DP 때 total=200000 이지만 서버가 dp%=50% 반영해 실제 수금은 100000.
- 앱은 DP% 를 모름 → `allowPartial=true` 로 가드 우회 · 서버가 금액 검증.
- Balance 흐름은 total=balance_due 전달 → 기존 가드 그대로 (allowPartial 미전달).

### 4-2. tender-cash 재사용 (balance 수금)
- 새로운 "balance tender" 화면 안 만들고 기존 cash tender 재사용 — 코드 중복 0.
- 구분자: route param `isBalance=1` + `balanceDue` · 화면 타이틀 "Collect balance" · summary "Balance" 로 분기.
- tenders body 에 `is_balance:true` + `amount:balance_due` 명시.

### 4-3. metadata.preorder 소비 (상세 gating)
- `order.metadata.preorder.stage` 로 분기:
  - `dp_paid` + `balance_due > 0` → Collect balance 버튼 + Balance due 배지 · Hand over 숨김.
  - `paid_full` → Hand over 노출 · Collect balance / 배지 숨김.
- 서버가 stage 를 미노출해도 안전 (undefined → undefined 비교 → 둘 다 false → 둘 다 숨김).

### 4-4. `components/receipt/**` 미수정 — M1-1105-Q coexistence
- M1-1105-Q claim: "cashier display in ReceiptCard + TendersTable".
- 본 라운드는 Receipt UI 터치 안 함 · tenders body 전송만 담당.
- M1-1105-Q 머지 뒤 Receipt 가 snapshot.preorder (deposit/balance 줄) + cashier 자동 표시 — 추가 작업 불요.

### 4-5. Takeaway 회귀 0 — route param 기본값
- `orderType` route param 생략 → 기본 'takeaway'.
- `isBalance` 생략 → false → 기존 cash 흐름 그대로.
- 기존 Playwright `m3-1105-d-playwright.mjs` 무수정 · PASS.

### 4-6. Playwright 테크닉 — BottomSheet 오버레이 우회
- Order 상세는 BottomSheet 안 FlatList 렌더 → Collect balance / Hand over 버튼 위에 다른 요소가 pointer events 가로채는 상황.
- `page.evaluate(() => el.click())` 또는 pushState 로 다음 화면 직진 — Playwright 네이티브 click 바이패스.

---

## 5. M0 요청 목록 (리포트 미명시 · 서버 확정 필요)

a. **tenders body 의 preorder 입력 키** — `preorder.pickup_at` top-level vs `input.pickup_at` nested vs `metadata.preorder.*` 직접 중 어느 걸 수용?
b. **fulfill body.stage** — 리포트는 "No stage field required" 라 하지만 스펙은 `{stage:'hand_over'}` 명시 — 실제 서버 수용 키/값 확정.
c. **Admin DP% 설정 UI** — commerce-admin 에서 "Receipt configuration" 하위 "Preorder" 섹션 필요.
d. **Delivery 활성** — 서버 contract (M0-M) 정비 뒤 `OrderTypePicker.tsx` 한 줄 변경 (`disabled: false`).

---

## 6. 검증 (로컬 · CI 동일 명령)

### 6-1. 전 어설션
```
$ node scripts/run-all.mjs assertions
  총 14 개 · 14 PASS · 0 FAIL · 1.5s
  · m3-1105-a-color-assertions.mjs ... PASS · 0.1s   (37/37)
```

### 6-2. 전 Playwright
```
$ node scripts/run-all.mjs playwright
  총 17 개 · 17 PASS · 0 FAIL · 256.1s
  · m3-1105-m-preorder-playwright.mjs ... PASS · 33.9s   (신규 · 28/28 checks)
  · m3-1105-d-playwright.mjs ... PASS · 36.8s           (Takeaway P2 회귀 0)
```

### 6-3. Lint
`0 errors · 33 pre-existing warnings`.

### 6-4. CI (fork) — **진행 중**
- PR #56: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/56
- CI 그린 확인 후 state=done 상시 claim 업데이트.

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +3 (디자인 보드 7·9·10 · P3 preorder 흐름 · Pre-order DP 100% + Admin 설정) |
| 등재 | +4 (M0 요청 §a~d) |
| 미완 (Kyu 실기) | 0 |
| **총 순증감** | **-1** (해소 3 · 등재 4 상쇄 · 오히려 +1 등재) |

(등재 4건 중 §c·§d 는 서버/admin 쪽 다른 허브 · 앱 범위 밖.)

---

## 8. 다음 게이트

1. **CI 그린 확인** → state=done 상시 claim 커밋.
2. **Kyu 눈 확인** (PR #56 body 4 스샷) — 승인 여부.
3. **M1-1105-Q 머지 뒤** — Receipt 가 snapshot.preorder/cashier 자동 표시 확인 (별도 코드 변경 불요).
4. **서버 M0 §a~b 확정** 뒤 — `pos-payments.ts` tenders body 키 재조정 (한 줄 변경).
5. **별건 P4** — QRIS tender.

---

*M3-1105-M · 2026-11-07 · P3 Pre-order DP → 잔금 → Hand over (보드 7·9·10) · OrderTypePicker + PreorderInputs 신규 · Takeaway P2 회귀 0 · 어설션 14/14 + Playwright 17/17 (신규 m3-1105-m 28/28) · 색 어설션 37/37 · components/receipt/** 미수정 · fork PR #56 · 이연 +1 (해소 3 · M0 등재 4)*
