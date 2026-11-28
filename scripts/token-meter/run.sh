#!/bin/bash
# token-meter/run.sh
# launchd 에서 30분마다 실행. 작업 clone = ~/projects/curiocity-relay-tokens
# 절대 러너 폴더(~/projects/curiocity-relay)를 건드리지 않는다.
set -euo pipefail

RELAY_TOKENS="$HOME/projects/curiocity-relay-tokens"
EXTRACT="$RELAY_TOKENS/scripts/token-meter/extract.mjs"
TODAY=$(date -u +%Y-%m-%d)
LOG="$HOME/.hub-runner/token-meter.log"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] token-meter run start" >> "$LOG"

# 클론이 없으면 에러 (run.sh 는 설치 단계에서 클론 완료 후 사용)
if [ ! -d "$RELAY_TOKENS/.git" ]; then
  echo "ERROR: $RELAY_TOKENS not found. Run install steps first." >> "$LOG"
  exit 1
fi

cd "$RELAY_TOKENS"

# 1. pull (실패 시 다음 주기로 넘김)
git fetch origin main 2>>"$LOG" || { echo "fetch failed, skip" >> "$LOG"; exit 0; }
git rebase origin/main 2>>"$LOG" || { echo "rebase failed, abort" >> "$LOG"; git rebase --abort 2>/dev/null; exit 0; }

# 2. 오늘 토큰 추출
node "$EXTRACT" --date "$TODAY" 2>>"$LOG"

# 3. 변경이 있을 때만 커밋
if git diff --quiet HEAD -- status/tokens/; then
  echo "no token changes today" >> "$LOG"
  exit 0
fi

git add status/tokens/
git commit -m "feat(token-meter): $TODAY 토큰 집계 자동 업데이트" 2>>"$LOG"

# 4. push (충돌 시 rebase 1회 후 종료 → 다음 주기에 재시도)
if ! git push origin HEAD:main 2>>"$LOG"; then
  echo "push failed, trying rebase once" >> "$LOG"
  git fetch origin main 2>>"$LOG"
  git rebase origin/main 2>>"$LOG" || { git rebase --abort 2>/dev/null; echo "rebase on push-fail also failed, next cycle" >> "$LOG"; exit 0; }
  git push origin HEAD:main 2>>"$LOG" || echo "push still failed, next cycle" >> "$LOG"
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] token-meter run done" >> "$LOG"
