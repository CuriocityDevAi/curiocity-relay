#352 CHANGES · 문제 3건

리뷰어: R0-1117-AT · 2026-11-18

---

## 결정: CHANGES

---

## REQ 1 — Commerce Core 경로 전수 대조 / 빠진 경로 표

### 경로 표 정확도 판정

| # | 경로 | 판정 | 비고 |
|---|------|------|------|
| R1 | `/admin/pos/orders-list` | ✅ 정확 | 단, 호출 앱 불완전 (문제 2) |
| R2 | `/admin/pos/draft-orders` | ✅ 정확 | 단, 호출 앱 불완전 (문제 2) |
| R3 | `/admin/pos/orders/:id` | ✅ 정확 | 계획서 shape 확인 완료 |
| R4 | `/admin/orders` SDK (Anchor 목록) | ✅ 정확 | `useQueryOrders.ts:31` 확인 |
| R5 | `/admin/orders` SDK (Anchor recent) | ✅ 정확 | `useQueryRecentOrders.ts` 확인 |
| R6 | `/admin/orders/:id` SDK | ✅ 정확 | `useQueryOrder.ts` 확인 |

**R5 파생 caller (계획서 별도 행 없음 — 올바름)**:
- `useQuerySessionOrders` — R5 위의 client-side `select` projection (created_at ≥ session.openedAt)
- `useUnfulfilledOrdersCount` — R5 위의 client-side `select` projection (fulfillment_status 카운트)
  → API 호출 추가 없음, 계획서에서 생략한 것 타당.

**Wing·CareAgent**: Wing은 order list 미구현 (page.tsx 2개 파일, order 없음), care-agent/src/index.ts 단일 파일 (order 없음). 계획서 "미구현" 표기 정확.

**e2e mock 위치 확인**: `admin-smoke.spec.ts:92·133` ✅ 계획서 기재 정확.

**빠진 경로 없음** — 현재 운영 중인 경로 중 계획서에서 누락된 것 없음.

---

## REQ 2 — 동작 불변 순서 + Wing 픽업 필터 자리

### 동작 불변 순서

Step 1 → 2 → 3 → 4 순서는 "작은 diff 먼저" 원칙 ✅

- Step 1 (`list-pos-orders` step 추출): query.graph 호출을 step으로 묶고 route는 shape 가공만 담당. R1·R2의 loyalty/tenders 계산이 route에 남으므로 동작 불변 보장 가능.
- 스냅샷 테스트 계획 타당: `integration-tests/pos/orders-list.spec.ts`에 `toMatchSnapshot()` 추가 후 Step 1 적용 → diff 0 확인. 체크포인트 목록 (loyalty_earn·customer_phone_masked·payment_method·pagination) 충분.
- Anchor E2E: `page.route("**/admin/pos/orders-list**")` mock이 이미 존재하므로 route 경로·shape 불변이면 E2E 통과 ✅

### Wing 픽업 예약(#354) 필터 자리

PR #354 설계서: 픽업 상태 11개 (`draft_cart→auto_reserved→paid→picked_up/no_show_held→disposed`) + 픽업 일시는 모두 `order.metadata.pickup_*` 저장.

계획서 `list-pos-orders` step Input:
```ts
filters?: { is_draft?: boolean; location_id?: string; session_id?: string }
channel?:  "pos" | "online" | "care"
```

- **고객(storefront) 픽업 목록**: Wing이 `GET /store/orders` 사용 예정 → step 불필요 ✅
- **매장 직원 admin 픽업 목록** (예약 관리 화면): admin API 필요. 현재 `filters` 타입에 `pickup_at_range`·`pickup_status` 없음. metadata 기반이므로 DB 필터 불가 → application-level 필터로 추가 가능하지만 **명시적 slot이 없음**.

현재 설계로 막혀있지는 않으나, `channel: "online"` 경로에서 pickup 필터를 application-level로 처리할 슬롯이 명시되지 않아 Wing 구현 착수 시 step interface 재설계 가능성 있음.

---

## 문제 목록 (CHANGES 사유)

### 🔴 문제 1 — PR 설명 "코드 변경 없음" 불일치 (필수 수정)

PR body: "코드 변경 없음 (docs-only)"이나 diff에 customer-display 코드 변경 포함:
- `apps/customer-display/app.config.ts` — Android adaptive icon 추가
- `apps/customer-display/src/components/MerosWordmark.tsx` — SVG → Image 컴포넌트 교체
- `apps/customer-display/src/components/SplashAnimation.tsx` — 변경
- `apps/customer-display/assets/` — 이미지 4개 추가

이 변경들은 계획 문서와 scope가 전혀 다름.
→ 옵션 A: customer-display 커밋을 이 PR에서 제외하고 별도 PR로 분리  
→ 옵션 B: PR 제목/설명을 "docs + customer-display icon" 등으로 수정

### 🟡 문제 2 — R1·R2 호출 앱 표 불완전 (보완 요청)

| 경로 | 계획서 기재 | 실제 |
|------|------------|------|
| R1 `/admin/pos/orders-list` | "Commerce Core admin 화면" | + fork POS (pos-r0 `lib/pos-order-adapter.ts`, M3-1117-B 진행 중) |
| R2 `/admin/pos/draft-orders` | "통합 테스트 전용" | + fork POS split-tender (`api/hooks/split-pending-orders.ts:40`) |

R2의 "호출 앱 없음"은 현재 사실과 다름. fork POS split-tender 화면이 이미 호출 중.
→ 표의 "호출 앱" 열 보완 필요.

### 🟡 문제 3 — Wing 픽업 admin 뷰 필터 slot 미명시 (보완 요청)

Section 3-A의 step input에 Wing pickup admin 뷰용 필터 (`pickup_at_range`, `pickup_status`) 슬롯 없음. PR #354 설계서의 state machine과 연결이 끊겨있음.  
→ Section 4 Wing 행에 "Wing admin 픽업 목록 뷰: `filters.pickup_at_range`·`filters.pickup_status` application-level extension 예정 (Step 4 착수 전 slot 추가)" 한 줄 추가 권장.

---

## 스냅샷 테스트 계획 판정

기존 `integration-tests/pos/orders-list.spec.ts`에 `toMatchSnapshot()` 없음 — 계획서 제안 타당. Step 1 적용 전 스냅샷 고정 → 적용 후 diff 0 확인 순서 ✅.

---

## 종합

경로 전수 표·이전 순서·동작 불변 접근법은 타당. 문제 1(코드 scope 불일치)이 docs-only 주장을 무효화하므로 CHANGES.
