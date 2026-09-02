# K1-0902-A · 회귀 러너 A-1 조사 + A-2 설계안 리포트

**허브**: K1 (test-portal · feat/k1-0902-regression 워크트리 · `/Users/kyu.lee/projects/test-portal-k1`)
**라운드**: K1-0902-A · 첫 라운드
**성격**: **조사 + 설계 · 구현 0 · 커밋 0** (Kyu 지침 A-3 정합)
**날짜**: 2026-09-02

---

## 0. TL;DR

- **테스트 자산 인벤토리**: vitest 단위 20 파일 · 총 3,911 LOC · E2E/smoke/integration/CI test workflow **0 건**.
- **PR 확인 항목 D1 저장 (K0-0902-AD 착지)**: `case_state` 테이블 = **PR-scoped** (복합 PK `repo, pr_id, case_id`) · 판정 이력 아님 (`REPLACE INTO` · 마지막 판정만) · 다른 PR 로 이월 안 됨.
- **케이스 누적 정의 (K1 결론)**: 3 층 = ① PR 판정 이력 (기 착지) · ② 카탈로그 (스키마 있음 · 배선 부재) · ③ 실행 이력 (스키마 있음 · 배선 부재). **누적 = ② + ③ 배선 신설 대상**.
- **설계안**: D1 신 테이블 2개 (`case_catalog` · `case_run`) + `tools/regression-runner/` CLI (deps 0) + CI workflow (머지 前 게이트 + nightly cron) + K0 넘길 화면 배선 지점 명세.
- **자작 최소**: Playwright 도입 = **별건 [PLAN-OSS] 라운드** (SPEC § 7 P4 정합 · 이번 스코프 아님). MVP = vitest + Node 22 fetch + jsdom 재사용.
- **Kyu 판정 대상 7 건 (Q1~Q7)**: § 2 하단.

---

## 1. 조사 결과 (증적 · 파일 경로 + 줄수)

### 1.1 기존 테스트 자산

- 단위 테스트 20 파일 = `src/lib/*.test.ts` (19 개) + `src/lib/parser/test-checklist.test.ts` (217 LOC) + `src/lib/auth/access-jwt.test.ts` (76 LOC)
- vitest 설정: `vitest.config.ts:9` include=`src/**/*.test.ts` + `tools/**/*.test.mjs` · environment=jsdom
- **E2E · smoke · Playwright · integration · fixture 리포 = 0 건**
- CI 워크플로 목록: `.github/workflows/kyu-gate-auto-merge.yml` **한 개만** (auto-merge · check_run trigger · `pnpm test` 실행 워크플로 부재)

### 1.2 PR 확인 항목 → D1 저장 흐름 (K0-0902-AD 착지분)

**스키마 정본**: `migrations/0002_case_state.sql:14-27`

```
CREATE TABLE case_state (
  pr_id INTEGER NOT NULL,
  repo TEXT NOT NULL,
  case_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
  reason TEXT,
  decided_at TEXT NOT NULL,        -- 서버 시각 ISO (UTC)
  decided_by TEXT NOT NULL,        -- Access JWT email
  PRIMARY KEY (repo, pr_id, case_id)
);
```

**흐름**:
- 파서: `src/lib/parser/test-checklist.ts:165` `parseChecklistFromBody(prBody)` → `TestChecklist { summary, cases[], state: 'ok'|'malformed'|'missing' }`
- 저장: `src/lib/case-state-store.ts:52` `upsertCaseState` = `INSERT ... ON CONFLICT DO UPDATE` (REPLACE 시맨틱 · 이력 없음)
- API: `src/routes/api/case-state/+server.ts:76` PUT (Access JWT 필수 · decided_by = email 자동)
- 조회: `src/routes/api/case-state/+server.ts:57` GET `?summary=1` (카드 진행도) · `?pr_id=N` (상세)
- kyu-gate 도장 서버 재검증: `src/routes/api/kyu-gate-stamp/+server.ts:91-107` = 전 case pass 검증 후 GitHub Checks POST

**정본 특성 (K0-0902-AD-3 Kyu Q1 답 · SPEC § 5 정합)**:
- PR-scoped (다른 PR 이면 별건)
- 판정 1건만 유지 (REPLACE · 이력 없음)
- `decided_at` · `decided_by` = Kyu 도장 감사 근거
- 폰↔맥 동기 = D1 strong consistency

### 1.3 회귀 스키마 (기존 · dry-run 봉인 · 소비자 부재)

- `src/lib/regression-types.ts:26-137` = TestCase + TestRun + AreaMap TS 스키마 (K0-0806-A γ MVP)
- `src/lib/regression-store.ts:17` **STORE_MODE = 'dry-run'** 상수 봉인 · GitHub Contents API PUT 없음
- **소비자 부재** 실측: `grep 'regression-store\|regression-types' src/routes` = 0 hit
- SPEC § 18.4 = 스키마 착지 · Q4=(c) 하이브리드 원안 (초판 Contents API · 승격 시 D1)

### 1.4 "누적" 정의 · A-1 결론

3 층으로 분해:

| 층 | 부품 | 상태 |
|---|---|---|
| ① PR 판정 이력 (짧은 감사) | `case_state` D1 | ✅ 착지 (K0-0902-AD) |
| ② 카탈로그 (PR 무관 · 지속 · 승격) | `regression-types.TestCase` 스키마 | ⛔ 배선 부재 (dry-run) |
| ③ 실행 이력 (append-only · 트렌드) | `regression-types.TestRun` 스키마 | ⛔ 배선 부재 (dry-run) |

**누적 = ② + ③ 배선**. **A-2 설계 스코프 = ② + ③**.

---

## 2. 설계안 요약 (전문 = `docs/plans/PLAN-K1-regression-runner.md` · 커밋 안 함)

### 2.1 데이터 모델 (K1 권고)

- **D1 신 테이블 2개** (Q1 판정 대상 · § 2.2 안 (a))
  - `case_catalog (repo, case_id)` PK · 지속 · `first_pr` · `first_passed_at` · `promoted_by` · `status(active|regressed|archived)` · `last_run_verdict`
  - `case_run (run_id)` PK · append-only · `verdict` · `mode(manual|auto-pr|auto-cron)` · `fail_context` JSON
- **승격 트리거** (Q2 판정 대상 · K1 권고 (a))
  - kyu-gate pass 시점 자동 UPSERT · 전 case_state pass → catalog · 이미 있으면 first_* 유지

### 2.2 기계 vs 사람 분류

- **기계** = DOM 검사 (jsdom · 순수 로직 assertion) · HTTP 응답 (Node 22 fetch) · 콘솔 로그 · headless URL 흐름 (Playwright · 별건)
- **사람** = 시각 질감 · 소리/진동 · 실기기 렌더 · 눈대중
- 분류 원천 = `test-checklist.cases[].kind` 아님 · **"이 case_id 에 등록된 assertion 파일 존재 여부"** 로 판정

### 2.3 러너 (자작 최소)

- 신설: `tools/regression-runner/` (deps 0 · Node 22 ESM · 기 `tools/kyu-devenv/` · `tools/kyu-bridge/` 계열 정합)
- 구조:
  ```
  tools/regression-runner/
  ├─ bin/regression-runner (CLI)
  ├─ src/{index,catalog-fetch,dispatch,report}.mjs
  └─ assertions/<repo>/<case_id>.mjs  (자유 async 함수)
  ```
- Playwright 도입 = **별건 [PLAN-OSS]** (SPEC § 7 P4 이미 designed · deferred · K1 스코프 밖)

### 2.4 실행 시점 (K1 권고 = b + c)

- (b) 머지 前 게이트 (kyu-gate pass 후 workflow) — 새 코드가 기존 회귀 케이스 깨는지 즉시 감지 · **todoboss 근태 회귀 재발 방지 정본**
- (c) 주기 cron (nightly UTC) — drift · 외부 의존 변경 · flaky
- (a) PR-open 마다 = 노이즈 이유로 초기 제외 (Kyu 미판정 상태 오탐)

### 2.5 결과 표시 · K0 넘길 배선 지점

K1 = 화면 무변경. K1 이 제공 = API · 저장소 · CLI · CI. K0 소관 = svelte 컴포넌트 편집.

| 표시 | K0 배선 지점 (참조) | K1 제공 |
|------|---------------------|---------|
| 카드 배지 | `src/lib/PrList.svelte:27~91` (case_state summary 패턴 정합) | `GET /api/case-run?repo=X&pr_id=N&summary=1` |
| 상세 § 회귀 | `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (case_state 섹션 옆 신설) | `GET /api/case-catalog?repo=X` · `GET /api/case-run?case_id=Y&limit=5` |
| kyu-gate 확장 | `src/lib/checks.ts` · `src/lib/kyu-gate-stamp.ts` | check_run summary 조립 helper |

---

## 3. Kyu 판정 대상 (self-contained · relay 회신 근거)

### Q1 · 카탈로그 저장소 위치

- **(a) D1 신 테이블 2개 `case_catalog` + `case_run`** — **K1 권고**. 강일관성 · 기 `case_state` 조인 편의 · SPEC § 3 D1 예외 원칙 (K0-0807-U 정합).
- (b) 기 `case_state` 재활용 (`pr_id=0` 특수 값) — **비권장**. 스키마 오염 · 복합 PK 의미 훼손.
- (c) GitHub Contents API (`regression-store.ts` STORE_MODE='live') — SPEC § 18.4 원안. 저비용이나 조인 불가 · PR fetch latency · commit 노이즈.

### Q2 · 승격 트리거

- **(a) 자동 (kyu-gate pass 시 전 case_state → catalog UPSERT)** — **K1 권고**. Kyu 부담 0 · pass 자체가 이미 판정.
- (b) 수동 ([회귀 편입] 버튼 · Kyu 명시 클릭) — 정확하나 Kyu 오버헤드 · 화면 추가 필요 (K0 소관).
- (c) 자동 + 수동 아카이브 (자동 승격 · 나쁜 케이스는 `status='archived'`) — (a) 확장. 노이즈 방어 옵션.

### Q3 · 실행 시점

- (a) PR-open + 머지 前 + 주기 cron — 완전 · Actions 비용 큼.
- **(b) 머지 前 게이트 + 주기 cron 병행** — **K1 권고**.
- (c) 주기 cron 만 — 최소 · 즉시 감지 없음.

### Q4 · area 매핑 (스마트 회귀 서브셋 실행)

- **(a) MVP 부재 · 전 카탈로그 실행** — **K1 권고**. 초기 케이스 규모 작음 (< 50).
- (b) 초판부터 각 리포 `.test-portal/area-map.json` 신설 · PR changed files 매칭 — 각 리포 dispatch 필요.

### Q5 · Playwright 도입

- **(a) 이번 라운드 스코프 아님 · 별건 [PLAN-OSS] 라운드 (SPEC § 7 P4 정합)** — **K1 권고**. 자작 최소.
- (b) 초판부터 Playwright · headless 딥링크 케이스 포함.

### Q6 · 러너 실행 위치

- **(a) GitHub Actions runner (workflows/regression.yml)** — **K1 권고**. cron · PR trigger · 로그 GitHub.
- (b) kyu-bridge 로컬 데몬 확장 (`POST /regression`) — Kyu 수동 트리거 재현용.
- (c) (a) 자동 + (b) 수동 재현 병행 — 완전.

### Q7 · todoboss 근태 회귀 사고 · 이 러너로 잡히는가

- 잡히려면 = case_catalog 에 근태 판정 유형 케이스 존재 + assertion 파일 (예: `tools/regression-runner/assertions/todoboss/attendance-office-0830.mjs` · 사무직 08:30 출근 = 정시 판정 assertion) 존재 + 머지 前 실행
- **답**: (b) 머지 前 게이트 · **assertion 파일 축적이 대전제**
- 본 라운드 스코프 = **저장소 + 러너 CLI · assertion 파일 실 작성은 K1 P2 라운드 별건** (T0 todoboss 협업 대상)

---

## 4. 다음 단계 (Kyu 사인 후 K1 P1 라운드 스코프 · 대략 3일)

1. Migration 2개 (`0003_case_catalog.sql` · `0004_case_run.sql`)
2. 저장소 lib 2개 (`case-catalog-store.ts` · `case-run-store.ts` · 기 `case-state-store.ts` 패턴 정합)
3. API endpoint 2개 (`/api/case-catalog` · `/api/case-run`)
4. CLI 러너 (`tools/regression-runner/` · deps 0)
5. CI workflow (`.github/workflows/regression.yml` · 머지 前 게이트 + nightly cron)
6. 승격 훅 (kyu-gate-stamp 서버 = 전 case pass → catalog UPSERT · 자동 승격 · Q2=a 채택 시)
7. K0 회부 문서 (§ 2.5 배선 지점 명세 · K0 라운드 dispatch 신설)

---

## 5. 자산 실측 표 (증적 편의)

| 파일 | 목적 | 상태 |
|------|------|------|
| `migrations/0001_approvals.sql` | 오케 승인 큐 D1 | ✅ 착지 |
| `migrations/0002_case_state.sql` | 케이스 판정 D1 | ✅ 착지 (K0-0902-AD) |
| `src/lib/parser/test-checklist.ts` | PR body YAML 파서 | ✅ 착지 (K0-0902-AD-1 · 재작성) |
| `src/lib/case-state-store.ts` | 판정 저장/조회 | ✅ 착지 |
| `src/routes/api/case-state/+server.ts` | 판정 API | ✅ 착지 |
| `src/routes/api/kyu-gate-stamp/+server.ts` | kyu-gate 반자동 도장 | ✅ 착지 (skeleton · K1 승격 훅 편입 대상 · Q2=a) |
| `src/lib/regression-types.ts` | 카탈로그 TS 스키마 | ⚠ 스키마만 · 소비자 부재 · K1 대안 = D1 신 테이블 (Q1) |
| `src/lib/regression-store.ts` | 카탈로그 저장소 | ⚠ dry-run 봉인 · 소비자 부재 |
| `.github/workflows/kyu-gate-auto-merge.yml` | 자동 병합 | ✅ 착지 · K1 신설 = `regression.yml` (별건) |
| `docs/plans/PLAN-regression.md` | 회귀 로드맵 (K0-0730-U) | ✅ 등재 · 이 리포트 = 설계 라운드 첫 진입 |
| `docs/plans/PLAN-case-accumulation-management.md` | K37 케이스 누적 UI | ⏸ Kyu 보류 (K0-0728-M) · K1 스코프 = UI 아님 (K0 넘길 항목) |
| `docs/plans/PLAN-K1-regression-runner.md` | **본 라운드 설계 전문** | ⛔ 신규 · **커밋 안 함** (구현 0 지침) |

---

## 6. 리포트 규약 정합 확인

- ✅ 구현 0 · 커밋 0 (feat/k1-0902-regression 워크트리 clean 유지)
- ✅ src/ 화면 파일 무변경 (검색·조회만)
- ✅ 브랜치 무변경 (main 체크아웃 안 함)
- ✅ K0 착지분 (K0-0902-AD) 존중 · 재구현 없음 · 재활용 명시
- ✅ Kyu 질문 self-contained (Q1~Q7 · relay 열람만으로 판정 가능)
- ✅ 파일 경로 + 줄수 증적 (§ 1.1~1.3 · § 2.5)

---

*K1-0902-A · 2026-09-02 · 회귀 러너 조사 + 설계안 · 구현 0 · 커밋 0 · Kyu 판정 대기*
