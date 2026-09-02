# K1-0902-B · REG δ MVP 착지 리포트

**허브**: K1 (test-portal · feat/k1-0902-regression 워크트리 · `/Users/kyu.lee/projects/test-portal-k1`)
**라운드**: K1-0902-B · 구현 라운드 (A 조사·설계 후속)
**성격**: **회귀 러너 인프라 δ MVP 착지 · Kyu 실기 대기**
**날짜**: 2026-09-02
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/81
**Commit**: `c970827` (main 진입 대상)

---

## 0. TL;DR

- Kyu Q1~Q7 판정 전량 채택 · 인프라 6종 착지 (migration · 저장소 · API · CLI · CI · 승격 훅).
- **어설션 부재 = skip · CI 빨간불 방지** (B-2 정본 · 자동화 진척도 표기).
- **B-3 self-test 실증**: 샘플 어설션 (`migration-case-state-pk-preserved.mjs`) 로 pass 경로 (exit 0) · fail 경로 (exit 1) · skip 경로 (exit 0) 3종 확증.
- **폐기**: `regression-store.ts` · `regression-types.ts` · `regression-store.test.ts` (K0-0806-A γ MVP · dry-run 봉인 · 소비자 부재 · Q1 판정).
- **검증**: `pnpm test` 811/811 pass (baseline 787 + 24 신규) · `pnpm check` 0 err · `wrangler d1 migrations apply --local` ✅ 2개.
- **K0 회부**: 화면 배선 4건 (report § 4).

---

## 1. Kyu Q1~Q7 판정 채택 결과

| Q | 판정 | 착지 파일 |
|---|------|-----------|
| Q1 저장소 | (a) D1 신 테이블 2개 | `migrations/0003_case_catalog.sql` · `migrations/0004_case_run.sql` |
| Q2 승격 | (a) 자동 + (c) 아카이브 병행 | `/api/kyu-gate-stamp` 서버 훅 · `/api/case-catalog?action=archive` |
| Q3 시점 | (b) 머지 前 게이트 + nightly | `.github/workflows/regression.yml` |
| Q4 area | (a) MVP 부재 · 전 실행 | `listCatalog(repo, 'active')` 전량 |
| Q5 Playwright | (a) 별건 [PLAN-OSS] | 러너 = vitest + fetch + fs (deps 0) |
| Q6 실행 위치 | (a) GitHub Actions + (b) CLI 로컬 실행 필수 | `tools/regression-runner/bin/regression-runner` · README 로컬 재현 |
| Q7 todoboss | 인프라 먼저 · assertion = K1-0902-C | 인프라만 착지 · 어설션 = 다음 라운드 |

## 2. 기존 파일 처리 결론 (Q1 후속)

Kyu 판정: "기존 파일을 어떻게 처리할지 결론을 내고 보고하라".

**폐기**:
- `src/lib/regression-types.ts` (K0-0806-A γ MVP · 스키마만 · 소비자 부재 · grep 0 hit)
- `src/lib/regression-store.ts` (STORE_MODE='dry-run' 봉인 · GitHub Contents API 안 Kyu 폐기)
- `src/lib/regression-store.test.ts` (dry-run 봉인 테스트)

**근거**: 지속되면 죽은 코드 오해 (다음 라운드 K1 · K0 인수 시). git log 가 아카이브. 신 저장소 (`case-catalog-store.ts` · `case-run-store.ts`) 가 실질 정본. 유용 필드 (req_round_id · area · tags 관행) 는 신 카탈로그 스키마 흡수 (title/description/deep_link · first_pr · first_passed_at · promoted_by · status).

## 3. 착지 파일 · 실측

**신설 · 23 파일 · +3,043 LOC · -359 LOC (폐기)**:

| 층 | 파일 | LOC |
|----|------|-----|
| Migration | `migrations/0003_case_catalog.sql` | 34 |
| Migration | `migrations/0004_case_run.sql` | 31 |
| Store | `src/lib/case-catalog-store.ts` | 221 |
| Store 테스트 | `src/lib/case-catalog-store.test.ts` (11 tests · MockD1) | 269 |
| Store | `src/lib/case-run-store.ts` | 228 |
| Store 테스트 | `src/lib/case-run-store.test.ts` (7 tests · catalog+run 조인) | 343 |
| API | `src/routes/api/case-catalog/+server.ts` (GET/POST) | 102 |
| API | `src/routes/api/case-run/+server.ts` (GET/POST) | 148 |
| CLI shim | `tools/regression-runner/bin/regression-runner` | 5 |
| CLI | `tools/regression-runner/src/index.mjs` | 199 |
| CLI | `tools/regression-runner/src/dispatch.mjs` | 139 |
| CLI | `tools/regression-runner/src/report.mjs` | 115 |
| 샘플 어설션 | `tools/regression-runner/assertions/test-portal/migration-case-state-pk-preserved.mjs` | 80 |
| 러너 self-test | `tools/regression-runner/test/dispatch.test.mjs` (19 tests) | 246 |
| README | `tools/regression-runner/README.md` | 148 |
| CI | `.github/workflows/regression.yml` | 131 |
| PLAN | `docs/plans/PLAN-K1-regression-runner.md` (A+B 통합 · § B.4 K0 회부) | 560 |

**편집 · 최소**:
- `src/routes/api/kyu-gate-stamp/+server.ts` = 승격 훅 삽입 (+32 LOC · `cases_snapshot` 소비 · `promoted` count 응답 · promote 실패 = 비블로킹 warn)
- `docs/requirements-tracking.md` = K47 entry + K1-0902-B 이연 순증감 (+12 LOC)
- `EPIC-STATE.md` = REG 라인 갱신 (δ MVP 착지 표기)

**삭제**:
- `src/lib/regression-store.ts` (-107 LOC)
- `src/lib/regression-store.test.ts` (-114 LOC)
- `src/lib/regression-types.ts` (-136 LOC)

## 4. K0 회부 · 화면 배선 4건 (self-contained · K0 프롬프트에 그대로 옮기기)

> **K0 프롬프트 시작 →**
>
> K1-0902-B 착지분 (D1 · API · 러너 · CI · 승격 훅) 은 저장소·API 계층까지 완결. 이제 UI 표출이 필요하다. 아래 4 지점을 K0 다음 라운드 (AE 후속 또는 AF) 에 편입해라. 상세 정본 = `docs/plans/PLAN-K1-regression-runner.md § B.4`.
>
> **1. `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` → `/api/kyu-gate-stamp` POST body 에 `cases_snapshot` 필드 편입**
> - 현재 body (K0-0902-AD-3): `{ repo, pr_id, head_sha, terminal_prefix, pr_title, kyu_gate, summary }`
> - 편입: `cases_snapshot: parsedCases.map(c => ({ id, title, description, deep_link }))`
> - 서버 (K1 착지 `src/routes/api/kyu-gate-stamp/+server.ts:132-158`) 가 kyu_gate='pass' 시 이 배열을 소비 · `case_catalog` UPSERT · 응답 `promoted` 필드 (승격 케이스 수) 반환.
> - **미배선 시**: `promoted: 0` (승격 skip · 도장은 여전히 성공).
>
> **2. `src/lib/PrList.svelte` · 카드 배지 확장 · 회귀 결과 병기 (기 case_state summary 옆)**
> - 소비: `GET /api/case-run?repo=<slug>&pr_number=<n>&summary=1`
> - 응답: `{ repo, pr_number, summary: { pass_count, fail_count, blocked_count, total } }`
> - 표기안: `[자동 회귀: 12✓ / 2✗]` (case_state 진행도 옆 · 색 규약 K0 정합)
>
> **3. `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` · "회귀" 섹션 신설** (기 case_state 탭 판정 섹션 근처)
> - 소비 A: `GET /api/case-catalog?repo=<slug>&status=active` = 활성 카탈로그 리스트
> - 소비 B: `GET /api/case-run?repo=<slug>&case_id=<id>&limit=5` = 케이스 별 최근 5 이력
> - UX: 각 카탈로그 항목 옆 `[아카이브]` 버튼 → `POST /api/case-catalog?action=archive` (Kyu Q2(c) · 나쁜 케이스 격리)
>
> **4. 홈 신설 route · `/regression` 실패 뷰** (K37 계열 · Kyu K0-0728-M 보류 승인 시)
> - 소비: `GET /api/case-run?repo=<slug>&failures=1&limit=100`
> - K37 (`docs/plans/PLAN-case-accumulation-management.md`) 뷰 스위처 정합 · Kyu 별건 판정 후
>
> **편집 금지 지점** (K1 소관 완결):
> - `src/lib/case-catalog-store.ts` · `src/lib/case-run-store.ts` (저장소)
> - `src/routes/api/case-catalog/+server.ts` · `src/routes/api/case-run/+server.ts` (API 계약)
> - `.github/workflows/regression.yml` (CI)
>
> **→ K0 프롬프트 끝**

## 5. B-2 어설션 부재 정본 · 실증

**정본 (Kyu B-2)**:
- 어설션 파일이 없는 케이스 = **기계 판정 불가 · skip · fail 아님**
- 자동화 진척도 = mechanical_capable / total_catalog 표기
- 전건 어설션 부재여도 exit 0 (CI 빨간불 방지)

**실증 (러너 실 실행 · K1 실측)**:

```
$ echo '{"entries":[{"case_id":"unknown-1"},{"case_id":"unknown-2"}]}' > /tmp/empty.json
$ ./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/empty.json
카탈로그 총 케이스: 2
기계 판정 가능      : 0 (0% 자동화 진척도)
기계 판정 불가      : 2  ← 어설션 파일 부재 · skip
pass    : 0
fail    : 0
exit_code = 0
```

## 6. B-3 self-test 실증 · pass · fail · skip 3종

**대상**: `tools/regression-runner/assertions/test-portal/migration-case-state-pk-preserved.mjs`
- 검사: `migrations/0002_case_state.sql` PK `(repo, pr_id, case_id)` + `status CHECK ('pass','fail')` + `decided_at·decided_by NOT NULL`
- 뿌리: K0-0902-AD-3 Kyu 판정 (Kyu 도장 근거) 계약 · 깨지면 저장·조회 흐름 오염

**pass 경로**:
```
$ echo '{"entries":[{"case_id":"migration-case-state-pk-preserved"}]}' > /tmp/reg-catalog.json
$ ./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/reg-catalog.json
[migration-case-state-pk-preserved] OK · PK · CHECK · NOT NULL 3종 정합
카탈로그 총 케이스: 1
기계 판정 가능      : 1 (100% 자동화 진척도)
pass: 1 · fail: 0 · exit_code = 0
```

**fail 경로**:
```
$ REG_SELF_TEST_FORCE_FAIL=1 ./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/reg-catalog.json
migration-case-state-pk-preserved    │ fail  · reason='forced fail (REG_SELF_TEST_FORCE_FAIL=1) · 러너 fail 경로 검증'
pass: 0 · fail: 1 · exit_code = 1
$ echo $?
1
```

## 7. 검증 실측

```
$ pnpm test
Test Files  62 passed (62)
     Tests  811 passed (811)
Duration    11.72s

$ pnpm check
COMPLETED 984 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS

$ npx wrangler d1 migrations apply approvals-db --local
│ 0003_case_catalog.sql │ ✅     │
│ 0004_case_run.sql     │ ✅     │
🚣 4 commands executed successfully.

$ npx wrangler d1 execute approvals-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"
[case_catalog, case_run, case_state, approvals, d1_migrations, sqlite_sequence]
```

증분:
- baseline: 787 tests / 979 files
- B 후: 811 tests / 984 files
- **24 신규 tests** (case-catalog-store 11 + case-run-store 7 + runner 19 - 삭제 regression-store 13 = +24)

## 8. Kyu 실기 절차 (self-contained · 배포 완료 후)

**전제**: PR #81 merge → Cloudflare Workers Builds auto-deploy (1-3분 · CLAUDE.md § 9.5)

### 8.1 D1 원격 migration (Kyu 클릭 · 한 번만)

```bash
cd /Users/kyu.lee/projects/test-portal
export PATH="/Users/kyu.lee/.nvm/versions/node/v22.23.1/bin:$PATH"
git pull
npx wrangler d1 migrations apply approvals-db --remote
# → 0003_case_catalog.sql · 0004_case_run.sql · ✅ 2개
```

### 8.2 러너 로컬 재현 · pass (Q6 정본)

```bash
cd /Users/kyu.lee/projects/test-portal-k1
export PATH="/Users/kyu.lee/.nvm/versions/node/v22.23.1/bin:$PATH"
cat > /tmp/reg-catalog.json <<'EOF'
{ "entries": [
  { "case_id": "migration-case-state-pk-preserved" },
  { "case_id": "some-manual-only-case" }
] }
EOF
./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/reg-catalog.json
```

**정상 출력**: `자동화 진척도 50%` · `pass: 1 · fail: 0` · `exit_code = 0`.

### 8.3 러너 로컬 재현 · fail (B-3 fail 확증)

```bash
REG_SELF_TEST_FORCE_FAIL=1 ./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/reg-catalog.json
echo "exit=$?"
```

**정상 출력**: `verdict=fail` · `reason='forced fail...'` · `exit=1`.

### 8.4 어설션 부재 skip (B-2 CI 빨간불 방지)

```bash
echo '{"entries":[{"case_id":"unknown-1"},{"case_id":"unknown-2"}]}' > /tmp/empty.json
./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/empty.json
echo "exit=$?"
```

**정상 출력**: `자동화 진척도 0%` · `기계 판정 불가: 2` · `exit=0`.

### 8.5 실 API 소비 (배포 후 · Access JWT · 옵션)

- Chrome devtools 로 https://test.curiocity.company 요청 헤더 `Cf-Access-Jwt-Assertion` 값 복사

```bash
export REG_ACCESS_TOKEN='<위 JWT>'
./tools/regression-runner/bin/regression-runner \
  --repo test-portal \
  --mode manual \
  --api-base https://test.curiocity.company \
  --auth-token "$REG_ACCESS_TOKEN"
```

**정상 출력** (착지 초기 · 카탈로그 비어있음 예상): `카탈로그 총 케이스: 0` · `exit_code = 0`. 카탈로그 채워지는 시점 = K0 화면 배선 (§ 4) 착지 후 kyu-gate 도장 시.

## 9. 다음 라운드 · K1-0902-C (예정)

- todoboss 근태 assertion 실 작성 (Q7 회수) — 근태 회귀 재발 방지 정본
- (조건부) area 매핑 도입 판정 — 카탈로그 규모 도달 시
- (조건부) Playwright 도입 [PLAN-OSS] — 별건 라운드

## 10. Kyu 질문 (self-contained · relay 회신 근거)

**Q-B1 · § 4 K0 회부 형식**: 화면 배선 4건을 K0 프롬프트 그대로 옮기는 문안 (§ 4 인용부) 이 오케 규약 정합인가 · 형식 조정이 필요한가.

**Q-B2 · Kyu Actions vars/secrets 편입 시점**: § B.6 K47-6 = `vars.REG_API_BASE` + `secrets.REG_ACCESS_TOKEN` Kyu 클릭 · § B.7 D1 원격 migration 과 함께 지금 편입할지 · K1-0902-C (실 assertion 편입) 라운드까지 대기할지. **K1 권고 = 지금 편입** (미설정 = warning + skip 이므로 안전 · assertion 편입 후 즉시 실동 개시).

**Q-B3 · 승격 훅 K0 client 배선 우선순위**: `cases_snapshot` 편입 (§ 4 -1) 시점. **K1 권고 = K0 다음 sub-Phase 우선** (자동 승격 정본이 안 되면 카탈로그 손 채워야 함 · K1 러너 실효 지연).

**Q-B4 · SPEC § 17 갱신**: 로드맵 → δ MVP 진입 · SPEC 문언 확장 (설계 라운드 완결 표기) 필요한가. **K1 권고 = 다음 K0 라운드 편입** (K0 소관 · SPEC 정본 갱신자).

---

## 11. 리포트 규약 정합

- ✅ 커밋 완결 (c970827) · PR 개설 완료 (#81)
- ✅ 경계 규칙 준수: 화면 파일·컴포넌트 무변경 · 라우트는 신설만 (Kyu 명시) + 기존 route 최소 편집 (kyu-gate-stamp 승격 훅)
- ✅ 브랜치 무변경 · main 체크아웃 없음
- ✅ K0 (AE) 병렬 안전: 편집한 route (`/api/kyu-gate-stamp`) 는 K0 AE 스코프와 무관 판단 (K0 AE = UI 배선 예정)
- ✅ D1 migration 로컬 apply 실측 · 원격 apply 명령 절 포함 (§ 8.1)
- ✅ 러너 로컬 실행 명령 · 정상 출력 self-contained (§ 8.2~8.4)
- ✅ B-2 (어설션 부재 skip) · B-3 (self-test) 실증 명기
- ✅ Kyu 질문 4건 (§ 10) · relay 열람만으로 판정 가능

---

*K1-0902-B · 2026-09-02 · REG δ MVP 착지 · PR #81 · commit c970827 · 811/811 tests · check 0 · D1 local ✅*
