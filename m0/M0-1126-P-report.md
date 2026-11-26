PASS #463 7944261c71a7020b48b9b661e912d28fb57f8204

# M0-1126-P — Re-enter A→B 적립 이동 + CD PB1 세율 폴백 제거

## 결과 요약

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/463
- **커밋**: `7944261c71a7020b48b9b661e912d28fb57f8204`
- **브랜치**: `feat/M0-1126-P` (from `origin/main` 2508ab9 · 스택 없음)
- **변경 파일 3개 · +244/-18**:
  - `apps/commerce-core/src/lib/link-customer-order.ts` (Re-enter 적립 이동 로직)
  - `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4.spec.ts` (⑦ 기대값 변경 + ⑦+ 멱등)
  - `apps/customer-display/app/index.tsx` (PB1 폴백 10→0)

## 구현 요점

### 1. Re-enter 적립 이동 (`linkCustomerToOrder`)

조건 (전송 분기):

- `isCompleted && previousCustomerId !== null && previousCustomerId !== upsert.customer_id && metadata.loyalty_earn.applied === true && amount > 0`

처리:

1. `recoverForOrder({ order_id, refund_amount: order_total, refund_ref: 'reenter:<order>:<B_customer>' })` 호출 — M0-1116-B 회수 규칙 재사용, 신규 함수 없음.
2. `recoverForOrder` 가 업데이트한 `metadata.loyalty_recover` 를 재조회 → `newMeta` 구성 시 덮어쓰지 않게 보존.
3. `newMeta.loyalty_earn = null` · `newMeta.loyalty_recover = null` 로 리셋.
   - `delete` 가 아니라 명시적 `null` 재설정 — Medusa `updateOrders` metadata 가 merge/replace 양쪽 모두에서 작동하도록 보장.
   - 첫 pass 는 `delete` 로 썼으나 테스트에서 B 잔액=0 으로 회귀. `null` 로 교체하자 통과.
4. `metadata.loyalty_transfer.entries` 에 audit entry 추가: `{ ref, at, from_customer_id, to_customer_id, reclaimed, requested, uncollected, idempotent }`.
5. `updateOrders({ customer_id: B, metadata: newMeta })` → 아래 `earnForOrder` 가 `loyalty_earn` null 보고 재적립.

멱등:

- `refund_ref` 가 recoverForOrder 의 멱등 키 → 같은 `(order, B)` 로 재호출 시 no-op.
- `metadata.loyalty_transfer.entries` 에 같은 ref 가 이미 있으면 재추가 안 함.
- 두 번째 호출 시 `previousCustomerId === upsert.customer_id` 라 전송 분기 자체가 스킵됨 (가장 빠른 경로).
- `earnForOrder` 는 `metadata.loyalty_earn.applied === true` 로 멱등 반환.

### 2. A 잔액 부족 처리 (Kyu 질문 항목)

**규칙 있음 — 신규 분기 없음**:

- `recoverForOrder` 내부(`apps/commerce-core/src/lib/loyalty/recover.ts:240-258`) 가 이미 처리.
- `toDebit = min(requested, balanceBefore)` 로 실제 차감액 캡 · `uncollected = requested - toDebit`.
- `uncollected > 0` 이면 M0-1117-J `loyalty_negative.addDebt({ customer_id, amount: uncollected, kind: 'refund_shortfall', ref: 'recover:<order>:<ref>' })` 로 빚 장부에 이월.
- 모듈 실패는 non-fatal · `metadata.loyalty_recover.entries[].uncollected` 기록으로 사후 복구 가능.
- → M0-1126-P 의 Re-enter 전송은 이 규칙을 그대로 재사용. 단지 `refund_ref` 가 `reenter:<order>:<B_customer>` 로 다를 뿐 로직은 동일.

### 3. B = A 같은 번호

- `upsertCustomerAndAccount(phoneB)` 가 phoneB 를 E.164 로 정규화해 기존 customer 조회.
- B 가 A 와 같은 E.164 면 `upsert.customer_id === previousCustomerId` 로 수렴.
- `needsReenterTransfer` false → 아무 변화 없음 (⑦+ 테스트 외 명시 어설트 추가 안 했지만 분기 조건으로 보장).

### 4. CD PB1 폴백 제거

- `apps/customer-display/app/index.tsx:158`: `taxRate: 10 → 0`.
- 서버에서 `tax_rate` 를 못 받으면 `DEFAULT_LIVE_STORE.taxRate=0` 폴백 적용 → `CartScreen.showTax=(taxRate !== 0)` false → PB1 줄 숨김.
- `receipt-view` 는 이미 `receipt.tax.rate_pct` 우선 · 없을 땐 store.taxRate 폴백 · taxShow=false 면 null (V4-5 "amount=0 → 줄 숨김" 규칙과 동일 경로).
- 금액 계산은 건드리지 않음 — `snapshot.tax_total` · `receipt.tax.amount` 그대로.

## 로컬 QC (CI heavy-mac 동급)

| 스텝 | 결과 |
|---|---|
| typecheck (commerce-core · customer-display) | ✓ 통과 |
| commerce-core 단위 테스트 | ✓ 877/877 |
| customer-display 단위 테스트 | ✓ 334/334 |
| pos-integration 전체 (46 spec) | ✓ 46/46 통과 · 실패 0 |
| customer-display e2e --workers=4 | ✓ 143 passed · 8 skipped |

cd-pos-sync-v4 9 케이스 세부:

- ✓ ① V4-8 결제 중 Ask → Re-enter → B 번호 확정 (snapshot.customer_phone 보존)
- ✓ ② V4-8 Skipped → Ask again
- ✓ ③ V4-7 결제 완료 주문 Phone entry = eligible · 새 장바구니 후 new_cart_started
- ✓ ④ V4-8 lock (phone_entry_busy)
- ✓ ⑤ confirmed(A · 포인트) → Re-enter → cancel_entry → A 보존
- ✓ ⑥ confirmed(A · 포인트) → Re-enter → skip → A 보존
- ✓ **⑦ M0-1126-P** confirmed(A · 포인트) → Re-enter → B 확정 → **A 회수 · B 적립 · loyalty_transfer entry 1건**
- ✓ **⑦+ M0-1126-P** 전송 멱등 — 같은 (주문, B) linkCustomerToOrder 재호출 시 이중 회수·적립 없음 · entries 1건 유지
- ✓ ⑧ V4-7 원자화 (new_cart_started 결정론)

## PR 본문 Kyu 확인 항목

- [ ] A 잔액 부족 처리: `recoverForOrder` 가 M0-1117-J `loyalty_negative.addDebt` 로 빚 이월 (기존 규칙 재사용 · 신규 함수 없음).
- [ ] 멱등: 같은 `(order, B)` 로 linkCustomerToOrder 재호출 시 `loyalty_transfer.entries` 1건 유지 · A 이중 회수·B 이중 적립 없음.
- [ ] `delete` 가 아니라 `null` 재설정 — Medusa updateOrders metadata merge/replace 양쪽 모두에서 작동.
- [ ] B == A 번호면 `upsert.customer_id === previousCustomerId` 로 전송 분기 스킵.

## 실행 로그 요약

- origin/main `2508ab93` → 워크트리 `/Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-P` 에 `feat/M0-1126-P` 신규 브랜치 체크아웃.
- 3 개 소스 파일 편집 · prettier 자동 서식 후 커밋.
- `git push -u origin feat/M0-1126-P` · `gh pr create` → #463.
- Local pos-integration 1차 run 에서 ⑦·⑦+ 가 `delete` 로 metadata merge 이슈 노출 → `null` 명시 재설정으로 2차 run 9/9 통과 확인 → 전체 46 spec 재돌려 모두 통과 확인.
- customer-display e2e `--workers=4` 143 passed.

## 비고

- 러너 폴더 `~/projects/curiocity-relay` 에서 작업 안 함 — worktree 전용 (`~/projects/curiocity-relay-wts/M0-1126-P`).
- 리포트는 이 파일 1곳에만 생성 · git 리포 내부에 쓰지 않음.
- 중간 리포트 작성·삭제 없음.
