PASS · PR #285 · head b704467

## ci-summary

| 잡 | 상태 | 비고 |
|----|------|------|
| actionlint (workflow-lint) | ✅ pass (26s) | PR #285 — .github/** 트리거 정상 |
| flow-tests | ✅ pass (33s) | 기존 CI 잡 영향 없음 |
| route (lint) | ✅ pass (18s) | |
| route (ci) | ✅ pass (18s) | |
| lint | 🔄 진행 중 | |
| assertions | 🔄 진행 중 | |
| unit-tests | 🔄 진행 중 | |
| heavy-cloud | ⏭ skipping | decision-ci-zero-cloud 적용 |

## 작업 내용

- 신규 `.github/workflows/workflow-lint.yml` — storeport#472(fcc008a)에서 이식
  - 러너: `curiocity-mac-fork-light` (ubuntu-latest 0)
  - 트리거: `.github/**` 건드린 PR + master push + workflow_dispatch
  - actionlint: PATH Homebrew 우선 → 없으면 v1.7.12 darwin/arm64 폴백
  - ci.yml 과 `needs` 공유 없음 (독립)
- 신규 `.github/actionlint.yaml` — fork 러너 라벨 4개 등록
  - `curiocity-mac-fork-light`, `curiocity-mac-fork`, `curiocity-mac-light`, `curiocity-mac`

## storeport 대비 변경 3곳

1. 러너 라벨: `curiocity-mac-light` → `curiocity-mac-fork-light`
2. 트리거 브랜치: `main` → `master`
3. actionlint.yaml: fork 전용 라벨 추가

## actionlint 직접 실행 로그 (로컬 검증)

```
$ actionlint -shellcheck "" -verbose .github/workflows/*.yml
verbose: Linting 5 files
verbose: Linting .github/workflows/workflow-lint.yml
verbose: Using project at /Users/kyu.lee/projects/pos-m3-wts/M3-1127-E
verbose: Linting .github/workflows/cancel-on-close.yml
verbose: Linting .github/workflows/ci-summary.yml
verbose: Linting .github/workflows/ci.yml
verbose: Linting .github/workflows/lint.yml
verbose: Rule "shellcheck" was disabled since shellcheck command name was empty
verbose: Found 0 parse errors in 0 ms for all 5 files
verbose: Found 0 errors in 5 files
EXIT:0
```

## 검증의 검증

- 임시 브랜치: `ci/M3-1127-E-verify-broken-wf`
- 임시 PR: #284 (닫음)
- 오류 삽입: `steps.nonexistent_step.outputs.value` (미존재 step ID)
- 로컬 actionlint 결과:
  ```
  .github/workflows/broken-test-delete-me.yml:13:24: property "nonexistent_step" is not defined in object type {} [expression]
  EXIT:1
  ```
- CI 실행 결과: `actionlint` 잡 **fail** (19s)
- 빨간 실행 링크: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45946399038/job/140331972414
- PR #284 닫음 ✓

## 링크

- PR #285 (메인): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/285
- PR #284 (검증·닫음): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/284
