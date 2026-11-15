# R0-1116-C Report

#288 CHANGES · #289 CHANGES · CI: check-runs API 403 (접근 불가) · #288 dirty(충돌) · #289 unstable(#287 미머지)

## #288 — CHANGES

### 블로커
**[route.ts L175] loyalty_earn 형식 불일치 — 운영에서 Loyalty 열 항상 "—"**

`earn.ts`(`earnForOrder`)는 `metadata.loyalty_earn`을 객체 `{applied: true, amount: 330, account_id: ..., new_balance: ..., at: ...}` 로 저장한다. 그런데 route.ts는 `toNum(md.loyalty_earn)`을 호출한다:

```ts
// toNum 구현
if (typeof v === "object" && v && "numeric_" in v)
  return Number(v.numeric_) || 0;
return 0;  // ← {applied, amount} 객체는 numeric_ 없음 → 0 반환
```

→ 운영 주문의 `loyalty_earn`은 항상 0 → `loyaltyDisplay(0, null)` → "—".  
테스트가 `metadata.loyalty_earn = 5000`(숫자 직주입)으로 세팅하여 통과되지만, 실 earn 경로에서는 객체가 들어온다.

수정안:
```ts
const earnMeta = md.loyalty_earn as any;
loyalty_earn:
  earnMeta == null
    ? null
    : typeof earnMeta === "number"
    ? earnMeta
    : earnMeta?.applied
    ? Number(earnMeta?.amount ?? 0)
    : null,
```

### 체크리스트 결과
| 항목 | 결과 |
|---|---|
| CSS 숨김이 `/orders/:id` 상세·다른 메뉴 미영향 | ✅ `a[href="/orders"]` 셀렉터가 사이드바 항목만 대상, `/orders/xxx` 상세 링크 비매칭 |
| orders-list API admin 인증 | ✅ `/admin/pos/` → Medusa 프레임워크 JWT 자동 보호, 별도 middleware 불필요 |
| 번호 가림 응답 서버측 처리 | ✅ `maskPhone()` 서버에서 실행, 원본 `customer.phone` 미반환 |
| 비숫자 검색 페이지네이션 어긋남 | ⚠️ 검색 시 `setOffset(0)` → page 1 정상. page 2 이상 double-pagination 버그 존재하나 PR 본문 이연 명시 |
| loyalty_earn 저장 형식 일치 | ❌ 블로커 — 위 항목 |

### 기타
- `mergeable_state: dirty` — 머지 충돌 해결 필요.

---

## #289 — CHANGES

### 블로커
**[refund-recover.spec.ts L62] 빈 items 주문 → recoverForOrder 가 order_total_zero 반환 → 테스트 실패 예상**

`seedEarnedOrder`가 `items: []`로 주문을 생성하고, `earnForOrder`에 `syntheticOrder`(item_subtotal 직접 주입)를 넘겨 earn 메타데이터를 세팅한다.

그런데 `recoverForOrder`는 내부에서 `fetchOrderWithTotals(container, orderId)`로 DB order를 직접 조회한다:
```ts
const orderTotal = Number(order.total ?? order.item_subtotal ?? order.subtotal ?? 0);
if (orderTotal <= 0) {
  return { skipped_reason: "order_total_zero", recovered: 0, ... };
}
```
`items: []`로 생성된 주문은 Medusa가 `total = 0`으로 계산 → `order_total_zero` 가드 → `recovered: 0`.  
테스트는 `expect(result.recovered).toBe(330)` → **실 Postgres CI에서 실패 예상**.

M0-1116-A에서 `link-earn.spec.ts`에 real line_item 테스트를 추가한 이유와 동일한 맹점.

수정안: `createTestOrder(container, { total: opts.subtotal, items: [{ title: "...", quantity: 1, unit_price: opts.subtotal }] })`로 실 items 주문 사용.

### 체크리스트 결과
| 항목 | 결과 |
|---|---|
| 회수 비례 계산(floor) | ✅ `Math.floor((earnedAmount * refundAmount) / orderTotal)` |
| 잔액 0 바닥 | ✅ `Math.max(0, Math.min(requested, balanceBefore))` |
| 못 깎은 금액 기록(uncollected) | ✅ entries에 `uncollected = requested - toDebit` 기록 |
| refund_ref 멱등 | ✅ `prevEntries.some(e => e.ref === ref)` no-op |
| pg_advisory_xact_lock | ✅ `loyalty-recover:${orderId}` 키 |
| 환불/반품 두 경로 wire | ✅ refund + return route 모두 `recoverForOrder` 호출 |
| 기존 "적립금 결제분 되돌려주기" 동작 불변 | ✅ try/catch non-fatal, 기존 환불 흐름 미변경 |
| customer_identified source 구분 | ⚠️ `input.source` 사용 — 호출자 의존, 명시 테스트 없음 |
| 통합 테스트 4건 실제 line_item 경로 | ❌ 블로커 — 위 항목 |

### 기타
- `mergeable_state: unstable` — #287 선행 머지 필요.
- CI check-runs API 403. pos-integration runner에서 `loyalty/` 테스트 실행 여부 미확인.
- `order-loyalty` 위젯 → `loyalty-info` → `phone_e164` 흐름 확인. Admin 위젯 prop에 `item_subtotal`/`subtotal` 포함 여부는 배포 후 Kyu 실기 필요.

---

## CI
check-runs API 403으로 직접 job별 결과 확인 불가. #288 `dirty`(충돌), #289 `unstable`(#287 미머지 또는 CI 실패).
