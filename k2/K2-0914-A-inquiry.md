# K2-0914-A · 심문 (§ ③ 정본 · K2 첫 라운드)

**허브**: K2 (신 정체성 · **test-portal 테스트 체계 알바 허브** · 첫 부트스트랩)
**브랜치**: `feat/k2-testing-system` (main 923a947 기저 · 워크트리 `~/projects/test-portal-k2` · 커밋 0)
**CYCLE**: v1.2 § ② 큐/스펙 게시 + § ③ 심문 · 즉시 구현 금지 · Kyu 답 회수 후 실행

---

## § ② 큐 · EPIC · 스펙 실측

### 1. dispatch 큐 (test-portal 로컬)

```
inbox     = 8건 (P2.2/2.3/2.4/2.5/2.6 · P5 · deeplink-todoboss · P2.2-0-access)
active    = 0
await-kyu = 0
```
K2-0914-A = dispatch inbox 밖 · Kyu 직접 발부 (신설 허브 부트스트랩).

### 2. EPIC-STATE (Active 5 · Deferred 8 · STALE 없음)

- Active: K0-0914-AU 포털 v2 (실기 대기) · K0-0914-AR 부르는 포털 (실기 대기) · K0-0904~0911 디자인 · P2 SUBMIT live · K33 모바일.
- Deferred: **REG · 회귀 관리 통합 (K1-0902-A/B/C/D 4단계 완결 · K0 흡수 인수인계 게시)** — K2 라운드가 REG 후속 상속.
- 본 라운드 관련 = **REG 후속 (테스트 체계 v1 에픽)** · K1-0914-A F 감사 (PR#94 OPEN) 관찰 → K2 실행.

### 3. 동결 스펙 인용 (SPEC 원문)

- **§ 17.2** (v1.20 · 근본 목적 재정의): "test-portal 근본 목적 = 회귀 관리 통합. Kyu 판정 원장 + 기계 러너 + 데이터 승계 이력."
- **§ 17.4** (사가 구조): "(A) 조사·설계 · (B) 인프라 δ · (C) 다른 리포 확장 · (D) CI matrix". K1-0902-D 종료. **후속 = K0 흡수** 정본.
- **§ 6.1** (실기 체크리스트 = 기계 판독 YAML) · **§ 6.2** (YAML 스키마).
- **CLAUDE.md § 3 자작 최소 · § 5 원칙 3** — 신규 의존 도입 시 [PLAN-OSS] 게이트 필수.
- **CLAUDE.md § 3 DB 신설 금지 예외 K0-0807-U** — REG 통합 관련 D1 = 정본 상태 (임시 캐시 아님) · 각 도입 시 명시 사유 + Kyu 승인.

### 4. K1-0914-A 감사 인수 (PR#94 OPEN · 관찰만)

| # | 관찰 | 근거 |
|---|---|---|
| O1 | test-portal main 어설션 2건 stale (al2 · ao4) → schedule 3연속 fail | audit § 5.1 |
| O2 | 어설션 정본 전환 시 회수 규약 부재 (AL→AM 재편) | O1 뿌리 |
| O3 | 어설션 등재 시 러너 계약 (default export) 검증 부재 | ao4 뿌리 |
| O4 | matrix-run fail 상태로도 auto-merge 성공 (kyu-gate 별건 · REG fail 무력화) | audit § 4 |
| O5 | 어설션 등재 = test-portal matrix 안 (한 리포에 다른 리포 REG · 확장 병목) | audit § 1 |

**K2 소화 대상** = O1 (§ 1) + O2/O3 규약 (§ 5 docs README) + O4 완화 (§ 3 gate API) + test_runs 이력 (§ 2).

---

## § ③ 심문 (a/b/c/d · 답 회수 후 실행)

### 실측 뿌리 (블로킹 정본)

**al2 tabs stale** — `src/routes/+layout.svelte` 안 `<nav class="bottom-tabs"` = **0 grep 매치**. K0-0904-AM-1 하단 탭 폐지 (홈 단일 스크롤). 어설션이 삭제된 UI 검증 → **실 회귀 아님 · REG 정본 오염** (audit § 5.1).

**ao4 broken** — 파일 안 `export const CASE_META` + `export async function run()` · **`export default` 부재**. 러너 dispatcher (`src/dispatch.mjs:73`) = `mod?.default` 함수 요구 → verdict = 'fail'.

**schedule 3연속 fail** = main 브랜치 안 위 2 stale 잔존 (audit § 5).

---

### (a) 확인 질문 (블로킹 6건 · 답 필수)

#### Q-a1. al2 처리 판정

3안 · K2 권고 표시:

- **(가) 삭제** — 어설션 파일 rm · 어설션 인벤토리 -1. 근거: bottom-tabs 자체가 폐기 (AM-1) · 검증 의미 없음.
- **(나) invariant 잠금 반전** — assertion 을 "layout 안 bottom-tabs **부재** 확증" 으로 재작성 (재도입 방지 · ~5 줄). 근거: 결정 잠금 · 미래 재도입 회귀 감지.
- **(다) AU 화면 신 invariant 로 대체** — 예: `<nav class="bottom-tabs"` 부재 AND `.scroll-area` 존재 확증 (AM 정본 잠금 + AL 정합).

**K2 권고: (가) 삭제**. 사유: (나)/(다) 는 결정 잠금 가치보다 유지 부담 큼 · 폐지 코드는 자연 부재 · AU/AV 라운드에서 신 assertion 신설이 정본 흐름. **회신 필요**: (가)/(나)/(다) 택 1.

#### Q-a2. ao4 처리 판정

3안 · K2 권고:

- **(가) 즉시 fix** — `export default run;` 한 줄 append · 시그니처 정합. 로직 재검증 없음.
- **(나) fix + CASE_META 자기 self-check test 추가** — 어설션 파일 자체 validity test (default export = function + CASE_META shape) · 러너 계약 검증 CI job 신설.
- **(다) 삭제** — 자동 회귀 어려움 (GITHUB_TOKEN + PR_NUMBER env context 필요 · matrix run 에서 매 PR 실행 자체가 무거움).

**K2 권고: (가) + (나) 계약 검증 CI job 신설**. 사유: ao4 자체 = 회귀 방지 목적 정본 (K0-0907-AO-4 gh-body-editor 정합) · 유지 · 러너 계약 검증은 § 5 규약 정본화. **회신 필요**: (가)/(나)/(다) 택 1 or 조합.

#### Q-a3. `test_runs` vs `case_run` 병존 판정

현행 `case_run` = per-case 이력 (case_id 단위 · migrations/0004). 요청 `test_runs` = per-suite 이력 (repo·pr·sha·suite·status·started·duration·fail_names). 겹치는 축 = repo · pr · sha · status.

3안 · K2 권고:

- **(가) test_runs 신설 · case_run 병존** — 두 테이블 · test_runs = 상위 rollup · case_run = 상세. Gate API 는 test_runs 소비 · K37 케이스 누적은 case_run 소비.
- **(나) test_runs 신설 · case_run 폐기 마이그레이션** — case_run 을 test_runs 로 흡수 (case_id 필드 유지 · nullable rollup case).
- **(다) case_run 을 test_runs 로 이름만 변경** — 데이터 손실 없이 rename.

**K2 권고: (가) 병존**. 사유: 두 축이 실제 다른 정본 (rollup vs detail) · 마이그레이션 부담 없음 · Gate API 는 rollup 만 소비 (성능) · case_run 은 K37 카탈로그 소비 정본 유지. **회신 필요**: (가)/(나)/(다) 택 1.

#### Q-a4. `/api/runs` POST 인증

현행 `/api/case-run` = Access JWT 필수. CI 러너 안에서 Access JWT 발급 = 어려움 (client credentials flow 필요 · Kyu 회수 이력 부재). 3안:

- **(가) Access JWT 재사용** — CI 안 `secrets.REG_ACCESS_TOKEN` 편입 (K48/K49 대기 항목 · 현재 미편입).
- **(나) 별도 Bearer 토큰 신설** — `secrets.REG_INGEST_TOKEN` 신설 · `Authorization: Bearer <token>` 검증 · Access JWT 별건. Workers secret 편입.
- **(다) GitHub OIDC** — GitHub Actions native OIDC 토큰 (`id-token: write` permission) · Workers 안 GitHub issuer 검증. 자작 요소 있음.

**K2 권고: (나) 별도 Bearer**. 사유: CI 러너 = 단일 목적 (test_runs POST 만) · Access JWT client credentials 는 자작 최소 위배 · GitHub OIDC 는 검증 로직 자작 부담. Bearer 는 `crypto.timingSafeEqual` 만. **회신 필요**: (가)/(나)/(다) 택 1.

#### Q-a5. `/api/gate/:owner/:repo/:pr` 판정 규칙

Gate API 정본 판정:

- **green** iff (모든 required check-run success AND 최신 test_runs (같은 sha) success)
- **red** iff (any required check-run failure OR 최신 test_runs failure)
- **none** iff (판정 데이터 부재 · pr 조회 실패 · sha 부재)

**K2 권고: 위 3분기 · reasons[] = 각 실패 사유 (checkrun 이름 · test_runs 실패 이름)**. `required` 정의 = 초판 = kyu-gate + regression · 확장은 별건.

- **회신 필요**: 위 3분기 정본 OK? · required check 목록 초판 = kyu-gate + regression matrix (test-portal + todoboss) 정합?

#### Q-a6. `/api/env/seed-reset` 계약 상세

시드 고정 (task 4) 정본:

- **계약 파라미터**: `POST /api/env/seed-reset` body `{ repo: string, seed_id: string, force?: boolean }` · Bearer 인증 (Q-a4 정합).
- **응답**: `{ ok: boolean, snapshot_id?: string, rows_affected?: number, note?: string }`.
- **각 프로젝트 구현**: 각 허브가 자기 리포 안 시드 로직 담당 · test-portal 은 계약 문서만 + 자체 시드 구현.
- **test-portal 자체 시드**: D1 fixture — `case_state` · `case_run` · `approvals` 초기화 fixture 세트. seed_id 예: `empty` (전 clear), `sample-pr` (샘플 PR 5개).

**K2 권고: 위 계약 · test-portal 자체 = empty + sample-pr 2 fixture**. **회신 필요**: 계약 shape · seed_id 예약어 (empty · sample-pr) · 인증 방식 (Bearer Q-a4 정합) OK?

---

### (b) 충돌 · 중복 지적

#### B1. `case_run` 이력과 `test_runs` 이력 이중 정본 위험

**충돌**: 두 테이블이 다른 축이지만 "PR 이력" 관점에서 겹침. K0 화면이 어느 쪽 소비할지 애매.

**해소 (K2 권고)**: `case_run` = 상세 (K37 카탈로그 · 상세 화면 case 배지) · `test_runs` = 상위 (홈 카드 판정 뱃지 · Gate API 계산). **문서 명시** = `docs/testing/runs-api.md` 안 소비 경계 표.

#### B2. `regression.yml` matrix + Gate API

**충돌**: regression.yml matrix-run 실패 = auto-merge 성공 (kyu-gate 별건 · audit O4). Gate API 는 이 실패를 red 로 판정. K1 auto-merge.yml 편집 = K1 소유.

**해소 (K2 권고)**: 
- (a) K2 는 `/api/gate` API 만 제공.
- (b) K1 auto-merge.yml 통합 지시서 = `docs/testing/gate-contract.md`. 
- (c) K1 라운드 발부 (curl 예 · 실패 시 exit code · label 예외 규약 상속).

#### B3. `docs/SPEC.md` 편집 K2 스코프 밖?

**충돌**: 파일 경계 = `docs/testing/**` · SPEC 편집은 명시 부재. 그러나 [DOC] "SPEC § K2 테스트 체계 절" 요구.

**해소 (K2 권고)**: `docs/SPEC.md § 24 K2 테스트 체계` 절 append (K2 신 정본) · 기존 § 17 REG 목적은 그대로 유지 (K0/K1 정본). EPIC-STATE · requirements-tracking append 도 K2 rebase 규약 정합.

- **회신 필요**: SPEC append K2 스코프 OK? (rebase 충돌 시 K2 rebase 규약 명시됨)

---

### (c) 요구사항 자체 반론 (K2 비판)

#### C1. "야간 schedule 초록 1회 실측" — 대기 부담

**반론**: schedule cron `0 15 * * *` UTC (KST 자정). 라운드 시점 KST 18:46 → 다음 fire = KST 자정 (5+ 시간 대기). K2 라운드 완결 지연.

**대안 (K2 권고)**:
- (가) workflow_dispatch `mode=auto-cron` 실행 → schedule 동치 매트릭스 초록 확증. schedule 자체는 다음 fire 이력을 다음 라운드에 회수.
- (나) schedule cron 을 이 라운드 착지 후 5분 시점으로 임시 조정 → 대기 후 원래대로.
- (다) 진짜 schedule 대기 (5+ 시간).

**회신 필요**: (가) 대체 확증 OK? 또는 (나)/(다) 강제?

#### C2. `test_runs` 컬럼 `fail_names` = TEXT (JSON array serialized) vs 별도 테이블

**반론**: `fail_names` = 어설션 실패 이름 리스트 (예: `["al2", "ao4"]`). TEXT (JSON) 저장 = 조회 필터 없음 (조회 = "실패에 al2 포함" 어려움). 대안 = 별도 `test_run_failure` 테이블 (1:N).

**K2 권고**: **TEXT (JSON) 유지**. 사유: 자작 최소 · Gate API 는 이름만 nested 렌더 · 카운트/필터 필요 시 case_run (per-case) 소비. 별도 테이블 = 향후 확장 대상 (K37 흡수 시점).

**회신 필요**: TEXT JSON 정합 OK? 또는 별도 테이블 강제?

#### C3. 어설션 계약 검증 CI job (Q-a2 (나)) = 러너 자체 확장 vs 별도 workflow

**반론**: 러너 계약 (default export function + CASE_META shape) 검증 = 러너 자체가 pre-flight 검증 vs 별도 CI job.

**K2 권고**: **러너 pre-flight 편입** (`bin/regression-runner` 이 assertions 폴더 스캔 시점에 shape 검증 · 잘못된 파일 = blocked verdict + `[REG-CONTRACT]` prefix reason). 별도 workflow 는 자작 최소 위배.

**회신 필요**: 러너 pre-flight OK? 또는 별도 job 강제?

---

### (d) 역제안 (K0-0724-H 정본 · K2 능동 제기 3건)

#### D1. `docs/testing/` 하위 문서 구조

K2 권고 = **4 문서 정본**:
- `docs/testing/README.md` — 테스트 체계 v1 원칙 (수용 기준 코드 前 · 층 배치 · 환경 동일성 · 게이트 · 이력 · 소유)
- `docs/testing/runs-api.md` — `/api/runs` GET/POST 계약 (K0 소비용)
- `docs/testing/gate-contract.md` — `/api/gate` 계약 + K1 auto-merge 통합 지시서
- `docs/testing/seed-contract.md` — `/api/env/seed-reset` 각 리포 구현 규약

**K2 권고**: 4 문서. **회신 필요**: (가) 4 문서 OK · (나) 3 문서 (seed-contract 를 README 흡수) · (다) 다른 구성.

#### D2. 어설션 회수 규약 (audit O2 소화)

K2 권고 = `docs/testing/README.md § "어설션 회수 규약"` 편입:
- UI/데이터 정본 전환 시 (예: AL→AM 하단탭 폐지) 회수 대상 어설션 = **PR body test-checklist 안 명시** (`retires: [al2-tabs-three-rendered]` 필드).
- CI = `retires` 필드 감지 시 어설션 파일 존재 확인 · 파일 잔존 = fail (실 삭제 강제).

**K2 권고**: 위 규약 § README 편입. **회신 필요**: (가) 편입 OK · (나) 별건 라운드 이연 · (다) 다른 방식.

#### D3. 러너 assertion 파일 default export 시그니처 lint

K2 권고 = `pnpm run lint:assertions` script 신설 (Node 22 · deps 0) · 각 assertion 파일 import 시 shape 검증. CI regression.yml matrix 前 실행 (별도 job 아님 · matrix-run step 안 first step).

**K2 권고**: 위 lint script. **회신 필요**: (가) 신설 OK · (나) 러너 pre-flight 로 충분 (C3 (러너 pre-flight) 정합 시 D3 불요) · (다) 다른 방식.

---

## 요약 (블로킹 6 + 반론 3 + 역제안 3)

| # | 항목 | K2 권고 | Kyu 회신 |
|---|---|---|---|
| Q-a1 | al2 처리 | 삭제 | (가/나/다) |
| Q-a2 | ao4 처리 | fix + 계약 검증 | (가/나/다) |
| Q-a3 | test_runs 병존 | 병존 (가) | (가/나/다) |
| Q-a4 | POST 인증 | Bearer (나) | (가/나/다) |
| Q-a5 | Gate 판정 | 3분기 · required=kyu-gate+regression | 정합 (Y/N) |
| Q-a6 | seed-reset 계약 | 위 shape · empty+sample-pr | 정합 (Y/N) |
| B3 | SPEC append | K2 스코프 편입 | 정합 (Y/N) |
| C1 | schedule 확증 | workflow_dispatch 대체 | (가/나/다) |
| C2 | fail_names | TEXT JSON | 정합 (Y/N) |
| C3 | 러너 계약 검증 | 러너 pre-flight | 정합 (Y/N) |
| D1 | docs/testing 구조 | 4 문서 | (가/나/다) |
| D2 | 어설션 회수 규약 | README 편입 | (가/나/다) |
| D3 | assertion lint | 러너 pre-flight 로 흡수 | (가/나/다) |

---

**K2 대기**. Kyu 회신 회수 후 즉시 구현 착수 (§ ④ 정본).

*K2-0914-A · 심문 · 2026-09-14 · 부트스트랩 첫 라운드*
