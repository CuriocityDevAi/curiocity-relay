PR #148 · add to cart 원인: useAddToDraftOrder onMutate 없어 beginEdit→confirmEdit 3~5 서버 호출 순차 대기 → ~2000ms / 후: 0ms(즉시 이동, onSettled에 서버 완료 ms 로그) · 키보드 원인: 체크박스 Pressable 탭이 Modal 내 TextInput 포커스를 복원 유발 · CI: 0 errors(QuantityPicker useState 파생 패턴으로 set-state-in-effect 제거).

## 수정 내역

### 1. add to cart 낙관적 갱신 (api/hooks/draft-orders.tsx · app/product-details.tsx)
- 원인: `useAddToDraftOrder.mutationFn`이 `beginEdit → N×updateItem → addItems → confirmEdit` 3~5개 순차 서버 호출을 완료한 뒤 `onSuccess`에서 navigate → 체감 ~2000ms 지연
- 수정: `onMutate`에서 캐시 내 같은 variant 수량 즉시 갱신(낙관적) + 버튼 누르는 즉시 `animateOut()`·`router.dismissTo()` 호출. 실패 시 `onError`에서 캐시 롤백 + toast
- 타이밍 로그: `onSettled`에 `console.log([add-to-cart] server: Xms)` 추가
- 전: ~2000ms 후 navigate / 후: 0ms(즉시 이동), 서버 완료는 백그라운드에서 ~2000ms(변화 없음)

### 2. Checkout 배치 (app/checkout/[draftOrderId].tsx · components/payment/OrderTypePicker.tsx)
- OrderType 3칩: `variant="row"` 세로 → `variant="tab" flex-row` 가로 3칸 등폭. 부제목 단축('DP today', 'Addr. on checkout')
- 하단 버튼: `Split payment(flex:1) + Pay(flex:2)` 한 줄 `gap-4`. `Back to cart` 제거(상단 `< Cart` 중복)

### 3. Link customer 키보드 (components/loyalty/LinkCustomerSheet.tsx)
- 원인: Modal 내 Pressable(체크박스) 탭이 같은 트리 내 TextInput 포커스를 복원 유발 → 키보드 재등장
- 수정: `Pressable.onPress` → `Keyboard.dismiss()` 추가
- phone 입력 `keyboardType="phone-pad"` (기존 `DIGITS_INPUT_PROPS`의 `numeric` → 기호 포함 키보드 뜨던 현상 수정)

### 4. QuantityPicker:38 lint (components/ui/QuantityPicker.tsx)
- 기존: `useEffect(() => { setInputValue(...) }, [quantity])` → `react-hooks/set-state-in-effect` warning
- 수정: `useState(prevQuantity)` 파생 패턴(렌더 중 setState). 해당 파일 0 error · 0 warning

## 미검증
- 시뮬레이터/실기 스크린샷 미촬영(시뮬레이터 기동 불가 환경). Checkout 가로 배치는 코드 레벨 검증만.
