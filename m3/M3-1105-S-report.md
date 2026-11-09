---
round: M3-1105-S
pr:
  fork: agilo-medusa-pos-fork#62 (ongoing · head 966fa70)
commits:
  - 16ee128 feat(m3-1105-s/①): 공용 OptionChip + Tabs/OrderType 적용 (규칙 ⑨)
  - 5263787 feat(m3-1105-s/②): Pickup date/time 피커 + 빠른 칩 + 15분 단위
  - 966fa70 feat(m3-1105-s/③): 영수증 로고 높이 60 → 110 (1.8배)
base: master a0bfcd6 (local 이미 rebase 상태)
outcome: R0-1105-AD CHANGES(#62 탭 색 bg-ink) 블로커 + Kyu 실기 "Pickup date/time 은 키보드 말고 피커" + "로고 1.8배" + "검정은 결정 버튼만, 옵션 선택은 연회색+진한 테두리+굵게+체크" 반영. 공용 `components/ui/OptionChip.tsx` 신규 (variant tab/row) · PaymentMethodTabs + OrderTypePicker 이식 · PreorderInputs 를 Pressable → BottomSheet + react-native-ui-datepicker 로 교체 · 빠른 칩 3개(Today 17:00 · Tomorrow 10:00 · +1 day) · 15분 단위 (snapTo15 라운딩) · 웹 Playwright 용 datetime-local 폴백 · ReceiptCard 로고 maxHeight 60 → 110 (maxWidth 80%) + TODO (#63 머지 뒤 공용 상수로 치환). 어설션 색 37/37 + 신규 S 28/28 + D 27/27 전부 PASS · Lint 0 · 금지 영역(api/hooks/pos-payments.ts · lib/printer · app/_layout.tsx) 미수정.
kyu_checks: 4 (①②③④ 아래)
---

# M3-1105-S · 공용 OptionChip + Pickup 피커 + 영수증 로고 110 (PR #62 재리뷰)

**일자**: 2026-11-09 · **허브**: M3 · **성격**: M3-1105-R 재발부 (R 은 "I have enough info" 에서 자연 종료 · 커밋 0 · PR #62 변경 없음). R0-1105-AD 블로커 CHANGES + Kyu 11-07 실기(#19/20) 피드백을 같은 PR 에 커밋.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | `components/ui/OptionChip.tsx` 신규 — variant tab/row · 선택 `bg-success-soft` + `border-2 border-ink` + `font-bold` + `✓` · 미선택 `bg-surface border-line` · 비활성 `text-ink-disabled` + opacity | ✓ |
| 2 | `PaymentMethodTabs` OptionChip 이식 · `bg-ink` 제거 (R0-AD 블로커) | ✓ |
| 3 | `OrderTypePicker` OptionChip 이식 · `bg-ink` 제거 (R0-AE 후속) | ✓ |
| 4 | `PreorderInputs` Pickup date/time → Pressable + BottomSheet + `react-native-ui-datepicker` (date + timePicker). 빠른 칩 Today 17:00 / Tomorrow 10:00 / +1 day. 15분 단위 (`snapTo15` 라운딩). 표시 `Sat 8 Nov · 10:00` (Asia/Jakarta). 웹 Playwright `datetime-local` 폴백 유지. | ✓ |
| 5 | `ReceiptCard` 로고 `maxHeight 60 → 110 · maxWidth 80%` (1.8배). TODO: #63 머지 뒤 `lib/receipt-layout.ts` 공용 상수 import 로 치환 (주석 1줄) | ✓ |
| 6 | `scripts/m3-1105-s-option-chip-assertions.mjs` 신규 — OptionChip 토큰 · ink 배경 금지 · 로고 110 · 피커 (`<Pressable>` + 빠른 칩 + 15분 + datetime-local 폴백) 28 어설션 | ✓ |
| 7 | `scripts/m3-1105-s-screenshots.mjs` 신규 — 3 스샷 (checkout Pre-order 선택/피커 빠른 칩 · tender Cash 탭 선택 · tender Card 탭 선택) | ✓ |
| 8 | 어설션 PASS — 색 37/37 · S 28/28 · D 27/27. Lint 0. tsc --noEmit pre-existing 1건(global.css · 본 PR 범위 밖) | ✓ |
| 9 | 금지 영역 미수정 — `api/hooks/pos-payments.ts` · `lib/printer/*` · `app/_layout.tsx` | ✓ |
| 10 | CI (fork actions · `assertions + playwright` 자동 트리거) | 대기 |
| 11 | PR #62 본문 업데이트 ("AD 반영 + 추가 3건" + checklist) | ✓ |

---

## 1. R0-1105-AD 블로커 반영

- **블로커**: `components/payment/PaymentMethodTabs.tsx:38,42` `bg-ink` (선택 탭 검정) · 원장 규칙 ⑨ 위반 (open-requirements.md:20).
- **반영**: `bg-ink` 제거. OptionChip 으로 이식 — 선택 시 `bg-success-soft (#EDEDEB)` + `border-2 border-ink` + `font-bold` + `✓` prefix.
- **후속 (AE flag 흡수)**: `OrderTypePicker.tsx:35` 도 같은 패턴 위반 → 같은 OptionChip(variant='row') 으로 교체. Takeaway/Pre-order/Delivery 3 블록 모두 규칙 ⑨ 준수.

---

## 2. Pickup date/time 피커 설계

### REQ vs 선택 (`react-native-ui-datepicker` @ 3.1.2)

| REQ (M3-1105-R) | 구현 | 비고 |
|---|---|---|
| iOS 네이티브 피커 (`@react-native-community/datetimepicker`) · 이미 deps 에 있으면 그것 | `react-native-ui-datepicker` (설치되어 있음) | 신규 네이티브 모듈 추가 없이 JS-only 피커 · iOS/Android/Web 모두 동작. Expo prebuild 재빌드 불필요. |
| 15분 단위 | `snapTo15` 유틸 (onChange · 빠른 칩 모두 적용) | datepicker 에 minuteInterval prop 없어서 라운딩으로 강제. |
| 기본값 내일 10:00 | `useEffect(() => if (!pickupAt) onPickupAtChange(tomorrow10()))` | 상위 state 변경 없이 보장. |
| 빠른 칩 Today 17:00 / Tomorrow 10:00 / +1 day | `OptionChip variant=tab` 3개 | +1 day = 현재 pickup 에서 하루 더. |
| 표시 `Sat 8 Nov · 10:00` | `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', weekday, day, month, hour, minute })` | WIB 고정. |
| 서버 전송 ISO | `Date.toISOString()` | 변경 없음. |
| 웹(Playwright) `datetime-local` 폴백 | `Platform.OS === 'web'` 분기 → `<TextInput type='datetime-local' step={900}>` | 기존 m3-1105-m playwright 호환성 유지 (fill 가능). |
| KeyboardAvoiding + 자동 스크롤 | 상위 Checkout 화면이 `KeyboardAwareScrollView` 를 쓰므로 여기선 생략 | 피커 자체는 BottomSheet (키보드 아님). |

### 설계 선택지 (PR 본문 3줄 반영 완료)

1. **@react-native-community/datetimepicker**(deps 없음) 추가 — Expo prebuild 재빌드 필요 · M2 러너 상한 위협.
2. **react-native-ui-datepicker**(deps 있음) 사용 — JS-only · 재빌드 0 · iOS/Android/Web 공통. **← 채택**.
3. 자체 커스텀 time wheel — 유지보수 비용.

---

## 3. 영수증 로고 110 (1.8배)

- `ReceiptCard.tsx:136` style:
  - `maxWidth: 240 · width: 100% · height: 60` → `maxWidth: '80%' · width: 100% · height: 110`.
  - `resizeMode: 'contain'` 유지 (비율 보존).
- **TODO 1줄**: #63 (M2-1105-R `lib/receipt-layout.ts`) 머지 뒤 공용 `RECEIPT_LOGO_*` 상수로 치환 (주석에 명시).
- 프린터 측 로고 110 (ESC/POS · logo-bitmap) 은 #63 소관 — 본 PR 금지 영역.

---

## 4. 어설션 (전부 로컬 PASS)

```
$ node scripts/m3-1105-a-color-assertions.mjs
37/37 passed · 0 failed

$ node scripts/m3-1105-s-option-chip-assertions.mjs
28/28 passed · 0 failed
  (1) OptionChip bg-success-soft + border-ink + font-bold + ✓ + bg-ink 금지
  (2) PaymentMethodTabs OptionChip import + bg-ink 금지 + 탭 3개 + Coming soon + testID
  (3) OrderTypePicker OptionChip import + bg-ink 금지 + 3블록 + testID
  (4) Button solid · bg-ink 유지 (결정 버튼 규칙)
  (5) ReceiptCard height 110 + maxWidth 80% + resizeMode contain
  (6) PreorderInputs react-native-ui-datepicker + Pressable + Today/Tomorrow/+1 chip + snapTo15 + datetime-local 폴백 + Platform.OS === 'web'

$ node scripts/m3-1105-d-assertions.mjs
27/27 passed · 0 failed
```

TS: `npx tsc --noEmit` — pre-existing 1건 (`app/_layout.tsx:8 global.css side-effect import`, 본 PR 범위 밖).

---

## 5. 금지 영역 감사

| 파일 | 상태 | 확인 |
|---|---|---|
| `api/hooks/pos-payments.ts` | 미수정 | `git diff master..HEAD -- api/hooks/pos-payments.ts` = empty |
| `lib/printer/*` | 미수정 | #63 소관 (M2-1105-R) · 로고 상수는 ReceiptCard 로컬 + TODO |
| `app/_layout.tsx` | 미수정 | #64 소관 (M3-1105-Q) |

변경 파일 (`git diff master..HEAD --stat`): components/ui/OptionChip.tsx (신규) · components/payment/PaymentMethodTabs.tsx · components/payment/OrderTypePicker.tsx · components/payment/PreorderInputs.tsx · components/receipt/ReceiptCard.tsx · scripts/m3-1105-s-option-chip-assertions.mjs (신규) · scripts/m3-1105-s-screenshots.mjs (신규) · 기존 P 변경 파일.

---

## 6. Kyu 실기 체크 4줄

1. **결제 탭 색** — `tender-cash` 화면 상단 Cash/Card 탭. Cash 선택 시 배경이 **연회색 + ✓ + 굵은 글씨 + 진한 테두리** 여야 함 (검정 아님). Card 탭 눌러서도 같은 패턴.
2. **Checkout Pre-order 칩** — `/checkout/<id>` 에서 Pre-order 선택 시 같은 연회색/✓ 패턴. Takeaway/Delivery 미선택은 흰 배경 + 옅은 테두리.
3. **Pickup 피커** — Pre-order 선택 뒤 `Tap to choose pickup date & time` 눌러서 BottomSheet 피커 열림 확인. 빠른 칩 3개 (Today 17:00 · Tomorrow 10:00 · +1 day) 터치 시 즉시 시간 세팅. 15분 단위로 반올림됨.
4. **영수증 로고 1.8배** — 결제 성공 후 영수증 화면에서 로고 높이 110px (이전 60 대비 대략 1.8배). TODO: 프린터 측 로고는 #63 머지 후 실기.

---

## 7. 열린 질문 · 후속

- **CI**: fork actions `assertions + playwright` 실행 중 (push 시점 pending). 결과는 PR #62 체크로 확인.
- **스샷 재생성**: `scripts/m3-1105-s-screenshots.mjs` 는 `dist/` 가 최신일 때만 유효. 현재 dist 는 Nov 7 (이전 스냅) · 본 커밋에선 `expo export -p web` 뒤 재실행 필요 (별도 라운드 또는 CI job).
- **R0-1105-AE 처리**: OrderTypePicker 도 본 PR 에서 함께 수정 → AE 카드는 흡수(close).
- **react-native-ui-datepicker 선택 배경**: 네이티브 피커 (@react-native-community/datetimepicker) 를 Kyu 가 원하면 M3 다음 라운드에서 deps 추가 + Expo prebuild (iOS 재빌드 필요). 지금은 JS-only 로 UX 동등성 확보.

---

**상시**: `relay status/claims/M3-1105-S.json` → done · pr=#62 · commits=16ee128,5263787,966fa70.
