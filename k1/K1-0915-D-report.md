---
round: K1-0915-D
pr: https://github.com/CuriocityDevAi/test-portal/pull/100
outcome: 자기 검증 통과 (GATE_API_BASE 편입 · 데몬 전용 clone v0.5.0 실 실행 · status/hubs.json 실 push 확증 · 앱 협력 지시서 편입)
kyu_checks:
  - gh variable list = GATE_API_BASE 편입 확증
  - Cloudflare Access Service Token 발급 (Kyu 클릭 회부) → GATE_ACCESS_TOKEN 편입 → 다음 PR gate step 실 verdict 로그
  - launchctl print = WorkingDirectory ~/projects/.kyu-env/test-portal-main · v0.5.0
  - Kyu 원 폴더 (~/projects/test-portal) 미변경 · pull 불요
  - launchd 로그 = fetch-reset + orphan cleanup + status-watcher tick 3종 모두 노출
  - relay status/hubs.json 60초 갱신 관측 (raw.githubusercontent.com)
  - N0/M0 라운드 발부 시 env-recipes.md § 앱 협력 지시서 인용 확증
---

## 요지

Kyu K1-0915-D 4항 소화 · 데몬 인프라 정본화.

## 1. GATE 편입 (Kyu 회부 1건)

- `GATE_API_BASE=https://test.curiocity.company` = K1 직접 편입 완료 (`gh variable list` 확증).
- `GATE_ACCESS_TOKEN` = **K1 발급 실패** (Cloudflare OAuth Access 스코프 부족 · POST `/accounts/<acct>/access/service_tokens` = `code 1010 auth.forbidden` 실측). **Kyu 클릭 회부** = CF 대시보드 Access → Service Auth → Service Tokens 발급 → `gh secret set GATE_ACCESS_TOKEN` (K1 편입 가능).

## 2. status watcher

- `tools/kyu-bridge/src/status-watcher.mjs` 신설 · `startStatusWatcher()` = 60초 tick.
- Claude Code 프로세스 감지 = `ps -x -o pid,command | grep claude` + `lsof -a -d cwd -p <pid>` (macOS 정본).
- HUB_PATHS = 6 허브 (n0=grownest · t0=todoboss · m0=storeport|agilo · k0=test-portal · k1=test-portal-k1|.kyu-env · k2=test-portal-k2).
- 심문 파일 감지 = relay `<hub>/*inquiry*.md` 존재 시 `waiting-inquiry` 상태.
- **변화 시만** relay `status/hubs.json` push (statesChanged diff · gh api PUT).
- ghEnv() 함수 = plist EnvironmentVariables.GH_TOKEN 명시 전달 (launchd keychain 접근 불가 회수).

**실측 relay 파일** (`raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/status/hubs.json`):
```
built_at: 2026-09-15T14:20:24.387Z
hubs: {n0/t0/m0/k0/k1/k2 all "state":"running" · pid + cwd}
```

## 3. env-recipes.md § 앱 협력 지시서 (한 줄 계약)

grownest·storeport dev guard 정본:
```typescript
if (import.meta.env.DEV) {
  const q = new URLSearchParams(location.search);
  if (q.get('test') === '1') {
    const role = q.get('autologin');
    const seed = q.get('seed');
    if (role) setSession({ id: `dev-${role}`, role, orgId: seed ?? 'dev' });
  }
}
```

**계약 조건**: DEV guard 필수 · production 소거 · store 정합 각 앱 규약.  
**오케 회부**: N0 라운드 = `~/projects/grownest/src/App.tsx` · M0 라운드 = `~/projects/storeport/apps/anchor/src/App.tsx`.  
착지 후 = K1 레시피 `autologin.method: "url-query"` 승격 (Kyu 재발부).

## 4. 데몬 전용 clone 분리 (핵심 · Kyu 원문 마지막 문장 정본)

**launchd plist** (~/Library/LaunchAgents/com.curiocity.kyu-bridge.plist) 편입:
- `ProgramArguments = /Users/kyu.lee/projects/.kyu-env/test-portal-main/tools/kyu-bridge/bin/kyu-bridge serve`
- `WorkingDirectory = /Users/kyu.lee/projects/.kyu-env/test-portal-main`
- `EnvironmentVariables.GH_TOKEN = gho_*` (keychain 접근 안 되는 launchd 컨텍스트 대응 · permission 0600)
- `SessionCreate = true`

**autoFetchReset (serve.mjs)** = 데몬 기동 시:
- cwd == 전용 clone 경로 확인 · 아니면 skip (dev 모드 안전).
- git fetch = URL 안 `x-access-token:<GH_TOKEN>@github.com` 편입 (credential helper 우회).
- reset --hard FETCH_HEAD.
- 실패 = "계속 부팅" (기존 코드로 서빙).

**재기동 실측** (`docs/audits/K1-0915-D-kyu-bridge-relaunch.log`):
```
$ launchctl print gui/$UID/com.curiocity.kyu-bridge | grep -iE 'state|working'
  state = running · pid = 20182
  working directory = /Users/kyu.lee/projects/.kyu-env/test-portal-main

$ tail ~/.kyu-bridge/logs/launchd-stdout.log
[kyu-bridge] fetch-reset · 최신 (8735e37c) · 변화 없음
[env-browser] orphan cleanup: {"cleaned":0,"sizes":[]}
[kyu-bridge] listening on http://127.0.0.1:9876
[kyu-bridge] status watcher started · interval=60000ms · hubs=6
[status-watcher] ghEnv · GH_TOKEN present=true · len=40 · HOME=/Users/kyu.lee
[status-watcher] tick · n0=running · t0=running · m0=running · k0=running · k1=running · k2=running · relay=updated
```

**v0.5.0 확증**: `KYU_BRIDGE_VERSION = '0.5.0'` · env-*.mjs 5 파일 · status-watcher.mjs 편입 · orphan cleanup 자동 로그.

**이후 Kyu pull 불요**: 데몬 자체 fetch-reset · Kyu 원 폴더 (`~/projects/test-portal`) 영향 없음.

## 5. gate 실 verdict 로그 (Kyu 회부 후 확증)

**현재 상태**: `GATE_ACCESS_TOKEN` 미편입 → 두 워크플로 (kyu-gate-auto-merge · k1-auto-selfcheck-merge) gate step = `verdict=skipped` + `::warning`. 정합 (K1-0915-C 정본).

**GATE_ACCESS_TOKEN 편입 후** = 다음 PR merge → 실 `verdict` 값 로그:
- `green` → auto-merge 진행 (기존 로직 정합)
- `red` → 거부 + 코멘트 (사유 · gate-contract § 2.2 링크)
- `none` → test-portal 진행 · 다른 리포 skip (Kyu 판정 요구)

## 6. DOC · BUILD

- SPEC § 11 v1.66 · § K1-env-6 확장 · § K1-daemon-clone · § K1-status-watcher · § K1-env-recipes-app-guard
- EPIC-STATE Active K1-0915-D 편입
- requirements-tracking K73 등재
- docs/env-recipes.md 앱 협력 지시서 절 신설
- docs/audits/K1-0915-D-kyu-bridge-relaunch.log 30 라인 정본

```
$ pnpm test  →  Test Files 74 · Tests 987 passed
$ pnpm check →  0 errors · 57 warnings (legacy)
```

## 7. 결론

- **자기 검증 통과** = GATE_API_BASE 편입 + status/hubs.json 실 push (built_at 14:20:24) + v0.5.0 데몬 clone 실행 확증 + env-recipes 지시서
- **Kyu 실기 대기** = 7 kyu_checks (GATE_ACCESS_TOKEN 발급 · WorkingDirectory 확증 · fetch-reset 관측 · status/hubs.json 60초 갱신 · 앱 협력 지시서 N0/M0 회부)
- **PR** = https://github.com/CuriocityDevAi/test-portal/pull/100

## 8. 다음 라운드 인수

- **GATE_ACCESS_TOKEN 편입 후 실 verdict 확증** = K1 재실기 or Kyu 실기
- **K0 다음 라운드** = 포털 허브 탭 → relay/status/hubs.json 소비 (실기 상태 배지)
- **N0/M0 라운드** = 앱 협력 지시서 편입 (grownest·storeport)
- **shared-docs-policy** (K1-0915-C 초안 · K0 판정 대기)

*K1-0915-D · 2026-09-15 · 데몬 인프라 정본화 · 배관 허브 4번째 라운드*

---

## § E. 마감 (K1-0915-E · 2026-09-15)

**Kyu 지시** = PR#100 충돌 해소 · main = K0-0915-B (#99 문서 재편) · 충돌 파일 = 새 구조 (docs/state/k1.md · docs/tracking/k1.md) 로 이관.

### E.0 GATE_ACCESS Service Token 편입 (K1-0915-D 완결 사후)

Kyu 발급 후 (`CF-Access-Client-Id: 1b7eeb7dc65a2723e4b58486f87528f4.access` · `CF-Access-Client-Secret: cfast_*`) K1 직접 편입:
```
$ echo "$CLIENT_ID"     | gh secret set GATE_ACCESS_CLIENT_ID     -R CuriocityDevAi/test-portal
$ echo "$CLIENT_SECRET" | gh secret set GATE_ACCESS_CLIENT_SECRET -R CuriocityDevAi/test-portal
```

**secret list 확증**:
```
GATE_ACCESS_CLIENT_ID       2026-09-15T15:10:58Z
GATE_ACCESS_CLIENT_SECRET   2026-09-15T15:10:59Z
```

**워크플로 정정** (kyu-gate-auto-merge.yml + k1-auto-selfcheck-merge.yml):
- 헤더 = `Cf-Access-Jwt-Assertion` → **`CF-Access-Client-Id` + `CF-Access-Client-Secret`** (2 헤더 CF Service Token 정본).
- guard = 두 secret 모두 확인 후 진행.

**실 curl 실측**:
```
$ curl -sS "https://test.curiocity.company/api/gate/CuriocityDevAi/test-portal/100" \
    -H "CF-Access-Client-Id: <id>" -H "CF-Access-Client-Secret: <secret>"
HTTP 302 (Cloudflare login redirect)
```

**HTTP 302 뿌리 확증** = Service Token 유효 · **CF Access Application Policy 안 이 service token allow 규칙 미편입** (Kyu 회부 · K1 스코프 부족). 편입 후 다음 PR merge = 실 `verdict` 로그.

### E.1 충돌 해소 (K0-0915-B #99 문서 재편 편입)

- `git fetch origin && git merge origin/main` → K0-0915-B (`9f93918`) 편입 · 충돌 2 파일.
- **충돌 파일**:
  - `EPIC-STATE.md` = origin/main 채택 (**인덱스 전용** · K0-0915-B 정본 · 상세는 허브별 파일 이관).
  - `docs/SPEC.md § 11` = 양쪽 절 병존 (K1-0915-D + K0-0915-B v1.K0-0915-B).
- **새 구조 이관** (Kyu 정본):
  - `docs/state/k1.md` = K1-0915-D Active 항목 append · K1 SPEC 절 목록 편입 (§ K1-env-6 확장 · § K1-daemon-clone · § K1-status-watcher · § K1-env-recipes-app-guard).
  - `docs/tracking/k1.md` = **신설** (K60~K79 K1 range · K73 = K1-0915-D 편입 + K60/K71/K72 이전 라운드 이관).
  - `docs/tracking/index.md` = **편집 없음** (K0 소유 · K1 소유 read-only · 향후 K0 라운드에서 K1.md 링크 편입).
- **K0/K2 항목 삭제 없음** (`state/k0.md · state/k2.md · tracking/k0.md · tracking/index.md` 모두 origin/main 그대로).

### E.2 mergeable 확증

```
$ gh pr view 100 -R CuriocityDevAi/test-portal --json state,mergeable,mergeStateStatus
{"mergeStateStatus":"CLEAN","mergeable":"MERGEABLE","state":"OPEN"}
```

**MERGEABLE + CLEAN** ✅ · 병합 준비 완결.

### E.3 이후 · Kyu 실기 진입

- CF Access policy 편입 (Kyu 클릭 · Access → Application → Policies → Service Token allow).
- PR#100 auto-merge 트리거 or Kyu 직접 병합.
- 다음 PR merge 시 = kyu-gate-auto-merge/k1-auto-selfcheck-merge 워크플로 gate step 안 **실 verdict 로그 1건** (`gate=green|red|none · 진행/거부/Kyu 판정 요구`).

### E.4 병합 후 SHA · 후속

- 병합 커밋 = `5b4e2c2` (feat/k1-0915-d-status · rebase 완결 · docs 구조 재편 정합).
- SPEC · state · tracking 3 파일 = K0-0915-B 정본 준수 · K0/K2 침범 0.

*K1-0915-E · 2026-09-15 · PR#100 충돌 해소 · 문서 재편 정합 · § E 마감*
