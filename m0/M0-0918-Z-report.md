---
round: M0-0918-Z
pr:
  hotfix: storeport#126
outcome: order-total-zero-root-fix
kyu_checks: 2
---

# M0-0918-Z · 결제 합계 0 뿌리 해소 (Hotfix · R021)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: 긴급 단독 hotfix (매출 blocker 해소)

**착지 조건 (Kyu 정본)**: Railway 배포 SUCCESS + 실 결제 Paid 전환.

---

## 0. 상태 실측

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| storeport main | main | `<M0-0918-G 이후>` | 이전 |
| storeport 핫픽스 | `fix/m0-0918-z-order-total` | `db70b8a` | **PR #126 OPEN** (단독 · 긴급) |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

---

## 1. 뿌리 (M0-0918-I §4 이관)

### 1.1 진단

- **위치**: `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts:113~181`
- **원인**: Medusa v2 아키텍처에서 `orderModule.retrieveOrder` (module service · 직접 호출) 는 **raw DB column 만** 반환. `total` 은 **derived field** (item_total + tax_total − discount_total) 이며 **remote query 시점에만 계산**. → module service 로 조회 시 `order.total = 0`.
- **증상 (Kyu 09-18)**: Order #15~#17 카드/QRIS 결제 → 400 "order total must be > 0" → 결제 blocker → **매출 zero**.

### 1.2 이전 코드 (M0-0918-C 시절)

```ts
order = await orderModule.retrieveOrder(order_id, {
  select: ["id", "total", "raw_total", ...],
  relations: ["items", "payment_collections"],
});
const total = toNum(order.total ?? order.raw_total);  // ← 0
if (total <= 0) {
  res.status(400).json({ message: "order total must be > 0" });  // BLOCKER
  return;
}
```

---

## 2. 수정 (M0-0918-Z)

### 2.1 `loadOrderWithTotal()` 신설 (route.ts:11~104)

3단 fallback 함수:

1. **query.graph** (Medusa v2 정본 · derived field 계산):
   ```ts
   const query = container.resolve(ContainerRegistrationKeys.QUERY);
   const { data } = await query.graph({
     entity: "order",
     fields: ["id", "total", "raw_total", "item_total", "tax_total",
              "discount_total", "metadata", "items.*", "items.product_id",
              "items.subtotal", "items.total", "items.unit_price",
              "items.quantity", "payment_collections.*"],
     filters: { id: order_id },
   });
   ```
2. **module retrieve 폴백** (graph 실패 시 · derived 없이 raw column 만).
3. **items 수동 합산**: `line.total` or `line.subtotal` or `unit_price * quantity` 각각 폴백.
4. 그래도 0 → 400 **"합계 0 · 상품 가격 확인"** (원인 명시 · 기존 "must be > 0" 대체).

### 2.2 로그 (진단성)

```
[Z] pos-complete order=<id> total=<n> source=graph_total|items_sum|raw_total
```

Railway 로그에서 `source=graph_total` 이 정상 · `items_sum` 은 graph 실패 폴백 · `raw_total` 은 최후 폴백.

### 2.3 검증

| 항목 | 결과 |
|------|------|
| `pnpm --filter commerce-core build` | Backend 3.04s · Frontend 15.62s · **PASS** |
| 로컬 새 clone + Postgres + admin seed | **미완 (별건)** · docker-compose.smoke.yml 로 감지 가능 |
| 실 결제 실측 | Railway 배포 후 Kyu 도장 (K1 · K2) |

---

## 3. Not Paid 재시도 경로 (자동 적용)

**앱 `useRetryPayment` 훅** (M0-0918-E 착지본) 은 같은 `POST /admin/register-sessions/:id/pos-complete` 엔드포인트를 호출. → **본 fix 자동 적용**.

**Kyu 주문 #15~#17 회수 절차** (K2):

1. Kyu 폰 Orders 목록.
2. Order #15~#17 각각 **Not Paid** 앰버 배지 탭.
3. Popup → payment_method (Card/QRIS) 선택 · 승인번호 6자리 재입력 → Confirm.
4. 성공 → **Paid 초록 배지 전환** · Toast "Payment captured" · Z 리포트 합계 정합.

---

## 4. Kyu 실기 (K1 · K2 · kyu_checks 2)

### K1 · Card→Paid (신 결제)

- Products → 상품 → Cart → Checkout → Card + 승인번호 123456 → Complete Order.
- Railway 로그: `[Z] pos-complete order=<id> total=<n> source=graph_total`.
- Orders 목록 = **Paid + Fulfilled** 초록 배지.

### K2 · Not Paid 재시도 회수

- Orders 목록에서 Order #15 (또는 #16 · #17).
- **Not Paid** 배지 탭 → popup.
- Card 선택 + 승인번호 6자리 → Confirm.
- 성공 시 **Paid** 초록 배지 · Z 리포트 편입.

`checks/m0/M0-0918-Z.md` 참조.

---

## 5. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 커밋 메시지 `!` 미사용 | ✓ |
| PR 본문 `processes:` 필드 | ✓ (#126) |
| relay push (main) | ✓ |
| kyu_checks: 2 | ✓ (K1 · K2) |
| 단독 PR | ✓ (다른 변경 없음) |
| 착지 조건 (Railway 초록 + 실 결제 Paid) | ⚠ **Kyu 도장 대기** |

---

## 6. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+1** | R021 매출 blocker 뿌리 해소 |
| **신설** | 0 | 새 REQ 없음 |
| **총 순증감** | **-1** (Kyu 도장 시 -2 · 재시도 회수 반영) | 병합 후 |

---

## 7. 다음 게이트

1. **PR #126 병합** (긴급) → Railway 자동 배포 SUCCESS.
2. **Kyu 실기 K1** → 카드 결제 성공 확진.
3. **Kyu 실기 K2** → Order #15~#17 재시도 회수 확진.
4. **Railway 로그 관찰** → `[Z] pos-complete source=graph_total` 다수 확진.
5. **M0-0919-A 착수** (M0-0918-I §5 라운드 계획 · provider 매핑 · 프로모션 배지 · 재고 배지 · Kyu 결정 3항 회신 후).

---

*M0-0918-Z · 2026-09-18 · 결제 합계 0 뿌리 hotfix · storeport PR #126 (단독 · 긴급) · kyu_checks 2 · 이연 -1 (Kyu 도장 시 -2)*
