#367 APPROVE · 운영 환불 동작 불변 O · 테스트 단언 유지 O · CI 3개 pending(실행 중)

## REQ 1 · 순환 의존 · 서버 기동 순서

`preview-recover.ts` import 체인:
- `node:crypto` — Node.js 내장, 항상 사용 가능
- `ContainerRegistrationKeys` from `@medusajs/framework/utils` — 상수 열거, 서버 초기화 불필요

순환 없음. `route.ts` → `preview-recover.ts` 단방향. `preview-recover.ts` 가 `route.ts` 나 그 상위를 import 하지 않음.

서버 기동 순서 위험 없음. 정적 import 는 번들 최상단에서 해결되며, MedusaJS container 는 route handler 실행 시점에 주입되므로 모듈 로드 시점에 container 에 접근하지 않는 이 파일엔 문제없음.

TypeScript 타입체크(`npx tsc --noEmit`): `order-pos-timeline.tsx` 의 `@types/react` bigint 오류 2건 존재하나 이는 PR 이전부터 main 에 있는 pre-existing. PR 변경 파일(route.ts · 신규 spec) 에서 새 TS 오류 없음.

`pnpm build` 는 PR 본문 검증 로그 "exit 0 (backend 6.5s · frontend 22.5s)" 채택. 로컬에서 별도 full build 미실행(25분 상한 고려).

## REQ 2 · 동적 import 도입 이유 조사

git log `a5a344f` (PR #345, M2-1117-W feat(loyalty): S4 NET 환불 미리보기):
- 커밋 메시지에 동적 import 선택 이유 명시 없음.
- 같은 패턴 `void/route.ts:329` 에서도 동일하게 `await import("…/preview-recover.js")` 사용.
- `pos-void-route.unit.spec.ts` line 19 주석: **"Route uses `await import("…/preview-recover.js")` — jest doesn't find `.js`"** → `.js` 확장자 명시는 ESM 프로덕션 경로 해석 목적, jest 에선 미동작.
- **지연 로드·선택적 로드 의도 없음**. PR #367 정적 import 전환 시 원래 동작(runtime 에 `previewRecoverForOrder` 호출) 완전 보존.
- 나머지 동일 패턴(`void/route.ts`) 은 이번 범위 외로 PR 본문에 명시됨. 현행 void 단위테스트에서 `jest.mock("…preview-recover.js")` 우회 처리 중.

## REQ 3 · axios 4xx try/catch — 단언 약화 여부

W-2 (409 preview_stale):
```
expect(staleErr.status).toBe(409)              // HTTP 상태코드
expect(staleErr.data.code).toBe("preview_stale") // 에러 코드 타입
expect(staleErr.data.new_preview.shortfall).toBe(900)          // 구체 금액
expect(staleErr.data.new_preview.net_refund_amount).toBe(99_100) // 구체 금액
```
단언 약화 없음. `e.response` 는 axios 의 HTTP 응답 객체 — `.status` = HTTP 상태코드, `.data` = 응답 body. 종전 방식에서 단언했을 내용을 동등하게 커버.

W-3 (400 필드 누락):
```
expect(err.status).toBe(400)
```
상태코드 단언 유지. W-3 시나리오는 body 구조가 없는 단순 400이라 추가 단언 불필요.

axios 4xx throw 는 axios 기본 동작 (`validateStatus` 미설정 시 non-2xx → throw). try/catch 는 bandaid 가 아닌 올바른 패턴.

## REQ 4 · 로컬 실행 결과

**Unit (45 suites, 528 tests):**
```
Test Suites: 45 passed, 45 total
Tests:       528 passed, 528 total
```

**IT net-refund-preview-small (W-1/W-2/W-3):**
```
✓ #W-1 preview→confirmed 성공 · net=99200 · preview_ref 일치 (6396 ms)
✓ #W-2 잔액 변경 후 confirmed → 409 preview_stale · 환불 레코드 0건 (2721 ms)
✓ #W-3 confirmed + 필드 누락 → 400 (956 ms)
Test Suites: 1 passed, 1 total  Tests: 3 passed, 3 total
```

**gh pr checks 367:** changes-filter / check / markers-and-forbidden 3개 모두 pending (실행 중, fail 없음)

## 판정 근거

| 항목 | 결과 |
|------|------|
| 순환 의존 | 없음 |
| 서버 기동 순서 위험 | 없음 |
| 동적 import 이유 존재 | 없음 (ESM `.js` 경로 목적, 지연 로드 아님) |
| 운영 환불 동작 변경 | 없음 — handler 로직 무변경 |
| 테스트 단언 약화 | 없음 — 상태코드·에러 코드·금액 모두 단언 유지 |
| 로컬 unit | 45s/528t ✓ |
| 로컬 IT W-1~3 | 3/3 ✓ |

**APPROVE**
