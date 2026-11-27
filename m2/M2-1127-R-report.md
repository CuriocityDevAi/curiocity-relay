PASS PR#75 feat/M2-1127-R (356c2dd3b)

## 변경 내용

### 근본 원인
launchd 실행 환경에서 `$TMPDIR`이 로그인 셸과 달라 `cleanup-tmp.sh`가
잘못된 경로를 대상으로 삼았음 → `imac.json tmp.current_gb=0.0` 보고 (실측 25GB).

### 수정 (`scripts/ci-box/cleanup-tmp.sh`)
- `validate_tmpdir()` → `resolve_tmpdir()`로 교체
  - `getconf DARWIN_USER_TEMP_DIR` 으로 사용자 TMPDIR 획득 (launchd/login 양쪽 동일)
  - launchd의 `$TMPDIR` 값을 로그에 기록 (진단용)
  - `/var/folders/` · `/private/var/folders/` 양쪽 패턴 검증 (macOS symlink 대응)
  - `getconf` 실패 → `skip_reason=getconf_failed` (아무것도 안 지움)
  - 비-`/var/folders/` → `skip_reason=unexpected_tmpdir`
  - `CLEANUP_TMP_DIR_OVERRIDE` 환경변수로 테스트 injection 경로 분리
  - subshell 경계 우회: 실패 시 stdout에 `"SKIP:<reason>"` 출력

### 테스트 (`scripts/test/ci-box-health.test.sh`)
- G-1, G-3, G-4: `TMPDIR=` 주입 → `CLEANUP_TMP_DIR_OVERRIDE=` 주입으로 전환
- G-5 추가: PATH 모킹으로 getconf 실패 → `skip_reason=getconf_failed`
- G-6 추가: 가짜 getconf가 `/tmp/not-var-folders` 반환 → `skip_reason=unexpected_tmpdir`
- 결과: **47 PASS / 0 FAIL**

## 아이맥 반영

PR 머지 후 아이맥에서 아래 명령 실행 필요:
```
cd ~/projects/curiocity-relay-heartbeat && git pull
```
