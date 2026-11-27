#!/usr/bin/env bash
# scripts/ci-box/setup.sh — CI 전용 기계 설치 스크립트 (M2-1125-Z)
#
# 사용법:
#   bash setup.sh              실제 설치 (루트 sudo 비밀번호 필요)
#   bash setup.sh --dry-run    할 일 목록만 출력 (실제 설치 없음)
#
# 기계 역할: ROLE=ci-box
# 설치 대상: Homebrew · Node 20.19.6 · pnpm 9.15.0 · PostgreSQL 16
#            Playwright Chromium · OrbStack · gh CLI · Tailscale
# 러너 등록: storeport heavy/light · agilo-medusa-pos-fork heavy/light
#
# 근거 (버전 출처):
#   Node 20.19.6  — actions-runner/.env NVM_BIN 경로 실측
#   pnpm 9.15.0   — .github/actions/heavy-steps/action.yml pnpm/action-setup 버전
#   Postgres 16   — ci.yml / heavy-steps/action.yml postgres:16
#   러너 라벨     — .github/workflows/ci.yml runs-on 실측
#                   fork: .github/scripts/route-fork.sh MAC_RUNNER 변수 실측

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLE="ci-box"

export DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
    export DRY_RUN=1
    echo "=== DRY RUN MODE — 실제 설치 없음 ==="
fi

# shellcheck source=lib/install.sh
source "$SCRIPT_DIR/lib/install.sh"
# shellcheck source=lib/runner.sh
source "$SCRIPT_DIR/lib/runner.sh"

SHORT_HOST=$(hostname -s | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' | cut -c1-16)

echo ""
echo "=============================="
echo "  ci-box setup · ROLE=$ROLE"
echo "  host: $SHORT_HOST"
echo "=============================="
echo ""

# 1. 기본 도구 설치
install_homebrew
install_nvm_node
install_pnpm
install_postgres
install_playwright_browsers
install_orbstack
install_gh_cli
install_tailscale

# 2. 절전 끄기
configure_power

echo ""
echo "=============================="
echo "  GitHub Actions 러너 등록"
echo "=============================="
echo ""
echo "러너 6개를 등록합니다 (M2-1126-T: heavy 워커 2개로 증설 — 메모리 실측 후 활성화):"
echo "  1. storeport heavy  (label: curiocity-mac)"
echo "  2. storeport heavy2 (label: curiocity-mac)   ← heavy 2번째"
echo "  3. storeport light  (label: curiocity-mac-light)"
echo "  4. fork heavy       (label: curiocity-mac-fork)"
echo "  5. fork heavy2      (label: curiocity-mac-fork)   ← heavy 2번째"
echo "  6. fork light       (label: curiocity-mac-fork-light)"
echo ""
echo "  주의: Playwright 포트 충돌 (5173) — storeport#464·fork#278 머지 후"
echo "        apps/commerce-core/playwright.config.ts 수정(CI_VITE_PORT 파라미터화) 필수."
echo ""
echo "토큰 얻는 방법 (각 저장소마다):"
echo "  GitHub → 저장소 Settings → Actions → Runners → New self-hosted runner"
echo "  'Configure' 화면에 나오는 --token 값을 복사"
echo ""

# 러너 이름 = <role>-<repo>-<heavy|light>-<shorthost>
RUNNER_STOREPORT_HEAVY="${ROLE}-storeport-heavy-${SHORT_HOST}"
RUNNER_STOREPORT_HEAVY2="${ROLE}-storeport-heavy2-${SHORT_HOST}"
RUNNER_STOREPORT_LIGHT="${ROLE}-storeport-light-${SHORT_HOST}"
RUNNER_FORK_HEAVY="${ROLE}-fork-heavy-${SHORT_HOST}"
RUNNER_FORK_HEAVY2="${ROLE}-fork-heavy2-${SHORT_HOST}"
RUNNER_FORK_LIGHT="${ROLE}-fork-light-${SHORT_HOST}"

REPO_STOREPORT="CuriocityDevAi/storeport"
REPO_FORK="CuriocityDevAi/agilo-medusa-pos-fork"

if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY] storeport heavy runner:  $RUNNER_STOREPORT_HEAVY   labels=self-hosted,macOS,ARM64,curiocity-mac"
    echo "[DRY] storeport heavy2 runner: $RUNNER_STOREPORT_HEAVY2  labels=self-hosted,macOS,ARM64,curiocity-mac"
    echo "[DRY] storeport light runner:  $RUNNER_STOREPORT_LIGHT   labels=self-hosted,macOS,ARM64,curiocity-mac-light"
    echo "[DRY] fork heavy runner:       $RUNNER_FORK_HEAVY        labels=self-hosted,macOS,ARM64,curiocity-mac-fork"
    echo "[DRY] fork heavy2 runner:      $RUNNER_FORK_HEAVY2       labels=self-hosted,macOS,ARM64,curiocity-mac-fork"
    echo "[DRY] fork light runner:       $RUNNER_FORK_LIGHT        labels=self-hosted,macOS,ARM64,curiocity-mac-fork-light"
    echo "[DRY] ./svc.sh install x6  (runsvc.sh 복사 · plist 생성 · 로그 디렉토리)"
    echo "[DRY] ./svc.sh start x6   (launchctl load)"
else
    echo "storeport 등록 토큰 입력 (echo 없음):"
    read -rs TOKEN_STOREPORT
    echo ""

    echo "agilo-medusa-pos-fork 등록 토큰 입력 (echo 없음):"
    read -rs TOKEN_FORK
    echo ""

    register_runner "sp-heavy"  "$REPO_STOREPORT" "$RUNNER_STOREPORT_HEAVY"  "curiocity-mac"            "$TOKEN_STOREPORT"
    register_runner "sp-heavy2" "$REPO_STOREPORT" "$RUNNER_STOREPORT_HEAVY2" "curiocity-mac"            "$TOKEN_STOREPORT"
    register_runner "sp-light"  "$REPO_STOREPORT" "$RUNNER_STOREPORT_LIGHT"  "curiocity-mac-light"      "$TOKEN_STOREPORT"
    register_runner "fork-heavy"  "$REPO_FORK" "$RUNNER_FORK_HEAVY"  "curiocity-mac-fork"       "$TOKEN_FORK"
    register_runner "fork-heavy2" "$REPO_FORK" "$RUNNER_FORK_HEAVY2" "curiocity-mac-fork"       "$TOKEN_FORK"
    register_runner "fork-light"  "$REPO_FORK" "$RUNNER_FORK_LIGHT"  "curiocity-mac-fork-light" "$TOKEN_FORK"

    unset TOKEN_STOREPORT TOKEN_FORK
fi

echo ""
echo "=============================="
echo "  러너 상태 검증 (launchd PID)"
echo "=============================="
_verify_all_ok=0
verify_runner_pid "$REPO_STOREPORT" "$RUNNER_STOREPORT_HEAVY"  || _verify_all_ok=1
verify_runner_pid "$REPO_STOREPORT" "$RUNNER_STOREPORT_HEAVY2" || _verify_all_ok=1
verify_runner_pid "$REPO_STOREPORT" "$RUNNER_STOREPORT_LIGHT"  || _verify_all_ok=1
verify_runner_pid "$REPO_FORK"      "$RUNNER_FORK_HEAVY"       || _verify_all_ok=1
verify_runner_pid "$REPO_FORK"      "$RUNNER_FORK_HEAVY2"      || _verify_all_ok=1
verify_runner_pid "$REPO_FORK"      "$RUNNER_FORK_LIGHT"       || _verify_all_ok=1
if [ "$_verify_all_ok" != "0" ]; then
    echo ""
    printf '\033[31m[ci-box] 경고: 일부 러너가 시작되지 않았습니다. 위 stderr.log 를 확인하세요.\033[0m\n' >&2
fi
unset _verify_all_ok

echo ""
echo "=============================="
echo "  러너 라벨 검증 (GitHub API)"
echo "=============================="
_label_all_ok=0
verify_runner_labels "$REPO_STOREPORT" "$RUNNER_STOREPORT_HEAVY"  "curiocity-mac"            || _label_all_ok=1
verify_runner_labels "$REPO_STOREPORT" "$RUNNER_STOREPORT_HEAVY2" "curiocity-mac"            || _label_all_ok=1
verify_runner_labels "$REPO_STOREPORT" "$RUNNER_STOREPORT_LIGHT"  "curiocity-mac-light"      || _label_all_ok=1
verify_runner_labels "$REPO_FORK"      "$RUNNER_FORK_HEAVY"       "curiocity-mac-fork"       || _label_all_ok=1
verify_runner_labels "$REPO_FORK"      "$RUNNER_FORK_HEAVY2"      "curiocity-mac-fork"       || _label_all_ok=1
verify_runner_labels "$REPO_FORK"      "$RUNNER_FORK_LIGHT"       "curiocity-mac-fork-light" || _label_all_ok=1
if [ "$_label_all_ok" != "0" ]; then
    echo ""
    printf '\033[31m[ci-box] 경고: 라벨이 누락된 러너가 있습니다. 위 수동 추가 명령을 실행하세요.\033[0m\n' >&2
fi
unset _label_all_ok

echo ""
echo "=============================="
echo "  Remote Login (SSH) 안내"
echo "=============================="
echo "아이맥에서 SSH 허용하려면:"
echo "  System Settings → General → Sharing → Remote Login 켜기"
echo "  맥북에서: ssh $(whoami)@<아이맥 IP 또는 Tailscale 주소>"
echo ""

echo ""
echo "=============================="
echo "  이관 2단계 절차"
echo "=============================="
echo "1단계 (지금): 아이맥 러너 추가 · 맥북 러너 유지"
echo "  - GitHub에서 4개 러너 모두 online 확인 후 CI PR 1~2개로 병행 테스트"
echo "  - relay status/runners 에 ci-box 러너 자동 반영 확인"
echo ""
echo "2단계 (안정 확인 후 Kyu 판단): 맥북 러너 중지"
echo "  launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1.plist"
echo "  launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.curiocity-mac-light.plist"
echo "  launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork.plist"
echo "  launchctl unload -w ~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light.plist"
echo ""

echo "=== setup.sh 완료 ==="
