#!/usr/bin/env bash
# scripts/ci-box/cleanup-tmp.sh — $TMPDIR 하루 1회 임시 파일 정리 (M2-1127-M · M2-1127-R)
#
# 사용법:
#   bash cleanup-tmp.sh              정리 실행 (하루 1회 제한)
#   bash cleanup-tmp.sh --dry-run    실제 삭제 없이 대상 목록만 출력
#   bash cleanup-tmp.sh --force      날짜 제한 무시하고 강제 실행
#
# 출력 (JSON stdout):
#   {"current_gb":X,"freed_gb":Y,"cleanup_at":"...|null","ran_this_tick":true|false}
#
# 사이드이펙트:
#   ~/.ci-box-cleanup-tmp-last.json  — 마지막 성공 정리 결과 캐시 (health.sh 도 읽음)
#   ~/Library/Logs/ci-box-health.log — 로그 추가
#
# 의존: bash · python3 · du · find · getconf(macOS)
#
# TMPDIR 결정 순서 (M2-1127-R):
#   1. CLEANUP_TMP_DIR_OVERRIDE 환경변수 (테스트 전용 · 본 운영에서는 미설정)
#   2. getconf DARWIN_USER_TEMP_DIR  — launchd 환경에서도 사용자 TMPDIR 을 정확히 반환
#   3. getconf 실패 → skip_reason=getconf_failed (아무것도 안 지움)
#   4. 결과가 /var/folders/ 하위인지 검증 — 아니면 skip_reason=unexpected_tmpdir
#
# 배경 (M2-1127-R): launchd 실행 환경의 $TMPDIR 이 로그인 셸과 달라
#   health.sh 의 imac.json tmp.current_gb=0.0 으로 보고됐지만 실측 25GB.
#   getconf DARWIN_USER_TEMP_DIR 은 launchd/login 양쪽에서 동일한 값을 반환.

set -uo pipefail

STAMP_FILE="$HOME/.ci-box-cleanup-tmp-stamp"
RESULT_CACHE="$HOME/.ci-box-cleanup-tmp-last.json"
LOG_FILE="$HOME/Library/Logs/ci-box-health.log"

# 아이맥 actions-runner 경로 목록 (collect_running_jobs 와 동일)
RUNNER_DIRS=(
    "$HOME/actions-runner-ci-box-sp-heavy"
    "$HOME/actions-runner-ci-box-sp-light"
    "$HOME/actions-runner-ci-box-fork-heavy"
    "$HOME/actions-runner-ci-box-fork-light"
)

DRY_RUN=0
FORCE=0
for _arg in "$@"; do
    [[ "$_arg" == "--dry-run" ]] && DRY_RUN=1
    [[ "$_arg" == "--force"   ]] && FORCE=1
done

_log() { printf '[%s] cleanup-tmp: %s\n' "$(date -u +%H:%M:%S)" "$*" | tee -a "$LOG_FILE" >&2; }

# ── TMPDIR 경로 결정 (M2-1127-R: getconf 우선) ───────────────────────────────
#
# launchd 환경에서 $TMPDIR 이 미설정이거나 로그인 셸과 다를 수 있음.
# getconf DARWIN_USER_TEMP_DIR 은 launchd 에서도 동일한 사용자 TMPDIR 반환.
#
# CLEANUP_TMP_DIR_OVERRIDE 가 설정되어 있으면 getconf 를 우회하고 그 값을 사용
# (테스트 전용 injection 경로 · 본 운영 launchd 에서는 미설정).
#
# 반환 형식:
#   성공: stdout 에 normalized path
#   실패: stdout 에 "SKIP:<reason>" 출력 후 exit 1
#          reason = invalid_tmpdir | getconf_failed | unexpected_tmpdir
#
# 주의: 이 함수는 $(resolve_tmpdir) 로 호출되므로 subshell 에서 실행된다.
#       _SKIP_REASON 같은 전역 변수를 직접 설정해도 부모 셸에 전파되지 않는다.
#       따라서 skip_reason 은 stdout 의 "SKIP:" 접두사를 통해 전달한다.

resolve_tmpdir() {
    # 진단: launchd 환경의 $TMPDIR 로그 (실패 원인 추적용)
    local launchd_tmpdir="${TMPDIR:-<unset>}"
    _log "launchd TMPDIR=$launchd_tmpdir"

    # ── 테스트 override (${VAR+x} → VAR 가 set 되어 있으면 true, unset 이면 false) ──
    if [[ -n "${CLEANUP_TMP_DIR_OVERRIDE+x}" ]]; then
        local d="${CLEANUP_TMP_DIR_OVERRIDE}"
        if [[ -z "$d" ]]; then
            _log "WARN: CLEANUP_TMP_DIR_OVERRIDE 비어 있음 — 정리 건너뜀"
            echo "SKIP:invalid_tmpdir"
            return 1
        fi
        local norm_ov
        norm_ov=$(python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$d" 2>/dev/null || echo "$d")
        if [[ "$norm_ov" == "/" ]] || [[ "$norm_ov" == "" ]]; then
            _log "WARN: CLEANUP_TMP_DIR_OVERRIDE=/ 방어 — 정리 건너뜀"
            echo "SKIP:invalid_tmpdir"
            return 1
        fi
        if [[ ! -d "$d" ]]; then
            _log "WARN: CLEANUP_TMP_DIR_OVERRIDE 디렉토리 없음: $d — 정리 건너뜀"
            echo "SKIP:invalid_tmpdir"
            return 1
        fi
        _log "TMPDIR 결정(override): $norm_ov"
        echo "$norm_ov"
        return 0
    fi

    # ── 운영 경로: getconf DARWIN_USER_TEMP_DIR ──────────────────────────────
    local gc_out
    if ! gc_out=$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null) || [[ -z "$gc_out" ]]; then
        _log "WARN: getconf DARWIN_USER_TEMP_DIR 실패 — 정리 건너뜀"
        echo "SKIP:getconf_failed"
        return 1
    fi

    local normalized
    normalized=$(python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$gc_out" 2>/dev/null || echo "$gc_out")

    # /var/folders/ 하위인지 검증.
    # macOS 에서 /var 은 /private/var 의 심볼릭 링크이므로 realpath 후 양쪽 패턴 허용.
    if [[ "$normalized" != /var/folders/* ]] && [[ "$normalized" != /private/var/folders/* ]]; then
        _log "WARN: getconf 결과가 /var/folders/ 하위 아님: $normalized — 정리 건너뜀"
        echo "SKIP:unexpected_tmpdir"
        return 1
    fi

    if [[ "$normalized" == "/" ]] || [[ "$normalized" == "" ]]; then
        _log "WARN: TMPDIR=/ 방어 — 정리 건너뜀"
        echo "SKIP:invalid_tmpdir"
        return 1
    fi

    if [[ ! -d "$normalized" ]]; then
        _log "WARN: TMPDIR 디렉토리 없음: $normalized — 정리 건너뜀"
        echo "SKIP:invalid_tmpdir"
        return 1
    fi

    _log "TMPDIR 결정: $normalized (launchd TMPDIR=$launchd_tmpdir)"
    echo "$normalized"
    return 0
}

# ── TMPDIR 크기 측정 (GB, 소수점 2자리) ──────────────────────────────────────

measure_gb() {
    local path="$1"
    python3 -c "
import subprocess, sys
try:
    out = subprocess.check_output(['du','-sk','$path'], stderr=subprocess.DEVNULL, text=True)
    kb = int(out.split()[0])
    print(round(kb / 1024 / 1024, 2))
except Exception:
    print(0.0)
" 2>/dev/null || echo "0.0"
}

# ── 현재 실행 중인 잡의 최소 시작 epoch 반환 (없으면 0) ───────────────────────

get_running_job_min_start() {
    python3 - "${RUNNER_DIRS[@]}" <<'PYEOF' 2>/dev/null || echo 0
import sys, re, os, time
from datetime import datetime, timezone

runner_dirs = sys.argv[1:]
min_start = 0

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
    # Job completed. 가 있으면 완료된 잡
    try:
        log_size = os.path.getsize(latest)
        with open(latest, 'rb') as f:
            f.seek(max(0, log_size - 2048))
            tail = f.read().decode('utf-8', errors='replace')
        if 'Job completed.' in tail:
            continue
    except Exception:
        continue
    # 시작 시각 파싱
    try:
        with open(latest, 'r', errors='replace') as f:
            head = f.read(300)
        m = re.search(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z)', head)
        if m:
            dt = datetime.strptime(m.group(1), '%Y-%m-%d %H:%M:%SZ').replace(tzinfo=timezone.utc)
            epoch = int(dt.timestamp())
            if min_start == 0 or epoch < min_start:
                min_start = epoch
    except Exception:
        pass

print(min_start)
PYEOF
}

# ── 마지막 cleanup_at 읽기 ────────────────────────────────────────────────────

read_last_cleanup_at() {
    if [[ -f "$RESULT_CACHE" ]]; then
        python3 -c "
import json
try:
    d = json.load(open('$RESULT_CACHE'))
    print(d.get('cleanup_at', 'null'))
except Exception:
    print('null')
" 2>/dev/null || echo "null"
    else
        echo "null"
    fi
}

# ── 메인 ──────────────────────────────────────────────────────────────────────

main() {
    local tmpdir_or_skip
    tmpdir_or_skip=$(resolve_tmpdir)
    if [[ $? -ne 0 ]]; then
        # TMPDIR 무효 → 현재 크기도 측정 불가
        # resolve_tmpdir 는 실패 시 stdout 에 "SKIP:<reason>" 을 출력함
        local skip_reason="${tmpdir_or_skip#SKIP:}"
        printf '{"current_gb":null,"freed_gb":null,"cleanup_at":null,"ran_this_tick":false,"skip_reason":"%s"}\n' "$skip_reason"
        return 0
    fi
    local tmpdir="$tmpdir_or_skip"

    local now_epoch now_iso
    now_epoch=$(date +%s)
    now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # 현재 TMPDIR 크기 (cleanup 전)
    local current_gb
    current_gb=$(measure_gb "$tmpdir")

    # 하루 1회 제한
    if [[ "$FORCE" -eq 0 ]]; then
        if [[ -f "$STAMP_FILE" ]]; then
            local last_run elapsed
            last_run=$(cat "$STAMP_FILE" 2>/dev/null || echo "0")
            elapsed=$(( now_epoch - last_run ))
            if [[ "$elapsed" -lt 86400 ]]; then
                _log "오늘 이미 실행됨 (elapsed=${elapsed}s) — 건너뜀"
                local last_at
                last_at=$(read_last_cleanup_at)
                printf '{"current_gb":%s,"freed_gb":0,"cleanup_at":%s,"ran_this_tick":false,"skip_reason":"already_ran_today"}\n' \
                    "$current_gb" \
                    "$(python3 -c "print('\"$last_at\"' if '$last_at' != 'null' else 'null')" 2>/dev/null || echo "null")"
                return 0
            fi
        fi
    fi

    _log "정리 시작: tmpdir=$tmpdir dry_run=$DRY_RUN"

    local before_gb
    before_gb="$current_gb"

    # 실행 중인 잡의 최소 시작 epoch
    local job_min_start
    job_min_start=$(get_running_job_min_start)

    local cutoff_24h=$(( now_epoch - 86400 ))
    _log "cutoff_24h=$cutoff_24h job_min_start=$job_min_start"

    # 삭제 대상 수집: $TMPDIR 최상위 항목
    local deleted_count=0
    local targets=()

    while IFS= read -r -d '' item; do
        [[ -z "$item" ]] && continue

        # 경로가 $tmpdir 하위인지 재확인 (심볼릭 링크 resolve 후 비교)
        local real_item real_tmpdir
        real_item=$(python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$item" 2>/dev/null || echo "$item")
        real_tmpdir="$tmpdir"
        if [[ "$real_item" != "$real_tmpdir/"* ]]; then
            _log "WARN: 경로 범위 초과 — 건너뜀: $real_item"
            continue
        fi

        # mtime 확인 (파이썬 — macOS stat 옵션 차이 회피)
        local item_mtime
        item_mtime=$(python3 -c "import os,sys
try:
    print(int(os.path.getmtime(sys.argv[1])))
except Exception:
    print($(( now_epoch )))
" "$item" 2>/dev/null || echo "$now_epoch")

        # 24h 초과 아님 → 보존
        if [[ "$item_mtime" -ge "$cutoff_24h" ]]; then
            continue
        fi

        # 잡 시작 이후 파일 보호 (job_min_start > 0 이고 mtime >= job_min_start)
        if [[ "$job_min_start" -gt 0 ]] && [[ "$item_mtime" -ge "$job_min_start" ]]; then
            _log "잡 보호(job_start=${job_min_start}): 건너뜀 $item"
            continue
        fi

        targets+=("$item")
    done < <(find "$tmpdir" -maxdepth 1 -mindepth 1 -print0 2>/dev/null)

    _log "삭제 대상: ${#targets[@]}개"

    if [[ "${#targets[@]}" -gt 0 ]]; then
        for item in "${targets[@]}"; do
            if [[ "$DRY_RUN" -eq 1 ]]; then
                _log "[dry-run] 삭제 예정: $item"
            else
                _log "삭제: $item"
                rm -rf "$item" 2>/dev/null || _log "WARN: 삭제 실패: $item"
            fi
            (( deleted_count++ )) || true
        done
    fi

    # 정리 후 크기
    local after_gb freed_gb
    after_gb=$(measure_gb "$tmpdir")
    freed_gb=$(python3 -c "print(round(max(0.0, $before_gb - $after_gb), 2))" 2>/dev/null || echo "0.0")

    # 타임스탬프 · 결과 캐시 저장 (dry-run 아닐 때)
    if [[ "$DRY_RUN" -eq 0 ]]; then
        echo "$now_epoch" > "$STAMP_FILE"
        printf '{"before_gb":%s,"after_gb":%s,"freed_gb":%s,"cleanup_at":"%s","deleted_count":%d}\n' \
            "$before_gb" "$after_gb" "$freed_gb" "$now_iso" "$deleted_count" > "$RESULT_CACHE"
    fi

    _log "완료: before=${before_gb}GB after=${after_gb}GB freed=${freed_gb}GB deleted=${deleted_count}개"

    printf '{"current_gb":%s,"freed_gb":%s,"cleanup_at":"%s","ran_this_tick":true,"before_gb":%s,"after_gb":%s,"deleted_count":%d}\n' \
        "$after_gb" "$freed_gb" "$now_iso" "$before_gb" "$after_gb" "$deleted_count"
}

main "$@"
