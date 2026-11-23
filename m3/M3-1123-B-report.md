# M3-1123-B · 다중 손님 R2 연결 리포트

판정: PASS (C1~C3 · 연결1 · 연결2 · 웹빌드 · Playwright 3/3 · vitest 16/16 · tsc 0 신규 에러)

## PR
- https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/228
- 브랜치: `feat/M3-1123-A-sell-chips`
- base: `master`

## 커밋
- `fc06522` feat(sell-chips): M3-1123-B — C1 재시작 복원 · C2 2분 제외 · C3 orderId 연결 · 연결1 · 연결2 · 웹 빌드
- `25c0151` test(e2e): M3-1123-B — OrderChips Playwright 시각 검증 (3뷰포트 · 칩 어설션)

## 변경 파일

### 수정
- `api/hooks/draft-orders.tsx` — C1: `restoreWaitingDraftOrders` (register session opened_at 기준 · WIB midnight 폴백). `AuthedBootstrap`에 복원 effect 추가. `DraftOrderListEntry.paidAt` 필드. `useCompleteDraftOrder`에서 `updateDraftPaidAt` 호출 (C2).
- `components/order-chips/types.ts` — C2: `OrderChipInput.paidAt` 추가. `buildOrderChips`에서 `paidAt + 2분 경과` no_phone 칩 필터.
- `components/order-chips/OrderChips.tsx` — 연결1: CD snapshot `phone_entry_open + order_id` → 해당 칩을 `phone_entry` 로 변환. `calcPhoneEntryRemainingSec` helper 추가. `paidAt` 맵핑 (hasPhone=false 조건).
- `components/order-chips/OrderChipDetail.tsx` — C3: "Enter phone here instead" → `router.push({ pathname: '/customer-lookup', params: { orderId } })` (setActiveDraft 없이 이 칩의 주문에 연결).
- `app/customer-lookup.tsx` — C3: `orderId` param 수신. 연결2: `targetOrderId` 존재 시 `useLinkOrderCustomer.mutateAsync` → 409 order_mismatch → `showToast.info('Another customer is entering a number')`.
- `lib/loyalty-snapshot.ts` — 연결1: `OrderSnapshot.phone_entry_open?: boolean` · `order_id?: string | null` 필드 추가.
- `__tests__/m3-1123-a-order-chips.test.ts` — C2 테스트 4개 추가 (`M3-1123-B C2 · no_phone 2분 제외`).

### 신규
- `e2e/flows/M3-1123-B-order-chips.spec.ts` — Playwright 시각 검증 (3뷰포트).

## 검증 결과

### vitest
```
16/16 passed (기존 12 + 신규 C2 4)
```

### tsc
```
0 신규 에러 (기존 28개 unchanged)
```

### 웹빌드
```
npx expo export -p web → dist/ 성공
upng-js · pako npm install 로 해소
```

### Playwright (3/3 PASS)
| 뷰포트 | 결과 | 칩 위치 |
|--------|------|---------|
| 1194×834 | ✓ | x=795 y=64 w=399 (CartPanel 헤더) |
| 834×1194 | ✓ | x=435 y=64 w=399 (CartPanel 헤더) |
| 390×844  | ✓ | x=0 y=64 w=390 (전체 너비) |

**검증 항목:**
- `order-chips` testID 렌더 확인
- `chip-new-order` 존재
- `chip-active-do_active_01` 존재 (SecureStore 시드)
- `chip-waiting-do_waiting_01` 존재 (restoreWaitingDraftOrders 비동기 완료)

**스크린샷:**
- `e2e/screenshots/M3-1123-B-chips-1194w.png`
- `e2e/screenshots/M3-1123-B-chips-834w.png`
- `e2e/screenshots/M3-1123-B-chips-390w.png`

## 미검증 항목
- **실기(iPad) 회귀**: 웹 빌드 기반 Playwright 만 수행. 실 기기 블루투스/QRIS 연동 미검증.
- **연결1 storeport PR #413**: `phone_entry_open` 필드는 storeport PR #413 미머지 시 undefined → waiting 폴백 (하위호환 코드 적용됨). 실 서버 연동 미검증.
- **연결2 409 플로우**: mock 단위 검증 없음 (isFetchError + status 409 분기는 코드 리뷰 수준).

## 비고
- `index.tsx`가 `router.replace('/products')` 로 초기 진입하므로 Playwright spec은 `/products` 로딩 후 `/sell` pushState 패턴 사용.
- 기존 Playwright 테스트들(`navigateTo` → `/products` 대기)은 M3-1123-A 이후 `initialRouteName: 'sell'` 변경으로 sell 탭을 직접 테스트하지 못하나, index.tsx의 `/products` redirect가 유지되어 기존 흐름은 호환됨.
