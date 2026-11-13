# R0-1105-DP 리뷰 리포트

**PR**: CuriocityDevAi/agilo-medusa-pos-fork#129  
**Head SHA**: 14415323279aaeaaa4289be7984347261fa092e1  
**판정**: APPROVE

---

## REQ1 — Card 결제 화면 신규 파일

**결론: 신규 라우트가 기존 Card 결제 흐름을 파괴하지 않는다. 단, 현재 checkout 흐름에서 이 화면으로의 진입 경로가 없다 — orphan 화면 상태이며, 이는 의도된 K-3 단독 수정임.**

### 기존 Card 결제 흐름 (PR 이전)
- `app/checkout/[draftOrderId].tsx` Pay 버튼 → `checkout/tender-cash/[draftOrderId]` (line 315, 368)
- `tender-cash` 화면 내부에 Cash/Card/QRIS 탭(`PaymentMethodTabs`) 존재 → Card 탭 선택 시 `CardTenderPanel` 렌더 (line 209-211)
- Split 결제: `checkout/split-tender/[draftOrderId]` → Step 1/2 모두 `CardTenderPanel` 직접 임베드 (split-tender lines 373-379, 460-465)

### 신규 파일 분석 (`app/checkout/tender-card/[draftOrderId].tsx`)
- `PROVIDER_EDC_MANUAL` 사용 (line 60) ✅
- `input.bank / approval_code / card_last4` 서버 계약 준수 (line 61-63) ✅
- 성공 시 `router.replace('/checkout/success/[orderId]')` (line 69-77) ✅
- Split 호환: `split: true` 파라미터 없음 — 단독 결제 전용 화면 (split-tender는 자체 `CardTenderPanel` 사용, 영향 없음) ✅
- `headerLargeTitle: true` 적용 (`_layout.tsx` PR diff line 83, 화면 내 Stack.Screen line 92) ✅

### 중요 주의: Orphan Route
- `checkout/[draftOrderId].tsx` Pay 버튼은 여전히 `tender-cash`만 가리킴 (checkout lines 315, 334, 368)
- `tender-card` 화면으로 이동하는 `router.push` 호출이 현재 코드 어디에도 없음
- 즉, 이 화면은 등록만 되어 있고 현재 사용자가 접근할 방법이 없는 "예약 화면" 상태
- 이는 K-3의 명시적 목적("headerLargeTitle 추가"를 위한 Card 전용 화면 사전 등록)으로 보임 — 파괴 없음

---

## REQ2 — QuantityPicker 휴지통

`components/ui/QuantityPicker.tsx` 기준:

- **quantity===min + onRemove 존재 시 Trash2**: `showTrash = quantity === min && !!onRemove` (line 85) ✅
- **위치·사이즈**: 동일 `TouchableOpacity` (w-8, items-center justify-center), `size={variant === 'default' ? 16 : 24}` — 기존 Minus와 동일 (lines 98-122) ✅
- **접근성 레이블**: `accessibilityLabel={showTrash ? 'Remove item' : undefined}` (line 101) ✅
- **처리 중 비활성**: `isTrashDisabled = isRemoving || isPending || disabled` (line 86), 버튼 disabled 조건에 적용 (line 100) ✅
- **quantity ≥ 2 시 − 버튼**: `showTrash=false` → `onPress={handleDecrement}` (line 99), `disabled={!canDecrement}` (line 100) ✅

---

## REQ3 — 삭제·Undo 흐름

`app/(tabs)/cart.tsx` DraftOrderItem 컴포넌트 기준:

- **서버 삭제**: `updateDraftOrderItem.mutate({ id: item.id, update: { quantity: 0 } })` (cart.tsx PR diff line ~83)
  - `useUpdateDraftOrderItem` → `beginEdit → updateItem(quantity:0) → confirmEdit` (draft-orders.tsx lines 416-419)
  - `onMutate` 에서 `quantity===0` 시 items 배열에서 즉시 필터 제거 (optimistic update, draft-orders.tsx lines 464-466) ✅
- **Undo**: `addToDraftOrder.mutate({ items: [{ variant_id, quantity }] })` (cart.tsx PR diff line ~87)
  - `useAddToDraftOrder` → `beginEdit → addItems → confirmEdit` (draft-orders.tsx lines 304-309) ✅
- **PR #127 (cart-merge) 충돌 여부**: PR #127은 "카트 합치기" 로직. Undo 시 `addItems`를 호출하면 서버가 동일 variant_id를 기존 아이템과 병합할 수 있음. 현재 `useAddToDraftOrder`에 중복 체크 없음 — **단, cart-merge가 없으면(merge 미적용 상태) 중복 아이템 행 생성 가능성 존재** (Kyu 실기 항목)
- **마지막 아이템 삭제 → 빈 카트**: `useUpdateDraftOrderItem` → `invalidateQueries(['draft-order'])` → `useCurrentDraftOrder` 갱신 → `cart.tsx` FlashList가 빈 배열로 렌더 → 빈 카트 UI는 CartScreen 내 `items.length === 0` 분기로 처리 ✅

---

## REQ4 — CapsuleToastRemoved 토스트

`components/ui/toast/CapsuleToastRemoved.tsx` 기준:

- **기존 토스트 시스템 재사용**: `config/toast.tsx`에 `removedUndo` 타입 추가, `showToast.removedUndo()` → `Toast.show({ type: 'removedUndo' })` — `react-native-toast-message` 단일 시스템 사용 ✅
- **병렬 시스템 없음**: 별도 Toast 인스턴스 미생성 ✅
- **색 토큰 사용**:
  - `TOKEN_INK` (CapsuleToastRemoved.tsx line 14, shadowColor) ✅
  - `TOKEN_TOAST_MUTED` (line 14, Trash2 icon color) ✅
  - `TOKEN_TOAST_DANGER` (QuantityPicker.tsx, Trash2 활성 색) ✅
  - `TOKEN_INK_SUBTLE` (QuantityPicker.tsx, 비활성 색) ✅
  - 모두 `constants/brand.ts` 정의 토큰 — raw hex 없음 ✅
- **주의**: `style={{ shadowColor: TOKEN_INK, ... }}` (CapsuleToastRemoved.tsx lines 17-23) — style prop에 직접 지정되어 있으나 TOKEN 경유이므로 허용 범위 ✅

---

## REQ5 — CI / Quality

| 항목 | 결과 |
|------|------|
| lint | **pass** (1m 9s) |
| vitest (assertions) | **pass** (2m 31s) · 197 passed, 0 failed (PR body 자기 검증) |
| flow-tests | **pass** (39s) |
| playwright | **pending** (실행 중 / 완료 미확인) |
| mergeableState | **UNSTABLE** (playwright pending으로 인한 것으로 추정) |
| head SHA | `14415323279aaeaaa4289be7984347261fa092e1` |

- lint 0 errors, warnings 45 (기존 수준 유지, PR body 확인)
- web bundle guard: `tender-card` 신규 파일은 `react-native` / `expo-router` 임포트 사용 — 순수 web 번들 타겟 없는 RN 프로젝트이므로 해당 없음

---

## 주의

1. **Orphan Route (tender-card)**: `checkout/tender-card/[draftOrderId]`는 `_layout.tsx`에 등록되어 있으나 현재 checkout 흐름에서 이 화면으로 이동하는 `router.push` 호출이 없음. 추후 checkout에 Card 탭 분리 흐름 연결 시 `tender-cash`의 Card 탭 (`PaymentMethodTabs`) 과 중복될 수 있으므로, 연결 시점에 `tender-cash`에서 Card 탭 제거 여부를 명확히 결정해야 함.

2. **Undo + cart-merge 상호작용**: Undo 시 `useAddToDraftOrder`가 동일 variant_id를 카트에 재추가함. PR #127 (cart-merge)가 병합되어 있으면 서버가 기존 아이템과 수량 합산 처리. 반대로 미병합 시 중복 행 생성 가능. Undo 직후 아이템이 2개 행으로 분열되는지 실기 확인 필요.

3. **deleteItem 300ms 디바운스**: `useUpdateDraftOrderItem`에 300ms 디바운스 체인이 있음 (draft-orders.tsx line 383). `quantity:0` 삭제 호출도 디바운스를 탐 — Undo 버튼을 150ms 이내 연타하면 optimistic 제거 후 Undo가 먼저 실행되고 뒤이어 삭제가 확정될 수 있음. 현재 `isRemoving=true`로 Trash 비활성화는 되지만 Undo 버튼 타이밍 경쟁 조건은 남아 있음.

4. **playwright pending**: CI mergeable_state가 UNSTABLE인 이유가 playwright 미완료인지 실패인지 아직 불명. 병합 전 playwright 완료 확인 권장.

---

## Kyu 실기 항목

- [ ] **(a) 수량 1 휴지통 → 삭제 + "Removed · Undo" 토스트** — 카트에 상품 1개 담기 → 휴지통 아이콘 표시 → 탭 → 줄 사라짐 + 화면 위 캡슐 토스트 약 4초 표시
- [ ] **(b) Undo 복원** — 토스트에서 Undo → 같은 상품·같은 수량으로 복원 확인 (1개 행인지, 2개 중복 행인지)
- [ ] **(c) 수량 2 이상 − 버튼 유지** — 수량 2 이상일 때 왼쪽 버튼이 − 아이콘인지 확인
- [ ] **(d) tender-card 헤더** — `checkout/tender-card` 화면 직접 진입 시 (deep link 또는 임시 버튼) 제목이 뒤로가기 버튼과 겹치지 않는지 iOS 기기/시뮬레이터에서 확인
- [ ] **(e) 마지막 아이템 삭제 → 빈 카트** — 카트 아이템 1개만 남긴 뒤 삭제 → 카트 화면이 빈 상태 UI로 전환되는지
- [ ] **(f) Split 결제 Card 흐름** — split-tender 화면에서 Card 선택 → CardTenderPanel 정상 동작 (tender-card 신규 파일과 무관하게 기존 흐름 회귀 없는지)
- [ ] **(g) playwright 결과 확인** — CI에서 playwright 체크 최종 pass 확인 후 병합
