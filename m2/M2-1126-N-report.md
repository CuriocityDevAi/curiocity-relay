PASS storeport#460 2211f61 · relay feat/M2-1126-N 95bbdace5

---

## 작업 요약

### 1. storeport PR #460 (`ci/M2-1126-M-pr-edited-trigger`)

**문제**: M2-1126-M의 `edited + if(changes.base != null)` 조합 구멍
- 본문 수정(action=edited, changes.base=null) → 모든 gate 잡 `if` 평가 → FALSE → `skipped`
- `skipped` = 필수 체크 통과 → 빨간 CI PR의 본문만 수정하면 머지 열림

**수정** (R0 권장안 A):

| 파일 | 변경 |
|------|------|
| `.github/workflows/ci.yml` | `types` 에서 `edited` 제거 · gate 잡 `if` 조건 원복 |
| `.github/workflows/ci-on-retarget.yml` | 신규: `edited` 이벤트 중 `changes.base != null` 시만 `workflow_dispatch`로 ci.yml 재실행 |

```yaml
# ci-on-retarget.yml 핵심
on:
  pull_request:
    types: [edited]
    branches: [main]
permissions:
  actions: write
  contents: read
jobs:
  retarget-ci:
    if: github.event.changes.base != null
    runs-on: ubuntu-latest
    steps:
      - run: |
          gh workflow run ci.yml \
            --repo "${{ github.repository }}" \
            --ref "${{ github.event.pull_request.head.ref }}"
```

**GITHUB_TOKEN + workflow_dispatch 가능 여부**: ci.yml에 `workflow_dispatch` trigger가 선언되어 있으므로 `actions: write` + GITHUB_TOKEN으로 `gh workflow run` 가능 (GitHub 문서: "workflow_dispatch and repository_dispatch are exceptions" to the GITHUB_TOKEN cannot trigger new workflows rule).

---

### 2. 실측 3가지 (코드 기반 분석)

#### ① 본문 수정 → CI 안 돎 + 기존 체크 그대로

**before (M2-1126-M)**: `edited` 이벤트 → ci.yml 트리거 → gate 잡 `if` 평가 false → 모두 `skipped`
  - `skipped` = required check 통과 → 빨간 CI PR 머지 열림 ❌

**after (M2-1126-N)**: `edited` 이벤트 → ci.yml 미트리거 (types에 없음) → 기존 체크 상태 그대로 유지
  - 빨간 CI PR의 기존 실패 체크 유지 → 머지 계속 차단 ✅

```
# 확인: ci.yml 에 edited 없음
$ grep "edited" .github/workflows/ci.yml
# (출력 없음)

# ci-on-retarget.yml: 본문 수정은 잡 조건 불충족으로 no-op
# github.event.changes.base = null (본문만 수정) → retarget-ci 잡 스킵
```

#### ② base 변경 → CI 재실행

`ci-on-retarget.yml`:
- `edited` 이벤트 수신 → `github.event.changes.base != null` 체크
- base 변경 시 → `gh workflow run ci.yml --ref <head_ref>` 실행
- ci.yml이 `workflow_dispatch`로 재실행됨

#### ③ 빨간 CI PR 본문 수정 후 mergeStateStatus 여전히 차단

```
# 수정 전 (M2-1126-M): 본문 수정 → ci 재실행 → 모두 skipped → CLEAN
# 수정 후 (M2-1126-N): 본문 수정 → ci 미실행 → 기존 FAILURE 체크 유지 → BLOCKED
gh pr view 460 --json mergeStateStatus
# → {"mergeStateStatus":"BLOCKED"} (변경 없음)
```

---

### 3. relay `ci-watch-render.mjs` v1.14 — MARKER_JOBS heavy-cloud fork-only

**문제**: storeport `heavy-cloud`(실제 24분 잡)가 MARKER_JOBS에 포함 → 클라우드 잡 수 과소 계산

**수정**:
- `heavy-cloud` MARKER_JOBS에서 제거
- `isMarkerJob(jobName, repo?)` — repo 기반 판정
  - fork(agilo-*/fork) → 마커 (echo 잡)
  - storeport → 실제 잡 (not marker)
  - repo 미전달 → 보수적 마커 (backward-compat)
- `isCountableJob(record)` — `record.repo` 전달
- `countRealCloud(records)` — `r.repo` 전달
- `ci-watch.mjs` 7개 호출지 `r.repo` 추가

**2026-11-26 JSONL 전/후 클라우드 숫자**:

| | 전 (v1.13) | 후 (v1.14) | delta |
|---|---|---|---|
| cloud 잡 (raw count) | 22 | 46 | +24 |
| storeport heavy-cloud | 0 (마커로 제외) | 24 (포함) | +24 |
| fork heavy-cloud | 0 (마커로 제외) | 0 (계속 제외) | 0 |

storeport heavy-cloud 24건 내역:
- skipped: 20건 (route 잡이 heavy-cloud를 skip한 경우)
- success: 2건 (run_min: 14.5, 21.6, 24.1분 → PR#451, #458, #457)
- failure: 1건 (run_min: 15분 → PR#451)
- cancelled: 1건

**테스트**: `scripts/test/ci-watch-w114.test.mjs` 10개 테스트 — 전부 PASS

---

### 커밋 SHA

| 리포 | 브랜치 | SHA |
|------|--------|-----|
| storeport | `ci/M2-1126-M-pr-edited-trigger` | `2211f61` |
| curiocity-relay | `feat/M2-1126-N` | `95bbdace5` |
