PASS PR #65 · head 1fed637c20d48399b40444e851173f058e1d1af4 · node --test scripts/test/*.test.mjs 507 pass / 0 fail (main 507 pass / 0 fail)

## 변경 내용

- `scripts/watch/sources-local.mjs`: `readAllJson` 이 `~/.hub-runner/status-wt/all.json`(신규 위치) 과 `status/runners/all.json`(레거시 위치) 두 곳을 모두 읽어 `at` 타임스탬프가 더 최신인 것을 반환. 반환 데이터에 `_source: 'status-wt'|'repo'` 포함. `resolvePaths` 에 `runnersAllLegacy` 추가.
- `scripts/ci-watch.mjs`: `CI_WATCH_VERSION` 1.21 → 1.22, 버전 이력 한 줄 추가 (두 줄만 수정).
- `scripts/test/ci-watch-w122.test.mjs`: 테스트 4케이스 신규 (F122-no-wt · F122-both-wt-new · F122-repo-newer · F122-verify 검증의 검증).

## 테스트 결과

- ci-watch-w122.test.mjs: 4/4 pass
- 전체 suite: 507/507 pass (main 대비 +4 케이스)

## PR

https://github.com/CuriocityDevAi/curiocity-relay/pull/65
