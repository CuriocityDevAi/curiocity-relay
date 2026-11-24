#27 CHANGES · #254 CHANGES

# R0-1124-AL · PR #27 + #254 리뷰 · 2026-11-24

리뷰어: R0-1124-AL · Sonnet 4.6  
워크트리: `~/projects/curiocity-relay-wts/R0-1124-AL` (405ae292b)

---

## #27 — relay PR `fix/M1-1124-N-runner-main-guard` · CHANGES

### REQ 확인: R0-1124-AI CHANGES 해소 여부

**해소 확인** ✓ — M1-1124-Q 커밋(405ae292b)이 `origin/fix/M1-1124-N-runner-main-guard` 에 포함됨.

`performRescue` 의 3개 보존 단계에 `abortRescue` 가드 삽입:
- rescue 브랜치 생성 실패 → `abortRescue('rescue-branch failed: ...')` → 조기 반환
- `copyFileSync` 실패 → `copyError` 플래그 → `abortRescue('copy failed · ...')` → 조기 반환
- manifest 기록 실패 → `abortRescue('manifest write failed: ...')` → 조기 반환

`assertMainAtTickStart`: `res.aborted` 시 `{ ok: false, aborted: true, reason, diag, rescue: res }` 반환 (기존 `detectViolation(after)` skip).

### Selftest 직접 실행 결과 (R0-1124-AL 워크트리)

```
D (rescue branch 실패 주입):
  OK · rescued=false · aborted=true · ok=false
  OK · HEAD 미변경 · fix/FAKE-D-branch-fail
  OK · untracked 파일 유지
  OK · events/ aborted 기록
[selftest-main-guard-D] OK

E (copy 실패 주입):
  OK · rescued=false · aborted=true · ok=false
  OK · HEAD 미변경 · fix/FAKE-E-copy-fail
  OK · untracked 파일 유지 (clean 차단됨)
  OK · events/ aborted 기록
[selftest-main-guard-E] OK
```

A/B/C/safe-push/hub-preamble/sleep-tracker: 전부 PASS (기존과 동일)

Preflight: `node --check → 0` · `stale-lock → 0` · `merge-fail3 → 0` · `report-path-off → 0` → PASS

### 신규 CHANGES 발견 3건

#### CHANGES-1: D/E CLI 하네스 미추가 (hub-runner-v8.2.mjs)

`scripts/hub-runner-v8.2.mjs` 에 `--selftest-main-guard-d` / `--selftest-main-guard-e` 플래그 미추가.

```js
// 현재 (line 364-369):
const SELFTEST_MAIN_GUARD_A = argv.includes('--selftest-main-guard-a');
const SELFTEST_MAIN_GUARD_B = argv.includes('--selftest-main-guard-b');
const SELFTEST_MAIN_GUARD_C = argv.includes('--selftest-main-guard-c');
// D, E 없음!
```

결과:
- `node scripts/hub-runner-v8.2.mjs --selftest-main-guard-d` → `Usage: ...` exit 2
- D/E 테스트를 직접 `node --input-type=module` 로 모듈 import 로만 실행 가능
- Preflight 체인에도 미포함 (selfupdate-preflight 는 stale-lock/merge-fail3/report-path-off 만 실행)

수정 위치:
- `scripts/hub-runner-v8.2.mjs` line ~364: `SELFTEST_MAIN_GUARD_D/E` 상수 추가
- line ~418: `!SELFTEST_MAIN_GUARD_D && !SELFTEST_MAIN_GUARD_E &&` 추가
- line ~5721: `else if (... || SELFTEST_MAIN_GUARD_D || SELFTEST_MAIN_GUARD_E)` 추가 + dispatch 분기
- preflight 에 D/E 추가 권장

#### CHANGES-2: aborted 케이스 로그 TypeError

`scripts/hub-runner-v8.2.mjs` line ~3220 `else if (g.rescue)` 분기:

```js
} else if (g.rescue) {
  log('main-guard', `복구 성공 · tag=${g.rescue.tag} · reapplied=${g.rescue.reapplied} · preserved=${g.rescue.preserved.length}`);
  //                                                                                                                 ^^^^^^ aborted 케이스 없음!
}
```

`aborted=true` 시 `g.rescue = { rescued: false, aborted: true, reason }` — `preserved` 없음 → `undefined.length` → TypeError.
try/catch 에 흡수되어 `[hub-runner-v8.2:main-guard] 예외: Cannot read properties of undefined (reading 'length')` 출력.
"복구 성공" 이 아닌 "예외" 로 오출력.

수정 예시:
```js
if (g.rescue?.aborted) {
  log('main-guard', `보존 실패로 복구 보류 · reason=${g.rescue.reason}`);
} else if (g.rescue?.rescued) {
  log('main-guard', `복구 성공 · tag=${g.rescue.tag} · reapplied=${g.rescue.reapplied} · preserved=${g.rescue.preserved.length}`);
}
```

#### CHANGES-3: aborted 상태 허브 픽업 미중단

`assertMainAtTickStart` 가 `{ ok: false, aborted: true }` 반환해도 runner 루프에 `continue`/`return` 없이 그냥 진행:

```js
// hub-runner-v8.2.mjs line ~3212-3225
const g = mainGuardAssert({ ... });
if (!g.ok && g.after) {
  log(...)
} else if (g.rescue) {
  // ... (TypeError 발생)
}
// ← continue/return 없음 → loop() 계속 → 허브 픽업 진행
```

aborted 상태 = 보존 실패 = HEAD/브랜치가 아직 violated state (fix/*, rebase-merge 등) → 이 상태에서 새 클레임을 집어 처리하면 추가 손상 가능.

수정 예시:
```js
if (!g.ok) {
  if (g.aborted) {
    log('main-guard', `보존 실패 중단 · 허브 픽업 스킵 · reason=${g.reason}`);
    continue;  // tick 스킵, 다음 tick 에서 재시도
  }
  if (g.after) {
    log('main-guard', `복구 후에도 위반 남음 · head=${g.after.headRef}`);
  }
} else if (g.rescue?.rescued) {
  log('main-guard', `복구 성공 · ...`);
}
```

---

## #254 — fork PR `feat/M3-1124-O-checkout-b` · CHANGES

### 나눠결제·배달·선주문·QRIS 회귀 없음 확인

M2-1124-U S3 코드 리뷰 + 소스 확인:
- **나눠결제**: "Pay in parts" 링크 `testID="checkout-pay-in-parts"` 보존 · 기존 split-tender 흐름 유지
- **배달**: method route param 으로 `tender-cash` 에 method 전달 (B1 기술) — delivery 흐름 무변경
- **선주문**: preorder pickup 미선택 시 3버튼 + Pay in parts 모두 disabled (기존 가드 유지)
- **QRIS**: `testID="checkout-pay-qris"` + `tender-qris.tsx:314` QRIS payment 제목 확인

### 제목 3종 확인 ✓

`app/checkout/tender-cash/[draftOrderId].tsx`: "Cash payment", "Card payment", "QRIS payment"  
`app/checkout/tender-qris/[draftOrderId].tsx`: "QRIS payment" (Stack 제목)

### X 44pt ✓

`components/cart/CartSheet.tsx`: TouchableOpacity → `Pressable` + `h-11 w-11 items-center justify-center rounded-full` + `active:bg-surface-muted` + `accessibilityLabel="Close cart"` / `accessibilityRole="button"`  
44dp = `h-11` = 11 × 4px = 44pt ✓

### 시맨틱 토큰 ✓

- 버튼 아이콘: `TOKEN_ON_INK` (`@/constants/brand` 시맨틱 토큰)
- X 버튼 눌림 피드백: `active:bg-surface-muted`
- 텍스트: `text-ink-muted`, `text-ink-subtle`, `text-ink-disabled`

### vitest 3 · playwright 4 master 동일 여부

**vitest 3**: M2-1124-U 가 master `f29fc29` 에서 동일 3건 재현 확인 (M2-1119-S + M3-1119-O pre-existing). PR #254 regression 아님. ✓

**playwright 4**: 현재 CI playwright는 assertions 실패로 ⏭ SKIP. master CI playwright는 31 harnesses 전부 PASS (0 fail). 신규 `M3-1124-O-checkout-b.spec.ts` 의 4개 브라우저 테스트는 master에 spec 자체 없음. → 아래 CHANGES-B 참조.

### CI 전 잡 현황

ci-summary 코멘트 (`e89b979` · 2026-11-24 15:53 UTC):

| 잡 | 결과 |
|---|---|
| CI / route | ✅ |
| CI / flow-tests | ✅ |
| CI / assertions | ❌ 1m 19s |
| CI / heavy-cloud | ⏭ |
| CI / playwright | ⏭ (assertions 실패 → 의존성 스킵) |
| Lint / route | ✅ |
| Lint / lint | ✅ |

### CHANGES 발견 2건

#### CHANGES-A: m3-1105-d-assertions.mjs 미업데이트 (CI assertions FAIL)

PR이 `app/checkout/[draftOrderId].tsx` 의 단일 Pay 버튼(`testID="checkout-pay"`)을 Cash/Card/QRIS 3버튼으로 교체했으나 `scripts/m3-1105-d-assertions.mjs` 는 업데이트하지 않음.

```js
// m3-1105-d-assertions.mjs line 121
check('Pay 버튼 (testID="checkout-pay")', /testID="checkout-pay"/.test(checkout));
// master: checkout page line 373 에 testID="checkout-pay" 존재 → PASS
// PR #254: 3버튼 testID="checkout-pay-{cash,card,qris}" → "checkout-pay" 뒤에 "-" 아닌 `"` 없음 → FAIL
```

수정: `m3-1105-d-assertions.mjs` 를 새 3버튼 디자인에 맞게 업데이트.

```js
// 예시 수정
check('Cash 버튼 (testID="checkout-pay-cash")', /testID="checkout-pay-cash"/.test(checkout));
check('Card 버튼 (testID="checkout-pay-card")', /testID="checkout-pay-card"/.test(checkout));
check('QRIS 버튼 (testID="checkout-pay-qris")', /testID="checkout-pay-qris"/.test(checkout));
check('Pay in parts 링크 (testID="checkout-pay-in-parts")', /testID="checkout-pay-in-parts"/.test(checkout));
```

#### CHANGES-B: M3-1124-O playwright CI 하네스 미추가

신규 `e2e/flows/M3-1124-O-checkout-b.spec.ts` (5개 테스트: 3버튼·Cash 제목·Card 제목·QRIS 제목·X 44pt source 가드) 에 대응하는 CI playwright 하네스 `.mjs` 가 없음.

현재 CI playwright 는 `scripts/run-all.mjs playwright` → `scripts/m*.mjs` 하네스 파일만 실행. `.spec.ts` 는 직접 실행 안 됨.

master CI playwright 는 31 harnesses 전부 PASS → `.spec.ts` 는 master CI 에서도 실행 안 됨.

결과: assertions 가 수정되어 playwright 잡이 돌아도 M3-1124-O 테스트 4개가 CI에서 실행 안 됨.

수정: `scripts/m3-1124-o-checkout-b-playwright.mjs` 하네스 추가 (기존 `.mjs` 패턴 참조).

---

## 수정 필요 항목 요약

| PR | # | 파일 | 내용 |
|---|---|---|---|
| #27 | 1 | `scripts/hub-runner-v8.2.mjs` | `--selftest-main-guard-d/e` 플래그 추가 + dispatch 분기 추가 |
| #27 | 2 | `scripts/hub-runner-v8.2.mjs` line ~3220 | `g.rescue.aborted` 분기 추가 (preserved.length TypeError 방지) |
| #27 | 3 | `scripts/hub-runner-v8.2.mjs` line ~3218 | `!g.ok && g.aborted` 시 `continue` 추가 (허브 픽업 중단) |
| #254 | A | `scripts/m3-1105-d-assertions.mjs` | 3버튼 디자인 반영 (`checkout-pay-cash/card/qris`) |
| #254 | B | `scripts/m3-1124-o-checkout-b-playwright.mjs` | 신규 playwright 하네스 추가 |
