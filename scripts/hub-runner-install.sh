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

TARGET_RUNNER="${TARGET:-hub-runner-v7.2.mjs}"
FALLBACK_RUNNER="${FALLBACK:-hub-runner-v7.1.mjs}"

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

# v6.4: 폴더 가드 — 러너 repo 경로가 허브 cwd 와 같으면 설치 거부.
"$NODE_BIN" - "$REPO_ROOT" <<'NODE'
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const [,, root] = process.argv;
const cfg = JSON.parse(readFileSync(join(root, 'status/runner-config.json'), 'utf8'));
const resolvedRoot = resolve(root);
for (const [hub, hcfg] of Object.entries(cfg.hubs || {})) {
  if (hcfg?.cwd && resolve(hcfg.cwd) === resolvedRoot) {
    console.error(`[install] 폴더 가드 거부: 러너 repo(${root}) == 허브 ${hub} cwd(${hcfg.cwd}) · 별도 폴더에 클론 필요`);
    process.exit(1);
  }
}
console.error('[install] 폴더 가드 OK · 러너 repo 경로 허브 cwd 와 충돌 없음');
NODE

# node --check 선실측 (깨진 코드가 launchd 에 들어가지 않도록).
if ! "$NODE_BIN" --check "$REPO_ROOT/scripts/$TARGET_RUNNER" >/dev/null 2>&1; then
  echo "[install] node --check 실패: scripts/$TARGET_RUNNER · abort" >&2
  exit 1
fi
echo "[install] node --check scripts/$TARGET_RUNNER · OK"

PATH_LINE="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# M1-1105-BA(d): Mac 잠금 시 bg 모드에서 setInterval(5s) 이 23분 지연된 사건(handoff-20261112-early) 고침.
#   원인: launchd 가 이 프로세스를 Background Service 로 취급 → App Nap · timer coalescing · I/O throttling 적용.
#         잠금(= 포커스 없음) 시 커널이 수 분 단위로 타이머를 묶어서 깨움.
#   고침: ProcessType=Interactive — launchd 가 사용자 상호작용 수준으로 격상 → App Nap 면제 + timer coalescing 완화.
#         LowPriorityIO=false — 디스크 I/O 우선도 유지 (세션 lock 중에도 claim 파일 즉시 쓰기).
#         LegacyTimers=true  — darwinNotify 기반 coalescing 대신 과거 방식 유지 (더 정밀한 wake).
#   (대안: caffeinate -i 서브프로세스 유지 — plist 선언이 더 단순·신뢰성↑ 이라 미채택.)
#
# M1-1105-BD (장치 사건 11-12 13:12): write_plist heredoc 이 `<<PLIST` (unquoted) 라서 위 주석을
# 그대로 넣었을 때 백틱 `caffeinate -i` 가 명령 치환으로 실행 → 설치가 `node --check OK` 뒤 멈추고
# caffeinate 가 무한 돌음 (Kyu 가 pkill 로 수동 복구). 재발 방지: plist 안 주석을 위 쉘 주석으로 이동,
# heredoc 에는 변수 치환만 필요한 뼈대만 유지. 테스트(test/hub-runner-install.test.mjs) 로 재발 감시.
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
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>LowPriorityIO</key>
  <false/>
  <key>LegacyTimers</key>
  <true/>
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
    sleep 1
  fi
  # bootout 후 옛 PID lock 정리 — 사망 PID lock 이 남으면 새 러너 첫 10분이 아무것도 안 함.
  local lock_file="$HOME/.hub-runner/all.lock"
  if [[ -f "$lock_file" ]]; then
    local old_pid
    old_pid="$(cat "$lock_file" 2>/dev/null || echo "")"
    if [[ -n "$old_pid" ]] && ! kill -0 "$old_pid" 2>/dev/null; then
      echo "[install] stale lock 삭제 · pid=$old_pid 사망"
      rm -f "$lock_file"
    fi
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
