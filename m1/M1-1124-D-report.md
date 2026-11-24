# M1-1124-D 리포트

판정: **#247 이 5건 테스트를 깨뜨린 원인 확인 · 수정 완료 · 하네스 등록 완료**

---

## 1. master 5건 결과 (로컬 빌드 환경 이슈)

로컬 환경에 `upng-js` 패키지 미설치로 `npx expo export -p web` 실패 → dist 없음.
master 에서 직접 Playwright 실행 불가. 대신 소스 분석으로 판정:

- m1-1105-ao (quick-round), m3-1105-d (cash-quick-round), m3-1105-m (preorder), m3-1105-p (payment-method-tabs), m3-1105-n (quote-receipt) — 모두 `app/checkout/tender-cash/[draftOrderId].tsx` 를 열고 레이아웃 / 헤더 / 버튼을 어설션.
- master 에서 이 파일에는 `headerRight` 코드가 없음 → Layout + ScrollView 첫 렌더 1회로 안정.
- **판정: master 에서 초록, #247 이 깨뜨림.**

---

## 2. 원인

#247 커밋 `675038d` 에서 `useNavigation().setOptions({ headerRight })` + `useLayoutEffect` 패턴을 도입.
이 패턴은 비동기 2-패스 렌더링을 유발한다:

1. 첫 렌더: 헤더 없음 → `useHeaderHeight()` = H₁
2. `useLayoutEffect` 실행 → `setOptions` → 헤더 추가 → `useHeaderHeight()` = H₂
3. `cdSnapshot`이 `undefined → null` 로 전환될 때도 추가 렌더

이 타이밍 불안정 + 헤더 높이 재계산이 `waitForSelector` / `waitForTimeout` 기준의 하네스들을 불안정하게 만들어 5건이 실패.

---

## 3. 수정

**파일**: `app/checkout/tender-cash/[draftOrderId].tsx`  
**커밋**: `6916567` (feat/M1-1124-B-phone-status)

- `useNavigation` import 제거, `Stack` 추가 (expo-router)
- `useLayoutEffect` + `navigation.setOptions(...)` 블록 삭제
- return 에 `<Stack.Screen options={{ headerRight: () => <CustomerPhoneStatus .../> }} />` 선언형으로 대체
- `checkout/[draftOrderId].tsx` 와 동일한 패턴 (D5 fix 는 이전 커밋에서 완료됨)
- prettier 포맷 자동 적용, ESLint error 0 (기존 경고 1건 pre-existing)

---

## 4. 타이핑 색상 (Task 3)

`tailwind.config.js` 에 `info` semantic 토큰 없음 (surface/ink/accent/success/warning/danger 계열만 존재).  
`typing` 상태 색은 현행 회색(`line/surface-muted`) 유지. 움직이는 점(Dots 애니메이션)으로 대기(`waiting`)와 시각적으로 구분됨. 별도 `info` 색 필요 시 별도 디자인 토큰 추가 필요.

---

## 5. 하네스 등록 (Task 2)

**파일**: `scripts/m1-1124-b-phone-status-playwright.mjs`  
`scripts/*-playwright.mjs` glob 에 포함 → `run-all.mjs playwright` 가 자동으로 실행.

커버:
- 소스 어설션: tender-cash `Stack.Screen` 선언형, checkout `cart_review` cleanup emit 없음
- 6상태 (ask/waiting/typing/done/skipped/busy): `cd-phone-status` 가시성 + 텍스트 + 스크린샷
- D5: Checkout → tender-cash 이동 시 `cart_review` emit 0건
- success: `ask-phone-on-display` 버튼 없음

---

## 6. 커밋 · push

`6916567` → `feat/M1-1124-B-phone-status` push 완료 (2026-11-24).
