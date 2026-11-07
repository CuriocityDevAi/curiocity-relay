---
name: R0-1105-T · 허브-1107-T 재리뷰 relay
description: fork #51 (M2-1105-M · ESC/POS 렌더러) · #52 (M3-1105-L · 카트 정리 + 영수증 v2 + R0-1105-O + D1 accent purge) · #53 (M1-1105-P · Settings Close shift) 전부 APPROVE · 상호 충돌 0 · 권장 머지 순서 제시
author: R0
dated: 2026-11-07
---

# R0-1105-T · fork #51 · #52 · #53 리뷰 relay

**스코프**: 실기 피드백 (카트 미정리 · 영수증 시각/여백) + §Kyu 결정 P5 ④ (Settings Close shift) + 프린터 렌더러 3 PR.
**정본**: fork `c3eb355` (#50 M1-1105-O 머지 후) · storeport `32ab911` (#194).
**금지**: 코드 수정 · 커밋.
**claim**: `status/claims/R0-1105-T.json` · in_progress → completed

## 판정 요약

| PR | head | 판정 | 핵심 |
| --- | --- | --- | --- |
| **#52** (M3-1105-L) | `1face4b` | **APPROVE** | A 카트 정리 (SecureStore delete + 3 invalidate · convertToOrder 제거) · B 영수증 v2 (WIB Intl.DateTimeFormat Asia/Jakarta · 번호/날짜 testID 분리 · px-5 py-8) · C R0-1105-O P0/P1/P2 해소 · D accent 20곳 → ink/surface-muted/warning 재의미 (grep 결과 활성 0건) · 머지 트리에 #50 안전망 가드 자동 보존 |
| **#53** (M1-1105-P) | `29998ae` | **APPROVE** | Settings "Shift" 섹션 · Reset 바로 위 배치 · 세션 open 분기 (활성 Button + "Opened since HH:mm WIB · nickname") · 세션 null 분기 (`disabled` + "No open shift" + `text-ink-disabled`) · Playwright (B4) 색 rgb(200,200,200) = #C8C8C8 D1 토큰 일치 · close → z-result → OpenShiftSheet 재노출 (C2 어설션) · PrinterRow 무수정 |
| **#51** (M2-1105-M) | `9366c00` | **APPROVE** | lib/printer/receipt-escpos.ts pure (BLE 없이 Node 어설션) · `Receipt` 타입 그대로 소비 · 32자 wrap · WIB `formatDateWIB` · SC/PBJT snapshot 분기 (base skip · 변형 노출) · 반올림 줄 없음 (2 언어 가드) · ESC/POS 표준 바이트 (ESC @/a/E · GS V B) · `printBytes` 실패 시 printReceipt false 반환 (fail-open) · 제품 화면 미연결 · **39/39 어설션 PASS** |

**세 PR 상호 충돌 (한 줄)**: 파일 겹침 **0건** (#51: lib/printer/* + docs + script · #52: api/hooks + components + app · #53: app/(tabs)/settings.tsx + script) · merge-tree 셋 다 clean · 머지 순서 자유. **권장 순서: #52 (실기 피드백 뿌리 최우선) → #51 (M2 신규 · 제품 미연결 안전) → #53 (M1 UI 보완 · M1-1105-N 와 짝)**.

---

## #52 · M3-1105-L

### A · 결제 뒤 카트 정리 (api/hooks/pos-payments.ts)

```typescript
onSuccess: async () => {
  await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);
  qc.invalidateQueries({ queryKey: ['orders'], exact: false });
  qc.invalidateQueries({ queryKey: ['draft-order'], exact: false });
  qc.invalidateQueries({ queryKey: ['pos-receipt'], exact: false });
},
```

| 축 | 구현 | ✓ |
| --- | --- | --- |
| `convertToOrder` 호출 **없음** (서버 #196 담당) | onSuccess 블록에 없음 · 주석 명시 | ✓ |
| SecureStore draft 키 삭제 | `deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY)` | ✓ |
| `['orders']` invalidate (`['order']` 오타 교정) | exact:false | ✓ |
| `['draft-order']` invalidate | exact:false | ✓ |
| `['pos-receipt']` invalidate | exact:false | ✓ |
| #50 (useCurrentDraftOrder `is_draft_order=false` 가드) 와 **이중 삭제 무해** | `SecureStore.deleteItemAsync` idempotent · onSuccess 선행 → draftOrderId=null → #50 가드 fetch 자체 안 함 · 동시 실행도 안전 | ✓ |

**머지 트리 검증**: `git merge-tree origin/master origin/feat/m3-1105-l-receipt-cleanup` → `7a4356e` · 결과 트리 inspection:
- `api/hooks/draft-orders.tsx`: master 쪽 #50 안전망 `is_draft_order` 가드 + `M1-1105-O` 주석 **전부 보존** ✓
- `app/register/close.tsx`: master #50 `try/catch` refactor 유지 + 브랜치 `text-warning` 변경 공존 ✓
- `api/hooks/pos-payments.ts`: 브랜치 onSuccess 신설 + 기존 #46 cashier/session auto-inject 유지 ✓

Hand over 뒤 Cart 비움 Playwright (6L-a) `cartBodyText.includes('your cart is empty')` + `screenshots-m3-1105-l/a-cart-empty-after-handover.png` ✓

### B · 영수증 v2 (components/receipt/ReceiptCard.tsx)

```typescript
const formatJakartaDateTime = (iso: string): string => {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12: false,
  }).formatToParts(d);
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}`;
};
// JSX
<Text testID="receipt-no">No. {receipt.receipt_no}</Text>
<Text testID="receipt-date">{formatJakartaDateTime(receipt.issued_at)} WIB</Text>
// className: px-5 py-8 (p-5 → 1.5× 수직)
```

| 축 | 구현 | ✓ |
| --- | --- | --- |
| WIB 시각 | Intl.DateTimeFormat timeZone Asia/Jakarta + hour12:false + " WIB" suffix | ✓ |
| 번호/날짜 **별도 줄** (testID 분리) | `receipt-no` + `receipt-date` 각각 Text | ✓ |
| padding 증가 | `p-5` → `px-5 py-8` (수직 ~1.5× · 58mm 비율 유지) | ✓ |

Playwright (5L-a/b) 어설션 + `screenshots-m3-1105-l/b-receipt-v2.png`.

### C · R0-1105-O P0/P1/P2 해소

| 번호 | 변경 | ✓ |
| --- | --- | --- |
| P0 QuantityPicker 3곳 | 입력 Text (line 118) · Minus icon (line 102) · Plus icon (line 128) 전부 `text-ink-subtle` → `text-ink-disabled` | ✓ |
| P1 Option/Size/Color Picker | 비활성 Text 에 `text-ink-disabled` 명시 (opacity-50 만으로는 비활성 단서 약함) | ✓ |
| P2 dead ColorPicker 블록 삭제 | `app/product-details.tsx:268-287` (20줄 · 5 raw hex 제거) | ✓ |

### D · accent 20곳 → ink/surface-muted/warning 재의미 (D1 의도)

로컬 grep (branch head) 재현: 활성 `accent` 호출 **0건** (1건은 OrderTypeChip:21 주석의 설명문). 교체 방향 대조:

| 호출부 | before | after | D1 의도 |
| --- | --- | --- | --- |
| `app/(tabs)/orders.tsx:111` method chip 선택 | `border-accent bg-accent-soft` | `border-ink bg-ink` + text-surface | 주 선택 = ink ✓ |
| `app/register/close.tsx:120` DiffDisplay (diff>0) | `text-accent` | **`text-warning`** | 양수 = 과금/경고 = warning ✓ |
| `components/RegisterBadge.tsx:54` Pickup | `text-accent` | `text-ink` | 일반 액션 = ink ✓ |
| `components/MultiSelectFilter.tsx:68,73` 선택 Check | `text-accent` · `TOKEN_ACCENT` | `text-ink` · `TOKEN_INK` | 선택 = ink ✓ |
| `components/SearchInput.tsx:16` focus | `focus:border-accent` | `focus:border-ink` | 포커스 = ink ✓ |
| `components/ui/OrderStatus.tsx:193-195` Draft chip | `bg-accent-soft` · `TOKEN_ACCENT` · `text-accent` | `bg-surface-muted` · `TOKEN_INK_MUTED` · `text-ink-muted` | 중립 = greyscale ✓ |
| `components/form/MultiSelectField.tsx:29,34` | `text-accent` · `TOKEN_ACCENT` | `text-ink` · `TOKEN_INK` | 폼 선택 = ink ✓ |
| `components/form/SelectField.tsx:41,46` | `text-accent` · `TOKEN_ACCENT` | `text-ink` · `TOKEN_INK` | 폼 선택 = ink ✓ |
| `components/form/TextField.tsx:87` focus | `focus:border-accent` | `focus:border-ink` | 포커스 = ink ✓ |
| `components/orders/OrderTypeChip.tsx:22,28` takeaway | `bg-accent-soft` · `text-accent` | `bg-surface-muted` · `text-ink` | 기본 종류 = 무채색 (preorder=warning · delivery=success 유지) ✓ |

**D1 의도 (로고 점만 앰버 · 경고=warning · 오류=danger) 완벽 일치** ✓

### E · 색 어설션 / relay 리포트

- PR body: `m3-1105-d 24/24 · 색 37/37 · 영어 5/5 · M1 전원 pass`
- **지적 사항 (비차단)**: relay `m3/M3-1105-L-report.md` **없음** (M3 허브 J·K·L 모두 미등재 — 본 라운드 relay `/tmp/relay-check/m3/` 확인). 본 리뷰는 **PR body + 로컬 코드/스샷 분석**으로 대체. M3 허브 쪽에서 relay 리포트 후속 push 권장.

---

## #53 · M1-1105-P

### 1. Settings Close shift row 위치

`app/(tabs)/settings.tsx` 삽입 순서:
```
Sign out · PrinterRow · [NEW: Shift (Close shift row)] · Reset
```

**Reset 바로 위** 위치 ✓

### 2. 세션 open vs null 분기

| 상태 | Button | Subtitle | testID |
| --- | --- | --- | --- |
| open (`openSession.data` truthy) | 활성 outline + `onPress={() => router.push('/register/close')}` | "Opened since HH:mm WIB · nickname/user_id" · `text-ink-muted` | `settings-close-shift-button` · `settings-close-shift-subtext` |
| null (open 세션 없음) | `disabled` outline (Button 내부 `text-ink-disabled` 자동 적용) | "No open shift" · `text-ink-disabled` **명시** | `settings-close-shift-button-disabled` · `settings-close-shift-subtext-empty` |

Playwright 자동 검증:
- (B2) `Close shift 버튼 disabled` ✓
- (B4) `text-ink-disabled = rgb(200, 200, 200)` — **#C8C8C8 D1 토큰 값과 1:1 일치** ✓

### 3. close 뒤 Open shift 시트 재노출 (하루 복수 교대 ②)

흐름:
1. Settings "Close shift" → `router.push('/register/close')`
2. `close.tsx` close 성공 → `useCloseRegisterSession.onSuccess` 가 `REGISTER_QK` invalidate → `useCurrentOpenSession` refetch
3. `router.replace('/register/z-result')`
4. 다음 `/products` 등 접근 → `app/_layout.tsx` `AuthedOpenShiftGate` → `openSessionQuery.data === null` → `shouldPrompt=true` → **OpenShiftSheet 재노출**

Playwright (C2) `Close 완료 후 OpenShiftSheet 재노출 (하루 복수 교대 ②)` ✓

### 4. M2 컴포넌트 (PrinterRow) 무수정

diff file list: `app/(tabs)/settings.tsx` · `scripts/m1-1105-p-playwright.mjs` · 2 PNG 뿐 · `components/printer/PrinterRow.tsx` 수정 0 · settings.tsx 에서 **import 그대로 사용** ✓

### 5. WIB 포맷

UTC → UTC+7 수동 시프트 · `HH:mm WIB` · iPad/웹 로컬 TZ 무관 (주석 명시). Playwright (A3) fixture `09:30 UTC` → `16:30 WIB` 매치 ✓

---

## #51 · M2-1105-M

### 1. Receipt 타입 그대로 소비

```typescript
import type { Receipt, ReceiptSnapshot, ReceiptTender } from '../../types/receipt';
export function renderReceiptEscPos(receipt: Receipt, cols = COL_WIDTH_58MM): Uint8Array {
  const snap = receipt.snapshot as SnapshotWithServiceCharge;
  // ...
}
```

서버 타입 그대로 참조 · cash/card/qris discriminated union · tax.show · labels 전수 활용.

**비차단 관찰**: `SnapshotWithServiceCharge` 가 `service_charge?` 필드를 forward-compat 로 확장 소비 (주석: "서버가 나중에 추가하면 defensive 수용"). amount>0 조건부 렌더링 · 미노출 시 skip · 엄격히 "필드 발명" 아니지만 `types/receipt.ts` 에 공식 추가 권장 (다음 M3-H/M2 라운드).

### 2. 32자 폭 (58mm)

- `b.cols = COL_WIDTH_58MM = 32`
- `centerLines` · `centerLinesAsLeft` **단어 경계 wrap** (last space fallback cut)
- Assertion (1a) 전 줄 ≤32 + (10a) wrap 뒤 32자 가드 ✓

### 3. WIB

```typescript
function formatDateWIB(iso): string {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + 7*60*60*1000);
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}`;
}
// 출력: `Date YYYY-MM-DD HH:MM WIB`
```

Assertion (2d) regex `/^Date \d{4}-\d{2}-\d{2} \d{2}:\d{2} WIB$/` ✓

### 4. SC/PBJT 분기 — 없으면 생략

```typescript
if (snap.service_charge && amount > 0) { b.kv(label, formatIDR(amount)); }
if (snap.tax.show) { b.kv(snap.tax.label, formatIDR(snap.tax.amount)); }
```

Assertion (7) 변형 fixture 에 둘 다 노출 · (8) base fixture 에 둘 다 skip — **양쪽 자동 검증** ✓

### 5. 반올림 줄 없음

```typescript
// ── Footer + Cut (반올림 줄 없음 · 서버 snapshot 이 이미 최종) ──
```

Assertion (5a) `"Rounding" 미노출` + (5b) `"반올림" 미노출 (한글 fallback 가드)` — **2 언어 가드** ✓

### 6. ESC/POS 표준 바이트

| 명령 | 바이트 | 사용처 |
| --- | --- | --- |
| INIT | `ESC @` = `0x1b 0x40` | `b.init()` |
| Align | `ESC a n` = `0x1b 0x61 n` | `b.alignCenter()/alignLeft()` |
| Bold | `ESC E n` = `0x1b 0x45 n` | `b.bold()` |
| LF | `0x0a` | `b.line()` · `b.lf()` |
| Cut | `GS V B n` = `0x1d 0x56 0x42 n` | `b.cut()` |

Assertion (6a) cut 바이트 검증 ✓ · escposBytesToText 디코더가 전 명령 커버.

### 7. BLE 없을 때 unavailable 반환

`printReceipt(receipt)`:
```typescript
if (!receipt) return false;
try {
  return await printBytes(renderReceiptEscPos(receipt));
} catch {
  return false;
}
```

- `printBytes` (ble.ts) 가 `bleAvailability().ok === false` 시 throw · catch → false 반환
- 결제 흐름 안 깨뜨림 (fail-open · 기존 패턴과 동일) ✓

### 8. 제품 화면 미연결

diff 범위: `lib/printer/*` + `docs/testing/*` + `scripts/*` · `app/**` · `components/**` 수정 **0건** · `printReceipt` 호출부 없음 · **ready-to-use API 만 제공** (다음 라운드 화면 호출) ✓

### 9. 로컬 재현

```
39/39 passed · 0 failed
```

---

## 상호 충돌 및 머지 순서 (한 줄)

- **파일 겹침 0건** (#51: lib/printer/* + docs + script · #52: api/hooks + components + app/orders · app/product-details · app/register · fixtures · #53: app/(tabs)/settings.tsx + script) · merge-tree 셋 다 clean (#51: `542c08e` · #52: `7a4356e` · #53: `a12c4fc`).
- **권장 순서**: `#52` (실기 피드백 뿌리 · 가장 큰 범위) → `#51` (M2 신규 렌더러 · 제품 미연결 안전) → `#53` (M1 UI 보완 · M1-1105-N 와 짝 · P5 β 완결).

---

## 환경 보조

- fork master HEAD: `c3eb355` (#50 M1-1105-O 머지 후)
- storeport main HEAD: `32ab911` (#194 M0-1105-L 머지 후)
- 로컬 재현:
  - `git checkout origin/feat/m2-1105-m-receipt-escpos && node scripts/m2-1105-m-receipt-escpos-assertions.mjs` → **39/39 PASS**
  - `git merge-tree` 셋 다 clean · #52 머지 트리 content inspection 으로 #50 안전망 가드 전수 보존 확인
- relay check: m0·m1·m2 는 1105-L/P/M 각각 있음 · **m3/M3-1105-L 없음** → PR body 로 대체 분석 · 지적 사항 (비차단)

## 참조

- 직전 리뷰: `r0/R0-1105-S-report.md` (storeport #196 · fork #50 pair)
- GitHub reviews 제출 (COMMENT · self-authored 제약):
  - [fork #52](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/52) · APPROVE
  - [fork #53](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/53) · APPROVE
  - [fork #51](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/51) · APPROVE
