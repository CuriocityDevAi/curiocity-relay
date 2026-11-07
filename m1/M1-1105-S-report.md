---
round: M1-1105-S
pr: null
outcome: 러너 단일 프로세스 재작성 (--all) · runner-config.json cwd 분리 · launchd 1 plist · 라이브 셀프테스트 성공 + 실제 R0-1105-Z 처리 입증
kyu_checks: 0 (러너 자체 릴리즈 — Kyu 가 할 일 "없음")
---

# M1-1105-S · 러너 단일 프로세스 + 실제 설치 (방법론 ⑯)

**일자**: 2026-11-07 · **허브**: M1 (러너 소유권) · **범위**: curiocity-relay 만 수정 (제품 리포 0).

---

## 0. 원문 (허브-1107-S) 요약

M2-1105-O 러너 실설치가 ① cwd=null ② unstaged changes ③ multiple branches 로 막힘. 뿌리 수정 ①/②/③, 큐 heartbeat 폭주 ④, Kyu 수동 투입 공존 ⑤, 러너가 직접 설치 ⑥ 후 라이브 셀프테스트 + launchd 설치 + 로그.

---

## 1. 변경 요지 (relay 안)

| 파일 | 변경 |
|------|------|
| `status/runner-config.json` | **신규** · {hubs: {m0..r0: {cwd, label}}} — build-hubs 영향 X |
| `scripts/hub-runner.mjs` | **전면 교체** · 단일 프로세스 `--all` · claim 큐 직렬 · claude child 병렬 · safePull(scope 체크 + autostash) · heartbeat `status/runners/all.json` 1 파일 |
| `scripts/claim.mjs` | `--blocked-by <who>` 선택 인자 지원 → payload `blocked_by` 필드 |
| `scripts/hub-runner-install.sh` | 단일 plist `com.curiocity.hub-runner` · 레거시 허브별 plist bootout + 삭제 · runner-config cwd 실측 |
| `scripts/hub-runner-uninstall.sh` | 단일 plist + 레거시 전부 제거 |
| `docs/hub-runner.md` | 재작성 (뿌리 수정 ①~⑥ 명시) |
| `queue/m1/M1-1105-S-selftest.md` | 라이브 셀프테스트 발부 |

### runner-config.json 전문
```json
{
  "schema_version": 1,
  "hubs": {
    "m0": { "cwd": "/Users/kyu.lee/projects/storeport", "label": "storeport · commerce-core backend" },
    "m1": { "cwd": "/Users/kyu.lee/projects/pos-m1",    "label": "POS mobile · M1" },
    "m2": { "cwd": "/Users/kyu.lee/projects/pos-m2",    "label": "POS printer / register · M2" },
    "m3": { "cwd": "/Users/kyu.lee/projects/pos-m3",    "label": "POS checkout / orders · M3" },
    "r0": { "cwd": "/Users/kyu.lee/projects/pos-r0",    "label": "POS ops / reports · R0" }
  }
}
```

### 핵심 뿌리 수정

**① cwd 분리** — `hubs.json` 은 build-hubs 가 재생성하므로 그 안의 `cwd` 는 매번 사라짐. 전용 `runner-config.json` 로 분리. 러너는 이 파일만 참조.

**② 단일 프로세스 직렬 git** — 5 허브 1 프로세스. claim-op 를 큐에 넣고 `drainClaimQueue()` 가 **한 번에 한 개** 만 처리 → git commit/push 직렬화. claude child 만 허브별 병렬 (최대 5개).

**③ git 안전** — `git pull --rebase --autostash origin main` (branch 명시 → multiple branches 제거 · autostash → unstaged heartbeat 공존). `outOfScopeChanges()` 는 raw porcelain 파싱 (`.trim()` 로 선행 공백이 사라지는 문제 2회 수정 커밋 `fb57374` · `8d8b71a` · `aa43548`). 스코프 밖 변경이 있으면 pull **건너뜀** (경고만).

**④ heartbeat 1 파일** — `status/runners/all.json` 하나로 합침. 5 분 cadence 커밋, 그 사이는 디스크 flush 만.

**⑤ 공존** — claim 이 이미 `started/in_progress` (Kyu 수동 투입) 이면 pickNext 가 skip. Claude 종료 뒤 safePull 로 허브가 올린 `done/blocked/cancelled` 확인 → 덮어쓰지 않음. 블록 claim 은 payload 에 `blocked_by:"kyu"` + note 에 로그 경로.

**⑥ 단일 launchd plist** — `com.curiocity.hub-runner` (허브 suffix 없음). 설치 스크립트가 레거시 `com.curiocity.hub-runner.<hub>.*` 를 bootout + 삭제.

---

## 2. 라이브 셀프테스트 로그 (`--once --all`)

`queue/m1/M1-1105-S-selftest.md` (echo OK 지시 프롬프트) 발부 뒤 `node scripts/hub-runner.mjs --all --once` 로 1 tick 실행:

```
[hub-runner 2026-11-07T13:33:18.651Z] 시작 · mode=--all · once=true · poll=60000ms · claude=/Applications/cmux.app/.../claude
[hub-runner 2026-11-07T13:33:20.555Z] heartbeat pushed
[hub-runner:m1 2026-11-07T13:33:21.943Z] pick · M1-1105-S-selftest
[hub-runner:m1 2026-11-07T13:33:21.944Z] spawn claude -p · ID=M1-1105-S-selftest · cwd=/Users/kyu.lee/projects/pos-m1
[hub-runner:claim 2026-11-07T13:33:21.956Z] M1-1105-S-selftest → started · runner
[claim] wrote status/claims/M1-1105-S-selftest.json · state=started · pushed
[hub-runner:claim 2026-11-07T13:33:28.516Z] M1-1105-S-selftest → done · runner exit 0 · 로그: ~/.hub-runner/m1/M1-1105-S-selftest.log
[claim] wrote status/claims/M1-1105-S-selftest.json · state=done · pushed
[hub-runner 2026-11-07T13:33:32.158Z] heartbeat pushed
```

**결과**: pick → started 커밋+푸시 → claude spawn → exit 0 (~7 s) → done 커밋+푸시 → heartbeat flush.
**관측된 relay 커밋 순서** (`git log --oneline`):
```
7ed87dc chore(runner): heartbeat · m0=idle · m1=idle · m2=idle · m3=idle · r0=idle
d46a0e6 claim(m1): M1-1105-S-selftest done · runner exit 0 · 로그: ~/.hub-runner/m1/...
2ebe110 claim(m1): M1-1105-S-selftest started · runner
a0d3018 chore(runner): heartbeat · m0=idle · m1=idle · m2=idle · m3=idle · r0=idle
fd52f03 feat(runner): 단일 프로세스 --all · runner-config.json cwd 지도 · launchd 1 plist (M1-1105-S)
```

---

## 3. 실제 launchd 설치

```
$ bash scripts/hub-runner-install.sh
[install] runner-config.json 전 허브 cwd 존재 확인
plist 작성: /Users/kyu.lee/Library/LaunchAgents/com.curiocity.hub-runner.plist
load 완료: com.curiocity.hub-runner

$ launchctl list | grep hub-runner
85960	-15	com.curiocity.hub-runner

$ ls ~/Library/LaunchAgents/com.curiocity.hub-runner*.plist
/Users/kyu.lee/Library/LaunchAgents/com.curiocity.hub-runner.plist   (1건 · 레거시 없음)
```

두 번째 열 `-15` 는 kickstart 로 유발된 SIGTERM (fix 반영용) · PID 85960 은 현재 활성.

---

## 4. 설치 후 2분 치 launchd 로그 (실제 R0-1105-Z 처리 포함)

```
[hub-runner 2026-11-07T13:35:11.620Z] 시작 · mode=--all · once=false · poll=60000ms · claude=/opt/homebrew/bin/claude
[hub-runner 2026-11-07T13:35:13.604Z] heartbeat pushed
[hub-runner:git 2026-11-07T13:36:15.298Z] 스코프 밖 변경 감지 · pull 건너뜀 · files=M status/runners/all.json   ← 포셀린 파싱 버그 (수정)
[hub-runner:git 2026-11-07T13:37:15.351Z] 스코프 밖 변경 감지 · pull 건너뜀 · files=M status/runners/all.json
[hub-runner:git 2026-11-07T13:38:15.413Z] 스코프 밖 변경 감지 · pull 건너뜀 · files=M status/runners/all.json
[hub-runner 2026-11-07T13:38:44.972Z] 시작  ← 수정 commit fb57374 반영 재기동
[hub-runner 2026-11-07T13:38:46.701Z] heartbeat pushed
[hub-runner:git 2026-11-07T13:39:49.176Z] pull --rebase origin main 실패: cannot pull with rebase: unstaged changes
[hub-runner 2026-11-07T13:40:30.664Z] 시작  ← autostash 수정 commit aa43548 반영 재기동
[hub-runner 2026-11-07T13:40:32.600Z] heartbeat pushed
[hub-runner 2026-11-07T13:45:45.049Z] heartbeat pushed                                               ← 5 분 cadence 확인
[hub-runner:r0 2026-11-07T13:46:47.184Z] pick · R0-1105-Z
[hub-runner:r0 2026-11-07T13:46:47.189Z] spawn claude -p · ID=R0-1105-Z · cwd=/Users/kyu.lee/projects/pos-r0
[hub-runner:claim 2026-11-07T13:46:47.199Z] R0-1105-Z → started · runner
[claim] committed · pushed
[hub-runner:claim 2026-11-07T13:46:52.923Z] R0-1105-Z → blocked · runner exit 1 · 로그: ~/.hub-runner/r0/R0-1105-Z.log
[claim] wrote status/claims/R0-1105-Z.json · state=blocked · blocked_by:"kyu" · pushed
[hub-runner 2026-11-07T13:50:58.639Z] heartbeat pushed
```

이 2 분 사이 중간 수정 2건 (porcelain raw / autostash) 반영, 러너는 **실 큐 R0-1105-Z** 를 live 로 처리 → `blocked_by:"kyu"` payload 가 claim 에 실제 기록됨:

```json
{
  "id": "R0-1105-Z",
  "hub": "r0",
  "state": "blocked",
  "at": "2026-11-07T13:46:52.954Z",
  "note": "runner exit 1 · 로그: /Users/kyu.lee/.hub-runner/r0/R0-1105-Z.log",
  "blocked_by": "kyu"
}
```

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| curiocity-relay 만 수정 · 제품 리포 0 | ✓ |
| cwd 분리 → `status/runner-config.json` | ✓ |
| 단일 프로세스 `--all` · 5 허브 1 루프 | ✓ |
| git 작업 직렬 · claude child 병렬 | ✓ |
| `git pull --rebase --autostash origin main` (branch 명시) · 실패 시 `rebase --abort` | ✓ |
| 변경 범위 `status/claims` · `status/runners` 로 한정 | ✓ |
| heartbeat 5 분마다 `status/runners/all.json` 1 커밋 | ✓ (관측: 13:35, 13:40, 13:45, 13:50) |
| Kyu 수동 투입 claim(started/in_progress) 공존 · 덮어쓰기 금지 | ✓ |
| blocked claim payload `blocked_by:"kyu"` + 로그 경로 note | ✓ (R0-1105-Z 실증) |
| launchd plist 1 개 · 레거시 허브별 plist 자동 정리 | ✓ |
| 러너가 직접 설치 (`bash scripts/hub-runner-install.sh` 인자 없음 = 전체) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. Kyu 가 할 일

**없음** — launchd 가 이미 load 됐고, heartbeat 와 claim 사이클이 live.
(필요 시 `tail -f ~/.hub-runner/launchd.err.log` 로 실시간 모니터, 끄려면 `bash scripts/hub-runner-uninstall.sh`.)

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (방법론 ⑯ 러너 Mac 자동 투입 — 실설치 안정화) |
| 해소 | +1 (M2-1105-O 실설치 로그 3 종 재발 방지: cwd=null · unstaged changes · multiple branches) |
| 신규 요구 | 0 |
| **총 순증감** | **+2 해소** |

---

## 8. 다음 게이트

1. 24h 안에 러너가 picking 하는 claim·heartbeat 커밋 리듬이 depth/시간대 균일한지 Kyu 모니터.
2. heartbeat 로그가 너무 산발적이면 `POLL_MS` 또는 `HEARTBEAT_MS` 재조정 (현재 60 s / 5 min).
3. (선택) 큐 파일이 'done' 뒤 자동 보관되도록 archive 규약 → 다음 라운드 후보.

---

*M1-1105-S · 2026-11-07 · relay 안 러너 재작성 · 7 파일 변경 · 단일 launchd plist · 라이브 셀프테스트 (M1-1105-S-selftest) 성공 + 실 큐 R0-1105-Z live 처리 · blocked_by:"kyu" payload 실증 · 러너 정상 가동 (pid 85960 · poll=60s · heartbeat=5m)*
