PASS

# M1-1124-L 리포트

브랜치: `fix/M1-1124-K-ci-watch-stop` (PR #25)
커밋: `b39dd5936`
작업 폴더: `~/projects/curiocity-relay-wts/M1-1124-K` (M1-1124-L 브랜치와 동일)

---

## 수행 결과

### REQ 1 — ci-watch 배포를 허브 busy 와 분리 ✅

`scripts/hub-runner-v8.1.mjs` `maybeSelfUpdate()`:
- 기존: `deployCiWatch`·래퍼 갱신 코드가 busy guard `return` **아래**에 위치 → busy 중에는 배포 미수행
- 수정: `deployCiWatch`·래퍼 갱신을 busy guard **앞**으로 이동 → 매 tick 수행

**검증 로그** (`--selftest-selfupdate-busy-wait`):
```
[hub-runner-v8.1:self-update] ci-watch 배포 갱신
[hub-runner-v8.1:self-update] ci-watch.sh 래퍼 배포
[hub-runner-v8.1:self-update] 보류 · busy=1 claimQueue=0 processing=false
[selftest-selfupdate-busy-wait] OK · busy 상태에서 self-update 보류
```
→ busy=1 상태에서도 ci-watch 배포·래퍼가 먼저 수행되고, self-update 본체는 보류 ✓

---

### F1 — CI_WATCH_IS_DEPLOYED 수정 ✅

`scripts/ci-watch.mjs`:
- 기존: `HERE === CI_WATCH_DEPLOY_HOME_BIN` — `import.meta.url`은 symlink resolve되므로 항상 `scripts/`를 가리켜 `false`
- 수정: `dirname(resolve(process.argv[1])) === CI_WATCH_DEPLOY_HOME_BIN` — argv[1]은 symlink 경로 그대로

**검증 로그** (인라인 node 실행):
```
CI_WATCH_IS_DEPLOYED (from deployed path): true   ← ~/.hub-runner/bin/ci-watch.mjs
CI_WATCH_IS_DEPLOYED (from scripts path): false   ← node scripts/ci-watch.mjs
```
→ 래퍼 아래(deployed path)에서만 `true` → `exitIfSelfChanged` 작동 ✓
→ 직접 실행(`node scripts/ci-watch.mjs`)에서는 `false` → exit 않음 ✓

---

### F2 — 실제 실행 스모크 테스트 (T5 교체) ✅

`CI_WATCH_ONCE=1` / `--once` 모드: module 최상위에서 처리 (import.meta.url≠argv[1] 불일치 우회).

**검증 로그** (`node --test scripts/test/ci-watch-deploy.test.mjs`):
```
ok 1 - T1 deployCiWatch 는 심링크를 생성한다 (파일 복사본 아님)
ok 2 - T2 심링크 target 이 scripts/ci-watch.mjs 절대경로인지
ok 3 - T3 2nd deployCiWatch call → no-op (changed:false)
ok 4 - T4 소스 파일 변경 후 심링크 통해 최신 내용이 보임 (추가 deploy 불필요)
ok 5 - T5 실제 실행 스모크 — 심링크 배포: CI_WATCH_ONCE=1 exit 0 · 복사본: ERR_MODULE_NOT_FOUND
ok 6 - T6 install.sh ci-watch 배포 라인이 ln -s 를 사용하고 cp 를 사용하지 않음 (정적 검사)
# pass 6 / fail 0
```
T5 세부:
- 심링크 배포 → `CI_WATCH_ONCE=1` 실행 → `[ci-watch:once] imports ok` + exit 0 ✓
- 복사본 배포(기존 버그 재현) → `CI_WATCH_ONCE=1` 실행 → ERR_MODULE_NOT_FOUND → non-0 exit ✓

---

### F3 — Dead code 정리 ✅

`scripts/lib/self-update.mjs`:
- `copyFileSync` import 제거 (복사본 배포 시대의 잔재 — 현재 코드에서 미사용)

---

### F4 — ensureSymlink 오류 기록 + deployCiWatch try/catch ✅

`scripts/lib/self-update.mjs`:
- `ensureSymlink`: rmSync 실패 시 `/* noop */` → `return { changed: false, prev: current, error: e.message }` 로 오류 반환
- `deployCiWatch`: 전체를 try/catch 로 감쌈 → 예외 시 `{ ok: false, reason: 'exception', error: e.message }` 반환 → 러너 프로세스 보호

---

### ci-watch-stop 테스트 ✅

```
ok 1 - S-static: 래퍼 소스에 trap·stop·crash-limit·hint 포함 (정적 검사)
ok 2 - S1: SIGINT 1회로 래퍼·node 종료
ok 3 - S2: stop 서브커맨드로 래퍼 종료 (pid 파일 기반)
ok 4 - S3: 연속 비정상 종료 5회 → 래퍼 exit 1
ok 5 - S4: exit(0) 는 크래시 아님 — 즉시 재기동
# pass 5 / fail 0
```

---

## PR #13·#14·#15 대조표

| PR | 브랜치 | 기능 | main(v1.4) 포함 여부 |
|----|--------|------|---------------------|
| #13 | `feat/M2-1124-D-ci-watch-queue` | 허브 줄 오른쪽 대기 큐 ID 표시 (`listHubPendingIds`, `appendHubPending`) | ✅ 중복 — 닫기 권장 |
| #14 | `feat/M2-1124-E-ci-watch-queue-notif` | 대기 큐 변경 알림 30초 TTL (`diffHubQueue`, `tickQueueDiff`, `activeQueueNotifs`) | ✅ 중복 — 닫기 권장 |
| #15 | `feat/M2-1124-F-ci-watch-busy-job` | BUSY 러너 잡 표시 · 미투입 오경보 제거 (`enhanceBusyLines`, `buildBusyJobMap`, `idleUnclaimed`) | ✅ 중복 — 닫기 권장 |

세 PR은 stacked PR로서 M2-1124-C→D→E→F 순서로 작성됐으며 현재 `ci-watch.mjs v1.4`에 모두 통합되어 있음. 오케가 닫음.

---

## 어설션 파일

`scripts/test/ci-watch-deploy.test.mjs` (T5 업데이트):
```
assert.equal(symRes.status, 0, '심링크 실행 실패 (ERR_MODULE_NOT_FOUND 의심)...')
assert.ok(symStderr.includes('imports ok'), 'once 메시지 없음...')
assert.notEqual(copyRes.status, 0, '복사본이 exit 0 (ERR_MODULE_NOT_FOUND 미발생 — 회귀)')
```

---

## 미검증

- 래퍼 아래 소스 변경 → `exitIfSelfChanged` 실제 `exit(0)` 재기동 (실 환경 필요 · 로컬 테스트 불가)
  - 단, F1 수정으로 `CI_WATCH_IS_DEPLOYED=true` 조건이 충족됨을 로직 검증으로 확인함

## 커밋

`b39dd5936` — PR #25 (`fix/M1-1124-K-ci-watch-stop`) 에 추가 커밋
