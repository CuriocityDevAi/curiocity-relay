PASS

## PR

https://github.com/CuriocityDevAi/curiocity-relay/pull/36

## 작업 요약

`scripts/ci-box/` (setup.sh · lib/install.sh · lib/runner.sh · README.md) 신규 생성.
shellcheck warning 0 · dry-run 정상 출력 확인.

## 맥북 현 CI 값 근거 경로

| 항목 | 값 | 근거 경로 |
|------|----|-----------|
| Node 버전 | 20.19.6 | `~/actions-runner/.env` NVM_BIN 경로 |
| pnpm 버전 | 9.15.0 | `.github/actions/heavy-steps/action.yml` pnpm/action-setup version |
| Postgres 버전 | 16 | `.github/workflows/ci.yml` `image: postgres:16` |
| Postgres port | 5432 | `psql -U postgres -c "SHOW port"` 실측 |
| Postgres user | postgres | `ci.yml` POSTGRES_USER / heavy-steps DATABASE_URL |
| Postgres password | postgres | `ci.yml` POSTGRES_PASSWORD |
| DB 이름 패턴 | storeport_ci_<run_id> | `.github/actions/heavy-steps/action.yml` DATABASE_URL |
| storeport heavy 라벨 | curiocity-mac | `.github/workflows/ci.yml` runs-on |
| storeport light 라벨 | curiocity-mac-light | `.github/workflows/ci.yml` runs-on |
| fork heavy 라벨 | curiocity-mac-fork | `.github/scripts/route-fork.sh` MAC_RUNNER 변수 |
| fork light 라벨 | curiocity-mac-fork-light | `.github/scripts/route-fork.sh` MAC_LIGHT_RUNNER 변수 |

## dry-run 로그

```
=== DRY RUN MODE — 실제 설치 없음 ===

==============================
  ci-box setup · ROLE=ci-box
  host: youngkyus-macboo
==============================

[ci-box] - skip: Homebrew already installed (Homebrew 7.0.16)
[ci-box] - skip: nvm already installed
[DRY]   nvm install 20.19.6 && nvm alias default 20.19.6
[ci-box] - skip: pnpm 9.15.0 already installed
[ci-box] - skip: postgresql@16 already installed
[ci-box] - skip: postgresql@16 service already running
[DRY]   createuser -s postgres (if not exists)
[DRY]   verify Postgres port=5432
[ci-box] Installing Playwright browsers...
[DRY]   npx playwright install --with-deps chromium
[ci-box] ✓ Playwright chromium installed
[ci-box] Installing OrbStack...
[DRY]   brew install --cask orbstack
[ci-box] ✓ OrbStack installed
[ci-box] - skip: gh CLI already installed (gh version 2.92.0 (2026-04-28))
[ci-box] - skip: Tailscale already installed
[ci-box] Configuring power settings (no sleep, auto-restart)...
[DRY]   sudo pmset -a sleep 0
[DRY]   sudo pmset -a displaysleep 10
[DRY]   sudo pmset -a disksleep 0
[DRY]   sudo systemsetup -setrestartpowerfailure on
[ci-box] ✓ Power settings applied (display sleeps after 10 min · machine never sleeps · auto-restart on power failure)

==============================
  GitHub Actions 러너 등록
==============================

러너 4개를 등록합니다:
  1. storeport heavy  (label: curiocity-mac)
  2. storeport light  (label: curiocity-mac-light)
  3. fork heavy       (label: curiocity-mac-fork)
  4. fork light       (label: curiocity-mac-fork-light)

[DRY] storeport heavy runner: ci-box-storeport-heavy-youngkyus-macboo  labels=curiocity-mac
[DRY] storeport light runner: ci-box-storeport-light-youngkyus-macboo  labels=curiocity-mac-light
[DRY] fork heavy runner:      ci-box-fork-heavy-youngkyus-macboo       labels=curiocity-mac-fork
[DRY] fork light runner:      ci-box-fork-light-youngkyus-macboo       labels=curiocity-mac-fork-light
[DRY] launchd plist x4 → ~/Library/LaunchAgents/
[DRY] launchctl load -w (x4)

==============================
  이관 2단계 절차
==============================
1단계 (지금): 아이맥 러너 추가 · 맥북 러너 유지
2단계 (안정 확인 후 Kyu 판단): 맥북 러너 중지

=== setup.sh 완료 ===
```

## 아이맥에서 Kyu 가 칠 명령 (단계별 복붙용)

### 0. relay 클론 (최초 1회)

```bash
git clone https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay
```

### 1. dry-run 먼저 확인

```bash
bash ~/projects/curiocity-relay/scripts/ci-box/setup.sh --dry-run
```

### 2. 토큰 발급

storeport: https://github.com/CuriocityDevAi/storeport/settings/actions/runners/new?arch=arm64&os=osx  
fork: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/settings/actions/runners/new?arch=arm64&os=osx

### 3. 실제 설치

```bash
bash ~/projects/curiocity-relay/scripts/ci-box/setup.sh
```

스크립트가 sudo 비밀번호와 토큰 2개를 순서대로 묻습니다.

### 4. 러너 확인

```bash
launchctl list | grep actions.runner
```

GitHub Settings → Actions → Runners 에서 4개 ci-box 러너 `idle` 확인.

### 5. 맥북 러너 중지 (안정 확인 후)

```bash
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1.plist
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.curiocity-mac-light.plist
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork.plist
launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light.plist
```

## relay status/runners 반영 확인

hub-runner `collectCiRunnersSync` (scripts/hub-runner-v8.3.mjs:852) 가 GitHub API
`repos/{org}/{repo}/actions/runners` 를 직접 읽으므로 ci-box 러너 등록 즉시
`status/runners/all.json` `ci_runners` 에 자동 반영됨. ci-watch/heartbeat 수정 불필요.
