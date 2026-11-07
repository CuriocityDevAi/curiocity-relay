---
round: M2-1105-O
pr: null
outcome: 큐 자동 투입 러너(hub-runner) 신설 · M2 selftest 라이브 성공 · 제품 리포 수정 0
kyu_checks: 1 (허브별 1회 `bash scripts/hub-runner-install.sh <hub>` + `tail -f ~/.hub-runner/<hub>/launchd.err.log` 확인)
---

# M2-1105-O · hub-runner · 큐 자동 투입 Mac 러너

**일자**: 2026-11-07 · **허브**: M2 · **방법론**: ⑯ (프롬프트 상태판·claims 신호) · **결정**: Kyu 2026-11-07 "A안 Mac 러너 · skip-permissions"

## 1. 산출물 (curiocity-relay 만)

| 파일 | 역할 |
|------|------|
| `scripts/hub-runner.mjs` (신규 · Node 22 · 의존 0) | 60s polling · queue 집어 claude spawn · claim 자동 갱신 · 허브당 동시 1개 (lock) · 5m heartbeat |
| `scripts/hub-runner-install.sh` (신규) | launchd plist `com.curiocity.hub-runner.<hub>` 생성+load (RunAtLoad · KeepAlive) |
| `scripts/hub-runner-uninstall.sh` (신규) | plist bootout + 파일 제거 · lock 정리 |
| `scripts/build-hubs.mjs` | OWNER_PRESERVED_KEYS 에 `cwd` 추가 (runner 참조) |
| `docs/hub-runner.md` (신규) | 큐 규약 · 사이클 · Kyu 3줄 · 디버그 · 파일 지도 |
| `status/hubs.json` | m0/m1/m2/m3/r0 에 `cwd` 절대 경로 세팅 |
| `queue/m2/M2-1105-O-selftest.md` (파일럿) | 7줄 echo 전용 프롬프트 |
| `status/claims/M2-1105-O-selftest.json` | 파일럿 결과 (runner 가 자동 기록) |
| `status/runners/m2.json` | 파일럿 heartbeat |

**제품 리포 수정 0** (storeport · fork 둘 다 untouched).

## 2. 큐 규약

- 파일: `queue/<hub>/<ID>.md` (hub ∈ m0|m1|m2|m3|r0 · 본문 = 프롬프트 원문 · 첫 줄 "허브-월일-알파벳 (ID)")
- 발부 = 오케 git commit
- 취소 = 파일 삭제 또는 `status/claims/<ID>.json` state=cancelled

## 3. 러너 동작 (hub-runner.mjs)

1. 60s poll · `git pull --rebase --quiet`
2. `queue/<hub>/*.md` 스캔 → claim 없거나 `issued` 상태인 것 중 **파일명 최솟값** 1개 선택
3. `node scripts/claim.mjs <ID> started "runner"` (커밋+푸시)
4. `claude -p "<본문>" --dangerously-skip-permissions` spawn in `hubs.json[hub].cwd`
   - stdout/stderr → `~/.hub-runner/<hub>/<ID>.log`
5. exit 0 → claim **done** / exit N → claim **blocked (blocked_by: kyu)**
   - **허브가 이미 done/blocked/cancelled 올렸으면 덮어쓰지 않음** (spawn 전후 `git pull` 재확인)
6. 허브당 lock `~/.hub-runner/<hub>.lock` (stale 10분 자동 해제)
7. Heartbeat `status/runners/<hub>.json {at, pid, current}` 5분마다 (변화 없으면 chore 커밋 생략)

## 4. M2 selftest 파일럿 (라이브 성공)

### 큐 파일 (`queue/m2/M2-1105-O-selftest.md`)

```
허브-1107-O-selftest (M2-1105-O-selftest)

This is a self-test for the curiocity-relay hub-runner (M2-1105-O).
Instructions: reply with the single word "OK" on its own line, then stop.
Do not call any tools. Do not modify any files. Do not navigate anywhere.
The runner expects exit code 0 and will mark the claim as done automatically.
```

### 러너 로그 (수동 `--once`)

```
[hub-runner:m2 2026-11-07T10:09:17Z] loop 시작 · poll=60000ms · hub cwd=/Users/kyu.lee/projects/pos-m2
[hub-runner:m2 2026-11-07T10:09:19Z] heartbeat pushed · current=idle
[hub-runner:m2 2026-11-07T10:09:19Z] pick · M2-1105-O-selftest
[hub-runner:m2 2026-11-07T10:09:21Z] heartbeat pushed · current=M2-1105-O-selftest
[hub-runner:m2 2026-11-07T10:09:21Z] claim M2-1105-O-selftest → started
[claim] committed · pushed
[hub-runner:m2 2026-11-07T10:09:23Z] spawn claude -p · cwd=/Users/kyu.lee/projects/pos-m2
[hub-runner:m2 2026-11-07T10:09:30Z] claim M2-1105-O-selftest → done
[claim] committed · pushed
[hub-runner:m2 2026-11-07T10:09:34Z] heartbeat pushed · current=idle
```

총 **17 초** 안에 queue 감지 → started claim → claude spawn → OK 응답 → exit 0 → done claim → idle 복귀.

### claude 실행 로그 (`~/.hub-runner/m2/M2-1105-O-selftest.log`)

```
# hub-runner log · M2-1105-O-selftest
started_at: 2026-11-07T10:09:23.588Z
hub: m2
cwd: /Users/kyu.lee/projects/pos-m2
claude: /Applications/cmux.app/Contents/Resources/bin/claude
log: /Users/kyu.lee/.hub-runner/m2/M2-1105-O-selftest.log
--- stdout+stderr ---
OK

--- stderr ---

--- exit 0 ---
```

### 산출 claim (`status/claims/M2-1105-O-selftest.json`)

```json
{
  "id": "M2-1105-O-selftest",
  "hub": "m2",
  "state": "done",
  "at": "2026-11-07T10:09:30.939Z",
  "note": "runner exit 0 · 로그: /Users/kyu.lee/.hub-runner/m2/M2-1105-O-selftest.log"
}
```

### 산출 heartbeat (`status/runners/m2.json`)

```json
{
  "at": "2026-11-07T10:09:32.961Z",
  "pid": 56843,
  "hub": "m2",
  "current": null
}
```

### Lock 정리

`ls ~/.hub-runner/*.lock` → 결과 없음 · 정상 해제 확인.

## 5. launchd 설치 상태

- **launchd 설치 안 함 (본 라운드)** · 파일럿은 수동 `--once` 로 종단간 성공 확인.
- 이유: Kyu 가 "A안 Mac 러너" 라고 결정했으나 각 허브는 Kyu Mac 에 설치해야 함. 본 세션은 M2 Claude 안에서 돌고 있으므로 launchd 를 지금 설치해도 세션 외 Mac 상태만 바뀜 → Kyu 가 직접 실행하는 편이 안전.

## 6. Kyu 설치 (허브별 한 줄 · 쉬운 말 3줄)

```bash
cd ~/projects/curiocity-relay
bash scripts/hub-runner-install.sh m2          # m2 자리에 m0/m1/m2/m3/r0 중 하나
tail -f ~/.hub-runner/m2/launchd.err.log       # 작동 확인 (Ctrl+C 로 빠져나오기)
```

**끄기**: `bash scripts/hub-runner-uninstall.sh m2`
**로그**: `~/.hub-runner/<hub>/launchd.*.log` (전체) · `~/.hub-runner/<hub>/<ID>.log` (라운드별)

허브 전부 (5개) 켜려면 5번 반복:
```bash
for hub in m0 m1 m2 m3 r0; do bash scripts/hub-runner-install.sh $hub; done
```

## 7. 보안

- 큐 파일 · 로그 · claim · heartbeat 전부 **public relay 리포에 커밋**. **시크릿 금지**.
- `--dangerously-skip-permissions` 는 허브 리포 내부에서만 작용. Kyu 가 발부한 프롬프트만 신뢰.
- 러너 = Kyu Mac 의 claude session (현재 cmux 경유 `/Applications/cmux.app/.../claude` v2.1.128).

## 8. 검증 요약

| 체크 | 결과 |
|------|------|
| 러너 1-tick (`--once`) | ✓ 17s · pick → spawn claude → exit 0 → done |
| 큐 파일 발부 → claim 자동 갱신 | ✓ (started → done · 둘 다 commit+push) |
| heartbeat 커밋 · 변화 없으면 skip | ✓ (current idle→selftest→idle 3번 커밋) |
| lock 정리 | ✓ (파일럿 뒤 lock 파일 0개) |
| 허브 cwd 리졸브 (`hubs.json.cwd`) | ✓ `/Users/kyu.lee/projects/pos-m2` |
| 제품 리포 수정 | ✓ 0 (storeport · fork untouched) |

## 9. 범위 밖 (후속)

- launchd 실설치는 Kyu (허브 Mac 에서 1회)
- claude -p 가 Kyu session API key 를 그대로 쓰므로 rate limit · 비용 관찰은 별건
- queue 디렉토리 자동 cleanup (done 뒤 archive) · 지금은 수동

## 10. 참고

- relay 커밋: `99a788c` (runner 신설) · `f908500` (selftest queue) · 이후 claim/heartbeat 자동 커밋 다수
- 선행: M2-1105-N (`scripts/claim.mjs` + `build-hubs.mjs` claims 머지)
- 결정 로그: Kyu 2026-11-07 "발부한 프롬프트 자동 투입 — A안 Mac 러너 · 허브는 이미 skip-permissions 모드"
