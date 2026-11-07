#!/bin/bash
# scripts/hub-runner-uninstall.sh · launchd 단일 plist 제거 (M1-1105-S)
#
# Usage:
#   bash scripts/hub-runner-uninstall.sh            (단일 plist + 레거시 허브별 plist 전부 제거)

set -euo pipefail

LABEL="com.curiocity.hub-runner"
PLIST_FILE="$HOME/Library/LaunchAgents/$LABEL.plist"

if [[ -f "$PLIST_FILE" ]]; then
  launchctl bootout "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null || true
  rm -f "$PLIST_FILE"
  echo "제거: $PLIST_FILE"
else
  echo "없음: $PLIST_FILE"
fi

# 레거시 허브별 plist 도 같이 정리.
for hub in m0 m1 m2 m3 r0 k0 k1 k2 n0 t0; do
  legacy="$HOME/Library/LaunchAgents/$LABEL.$hub.plist"
  if [[ -f "$legacy" ]]; then
    launchctl bootout "gui/$(id -u)" "$legacy" 2>/dev/null || true
    rm -f "$legacy"
    echo "레거시 제거: $legacy"
  fi
done

echo "lock 정리: rm -f $HOME/.hub-runner/all.lock"
rm -f "$HOME/.hub-runner/all.lock" 2>/dev/null || true
