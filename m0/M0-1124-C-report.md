판정: COMPLETE — PR #247 push (SHA 393a645) · 로컬 flow-tests 22/22 · playwright 18/18 · lint error 0 · CI 대기

## 적용된 수정 (fork PR #247)

### (1) tests/flows/m3-1105-bw.test.ts — "Stack import 없음" 어설션 갱신
- M1-1124-D 가 tender-cash 에 선언형 `Stack.Screen` headerRight 도입 → 기존 "Stack import 없음" 테스트와 충돌.
- 원래 의도(헤더 큰 제목 없음)를 보존해 `Stack.Screen` 블록 범위 안에서 `headerLargeTitle` 없음만 단언하도록 교체.
- Result: `tests/flows/m3-1105-bw.test.ts` 22/22 pass (전체 flow-tests 177 pass · 6 expected fail).

### (2) scripts/m1-1124-b-phone-status-playwright.mjs — 7건 fail 수정
- 근본 원인: `gotoCheckout()` 이 pre-seed localStorage 로 wizard UI 를 skip → Expo Router `Stack.Protected` 가 아직 가드 중인 상태에서 `page.goto('/checkout/:id')` 하면 deep-link 가 `/sell` 로 폴백. pushState 자체가 문제가 아니라 세션이 "실제로 깨어 있지 않은" 것이 원인 (R0-1124-I 분석과 일치).
- Fix: `loginAndReachProducts(page, port)` 로 실제 로그인+wizard UI 통과 후 `pushState+popstate` 로 SPA 전환 — m3-1105-d 와 동일 패턴. ID 를 `_harness.mjs` `DEFAULTS`(sc_01/sl_01/reg_01) 에 정합, DRAFT.items 에 dummy line 1건, success 분기 receipt fixture 에 `items/tenders/labels` 추가.
- Result: 로컬 실행 18/18 pass (6상태 + D5 + success 2건 + SRC 어설션 3건).

### (3) typing(입력 중) 색 — semantic `info` 토큰 신설
- 기존 `border-line bg-surface-muted`(거의 흰색) 는 waiting(회색) 과 구분 안 됨 → Kyu 11-24 11:03 승인안 "파랑 계열" 적용.
- D1 팔레트 가드로 `accent`(앰버) 는 로고 점 외 금지 → semantic `info` 신설:
  - `tailwind.config.js` + `constants/brand.ts`: `info` = `#1D4ED8`, `info-soft` = `#DBEAFE`.
  - `components/customer-display/CustomerPhoneStatus.tsx` typing 분기: `border-info bg-info-soft` + `text-info` + Dots `color="info"`.
- accent 가드(`scripts/m2-1105-n-accent-guard.mjs`) 재실행 PASS — info 토큰은 가드 패턴 범위 아님.
- done(초록 · success=ink) · busy(노랑 · warning) 유지.

## 로컬 검증

| suite | result | count |
|---|---|---|
| `vitest run tests/flows` | ✅ PASS | 177 / 177 (+6 expected fail) |
| `node scripts/m1-1124-b-phone-status-playwright.mjs` | ✅ PASS | 18 / 18 |
| `node scripts/m2-1105-n-accent-guard.mjs` | ✅ PASS | 0 violations |
| `eslint` on 5 changed files | ✅ 0 errors | (pre-existing warnings only) |

## 커밋

- `393a645` `fix(cd-phone-status): M0-1124-C — PR #247 CI 초록화 (flow-tests · playwright · typing 색)`
  - `components/customer-display/CustomerPhoneStatus.tsx` · typing 분기 color + Dots color 확장
  - `constants/brand.ts` · `TOKEN_INFO` / `TOKEN_INFO_SOFT` 신설
  - `scripts/m1-1124-b-phone-status-playwright.mjs` · loginAndReachProducts + ID 정합 + receipt fixture 확장
  - `tailwind.config.js` · `info` / `info-soft` 신설
  - `tests/flows/m3-1105-bw.test.ts` · Stack.Screen 공존 어설션

## PR 본문

- #247 본문 "M0-1124-C 추가분" 라인 + Test plan 에 flow-tests · playwright 로컬 체크마크 반영.
- Kyu 실기(iPad + 손님 화면) 체크 유지 · typing 항목에 "파랑 계열(info)로 대기(waiting 회색)와 즉시 구분" 문구 추가.

## 미결

- #247 CI 재실행 결과 (push 393a645 직후 트리거) — flow-tests · playwright 통과 확인은 CI 러너 완료 대기.
