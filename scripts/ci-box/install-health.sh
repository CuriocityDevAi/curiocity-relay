#!/usr/bin/env bash
# scripts/ci-box/install-health.sh — ci-box heartbeat launchd 설치/제거 (M1-1126-C)
#
# 사용법:
#   bash install-health.sh            설치
#   bash install-health.sh --uninstall   제거
#   bash install-health.sh --status      현재 상태 확인
#
# 전제: health.sh 와 같은 디렉토리에 위치

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_LABEL="dev.curiocity.ci-box-health"
PLIST_DST="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
PLIST_TEMPLATE="$SCRIPT_DIR/ci-box-health.plist.template"
LOG_FILE="$HOME/Library/Logs/ci-box-health.log"

_ok()   { echo "[health-install] ✓ $*"; }
_err()  { echo "[health-install] ✗ $*" >&2; }
_info() { echo "[health-install]   $*"; }

# ── 제거 ──────────────────────────────────────────────────────────────────────
cmd_uninstall() {
    if launchctl list "$PLIST_LABEL" &>/dev/null 2>&1; then
        launchctl unload -w "$PLIST_DST" 2>/dev/null || true
        _ok "launchd job 제거됨"
    else
        _info "launchd job 없음 (이미 제거됨)"
    fi

    if [[ -f "$PLIST_DST" ]]; then
        rm -f "$PLIST_DST"
        _ok "plist 파일 삭제: $PLIST_DST"
    fi

    echo ""
    echo "=== ci-box heartbeat 제거 완료 ==="
    echo "재설치: bash $SCRIPT_DIR/install-health.sh"
}

# ── 상태 확인 ─────────────────────────────────────────────────────────────────
cmd_status() {
    echo "=== ci-box heartbeat 상태 ==="
    if launchctl list "$PLIST_LABEL" &>/dev/null 2>&1; then
        _ok "launchd job 등록됨"
        launchctl list "$PLIST_LABEL" 2>/dev/null || true
    else
        _info "launchd job 없음 (미설치)"
    fi

    echo ""
    echo "--- 최근 로그 (마지막 20줄) ---"
    if [[ -f "$LOG_FILE" ]]; then
        tail -20 "$LOG_FILE"
    else
        _info "로그 없음: $LOG_FILE"
    fi

    echo ""
    echo "--- relay 최신 상태 ---"
    local relay_dir="${CI_BOX_RELAY_DIR:-$HOME/.ci-box-relay}"
    if [[ -f "$relay_dir/status/ci-box/imac.json" ]]; then
        python3 -c "
import json
d = json.load(open('$relay_dir/status/ci-box/imac.json'))
print('ts:', d.get('ts'))
print('health:', d.get('health'), '—', d.get('reasons', []))
print('runners:', d.get('runners', {}))
" 2>/dev/null || cat "$relay_dir/status/ci-box/imac.json"
    else
        _info "relay 로컬 클론 없음 (첫 실행 후 생성됨)"
    fi
}

# ── 설치 ──────────────────────────────────────────────────────────────────────
cmd_install() {
    # 필요 파일 확인
    if [[ ! -f "$SCRIPT_DIR/health.sh" ]]; then
        _err "health.sh 없음: $SCRIPT_DIR/health.sh"
        exit 1
    fi
    if [[ ! -f "$PLIST_TEMPLATE" ]]; then
        _err "plist 템플릿 없음: $PLIST_TEMPLATE"
        exit 1
    fi

    # gh auth 확인
    if ! command -v gh &>/dev/null; then
        echo ""
        echo "⚠  gh CLI 없음. Homebrew 로 설치 후 로그인:"
        echo "   brew install gh"
        echo "   gh auth login"
    elif ! gh auth status &>/dev/null 2>&1; then
        echo ""
        echo "⚠  gh 미로그인. 아래 명령으로 1회 로그인:"
        echo "   gh auth login"
        echo "   (로그인 후 install-health.sh 를 다시 실행하거나 launchd 를 reload)"
    else
        _ok "gh auth 확인됨"
    fi

    # plist 생성 (템플릿 치환)
    mkdir -p "$HOME/Library/LaunchAgents"
    sed \
        -e "s|__SCRIPT_DIR__|${SCRIPT_DIR}|g" \
        -e "s|__HOME__|${HOME}|g" \
        "$PLIST_TEMPLATE" > "$PLIST_DST"
    _ok "plist 생성: $PLIST_DST"

    # 기존 job unload (에러 무시)
    launchctl unload -w "$PLIST_DST" 2>/dev/null || true

    # job 등록
    if launchctl load -w "$PLIST_DST"; then
        _ok "launchd job 등록됨: $PLIST_LABEL"
    else
        _err "launchd load 실패"
        exit 1
    fi

    echo ""
    echo "=== ci-box heartbeat 설치 완료 ==="
    _info "5분마다 relay status/ci-box/imac.json 갱신"
    _info "로그: $LOG_FILE"
    _info "dry-run 테스트: bash $SCRIPT_DIR/health.sh --dry-run"
    _info "상태 확인: bash $SCRIPT_DIR/install-health.sh --status"
    _info "제거:      bash $SCRIPT_DIR/install-health.sh --uninstall"
}

# ── 진입점 ────────────────────────────────────────────────────────────────────
case "${1:-install}" in
    --uninstall) cmd_uninstall ;;
    --status)    cmd_status    ;;
    install|*)   cmd_install   ;;
esac
