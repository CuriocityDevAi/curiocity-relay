CI: 대기(heavy-cloud 진행중 · ubuntu-latest · run 45140435524)

## 현황 (2026-11-23T08:41 WIB 기준)

### PR #413 체크 상태

| 체크 | 상태 | 비고 |
|------|------|------|
| markers-and-forbidden | ✅ 통과 | 8s · ubuntu-latest |
| changes-filter | ✅ 통과 | 7s · ubuntu-latest |
| route | ✅ 통과 (is_cloud=true) | 31s · ubuntu-latest |
| heavy-cloud | ⏳ 진행 중 | ubuntu-latest · run 45140435524 |
| feature-map-check | ✅ 통과 | 14s · ubuntu-latest · run 45140439372 |

### CI가 대기했던 원인

셀프호스트 러너(`curiocity-mac`, `curiocity-mac-light`) 1시간 이상 오프라인.
`runner-watch` 워크플로우 자체도 1시간 이상 대기열에서 미실행.

### 클라우드 오버플로우 조치

조건 충족: 러너 오프라인 AND PR ready(draft 아님) → cloud overflow 트리거.

| 항목 | 내용 |
|------|------|
| 오늘 클라우드 사용 | 1건(run 45140435524 heavy-cloud 진행중) / 5건 한도 |
| force_cloud | workflow_dispatch -f force_cloud=true |
| 트리거 시각 | 2026-11-23T08:40 WIB |

### 수정 사항 (3건)

1. **feature-map-check.yml**: `workflow_dispatch` + `force_cloud` 입력 추가 (commit e32c884)
2. **feature-map-check.yml**: dispatch context에서 BASE_SHA 비어 exit 128 → `origin/main...HEAD` fallback (commit 1c2054e)
3. **feature-map-check.yml + route-heavy.sh**: 취소된 heavy-cloud job이 quota를 잘못 소진하는 버그 수정 (commit f1a87e2)
   - `conclusion != "skipped"` → `conclusion != "skipped" and conclusion != "cancelled"`
   - PR comment 단계에 `event_name != workflow_dispatch` 가드 추가

### 로컬 검증 결과

| 항목 | 결과 |
|------|------|
| naming-check | ✅ PASS |
| dispatch validate | ✅ PASS |
| feature-map-check (PR diff) | ✅ unmatched=[] |
| commerce-core unit tests | ✅ 554 passed |
| customer-display typecheck | ✅ PASS |
| customer-display unit tests | ✅ 231 passed |
| pnpm typecheck 에러 | 1건 (apps/wing · pre-existing · wing 미변경) |

### wing typecheck 에러 (pre-existing)

이 PR 변경 파일에 `apps/wing/**`가 없음. CI `changes-filter`에서 `wing: false`이므로 CI는 wing 체크를 건너뜀. pre-existing 이슈로 이 PR 범위 밖.

### 다음 단계

heavy-cloud (run 45140435524) 완료 후 결과 확인:
- 통과 시 → PR mergeStateStatus = MERGEABLE 예상
- 실패 시 → 추가 수정 필요

**머지 금지** (Kyu 2차 실기 선행 조건 미완료).
