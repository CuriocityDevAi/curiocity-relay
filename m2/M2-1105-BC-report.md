# M2-1105-BC Report

## PR

| 레포 | PR |
|---|---|
| fork (pos-m2) | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/120 |
| storeport | https://github.com/CuriocityDevAi/storeport/pull/237 |

## CI

PR 생성 후 CI run 대기 중 (integration tests DB 필요 · CI-only).

fork PR #120: vitest 14 passed, 2 todo (component nav tests).
storeport PR #237: pre-push unit 107 passed; integration 3 tests DB 필요.

## 발견 버그

없음. 단, navigation TODO 2건 기록:

- `app/checkout/success/[orderId].tsx:117` — `Stack.Screen options` 에 `headerBackVisible: false` 미설정.
  - 재현: checkout → success 화면에서 뒤로가기 버튼이 노출될 수 있음 (checkout이 router.push로 진입 시).
  - 해당 테스트: `__tests__/void-refund-nav-bc.test.ts` 내 `.todo` 2건.
