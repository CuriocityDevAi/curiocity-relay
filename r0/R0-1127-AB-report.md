relay#75: APPROVE · 필수 0
직접 실행: `bash scripts/test/ci-box-health.test.sh` (worktree R0-1127-AB, head 356c2dd3b) → PASS=47 FAIL=0

## 검토 결과

### REQ 1 — rm 대상 결정 경로 & /·HOME·러너 폴더 가능성

`resolve_tmpdir()` 운영 경로:
1. `getconf DARWIN_USER_TEMP_DIR` 실패·빈값 → `skip_reason=getconf_failed` (종료)
2. `python3 os.path.realpath()` normalize → `/var/folders/*` 또는 `/private/var/folders/*` 패턴 검증 → 불일치 시 `skip_reason=unexpected_tmpdir`
3. 디렉토리 존재 확인 → `skip_reason=invalid_tmpdir`

**`/`·HOME·러너 폴더 대상 가능성 = 0**: `getconf DARWIN_USER_TEMP_DIR`은 항상 `/var/folders/.../T/` 반환. 비정상 값도 step 2가 차단 (G-6 직접 확인).
이 머신 실측: `getconf DARWIN_USER_TEMP_DIR` → `/var/folders/02/psgqn2ns1_x5tf9pqbdqnx240000gp/T/` ✓

사소한 dead code: lines 117–121 `normalized == "/"` 체크는 도달 불가 (step 2에서 이미 차단). 기능 무관.

### REQ 2 — 첫 실행 삭제 양

`find "$tmpdir" -maxdepth 1 -mindepth 1`: 최상위 항목만, mtime < now-86400 인 것만. 아이맥 25GB에서는 24h 초과 최상위 항목 전부가 대상. 첫 실행 전 `--dry-run` 권장.

### REQ 3 — 실행 중 CI 잡 보호

`get_running_job_min_start()` → Runner `_diag/Worker_*.log` tail에 `Job completed.` 없고 mtime < 1h → 최소 job_min_start 추출.
삭제 루프: `item_mtime >= job_min_start` 이면 skip. read-only 접근 오래된 파일은 mtime 갱신 없어 보호 범위 외이나 TMPDIR 최상위엔 해당 없음.

## PR 코멘트

https://github.com/CuriocityDevAi/curiocity-relay/pull/75#issuecomment-7221445441
