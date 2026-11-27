PASS relay#73 a59a8c4 · fork#293 29c7f84 · storeport run https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45998619731

## 갭 1 — storeport FLOW_PATHS ask-phone 경로 누락 수정

`scripts/oke/merge-gate.mjs` `FLOW_PATHS['CuriocityDevAi/storeport']` 에 3개 패턴 추가:
- `apps/commerce-core/src/api/admin/pos/orders/**/ask-phone-on-display/**`
- `apps/commerce-core/src/api/admin/pos/orders/**/phone-entry/**`
- `apps/commerce-core/src/api/admin/pos/orders/**/customer-flow/**`

동일하게 `narisolutions/medusa-pos` 에도 반영.

## 갭 2 — storeport 흐름 PR → fork e2e-cd-pos 연결

**아키텍처**: `e2e-cd-pos.yml` 은 fork 리포에 있으므로 storeport 의 workflow_runs 에서는 절대 찾을 수 없었음. 해결:

1. **fork `.github/workflows/e2e-cd-pos.yml`** (fork#293 · 29c7f84):
   - `run-name: "e2e-cd-pos · storeport/${{ inputs.storeport_sha || client_payload.storeport_sha || 'fork' }}"` 추가
   - `workflow_dispatch.inputs.storeport_sha` 추가
   - `repository_dispatch types: [rehearsal-request]` 추가

2. **relay `scripts/oke/merge-gate.mjs`** (relay#73 · a59a8c4):
   - `REHEARSAL_FORK = { 'CuriocityDevAi/storeport': 'CuriocityDevAi/agilo-medusa-pos-fork' }` 추가
   - `getRehearsalForkRuns(forkRepo)` 추가 — fork 의 e2e-cd-pos.yml runs?per_page=20 조회
   - 리허설 관문 로직: storeport PR 은 fork 런 목록에서 `run-name` 에 sha(7) 포함 런으로 판정

3. **storeport `.github/workflows/rehearsal-dispatch.yml`** (storeport#480 · f025362):
   - 흐름 경로 변경 시 fork 에 `repository_dispatch` (event_type: rehearsal-request · storeport_sha 주입)
   - 사전 조건: `FORK_DISPATCH_TOKEN` secret 설정 필요

## storeport#480 실행 run

`gh workflow run e2e-cd-pos.yml --ref feat/M1-1127-I-rehearsal-gate --field storeport_sha=f025362e0a2f92290292bab46208203738be7b88`
→ https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45998619731

## run 45993173431 step 7 빨강 원인

**테스트가 버그를 정상적으로 잡은 것**. `sequential.spec.ts` R4 케이스 4개 실패:
- `left-receipt-mini` 가 CD 새로고침 후 15초 내 visible 되지 않음
- `3-5/3-6(b)/3-6(c)` 연속·새로고침 케이스 모두 `receipt-mini`/`keypad-panel` timeout

환경 문제 아님 — step 4(storeport 미러 경로) · step 5(test env up) · step 6(chromium install) 모두 초록. 1 passed(full flow case1 기본 경로)가 통과하므로 환경 자체는 정상. fork#293 브랜치의 CD 새로고침 복원 로직 미구현으로 인한 앱 버그.

## 테스트

```
29개 all pass (MG-R5/R6/R5-검증 추가)
MG-R5: storeport ask-phone + fork 리허설 초록 → PASS
MG-R6: storeport ask-phone + fork 리허설 없음 → FAIL rehearsal: pending
MG-R5-검증: 판정 로직 제거 시 빨강 (검증의 검증)
```

## 커밋 목록

- relay#73: `a59a8c424` feat(merge-gate): M1-1127-J — storeport FLOW_PATHS ask-phone 갭 1 · 포크 리허설 조회 갭 2
- fork#293: `29c7f84f` feat(e2e-cd-pos): M1-1127-J — storeport_sha 입력 · run-name · repository_dispatch
- storeport#480: `f025362e` feat(ci): M1-1127-J — rehearsal-dispatch.yml · storeport 흐름 PR → fork e2e-cd-pos 트리거
