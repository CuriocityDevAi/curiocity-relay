#!/usr/bin/env bash
# scripts/test/ci-box-labels.test.sh — verify_runner_labels 단위 테스트
# 가짜 gh 응답으로 라벨 검증 함수의 정상/누락 경로를 검증.
# 실행: bash scripts/test/ci-box-labels.test.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DRY_RUN=0
# shellcheck source=../ci-box/lib/install.sh
source "$SCRIPT_DIR/../ci-box/lib/install.sh"
# shellcheck source=../ci-box/lib/runner.sh
source "$SCRIPT_DIR/../ci-box/lib/runner.sh"

PASS=0
FAIL=0

# _assert <desc> <expected_exit> <function> [args...]
# subshell 에서 실행해 set -e 영향 차단 · stderr 캡처로 출력 억제
_assert() {
    local desc="$1"
    local expected_exit="$2"
    shift 2
    local actual_exit=0
    ( "$@" ) >/dev/null 2>/dev/null || actual_exit=$?
    if [ "$actual_exit" = "$expected_exit" ]; then
        printf 'PASS: %s\n' "$desc"
        PASS=$((PASS+1))
    else
        printf 'FAIL: %s  (expected=%s  got=%s)\n' "$desc" "$expected_exit" "$actual_exit"
        FAIL=$((FAIL+1))
    fi
}

echo "=== verify_runner_labels 단위 테스트 (가짜 gh 응답) ==="
echo ""

# --- 정상: self-hosted + custom 모두 있음 ---
_gh_runner_label_names() { printf 'self-hosted\nmacOS\nARM64\ncuriocity-mac\n'; }
_gh_runner_id() { echo "101"; }
_assert "정상 — self-hosted + curiocity-mac 있음" 0 \
    verify_runner_labels "CuriocityDevAi/storeport" "ci-box-storeport-heavy-imac" "curiocity-mac"

# --- 누락: self-hosted 없음 (--no-default-labels 적용된 아이맥 케이스) ---
_gh_runner_label_names() { printf 'macOS\nARM64\ncuriocity-mac\n'; }
_gh_runner_id() { echo "102"; }
_assert "누락 — self-hosted 없음" 1 \
    verify_runner_labels "CuriocityDevAi/storeport" "ci-box-storeport-heavy-imac" "curiocity-mac"

# --- 누락: custom 라벨 없음 ---
_gh_runner_label_names() { printf 'self-hosted\nmacOS\nARM64\n'; }
_gh_runner_id() { echo "103"; }
_assert "누락 — custom 라벨 없음" 1 \
    verify_runner_labels "CuriocityDevAi/storeport" "ci-box-storeport-light-imac" "curiocity-mac-light"

# --- 누락: self-hosted + custom 둘 다 없음 ---
_gh_runner_label_names() { printf 'ARM64\n'; }
_gh_runner_id() { echo "104"; }
_assert "누락 — self-hosted + custom 모두 없음" 1 \
    verify_runner_labels "CuriocityDevAi/agilo-medusa-pos-fork" "ci-box-fork-heavy-imac" "curiocity-mac-fork"

# --- 오프라인: 러너 미발견 (빈 응답) ---
_gh_runner_label_names() { echo ""; }
_gh_runner_id() { echo ""; }
_assert "오프라인 — 러너 미발견 (빈 응답)" 1 \
    verify_runner_labels "CuriocityDevAi/storeport" "ci-box-storeport-heavy-imac" "curiocity-mac"

echo ""
printf '=== 결과: PASS=%d FAIL=%d ===\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
