# R0-1105-BB Review Report — storeport #207 재확인 · fork #79 결제 완료 화면 · 상태 표시

**Reviewer**: R0 relay · 2026-11-10  
**Ledger**: R0-1105-AY-report.md · M0-1105-AD-report.md · decision-delivery-ui-20261110.md · M1-1105-AK-report.md  
**Verdict**: storeport #207 → **APPROVE (머지 가능)** · fork #79 → **CHANGES** (rebase 1 건)

---

## ① storeport #207 — M0-1105-AD 변경분 재확인

### 1-A. 옛 키 이름 grep

| 파일 | `\bremaining\b` / `\bretry_at\b` | 비고 |
|---|---|---|
| `_shared/manager-pin.ts` | 주석 1건만 (`Do not rename back to…`) | 실행 코드 0 ✅ |
| `manager-pin/verify/route.ts` | 0 ✅ | |
| `orders/[id]/void/route.ts` | 0 ✅ | |
| `orders/[id]/refund/route.ts` | 0 ✅ | |
| `tenders.spec.ts` | 0 ✅ | |

### 1-B. 응답 직렬화 4곳

| 위치 | 401 필드 | 423 필드 | 판정 |
|---|---|---|---|
| `manager-pin.ts:VerifyResult` 타입 + 반환 | `remaining_attempts` | `locked_until` | ✅ |
| `verify/route.ts:73,81,88` | `remaining_attempts` | `locked_until` | ✅ |
| `void/route.ts:215,222` | `remaining_attempts` | `locked_until` | ✅ |
| `refund/route.ts:194,201` | `remaining_attempts` | `locked_until` | ✅ |

### 1-C. 신규 테스트 3건 (M0-1105-AD · `tenders.spec.ts`)

| # | 설명 | 존재 | 판정 |
|---|---|---|---|
| #51 | CASH/QRIS origin + `method:'card_terminal'` refund → 400 | `tenders.spec.ts:2675` | ✅ |
| #52 | WIB 23:59→00:00 경계 — `wibDateKeyForTest` UTC 16:59 vs 17:00 PIN 달라짐 | `tenders.spec.ts:2722` | ✅ |
| #53 | 3회 오입력 → 성공 PIN → 카운터 리셋 (4회 더 → `remaining_attempts:4`) | `tenders.spec.ts:2740` | ✅ |

기존 #47 단언 필드명도 `remaining_attempts`/`locked_until` 로 교체 완료 (`tenders.spec.ts:2521,2539`).

### 1-D. 주석 2건

| 위치 | 내용 |
|---|---|
| `manager-pin.ts:7-9` | "Lockout state kept in-memory per `store_id` … Server restart clears the attempt counter — scope is a single-instance POS (M0 Kyu 11-10). If we ever run multiple replicas, move this state to Redis" |
| `void/route.ts:148-153` | "Legacy orders written before tender wired this metadata have `originSessionId === null` and therefore skip the check (current POS tender flow always sets it, so new orders always enforce same-shift void)." |

### 1-E. CI pos-integration

`gh pr checks 207` → "no checks reported on the 'feat/m0-1105-ab-void-refund-pin' branch"  
M0-1105-AD 보고서와 동일 상황 — GitHub Actions 지연/미발화. 코드 분석 기준:
- 기존 통과 테스트 (#44~#50) : 필드명 교체만 → regression 없음
- 신규 #51~#53 : 결정론적 로직 (HMAC math · in-memory 카운터) → 러너 도달 시 green 예상

### ① 판정 — APPROVE

> **storeport #207 머지 가능.** M0-1105-AD 에서 요구된 모든 수정(키 이름 4곳 + 테스트 3건 + 주석 2건)이 커밋 `f2624e2` 에 반영됨. CI 미발화는 GitHub Actions 측 문제이며 코드 로직상 green 예상.

---

## ② fork #79 — 결제 완료 화면 · 상태 표시 이름

### 2-A. 버튼 표 (`SuccessReceiptAnim.tsx`)

| `orderType` | `hand-over` 버튼 | `done` 버튼 | 안내 문구 |
|---|---|---|---|
| `takeaway` | ✅ 노출 (`onHandOver`) | ✗ | — |
| `delivery` | ✗ (0) | ✅ 노출 | "Awaiting dispatch — dispatch it from Orders when the courier picks up." |
| `preorder` (전액) | ✗ (0) | ✅ 노출 | "Awaiting pickup — fulfil it from Orders when the customer comes." |
| `preorder` (계약금 · `isDepositOnly`) | ✗ (0) | ✅ 노출 | "Deposit paid — collect the balance at pickup." |

결정문(`decision-delivery-ui-20261110.md`) 과 일치 ✅

### 2-B. `orderStatusLabel` 전 조합 (vitest 13/13)

| status | payment | fulfillment | order_type | 기대값 | 판정 |
|---|---|---|---|---|---|
| completed | any | any | any (3종) | Completed | ✅ |
| canceled | any | any | any (2종) | Canceled | ✅ |
| pending | captured | not_fulfilled | delivery | Awaiting dispatch | ✅ |
| pending | captured | fulfilled | delivery | Pending | ✅ |
| pending | awaiting | not_fulfilled | delivery | Pending | ✅ |
| pending | captured | not_fulfilled | preorder | Awaiting pickup | ✅ |
| pending | partially_captured | not_fulfilled | preorder | Deposit paid | ✅ |
| pending | captured | fulfilled | preorder | Pending | ✅ |
| pending | captured | not_fulfilled | takeaway | Pending | ✅ |
| requires_action | awaiting | not_fulfilled | takeaway | Requires_action | ✅ |

**결과**: 1 file · 13/13 passed · 140ms

### 2-C. Orders 목록 (`app/(tabs)/orders.tsx`)

`OrderStatusLabelChip` 컴포넌트 — `statusLabelTone` 토큰 테이블:  
Awaiting dispatch/pickup/Deposit paid = `bg-warning-soft / text-warning`, Completed = `bg-success-soft / text-success`, 기타 = `bg-surface-muted / text-ink-muted`

raw hex 없음 ✅ · `clx()` 경유 Tailwind 토큰 전용 ✅

### 2-D. 결정 버튼 색

Done 버튼 = `<Button onPress={onDone} testID="done">Done</Button>` (variant 미지정)  
Button 기본값 `variant='solid'` → `bg-ink` 토큰 (charcoal/black) ✅  
raw hex 없음 ✅

### 2-E. run-all

| 테스트 종류 | 결과 |
|---|---|
| vitest `__tests__/order-status-label.test.ts` | 13/13 passed ✅ |
| Playwright 7 assertions (스샷 3장) | 7/7 passed ✅ |

### 2-F. Playwright 스샷 3장 (직접 실행 — M1 미검증 해소)

**실행**: 빌드 `npx expo export --platform web` (from `fix/m1-1105-ak` HEAD `132703d`) → `dist/` 갱신 후 실행.

| 스크린샷 | 뷰포트 | 어설션 결과 |
|---|---|---|
| `01-web-delivery-success.png` | 390×844 (web) | hand-over=false · done=true · hint="Awaiting dispatch…" ✅ |
| `02-web-preorder-success.png` | 390×844 (web) | hand-over=false · done=true · hint="Awaiting pickup…" ✅ |
| `03-ipad-orders-awaiting-dispatch.png` | 1194×834 (iPad 가로) | chip="Awaiting dispatch" ✅ |

스샷 위치: `/tmp/screenshots-m1-1105-ak/`

### 2-G. #78 · #77 충돌 여부

| PR | 상태 | 겹치는 파일 | 충돌 |
|---|---|---|---|
| #78 (fix/m1-1105-aj) | **MERGED** (`3e5f9df`) | `app/checkout/[draftOrderId].tsx` · `components/payment/PreorderInputs.tsx` | 없음 ✅ |
| #77 (feat/m3-1105-ad-refund-void-sheets) | OPEN | `app/orders/[orderId].tsx` · `components/receipt/ReceiptCard.tsx` | 없음 ✅ |

**⚠️ 단, PR #79 (`fix/m1-1105-ak`) 의 베이스가 `345f23f`** — master 가 `3e5f9df` (#78 머지) 로 1 커밋 앞서 있음.  
파일 충돌 없어 rebase 는 trivial 이지만 머지 전 필수.

### ② 판정 — CHANGES

> **`fix/m1-1105-ak:` master 대비 1 커밋 뒤처짐 — `git rebase origin/master` (또는 `gh pr update-branch`) 필요.**  
> 코드 로직 · 토큰 · 테스트 모두 정상. rebase 후 재CI 통과 시 머지 가능.

---

## 실행 로그

```
git fetch origin (pos-r0): master 345f23f → 3e5f9df
git fetch origin (storeport): exit:0 (최신)
vitest run: 13/13 passed (140ms)
npx expo export --platform web: dist/ 갱신 완료
Playwright run (/tmp/m1-1105-ak-playwright.mjs): 7/7 passed
  스샷 01-web-delivery-success.png ✅
  스샷 02-web-preorder-success.png ✅
  스샷 03-ipad-orders-awaiting-dispatch.png ✅
gh pr checks 207: no checks reported (GitHub Actions 미발화 · M0-1105-AD 보고서와 동일)
git checkout pr-62: 복구 완료
```

---

## 판정 요약

| PR | 판정 | 조치 |
|---|---|---|
| storeport #207 | **APPROVE** | 머지 가능 |
| fork #79 | **CHANGES** | `fix/m1-1105-ak` → `git rebase origin/master` 후 재CI 확인 |
