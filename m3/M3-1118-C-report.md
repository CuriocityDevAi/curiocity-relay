#296 feature-map O · trap 이동 O · orders-list 9/9 O · check 잡 pass

## 작업 내역

### REQ 1 — feature-map 등록
- `docs/feature-map.yaml` → commerce-core area 에 `integration-runner` 프로세스 신설
- `apps/commerce-core/scripts/it.sh` 경로 등록
- 로컬 `node scripts/feature-map-check.mjs --diff apps/commerce-core/scripts/it.sh` → `matched=1 unmatched=0` exit 0 확인

### REQ 2 — trap 위치 이동
- 로컬 it.sh (구 버전): CREATE DATABASE 없음 → GitHub PR HEAD 로 업데이트
- 변경: `trap _cleanup_db EXIT` 를 `CREATE DATABASE` 직전으로 이동
- `_cleanup_db()` 에 `echo "▶ [it.sh] DB 정리: ${DB_DATABASE}"` 추가
- `bash apps/commerce-core/scripts/it.sh orders-list` 결과:
  - `▶ DB: storeport_ci_984634202`
  - `Tests: 9 passed, 9 total` (19.8 s)
  - `▶ [it.sh] DB 정리: storeport_ci_984634202`

### REQ 3 — push · check 잡
- commit: `fix(test): M3-1118-C — it.sh DB 격리·정리 추가 · feature-map M1-1116-H 등록`
- push → `feat/m1-1116-h-integration-runner` (1427d91)
- `gh pr checks 296`: check **pass** (1m35s) · changes-filter·markers-and-forbidden pending
