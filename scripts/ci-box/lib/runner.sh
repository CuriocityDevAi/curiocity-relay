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
        _dry "$dir/config.sh --url $repo_url --token <TOKEN> --name $runner_name --labels $labels --unattended"
        return 0
    fi

    "$dir/config.sh" \
        --url "$repo_url" \
        --token "$token" \
        --name "$runner_name" \
        --labels "$labels" \
        --unattended
    _ok "runner '$runner_name' configured"
}

# launchd 서비스 설치 및 시작 (idempotent)
# 공식 ./svc.sh install 을 사용해 runsvc.sh 복사·로그 디렉토리·plist 생성을 위임한다.
# 수동 plist 작성을 하지 않으므로 UserName 키 오류나 runsvc.sh 누락이 발생하지 않는다.
_install_launchd() {
    local dir="$1"
    local org_repo="$2"
    local runner_name="$3"

    local label
    label=$(_plist_label "$org_repo" "$runner_name")

    if launchctl list "$label" >/dev/null 2>&1; then
        _skip "launchd service $label already loaded"
        return 0
    fi

    _step "Installing launchd service via svc.sh: $label..."
    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "cd $dir && ./svc.sh install"
        _dry "cd $dir && ./svc.sh start"
        return 0
    fi

    (cd "$dir" && ./svc.sh install)
    (cd "$dir" && ./svc.sh start)
    _ok "launchd service $label installed and started"
}

# 러너 launchd PID 검증: 숫자 PID 면 OK · '-' 이면 빨간 경고 + stderr.log 꼬리
verify_runner_pid() {
    local org_repo="$1"
    local runner_name="$2"
    local label
    label=$(_plist_label "$org_repo" "$runner_name")

    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "launchctl list | grep $label  # verify PID numeric"
        return 0
    fi

    local pid
    pid=$(launchctl list 2>/dev/null | awk -v lbl="$label" '$3 == lbl { print $1 }')

    if [[ "${pid:-}" =~ ^[0-9]+$ ]]; then
        _ok "$label  (PID $pid)"
    else
        local msg="[ci-box] ✗ $label — PID=${pid:--} (서비스 미시작)"
        printf '\033[31m%s\033[0m\n' "$msg" >&2
        local log_dir="$HOME/Library/Logs/$label"
        if [ -f "$log_dir/stderr.log" ]; then
            echo "  --- stderr.log 꼬리 (최근 10줄) ---" >&2
            tail -10 "$log_dir/stderr.log" >&2
            echo "  ---" >&2
        fi
        return 1
    fi
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

# gh API wrapper — 테스트에서 함수 override 로 stub 주입 가능
_gh_runner_label_names() {
    local org_repo="$1"
    local runner_name="$2"
    gh api "repos/$org_repo/actions/runners" \
        --jq ".runners[] | select(.name == \"$runner_name\") | .labels[].name" 2>/dev/null || true
}

_gh_runner_id() {
    local org_repo="$1"
    local runner_name="$2"
    gh api "repos/$org_repo/actions/runners" \
        --jq ".runners[] | select(.name == \"$runner_name\") | .id" 2>/dev/null || true
}

# 러너 GitHub 라벨 검증: self-hosted + custom 라벨 존재 여부 확인
# 없으면 빨간 경고 + 수동 추가 명령 출력
verify_runner_labels() {
    local org_repo="$1"
    local runner_name="$2"
    local custom_label="$3"

    if [ "${DRY_RUN:-0}" = "1" ]; then
        _dry "gh api repos/$org_repo/actions/runners # verify $runner_name: self-hosted + $custom_label"
        return 0
    fi

    local label_names
    label_names=$(_gh_runner_label_names "$org_repo" "$runner_name")

    if [ -z "$label_names" ]; then
        printf '\033[33m[ci-box] ⚠ %s — GitHub API 러너 미발견 (오프라인·미등록)\033[0m\n' "$runner_name" >&2
        return 1
    fi

    local missing=()
    for lbl in "self-hosted" "$custom_label"; do
        if ! echo "$label_names" | grep -qx "$lbl"; then
            missing+=("$lbl")
        fi
    done

    if [ "${#missing[@]}" -eq 0 ]; then
        _ok "$runner_name  labels OK (self-hosted, $custom_label)"
        return 0
    fi

    local runner_id
    runner_id=$(_gh_runner_id "$org_repo" "$runner_name")
    printf '\033[31m[ci-box] ✗ %s — 라벨 누락: %s\033[0m\n' "$runner_name" "${missing[*]}" >&2
    printf '\033[31m  수동 추가 명령:\033[0m\n' >&2
    for lbl in "${missing[@]}"; do
        printf '\033[31m  gh api repos/%s/actions/runners/%s/labels -X POST -f "labels[]=%s"\033[0m\n' \
            "$org_repo" "$runner_id" "$lbl" >&2
    done
    return 1
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
