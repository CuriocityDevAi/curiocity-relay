fork #213 Print failed 제거 O · Next customer 우상단 1/3 O · Ask phone 이동 O · 상태 불일치 원인 snapshot.pre_entry=true 시 classifyCustomerDisplay가 connected를 반환하지만 UI는 connected를 Link customer 버튼으로 처리해 entering/Link customer가 노출됨 · 수정 O · assertions 28/28 · flow 101/101 (m1-1117-e 2건 선행 known fail 제외) · lint 0

## 상세 내용

### 변경 파일
- `app/checkout/success/[orderId].tsx`
- `components/payment/SuccessReceiptAnim.tsx`
- `__tests__/m2-1119-s-pos-slip-fixes.test.ts` (assertions 갱신)
- `__tests__/m2-1120-b-link-card-state.test.ts` (신규 · 4 케이스)

### REQ 1: Print failed · Retry 버튼 삭제
- `[orderId].tsx` 상단 `{printFailed && <Button>Print failed · Retry</Button>}` 블록 완전 제거
- `SuccessReceiptAnim.tsx` Reprint 버튼 옆에 `printFailed` prop 수신 시 `<Text className="text-sm text-warning" testID="print-failed-hint">Printer not connected</Text>` 렌더 (시맨틱 토큰 `text-warning`, raw hex 미사용)

### REQ 2: Next customer 버튼 헤더 이동
- `SuccessReceiptAnim` 에서 `onNextCustomer` prop 및 버튼 완전 제거
- `Stack.Screen options={{ headerRight: () => <Button testID="next-customer" style={{ width: Math.floor(windowWidth / 3) }} numberOfLines={1}>Next customer</Button> }}` 로 헤더 우상단 배치
- `useWindowDimensions` 으로 화면 너비 1/3 계산

### REQ 3: Ask phone on display 이동
- `[orderId].tsx` 최상단 `askPhoneBtn.kind !== 'hidden'` 블록 제거
- `SuccessReceiptAnim` 에 `askPhoneBtn`, `askPhoneStatus`, `onAskPhoneOnDisplay` props 추가
- Hand over 버튼 바로 아래 (takeaway 조건 블록 내) Ask phone 렌더 — 손님 상태 카드가 그 아래 위치

### REQ 4: 상태 불일치 원인 및 수정
**원인**: `snapshot` 폴링 주기 10s. `snapshot.pre_entry=true` (손님이 화면에서 번호 입력 완료) 가 도착했더라도 `isLinkedByDisplay` 는 `useEffect` 가 아직 실행되지 않아 `false`. `classifyCustomerDisplay` 는 `pre_entry=true` 면 `connected` 를 반환하지만, `LinkCustomerCard` 는 `connected` 케이스를 `"Link customer"` 버튼으로 처리 → 적립 완료인데 버튼이 노출되는 불일치.

**수정**: `LinkCustomerCard` 에서 `isLinkedByDisplay` 체크 직후 `snapshot?.pre_entry` 를 직접 판정 → `true` 면 `link-card-display-connected` 뷰 즉시 렌더 (entering/Link customer 차단). 1~2줄 주석 추가.

### assertions / tests
- `scripts/m3-1105-d-assertions.mjs`: 28/28 pass
- `npx vitest run __tests__/`: 1094 pass, 2 fail (m1-1117-e 선행 known fail · 본 PR 무관)
- 신규: `__tests__/m2-1120-b-link-card-state.test.ts` 4 케이스 모두 green
- `m2-1119-s-pos-slip-fixes.test.ts` REQ 2 블록 갱신: 48/48 pass

### 스크린샷
Playwright 패키지 미설치(`node_modules/.bin/playwright` 없음) — **미검증**. Kyu 실기 확인 필요.
경로 M2-1120-B-360.png, M2-1120-B-600.png, M2-1120-B-1024.png: 미생성.

### PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/213
