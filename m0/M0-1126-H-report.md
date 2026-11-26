PASS · PR #454 커밋 5695191

# M0-1126-H · V4-4 · QRIS 결제 중 손님 화면 QR 복구

## 원장
- ledger/decision-cd-pos-sync-v4-20261126.md · V4-4 🔴
- 트리거: Kyu 2026-11-26 15:40 실기 "QRIS 중 손님 화면에 QR 없음"
- 진단 원인: M2-1126-H (원인 d)

## 확정 원인 (M2-H)
`apps/customer-display/src/lib/cd-screen-selector.ts` 의 `selectCdView` 가 `flow==='none'` 분기에서 `tender.method` 를 보지 않음.
→ QRIS 결제 중에도 `tendering × none` 이 `order-list` 로 떨어져 큰 QR 사라짐.
옛 QrisScreen 분기 (`screen==='qris'`) 는 `cdSnapshot` 이 항상 살아 있으므로 도달 불가 (dead branch).

## 고침 (5 files · +394 -8)

### 1. `apps/customer-display/src/lib/cd-screen-selector.ts`
- `CdView` 에 `qris-full` kind 추가: `{ enterPhoneEnabled: boolean; hasQrString: boolean }`
- `TenderInfo` 에 `qr_string` 포함
- `flow=none` 분기:
  - `phase==='paid'` → `receipt-full` (기존 유지)
  - `phase==='tendering' && tender?.method==='qris'` → `qris-full` (새 분기 · `enterPhoneEnabled=true` · `hasQrString=!!tender.qr_string`)
  - 그 외 → `order-list` (기존 유지)
- 나눠결제 (`is_split=true`) 의 QRIS 단계도 동일 — `method` 만 본다.

### 2. `apps/customer-display/src/screens/QrisScreen.tsx`
- 신규 prop 4종 (옵셔널): `enterPhoneEnabled` · `onEnterPhone` · `qrStringOverride` · `amountOverride`
- QR 아래에 `qris-enter-phone-button` 추가 — 결정 4 ("결제수단 화면에서 번호 입력 버튼 활성") 연장
- `qr_string` 미도착 시 기존 `qris-qr-placeholder` ("Preparing…") 유지

### 3. `apps/customer-display/app/index.tsx`
- `tenderInfo` 에 `qr_string` 포함
- `cdView.kind==='qris-full'` 분기 — `QrisScreen` 에 `tender.qr_string` / `tender.remaining(→grand_total)` override 로 넘김 + `onEnterPhone={() => handleCdAction({ type: 'start_entry' })}`
- `phone-flow` 분기는 switch 완전성 보장 위해 `else if (cdView.kind === 'phone-flow')` 가드

### 4. `apps/customer-display/src/lib/__tests__/cd-screen-selector.test.ts`
신규 8 케이스:
- `tendering+qris+none+qr_string` → `qris-full` · `enterPhoneEnabled=true` · `hasQrString=true`
- `tendering+qris+none+qr_string=null` → `qris-full` · `hasQrString=false` (screen 쪽 Preparing)
- `tendering+qris+none+qr_string=undefined` → `qris-full` · `hasQrString=false`
- 나눠결제 (`is_split=true`) + `qris+none` → `qris-full`
- `tendering+cash+none` → `order-list` (qris-full 아님)
- `tendering+card+none` → `order-list`
- `tendering+qris+entering` → `phone-flow` · `leftPanel=qris` (기존 유지 검증)
- `paid+qris+none` → `receipt-full` (영수증 전환 유지)

### 5. `apps/customer-display/e2e/cd-pos-sync-v4-qris-none.spec.ts` (신규)
- `tendering+qris+none` → `qris-screen` + `qris-qr-svg` + `qris-amount` ("Rp 126.500") + `qris-enter-phone-button` (visible, enabled) + `order-list-screen` 숨김
- `tendering+qris+none+qr_string=null` → `qris-qr-placeholder` ("Preparing…") + 버튼 enabled

## 테스트 로그

### 단위 테스트 (cd-screen-selector)
```
pnpm --filter customer-display exec vitest run src/lib/__tests__/cd-screen-selector.test.ts
 RUN  v5.1.0 /Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-F/apps/customer-display
 Test Files  1 passed (1)
      Tests  57 passed (57)
   Duration  194ms
```

### 전체 vitest (customer-display)
```
pnpm --filter customer-display test
RUN  v5.1.0 /Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-F/apps/customer-display
 Test Files  16 passed (16)
      Tests  327 passed (327)
```

### E2E 신규 테스트
```
pnpm --filter customer-display e2e cd-pos-sync-v4-qris-none.spec.ts
Running 2 tests using 1 worker
  ✓  1 › tendering + qris + customer_flow=none → QR screen + Enter phone button (610ms)
  ✓  2 › tendering + qris + customer_flow=none + no qr_string → Preparing placeholder (319ms)
  2 passed (1.8s)
```

### E2E 전체 (회귀 확인)
```
pnpm --filter customer-display e2e
139 passed (19.2s), 8 skipped
```

### 타입 체크
```
pnpm --filter customer-display exec tsc --noEmit
(에러 0)
```

### pre-commit (husky + lint-staged + naming-check)
```
✓ naming-check PASS (검사 1~4 통과)
✓ prettier --write (5 files)
✓ pre-push: typecheck + commerce-core test (869/869) + customer-display test (327/327) 통과
```

## 스크린샷
- `apps/customer-display/screenshots/cd-pos-sync-v4-qris-none/v4-4-qris-none-full-with-button.png` (7.7 KB · 큰 QR + "Enter phone number" 버튼)
- `apps/customer-display/screenshots/cd-pos-sync-v4-qris-none/v4-4-qris-none-preparing.png` (7.5 KB · Preparing placeholder)

## 착지
- 커밋: `5695191` on `feat/M0-1126-F-cd-pos-sync-v3`
- 푸시: `7eb3be3..5695191` → origin (PR #454 branch)
- main 머지는 Kyu 승인 후 T0 가 담당 (§ 11.4)
- 실기 회부 대상 (사용자 보는 시각/UX 변경) — § 11.4 착지 게이트 0단계
