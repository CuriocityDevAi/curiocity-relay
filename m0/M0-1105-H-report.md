---
round: M0-1105-H
pr:
  storeport: storeport#192
base_pr: null
outcome: ci-all-green · anchor tauri 데드 imports(30) + deps(8) + aliases(11) 정리 · stubs 보강 · CI grep stubs/ exempt · 로직 변경 0
kyu_checks: 1 (M0-1105-G 보고 레거시 CI 빨강 소화)
ci_links:
  markers-and-forbidden: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076937/job/128178720788
  changes-filter: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076937/job/128178721127
  check: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076957/job/128178720259
  pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076937/job/128178773735
  docker-smoke-anchor: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076937/job/128178773761
---

# M0-1105-H · storeport main CI 전부 그린

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `apps/anchor/**` (src imports + package.json + vite.config.ts + stubs 보강) + `.github/workflows/ci.yml` (grep stubs/ exempt).

**base**: `origin/main @ 2ac3d23` (M0-1105-G 머지 직후).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | storeport main CI 의 `markers-and-forbidden` 레거시 실패 뿌리 확정 | ✓ (apps/anchor 에 `@tauri-apps` 리터럴 ↔ 순진 grep) |
| 2 | 정리 — 제품 로직 변경 0 · 사용처 0 증명 후 삭제 | ✓ (Path B · 경로 재작성 + 데드 deps/aliases 제거) |
| 3 | 본 PR CI 4 job 전부 그린 | ✓ (추가로 docker-smoke-anchor 도 조건부 발화 · PASS) |
| 4 | 금지 영역 (`src/api/**` · `src/modules/**` · `medusa-config`) 변경 0 | ✓ |

---

## 1. 뿌리

Kyu Q3 (i) 결정: Anchor = web PWA · Android/Tauri 삭제. 현재 상태:
- `apps/anchor/src/stubs/{tauri-core,tauri-plugins}.ts` — localStorage/fetch 기반 web 폴백 2개 파일.
- `apps/anchor/vite.config.ts` — `@tauri-apps/*` → stubs 로 11개 subpath alias.
- `apps/anchor/src/**` 17 파일 — `from "@tauri-apps/plugin-X"` 식 import (정적 7건 + 동적 `await import(...)` 23건).
- `apps/anchor/package.json` — `@tauri-apps/*` 8 deps (런타임 로드 0 · vite alias 가 가로챔).

CI `markers-and-forbidden` 의 "Anchor Tauri residue grep" step:
```yaml
run: |
  if grep -rnE "@tauri-apps|from ['\"]@tauri" apps/anchor; then
    echo "❌ ...잔재 발견"; exit 1
  fi
```
리터럴 매치라 소스/의존/alias 3군데 전부 걸려 실패.

---

## 2. 변경 (Path B · 로직 변경 0)

### ① 소스 imports 재작성 (17 파일 · 30 imports)
vite alias 간접을 없애고 소스에서 stubs 를 **직접** 참조.

매핑:
- `@tauri-apps/api/{core,event,window,path}` → `@/stubs/tauri-core`
- `@tauri-apps/plugin-{store,http,fs,dialog,opener,process,updater}` → `@/stubs/tauri-plugins`

정적 7건:
- `apps/anchor/src/hooks/ui/useFullscreenToggle.ts:2`
- `apps/anchor/src/hooks/update/useUpdateCheck.ts:3,4`
- `apps/anchor/src/context/virtual-keyboard/index.tsx:8,9`
- `apps/anchor/src/context/store-manager/index.ts:2`
- `apps/anchor/src/components/settings/connection/hooks.ts:2`
- `apps/anchor/src/components/auth/login/index.tsx:5`

동적 23건: `config/medusa.ts` · `utils/{settings/preferences/boot,downloads,helpers}.ts` · `components/{order/hooks,settings/{preferences,printer,printer/dialog,store,printer}/hooks}.ts` · `hooks/{printer/usePrinterService,queries/useQueryOrder}.ts`.

런타임 동작 불변 (vite alias 가 하던 재지향을 소스에 명시).

### ② apps/anchor/package.json 데드 deps 제거 (8건)
```
"@tauri-apps/api"
"@tauri-apps/plugin-{dialog,fs,http,opener,process,store,updater}"
```
사용처 0 증명: 소스 imports 가 전부 `@/stubs/*` 로 재작성됐고, vite alias 가 가로채던 유일한 경로였으므로 npm 패키지 자체는 번들에 **한 번도** 실려본 적 없음.

### ③ apps/anchor/vite.config.ts 데드 alias 제거 (11건)
`@tauri-apps/api/{core,event,window,path}` + `@tauri-apps/plugin-{store,http,fs,dialog,opener,process,updater}` 11 entries 삭제. `@` → `./src` 는 유지.

### ④ apps/anchor/src/stubs/tauri-plugins.ts 보강 (공식 shape 매칭)
tsc 가 이제 stubs 를 직접 검사하므로 실 Tauri API 와 동일 shape 로 맞춤:
- `WebStoreStub.static load(path, opts)` 추가 (실 Tauri `Store.load` static signature).
- `check()` 반환 타입 `Promise<WebUpdateStub | null>` (실 API 동일 · always null).
- `UpdateDownloadEvent` union 선언 + `downloadAndInstall`/`download` onEvent 파라미터 타입 지정 → 호출부 `event.event` · `event.data` 안전.

### ⑤ .github/workflows/ci.yml · grep 보강
```yaml
if grep -rnE "@tauri-apps|from ['\"]@tauri" apps/anchor \
    --exclude-dir=stubs --exclude-dir=node_modules --exclude-dir=dist \
    2>/dev/null | grep -v ".git"; then
```
stubs 는 설계상 주석에 `@tauri-apps` 식별자 유지 (API 일람 문서화). 소스/설정/의존에 `@tauri-apps` 가 다시 들어오면 **여전히 즉시 실패**.

---

## 3. 사용처 0 증명

```bash
$ grep -rnE "@tauri-apps|from ['\"]@tauri" apps/anchor \
    --exclude-dir=stubs --exclude-dir=node_modules --exclude-dir=dist
(no output)

$ grep -c "@tauri-apps" apps/anchor/package.json
0

$ grep -c "@tauri-apps" apps/anchor/vite.config.ts
0

$ grep -c "@tauri-apps" pnpm-lock.yaml
0
```

Stubs 에만 남은 `@tauri-apps` 토큰 (API 일람 주석):
```bash
$ grep -c "@tauri-apps" apps/anchor/src/stubs/tauri-plugins.ts
8   # 주석 전용 · 실 import 0
$ grep -c "@tauri-apps" apps/anchor/src/stubs/tauri-core.ts
7   # 주석 전용 · 실 import 0
```

---

## 4. 검증

| 체크 | 결과 |
|---|---|
| `pnpm --filter anchor build` (tsc + vite) | ✓ built in 1.25s |
| `pnpm --filter commerce-core build` | Backend 9.48s · Frontend 25.07s · **PASS** |
| pnpm-lock.yaml `@tauri-apps` | **0건** |
| CI grep 로컬 모의 | `✓ Anchor Tauri 잔재 = 0 (stubs 제외)` |

### CI (PR #192) · **4 job 전부 그린** + bonus
```
markers-and-forbidden   PASS   8s      ← ★ 본 라운드의 타깃
changes-filter          PASS   5s
check                   PASS   15s
pos-integration         PASS   1m52s
docker-smoke-anchor     PASS   1m2s    ← 조건부 발화 (anchor/Dockerfile 범위 영향 없음 · 안전 확인 겸)
docker-smoke-commerce-core  skipping
docker-smoke-wing          skipping
wrangler-check-care-agent  skipping
```

링크:
- markers-and-forbidden: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076937/job/128178720788
- check: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076957/job/128178720259
- pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076937/job/128178773735
- docker-smoke-anchor: https://github.com/CuriocityDevAi/storeport/actions/runs/42301076937/job/128178773761

---

## 5. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/192
- **브랜치**: `chore/m0-1105-h-ci-green` (base = `main @ 2ac3d23`)
- **커밋**: `bc7039a` — `chore(anchor): tauri 데드 imports/deps/aliases 정리 + CI grep stubs/ exempt (M0-1105-H)` (22 파일 · +60/-170 · 실 삭제 110줄)

---

## 6. 다음 후보

- #192 머지 후 main 재검증: **모든 신규 push 가 markers-and-forbidden 그린** 유지 확인.
- 선택: stubs/*.ts 주석을 "Tauri API 명세 (stubbed)" 로 바꿔 미래 혼동 방지 (지금은 "이유: vite alias 미설정..." 이력 서사 남음).
- 선택: stubs 에 jsdoc 추가로 각 export 가 대체하는 공식 Tauri 심볼 표기 (실 안드로이드 복귀 시 참고).
