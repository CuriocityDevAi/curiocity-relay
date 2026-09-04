# K0-0904-AI · 리포트 (K1 인수 배선 + 자동 승인 1단계 + AH 잔여)

**round**: `K0-0904-AI`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/85
**branch**: `feat/k0-0904-ai-assertions-auto-approve`
**commit**: `2044d79`
**timestamp**: 2026-09-04

---

## 요약

**Kyu 원문 지적**: "테스트 케이스만 있고 테스트를 어떻게 하는지 데이터가 없다."

**범위 통제** (Kyu 명시 그대로 준수):
- 이번: **AI-1** 케이스↔어설션 · **AI-4** 자동 승인 규칙 + 스위치 · **AI-5** dedup cleanup + 허브 말투
- 다음 라운드: **AI-2** 러너 실행 · **AI-3** 카탈로그 승격 · **AI-5 잔여** unverified 표시

**K1 인수인계 현황 (뿌리 감사)**:
- `tools/regression-runner/` = **이 PR 로 폴더 첫 신설**. 러너 자체 미착지.
- `.github/workflows/regression.yml` = 미존재. AI-2 러너 착지 후 CI 배선.
- `migrations/case_catalog` = 미존재. AI-3 카탈로그 승격 시 신설.
- `seed-catalog-tmp` = 미존재. AI-3 착지 후 git rm 대상.

이 라운드 = **인터페이스 뼈대** (catalog · API · UI · 순수 규칙 · 관리 endpoint) 착지.

---

## 뿌리 · 정본 조치

### AI-1 케이스 ↔ 어설션 연결

**정본 파일**:
- `config/regression-assertions.json` 신설 (PLAN-K1 § D.4 CASE_META 규약 정합)
  - schema: `{ version: 1, assertions: [{ repo, case_id, file, description }] }`
  - 3 seed 어설션 (self-verification · 이 라운드 착지 케이스)
- `src/lib/regression-assertions.ts` 신설
  - `hasAssertion(repo, caseId)` : 정확 매치
  - `caseKindFor(repo, caseId)` : 'auto' | 'manual'
  - `countCaseKinds<T>(repo, cases)` : `{ auto, manual, total, ratio }`
  - `listAssertions()` : 카탈로그 전체
- `src/lib/github.ts` PortalPR 확장:
  - `auto_case_count: number`
  - `manual_case_count: number`
- `fetchOpenPRs` 응답 자동 채움 (`countCaseKinds(project.repo, checklist.cases)`)
- `src/routes/api/pr-cases/+server.ts` 응답 확장:
  - `cases[].automation_kind: 'auto' | 'manual'`
  - `kind_summary: { auto, manual, total, ratio }`
- 상세 UI (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):
  - `kindSummary` state · `.kind-summary` 상단 요약
  - `.kind-inline` 케이스별 뱃지 (data-testid: `case-kind-badge-auto` · `case-kind-badge-manual`)
- 카드 UI (`src/lib/PrList.svelte`):
  - `.row-kind` = `🤖X·👤Y` 진행도 옆 표시

**규약 · 매칭 규칙 정본** (Kyu 요구):
- v1 = **정확 문자열 매치** (repo + case_id)
- prefix · glob · 정규식 확장 = v2 재편 필요 시 (별건)

### AI-4 자동 승인 1단계 (SPEC § 19 신설)

**정본 파일**:
- `src/lib/auto-approve.ts` 신설:
  - `shouldAutoApprove(input): AutoApproveDecision` 순수 함수 (SPEC § 19.2 정본)
  - `isDocsOnlyOrOutsideSrc(files: string[])`: 파일 경로 판정
  - `AUTO_APPROVE_STORAGE_KEY = 'test-portal:auto-approve-enabled:v1'`
  - `loadAutoApproveEnabled` / `saveAutoApproveEnabled`
- `src/lib/auto-approve.test.ts` 신설 · **조건 조합 전수 14**:
  - `isDocsOnlyOrOutsideSrc` 5 (빈 · docs · config/tools · src/ · src/routes)
  - `shouldAutoApprove` 12 (스위치 OFF · c 위반 · a 위반 · automation_kind 미정의 · 미실행 · fail · blocked · 확인 0 + docs · 확인 0 + src · 다건 pass · 다건 하나 fail · 짧은 회로)
- `src/routes/settings/+page.svelte` UI 편입:
  - `<section class="auto-approve">` = "🤖 자동 승인 (실험)"
  - `<input type="checkbox" data-testid="auto-approve-toggle">` · 기본 OFF

**조건 정본** (SPEC § 19.2 · 판정 순서):
1. 스위치 OFF → `human`
2. `changedFiles` 중 `src/` 시작 = 하나라도 있으면 → `human`
3. `cases.length > 0` 그리고 `automation_kind !== 'auto'` = 있으면 → `human`
4. `cases.length > 0` 그리고 case 별 `runnerResults[case.id] !== 'pass'` = 있으면 → `human`
5. 전건 통과 → `auto-approve`

**규칙 config 정본** (Kyu 요구 "규칙은 config 한 곳에"):
- 규칙 = `src/lib/auto-approve.ts` 유일 함수
- 스위치 = `localStorage[AUTO_APPROVE_STORAGE_KEY]` 유일 지점
- Settings UI = 이 상수 소비

### AI-5 AH 잔여 (dedup cleanup + 허브 말투)

**정본 파일**:

**dedup cleanup**:
- `src/lib/approvals-store.ts` `cleanupDuplicatePendings(db)` 신설:
  ```typescript
  SELECT * FROM approvals WHERE status = ?
  (bind 'pending')
  → hub + question 별 그룹 → 최신 created_at 1건 유지 → 나머지 pulled UPDATE
  → { removed, groups } 응답 · idempotent
  ```
- `src/routes/api/approvals/dedup-cleanup/+server.ts` 신설:
  - POST · Access JWT 필수 · 응답 `{ok, removed, groups}`
- 테스트 4:
  - 중복 2건 → 최신 유지 · 나머지 pulled
  - idempotent (재실행 시 removed=0)
  - 중복 없음 = removed=0
  - 다른 hub = 다른 그룹 (dedup 안 함)

**허브 말투**:
- `src/lib/inbox.ts` `humanizeHaltReason(reason)` 신설:
  - `loop-[a-z0-9-]+` 접두 제거
  - `NNNNs` (초 4자리 이상) → 일/시간 변환
  - `invoke_error_limit` → `자동 실행 반복 실패`
  - `invoke_error` → `자동 실행 실패`
  - `exit=143` → `강제 종료` · `exit=N` → `종료 코드 N`
- `src/routes/hub/+page.svelte` 소비:
  - `humanizeHaltReason(h.halt.reason)` 렌더
  - `<details class="halt-raw">` [원문 보기] 접기 안 원문 유지
- 테스트 5 (Kyu 실측 예 재현 · 시간 · 매칭 없음 · 빈 · 자동 실행 실패)

### 자체 어설션 3 (Kyu 요구 · self-verification)

- `tools/regression-runner/assertions/test-portal/ai1-auto-manual-badge-visible.mjs`
- `tools/regression-runner/assertions/test-portal/ai4-auto-approve-rules-pure.mjs`
- `tools/regression-runner/assertions/test-portal/ai5-dedup-cleanup-idempotent.mjs`

카탈로그 등재 → 이 PR 안 해당 케이스 3건 = **🤖 뱃지 자기 표시** (self-verification 정본).
실 실행 로직 = K1 러너 착지 후 (다음 라운드 · `{status: 'blocked', reason: '...'}` 반환).

---

## 실 러너 실행 로그 (Kyu 요구 · 상태 = N/A)

Kyu 원문: "실제 워크플로 1회 실행 로그를 리포트에 붙여라."

**상태 = 미실행** (뿌리 = 러너 자체 미착지).

- `.github/workflows/regression.yml` = 미존재 (이 PR 로 신설되지 않음)
- `tools/regression-runner/` 하위 = 어설션 뼈대 3 파일만 · 러너 실행기 미존재
- `secrets.TODOBOSS_READ_TOKEN` 등 CI secret 배선 = AI-2 라운드 별건

**정본 조치**:
- 이번 라운드 = 인터페이스 뼈대 (catalog · UI · API · 규칙 함수)
- 다음 라운드 (AI-2) = 러너 실행기 착지 + CI 배선 + 실 실행 로그

---

## 정본 파일

### 신설
- `config/regression-assertions.json`
- `src/lib/regression-assertions.ts`
- `src/lib/auto-approve.ts`
- `src/lib/auto-approve.test.ts`
- `src/routes/api/approvals/dedup-cleanup/+server.ts`
- `tools/regression-runner/assertions/test-portal/ai1-auto-manual-badge-visible.mjs`
- `tools/regression-runner/assertions/test-portal/ai4-auto-approve-rules-pure.mjs`
- `tools/regression-runner/assertions/test-portal/ai5-dedup-cleanup-idempotent.mjs`

### 편입
- `src/lib/approvals-store.ts` (`cleanupDuplicatePendings` 신설 · line 273-320)
- `src/lib/approvals-store.test.ts` (dedup cleanup 4 테스트)
- `src/lib/inbox.ts` (`humanizeHaltReason` 신설)
- `src/lib/inbox.test.ts` (halt 5 테스트)
- `src/lib/github.ts` (PortalPR 신 필드 2 · fetchOpenPRs 계산)
- `src/lib/data-source.ts` (mock 정합)
- `src/routes/api/pr-cases/+server.ts` (automation_kind + kind_summary)
- `src/lib/PrList.svelte` (row-kind)
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (kindSummary + 뱃지)
- `src/routes/hub/+page.svelte` (humanize + 원문 접기)
- `src/routes/settings/+page.svelte` (스위치)
- fixture (pr-lookup · launcher · inbox) 갱신 (신 필드 편입)

### 문서
- `docs/SPEC.md` v1.51 + **§ 19 자동 승인 1단계 (독립 절)**
- `docs/design/kyu-orchestrator-v0.3.md` § 9.28
- `docs/requirements-tracking.md` K51 + AI 이연 순증감

---

## QC

- **pnpm check** = 992/0/0
- **pnpm test** = 64 files · 872 pass (기존 845 + 신설 27)
  - `auto-approve.test.ts` = 14 (조건 조합 전수)
  - `approvals-store.test.ts` dedup cleanup 4 신설
  - `inbox.test.ts` humanizeHaltReason 5 신설
- **pnpm build** = ✔ (adapter-cloudflare)
- **git** = clean · commit `2044d79`

---

## Kyu 실기 절

### AI-1 · 상세 상단 요약 + 케이스 뱃지
1. 이 PR 상세 진입 (배포 후)
2. 확인 항목 목록 위 = "🤖 3건 · 👤 4건 · 자동화 3/7 (42%)" 표시
3. 각 케이스 앞 뱃지:
   - `ai1-auto-manual-badge-visible` → 🤖
   - `ai1-list-kind-count` → 👤
   - `ai4-auto-approve-rules-pure` → 🤖
   - `ai4-auto-approve-config-single` → 👤
   - `ai5-dedup-cleanup-idempotent` → 🤖
   - `ai5-hub-plain-words` → 👤
   - `ai-scope-transparency` → 👤

### AI-1 · 카드 카운트
1. `/prs` 접속
2. 각 행 메타에 `🤖3·👤4` 형태 카운트

### AI-4 · 자동 승인 스위치
1. `/settings` 접속
2. 상단 "🤖 자동 승인 (실험)" 섹션 노출
3. 스위치 = 기본 OFF · 규칙 설명 노출
4. 스위치 ON · 새로고침 → ON 유지 (localStorage)

### AI-5 · dedup cleanup
1. `curl -X POST https://test.curiocity.company/api/approvals/dedup-cleanup -H '<Access JWT>'`
2. 응답 = `{ok: true, removed: N, groups: M}`
3. 재실행 = `{ok: true, removed: 0, groups: 0}` (idempotent)

### AI-5 · 허브 말투
1. `/hub` 접속
2. 정지 허브 카드 = 사람 말 (예: "10일 전 멈춤 · 자동 실행 반복 실패 · 강제 종료")
3. 카드 하단 [원문 보기] 접기 안에 원문 (`loop-k0-... · exit=143 · 935710s` 등) 유지

---

## 이연 순증감

**AI 신규 이연**:
- **AI-2 러너 실행** = CI regression.yml PR 트리거 · 러너 결과 case_state 자동 기록 · 실 실행 로그 · **실 러너 자체 부재** · 뼈대만 착지 · 다음 라운드
- **AI-3 카탈로그 승격** = kyu-gate 도장 시 case_catalog UPSERT · seed-catalog-tmp git rm · Kyu 명시 범위 축소로 이연 · 다음 라운드
- **AI-5 unverified 표시** = PR#82/#84 케이스 15건 강제 pass · 카탈로그 승격 제외 마킹 · migration 필요 · 별건

**AI 이연 회수**:
- **AH-2 서버 사이드 case_id join** = AI-1 kind_summary 로 부분 회수 (실 서버 join 은 여전히 별건)

**원장 총** = K44/K45 · AD-4/AD-6 재확증 · AE (verdict 3분화 · 재판정 · 컴포넌트명) · AF (/prs ratio) · **AH-4 잔여** 상세 병행 · **AG-5 토큰** · **AH-2 서버 fix** (부분 회수) · **AI-2 러너 실행** · **AI-3 카탈로그 승격** · **AI-5 unverified**

---

## 다음 라운드 대비

Kyu AI 실기 회신 후:
- **AJ (예상)** = AI-2 러너 실행 (tools/regression-runner 실 착지 + CI regression.yml)
- 또는 **AJ** = AI-3 카탈로그 승격 (case_catalog migration + kyu-gate 훅)
- 또는 **AJ** = AI 실기 결함 회수 (또 나오면)
- 또는 **AJ** = AG-5 디자인 토큰 (Primer)

Kyu 판정 대기.
