PR #368 · 전환 3/3 · mock 제거·업데이트 IT pos-void-route 7/7 PASS · build O

PR URL: https://github.com/CuriocityDevAi/storeport/pull/368

## 전환 결과

| 파일 | 모듈 | 결과 |
|------|------|------|
| `api/admin/pos/orders/[id]/void/route.ts` | `lib/loyalty/preview-recover` (previewRecoverForOrder · validatePreviewRef) | ✅ 완료 |
| `api/admin/pos/orders/[id]/return/route.ts` | `lib/loyalty/recover` (recoverForOrder) | ✅ 완료 |
| `workflows/pos-refund/steps/recover-loyalty.ts` | `lib/loyalty/recover` (recoverForOrder) | ✅ 완료 |

## Mock 변경

- `src/workflows/pos-void/__tests__/pos-void-route.unit.spec.ts`
  - `jest.mock("../../../lib/loyalty/preview-recover.js", …, { virtual: true })` →
    `jest.mock("../../../lib/loyalty/preview-recover", …)` (virtual 제거)

## 테스트 결과

| 파일 | 결과 |
|------|------|
| pos-void-route.unit.spec.ts | 7/7 PASS |
| pos-void-net.unit.spec.ts | 12/12 PASS |
| pos-refund-workflow.unit.spec.ts | 13/13 PASS |
| pos-void-workflow.unit.spec.ts | 9/9 PASS |
| pos-return (response-shape + wing) | 12/12 PASS |
| 전체 unit suite | 528/528 PASS (45 suites) |

## 빌드

tsc --noEmit → exit 0

## 스킵된 파일

없음 (3/3 전환). lib/loyalty 파일은 framework 패키지만 import — 순환 의존성 없음.
