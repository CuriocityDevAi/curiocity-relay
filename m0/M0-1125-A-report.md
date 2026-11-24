PASS

## M0-1125-A 작업 보고

**브랜치**: `fix/M1-1124-R-multi-store-pim-select` (PR #423)
**수행 일시**: 2026-11-25

---

### 1. main merge + 충돌 해소

- `git fetch origin main` → main이 `15ab1eb` (#421 fix) 까지 앞서 있음.
- `git merge origin/main --no-commit --no-ff` 시도 → `add/add` 충돌 2개 발생:
  - `apps/commerce-core/src/scripts/setup-multi-store.ts`
  - `apps/commerce-core/src/scripts/__tests__/setup-multi-store.unit.spec.ts`
- **해소 전략**: HEAD (브랜치) 버전 채택 (`git checkout --ours`).
  - HEAD에 이미 main 측 기능이 포함되어 있음 (`selectPimTarget`이 `existing[0]` 로직 대체 + 0개 abort).
  - `--pim-id` 플래그·`selectPimTarget` 순수 함수 보존.
- Merge commit: `4e2eec3` — hook/prettier/naming-check 모두 통과.

### 2. 단위 테스트 직접 실행

```
pnpm exec jest src/scripts/__tests__/setup-multi-store.unit.spec.ts
```

**결과**: 11/11 PASS (1.049s)

- M0-1124-E · parseArgs: 5개 ✅
- M1-1124-R · selectPimTarget: 6개 ✅

### 3. Push + CI 트리거 확인

- `git push origin fix/M1-1124-R-multi-store-pim-select` 성공 → `b8059aa..4e2eec3`
- CI 자동 트리거됨 (runs: `45505912718` ci, `45505912715` feature-map-check)

**CI 잡 현황** (보고 시각 기준):

| 잡 | 상태 | 결과 |
|---|---|---|
| changes-filter | completed | ✅ success |
| markers-and-forbidden | completed | ✅ success |
| feature-map-check / check | completed | ✅ success |
| route | completed | ✅ success |
| heavy-cloud | completed | ⏭ skipped (self-hosted 배차) |
| heavy-mac | in_progress | (진행 중) |

- ci-summary run `45506140050` queued (heavy-mac 완료 후 실행 예정).
- `heavy-mac` 최대 90분 타임아웃 — 현재 모든 선행 잡 초록.

---

### 충돌 해소 근거 메모

`setup-multi-store.ts`에서 HEAD(브랜치)와 main(origin)의 차이:

| | HEAD (브랜치) | main (origin/main) |
|---|---|---|
| PIM 선택 로직 | `selectPimTarget()` 순수 함수 | `existing[0]` 단순 선택 |
| 0개 처리 | `abort` 반환 | warn + 새 PIM 생성 |
| `pimId` 타입 | `string \| null` (필드 있음) | 없음 |
| `--pim-id` 플래그 | 있음 | 없음 |

PR 목적이 `selectPimTarget` 분리 + `--pim-id` 추가이므로 HEAD 버전이 최신 의도. main의 창구 생성 fallback은 HEAD의 abort 패턴으로 의도적으로 대체됨.
