# M0-1125-S — PASS

CD ↔ POS 동기화 계약 v1.1 반영 — R0-1125-AH CHANGES 대응. PR #445 (`feat/M0-1125-R-cd-sync-server`) 같은 브랜치에 push 완료 (`d3f22b4`).

## 요약

| 항목 | 지시 | 반영 |
| --- | --- | --- |
| Blocker 1 | `customer_flow.phone` 은 entering/first_visit/confirming 일 때만 전체, 그 외 null | `deriveCustomerFlow` 에서 state 기반 노출 분기 · `phone_masked` 는 유지 |
| Blocker 2 | v1.1: `source` 는 state===none 일 때 null 허용 → 코드 수정 불필요 (타입 주석만) | `types/customer-display.ts` CustomerFlow 주석 v1.1 로 정합 |
| Blocker 3 | `skip` 은 entering 에서만 — none 에서는 invalid_transition | `transitions.ts` skip case 에서 `|| current === "none"` 제거 |
| non-blocking | `points_earned` 는 실제 적립일 때만, 아니면 null (0 금지) | `deriveCustomerFlow` 에서 `earnedRaw > 0` 일 때만 값 세팅, 아니면 null |

## 변경 파일 (5)

```
apps/commerce-core/src/lib/customer-flow/__tests__/transitions.unit.spec.ts
apps/commerce-core/src/lib/customer-flow/transitions.ts
apps/commerce-core/src/modules/register_session/__tests__/customer-flow-dto.unit.spec.ts
apps/commerce-core/src/modules/register_session/lifecycle.ts
apps/commerce-core/src/types/customer-display.ts
```

## 추가된 행동 테스트

- `transitions.unit.spec.ts` — ALLOWED 에서 `{ none, skip }` 제거 → 기존 "거부 전이" 파라미터 루프가 자동으로 `none + skip → invalid_transition` 케이스 생성.
- `customer-flow-dto.unit.spec.ts` 새 3 케이스:
  - `v1.1 · points_earned: 미적립(0) 은 0 금지 → null` (paid + confirmed + receipt.earned=0)
  - `v1.1 · phone 노출: confirming 에서는 전체 번호`
  - `v1.1 · phone 노출: confirmed 에서는 null (phone_masked 유지)`
  - `v1.1 · phone 노출: skipped 에서는 null (phone_masked 유지)`

## 테스트 로그 꼬리

```
Test Suites: 72 passed, 72 total
Tests:       841 passed, 841 total
Snapshots:   18 passed, 18 total
Time:        29.985 s, estimated 38 s
Force exiting Jest: Have you considered using `--detectOpenHandles` ...
```

commerce-core 전체 유닛 72 suites · 841 tests pass. customer-display vitest 246 tests pass (pre-push hook 로그).

## Build 로그 꼬리

```
info:    Compiling backend source...
info:    Removing existing ".medusa/server" folder
info:    Compiling frontend source...
info:    Backend build completed successfully (6.47s)
info:    Frontend build completed successfully (20.78s)
```

`pnpm --filter commerce-core build` 로컬 success. (클라우드 CI 의 docker-build 는 `ci-cloud-quota-exceeded` 라 못 돌지만, 계약서는 "상태 관련 코드 로직" 범위라 standalone 설치 + build 성공만 로컬 검증 가능.)

## Typecheck

`pnpm --filter commerce-core typecheck` → exit 0 (오류 없음).

## Git

- 브랜치: `feat/M0-1125-R-cd-sync-server` (PR #445)
- 커밋: `d3f22b4 fix(commerce-core): M0-1125-S — CD sync contract v1.1 반영 (R0-1125-AH CHANGES)`
- Push: `d2df753..d3f22b4` 완료
- 셀프 머지 없음 (지시대로)

## 계약 v1.1 정합 확인

- `source` 는 이미 `"cd" | "pos" | null` 로 정의되어 있어 state==='none' 일 때 null 반환이 자연스럽게 동작 (Blocker 2 "코드 수정 불필요").
- feature-map.yaml 는 변경된 5개 파일을 모두 기존 L2 (`commerce-core.customer-display-customer-flow` · `commerce-core.customer-display-snapshot`) 가 커버 중 — yaml 갱신 불필요.
- naming-check PASS (meros 매치 0 · Medusa 모듈명 정합 · [...x] 라우트 없음 · 동명 마이그레이션 없음).
