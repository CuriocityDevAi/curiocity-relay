---
round: K0-0915-B
pr: https://github.com/CuriocityDevAi/test-portal/pull/99
outcome: 자기 검증 통과 (pnpm test 987 · Playwright 23 pass 14 skip · check 0 err · docs 재편 착지) · Kyu 실기 확증 대기
kyu_checks:
  - 폰: 상세 기계 판정 띠 = /api/gate 우선 · reasons 사람 말 · pr-checks 폴백
  - 폰: 이력 접힘 = /api/runs 최근 5건 (K2 부재 시 미노출)
  - 폰: [테스트 열기] = K1 /env/open SSE 4 단계 · 자동 로그인 배지 · [실기 시작] 활성
  - 맥: 허브 탭·미니 허브에 K0/K1/K2 3 행 노출 (test-portal.hubs = k0/k1/k2)
  - 공용 문서: docs/state/k0.md·k1.md·k2.md 신설 · EPIC-STATE.md 인덱스화 · SPEC v1.K0-0915-B
date: 2026-09-15
hub: K0 (test-portal)
base: main@8735e37 (K1-0915-C 착지 · 2026-09-15 오케 머지)
branch: feat/k0-0915-b-ax-consumers
head: 9b58753
---

# K0-0915-B 리포트 · AX 배관 결과 소비 + 공용 문서 분리

## 라운드 흐름

1. **fetch + main merge** (main@8735e37 = K1-0915-C · PR#94/96/97/98 병합됨)
2. 파일 경계 확인 (K0 · K1 · K2 · docs 구조 재편 이번 예외)
3. AX-1/2/3/4/5 전량 소화 · docs 마이그레이션 5단계 완결
4. **착지 직전 origin/main 재병합** (CLAUDE.md § 5.18 정합) · Already up to date 확증
5. PR#99 · relay report push

## 파일 경계 (Kyu 09-15 원문)

- **K0 소유**: `src/routes/**` (api 제외) · `src/lib/ui/**` · `config/projects.json` · **EPIC-STATE.md/SPEC.md/docs/state/**/docs/tracking/** (이번 예외 · docs 구조 재편)
- **K1 소유** (침범 없음): `api/push` · `kyu-bridge` · `.github` · relay
- **K2 소유** (침범 없음): `tools/regression-runner` · `api/runs` · `migrations` · `docs/testing/*` (contract)
- **소비만**: K0 는 K1 endpoint (`/api/gate`, `/api/env/open`) · K2 endpoint (`/api/runs`) 를 소비만 · 신설 없음

## AX-1 · 상세 기계 판정 띠 실 데이터

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):

- `fetchGate()` = K1 `/api/gate/:owner/:repo/:pr` 우선 소비 · `GateResp{state, reasons[], checks[]}`
- `machineState` `$derived` = gate → pr-checks → relay checks 3 계층 폴백
- `machineReasons` `$derived` = gate.reasons 사람 말 우선 · pr-checks failed 폴백 (기존)
- 기계 판정 띠 UI = `machineReasons` 렌더 (`data-testid="machine-band-reasons"`)
- 빨강이면 [성공] 비활성 유지 (기존 `passDisabledByMachine` 정합)

**이력 접힘** (`overview-fold` 안):

- `fetchRecentRuns()` = K2 `/api/runs?limit=5` 소비
- `.runs-recent` = suite/status/시각/실패 이름 (data-testid="runs-recent")
- K2 endpoint 부재 시 = 빈 배열 유지 · 접힘 절 미노출 (무해 폴백)

## AX-2 · 허브 탭 멀티 허브

**정본** (`src/lib/registry.ts`):

- `Project.hubs?: string[]` 필드 신설 (Kyu 09-15 정본)
- `activeHubs()` = hubs[] 우선 · hub 단일 폴백 (구형 정합)

**config** (`config/projects.json`):

- `test-portal.hubs = ["k0", "k1", "k2"]` 신설 (한 프로젝트가 여러 허브에서 병행)

**소비**: 홈 `hubStates $derived` = `activeHubs().map(...)` 로 자동 확장 · 허브 탭·미니 허브에 K1/K2 노출 확증.

## AX-3 · 상세 [테스트 열기] K1 /env/open SSE 소비

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):

- `EnvStage` = `'idle'|'install'|'migrate'|'seed'|'start'|'health'|'ready'|'failed'`
- `envStage · envLogs · envError · envAutologin · envHomeUrl · envSource` state
- `connectEnvOpen()`:
  - `new EventSource('/api/env/open?repo=&pr_id=', { withCredentials: true })`
  - `addEventListener('log')` = `{stage, message}` 편입 · envLogs append
  - `addEventListener('autologin')` = `{method}` → auto/otp/manual 배지
  - `addEventListener('ready')` = `{home}` → envHomeUrl · envStage = ready
  - `addEventListener('error')` = envStage = failed · envError
- `startTraining()` = `window.open(envHomeUrl, '_blank')`
- **UI**:
  - `.env-progress .env-steps li` = 4 단계 (설치·마이그레이션·시드·실행 시작) `.done/.active` classes
  - `.env-autologin[data-method=auto/otp/manual]` = 배지 색 구분 (자동=초록 · OTP=노랑 · 수동=회색)
  - `.env-start-btn` = 56px [준비됨 · 실기 시작] (envStage === 'ready' 시)
  - `.env-error` = 이유 표시 (envStage === 'failed' 시)
  - `.env-logs-fold` = 접힘 로그 (envLogs.length > 0 시)

**[테스트 열기]** onclick = 기존 (deep-link/expo/deployed) 유지 + `openTestMode.kind === 'devenv'` 폴백 = `connectEnvOpen()`.

**폴백**: K1 endpoint 부재 시 SSE onerror → envStage = failed · envError = "SSE 연결 실패 · K1 /env/open endpoint 확인 필요" (무해).

## AX-4 · 공용 문서 분리 (마이그레이션 5단계 완결)

**정본 근거**: `docs/testing/shared-docs-policy.md § 2` (K1 초안 (c) 병행 채택 · 오케 전결).

### 마이그레이션 5단계 (K0-0915-B 완결)

1. **`docs/state/k0.md · k1.md · k2.md` 신설** = 허브별 상태 원장 (자기 파일만 편집)
2. **`EPIC-STATE.md` 재작성** = 인덱스 (섹션 마커 · 허브별 파일 링크)
3. **`docs/tracking/index.md · k0.md` 신설** = K# 원장 인덱스 (K100 = K0-0915-B 예약)
4. **SPEC 절 번호 = 허브 접두** (§ K0-\* · § K1-\* · § K2-\*) · 이번 라운드부터
5. **CLAUDE.md § 5.19 신설** = 편집 규약 · K# range · 레거시 폐기

### K# range 예약 (Kyu 원문)

- **K10~K59** = K0 초기 (K33 · K37 · ...)
- **K60~K79** = K1
- **K80~K99** = K2
- **K100~K199** = K0-0915-B 이후 (K100 = K0-0915-B · K101 = 다음 K0 라운드)

### 버전 번호 counter 폐기

- 이전: `SPEC v1.60 → v1.61 → v1.62 → ...` (단일 counter · 병행 충돌)
- 정본: `SPEC v1.K0-<round>` · `v1.K1-<round>` · `v1.K2-<round>` (허브 접두)
- 이번 라운드 = **`SPEC v1.K0-0915-B`**

### 레거시 `docs/requirements-tracking.md`

- K0-0915-B 재편 전 기록 유지 · git log 아카이브
- 신규 편입 금지 (K100+ 는 `docs/tracking/k0.md`)

## AX-5 · AV 실기 결함 회수 확인

Playwright 재실행 = AV 1~7 항목 정합 유지 확증:

- **av-1** 죽은 버튼 금지 = `openTestMode` 4단계 폴백 유지
- **av-2** 폴백 체크리스트 문구 = `fallback-hint` 유지
- **av-3** 종합 판정 헤더 = `verdict-header-band` 유지
- **av-4** 판정 완료 PR 제외 = `isPrCompleted` filter 유지
- **av-5** pr-checks = `fetchPrChecks` 유지 + gate 우선 확장 (AX-1)
- **av-6** 허브 파생 = `activeHubs()` 유지 + hubs[] 확장 (AX-2)
- **av-7** iOS 배너 = `isIOSSafariBrowserContext` 유지

## 자기 검증

```
pnpm check    → 1042 files · 0 err · 57 warnings (v2 legacy CSS unused · 기능 무영향)
pnpm test     → 71 files · 987 pass
pnpm build    → adapter-cloudflare · done
pnpm exec playwright test = 23 pass · 14 skip · 0 fail
```

### 미실행 · 미검증 명시

- **/api/gate 실 응답 확증** = K1 endpoint 실 편입 후 프로덕션 확증 (다음 K1 라운드)
- **/api/env/open SSE 실 발화** = K1 recipe 실 실행 후 확증
- **/api/runs 실 데이터** = K2 regression-runner 실 편입 후 확증
- **프로덕션 스샷** = Kyu Access OTP 필요 · Kyu 실기 정본

## 착지 직전 origin/main 재병합 (CLAUDE.md § 5.18)

```
$ git fetch origin
$ git merge origin/main --no-edit
Already up to date.
```

- push 직전 최신 base 확증 · main 앞선 것 없음 (K1 병행 허브 안정 상태)
- CLAUDE.md § 5.18 규약 (K0-0915-A 부트스트랩) 정본 실행

## 커밋 · PR

- 커밋: `9b58753` (11 파일 · +585/-59)
- 브랜치: `feat/k0-0915-b-ax-consumers`
- PR: [#99](https://github.com/CuriocityDevAi/test-portal/pull/99)

## 다음 라운드 인수

- **K1** = `/api/gate` 실 편입 (다른 리포 · v0.5.0 프로덕션 배포)
- **K1** = `/api/env/open` SSE 실 발화 (프로젝트 recipe 실 실행)
- **K2** = `/api/runs` 실 편입 (regression-runner 기록 저장)
- **K0** = 프로덕션 실 확증 (Kyu 실기 후 착지 카드 노출) · docs/state 원장 지속 편집

---

*정본 · K0-0915-B-report · docs 구조 재편 완결 · 이후 모든 라운드는 허브 접두 정본 소비 · state/<hub>.md 자기 파일만 편집.*
