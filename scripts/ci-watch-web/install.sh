#!/bin/bash
# scripts/ci-watch-web/install.sh  M1-1128-D
# ci-watch 웹 서버를 launchd 로 등록 · 아이맥 재부팅 뒤 자동 시작 (FileVault 로그인 후)
# Usage: bash ~/projects/curiocity-relay-web/scripts/ci-watch-web/install.sh [--uninstall]
# M1-1128-D: 읽기 전용 clone(curiocity-relay-web) 분리 — heartbeat clone 미사용

set -euo pipefail

# 이 스크립트가 위치한 디렉토리 기준으로 relay 루트 자동 감지
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELAY_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# 웹 전용 읽기 전용 clone (heartbeat clone 과 완전 분리)
WEB_DIR="$HOME/projects/curiocity-relay-web"
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

# 웹 전용 clone 없으면 자동 생성 (커밋 불가 설정 포함)
if [[ ! -d "$WEB_DIR/.git" ]]; then
  REMOTE_URL="$(git -C "$RELAY_DIR" remote get-url origin 2>/dev/null || echo 'https://github.com/CuriocityDevAi/curiocity-relay.git')"
  echo "[ci-watch-web] 웹 전용 clone 생성 중 → $WEB_DIR"
  git clone --quiet "$REMOTE_URL" "$WEB_DIR"
  git -C "$WEB_DIR" config receive.denyNonFastForwards true
  git -C "$WEB_DIR" config receive.denyDeletes true
  echo "[ci-watch-web] clone 완료."
fi

echo "[ci-watch-web] 설치 중…"
echo "  script from : $RELAY_DIR"
echo "  server dir  : $WEB_DIR (CI_WATCH_WEB_DIR)"
echo "  node        : $NODE_BIN"
echo "  plist       : $PLIST_DST"

# 로그 디렉토리 확인
mkdir -p "$LOG_DIR"

# plist 생성 (RELAY_WEB_DIR / HOME_DIR / NODE_BIN 치환)
sed \
  -e "s|RELAY_WEB_DIR|${WEB_DIR}|g" \
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
echo "  제거: bash $WEB_DIR/scripts/ci-watch-web/install.sh --uninstall"
echo ""
echo "  서버 소스 : $WEB_DIR (읽기 전용 clone · 30초 git fetch+reset)"
