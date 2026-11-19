R0 판정: APPROVE

# R0C-1119-AK — storeport PR #404 (M1-1119-V · route busy fallback 수정)

- 대상: CuriocityDevAi/storeport PR #404 · head `7608389` · diff = `.github/scripts/route-heavy.sh` + `ci.yml` route timeout 3→6
- PR 코멘트: https://github.com/CuriocityDevAi/storeport/pull/404#issuecomment-7013388000

## 확인 결과

1. **테스트**: head checkout 후 `bash .github/scripts/route-heavy.sh --test` → 18/18 통과.
2. **판정 로직**: Fallback = in_progress+queued run 전체 순회 · dedupe · 자기 run(`GITHUB_RUN_ID`, Actions 기본 env) 제외 · job 상태 in_progress|queued + 라벨 `curiocity-mac` 포함 & `curiocity-mac-light` 미포함.
3. **라벨 매칭**: jq `index()` 배열 원소 정확 일치 실측 — `-light` 배열 → null, heavy 배열 → 1. light 계열 workflow(ci-summary · feature-map-check · runner-watch · stale-deferred · route/markers/changes-filter) 혼입 없음. docker-smoke · nightly 의 `curiocity-mac` job 은 실제 Mac 점유이므로 busy 판정이 맞음.
4. **동시 run**: run 44551925338 jobs API 상 heavy-mac/heavy-cloud job 은 needs 완료 시점에 생성 → route 진행 중인 다른 run 의 heavy job 을 선점 busy 로 오판하지 않음.
5. **permissions**: route = contents:read · actions:read · pull-requests:write — 최소 범위.
6. **실측 run 44551925338** (route job 135657658457): `runner_busy=true` → `cloud_today=6 quota=5 (5 + extra=0)` → self-hosted + `ci-cloud-quota-exceeded` 라벨 추가 → heavy-mac queued · heavy-cloud skipped. 규칙(Kyu 11-19 12:55) 일치.

## 비차단 참고

- runs 조회 per_page=50 단일 페이지 — 누락 시 idle→self-hosted 방향이라 클라우드 과사용 위험 없음.
- route step 실측 3m16s (`_cloud_today` 2회 순회) vs timeout 6분 — 여유 작음. timeout 시 heavy 둘 다 skip 되므로 `created=>오늘` 필터 또는 재확인 축소 검토 권장.
- `_cloud_today` completed per_page=100 단일 페이지 — 하루 ci run 100건 초과 시 과소집계 가능 (#394 기존 코드, 이 PR 범위 밖).

금지 준수: push · 머지 없음 (storeport 쪽 변경 없음).
