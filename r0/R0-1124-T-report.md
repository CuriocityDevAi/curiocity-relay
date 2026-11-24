APPROVE — R0-1124-Q CHANGES 3건 해결 확인 · selftest 10종 전부 PASS

## 판정

**APPROVE**

R0-1124-Q CHANGES 3건(① 무한 루프 대책 ② prev 부재 fallback ③ 미사용 import) 모두 해결. 셀프테스트 2종 추가 포함 10종 전부 PASS.

---

## ① 같은 실패 sha 재시도 안 함 · 새 sha 는 시도 · blocked event 중복 기록 없음

**OK**

### 구현

- `~/.hub-runner/selfupdate-blocked.json` 신규 파일 (`self-update.mjs`: `readBlockedSha` / `writeBlockedSha`).
- `maybeSelfUpdate` 조기 반환 추가 (line ~3425):

```js
const blocked = selfUpdateReadBlockedSha(RUNNER_HOME);
if (blocked && blocked.sha === diff.originSha) {
  return { tried: false, reason: 'blocked-sha' };
}
```

- `diff.originSha` = `sha256(origin/main 의 대상 파일 바이트)` → origin/main 이 새 버전으로 교체되면 sha 변경 → 자동 해제. ✓
- 새 sha: `blocked.sha !== diff.originSha` → 차단 없음. ✓

### blocked event 중복 기록 방지

`handleBootPendingAtStart` → rollback 경로:

```js
const alreadyWritten = existing?.sha === failedSha && existing.event_written === true;
// alreadyWritten=true 이면 event 쓰기 블록 완전 스킵.
```

첫 rollback: `event_written=false` → event 작성 → `event_written=true` 갱신 → 이후 동일 sha rollback: `alreadyWritten=true` → 이벤트 재기록 없음. ✓

---

## ② prev 부재 시 FALLBACK 으로 복구 (30초 재기동 루프 없음)

**OK**

### 구현

```js
const SELF_UPDATE_FALLBACK_RUNNER = 'hub-runner-v8.0.mjs';
// ...
const fallbackPath = join(HERE, SELF_UPDATE_FALLBACK_RUNNER);
if (existsSync(fallbackPath)) {
  selfUpdateEnsureSymlink({ linkPath, targetPath: fallbackPath });
} else {
  log('self-update', `fallback 도 없음(${fallbackPath}) · 심링크 유지`);
}
```

### 루프 차단 흐름

```
prev 부재 → fallback=v8.0 존재 → 심링크=v8.0 → clearPending → exit(1.5s)
launchd: v8.0 재기동 → maybeSelfUpdate 없음 → 루프 없음  ✓
```

### 경계 케이스

fallback(v8.0)도 없는 경우: 심링크 유지 → ThrottleInterval 30s 루프 계속. 단 `install.sh`가 항상 v8.0 배포 → 현실적 발생 범위 외. 허용.

---

## ③ ci-watch.mjs 미사용 realpathSync import 제거

**OK**

```diff
-  realpathSync,
```

line 17 `realpathSync` import 1줄 삭제 확인. 현재 코드에 `realpathSync` 사용처 없음. ✓

---

## 셀프테스트 10종 worktree 재실행

worktree: `/tmp/relay-wt-R0-1124-T` (sha `929f6af1f`)

```
=== 신규 selftest 2종 ===
--selftest-selfupdate-loop-guard  OK · 같은 sha 재시도 안 함 · 새 sha 는 시도 · event_written 갱신
--selftest-selfupdate-no-prev     OK · rollback prev 부재 → fallback=hub-runner-v8.0.mjs · blocked sha 기록 정상

=== 기존 selftest 5종 ===
--selftest-selfupdate-detect      OK · (a) 동일 (b) bytesDiffer (c) renamed 세 경로 감지
--selftest-selfupdate-preflight   OK · 자기 자신으로 node --check + 3 selftest 통과
--selftest-selfupdate-busy-wait   OK · busy 상태에서 self-update 보류
--selftest-selfupdate-rollback    OK · confirm→bootCount=1 · 2차=rollback · currentScript 불일치=stale
--selftest-selfupdate-ciwatch     OK · copy·no-op·갱신·래퍼 4 분기 정상

=== preflight 3종 ===
--selftest-stale-lock             OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음
--selftest-merge-fail3            OK · 연속 3회 → summarized=true · 4회 반복 억제 · 키 변경 시 리셋
--selftest-report-path-off        OK · flag off → false · 기본 on · ${ABS_PATH} 치환 정상
```

**전부 PASS (10/10)**

---

## PR 본문 Kyu 설치 명령

```bash
cd ~/projects/curiocity-relay
git fetch origin
git checkout main && git pull --ff-only
bash scripts/hub-runner-install.sh
```

TARGET=v8.1(기본값) · FALLBACK=v8.0 · 한 번만 실행. ✓ (R0-1124-Q 와 동일, 유효)

---

## 종합

| 항목 | 판정 |
|------|------|
| ① 같은 sha 재시도 안 함 · 새 sha 시도 | ✅ OK |
| ① blocked event 중복 기록 없음 | ✅ OK |
| ② prev 부재 → FALLBACK=v8.0 복구 | ✅ OK |
| ② 30초 재기동 루프 없음 (fallback 존재 시) | ✅ OK |
| ③ ci-watch.mjs realpathSync 미사용 import 제거 | ✅ OK |
| 신규 selftest 2종 (loop-guard · no-prev) | ✅ PASS |
| 기존 selftest 5종 | ✅ PASS |
| preflight 3종 | ✅ PASS |
| Kyu 설치 명령 유효성 | ✅ OK |

**APPROVE**: R0-1124-Q CHANGES 3건 모두 해결. 머지 가능.
