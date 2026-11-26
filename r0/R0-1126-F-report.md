#451 APPROVE (통합 테스트 CI heavy-cloud 대기) · #450 CI 진행 · #269 CI 초록

---

## A. #451 코드 리뷰 (M0-1126-B — `feat/M0-1126-B-cd-sync-paid` · head `b241f4e`)

### A.1 — `derivePaymentPhase` 실패·취소 흐름 안전성

**판정: 안전** ✅

```ts
// lifecycle.ts:201-219
export function derivePaymentPhase(snapshot: any): PaymentPhase {
  const state = snapshot.snapshot_state;
  if (state === "paid") return "paid";           // 1. snapshot_state 먼저
  if (state === "expired") {
    return snapshot.paid_at ? "paid" : "cancelled";
  }
  const screen: string | null = snapshot.pos_screen ?? null;
  if (screen === "paid") return "paid";           // 2. NEW — pos_screen 체크
  if (screen === "payment_cash" || ...) return "tendering";
  return "building";
}
```

- 함수는 DB에 저장된 **현재** `pos_screen` 값을 읽는다. 결제 실패 후 POS가 `pos_screen`을 되돌리면 (`payment_cash`, `cart_building` 등) 즉시 non-paid를 반환 — 고정 없음.
- `snapshot_state === "paid"` 체크가 `pos_screen` 체크보다 먼저 위치 → 이미 state가 paid인 경우 항상 correct.
- `state === "expired"` 케이스: `paid_at` 유무로 paid/cancelled 분기 → 영향 없음.
- POS가 paid 성공 화면(`pos_screen='paid'`)을 emit한 뒤 실패를 감지해 되돌리는 시나리오: `pos_screen` 변경이 DB에 반영되면 즉시 building/tendering으로 복귀. race window는 최대 수십 ms (DB write lag) 수준.
- **잠재적 위험 없음**. POS가 `pos_screen='paid'` emit 후 되돌리는 명시적 흐름이 있으면 그 때의 snapshot을 반영.

### A.2 — tenders inline `markSnapshotPaidByOrder` + `patchSnapshotReceiptByOrder` 가드

**판정: 안전** ✅

**isComplete 게이트**:
- `const isComplete = splitMode ? ... : ...` (line 1321)
- `if (isComplete) { ... try { createReceiptForOrder ... + inline 호출 } catch ... }` 구조 확인
- 인라인 호출은 `if (isComplete)` 블록 안 `createReceiptForOrder` try 내부에 위치 → isComplete=false(부분 결제 split 1차)에서 미호출 ✅

**QRIS 대기**:
- QRIS는 `payment_qris` short-circuit path(line 961)에서 `pending` 상태로 early return → `isComplete` 게이트 미도달 → 호출 안 됨 ✅

**non-fatal**:
- 별도 try/catch로 감싸고 `console.warn` 처리 — 결제·영수증 발행 완료 후 호출이므로 실패해도 트랜잭션에 영향 없음 ✅

**멱등성**:
```ts
// service.ts:662-664
if (target.snapshot_state === "paid" && target.paid_at) {
  return target;  // early return — 이미 paid면 무시
}
```
- `markSnapshotPaidByOrder`: paid+paid_at 조건에서 early return 확인 ✅
- `patchSnapshotReceiptByOrder`: 동일 order_id 에 덮어써도 idempotent (PUT 의미론) ✅
- subscriber가 나중에 다시 호출해도 early return으로 처리 ✅

### A.3 — CD `index.tsx`/`cd-sync.tsx` receipt-full → 3초 → keypad 분기 · 타이머 누수

**판정: 안전** ✅

**손님 진행 중 덮기 방지**:
```ts
// cd-screen-selector.ts:80-97
export function selectCdView(phase, flow, tender?): CdView {
  if (flow === "none") {
    if (phase === "paid") return { kind: "receipt-full" };  // only here
    ...
  }
  // flow !== "none" (entering/submitting/done) → phone-flow
  return { kind: "phone-flow", ... };
}
```
- `flow !== 'none'` (entering/submitting/done)이면 `selectCdView`가 `phone-flow`를 반환 → `receipt-full` 분기 진입 불가 ✅
- 결정 doc "결제 상태 변화가 손님 진행 화면을 덮지 않는다" 준수 확인 ✅

**타이머 guard**:
```ts
// index.tsx:331-359
useEffect(() => {
  if (cdPhase !== "paid" || cdFlowState !== "none" || receiptToKeypad) return;
  receiptTimerRef.current = setTimeout(async () => { ... }, 3000);
  return () => {
    if (receiptTimerRef.current) clearTimeout(receiptTimerRef.current);
  };
}, [cdPhase, cdFlowState, receiptToKeypad, ...]);
```
- `cdFlowState !== 'none'` 조건 → entering 중 타이머 미시작 ✅
- cleanup 함수: 의존성 변경(cdPhase, cdFlowState) + unmount 시 `clearTimeout` 호출 → 누수 없음 ✅
- 새 주문 시: `snapshot?.id` 변경 → `setReceiptToKeypad(false)` → timer useEffect re-run → cleanup 실행 ✅

**경미 관찰 (문제 아님)**: `ReceiptScreen`에 `durationMs={displayConfig.receiptDurationMs}` 전달 → 내부 타이머와 useEffect 타이머 2개가 동일 3초를 카운트함. 코드 주석(line 503-505)에서 "onDone 비워두고 useEffect 하나만 start_entry 발사" 명시 → 중복 start_entry 호출 없음. 실질 위험 없음.

### A.4 — 통합 테스트 `cd-pos-screen-sync.spec.ts` 실행 결과

**미검증** — 이 세션에서 Postgres/Redis 미세팅.

#451 CI 현황:
| 잡 | 결과 | runner |
|---|---|---|
| `heavy-cloud` | **pending** | ubuntu (통합 테스트) |
| `heavy-mac` | skipping | mac |
| `changes-filter` | pass | — |
| `check` | pass | — |
| `docker-build-commerce-core` | pass | ubuntu |
| `markers-and-forbidden` | pass | — |
| `route` | pass | — |

`heavy-cloud` (통합 테스트 포함 추정) 아직 진행 중 — M0 리포트의 "CI 에서 실행 예정" 상태. 결과 미확인.

---

## B. CI 판정 — #450 · #269

### storeport #450 (`feat/M1-1126-B-cd-order-list-font-scale`)

| 잡 | 결과 | runner |
|---|---|---|
| `heavy-mac` | **pending** | mac |
| `heavy-cloud` | skipping | ubuntu |
| `changes-filter` | pass | — |
| `check` | pass | — |
| `docker-build-commerce-core` | pass | ubuntu |
| `markers-and-forbidden` | pass | — |
| `route` | pass | — |

**판정: CI 진행 중** — heavy-mac 대기. 경량 체크 전부 초록.

### fork (agilo-medusa-pos-fork) #269

| 잡 | 결과 | 시간 | runner |
|---|---|---|---|
| `assertions` | pass | 2m35s | — |
| `flow-tests` | pass | 43s | — |
| `playwright` | pass | 6m26s | — |
| `unit-tests` | pass | 46s | — |
| `heavy-cloud` | skipping | — | — |
| `lint` | pass | 1m3s | — |
| `route` | pass ×2 | 5s/9s | — |

**판정: CI 초록** — 모든 필수 체크 pass. heavy-cloud는 fork에서 skip 조건(변경 범위 해당 없음).

---

## 요약

| 항목 | 결과 |
|---|---|
| **#451 코드 리뷰** | **APPROVE** — A.1~A.3 이상 없음. A.4 통합 테스트 CI heavy-cloud 대기 중 (미검증 명시) |
| **#450 CI** | **진행 중** — heavy-mac pending |
| **#269 CI** | **초록** — 전 체크 pass |

**미실행·미검증**: cd-pos-screen-sync.spec.ts 추가분 2건(§3-A race-fill · §5-2 멱등성) — CI heavy-cloud 완료 후 확인 필요.
