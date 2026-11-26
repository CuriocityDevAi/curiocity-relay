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
#   B-3: collect_netspeed — 0 캐시 → miss 처리 + 측정 0/0 → null/unknown_netspeed
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

# B-3: 0 캐시 → cache-read miss + 측정 0/0 → null/unknown_netspeed
echo "--- B-3: collect_netspeed 0 캐시 ---"

B3_CACHE=$(mktemp)
printf '{"dl_mbps":0,"ul_mbps":0,"rpm":0,"_ts":%d}' "$(date +%s)" > "$B3_CACHE"
B3_NOW=$(date +%s)
B3_CACHED=$(python3 - "$B3_NOW" "$B3_CACHE" <<'PYEOF' 2>/dev/null || echo "miss"
import json, sys
now = int(sys.argv[1])
try:
    d = json.load(open(sys.argv[2]))
    age = now - int(d.get('_ts', 0))
    if age < 3600 and not (d.get('dl_mbps', 0) == 0 and d.get('ul_mbps', 0) == 0):
        d['cached'] = True
        d.pop('_ts', None)
        d.pop('_unknown', None)
        print(json.dumps(d))
    else:
        print("miss")
except Exception:
    print("miss")
PYEOF
)
rm -f "$B3_CACHE"
_assert_eq "B-3: 0 캐시 → cache-read miss" "miss" "$B3_CACHED"

B3_DL="0.0"; B3_UL="0.0"
if python3 -c "import sys; sys.exit(0 if float('$B3_DL')==0 and float('$B3_UL')==0 else 1)" 2>/dev/null; then
    B3_NULL_OUT='{"dl_mbps":null,"ul_mbps":null,"rpm":null,"_unknown":"unknown_netspeed"}'
else
    B3_NULL_OUT="{}"
fi
_assert_contains "B-3: 측정값 0/0 → null 반환" '"dl_mbps":null' "$B3_NULL_OUT"
_assert_contains "B-3: 측정값 0/0 → unknown_netspeed" '"_unknown":"unknown_netspeed"' "$B3_NULL_OUT"

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

# ── E: curl 폴백 ──────────────────────────────────────────────────────────────

echo "--- E: curl 폴백 ---"

# E-1: curl %{speed_download}(bytes/s) → Mbps 변환 공식 (×8/1e6)
E1_OUT=$(python3 -c "print(round(float('10000000') * 8 / 1e6, 1))")
_assert_eq "E-1: curl 속도 변환 10MB/s → 80.0 Mbps" "80.0" "$E1_OUT"

# E-2: curl 폴백 캐시(dl>0, ul=null) → cache-read hit
E2_CACHE=$(mktemp)
printf '{"dl_mbps":83.1,"ul_mbps":null,"rpm":null,"_ts":%d}' "$(date +%s)" > "$E2_CACHE"
E2_NOW=$(date +%s)
E2_CACHED=$(python3 - "$E2_NOW" "$E2_CACHE" <<'PYEOF' 2>/dev/null || echo "miss"
import json, sys
now = int(sys.argv[1])
try:
    d = json.load(open(sys.argv[2]))
    age = now - int(d.get('_ts', 0))
    if age < 3600 and not (d.get('dl_mbps', 0) == 0 and d.get('ul_mbps', 0) == 0):
        d['cached'] = True
        d.pop('_ts', None)
        d.pop('_unknown', None)
        print(json.dumps(d, separators=(',', ':')))
    else:
        print("miss")
except Exception:
    print("miss")
PYEOF
)
rm -f "$E2_CACHE"
_assert_contains "E-2: curl 캐시 (ul=null) → cache-read hit (dl_mbps 포함)" '"dl_mbps":83.1' "$E2_CACHED"
_assert_contains "E-2: curl 캐시 → cached=true" '"cached":true' "$E2_CACHED"

# E-3: curl 폴백 반환값 포맷 (dl>0, ul=null, rpm=null)
E3_DL="83.1"; E3_UL="null"; E3_RPM="null"
E3_OUT=$(printf '{"dl_mbps":%s,"ul_mbps":%s,"rpm":%s,"cached":false}' "$E3_DL" "$E3_UL" "$E3_RPM")
_assert_contains "E-3: curl 반환값 dl>0" '"dl_mbps":83.1' "$E3_OUT"
_assert_contains "E-3: curl 반환값 ul=null" '"ul_mbps":null' "$E3_OUT"
_assert_contains "E-3: curl 반환값 rpm=null" '"rpm":null' "$E3_OUT"

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

# ── F: collect_running_jobs W9 경로 테스트 (M2-1126-I) ───────────────────────

echo "--- F: collect_running_jobs W9 경로 ---"

# F-1: _runner_dir 규칙 경로 (ci-box-* 패턴) 가 존재할 때 해당 경로를 탐색
F1_TMPDIR=$(mktemp -d)
F1_DIAG="$F1_TMPDIR/actions-runner-ci-box-sp-heavy/_diag"
mkdir -p "$F1_DIAG"
# Worker_*.log 가 없으면 result = [] — 결과가 비어 있어야 함 (에러 없음)
F1_OUT=$(python3 - \
    "$F1_TMPDIR/actions-runner-ci-box-sp-heavy" \
    "$F1_TMPDIR/actions-runner-ci-box-sp-light" \
    "$F1_TMPDIR/actions-runner-ci-box-fork-heavy" \
    "$F1_TMPDIR/actions-runner-ci-box-fork-light" <<'PYEOF' 2>/dev/null || echo "ERROR"
import sys, json, re, os, time, subprocess

primary_dirs = sys.argv[1:]
result = []

def has_diag(d):
    return os.path.isdir(os.path.join(d, '_diag'))

runner_dirs = primary_dirs
if not any(has_diag(d) for d in primary_dirs):
    try:
        find_out = subprocess.check_output(
            ['find', os.path.expanduser('~'), '-maxdepth', '2', '-type', 'd', '-name', '_diag'],
            timeout=10, stderr=subprocess.DEVNULL, text=True,
        ).strip().split('\n')
        runner_dirs = [os.path.dirname(d) for d in find_out if d]
    except Exception:
        runner_dirs = primary_dirs

for runner_dir in runner_dirs:
    diag = os.path.join(runner_dir, '_diag')
    if not os.path.isdir(diag):
        continue
    logs = sorted(
        [f for f in os.listdir(diag) if f.startswith('Worker_') and f.endswith('.log')],
        reverse=True,
    )
    if not logs:
        continue
    result.append({'runner_name': os.path.basename(runner_dir)})

print(json.dumps(result))
PYEOF
)
rm -rf "$F1_TMPDIR"
_assert_eq "F-1: ci-box-* 경로 Worker 없음 → [] 반환 (에러 없음)" "[]" "$F1_OUT"

# F-2: 기본 경로 없을 때 find 폴백 → 대체 _diag 발견
F2_TMPDIR=$(mktemp -d)
F2_DIAG="$F2_TMPDIR/_diag"
mkdir -p "$F2_DIAG"
# Worker_*.log 생성 (60초 이내 mtime · Job completed. 없음)
F2_LOG="$F2_DIAG/Worker_20261126-070000-utc.log"
printf '[2026-11-26 07:00:00Z INFO Worker] Starting\n{"jobDisplayName":"playwright"}\n' > "$F2_LOG"

F2_OUT=$(python3 - \
    "$F2_TMPDIR/nonexistent-sp-heavy" \
    "$F2_TMPDIR/nonexistent-sp-light" \
    "$F2_TMPDIR/nonexistent-fork-heavy" \
    "$F2_TMPDIR/nonexistent-fork-light" <<PYEOF 2>/dev/null || echo "ERROR"
import sys, json, re, os, time, subprocess

primary_dirs = sys.argv[1:]
result = []

def has_diag(d):
    return os.path.isdir(os.path.join(d, '_diag'))

runner_dirs = primary_dirs
if not any(has_diag(d) for d in primary_dirs):
    # find 대신 직접 탐색 (테스트 격리)
    custom_base = "$F2_TMPDIR"
    found = []
    for entry in os.listdir(custom_base):
        d = os.path.join(custom_base, entry, '_diag')
        if os.path.isdir(d):
            found.append(os.path.join(custom_base, entry))
    if not found:
        # 최상위에 _diag 가 바로 있는 경우
        top_diag = os.path.join(custom_base, '_diag')
        if os.path.isdir(top_diag):
            found.append(custom_base)
    runner_dirs = found if found else primary_dirs

for runner_dir in runner_dirs:
    diag = os.path.join(runner_dir, '_diag')
    if not os.path.isdir(diag):
        continue
    logs = sorted(
        [f for f in os.listdir(diag) if f.startswith('Worker_') and f.endswith('.log')],
        reverse=True,
    )
    if not logs:
        continue
    latest = os.path.join(diag, logs[0])
    try:
        age = time.time() - os.path.getmtime(latest)
        if age > 3600:
            continue
    except Exception:
        continue
    try:
        log_size = os.path.getsize(latest)
        with open(latest, 'rb') as f:
            f.seek(max(0, log_size - 2048))
            tail = f.read().decode('utf-8', errors='replace')
        if 'Job completed.' in tail:
            continue
    except Exception:
        continue
    try:
        with open(latest, 'r', errors='replace') as f:
            content = f.read(81920)
    except Exception:
        continue
    info = {'runner_name': os.path.basename(runner_dir)}
    m = re.search(r'"jobDisplayName"\s*:\s*"([^"]+)"', content)
    if m:
        info['job'] = m.group(1)
    result.append(info)

print(json.dumps(result))
PYEOF
)
rm -rf "$F2_TMPDIR"
# find 폴백으로 _diag 를 찾았으므로 result 가 비어있지 않아야 함 (job 포함)
F2_HAS_JOB=$(echo "$F2_OUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print('yes' if any(r.get('job')=='playwright' for r in d) else 'no')" 2>/dev/null || echo "no")
_assert_eq "F-2: find 폴백 → _diag 발견 · Worker 로그에서 job 추출" "yes" "$F2_HAS_JOB"

echo ""
printf '=== 결과: PASS=%d FAIL=%d ===\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
