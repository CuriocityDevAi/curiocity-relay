# M1-1105-AJ Report

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/78  
**Branch**: fix/m1-1105-aj  
**Date**: 2026-11-10

---

## REQ 1 · pickupAt 기본값 제거

**위치**: `components/payment/PreorderInputs.tsx` (구 lines 132–136)

```typescript
// 제거 전 (문제):
React.useEffect(() => {
  if (!pickupAt) onPickupAtChange(tomorrow10());
}, []);
```

Pre-order 를 선택하면 컴포넌트가 마운트될 때 즉시 `tomorrow10()` 를 주입하여 Pay 가드가 사실상 우회되고 있었음. useEffect 를 제거함으로써 `pickupAt` 초기값(`''`)이 그대로 유지됨. 네이티브 Pressable placeholder 도 "Choose pickup date & time" 으로 통일.

---

## REQ 2 · 재진입 시 빈 칸 (권장안)

**권장안**: Pre-order 로 전환할 때 `pickupAt` 초기화. 이유 3줄:
1. 픽업 시간은 날짜/시간 민감 — 이전 세션에서 선택한 시간이 남아 있으면 다음 주문에 의도치 않은 날짜로 접수될 수 있음.
2. 주문 타입을 Takeaway/Delivery 로 바꿨다가 다시 Pre-order 로 오는 경우는 고객이 주문 종류를 바꾼 의도임 — 새 선택을 강제하는 것이 맞음.
3. "이전 값 유지" 의 편의보다 "오배달 방지" 의 안전이 POS 맥락에서 더 중요.

구현: `handleOrderTypeChange` 콜백에서 `newType === 'preorder'` 일 때 `setPickupAt('')` 호출.

---

## REQ 3 · Pay 비활성 + 힌트

기존 `preorderMissingPickup` 가드(`orderType === 'preorder' && !pickupAt`) 가 이미 존재하나, 기본값 주입으로 인해 실제로는 작동하지 않았음. 기본값 제거 후 정상 작동 확인.
- "Choose a pickup time" 힌트 (#69 문구) 유지
- Playwright AJ1b/AJ1c · Y4a/Y4b 모두 통과

---

## REQ 4 · 꺼진 Pay 탭 → 스크롤 + 강조

`TouchableOpacity` (Button)는 `disabled={true}` 시 터치를 소비하므로, `preorderMissingPickup` 조건일 때 Pay 버튼 위에 `position: absolute; inset: 0` Pressable overlay 를 렌더링함.

- **스크롤**: `flashListRef.current?.scrollToEnd({ animated: true })`
- **강조**: `setPickupHighlighted(true)` → `border-danger` 테두리 2초 → `setPickupHighlighted(false)` (setTimeout 2000ms, clearTimeout 으로 중복 방지)
- **스크린리더**: `accessibilityLiveRegion="assertive"` Text "Pickup time required"
- **접근성**: overlay 에 `accessibilityLabel="Pay — choose a pickup time to continue"` / `accessibilityState={{ disabled: true }}`
- **testID**: `checkout-pay-tappable`

---

## REQ 5 · 어설션 & Playwright

### 소스 어설션 (`scripts/m1-1105-aj-assertions.mjs`)
**21/21 PASS**

| §   | 내용 |
|-----|------|
| §1  | PreorderInputs — useEffect 기본값 없음, highlighted prop, border-danger, a11y |
| §2  | pickupAt useState('') 초기값 |
| §3  | preorderMissingPickup 가드 |
| §4  | handleDisabledPayTap — scrollToEnd + highlight + 2000ms |
| §5  | checkout-pay-tappable overlay (absolute inset-0) |
| §6  | highlighted={pickupHighlighted} 전달 |
| §7  | handleOrderTypeChange — preorder 전환 시 setPickupAt('') |
| §8  | "Choose a pickup time" 회귀 가드 |
| §9  | raw hex 0 — pickupAt 초기값 '' (length=0) |

### Playwright (`scripts/m1-1105-aj-playwright.mjs`)
**11/11 PASS** · 뷰포트: 1180×820

| 테스트 | 결과 |
|--------|------|
| AJ1a: Pre-order → pickupAt 빈 칸 | ✓ |
| AJ1b: Pay disabled | ✓ |
| AJ1c: 힌트 "Choose a pickup time" | ✓ |
| AJ2a: checkout-pay-tappable overlay 렌더됨 | ✓ |
| AJ3a: 빠른 버튼 → Pay enabled | ✓ |
| AJ3b: 힌트 숨김 | ✓ |
| AJ4: datetime-local 직접 입력 → Pay enabled | ✓ |
| AJ5a: Takeaway · 힌트 없음 | ✓ |
| AJ5b: Takeaway · Pay enabled | ✓ |
| AJ6: Pre-order 재진입 → 빈 칸 | ✓ |
| AJ6: Pre-order 재진입 → Pay disabled | ✓ |

**스크린샷 3장** (screenshots-m1-1105-aj/):
- `shot-aj-1-empty.png` — Pre-order 선택, 빈 칸, Pay 흐림
- `shot-aj-2-tapped.png` — 꺼진 Pay 탭 후 (overlay 클릭)
- `shot-aj-3-filled.png` — 빠른 버튼으로 채운 뒤 Pay 켜짐

### 회귀: M3-1105-Y 10/10 PASS

---

## 파일 변경

| 파일 | 변경 |
|------|------|
| `components/payment/PreorderInputs.tsx` | useEffect 제거, highlighted prop, border-danger, a11y |
| `app/checkout/[draftOrderId].tsx` | flashListRef, pickupHighlighted, handleOrderTypeChange, handleDisabledPayTap, overlay Pressable |
| `scripts/m1-1105-aj-assertions.mjs` | 소스 어설션 21개 (신규) |
| `scripts/m1-1105-aj-playwright.mjs` | Playwright E2E 11개 (신규) |
