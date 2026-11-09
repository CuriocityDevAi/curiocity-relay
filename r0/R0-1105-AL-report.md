# R0-1105-AL · fork #66 리뷰 리포트

**판정: APPROVE**
브랜치: `fix/m3-1105-w-picker-handover` · 커밋 168a51b + b7a9c06 + 76f4365 (lint) · base 14a7e53

---

## ① 버그: 피커 Confirm 뒤 시간 공란

**원인 설명 검토**
- PR 본문: `components/payment/PreorderInputs.tsx:69-74` `formatDisplay` — `Intl.DateTimeFormat('en-GB', { weekday, day, month, hour, minute, timeZone })` + `formatToParts` 로 꺼내는데 Hermes(iOS/Android) 는 `weekday` 와 `hour/minute` 가 같은 포매터에 섞이면 `hour/minute` 파트를 빠뜨림. Node/웹은 full ICU 라 m3-1105-s 가 통과했어도 실기 iPad 에서 시간이 사라진다.
- **정확성**: 기술 설명 맞음. 다만 `:69-74` 는 **새 파일** 기준(패치 적용 후 dayjs 버전 위치). 패치 전 원본 파일에서 `formatDisplay` 는 약 49-62번 줄(첫 헝크에서 17줄 추가 전)에 있었음. 기능상 같은 함수를 가리키므로 블로커 아님.

**3경로 어설션 검토**
- `scripts/m3-1105-v-assertions.mjs` §(2) — 빠른 칩(Path A) · 날짜 전용(Path B) · 시간 전용(Path C) 모두 `'ddd D MMM · HH:mm'` 포맷 직접 실행 ✓
- ISO parity (Path A, C `toISOString()` === UTC canonical) 확인 ✓
- §(3) 시간 공란 regression 가드: `· :` 패턴 없음 + `· HH:mm` 패턴 존재 ✓

**실행 결과**
```
✓ Path A (빠른 칩) · "Fri 13 Nov · 10:00"
✓ Path B (날짜 전용) · "Fri 13 Nov · 10:00"
✓ Path C (시간 전용) · "Fri 13 Nov · 15:30"
✓ Server ISO parity Path A
✓ Server ISO parity Path C
✓ 시간 공란 regression 가드 A/B/C
```

---

## ② 터치 영역 ≥44pt · 라이브러리 포크 여부

**PICKER_STYLES 확인** (`components/payment/PreorderInputs.tsx:105-123`)
- `time_selector.minHeight: 44` / `minWidth: 96` ✓
- `time_selector_label.fontSize: 22` ✓
- `header.marginBottom: 20` (월 ↔ 시간 세로 여백 ≥16) ✓
- `month_selector.minHeight: 44` ✓
- `button_next / button_prev.minHeight: 44` ✓
- `use12Hours={false}` 명시 ✓
- `styles={PICKER_STYLES}` props 로 전달 ✓

**라이브러리 포크**: 없음 — `react-native-ui-datepicker` props/styles 만 사용. ✓

**어설션**
```
9/9 PASS (§4 all ✓)
```

---

## ③ Success 화면 Hand over 레이아웃

**넓은 화면 ≥900px (`success-wide`)**
- `useWindowDimensions` + `WIDE_BREAKPOINT = 900` ✓
- `testID="success-wide"` + `testID="success-actions-column"` ✓
- 왼쪽 `ScrollView` (영수증) + 오른쪽 `w-80` 고정 액션 컬럼 ✓
- 스샷 `03-success-wide-1180x820.png`: Hand over(검정 solid) 우측 고정, 첫 화면 안 ✓

**좁은 화면 <900px (하단 고정 바)**
- `testID="success-actions-bottombar"` ✓
- `className="border-t border-line bg-surface px-4 pt-3 pb-safe-offset-4"` ✓
- 스샷 `04-success-narrow-820x1180.png`: Hand over 하단 고정, 영수증 위 스크롤 ✓

**Hand over 버튼 판정**
- `Actions` 공용 컴포넌트 — `<Button testID="hand-over">` variant 미지정 → default solid ✓
- `bg-warning` 제거 확인 ✓ (검정 결정 버튼)
- Reprint/Share/View order: `variant="outline"` ✓

**로고 상수**
- `lib/receipt-layout.ts` LOGO.maxHeightPx: 110 · maxWidthRatio: 0.8 — 미변경 ✓

**어설션**
```
10/10 PASS (§5 all ✓) + 2/2 PASS (§6 ✓)
```

---

## 회귀 재실행 로그

```
node scripts/m3-1105-v-assertions.mjs   → 35/35 PASS
node scripts/m3-1105-a-color-assertions → 37/37 PASS
node scripts/m3-1105-s-option-chip-assertions → 28/28 PASS
node scripts/m3-1105-d-assertions       → 27/27 PASS
node scripts/m3-1105-q-playwright       → 25/25 PASS
node scripts/m3-1105-p-playwright       → 19/19 PASS
node scripts/run-all.mjs                → 42/42 PASS (0 FAIL · 475.2s)
```

번들 가드: run-all 내 `-guard` 접미사 스크립트 포함 — 전부 PASS ✓

---

## 판정

**APPROVE** — 3건 피드백 모두 정확히 처리됨. 미세 관찰 1건(`:69-74` file:line 은 패치 전 원본 위치가 아닌 새 파일 기준)은 기술적 설명에 영향 없음. 회귀 없음.
