M2-1121-A-report

①러너 단절: Mac 메모리 14.78GB→15.93GB(peak) 중 storeport:main heavy-mac 동시 실행 + npm ci 메모리 압박으로 WebSocket heartbeat 단절 · ②route 6분: route job이 curiocity-mac-fork(heavy) 에서 실행되어 Mac OOM 복구 중 checkout 행 → 6분 timeout · ③fork overflow 없음(고장): route job이 Mac heavy 러너에서 실행되므로 Mac 바쁠 때 route 자체 큐 대기 → cloud 판단 불가 · 수정 PR #221

---

## ① lint runner 단절 (run 44724062134)

**run**: 44724062134 · PR #218 · job lint (ID 136246888423)
**시각**: 2026-11-20 11:27:27Z 시작 → 11:37:29Z 완료 (10m2s)
**러너**: curiocity-mac-fork

**근거 로그**: `~/actions-runner-fork/_diag/Worker_20261120-112729-utc.log` 末尾 L6540:
```
Runner websocket probe result: {
  "connected":true,
  "connectFailures":1,
  "lastCloseReason":"connect_failed",
  "totalDurationMs":165243,
  "errors":["The remote party closed the WebSocket connection without completing the close handshake."]
}
```
- `totalDurationMs:165243` ≈ 2분 45초 → 11:27Z + 2:45 ≈ **11:30Z 경 WebSocket 단절**
- npm ci 는 11:28~11:30Z 사이 실행 중 (checkout+setup-node 직후)
- L6554: `Job result: Canceled` (GitHub가 connection lost로 강제 취소)

**메모리**:
- `status/runners/mem-log.ndjson`: 2026-11-20T11:26:03Z `used_gb:14.78` (전체 16GB → **92%**)
- `status/runners/all.json` `mem_peak_today.used_gb`: **15.93GB**
- 같은 시각 `ci.data.heavy.in_progress`: storeport:main heavy-mac (Youngkyus-MacBook-Pro-M1) 동시 실행

**원인**: 두 heavy CI job (storeport:main + fork:#218 lint) 동시 실행 + npm ci node_modules 압축 해제 → 메모리 15.6GB+ → macOS 네트워크 스택 지연 → WebSocket heartbeat 실패.

**CI 설정으로 해결 가능 여부**: 불가. 메모리 증설 또는 동시 실행 제한(ops 사항).
**CI 조치**: lint job에 `timeout-minutes: 15` 추가 (무한 행 방지 — 연결 단절 시 15분 내 clean fail).

---

## ② route 6분 초과 (run 44724062325)

**run**: 44724062325 · PR #218 · job route (ID 136246890643)
**시각**: 2026-11-20 12:59:09Z 시작 → 13:10:09Z 완료 (11m0s, timeout 6m)
**러너**: curiocity-mac-fork (heavy runner!)

**근거 로그**: `Worker_20261120-125911-utc.log`
- 12:59:11Z: 잡 시작 · step 1 (Set up job) 성공
- step 2 (checkout): 6분간 행 → timeout 발동
- 13:14:45Z: `Socket Error: ConnectionReset` (timeout 후 teardown 중)
- 13:25:00Z~13:31:47Z: `VssUnauthorizedException: not authorized` (token 만료 · 15분 cleanup)
- 13:31:49Z: `Job not found` / Worker 종료

**근거 직접**: route job `runs-on: curiocity-mac-fork` — 직전 lint OOM 복구 중인 동일 Mac 러너에서 실행되어 checkout git 작업 행.

**storeport 대조**:
```
storeport ci.yml route:
  runs-on: curiocity-mac-light   ← 별도 경량 러너, 항상 즉시 실행
  timeout-minutes: 3

fork ci.yml route (수정 전):
  runs-on: curiocity-mac-fork    ← heavy 러너와 동일, Mac 바쁘면 큐 대기
  timeout-minutes: 6
```

**근본 원인**: route job이 감시 대상인 heavy 러너(curiocity-mac-fork) 위에서 직접 실행되는 설계 결함.

---

## ③ fork overflow 없음/고장

**relay 스냅샷 (2026-11-20T23:44:22Z)**:
```json
{
  "heavy": {
    "queued": 5,
    "oldest_queued_pr": "fork:#218",
    "oldest_queued_min": 10,
    "in_progress": [
      { "pr_display": "storeport:main", "runner": "Youngkyus-MacBook-Pro-M1" },
      { "pr_display": "fork:master",    "runner": "curiocity-mac-fork" }
    ]
  },
  "cloud_in_progress": [],
  "cloud_today": 0
}
```

fork:#218 heavy 가 10분째 queued, 클라우드 미사용.

**원인**: `ci.yml` route job의 `runs-on: curiocity-mac-fork`. fork:master lint가 curiocity-mac-fork를 점유 중 → fork:#218의 route job도 동일 러너에서 실행 대기 → route script 실행 불가 → `cloud_today=0` 유지.

**fork 러너 목록** (`gh api repos/agilo-medusa-pos-fork/actions/runners`):
```
curiocity-mac-fork (id:21) — heavy, 현재 busy
(curiocity-mac-light 미등록)
```

storeport에는 `curiocity-mac-light` (id:22, idle)이 별도 등록됨.
fork에는 light 러너 없음 → route를 `ubuntu-latest`로 대체.

---

## 수정 내용 (PR #221)

**브랜치**: `ci/M2-1121-A-fork-route-runner`
**커밋**: 9b97a48
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/221

### ci.yml 변경
```diff
- runs-on: ${{ fromJSON(inputs.force_cloud == true && '"ubuntu-latest"' || '["self-hosted","curiocity-mac-fork"]') }}
- timeout-minutes: 6
+ runs-on: ubuntu-latest
+ timeout-minutes: 3
```

### lint.yml 변경
```diff
  lint:
    runs-on: [self-hosted, curiocity-mac-fork]
+   timeout-minutes: 15
```

**실측**: 미검증 (45분 상한).
Kyu 확인 방법: PR merge 후 Mac busy 타이밍 (또는 `workflow_dispatch force_cloud=true`) 으로 CI 트리거 → route job이 ubuntu에서 즉시 실행되는지, 클라우드로 overflow되는지 확인.

---

## Kyu ops 참고사항 (CI 외)

- **curiocity-mac-light fork 등록**: `~/actions-runner-fork` 에 light 용 별도 러너 추가 시 storeport와 동일 구조 가능. 현재는 ubuntu-latest 로 대체.
- **동시 실행 메모리**: storeport:main + fork:#218 동시 heavy CI → Mac 15.6GB+ 압박. 순서 직렬화(concurrency group 공유) 또는 Mac 메모리 증설 고려.
- **lint.yml 클라우드 fallback**: lint도 overflow가 필요하면 ci.yml route 패턴 도입 가능 (별도 티켓).
