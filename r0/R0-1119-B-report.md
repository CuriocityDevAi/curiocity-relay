#384 스레드 해결 0건 (이미 해결됨) || #383 APPROVE · 현금 계산 손검증 O · by_method O · 30건 O · 우회 BUG-C workaround 잔존(의도적, #384 merge 후 제거 가능)

---

## STEP 1 — PR #384 미해결 스레드

- 저장소: `CuriocityDevAi/storeport` (storeport-wts/hub-r0 는 접근 불가 · PR 위치 재확인)
- 스레드 1건 (PRRT_kwDOTe-UYs65EPYj): **이미 isResolved=true** (별도 resolve 불필요)
- 미해결 스레드 0건 → 조치 없음

---

## STEP 3 — PR #383 코드 리뷰

**대상**: `fix(register-session): M1-1118-M — shift-close BUG-D/BUG-B 수정`
변경 파일 2개: `_helpers.ts` (src), `store-day-rehearsal.spec.ts` (신규)

### 현금 계산 손검증 O

산식: `expected_cash = opening_float + ebm.cash - pickups_total + adjustments_delta`

SCALE=1 직접 계산:
- opening_float = 100,000
- 현금 주문 5건 합: 20000+31000+63000+131000+30000 = 275,000
- void 1건(15,000): cashSalesTotal에서 제거됨 (tenderCash +15k → void -15k)
- refund-fresh 1건(20,000): cashSalesTotal +20,000
- 로열티 적립 5건(5×50,000=250,000) + loyalty-link-fresh(50,000)
- cashSalesTotal = 595,000, cashRefundTotal = 20,000
- localExpected = 100,000 + 595,000 − 20,000 = **675,000**
- 서버 `ebm.cash` 가 동일하게 측정 → cashDiff=0, 통과

취소 주문 처리:
- tenderCash() 호출 시 cashSalesTotal 에 가산, void 완료 후 `cashSalesTotal -= total` 차감
- adjustments_delta 에 void/refund signed_delta < 0 반영 → 이중 추적 아님
- `ebm.cash`는 가산 전용 (void/refund는 adjustment 경로로 차감) → 대사 정확

나눠 결제(split tender):
- 이번 PR 테스트에 split tender 없음; tenders 라우트가 `addExpectedByMethod` 를 각 tender 단위로 원자 가산하므로 split 시에도 각 partial amount 가 별도 가산됨 → 올바름

환불:
- 현금 환불: adjustment cash_movement(signed_delta < 0) 생성 → adjustments_delta에 포함
- `cashRefundTotal` 로 테스트 측도 추적 → cashDiff ≤ 1 보장

### by_payment_method O

- 1차 소스: `session.expected_by_method` (tenders 라우트 원자 가산, `{cash: N, card_by_bank: {...}, qris_by_issuer: {...}}`)
- `providerIdToMethod()`: `pp_cash_*→cash`, `pp_edc_*→card`, `pp_xendit_qris_*→qris`, legacy `pp_system_default→cash`
- ebm 없을 때 order-based fallback `aggregateOrderPayments()` 유지 (3-tier)
- X 리포트 / Z 리포트: **동일** `computeReport()` 함수 사용 → 일관성 보장
- 테스트 엄격 검증:
  ```
  expect(typeof xByMethod.cash).toBe("number"); // X-report
  expect(xByMethod.cash).toBeGreaterThan(0);
  expect(typeof byMethod.cash).toBe("number");  // Z-report
  expect(byMethod.cash).toBeGreaterThan(0);
  expect(typeof byMethod.card === "number" || typeof byMethod.qris === "number").toBe(true);
  ```

### 테스트 품질 O

soft → strict 전환:
- `expect(cashDiff).toBeLessThanOrEqual(1)` (엄격)
- `expect(typeof xByMethod.cash).toBe("number")` (엄격)
- `expect(xByMethod.cash).toBeGreaterThan(0)` (엄격)
- 이전 TODO 주석 모두 제거

REHEARSAL_ORDERS=30 실제 30건 확인:
- `SCALE >= 2 ? 15 : 5` → 현금15+카드8+QRIS7 = 30건
- REHEARSAL_ORDERS=30 → `_ordersEnv=30 >= 30` → SCALE=2 자동 선택

BUG-C workaround 3곳 잔존:
1. 환불(d. 환불): `refundTarget` (이전 it-block 현금 주문) 대신 fresh 주문 생성
2. 반품(d. 반품): `returnQrisTarget` 대신 fresh QRIS 주문 생성
3. 로열티 연결(e. 고객 연결): `loyaltyLinkOrderId` 대신 fresh 주문 생성

→ PR #384 (BUG-C: fulfilled 주문 환불·반품·링크 수정) 가 merge 되면 workaround 제거 가능.
→ 현재 PR #383은 BUG-D/BUG-B 만 범위이므로 workaround 명시적 주석처리는 의도적. APPROVE 가능.

### STEP 4 — 직접 실행 결과

worktree: `/Users/kyu.lee/curiocity-live/storeport-wts/hub-m1` (branch: test/M1-1118-K-store-day-rehearsal)

| 커맨드 | 결과 | 시간 |
|--------|------|------|
| `bash scripts/it.sh store-day-rehearsal` (SCALE=1, 10건) | ✅ 10/10 | 48s |
| `REHEARSAL_ORDERS=30 bash scripts/it.sh store-day-rehearsal` (SCALE=2, 30건) | ✅ 10/10 | 75s |
| `bash scripts/it.sh checkout-handover-smoke` | ✅ 2/2 | 69s |

---

## 최종 판정

- **#384**: 미해결 스레드 0건 (기존 1건 이미 해결됨) · 조치 불필요
- **#383**: APPROVE · 현금 계산 손검증 O · by_method O · 30건 O · 우회 BUG-C workaround 명시적 주석 잔존(의도적, merge 가능)
- draft PR 여부: #383 OPEN (not draft) → draft 해제 불필요 · 머지 준비 완료
- 선결 조건: #383 → #384 순 머지 권장 (#384 가 BUG-C 수정 → workaround 제거 가능)
