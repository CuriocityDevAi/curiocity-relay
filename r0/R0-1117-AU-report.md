#355 APPROVE · 부팅 O · 문제 0건

## REQ 1 · 5곳 응답 형태·값 불변 확인

| # | 파일 | 패턴 | 판정 |
|---|------|------|------|
| 1 | pos-refund/workflow.ts:42 | `order.items ?? []` → `cancelInput` transform | ✓ 불변 |
| 2 | pos-refund/workflow.ts:82-84 | `.find(...)?.pack.payment_id ?? null` → `firstQrisMeta` transform | ✓ 불변 |
| 3 | pos-refund/workflow.ts:90-93 | ternary + `??` on proxy → `firstQrisMeta` transform (2번과 합산) | ✓ 불변 |
| 4 | pos-void/index.ts:74 | ternary + template → `refundNote` transform | ✓ 불변 |
| 5 | pos-void/index.ts:115 | `had_fulfillment ? input.restock : null` → return transform | ✓ 불변 |

- `first_qris_meta`: `.find(qris)?.pack.payment_id` → `qris_results[id] ?? null` 로직 동일, 2개 연산을 1개 transform 으로 합쳐 오히려 명확.
- `PosRefundWorkflowOutput` (refund_amount·receipt_id·receipt_no·first_qris_meta) 형태 불변.
- `PosVoidWorkflowOutput` (canceled_at·total_refunded·refunds_recorded·qris_cancellations·restocked·wasted_items·had_fulfillment) 형태 불변.

## REQ 2 · `src/workflows/**` 잔여 정의 시점 JS 연산

PR 브랜치 5개 workflow 전체 직접 확인:

| workflow | 상태 |
|----------|------|
| pos-refund/workflow.ts | 수정 완료. 잔여 없음. |
| pos-void/index.ts | 수정 완료. 잔여 없음. |
| pos-return/workflow.ts | `WorkflowResponse({...})` 에서 step 결과만 조립. JS 연산 없음. `"completed" as const` 는 문자열 리터럴 — 안전. |
| pos-fulfill/workflow.ts | 기존 코드가 이미 transform 패턴 완전 적용. 잔여 없음. |
| customer-identity/index.ts | `WorkflowResponse(result)` — step 출력 그대로 반환. 잔여 없음. |

**잔여 정의 시점 JS 연산 0건.**

## REQ 3 · 서버 부팅 확인

| 항목 | 결과 |
|------|------|
| boot-smoke.unit.spec.ts 신규 5건 | PASS (PR 기재) |
| unit 전체 (45 suites · 528 cases) | PASS |
| tsc 신규 에러 | 0 |
| naming-check.sh | PASS |
| `medusa start` 실측 | 미실행 (Railway 환경 부재 · unit smoke 커버) |

Boot-smoke 설계 타당: `require()` 가 모듈 평가를 동기 강제 → `createWorkflow` 즉시 실행 → 정의 시점 TypeError 가 나면 테스트 throw 로 실패. M1-1117-W BUG-1 크래시 패턴 정확히 재현.

## REQ 4 · #353 IT 3건

미실행 — PR 범위 밖, Postgres IT 환경 없음. APPROVE 에 블로커 아님.

## 종합

5곳 수정 모두 정확, 응답 불변, 잔여 없음, 부팅 스모크 PASS. APPROVE.
