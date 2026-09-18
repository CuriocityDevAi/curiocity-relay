---
round: K1-0918-A
hub: k1
pr: '132'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"env.prepare 단계 계약 신설 · defaultPrepare 폴백 (.env 복사 + 포트 kill) · Kyu 어제 함정 3 자동 처리 · 실 SSE prepare 실 실측 확증"}'
  - '{"id":"R009","action":"consume","note":"범용화 · 새 프로젝트 = env.prepare 한 줄 편성 · defaultPrepare 폴백으로 4 프로젝트 무해 동작"}'
kyu_checks:
  - Kyu 맥 [테스트 열기] · prepare 단계 로그 노출 (환경 준비 중) · localhost:4321 로그인 화면 스샷
  - 봇 토큰 절차 (docs/kyu-clicks/K1-0917-D 유지) 실기
---

## 요지

R003 (env 레시피 v2 · .env·dev-reset 계약) 완결 · R009 (범용화) 완결. 어제 (09-17) Kyu 밟은 함정 3 (=.env 미복사 · 4000/4321 포트 잔존 · migrate) 을 데몬이 자동 처리.

## PR

- **test-portal PR#132** = https://github.com/CuriocityDevAi/test-portal/pull/132 (feat/k1-0918-a) · merge SHA `1bcd39f`

## 실측

### A1 · env.prepare 계약 · defaultPrepare 폴백 (R003 · R009)
- **뿌리** (Kyu 원문 09-18): "env 레시피 v2 · env.prepare 호출 단계 신설 · 없으면 기본 (.env 복사 + 포트 잔존 kill + migrate) · projects.json 4프로젝트 갱신 · 어제 밟은 함정 3개를 데몬이 자동 처리"
- **fix 2 지점** (`tools/kyu-bridge/src/env.mjs`):
  - `handleEnvOpen` clone 다음 · install 前 **prepare 단계** 신설 · `sseProgress(res, 'prepare', ...)` (label = "환경 준비 중")
  - `env.prepare` 있으면 `runStreamed(cmd, args)` · 없으면 **`defaultPrepare` 폴백**
- **defaultPrepare 3 항목**:
  - (a) **`.env` 복사**: `~/projects/<slug>/<envCwd>/.env` → clone `<cloneCwd>/.env` (없으면 무해 skip · dotfile .gitignore 정본)
  - (b) **포트 잔존 kill**: `lsof -ti tcp:<port>` = 잔존 PID · `/bin/kill -9 <pids>` (이전 pnpm dev 세션 · strictPort=true 신 서버 기동 실패 회수)
  - (c) **migrate**: 기존 `env.migrate` 4 단계 흐름 유지 (별건 · env.prepare 후속)
- **projects.json v7** (`config/projects.json`) = 4 프로젝트 (grownest · storeport · todoboss · agilo-medusa-pos-fork) `env.prepare` 필드 편입 (지금 모두 `null` · defaultPrepare 폴백 소비). test-portal (type=deployed) 은 prepare 불요. **T0-D 라운드** (Kyu 원문) dev-reset.sh 착지 후 todoboss `env.prepare = "bash ../scripts/dev-reset.sh"` 로 교체.

### A2 · daemon 재기동 + 실 SSE prepare 실측
- `launchctl kickstart -k gui/$UID` → autoFetchReset (1bcd39f 반영) → env.mjs 새 코드 로드
- 실 SSE 결과 (`todoboss` short name):
  ```
  event: progress · {"step":"prepare","message":"기본 폴백 (.env 복사 · 포트 잔존 kill)","label":"환경 준비 중"}
  event: log · {"step":"prepare","stream":"stdout","text":"[prepare] .env 원본 부재 (skip · /Users/kyu.lee/projects/todoboss/web-admin/.env)\n"}
  event: log · {"step":"prepare","stream":"stdout","text":"[prepare] 포트 4321 잔존 없음\n"}
  ```
  = prepare 단계 실 실행 확증 · .env 원본 부재 skip · 포트 clean state (기존 dev 없음)
- audit: docs/audits/K1-0918-A-env-prepare.log (59 lines · 계약 + 실 실측)

### A3 · 봇 토큰 교체 절차
- **판정** = Kyu 클릭 필요 (K1-0917-D 판정 유지 · CuriocityDevAi User 계정 · GitHub 계정 신설 = email verify · 2FA · 브라우저 클릭 · K1 자동 불가)
- 절차 = `docs/kyu-clicks/K1-0917-D-bot-account-token.md` 3줄 (봇 계정 신설 · 5리포 collaborator · fine-grained PAT + K1 회신)
- Kyu 완료 후 K1 자동 편입: `echo "<PAT>" | gh secret set CROSS_REPO_READ_TOKEN --repo curiocity-relay` + `echo "<PAT>" | npx wrangler versions secret put LEDGER_GITHUB_TOKEN`

### Contract test (13 pass · 1 신 case)
- `env.prepare` + `function defaultPrepare` 소스 편입
- `prepare` step label = '환경 준비 중'
- `.env 복사` + `lsof/포트` 힌트
- `projects.json.version >= 7`
- web/expo 4 프로젝트 모두 `env.prepare` 필드 존재

## 검증

- `pnpm check` = 0 errors 89 warnings (CSS unused · pre-existing)
- `pnpm test` = **1055 pass** (1054 기존 + contract-portal 1 신규 · 총 13 case)
- 실 SSE prepare 3 라인 노출 확증 (progress · log skip · log clean)
- 착지 前 `git fetch && git merge origin/main` · Already up to date

## Kyu 후속 실기

1. **R003 스샷**: Kyu 맥 `test.curiocity.company/pr/CuriocityDevAi/todoboss/23` · [테스트 열기] · prepare 단계 진행 로그 · **localhost:4321 로그인 화면 실 도달** 스샷 (Kyu 개발 폴더 안 `.env` 있으면 자동 복사 확증)
2. **T0-D 회부**: todoboss `scripts/dev-reset.sh` 편성 (T0 별건 라운드) · 착지 후 K1 projects.json 안 `env.prepare` = `"bash ../scripts/dev-reset.sh"` 로 교체
3. **A3 봇 토큰**: docs/kyu-clicks/K1-0917-D-bot-account-token.md 3줄 절차 실기 · PAT 값 K1 회신

## 관련 문서

- SPEC v1.K1-0918-A (§ K1-env-prepare · § K1-default-prepare-fallback)
- docs/audits/K1-0918-A-env-prepare.log (59 lines · 계약 + 실 SSE prepare)
- tools/kyu-bridge/src/env.mjs (prepare 단계 + defaultPrepare 함수)
- config/projects.json v7 (4 프로젝트 env.prepare 필드)
- tools/kyu-bridge/test/contract-portal.test.mjs (13 pass · 1 신 case)
- docs/kyu-clicks/K1-0917-D-bot-account-token.md (봇 계정 3줄 · A3 유지)
- docs/state/k1.md · docs/tracking/k1.md K86 편입
