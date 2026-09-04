# K0-0904-AJ · 리포트 (긴급 사고 회수 · PR#81 살리기)

**round**: `K0-0904-AJ`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/81 (신규 PR 개설 없음 · Kyu 지시)
**branch**: `feat/k1-0902-regression`
**timestamp**: 2026-09-04

---

## 요약

**긴급 사고 회수**: PR#81 (K1 마감) auto-merge 실패 뿌리 확인 · 자기 검증 · PR#85 처리 방침.

**AJ-1 결과**: **PR#81 브랜치는 이미 최신 main 을 병합 완료 상태 · Conflict 없음**.
- `git merge origin/main` = `Already up to date.`
- 브랜치 HEAD = `8826297` (Merge branch 'main' into feat/k1-0902-regression)
- main = `462292b` (AH #84 · K0-0903-AH 실기 결함 3 fix + AG-3 이월)
- merge-base = main HEAD (즉 브랜치가 main 을 완전히 포함)
- 이전 라운드에서 이미 병합 완료 · Kyu 인식이 이전 상태였을 가능성 · 현 시점 mergeable

**AJ-2 자기 검증 전량 통과**:
- 러너 pass 5 · exit 0 ✅
- 러너 REG_C3_SIMULATE_REGRESSION=1 fail 1 · exit 1 ✅
- pnpm check 991/0/0 · test 66 files 872 pass · build ✔
- CI regression.yml matrix-run 2건 초록 확증 (test-portal · todoboss)

**AJ-3 PR#85 처리 방침**: 파일 단위 계획 하단 명기 · 착수 = 다음 라운드 (Kyu 명시).

---

## AJ-1 · Conflict 해소 결과

### 뿌리 재확인

Kyu 원문: "PR#81 이 main 대비 conflict 로 auto-merge 실패. 뿌리 = 어제 개설 후 AD~AH 5개가 main 에 먼저 들어감."

### 실측 (fetch + merge)

```
git fetch origin
git checkout feat/k1-0902-regression   # local reset to origin
git merge --no-ff --no-commit origin/main
→ Already up to date.
```

즉 K1 브랜치 최신 HEAD (`8826297`) 안에 이미 main 최신 (`462292b`) 이 완전히 포함됨.

### 파일별 상태 (Kyu 요구 · 어느 쪽 살렸는지)

전 상태가 이미 **양쪽 살림** 완료:

| 파일 | K1 산출물 | main (AD~AH) | 현 상태 |
|------|-----------|---------------|---------|
| `tools/regression-runner/**` | ✓ (K1 정본) | 미터치 | K1 그대로 (5 attendance + 1 test-portal migration + bin/lib) |
| `.github/workflows/regression.yml` | ✓ (K1 정본) | 미터치 | K1 그대로 |
| `migrations/0003_*.sql` · `0004_*.sql` | ✓ (K1 · case_catalog + reg_run) | 미터치 | K1 그대로 |
| `migrations/0002_case_state.sql` | 미터치 | ✓ (AD · D1 case_state) | AD 그대로 |
| `src/lib/PrList.svelte` | 미터치 | ✓ (AF/AH · 카드→행 · pill) | AH 그대로 (병합 후) |
| `src/lib/inbox.ts` · `inbox.test.ts` | 미터치 | ✓ (AG/AH · humanize) | AH 그대로 |
| `src/routes/+page.svelte` · `+layout.svelte` | 미터치 | ✓ (AG 신설) | AG 그대로 |
| `src/routes/hub/+page.svelte` | 미터치 | ✓ (AG 이관 · AH humanize) | AH 그대로 |
| `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` | 미터치 | ✓ (AD~AH 편입) | AH 그대로 |
| `src/lib/approvals-store.ts` · test | 미터치 | ✓ (AH · dedup pre-check) | AH 그대로 |
| `src/lib/case-state-store.ts` · `case-progress.test.ts` | 미터치 | ✓ (AD/AF · computeCaseProgress) | AF 그대로 |
| `src/routes/api/case-state/**` · `pr-cases/**` · `kyu-gate-stamp/**` | 미터치 | ✓ (AD 신설) | AD 그대로 |
| `docs/SPEC.md` · `docs/design/kyu-orchestrator-v0.3.md` · `docs/requirements-tracking.md` | 미터치 | ✓ (AD~AH 편입) | AH 그대로 |

**결론**: 양쪽 산출물 전량 유지 · 버린 것 없음 · 이미 통합 완료 상태.

### GitHub mergeable 상태

```
gh pr view 81 --json mergeable,mergeStateStatus
{"mergeable":"MERGEABLE","mergeStateStatus":"BLOCKED"}
```

- **mergeable = MERGEABLE** (conflict 없음)
- **mergeStateStatus = BLOCKED** (required checks 아직 대기 · kyu-gate check_run 미체결)

즉 conflict 는 없고 · 병합만 대기 상태.

---

## AJ-2 · 자기 검증 (Kyu 승인 규약 A · 이번 라운드부터 적용)

### 1. 러너 pass 5 · exit 0

```bash
./tools/regression-runner/bin/seed-catalog-tmp --repo todoboss --print-json > /tmp/reg-todoboss.json
./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
```

**결과**:
```
 case_id                             │ verdict            │ reason
─────────────────────────────────────┼────────────────────┼─────────────────────
 attendance-boundary-times            │ pass               │ 
 attendance-early-leave-grace         │ pass               │ 
 attendance-multi-status              │ pass               │ 
 attendance-second-precision          │ pass               │ 
 attendance-work-type-baseline        │ pass               │ 

 pass    : 5
 fail    : 0
 blocked : 0
 exit_code = 0 (전 pass or 어설션 부재만)
```

**exit code 확증**: `exit=0` ✅

### 2. 러너 REG_C3_SIMULATE_REGRESSION=1 fail 1 · exit 1

```bash
REG_C3_SIMULATE_REGRESSION=1 ./tools/regression-runner/bin/regression-runner \
  --repo todoboss --catalog-file /tmp/reg-todoboss.json
```

**결과**:
```
 attendance-second-precision          │ fail               │ casher_shift1 17:37:47 퇴근: expected ot_minutes=7 · got 8 (C-*)

 pass    : 4
 fail    : 1
 blocked : 0
 exit_code = 1 (fail 있음)
```

**exit code 확증**: `exit=1` ✅ (regression 검출 정합)

### 3. pnpm QC

```
pnpm check   991/0/0
pnpm test    66 files · 872 pass
pnpm build   ✔ (adapter-cloudflare)
```

### 4. CI regression.yml matrix-run 초록 확증

```bash
gh run list --branch feat/k1-0902-regression --workflow=regression.yml --limit 5
```

**최신 실행 (`33844977559`)**:
- ✓ matrix-run (test-portal) 10s pass
- ✓ matrix-run (todoboss) 7s pass
- gate (skipped · matrix passed)

**annotations** (informational · 실제 실패 아님):
- Node.js 20 deprecation warning (actions/checkout · setup-node · Node 24 로 자동 forced)
- "Input required and not supplied: token" (todoboss · `secrets.TODOBOSS_READ_TOKEN` 부재 = Kyu 원문 "없으면 blocked 초록 정본대로" 정합)

**CI 초록 확증**: ✅ 2건 all green.

---

## AJ-3 · PR#85 처리 방침 (착수 금지 · 보고만)

**PR#85** (`feat/k0-0904-ai-assertions-auto-approve` · commit `2044d79`) 는 PR#81 미머지 상태의 main 에서 분기 · K1 러너 껍데기를 중복 신설.

### 버릴 것 (K1 정본과 중복 · 실 배선 불가)

| PR#85 파일 | 이유 | 처리 |
|---|---|---|
| `tools/regression-runner/assertions/test-portal/ai1-auto-manual-badge-visible.mjs` | K1 러너 assertion 시그니처와 호환 안 됨 (blocked 뼈대) | **삭제** |
| `tools/regression-runner/assertions/test-portal/ai4-auto-approve-rules-pure.mjs` | 동일 · vitest 파일이 아닌 러너 형식 | **삭제** |
| `tools/regression-runner/assertions/test-portal/ai5-dedup-cleanup-idempotent.mjs` | 동일 · portalUrl 컨텍스트 미배선 | **삭제** |
| `config/regression-assertions.json` | K1 정본 = D1 `case_catalog` 테이블 (migrations 0003) · JSON 정본 아님 | **삭제** |

### K1 러너에 연결 필요 (재작성)

| PR#85 파일 | 현행 (AI catalog JSON 소비) | 재작성 방향 (K1 case_catalog D1 소비) |
|---|---|---|
| `src/lib/regression-assertions.ts` | `import raw from 'config/regression-assertions.json'` | `/api/regression-catalog?repo=X` fetch (K1 seed-tmp API 정합) |
| `src/routes/api/pr-cases/+server.ts` | `caseKindFor(repo, id)` (JSON 매치) | K1 catalog D1 조회 join (`case_catalog` 테이블) |
| `src/lib/github.ts` `auto_case_count` · `manual_case_count` | `countCaseKinds(project.repo, cases)` | K1 catalog 원격 조회 · 캐시 or 서버 사이드 조인 |

### 유지 (K1 무관 · 그대로 재활용 가능)

| PR#85 파일 | 이유 |
|---|---|
| `src/lib/auto-approve.ts` + `.test.ts` | 순수 함수 (SPEC § 19) · 데이터 소스 무관 · 조건 조합 14 |
| `src/routes/api/approvals/dedup-cleanup/+server.ts` | 승인 큐 dedup · K1 무관 |
| `src/lib/approvals-store.ts` `cleanupDuplicatePendings` | 동일 |
| `src/lib/inbox.ts` `humanizeHaltReason` + `inbox.test.ts` | 허브 사람 말 · K1 무관 |
| `src/routes/hub/+page.svelte` humanize 소비 · 원문 접기 | 동일 |
| `src/routes/settings/+page.svelte` 자동 승인 스위치 | 동일 |
| `src/lib/PrList.svelte` `.row-kind` 카드 카운트 | 데이터 소스만 K1 로 교체 · UI 유지 |
| `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` `kindSummary` · 케이스 뱃지 | 동일 · UI 유지 |

### 실행 순서 (다음 라운드 · Kyu 지시 대기)

1. PR#81 auto-merge (kyu-gate stamp 성공 후)
2. PR#85 브랜치를 main 에 rebase
3. 위 표에 따라 4 파일 삭제 · 3 파일 재작성 · 나머지 유지 (rebase 안에서 처리)
4. push · CI 재실행 · auto-merge 대기
5. K1 인수인계 최종 완결 (seed-catalog-tmp git rm 은 AI-3 카탈로그 승격 배선 후)

**Kyu 지시 준수**: PR#85 브랜치 이 라운드에서 안 만짐 · src/ 화면 변경 없음.

---

## 정본 파일 (AJ 라운드)

이번 라운드 = **코드 변경 없음** (Kyu 지시). 리포트 · relay push 만.

- **PR#81 branch = 무변경** (이미 최신 main 병합 상태 · push 불필요)
- **PR#85 branch = 무변경** (Kyu 지시 · 건드리지 않음)
- **relay push**: `k0/K0-0904-AJ-report.md` 신설

---

## QC (자기 검증 · 이번 라운드 정본)

- **러너 pass 5 · exit 0**: ✅
- **러너 fail 1 · exit 1 (REG_C3_SIMULATE_REGRESSION=1)**: ✅
- **pnpm check**: 991/0/0 ✅
- **pnpm test**: 66 files · 872 pass ✅
- **pnpm build**: ✔ (adapter-cloudflare) ✅
- **CI regression.yml matrix-run 2건 초록**: ✅ (`33844977559`)

---

## Kyu 실기 절 (Kyu 요구 · 한 줄)

**포털에서 PR#81 을 다시 성공 판정하면 auto-merge 되는지 확증**.

---

## 다음 라운드 대비

- **AK (예상)**: Kyu PR#81 성공 판정 → auto-merge 확증 → PR#85 rebase 및 위 계획대로 정리
- 또는 **AK**: PR#81 auto-merge 실패 시 결함 회수

Kyu 판정 대기.
