#40 APPROVE

PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/40  
검토: R0-1126-A · Sonnet · 2026-11-26

---

## 검증 항목별 결과

### 1. main 가드 — realpathSync try/catch

```js
// ci-watch.mjs
const _argv1 = process.argv[1] || '';
const _argv1Real = (() => { try { return realpathSync(_argv1); } catch { return _argv1; } })();

if (_argv1 && (
  import.meta.url === pathToFileURL(_argv1).href ||
  import.meta.url === pathToFileURL(_argv1Real).href
)) {
```

- **argv[1] 없음·존재하지 않는 경로**: `try/catch` 로 감싸서 throw 없이 `_argv1` 그대로 반환 ✅  
- **직접 실행(`node scripts/ci-watch.mjs`)**: `_argv1` 가 실제 경로 → 첫 조건(`pathToFileURL(_argv1)`)에서 일치 ✅  
- **import(테스트)**: `_argv1` = 테스트 파일 경로 → 양쪽 모두 불일치 → main 미진입 ✅  

### 2. THIS_FILE_REAL 해시 통일 · self-update 감지

```js
const THIS_FILE_REAL = (() => { try { return realpathSync(THIS_FILE); } catch { return THIS_FILE; } })();
// runningCodeHash · getDiskFileHash() 모두 THIS_FILE_REAL 기준으로 통일
```

- 기동 시 해시(`runningCodeHash`)와 디스크 조회(`getDiskFileHash()`) 양쪽 모두 같은 realpath 기준 ✅  
- 파일 변경 시 exit(0) 1회 발생 → 래퍼가 재기동하는 self-update 흐름 유지 ✅  

### 3. 래퍼 exit(0) 카운터 · stderr tee · Ctrl+C/stop 유지

**exit(0) 카운터**:
- 기존: exit(0) 는 카운터 제외, `echo "exit(0) · 즉시 재기동"` 후 무조건 continue  
- 변경: exit(0) 도 `crash_count++` 대상 → 60초/5회 초과 시 `"자가 업데이트 재기동이 60초에 5회 넘음 · 중단"` 출력 후 exit(1)  
- 정상 self-update (하루 수 회) ≪ 5회/60초 → 오탐 없음 ✅  

**stderr tee**:
```bash
node "$CI_WATCH" "$@" 2> >(tee -a "$_STDERR_LOG" >&2) &
_CHILD_PID=$!   # process substitution PID 아닌 node PID
```
- stderr → 터미널(>&2) + `$_STDERR_LOG` 동시 출력  
- TUI는 stdout 전용(ANSI escape), stderr는 boot/error 메시지만 → TUI 화면 영향 없음 ✅  
- `$!` = node PID (주석으로 명시) → `wait`·`kill` 정상 동작 ✅  

**Ctrl+C/stop**:
- `_cleanup()` 함수는 변경 없음, `trap _cleanup INT TERM` 그대로 유지 ✅  
- stop 서브커맨드 로직도 변경 없음 ✅  

### 4. 러너 본체 영향 없음 — diff 확인

`git diff main -- scripts/lib/self-update.mjs` hunk 헤더 전부 `WRAPPER_BODY` 템플릿 문자열 범위(line 235~334) 내에 위치.  
`deployCiWatch()`, `deployCiWatchWrapper()`, `detectUpdate()` 등 JS 함수 본체 변경 없음 ✅

### 5. 테스트 직접 실행

**신규 테스트 (S1/S2/S3)**:
```
node --test scripts/test/ci-watch-restart-loop.test.mjs
```
```
ok 1 - S1: exit(0) 5회 연속 시 래퍼가 "자가 업데이트 재기동…중단" 출력 후 exit(1)
ok 2 - S2: 배포 심링크에서 --once 실행 → [ci-watch:once] imports ok
ok 3 - S3: 배포 심링크에서 실행 시 [ci-watch:boot] 출력 (main 블록 진입)
# pass 3 / fail 0
```

**기존 테스트 (T1-T6, K-1a~K-4d, S-series 등)**:
```
node --test scripts/test/ci-watch-t.test.mjs scripts/test/ci-watch-k.test.mjs \
  scripts/test/ci-watch-deploy.test.mjs scripts/test/ci-watch-s.test.mjs \
  scripts/test/ci-watch-stop.test.mjs
```
```
# tests 38 / pass 38 / fail 0
```

**심링크 배포본 10초 실기 확인**:
```bash
# 임시 HOME, BIN_DIR에 ci-watch.mjs 심링크, deployCiWatchWrapper 로 ci-watch.sh 생성 후 10초 실행
```
로그 첫 줄:
```
[ci-watch.sh] 시작 · 끄기: Ctrl+C  |  다른 터미널: ci-watch.sh stop
[ci-watch:boot] deployed=true · real=.../scripts/ci-watch.mjs · hash=5f1be4d077bc
Runner/CI Monitoring v1.5 (20261126)
```
- **재기동 횟수: 0** ✅  
- 화면(`Runner/CI Monitoring v1.5`) 즉시 표시 ✅  

---

## 판정

**APPROVE** — 5개 검증 항목 전부 통과, 신규·기존 테스트 41건 pass, 실기 재기동 0회 확인.
