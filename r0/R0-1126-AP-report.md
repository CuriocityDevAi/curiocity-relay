#463 APPROVE

## R0-1126-AP — #463 M0-1126-P 리뷰 결과

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/463
- **커밋**: `7944261c71a7020b48b9b661e912d28fb57f8204`
- **결정**: APPROVE (GitHub: COMMENT 타입 · 자기 PR 승인 불가)

---

## [BUILD] 1) cd-pos-sync-v4 9 케이스 직접 실행

워크트리 `/Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-P` 에서 실행:

```
PASS integration-tests/pos/cd-pos-sync-v4.spec.ts (21.792 s)
  ✓ ① V4-8 · 결제 중 Ask → Re-enter → 번호 확정 (2323 ms)
  ✓ ② V4-8 · Skipped → Ask again (1774 ms)
  ✓ ③ V4-7 · 결제 완료 주문 eligible · new_cart_started (477 ms)
  ✓ ⑤ V4-8 · confirmed(A) → Re-enter → cancel_entry → A 보존 (564 ms)
  ✓ ⑥ V4-8 · confirmed(A) → Re-enter → skip → A 보존 (774 ms)
  ✓ ⑦ V4-8 · M0-1126-P · A 회수 · B 적립 · loyalty_transfer entry 1건 (965 ms)
  ✓ ⑦+ V4-8 · M0-1126-P · 전송 멱등 — 이중 회수·적립 없음 (949 ms)
  ✓ ⑧ V4-7 · 원자화 — new_cart_started 거절 (652 ms)
  ✓ ④ V4-8 · lock — phone_entry_busy (688 ms)
Tests: 9 passed, 9 total · Time: 21.879 s
```

---

## [BUILD] 2) 돈 로직 검토

### A 잔액 부족 → addDebt 이월

`recover.ts:220-258`:
- `toDebit = max(0, min(requested, balanceBefore))` — 잔액 0 미만 금지.
- `uncollected = requested - toDebit > 0` 이면 `loyaltyNegative.addDebt({ kind: 'refund_shortfall', ref: 'recover:<order>:<ref>' })` 로 빚 이월.
- M0-1126-P Re-enter 전송은 `recoverForOrder` 를 그대로 재사용 — 신규 분기 없음. ✓

### 멱등 (같은 (주문, B) 재호출)

- `recoverForOrder`: `prevEntries.some(e => e.ref === 'reenter:<order>:<B_customer>')` dedup → `idempotent: true` no-op. ✓
- `loyalty_transfer.entries`: `already = priorEntries.some(e => e.ref === transferEntryToAdd.ref)` → 중복 추가 없음. ✓
- `earnForOrder`: `freshMeta.loyalty_earn.applied === true` guard → no-op. ✓

테스트 ⑦+ 실증 확인.

### 멱등 (동시 2회 race)

- `recoverForOrder`: `pg_advisory_xact_lock('loyalty-recover:<orderId>')` 직렬화. 첫 번째가 `total_recovered=X` 쓰면 두 번째는 `remainingEarn=0 → requested=0 → no debit`. ✓
- `earnForOrder`: `pg_advisory_xact_lock` + `applied=true` 재확인. ✓

### loyalty_earn/recover null 재설정의 다른 코드 영향

grep 확인 대상:
- `subscribers/loyalty-earn-on-paid.ts` — `loyalty_earn.applied` 로 멱등 판정.
- `api/admin/pos/orders/[id]/return/route.ts` → `recoverForOrder` 호출.
- `workflows/pos-refund/steps/recover-loyalty.ts` → `recoverForOrder` 호출.
- `workflows/pos-void/recover-loyalty.ts` → `recoverForOrder` 호출.

전송 직후 `loyalty_earn=null` 창에서 환불 호출 시: `recoverForOrder` → `earnMeta.applied=undefined` → `skipped_reason: "no_earn"` → non-fatal (B가 아직 미적립 상태). 이후 `earnForOrder(B)` 완료 → `loyalty_earn` B 기준 재세팅. 이후 환불: `loyalty_recover=null` → `alreadyRecovered=0, remainingEarn=B_earn` → B 계좌 정상 회수. ✓

`loyalty_recover = null` 리셋 필요성: 리셋 없으면 B 환불 시 `remainingEarn = max(0, B_earn - X) = 0` → 환불 포인트 미회수. 리셋 후 올바르게 회수됨. ✓

### A→B→A (두 번 교체 · 잔액 원상복구)

- 1차 A→B: `ref='reenter:<order>:<B_customer>'` → A 회수 · B 적립.
- 2차 B→A: `ref='reenter:<order>:<A_customer>'` (다른 ref) → B 회수 · A 재적립.
- 최종: A.balance = 원래대로, B.balance = 0. ✓

---

## [BUILD] 3) CD PB1 폴백 회귀

정상 경로 (`liveConfig.tax_rate = 10`):
- `storeConfig.taxRate = 10 ?? 0 = 10`
- CartScreen (`src/screens/CartScreen.tsx:66`): `showTax = 10 !== 0 = true` → PB1 줄 뜸 ✓
- ReceiptScreen: `resolveReceiptView` → `taxBlock.rate_pct = 10` 우선 → `taxRatePct = 10, taxShow = true` → PB1 줄 뜸 ✓

폴백 경로 (`tax_rate` 미제공):
- `storeConfig.taxRate = 0`
- `showTax = false` → PB1 줄 숨김 ✓

회귀 없음.

---

## 종합

돈 로직 의심 사항 없음. APPROVE.
