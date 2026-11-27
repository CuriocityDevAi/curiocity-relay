storeport#479: CHANGES · 필수 1 · 권고 2 — `gh pr diff 479` · `gh run view 45968518199 --log-failed` · `git show HEAD:apps/customer-display/app/index.tsx` · `git show HEAD:apps/customer-display/src/types/order-snapshot.ts` · `git show HEAD:apps/customer-display/src/lib/snapshot-api.ts`

## CI
`customer-display·e2e` FAIL (heavy-mac). 나머지 check/markers-and-forbidden/changes-filter/route/unit 전부 GREEN.

## 필수 1 — snapshots.spec.ts:142 testID 미동기

PR이 `KeypadAfterScreen` 타이머 라벨 testID를 `timer-label` → `keypad-countdown-number`로 교체했으나 `e2e/snapshots.spec.ts:141`의 기존 테스트를 업데이트하지 않음.

```
Error: expect(locator).toContainText("30")
Locator: getByTestId('timer-label')   ← DOM에 없음
```

수정: `snapshots.spec.ts:141` `page.getByTestId("timer-label")` → `page.getByTestId("keypad-countdown-number")`. 숫자 패턴(`"30"`, `/\b1[0-2]s\b/`) 자체는 새 구조에서 성립.

## 권고 1 — receiptDurationMs live fallback 불일치

`DEFAULT_DISPLAY_CONFIG.receiptDurationMs = 5000`으로 변경했지만 `index.tsx:230`의 liveConfig fallback이 `?? 3`으로 남아있음.

```ts
receiptDurationMs: (liveConfig.timers?.receipt_display_sec ?? 3) * 1000,
```

liveConfig 수신 시 `?? 3`이 초기값 5000을 3000으로 덮어씀 → 서버가 `receipt_display_sec`를 명시하지 않으면 live에서도 3초. 의도가 5초 기본값이면 `?? 3` → `?? 5` 필요.

## 권고 2 — loyalty.earn_preview 는 결제 전 추정치

`resolveEarnedPoints` 최하위 fallback `loyalty.earn_preview`는 결제 전 미리보기. 서버가 paid 상태에서 `receipt.earned`를 항상 채워주면 무해하나, 미충족 시 "Get N points →"에 추정치가 표시됨. 서버 계약상 paid snapshot `receipt.earned` 필수 여부 확인 권장.

## REQ 체크리스트

| REQ | 판정 | 근거 |
|-----|------|------|
| 1 타이머 둘 | OK (아키텍처) | `firedRef` + `_sent` Set 이중 가드. #474는 서버 lifecycle 전이, CD skip call 아님. `firedRef` 단위 테스트 미확인(순수 함수 테스트만). |
| 2 N 출처 체인 | OK + 권고 | `receipt?.earned` / `customer_flow?.points_earned` / `points_to_earn` / `loyalty?.earn_preview` 모두 OrderSnapshot 타입 일치. earn_preview fallback 위험성 권고 2. |
| 3 타이머 번짐 | OK + 권고 | `keypadTimeoutSec` → KeypadAfterScreen 전용, QRIS/Ask again 무관. `receiptDurationMs` live fallback 불일치 → 권고 1. |
| 4 Order #display_id 잔존 | PASS | CartScreen ✓ QrisScreen ✓ KeypadScreen pos_order_num 우선 ✓ ReceiptScreen 머리 원래 없음 ✓ |
| 5 raw hex 없음 | PASS | STATUS_COLORS.statusWarn은 tokens.ts 명시 semantic named constant. CTA t.primary/t.primaryInk ✓ |
| 6 PR 코멘트 | 완료 | COMMENT 제출 (자기 PR → REQUEST_CHANGES 불가, COMMENT 사용) |
