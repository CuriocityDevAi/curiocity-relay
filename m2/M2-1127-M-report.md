# M2-1127-M 리포트

**PASS** · PR #72 · head `5151d2ab2` · 테스트 9케이스 (C-4~6 + G-1~4) · 아이맥 재설치 필요

---

## 작업 내용

### 신규 파일: `scripts/ci-box/cleanup-tmp.sh`

- `$TMPDIR` 최상위 항목 중 24시간+ 미변경 항목을 **하루 1회** 자동 삭제
- `~/.ci-box-cleanup-tmp-stamp` 타임스탬프 파일로 중복 실행 방지
- 실행 중인 runner 잡(Worker 로그 파싱) 시작 시각 이후 파일 보호
- `TMPDIR` 빈값 · `/` 경로 이중 방어
- `--force` / `--dry-run` 플래그 지원
- 결과 JSON → `~/.ci-box-cleanup-tmp-last.json` 캐시

### 변경: `scripts/ci-box/health.sh`

- `collect_tmp()` 함수 추가 → 5분마다 `imac.json`에 `tmp` 섹션 포함
  ```json
  "tmp": {
    "current_gb": 22.5,
    "freed_gb": 2.5,
    "cleanup_at": "2026-11-27T10:00:00Z"
  }
  ```
- `judge_health` 디스크 임계값 강화:
  - `root_free_gb < 30GB` → `health=warn`
  - `root_free_gb < 15GB` → `health=bad` (기존 `< 10GB`)

### 변경: `scripts/test/ci-box-health.test.sh`

신규 9케이스 추가 — 전체 PASS:

| 케이스 | 내용 | 결과 |
|--------|------|------|
| C-4 | root_free_gb=20 → warn (lt_30) | PASS |
| C-5 | root_free_gb=10 → bad (lt_15) | PASS |
| C-6 | root_free_gb=40 → ok | PASS |
| G-1 | TMPDIR='' → skip_reason=invalid_tmpdir | PASS |
| G-2 | 하루 이미 실행 → skip_reason=already_ran_today | PASS |
| G-3a | dry-run → 아무것도 삭제 안 함 | PASS |
| G-3b | --force → 48h 항목 삭제됨 | PASS |
| G-3c | --force → 방금 생성 항목 보존 | PASS |
| G-4 | TMPDIR=/ → skip_reason=invalid_tmpdir | PASS |

---

## 아이맥 재설치

**plist 재설치 불필요** — health.sh는 git pull만으로 반영됨.

```bash
# 맥북에서 아이맥에 접속하여 붙여넣기 (1줄)
ssh <아이맥-tailscale-ip> "cd ~/projects/curiocity-relay && git pull"
```

> cleanup-tmp.sh는 launchd plist와 무관하게 health.sh에서 직접 호출되므로
> git pull만으로 아이맥에 즉시 반영됩니다.
