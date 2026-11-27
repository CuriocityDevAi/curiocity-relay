PASS PR #70 · head=61446be13 · 테스트 4건 (events-not-blocked 2 · scripts-blocked 1 · main-guard-d/e 각 1 기존 통과)

## 작업 내용

**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/70  
**브랜치**: feat/M2-1127-L-events-scope  
**커밋**: 61446be13  
**버전**: v8.3.3 → v8.3.4

### REQ1: main-guard events 파일 즉시 커밋+push
- `hub-runner-v8.3.mjs` 의 main-guard 호출 직후(try-catch 뒤)에 `getUntrackedPaths().filter(p => p.startsWith('events/'))` 로 감지 → `git add + commit + push origin HEAD:main`
- 실패 시 로그 후 무시 → 다음 루프에서 재시도 (events/ 가 RUNNER_SCOPE_PREFIXES에 포함되므로 pull 차단 없음)

### REQ2: events/ 를 RUNNER_SCOPE_PREFIXES에 추가
- `RUNNER_SCOPE_PREFIXES` 에 `'events/'` 추가 → `outOfScopeChanges()` 가 untracked events 파일을 차단 사유로 보지 않음
- 스코프 밖 코드 변경(scripts/*.mjs 등) 차단은 그대로 유지

### REQ3: last_error 문구 수정
- 기존: `blocked: runner-folder change pending Kyu install (경로)`
- 수정: `blocked: 러너 폴더에 정리 안 된 파일 경로 — 커밋 또는 이동 필요`

### REQ4: 셀프테스트 2종
- `--selftest-events-not-blocked`: events 파일 → 차단 안 됨(foreign=[]) + 커밋됨 — OK
- `--selftest-scripts-blocked`: scripts/x.mjs → 여전히 차단(검증의 검증) — OK

## 머지
오케(허브가 비는 때) 소관. self-update 재시작 주의.
