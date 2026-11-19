fork #195 · skip 신호=snapshot_state='expired' (customer-display KEYPAD_SKIP 은 로컬 전이만 — 서버 PATCH 없음) · skipped 전이 O · unit 8/8 · checks 전 상태 assertions/lint FAIL · flow-tests PASS · playwright SKIP (push 전 상태 그대로)

# M0-1119-A — fork #195 "Skipped" 표시 연결

## REQ 1 · Skip 신호 조사

**결론: 서버 스냅샷에 Skip 전용 필드/상태 변화는 없다.**

customer-display `app/index.tsx` 가 `onSkip`/`onTimeout` 에서 호출하는 `dispatch({ type: 'KEYPAD_SKIP' })` 는 `display-machine.ts` 의 **로컬 useReducer** 전이만 한다 (`keypad-after + paid` → `receipt` 또는 `done`; `keypad + !paid` → `cart`/`main`). 서버로 PATCH 가 나가지 않는다 (`/customer-display/snapshots/:id` PATCH 는 `typing` · `phone` · `pre_entry` 세 필드만 수용 · 서버 코드 확인).

따라서 POS 폴링으로 얻을 수 있는 유일한 파생 신호 = **`snapshot_state === 'expired'`**:
- 서버 lifecycle 규칙 (`lifecycle.ts`): `paid` → `expired` 전이는 `link_open_until <= now` 또는 "Next customer" 수동 액션. 통상 10분 윈도우.
- 60s POS 타이머와 혼동 없음: **timeout** = waiting 유지 중 아무 전이도 없는 경우. **skipped** = waiting 중 서버가 expired 로 돌린 경우.

## REQ 2 · setAskPhoneStatus('skipped') 호출 연결

변경 3개:

1. `lib/ask-phone-on-display.ts` · 순수 함수 `shouldTransitionToSkipped({ snapshot, askPhoneStatus })` 추가 (타입 `AskPhoneStatus` 공유). waiting 중 + snapshot_state=expired 일 때만 true.

2. `app/checkout/success/[orderId].tsx` · useEffect 추가. `shouldTransitionToSkipped` true 면 `setAskPhoneStatus('skipped')` + 60s 타이머 clear + `setPosScreenHint(null)`. 손님 화면은 로컬에서 이미 'main' 이므로 `pos_screen` revert 미발사 (linked 경로와 같은 패턴).

3. `__tests__/ask-phone-on-display.test.ts` · 기존 7개 유지 + skip 전이 1개 (4 assertion: waiting+expired=true · idle+expired=false · waiting+paid=false · snapshot=null=false).

## REQ 3 · 검증

- `npx vitest run __tests__/ask-phone-on-display.test.ts` → **8/8 PASS** (기존 7 + 신규 1).
- `npx vitest run` (전체) → **734 passed · 6 expected fail · 3 todo**. 신규 fail 0.
- `npx tsc --noEmit 2>&1 | grep -E "ask-phone|checkout/success"` → **0 신규 에러**. 리포 기존 16 에러(별건: split-pending-orders · cart FlashListRef · toast ToastData · network-status implicit-any · vitest.config 중복키) 유지.

## 변경 범위

```
 __tests__/ask-phone-on-display.test.ts | 32 +++++++++++++++++++++++++++++++-
 app/checkout/success/[orderId].tsx     | 14 +++++++++++++-
 lib/ask-phone-on-display.ts            | 16 ++++++++++++++++
 3 files changed, 60 insertions(+), 2 deletions(-)
```

금지 범위 준수: 서버 (`apps/commerce-core`) · customer-display (`apps/customer-display`) · POS 다른 파일(payment-dialog · useOrderProcessing · printer · config/medusa) — 모두 손대지 않음.

## PR #195 체크 (현재 상태 · push 전)

```
$ gh pr checks 195 -R CuriocityDevAi/agilo-medusa-pos-fork
assertions   fail       3m1s   https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44347489462/job/134953733528
lint         fail       1m12s  https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44347489501/job/134953731868
playwright   skipping   0      https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44347489462/job/134955856901
flow-tests   pass       1m29s  https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44347489462/job/134953732349
```

assertions/lint FAIL 은 M0-1119-A 작업 대상 외 (리포 기존 상태 · m3-1105-* assertions · lint 규칙 위반 선행 이슈). Skip 전이 추가가 이를 더 나빠지게 하지 않음은 vitest 전체 PASS + 신규 tsc 에러 0 으로 확인.

## 착지 상태

- 커밋 X · push X · 머지 X (task 지시 그대로).
- working tree 에 3-file diff 유지.
- 리포트 1개만 relay 로 착지.

## 작업 폴더

`~/curiocity-live/pos-m0` (브랜치 `feat/M0-1118-N-ask-phone-a` · origin/master 와 up-to-date).
