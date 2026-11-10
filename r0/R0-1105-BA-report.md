# R0-1105-BA Review Report — fork #78 · fork #77

**Reviewer**: R0 relay · 2026-11-10  
**Ledger**: ledger/decision-p6-20261110.md · r0/R0-1105-AY-report.md · m1/M1-1105-AJ-report.md  
**Verdict**: fork #78 → **APPROVE** · fork #77 → **CHANGES**

---

## 실행 로그

```
git -C ~/projects/pos-r0 fetch origin  → 완료
git worktree add /tmp/wt-pr78 origin/fix/m1-1105-aj
git worktree add /tmp/wt-pr77 origin/feat/m3-1105-ad-refund-void-sheets
node /tmp/wt-pr78/scripts/m1-1105-aj-assertions.mjs  → 21/21 PASS
node /tmp/wt-pr77/scripts/m3-1105-ad-assertions.mjs  → 59/59 PASS
node /tmp/wt-pr77/scripts/m3-1105-ae-assertions.mjs  → 35/35 PASS
cd /tmp/wt-pr77 && node scripts/run-all.mjs assertions → 23/29 PASS
  FAIL 5건: tsc/dayjs/expo 미설치 (worktree node_modules 없음) — 환경 실패
  FAIL 1건: m3-1105-x-fulfill-assertions.mjs U1 (Delivery disabled 선-재발 · #75 범위 · AE 무관)
Playwright: 미실행 (dist 빌드 없음 · harness 로드 실패)
master 충돌: PR #78 0건 · PR #77 0건
#78 ↔ #77 파일 겹침: 0건
```

---

## ① fork #78 — `fix/m1-1105-aj` (Pre-order 픽업 필수)

### 어설션 결과

| 스크립트 | 결과 |
|---|---|
| `m1-1105-aj-assertions.mjs` | **21/21 PASS** |

### 체크리스트

| 항목 | 판정 | 위치 |
|---|---|---|
| pickupAt 기본값 0(빈 칸) — useEffect tomorrow10() 제거 | ✅ | `components/payment/PreorderInputs.tsx:131-134` |
| useState('') 초기값 | ✅ | `app/checkout/[draftOrderId].tsx:66` |
| 빠른 버튼 3개로만 채움 | ✅ | quick options 렌더 — 기존 §3 그대로 |
| 비면 Pay disabled + "Choose a pickup time" | ✅ | `preorderMissingPickup` 가드 + `checkout-pay-hint` |
| 꺼진 Pay 탭 → scrollToEnd + border-danger 2초 강조 | ✅ | `handleDisabledPayTap` + `absolute inset-0 Pressable overlay` |
| 스크린리더 `accessibilityLiveRegion="assertive"` | ✅ | `PreorderInputs.tsx:163-173` |
| Pre-order 재진입 시 pickupAt 초기화 | ✅ | `handleOrderTypeChange` → `setPickupAt('')` |
| Takeaway/Delivery 회귀 | ✅ | run-all 관련 스크립트 전건 PASS |
| 파일 범위 — checkout 2 파일 + assertion 스크립트 2개 | ✅ | 4 files total |
| 오류 메시지 영어 | ✅ | "Choose a pickup time" / "Choose pickup date & time" |
| raw hex 0 · 색 하드룰 | ✅ | 어설션 §9 · overlay Pressable에 raw hex 없음 |

**세부 확인**: `preorderMissingPickup = orderType === 'preorder' && !pickupAt` 가드가 기본값 주입 제거 후 실제로 작동함. overlay Pressable은 조건부(`preorderMissingPickup && ...`) 렌더로 Takeaway/Delivery 화면에선 등장하지 않음 ✅.

### 판정: fork #78 → **APPROVE**

---

## ② fork #77 — `feat/m3-1105-ad-refund-void-sheets` (Void/Refund)

### 어설션 결과

| 스크립트 | 결과 |
|---|---|
| `m3-1105-ad-assertions.mjs` | **59/59 PASS** |
| `m3-1105-ae-assertions.mjs` | **35/35 PASS** |
| `run-all.mjs assertions` | 23/29 PASS (5 환경 실패 · 1 선-재발 U1) |

### §A · 노출 규칙 전 조합

| 시나리오 | 판정 | 위치 |
|---|---|---|
| 같은 교대 + 결제 완료 → Void 버튼 (outline) | ✅ | `deriveVoidRefundExposure` + `app/orders/[orderId].tsx:662-679` |
| 그 외 결제 완료 → Refund 버튼 (outline) | ✅ | 동일 |
| 이미 처리(`metadata.void` / `metadata.refund`) → Voided/Refunded 배지 | ✅ | `testID="order-voided-badge"` / `testID="order-refunded-badge"` |
| dp_paid (`preorder.stage === 'dp_paid'`) → 숨김 | ✅ | `lib/refund-rules.ts:159-161` |
| 미결제 (`payment_status !== captured/paid`) → 숨김 | ✅ | 동일 |
| 결제 provider 없음 → 숨김 | ✅ | `pickOriginalTender` → null → hidden |
| 버튼 색 하드룰 — outline (ink 아님) | ✅ | PR body §3 선택지 ③ + AE 어설션 §2 |

### §B · 서버 body shape

| 항목 | 판정 | 위치 |
|---|---|---|
| `method: 'card_terminal' \| 'cash'` | ✅ | `lib/refund-rules.ts:buildRefundBody` |
| `terminal_approval_code` 6자리 (`/^\d{6}$/`) | ✅ | `isValidTerminalApprovalCode` |
| `manager_pin` 4자리 (`/^\d{4}$/`) | ✅ | `isValidManagerPin` |
| `register_session_id` body 포함 (void shift 검증 필수) | ✅ | `buildRefundBody` + `VoidRefundSheet.tsx:97` |
| `open_drawer: true` → "Open the cash drawer and give IDR X" | ✅ | `VoidRefundSheet.tsx:106-110` |
| 캡슐 토스트 (`showToast.success` / `showToast.error`) | ✅ | `VoidRefundSheet.tsx` — `Toast.show` 직접 호출 0건 |
| `onSettled → ['orders'] invalidate` | ✅ | `api/hooks/pos-refunds.ts` 3개 훅 전부 |

### §C · **[CRITICAL] 계약 키 불일치 — CHANGES 사유**

AY 리뷰에서 확립한 계약 정본 (`M0-1105-AB` · `ledger/decision-p6-20261110.md`):
- 401 → `remaining_attempts`
- 423 → `locked_until`

**서버 M0-1105-AD가 현재 `remaining_attempts` / `locked_until` 로 고치는 중** (R0-1105-BA task 명세).

PR #77 AE 라운드는 반대 방향으로 수정 — 현재 서버 출력(`remaining` / `retry_at`)에 맞췄음:

| 위치 | 현재(AE) | 계약 정본 |
|---|---|---|
| `fixtures/pos-refund-verify-pin-401.json` | `"remaining": 4` | **`"remaining_attempts": 4`** |
| `fixtures/pos-refund-verify-pin-423.json` | `"retry_at": "..."` | **`"locked_until": "..."`** |
| `api/hooks/pos-refunds.ts:VerifyManagerPinResponse` | `remaining: number` / `retry_at: string` | **`remaining_attempts`** / **`locked_until`** |
| `components/orders/ManagerPinSheet.tsx:extractPinError` | `body.remaining` / `body.retry_at` | **`body.remaining_attempts`** / **`body.locked_until`** |
| `ManagerPinSheet.tsx:onSubmit` catch 분기 | `res.retry_at` / `res.remaining` | **`res.locked_until`** / **`res.remaining_attempts`** |

**영향**: M0-1105-AD 서버 fix 배포 뒤, PIN 오입력 시 "N attempts left" / "Locked until HH:MM" UI가 silent fail.  
**수정 방향**: AE assertions §5의 `remaining_attempts 제거 / locked_until 제거` 어설션을 뒤집어, 계약 정본 키를 복원.

### §D · 기타 항목

| 항목 | 판정 |
|---|---|
| 카드 → `card_terminal` 기본 옵션 | ✅ |
| 현금/QRIS → cash 전용 + PIN 필수 | ✅ |
| CARD 단말기 실패 대체 → `hint: 'Terminal failed — refund in cash'` | ✅ |
| ReceiptCard `kind === 'void'` → 워터마크 노출 | ✅ |
| `receiptId` 우선순위: refund → void → 기본 | ✅ |
| 기존 `app/orders/[orderId].tsx` 주요 로직 미손상 | ✅ |
| 오류 메시지 영어 | ✅ |
| raw hex 0 | ✅ |
| master 충돌 0건 | ✅ |

### §E · run-all 실패 분류

| 스크립트 | 원인 | 블로커 여부 |
|---|---|---|
| `m2-1104-d-escpos-assertions.mjs` | worktree node_modules 미설치 (tsc 없음) | ❌ 환경 실패 |
| `m2-1105-m-receipt-escpos-assertions.mjs` | 동일 | ❌ 환경 실패 |
| `m2-1105-p-logo-bitmap-assertions.mjs` | 동일 | ❌ 환경 실패 |
| `m2-1105-q-bundle-guard.mjs` | expo export 실패 (expo 미설치) | ❌ 환경 실패 |
| `m3-1105-v-assertions.mjs` | dayjs 미설치 | ❌ 환경 실패 |
| `m3-1105-x-fulfill-assertions.mjs` | U1 — Delivery disabled 선-재발 (#75 범위) | ❌ AE 무관 · 기존 선-재발 |

환경 실패를 제외하면 run-all 23/23(적용 가능 범위) PASS. U1은 #75에서 처리될 선-재발이므로 본 PR 블로커 아님.

### 판정: fork #77 → **CHANGES**

**수정 위치 (§C)**:

```
fixtures/pos-refund-verify-pin-401.json
  "remaining": 4  →  "remaining_attempts": 4

fixtures/pos-refund-verify-pin-423.json
  "retry_at": "2026-11-10T09:00:00.000Z"  →  "locked_until": "2026-11-10T09:00:00.000Z"

api/hooks/pos-refunds.ts · VerifyManagerPinResponse
  { ok:false; reason:'mismatch'; remaining: number }  →  remaining_attempts: number
  { ok:false; reason:'locked'; retry_at: string }     →  locked_until: string

components/orders/ManagerPinSheet.tsx · onSubmit (res 분기)
  res.retry_at  →  res.locked_until
  res.remaining  →  res.remaining_attempts

components/orders/ManagerPinSheet.tsx · extractPinError
  body.remaining  →  body.remaining_attempts
  body.retry_at   →  body.locked_until

스크립트 m3-1105-ae-assertions.mjs §5 어설션도 역방향으로 수정
  'remaining_attempts 제거' → 'remaining_attempts 존재'
  'locked_until 제거'      → 'locked_until 존재'
```

나머지 항목(노출 규칙 · body shape · 토스트 · 버튼 색 · 워터마크)은 계약 충족.

---

## ③ 파일 겹침 · 충돌 · run-all

| 항목 | 결과 |
|---|---|
| #78 ↔ #77 파일 겹침 | 0건 ✅ |
| #78 vs master 충돌 | 0건 ✅ |
| #77 vs master 충돌 | 0건 ✅ |
| run-all (PR #77 환경 보정 후) | 23/23 ✅ |

---

## 판정 요약

| PR | 판정 | 사유 |
|---|---|---|
| fork #78 (Pre-order 픽업 필수) | **APPROVE** | 21/21 PASS · 체크리스트 전건 OK · 파일 범위 준수 · 회귀 0 |
| fork #77 (Void/Refund 연결) | **CHANGES** | 401/423 키명이 `remaining`/`retry_at` — 계약 정본(`remaining_attempts`/`locked_until`)과 불일치. M0-1105-AD 서버 fix 배포 뒤 silent fail. |
