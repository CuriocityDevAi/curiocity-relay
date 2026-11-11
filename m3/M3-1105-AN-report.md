# M3-1105-AN 착지 보고서

**브랜치**: `feat/m3-1105-an-digits-input`  
**PR**: #90  
**베이스**: `feat/m3-1105-am-keypad-reuse` (AM)

---

## 오케 (a) 확인 결과

`components/payment/CardTenderPanel.tsx`의 "Card last 4 digits" 입력은
`<TextInput keyboardType="numeric" maxLength={4} testID="card-last4-input">` — **시스템 숫자 키패드 사용 · 별도 커스텀 키패드 컴포넌트 아님**.

검증: `CARD_LAST4_RE = /^[0-9]{4}$/`, `onLast4Change`가 `replace(/[^\d]/g, '').slice(0,4)` 처리.  
따라서 PIN 쪽이 "같은 입력 방식"을 쓰려면 → 공용 DigitsInput 추출 후 PIN이 재사용하는 방향.

---

## 변경 내용

### 새 파일
- `components/ui/DigitsInput.tsx` — 4자리 숫자 단일 TextInput 공용 컴포넌트
  - `keyboardType="numeric"` · `maxLength={4}` · 비숫자 자동 제거 · `onComplete` 4자리 자동 제출
  - `secureTextEntry?` prop — PIN은 `true` · 카드 끝 4자리는 미사용(평문 표시)
  - `hasError?` prop — `border-danger` 토글

### 수정 파일
- `components/payment/CardTenderPanel.tsx`
  - card-last4 `TextInput` → `DigitsInput` (최소 변경)
  - `testID="card-last4-input"` · `CARD_LAST4_RE` 검증 · 동작 완전 동일

- `components/orders/VoidRefundSheet.tsx`
  - PIN 단계: `NumericKeypad` → `DigitsInput` (`secureTextEntry` · `testID="manager-pin-input"`)
  - `pinShakeKey` state 제거 (DigitsInput 단일 TextInput이므로 흔들림 애니메이션 불필요)
  - 에러: `testID="manager-pin-error"` Text로 표시

- `components/orders/ManagerPinSheet.tsx`
  - PIN: `NumericKeypad` → `DigitsInput` (`secureTextEntry` · `testID="manager-pin-input"`)
  - `shakeKey` state 제거

### 삭제 파일
- `components/pin/NumericKeypad.tsx` — 사용처 0 확인 후 삭제

### 어설션 갱신
- `scripts/m3-1105-aj-assertions.mjs` — `manager-pin-boxes` → `manager-pin-input` · `DigitsInput` import/렌더 체크
- `scripts/m3-1105-al-assertions.mjs` — 완전 재작성: NumericKeypad → DigitsInput 검증으로 전환
- `scripts/m3-1105-am-assertions.mjs` — 섹션 (2)(3) NumericKeypad → DigitsInput 체크로 갱신

### 신규 파일
- `scripts/m3-1105-an-assertions.mjs` — 56 checks
- `scripts/m3-1105-an-screenshots.mjs` — 카드 last4 · Void PIN 스샷 2장

---

## 칸 건너뜀 근본 원인 제거

AL이 수정한 `lastFilled` 버그 (`Math.min(idx + only.length, 3)` → 칸 건너뜀) 의 근본 원인:
- **단일 TextInput** (`DigitsInput`)으로 전환하면 여러 TextInput ref 간 `focus()` 이동 자체가 없어짐
- 사용자는 단일 입력 필드에 순서대로 타이핑 → 칸 건너뜀 불가능
- `DigitsInput`에 `refs[x].focus`, `lastFilled` 패턴 없음 (assertions로 확인)

---

## 테스트 결과

```
node scripts/m3-1105-an-assertions.mjs
  → ✅ PASS · 56 passed · 0 failed

node scripts/run-all.mjs assertions
  → 총 37개 · 34 PASS · 3 FAIL (pre-existing: ad/ae/d — AN 변경 무관)
  → 신규 실패 0
```

기존 실패 3개 (m3-1105-ad · m3-1105-ae · m3-1105-d)는 AM 브랜치에서부터 존재했던 실패.

---

## 미검증 항목

- Playwright 스샷 (`m3-1105-an-screenshots.mjs`): dist 빌드 필요 — `npx expo export -p web` 후 실행
  - 스크립트는 `card-last4-input` · `manager-pin-input` testID로 DigitsInput 가시성 확인 후 스샷
- 실 브라우저 iPad 에서 시스템 숫자 키패드 뜨는지 확인 필요 (Playwright headless에서는 소프트 키보드 미표시)

---

## 이연 순증감

- 삭제: `components/pin/NumericKeypad.tsx` (134줄) — `react-native-reanimated` 의존 제거
- 추가: `components/ui/DigitsInput.tsx` (45줄)
- 순감: −89줄 (컴포넌트 계층 단순화)
