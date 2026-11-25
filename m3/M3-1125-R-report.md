# M3-1125-R 완료 보고서

## 결과 요약

| 항목 | 결과 |
|------|------|
| PR | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/266 |
| 브랜치 | `feat/M3-1125-R` |
| 커밋 | `69561c7` |
| Unit tests | 23/23 ✅ |
| E2E tests | 5/5 ✅ |

---

## 구현 내역

### 1. `lib/loyalty-snapshot.ts`

- `CustomerFlowState` 타입 추가 (7상태: none/entering/first_visit/confirming/confirmed/skipped/unconfirmed)
- `CustomerFlow` 인터페이스 추가 (phone, phone_masked, is_first_visit, points_balance 등)
- `OrderSnapshot`에 `customer_flow?: CustomerFlow | null` 필드 추가
- `classifyCustomerFlowChip(flow)` → `'hidden' | 'typing' | 'confirming' | 'confirmed' | 'not_confirmed'`
- `requiresNextCustomerWarning(flow)` → entering/first_visit/confirming 시 `true`

### 2. `components/customer-display/CustomerPhoneStatus.tsx`

- `onLinkCustomer?: () => void` prop 추가
- Rules of Hooks 준수: `flowChipKind`, `status` useMemo를 모두 조건부 return 이전 최상단에 배치
- `customer_flow !== null`이면 `CustomerFlowChip` 렌더 (기존 phone_entry_state 칩 대체)
- `CustomerFlowChip` 내부 컴포넌트: 4종 비주얼 — typing(파랑+점), confirming(파랑), confirmed(초록+체크), not_confirmed(회색·Pressable)

### 3. `api/hooks/pos-loyalty.ts`

- `useCustomerFlowAction()` 훅 추가: `POST /admin/pos/customer-flow`
- `CustomerFlowActionInput`: `{ action: 'link_phone'; phone: string } | { action: 'reset' }`
- `CustomerFlowActionResult`: `{ ok: true; customer_flow } | { ok: false; reason; customer_flow }`

### 4. `components/loyalty/LinkCustomerSheet.tsx`

- `useLinkCustomer` → `useCustomerFlowAction` 교체
- `handleLink`: `flowMut.mutateAsync({ action: 'link_phone', phone })`
- 성공 시 "Sent to customer display / Awaiting customer confirmation" 화면 전환
- `linkMut.isPending` → `flowMut.isPending` 오타 수정

### 5. `app/(tabs)/products.tsx`

- `useCustomerDisplaySnapshot`, `requiresNextCustomerWarning` import 추가
- `handleNextCustomer`: `requiresNextCustomerWarning(snapshot?.customer_flow)` 체크 후 경고 Dialog 또는 직접 실행
- 경고 Dialog: "Customer is entering their number" — [Keep waiting] / [Next customer anyway]

### 6. `app/(tabs)/sell.tsx`

- Register 메뉴 BottomSheet에 "Next customer" 버튼 추가 (`testID="products-next-customer"`)
- `useCustomerDisplaySnapshot`, `useNextCustomer`, `requiresNextCustomerWarning` wiring
- 경고 Dialog (products.tsx 동일 구조): `testID="next-customer-warning"` 등
- **이유**: Expo Router 웹 SPA에서 `href:null` 탭(`products`)은 DOM에 렌더되지 않아 E2E 접근 불가 → 실제 사용자가 보는 sell 화면에서도 Next customer 기능이 필요함

### 7. `app/checkout/success/[orderId].tsx`

- `LinkCustomerSheet` props 정리: `onLinkPhoneSent` callback 연결
- `CustomerPhoneStatus`에 `onLinkCustomer` prop 연결

---

## 테스트

### Unit tests (`__tests__/m3-1125-r-customer-flow-chip.test.ts`) — 23/23 ✅

| 그룹 | 테스트 수 |
|------|----------|
| classifyCustomerFlowChip 7상태 분류 | 9 |
| requiresNextCustomerWarning 경고/바로 분기 | 9 |
| Next customer 경고 시트 행동 (Keep waiting=0, Anyway=1) | 2 |
| Link customer → link_phone 행동 | 3 |

### E2E (`e2e/flows/M3-1125-R-customer-flow.spec.ts`) — 5/5 ✅

| 테스트 | 스크린샷 |
|--------|---------|
| 칩-A: entering → "Customer typing •••" | `M3-1125-R-chip-A-typing.png` |
| 칩-B: confirming → "Awaiting confirm · 0813-••••-456" | `M3-1125-R-chip-B-confirming.png` |
| 칩-C: confirmed → "✓ 0813-••••-456 · IDR 150,000" | `M3-1125-R-chip-C-confirmed.png` |
| 칩-D: unconfirmed → "Not confirmed · Link customer" | `M3-1125-R-chip-D-not-confirmed.png` |
| 경고 시트: entering → Dialog 노출 | `M3-1125-R-warning-sheet.png` |

---

## 비고

- Expo Router 웹 SPA에서 `href:null` 탭은 DOM에 렌더되지 않아 E2E에서 직접 접근 불가. M3-1121-B 테스트도 동일 이슈로 현재 실패 중(기존 버그). sell.tsx에 Next customer 추가로 E2E 경로 확보.
- 기존 `products.tsx`의 Next customer 경고 로직은 그대로 유지 (네이티브 앱에서 여전히 동작).
- TypeScript 에러는 모두 기존 코드의 사전 존재 오류 — M3-1125-R 파일에는 TS 에러 없음.
