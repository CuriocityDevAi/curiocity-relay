#!/usr/bin/env bash
# scripts/ci-box/lib/install.sh — 설치 헬퍼 함수
# 이 파일을 직접 실행하지 말 것. setup.sh 가 source 한다.

set -euo pipefail

# 출처: .path 파일 실측 경로
NODE_VERSION="20.19.6"
PNPM_VERSION="9.15.0"

# 출처: heavy-steps/action.yml DATABASE_URL
PG_VERSION="16"
PG_PORT="5432"
# export so callers/setup.sh can reference when constructing DATABASE_URL
export PG_USER="postgres"
export PG_PASSWORD="postgres"

HOMEBREW_PREFIX="${HOMEBREW_PREFIX:-/opt/homebrew}"

_step() { echo "[ci-box] $*"; }
_ok()   { echo "[ci-box] ✓ $*"; }
_skip() { echo "[ci-box] - skip: $*"; }
_dry()  { echo "[DRY]   $*"; }

# DRY_RUN=1 이면 실제 실행 없이 출력만
_run() {
    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "$*"
    else
        "$@"
    fi
}

install_homebrew() {
    if command -v brew >/dev/null 2>&1; then
        _skip "Homebrew already installed ($(brew --version | head -1))"
        return 0
    fi
    _step "Installing Homebrew..."
    _run /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # 현재 세션 PATH 에 brew 추가 (새 셸에선 자동이지만 현 세션은 명시적으로 필요)
    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "eval \"\$(${HOMEBREW_PREFIX}/bin/brew shellenv)\""
    elif [ -x "${HOMEBREW_PREFIX}/bin/brew" ]; then
        eval "$("${HOMEBREW_PREFIX}/bin/brew" shellenv)"
    fi
    _ok "Homebrew installed"
}

install_nvm_node() {
    local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
    if [ -s "$nvm_dir/nvm.sh" ]; then
        _skip "nvm already installed"
    else
        _step "Installing nvm..."
        _run curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        _ok "nvm installed"
    fi

    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "nvm install $NODE_VERSION && nvm alias default $NODE_VERSION"
        return 0
    fi

    export NVM_DIR="${nvm_dir}"
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

    if nvm ls "$NODE_VERSION" >/dev/null 2>&1; then
        _skip "Node $NODE_VERSION already installed"
    else
        _step "Installing Node $NODE_VERSION..."
        nvm install "$NODE_VERSION"
        _ok "Node $NODE_VERSION installed"
    fi
    nvm alias default "$NODE_VERSION"
    _ok "Node default -> $NODE_VERSION"
}

install_pnpm() {
    if command -v pnpm >/dev/null 2>&1 && pnpm --version 2>/dev/null | grep -qF "$PNPM_VERSION"; then
        _skip "pnpm $PNPM_VERSION already installed"
        return 0
    fi
    _step "Installing pnpm $PNPM_VERSION..."
    _run npm install -g "pnpm@$PNPM_VERSION"
    _ok "pnpm $PNPM_VERSION installed"
}

install_postgres() {
    if brew list "postgresql@$PG_VERSION" >/dev/null 2>&1; then
        _skip "postgresql@$PG_VERSION already installed"
    else
        _step "Installing postgresql@$PG_VERSION..."
        _run brew install "postgresql@$PG_VERSION"
        _ok "postgresql@$PG_VERSION installed"
    fi

    if brew services list | grep -q "postgresql@$PG_VERSION.*started"; then
        _skip "postgresql@$PG_VERSION service already running"
    else
        _step "Starting postgresql@$PG_VERSION service..."
        _run brew services start "postgresql@$PG_VERSION"
        _ok "postgresql@$PG_VERSION service started"
    fi

    local pg_bin="$HOMEBREW_PREFIX/opt/postgresql@$PG_VERSION/bin"
    if [ "${DRY_RUN:-0}" = "0" ]; then
        if "$pg_bin/psql" -U postgres -c "SELECT 1;" >/dev/null 2>&1; then
            _skip "postgres user already exists"
        else
            _step "Creating postgres superuser..."
            "$pg_bin/createuser" -s postgres 2>/dev/null || true
            _ok "postgres user created"
        fi

        if "$pg_bin/psql" -U postgres -c "SELECT pg_postmaster_start_time();" >/dev/null 2>&1; then
            local actual_port
            actual_port=$("$pg_bin/psql" -U postgres -t -c "SHOW port;" 2>/dev/null | tr -d ' \n')
            if [ "$actual_port" != "$PG_PORT" ]; then
                echo "[ci-box] WARNING: Postgres port is $actual_port, expected $PG_PORT"
            else
                _ok "Postgres running on port $PG_PORT"
            fi
        fi
    else
        _dry "createuser -s postgres (if not exists)"
        _dry "verify Postgres port=$PG_PORT"
    fi
}

install_playwright_browsers() {
    _step "Installing Playwright browsers..."
    _run npx playwright install --with-deps chromium
    _ok "Playwright chromium installed"
}

install_orbstack() {
    if [ -d "/Applications/OrbStack.app" ]; then
        _skip "OrbStack already installed"
        return 0
    fi
    _step "Installing OrbStack..."
    _run brew install --cask orbstack
    _ok "OrbStack installed"
}

install_gh_cli() {
    if command -v gh >/dev/null 2>&1; then
        _skip "gh CLI already installed ($(gh --version | head -1))"
        return 0
    fi
    _step "Installing gh CLI..."
    _run brew install gh
    _ok "gh CLI installed"
}

install_tailscale() {
    if [ -d "/Applications/Tailscale.app" ] || command -v tailscale >/dev/null 2>&1; then
        _skip "Tailscale already installed"
        return 0
    fi
    _step "Installing Tailscale..."
    _run brew install --cask tailscale
    echo "[ci-box] NOTE: Tailscale 설치 후 직접 로그인 필요: open /Applications/Tailscale.app"
}

configure_power() {
    _step "Configuring power settings (no sleep, auto-restart)..."
    _run sudo pmset -a sleep 0
    _run sudo pmset -a displaysleep 10
    _run sudo pmset -a disksleep 0
    _run sudo systemsetup -setrestartpowerfailure on 2>/dev/null || true
    _ok "Power settings applied (display sleeps after 10 min · machine never sleeps · auto-restart on power failure)"
}
