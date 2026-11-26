#!/usr/bin/env bash
# scripts/ci-box/health.sh — 아이맥 CI 박스 heartbeat (M1-1126-C)
#
# 사용법:
#   bash health.sh              5분 주기 launchd 가 실행 (relay 에 push)
#   bash health.sh --dry-run    push 없이 JSON 출력만
#
# 의존: bash · python3 · git · gh CLI(인증) · curl · pmset · tailscale
# 로그: ~/Library/Logs/ci-box-health.log

set -uo pipefail

# ── 설정 ──────────────────────────────────────────────────────────────────────
RELAY_REMOTE="https://github.com/CuriocityDevAi/curiocity-relay.git"
RELAY_CLONE_DIR="${CI_BOX_RELAY_DIR:-$HOME/.ci-box-relay}"
STATUS_PATH="status/ci-box/imac.json"
NETSPEED_CACHE="$HOME/.ci-box-health-netspeed.json"
NETSPEED_MAX_AGE=3600  # 1시간에 1번만
LOG_FILE="$HOME/Library/Logs/ci-box-health.log"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

# ── 로그 ──────────────────────────────────────────────────────────────────────
_log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG_FILE" >&2; }

# ── 수집 함수들 ───────────────────────────────────────────────────────────────

collect_uptime_load() {
    local boot_sec now_sec uptime_secs
    boot_sec=$(sysctl -n kern.boottime 2>/dev/null \
        | python3 -c "import sys,re; m=re.search(r'sec = (\d+)', sys.stdin.read()); print(m.group(1) if m else 0)")
    now_sec=$(date +%s)
    uptime_secs=$(( now_sec - boot_sec ))

    local l1 l5 l15
    local lraw
    lraw=$(sysctl -n vm.loadavg 2>/dev/null || echo "{ 0.00 0.00 0.00 }")
    l1=$(echo "$lraw"  | awk '{print $2}')
    l5=$(echo "$lraw"  | awk '{print $3}')
    l15=$(echo "$lraw" | awk '{print $4}')

    printf '{"uptime_secs":%d,"load_1":%s,"load_5":%s,"load_15":%s}' \
        "$uptime_secs" "$l1" "$l5" "$l15"
}

collect_memory() {
    # memory_pressure 여유%: vm_stat 페이지 카운트로 계산
    local free_pct=0
    free_pct=$(python3 - <<'PYEOF' 2>/dev/null || echo 0
import subprocess, re
try:
    out = subprocess.check_output(['vm_stat'], text=True)
    def gp(pat):
        m = re.search(pat, out)
        return int(m.group(1).replace('.','')) if m else 0
    free  = gp(r'Pages free:\s+(\S+)')
    spec  = gp(r'Pages speculative:\s+(\S+)')
    wired = gp(r'Pages wired down:\s+(\S+)')
    act   = gp(r'Pages active:\s+(\S+)')
    inact = gp(r'Pages inactive:\s+(\S+)')
    total = free + spec + wired + act + inact
    print(round((free + spec) * 100 / total) if total > 0 else 0)
except Exception:
    print(0)
PYEOF
    )

    # swap (vm.swapusage 형식: "total = 2048.00M  used = 100.50M  free = 1947.50M")
    local swap_raw swap_used_mb=0 swap_free_mb=0
    swap_raw=$(sysctl -n vm.swapusage 2>/dev/null || echo "")
    if [[ -n "$swap_raw" ]]; then
        swap_used_mb=$(echo "$swap_raw" | python3 -c \
            "import sys,re; m=re.search(r'used = ([0-9.]+)',sys.stdin.read()); print(m.group(1) if m else 0)" 2>/dev/null || echo 0)
        swap_free_mb=$(echo "$swap_raw" | python3 -c \
            "import sys,re; m=re.search(r'free = ([0-9.]+)',sys.stdin.read()); print(m.group(1) if m else 0)" 2>/dev/null || echo 0)
    fi

    printf '{"free_pct":%d,"swap_used_mb":%s,"swap_free_mb":%s}' \
        "$free_pct" "$swap_used_mb" "$swap_free_mb"
}

collect_disk() {
    local root_free_gb=0 runner_free_gb=0

    root_free_gb=$(df -g / 2>/dev/null | awk 'NR==2{print $4}' || echo 0)

    # 첫 번째로 찾은 runner _work dir
    local runner_work_dir
    runner_work_dir=$(find "$HOME" -maxdepth 3 -name "_work" -type d 2>/dev/null | head -1 || echo "")
    if [[ -n "$runner_work_dir" ]]; then
        runner_free_gb=$(df -g "$runner_work_dir" 2>/dev/null | awk 'NR==2{print $4}' || echo "$root_free_gb")
    else
        runner_free_gb=$root_free_gb
    fi

    printf '{"root_free_gb":%s,"runner_work_free_gb":%s}' \
        "$root_free_gb" "$runner_free_gb"
}

collect_thermal() {
    local therm_out throttled="false"
    therm_out=$(pmset -g therm 2>/dev/null | tr '\n' ' ' | sed 's/"/\\"/g' || echo "")

    # CPU_Speed_Limit < 100 → 쓰로틀 중
    local cpu_limit
    cpu_limit=$(echo "$therm_out" | python3 -c \
        "import sys,re; m=re.search(r'CPU_Speed_Limit\s*=\s*(\d+)',sys.stdin.read()); print(m.group(1) if m else 100)" 2>/dev/null || echo 100)
    if [[ "$cpu_limit" -lt 100 ]] 2>/dev/null; then
        throttled="true"
    fi
    # GPU_Throttle 또는 warning 문구도 체크
    if echo "$therm_out" | grep -qiE "GPU_Throttle|warning"; then
        throttled="true"
    fi

    printf '{"throttled":%s,"cpu_speed_limit_pct":%s}' "$throttled" "$cpu_limit"
}

collect_runners() {
    # Runner.Listener = 대기 중 러너, Runner.Worker = 실행 중 작업
    local listeners workers
    listeners=$(pgrep -c -f "Runner\.Listener" 2>/dev/null || echo 0)
    workers=$(pgrep -c -f "Runner\.Worker" 2>/dev/null || echo 0)
    printf '{"listener_count":%d,"worker_count":%d}' "$listeners" "$workers"
}

collect_github() {
    # curl time_total (초) → ms
    local time_s reachable="false" latency_ms=9999
    time_s=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 \
        "https://api.github.com" 2>/dev/null || echo "9.999")
    latency_ms=$(python3 -c "print(int(float('$time_s') * 1000))" 2>/dev/null || echo 9999)
    [[ "$latency_ms" -lt 9000 ]] && reachable="true"
    printf '{"latency_ms":%d,"reachable":%s}' "$latency_ms" "$reachable"
}

collect_netspeed() {
    # networkQuality -s -c : 1시간에 1번만 실행, 나머지는 캐시 반환
    local now_epoch
    now_epoch=$(date +%s)

    if [[ -f "$NETSPEED_CACHE" ]]; then
        local age cached_ok
        cached_ok=$(python3 - "$now_epoch" "$NETSPEED_CACHE" <<'PYEOF' 2>/dev/null || echo "miss"
import json, sys
now = int(sys.argv[1])
try:
    d = json.load(open(sys.argv[2]))
    age = now - int(d.get('_ts', 0))
    if age < 3600:
        d['cached'] = True
        d.pop('_ts', None)
        print(json.dumps(d))
    else:
        print("miss")
except Exception:
    print("miss")
PYEOF
        )
        if [[ "$cached_ok" != "miss" ]]; then
            echo "$cached_ok"
            return
        fi
    fi

    # 실제 측정
    local nq_out dl=0 ul=0 rpm=0
    nq_out=$(networkQuality -s -c 2>/dev/null | tail -1 || echo "{}")
    dl=$(echo "$nq_out" | python3 -c \
        "import json,sys; d=json.load(sys.stdin); print(round(d.get('dl_throughput',0)/1e6,1))" 2>/dev/null || echo 0)
    ul=$(echo "$nq_out" | python3 -c \
        "import json,sys; d=json.load(sys.stdin); print(round(d.get('ul_throughput',0)/1e6,1))" 2>/dev/null || echo 0)
    rpm=$(echo "$nq_out" | python3 -c \
        "import json,sys
d=json.load(sys.stdin)
r=d.get('responsiveness',0)
print(r.get('rpm',r) if isinstance(r,dict) else r)" 2>/dev/null || echo 0)

    # 캐시 저장
    printf '{"dl_mbps":%s,"ul_mbps":%s,"rpm":%s,"_ts":%d}' \
        "$dl" "$ul" "$rpm" "$now_epoch" > "$NETSPEED_CACHE"

    printf '{"dl_mbps":%s,"ul_mbps":%s,"rpm":%s,"cached":false}' "$dl" "$ul" "$rpm"
}

collect_postgres() {
    local alive="false"
    if command -v pg_isready &>/dev/null; then
        pg_isready -h localhost -p 5432 -U postgres &>/dev/null 2>&1 && alive="true"
    elif command -v psql &>/dev/null; then
        psql -h localhost -U postgres -c "SELECT 1" &>/dev/null 2>&1 && alive="true"
    fi
    printf '{"alive":%s}' "$alive"
}

collect_tailscale() {
    local up="false" ip=""
    if command -v tailscale &>/dev/null; then
        local ts_json
        ts_json=$(tailscale status --json 2>/dev/null || echo "{}")
        up=$(echo "$ts_json" | python3 -c \
            "import json,sys; d=json.load(sys.stdin); print('true' if d.get('BackendState','')=='Running' else 'false')" \
            2>/dev/null || echo "false")
        ip=$(echo "$ts_json" | python3 -c \
            "import json,sys; d=json.load(sys.stdin); ips=d.get('Self',{}).get('TailscaleIPs',[]); print(ips[0] if ips else '')" \
            2>/dev/null || echo "")
    fi
    printf '{"up":%s,"ip":"%s"}' "$up" "$ip"
}

# ── 판정 ──────────────────────────────────────────────────────────────────────

judge_health() {
    local mem_free_pct="$1"
    local root_free_gb="$2"
    local runner_free_gb="$3"
    local listener_count="$4"
    local github_latency_ms="$5"

    python3 - "$mem_free_pct" "$root_free_gb" "$runner_free_gb" "$listener_count" "$github_latency_ms" <<'PYEOF'
import sys
mem_pct    = float(sys.argv[1])
root_gb    = float(sys.argv[2])
runner_gb  = float(sys.argv[3])
listeners  = int(sys.argv[4])
gh_ms      = int(sys.argv[5])

level   = "ok"
reasons = []

# 메모리 여유 <15% → warn
if mem_pct < 15:
    level = "warn" if level == "ok" else level
    reasons.append(f"memory_free_{int(mem_pct)}pct_lt_15")

# 디스크 / <10GB → bad
if root_gb < 10:
    level = "bad"
    reasons.append(f"root_disk_{root_gb:.0f}gb_lt_10")

# 러너 _work 디스크 <10GB → bad
if runner_gb < 10:
    level = "bad"
    reasons.append(f"runner_disk_{runner_gb:.0f}gb_lt_10")

# 러너 수 <4 → bad
if listeners < 4:
    level = "bad"
    reasons.append(f"runners_{listeners}_lt_4")

# GitHub 지연 >1500ms → warn
if gh_ms > 1500:
    level = "warn" if level == "ok" else level
    reasons.append(f"github_latency_{gh_ms}ms_gt_1500")

import json
print(json.dumps({"health": level, "reasons": reasons}))
PYEOF
}

# ── push ──────────────────────────────────────────────────────────────────────

push_to_relay() {
    local json="$1"

    # gh 인증 확인 (없으면 경고만, non-fatal)
    if ! gh auth status &>/dev/null 2>&1; then
        _log "WARN: gh auth 없음 — push 건너뜀. 'gh auth login' 실행 필요"
        return 0
    fi

    # shallow clone (없으면 생성, 있으면 fetch)
    if [[ ! -d "$RELAY_CLONE_DIR/.git" ]]; then
        _log "relay clone 생성: $RELAY_CLONE_DIR"
        if ! git clone --depth=1 "$RELAY_REMOTE" "$RELAY_CLONE_DIR" 2>&1 | tee -a "$LOG_FILE"; then
            _log "WARN: relay clone 실패 — push 건너뜀"
            return 0
        fi
        # gh credential helper 등록
        git -C "$RELAY_CLONE_DIR" config credential.helper \
            "!/opt/homebrew/bin/gh auth git-credential" 2>/dev/null || true
    fi

    # 최신 main 으로 리셋
    git -C "$RELAY_CLONE_DIR" fetch --depth=1 origin main 2>&1 | tee -a "$LOG_FILE" || {
        _log "WARN: fetch 실패 — push 건너뜀"
        return 0
    }
    git -C "$RELAY_CLONE_DIR" reset --hard origin/main 2>/dev/null

    # 상태 파일 기록
    mkdir -p "$(dirname "$RELAY_CLONE_DIR/$STATUS_PATH")"
    echo "$json" > "$RELAY_CLONE_DIR/$STATUS_PATH"
    git -C "$RELAY_CLONE_DIR" add "$STATUS_PATH"

    # 변경 없으면 종료
    if git -C "$RELAY_CLONE_DIR" diff --cached --quiet; then
        _log "변경 없음 — commit 건너뜀"
        return 0
    fi

    local ts_short health
    ts_short=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    health=$(echo "$json" | python3 -c \
        "import json,sys; print(json.load(sys.stdin).get('health','?'))" 2>/dev/null || echo "?")

    git -C "$RELAY_CLONE_DIR" \
        -c user.name="ci-box" \
        -c user.email="ci-box@ci-box.local" \
        commit -m "chore(ci-box): heartbeat ${ts_short} health=${health}" \
        2>&1 | tee -a "$LOG_FILE"

    # push (충돌 시 rebase 재시도 · 실패 non-fatal)
    local retry=3
    while [[ $retry -gt 0 ]]; do
        if git -C "$RELAY_CLONE_DIR" push origin HEAD:main 2>&1 | tee -a "$LOG_FILE"; then
            _log "push 성공 health=${health}"
            return 0
        fi
        retry=$(( retry - 1 ))
        _log "push 실패 — rebase 재시도 (남은 횟수: $retry)"
        git -C "$RELAY_CLONE_DIR" fetch origin main 2>/dev/null || break
        if ! git -C "$RELAY_CLONE_DIR" rebase origin/main 2>&1 | tee -a "$LOG_FILE"; then
            git -C "$RELAY_CLONE_DIR" rebase --abort 2>/dev/null || true
            break
        fi
    done

    _log "WARN: push 최종 실패 — non-fatal, 다음 tick 에 재시도"
    return 0
}

# ── main ──────────────────────────────────────────────────────────────────────

main() {
    _log "=== ci-box health 수집 시작 (dry_run=$DRY_RUN) ==="

    local ts uptime_j memory_j disk_j thermal_j runners_j github_j netspeed_j postgres_j tailscale_j health_j
    ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    _log "uptime/load..."
    uptime_j=$(collect_uptime_load)
    _log "memory..."
    memory_j=$(collect_memory)
    _log "disk..."
    disk_j=$(collect_disk)
    _log "thermal..."
    thermal_j=$(collect_thermal)
    _log "runners..."
    runners_j=$(collect_runners)
    _log "github latency..."
    github_j=$(collect_github)
    _log "netspeed (캐시 or 측정)..."
    netspeed_j=$(collect_netspeed)
    _log "postgres..."
    postgres_j=$(collect_postgres)
    _log "tailscale..."
    tailscale_j=$(collect_tailscale)

    # 판정용 값 추출
    local mem_free_pct root_free_gb runner_free_gb listener_count github_latency_ms
    mem_free_pct=$(echo "$memory_j" | python3 -c "import json,sys; print(json.load(sys.stdin)['free_pct'])" 2>/dev/null || echo 100)
    root_free_gb=$(echo "$disk_j" | python3 -c "import json,sys; print(json.load(sys.stdin)['root_free_gb'])" 2>/dev/null || echo 999)
    runner_free_gb=$(echo "$disk_j" | python3 -c "import json,sys; print(json.load(sys.stdin)['runner_work_free_gb'])" 2>/dev/null || echo 999)
    listener_count=$(echo "$runners_j" | python3 -c "import json,sys; print(json.load(sys.stdin)['listener_count'])" 2>/dev/null || echo 0)
    github_latency_ms=$(echo "$github_j" | python3 -c "import json,sys; print(json.load(sys.stdin)['latency_ms'])" 2>/dev/null || echo 9999)

    health_j=$(judge_health "$mem_free_pct" "$root_free_gb" "$runner_free_gb" "$listener_count" "$github_latency_ms")

    # 최종 JSON 조립
    local json
    json=$(python3 - \
        "$ts" "$uptime_j" "$memory_j" "$disk_j" "$thermal_j" \
        "$runners_j" "$github_j" "$netspeed_j" "$postgres_j" "$tailscale_j" "$health_j" <<'PYEOF'
import json, sys
out = {
    "ts":        sys.argv[1],
    "uptime":    json.loads(sys.argv[2]),
    "memory":    json.loads(sys.argv[3]),
    "disk":      json.loads(sys.argv[4]),
    "thermal":   json.loads(sys.argv[5]),
    "runners":   json.loads(sys.argv[6]),
    "github":    json.loads(sys.argv[7]),
    "netspeed":  json.loads(sys.argv[8]),
    "postgres":  json.loads(sys.argv[9]),
    "tailscale": json.loads(sys.argv[10]),
}
out.update(json.loads(sys.argv[11]))
print(json.dumps(out, indent=2))
PYEOF
    )

    _log "판정: $(echo "$json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['health'], d.get('reasons',[]))" 2>/dev/null)"

    if [[ "$DRY_RUN" -eq 1 ]]; then
        echo "$json"
        _log "=== dry-run 완료 — push 없음 ==="
        return 0
    fi

    push_to_relay "$json"
    _log "=== ci-box health 완료 ==="
}

main "$@"
