# M1-1105-BC 리포트 — 러너 v7.2 끝난 Claude 세션 자동 닫기 (장치 사건 #19)

작성: 2026-11-12 · Sonnet 4.6 · ⚠️ 수동 투입
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/1 (브랜치 `m1/BA-runner-v7.2` · 설치 전 머지 필수)
새 커밋: 07bd263 (3 files · +240 / −52)

---

## 0. claim
`node scripts/claim.mjs M1-1105-BC started "manual"` 완료.

---

## 1. 진단 — 오늘 R0·M1 닫기 실패 원인 (로그 인용)

**결론**: v7.1 `exitPaneClaude` 는 done 감지 후 **"자연 종료 대기 (최대 10m)"** 를 먼저 함. Claude Code 는 작업이 끝나도 자동 /exit 하지 않으므로 10분이 흐르거나 Kyu 가 손으로 /exit 함. 원인은 "/exit 호출 자체 안 됨 (= 10분 자연 종료 루프에서 탈출 못함)".

### 코드 (고치기 전 v7.1·v7.2 · `scripts/hub-runner-v7.2.mjs:1540-1555` 당시)
```js
// 먼저 자연 종료 대기 (허브 commit/push 완료 → claude 스스로 종료).
appendLine(logFile, `[pane-exit] hub=${hub} · init=${init.state} · 자연 종료 대기 (최대 10m)`);
const deadline = Date.now() + timeoutMs;         // timeoutMs = 10 * 60 * 1000
while (Date.now() < deadline) {
  await sleepMs(PANE_POLL_MS);
  const s = detectPaneState(cmuxBin, layout, hub);
  if (s.state === 'shell') {
    appendLine(logFile, `[pane-exit] hub=${hub} · shell 복귀 확인 (자연 종료)`);
    return true;
  }
}
// 10분 지나야 비로소 ctrl-u + /exit 송신.
```

### 오늘 로그 (WIB 10:12~10:40)
- `~/.hub-runner/r0/R0-1105-BY.log:60-62` — 10:21 완료 · `init=claude · 자연 종료 대기 (최대 10m)` → 이후 `shell 복귀 확인 (자연 종료)` 는 **Kyu 가 손으로 /exit 한 뒤** 들어온 것 (러너가 /exit 보낸 적 없음).
- `~/.hub-runner/r0/R0-1105-BZ.log:60-62` — 10:32 동일 패턴.
- `~/.hub-runner/r0/R0-1105-CA.log:60-62` — 10:39 동일 패턴.
- `~/.hub-runner/m1/M1-1105-BB.log:61-63` — Kyu 원문 "m1 도 작업이 끝났는데 /exit 으로 못빠져나가고 있어서, 내가 수동으로 /exit 함." (10:39) — 러너가 10분 자연 대기 중, Kyu 가 손 /exit → pane 이 shell 로 → `shell 복귀 확인 (자연 종료)` 오해 기록.

4회 전부 공통 뿌리: **러너가 /exit 를 송신하지 않음** (코드가 10분 자연 대기만 돌림). "복구 로직 가로막음"·"키 전송 실패"·"recap 입력 무시" 아님.

---

## 2. 고침 — file:line

### 신규 lib: `scripts/lib/pane-close.mjs` (전체 신규 · 순수 함수)
`decideCloseAction({ hub, state, attempt, isDone })` → `{ action, reason }` 순수 함수. 사이드 이펙트 없음.
- `hub === 'm2'` → `skip` (수동 투입)
- `isDone === false` → `skip` (작업 중 미개입)
- `state === 'shell'` → `done` (⛔ 쉘에 `exit` 송신 금지 · cmux 칸 닫힘)
- `state === 'unknown'` → `skip` (vim/less 등 안전 보호)
- `state === 'claude'`
  - `attempt 0` → `ctrl-u-exit` (초회)
  - `attempt 1` → `ctrl-u-exit` (재시도 1)
  - `attempt 2` → `escape-ctrl-u-exit` (재시도 2 · Escape 추가 · recap/bake 대응)
  - `attempt >= 3` → `report-failure`

### 수정: `scripts/hub-runner-v7.2.mjs:1529-1570` (`exitPaneClaude` 전면 재작성)
- 10분 자연 대기 루프 **완전 제거**.
- done 감지 즉시 `detectPaneState` → `decideCloseAction` 로 액션 결정 → 송신 → 15초 대기 (`PANE_EXIT_WAIT_MS = 15_000`).
- shell 미복귀 시 `attempt++` 로 재호출, 최대 3회.
- 3회 실패 시 `recordPaneCloseFailure(...)` 호출.
- M2·shell·unknown·non-done 가드 모두 `decideCloseAction` 안에서 처리.

### 추가: `scripts/hub-runner-v7.2.mjs:1577-1598`
- `paneCloseFailures: Map<hub, {id, at, attempts, last_state, tail}>` 모듈 상태.
- `recordPaneCloseFailure(...)` · `clearPaneCloseFailure(hub)`.
- `RELAY_INBOX` 활성 시 `pane_close_failed <hub> · <id> · <N>회 /exit 실패` gh 코멘트 발송.

### 수정: `scripts/hub-runner-v7.2.mjs:2082-2086` (dispatch 성공 경로)
- `exitPaneClaude(..., { isDone: true, id: item.id })` 로 호출 · 직전에 `clearPaneCloseFailure(item.hub)` 호출 (이전 실패 흔적 정리).

### 수정: `scripts/hub-runner-v7.2.mjs:2190` (`writeHeartbeat`)
- `payload.pane_close_failures = Object.fromEntries(paneCloseFailures)` 로 all.json 노출.

### 제거: `scripts/hub-runner-v7.2.mjs:75` — `PANE_POST_LANDING_WAIT_MS` 상수 (dead code).

### 수정: `scripts/hub-runner-v7.2.mjs:2938` (selftest-busy)
- 옛 `{ timeoutMs: 5_000 }` → `{ isDone: true, id }` 로 시그니처 맞춤.

---

## 3. 테스트 로그 — 5종 + 가드

### 신규: `scripts/test/hub-runner-pane-close.test.mjs` (14개 · 순수 함수 전수 검증)
`node --test scripts/test/hub-runner-pane-close.test.mjs` 결과:
```
ok 1 - ① 정상 닫힘 — attempt=0 · claude → ctrl-u-exit (first-try)
ok 2 - ① 정상 닫힘 — ctrl-u-exit 뒤 state=shell 재호출 → done
ok 3 - ② 재시도 1 — attempt=1 · claude → ctrl-u-exit (같은 시퀀스 재시도)
ok 4 - ② 재시도 2 — attempt=2 · claude → escape-ctrl-u-exit (Escape 추가)
ok 5 - ② 재시도 중 state=shell 이면 즉시 done (다음 액션 불필요)
ok 6 - ③ 3회 실패 — attempt=3 · claude → report-failure
ok 7 - ③ PANE_CLOSE_MAX_ATTEMPTS 는 3 (초회+재시도 2 = 3)
ok 8 - ④ shell + attempt=0 → done (초회부터 shell 이면 미송신)
ok 9 - ⑤ isDone=false · claude → skip (작업 중 세션 미개입)
ok 10 - ⑤ isDone=false · 재시도 중이어도 skip (상태 무관)
ok 11 - 가드 — hub=m2 는 state 무관 · isDone 무관 · skip (수동 투입)
ok 12 - 가드 — state=unknown → skip (vim/less 등 안전 보호)
ok 13 - 우선순위 — m2 는 isDone=false 보다 먼저 체크
ok 14 - 우선순위 — isDone=false 는 state=claude 보다 먼저 체크
# tests 14 · # pass 14 · # fail 0
```

### 전체 (기존 88 + 신규 14 = 102)
`node --test scripts/test/*.test.mjs` 결과:
```
# tests 102 · # pass 102 · # fail 0
# duration_ms 7066.556958
```
기존 88개 regression 0. 신규 14개 pass. ✅

---

## 4. 설치 전 PR #1 머지 절차

### 설치 명령 (BA 와 동일)
```
cd ~/projects/curiocity-relay
bash scripts/hub-runner-install.sh
```
`install.sh:17` — `TARGET_RUNNER="${TARGET:-hub-runner-v7.2.mjs}"` · `install.sh:18` — `FALLBACK=hub-runner-v7.1.mjs`.

### ⚠️ 설치 전 PR #1 머지가 **필수**
확인: `git show origin/main:scripts/hub-runner-v7.2.mjs` → `fatal: path ... exists on disk, but not in 'origin/main'`. v7.2 파일은 origin/main 에 아직 없음.

러너는 매 tick `safePull()` 로 origin/main 을 당김. 설치 직후 launchd 가 로드한 코드는 PR 브랜치 내용이어도, 첫 tick 때 `git pull` 이 돌면 v7.2.mjs 파일이 **사라지거나** 다른 내용으로 덮일 수 있음. 재시작·crash 복구 때 launchd 가 디스크에서 다시 로드하면 파일 없음 → 러너 사망.

### 머지 절차 (관찰자 · Kyu 안내용)
1. `gh pr merge 1 --repo CuriocityDevAi/curiocity-relay --squash` (또는 웹 머지) · PR #1 머지.
2. (로컬 러너 폴더) `cd ~/projects/curiocity-relay && git pull origin main` · main 최신화.
3. `git show HEAD:scripts/hub-runner-v7.2.mjs | head -1` · v7.2 파일 존재 확인.
4. `bash scripts/hub-runner-install.sh` · launchd 재로드.
5. 1 분 뒤 `~/.hub-runner/launchd.err.log` tail · `[pane-exit] ... attempt=0 · ctrl-u-exit` 로그 모양 확인.

### 롤백
`install.sh` 자동 롤백: v7.2 verify 실패 시 FALLBACK=v7.1.mjs 재설치. 수동 롤백은 `gh pr revert 1` + `bash scripts/hub-runner-install.sh`.

---

## 5. 이연 순증감

- 이연: 0 신규
- 해결: **#19** (오늘 R0 3회 · M1 1회) — `exitPaneClaude` 자연 대기 10분 제거 · 즉시 /exit · 3회 실패 → status 보고.
- ledger/device-incidents.md 는 해결 ID 열에 "M1-1105-BC(v7.2) ✓" 추가 대상.

---

## 6. 착지 명령
```
cp /tmp/M1-1105-BC-report.md ~/projects/curiocity-relay/m1/ && \
cd ~/projects/curiocity-relay && \
git add m1/M1-1105-BC-report.md && \
git commit -m "m1: M1-1105-BC" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M1-1105-BC done "v7.2 exitPaneClaude 재작성 · #19 해결 · PR #1 커밋 추가 · 설치 전 머지 필수"
```
