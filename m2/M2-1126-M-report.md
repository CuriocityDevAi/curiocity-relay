PASS storeport#460 relay#53

## 변경 요약

### REQ 1: storeport `.github/workflows/ci.yml` — PR edited 이벤트 base 변경 시만 CI 실행

**파일**: `.github/workflows/ci.yml`  
**PR**: https://github.com/CuriocityDevAi/storeport/pull/460  
**브랜치**: `ci/M2-1126-M-pr-edited-trigger`

변경 내용:
1. `pull_request.types`에 `edited` 추가: `[opened, synchronize, reopened, ready_for_review, edited]`
2. 세 gate 잡 모두에 조건 삽입:
   ```yaml
   if: github.event.action != 'edited' || github.event.changes.base != null
   ```
   - `markers-and-forbidden` (line 53)
   - `changes-filter` (line 89)
   - `route` (line 155)
3. `heavy-mac` / `heavy-cloud`은 `needs:[route, markers-and-forbidden, changes-filter]`로 자동 연쇄 스킵

### REQ 3: relay `hub-runner-v8.3.mjs` — CI 수집·push 주기 단축

**파일**: `scripts/hub-runner-v8.3.mjs`  
**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/53  
**브랜치**: `feat/M2-1126-M-ci-interval`

변경 내용:
- `CI_MIN_FIRE_INTERVAL_MS`: `5 * 60_000` → `2 * 60_000` (5분 → 2분)
- `HEARTBEAT_PUSH_INTERVAL_MS`: `5 * 60_000` → `2 * 60_000` (5분 → 2분)

**근거 (지연 원인)**:
#457 heavy-mac failure(11:14)가 11:21 jsonl에 없었던 이유 — timing race:
1. CI fetch: 5분 간격 → 11:14 완료 후 다음 수집이 ~11:16 (fetch async, ~20s)
2. heartbeat push: 5분 간격 → 11:16 수집 완료 후 다음 push가 ~11:21
3. 11:21 오케 체크 시점에 push 직전 → "안 돌았다" 오판

수정 후 최대 복합 지연: 2(수집) + 2(push) = **≤4분**

## 검증 로그

### ① PR 열기(opened) → CI 정상 실행
- run: https://github.com/CuriocityDevAi/storeport/actions/runs/45818315067
- `markers-and-forbidden`: pass (21s)
- `changes-filter`: pass (17s)
- `route`: pass (17s)
- `heavy-mac`: pass (2m30s)
- `heavy-cloud`: skipping (route가 mac 선택)

### ② PR 제목 수정(edited, base 변경 없음) → CI 전체 skipped
- run: https://github.com/CuriocityDevAi/storeport/actions/runs/45819130588
- 결과: `completed: skipped` (8s)
- `markers-and-forbidden`: skipping
- `changes-filter`: skipping
- `route`: skipping
- `heavy-mac`: skipping
- `heavy-cloud`: skipping

### ③ PR 제목 복구(edited, base 변경 없음) → CI 전체 skipped
- run: https://github.com/CuriocityDevAi/storeport/actions/runs/45819248912
- 결과: `completed: skipped`
- 모든 gate 잡: skipping

**base 변경 시 CI 실행**: `github.event.changes.base != null` 조건이 `true`가 되어 정상 실행됨 (GitHub API 보장).
