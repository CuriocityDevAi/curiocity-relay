PR #367 · 방식 정적 · #353 3/3 O · build O

## 원인

`refund/route.ts:303` 의 `await import("…/preview-recover.js")` — Jest 는 `.ts` 원본만 인식,
`.js` 파일이 없으므로 "Cannot find module" → 모든 preview/confirmed 경로가 500.
운영(빌드 후 `.medusa/server`)에서는 `tsc` 가 `.js` → `.js` 로 출력하므로 정상 동작.

## 채택: 정적 import

`import { previewRecoverForOrder, validatePreviewRef } from "…/preview-recover"` 로 전환.
`preview-recover.ts` 는 `node:crypto` + `@medusajs/framework/utils` 만 의존 — 순환 없음.

## 검증

- unit: 45 suites · 528 tests ✓
- build: exit 0 (backend 6.5s · frontend 22.5s)
- IT W-1 ✓ W-2 ✓ W-3 ✓ (12.25s)

## 동반 수정

IT `net-refund-preview-small.spec.ts` W-2·W-3: axios 4xx throw → try/catch(e.response) 패턴으로 수정.

## 범위 외 — 같은 패턴 (추후 별도 수정)

- `void/route.ts:329` await import("…/preview-recover.js") — void route IT 는 jest.mock 우회 중
- `return/route.ts:470` await import("…/recover.js")
- `steps/recover-loyalty.ts:23` await import("…/recover.js") — non-fatal catch
