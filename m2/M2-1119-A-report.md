PR #385 · R-B3 fulfillment 공용 유틸 src/lib/ 승격 + ESLint error 모드 · 로직 0 O · 마이그레이션 0 O · warning 15→6건(ESLint error 모드 · SHARED 0건) · it 4종: checkout-handover-smoke O / customer-display-me O / pin-audit X(기존 실패 · main 동일) / fulfilled-order-after-sales(spec 없음→tenders 대체 O) · 섞임 0 O

## 변경 요약

- `src/lib/fulfillment-polyfill-items.ts` 신설 (정본 · R-B3)
- `src/lib/fulfillment-cancel.ts` 신설 (정본 · R-B3)
- `_shared/fulfillment-items.ts` → thin re-export
- `_shared/fulfillment-cancel.ts` → thin re-export
- `workflows/pos-fulfill/steps/execute-fulfillment.ts:20` → lib/ 경로
- `workflows/pos-void/steps.ts:7` → lib/ 경로
- `eslint.config.ts` no-restricted-imports warn → error 승격

## 검증 결과

| 항목 | 결과 |
|------|------|
| 로직 diff | 0 (이동·재수출만) |
| 마이그레이션 | 0 |
| TypeScript 에러 (commerce-core) | 0 |
| 단위 테스트 | 47 suite / 539 tests all pass |
| ESLint SHARED_FILES 위반 | 0 (error 모드 안전) |
| checkout-handover-smoke | PASS |
| customer-display-me | PASS |
| pin-audit | FAIL (기존 실패 · main 동일 · R-B3 무관) |
| fulfilled-order-after-sales | spec 없음 → tenders.spec.ts 대체 PASS (96 tests) |
| void-refund-restock | PASS |
| diff 섞임 | 0 (#383 #384 범위 외 미포함) |

## PR

https://github.com/CuriocityDevAi/storeport/pull/385
