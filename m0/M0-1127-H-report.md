PASS · PR #66 · head 74b987334 · tests 22/22 pass (ci-watch-w123 · 전체 ci-watch 296/296) · --once imports ok exit 0 · 주의 칸 = 경보 없음 (storeport 769090c success · fork 88aed17 success)

# M0-1127-H — relay#66 리뷰 수정 (R0-1127-J 필수 2건 + 권고 1건 해소)

## 변경 파일 (가벼운 길 · 2개)

- `scripts/ci-watch.mjs` (+99 −10) · CI_WATCH_VERSION 1.23 → 1.24
- `scripts/test/ci-watch-w123.test.mjs` (+126) · 12 → 22 테스트

## 필수-1: fork 리포 owner (scripts/ci-watch.mjs:82 → :89)

전: `'narisolutions/agilo-medusa-pos-fork'` → GitHub API 404 → fork 경보 영구 묵음
후: `'CuriocityDevAi/agilo-medusa-pos-fork'` (실측 owner)

## 필수-2: fork 기본 브랜치 (scripts/ci-watch.mjs:393)

전: `repos/${fullRepo}/branches/main` 하드코딩
후: `repos/${fullRepo}/branches/${branchName}` · `cfg.branch` 사용
  - storeport: `branch: 'main'`
  - fork: `branch: 'master'` (default_branch=master 실측)

`fetchMainCiStatusForRepo` 의 `actions/runs?branch=…` 도 함께 `cfg.branch` 사용.

## 권고-1: paths-ignore docs-only 커밋 no_run 거짓 경보 억제

- `MAIN_CI_WORKFLOWS` 에 `paths_ignore` 추가 (storeport=[`**/*.md`, `docs/**`], fork=[])
- `isCommitFullyPathsIgnored(files, patterns)` pure 함수 (지원: `**/*.ext`, `dir/**`, 평문)
- `fetchMainCiStatusForRepo`: 매칭 run 없고 `paths_ignore` 있으면 `gh api repos/<r>/commits/<sha>` 로 변경 파일 조회 → 전부 매칭이면 `commitIsPathsIgnored: true`
- `computeMainCiAlerts`: `info.commitIsPathsIgnored === true` 이면 `main_ci_no_run` 억제

## 추가: 설정 오버라이드

- `loadMainCiWorkflows({force?})` : `status/runner-config.json ci_watch.main_ci_workflows` 를 1회 캐시 후 MAIN_CI_WORKFLOWS 위에 리포별 merge. 설정 없으면 기본값 그대로 (현재 config 에 섹션 없음 → base 사용).
- 하드코딩 그대로 두지 않음 — 코드 리터럴은 "안전 기본값" 역할만 하고 설정 파일로 덮어쓰기 가능.

## 테스트 (scripts/test/ci-watch-w123.test.mjs 22 pass)

기존 12 pass 유지 +신규 10:

- `W123-fork-repo-owner` : fork owner === `CuriocityDevAi` · `narisolutions/*` 재발 negative check (검증의 검증 — 소유자 되돌리면 이 테스트 빨강)
- `W123-fork-branch` : fork cfg.branch === `master`
- `W123-storeport-branch` : storeport cfg.branch === `main`
- `W123-fork-failure-alert` : fork(master) 실패 커밋 → `main_ci_failure` 경보 발사
- `W123-docs-only-no-alert` : `commitIsPathsIgnored=true` · 30분 전 · null run → 경보 없음
- `W123-non-docs-no-run-still-alerts` : 실코드 커밋 미실행은 여전히 `main_ci_no_run` (regression gate)
- `W123-paths-ignore-matcher` × 3 : pure 매처 (`**/*.md` + `docs/**` 전부 매칭 / 혼합 / 빈 입력)
- `W123-load-main-ci-workflows` : loadMainCiWorkflows 가 두 리포 + branch 지정 반환

전체 테스트:
```
node --test scripts/test/ci-watch-w123.test.mjs
  → 22 pass / 0 fail · 136ms

node --test scripts/test/ci-watch-*.test.mjs
  → 296 pass / 0 fail · 20.6s
```

## --once + 주의 칸 (Mac 실측 2026-11-27 WIB)

```
node scripts/ci-watch.mjs --once
  → [ci-watch:once] imports ok · exit 0

(라이브 computeMainCiAlerts 호출 · 두 리포 실측)
[CuriocityDevAi/storeport]             commit=769090c ageMin=32 latestRun=completed/success dur=892s pathsIgnored=false
[CuriocityDevAi/agilo-medusa-pos-fork] commit=88aed17 ageMin=70 latestRun=completed/success dur=144s pathsIgnored=false
[alerts count] 0
[주의 칸] (경보 없음 — 두 리포 정상)
```

주의 칸이 비어있는 것이 정답 (두 리포 성공 중 · PR #66 의 설계상 success → 경보 없음).

## 검증의 검증

- 필수-1 재발 방지: `W123-fork-repo-owner` 가 `narisolutions/*` 접두사 negative check
- 필수-2 재발 방지: `W123-fork-branch` 가 `master` 검증, `W123-storeport-branch` 가 `main` 검증
- 권고-1 regression gate: `W123-non-docs-no-run-still-alerts` 가 "실코드 미실행은 여전히 경보" 확인 (docs-only 억제가 너무 넓어지지 않도록)

## 변경 요약

1 커밋 `74b987334` → `feat/M0-1127-F-main-ci-alert` (PR #66) push 완료.
충돌 없음 (M1-1127-H 은 같은 파일의 `readAllJson` 부분 · 겹치지 않음).
