#454 CHANGES

## 판정 근거

### REQ 1 — V3-1 `isPostSettlementStale` 로직 검증 ✓

| 조건 | 반환값 | 판단 |
|---|---|---|
| paid + skipped + age < 30s | false (age < staleMs guard) | 결제 직후 30초 창 보존 ✓ |
| paid + phone_entry_open (skipped_at·customer_phone·phone_deferred 모두 null) | false (isPhoneEntryOpen guard) | 번호 입력 중 keypad 유지 ✓ |
| paid + LateLink (link_open_until 미경과, settled=false) | false | 캐셔 소급 적립 가능 ✓ |
| 20s idle timer(CD 로컬) vs 30s stale(서버 필터) 충돌 | 독립 메커니즘 | 충돌 없음 ✓ |

서버 가드 로직 자체는 올바름.

---

### REQ 2 — CD Rule E 미수정 → stopper 잔존 ⚠ CHANGES

**경로 추적 (`apps/customer-display/src/lib/display-machine.ts` lines 271–296)**

```
틱 N  (V3-1 fix 배포 후)
  snapshot=null, prevSnapshot=#196, currentScreen="receipt"
  → isTerminalFlow("receipt")=true
  → newCheckoutStatus: snapshot=null → 조건 불성립 (Rule E 불발)
  → if (!snapshot && isTerminalFlow) → stay("receipt")
  → prevSnapshot ← null

틱 N+1 (B = 새 checkout 도착)
  snapshot=B, prevSnapshot=null, currentScreen="receipt"
  → isTerminalFlow("receipt")=true
  → newCheckoutStatus: B.status="checkout" ✓ · B.id !== null?.id = B.id !== undefined = true ✓ · B.state!="paid" ✓
  → stay("receipt")  ← CD가 B로 전환하지 않음
  → POS "Not confirmed · Link customer" stopper 잔존
```

**수정 방향** (`display-machine.ts` lines 286–295):

```typescript
const newCheckoutStatus =
  (snapshot?.status === "checkout" || snapshot?.status === "cart") &&
  snapshot.id !== prevSnapshot?.id &&
  prevSnapshot !== null &&         // ← 추가
  snapshot.snapshot_state !== "paid";
const newCheckoutPos =
  posScreenCart &&
  snapshot?.id !== prevSnapshot?.id &&
  snapshot?.snapshot_state !== "paid" &&
  prevSnapshot !== null;           // ← 추가
```

`display-machine.test.ts` 케이스 추가 필요:
- `terminal(receipt) + prevSnapshot=null + snapshot=B(checkout) → screen != "receipt"`

---

### REQ 3 — V3-2 POS 대비 남은 차이

이 PR 이후 CD 영수증에서 미구현:

| 항목 | 비고 |
|---|---|
| 로고 | 다음 라운드 |
| WA (WhatsApp 번호) | 다음 라운드 |
| 영수증 번호 (receipt_no) | PR 설명 명시 "다음 라운드" |
| 일시 (order date/time) | PR 설명 명시 "다음 라운드" |
| 캐셔 (cashier name) | PR 설명 명시 "다음 라운드" |

이미 추가된 것: 매장명·주소·옵션(variantTitle)·Received·Change ✓

---

### REQ 4 — 테스트 실행 결과

```
# 통합 테스트 (bash apps/commerce-core/scripts/it.sh <pattern>)
cd-pos-sync-v3        3/3  PASS ✓  (9.9s)
cd-full-flow          8/8  PASS ✓
cd-parallel-pay      15/15 PASS ✓
cd-pos-screen-sync    7/7  PASS ✓
cd-snapshot-skip      7/7  PASS ✓
post-pay-link-balance 2/2  PASS ✓

# 유닛 테스트
commerce-core unit   869/869  PASS ✓  (28.8s)
customer-display unit 313/313 PASS ✓  (* pnpm install 후 @storeport/receipt-view-model 링크 필요)

# CD e2e
dist = 2026-11-16 빌드 (PR 코드 미포함)
cd-pos-sync-v2.spec.ts  2 failed (payment-complete-panel / keypad 테스트) — dist 재빌드 시 해소 예상
cd-flow-overlap.spec.ts 복수 failed — 동일 원인
→ 선행 하네스 이슈, PR 코드 변경과 무관
```

---

## 결론

`display-machine.ts` Rule E 에 `prevSnapshot !== null` 조건 추가 + 단위 테스트 보완 후 APPROVE 가능.
