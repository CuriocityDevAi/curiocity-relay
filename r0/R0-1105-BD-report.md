# R0-1105-BD — 리뷰 리포트
# storeport #207 rebase 분 · #208 CHANGES 반영 · fork #81 자동 검사 정비

**claim**: R0-1105-BD  
**판정일**: 2026-11-11  
**작업 범위**: storeport #207 미해결 대화 정리 + CI 초록 · #208 R0-AZ CHANGES 3건 해소 · fork #81 어설션 갱신 검증

---

## 판정 줄

| PR | 판정 | 사유 한 줄 |
|----|------|-----------|
| storeport #207 | **APPROVE** | CI 초록 · 미해결 대화 3건 모두 코드 반영 · resolveReviewThread 완료 |
| storeport #208 | **APPROVE** (코드 판정) | R0-AZ CHANGES 3건 해소 · 큐 예외 안전 · 메모리 누수 없음 |
| fork #81 | **APPROVE** | 어설션 약화 없음 · ['order'] dead key 제거 안전 · master 충돌 없음 |

---

## ① storeport #207

### CI 결과
`gh pr checks 207` (HEAD `0dcb97a` · run 42947917849):

| 체크 | 결과 | 시간 |
|------|------|------|
| pos-integration | ✅ PASS | 2m15s |
| changes-filter | ✅ PASS | 7s |
| check | ✅ PASS | 13s |
| markers-and-forbidden | ✅ PASS | 9s |
| docker-smoke-* / wrangler-check-* | SKIPPING | 경로 필터 |

### 미해결 리뷰 대화 (3건) → 반영 여부 file:line 확인

**스레드 1 — `PRRT_kwDOTe-UYs61ohlr` · `manager-pin.ts` VerifyResult 키 이름**  
지적: `remaining` → `remaining_attempts`, `retry_at` → `locked_until` 로 전체 개명 필요.  
확인: `_shared/manager-pin.ts:92-103, 122, 148, 150, 157`
```ts
// line 92-93 계약 명시 주석
// Response field names match the app contract (M0-1105-AB): `remaining_attempts`
// (401) and `locked_until` (423). Do not rename back to `remaining` / `retry_at`
export type VerifyResult =
  | { ok: false; reason: "locked"; locked_until: string }   // ← locked_until ✅
  | { ok: false; reason: "mismatch"; remaining_attempts: number; ... }  // ← remaining_attempts ✅
```
**→ 반영 · 해결** (resolveReviewThread ✅)

**스레드 2 — `PRRT_kwDOTe-UYs61ohvN` · `verify/route.ts` 응답 필드**  
지적: 401 `remaining` → `remaining_attempts`, 423 `retry_at` → `locked_until`.  
확인: `verify/route.ts:13-14, 72-73, 78-81, 85-88`
```ts
// line 72-73
res.status(423).json({ ok: false, reason: "locked", locked_until: result.locked_until });   // ✅
// line 85-88
res.status(401).json({ ok: false, reason: "mismatch", remaining_attempts: result.remaining_attempts });  // ✅
```
**→ 반영 · 해결** (resolveReviewThread ✅)

**스레드 3 — `PRRT_kwDOTe-UYs61oh5F` · `tenders.spec.ts` 단언 필드**  
지적: `remaining` → `remaining_attempts`, `retry_at` → `locked_until`, WIB 경계 테스트 권고.  
확인: `tenders.spec.ts:2801, 2819, 3035, 3061`
```ts
expect(caught.data?.remaining_attempts).toBe(4 - i);    // line 2801 ✅
expect(locked.data?.locked_until).toBeTruthy();          // line 2819 ✅
expect(after?.data?.remaining_attempts).toBe(4);         // line 3061 ✅
```
보강 테스트: #51 CASH/QRIS + card_terminal → 400 · #52 WIB 23:59→00:00 경계 PIN 변경 · #53 카운터 리셋.  
**→ 반영 · 해결** (resolveReviewThread ✅)

**해결한 대화 수: 3/3 → 남은 대화 0 → APPROVE**

---

## ② storeport #208

> CI: base = `feat/m0-1105-ab-void-refund-pin` → `pull_request: branches:[main]` 미발화. 코드 판정.

### R0-AZ CHANGES 3건 해소 (M0-1105-AE HEAD `0b5b5bc`)

**CHANGES 1 (CRITICAL) — hashReturnItems Guard A 분할 반품 오탐**  
해소 방향: Guard A 제거 (R0-AZ 안 ①).  
코드 확인:
- `route.ts:22-34` `orderReturnQueue: Map<string, Promise<unknown>>` + `withOrderLock()` 신설 (동시 요청 직렬화)
- `hashReturnItems()` 함수 삭제 ✅  
- Guard A 블록(metadata.returns hash 비교 → 409) 삭제 ✅  
- metadata 저장 시 `hash: reqHash` 필드 삭제 ✅  
- **test #55 재작성**: Pastry×2 → qty1 반품(200·60k) → qty1 반품(200·60k·다른 return_id) → 3rd qty1 400 over quantity ✅  
- 구 test #59(duplicate 409) 삭제 · **test #60 신설**: Admin GET PIN과 동일 storeId 현금 반품 E2E ✅  
→ **해소 ✅**

**CHANGES 2 (MEDIUM) — stockLocationId PIN storeId 불일치**  
코드 확인: `route.ts` stockLocationId 선언부에서 `?? body.register_session_id` fallback 제거.  
대체: `order.metadata.stock_location_id` 없으면 `stock_location.id` 첫 행(Admin GET `/admin/pos/manager-pin` 과 동일 소스) → 없으면 `"default"`. PIN 계산 storeId 항상 일치.  
→ **해소 ✅**

**MINOR — 미사용 `orderTotal` 삭제**  
`const orderTotal = toNum(order.total)` 삭제. 금액 계산은 `ori.total` 기반.  
→ **해소 ✅**

### 새 위험 평가

**큐 예외 때 풀리는지**  
```ts
const next = prev.then(fn, fn);  // fn 실패해도 fn 재실행 → rejection 전파
// ...
} finally {
  if (orderReturnQueue.get(order_id) === next) orderReturnQueue.delete(order_id);
}
```
`fn` 예외 시: rejection이 `next`로 전파 → `await next` throw → `finally` 블록에서 Map 항목 삭제. **큐 항상 풀림** ✅

**메모리 누수**  
`finally`의 `get(id) === next` 조건: 더 새 요청이 없으면 삭제, 있으면 그 요청의 완료 시 삭제. 연쇄 중 어떤 순서로 완료해도 체인 마지막 요청이 완료되면 항목 소멸. **누수 없음** ✅

---

## ③ fork #81

### 어설션 갱신 — 검사 약화 여부

**m3-1105-x U1 반전** (`scripts/m3-1105-x-fulfill-assertions.mjs`)

```diff
-  'U1 · OrderTypePicker · Delivery disabled:true 유지 (2/2 Checkout 라운드 몫)',
-  /type:\s*'delivery'[\s\S]{0,120}disabled:\s*true/.test(orderTypePicker),
+  'U1 · OrderTypePicker · Delivery 활성 (M3-1105-AC disabled 제거)',
+  !/type:\s*'delivery'[\s\S]{0,120}disabled:\s*true/.test(orderTypePicker),
```

M3-1105-AC (#75)에서 Delivery 활성화(disabled 제거) → 기존 어설션이 항상 false (무의미). 갱신 어설션은 실제 코드 계약을 검증. **약화 아님** ✅

**m3-1105-m hand-over → fulfill 교체** (`scripts/m3-1105-m-preorder-playwright.mjs`)

M3-1105-X (#67) FulfillSheet 도입으로 Hand over 버튼 제거됨:
- 기존: `order-hand-over` 클릭 1단계
- 갱신: `order-fulfill` 클릭(FulfillSheet 열기) + 1.5s 대기 + `fulfill-submit` 클릭(2단계)

검증 단계 증가 — **약화 아님, 오히려 더 세밀** ✅

### `register-session.ts` `['order']` 제거 안전성

```diff
 onSuccess: () => {
   qc.invalidateQueries({ queryKey: REGISTER_QK });
   qc.invalidateQueries({ queryKey: ['orders'] });
-  qc.invalidateQueries({ queryKey: ['order'] });
 },
```

- `useOrder` hook: `['orders', id]` 키 사용 → `['orders']` prefix invalidation(남아있는 line 256)으로 커버됨.
- `['order']` (단수·단독)는 `['orders', id]`와 완전히 별개 키 → 어떤 쿼리도 무효화하지 않는 dead key.
- **제거 안전** ✅

### master 충돌

- 브랜치 머지 베이스: `3e5f9df` (#78 직후)
- master 이후 추가: `0110267` (#79) · `3aecbae` (#77)
- #77/#79 변경 파일: `app/(tabs)/orders.tsx`, `api/hooks/pos-refunds.ts`, `components/orders/ManagerPinSheet.tsx` 등
- #81 변경 파일: `api/hooks/register-session.ts`, `scripts/*.mjs`, docs/screenshots
- **겹치는 파일 없음 → 충돌 없음** ✅ GitHub merge 클린.

---

## 체크 표

| 항목 | 결과 |
|------|------|
| #207 CI pos-integration | ✅ PASS |
| #207 미해결 대화 반영 확인 | ✅ 3/3 |
| #207 resolveReviewThread | ✅ 3/3 완료 |
| #208 CHANGES 1 (Guard A 제거) | ✅ |
| #208 CHANGES 2 (stockLocationId) | ✅ |
| #208 MINOR (orderTotal) | ✅ |
| #208 큐 예외 안전 | ✅ |
| #208 메모리 누수 없음 | ✅ |
| #81 m3-1105-x U1 약화 여부 | ✅ 약화 아님 |
| #81 m3-1105-m hand-over→fulfill | ✅ 약화 아님 |
| #81 ['order'] dead key 제거 안전 | ✅ |
| #81 master 충돌 | ✅ 없음 |

---

## 착지 명령

```bash
cp /tmp/R0-1105-BD-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BD-report.md && git commit -m "r0: R0-1105-BD" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BD done "#207 APPROVE(미해결 3/3 해결) · #208 APPROVE(CHANGES 3건+큐 안전) · #81 APPROVE(어설션 강화·충돌없음)"
```
