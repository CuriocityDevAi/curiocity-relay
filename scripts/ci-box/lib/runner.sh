#!/usr/bin/env bash
# scripts/ci-box/lib/runner.sh — GitHub Actions 러너 등록 헬퍼
# 이 파일을 직접 실행하지 말 것. setup.sh 가 source 한다.

set -euo pipefail

# 맥북 현행 러너 이름 (참조용)
# storeport heavy : Youngkyus-MacBook-Pro-M1  (label: curiocity-mac)
# storeport light : curiocity-mac-light       (label: curiocity-mac-light)
# fork heavy      : curiocity-mac-fork        (label: curiocity-mac-fork)
# fork light      : curiocity-mac-fork-light  (label: curiocity-mac-fork-light)

RUNNER_VERSION="2.338.2"
RUNNER_OS="osx-arm64"
RUNNER_DIR_BASE="$HOME"

# 러너 디렉토리 이름 규칙
_runner_dir() {
    local slot="$1"
    echo "$RUNNER_DIR_BASE/actions-runner-ci-box-$slot"
}

# launchd plist 레이블
_plist_label() {
    local org_repo="$1"
    local runner_name="$2"
    echo "actions.runner.${org_repo/\//-}.${runner_name}"
}

_plist_path() {
    local label="$1"
    echo "$HOME/Library/LaunchAgents/${label}.plist"
}

_runner_tarball_url() {
    echo "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-${RUNNER_OS}-${RUNNER_VERSION}.tar.gz"
}

# 러너 바이너리 다운로드 및 압축 해제 (idempotent)
_download_runner() {
    local dir="$1"
    if [ -f "$dir/config.sh" ]; then
        _skip "runner binary already in $dir"
        return 0
    fi
    _step "Downloading GitHub Actions runner v$RUNNER_VERSION to $dir..."
    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "mkdir -p $dir"
        _dry "curl -o $dir/runner.tar.gz $(_runner_tarball_url)"
        _dry "tar xzf $dir/runner.tar.gz -C $dir"
        return 0
    fi
    mkdir -p "$dir"
    curl -o "$dir/runner.tar.gz" -L "$(_runner_tarball_url)"
    tar xzf "$dir/runner.tar.gz" -C "$dir"
    rm "$dir/runner.tar.gz"
    _ok "runner binary extracted to $dir"
}

# 러너 등록 (config.sh 호출)
_configure_runner() {
    local dir="$1"
    local repo_url="$2"
    local runner_name="$3"
    local labels="$4"
    local token="$5"

    if [ -f "$dir/.runner" ]; then
        _skip "runner already configured in $dir ($(grep agentName "$dir/.runner" | tr -d ' ",' | cut -d: -f2))"
        return 0
    fi

    _step "Configuring runner '$runner_name' for $repo_url..."
    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "$dir/config.sh --url $repo_url --token <TOKEN> --name $runner_name --labels $labels --no-default-labels --unattended"
        return 0
    fi

    "$dir/config.sh" \
        --url "$repo_url" \
        --token "$token" \
        --name "$runner_name" \
        --labels "$labels" \
        --no-default-labels \
        --unattended
    _ok "runner '$runner_name' configured"
}

# launchd plist 생성 및 등록 (idempotent)
_install_launchd() {
    local dir="$1"
    local org_repo="$2"
    local runner_name="$3"
    local username
    username=$(whoami)

    local label
    label=$(_plist_label "$org_repo" "$runner_name")
    local plist
    plist=$(_plist_path "$label")
    local log_dir="$HOME/Library/Logs/$label"

    if launchctl list "$label" >/dev/null 2>&1; then
        _skip "launchd service $label already loaded"
        return 0
    fi

    _step "Installing launchd service: $label..."
    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "mkdir -p $log_dir"
        _dry "write plist: $plist"
        _dry "launchctl load -w $plist"
        return 0
    fi

    mkdir -p "$log_dir"
    cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>EnvironmentVariables</key>
	<dict>
		<key>ACTIONS_RUNNER_SVC</key>
		<string>1</string>
	</dict>
	<key>KeepAlive</key>
	<true/>
	<key>Label</key>
	<string>${label}</string>
	<key>ProcessType</key>
	<string>Interactive</string>
	<key>ProgramArguments</key>
	<array>
		<string>${dir}/runsvc.sh</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>SessionCreate</key>
	<true/>
	<key>StandardErrorPath</key>
	<string>${log_dir}/stderr.log</string>
	<key>StandardOutPath</key>
	<string>${log_dir}/stdout.log</string>
	<key>UserName</key>
	<string>${username}</string>
	<key>WorkingDirectory</key>
	<string>${dir}</string>
</dict>
</plist>
PLIST

    launchctl load -w "$plist"
    _ok "launchd service $label started"
}

# 단일 러너 전체 설치 흐름
register_runner() {
    local slot="$1"
    local org_repo="$2"
    local runner_name="$3"
    local labels="$4"
    local token="$5"

    local repo_url="https://github.com/$org_repo"
    local dir
    dir=$(_runner_dir "$slot")

    _download_runner "$dir"
    _configure_runner "$dir" "$repo_url" "$runner_name" "$labels" "$token"
    _install_launchd "$dir" "$org_repo" "$runner_name"
}

# 러너 중지 (맥북 오프보딩용)
stop_macbook_runner() {
    local label="$1"
    local plist
    plist="$HOME/Library/LaunchAgents/${label}.plist"
    if launchctl list "$label" >/dev/null 2>&1; then
        _step "Stopping $label..."
        launchctl unload -w "$plist"
        _ok "Stopped $label"
    else
        _skip "$label not running"
    fi
}
