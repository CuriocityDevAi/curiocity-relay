#456 APPROVE

리뷰어: R0-1126-AA · 커밋 f6743a1 · 2026-11-26

---

## 판정 근거

### REQ 1 — Re-enter 취소 경로 (confirmed → cancel_entry / 20초 / skipped)

**원래 번호·고객 연결·포인트 보존 여부 ✓**

| 경로 | customer_phone | 연결 | 포인트 |
|------|---------------|------|-------|
| confirmed → start_entry | 보존 (setCustomerFlow에 customer_phone 미포함 = DB 불변) | ✓ | 무변 |
| entering → cancel_entry | 보존 (patch = { state:'confirmed', phone_entry_state:'done' } 뿐) | ✓ | 추가 earn 없음 |
| entering → skip (20초 timeout) | 보존 (skip 처리에서 customer_phone 미포함) | ✓ | 추가 earn 없음 |

포인트 이중 적립 차단: `earnForOrder`는 `pg_advisory_xact_lock('loyalty-earn:' + order_id)` + `metadata.loyalty_earn.applied` 플래그로 주문 단위 멱등 보장 (`earn.ts` 확인). Re-enter → 취소 경로에서 `confirm` 재호출이 없으므로 `linkCustomerToOrder` → `earnForOrder` 미발동. ✓

고객 연결 해제 위험 없음: `cancel_entry` / `skip` 어느 쪽도 `customer_phone` 컬럼을 `null`로 덮어쓰는 코드 없음. ✓

스냅샷 선행 `skipped_at` 잔존 없음: `start_entry` 분기가 `skipped_at: null` 명시 세팅 (orchestrator.ts:170) → 이후 cancel_entry 복원 시 clean. ✓

---

### REQ 2 — V4-7 `/orders/:id/phone-entry`

**4조건 + lock 판정 — 단일 트랜잭션 아님 (soft TOCTOU)**

`openPostSettlementPhoneEntry` (service.ts:665–803) 흐름:
1. `listOrderSnapshots({ order_id })` — 대상 snapshot 조회
2. 조건 3·4 (customer_phone, link_open_until) 검사
3. `listOrderSnapshots({ register_session_id })` — 조건 1·2 + lock 검사
4. `updateOrderSnapshots(...)` — phone entry 열기

단계 3–4 사이에 `startSnapshotForRegister` 가 끼어들면 `new_cart_started` 를 놓칠 수 있음 (TOCTOU 소프트 race). **단, 동일 패턴이 기존 `askPhoneOnDisplayForOrder`(service.ts:581–650)에도 적용되어 머지 허용됐음**. 운영상 경쟁 창 ~1 ms, 결과는 CD가 잠깐 과거 phone-entry를 표시하는 UI 오류이며 데이터 무결성 문제 없음.

**`isPostSettlementStale` V3-1 보존 ✓**

phone entry 열기 후: `phone_deferred=false, skipped_at=null, customer_flow_state='entering'`
→ `isPhoneEntryOpen` = `true` (all conditions met)
→ `isPostSettlementStale` → `if (isPhoneEntryOpen(snapshot, now)) return false` (lifecycle.ts:84) → CD active 유지 ✓

**확정 시 고객 연결 + 포인트 적립 ✓**

V4-7 → CD keypad → submit_phone → `customer_phone` 세팅 → confirm →
orchestrator.ts:252–266: `linkCustomerToOrder(container, { order_id, phone, source:'customer_display', consent:true })` 호출 → `earnForOrder` 적립 (멱등) ✓

---

### REQ 3 — `customer_flow.actions` / `locked` 6상태 계약 일치

`deriveCustomerFlowActions` (lifecycle.ts:287–306) + `deriveCustomerFlow`(lifecycle.ts:311–386) 확인:

| 계약 상태 | server state | actions | locked |
|----------|-------------|---------|--------|
| ① Ask phone | `none` | `['ask']` ✓ | false ✓ |
| ② Waiting | `entering` | `[]` ✓ | false ✓ |
| ③ 입력 중 (phone_partial) | `entering` | `[]` ✓ | false ✓ |
| ④ Done + Re-enter | `confirmed` (hasPhone=true) | `['reenter']` ✓ | false ✓ |
| ⑤ Skipped | `skipped` | `['ask_again']` ✓ | false ✓ |
| ⑥ 다른 손님 사용 중 | 그대로 | 그대로 ✓ | `phone_deferred` → `locked:true` ✓ |
| §1.1 unconfirmed | `unconfirmed` | `['ask_again']` ✓ | false ✓ |

CD `cancel_entry` 타 고객 번호 삭제 위험 없음:
- CD route `/customer-display/customer-flow` 는 `register_mismatch` 가드 (session.stock_location_id !== deviceStockLocationId → 403) 로 타 매장 snapshot 차단 ✓
- `transitions.ts:46–51`: `cancel_entry`는 `entering` 상태에서만 허용 → 다른 고객 `customer_phone` 삭제 경로 없음 ✓

---

## 테스트 실행 결과

```
# typecheck
pnpm --filter commerce-core typecheck
→ 오류 없음 ✓

# unit
pnpm --filter commerce-core test
→ Test Suites: 75 passed, 75 total
→ Tests: 877 passed, 877 total (29.795 s) ✓

# integration: cd-pos-sync-v4
TEST_TYPE=integration:pos jest cd-pos-sync-v4
→ PASS (4/4) 11.19 s
  ✓ V4-8 Re-enter 다른 번호 확정 — 기존 번호 새 submit 전까지 보존
  ✓ V4-8 Skipped → Ask again
  ✓ V4-7 결제 완료 phone entry eligible · 새 장바구니 후 new_cart_started
  ✓ V4-8 lock — phone_entry_busy 거절

# integration: cd-pos-sync-v3
TEST_TYPE=integration:pos jest cd-pos-sync-v3
→ PASS (3/3) 8.96 s ✓

# integration: cd-full-flow
TEST_TYPE=integration:pos jest cd-full-flow
→ PASS (8/8) 11.87 s ✓

# integration: cd-snapshot-skip
TEST_TYPE=integration:pos jest cd-snapshot-skip
→ PASS (7/7) 11.30 s ✓
```

---

## 비고

**[NOTE] TOCTOU soft race**: `openPostSettlementPhoneEntry` 조건 판정과 `updateOrderSnapshots` 사이 트랜잭션 없음. 동일 패턴이 기존 `askPhoneOnDisplayForOrder`에 존재하므로 blocking은 아님. 필요시 후속 MR에서 select-for-update 적용 검토.

**[NOTE] Re-enter+cancel_entry 통합 테스트 미존재**: 테스트 ①은 Re-enter → 새 번호 확정만 커버. Re-enter → cancel_entry(원래 번호 복원) 시나리오는 코드 로직 정확하나 E2E 미검증. 후속 추가 권장.
