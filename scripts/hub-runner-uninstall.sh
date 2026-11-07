#!/bin/bash
# scripts/hub-runner-uninstall.sh · launchd 제거 (M2-1105-O)
#
# Usage:
#   bash scripts/hub-runner-uninstall.sh <hub>

set -euo pipefail

hub="${1:-}"
if [[ -z "$hub" ]]; then
  echo "Usage: $0 <hub>" >&2
  exit 2
fi
if [[ ! "$hub" =~ ^[a-z][0-9]+$ ]]; then
  echo "invalid hub '$hub'" >&2
  exit 2
fi

PLIST_LABEL="com.curiocity.hub-runner.$hub"
PLIST_FILE="$HOME/Library/LaunchAgents/$PLIST_LABEL.plist"

if [[ -f "$PLIST_FILE" ]]; then
  launchctl bootout "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null || true
  rm -f "$PLIST_FILE"
  echo "제거: $PLIST_FILE"
else
  echo "없음: $PLIST_FILE (이미 제거됨)"
fi
echo "lock 정리: rm -f $HOME/.hub-runner/$hub.lock"
rm -f "$HOME/.hub-runner/$hub.lock" 2>/dev/null || true
