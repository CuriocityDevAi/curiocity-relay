PASS · PR #38 · https://github.com/CuriocityDevAi/curiocity-relay/pull/38

## 수정 파일
`scripts/ci-box/lib/install.sh` 만 변경 (setup.sh · runner.sh 무변경)

## 버그 원인 & 수정

| # | 함수 | 원인 | 수정 |
|---|------|------|------|
| 1 | `install_homebrew` | `$(curl …install.sh)` 명령 치환이 `_run` 호출 전에 셸 확장 → dry-run이어도 curl 실행·전문 출력 | `DRY_RUN` 선 분기로 명령 치환 평가 차단, 문자열 출력만 |
| 2 | `install_nvm_node` | `_run curl … \| bash` 에서 `\| bash` 가 `_run` 바깥 → dry-run의 `[DRY] …` 가 bash에 파이프 → `[DRY]: command not found` 충돌 | `DRY_RUN` 선 분기로 파이프 단락 |
| 3 | `install_postgres` | `brew services list \| grep -q …` stderr 미억제 → `brew: command not found` 노이즈 | `2>/dev/null` 추가 (`brew list` 패턴 통일) |

실제 설치 경로(비 dry-run) 동작 변경 없음.

## 검증 로그

```
shellcheck -S warning scripts/ci-box/{setup.sh,lib/install.sh,lib/runner.sh}
# → 0 warnings (clean)

TMPHOME=$(mktemp -d) && HOME="$TMPHOME" env -i HOME="$TMPHOME" PATH=/usr/bin:/bin \
  bash scripts/ci-box/setup.sh --dry-run 2>&1
```

출력 (관련 부분만):

```
=== DRY RUN MODE — 실제 설치 없음 ===
...
[ci-box] Installing Homebrew...
[DRY]   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
[DRY]   eval "$(/opt/homebrew/bin/brew shellenv)"
[ci-box] ✓ Homebrew installed
[ci-box] Installing nvm...
[DRY]   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
[ci-box] ✓ nvm installed
[DRY]   nvm install 20.19.6 && nvm alias default 20.19.6
[ci-box] Installing pnpm 9.15.0...
[DRY]   npm install -g pnpm@9.15.0
[ci-box] ✓ pnpm 9.15.0 installed
[ci-box] Installing postgresql@16...
[DRY]   brew install postgresql@16
[ci-box] ✓ postgresql@16 installed
[ci-box] Starting postgresql@16 service...
[DRY]   brew services start postgresql@16
[ci-box] ✓ postgresql@16 service started
[DRY]   createuser -s postgres (if not exists)
[DRY]   verify Postgres port=5432
[ci-box] Installing Playwright browsers...
[DRY]   npx playwright install --with-deps chromium
[ci-box] ✓ Playwright chromium installed
[ci-box] Installing OrbStack...
[DRY]   brew install --cask orbstack
[ci-box] ✓ OrbStack installed
[ci-box] Installing gh CLI...
[DRY]   brew install gh
[ci-box] ✓ gh CLI installed
[ci-box] - skip: Tailscale already installed
[ci-box] Configuring power settings (no sleep, auto-restart)...
[DRY]   sudo pmset -a sleep 0
[DRY]   sudo pmset -a displaysleep 10
[DRY]   sudo pmset -a disksleep 0
[DRY]   sudo systemsetup -setrestartpowerfailure on
[ci-box] ✓ Power settings applied (...)
...
[DRY] storeport heavy runner: ci-box-storeport-heavy-youngkyus-macboo  labels=curiocity-mac
[DRY] storeport light runner: ci-box-storeport-light-youngkyus-macboo  labels=curiocity-mac-light
[DRY] fork heavy runner:      ci-box-fork-heavy-youngkyus-macboo       labels=curiocity-mac-fork
[DRY] fork light runner:      ci-box-fork-light-youngkyus-macboo       labels=curiocity-mac-fork-light
[DRY] launchd plist x4 → ~/Library/LaunchAgents/
[DRY] launchctl load -w (x4)
...
=== setup.sh 완료 ===
```

에러 0 · 스크립트 정상 완주.
