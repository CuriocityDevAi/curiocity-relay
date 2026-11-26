storeport#460 CHANGES
relay#54 CHANGES

---

## storeport #460 — M2-1126-N 실측 결과

**테스트 PR**: #461 (`test/R0-1126-AJ-ci-retarget`, 베이스: `ci/M2-1126-M-pr-edited-trigger` → `main`)  
**브랜치**: PR #460 head(`2211f615`) 기반 · 실측 후 닫음 · 브랜치 삭제 완료

### ① 본문 수정 → CI 미실행 · 기존 체크 유지

```
실행: PR #461 body edit (2026-11-26T13:50 UTC, base=main)
run 45833178863  ci-on-retarget  pull_request  completed: skipped
  └─ retarget-ci SKIPPED (github.event.changes.base = null — base 미변경)
ci.yml 새 런: 없음
statusCheckRollup: retarget-ci(SKIPPED) 추가 · 기존 체크 유지
mergeStateStatus: CLEAN (기존 상태 그대로)
```

**결과: PASS ✓** — `edited` 제거 + `ci-on-retarget` skipped 조합으로 본문 수정이 CI를 트리거하지 않음.

---

### ② 빨간 CI 커밋 + 본문 수정 → BLOCKED 유지

```
실행: 커밋 7b5624c (INVALID_PROCESS → feature-map-check FAILURE)
run 45833396396  ci  pull_request  queued→실행 중 (markers-and-forbidden·changes-filter·route: SUCCESS, heavy-mac: QUEUED)
run 45833396363  docker-build-pr  pull_request  IN_PROGRESS
feature-map-check: FAILURE  mergeStateStatus: UNSTABLE

이후 body edit:
run 45834245769  ci-on-retarget  pull_request  completed: skipped
  └─ retarget-ci SKIPPED (base 미변경)
ci.yml 추가 런: 없음 (run 45833396396 그대로 유지)
mergeStateStatus: UNSTABLE (CLEAN 전환 없음)
```

**결과: PASS ✓** — 본문 수정이 새 CI를 트리거하지 않으며, 기존 UNSTABLE/BLOCKED 상태가 유지됨. M2-1126-M의 구멍(skipped=통과로 덮임) 해소 확인.

---

### ③ base 변경(스택→main) → ci-on-retarget → workflow_dispatch → PR 체크 붙음 여부

```
실행: PR #461 base ci/M2-1126-M-pr-edited-trigger → main (2026-11-26T13:49 UTC)

run 45832862354  ci-on-retarget  pull_request  completed: success   ← PR 체크로 붙음 ✓
  └─ retarget-ci SUCCESS
  └─ 내부에서 gh workflow run ci.yml --repo ... --ref test/R0-1126-AJ-ci-retarget 호출

run 45832876122  ci  workflow_dispatch  queued  (9분+ 경과)        ← PR 체크로 안 붙음 ✗

statusCheckRollup 확인 (9분 후):
  - retarget-ci (ci-on-retarget, pull_request): PRESENT
  - ci (workflow_dispatch): ABSENT — PR statusCheckRollup에 없음
```

**결과: CHANGES — ③ 목적 미달**

GitHub `workflow_dispatch` 런은 PR 체크(statusCheckRollup)에 연결되지 않습니다.  
`pull_request` 또는 `push` 이벤트 런만 PR 체크로 붙습니다.  
→ 스택 PR을 main으로 retarget해도 CI 체크가 PR에 없는 상태 = 머지 가능 여부 판단 불가.

**대안: empty commit push로 synchronize 유발**

`gh workflow run` 대신 head 브랜치에 빈 커밋을 GitHub API로 push:

```yaml
# ci-on-retarget.yml 수정안
permissions:
  actions: write
  contents: write        # 추가 필요

steps:
  - name: Trigger CI via empty commit (synchronize event)
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      HEAD_SHA=$(gh api repos/${{ github.repository }}/git/refs/heads/${{ github.event.pull_request.head.ref }} --jq '.object.sha')
      TREE_SHA=$(gh api repos/${{ github.repository }}/git/commits/${HEAD_SHA} --jq '.tree.sha')
      NEW_SHA=$(gh api repos/${{ github.repository }}/git/commits \
        -X POST \
        -f "message=ci: retarget to ${{ github.event.pull_request.base.ref }} [skip-retarget]" \
        -f "tree=${TREE_SHA}" \
        -f "parents[]=${HEAD_SHA}" \
        --jq '.sha')
      gh api repos/${{ github.repository }}/git/refs/heads/${{ github.event.pull_request.head.ref }} \
        -X PATCH -f sha="${NEW_SHA}"
```

이렇게 하면 head 브랜치에 빈 커밋이 push되어 `synchronize` 이벤트가 발생 →  
ci.yml이 `pull_request` 컨텍스트로 실행 → PR 체크로 정상 연결됨.

단점: PR 커밋 히스토리에 "retarget trigger" 커밋이 남음.  
보존 요소 (`ci.yml` 잡 구성·러너 라우팅·concurrency · ci-watch v1.13 4줄): 이 대안에서도 모두 보존됨.

---

## relay #54 — ci-watch v1.14 실측 결과

### 손계산: 2026-11-26.jsonl 클라우드 숫자

```
파일: /Users/kyu.lee/projects/curiocity-relay/status/ci/2026-11-26.jsonl
총 409행, cloud 행 124개

heavy-cloud 집계:
  storeport heavy-cloud: 25행 (skipped:21, failure:1, success:3)
  fork heavy-cloud:      20행
  no-repo heavy-cloud:    0행

countRealCloud 로직 (runner_kind=cloud AND !isMarkerJob):
  v1.13(전, heavy-cloud 항상 마커): 23건
  v1.14(후, fork만 마커):           48건
  delta:                            +25 (storeport heavy-cloud 25건 추가)
```

### fork heavy-cloud 여전히 제외 ✓

```python
fork heavy-cloud 20건: 모두 is_marker_job_after(job, FORK) == True
→ 여전히 제외됨 ✓
```

### repo 미전달 호출지

```
scripts/ci-watch.mjs:288  isMarkerJob(run.name)   ← repo 미전달
  위치: fetchQueuedForRepo(repo) 함수 내
  인자: run.name = workflow run 의 display name ("ci", "ci-on-retarget" 등)
       job name ("heavy-cloud")이 아님 → 실제로 heavy-cloud 필터링에 영향 없음
  그러나: repo 파라미터를 받아두고 isMarkerJob 에 미전달 → 기술적 미완료

나머지 7개 호출지(389·426·441·468·558·730·758): 모두 isMarkerJob(r.job, r.repo) ✓
ci-watch-render.mjs: isMarkerJob(record.job, record.repo) ✓
```

### CHANGES 근거

1. **W114-jsonl-delta 테스트 불일치**
   - 테스트 하드코딩: `before=22, after=46, delta=24`
   - 실 계산 결과: `before=23, after=48, delta=25`
   - 테스트 본문: "실측: scripts/ci-watch.mjs + 2026-11-26.jsonl 로 직접 검증"이지만 실제로는 단순 산술 항등식 (`assert.equal(46 - 22, 24)`) — 항상 통과, 실 데이터 미검증
   - 가능한 원인: PR 생성 시점(13:42) 이후 JSONL에 CI 런 25건 추가 기록됨

2. **ci-watch.mjs:288 `isMarkerJob(run.name)` repo 미전달**
   - `run.name`은 workflow name이므로 heavy-cloud가 걸릴 일은 없지만,
   - `fetchQueuedForRepo(repo)` 함수 내에서 repo를 받고도 미전달 → 의도 불명확, REQ 기준 미완

---

## 테스트 PR 정리 확인

- PR #461: 닫힘(closed) ✓
- 브랜치 `test/R0-1126-AJ-ci-retarget`: 삭제 완료 ✓
- workflow 런 취소: 45832876122, 45833396396, 45833396363 ✓
