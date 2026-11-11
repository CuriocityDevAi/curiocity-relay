# R0-1105-BI 리뷰 리포트

## 판정

| PR | 판정 | 한 줄 |
|----|------|-------|
| #212 M0-1105-AJ 나눠 결제 서버 | **CHANGES** | pos-integration 1회 FAIL · 버그 2건 (preorder DP receipt_kind 회귀 · paidSoFarBefore 타이밍) |
| #213 M1-1105-AR Admin PIN 왼쪽 메뉴 | **APPROVE** | 7개 체크 전부 통과 · CI pass · DOM 주입 없음 |

---

## (A) PR #212 — M0-1105-AJ 나눠 결제 서버

### S1~S4 + 멱등성 · 합계 · 롤백 체크표

| # | 항목 | 코드 구현 | CI 검증 | 비고 |
|---|------|-----------|---------|------|
| S1 | tender 최대 2개 | ✅ `tenderCountBefore >= 2 → 400` | ❌ #66 실패 | 가드 코드는 맞으나 paidSoFarBefore 버그로 tenderCountBefore=0 반환 |
| S2 | CASH 포함 → PIN 필수 | ✅ `hasCashTender` + void/refund 양쪽 | ✅ #67 pass | CARD-only PIN 불필요도 올바름 |
| S3 | 환불 CASH 먼저 | ✅ `sortRank(cash=0, qris=1, card=2)` | ❌ #68 실패 | 선행 #66 실패(2nd tender is_complete=false)로 order 완결 안 돼 연쇄 실패 |
| S4 | preorder + split 배타 | ✅ `splitMode && preorder → 400` | ✅ #69 pass | |
| 멱등성 | payment_collection_id 중복 deduplicate | ✅ `alreadyIndex` 체크 | ⚠️ non-fatal catch | metadata append 실패 시 2nd tender 영수증 재구성 불가 — 수용 가능 trade-off |
| 금액 합계 | 2차 tender = remaining 정확 일치 | ✅ `amount !== remainingBefore → 400` | ❌ Bug 2로 인해 remainingBefore 오계산 | |
| 롤백 | 부분 실패 시 | ⚠️ return/route.ts 다중 `refundPaymentWorkflow` 순차 — 중간 실패 시 부분 환불 | ❌ 미검증 | 이연(하단) |

### CI 결과 — pos-integration 1회 FAIL (4 tests)

```
Tests: 4 failed, 70 passed, 74 total
```

**실패 목록:**

#### Bug 1 — Preorder DP receipt_kind 회귀 (기존 test #10)

```
Expected: "sale"
Received: null
  tenders.spec.ts:489
```

**원인:** PR이 영수증 발행을 `isComplete` 플래그로 게이팅함.
```ts
const isComplete = splitMode
  ? remainingAfter === 0
  : isBalanceTender ? true
  : remainingAfter === 0;   // ← preorder DP는 항상 false (amount < orderTotal)
```
Preorder DP tender는 `splitMode=false`, `isBalanceTender=false`, `remainingAfter > 0` → `isComplete=false` → 영수증 미발행 → `receipt_kind: null`.

**수정 방향:** preorder 경로는 split `isComplete` 게이트 밖. 조건을 아래처럼 분기:
```ts
const isComplete = splitMode
  ? remainingAfter === 0
  : effectiveOrderType === "preorder"
    ? true                      // preorder는 DP·잔금 모두 각각 영수증 발행
    : isBalanceTender ? true
    : remainingAfter === 0;
```

#### Bug 2 — paidSoFarBefore 타이밍 오류 (#66 is_complete, #68 is_complete)

```
Expected: true
Received: false
  tenders.spec.ts:3893  (r2.data.is_complete)
  tenders.spec.ts:4052  (r2.data.is_complete)
```

**원인:** 2차 split tender 요청 시 `paidSoFarBefore` 계산이 `order.payment_collections.payments.captures.raw_amount`를 직접 읽음. Medusa `createOrderPaymentCollectionWorkflow` 의 1차 tender capture가 order 엔티티 관계에 반영되기 전에 쿼리 실행 → `capturedPayments = []` → `paidSoFarBefore=0`, `tenderCountBefore=0`.

결과: 2차 tender가 1차로 취급되어 `amount(60k) >= orderTotal(100k)` 조건은 통과하지만 `paidSoFarAfter=60k`, `remainingAfter=40k ≠ 0` → `isComplete=false`.

**수정 방향:** `metadata.tenders[]`를 1차 소스로 사용해 `paidSoFarBefore` 재계산 (이미 append된 tender detail이 있음). 또는 Medusa `query.graph` 대신 직접 `orderModule.retrieveOrder` + `forceReplicas: false` 옵션.

```ts
// metadata.tenders 기반 paid_so_far 재계산 (order metadata는 append 직후 반영)
const mdTenders = Array.isArray((order.metadata as any)?.tenders)
  ? ((order.metadata as any).tenders as any[])
  : [];
const paidSoFarBefore = mdTenders.reduce((s, t) => s + Number(t?.amount ?? 0), 0);
const tenderCountBefore = mdTenders.length;
```

단, metadata append도 try/catch non-fatal로 감싸져 있어 실패 시 같은 문제 재현. append failure는 fatal로 올리거나, 최소한 서버 500 반환 후 클라이언트 재시도 유도 권장.

### 로컬 2회 + CI 2회 연속 초록 확인

| 실행 | 결과 |
|------|------|
| CI run #42989693410 | ❌ FAIL (4 tests) |
| CI 2회 연속 초록 | ❌ 미달 |
| 로컬 2회 실행 | 미수행 (CI FAIL 상태로 로컬 실행 의미 없음) |

**결론: CHANGES — Bug 1·2 수정 후 CI 2회 연속 초록 필요.**

---

## (B) PR #213 — M1-1105-AR Admin PIN 왼쪽 메뉴

### 체크표

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| ① | DOM 주입 없음 | ✅ | `defineRouteConfig` 사용. DOM 직접 조작 없음 |
| ② | 옛 위젯 `manager-pin.tsx` 삭제 | ✅ | `widgets/manager-pin.tsx` → `routes/manager-pin/page.tsx` rename + 위젯 config 제거 |
| ③ | PIN · 다음 변경 시각 · 매장 · 날짜 표시 | ✅ | `data.pin`, `formatWib(data.changes_at)`, `data.store_id`, `data.wib_date` |
| ④ | 자정(WIB) 갱신 | ✅ | `scheduleNext()` → `msUntilWibMidnight()` timeout 체인 |
| ⑤ | `defineRouteConfig` 사용 | ✅ | `export const config = defineRouteConfig({ label: "Manager PIN", icon: Key })` |
| ⑥ | 단위 테스트 | ✅ | `msUntilWibMidnight` 5개 + `formatWib` 1개 (총 39 tests pass) |
| ⑦ CI | pos-integration pass | ✅ | run #42996179634 — 모든 체크 pass |
| ⑦ raw hex | 0 hex literal | ✅ | diff 전체에 raw hex 없음 |
| ⑦ 영어 | 영어 전용 | ✅ | "Manager PIN", "Next change:", "Store", "Loading…" |
| ⑦ 충돌 | master 충돌 여부 | ✅ | `mergeable_state: "clean"` |

### 세부 메모

- `window.addEventListener("focus", onFocus)`: Medusa Admin은 브라우저 전용 SPA — 문제 없음.
- Playwright 스크린샷 미검증은 PR 본문에 명시됨 (CI 환경 미설정). 실기 체크리스트 4개는 M1 담당자가 직접 확인 대상.
- `wib-clock.ts`의 `msUntilWibMidnight(0)` 엣지케이스(자정 정각): `msToday === 0 → return msInDay` — 올바름.

**결론: APPROVE.**

---

## 이연 순증감

| 항목 | 방향 |
|------|------|
| (+) PR #213 Admin PIN 왼쪽 메뉴 완료 → #211 DOM 주입 위젯 대체 완전 처리 | 이연 소진 |
| (+) PR #212 S2/S4 가드 코드는 정상 | |
| (-) PR #212 Bug 1 (preorder DP 영수증 회귀) | 신규 이연 · M0 다음 fix commit 필요 |
| (-) PR #212 Bug 2 (paidSoFarBefore 타이밍) | 신규 이연 · M0 다음 fix commit 필요 |
| (-) return/route.ts 다중 refundPaymentWorkflow 부분 실패 무롤백 | 신규 이연 · 운영 위험 낮음(단일 PC가 대부분)이나 M0 추후 fix 권장 |

---

*generated by R0 · 2026-11-11*
