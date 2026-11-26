#457 APPROVE

## 실행 명령 · 결과 로그

### typecheck

```
pnpm -F commerce-core typecheck     → clean (exit 0)
pnpm -F customer-display typecheck  → clean (exit 0)
pnpm -F @storeport/receipt-view-model tsc --noEmit → clean (exit 0)
```

### unit

```
pnpm -F commerce-core test
  Test Suites: 75 passed, 75 total
  Tests:       877 passed, 877 total

pnpm -F customer-display test
  Test Files  16 passed (16)
  Tests  327 passed (327)

pnpm -F @storeport/receipt-view-model test
  tests/receipt-view.test.ts (10 tests) PASS
```

### integration (jest 개별 직접 실행)

```
cd apps/commerce-core
TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit

  cd-pos-sync-v4-next-customer  PASS  3/3
    ✓ V4-1 · Next customer 뒤 과거 cart/draft 스냅샷 expired (471ms)
    ✓ V4-5 · QRIS receipt = payment_method(qris) · PB1 실세액 · store 머리 (1161ms)
    ✓ V4-6 · skip → state=skipped + actions=['ask_again'] (880ms)

  cd-pos-sync-v4                PASS  4/4
  cd-pos-sync-v3                PASS  3/3
  cd-parallel-pay               PASS  15/15
  cd-full-flow                  PASS  8/8
  cd-snapshot-skip (loyalty)    PASS  7/7
```

※ 전체 `test:integration:pos` 스크립트(모든 spec 순차 실행) 에서 12개 실패(orders-list · tenders · loyalty 다수)가 나왔으나, 개별 실행 시 모두 성공 → 직전 브랜치(#456 base)도 동일 환경에서 같은 스펙이 실패함을 확인. PR 변경과 무관한 DB 연결 선점 충돌(pre-existing).

---

## 리뷰 근거

### V4-1 — `nextCustomerForOrder` sibling expire

**살려야 할 것**

- `phone_entry_open paid (V4-7)`: `isPhoneEntryOpen(s, now)` — `state=paid + link_open_until 미래 + customer_phone=null + skipped_at=null + phone_deferred=false` 5조건 AND. 조건 하나라도 빠지면 보존 대상 아님. ✅
- `병렬 카트 R2`: `sCreated > targetCreatedMs` → target 이후 snapshot 유지. ✅
- `나눠결제 진행 중`: sibling 쿼리가 `register_session_id` 필터 → R2는 register별 session이 다르므로 다른 레지스터의 split-tender는 조회 대상 외. 동일 session 내 split-tender는 `order_id` 동일 = 첫 루프에서 처리되는데, `nextCustomerForOrder`는 paid 이후에만 호출되므로 split-tender 진행 중에는 호출 자체 불가. ✅

**역방향 확인**

target.created_at 이전 active/paid sibling → 모두 expire. integration test V4-1이 `retrieveOrderSnapshot`으로 `orderOld.snapshot_state === "expired"` 직접 단언. ✅

---

### V4-5 — CD 영수증 결제수단 / PB1 / 머리

**`pickPaymentMethod` null화**

`return "cash"` 폴백 제거 → 미확인 provider는 `null`. `cash` 판정은 `prov.includes("cash")` — Medusa v2 기본 cash provider `pp_cash_default` 를 포함하며 QRIS(`xendit`/`qris`), Card(`card`/`edc`) 조건과 겹침 없음. ✅

**PB1 0 숨김 (면세 매장 edge case)**

`taxShow = taxShowRaw && taxAmountRaw > 0`:
- 완전 면세 매장: `taxBlock.show=false` → `taxShowRaw=false` → 이미 숨김, 이중 가드와 무관 ✅
- 과세 매장인데 해당 거래 PB1 계산액이 0: `show=true && amount=0` → 숨김. "PB1 Rp 0" 행 의미 없음, 의도된 동작 ✅

**receipt-view-model 소비처 grep**

- `pos-r0` (POS fork): `@storeport/receipt-view-model` 미의존 (`package.json` 및 `node_modules/@storeport` 없음) → 영향 없음 ✅
- admin `ReceiptPreview.tsx`: `storeName`/`storeAddress` 만 렌더링. 신규 필드 optional → 타입 호환 그대로 ✅
- CD `LeftPaymentPanel.tsx`: 신규 필드 전부 조건부 렌더링 (`{view.receiptNo ? ... : null}`) → null 시 행 숨김 ✅

**cashier.name 미패치**: tenders/route가 `cashier.id`만 전달. name resolve는 후속 라운드. CD는 name 없으면 행 숨김. PR description에 documented. Non-blocking.

---

### V4-6 — Skipped 3초 자동 해제

**paid / 결제진행 분기**

- `phase === "paid"` + `skippedDismissed` → `cdSnapshot = null` → 대기 화면 ✅
- `phase !== "paid"` + `skippedDismissed` → `flowForView.state = "none"` → order-list / qris 복귀 ✅

**Ask again 타이머 경쟁**

timer는 `rawFlowState` (서버 state) 감시. POS `start_entry` → 서버 state `"entering"` → useEffect 재실행 → timer clear + `skippedDismissed = false` → 즉시 keypad 복귀. 3초 이전/이후 모두 정상 ✅

**snapshot.id 변경 시 초기화**

`useEffect(() => setSkippedDismissed(false), [snapshot?.id])` — 다음 손님 도착 시 타이머 상태 리셋 ✅

---

## 판정

세 버그의 뿌리를 정확히 겨냥. 보존 규칙이 integration test로 직접 검증됨. 모든 필수 테스트 통과. **머지 가능.**

PR comment: https://github.com/CuriocityDevAi/storeport/pull/457#issuecomment-7189702993
