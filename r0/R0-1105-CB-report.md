# R0-1105-CB 리포트 — Void·재고 돌림 (storeport #221 + fork #98 묶음 리뷰)

**서버 #221 (M0-1105-AR · Void·refund·restock·pos_totals) — APPROVE**  
**앱 #98 (M3-1105-AW · 재고·PIN·restock·Payments Type·토스트·VOID 검정) — APPROVE**

작성: 2026-11-12 WIB · 리뷰어 R0 · 코드 수정 0. 머지는 Kyu 결정.

---

## 1. 검증 표 (file:line)

### 서버 #221 — `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts`

| 요구 | 구현 지점 | 결과 |
|------|-----------|------|
| 1 · 1a Reserved +1 제거 (완결·미완결 두 경로) | `void/route.ts:402-416` (`cancelPosOrderFulfillment` for `pendingFulfills`) + `void/route.ts:512-544` (1c · `inventoryModule.listReservationItems({line_item_id}) → deleteReservationItems(resIds)`) | ✓ 두 경로 동일 — 본 주문 line_item 에 걸린 reservation 만 선택적으로 삭제. 다른 주문 예약 안 건드림 (line_item_id 필터). spec `#AR-1` postVoid Reserved=11 (사전 11 stale 유지). |
| 2 · 결제별 refund 전액 기록 (SC·PB1 포함 · split 2-tender 모두) | `void/route.ts:314-388` (각 payment `refundPaymentWorkflow({payment_id, amount=refundable, note="void[:reason]"})`) · `void/route.ts:354-358` (refundable = captured − alreadyRefunded) | ✓ SC/PB1 은 PaymentCollection.amount 에 이미 반영 → payment.amount=33,000 전액 refund. split 은 각 payment 순회 (spec `#AR-5` refund 2건 합 33k). |
| 2 · payment_status = refunded | `void/route.ts:493-510` (`orderModule.cancel()` 만 호출 · `cancelPaymentCollection` 미경유 → payment.canceled_at null → Medusa derive = refunded) | ✓ spec `#AR-1` Admin `/orders/:id?fields=…,payment_status` = `"refunded"`. |
| 2 · 이중 제출·재시도 이중 환불 0 | `void/route.ts:169-176` (status=canceled → 409 가드) + `void/route.ts:375-381` (코어 "refund more than / refunded.*captured / not allowed" catch → idempotent skip) + `void/route.ts:493-499` (refreshed status 체크 뒤 cancel) | ✓ 2차 요청은 409 또는 skip. spec 은 명시적 이중 호출 케이스 미포함(지적 아님 · 기존 cancel 가드로 충분). |
| 2 · 기존 현금 서랍 · metadata.void 유지 · 카드 승인번호 보존 | `void/route.ts:546-607` (cash_movement adjustment −금액) · `void/route.ts:709-745` (metadata.void = {at, method, tenders, actor_id, reason, terminal_approval_code, receipt_id, receipt_no, cash_movement_id, refunded_amount, refunds, restocked, wasted_items}) | ✓ `originApprovalCode` 보존 · 기존 metadata 와 머지. |
| 2 · refund note void/refund 구분 | `void/route.ts:338` (`refundNote = body.reason ? "void:${body.reason}" : "void"`) | ✓ 앱 extractTenders 가 `note.includes('void')` 로 type 분기. |
| 3 · restock 필수 (건넨 주문) · false 폐기 기록 | `void/route.ts:302-312` (hadFulfillment && restock≠boolean → 400 `restock_required`) + `void/route.ts:424-479` (restock=false → `adjustInventory(-qty)` 상쇄 + `wasted_items[]`) | ✓ spec `#AR-2` wasted_items=[{qty:1}] · `#AR-3` 400 · 변화 0 · `#AR-4` 미건넨 주문은 restock 생략 OK. |
| 4 · metadata.pos_totals 저장 · 기존 주문 호환 | `tenders/route.ts:533-553` (`pos_totals = {subtotal, service_charge, pb1, grand_total, sc_pct, pb1_pct}`) + 앱 orderId.tsx:215 `(orderMd.pos_totals ?? null)` 옵셔널 fallback | ✓ spec `#AR-1` `tenderMd.pos_totals.grand_total=33000`. 기존 주문(필드 없음)은 앱이 `grandTotal = posTotals?.grand_total ?? order.total` 로 수렴. |
| 5 · 운영 모양 시드 + 수정 전 실패/후 성공 · 기존 약화 0 | `integration-tests/pos/void-refund-restock.spec.ts:106-245` (variant↔inventory link via `link.create`, 사전 reservation 11, line_item.metadata.inventory_item_id 힌트) · `#AR-1`~`#AR-6` | ✓ 운영 Order #66 모양 재현. 로컬 2회 6/6 PASS (리포트 로그). 기존 `tenders.spec` 는 수정 없음. CI 위임. |

### 앱 #98 — fork

| 요구 | 구현 지점 | 결과 |
|------|-----------|------|
| 6 · 서버 fixture/계약과 값·이름 일치 | `api/hooks/pos-orders.ts:70-166` (payments[].refunds[] 순회 · `note` 로 void/refund · fallback=`metadata.void`) · `lib/refund-rules.ts` `RefundRequestBody.restock?: boolean` · `components/orders/VoidRefundSheet.tsx:247-263` (`buildRefundBody({..., restock})`) | ✓ 서버 응답 restock/refunds[]/note/pos_totals/restocked 와 1:1 일치. fixture 3종(`pos-void-restock-200.json`/`400.json`/`pos-order-payments-refunds.json`) 추가. |
| 7 · Available 우선 (옵션별) | `lib/inventory.ts:25-35` (`available_quantity` 우선 · 없으면 `inventory_quantity`) + `api/hooks/products.ts:117-136` (`useVariantAvailableQty` → `/admin/inventory-items?variant_id=&fields=location_levels.*`) + `app/product-details.tsx:143,149-152` (`computeInventoryStatus([{...selectedVariant, available_quantity: query.data}])`) | ✓ Hot/Iced 합산 버그 해소 · selectedVariant 1개만. |
| 7 · PIN 자동 확인 · Verify 제거 · 중복 제출 0 | `components/orders/VoidRefundSheet.tsx:477-487` (`DigitsInput onComplete=(v) ⇒ if valid onSubmitPin(v)`) · Verify 버튼 부재 (`scripts/m3-1105-aw-assertions.mjs` R9) · `components/orders/ManagerPinSheet.tsx:120-134` 동일 | ✓ 4자리 즉시 submit · state 경합 override 적용. |
| 7 · Return to stock / Wasted 단계 (건넨 주문만 · Modal 중첩 없음) · 토스트 | `VoidRefundSheet.tsx:40` (`SheetStep='confirm'|'pin'|'restock'`) · `:302-318` (PIN 성공 후 void+handedOver 이면 `step='restock'` · 아니면 submit) · `:497-513` (restock-sheet 안의 Button 2개) · `:222-231` (toast `Order voided · IDR N refunded (Method)`) | ✓ 같은 BottomSheet 안 단계 전환. handedOver 판단 = `md.fulfillment_stage === 'hand_over'` (`orderId.tsx:873`). |
| 7 · Void 뒤 Reprint·Share·Done 만 | `app/orders/[orderId].tsx:669` (`isVoidedOrCanceled`) · `:796-840` (조건 렌더: Done + 나머지 액션 모두 `!isVoidedOrCanceled` 가드) | ✓ Hand over/Collect/Fulfill/Void 모두 숨김 → Reprint·Share·Done. |
| 7 · Payments 표 Method·Type·Amount·Reference·Status·Time + 원결제 Failed 안 됨 | `components/orders/TendersTable.tsx:80-105` 헤더 7열 (Method·Type·Amount·Reference·[Cashier]·Status·Time) + `pos-orders.ts:107-108` (sale status = `p.captured_at ? 'captured' : 'authorized'`, canceled_at 무관) · `statusTone.captured.label='Paid'` · `statusTone.refunded.label='Refunded'` | ✓ Type 열 추가 (Sale/Void/Refund) · 원결제 Paid 유지 · Void 역방향 refunded 행 합성. |
| 7 · Total/Outstanding(−3,000 사라짐) · VOID 검정 | `orderId.tsx:376-395` (`!isVoidedOrder`일 때만 Outstanding 표시 · `grandTotal − paidTotal` = 0 for 33k/33k) · `orderId.tsx:320-348` (SC/PB1 행) · `components/receipt/ReceiptCard.tsx:176` (`refundBanner==='VOID' ? 'text-ink' : 'text-danger'`) | ✓ posTotals.grand_total 반영 → Outstanding 0 · void 시 숨김 · VOID 글자 검정 (REFUND 는 빨강 유지). |
| 8 · 충돌·배포 순서 | fork #99 (머지됨) 파일집합(app/checkout/split-tender, CardTenderPanel, CashTenderPanel, _layout, scripts)과 #98 파일집합 겹침 0 — `git merge-tree <base> #98 master` conflict 라인 없음 | ✓ 머지 충돌 없음. 배포 순서 — **앱 #98 먼저 → 서버 #221** 권장 (아래 §3). |
| 9 · 증거 커밋 | `git ls-tree` → `scripts/m3-1105-aw-assertions.mjs`, `fixtures/pos-void-restock-200.json`, `fixtures/pos-void-restock-400.json`, `fixtures/pos-order-payments-refunds.json` 커밋됨 · 서버는 fixtures 6종 + spec | 어설션·fixture ✓. **스샷 없음** (`screenshots-m3-1105-aw/` 폴더 부재) — 지적 아래 §5. |

---

## 2. 기대 숫자 대조 (운영 재현 · PB1 10% · Hot 사전 예약 11)

| 상태 | Reserved | In stock | Available | 서버 PASS | 앱 표시 근거 |
|------|---------|---------|-----------|-----------|--------------|
| 판매 전 | 11 | 100 | 89 | spec `#AR-1 preSale` (seed 후 draft reservation 포함 12/100/88 로 표기, 주문 reservation 제외 시 11/100/89 이 "판매 전") | product-details `useVariantAvailableQty` 합산 |
| 현금 33,000 + Hand over 후 | 11 | 99 | 88 | spec `#AR-1 postFulfill` 100→99 · reserved=11 (주문 reservation 소진) | 좌동 |
| Void(restock=true) 후 | 11 | 100 | 89 | spec `#AR-1 postVoid` stocked=100, reserved=11 (R3 fix) | restock=true body 전달 |
| Void(restock=false) 후 | 11 | 99 | 88 | spec `#AR-2 postVoid` stocked=99 (adjustInventory(-1) 로 fulfillment 복원분 상쇄) · wasted_items=[{qty:1}] | Not returned · Wasted 버튼 |

Refund 합계 세금 포함 33,000 (spec `#AR-1` `voidRes.data.refunded_amount=33000`, `metadata.void.refunded_amount=33000`, `payment.refunds[0].raw_amount=33000`) · split 2-tender 합 33,000=13k+20k (spec `#AR-5`). 모두 PASS.

---

## 3. 머지·배포 순서

**머지 순서**: 둘 다 APPROVE이지만 서버 계약(`metadata.pos_totals`·`payments[].refunds[]`·`restock` 필수)이 앱의 옵셔널 경로를 깨지 않으므로 어느 쪽이 먼저 머지되어도 머지 자체 충돌 없음. fork #99 (머지됨)과 파일 집합 겹침 0.

**배포 순서** (운영 기동): **앱 #98 → 서버 #221** 권장.

이유 — 서버 #221 이 먼저 올라가면 `hadFulfillment=true` 인 주문 Void 요청에 `body.restock` 이 없는 옛 앱은 400 `restock_required` 를 받아 **Void 가 깨진다** (`void/route.ts:303`). 역방향 (앱 먼저) 은:
- 새 앱이 restock 필드를 보내도 옛 서버는 body 미사용 필드로 무시 → 그대로 작동 (현 운영 void 동작 유지).
- metadata.pos_totals 없어도 앱이 `?? order.total` fallback → Outstanding −3,000 다시 보이지만 Void 는 가능.
- 서버 배포 즉시 restock 질문·pos_totals 반영 전면 활성화.

Ledger 결정 (A안 restock) 상 "Hand over 된 주문은 반드시 묻는다" 가 하드룰 → 서버 400 은 올바른 계약이지만 옛 앱 호환성 때문에 배포 창이 겹치면 안 됨. OTA 가능하면 앱 OTA 선행 · 서버 배포 후속.

---

## 4. Kyu 실기 항목 (쉬운 말)

1. **주문 1개 만들고 현금 33,000 받고 건넨다 → Void 버튼 눌러 PIN 4자리** 입력하면 Verify 버튼 안 눌러도 바로 "Return to stock? / Not returned · Wasted" 가 같은 시트 안에서 뜬다. Modal 2중 아님.
2. **Return to stock 선택** → 토스트 "Order voided · IDR 33,000 refunded (Cash)" + 서랍 안내 → Admin inventory Reserved 11 / In stock 100 / Available 89.
3. **Not returned 선택** → 재고 그대로 (Reserved 11 / In stock 99 / Available 88) + `metadata.void.wasted_items[0].quantity=1` 기록.
4. **주문 상세 화면**: Order Status=Canceled · Payment Status=**Paid** 대신 **Refunded** (Captured 안 보임) · Fulfillment Status=Canceled.
5. **Payments 표**: Method · Type · Amount · Reference · Status · Time. 원결제 줄 = Cash / Sale / 33,000 / — / **Paid** / 시각. Void 줄 = Cash / Void / −33,000 / — / **Refunded** / 시각. 원결제 줄이 "Failed" 로 안 바뀜.
6. **Total/Outstanding**: Outstanding Amount 행이 사라짐 (voided 가드). Paid Total=33,000 · Grand(= pos_totals.grand_total)=33,000.
7. **영수증**: 상단 "VOID" 배너 검정 (REFUND 는 기존 빨강 유지).
8. **하단 액션 버튼**: Reprint · Share · **Done** 만. Hand over 버튼 사라짐. Done 누르면 목록으로.
9. **Hot/Iced 품목 상세**: Hot 누르면 Hot Available (In stock − Reserved) · Iced 누르면 Iced Available. 전처럼 189 합산 아님.

---

## 5. 이연 순증감

- **+1 이연 (기존)**: PB1·SC 를 Medusa `order.total` 에 fee/tax line item 으로 반영 (R6 2차 · AR 범위 밖 · 서버 PR 본문·AZ 진단에서 이미 포인팅). 이번 R0-CB 추가 신규 이연 없음.
- **+1 이연 (신규 지적)**: **R0-CB 스샷 미첨부** — fork #98 에 `screenshots-m3-1105-aw/` 폴더 없음. Void·restock·Payments Type·Done 버튼 등 UI 변경 스샷은 Kyu 실기 때 생성 후 다음 라운드 커밋 권장 (M3-AW 자체는 assertion 53/53 로 PASS · 본 리뷰 블로커 아님).
- **+0 지적 (수용 가능 · 비 블로커)**:
  - `components/orders/ManagerPinSheet.tsx` 가 어디서도 import 되지 않음 (VoidRefundSheet 안에 inline PIN step 으로 통합됨) — dead code 가능성 · assertion 호환 때문에 유지된 듯. 다음 라운드 정리 후보.
  - 앱 `handedOver = md.fulfillment_stage === 'hand_over'` vs 서버 `hadFulfillment = pendingFulfills.length > 0` — 두 기준 불일치 가능성 (운영 /fulfill 이 항상 `metadata.fulfillment_stage='hand_over'` 세팅 전제). 서버 400 가드가 safety net 역할이므로 수용.
  - 어설션 호환 패치(`m3-1105-aj/an/x`) 는 Verify 제거·restock step 추가로 인한 요구사항 변경 반영 → 약화 아님 · 정당.

---

## 6. 처리 결과

- 서버 PR #221 · 리뷰 코멘트 1건 (APPROVE 요약 · 줄 단위 없음).
- 앱 PR #98 · 리뷰 코멘트 1건 (APPROVE 요약 · 줄 단위 없음).
- 머지 금지 (Kyu 결정).

---

## 7. 착지 명령

```bash
cp /tmp/R0-1105-CB-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CB-report.md && git commit -m "r0: R0-1105-CB" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CB done "<#221 APPROVE · #98 APPROVE · 배포 순서 앱→서버 권장>"
```
