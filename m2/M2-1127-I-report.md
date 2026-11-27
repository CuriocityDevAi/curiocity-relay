PASS relay#64 b56f979 테스트 20/20 실제 PR 3건(storeport#472 PASS · storeport#473 PASS · fork#285 PASS)

## M2-1127-I — merge-gate 거짓 실패·거짓 통과 2건 수정

- 브랜치: `feat/M2-1127-I-merge-gate-fix` (curiocity-relay)
- 커밋: b56f979a4
- PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/64#issuecomment-7211952469

## 필수 1 — CI 거짓 실패 해소

**원인**: check run 이름 패턴(`ci`/`ci.yml`/`ci / ci`)으로 판정 → storeport 실제 잡명(`heavy-cloud`, `route`, `check` 등)과 불일치 → 머지된 초록 PR(#472, #470)이 "CI 한 번도 실행 안 됨" 거짓 실패

**수정**: `CI_WORKFLOWS` 테이블(스크립트 상단) + workflow runs API(`repos/{repo}/actions/runs?head_sha=`) 로 주 CI 워크플로 단위 판정
- storeport: `.github/workflows/ci.yml` (workflow name: "ci")
- medusa-pos fork: `.github/workflows/ci.yml` (workflow name: "CI")

## 필수 2 — skipped 허용 목록 순서 수정

**원인**: `else if (conclusion !== 'success' && conclusion !== 'skipped')` — `skipped` 이면 조건 false → ALLOWED_SKIPPED 체크 미도달 → 허용 목록 밖 skipped 무조건 통과

**수정**: `skipped` 를 별도 분기(`else if (conclusion === 'skipped')`) → `ALLOWED_SKIPPED`에 없으면 `failed.push(...)`

## 추가 — 머지된 PR R0 승인 조건 면제

PR `state=MERGED` / `mergedAt` 세팅 시 R0 승인 체크 면제 → storeport#473·fork#285 PASS 가능

## 테스트 결과 (20/20 PASS)

| ID | 설명 | 결과 |
|---|---|---|
| MG-1 | fixture PASS — 모든 조건 충족 | ✅ |
| MG-2 | in_progress 1개 | ✅ FAIL |
| MG-3 | 주 워크플로 run 없음 (storeport repo) | ✅ FAIL |
| MG-4 | storeport#472 구조 — workflowRun으로 PASS | ✅ |
| MG-5 | 허용 목록 밖 skipped → FAIL | ✅ FAIL |
| MG-6 | check run 0개 → FAIL | ✅ FAIL |
| MG-skipped-검증 | 수정 되돌리면 빨강 | ✅ |
| MG-검증 | in_progress 로직 필수 확인 | ✅ |
| MG-JSON | --json 옵션 | ✅ |
| CQP 1-7 | check-queue-prompt (보존) | ✅ 7/7 |
| CR 1-4 | check-report (보존) | ✅ 4/4 |

## 실제 PR 3건 merge-gate 결과

| PR | 결과 |
|---|---|
| `CuriocityDevAi/storeport#472` | **MERGE-GATE PASS** ✓ |
| `CuriocityDevAi/storeport#473` | **MERGE-GATE PASS** ✓ |
| `narisolutions/medusa-pos#285` | **MERGE-GATE PASS** ✓ |

## 변경 파일

- `scripts/oke/merge-gate.mjs` — CI_WORKFLOWS 상단 표, getWorkflowRuns(), skipped 분기, mergedAt 조건
- `scripts/test/oke-checkers.test.mjs` — MG-3 repo 변경, MG-4/5/6/skipped-검증 추가
- `scripts/test/fixtures/oke/merge-gate-pass.json` — workflowRuns 추가
- `scripts/test/fixtures/oke/merge-gate-fail-inprogress.json` — workflowRuns 추가
- `scripts/test/fixtures/oke/merge-gate-fail-no-ci.json` — workflowRuns: [] 추가
- `scripts/test/fixtures/oke/merge-gate-pass-storeport.json` — 신규 (storeport#472 실 응답 구조)
- `scripts/test/fixtures/oke/merge-gate-fail-skipped.json` — 신규 (허용 목록 밖 skipped)
- `scripts/test/fixtures/oke/merge-gate-fail-no-runs.json` — 신규 (check run 0개)
