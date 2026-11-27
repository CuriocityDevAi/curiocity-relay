# R0-1127-S 리뷰 리포트

storeport#479: APPROVE (CI 미확인) · 필수 0 · 권고 0 · #480: CHANGES · 필수 1 · 권고 1
직접 실행: `order-snapshot.unit.spec.ts 53/53` · `cd-pos-sync-v4.spec -t Re-enter 4/4 (28s)` · fork#287 case1b 단위 커버 확인 · CI check_runs 403 (미확인)

---

## storeport#479 — APPROVE (CI 미확인)

**head**: `99a55bd2` · **base**: `main`

### 필수 1 해소 ✅

R0-1127-R 지적 `snapshots.spec.ts timer-label testID 미동기` → `99a55bd2` 에서 수정 확인.

```diff
- const timer = page.getByTestId("timer-label");
+ const timer = page.getByTestId("keypad-countdown-number");
```

`KeypadAfterScreen` 의 `testID="keypad-countdown-number"` 와 일치.

### REQ별 소견

| REQ | 판정 | 근거 |
|-----|------|------|
| 카운트다운 아키텍처 | ✅ | `computeCountdown` 순수 함수 + `firedRef` 가드 — `onTimeout` 중복 발화 차단. `keypad-countdown.test.ts` 12개 단위 테스트 커버 |
| "N 포인트" 체인 | ✅ | `receipt.earned → customer_flow.points_earned → points_to_earn → loyalty.earn_preview` — OrderSnapshot 타입 필드명 전부 일치 |
| `Order #display_id` 제거 | ✅ | CartScreen / QrisScreen 헤더 제거 · KeypadScreen `pos_order_num != null ? \`#${pos_order_num}\` : ""` |
| semantic 토큰 | ✅ | `STATUS_COLORS.statusWarn`, `t.primary`/`t.primaryInk` — raw hex 없음 |

**CI**: check_runs 403 접근 불가 (CI 미확인). heavy-mac e2e · customer-display 초록 확인 후 머지 가능.

---

## storeport#480 — CHANGES · 필수 1 · 권고 1

**head**: `6f2cc0f1` · **base**: `feat/M0-1127-M-cd-keypad-countdown` (#479 stacked)

### 필수: 환불/void 주문 Re-enter → 적립 생성 가능

**발생 조건**:
- POS 환불/void 후에도 `snapshot_state` 는 `"paid"` 유지 (subscriber 없음 · 환불 라우트 수정 금지)
- `link_open_until` 은 EOB 까지 유지
- PR#480 이전: `customer_phone` 조기 거절 가드가 환불 주문도 차단 (부수 효과)
- PR#480 이후: 해당 가드 제거 → `isReenter = true` → phone_entry 재개 → `linkCustomerToOrder` → `earnForOrder` 실행 → **환불 주문에 적립 발생**

**제안 수정**: `openPhoneEntry` 내 `isReenter = true` 직후 Medusa `order.payment_status` 조회:
```ts
if (isReenter) {
  const orderRows = await query.graph({ entity: "order", fields: ["payment_status"], filters: { id: order_id } });
  const ps = orderRows.data?.[0]?.payment_status as string | undefined;
  if (ps === "refunded" || ps === "canceled" || ps === "voided") {
    return { ok: true, eligible: false, reason: "order_refunded", snapshot: target } as const;
  }
}
```

### REQ별 소견

| REQ | 판정 | 근거 |
|-----|------|------|
| REQ-2 A3 confirmed 가드 (영원히 stale 안 됨) | ✅ | ReceiptScreen 5초 `onDone` → `router.replace("/done")` 클라이언트 이탈. `isPhoneEntryOpen(confirmed)=false` (customer_phone 세팅). 새 카트 → pickBestSnapshot rank 교체 |
| REQ-3 Re-enter A→B 1회 | ✅ | integration `loyalty_transfer entry` 포함 통과 (5615ms) |
| REQ-3 같은 번호 no-op | ✅ | `previousCustomerId === upsert.customer_id` integration 통과 |
| REQ-3 동시 두 요청 | ✅ | `withRegisterPhoneEntryLock` 직렬화 |
| REQ-3 새 카트 뒤 거절 | ✅ | `new_cart_started` 체크 |
| REQ-3 환불/void Re-enter 적립 | ❌ | **필수** — 위 상세 참조 |
| REQ-4 B 애니메이션 | ✅ | `lastAnimatedReceiptId` 모듈 스코프 — 같은 snapshot.id 재진입 즉시 완료 · 다른 주문 2400ms 정상 슬라이드 |
| REQ-4 A2 키패드 timing | ✅ | `Animated.timing(700ms, Easing.out(Easing.cubic))` — overshoot 제거 |
| REQ-5 fork#287 case1b | ✅ | unit spec `"paid + confirmed → false"` 53/53 직접 실행 — integration:pos DB 연결 성공, Re-enter 4/4 PASS |

### 권고: `lastAnimatedReceiptId` 모듈 스코프

`LeftPaymentPanel.tsx` singleton — React Native HMR/Fast Refresh 시 초기화 · 프로덕션 무해. 현재 플로우에서 여러 `ReceiptMiniVariant` 동시 존재 없음 → 필수 차단 아님.

---

## 직접 실행 명령

```bash
# 단위 테스트 (fork#287 case1b 포함)
cd /tmp/sp-480-review && pnpm --filter commerce-core exec jest \
  --testPathPattern="order-snapshot.unit.spec" --runInBand --forceExit
# → 53/53 pass (1.82s)

# Re-enter 통합 테스트
cd /tmp/sp-480-review/apps/commerce-core && \
  TEST_TYPE=integration:pos DB_USERNAME=$USER NODE_OPTIONS=--experimental-vm-modules \
  pnpm exec jest --testPathPattern="cd-pos-sync-v4.spec" --runInBand --forceExit -t "Re-enter"
# → 4/4 pass (28s)
```

## PR 코멘트

- #479: https://github.com/CuriocityDevAi/storeport/pull/479 — COMMENT (APPROVE) 등록
- #480: https://github.com/CuriocityDevAi/storeport/pull/480 — COMMENT (CHANGES) 등록
  (자기 PR approve/request_changes 불가 → COMMENT 로 대체)
