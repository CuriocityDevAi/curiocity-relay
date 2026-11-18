#382 CHANGES · 로직 0 O · it X(로컬 없음) || CI 실행기 running · queued 11 · 최장 대기 ~252분 · 최근 실패 0

## PR #382 요약 (refactor/M2-1118-R-rb2b-order-snapshot)

**제목**: refactor(register-session): M2-1118-R R-B2b — order-snapshot 공용 경로 승격  
**상태**: OPEN | **병합 가능성**: CONFLICTING (DIRTY)

### 변경 파일 (8개)

| 파일 | 변경 유형 |
|------|-----------|
| `.github/workflows/linux-check.yml` | 추가 (PR base 이전에 이미 main에 있음 → 충돌) |
| `apps/commerce-core/eslint.config.ts` | 주석 갱신 + R-B2a 패턴 유지 (충돌) |
| `apps/commerce-core/integration-tests/pos/customer-display-me.spec.ts` | 신규 통합 테스트 |
| `apps/commerce-core/integration-tests/pos/pin-audit.spec.ts` | 신규 통합 테스트 |
| `apps/commerce-core/src/modules/register_session/models/order-snapshot.ts` | re-export 로 대체 |
| `apps/commerce-core/src/modules/register_session/order_snapshot/model.ts` | 신규 (실체 이동) |
| `apps/commerce-core/src/modules/register_session/service.ts` | import 경로 수정 |
| `docs/feature-map.yaml` | 신규 파일 경로 등록 |

### 로직 변경 여부

**0 — 로직 변경 없음** (파일 이동 · 경로 수정 · re-export 만)
- `model.define("order_snapshot", {...})` 정의 완전 동일 (테이블명·필드·타입 불변)
- service.ts: import 경로만 `./models/order-snapshot` → `./order_snapshot/model` 로 변경
- 하위 호환 re-export: 구 경로 (`models/order-snapshot.ts`) 에서 신 경로 re-export

### 계획서 §4.4 R-B2b 일치 여부

**일치** — `docs/plans/pos-finish-shared.md §4.4 R-B2b` 에 명시된:
- 옮긴 파일: `register_session/models/order-snapshot.ts` → `register_session/order_snapshot/model.ts` ✅
- re-export 남김 ✅
- service.ts import 갱신 ✅
- ESLint 주석 갱신 ✅
- 신규 테스트 2개 (`customer-display-me.spec.ts`, `pin-audit.spec.ts`) ✅

---

## 중요 발견: 병합 충돌 (CONFLICTING)

PR base: `366b79a` (M0-1118-J, merged 09:55 WIB)

이후 main에 머지된 PR들이 충돌 원인:

1. **PR #380** (M2-1118-Q, 10:51 WIB): `.github/workflows/linux-check.yml` 추가
   → PR #382도 같은 파일을 추가로 diff에 포함 → 충돌

2. **PR #363** (M3-1118-A, 12:26 WIB): `eslint.config.ts` 에서 R-B2a (`register_session/core`) 패턴을
   광범위한 `register_session` (전체) 패턴으로 덮어씀 (회귀!)
   → PR #382 는 `register_session/core` 패턴 사용 → 충돌

**회귀 주의**: 현재 main의 eslint.config.ts 는 M3-1118-A 로 인해 `register_session` 전체를 경계로
잡고 있어 R-B2a 성과가 소실됨. PR #382 를 rebase 후 머지하면 이 회귀도 함께 수정됨.

---

## warning 카운트

| 상태 | boundary warnings |
|------|-------------------|
| R-B2a 계획 (PR #377 M2-1118-M) | 14→6 (register_session 8건 해소) |
| M3-1118-A 머지 후 현재 main | **19건** (회귀: register_session 전체 패턴 복귀) |
| PR #382 머지 후 예상 | ~11건 (register_session/core 패턴 복원 + order_snapshot 허용) |

현재 main ESLint 상세:
- `no-restricted-imports` (boundary): **19건**
  - `register_session` 관련: 8건 (회귀분)
  - `pos_settings` / `xendit` 관련: 11건 (R-B1 잔여)

---

## build / typecheck 결과 (현재 main 기준)

```
tsc --noEmit: 0 errors ✅
단위 테스트 (TEST_TYPE=unit): 528 tests, 45 suites PASS ✅
```

(PR description의 539는 PR 브랜치 기준 — 신규 unit spec 포함 가능성)

---

## it.sh 실행 결과

**X — 로컬 실행 불가** (스킵)

- `scripts/it.sh` 는 PR branch에만 존재하며 현재 main에 없음
- storeport 로컬 클론 어느 곳에도 it.sh 없음
- PR branch 에는 존재 확인됨 (GitHub API로 확인)
- it.sh 는 checkout-handover-smoke 등 패턴 필터링으로 단일 spec 실행하는 래퍼

---

## CI 실행기 상태 (2026-11-18 ~15:23 WIB)

### actions-runner 상태

```
status: running (Started: PID 52263)
Launch agent: actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1
Runner.Listener: 52367 (실행 중)
Runner.Worker: 34117 (spawn client)
```

### storeport CI 최근 실행 (15건)

| 항목 | 수치 |
|------|------|
| queued/pending | **11건** |
| 최장 대기 | ~252분 (44292366168, 2026-11-18T11:11:16Z) |
| 최근 실패 (failure) | **0건** |
| 최근 취소 (cancelled) | 4건 (정상적 재실행 취소) |

### linux-check.yml 오늘 실행

| 실행 | 브랜치 | 결과 |
|------|--------|------|
| 11:11:07 | ci/M2-1118-Q-linux-check | **success** (3m22s) |
| 10:52:52 | ci/M2-1118-Q-linux-check | failure (3m3s, 임시 push 트리거) |

main 브랜치 대상 오늘 실행: **없음** (스케줄 05:00/11:00/19:00 UTC 기준 아직 미실행)

### agilo-medusa-pos-fork CI

최근 5건 모두 **failure** — M3-1118-G BLE 프린터 assertions job 실패

---

## 종합 판정

**CHANGES 요청**:
1. **병합 충돌 해소 필요** — `linux-check.yml` 및 `eslint.config.ts` 충돌
2. **rebase 권장** — PR #380, M3-1118-A 이후 커밋 위에서 rebase 후 재 CI 실행 필요

로직 변경 없음, R-B2b 계획 충실 이행, 모델 정의 완전 동일 — rebase 후 APPROVE 적합.
