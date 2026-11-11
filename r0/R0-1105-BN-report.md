# R0-1105-BN 리뷰 리포트
fork PR #91 · 앱 "남은 금액 다시 환불" · M3-1105-AO

**판정: CHANGES**

---

## 판정 근거

### ❌ CHANGES 항목

| # | 항목 | 상세 |
|---|------|------|
| C1 | `screenshots-m3-1105-ao/` 3장 미커밋 | PR 본문 "Playwright 8/8 passed" 체크됨, `scripts/m3-1105-ao-screenshots.mjs` 커밋됨. 그러나 `screenshots-m3-1105-ao/{01-order-detail-banner,02-retry-sheet,03-after-retry-success}.png` 브랜치에 없음. `git ls-tree FETCH_HEAD` 확인. 실행 증거 없음. |
| C2 | `pos-refund-retry-423.json` fixture 미작성 | storeport #214 계약 `423 locked → locked_until` 케이스가 m3-1105-ao-assertions.mjs에 포함 안 됨 (기존 `pos-return-423-pin-locked.json`은 void/return 흐름 대상, retry 엔드포인트 별개). 코드 처리는 있음, fixture 증거 없음. |

추가 참고: `screenshots-m3-1105-an/` (AN DigitsInput Playwright)도 미커밋. 별도 판정 항목 아니나 함께 첨부 권장.

---

## 검증 표

### A. 훅 요청·응답 필드 ↔ storeport #214 계약

| 항목 | 계약 | 앱 훅 (`api/hooks/pos-refunds.ts`) | 결과 |
|------|------|-------------------------------------|------|
| GET URL | `/admin/pos/orders/:id/refund-status` | `GET /admin/pos/orders/${orderId}/refund-status` | ✅ |
| GET 200 `ok` | `true` | `ok: true` | ✅ |
| GET 200 `total_captured` | `number` | `number` | ✅ |
| GET 200 `total_refunded` | `number` | `number` | ✅ |
| GET 200 `remaining_refundable` | `number` | `number` | ✅ |
| GET 200 `returns[]` | `id·at·method·items·requested_amount·refunded_amount·failed_amount·status·tender_results·refund_distribution` | 모두 포함 | ✅ |
| GET 200 `partial_returns[]` | `return_id·requested_amount·refunded_amount·failed_amount·failed_tenders[]` | 모두 포함 | ✅ |
| GET 400 `invalid_data` | id 누락 | 타입·코드 처리 | ✅ |
| GET 404 `not_found` | order 없음 | 처리 | ✅ |
| POST URL | `/admin/pos/orders/:id/refund-retry` | `POST /admin/pos/orders/${input.order_id}/refund-retry` | ✅ |
| POST body `return_id` | 필수 | ✅ | ✅ |
| POST body `manager_pin?` | CASH/QRIS 포함 시 필수 | `needsPin` 조건 | ✅ |
| POST body `terminal_approval_code?` | CARD 포함 시 필수 (6자리) | `needsCard` 조건 | ✅ |
| POST body `register_session_id?` | CASH 재환불 시 | 선택 전달 | ✅ |
| POST 200 `retried[]·skipped[]·refunded_amount·total_refunded_amount·requested_amount·remaining_failed_amount` | 계약 그대로 | 타입 완비 | ✅ |
| POST 200 `status` | `'completed'\|'partial'` | ✅ | ✅ |
| POST 200 `open_drawer` | `boolean` | `boolean` | ✅ |
| POST 200 `already_complete?` | 이미 완료 시 `true` | ✅ | ✅ |
| POST 400 `invalid_data` | return_id 누락 등 | fixture + 처리 | ✅ |
| POST 401 `mismatch` | `remaining_attempts` | fixture + "N attempts left" | ✅ |
| POST 404 `not_found` | order/return_id 없음 | 처리 (fixture 미작성, 계약 존재) | ✅ |
| POST 423 `locked` | `locked_until` | 코드 처리, **fixture 미작성** | ⚠️ C2 |
| POST 500 `refund_partial_failure` | `remaining_failed_amount·status:'partial'` | fixture + 처리 | ✅ |

### B. Fixture 계약 대조

| fixture | 검증 | 결과 |
|---------|------|------|
| `pos-refund-status-200-partial.json` | `partial_returns` 1건+, `failed_tenders`, `remaining_refundable` | ✅ |
| `pos-refund-status-200-complete.json` | `partial_returns: []`, `remaining_refundable: 0` | ✅ |
| `pos-refund-retry-200-completed.json` | `status:'completed'`, `remaining_failed_amount: 0`, `open_drawer: boolean` | ✅ |
| `pos-refund-retry-200-partial.json` | `status:'partial'`, `remaining_failed_amount > 0`, `tender_results: []` | ✅ |
| `pos-refund-retry-200-already-complete.json` | `already_complete: true`, `retried: []` | ✅ |
| `pos-refund-retry-401.json` | `status: 401`, `remaining_attempts: number` | ✅ |
| `pos-refund-retry-500.json` | `status: 500`, `type: 'refund_partial_failure'`, `remaining_failed_amount > 0` | ✅ |
| `pos-refund-retry-423.json` | — | ❌ 미작성 (C2) |

### C. 로직 검증

| 항목 | 구현 | 결과 |
|------|------|------|
| 500 `refund_partial_failure` → "Refund incomplete" 토스트 | `VoidRefundSheet.isPartialFailureError()` → `showToast.error('Refund incomplete', ...)` | ✅ |
| 500 → 일반 "failed" 아님 | 별도 분기, 일반 catch 이전 처리 | ✅ |
| void/refund 후 `['refund-status', order_id]` 무효화 | `useVoidOrder·useReturnOrder·useRefundOrder.onSettled` 에 추가 | ✅ |
| `partial_returns` 배너 | `hasPartialReturn && retryTarget` 조건, `testID="refund-incomplete-banner"` | ✅ |
| 실패 수단별 금액 표시 | `failed_tenders.map(ft => method + amount)` | ✅ |
| "Retry remaining refund" 버튼 | `testID="order-retry-refund"`, `onPress={() => setRetrySheetOpen(true)}` | ✅ |
| CASH/QRIS → DigitsInput 4자리 PIN (#90 방식 재사용) | `needsPin` 조건 + `DigitsInput(secureTextEntry)` | ✅ |
| CARD → 6자리 승인번호 | `needsCard` 조건 + `TextInput(maxLength=6)` | ✅ |
| 둘 다 → 둘 다 | 각각 독립 조건 | ✅ |
| `completed` → "Refunded" + open_drawer 서랍 안내 | `showToast.success('Refunded', {text2: 'Open the cash drawer...'})` | ✅ |
| `partial` → `showToast.info('Partially refunded')` + 쿼리 무효화 | 처리됨 | ✅ |
| `already_complete` → "Already refunded" | `showToast.info('Already refunded')` | ✅ |
| `isPending` 중 버튼 비활성 | `submitDisabled = retry.isPending \|\| pinLockActive \|\| ...` | ✅ |
| 401 → "N attempts left" | `extractRetryError → remaining_attempts → setPinError` | ✅ |
| 423 → "Locked until HH:MM" | `extractRetryError → locked_until → setPinLocked` | ✅ |

### D. Kyu 21:14 실기 — PIN 맞는데 'client error'

**이 PR 범위 내 수정됨.**

원인: M3-1105-AL에서 NumericKeypad의 `onComplete` → `onSubmit()` 호출 시 React state 비동기 경쟁. `pin = digits.join('')` 이 마지막 자리 state 반영 전 stale 값으로 서버 전달.

수정 (M3-1105-AN, 이 PR 포함):
```ts
// 이전 (NumericKeypad):
const pin = digits.join('');  // state 계산 → stale 가능
onSubmit();  // onComplete 에서 호출

// 이후 (DigitsInput):
onComplete={(pin) => onSubmit(pin)}  // pin 직접 전달 → state 비동기 경쟁 없음
const onSubmit = async (pin?: string) => {
  const pinToUse = pin ?? pinValue;  // 직접 전달값 우선
```

AN assertions 56/56 locally verified (칸 건너뜀 없음, 기존 계약 호환).

### E. UI / 번들 안전

| 항목 | 확인 | 결과 |
|------|------|------|
| UI 영어 | "Retry remaining refund", "Refund incomplete", "Already refunded", "Partially refunded" | ✅ |
| raw hex 없음 | `grep -oE '#[0-9a-fA-F]{3,6}'` → PR 참조(`#207`,`#214`) 뿐, CSS hex 0 | ✅ |
| D1 팔레트 | `bg-warning-soft`, `bg-surface`, `border-line`, `text-base` — Tailwind 토큰 사용 | ✅ |
| 결정 버튼 | `@/components/ui/Button` (공용 · ink 색 적용) | ✅ |
| `node:` import | `scripts/*.mjs` 에만 (`node:fs`, `node:path`, `node:child_process`) — RN 번들 미포함 | ✅ |

### F. 어설션 스크립트 실행 로그 (로컬 직접 실행)

```
$ node scripts/m3-1105-ao-assertions.mjs   # fixture에서 git show FETCH_HEAD 추출
  ✓ (1) status=200 ... (10개)
  ✓ (2) ... (3개)
  ✓ (3) ... (7개)
  ✓ (4) ... (4개)
  ✓ (5) ... (3개)
  ✓ (6) ... (2개)
  ✓ (7) ... (4개)
33/33 passed · 0 failed

$ node scripts/m3-1105-an-assertions.mjs   # DigitsInput 계약
  ✓ ... (56개)
✅ PASS · 56 passed · 0 failed
```

### G. Playwright 스크린샷 (`screenshots-m3-1105-ao/`)

```
$ git ls-tree FETCH_HEAD | grep screenshots-m3-1105-ao
(출력 없음)
```

기대 경로: `screenshots-m3-1105-ao/{01-order-detail-banner,02-retry-sheet,03-after-retry-success}.png` — 미커밋.
`scripts/m3-1105-ao-screenshots.mjs` 는 존재하나 실행 결과물 없음.

---

## 이연 순증감

- 소진: 0 (이 PR 에서 신규 소진 없음 · 계약 구현 소진은 storeport #214 측 완료)
- 신규 이연: 0 (PR 본문 선언 그대로)

---

## 착지 명령

```
cp /tmp/R0-1105-BN-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BN-report.md && git commit -m "r0: R0-1105-BN" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BN done "CHANGES — screenshots-m3-1105-ao/ 3장 미커밋 · pos-refund-retry-423.json fixture 미작성"
```
