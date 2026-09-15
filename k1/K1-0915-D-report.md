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
