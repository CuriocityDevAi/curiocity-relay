relay PR #9 · catch partial O · 커서 skip O · 회귀 2/2 · 테스트 181/181 · --once 20s

# M0-1119-S 리포트 — ci-health 후속 (R0 5차 AC §2)

## 수행

- 브랜치: `fix/M0-1119-S-ci-cursor-followup` (origin/main → d647a4866 기준)
- 커밋: a95efc97b
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/9 (not merged · 지시대로)

## 변경 파일 (2)

- `scripts/lib/ci-health.mjs` — REQ1 (non-404 catch partial:true) + REQ2 (커서 블록 skip) · +29 lines
- `scripts/test/ci-health-k.test.mjs` — S-1 (AC §2-①) + S-2 (AC §2-②) · +226 lines

## REQ 적용 결과

- **REQ1 O**: `collectHistoryForRepo` catch 에서 `isMissingRepoError(e)` 분기 분리.
  - 404 → `partial:false` 유지 (state 가 `skipped='missing-repo'` 로 표시해 stateFullySeen=false 로 cursor 전진 생략).
  - non-404 → `partial:true, earliestUnprocessed:null, latestProcessedRunCreatedAt:null` 로 REQ2 fall-through.
- **REQ2 O**: 커서 블록 `if (!stateFullySeen) continue;` 바로 뒤에 `if (partial && !earliestUnprocessed) continue;` 추가.
  - O-1c 보존 확인 (partial=false 경로는 guard 불발).

## 회귀 테스트 2/2

- **S-1 (REQ1·AC §2-①)**: 500 Internal Server Error 로 완료 run 목록 조회 throw → cursor ≤ `completedC.created_at` · tick2 recover 시 C 기록됨.
- **S-2 (REQ2·AC §2-②)**: 2-repo + `apiBudget=11` 로 main history 가 budget 소진 → fork `collectCompletedJobs` 진입 시 `!budgetCheck(budget)` 조기 반환 · fork cursor 전진 생략.

## 검증

- `node --test scripts/test/*.test.mjs` → **181/181 pass** (baseline 179 + S-1/S-2).
- 원복 검증: `git stash push scripts/lib/ci-health.mjs` 로 fix 만 제거 후 재실행 → S-1·S-2 양쪽 FAIL (25/27). fix 적용 후 양쪽 PASS. → 두 테스트 모두 실제 버그를 포착.
- `node scripts/lib/ci-health.mjs --once` → **20s** (overallDeadlineMs 기본 20s 대로 타임아웃 · 정상 · `partial=true` + api_calls=29/40 + 결과 JSON 정상).

## 스코프

- 러너 본체(`scripts/hub-runner-v7.5.mjs` 등) · 재설치 스크립트 · 설정 파일 · k0/k1/k2 (Kyu 폴더) 변동 없음.
- 20분 상한 내에 완료.
