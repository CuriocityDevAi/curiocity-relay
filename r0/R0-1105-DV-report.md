# R0-1105-DV 리뷰 리포트
대상 PR: CuriocityDevAi/agilo-medusa-pos-fork#131
판정 시각 head: abd4574dce3ecdd58854d9a545d826fefb5162ee (BX 추가 커밋 반영)

---

## REQ 1 — headerLargeTitle · 화면별 오프셋 · iPad 뒤로가기 라벨

**headerLargeTitle: 0건** — `_layout.tsx` BW 커밋에서 4개 checkout Screen 모두 제거 확인.
로컬 grep (`grep -r headerLargeTitle --include="*.ts" --include="*.tsx"`) 결과도 0건.

### 화면별 패턴 (BX head 기준)

| 화면 | native title | 콘텐츠 제목 | useHeaderHeight 오프셋 |
|------|-------------|------------|----------------------|
| `checkout/[draftOrderId]` | `''` | `<Text className="text-2xl">Checkout</Text>` (FlashList ListHeaderComponent · L263) | `<Layout style={{ paddingTop: headerHeight }}>` (L100, L122, L255) |
| `checkout/tender-cash/[draftOrderId]` | `''` | `<Text className="mb-1 text-2xl">{heading}</Text>` | `<Layout style={{ paddingTop: headerHeight }}>` |
| `checkout/delivery/[draftOrderId]` | `''` | `<Text className="text-2xl">Delivery</Text>` | `contentContainerStyle={{ paddingTop: headerHeight }}` |
| `checkout/split-tender/[draftOrderId]` | `''` | `<Text className="mb-1 text-2xl">Split payment</Text>` | `<Layout style={{ paddingTop: headerHeight }}>` |

모두 `useHeaderHeight()` 반환값을 스크롤 컨테이너의 paddingTop 으로 적용 → 헤더 아래에서 콘텐츠 시작.

### iPad headerBackTitle 미지정 화면

- `checkout/[draftOrderId]`: `headerBackTitle: 'Cart'` 명시 → 뒤로가기 라벨 "Cart" ✓  
- `tender-cash`, `delivery`, `split-tender`, `success`: 부모가 `title: ''` → 뒤로가기 라벨 "" (빈 문자열) → "(tabs)" 노출 경로 없음 ✓  
- BW 변경 범위 내에서 "(tabs)" 라우트명 노출 위험 없음.

---

## REQ 2 — success 화면 dismissAll → navigate → setTimeout push

### "not handled by any navigator" 위험

```ts
router.dismissAll();
router.navigate('/(tabs)/orders');
setTimeout(() => { router.push({ pathname: '/orders/[orderId]', ... }); }, 0);
```

expo-router 는 navigation 요청을 내부 큐로 직렬화하므로 `dismissAll` + `navigate` 는 순서 보장.  
`setTimeout(0)` 은 macro-task 로 JS 이벤트 루프 한 바퀴 후 실행 → `navigate` 커밋 완료 후 `push` 가 발동.  
"not handled" 에러 발생 위험은 **낮음**. 기존 `CommonActions.reset` 이 expo-router 내부 state를 우회해 RESET 오류를 냈던 것에 비해 더 안전한 패턴.

### Hand over 경로

변경 없음 — `router.replace('/products')` 그대로 ✓

### My Orders 0.5초 플래시 재발 여부

`CommonActions.reset` 은 스택을 원자적으로 재구성했으므로 Orders 탭이 전혀 보이지 않았음.  
신규 패턴은 `navigate('/(tabs)/orders')` 가 렌더링된 뒤 `setTimeout(0)` 으로 상세 push.  
Orders 탭이 **약 1 프레임(≈16–33 ms)** 보이므로 0.5초 플래시는 재발하지 않지만 완전한 무플래시도 아님.  
실용적으로 허용 가능한 수준. 완전 무플래시가 필요하면 `InteractionManager.runAfterInteractions` 로 교체 가능.

---

## REQ 3 — CI · mergeStateStatus · 판정

### BX head abd4574 기준 CI

| 체크 | 상태 (BW 455e680) | 상태 (BX abd4574) |
|------|------------------|------------------|
| lint | **FAILURE** (prettier 2건: _layout.tsx L81, L88 inline 포맷) | **IN_PROGRESS** (BX prettier 수정 반영) |
| assertions | SUCCESS | IN_PROGRESS |
| flow-tests | SUCCESS | IN_PROGRESS |
| playwright | **FAILURE** (m1-1105-ao 2건) | 미시작 (assertions 완료 후) |

mergeStateStatus: **UNSTABLE**

### playwright 실패 근본 원인

`m1-1105-ao-playwright.mjs` AO2 섹션 2건 모두 tender-cash 관련:

1. `tender-cash · Stack import` — BW 가 `Stack` import 를 제거(`useHeaderHeight` 로 교체)했으나 AO2 검사(`/Stack,|Stack }|{.*Stack/`)를 업데이트하지 않음.  
2. `tender-cash · Order # 타이틀 패턴` — BW 가 Stack.Screen 의 `` title: `Order #${displayId}` `` 를 제거하고 JSX 표현식(`Order #{draftOrder.data.display_id}`)으로 대체했으나 AO2 검사(`` /`Order #\$\{/ ``)는 여전히 backtick 패턴을 기대.

BX 커밋은 prettier + unused displayId 만 수정했으며 AO2 테스트 업데이트는 미포함.  
**BX 가 m1-1105-ao-playwright.mjs AO2 체크를 아래와 같이 수정해야 playwright 통과 가능:**

```diff
- check('tender-cash · Stack import', /Stack,|Stack }|{.*Stack/.test(tenderSrc));
+ check('tender-cash · useHeaderHeight import', /useHeaderHeight/.test(tenderSrc));
- check('tender-cash · Order # 타이틀 패턴', /`Order #\$\{/.test(tenderSrc));
+ check('tender-cash · Order # 표시', /Order #\{/.test(tenderSrc));
```

---

## 판정: CHANGES_REQUESTED

BX 의 lint 수정은 올바르나 playwright AO2 2건이 BW 변경으로 깨진 채 미수정.  
BX 가 `m1-1105-ao-playwright.mjs` AO2 tender-cash 검사 2건을 신규 패턴에 맞게 업데이트한 뒤 CI 전체 GREEN 확인 후 APPROVE 가능.
