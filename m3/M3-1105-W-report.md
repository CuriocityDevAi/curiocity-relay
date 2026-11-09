# M3-1105-W · Kyu 실기 피드백 #62 · M3-1105-V 재발부 + 미커밋 작업 회수

**브랜치**: `fix/m3-1105-w-picker-handover` @ base `master 14a7e53`
**PR (draft)**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/66
**커밋**:
- `168a51b` fix(m3-1105-w): Kyu 실기 #62 — picker 시간공란 · 피커 터치 ≥44pt · success 2열/하단바 (V 재발부)
- `b7a9c06` chore(m3-1105-w): Playwright 스샷 4장

---

## [0] V 작업물 회수 (5분 안)

M3-1105-V 가 60분 러너 상한 · API 재시도 반복으로 push 못 함 (`~/.hub-runner/m3/M3-1105-V.log` · `blocked_by: oke`).
회수 범위 (`git status` @ `feat/m3-1105-v-kyu-feedback`):

| 파일 | 상태 | 비고 |
|---|---|---|
| `components/payment/PreorderInputs.tsx` | modified | REQ ① + ② · dayjs tz + PICKER_STYLES |
| `components/payment/SuccessReceiptAnim.tsx` | modified | REQ ③ · useWindowDimensions 2열/하단바 |
| `scripts/m3-1105-v-assertions.mjs` | new file | 35 체크 |
| `scripts/m3-1105-s-screenshots.mjs` | untracked (orphan) | M3-1105-S 잔재 · W 범위 아님 · 미커밋 |
| `relay/status/claims/M3-1105-V.json` | untracked | V 로컬 쓰기 오인 · 삭제 (정본 claim 은 `curiocity-relay/status/claims/` 에 있음) |

조치: 새 브랜치 `fix/m3-1105-w-picker-handover` (base `master 14a7e53`) 생성 → 세 파일 1 커밋으로 push → draft PR #66.

---

## [REQ ①] Pre-order 피커 Confirm 뒤 "Fri 13 Nov · :" 시간 공란

### 원인

`components/payment/PreorderInputs.tsx` 구버전 (M3-1105-S) 의 `formatDisplay` 는

```ts
new Intl.DateTimeFormat('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short',
  hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Jakarta',
}).formatToParts(new Date(iso))
```

로 뽑아 `{weekday} {day} {month} · {hour}:{minute}` 를 조립했다.
**Hermes (iOS/Android JavaScriptCore 대체)** 는 `weekday` 와 `hour/minute` 가 같은 포매터에 섞이면 `formatToParts` 가 **hour/minute 파트를 빠뜨린다** (날짜 파트만 태깅됨). Node/웹은 full ICU 라 재현 X → m3-1105-s playwright 가 통과했어도 실기 iPad 에서 시간이 사라졌다.

파일·라인: **`components/payment/PreorderInputs.tsx:69-74`** (M3-1105-V 회수판).

### 수정

`dayjs` + `Asia/Jakarta` tz 로 치환:

```ts
const PICKUP_TZ = 'Asia/Jakarta';
dayjs.extend(utc);
dayjs.extend(timezone);

export const formatDisplay = (iso: string): string => {
  if (!iso) return '';
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  return d.tz(PICKUP_TZ).format('ddd D MMM · HH:mm');
};
```

### 3 경로 (어설션)

- **Path A** 빠른 칩 (Today 17:00 · Tomorrow 10:00 · +1 day) → `"ddd D MMM · HH:mm"` + `Date.toISOString()`.
- **Path B** 날짜 전용 변경 (라이브러리가 hour/minute preserve) → 동일 포맷.
- **Path C** 시간 전용 변경 (라이브러리가 date preserve, snap 15m) → 동일 포맷.
- **Regression 가드**: 결과 문자열에 `· :` (시간 공란) 패턴 없음.
- **Server ISO parity**: picker `Date.toISOString()` === UTC canonical.

---

## [REQ ②] 피커 시트 — 터치 영역 ≥44pt · 헤더 ↔ 시간 세로 여백

`components/payment/PreorderInputs.tsx:105-123`:

```ts
const PICKER_STYLES = {
  header: { marginBottom: 20, paddingVertical: 4 },
  time_selector: { minHeight: 44, minWidth: 96, ... },
  time_selector_label: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  month_selector: { minHeight: 44, ... },
  year_selector: { minHeight: 44, ... },
  button_next: { minWidth: 44, minHeight: 44 },
  button_prev: { minWidth: 44, minHeight: 44 },
};
```

`<DatePicker ... use12Hours={false} styles={PICKER_STYLES} />` — 라이브러리 props/스타일만 (포크 금지). 웹은 `Platform.OS === 'web'` 분기에서 `<TextInput type="datetime-local">` 폴백 유지.

실기 iPad 터치 영역 확인은 Kyu 몫 (웹 Playwright 는 datetime-local 폴백).

---

## [REQ ③] Success 화면 — 오케 결정 레이아웃

`components/payment/SuccessReceiptAnim.tsx` 전면 리팩터:

- `WIDE_BREAKPOINT = 900` · `useWindowDimensions()` 로 분기.
- **Wide (≥900px)**: 2열 — 왼쪽 `ScrollView`(영수증) + 오른쪽 `w-80` 액션 컬럼 고정 (`success-wide` · `success-actions-column`).
- **Narrow (<900px)**: 1열 `ScrollView` + 하단 고정 바 (`border-t · bg-surface · pb-safe-offset-4` · `success-actions-bottombar`).
- `Actions` 공용 컴포넌트 (양 분기 재사용): Hand over 는 solid 결정 버튼(유일), Reprint/Share/View order 는 outline.
- 로고 크기 · `lib/receipt-layout.ts` **미변경** (금지 파일).

---

## 스샷 4장 — Playwright web (`scripts/m3-1105-w-screenshots.mjs`)

`screenshots-m3-1105-w/`:

| # | 파일 | viewport | 확인 |
|---|---|---|---|
| 01 | `01-preorder-picker-wide-1180x820.png` | 1180×820 | Pre-order 선택 + Pickup 빠른 칩 3개 + datetime-local 폴백 + Pay |
| 02 | `02-preorder-picker-narrow-820x1180.png` | 820×1180 | 세로 배치 동일 |
| 03 | `03-success-wide-1180x820.png` | 1180×820 | **Hand over 솔리드 버튼이 영수증 우측에 첫 화면 안** (2열 · Reprint/Share/View order outline) |
| 04 | `04-success-narrow-820x1180.png` | 820×1180 | **Hand over 솔리드 바가 화면 하단 고정** (영수증 스크롤 + 하단바 Reprint/Share/View order) |

iOS 시뮬레이터·Maestro 미실행 (W 지시 — 시간 소모 · 실기는 Kyu 몫).

---

## 어설션 로그 — `scripts/m3-1105-v-assertions.mjs` **35/35 PASS**

```
--- (1) ① formatDisplay · dayjs tz 치환 (6)
--- (2) ① formatDisplay 3 경로 (dayjs tz 재구현) (5)
--- (3) ① 시간 공란 regression 가드 (3)
--- (4) ② 피커 시트 UI (터치 영역 ≥44pt · 세로 여백) (9)
--- (5) ③ Success 화면 — 2열/하단 고정 바 (10)
--- (6) 로고 상수 미변경 (receipt-layout 불변) (2)
35/35 passed · 0 failed
```

## 회귀 게이트

| 게이트 | 결과 |
|---|---|
| m3-1105-a-color-assertions | **37/37 PASS** |
| m3-1105-s-option-chip-assertions | **28/28 PASS** |
| m3-1105-d-assertions | **27/27 PASS** |
| m3-1105-q-playwright | **25/25 PASS** |
| m3-1105-p-playwright | **19/19 PASS** |
| m2-1105-q-bundle-guard | **PASS** |
| `run-all assertions` 전체 (20 scripts) | **20/20 PASS** |

## CI

- `assertions + playwright` — pending (push 직후)
- `lint` — pending
- 조회: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42633124358

---

## 금지 범위 확인 (M3-1105-V = M3-1105-W)

**변경 없음 확인**:
- `lib/printer/**`
- `lib/receipt-layout.ts` (LOGO.maxHeightPx 110 · maxWidthRatio 0.8 어설션 PASS)
- `app/_layout.tsx`
- `ShiftCloseGate*`
- `api/hooks`
- storeport

**변경한 파일만**:
- `components/payment/PreorderInputs.tsx`
- `components/payment/SuccessReceiptAnim.tsx`
- `scripts/m3-1105-v-assertions.mjs` (신규)
- `scripts/m3-1105-w-screenshots.mjs` (신규)

---

## 남은 것 (Kyu 실기)

- 실기 iPad 가로/세로 — Confirm 후 시간 표시 (Hermes ① 재현 해소 확인)
- 실기 iPad — 피커 내 시간 토글 터치 영역 (② ≥44pt 체감)

## Done

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/66 (draft)
- 커밋 2 + push
- claim: `status/claims/M3-1105-W.json` state=done
