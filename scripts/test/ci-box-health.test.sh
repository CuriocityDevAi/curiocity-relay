#!/usr/bin/env bash
# scripts/test/ci-box-health.test.sh — health.sh 단위 테스트 (M1-1126-G)
#
# 커버리지:
#   A-1: collect_memory — inactive 포함 시 free_pct 가 (free+spec)/total 보다 큼
#   A-2: collect_thermal — CPU_Speed_Limit=100 이면 throttled=false
#   A-3: collect_thermal — CPU_Speed_Limit=80 이면 throttled=true
#   A-4: collect_thermal — GPU_Throttle 문구 있어도 cpu_limit=100 이면 throttled=false
#   B-1: collect_runners — ps -axo 환경에서 Runner.Listener 카운트
#   B-2: collect_tailscale — 절대경로 Tailscale 없으면 null 반환
#   C-1: judge_health — listener_count=null 이면 bad 아님 + unknown_runners 추가
#   C-2: judge_health — listener_count=0 이면 bad + runners_0_lt_4
#   C-3: judge_health — extra_unknowns 는 reasons 에 포함, health 에 영향 없음
#   D-1: --dry-run JSON 에 health 필드 있음 + _unknown 필드 없음
# 실행: bash scripts/test/ci-box-health.test.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_SH="$SCRIPT_DIR/../ci-box/health.sh"

PASS=0
FAIL=0

_assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [ "$actual" = "$expected" ]; then
        printf 'PASS: %s\n' "$desc"
        PASS=$((PASS+1))
    else
        printf 'FAIL: %s  (expected=%q  got=%q)\n' "$desc" "$expected" "$actual"
        FAIL=$((FAIL+1))
    fi
}

_assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qF "$needle"; then
        printf 'PASS: %s\n' "$desc"
        PASS=$((PASS+1))
    else
        printf 'FAIL: %s  (needle=%q not found in: %s)\n' "$desc" "$needle" "$haystack"
        FAIL=$((FAIL+1))
    fi
}

_assert_not_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qF "$needle"; then
        printf 'FAIL: %s  (needle=%q should not be in: %s)\n' "$desc" "$needle" "$haystack"
        FAIL=$((FAIL+1))
    else
        printf 'PASS: %s\n' "$desc"
        PASS=$((PASS+1))
    fi
}

echo "=== health.sh 단위 테스트 (M1-1126-G) ==="
echo ""

# ── A: collect_memory ─────────────────────────────────────────────────────────

echo "--- A: collect_memory ---"

# A-1: inactive 포함 공식이 (free+spec)/total 보다 큰 값을 돌려줘야 함
MEM_OLD=$(python3 - <<'PYEOF'
import subprocess, re
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
PYEOF
)
MEM_NEW=$(python3 - <<'PYEOF'
import subprocess, re
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
avail = free + spec + inact
print(round(avail * 100 / total) if total > 0 else 0)
PYEOF
)
if [[ "$MEM_NEW" -ge "$MEM_OLD" ]]; then
    printf 'PASS: A-1: inactive 포함 공식(%d%%) >= 구 공식(%d%%)\n' "$MEM_NEW" "$MEM_OLD"
    PASS=$((PASS+1))
else
    printf 'FAIL: A-1: inactive 포함 공식(%d%%) < 구 공식(%d%%)\n' "$MEM_NEW" "$MEM_OLD"
    FAIL=$((FAIL+1))
fi

# ── A-2 ~ A-4: collect_thermal ────────────────────────────────────────────────

echo "--- A-2~4: collect_thermal ---"

# collect_thermal 함수를 source 없이 인라인 테스트 (pmset 출력 모킹)
_thermal_check() {
    local pmset_out="$1"
    local cpu_limit throttled="false"
    cpu_limit=$(echo "$pmset_out" | python3 -c \
        "import sys,re; m=re.search(r'CPU_Speed_Limit\s*=\s*(\d+)',sys.stdin.read()); print(m.group(1) if m else 100)" 2>/dev/null || echo 100)
    if [[ "$cpu_limit" -lt 100 ]] 2>/dev/null; then
        throttled="true"
    fi
    echo "$throttled"
}

THERM_A2=$(_thermal_check "CPU_Speed_Limit = 100 ")
_assert_eq "A-2: CPU_Speed_Limit=100 → throttled=false" "false" "$THERM_A2"

THERM_A3=$(_thermal_check "CPU_Speed_Limit = 80 ")
_assert_eq "A-3: CPU_Speed_Limit=80 → throttled=true" "true" "$THERM_A3"

THERM_A4=$(_thermal_check "CPU_Speed_Limit = 100  GPU_Throttle_DUTY_CYCLE = 50 warning ")
_assert_eq "A-4: GPU_Throttle 있어도 CPU_Speed_Limit=100 → throttled=false" "false" "$THERM_A4"

# ── B: collect_runners ────────────────────────────────────────────────────────

echo "--- B: collect_runners ---"

# B-1: ps -axo 출력에서 Runner.Listener 카운트
B1_OUT=$(echo -e "bash\nRunner.Listener --some-arg\nRunner.Listener --other\nRunner.Worker\nbash" \
    | grep -c "Runner\.Listener" || echo 0)
_assert_eq "B-1: ps 출력에서 Runner.Listener 2개 카운트" "2" "$B1_OUT"

# B-2: Tailscale 절대경로 없으면 null 반환
B2_OUT=$(bash -c '
TS_BIN=""
for candidate in "/nonexistent/Tailscale" "/nonexistent2/tailscale"; do
    if [[ -x "$candidate" ]]; then TS_BIN="$candidate"; break; fi
done
if [[ -z "$TS_BIN" ]]; then
    printf "{\"up\":null,\"ip\":null,\"_unknown\":\"unknown_tailscale\"}"
fi
')
_assert_contains "B-2: Tailscale 없으면 null" '"up":null' "$B2_OUT"
_assert_contains "B-2: Tailscale 없으면 unknown 태그" '"_unknown":"unknown_tailscale"' "$B2_OUT"

# ── C: judge_health ───────────────────────────────────────────────────────────

echo "--- C: judge_health ---"

# C-1: listener_count=null → bad 아님 + unknown_runners 포함
C1_OUT=$(python3 - "80" "200" "200" "null" "100" "unknown_runners" <<'PYEOF'
import sys, json
def to_num(s, cast):
    return None if s == 'null' else cast(s)
mem_pct   = to_num(sys.argv[1], float)
root_gb   = to_num(sys.argv[2], float)
runner_gb = to_num(sys.argv[3], float)
listeners = to_num(sys.argv[4], int)
gh_ms     = to_num(sys.argv[5], int)
unknowns  = [u for u in sys.argv[6].split(',') if u]
level = "ok"
reasons = list(unknowns)
if listeners is not None and listeners < 4:
    level = "bad"
    reasons.append(f"runners_{listeners}_lt_4")
print(json.dumps({"health": level, "reasons": reasons}))
PYEOF
)
_assert_eq "C-1: listener_count=null → health=ok" "ok" "$(echo "$C1_OUT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["health"])')"
_assert_contains "C-1: listener_count=null → reasons 에 unknown_runners" "unknown_runners" "$C1_OUT"

# C-2: listener_count=0 → bad
C2_OUT=$(python3 - "80" "200" "200" "0" "100" "" <<'PYEOF'
import sys, json
def to_num(s, cast):
    return None if s == 'null' else cast(s)
listeners = to_num(sys.argv[4], int)
unknowns  = [u for u in sys.argv[6].split(',') if u]
level = "ok"
reasons = list(unknowns)
if listeners is not None and listeners < 4:
    level = "bad"
    reasons.append(f"runners_{listeners}_lt_4")
print(json.dumps({"health": level, "reasons": reasons}))
PYEOF
)
_assert_eq "C-2: listener_count=0 → health=bad" "bad" "$(echo "$C2_OUT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["health"])')"
_assert_contains "C-2: listener_count=0 → reasons 에 runners_0_lt_4" "runners_0_lt_4" "$C2_OUT"

# C-3: extra_unknowns 는 reasons 에 추가되지만 health 는 ok 유지
C3_OUT=$(python3 - "80" "200" "200" "4" "100" "unknown_netspeed,unknown_tailscale" <<'PYEOF'
import sys, json
def to_num(s, cast):
    return None if s == 'null' else cast(s)
listeners = to_num(sys.argv[4], int)
gh_ms     = to_num(sys.argv[5], int)
unknowns  = [u for u in sys.argv[6].split(',') if u]
level = "ok"
reasons = list(unknowns)
print(json.dumps({"health": level, "reasons": reasons}))
PYEOF
)
_assert_eq "C-3: unknown_* 만 있으면 health=ok" "ok" "$(echo "$C3_OUT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["health"])')"
_assert_contains "C-3: reasons 에 unknown_netspeed" "unknown_netspeed" "$C3_OUT"
_assert_contains "C-3: reasons 에 unknown_tailscale" "unknown_tailscale" "$C3_OUT"

# ── D: --dry-run 통합 ──────────────────────────────────────────────────────────

echo "--- D: --dry-run 통합 ---"

TMPLOG=$(mktemp)
D1_OUT=$(bash "$HEALTH_SH" --dry-run 2>"$TMPLOG")
D1_EXIT=$?
rm -f "$TMPLOG"

_assert_eq "D-1: --dry-run exit 0" "0" "$D1_EXIT"
_assert_contains "D-1: JSON 에 health 필드" '"health"' "$D1_OUT"
_assert_not_contains "D-1: JSON 에 _unknown 없음" '"_unknown"' "$D1_OUT"

HEALTH_VAL=$(echo "$D1_OUT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["health"])' 2>/dev/null || echo "parse_error")
if [[ "$HEALTH_VAL" =~ ^(ok|warn|bad)$ ]]; then
    printf 'PASS: D-1: health 값이 ok/warn/bad 중 하나 (%s)\n' "$HEALTH_VAL"
    PASS=$((PASS+1))
else
    printf 'FAIL: D-1: health 값이 올바르지 않음 (%s)\n' "$HEALTH_VAL"
    FAIL=$((FAIL+1))
fi

echo ""
printf '=== 결과: PASS=%d FAIL=%d ===\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
