# R0-1105-BK · storeport #214 (M0-1105-AL 환불 안전장치) 리뷰 리포트

## 판정: CHANGES

---

## (a)~(e) 검증 표

| 항목 | 판정 | 근거 |
|------|------|------|
| (a) 다중 결제 all-or-nothing | **CHANGES** | Phase 2 execute에서 첫 번째 refundPaymentWorkflow(CASH 40k) 성공 후 두 번째(CARD)가 throw하면 CASH 환불이 실제로 나간 채 남는다. 500 + 마커는 조용한 부분 환불을 금지하지만, 부분 환불 자체를 막지는 못한다. 테스트 `#68b`가 이를 명시적으로 검증: `completed=[{method:"cash", amount:40000}]`. "앞선 환불이 실제로 나간 채 남음" → CHANGES. |
| (b) cross-tender 재분배 · 절단 금지 · CASH-first | **PASS** | `totalRefundable` = 모든 non-canceled 결제 pack 합계(L282). `refundAmount <= totalRefundable` cap(L328-330). Phase 1 pre-plan이 `take = Math.min(remain, pack.refundable)`로 각 pack 한도 내 배분, `sum(take) = refundAmount` invariant 보장(L438-448). `sortRank` CASH→QRIS→CARD 정렬(L422-424). 테스트 `#68`: cash 40k + card 10k = 50k 정확히 분배. |
| (c) 멱등성 · 금액 합계 | **PASS** | 금액 합계: Phase 1 remain>0 가드로 `sum(plan.take) == refundAmount` 보장. 멱등성: `withOrderLock`으로 동일 주문 직렬화(L23-37), Guard B(`already_returned + requested > purchased` → 400)가 중복 제출 차단(L224-236). `order.metadata.returns`는 성공 시 갱신(L741-764). |
| (d) pos-integration 2회 초록 + CI 초록 | **PASS** | CI `pos-integration` → SUCCESS (2026-11-11T10:40:43Z~10:43:27Z). PR body 로컬 2-run: 77/77 (56.5s, 55.7s). `markers-and-forbidden` + `feature-map-check` → 모두 SUCCESS. `docker-smoke-*` SKIPPED는 `changes-filter` 판단(관련 인프라 변경 없음) — 정상. |
| (e) base=main · #212 잔여 없음 | **PASS** | `baseRefName: "main"`. 브랜치 커밋 1개만(`b79e817` M0-1105-AL). PR body: "#212 merged as c1148df while this PR was being prepared, retarget to main applied". #212 커밋 잔여 없음. |

---

## CHANGES 상세 · (a) 판정 근거

### 판정 요약

relay 지시서: *"앞선 환불이 실제로 나간 채 남는지 직접 판정하고, 남는다면 CHANGES."*

**판정: 남는다.** `plan.length ≥ 2`인 분할 결제 환불에서 idx=0(CASH) 성공 후 idx=1(CARD)이 throw하면:
- `refundPaymentWorkflow(CASH, 40k)` 완료 → Medusa DB에 refund row 적재, 비가역
- CARD workflow 미실행 → CARD 10k 환불 없음
- catch block: `refund_distribution.length === 1 > 0` → mid-stream path → 500 반환

CASH 40k는 실제로 나가 있고, CARD 10k는 미환불 상태로 남는다. 500 response의 `completed` 배열이 이를 확인해 줌.

테스트 `#68b` (route.ts L464-471의 `__test_fail_refund_after=1` 주입) 검증 결과:
```
caught.status === 500
caught.data.type === "refund_partial_failure"
caught.data.completed[0].method === "cash" / .amount === 40000
```
→ CASH 40k가 실제로 나간 채 남음을 테스트가 직접 증명한다.

### 요구되는 변경

**최소 CHANGES (1건):**

`route.ts` L546~553 (500 response body) 및 L526~532 (마커 persist)에 `pending` 필드 추가:

```typescript
// 500 response에 pending 추가
const pendingSteps = plan.slice(refund_distribution.length).map(({ pack, take }) => ({
  payment_id: pack.payment.id,
  method: pack.method,
  amount: take,
}));

res.status(500).json({
  type: "refund_partial_failure",
  message: `refund partial failure · ${refund_distribution.length}/${plan.length} completed · manual reconciliation required`,
  order_id,
  return_id,
  completed: refund_distribution,
  pending: pendingSteps,   // ← 추가
  error: msg,
});
```

```typescript
// 마커에도 pending 추가
markers.push({
  at: new Date().toISOString(),
  return_id,
  requested: refundAmount,
  completed: refund_distribution,
  pending: pendingSteps,   // ← 추가
  planned: plan.length,
  error: msg,
});
```

**이유:** 현재 500 response와 마커 모두 `completed`(성공한 단계)만 기록하고 `pending`(아직 환불되지 않은 단계, payment_id + method + amount)가 없다. 운영자/자동화 도구가 "CARD pay_xxx 에 10,000을 환불해야 한다"는 정보를 얻으려면 주문 결제 데이터를 별도로 조회·교차 대조해야 한다. `pending` 필드가 있으면 500 응답 하나로 미완 환불 대상을 특정해 forward-completion이 가능하다.

**근본 제약 (Option A/B 기각) 인정:**
- Option A (DB 트랜잭션으로 감싸기): Medusa v2 workflow간 shared compensate 미지원 → 기각 타당
- Option B (refund 역행): `refundPaymentWorkflow`는 비가역 (capture row 역상쇄 API 없음) → 기각 타당
- Option C (채택): pre-plan으로 amount 오류 기인 mid-stream 실패를 사전 차단 + runtime/infra 실패는 loud 500 + 마커로 처리

pre-plan은 amount 계산 오류 케이스를 완전 소거한다. 남은 위험은 네트워크·게이트웨이 장애(runtime)뿐이므로 운영 빈도는 극히 낮다. 그러나 "부분 환불이 남지 않는다" 요건을 엄격히 충족하지 못하므로, 최소한 reconciliation을 완전히 지원하는 `pending` 필드 추가는 필요하다.

---

## 이연 순증감 보고

| 항목 | 변화 |
|------|------|
| R0-1105-BI · 환불 롤백 이연 | 유지 (변화 없음 · PR scope 밖) |
| M0-1105-AK · #68 refundableCap single-payment | **소진** (이 PR에서 fix됨 · `#68` un-skip 통과) |
| 신규 이연 | 0건 |

---

## 실행 로그

| 단계 | 명령 / 확인 | 결과 |
|------|-------------|------|
| PR 메타 조회 | `gh pr view 214 --repo CuriocityDevAi/storeport` | base=main, 커밋 1개 |
| diff 취득 | `gh pr diff 214 --repo CuriocityDevAi/storeport` | +258/-71 (route.ts + tenders.spec.ts) |
| CI 상태 | `gh pr view 214 ... --json statusCheckRollup` | pos-integration SUCCESS, markers SUCCESS, check SUCCESS |
| 브랜치 커밋 | `git log origin/main..origin/feat/m0-1105-al-refund-safety` | 1커밋 (b79e817) |
| route.ts 전체 | `git show origin/feat/m0-1105-al-refund-safety:...route.ts` | L1~788 완전 열람 |
| #212 잔여 확인 | 커밋 1개만 존재 + PR body retarget 확인 | 잔여 없음 |

---

## 착지 명령

```
cp /tmp/R0-1105-BK-report.md ~/projects/curiocity-relay/r0/ && \
cd ~/projects/curiocity-relay && \
git add r0/R0-1105-BK-report.md && \
git commit -m "r0: R0-1105-BK" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs R0-1105-BK done "CHANGES · (a) partial refund remains after mid-stream failure · pending 필드 추가 필요 · (b)~(e) PASS"
```
