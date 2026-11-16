PR #154 · Checkout 활성까지 전 ~2000ms → 후 0ms · 시트 튐 원인: 동의 Pressable 의 Keyboard.dismiss() 가 BottomSheet 의 useKeyboard(paddingBottom=keyboardHeight) 를 재발화시켜 sheet 크기 토글 유발.

## 파일
- `app/(tabs)/cart.tsx` — Checkout 버튼 disabled 조건에서 `isUpdatingDraftOrder > 0` 제거 · 낙관적 활성화 · 누른 순간 mutation 중이면 `awaitingMutation=true` (스피너) · useEffect 가 settle 감지 시 `router.push`. 측정 로그: `[M0-1116-K] Checkout navigate immediate (wait=0ms)` / `[M0-1116-K] Checkout navigate after wait Xms`.
- `components/loyalty/LinkCustomerSheet.tsx` — 동의 Pressable `onPress` 에서 `Keyboard.dismiss()` 제거 · `setConsent((v) => !v)` 만. `Keyboard` import 제거. TextInput 포커스·키보드 상태 그대로 (숫자패드 유지).

## 측정 / 검증
- 전: #148 전까지 add-to-cart 가 2초 대기 후 이동 · #148 로 Cart 이동은 0ms 되었으나 `isUpdatingDraftOrder > 0` 이 여전히 Checkout `disabled` 에 걸려 ~2000ms 뒤 활성 (실측 = Kyu 11-16 13:35 "약 2초정도 걸렸음").
- 후: Checkout disabled 조건이 items 유무·fetching 만 보도록 변경 → 활성화 지연 0ms. 누른 순간 mutation 미종료 시 spinner → settle 후 즉시 navigate (실측 로그 자동 기록).
- 유닛 335 pass · TS 에러 86 → 86 (신규 0) · 린트 48 → 49 (신규 warning 1, error 0).

## 회귀
- #148 낙관적 add-to-cart (즉시 Cart 이동) · Checkout 한 줄 · phone-pad 숫자패드 그대로.

## 미검증
- 시뮬레이터/iPad 실기 동작 미실행 (타입체크 · 335 유닛 pass · 린트 신규 error 0 로만 검증). Kyu 실기 QC 로 확진 필요:
  1) Product → add to cart → 즉시 Cart 이동 → Checkout 버튼 즉시 누름 (대기 0, 혹은 mutation 미종료 시 spinner → 자동 전이)
  2) Order detail → Link customer → 전화번호 입력 → 동의 체크 → sheet 크기 변화 0 (키보드 상태 그대로 · 시트 튐 없음)
