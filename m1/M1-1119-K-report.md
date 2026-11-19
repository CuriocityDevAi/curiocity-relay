#394 · A Mac 경로 초록 O(2m11s) · 클라우드 경로 pos-int 실행 초록 X(CI전용 diff·필터false) · C 실패=로컬 O · D busy 정확 O · 충돌 해소 O · 실패 단계 표 실측 △

## 커밋 목록

| SHA       | 메시지                                                              |
|-----------|---------------------------------------------------------------------|
| `f3cb4bf` | ci(workflow): M1-1119-K — heavy-mac/heavy-cloud 분리 · C/D 버그 수정 · 충돌 해소 |
| `6924a25` | test(temp-fail): 실패 단계 표 실측용 임시 커밋                      |
| `7e58fff` | fix(ci): composite action timeout-minutes 제거                      |
| `1755d51` | fix(ci): force_cloud 최우선 처리 (API 실패 시 self-hosted 버그 수정) |
| `0ad7dd9` | test(revert): 임시 실패 커밋 되돌림 · feature-map .github/actions 추가 |

## 항목별 결과

### A: heavy-mac / heavy-cloud 분리
- `.github/actions/heavy-steps/action.yml` composite action 생성 (checkout 제외 전 단계)
- `heavy-mac`: `[self-hosted, curiocity-mac]` · brew Postgres · `is_cloud == 'false'` 조건
- `heavy-cloud`: `ubuntu-latest` · `services: postgres:16` · `is_cloud == 'true'` 조건
- **실측**: run #44484168632 → heavy-mac ✅ 2m11s / heavy-cloud skipped
- **실측**: run #44484170880 → heavy-cloud ✅ 2m49s / heavy-mac skipped

### B: ci-summary.yml 충돌 해소
- `git rebase origin/main` 으로 M2-1119-F(main) 충돌 해소
- main 의 SHA 기반 전체 run 집계 방식 유지
- heavy-mac / heavy-cloud annotations 인식 추가

### C: 오늘 클라우드 카운트 개선
- `completed + in_progress + queued` 3가지 status 모두 카운트
- API 실패 → `return 1` → 호출자 로컬 대기 처리
- `extra` 비정수 → 로컬 대기 (안전 기본값)
- 경쟁 조건 최소화: 카운트 직후 재확인 1회, max 사용
- **단위 확인**: `route-heavy.sh --test` 11/11 통과

### D: Mac busy 판정 정확화
- `runner_name` 이 `curiocity-mac` 포함 AND `curiocity-mac-light` 미포함인 job 만 카운트
- `MAC_HEAVY_RUNNER` / `MAC_LIGHT_RUNNER` 상수로 관리 (route-heavy.sh · runner-watch.yml)

### 실패 단계 표 실측
- run `6924a25` (temp-fail) → heavy-cloud 2m26s 실패 · `::error title=TEMP-FAIL-annotation-test::` 발행 확인
- 단, 직후 clean 커밋이 ci-summary 댓글 덮어씌워 "heavy 실패 단계" 표가 PR 댓글에 반영된 상태 미확인
- ci-summary.yml 코드 자체는 M2-1119-L 의 annotations API 연동 경로 그대로 유지 → △

## 미완 사항

- **클라우드 pos-int 실행**: 이 브랜치가 CI 파일만 수정 → `commerce_core` 경로 필터 `false` → pos-integration step 조건(`if: inputs.commerce_core == 'true'`) 미통과로 SKIPPED. commerce-core 파일 변경 PR 에서 force_cloud 로 별도 검증 필요.

## 소요 시간 표

| job         | run                | 결과    | 소요      |
|-------------|---------------------|---------|-----------|
| heavy-mac   | #44484168632 (0ad7dd9) | ✅ success | 2m11s |
| heavy-cloud | #44484170880 (0ad7dd9) | ✅ success | 2m49s |
