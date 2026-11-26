CI #457 red · #458 미실행(green-after-recheck) — #457 genuine regression(customer-display·e2e), #458 BLOCKED=리뷰 스레드 미해결

---

## 1. 체크 현황

### PR #457 — feat/M0-1126-J (mergeStateStatus: **UNSTABLE**)

| 체크 | 워크플로 | 결과 |
|------|---------|------|
| markers-and-forbidden | ci | ✅ pass |
| changes-filter | ci | ✅ pass |
| route | ci | ✅ pass |
| **heavy-mac** | ci | ❌ **FAIL** (customer-display·e2e) |
| heavy-cloud | ci | ⏭ skip |
| docker-build-commerce-core | docker-build-pr | ✅ pass |
| check | feature-map-check | ✅ pass |

### PR #458 — feat/M0-1126-K (mergeStateStatus: **BLOCKED**)

| 체크 | 워크플로 | 결과 |
|------|---------|------|
| markers-and-forbidden | ci | ✅ pass |
| changes-filter | ci | ✅ pass |
| route | ci | ✅ pass |
| heavy-mac | ci | ⏭ skip |
| **heavy-cloud** | ci | ✅ pass (21m36s) |
| docker-build-commerce-core | docker-build-pr | ✅ pass |
| check | feature-map-check | ✅ pass |

**#458 CI는 전부 통과. BLOCKED 원인은 CI가 아님** → 항목 2 말미 참조.

---

## 2. ci 워크플로가 안 뜬 원인 — **(ㄱ) 판정**

**근거: storeport `.github/workflows/ci.yml`**

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
```

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**판정 경로:**

1. PR #457·#458이 원래 `base=feat/M0-1126-I`(스택 PR)로 열림 → `branches: [main]` 필터에서 베이스가 main 아님 → ci **미실행**.
2. base를 main으로 retarget할 때 GitHub가 `pull_request: edited` 이벤트 발생 → 그러나 `edited`가 `types` 목록에 없음 → ci **여전히 미실행**.
3. 이후 force-push(`synchronize`) 시점에 베이스=main + 타입=synchronize 매칭 → ci **실행** (10:57:25Z for J, 10:58:03Z for K).
4. 11:24 heartbeat 시 K의 heavy-cloud 아직 진행 중(완료 11:25:32Z) + relay 워커 idle → jsonl이 미반영. J는 11:14에 이미 실패했으나 relay가 CI 이벤트를 미처 기록 못 한 상태.

**option (ㄴ) concurrency 취소**: 동일 ref로 경쟁 실행 없음 → 해당 없음.  
**option (ㄷ) 러너 큐 멈춤**: ci가 실제로 완료됐으므로 → 해당 없음.

**#458 BLOCKED 별도 원인**: GitHub ruleset `main-protection`(ID 19870719)에 `required_review_thread_resolution: true` 설정. CuriocityDevAi가 COMMENT 리뷰로 여러 인라인 스레드를 남겼고, 그 스레드들이 미해결 상태. CI와 무관.

```
$ gh api repos/CuriocityDevAi/storeport/rulesets/19870719 | jq .rules
→ "required_review_thread_resolution": true
```

---

## 3. 재실행 결과

### #457 — `gh run rerun 45806097312 --failed`

```
$ gh run rerun 45806097312 --failed --repo CuriocityDevAi/storeport
(exit 0, no output)

$ gh run list --repo CuriocityDevAi/storeport --branch feat/M0-1126-J --limit 3
completed  failure  ci  pull_request  45806097312  22m53s  2026-11-26T11:31:44Z
```

**재실행 결과 (run 45806097312, job 139879913332 heavy-mac, 15m4s):**

| 스텝 | 결과 |
|------|------|
| commerce-core-standalone-install | ✅ success |
| build-commerce-core | ✅ success |
| unit-commerce-core (877/877) | ✅ success |
| pos-integration (cd-pos-sync-v3/v4/v4-next-customer) | ✅ success |
| customer-display·typecheck | ✅ success |
| customer-display·unit (328/328) | ✅ success |
| customer-display·build | ✅ success |
| **customer-display·e2e** | ❌ **FAIL** (동일) |
| e2e-admin-loyalty (24/25) | ✅ success |

**실패 세부:**

```
1) e2e/cd-pos-sync-v2.spec.ts:129:3
   M0-1126-D · CD↔POS 2차 실기 피드백 › CD-1 · stale paid+skipped (오래된) → main (welcome)
   Error: expect(locator).toBeVisible() failed
   Expected: visible
   Error: element(s) not found
     - Expect "toBeVisible" getByTestId('main-screen') with timeout 15000ms
   > 143 | await expect(page.getByTestId("main-screen")).toBeVisible({...})
       at e2e/cd-pos-sync-v2.spec.ts:143:51
```

원본·재실행 모두 동일 케이스 실패 → **genuine regression** (flaky 아님). M0-1126-J의 V4-6 "Skipped 자동 해제" 로직이 `paid+skipped` 스냅샷을 main 화면으로 복귀시키지 않는 버그로 추정.

### #458 — 재실행 불필요

CI 전체 통과. BLOCKED는 리뷰 스레드 해결로 처리 가능.

---

## 4. 재발 방지 제안

ci.yml `on.pull_request.types`에 **`edited` 추가** — `base` retarget 시 `edited` 이벤트가 즉시 ci를 트리거하여 force-push 없이도 실행됨.

```yaml
# before
types: [opened, synchronize, reopened, ready_for_review]
# after
types: [opened, synchronize, reopened, ready_for_review, edited]
```

단, `edited`는 PR 제목·본문 수정 시도 ci 실행을 포함하므로 비용이 소폭 증가. 허용 범위라면 한 줄 추가로 완전히 해결됨. 허용 불가라면 retarget 후 반드시 empty-commit push를 convention으로 채택.

---

## 명령 실행 로그 요약

```
gh pr checks 457 --repo CuriocityDevAi/storeport
  → heavy-mac fail / others pass

gh pr checks 458 --repo CuriocityDevAi/storeport
  → all pass (heavy-mac skip, heavy-cloud pass)

gh pr view 457 --json mergeStateStatus → "UNSTABLE"
gh pr view 458 --json mergeStateStatus → "BLOCKED"

gh api repos/CuriocityDevAi/storeport/rulesets/19870719
  → required_review_thread_resolution: true (BLOCKED 원인)

gh run rerun 45806097312 --failed --repo CuriocityDevAi/storeport
  → queued 11:31:44Z → completed failure 22m53s
  → customer-display·e2e 동일 실패 확인 (genuine regression)
```
