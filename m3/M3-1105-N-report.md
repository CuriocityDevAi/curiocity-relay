---
round: M3-1105-N
pr:
  fork: agilo-medusa-pos-fork#58
commit: bdaf783 (branch feat/m3-1105-n-quote-receipt-logo · base master baed53a)
outcome: Checkout 세금 줄 (Subtotal · Service charge x% · PB1 x% · Total) · api/hooks/pos-quote.ts (신규 · fail-open) · ReceiptCard 상단 로고 (snap.store.logo_url Image · 없으면 매장명 텍스트) + Subtotal/SC/PB1/Total 줄 + 세로 여백 py-12 · CashTenderPanel Pay 연타 가드 (R0-U §D · ProcessButton busy 로컬 state 이중 안전망). pos-payments.ts 미수정 (M1-1105-R claim). lib/printer 미수정 (M2 담당 · 로고 비트맵·세금 줄 필요만 리포트). 어설션 15/15 + Playwright 17/17 PASS (신규 m3-1105-n 17/17 checks). 색 어설션 37/37. 스크린샷 2장 (Checkout · Receipt) PR body 첨부.
kyu_checks: 0 (스샷 즉시 확인 · Kyu 실기 불요)
---

# M3-1105-N · Checkout quote (SC+PB1) + Receipt logo/세금/여백 + Pay 연타 가드

**일자**: 2026-11-07 · **허브**: M3 · **성격**: open-requirements Kyu 11-07 결정 (세금 ⓐ가산 ⓑ매장별 PB1 ⓒ SC compound) + 🔴 실기 피드백 (영수증 로고·세로 여백) + R0-U §D (Pay 연타 가드).

---

## §0 대사표 — 서버 엔드포인트 매핑 (storeport PR #197 pre-머지)

| 화면 | 서버 | 성격 | 상태 |
|---|---|---|---|
| Checkout 세금 줄 | `GET /admin/pos/orders/:id/quote` (M0-1105-Q 신규) | **신규** | pre-머지 → fail-open null 폴백 |
| Pay 금액 | tenders `body.amount` 생략 → 서버 computedGrand | 코어 | ✓ |
| Receipt 로고 | `snap.store.logo_url` (M0-1105-Q 신규) | **신규** | ✓ (fixture) |
| Receipt SC/PB1 줄 | `snap.service_charge` + `snap.tax(label='PB1')` | **신규** | ✓ (fixture) |
| Pay 연타 가드 | — (앱 전용) | 신규 (R0-U §D) | ✓ |

**없는 것 (M0 요청 목록)**: 없음.
**재조정 필요 필드 후보 (PR #197 머지 뒤 shape 변경 시)**: `quote.store.logo_url` 키명 / `snapshot.service_charge.label` 기본값 — `api/hooks/pos-quote.ts` 반환 타입 1곳만 조정.

---

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | Checkout Subtotal/SC/PB1/Total 줄 + pct=0 숨김 + Pay=grand_total | ✓ |
| 2 | api/hooks/pos-quote.ts (신규) · 404 fail-open 폴백 | ✓ |
| 3 | pos-payments.ts 미수정 (M1-1105-R claim) | ✓ |
| 4 | Receipt 상단 로고 (snap.store.logo_url Image · 없으면 매장명 텍스트) | ✓ |
| 5 | Receipt Subtotal/SC x%/PB1 x%/Total 줄 (snap.service_charge · snap.tax) | ✓ |
| 6 | Receipt 세로 여백 확대 (Kyu 11-07 "여백 더") · py-8 → py-12 + gap-3 | ✓ |
| 7 | ReceiptCard 에 #55 Cashier 줄 유지 (M1-1105-Q coexistence) | ✓ |
| 8 | CashTenderPanel Pay 연타 가드 (R0-U §D · 이중 안전망) | ✓ |
| 9 | ESC/POS 렌더러 (lib/printer) 미수정 | ✓ |
| 10 | Fixtures (SC 5.5%+PB1 10% · 0%/0% · receipt snapshot) | ✓ |
| 11 | Playwright (Checkout 줄 · 영수증 줄·로고 · 0% 숨김 · 연타 가드) | ✓ (17/17) |
| 12 | 색 어설션 37/37 | ✓ |
| 13 | CI 전 job 그린 | **진행 중** (PR #58) |

---

## 2. 산출물 (PR #58 · base master `baed53a`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `api/hooks/pos-quote.ts` | **신규** · `useOrderQuote` · fail-open | +35 |
| `app/checkout/[draftOrderId].tsx` | quote 기반 Subtotal/SC/PB1/Total + Pay disabled while loading | +53 / -41 |
| `components/receipt/ReceiptCard.tsx` | 로고 Image/text fallback · SC/PB1 줄 · py-12 + gap-3 · #52 WIB/#55 Cashier 유지 | +34 / -8 |
| `components/payment/CashTenderPanel.tsx` | ProcessButton 서브 컴포넌트 (busy + isPending 이중 가드) | +32 / -7 |
| `types/receipt.ts` | ReceiptServiceCharge · tax.label 'PB1' · snap.service_charge · snap.store.logo_url · labels.service_charge | +15 / -3 |
| `fixtures/pos-quote-sc-pb1.json` | **신규** · Ta Wan 348,000→403,854 | +14 |
| `fixtures/pos-quote-zero.json` | **신규** · 0%/0% 매장 | +11 |
| `fixtures/pos-receipt-sc-pb1-response.json` | **신규** · 로고+SC+PB1 snapshot | +47 |
| `scripts/m3-1105-n-quote-receipt-playwright.mjs` | **신규** · 17 check (A SC+PB1 · B 0%/0% 숨김 · C Receipt · D 연타 가드) | +260 |
| `scripts/m3-1105-n-screenshots.mjs` | **신규** · 2 스샷 | +86 |
| `screenshots-m3-1105-n/*.png` | **신규** · 2 장 | +2 파일 |
| **총** | **12 파일** | **+677 / -68** |

**금지 영역 미수정**: `api/hooks/pos-payments.ts` (M1-1105-R claim) · `lib/printer/**` (M2).

---

## 3. 상시 claims (규약 ⓔ)

- `status/claims/M3-1105-N.json` · state=`started` 커밋+푸시 완료 (17:00:00Z).
- 완료 시 state=`done` 커밋 예정 (CI green 확인 뒤).
- 막힘 없음.

---

## 4. 설계 포인트

### 4-1. `useOrderQuote` fail-open
- `GET /admin/pos/orders/:id/quote` 가 아직 서버에 없을 수 있음 (PR #197 pre-머지).
- `catch(() => null)` · 소비부 `quote.data` 로 nullish 체크 → 없으면 `draftOrder.total` 폴백.
- 서버 응답 shape 이 바뀌어도 pos-quote.ts 타입 1곳만 조정.

### 4-2. pos-payments.ts 미수정 (M1-1105-R claim 영역)
- 스펙 명시: "신규 훅 api/hooks/pos-quote.ts(신규 · 다른 훅 파일 수정 금지)".
- tenders body 에 amount 전달 안 함 (기존대로) · 서버가 M0-1105-Q 이후 computedGrand 자동 산정.

### 4-3. Receipt 로고 — Image fallback + 58mm 비율
- `maxWidth: 240 · height: 60 · resizeMode: 'contain'` — 58mm 열전사 프린터 (약 384px @ 203dpi) 가로폭 안쪽.
- B&W 변환은 M2 프린터 (lib/printer) 몫 — 본 라운드는 UI 미리보기만.
- logo_url 없으면 매장명 `<Text>` fallback (기존 UX 유지).

### 4-4. "여백 더" (Kyu 11-07)
- `p-5` → `px-5 py-8` (M3-1105-L) → **`px-5 py-12`** (M3-1105-N).
- 블록 간 `gap-3` 추가 (워터마크 · 로고 · 번호/날짜 · 품목 · 세금 · tender · footer 간 동일 간격).
- 58mm 폭은 그대로 (`maxWidth: 420`).

### 4-5. Pay 연타 가드 (R0-U §D)
- M1-1105-R 의 훅 단에서 가드 추가 예정 → UI 단 **이중 안전망**.
- `onPress` sync void 여도 setState busy=true 즉시 반영 → 두 번째 탭 `effectivelyDisabled=true` 로 무시.
- `isPending` false 관측 → busy 해제 (mutation 완료 or 에러 복귀).

### 4-6. #55 (M1-1105-Q cashier) coexistence
- 본 라운드 시작 시점 fork master (baed53a) 에는 #55 가 아직 머지되지 않음 (M1-1105-Q claim 진행 중).
- ReceiptCard 에 이미 있는 `snap.cashier` 블록 (M3-1105-D 이후부터) 유지 — M1-Q 가 머지되면 거기서 cashier 표기 세부 교정.

---

## 5. 검증 (로컬 · CI 동일 명령)

### 5-1. 전 어설션
```
$ node scripts/run-all.mjs assertions
  총 15 개 · 15 PASS · 0 FAIL · 1.6s
  · m3-1105-a-color-assertions.mjs ... PASS · 37/37
```

### 5-2. 전 Playwright
```
$ node scripts/run-all.mjs playwright
  총 17 개 · 17 PASS · 0 FAIL · 271.0s
  · m3-1105-n-quote-receipt-playwright.mjs (신규) · 49.1s · 17/17 checks
```

### 5-3. Lint
`0 errors · 34 pre-existing warnings`.

### 5-4. CI (fork)
- PR #58: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/58
- Green 확인 후 state=done 상시 claim 커밋.

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +4 (Checkout 세금 줄 · Receipt 로고 · Receipt SC/PB1 줄 · Pay 연타 가드) |
| 등재 | +1 (M2 "로고 비트맵 · 세금 줄" ESC/POS — M2 몫) |
| 미완 (Kyu 실기) | 0 |
| **총 순증감** | **-3** (해소 4 · 등재 1) |

---

## 7. 다음 게이트

1. **CI 그린 확인** → state=done 상시 claim 커밋+푸시.
2. **Kyu 눈 확인** (PR #58 body 스샷 2장 — Checkout 세금 줄 + Receipt 로고/세금/여백) — 승인 여부.
3. **M1-1105-R 머지** 뒤 — pos-payments.ts 의 Pay 가드와 이중 안전망 안정성 재검토.
4. **M2** — ESC/POS 렌더러에 로고 비트맵 (B&W dithering) + SC/PB1 줄 추가.
5. **storeport PR #197 머지 뒤** — pos-quote.ts 타입 미세 재조정 (필요 시).

---

*M3-1105-N · 2026-11-07 · Checkout quote (SC+PB1) + Receipt 로고/세금/여백 + Pay 연타 가드 · pos-payments.ts 미수정 (M1-R claim) · lib/printer 미수정 (M2) · 어설션 15/15 + Playwright 17/17 (신규 m3-1105-n 17/17) · 색 어설션 37/37 · fork PR #58 · 이연 -3 (해소 4 · M2 등재 1)*
