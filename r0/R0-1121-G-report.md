# R0-1121-G · relay #11 리뷰

relay #11 APPROVE · v7.5 무변경 O · Kyu 폴더 읽기전용 O · selftest 3/3

리뷰 기준: `/tmp/r0-relay-11` 임시 clone (feat/M1-1121-A-runner-v7.6 브랜치)

---

## 체크 1 · v7.5 무변경

**변경 파일** (PR diff): `m1/M1-1121-A-report.md` · `scripts/hub-runner-install.sh` · `scripts/hub-runner-v7.6.mjs`

- `scripts/hub-runner-v7.5.mjs`: 변경 없음 ✓
- `scripts/hub-runner.mjs` (진입점): 변경 없음 ✓
- launchd plist: PR 에 포함 없음 (repo 에 plist 파일 없고 install.sh 가 동적 생성) ✓
- `hub-runner-v7.6.mjs`: 신규 파일 ✓

---

## 체크 2 · last_error 해제

**세팅 경로** (line 606):
```
lastError = `blocked: runner-folder change pending Kyu install (${remaining[0]})`;
lastErrorAt = ts();
```
`remaining.length > 0` 일 때만 세팅.

**해제 경로** (lines 628–632):
```js
if (lastError !== null) {
  lastError = null; lastErrorAt = null; lastBlockedLogKey = null;
}
```
`foreign.length === 0` + `git pull --rebase` 성공 직후에만 실행.

- pull 실패 시 (catch, line 635–641): `lastError` 유지 ✓
- pane close · claim push 실패: `lastError` 세팅 경로 없음 → 잘못 지워지는 경우 없음 ✓
- `lastBlockedLogKey = null` (line 620, quarantine 완료 후): `lastError` 는 건드리지 않음 ✓

---

## 체크 3 · 침범 actor 판정

**`detectIntrusionActor(dir, beforeHead, afterHead)`** (lines 2413–2441):

```js
const r = spawnSync('git', ['reflog', 'show', '--format=%H %gs', '-n', '50', 'HEAD'], {
  cwd: dir, stdio: 'pipe', timeout: 4000,
});
```

- `cwd: dir` 로 전달 → worktree 에서도 git 이 `.git/worktrees/<name>/logs/HEAD` 를 자동 선택 ✓
- 판정 불가(`r.status !== 0` · 매칭 항목 없음): `return 'unknown'` ✓
- try/catch 전체: `return 'unknown'` ✓
- 허브 미구현: `actor: "hub"` 경로 없음, dev-refresh 아니면 `'unknown'` 반환 (허브 단정 금지) ✓
- `git reflog show` 는 순수 읽기 — `.git/index.lock` 등 lock 파일 생성 없음 ✓

**기존 `captureKyuFingerprint`**: `git status --porcelain` + `git rev-parse HEAD` 사용. `--no-optional-locks` 미적용으로 index 업데이트 시 임시 lock 발생 가능하나, 이는 v7.5 기존 코드이며 이번 PR 신규 사항 아님.

---

## 체크 4 · 리포트 이동

**`relocateMisplacedReports`** (lines 894–932):

- 탐색 범위: `queue/`·`status/` 하위 1단계만 ✓
- 이미 올바른 경로 존재 시: `log(...)` 후 `continue` → 덮지 않음 ✓
- `candidateName = `${id}-report.md`` 엄격 일치 → `queue/<hub>/<ID>.md` 프롬프트 파일과 구별 ✓
  - `entry.isDirectory()`: `queue/<hub>/<ID>-report.md` 탐색
  - `entry.name === candidateName`: 최상위 `queue/<ID>-report.md` 탐색
- 커밋 메시지: `fix(runner-v7.6): ${hub}/${id}: 오경로 리포트 이동 ...` → 러너 스코프 내 ✓

---

## 체크 5 · selftest 3종

**lock/launchd 비접촉 확인**: 세 selftest 모두 `else if` 구조로 `loop()` 미호출 → `acquireLock()` / launchd 명령 없음 ✓

실행 결과 (`/tmp/r0-relay-11` 에서, REPO_ROOT = temp clone):

```
$ node scripts/hub-runner-v7.6.mjs --selftest-lasterror-clear
[selftest-lasterror-clear] ① lastError 세팅 OK
[selftest-lasterror-clear] ② lastError·lastErrorAt 해제 OK · null 확인
[selftest-lasterror-clear] ③ writeHeartbeat last_error_at 필드 OK
[selftest-lasterror-clear] ALL OK

$ node scripts/hub-runner-v7.6.mjs --selftest-intrusion-actor
[selftest-intrusion-actor] ① checkout-to-main: actor=unknown (beforeHead==afterHead case → unknown OK)
[selftest-intrusion-actor] ② non-dev-refresh commit: actor=unknown (기대: unknown) · OK
[selftest-intrusion-actor] ③ 동일 HEAD: actor=unknown · OK
[selftest-intrusion-actor] ④ kyu-display reflog 최근 5개:
   3558f9f0 pull --ff-only: Fast-forward
   0d3aaaac checkout: moving from main to main
   0d3aaaac checkout: moving from main to main
   0d3aaaac pull --ff-only: Fast-forward
   fe830e68 checkout: moving from main to main
[selftest-intrusion-actor] ④ kyu-display HEAD actor=kyu (dev-refresh 이면 kyu 기대)
[selftest-intrusion-actor] ALL OK

$ node scripts/hub-runner-v7.6.mjs --selftest-report-relocate
[selftest-report-relocate] ① hasReportAnyPath 없음=false · OK
[selftest-report-relocate] ② hasReportAnyPath 오경로 있음=true · OK
[hub-runner-v7.6:m2 ...] [report-relocate] queue/m2/M9-selftest-relo-…-report.md → m2/M9-selftest-relo-…-report.md 이동 커밋 완료
[selftest-report-relocate] ③ relocateMisplacedReports OK · moved=1 · count=1
[selftest-report-relocate] ④ 정리 커밋 완료
[selftest-report-relocate] ALL OK
```

**selftest 3/3 통과** ✓

---

## 체크 6 · install 스크립트

```diff
-TARGET_RUNNER="${TARGET:-hub-runner-v7.5.mjs}"
-FALLBACK_RUNNER="${FALLBACK:-hub-runner-v7.4.mjs}"
+TARGET_RUNNER="${TARGET:-hub-runner-v7.6.mjs}"
+FALLBACK_RUNNER="${FALLBACK:-hub-runner-v7.5.mjs}"
```

버전 표기 2줄만 변경 ✓

---

## 종합

**APPROVE**. 버그 수정 3건 모두 의도대로 구현됨. v7.5·진입점·launchd 무변동. 신규 Kyu 폴더 접근(`git reflog show`) 읽기 전용. 리포트 이동 엄격 일치 · 덮어쓰기 방지. selftest 3/3 로컬 통과.
