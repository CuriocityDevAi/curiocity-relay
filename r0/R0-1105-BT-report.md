# R0-1105-BT 리포트 — storeport #218 운영 Void 출고 취소 · fork #91 재리뷰

## 판정
- **(A) storeport #218 (M2-1105-AP)** — **APPROVE** (머지는 Kyu · 돈 관련).
- **(B) fork #91 (M3-1105-AS)** — **CHANGES** (AR rebase 뒤 AL/AN/AM/AR 어설션 스크립트 stale · 총 15건 fail · 재서명 필요).

---

## (A) storeport #218 — APPROVE

### A.1 원인 — node_modules 소스 직접 확인 (file:line)
`@medusajs/core-flows@2.17.2/dist/order/workflows/cancel-order-fulfillment.js:85-86`

```js
if (iitems?.length) {
  const iitem = iitems.find((i) => i.inventory.id === fitem.inventory_item_id); // :85
  quantity = utils_1.MathBN.div(quantity, iitem.required_quantity);             // :86 ← 크래시
}
```
- `iitems` = `orderItem.variant.manage_inventory ? orderItem.variant.inventory_items : undefined` (line 71-72).
- 운영 상품 `variant.manage_inventory=true` + variant↔inventory_item 링크 ⇒ `iitems.length > 0`.
- POS polyfill fulfillment (`fulfill/route.ts:502-562` + 공용 builder `fulfillment-items.ts`) 는 `line_item.metadata.inventory_item_id` 가 없으면 `FulfillmentItem.inventory_item_id=null` 로 저장. 운영 POS P2 흐름은 이 metadata 힌트를 심지 않음.
- 따라서 `iitems.find(i => i.inventory.id === null)` ⇒ `undefined` ⇒ `.required_quantity` 접근 TypeError. **운영 재현 조건 완전 일치 (Kyu 22:39 토스트와 동일 문구).**

과거 시드가 통과한 이유: `createTestOrder` 가 raw `orderModule.createOrders` 로 variant_id 없이 line 을 만들어 `variant=null → iitems?.length=0` → 85-86 건너뜀. **#82 가 처음으로 운영 모양을 시드.**

### A.2 "삼단" 반쪽 상태 · 멱등 판정

PR 추가분 `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-cancel.ts`:

| 단계 | 호출 | 실패 처리 | 멱등성 |
|---|---|---|---|
| **사전 가드** | `ful.canceled_at` 선반환 (L136) · `ful.shipped_at` throw (L139) | — | ✅ 두 번 눌러도 선반환 |
| **(a) 재고 되돌림** | `inventoryModule.adjustInventory(+qty)` (L175) | try/catch non-fatal | ⚠️ `ful.canceled_at` 가 (c) 이전에 세팅 안 되므로, (b)/(c) 실패 후 재시도에서 inv_id 힌트가 있으면 adjust 재호출 → +q 더 추가 가능 |
| **(b) order 상태** | `orderModule.cancelFulfillment` (L193) | throw → 호출자 400 | ⚠️ 이미 `fulfilled_quantity=0` 상태에서 재호출 → `confirmOrderChange` 가 재실행되는지 Medusa 거동 미확인. 안전한 재호출 보장 없음 |
| **(c) fulfillment 행** | `fulfillmentModule.cancelFulfillment(id)` (L201) | throw → 호출자 400 | ✅ (b) 가 지나갔으면 재시도 시 `ful.canceled_at` 가 세팅된 상태라면 선반환 |

**운영 시나리오 (`inv_id=null` · hints 없음) 한정** — (a) 는 skip, (b)·(c) 만 돈다. (a) 가 no-op 이므로 재시도 시 double-recovery 없음. **반쪽 상태 자체가 발생하지 않는 데이터 모양 (`inv_id=null` 이면 fulfill 때도 adjustInventory(-qty) 를 못 쳤음 · `fulfill/route.ts:439-472` 가드)** 이라 #82 가 `stocked=10` 으로 단정하는 근거가 유효.

**비운영 시나리오 (inv_id 힌트 있는데 variant mismatch)** — 가상 경로. (a) 실행 후 (b) 실패 → 재시도 시 `ful.canceled_at` 가 null 이므로 **(a) 재실행 → 재고 +q 중복 가능**. 현 PR 본문도 "세 단계가 모두 성공해야 반쪽 상태가 안 남는다"로 이 제약을 명시. 운영 모양은 아니므로 **(A) APPROVE 블로커 아님** — 대신 Kyu/오케에 노트 전달 (하단 A.4 근본 수정).

### A.3 재고 복귀가 정확히 1회인지 — fulfill 차감 경로 대조

| 조건 | fulfill `-qty` (route.ts) | void safe-fallback `+qty` (helper) |
|---|---|---|
| `metadata.inventory_item_id` 있음 · `manage_inventory=true` | L439-472 adjustInventory(-qty) 실행 | L172-180 adjustInventory(+qty) 실행 → **대칭 복귀 1회** |
| `metadata.inventory_item_id` **없음** + `manage_inventory=true` (운영 조건) | hint 없어 adjust **안 침** (`stockAlreadyDeducted=false` · 그러나 L451 `inv_id=metadata?.inv_id` 이 falsy 라서 inner if 미진입) | `fi.inventory_item_id=null` + `oi.metadata.inv_id=null` → adjust **안 침** · **대칭 유지** |
| `manage_inventory=false` | `iitems=[]` → workflow 안전 분기 (크래시 안 함) | `willCrash=false` → core workflow 경로 |

**결론**: 운영 데이터(=hint 없음)에서 fulfill 때 재고 미차감 · void 때도 재고 미복귀 → **재고 정합**. #82 어설션 `expect(stocked).toBe(10)` 가 이 정합을 포착. "복귀하면 재고가 늘어나는 버그" 는 발생하지 않음.

### A.4 근본 수정 의견 (오케 M0 진단 발부 예정 — 의견만)
`fulfill/route.ts` polyfill 생성 시 `line_item.metadata.inventory_item_id` 가 비어 있으면 `line_item.variant.inventory_items[0].inventory.id` 를 **채워서** `FulfillmentItem.inventory_item_id` 에 세팅하는 게 맞음. 이렇게 하면:
1. core workflow `cancelOrderFulfillmentWorkflow` 가 85-86 에서 undefined 안 터짐 (willCrash=false 상시).
2. fulfill 때 adjustInventory(-qty) 가 실제로 걸리고, void 때 workflow 가 inventory_level/reservation 을 공식 경로로 복귀.
3. 현재 "운영은 fulfill 때 재고 미차감 → void 때 reservation 만 소진" 이라는 정합 상태는 받아들여지지만 Admin 보고용 수치가 실재고와 불일치할 위험이 남음 — 긴 안목에선 polyfill 쪽 수정이 바람직.

### A.5 #82 · 기존 테스트 · CI

| 항목 | 결과 | 근거 |
|---|---|---|
| **#82** 운영 데이터와 같은 모양(variant 재고 링크 · 옵션) 수정 전 실패 / 후 성공 | ✅ | 테스트가 productModule.createProducts · inventoryModule.createInventoryItems · link.create 로 운영 조건 구성 · `preFulItemInvId` null 선확정 · void 200 + canceled_at + stocked 복귀 정합 |
| **#61·#62** 기존 M1-1105-AS | ✅ | CI 로그 `✓ #61 (M1-1105-AS) POST /fulfill 뒤 void → fulfillment 취소 ... 698ms` · `✓ #62 shipped fulfillment → void 400 611ms` |
| **p6-e2e** | ✅ | tenders.spec 88/88 · unit-commerce-core 43/43 (p6-e2e 는 tenders.spec 안에 `P6` 태그 포함, 전건 통과) |
| **CI — pos-integration** | ✅ pass 2m40s | run 43053237679 · 88 total · 73 skipped (SKIP_MODE) · 15 실행 중 M0-1105-AB subset 통과 |
| **CI — unit-commerce-core** | ✅ pass 56s | 6 suites · 43 tests |
| **CI — markers-and-forbidden · check · changes-filter** | ✅ pass | 전부 green |
| **docker-smoke** (anchor/commerce-core/wing/care-agent) | skipping | changes-filter 가 상관없다고 판정 — 정상 |

### A.6 (A) 결론
- 코어 85-86 크래시 원인 · 재현 · fallback 삼단 · 운영 시나리오 대칭 재고 1회 정합 — **운영 Void 가 다시 돈다**. 운영 모양에서 double-recovery 없음.
- 트랜잭션/보상 없이도 (a) 가 no-op 이라 반쪽 상태 자체가 발생 안 함.
- 돈 관련 PR이라 머지는 Kyu. R0 판정: **APPROVE**. PR 코멘트는 일반 코멘트로.

---

## (B) fork #91 — CHANGES (AR 뒤 어설션 스크립트 stale)

### B.1 BN/BQ 지적 확인
| BQ 지적 | 상태 | 근거 |
|---|---|---|
| C1 — `screenshots-m3-1105-ao/` 3장 git tree 존재 | ✅ | `git ls-tree -r 991b7b0 screenshots-m3-1105-ao/` → `01-order-detail-banner.png` · `02-retry-sheet.png` · `03-after-retry-success.png` 3개 blob 확인 |
| C2 — `pos-refund-retry-423.json` + locked_until 어설션 | ✅ | fixture 커밋 · `m3-1105-ao-assertions.mjs` (8) status=423 · reason=locked · locked_until 파싱 5건 |
| BQ 신규 — `DigitsInput.tsx:45` prettier error | ✅ | `npx prettier --check components/ui/DigitsInput.tsx` (991b7b0) PASS |
| 기타 BN — RefundRetrySheet · VoidRefundSheet · 훅 계약 | ✅ | PIN=displayBoxes(L164) · 승인번호 6자리 DigitsInput(L186) · 500 refund_partial_failure → "Refund incomplete" (VoidRefundSheet.tsx:241) |

### B.2 "AS 재서명 범위" 공리 (`#95 위 rebase · displayBoxes · 승인번호 · 스샷 · prettier · 어설션`) 중 **어설션** 항목 fail

PR 991b7b0 에서 `scripts/m3-1105-*-assertions.mjs` 로컬 실행:

| 스크립트 | 결과 | 실패 유형 |
|---|---|---|
| `m3-1105-ao-assertions.mjs` (신규 · AO 계약) | ✅ **38/38 passed** | — |
| `m3-1105-ar-assertions.mjs` (master #95) | ❌ 23 passed · **1 failed** | (6a) `card-last4-input` 근처 `keyboardType="numeric"` 리터럴 사라짐 — DigitsInput 으로 교체돼 공용 상수 경로. |
| `m3-1105-an-assertions.mjs` (PR 91 과거 · AR 로 superseded) | ❌ 48 passed · **8 failed** | DigitsInput `maxLength={4}` · `slice(0, 4)` · `onComplete` 하드코딩 패턴 · VoidRefundSheet/ManagerPinSheet 의 `manager-pin-input` testID (현재 `manager-pin-digits` 로 리네임 · AR 이 displayBoxes 로 재구조) |
| `m3-1105-al-assertions.mjs` (PR 91 과거) | ❌ 30 passed · **5 failed** | 같은 뿌리 |
| `m3-1105-am-assertions.mjs` (PR 91 과거) | ❌ 37 passed · **1 failed** | 같은 뿌리 |
| `m3-1105-aj-assertions.mjs` | (실행 가능 · 세부 확인 생략) | — |

**뿌리**: #95 (AR) 가 master 에서 DigitsInput 를 `maxLength` 가변 + `displayBoxes` 모드로 일반화하면서, PR 91 이 자기 커밋에 추가한 AL/AM/AN 스크립트 안의 하드코딩 regex (`/maxLength=\{?4/` · `/slice\(0,\s*4\)/` · `/digits\.length\s*===\s*4/` · `testID="manager-pin-input"`) 가 전부 미스매치. AS 커밋(991b7b0) 은 displayBoxes + 스샷 + prettier 세 축만 다루고 어설션 재서명은 누락.

### B.3 CI 상태
| job | 상태 | 근거 |
|---|---|---|
| **lint** | ❌ fail 1m16s | run 43053666855 · 18개 prettier error · **전부 PR 91 밖 파일** (FulfillSheet.tsx · ReturnItemsPicker.tsx · DeliveryInputs.tsx · PreorderInputs.tsx · SuccessReceiptAnim.tsx · ReceiptCard.tsx · ColorPicker.tsx · OptionChip.tsx · QuantityPicker.tsx · success/[orderId].tsx) — 대부분 master 에 이미 깨져 있음 (`git show origin/master:components/orders/FulfillSheet.tsx` prettier --check FAIL). **PR 91 신규 파일은 전부 prettier clean.** |
| **assertions + playwright** | ⏳ in_progress | 리뷰 시점에 실행 중 (run 43053666445) |

### B.4 git ls-tree 스샷 (요청 사항)
```
100644 blob 59c16bd651a2cda786d20f41f82876ce404444c7	screenshots-m3-1105-ao/01-order-detail-banner.png
100644 blob f72581c2ab151fb59d6e0da252555ca280b4d627	screenshots-m3-1105-ao/02-retry-sheet.png
100644 blob 94170eedd60c59d2a9d350dc1f98bf540bd3d09c	screenshots-m3-1105-ao/03-after-retry-success.png
```
✅ 실제 존재.

### B.5 CHANGES 사유 (줄 단위 PR 코멘트에 올릴 것)

**C-AS-1 — AR rebase 후 AL/AM/AN assertion 스크립트 stale (총 14건 fail · 신규 1건)**
- `scripts/m3-1105-an-assertions.mjs` 8 fail · `scripts/m3-1105-al-assertions.mjs` 5 fail · `scripts/m3-1105-am-assertions.mjs` 1 fail. AR 가 master 에서 DigitsInput 를 일반화(displayBoxes · 가변 maxLength)했으므로, 이 세 스크립트는 (a) 전면 delete (AR 가 `m3-1105-ar-assertions.mjs` 로 대체 · master 에는 AL/AM/AN 없음) 하거나 (b) regex 를 AR 형태에 맞게 재서명 (`/maxLength\s*=\s*\{?\s*(maxLength|4)/` · testID `manager-pin-digits` · onComplete 호출 경로) 중 택1.

**C-AS-2 — `m3-1105-ar-assertions.mjs` (6a) fail — CardTenderPanel 의 card-last4 가 DigitsInput 으로 바뀌면서 `testID="card-last4-input"` 근처에 `keyboardType="numeric"` 리터럴이 사라짐**
- PR 91 이 직접 건드린 범위(`components/payment/CardTenderPanel.tsx`) 안의 변화로 master 어설션이 깨짐 → 재서명 필요. 선택: AR assertions 를 `DIGITS_INPUT_PROPS` 참조 확인으로 바꾸거나, DigitsInput 사용 시 기본으로 `keyboardType="numeric"` 이 적용됨을 증명하는 간접 assertion 으로 교체.

(lint CI fail 은 **PR 91 밖 파일** 로 CHANGES 사유 아님 — 별도 작업으로 pos-r0 측 prettier --write 가 필요. 이건 R0 판정 블로커로 삼지 않음.)

---

## 실행 로그 (요약)
- `cd ~/projects/storeport && gh pr view 218 --json ...` · `gh pr diff 218` · `cat node_modules/.../cancel-order-fulfillment.js` — 원인 라인 확정.
- `cd ~/projects/storeport && gh pr checks 218` · `gh run view 43053237679 --log` → pos-integration 88/88 pass · unit 43/43.
- `cd ~/projects/agilo-medusa-pos-fork && gh pr view 91 ...` · `git ls-tree -r 991b7b0 screenshots-m3-1105-ao/` · `npx prettier --check components/ui/DigitsInput.tsx` → PR 91 신규 파일 prettier clean · 스샷 3장 존재.
- `git worktree add /tmp/fork-pr91 991b7b0 && cd /tmp/fork-pr91 && node scripts/m3-1105-{ao,ar,an,al,am}-assertions.mjs` → ao 38/38 · ar 23/1 · an 48/8 · al 30/5 · am 37/1.
- lint CI log 분석 → 18 prettier error · 전부 PR 91 밖 파일 (master 로부터 상속된 깨짐).

## 이연 순증감
0 (신규 이연 없음 · 기존 BQ 지적 C1·C2·prettier 해소 확인 · AR rebase 어설션 재서명 미완 → PR 저자 몫 CHANGES).

---

## 착지 명령
```
cp /tmp/R0-1105-BT-report.md ~/projects/curiocity-relay/r0/
cd ~/projects/curiocity-relay
git add r0/R0-1105-BT-report.md
git commit -m "r0: R0-1105-BT"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs R0-1105-BT done "A=APPROVE(돈·Kyu 머지) · B=CHANGES(AR rebase 뒤 AL/AM/AN·AR 어설션 스크립트 stale 15건)"
```
