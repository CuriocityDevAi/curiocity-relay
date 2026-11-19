fork #195 push 0f8cb3c · unit 8/8 O

## 수행
- 워크트리: `~/curiocity-live/pos-m0` · 브랜치 `feat/M0-1118-N-ask-phone-a`
- 3-file diff 확인 (M0-1119-A 작업 트리 유지분):
  - `__tests__/ask-phone-on-display.test.ts`
  - `app/checkout/success/[orderId].tsx`
  - `lib/ask-phone-on-display.ts`
- `npx vitest run __tests__/ask-phone-on-display.test.ts` → **8 passed / 8**
- 커밋 `0f8cb3c fix(cd-ask-phone): M0-1119-A — 손님 화면 skip → POS Skipped 표시`
- push → `e9a016d..0f8cb3c  feat/M0-1118-N-ask-phone-a` (origin = CuriocityDevAi/agilo-medusa-pos-fork)
- PR #195 본문 끝에 `M0-1119-A: skip 신호 = snapshot_state 'expired'` 1줄 추가 완료

## 금지 준수
- `~/projects/*` 미접근 (storeport CWD 는 커밋/수정 없음, 작업은 전부 `~/curiocity-live/pos-m0`).
- 머지 미실행.

## 링크
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/195
