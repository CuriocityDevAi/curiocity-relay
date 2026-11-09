#!/bin/bash
# scripts/hub-runner-install.sh · launchd 단일 plist 설치 (M1-1105-S / X)
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
# M1-1105-Z · v4 (착지 검증 + --status judge + cmux-password 파일 지원) 스폰 실패 시 v3 로 자동 롤백.

set -euo pipefail

TARGET_RUNNER="hub-runner-v6.mjs"
FALLBACK_RUNNER="hub-runner-v5.mjs"

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

# node --check 선실측 (깨진 코드가 launchd 에 들어가지 않도록).
if ! "$NODE_BIN" --check "$REPO_ROOT/scripts/$TARGET_RUNNER" >/dev/null 2>&1; then
  echo "[install] node --check 실패: scripts/$TARGET_RUNNER · abort" >&2
  exit 1
fi
echo "[install] node --check scripts/$TARGET_RUNNER · OK"

PATH_LINE="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

write_plist() {
  local runner="$1"
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
    <string>$REPO_ROOT/scripts/$runner</string>
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
  echo "[install] plist 작성 · runner=scripts/$runner"
}

load_plist() {
  if launchctl list 2>/dev/null | awk '{print $3}' | grep -qx "$LABEL"; then
    launchctl bootout "gui/$(id -u)" "$PLIST_FILE" 2>/dev/null || true
  fi
  launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE"
}

verify_loaded() {
  # 5 초 안에 PID 가 0 이상 (즉 돌고 있음) 이 되는지 확인.
  local tries=0
  while (( tries < 10 )); do
    local line
    line="$(launchctl list 2>/dev/null | awk -v L="$LABEL" '$3 == L {print $0; exit}')"
    if [[ -n "$line" ]]; then
      local pid
      pid="$(echo "$line" | awk '{print $1}')"
      if [[ "$pid" != "-" && "$pid" -gt 0 ]]; then
        echo "[install] verify OK · pid=$pid"
        return 0
      fi
    fi
    sleep 1
    tries=$(( tries + 1 ))
  done
  echo "[install] verify 실패 · launchctl list 10 초 안에 pid>0 못 봄" >&2
  return 1
}

write_plist "$TARGET_RUNNER"
load_plist

if verify_loaded; then
  echo "load 완료: $LABEL (runner=$TARGET_RUNNER)"
else
  echo "[install] v2 verify 실패 · v1 ($FALLBACK_RUNNER) 로 롤백 시도" >&2
  write_plist "$FALLBACK_RUNNER"
  load_plist
  if verify_loaded; then
    echo "[install] 롤백 완료 · runner=$FALLBACK_RUNNER" >&2
    exit 2
  else
    echo "[install] 롤백도 실패 · 수동 개입 필요" >&2
    exit 3
  fi
fi

echo
echo "상태 확인: launchctl list | grep $LABEL"
echo "로그:      tail -f $LOG_DIR/launchd.err.log"
echo "제거:      bash scripts/hub-runner-uninstall.sh"
