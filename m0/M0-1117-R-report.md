PR #355 · boot fix · 같은 패턴 5곳 · 서버 부팅 확인 O (unit smoke)

# M0-1117-R — posRefundWorkflow 정의 시점 input.matched.find 서버 부팅 실패 수정

- 브랜치: `fix/M0-1117-R-refund-wf-boot`
- PR: https://github.com/CuriocityDevAi/storeport/pull/355
- HEAD SHA: 4eda384
- 베이스: origin/main @ 7c28f93

## 1 · 원인 (BUG-1 재현)

`apps/commerce-core/src/workflows/pos-refund/workflow.ts:83` 의
`input.matched.find((m) => m.tender.method === "qris")?.pack.payment_id ?? null`
은 `createWorkflow` 본문이라 **정의 시점**에 JS 가 proxy 객체에
`.find()` 를 호출하려 함 → `TypeError: input.matched.find is not a function`
→ Medusa bootstrap 실패. `input` 은 workflow SDK 가 넘기는 proxy 이고
`.find` 는 proxy 에 존재하지 않는 멤버 (호출 시 함수 아님 에러).

M1-1117-W IT 3건이 서버를 켜다 이 지점에서 fail 하면서 발견.

## 2 · 전수 그렙 (createWorkflow 본문의 proxy JS 연산)

| 파일 | 줄 | 패턴 | 유형 | 수정 |
|------|------|------|------|------|
| pos-refund/workflow.ts | 42 | `input.order.items ?? []` | `??` on proxy | `transform({ input }) => ({ order_items: data.input.order?.items ?? [] })` |
| pos-refund/workflow.ts | 82-84 | `input.matched.find(...)?.pack.payment_id ?? null` | **배열 메서드 호출 → CRASH** | `transform({ input }) => matched.find(...)?.pack.payment_id ?? null` |
| pos-refund/workflow.ts | 90-93 | `firstQrisPaymentId !== null ? (input.qris_results[id] ?? null) : null` | ternary + `??` + 동적 index | 같은 transform 안으로 합병 |
| pos-void/index.ts | 74 | `input.reason ? \`void:${input.reason}\` : "void"` | ternary + 템플릿 interpolation on proxy | `transform({ input }) => data.input.reason ? \`void:${...}\` : "void"` |
| pos-void/index.ts | 115 | `had_fulfillment ? input.restock : null` | ternary on 2 proxies | WorkflowResponse 를 `transform(...)` 으로 감싸 안쪽 평가 |

### 확인 그렙 (clean)

```
grep -rn "input\." apps/commerce-core/src/workflows/*.ts apps/commerce-core/src/workflows/*/workflow.ts apps/commerce-core/src/workflows/*/index.ts
```
→ 수정 후 모든 `input.*` 접근은 **단순 속성 전달** (step 호출 인자) 또는 **transform() 본문 안** 이거나 **destructure 결과 proxy 의 다른 step 호출 인자** 로만 사용. 정의 시점 JS 연산 0.

### pos-fulfill / pos-return / customer-identity

- `pos-fulfill/workflow.ts` = 이미 모든 연산이 `transform` 안. clean.
- `pos-return/workflow.ts` = 속성 전달만. clean.
- `customer-identity/index.ts` = 속성 전달만. clean.

## 3 · 부팅 스모크 (신규)

`apps/commerce-core/src/workflows/__tests__/boot-smoke.unit.spec.ts`

5 workflow 모듈을 `require()` 하고 `posXxxWorkflow` 심볼이 함수인지 확인.
`createWorkflow` 가 파일 평가 시 바로 실행되므로, **import 성공 =
정의 시점 proxy JS 평가 통과 = 서버 boot 시 TypeError 없음**.

```
PASS src/workflows/__tests__/boot-smoke.unit.spec.ts
  workflow definition-time boot smoke (M0-1117-R)
    ✓ pos-refund workflow module defines without throwing
    ✓ pos-void workflow module defines without throwing
    ✓ pos-return workflow module defines without throwing
    ✓ pos-fulfill workflow module defines without throwing
    ✓ customer-identity workflow module defines without throwing

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

## 4 · 전체 검증

| 게이트 | 결과 |
|--------|------|
| `pnpm test` (commerce-core unit) | **45 suites · 528 passed** |
| `pnpm typecheck` | touched 파일 자체 신규 에러 0 (기존 admin widget React 19 JSX 에러는 범위 밖) |
| `bash scripts/naming-check.sh` | PASS |
| 부팅 스모크 5건 | PASS |

M1 #353 IT 3건은 Postgres 실측 환경이 필요해 이 브랜치에서 직접 실행 미수행.
Kyu 가 CI 또는 M1-1117-W 라운드에서 이 브랜치 머지 후 재실행 권장.

## 5 · 커밋

```
4eda384 fix(workflows): M0-1117-R — posRefundWorkflow 정의 시점 input.matched.find 서버 부팅 실패 수정 + proxy 연산 전수 정리
```

processes: [pos-void-refund]

feature-map.yaml 의 `pos-void-refund` 엔트리에
`apps/commerce-core/src/workflows/__tests__/**` 추가 (신규 boot smoke 커버리지).
