# M2-1105-U · hub-runner v6 → v6.1 패치 리포트

날짜: 2026-11-10 (KST) · 모델: opus · 러너: v6 그대로 돌림, v6.1 새 파일.
스펙: `queue/m2/M2-1105-U.md` (task 설명)

## 1. 수정 요약 (scripts/hub-runner-v6.1.mjs 신파일 · node --check ✓)

| # | 이슈 | v6 위치 | v6.1 수정 |
|---|------|---------|-----------|
| ① | 프롬프트 상대경로 (`queue/<hub>/<id>.md`) → 허브 cwd 에 queue/ 없어 claude 가 'file not found' 뒤 입력 대기 | `scripts/hub-runner-v6.mjs:463` (cmux-tab promptMsg) · `:469` (cmux-tab echo) · `:694` (cmux-split promptMsg) · `:702` (cmux-split echo) | `queueFileAbs(hub, id)` = `<REPO_ROOT>/queue/<hub>/<id>.md` 절대경로 사용 (`hub-runner-v6.1.mjs:395`, `:636` 등 · echo 줄도 동일 절대경로) |
| ② | 60m timeout 미발동 — busy 가 메모리 전용이라 러너 재시작/크래시 후 waitForLanding 타이머 사멸, tick() 재진입 시 "started" claim 을 복구하는 경로 없음 | `scripts/hub-runner-v6.mjs:1021` (`if (!item) continue;` 러너가 'started' claim 을 발견해도 재픽 안 함 — pickNext 는 state==='issued'·null 만 반환 (`:261`) · busy 가 메모리라 crash 후 복구 불가) | `recoverStuckStartedClaims()` 신규 (`hub-runner-v6.1.mjs:829`) · 매 tick 진입 직후 (`hub-runner-v6.1.mjs:1004` `await recoverStuckStartedClaims(...)`) 허브별 최신 "started" claim 스캔 → `at` 기준 elapsed > run_timeout_ms 면 pane C-c ×2 + claim blocked ("timeout 60m · 재시작 복구") + 재처리 마크(~/.hub-runner/recovery/<id>.done)로 중복 방지 |
| ③ | Hubs 탭 중복 생성 — `hubsWorkspaceStillValid` 가 저장된 pane 한 개라도 사라지면 전체 무효 판정, `buildHubsWorkspace` 가 이름 검색 없이 new-workspace 호출 | `scripts/hub-runner-v6.mjs:556` (`hubsWorkspaceStillValid`) · `:568` (`buildHubsWorkspace`) | `ensureHubsLayout` (`hub-runner-v6.1.mjs:490`) 저장 layout 무효 시 `listHubsWorkspaces()` (`:457`) 로 이름 "Hubs" 탭을 찾아 가장 오래된 1개 (`workspace:<작은번호>`) 를 재사용 · 기존 pane 은 surface 타이틀 (`M0 · idle` 등) 로 hub 매핑 · 빠진 hub 만 그 탭 안에서 `new-split` 으로 채움 · 동명 탭이 여러 개면 가장 오래된 1개만 사용, 나머지 건드리지 않음 (수동 close 몫으로 남김) · `new-workspace` 는 "Hubs" 가 하나도 없을 때만 (`:502`) |

### 추가 (v6.1 신규 selftest · 모두 통과 ✓)

- `--selftest-split`: m2 pane 에서 echo + report 파일 쓰기. prompt/echo 에 **절대경로 포함** 여부 재확인.
- `--selftest-timeout`: m2 pane 에 `sleep 300` 보내고 run_timeout 을 임시 60s 로 두어 C-c 2회 + pane blocked 실증 (config 의 `run_timeout_min` 은 변경 없음).
- `--selftest-layout`: 저장 layout 손상 → `ensureHubsLayout` 이 "Hubs" 중 가장 오래된 (workspace:16) 재사용 · 신 workspace 생성 안 함 · 그 pane 안에서 작업 1건 실행 → report 착지 성공 · **원본 layout 자동 복원** (실행 중 v6 러너 혼선 방지).

## 2. 셀프테스트 로그 (로컬 실측 2026-11-09)

### 2-1. `--selftest-split --hub m2 --id M2-1105-U-selftest`

```
$ node scripts/hub-runner-v6.1.mjs --selftest-split --hub m2 --id M2-1105-U-selftest
selftest-split OK · hub=m2 · id=M2-1105-U-selftest · landing=report · pane=surface:39

$ cat m2/M2-1105-U-selftest-report.md
# M2-1105-U-selftest selftest report

hub: m2
pane: surface:39
queue_file_abs: /Users/kyu.lee/projects/relay-m1/queue/m2/M2-1105-U-selftest.md
runner: v6.1 cmux-split selftest
```

report 안의 `queue_file_abs` 가 **절대경로** 로 찍혔음 → ① 수정 실증.

### 2-2. `--selftest-timeout --hub m2 --id M2-1105-U-timeout`

```
$ node scripts/hub-runner-v6.1.mjs --selftest-timeout --hub m2 --id M2-1105-U-timeout
[selftest-timeout] OK · 60s 초과 → C-c 2회 송신 · pane blocked · sleep 중단 확인
```

pane 안에 `sleep 300` 보냈는데 60s 뒤 C-c 2회 전달돼 중단 → ② 수정 실증 (`run_timeout_min` 설정은 테스트용 60s hardcode, config 는 60분 그대로).

### 2-3. `--selftest-layout --hub m2 --id M2-1105-U-layout`

```
$ node scripts/hub-runner-v6.1.mjs --selftest-layout --hub m2 --id M2-1105-U-layout
[selftest-layout] 저장 layout 손상 (모든 surfaceRef → surface:999999) · 이전 workspaceRef=workspace:17
[selftest-layout] 재사용 대상 "Hubs" 탭 5 개: workspace:16,workspace:17,workspace:18,workspace:19,workspace:20
[selftest-layout] 복구 layout · workspaceRef=workspace:16 · reused=true
[selftest-layout] panes=m0=surface:30 · m1=surface:32 · m2=surface:33 · m3=surface:31 · r0=surface:34
[selftest-layout] OK · 재사용 workspace=workspace:16 · 신 workspace 생성 안함 · report landing 성공
[selftest-layout] 원본 layout 복원 완료 (workspaceRef=workspace:17)
```

→ layout 손상돼도 신 workspace 생성 없이 **가장 오래된 (workspace:16) 재사용**, 해당 workspace 의 기존 M2 surface:33 pane 에 작업 보내고 report 착지 → ③ 수정 실증.

## 3. Hubs 중복 탭 정리 (현재 실측)

```
* workspace:17  Hubs  [selected]   ← 활성, 현재 가동 (m3=M3-1105-Y 실행 중 · 5 pane 모두 보유)
  workspace:20  Hubs                ← 1 pane (surface:46 "~/projects/curiocity-relay") · 셀프테스트 중 v6 러너 경합으로 생성
  workspace:19  Hubs                ← 1 pane · 동일 사유
  workspace:18  Hubs                ← 1 pane · 동일 사유
  workspace:16  Hubs                ← 5 pane 보유 (옛 m0-r0 라벨) · 활성이 아닌 과거 흔적 (셀프테스트에서 재사용 검증용으로만 접촉)
```

**닫아도 되는 탭**: `workspace:16`, `workspace:18`, `workspace:19`, `workspace:20` 4개 전부. `workspace:17` 만 유지하면 됨.

- 17 은 현재 v6 러너가 활성으로 쓰고 있는 Hubs (현재 m3=M3-1105-Y 실행 중 · M0 idle · M1 idle · M2 idle (방금 M2-1105-U-timeout 셀프테스트 뒤 blocked 타이틀 남아있을 수 있음) · R0 ✓ R0-1105-AM).
- 16 은 그 전 v6 build 때의 Hubs, 셀프테스트에서 "가장 오래된 재사용" 로직 시연용으로 접촉했지만 현재 러너가 보지 않음.
- 18/19/20 은 셀프테스트 중 v6 러너가 저장 layout 을 무효로 본 순간 `buildHubsWorkspace` 가 중복 생성한 흔적. v6.1 로 교체하면 재발 안 함.

cmux UI 에서 각 탭 우클릭 → Close (또는 `cmux close-workspace --workspace workspace:16` 등) 로 닫으면 됨. **활성 탭 workspace:17 은 건드리지 말 것.**

## 4. 상태판 자동 반영 조사 (코드 수정 X · Kyu 질문 답변)

### (a) Mac 러너 → claude.ai 상태판 DB 직접 쓰기 공식 경로?

**없음.** claude.ai 의 artifact/doc 편집은 MCP 서버 (`claude.ai Claude Docs`) 를 통해 가능하지만, launchd daemon 에서 유지 가능한 공개 API 가 아님 · 사용자 세션 쿠키 또는 Anthropic account OAuth refresh token 이 필요. 쿠키는 만료 시 수동 재인증 필요 → unattended Mac 러너에선 지속 운용 비현실. (현 러너가 `security`/키체인 접근 금지 라인과 충돌하므로 애초 범위 밖.)

### (b) 상태판 페이지가 raw `status/claims/*.json` 을 읽는 방식 — 제약?

실측 (2026-11-09 22:05 UTC):

```
$ curl -sI -H "Origin: https://claude.ai" \
    https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/status/hubs.json
HTTP/1.1 200 OK
Cache-Control: max-age=300
ETag: "1baa71f71fd1ebbbfdc4f6996fed38126e31cde8f1387b1e3a59e874640ab980"
Access-Control-Allow-Origin: *
X-Cache: HIT
```

- **CORS**: `Access-Control-Allow-Origin: *` → claude.ai artifact (iframe/fetch) 에서 cross-origin 읽기 OK.
- **캐시**: `Cache-Control: max-age=300` → 5분 CDN 캐시 · ETag 조건부 요청으로 304 응답 가능 (bandwidth 절약).
- **레이트**: raw.githubusercontent.com 비인증 IP 당 ≈ 60 req/hr. 상태판 1회 새로고침 = 허브별 json N개면 N 요청. 5 허브 × 20회/시간 polling = 100 req/hr → **초과 위험**. 인증 토큰 (PAT) 쓰면 5000/hr 로 완화.
- **데이터 신선도**: push → CDN 반영까지 최대 ~5분. 짧게 보려면 쿼리 cache-buster (`?t=<timestamp>`) 로 강제 miss 가능하나 rate limit 소비 증가.

### 권장안 (3 줄)

1. **(a) 는 접지 않음**: Mac 러너가 claude.ai 상태판 DB 에 직접 쓰는 길은 공식적으로 없음 · 러너는 지금처럼 `status/claims/*.json` 을 commit·push 까지만.
2. **(b) 로 가되 CORS 는 OK**: 상태판 artifact 가 `raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/status/claims/*.json` 을 `fetch` + `If-None-Match` (ETag) + `?t=<yyyymmddHHMM>` 조합으로 60초 polling.
3. **레이트·신선도 보완**: `status/claims/index.json` 같은 집계 1개 파일을 러너가 함께 갱신 (이미 build-hubs.mjs 가 `status/hubs.json` 을 만듦) · 상태판은 `hubs.json` 1개만 polling → 5 허브 × 60/hr 가 1 × 60/hr 로 하락 · Kyu 는 상단에 "updated_at" + 최신 commit SHA 표시해 눈으로 stale 확인.

## 5. 교체 — 실행 안 함 (현재 m2/m3 busy)

`node scripts/hub-runner-v6.1.mjs --status` 결과 (방금 확인):

```
m0  idle         opus    —        —          
m1  M1-1105-AC   opus    (v6 busy 메모리 잔재 · claim 은 done)
m2  idle(*)      sonnet  —        —           (* M2-1105-U 자체 started · 이 리포트 작성 중)
m3  M3-1105-Y    opus    실행 중
r0  R0-1105-AM   sonnet  (claim done · heartbeat 잔상)
```

5 허브 전부 idle 이 아니므로 **install 자동 실행 조건 (스펙 §5) 미충족** → 러너 자동 교체는 보류하고 교체 명령만 남김.

### 교체 명령 (1 줄 · 모든 허브 idle 된 뒤 Kyu 가 직접 실행)

```bash
bash scripts/hub-runner-install.sh
```

(이미 커밋된 `scripts/hub-runner-install.sh` 가 TARGET=`hub-runner-v6.1.mjs`, FALLBACK=`hub-runner-v6.mjs` 로 바뀜 · install 스크립트가 `node --check scripts/hub-runner-v6.1.mjs` 선실측 → `~/Library/LaunchAgents/com.curiocity.hub-runner.plist` 재작성 → bootout + bootstrap → PID 확인까지 자동.)

### Kyu 확인 절차 (쉬운 말 3 줄)

1. 현재 상태판에서 **5칸(M0·M1·M2·M3·R0) 전부 idle 인 지** 확인 (혹은 터미널에서 `node scripts/hub-runner-v6.mjs --status` 쳐서 `current` 열이 전부 `idle` 인지 확인).
2. idle 일 때 Mac 터미널에서 `cd ~/projects/relay-m1 && bash scripts/hub-runner-install.sh` 한 줄 실행 → `load 완료: com.curiocity.hub-runner (runner=hub-runner-v6.1.mjs)` 보이면 교체 끝.
3. 교체 뒤 cmux 에서 중복 Hubs 탭 3개 (workspace:18, 19, 20) 와 옛날 workspace:16 은 우클릭 → Close 로 손수 닫아줘. 활성 workspace:17 만 남겨놓으면 됨.

## 6. 커밋·푸시 & 다음 상태

- 변경 파일: `scripts/hub-runner-v6.1.mjs` (신규) · `scripts/hub-runner-install.sh` (TARGET/FALLBACK 한 줄 쌍) · `m2/M2-1105-U-report.md` (본 리포트) · `m2/M2-1105-U-selftest-report.md` · `m2/M2-1105-U-layout-report.md` (셀프테스트 산출물 · 증거로 함께 커밋).
- v6.mjs 는 그대로 — 러너 돌고 있음.
- push: `git push origin HEAD:main` (claim.mjs 가 자동 수행).
- 마무리: `node scripts/claim.mjs M2-1105-U done "..."` 로 claim done.

---

## 참고 · 러너 재시작 복구 경로 (② 세부)

```javascript
// hub-runner-v6.1.mjs (요약)
async function recoverStuckStartedClaims(hubs, config) {
  for (const hub of hubs) {
    if (busy.has(hub)) continue;                      // 지금 돌고 있는 건 waitForLanding 이 처리
    const stuck = findStartedClaim(hub);              // state === 'started' 인 가장 최신 claim
    if (!stuck || recoveryMarked(stuck.id)) continue; // 이미 처리된 ID 는 스킵
    const elapsed = Date.now() - Date.parse(stuck.at);
    if (elapsed < config.run_timeout_ms) continue;    // 60m 안이면 아직 유효
    // pane 에 C-c ×2 → claim blocked 를 enqueue
    sendPaneKey(cmuxBin, layout, hub, 'C-c'); await sleepMs(300);
    sendPaneKey(cmuxBin, layout, hub, 'C-c');
    markPane(cmuxBin, layout, hub, 'blocked', stuck.id);
    enqueueClaim({ id: stuck.id, state: 'blocked', note: 'timeout 60m · 러너 재시작 복구', blockedBy: 'oke' });
    markRecovered(stuck.id);                          // ~/.hub-runner/recovery/<id>.done touch
  }
}
```

- `recovery/<id>.done` 마크 파일은 동일 claim 을 매 tick 복구 시도하는 무한 루프 방지.
- v6 는 이 경로가 없어 (M1-1105-AC 처럼) 1회라도 러너 crash/restart 가 있으면 "started" 가 영구 고착 → 60m 상한 미발동으로 관측됨.
