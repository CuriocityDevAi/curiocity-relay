# M1-1121-A · hub-runner v7.6

v7.6 last_error 해제 O · 침범 actor 판정 O · 리포트 자동 이동 O · selftest 3/3 · PR #11

---

## 작업 요약

`scripts/hub-runner-v7.5.mjs` → `scripts/hub-runner-v7.6.mjs` (신규 파일, v7.5 무수정 유지)  
`scripts/hub-runner-install.sh` 의 `TARGET_RUNNER` 기본값만 v7.6 으로 변경.

---

## REQ1 · lastError 고착 해제

**문제**: `lastError` 가 한 번 "blocked: runner-folder change pending Kyu install …" 으로 설정되면
코드 어디에서도 `null` 로 되돌리지 않아 all.json 에 수시간 고착.

**수정**:
- `let lastErrorAt = null;` 추가 (line ~160)
- `lastError = ...` 세팅 시 `lastErrorAt = ts()` 동시 설정
- `safePull` 성공 경로(foreign=0 · pull OK) 에서:
  ```js
  if (lastError !== null) {
    lastError = null;
    lastErrorAt = null;
    lastBlockedLogKey = null;
  }
  ```
- `writeHeartbeat` 페이로드에 `last_error_at: lastErrorAt` 추가

**selftest `--selftest-lasterror-clear` 로그**:
```
[selftest-lasterror-clear] ① lastError 세팅 OK · "blocked: runner-folder change pending Kyu install (scripts/h"
[selftest-lasterror-clear] ② lastError·lastErrorAt 해제 OK · null 확인
[selftest-lasterror-clear] ③ writeHeartbeat last_error_at 필드 OK
[selftest-lasterror-clear] ALL OK
```

---

## REQ2 · Kyu 폴더 침범 actor 판정

**문제**: 허브 실행 구간에 Kyu 가 dev-refresh (`git checkout main` + `git pull --ff-only`) 를 돌려도
허브 탓(`kyu_folder_intrusion`) 으로 오탐. 11-21 기준 M0·M3·M0-C 에서 3회 발생.

**수정**: `detectIntrusionActor(dir, beforeHead, afterHead)` 함수 추가.
- `git reflog show --format=%H %gs HEAD` 로 최근 50개 항목 조회
- `afterHead` 에 대응하는 항목의 메시지가 dev-refresh 패턴
  (`checkout:.*to\s+main` 또는 `pull.*fast-forward`) 이면 → `actor: "kyu"`, 경보 생략
- 판정 불가 → `actor: "unknown"` (허브 단정 금지)
- worktree 도 `cwd=dir` 로 `git reflog` 가 올바른 HEAD 를 조회함

**11-21 kyu-display reflog 오탐 재현 로그** (`--selftest-intrusion-actor` 출력 中):
```
[selftest-intrusion-actor] ④ kyu-display reflog 최근 5개:
   3558f9f0502d58c566768a87c297759fb6348c8e pull --ff-only: Fast-forward
   0d3aaaac9b222c9098c713335a9d69a6d94f9e43 checkout: moving from main to main
   0d3aaaac9b222c9098c713335a9d69a6d94f9e43 checkout: moving from main to main
   0d3aaaac9b222c9098c713335a9d69a6d94f9e43 pull --ff-only: Fast-forward
   fe830e68ff4096bdc4e32269e3ca8da592814a59 checkout: moving from main to main
[selftest-intrusion-actor] ④ kyu-display HEAD actor=kyu (dev-refresh 이면 kyu 기대)
```
→ 가장 최근 HEAD 가 `pull --ff-only: Fast-forward` 패턴 → **actor=kyu 판정 · 경보 생략** 확인.

**selftest `--selftest-intrusion-actor` 로그**:
```
[selftest-intrusion-actor] ① checkout-to-main: actor=unknown (beforeHead==afterHead case → unknown OK)
[selftest-intrusion-actor] ② non-dev-refresh commit: actor=unknown (기대: unknown) · OK
[selftest-intrusion-actor] ③ 동일 HEAD: actor=unknown · OK
[selftest-intrusion-actor] ④ kyu-display HEAD actor=kyu (dev-refresh 이면 kyu 기대)
[selftest-intrusion-actor] ALL OK
```

---

## REQ3 · 리포트 오경로 자동 교정

**문제**: 허브가 `queue/<hub>/<ID>-report.md` 또는 `status/<hub>/<ID>-report.md` 에 리포트를
작성하는 경우 러너가 done 판정을 못하거나 리포트가 wrong path 에 고착.
11-20 2회, 11-21 M0-C·M2-D 반복 확인.

**수정**:
- `relocateMisplacedReports(hub, id)`: `queue/`·`status/` 하위 1단계에서 `<ID>-report.md` 탐색
  → `git mv` + commit. 이미 올바른 경로에 있으면 덮지 않고 경고.
  `misplacedReportsCount` 누계 → all.json `misplaced_reports`.
- `hasReportAnyPath(hub, id)`: 올바른 경로 + 오경로 모두 확인 → `waitForLanding` 의
  `reportExists` 에 사용, 오경로 리포트도 done 판정 트리거.
- `runClaim` state=done 시 `relocateMisplacedReports` 호출.
- `enqueueClaim` done op 에 `hub` 필드 추가 → `runClaim` 에서 수신.

**selftest `--selftest-report-relocate` 로그**:
```
[selftest-report-relocate] ① hasReportAnyPath 없음=false · OK
[selftest-report-relocate] ② hasReportAnyPath 오경로 있음=true · OK
[hub-runner-v7.6:m2 …] [report-relocate] queue/m2/M9-selftest-relo-…-report.md → m2/M9-selftest-relo-…-report.md 이동 커밋 완료
[selftest-report-relocate] ③ relocateMisplacedReports OK · moved=1 · count=1
[selftest-report-relocate] ④ 정리 커밋 완료
[selftest-report-relocate] ALL OK
```

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|---|---|
| `scripts/hub-runner-v7.6.mjs` | 신규 (v7.5 복사 + 3건 수정) |
| `scripts/hub-runner-install.sh` | `TARGET_RUNNER` 기본값 v7.5→v7.6 · `FALLBACK` v7.4→v7.5 |
| `m1/M1-1121-A-report.md` | 이 파일 |

---

## Kyu 교체 절차 (검증 후)

1. **허브 전부 idle 확인**: `all.json` 의 `hubs.m0/m1/m2/m3/r0.current` 가 모두 `null` 인지 확인
2. **install 실행 (1줄)**:
   ```bash
   bash ~/projects/curiocity-relay/scripts/hub-runner-install.sh
   ```
   (내부적으로 `TARGET_RUNNER=hub-runner-v7.6.mjs` 로 launchd plist 를 갱신하고 재시작)
3. **확인**: `status/runners/all.json` 의 `runner` 필드가 `"v7.6"` 인지 확인

> launchd/install 실행은 Kyu 담당. 현재 running v7.5·launchd·심링크 무변동.
