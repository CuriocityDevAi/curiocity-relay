FIXED

## M1-1125-F — fork 러너 오프라인 원인·조치·진단

### 1. 오프라인 원인

**MacBook 수면 → TLS 연결 절단 → Runner.Listener 지수 backoff**

- `runsvc.sh` + `Runner.Listener` 프로세스는 살아있었음 (launchd가 재시작):
  - `curiocity-mac-fork`: PID 47222 (Mon Nov 24 04PM KST 기동)
  - `curiocity-mac-fork-light`: PID 89708 (Mon Nov 24 08PM KST 기동)
- 그러나 MacBook 수면 중 TLS 소켓이 끊기면서 `SocketException (89): Operation canceled` 발생
- Runner.Listener가 BrokerServer long-poll 에러 후 지수 backoff에 돌입:
  - `curiocity-mac-fork`: 2026-11-25 03:20Z 기준 **backoff 14,851초 (≈ 4.1시간)**, 4 attempt left
  - `curiocity-mac-fork-light`: 2026-11-25 03:14Z 기준 **backoff 5,112초 (≈ 85분)**, 4 attempt left
- backoff 중에는 GitHub에 heartbeat/long-poll 없음 → GitHub 쪽에서 `offline` 표시
- 프로세스 종료가 아닌 **연결 복구 대기 상태**가 오프라인의 원인

**_diag 로그 근거**
```
[2026-11-25 03:20:35Z ERR  BrokerServer] SocketException (89): Operation canceled
[2026-11-25 03:20:35Z WARN BrokerServer] Back off 14,851 seconds before next retry. 4 attempt left.
# (fork-light: 03:14Z, back off 5,112s)
```

---

### 2. 조치 — launchctl kickstart -k

```bash
launchctl kickstart -k gui/502/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork
launchctl kickstart -k gui/502/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light
```

- 기존 Runner.Listener 프로세스 종료 후 launchd가 새 프로세스 기동
  - 신규 PID: `curiocity-mac-fork` → 61978, `curiocity-mac-fork-light` → 62059
- GitHub API (`gh api repos/CuriocityDevAi/agilo-medusa-pos-fork/actions/runners`) 확인 결과:

```json
{"id":21,"name":"curiocity-mac-fork","status":"online","busy":false}
{"id":22,"name":"curiocity-mac-fork-light","status":"online","busy":false}
```

조치 완료: **두 러너 모두 `online`**

---

### 3. gh-watchdog "data-partial" 진단

**한 줄 진단**: gh-watchdog가 이 상황을 못 잡은 직접 원인은 `data-partial` 스킵이 아니라, **fork 러너 경로가 watchdog 모니터링 대상 자체에 없었기 때문**이다.

**상세**:

1. `DEFAULT_RUNNER_PATHS` = `{ 'mac-heavy': '~/actions-runner/svc.sh', 'mac-light': '~/actions-runner-light/svc.sh' }` — storeport 러너 2대만 등록, fork 러너는 미포함.
2. `runOnce()`의 `for (const kind of ['mac-heavy', 'mac-light'])` 루프 — fork/fork-light 는 순회 대상에 없음.
3. 따라서 `data-partial` 스킵이 없어도 fork 러너는 watchdog에 의해 재시작되지 않는다.
4. `data-partial` 스킵은 ci-health API가 부분 응답을 반환할 때 storeport 러너 재시작도 함께 막는 별도 문제. 현재 반복 발생 중이라면 ci-health 쿼리 타임아웃·budget 부족 여부 확인 필요.

**권장 수정 (코드 수정 없이 설정 변경으로 해결 가능)**:

```
hub-runner tick 에서 runOnce() 호출 시 opts.runnerPaths 에 fork 러너 추가:
  'mac-fork':       '~/actions-runner-fork/svc.sh'
  'mac-fork-light': '~/actions-runner-fork-light/svc.sh'

그리고 judgeStuck() 에서 사용하는 ciData 풀 키(heavy/light)도
fork 러너 전용 풀 데이터를 ci-health 가 제공하도록 연동 필요.
```

`data-partial` 반복 발생 개선안: ci-health getLatestCi() 의 deadline/budget 를 늘리거나,
partial 시에도 "in_progress 가 0 이고 Runner.Worker 없음" 조건이 성립하면 재시작 허용하는
`partial-but-safe` 옵션 추가 (현재 보수적 설계상 코드 수정 필요).

---

### 요약

| 항목 | 내용 |
|------|------|
| 오프라인 원인 | MacBook 수면 후 TLS 소켓 절단 → SocketException → 지수 backoff (최대 4시간) |
| 프로세스 상태 | runsvc.sh + Runner.Listener 모두 생존, backoff 대기 중이었음 |
| 조치 | `launchctl kickstart -k` 2회 — 03:29Z UTC 완료 |
| 조치 결과 | curiocity-mac-fork, curiocity-mac-fork-light 모두 `online` |
| watchdog 미검출 원인 | fork 러너가 DEFAULT_RUNNER_PATHS에 미등록 (data-partial은 부차 문제) |
