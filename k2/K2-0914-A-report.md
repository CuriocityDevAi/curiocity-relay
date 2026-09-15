---
round: K2-0914-A
pr: https://github.com/CuriocityDevAi/test-portal/pull/96
outcome: 착지 (K2 부트스트랩 · CI 초록 복원 · test_runs/gate/seed API + 4 docs/testing + SPEC § 24 + K90~K95)
kyu_checks: 0
df_h_count: 0
---

# K2-0914-A · 리포트 (K2 첫 라운드 · 부트스트랩)

**허브**: K2 (신 정체성 · test-portal 테스트 체계 알바 허브 · K1-0914-A F 감사 인수)
**브랜치**: `feat/k2-testing-system` (rebase 후 SHA `1266990`)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/96
**CYCLE**: v1.2 § ①~⑤ 완결 · 심문 게시 → Kyu 회신 → 즉시 구현 → 리포트 정지.

---

## 1. 착지 요지

**K2 부트스트랩 + K1-0914-A F 감사 인수** = 5 항목 전량 소화.

### (a) CI 초록 복원 (audit O1 소화)

- **al2 삭제** = `tools/regression-runner/assertions/test-portal/al2-tabs-three-rendered.mjs` (K0-0904-AM-1 하단 탭 폐지 정합 · Q-a1 (가))
- **ao4 fix** = `export default run;` 편입 (러너 계약 정합 · Q-a2 (가))
- **러너 pre-flight** = `src/dispatch.mjs:validateAssertionContract` · default export 위반 = blocked + `[REG-CONTRACT]` prefix (C3 · Q-a2 (나))

### (b) test_runs D1 + /api/runs (Q-a3 병존 · Q-a4 Bearer)

- **migrations/0006_test_runs.sql** = suite-level rollup (repo·pr·sha·suite·status·started·duration·fail_names)
- **src/lib/server/runs/test-runs-store.ts** = D1 CRUD (recordTestRun · listTestRunsByPr · getLatestRunForSha · truncateTestRuns)
- **src/routes/api/runs/+server.ts** = GET (Access) + POST (Bearer)
- **src/lib/server/runs/ingest-auth.ts** = Web Crypto constant-time (TextEncoder + XOR · @types/node 회피)

### (c) /api/gate/:owner/:repo/:pr 3분기 (Q-a5)

- **src/lib/server/runs/gate.ts** = computeGate · GitHub check-runs + test_runs 종합
- **required 초판** = `kyu-gate` · `matrix-run (test-portal)` · `matrix-run (todoboss)`
- **App installation token 우선 · PAT 폴백**

### (d) /api/env/seed-reset 계약 (Q-a6)

- **src/lib/server/runs/seed-fixtures.ts** = `empty` · `sample-pr` 2 fixture (test-portal 자체)
- **src/routes/api/env/seed-reset/+server.ts** = Bearer 인증 · 다른 리포 요청 시 HTTP 422 `not_owned` (각 허브 자기 구현)

### (e) 어설션 회수 규약 (D2 · audit O2 소화)

- **tools/regression-runner/bin/check-retires** = PR body test-checklist yaml fenced 안 `retires: [...]` 파싱 · 파일 잔존 시 fail
- **regression.yml `retires-check` job** = pull_request 전용
- **regression.yml `matrix-run` step** = jq 로 fail_names 조립 → POST /api/runs (Bearer)

### (f) 4 docs + SPEC + tracking (D1 · B3)

- **docs/testing/README.md** = v1 원칙 + 러너 계약 + 회수 규약 + 소유 경계
- **docs/testing/runs-api.md** = /api/runs 계약 + 소비 경계 (K0 배선 지시)
- **docs/testing/gate-contract.md** = /api/gate 계약 + K1 auto-merge 통합 지시서 (§ 3)
- **docs/testing/seed-contract.md** = /api/env/seed-reset 계약 + 각 허브 발부 상태 (§ 6)
- **docs/SPEC.md § 24** = K2 정의 · 층 배치 · 판정 규칙 · 이력 소비 경계 · 시드 규약 · 회수 규약 · CI 트리거 · 착지 스냅샷
- **docs/requirements-tracking.md** = K90 (K2 정의) · K91 (CI 초록) · K92 (test_runs API) · K93 (Gate 3분기) · K94 (seed 계약) · K95 (retires 규약)
- **EPIC-STATE.md Active** = K2-0914-A 항목 append

---

## 2. 자기 검증 (실측 정본)

### 2.1 로컬 검증

```
$ pnpm check
1789461757752 START "/Users/kyu.lee/projects/test-portal-k2"
1789461757756 COMPLETED 1040 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS

$ pnpm build
Using @sveltejs/adapter-cloudflare · ✔ done

$ npx wrangler deploy --dry-run
--dry-run: exiting now.

$ pnpm test
Test Files  69 passed (69) · Tests  948 passed (948)

$ ./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/reg-tp.json --mode auto-cron
카탈로그 총 케이스: 7 · 기계 판정 가능: 7 (100% 자동화 진척도)
pass: 6 · fail: 0 · blocked: 1 (ao4 GITHUB_TOKEN 로컬 부재 · 정상)
exit_code = 0

$ GITHUB_TOKEN="dummy" GITHUB_REPOSITORY="CuriocityDevAi/test-portal" ./tools/regression-runner/bin/check-retires
SKIP · PR_NUMBER 부재 (schedule/dispatch · retires 검사 pull_request 전용)
```

### 2.2 실 CI 실측 (2회차 · rebase 후 · SHA `1266990`)

```
regression #34948463462 (pull_request event)
  matrix-run (test-portal)   = success
  matrix-run (todoboss)      = success
  retires-check              = success
  gate                       = skipped (check_run event 전용 · 정상)
  status                     = SUCCESS (전량 초록)

regression #34948645489 (workflow_dispatch · repo=test-portal · mode=auto-cron · C1 대체 확증)
  matrix-run (test-portal)   = success
  matrix-run (todoboss)      = success
  retires-check              = skipped (pull_request 전용 · 정상)
  gate                       = skipped
  status                     = SUCCESS (schedule 초록 대체 확증)
```

**실 schedule cron `0 15 * * *` UTC (KST 자정)** = 다음 라운드 회수 (Kyu 승인 C1 (가)).

### 2.3 PR#96 status rollup (실측)

```
Workers Builds: test-portal   = SUCCESS
matrix-run (test-portal)      = SUCCESS
matrix-run (todoboss)         = SUCCESS
retires-check                 = SUCCESS
gate                          = SKIPPED
```

**mergeStateStatus = UNSTABLE → MERGEABLE (rebase 후 회복 · CI 초록)**.

---

## 3. 파일 경계 준수 (K0/K1 침범 0 확증)

| 소유 | 파일 | K2 편집 |
|---|---|---|
| K2 | tools/regression-runner/{assertions,src,bin}/** | ✓ (al2 삭제 · ao4 fix · dispatch pre-flight · check-retires) |
| K2 | .github/workflows/regression.yml | ✓ (POST + retires-check job) |
| K2 | src/routes/api/{runs,gate,env/seed-reset}/** | ✓ (신설) |
| K2 | src/lib/server/runs/** | ✓ (신설 · 4 파일) |
| K2 | migrations/0006_test_runs.sql | ✓ (신설) |
| K2 | docs/testing/** | ✓ (4 문서 신설) |
| K2 | docs/SPEC.md · EPIC-STATE.md · docs/requirements-tracking.md | ✓ append (rebase 규약 정합) |
| K0 | src/routes/**(페이지) · src/lib/ui/** | ✗ 침범 0 (grep 확증) |
| K1 | src/routes/api/push/** · tools/kyu-bridge/** · .github/workflows/kyu-gate-auto-merge.yml · relay | ✗ 침범 0 |

---

## 4. Kyu 실기 항목 (배포 완료 후 · CLAUDE.md § 9.5 K38 정합)

**대기 항목** (PR body test-checklist 정본 · 8건):

1. `k2-0914-a-runner-green` — 로컬 러너 exit 0 확증 (K2 실측 · Kyu 재현)
2. `k2-0914-a-runs-post` — POST /api/runs (Bearer) 200 확증 (secret 편입 후 curl)
3. `k2-0914-a-runs-get` — GET /api/runs (Access) 200 확증
4. `k2-0914-a-gate` — GET /api/gate 3분기 확증
5. `k2-0914-a-seed-reset` — POST /api/env/seed-reset (empty) 확증
6. `k2-0914-a-seed-not-owned` — repo=grownest → 422 not_owned 확증
7. `k2-0914-a-workflow-dispatch` — workflow_dispatch auto-cron 초록 (K2 실측 완료 · run 34948645489)
8. `k2-0914-a-retires-check` — retires-check job OK (K2 실측 완료 · retires 필드 없음)

**#7 · #8 = K2 실측 완결** (재확증만) · **#1 = K2 실측 완결** · **#2~#6 = Kyu 클릭 (secret 편입 + wrangler d1 apply) 필요**.

---

## 5. Kyu 클릭 필요 (K2 실기 · secret 편입 + D1 apply)

### 5.1 Cloudflare (K2 직접 or Kyu)

```bash
# REG_INGEST_TOKEN 발급 (최소 16 byte)
openssl rand -base64 32   # 예시 · 이 값을 secret 로

# Workers secret 편입
npx wrangler versions secret put REG_INGEST_TOKEN

# migration 0006 적용
npx wrangler d1 migrations apply approvals-db --remote
```

### 5.2 GitHub (Kyu · Settings → Secrets and variables → Actions)

- **Variables**: `REG_API_BASE = https://test.curiocity.company`
- **Secrets**: `REG_INGEST_TOKEN` (Cloudflare secret 동값)

### 5.3 실기 curl (secret 편입 + PR merge 후)

```bash
# POST (Bearer)
curl -sS -X POST "https://test.curiocity.company/api/runs" \
  -H "Authorization: Bearer ${REG_INGEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"repo":"test-portal","suite":"regression","status":"pass","mode":"manual","duration_ms":1500,"fail_names":[]}'

# GET (Access · Kyu 브라우저 세션)
curl -sS "https://test.curiocity.company/api/runs?repo=test-portal&limit=5" \
  -H "Cf-Access-Jwt-Assertion: ${ACCESS_JWT}"

# Gate
curl -sS "https://test.curiocity.company/api/gate/CuriocityDevAi/test-portal/96" \
  -H "Cf-Access-Jwt-Assertion: ${ACCESS_JWT}"

# Seed empty
curl -sS -X POST "https://test.curiocity.company/api/env/seed-reset" \
  -H "Authorization: Bearer ${REG_INGEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"repo":"test-portal","seed_id":"empty"}'
```

---

## 6. 다음 라운드 인수인계

### 6.1 K1 라운드 발부 대상 (audit O4 완화)

- **파일**: `.github/workflows/kyu-gate-auto-merge.yml` (K1 소유)
- **작업**: `docs/testing/gate-contract.md § 3` 지시서 그대로 수행 (Gate API 호출 step 편입 · verdict != green 시 거부 · override:manual-approved label 예외)
- **효과**: matrix-run(test-portal) fail 상태로 auto-merge 성공 (audit O4) → 방지

### 6.2 각 허브 발부 대상 (seed-contract § 6)

- **N0 (grownest)** · **T0 (todoboss)** · **M0 (storeport)** = 각 리포 자체 /api/env/seed-reset 구현.
- **agilo-medusa-pos-fork** = Expo 배관 (K1-0914-A A3) 안정화 후 승격.

### 6.3 K2 다음 라운드 대상 (audit O5-O10)

- **O5**: agilo/todoboss REG 인프라 확장 (각 리포 assertion 확장)
- **O7**: 야간 실패 알림 (relay push · K48/K49 secrets 편입)
- **O8**: agilo 자동 회귀 인프라 (Expo 배관 후)
- **O9**: storeport nightly-commerce-core-smoke REG matrix 편입
- **O10**: test-portal stale-deferred workflow 신설
- **실 schedule cron 회수**: 다음 KST 자정 실행 이력 실측

---

## 7. CYCLE v1.2 준수 요약

- **§ ②** 에픽 경계 큐/EPIC/SPEC 게시 = ✓ (심문 문서 § ②)
- **§ ③** 심문 (a/b/c/d) 게시 = ✓ (relay k2/K2-0914-A-inquiry.md · Kyu 회신 회수 후 삭제 · README § 청소 규약)
- **§ ④** Kyu 회신 → 즉시 실행 = ✓ (전 K2 권고 채택 · 오케 전결)
- **§ ⑤** 결함 처리 루프 = **불요** (자기 검증 통과 · CI 전량 초록)
- **DF-H count** = 0 (심문 게이트 준수 · 큐/스펙 대조 · 파일 경계 준수 · 역제안 3건 능동 게시)

---

*K2-0914-A · 부트스트랩 완결 · 2026-09-15*

---

## § C · K2-0914-C 마감 (Kyu 클릭 0 · K2 직접 실행 · 2026-09-15)

**라운드**: K2-0914-C (마감 · A 라운드 인수 완결). 코드 변경 = **1건 (K0 al1 unblock · 3줄)** 외 zero.

### C.1 충돌 해소 (요구 § 1)

- `git fetch origin` → PR#95 (K0-AW · commit `543db7a`) + PR#97 (K1-0915-A · commit `f91fcb3`) main 반영 확증.
- `git merge origin/main` → EPIC-STATE.md 충돌 → **K0/K1/K2 3항목 병존** (K0/K1 항목 삭제 없음 · Kyu 요구 정합).
- SPEC / requirements-tracking auto-merge 성공 (충돌 마커 0).
- push (`9e2950f`) → `gh pr view 96 --json mergeable` = **MERGEABLE** 회복.

### C.2 K0 al1 unblock (파일 경계 minimum 위배 · 명시)

**뿌리**: K0-AW (PR#95 · `543db7a`) 편입 시 `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:3316-3320` 안 raw hex `#8250df` 3줄 등장. `al1-token-no-raw-hex` 어설션 (K2 소유) fail. 회귀 뿌리 = K0 파일이지만 K2 마감 blocking.

**해소**: 3줄 → `var(--hold)` (기존 semantic var `--primer-purple-500` alias · 동일 값). commit `dffa872` · prefix `fix(k0-al1)` · body 안 파일 경계 위배 이유 명시. K0 라운드에 raw hex 재도입 방지 lint 강화 회부.

### C.3 secret + D1 K2 직접 편입 (요구 § 2)

**Cloudflare (wrangler OAuth `l.youngkyu@gmail.com`)**:

- `openssl rand -base64 48` → 48 byte token (값 미기재 · 리포트 규약).
- `npx wrangler versions secret put REG_INGEST_TOKEN` → **version `50863e0c` 생성** (secret 편입) · auto-deploy 다음 배포 시 자동 상속 (CLAUDE.md § 5.11 정합).
- `npx wrangler d1 migrations apply approvals-db --remote` → **`0006_test_runs.sql = ✅`** 원격 반영 (before: `🕒` 대기, after: `✅` 적용).

**GitHub (gh CLI `CuriocityDevAi`)**:

- `gh variable set REG_API_BASE --body "https://test.curiocity.company"` → 편입 확증 (`gh variable list` 표시).
- `gh secret set REG_INGEST_TOKEN --body "$(cat /tmp/reg-ingest-token)"` → 편입 확증 (`gh secret list` 표시).

**Kyu 클릭 = 0**.

### C.4 curl 5 실측 (요구 § 3 · localhost 8794 wrangler dev --remote 프록시 소비)

**전제**: 프로덕션 `test.curiocity.company` = Cloudflare Access 로그인 게이트 (모든 요청 302 redirect). K1 `/api/push/notify` webhook 도 동일 302 (relay Action 실측 = fallback 삼킴). **Access 우회 = 별건 Kyu 클릭** (Access 서비스 토큰 or bypass 정책). 이번 라운드 = wrangler dev --remote (로컬 프록시 · 원격 D1 소비 · 원격 secret 접근) 로 배포된 코드 실측.

**주소**: `http://localhost:8794` (wrangler dev · Version `b5a00346` = merge 후 자동 배포 코드).

| # | 요청 | HTTP | 응답 정합 |
|---|---|---|---|
| 1 | POST /api/runs (Bearer valid) | **200** | `{ok:true, run:{run_id, repo, pr_number:96, sha:"k2-0914-c-curl-1", suite:"regression", status:"pass", ...}}` |
| 2 | GET /api/runs?repo=test-portal&pr=96 (no JWT) | **401** | `{error:"missing_header", message:"Cf-Access-Jwt-Assertion header absent"}` **정본 · Access-gated** (production edge auto-inject) |
| 3 | GET /api/gate/CuriocityDevAi/test-portal/96 (no JWT) | **401** | `{error:"missing_header"}` 정본 · Access-gated 정합 |
| 4 | POST /api/env/seed-reset (Bearer · empty) | **200** | `{ok:true, snapshot_id:"empty-...", rows_affected:1, note:"test_runs (repo=test-portal) 만 삭제 ..."}` |
| 5 | POST /api/env/seed-reset (Bearer · grownest) | **422** | `{error:"not_owned", message:"repo=grownest 시드는 이 포털이 담당 안 함 ...", contract_ref:"docs/testing/seed-contract.md"}` |

**보너스 확증 (Bearer edge)**:
- POST /api/env/seed-reset (Bearer · sample-pr) = **200 · rows_affected:3** (샘플 fixture 3건 편입 확증)
- POST /api/runs (Bearer 잘못) = **401 token_mismatch** (Web Crypto constant-time 정합)
- POST /api/runs (Bearer 부재) = **401 bearer_missing** (헤더 검증 정합)

**결론**: 8건 전량 정합 (5 요구 + 3 보너스). Access-gated GET 은 401 정본 · production Access edge 안 Cf-Access-Jwt-Assertion 자동 주입 시 200 예상.

### C.5 workflow_dispatch auto-cron (main 반영 후)

- **run**: https://github.com/CuriocityDevAi/test-portal/actions/runs/34977186198
- **event**: workflow_dispatch · **repo=test-portal · mode=auto-cron**
- **branch**: **main** (K2 코드 반영 후)
- **jobs**: `matrix-run(test-portal) = success · matrix-run(todoboss) = success · gate=skipped · retires-check=skipped`
- **status**: **SUCCESS** (전량 초록 · schedule 대체 확증 완결).

**실 schedule cron `0 15 * * *` UTC (KST 자정)** = 다음 라운드 회수 (Kyu 승인 C1 (가) 정합).

### C.6 PR#96 착지

- **merge commit**: `feedf533ecc69828deb28adc25afe152a9bdfd29`
- **mergedAt**: 2026-09-15T13:40:05Z
- **state**: MERGED · squash · delete-branch
- **statusCheckRollup (merge 시점)**: matrix-run(test-portal · todoboss) + retires-check + Workers Builds = **전량 SUCCESS**

### C.7 Access 우회 별건 (K1 병행 문제 발견)

**관측**: K1 `/api/push/notify` webhook (relay build-index Action) = 매 실행마다 302 Found (Access 로그인 페이지). K1 curl `|| echo "webhook failed · non-blocking"` fallback 이 삼킴. **웹 푸시 실 발송 = 현재 프로덕션 미동작** (Access 우회 없음).

**K2-0914-C 로 인수 안 함** (K1 소유 · 파일 경계 정합). **다음 라운드 K1 회부 대상** = Access "Service Auth" 정책 편입 (webhook path bypass · Kyu 클릭 필요) · 또는 K2 `/api/runs`/`/api/env/seed-reset` 동일 정책 편입 검토.

### C.8 다음 라운드 인수인계 (갱신)

1. **K1 회부**: `/api/push/notify` + `/api/runs` + `/api/env/seed-reset` = Access webhook bypass 정책 편입 (Kyu 대시보드 Access → Bypass policy · path pattern).
2. **K1 auto-merge Gate API 통합**: `docs/testing/gate-contract.md § 3` 지시서 (audit O4 완화).
3. **각 허브 seed 자기 구현**: N0 · T0 · M0 발부.
4. **K0 라운드**: raw hex 회귀 방지 lint 강화 (al1 어설션 뿌리 회수 · K2가 대신 3줄 fix한 이력 청산).
5. **K2 다음 라운드**: audit O5-O10 후속 + 실 schedule cron 회수 (KST 자정 1건 이력).

---

## § D · CYCLE v1.2 재준수 요약 (C 라운드)

- **§ ②** 큐/EPIC/SPEC 게시 = ✓ (rebase 후 재확증 · 3항목 병존)
- **§ ③** 심문 = **불요** (A 라운드 심문 소비 · C 는 마감 실행 라운드 · Kyu 요구 명료)
- **§ ④** Kyu 요구 즉시 실행 = ✓ (secret · D1 · gh 편입 · curl 5 실측)
- **§ ⑤** 결함 처리 루프 = ✓ (K0 al1 3줄 unblock · 파일 경계 minimum 위배 명시)
- **DF-H count** = 0 (파일 경계 위배 = 사전 명시 + 정당화 · 임의 처리 아님)

*K2-0914-C · 마감 완결 · 2026-09-15*
