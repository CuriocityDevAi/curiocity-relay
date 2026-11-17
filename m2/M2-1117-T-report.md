#341 tsc 신규 0 · 중복 step 통합 · mergeable

## 작업 내역

### [REQ-1] tsc 신규 오류 6개 해소
- `void/route.ts:276` — `Awaited<ReturnType<...>>["result"]` → `PosVoidWorkflowOutput` 명시 타입으로 교체
- `import type { PosVoidWorkflowOutput }` 추가
- 결과: `pnpm typecheck` 에서 pos-void 관련 신규 오류 0

### [REQ-2] 중복 step 통합
- `toNum` / `providerToMethod` 가 `pos-void/steps.ts`와 `pos-return/utils.ts`에 완전 동일하게 중복
- `workflows/_shared/payment-utils.ts` 신설, 양쪽에서 re-export 유지 (임포트 경로 호환)
- `docs/feature-map.yaml` — `pos-void-refund` 프로세스에 `workflows/_shared/**` 등록

### [REQ-3] 테스트
- 439 tests, 35 suites — 전원 통과 (스냅샷 16 포함)
- `--force-with-lease` push: 9240444

### R0 스레드
- 답글 달고 resolve 처리 완료
