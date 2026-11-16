#297 필터 반영·CI ✅ / #289 rebase·로컬 통합 ✅·CI pos-integration ❌(기존 불량)·mergeState BLOCKED

## #297 · ci-savings — commerce_core 필터 수정

### 반영 내용

`.github/workflows/ci.yml` `changes-filter.commerce_core:` 에 추가 (commit `40768d6`):
```yaml
- 'apps/commerce-core/src/**'
- 'apps/commerce-core/integration-tests/**'
```

### 돈·적립 코드 변경 PR → pos-integration 실행 여부

| 변경 경로 | commerce_core filter | pos-integration |
|---|:---:|:---:|
| `src/lib/loyalty/**` | ✅ (추가됨) | ✅ |
| `src/modules/pos/**` | ✅ (추가됨) | ✅ |
| `src/api/admin/pos/**` | ✅ (추가됨) | ✅ |
| `src/subscribers/**` | ✅ (추가됨) | ✅ |
| `integration-tests/loyalty/**` | ✅ (추가됨) | ✅ |
| `integration-tests/pos/**` | ✅ (추가됨) | ✅ |
| `Dockerfile` / `package.json` | ✅ (기존) | ✅ |
| `apps/anchor/src/**` (anchor만) | ❌ | ❌ (정상) |

### CI 결과 (run 43787234855 · commit 40768d6)

| Job | 결과 |
|---|:---:|
| markers-and-forbidden | ✅ |
| changes-filter | ✅ |
| unit-commerce-core | ✅ |
| e2e-admin-loyalty | ✅ |
| customer-display | ✅ |
| pos-integration | ⏭ (ci.yml 자체 변경 → src 미변경으로 정상 skip) |

---

## #289 · loyalty-card-timeline — rebase·로컬 통합·CI

### rebase

`766405b` (M0-1116-A, 이미 `886442b`로 main 머지) → `--skip`. 나머지 2커밋 충돌 없이 완료.
새 HEAD: `a6c1164 test(loyalty): M2-1116-D`.

### 로컬 통합 테스트 (pnpm test:integration:loyalty)

| spec | 결과 | 주요 케이스 |
|---|:---:|---|
| `refund-recover.spec.ts` | ✅ 5/5 PASS | #1 전액 환불 · #2 비례 · #3 잔액 부족 · #4 멱등 · #5 source 구분 |
| `link-earn.spec.ts` | ✅ PASS | C1·C2 subscriber 경로 포함 |

### CI 결과 (run 43787930685 · commit a6c1164)

| Job | 결과 |
|---|:---:|
| markers-and-forbidden | ✅ |
| changes-filter | ✅ |
| unit-commerce-core | ✅ |
| e2e-admin-loyalty | ✅ |
| customer-display | ✅ |
| pos-integration | ❌ |

**pos-integration 실패 원인 (기존 불량 · 이 PR 미변경)**

| spec | 실패 케이스 | 원인 |
|---|---|---|
| `pos/orders-list.spec.ts` | #1 phone_masked=null · #2 phone 필터 빈 배열 · #6 loyalty_recover null | Order-Customer `query.graph` 조인 미동작 · `orders-list/route.ts` 는 이 PR 미변경 (da3acfa #288 로 main 편입) |
| `loyalty/customer-summary.spec.ts` | T3 visit_count=0 · T5 `cancelOrders is not a function` · T4 | 동일 조인 불량 + Medusa API 불일치 · 이 PR 미변경 (202997d #293 로 main 편입) |

두 spec 모두 main에 이미 존재하며 이 PR의 diff에 포함되지 않는다.  
PR #297의 필터 수정 이전에는 `integration-tests/**` 변경으로 CI가 실행된 적 없어 기존 불량이 미발견 상태였음.

**이 PR(loyalty refund-recover · link-earn)의 고유 테스트는 로컬에서 모두 통과.**

### 미해결 스레드

- `PRRT_kwDOTe-UYs63uod2` (refund-recover.spec.ts L62 빈 items 블로커) → M2-1116-D 에서 `createTestOrder` real line_item으로 수정 완료 → **resolved** ✅

### mergeState

`BLOCKED` (CI pos-integration 실패 · 기존 불량)
