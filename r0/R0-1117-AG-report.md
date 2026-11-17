#341 APPROVE · 문제 0건

## REQ 1 · tsc 신규 0 · `as unknown as` 없음

- PR 수정 파일 (void/route.ts · pos-void/index.ts · pos-void/steps.ts · _shared/payment-utils.ts) tsc 에러 = **0개**
- 전체 245개 에러는 모두 pre-existing (admin widgets JSX @types/react 버전 미스매치 — PR 이전부터 존재, 이 PR 과 무관)
- `as unknown as` 우회: 해당 없음 (grep 결과 없음)
- `voidResult` → `let voidResult: PosVoidWorkflowOutput` 명시 타입 (route.ts L277) ✓

## REQ 2 · 공용 step 입력·보상 동일성 · 테스트 통과

### 공용 단계: `_shared/payment-utils.ts` (`toNum` · `providerToMethod`)

| 항목 | pos-void | pos-return |
|------|----------|------------|
| 진입로 | `pos-void/steps.ts` re-export | `pos-return/utils.ts` re-export |
| `toNum` 용도 | capture/refund/amount 수치 변환 | 동일 — capture/refund/amount 수치 변환 |
| `providerToMethod` 용도 | provider_id → method 문자열 | 동일 — provider_id → method 문자열 |
| compensation | 순수 유틸 함수 (보상 불필요) | 동일 |

void-only step `adjustWastedInventoryStep` 보상(compensation): 재고 +qty 복귀 — return workflow 는 해당 step 미사용 (별도 `restoreInventoryStep`), 공유 범위 외.

### 테스트 결과

```
Test Suites: 35 passed, 35 total
Tests:       439 passed, 439 total  (기존 421 + void 11 + 기타 7)
Snapshots:   16 passed, 16 total
Time:        11.862 s
```

- `PASS src/workflows/pos-void/__tests__/pos-void-workflow.unit.spec.ts` ✓
- `PASS src/workflows/pos-return/__tests__/response-shape.unit.spec.ts` ✓
- `PASS src/workflows/pos-return/__tests__/wing-online-channel.unit.spec.ts` ✓

## 검토 스레드

- thread `PRRT_kwDOTe-UYs64aZti`: `is_resolved: true` (commit 9240444 에서 수정 완료 확인)

## 결론

APPROVE — tsc 신규 0, as unknown as 없음, 439 테스트·16 스냅샷 전체 통과, 공용 유틸 의미 일치 확인.
