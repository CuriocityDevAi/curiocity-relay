#!/bin/bash
# scripts/hub-runner-install.sh · launchd 단일 plist 설치 (M1-1105-S)
#
# Usage:
#   bash scripts/hub-runner-install.sh          (no args = --all 로 5 허브 동시 처리)
#
# 산출:
#   ~/Library/LaunchAgents/com.curiocity.hub-runner.plist   (단일 Label)
#   ~/.hub-runner/launchd.{out,err}.log                     (launchd stdio)
#
# 기존 허브별 plist (com.curiocity.hub-runner.<hub>) 가 남아 있으면 bootout + 삭제.
# runner-config.json 의 cwd 가 실제로 존재하는지 선실측.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LABEL="com.curiocity.hub-runner"
PLIST_FILE="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/.hub-runner"
NODE_BIN="$(command -v node)"
if [[ -z "$NODE_BIN" ]]; then
  echo "node 바이너리 못 찾음 (PATH 확인)" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

# 레거시 허브별 plist 정리 (M2-1105-O 시대).
for hub in m0 m1 m2 m3 r0 k0 k1 k2 n0 t0; do
  legacy="$HOME/Library/LaunchAgents/$LABEL.$hub.plist"
  if [[ -f "$legacy" ]]; then
    echo "레거시 plist bootout + 삭제: $legacy"
    launchctl bootout "gui/$(id -u)" "$legacy" 2>/dev/null || true
    rm -f "$legacy"
  fi
done

# runner-config.json 실측 (cwd 하나라도 없으면 경고만).
node - "$REPO_ROOT" <<'NODE'
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [,, root] = process.argv;
const cfg = JSON.parse(readFileSync(join(root, 'status/runner-config.json'), 'utf8'));
const missing = [];
for (const [hub, { cwd }] of Object.entries(cfg.hubs || {})) {
  if (!cwd || !existsSync(cwd)) missing.push(`${hub}: ${cwd ?? 'null'}`);
}
if (missing.length) {
  console.error(`[install] 경고 · cwd 부재 ${missing.length} 건:`);
  missing.forEach((m) => console.error(`  - ${m}`));
  console.error('[install] 러너는 해당 허브를 건너뜀 (큐 건드리지 않음).');
} else {
  console.error('[install] runner-config.json 전 허브 cwd 존재 확인');
}
NODE

PATH_LINE="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"

cat > "$PLIST_FILE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$REPO_ROOT/scripts/hub-runner.mjs</string>
    <string>--all</string>
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

if launchctl list 2>/dev/null | awk '{print $3}' | grep -qx "$LABEL"; then
  echo "이미 load 중 · bootout 후 재로드"
  launchctl bootout "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null || true
fi

launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE"
echo "load 완료: $LABEL"
echo
echo "상태 확인: launchctl list | grep $LABEL"
echo "로그:      tail -f $LOG_DIR/launchd.err.log"
echo "제거:      bash scripts/hub-runner-uninstall.sh"
