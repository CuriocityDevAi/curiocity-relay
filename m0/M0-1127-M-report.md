PASS · PR #479 · head 5c127534 · tests: vitest 352 pass (신규 18) · typecheck pass · Playwright 자가 6/6 pass

## 요약

Kyu 2026-11-27 ledger §8·10·16 세 축을 한 PR 로 반영.

### 1. 키패드-after 카운트다운 바 (§8 ① ② ③)
- `apps/customer-display/src/screens/KeypadAfterScreen.tsx` 리팩터: 20초 카운트다운 바 + 숫자 UI.
  - 입력 전: mount 부터 20초 · 마지막 5초 `STATUS_COLORS.statusWarn` 색 전이 · 0 → `onTimeout` 1회 발사 (호출자 `index.tsx` 의 `handleTimeout` → `dispatch({type:"KEYPAD_SKIP"})` + `skipPhoneOnServer`).
  - 숫자 입력 중: 바 숨김·정지 (`cd.visible=false`).
  - 마지막 입력 뒤 30초 idle: 마지막 5초만 재등장 (visible=true · warn=true) → 0 → fire.
- 로직은 pure helper `src/lib/keypad-countdown.ts` 로 분리 (`computeCountdown({mountMs,lastInputMs,nowMs,timeoutSec,idleAfterInputSec}) → {remaining,visible,warn,fired,totalSec}`).
- `DEFAULT_LIVE_STORE.keypadTimeoutSec: 30 → 20` · 테스트에서 20/30 명시.

### 2. 결제 완료 C안 CTA (§10)
- `apps/customer-display/src/screens/ReceiptScreen.tsx`: "Payment complete" 메시지 밑 **"Get N points →"** 큰 노란 CTA 버튼 (data-testid `get-points-cta`).
- N 해상: pure helper `src/lib/receipt-earned-points.ts` — `receipt.earned` → `customer_flow.points_earned` → `customer_flow.points_to_earn` → `loyalty.earn_preview` 체인. 0 또는 음수면 숫자 생략 라벨 (`receiptStrings.getPointsFallback`).
- 버튼 즉시 → `onDone()` (RECEIPT_DONE dispatch) · 안 누르면 **5초** 뒤 자동 (3초 → 5초 · `DEFAULT_DISPLAY_CONFIG.receiptDurationMs: 3000 → 5000` · 중복 fire 가드 `doneRef`).
- i18n: `RECEIPT_STRINGS` 5개 언어 신설 (`en/id/ko/ja/zh`).

### 3. 손님 화면 머리 `#N` 하나 (§16)
- `CartScreen.tsx` / `QrisScreen.tsx` 머리 `${cart.order} #${storeConfig.orderNumber}` 텍스트 제거.
- `KeypadScreen.tsx` summary 카드는 `pos_order_num` 있을 때만 `#N` · 없으면 숫자 생략 (`storeConfig.orderNumber`→`display_id` 폴백 제거).
- PosChipBadge (`#${pos_order_num}`) 는 그대로 유지 — 화면 당 "보이는 주문 번호" 는 이 칩 하나.
- 영수증 내부 `No. R-…` · `PIM26B…` · `#7` (top) 은 범위 밖 (유지).

## 서버 쪽 (해당 없음)
- `apps/commerce-core/src/modules/register_session/lifecycle.ts::serializeSnapshot` 는 이미 `pos_order_num` + `customer_flow.points_to_earn` / `points_earned` 를 모두 직렬화 중 (b6f89c16 이전). 추가 필드 필요 없음 · 서버 코드 미수정.

## 테스트

### vitest (apps/customer-display)
- 총 352 pass (기존 334 + 신규 18)
- 신규 테스트 파일:
  - `src/lib/__tests__/keypad-countdown.test.ts` (12 테스트)
    - ① 20초 카운트다운 · 마지막 5초 warn 전이 · 0 fire
    - ② 입력 뒤 25초 숨김 · 25초 지나야 재등장 · 30초 fire · 재입력 재앵커
    - ③ Ask again (mountMs 재설정) 20초 fresh 카운트다운
    - 검증의 검증: fired 플래그는 0 일 때만 true · 클럭 skew clamp
  - `src/lib/__tests__/receipt-earned-points.test.ts` (6 테스트)
    - 우선순위 체인 (`receipt.earned` > `customer_flow.points_earned` > `points_to_earn` > `loyalty.earn_preview`)
    - 0/음수/NaN 방어

### Playwright (dev-server · 4195 포트 · 2.2s)
- `apps/customer-display/e2e/m0-1127-m-countdown-cta.spec.ts` — 6 테스트 전부 pass
  1. 바·숫자 노출 · 시작 숫자 20 근처
  2. 숫자 입력 중 바 숨김
  3. Get points CTA 노출 · N 숫자 포함
  4. Cart 머리 `Order #1042` 없음
  5. QRIS 머리 `Order #1042` 없음
  6. Receipt pos_order_num 존재 시 `#7` 노출 (topOrderNumber via `@storeport/receipt-view-model`)
- 스크린샷 3장 로컬 캡처 (`apps/customer-display/screenshots/m0-1127-m-*.png` · .gitignore 대상 · 첨부 생략)

### typecheck
- `pnpm --filter customer-display typecheck` — pass
- (pre-existing: `apps/wing` 의 ButtonPrimitive 에러는 main 과 동일 · 이 PR 과 무관)

## 커밋 / PR

- 브랜치: `feat/M0-1127-M-cd-keypad-countdown`
- 커밋: `5c127534` — `feat(cd): M0-1127-M — 키패드-after 카운트다운 + 결제 완료 C안 CTA + 머리 \`#N\` 하나`
- PR: https://github.com/CuriocityDevAi/storeport/pull/479
- processes: `[customer_display.cd-keypad]`
- feature-map.yaml: `cd-keypad` 노드에 신규 파일 6개 등록 (keypad-countdown.ts/tests · receipt-earned-points.ts/tests · e2e specs 2개)

## 파일 변경 요약 (17 files · +814 / −81)

### 신규
- `apps/customer-display/src/lib/keypad-countdown.ts` — pure countdown 로직
- `apps/customer-display/src/lib/receipt-earned-points.ts` — pure N 해상
- `apps/customer-display/src/lib/__tests__/keypad-countdown.test.ts`
- `apps/customer-display/src/lib/__tests__/receipt-earned-points.test.ts`
- `apps/customer-display/e2e/m0-1127-m-countdown-cta.spec.ts`
- `apps/customer-display/e2e/m0-1127-m-screenshots.spec.ts`

### 수정
- `apps/customer-display/src/screens/KeypadAfterScreen.tsx` — 카운트다운 바 전면 리팩터
- `apps/customer-display/src/screens/ReceiptScreen.tsx` — C안 CTA · doneRef 가드
- `apps/customer-display/src/screens/KeypadScreen.tsx` — summary 카드 `#N` only
- `apps/customer-display/src/screens/CartScreen.tsx` · `QrisScreen.tsx` — `Order #display_id` 제거
- `apps/customer-display/src/i18n/strings.ts` · `context.tsx` — RECEIPT_STRINGS 신설
- `apps/customer-display/src/mocks/adapter.ts` · `app/index.tsx` · `src/types/customer-display.ts` — 타이머 상수 20s/5000ms
- `docs/feature-map.yaml` — cd-keypad 파일 등록

## CI 대기 금지 지침 준수
세션 안에서 CI 상태 폴링하지 않음. gh pr view #479 로 CI 결과 사용자가 직접 확인.
