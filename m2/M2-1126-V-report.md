PASS 7eb9557fd

## 커밋

1. `75d41143b` feat(runner): M2-1126-T — all.json·mem-log status-wt 분리 (rebase 완료)
2. `7eb9557fd` fix(ci-watch-v2): M2-1126-V — sources-{local,git}.mjs all.json 경로 → status-wt · 테스트 allJson 주입

브랜치: `feat/M2-1126-T-runner-status-separate` → origin force-push 완료

## REQ 처리 결과

### REQ 1: origin/main rebase
- 충돌: `scripts/ci-watch.mjs` 1곳 (버전 이력 라인)
- 해결: main의 1.16 M2-1126-S(넘김 폐지·클라우드 경고·iMac heartbeat 경보) 보존 + 1.17 M2-1126-T(all.json 경로 → status-wt) 추가
- `CI_WATCH_VERSION = '1.17'`
- imacHbAlerts 코드(M2-1126-S) 완전 보존

### REQ 2: sources-local.mjs:38 · sources-git.mjs:185,303 경로 수정
- `sources-local.mjs:38`: `join(repoRoot, 'status', 'runners', 'all.json')` → `join(homedir(), '.hub-runner', 'status-wt', 'all.json')`
- `sources-git.mjs:readAllJsonGit`: `origin/main:status/runners/all.json` → `runner-status:all.json` (레거시 폴백 유지)
- `sources-git.mjs:readAllJsonGitAsync`: 동일
- `gitShowText/Json/TextAsync` ref 파라미터 추가 (branch 지정 가능)
- 테스트 11건: `writeFileSync(...all.json...)` → `allJson:` 직접 주입으로 경로 독립화

### REQ 3: relay 전체 grep 결과
활성 코드(`scripts/watch/`, `scripts/ci-watch.mjs`, `scripts/hub-runner-v8.3.mjs`) 중 old path `status/runners/all.json`을 읽는 곳:
- `hub-runner-v8.3.mjs:4610` — selftest 전용: REPO_ROOT에 임시 파일 생성 (의도적, 주석 있음)
- 나머지는 구버전 runners(v6~v8.2) 또는 주석/문서. 수정 불필요.

### REQ 4: 테스트 결과
```
node --test scripts/test/ci-watch-*.test.mjs
# tests 244
# pass 244
# fail 0
```
