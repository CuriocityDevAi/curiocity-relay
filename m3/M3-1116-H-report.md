PR #301 · 무반응 원인: press()가 digits 상태만 갱신, 자동 제출 없음 (pair.tsx:12-14) · 3열 전화패드 완료 · 6자리 자동 인증 완료 · 로컬 E2E 3개 통과 (1180×820)

## 무반응 원인

`apps/customer-display/app/pair.tsx` 12-14번째 줄:
```js
const press = useCallback((ch: string) => {
  setDigits((d) => (d.length < 6 ? d + ch : d));
}, []);
```
`press()`가 `digits` 상태만 갱신하고, 별도 `useEffect`나 자동 제출 로직이 없어 6번째 숫자 입력 후 화면이 멈춤.
"확인" 버튼을 직접 눌러야만 `handleOk`가 호출되는 구조였음.

## 수정 내용

### 1. 6자리 자동 인증 (`pair.tsx`)
- `useEffect([digits, doSubmit])`: `digits.length === 6` 도달 시 즉시 `POST /customer-display/pair`
- 진행 중 `loading:true` → 모든 키 disabled + 셀 opacity 0.6
- 실패 → `pair.error` (현재 언어) 표시 + `setDigits("")` + 흔들기 애니메이션 (`Animated.sequence`)
- 성공 → `saveDeviceToken` + `window.location.replace("/customer-display-web/")` → 대기 화면

### 2. 3열 전화패드 배열
기존: `flexWrap + width:32%` → 패드 너비(636px)에서 `3×32%+2gap = 638px` 오버플로 → 2열 wrap
수정: 중첩 row (`flex:1`) + `flex:1` key → `1 2 3 / 4 5 6 / 7 8 9 / [blank] 0 ⌫` 보장

### 3. 힌트 문구 (5개 언어)
`src/i18n/strings.ts` → `PairStrings` 타입 + `PAIR_STRINGS`:
- ko: "POS 앱 설정(톱니) › Customer Display › Show pairing code"
- en: "POS app Settings (⚙) › Customer Display › Show pairing code"
- id: "Pengaturan POS (⚙) › Customer Display › Show pairing code"

### 4. E2E (`e2e/pair-screen.spec.ts`)
3개 테스트 (1180×820 iPad 가로):
- ✅ 렌더 확인 + 스크린샷
- ✅ 6자리 입력 → mock POST → 대기화면 이동 + `code:"123456"` 검증
- ✅ 실패 → `pair-error` 표시 + 칸 비워짐 스크린샷

## 로컬 검증 로그

```
Running 3 tests using 1 worker
  ✓  pair-screen › no device token → /pair screen renders (iPad landscape) (1.2s)
  ✓  pair-screen › 6-digit auto-submit → pair POST called → navigates to waiting screen (1.3s)
  ✓  pair-screen › failed pair → error message shown · digits cleared (1.2s)
  3 passed (4.5s)
```

TypeScript: `tsc --noEmit` 에러 없음
Vitest: 123 passed (customer-display)
