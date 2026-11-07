#!/bin/bash
# scripts/hub-runner-install.sh · launchd 설치 (M2-1105-O)
#
# Usage:
#   bash scripts/hub-runner-install.sh <hub>
#
# ~/Library/LaunchAgents/com.curiocity.hub-runner.<hub>.plist 생성 + load.
# RunAtLoad=true · KeepAlive=true · stdout/stderr → ~/.hub-runner/<hub>/launchd.log.
#
# Node 와 claude 는 로그인 쉘 PATH 에서 찾음. launchd 는 쉘 PATH 를 안 읽으므로
# plist 에 EnvironmentVariables.PATH 를 명시 (brew + /usr/local 포함).

set -euo pipefail

hub="${1:-}"
if [[ -z "$hub" ]]; then
  echo "Usage: $0 <hub>" >&2
  exit 2
fi
if [[ ! "$hub" =~ ^[a-z][0-9]+$ ]]; then
  echo "invalid hub '$hub' (expected [a-z][0-9]+ like m2, r0)" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_LABEL="com.curiocity.hub-runner.$hub"
PLIST_FILE="$HOME/Library/LaunchAgents/$PLIST_LABEL.plist"
LOG_DIR="$HOME/.hub-runner/$hub"
NODE_BIN="$(command -v node)"
if [[ -z "$NODE_BIN" ]]; then
  echo "node 바이너리 못 찾음" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

PATH_LINE="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"

cat > "$PLIST_FILE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$REPO_ROOT/scripts/hub-runner.mjs</string>
    <string>$hub</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REPO_ROOT</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>60</integer>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/launchd.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$PATH_LINE</string>
    <key>HOME</key>
    <string>$HOME</string>
  </dict>
</dict>
</plist>
PLIST

echo "plist 작성: $PLIST_FILE"

if launchctl list 2>/dev/null | awk '{print $3}' | grep -qx "$PLIST_LABEL"; then
  echo "이미 load 중 · bootout 후 재로드"
  launchctl bootout "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null || true
fi

launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE"
echo "load 완료: $PLIST_LABEL"
echo
echo "상태 확인: launchctl list | grep $PLIST_LABEL"
echo "로그:      tail -f $LOG_DIR/launchd.err.log"
echo "제거:      bash scripts/hub-runner-uninstall.sh $hub"
