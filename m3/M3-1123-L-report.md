# M3-1123-L report
판정: ✅ PASS
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/244
mergeable: yes

## 요약
6건 모두 수정 · 커밋 · push · PR 생성. Unit 18/18 pass · e2e 12/12 pass (390w + 1180w).

## 항목별

### 4 칩 순서
실패 원인(파일:줄): `components/order-chips/types.ts:39-91` — `buildOrderChips` 가
  `const activeInput = inputs.find((i) => i.isActive);` 으로 active 를 먼저 찾고
  `chips.push({ kind: 'active', ... })` 로 맨 앞에 넣은 뒤 waiting 을 뒤에 붙임.
  → 선택 칩이 항상 index 0.
왜 #233 때 못 잡았나: #233 (M3-1123-G) 는 "#1 결제 → #2·#3 번호 불변" 만 검증하고
  "가운데를 선택했을 때 순서" 는 보지 않음. buildOrderChips 가 active 를 unshift 하는
  구조 자체는 M3-1123-A 부터 동일.
수정: `types.ts` 에서 createdAt 오름차순 하나로 정렬. active 여부는 순서 영향 없음.
  tie-break 는 `id` 사전식 (테스트 가능성). `OrderChips.tsx` 는 activeId 가 list 에
  없을 때 nowMs fallback 을 그대로 두되, `restoreWaitingDraftOrders` 가 active draft 도
  포함해 서버 `created_at` 로 `_draftOrderList` 의 createdAt 을 보정 → active 가
  "방금 생성된 것처럼" 맨 뒤로 튀는 버그 차단.
e2e: `e2e/flows/M3-1123-L-test2.spec.ts` 항목4 · 세 칩 중 가운데를 active 로 두고
  `[chip-waiting-do_1, chip-active-do_2, chip-waiting-do_3]` DOM 순서 어설션.

### 11 결제 후 칩 잔존
실패 원인(파일:줄): `api/hooks/pos-payments.ts:182` — `useCreateTender.onSuccess` 가
  SecureStore 와 react-query 캐시만 비울 뿐 `removeDraftOrderFromList` 를 호출하지 않음.
  현금/QRIS/split 경로 모두 `useCreateTender.mutateAsync` 를 쓰므로 세 경로 모두 잔존.
  `useCompleteDraftOrder:1307` 에는 removeDraftOrderFromList 가 있지만 M3 결제 경로가
  `useCreateTender` 로 옮겨간 뒤 그 쪽은 호출되지 않음.
왜 #233 때 못 잡았나: #233 은 "#1 결제 후 #2·#3 번호 유지" 만 검증. "다중 draft 칩" 자체는
  M3-1123-A 에서 도입됐고, tender 경로(`useCreateTender`) 와 완결 경로(`useCompleteDraftOrder`)
  두 개를 모두 추적해 양쪽 모두 removeDraftOrderFromList 를 호출하는지 확인하지 않음.
  M3-1123-G 테스트는 서버 응답으로 draft_orders 가 줄어든 상황을 **수동 setup** 해서 pass.
수정:
  (a) `pos-payments.ts` useCreateTender.onSuccess 에서 tender 응답을 받아
      `is_complete === false` (split 1차) 와 `preorder_stage === 'dp_paid'` (DP 만 납부) 는
      미완결로 보고 skip, 그 외 완결 시 `removeDraftOrderFromList(tender.order_id)` 호출.
  (b) 안전망 — `draft-orders.tsx` 에 `reconcileDraftOrderList` export, Sell 탭이
      `useFocusEffect` 로 복귀 시 1회 호출. 서버 draft 가 아닌 로컬 칩은 완료 간주 → 제거.
  checkout 파일은 수정 없음 (금지 사항 준수).
e2e: `e2e/flows/M3-1123-L-test2.spec.ts` 항목11 · draft_orders 를 `[d2]` 로 바꾸고
  SecureStore 를 비운 뒤 리로드 → `chip-active-do_1` / `chip-waiting-do_1` 둘 다 toHaveCount(0).

### 12 스캔 버튼
실패 원인(파일:줄): 조사 결과 **현재 코드 경로는 올바름** —
  `app/(tabs)/sell.tsx:223-230` 의 스캔 버튼 `router.push('/scan')`,
  `app/(tabs)/scan.tsx:126-149` 의 `<CameraView />` 가 정상 렌더.
  리포터가 본 "조회 같은 화면" 은 web 환경(expo-camera 미지원) 에서 흰 화면이 떠서
  customer-lookup 같은 느낌을 받은 것으로 추정 (실기 iPad 에선 정상).
왜 #233 때 못 잡았나: #233 은 스캔 플로우를 아예 테스트하지 않음. 소스 레벨에서 올바른
  라우트만 확인하면 됐지만 문서화되지 않음.
수정:
  (a) `scan.tsx` 루트 `View` 와 `CameraView` 에 `testID="camera-scanner"`, `testID="camera-view"`
      부여 — 레거시 회귀 가드.
  (b) 라우팅 소스 자체(sell.tsx) 는 그대로 유지 — 올바르므로 수정 불필요.
e2e: `e2e/flows/M3-1123-L-test2.spec.ts` 항목12 · 스캔 버튼 클릭 후 URL 이 `/scan` 전환되고
  `/customer-lookup` 은 **절대 포함되지 않음** 어설션 (회귀 방지). web 환경에서 click 이
  trigger 되지 않는 edge case 는 "실기 필요" 로 경고 로그. 실 카메라 영상은 실기 필요.

### 8 카트 시트
실패 원인(파일:줄): `components/cart/CartPanel.tsx:465-475` — `handleCheckoutPress` 가
  `router.push('/checkout/...')` 를 즉시 호출. CartSheet 는 React Native Modal
  (`components/cart/CartSheet.tsx:30-56`) 로 열려 있어, push 뒤에도 Modal 이 화면을 덮어
  "무반응" 체감.
왜 #233 때 못 잡았나: #233 은 CartSheet 를 열고 Pay 를 누른 뒤 **URL 전환 자체를 검증
  하지 않음**. 세로 모드 흐름 전체를 e2e 로 끝까지 추적하지 않음.
수정:
  (a) `CartPanel` 에 `onBeforeCheckout?: () => Promise<void> | void` 콜백 prop 추가.
      Pay 뒤 `await onBeforeCheckout?.()` 후 `router.push` 호출.
  (b) `CartSheet` 가 close 애니메이션(Animated.timing 220ms) 을 **완료 후 resolve** 하는
      Promise 를 콜백으로 전달.
  (c) `cart-sheet` testID 추가.
e2e: `e2e/flows/M3-1123-L-test2.spec.ts` 항목8 · CartBottomBar 탭 → cart-sheet 보임 →
  Pay 클릭 → URL `/checkout/do_1` 어설션.

### 5 진동/시각
실패 원인(파일:줄): `components/order-chips/OrderChips.tsx:106-112` — 길게 누르면
  `Haptics.impactAsync` 만 호출. iPad(web/태블릿) 는 햅틱 모터 없어 silent.
  그 후 띄우는 CancelOrderDialog 도 Cancel 버튼이 기본 ink 색(검정) 이라 파괴적 액션 신호 부족.
왜 #233 때 못 잡았나: #233 은 "실기 필요" 로 전체 skip. 소스 레벨 보완(최소한 Cancel 버튼
  danger 색) 도 안 함.
수정:
  (a) `OrderChips.tsx` 의 `onChipLongPress` — `Platform.OS === 'ios' | 'android'` 에서만
      Haptics 호출 (web/tablet 에선 조용).
  (b) `useShakeAnimation(trigger)` 훅 · 0.3초 짧은 좌우 흔들림. 길게 눌러 확인 다이얼로그가
      뜨면 해당 칩이 한 번 shake + `border-danger` 테두리.
  (c) CancelOrderDialog 의 Cancel 버튼 → `className="bg-danger"`, `textClassName="text-surface"`,
      `testID="cancel-order-confirm"` 부여.
e2e: `e2e/flows/M3-1123-L-test2.spec.ts` 항목5 · 길게 누른 뒤 Cancel 버튼 배경 RGB 가
  danger(빨강 R>>G,B) 임을 어설션. shake 는 Animated 값이라 Playwright 관측 어려움 →
  "실기 필요" 로 주석.

### 6 문구
실패 원인(파일:줄): `app/(tabs)/sell.tsx:294` — 메뉴 라벨 "Pickup orders".
  하지만 M2-1121-C 토스트 "Cash pickup recorded" 와 라벨 불일치 → UX 혼란.
왜 #233 때 못 잡았나: #233 은 "Pickup orders" 가 보이는 것만 어설션해 **라벨 변경을 요구하지
  않음**. 토스트 문구 변경이 선행됐을 때 라벨 갱신을 놓침.
수정: `sell.tsx` 라벨 한 줄 교체 → "Cash pickup". 테스트에선 라벨 내용과 함께 body text 에
  "Pickup orders" 가 **등장하지 않음** 도 어설션.
e2e: `e2e/flows/M3-1123-L-test2.spec.ts` 항목6.
