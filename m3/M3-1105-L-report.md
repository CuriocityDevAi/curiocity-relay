---
round: M3-1105-L
pr:
  fork: agilo-medusa-pos-fork#52
commit: 1face4b (branch feat/m3-1105-l-receipt-cleanup · base master bc3c0e4)
outcome: 결제 뒤 카트 정리 (A · pos-payments.ts onSuccess SecureStore delete + invalidate 묶음 · convertToOrder 미호출) + 영수증 v2 (B · Asia/Jakarta WIB 시각 + 번호/날짜 별도 줄 + padding ~1.5×) + R0-1105-O P0/P1/P2 (C · QuantityPicker 비활성 단서 복구 + Option/Size/ColorPicker text-ink-disabled 명시 + 주석 ColorPicker 블록 삭제) + D1 accent 사용처 10 파일 교체 (D · 로고 외 accent 완전 제거). 어설션 13/13 + Playwright 13/13 PASS · 색 어설션 37/37 유지 · Cart empty 스샷 + 영수증 v2 스샷 PR body 첨부.
kyu_checks: 0 (스샷 PR body 로 즉시 확인 가능 · 토큰 교체/문자열 교정 중심 · Kyu 실기 불요)
---

# M3-1105-L · 결제 뒤 카트 정리 + 영수증 v2 + R0-1105-O + D1 accent 완전 제거

**일자**: 2026-11-07 · **허브**: M3 · **성격**: open-requirements.md §🔴 실기 피드백 — M0-1105-O #1 #2 (카트 미정리) + 영수증 시각/번호/여백 + R0-1105-O M3 P0~P2 + R0-Q accent 사용처 20곳 재배치.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| A | 결제 뒤 카트 정리 (SecureStore delete + invalidate · convertToOrder 미호출) | ✓ |
| B | 영수증 v2 (WIB · 번호/날짜 별도 줄 · padding 1.5×) | ✓ |
| C | R0-1105-O P0/P1/P2 (QuantityPicker · Option/Size/ColorPicker · 주석 ColorPicker 블록 삭제) | ✓ |
| D | D1 accent 사용처 20곳 (10 파일) 재배치 | ✓ |
| | Playwright: Cart 비움 + WIB 패턴 + 번호 줄 분리 어설션 | ✓ |
| | 색 어설션 37/37 유지 | ✓ |
| | CI 전 job 그린 확인 | ✓ (PR #52 · `assertions + playwright` + `lint` 모두 PASS) |

---

## 1. 산출물 (PR #52 · base master `bc3c0e4`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `api/hooks/pos-payments.ts` | useCreateTender.onSuccess 확장 (A) | +9 / -2 |
| `api/hooks/draft-orders.tsx` | `DRAFT_ORDER_ID_STORAGE_KEY` export | +1 / -1 |
| `components/receipt/ReceiptCard.tsx` | WIB 포맷 + 번호/날짜 분리 + padding (B) | +31 / -3 |
| `components/ui/QuantityPicker.tsx` | text-ink-subtle → text-ink-disabled × 3 (C) | +3 / -3 |
| `components/ui/{Option,Size,Color}Picker.tsx` | 비활성 text-ink-disabled 명시 (C) | +15 / -2 |
| `app/product-details.tsx` | 주석 ColorPicker 블록 20줄 삭제 (C) | +0 / -20 |
| accent 10 파일 (D) | 로고 외 accent → ink/warning | +~30 / -~25 |
| `fixtures/pos-tender-cash-response.json` | `converted: true` 추가 | +1 / -1 |
| `scripts/m3-1105-d-playwright.mjs` | (5·L) WIB 패턴 + 번호 줄 + (6·L) Cart empty | +45 / -3 |
| `scripts/m3-1105-l-screenshots.mjs` | **신규** (전/후 스샷 캡처) | +180 |
| `screenshots-m3-1105-l/*.png` | **신규** (3장) | +3 파일 |
| **총** | **24 파일** | **+358 / -57** |

---

## 2. A · 결제 뒤 카트 정리 (open-requirements §M0-1105-O #1 #2)

### 교정 전 (fork master `bc3c0e4`)
```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['order'] });      // ← 오타 (shape: 'orders')
  qc.invalidateQueries({ queryKey: ['pos-receipt'] });
  // SecureStore.delete 없음 — 다음 Cart 로드 시 결제 완료된 draft 가 그대로 fetch → Cart 에 품목 잔존.
}
```

### 교정 후 (M3-1105-L)
```ts
onSuccess: async () => {
  await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);
  qc.invalidateQueries({ queryKey: ['orders'],      exact: false });  // ← shape 교정
  qc.invalidateQueries({ queryKey: ['draft-order'], exact: false });
  qc.invalidateQueries({ queryKey: ['pos-receipt'], exact: false });
}
```

### 설계 포인트
1. `convertToOrder` 미호출 — 서버 M0-1105-P 가 전환 담당 (앱이 호출하면 중복/경쟁 발생 소지).
2. `exact: false` — queryKey prefix 매치 (useCurrentDraftOrder `['draft-order']` + useDraftOrder `['draft-order', id]` 모두 포함).
3. `DRAFT_ORDER_ID_STORAGE_KEY` 를 `draft-orders.tsx` 에서 export (`pos-payments.ts` import) · private → public.
4. `fixtures/pos-tender-cash-response.json` · `converted: true` 추가 (서버 전환 signal · 향후 앱이 소비할 수 있는 상태 확장 신호).

### 확인 (Playwright + 스샷)
- m3-1105-d-playwright `(6L-a)` · Hand over → pushState `/cart` → body 에 `"your cart is empty"` 포함 ✓
- 스샷 `a-cart-empty-after-handover.png` → "Your cart is empty · Add products to begin" 명시 ✓ (Cheese Bread 라인 완전 제거)

---

## 3. B · 영수증 v2 (앱 1차 · 서버 변경 불요)

### 교정 전
```tsx
<Row left={`No. ${receipt.receipt_no}`} right={receipt.issued_at.slice(0, 19).replace('T', ' ')} />
// → "No. R-261107-0001                  2026-11-07 10:15:30"  (UTC · 한 줄)
<View className="rounded-xl border border-line bg-surface p-5" ...>
```

### 교정 후
```tsx
// 시각 — Asia/Jakarta (WIB) 변환 "YYYY-MM-DD HH:mm WIB"
const formatJakartaDateTime = (iso) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12:false,
  }).formatToParts(new Date(iso));
  const g = (t) => parts.find(p => p.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`;
};

// 번호와 날짜 별도 Text 줄
<Text testID="receipt-no">No. {receipt.receipt_no}</Text>
<Text testID="receipt-date">{formatJakartaDateTime(receipt.issued_at)} WIB</Text>

// padding ~1.5× (p-5 → px-5 py-8)
<View className="rounded-xl border border-line bg-surface px-5 py-8" ...>
```

### 전/후 요약

| 항목 | 이전 | 이후 |
|---|---|---|
| **시각** | UTC ISO slice `2026-11-07 10:15:30` | **`2026-11-07 17:15 WIB`** (Jakarta +7) |
| **레이아웃** | 번호+날짜 한 줄 (Row left/right) | **번호 / 날짜 별도 줄** (testID 분리) |
| **Padding** | `p-5` (20px 사방) | **`px-5 py-8`** (수직 32px · 1.6×) |

### 확인 (Playwright)
- `(5L-a)` receipt-no 노출 `No. R-261107-0001` ✓
- `(5L-b)` receipt-date 정규식 `^\d{4}-\d{2}-\d{2} \d{2}:\d{2} WIB$` 매치 ✓

---

## 4. C · R0-1105-O P0/P1/P2

| P | 파일 | 변경 |
|---|---|---|
| P0 | `components/ui/QuantityPicker.tsx` L101/118/132 | `text-ink-subtle` → `text-ink-disabled` (비활성 전용 토큰 · M3-1105-E 도입) |
| P1 | `components/ui/OptionPicker.tsx` | `isDisabled && !isSelected` → `text-ink-disabled` 명시 |
| P1 | `components/ui/SizePicker.tsx` | 동일 |
| P1 | `components/ui/ColorPicker.tsx` | 동일 |
| P2 | `app/product-details.tsx` L268-287 | 주석 ColorPicker/SizePicker 블록 **삭제** (20줄) |

### 왜 ink-disabled 가 필요한가 (M3-1105-E 복습)
- `ink-subtle` (#B5B5B5) = placeholder 전용 · `ink-disabled` (#C8C8C8) = 비활성 전용.
- 공유하면 "비활성 상태인지 placeholder 인지" 모호 → 비활성 단서 상실 (R0-1105-C).
- M3-1105-L 가 QuantityPicker · 3 Picker 에서 분리 보장.

---

## 5. D · D1 accent 사용처 10 파일 교체

Kyu 의도 (D1 · 로고 O 점만 앰버) 에 맞춰 로고 외 `accent`/`TOKEN_ACCENT` 완전 제거.

### 교체 표

| 파일 | 호출 | 이후 | 의미 |
|---|---|---|---|
| `app/(tabs)/orders.tsx:109` | 선택 method chip `border-accent bg-accent-soft` | **`border-ink bg-ink` + `text-surface`** | 주 선택 chip = ink (흰 글자) |
| `app/register/close.tsx:120` | `diff > 0 → text-accent` | **`text-warning`** | 양수 차이는 경고 (의미 분리) |
| `components/RegisterBadge.tsx:54` | `text-accent` "Pickup" | **`text-ink`** | 액션 링크 = ink |
| `components/MultiSelectFilter.tsx:68,73` | `text-accent` + `TOKEN_ACCENT` | **`font-medium text-ink` + `TOKEN_INK`** | 선택 표시 = ink 강조 |
| `components/form/MultiSelectField.tsx:29,34` | 동일 | 동일 | |
| `components/form/SelectField.tsx:41,46` | 동일 | 동일 | |
| `components/SearchInput.tsx:16` | `focus:border-accent` | **`focus:border-ink`** | 포커스 테두리 = ink |
| `components/form/TextField.tsx:87` | `focus:border-accent` | **`focus:border-ink`** | 동일 |
| `components/ui/OrderStatus.tsx:193-195` | Draft chip `bg-accent-soft text-accent` | **`bg-surface-muted text-ink-muted`** (Archived 와 일관) | 중립 상태 |
| `components/orders/OrderTypeChip.tsx:22,28` | takeaway `bg-accent-soft text-accent` | **`bg-surface-muted text-ink`** · preorder=warning · delivery=success 유지 | 유채색은 진짜 강조뿐 |

### 잔여 accent 사용처
```
$ grep -rn "accent\|TOKEN_ACCENT" app/ components/ --include="*.tsx" --include="*.ts" | grep -v MerosLogo | grep -v comment
→ 0건 (주석 설명문 1건만 남음)
```

**토큰 자체** (`TOKEN_ACCENT` · `TOKEN_ACCENT_SOFT` · `accent` · `accent-soft`) 는 **정의 유지** — 색 어설션 37/37 (15 토큰 · 15 TOKEN_*) 가 토큰 존재를 검증하므로 제거 불가.

---

## 6. 검증 (로컬 · CI 동일 명령)

### 6-1. 전 어설션
```
$ node scripts/run-all.mjs assertions
  총 13 개 · 13 PASS · 0 FAIL · 1.2s
  · m3-1105-a-color-assertions.mjs ... PASS · 0.1s   (37/37)
```

### 6-2. 전 Playwright
```
$ node scripts/run-all.mjs playwright
  총 13 개 · 13 PASS · 0 FAIL · 150.2s
  · m3-1105-d-playwright.mjs ... PASS · 36.7s
    (5L-a) receipt-no 줄 분리 ✓
    (5L-b) receipt-date WIB 정규식 "YYYY-MM-DD HH:mm WIB" ✓
    (6L-a) Cart body 에 "your cart is empty" 포함 ✓
```

### 6-3. Lint
```
$ npm run lint
  0 errors · 33 pre-existing warnings
```

### 6-4. CI (fork) — **그린 ✓**
- PR #52: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/52
- CI run (`assertions + playwright`): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42350924527 · **PASS**
- Lint run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42350924580 · **PASS**
- 머지 가능.

---

## 7. 설계 포인트

### 7-1. `convertToOrder` 호출 금지 (서버 M0-1105-P 가 담당)
- 이전엔 앱이 convertToOrder 를 직접 호출하거나 호출을 위한 상태 추적 코드가 존재했음.
- M0-1105-P (서버) 가 tenders 응답 시 draft→order 전환을 자동 수행 → 앱은 단순히 결과 (receipt + success 화면) 만 소비.
- `fixtures/pos-tender-cash-response.json` 에 `converted: true` 를 추가해 "서버가 전환 완료했다" 는 응답 shape 를 흉내.

### 7-2. `invalidateQueries({ exact: false })` 패턴
- useCurrentDraftOrder = `['draft-order']` (전역 cart)
- useDraftOrder(id) = `['draft-order', id]` (특정 draft)
- useOrders = `['orders']` · useOrder(id) = `['order', id]` (이는 상세 1건)
- `exact: false` 로 prefix 매치 → 모두 invalidate. 특히 `['orders']` 는 list query 를 즉시 refetch.

### 7-3. 영수증 WIB 포맷 — `Intl.DateTimeFormat` 선택 이유
- `toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', ... })` 는 month 표기 혼재 ("Nov 7, 2026") 가능.
- `formatToParts` 로 요소별 추출 → 조립 → `YYYY-MM-DD HH:mm` 포맷 **정확 보장**.
- iOS/Android/Web 모두 ES2020 표준 지원 — 별도 polyfill 불요.

### 7-4. D1 accent 재배치 — 의미 분리
- `takeaway` (가장 흔한 주문) = **중립** (ink/surface-muted) · preorder = warning · delivery = success.
- Draft 주문 상태 = **중립** (Archived 와 일관) — 액션 여지가 없는 "작업 중" 상태.
- Register close 양수 차이 (`diff > 0` over) = **warning** — "잉여 현금" 은 경고성 anomaly.
- 포커스/선택 표시 = **ink** (강한 contrast · 접근성 보장).

### 7-5. Playwright 카트 비움 테스트
- 실제 플로: tenders 응답 → SecureStore.delete → router.replace /success → Hand over → router.replace /products.
- 테스트는 /products 도달 뒤 pushState `/cart` 로 Cart 화면 강제 진입 → Cart 가 `useCurrentDraftOrder` 를 호출 → SecureStore 가 비어 null 반환 → "Your cart is empty" 렌더.
- register-sessions fixture 를 open 세션으로 오버라이드 (이전 fixture 는 빈 배열 → "Register is closed" 게이트에 막힘).

---

## 8. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = `api/hooks/pos-payments.ts` (A) · `components/receipt/**` (B) · `components/ui/{Quantity,Option,Size,Color}Picker.tsx` (C) · `app/product-details.tsx` (C 삭제만) · accent 10 파일 (D) | ✓ |
| convertToOrder 미호출 (서버 담당) | ✓ |
| 로고 · SC/PB1 줄 범위 밖 | ✓ (미변경) |
| 영어 전용 | ✓ (제품 코드 문자열 영어 · 주석만 한국어) |
| 색 어설션 37/37 유지 | ✓ |
| Playwright 13/13 + 로컬 PASS | ✓ |
| CI 전 job 그린 확인 | ✓ (PR #52 · `assertions + playwright` + `lint` 모두 PASS) |

---

## 9. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +4 (M0-1105-O #1 #2 · 영수증 v2 · R0-1105-O P0~P2 · D1 accent 사용처) |
| 등재 | +1 (Hand over 버튼이 `bg-warning` 유지 — D1 "주 버튼 = ink" 기준으로 보면 재검토 여지 · 범위 밖) |
| 미완 (Kyu 실기) | 0 |
| **총 순증감** | **-3** (해소 4 · 등재 1 · 미완 0) |

**별건 등재**: `components/payment/SuccessReceiptAnim.tsx:84` `<Button className="bg-warning">` (Hand over). M3-1105-D 에서 설정된 색이며 본 라운드 accent 20 리스트에 미포함이라 유지. 다음 라운드에 Kyu 판단.

---

## 10. 다음 게이트

1. **CI 그린 확인** (자동 · 수 분 내) → merge.
2. **Kyu 눈 확인** (PR #52 body 스샷 2장 — Cart 비움 + 영수증 v2) — 승인 여부.
3. **M3-1105-K2** (서버 뒤) — 로고 자리 · SC/PB1 줄 (영수증 서버 포맷 교정).
4. **별건** — P3 카드 tender · P4 QRIS tender · Hand over 버튼 색 재검토.

---

*M3-1105-L · 2026-11-07 · 결제 뒤 카트 정리 (A) + 영수증 v2 (B) + R0-1105-O P0/P1/P2 (C) + D1 accent 10 파일 교체 (D) · 어설션 13/13 + Playwright 13/13 PASS · 색 어설션 37/37 유지 · Cart empty 스샷 + 영수증 v2 스샷 PR body 첨부 · fork PR #52 · 이연 -3 (해소 4 · 등재 1)*
