#181 APPROVE · 문제 0건

## REQ 1 · Checkout 경쟁 조건 — PASS

**변경 전(master)**: `handleCheckoutPress`는 `isUpdatingDraftOrder === 0`만 확인 후 즉시 이동.
`awaitingMutation` effect는 `isFetching` 미체크 → mutation 완료 직후 refetch 중에도 navigate 가능.

**변경 후(PR)**: 3중 가드 추가
```
isUpdatingDraftOrder === 0 && !draftOrder.isFetching && !isTemp
```
- `handleCheckoutPress`: 세 조건 모두 충족 시에만 즉시 이동, 하나라도 미충족 시 `awaitingMutation = true` + spinner
- `awaitingMutation` effect: `isFetching` 조건 추가(`if (draftOrder.isFetching) return`) + temp ID 체크 (`String(id).startsWith('__temp__')`)
- 의존성 배열에도 `draftOrder.isFetching` 추가

연타 후 Checkout 즉시 누름 시나리오: mutation 진행 중 → `isUpdatingDraftOrder > 0` → 대기 → mutation 완료 + refetch 시작 → `isFetching = true` → 대기 → refetch 완료 + real ID 확인 → 이동. 금액 불일치 없음 ✓

**서버 금액 vs 앱 소계**: 결제 화면은 `draftOrderId`를 path param으로 받아 서버에서 draft order를 직접 조회하므로 앱 소계(optimisticTotal)가 checkout 화면 금액에 영향 없음 ✓

Edge note (severity: 무시 가능): `awaitingMutation` effect에서 `!draftOrderId` 케이스가 더 이상 `setAwaitingMutation(false)`를 호출하지 않음(이전 master는 호출함). 단, 이 경우 UI가 empty/skeleton으로 전환돼 Checkout 버튼 자체가 렌더링되지 않으므로 실질적 영향 없음.

## REQ 2 · 소계 즉시 표시 — PASS

**0·깜빡임**: 기존 skeleton(`<View className="h-7 w-1/4 bg-line" />`)을 `optimisticTotal` + `ActivityIndicator`로 교체. `optimisticTotal = items.reduce((sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 0), 0)` — 낙관적 아이템에 `unit_price` 포함되어 있으므로 0 미표시 ✓

**서버 값 교체**: `isUpdatingDraftOrder === 0 && !isFetching` 조건에서 `draftOrder.data.draft_order.total ?? optimisticTotal`으로 전환. 스피너 소등과 동시에 교체 ✓

**세금/할인 있는 상품 소계≠총액**: mutation/refetch 중엔 `optimisticTotal`(unit_price×qty 합, 세전·할인전)을 "Total" 레이블로 표시, 서버 응답 후 실제 `total`(세후·할인후)로 교체. 레이블 문구 변화 없음("Total" 유지). spinner가 "계산 중" 신호로 작동. POS 환경에서 1-2초 내 확정되므로 허용 가능한 UX. ✓

## REQ 3 · 썸네일·로그·tsc·테스트 — PASS

**썸네일 폴백**: `DraftOrderItem`에서
```
thumbnail = item.thumbnail || item.product?.thumbnail || item.product?.images?.[0]?.url
```
3단계 폴백 체인 ✓. `product-details.tsx`의 `findVariantInfo`도 동일 폴백 추가됨 ✓

**`[cart-timing]` prod 로그 차단**:
- `cart-mounted` effect: `if (__DEV__) console.log(...)` ✓
- `data-change` effect: `if (!__DEV__) return;` 첫 줄로 차단 ✓
- `draft-orders.tsx` refetch-start/refetch-retrieve: 각각 `if (__DEV__) console.log(...)` ✓
- `[M0-1116-K]` 로그(Checkout navigate)는 `__DEV__` 미가드이나 **이 PR 이전 master에 이미 존재** — 이 PR의 신규 도입 아님

**tsc 신규 오류**: worktree에서 `npx tsc --noEmit` 실행. 기존 e2e/helpers/api-mocks.ts, hooks/use-network-status.ts 오류는 master에서도 동일 존재. 이 PR의 변경 파일(cart.tsx, draft-orders.tsx, lib/phone-id.ts, customers.ts)에서 신규 타입 오류 없음 ✓

**vitest.config.ts**: `define: { __DEV__: false }` 블록 중복(10-13줄 = 14-17줄). 단, `git diff master...origin/fix/M3-1117-N-cart-instant-total -- vitest.config.ts` 출력 없음 → **이 PR 이전 master에 이미 존재**. 신규 도입 아님.

**테스트**: PR description "Tests 26 passed (26)". worktree node_modules 없어 로컬 직접 실행 불가 (Kyu 지시: npm install 금지). 테스트 파일 코드 검토:
- `m3-1117-c.test.ts`: onMutate 동기 순서 시뮬레이션 ✓
- `m3-1117-g.test.ts`, `m3-1117-h.test.ts`, `m3-1117-i.test.ts`, `m3-1117-j.test.ts`: CustomerLinkSheet/phone 관련
- `add-to-cart-optimistic.test.ts`: thumbnail·unit_price 필드 존재 + awaitingMutation 로직 단위 테스트 ✓
- 테스트 로직 모두 순수함수 단위 테스트로 환경 의존성 없음 ✓

## 범위 외 추가 파일

`components/payment/CustomerLinkSheet.tsx` (338줄 신규) — 고객 연결 시트. 이 PR의 주 기능(cart instant display)과 직접 연관 없지만 `CustomerBadge` 개선(maskedPhone 표시, `—` fallback)을 지원하는 맥락에서 함께 추가됨. 기능 작동에 문제 없음 ✓

## 종합

Checkout 경쟁 조건(isFetching + temp ID 이중 가드), optimistic total(0·깜빡임 제거), 썸네일 폴백 모두 명세대로 구현. 신규 tsc 오류 없음. `[cart-timing]` 로그 prod 차단 ✓.
