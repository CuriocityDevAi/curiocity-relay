---
round: K2-0915-A
pr: https://github.com/CuriocityDevAi/test-portal/pull/101
outcome: 착지 · CI 전량 초록 · migration 0007 원격 반영 · workflow_dispatch auto-cron 대체 확증 · schedule 실 fire 회수 = 다음 라운드
kyu_checks: 1 (PUSH_WEBHOOK_TOKEN GitHub secret 값 편입 · K1 회부)
df_h_count: 0
---

# K2-0915-A · 리포트 (schedule 야간 알림 + REQ 매핑 + flaky + required registry 파생)

**허브**: K2 (테스트 체계 알바 · A/C 마감 후 확장)
**브랜치**: `feat/k2-0915-a` · SHA `73ad787`
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/101
**CYCLE**: v1.2 § ①~⑤ 완결 · 심문 게시 → Kyu 회신 (오케 전결) → 즉시 구현 → 리포트 정지.

---

## 1. 착지 요지 (4 요구항 소화)

### (1) 실 schedule 회수 (Q-a1 (나) · Kyu 승인)

- **workflow_dispatch mode=auto-cron 대체 실측** = run `34988321178` = **전량 SUCCESS** (matrix-run test-portal · todoboss).
- **실 schedule cron `0 15 * * *` UTC** 이력 회수 = **다음 라운드** (자정까지 라운드 세우지 않음 · Kyu 원문 정합).
- **schedule-notify job 신설**: `regression.yml` 안 `schedule` event AND `matrix-run` failure → K1 `/api/push/notify` webhook 호출.
  - payload = `{event:"regression.schedule.failed", source:"k2-schedule", title, body, url}`.
  - 인증 = `Authorization: Bearer ${PUSH_WEBHOOK_TOKEN}` (GitHub secret).
  - 미편입 시 skip (fail-open · 방어적).

### (2) REQ ↔ 테스트 매핑 3축 (Q-a3/a4/a5)

- **traceability.md 신설** (전 허브 적용 규약 · docs/testing/traceability.md).
- **3축**:
  1. PR body test-checklist `req: [K#]` 배열 (옵셔널)
  2. 어설션 CASE_META `req_id: [K#]` 배열 (옵셔널 · seed-catalog-tmp --print-json 자동 노출)
  3. tracking 원장 `docs/tracking/<hub>.md` "테스트" 칸
- **check-req 스크립트** (`bin/check-req`) + **`req-check` job** (regression.yml · pull_request 전용 · `continue-on-error: true`).
- 경고 규칙 3종 = (a) req 부재, (b) 어설션만 매핑, (c) PR 만 매핑.
- 이번 라운드 편입 예 = `ao4-pr-body-checklist req_id=[K95]` · `al1-token-no-raw-hex req_id=[K91]`.
- **tracking 원장** = **`docs/tracking/k2.md` 신설** (Kyu B2 정합 · #99 재편 후 hub 별 파일 정본 · K80~K99 K2 range).

### (3) flaky 표시 (Q-a6 (가) + C1 저장)

- **migrations/0007_test_runs_flaky.sql** = `test_runs.flaky INTEGER default 0`.
- **판정 시점**: POST `/api/runs` 안 동일 `(repo, sha, suite)` 이전 run 최근 5개 조회 · status 다르면 이번 + 이전 모두 `flaky=1` UPDATE.
- sha 부재 (schedule/manual on main) = 판정 skip.
- **응답**: GET `/api/runs` = 각 run에 `flaky: boolean` 필드 편입.
- `test-runs-store.ts` · `runs-api.md` 갱신.

### (4) gate required registry 파생 (B1 승인 · 하드코딩 제거)

- **config/projects.json v5** = 각 프로젝트 `required_checks: string[]` 필드 (K2 최소 편집 · commit prefix `chore(config-schema)`).
- **`registry.requiredChecksFor(project)`** 파생 · 부재 시 fallback `['kyu-gate', 'matrix-run (${slug})']`.
- **gate.ts `REQUIRED_CHECK_NAMES` deprecated** (하위 호환용).
- **`/api/gate` 응답 확장** = `required: string[]` · `repo: slug` 신 필드 (K0 소비 정합).
- **현행 값**:
  - test-portal = `["kyu-gate", "matrix-run (test-portal)", "matrix-run (todoboss)"]`
  - todoboss = `["kyu-gate", "matrix-run (todoboss)"]`
  - grownest / storeport = `["kyu-gate"]` (REG 어설션 부재 · 다음 라운드)
  - agilo = `[]` (자동 회귀 인프라 대기 · audit O8)

---

## 2. 자기 검증 실측

### 2.1 로컬

```
$ pnpm check
1789485665038 COMPLETED 1042 FILES 0 ERRORS 57 WARNINGS 1 FILES_WITH_PROBLEMS
  (경고 = 기존 K0 unused-css · K2 무관)

$ pnpm test
Test Files  74 passed (74) · Tests  987 passed (987)

$ pnpm build
Using @sveltejs/adapter-cloudflare · ✔ done

$ npx wrangler deploy --dry-run
--dry-run: exiting now.

$ ./tools/regression-runner/bin/seed-catalog-tmp --repo test-portal --print-json | jq '.entries[] | select(.req_id | length > 0)'
{ "case_id": "al1-token-no-raw-hex", ..., "req_id": ["K91"] }
{ "case_id": "ao4-pr-body-checklist", ..., "req_id": ["K95"] }

$ ./tools/regression-runner/bin/regression-runner --repo test-portal --mode auto-cron
pass: 6 · fail: 0 · blocked: 1 (ao4 로컬 GITHUB_TOKEN 부재 정상) · exit_code = 0
```

### 2.2 원격 D1 migration

```
$ npx wrangler d1 migrations apply approvals-db --remote
┌──────────────────────────┬────────┐
│ 0007_test_runs_flaky.sql │ ✅     │
└──────────────────────────┴────────┘
```

### 2.3 CI 실 실행 (PR#101)

**pull_request run #34988219535**:
- matrix-run (test-portal) = ✅ success
- matrix-run (todoboss) = ✅ success
- retires-check = ✅ success
- **req-check = ✅ success** (continue-on-error · 경고 발생 시에도 초록)
- gate = ⏭ skipped (check_run event 전용)
- schedule-notify = ⏭ skipped (schedule event 전용)

**workflow_dispatch auto-cron run #34988321178** (schedule 대체 확증):
- matrix-run (test-portal) = ✅ success
- matrix-run (todoboss) = ✅ success
- 기타 job = ⏭ skipped (auto-cron 정합)

---

## 3. 파일 경계 준수 (K0/K1 침범 0)

| 소유 | 파일 | K2 편집 |
|---|---|---|
| K2 | tools/regression-runner/{bin,assertions,src}/** | ✓ (check-req 신설 · seed-catalog req_id · ao4/al1 CASE_META) |
| K2 | .github/workflows/regression.yml | ✓ (req-check + schedule-notify job) |
| K2 | src/routes/api/{runs,gate}/** · src/lib/server/runs/** | ✓ (flaky · required 파생 · response 확장) |
| K2 | migrations/0007_test_runs_flaky.sql | ✓ (신설) |
| K2 | docs/testing/{README,traceability,runs-api,gate-contract}.md | ✓ (신설/확장) |
| K2 | docs/state/k2.md · docs/tracking/k2.md | ✓ (자기 파일) |
| **공유 (K2 최소)** | config/projects.json | ✓ v4→v5 · required_checks[] 5 프로젝트 · commit `chore(config-schema)` · K0 스키마 합의 |
| **공유 (append)** | docs/SPEC.md | ✓ § 24.9~24.13 append |
| K0 | src/routes/** 페이지 · src/lib/ui/** | ✗ 침범 0 |
| K1 | src/routes/api/push/** · tools/kyu-bridge/** · .github/workflows/kyu-gate-auto-merge.yml · relay | ✗ 침범 0 |
| **타 허브 tracking** | docs/tracking/k0.md · docs/state/{k0,k1}.md · requirements-tracking.md | ✗ **침범 0** (Kyu B2 정합 · shared-docs) |

---

## 4. Kyu 실기 (kyu_checks = 1) · K1 회부

### 4.1 `PUSH_WEBHOOK_TOKEN` GitHub secret 값 편입 (K1 회부)

**뿌리**: Kyu 원문 = "값은 K1 Workers secret과 동일 · K1 편집 0". K2 는 K1 Workers secret 값을 조회할 수 없음 (wrangler write-only). 두 원칙 상충.

**K2 처리**: GitHub secret slot 미편입 · schedule-notify job = 값 부재 시 skip (fail-open · warning 로그).

**해소**: **K1 다음 라운드** = K1이 값을 test-portal 리포 GitHub secret `PUSH_WEBHOOK_TOKEN` 편입 (`gh secret set --repo CuriocityDevAi/test-portal`). K1 Workers secret 값과 동일. K1 파일 편집 없음 · secret 은 파일 아님.

**대안** (Kyu 판정 시): K2가 값을 새로 생성 → K1 Workers secret rotation + GitHub secret 편입 (K1 코드 편집 0). Kyu 승인 시 다음 라운드 편입.

**영향**: schedule-notify job = 다음 야간 KST 자정 실 fire 시 상태 = (a) matrix 초록 → skip (정상), (b) matrix 빨강 → PUSH_WEBHOOK_TOKEN 미편입으로 skip (warning). K1 편입 완결까지 실 알림 미발송.

---

## 5. 다음 라운드 인수인계

### 5.1 K2 다음 라운드

- **schedule 실 fire 회수**: 다음 KST 자정 이력 실측 · schedule-notify job (편입 후) 실동 확증.
- **req 강제화 검토**: 이번 = 옵셔널 (경고만). 다음 = 신규 어설션·PR body에 req 필수화 정본.
- **flaky UI 노출**: K0 상세 화면 안 flaky 뱃지 (K0 발부).
- **audit O5**: 각 리포 assertion 확장 (todoboss 이외).
- **audit O10**: test-portal stale-deferred workflow.

### 5.2 K1 회부

- `PUSH_WEBHOOK_TOKEN` GitHub secret 값 편입 (§ 4.1).
- Access bypass 정책 (K2-0914-C § C.7 · 프로덕션 push 실 발송 확증).

### 5.3 K0 회부

- `/api/gate` 응답 `required: string[]` · `repo: slug` 필드 소비 (K2-0915-B 확장).
- flaky 뱃지 (`/api/runs` 응답 `flaky: boolean`).
- (선택) PR body test-checklist `req:` 필드 자동 편입 (bot).

### 5.4 각 허브 회부 (traceability 규약 적용)

- N0/T0/M0 = 각 리포 PR body test-checklist `req: [K#]` 편입.
- 각 허브 어설션 신설 시 CASE_META `req_id: [K#]` 편입.
- 각 허브 tracking `docs/tracking/<hub>.md` "테스트" 칸 유지.

---

## 6. CYCLE v1.2 준수

- **§ ②** 큐/EPIC/SPEC 게시 = ✓ (심문 § ②)
- **§ ③** 심문 (a/b/c/d) 게시 = ✓ (K2-0915-A-inquiry.md · Kyu 회신 후 삭제 · README 청소 규약 정합)
- **§ ④** Kyu 회신 → 즉시 실행 = ✓ (오케 전결 · 전 권고 채택 · B2만 정합 변경 반영)
- **§ ⑤** 결함 처리 루프 = **불요** (CI 전량 초록)
- **DF-H count** = 0

*K2-0915-A · 착지 · 2026-09-15*
