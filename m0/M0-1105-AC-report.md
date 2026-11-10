# M0-1105-AC — 품목 수량 단위 부분 환불 + 재고 되돌리기 (서버 2차)

**claim**: started 2026-11-10 09:22 UTC · runner-v6.4 · model=opus
**PR**: https://github.com/CuriocityDevAi/storeport/pull/208 (stacked · base = `feat/m0-1105-ab-void-refund-pin` = #207)
**branch · HEAD**: `feat/m0-1105-ac-return-partial` · `ee3770b`
**origin**: 원격 push 완료 (origin/feat/m0-1105-ac-return-partial)

---

## §0 대사표 (코어 / 우회 / 신규)

| 기능                                   | 상태  | 어떻게                                                                                                                                 |
| -------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `refundPaymentWorkflow` (부분 amount)  | 코어  | `amount` 를 서버가 계산해서 그대로 입력. 이미 refund row 가 쌓이므로 다음 호출에서 자연스레 차감 추적.                                 |
| `createAndCompleteReturnOrderWorkflow` | 우회  | 코어 workflow 가 `return_shipping.option_id` 를 강제 (shipping option 없는 POS 매장 환불에 부적합). 대신 refund + adjustInventory 조합 |
| 수량 검증 · 중복 해시                  | 신규  | `metadata.returns = [{id, hash, items[], amount, ...}]` 로 추적                                                                        |
| 재고 +qty 복귀                         | 우회  | `inventoryModule.adjustInventory(inv_id, loc, +qty)` · fulfill 역방향 · `metadata.inventory_item_id` 힌트 재사용                       |
| PIN · 수단 규칙 · Cash Movement        | 재사용 | #207 의 `verifyManagerPin` (helper) + `REGISTER_SESSION_MODULE.createCashMovements` + `RECEIPT_MODULE.buildSnapshot/createReceiptForOrder` 그대로                    |

## 건드린 파일

1. **신규** `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` — POST `/admin/pos/orders/:id/return`
2. `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — M0-1105-AC describe (6 scenarios · #51~#56) 추가
3. `apps/commerce-core/integration-tests/pos/fixtures/m0-1105-ac.*.json` — 6 fixtures:
   - `return-partial-cash.{request,response}.json`
   - `return-card_terminal.{request,response}.json`
   - `return-over_quantity.400.response.json`
   - `return-duplicate.409.response.json`
4. `docs/feature-map.yaml` — `commerce-core.pos-void-refund` summary 에 return route 한 줄 추가

**금지 파일** (ticket §3) 미변경 확인: `fulfill/**` · `tenders/route.ts` (#206) 그대로.

## 계약 요약

- **Request**: `POST /admin/pos/orders/:id/return` body = `{items:[{line_item_id, quantity}], method:'card_terminal'|'cash', terminal_approval_code?, manager_pin?, reason?, register_session_id?}`
- **환불 금액**: 서버가 line_total × (반품qty / 구매qty) 로 line 단위 `Math.round` · 합산 ("% round" · Kyu 11-10 결정 · 할인·PB1·SC 비율 자연 배분)
- **재고 복귀**: 원주문 `metadata.stock_location_id` + line 의 `metadata.inventory_item_id` 로 `adjustInventory(+qty)`
- **응답**: `{ok, order_id, return_id, items[{line_item_id, quantity, amount}], refunded_amount, receipt_id, receipt_no, cash_movement_id?, open_drawer, inventory_restored, method}`
- **에러**: 400 (body/수량초과/payment없음) · 401 PIN mismatch · 404 order not found · 409 (중복해시/전액초과환불) · 423 PIN locked

## 선택지 3 줄 (PR 본문 포함)

1. **(권장)** 품목 수량 단위 · metadata.returns[] 해시 추적 · 재고 복귀는 inventory_item_id 힌트 기반 — Kyu Q5 결정 그대로.
2. 금액 단위 환불 병행 (`/refund` 전액 + 금액 입력) — Kyu 11-10 결정에서 B(품목) 채택 · **미채택**.
3. 코어 `createAndCompleteReturnOrderWorkflow` 그대로 사용 — shipping option 강제 때문에 POS 적용 불가 · 우회 필요.

## CI 상태

- `ci.yml` 트리거 조건: `pull_request: branches: [main]`. 이 PR 의 base = `feat/m0-1105-ab-void-refund-pin` (#207) → **CI 자동 미발화**. 이는 stacked PR 의 구조적 특성.
- 로컬 `pnpm tsc --noEmit` apps/commerce-core → **EXIT=0** (typecheck 통과).
- 로컬 lint-staged 통과 (prettier · 5 suites · 33 tests passed).
- `scripts/naming-check.sh` 통과.
- `node scripts/feature-map-check.mjs --diff <files>` → matched=3 unmatched=0.
- **CI pos-integration 초록은 #207 머지 뒤 이 PR 이 main 으로 재타겟팅되는 시점에 자동 발화** · 그 전까지는 로컬 typecheck + 규약 체크로 품질 가드.

## 남은 항목

- **나눠 결제 2 tender** → #206 (tenders refactor) 머지 뒤 별도 라운드.
- **M3 앱 Return UI** (품목 선택 + 수량 + 사유) → 서버 fixture 뒤.
- **M2 프린터** 반품 영수증 워터마크 (kind=refund).
- #207 리뷰 CHANGES 수신 시 이 브랜치 rebase 후 push 재발의.

## 착지 명령 (relay)

```bash
cp /tmp/M0-1105-AC-report.md ~/projects/curiocity-relay/m0/ \
  && cd ~/projects/curiocity-relay \
  && git add m0/M0-1105-AC-report.md \
  && git commit -m "m0: M0-1105-AC" \
  && git pull --rebase --autostash origin main \
  && git push
```
