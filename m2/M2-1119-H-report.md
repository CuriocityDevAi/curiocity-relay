#391 · fork #200 · run.status O/X · 화이트리스트 O/X · 오류/0행 초록 금지 O/X · 옛 SHA 차단 O/X · 대조 일치 O/X

## storeport ci/M2-1119-F-summary-all — commit b0f8a99
## fork     ci/M2-1119-F-summary-all — commit 3f6abbf

### 수정 내용

**① run.status ✅**
- ALL_RUNS 쿼리 시 `status` 필드 포함
- `WF_STATUS != "completed"` 이면 jobs API 미호출, `<workflow> (running) | ⏳` 행 출력 → PENDING_COUNT++
- 실증: storeport #385 `ci` 가 `queued` → `ci (running) | ⏳` 로 출력

**② 화이트리스트 ✅**
- `JOB_FAIL`: `conclusion != null AND !∈{success,skipped,neutral}` 로 카운트
- 아이콘: `cancelled/timed_out/startup_failure/action_required` 등 → `❌` (이전: `⏹` = 무해 취급)
- 링크: 실패 jobs (동일 화이트리스트 기준) 에만 HTML 링크 첨부

**③ 오류/0행 초록 금지 ✅**
- `shell: bash` 전 step 추가
- main step 첫 줄 `set -euo pipefail`
- ALL_RUNS API 실패 시 `|| { _post_error ...; exit 0 }` → `CI: ⚠ summary error` 댓글
- ROWS_FILE 비어있으면(`! -s`) `CI: ⚠ summary error` 댓글 후 exit

**④ 옛 SHA 차단 ✅**
- 테이블 빌드 직전 `gh api repos/$REPO/pulls/$PR_NUMBER --jq '.head.sha'` 조회
- `CURRENT_HEAD != HEAD_SHA` 이면 로그만 남기고 `exit 0`
- API 실패 시(`|| true`) `CURRENT_HEAD=''` → 가드 비활성 → 안전하게 계속 진행

### 대조 결과

**storeport #385** (HEAD `639ecd4`):
- 시뮬레이션: `ci (running) | ⏳`, `feature-map-check / check | ❌`
- `gh pr checks`: `check: fail` + `pos-integration: skipping(미생성)` + `unit-commerce-core: pending`
- 결과: CI: ❌ 1 failed · ⏳ 1 pending ← 가짜 초록 없음 ✅

**fork #54** (HEAD `331712d`):
- 시뮬레이션: `Lint / lint | ✅ | 30s`
- 결과: CI: ✅ all green (Lint 1개 success) ✅

### push 확인
- storeport: `git push origin ci/M2-1119-F-summary-all` → b0f8a99 ✅
- fork:       `git push origin ci/M2-1119-F-summary-all` → 3f6abbf ✅
