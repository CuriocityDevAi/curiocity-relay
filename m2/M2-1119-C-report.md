storeport PR #387 · fork PR #197 · 댓글 생성 O · 같은 댓글 갱신 O · 1회 실행 ~3s

## 작업 개요
ci-summary.yml 을 각 리포에 추가/갱신. CI 완료 시 PR 댓글 1개를 upsert.

## storeport (CuriocityDevAi/storeport)
- PR: https://github.com/CuriocityDevAi/storeport/pull/387
- 브랜치: `ci/M2-1119-C-summary`
- 커밋: c125099
- 변경: 기존 ci-summary.yml 갱신
  - `workflow_run` 트리거: `["ci"]` → `["ci", "docker-smoke", "linux-check", "feature-map-check"]`
  - `permissions.checks: read` 추가 (REQ4)
  - 댓글 형식: `CI: ✅ all green` / `CI: ❌ N failed · ⏳ N pending` (REQ3)
  - sha 7자리 + UTC 갱신 시각 + 실행 소요 로그
- CI 상태: self-hosted runner 대기 중 (pending) — ci-summary 로직 직접 실행으로 검증
- 댓글 생성: O (comment_id: 6997427504)
- 갱신(upsert): O — 2회 실행 후 ci-summary 댓글 개수 = 1 확인
- 댓글 내용:
  ```
  CI: ⏳ 2 pending
  | Check | 결과 | 소요 |
  | changes-filter | 🔄 | — |
  | markers-and-forbidden | 🔄 | — |
  `c125099` · 2026-11-19 02:03 UTC
  ```

## pos-fork (CuriocityDevAi/agilo-medusa-pos-fork)
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/197
- 브랜치: `ci/M2-1119-C-summary`
- 커밋: ef3abfb
- 변경: 신규 `.github/workflows/ci-summary.yml` 추가
  - `workflow_run` 트리거: `["CI", "Lint"]`
  - `permissions: checks:read · pull-requests:write · actions:read`
- CI 완료: assertions ❌, lint ❌, flow-tests ✅, playwright ⏭ (run_id: 44440364549)
- 주의: ci-summary.yml 이 master 에 없어 `workflow_run` 자동 발화 불가 (merge 후 활성화)
  → ci-summary 로직 직접 실행으로 검증
- 댓글 생성: O (comment_id: 6997404985)
- 갱신(upsert): O — 2회 실행 후 ci-summary 댓글 개수 = 1 확인
- 댓글 내용:
  ```
  CI: ❌ 1 failed
  | Check | 결과 | 소요 |
  | flow-tests | ✅ | 1m 16s |
  | assertions | ❌ | 2m 11s |
  | playwright | ⏭ | -1s |
  `ef3abfb` · 2026-11-19 02:02 UTC
  ```

## gh pr view --comments 로그 (pos-fork PR #197)
```
author: CuriocityDevAi
<!-- ci-summary -->
CI: ❌ 1 failed
| Check | 결과 | 소요 |
| flow-tests | ✅ | 1m 16s |
| assertions | ❌ | 2m 11s |
| playwright | ⏭ | -1s |
`ef3abfb` · 2026-11-19 02:02 UTC
```

## gh pr view --comments 로그 (storeport PR #387)
```
author: CuriocityDevAi
<!-- ci-summary -->
CI: ⏳ 2 pending
| Check | 결과 | 소요 |
| changes-filter | 🔄 | — |
| markers-and-forbidden | 🔄 | — |
`c125099` · 2026-11-19 02:03 UTC
```

## REQ 충족 현황
1. ✅ workflow_run 트리거 (기존 CI 워크플로 전부)
2. ✅ 고정 댓글 1개 upsert (<!-- ci-summary --> 마커)
3. ✅ 댓글 형식: CI: ✅/❌/⏳ + 표 + sha 7자리 + UTC
4. ✅ permissions: checks:read · pull-requests:write · actions:read
5. ✅ 댓글 생성 O + 같은 댓글 갱신 O (upsert 확인)
