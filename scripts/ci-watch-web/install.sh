#!/bin/bash
# scripts/ci-watch-web/install.sh  M2-1128-C
# ci-watch 웹 서버를 launchd 로 등록 · 아이맥 재부팅 뒤 자동 시작 (FileVault 로그인 후)
# Usage: bash ~/projects/curiocity-relay-heartbeat/scripts/ci-watch-web/install.sh [--uninstall]
# M2-1128-C: 서버는 heartbeat clone 에서 실행 · CI_WATCH_RELAY_DIR = heartbeat clone

set -euo pipefail

# 이 스크립트가 위치한 디렉토리 기준으로 relay 루트 자동 감지
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELAY_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# heartbeat clone: 고정 경로 (ci-watch 웹 서버의 REPO_ROOT)
HEARTBEAT_DIR="$HOME/projects/curiocity-relay-heartbeat"
LABEL="com.curiocity.ci-watch-web"
PLIST_SRC="$RELAY_DIR/scripts/ci-watch-web/${LABEL}.plist"
PLIST_DST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/.hub-runner"
# nvm / homebrew / system 순으로 node 탐색
NODE_BIN="$(which node 2>/dev/null || \
  ls "$HOME/.nvm/versions/node/"*/bin/node 2>/dev/null | sort -V | tail -1 || \
  echo /usr/local/bin/node)"

# 제거 모드
if [[ "${1:-}" == "--uninstall" ]]; then
  echo "[ci-watch-web] 제거 중…"
  launchctl unload "$PLIST_DST" 2>/dev/null || true
  rm -f "$PLIST_DST"
  echo "[ci-watch-web] 제거 완료. launchd 에서 ${LABEL} 삭제됨."
  exit 0
fi

if [[ ! -d "$HEARTBEAT_DIR/.git" ]]; then
  echo "[ci-watch-web] ERROR: heartbeat clone 없음 → $HEARTBEAT_DIR"
  echo "  git clone https://github.com/CuriocityDevAi/curiocity-relay.git $HEARTBEAT_DIR 를 먼저 실행하세요"
  exit 1
fi

echo "[ci-watch-web] 설치 중…"
echo "  script from : $RELAY_DIR"
echo "  server dir  : $HEARTBEAT_DIR (CI_WATCH_RELAY_DIR)"
echo "  node        : $NODE_BIN"
echo "  plist       : $PLIST_DST"

# 로그 디렉토리 확인
mkdir -p "$LOG_DIR"

# plist 생성 (HEARTBEAT_DIR / HOME_DIR / NODE_BIN 치환)
sed \
  -e "s|HEARTBEAT_DIR|${HEARTBEAT_DIR}|g" \
  -e "s|HOME_DIR|${HOME}|g" \
  -e "s|/usr/local/bin/node|${NODE_BIN}|g" \
  "$PLIST_SRC" > "$PLIST_DST"

echo "[ci-watch-web] plist 설치 완료: $PLIST_DST"

# 기존 로드 해제 후 재로드
launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"

echo "[ci-watch-web] launchd 로드 완료."
echo ""
echo "  접속 주소 : http://100.82.115.70:7700"
echo "  로그 파일 : $LOG_DIR/ci-watch-web.log"
echo "  오류 로그 : $LOG_DIR/ci-watch-web.err.log"
echo ""
echo "  제거: bash $RELAY_DIR/scripts/ci-watch-web/install.sh --uninstall"
echo ""
echo "  서버 소스 : $HEARTBEAT_DIR (heartbeat clone · 30초 자동 pull)"
