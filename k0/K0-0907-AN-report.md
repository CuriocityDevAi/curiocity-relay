---
round: K0-0907-AN
date: 2026-09-07
hub: K0 (test-portal)
pr: https://github.com/CuriocityDevAi/test-portal/pull/87
base: main@fcc827db (K0-0904-AL squash landed · 2026-09-04)
head: feat/k0-0904-am-motion-grammar-home
kind: emergency-conflict-and-defects
outcome: 자기 검증 통과 · Kyu 실기 확증 대기
---

# K0-0907-AN 리포트 · 결함 회수 라운드 (PR#87)

## 요지

PR#87 (AM · 정보 구조 재편) 이 main 위 AL(#86) 스퀘어시 착지 후 real conflict → 병합 거부.
동시 접수 결함 2건 (test-portal #87 상세에 storeport #87 결과 표시 · 도장 직후 auto-merge
"not mergeable" 항상 실패) 로 인해 AM 브랜치 자기 검증 자체가 무의미 → **AM 착지 前에 결함
회수 · main 정합 · 재실기** 로 라운드 성격 재정의.

## AN-1 · fetch + merge origin/main (rebase 아님) · 파일별 해소

`git merge origin/main` (base = main@fcc827db) 결과 conflict 6 파일. 파일별 처리 명세:

### `src/routes/+layout.svelte` — 수동 해소 (AM 승 + AL 인프라 흡수)
- **AM 승 (탭 폐지)**: `.bottom-tabs` fixed nav 및 `.tab` 스타일 4종 폐기 (Kyu 09-04 정본).
- **AL 흡수**: `max-width 480` · `InstallPrompt` · `kit-tokens.css` 임포트 · scroll-area
  padding-bottom safe-area only 유지 (AL Primer palette 정합).
- **폐기**: AL 시절 하단 알약 바 (fixed center · box-shadow) `.pill-bar`, `.bottom-tabs`.

### `src/routes/+page.svelte` — AM 승 (`git checkout --ours`)
- **AM 승**: home 3-sections (todo/recent/hub) + [⚙] settings · `data-testid` · `hubExpanded` ·
  `INBOX_MAX_INLINE=5` · `RECENT_MAX=10` 유지 (Kyu 09-04 정본).
- **AL 폐기**: 인박스 필터 chips (`전체/승인/도장/실기`) · 4구역 판정 뱃지 스캐폴딩 폐기
  (탭 폐지 → 3구역 정본으로 흡수 완료).

### `e2e/portal-smoke.spec.ts` — AM 승 (`git checkout --ours`)
- **AM 7 tests 유지**: (a) home 3sections · (b) detail push · (c) sticky bar · (d) sheet open ·
  (e) history.back · (f) auto-merge toggle · (g) URL reload.
- **AL 5 tests 폐기**: 필터 칩 · 알약 바 관련 시나리오 (탭 폐지 후 회귀 대상 아님).

### `e2e/screenshots/` — 파일 단위 결정
- **AM 유지**: `a-home-3sections.png` ~ `g-detail-reload.png` (7장 · 신 스샷).
- **AL rm**: `01-inbox.png` · `02-inbox-empty.png` · `03-pr-list.png` · `04-pr-row-pill.png` ·
  `05-hub.png` (탭 UI 근거 · AM 대체됨).

### `docs/SPEC.md` — 병존 (양쪽 살림)
- **§ 20 AL 시각 레이어 · § 21 AM 정보 구조 · § 22 AM Motion Grammar** 3절 모두 유지.
- Changelog v1.53 (AL) + v1.54 (AM) 병존 · 이번 라운드에서 v1.55 신설 (§ 5.6 mergeStateStatus).

### `docs/design/kyu-orchestrator-v0.3.md` — 병존
- **§ 9.30 (AL 시각 레이어 착지) · § 9.31 (AM 정보 구조 착지)** 모두 유지 · 순서 논리적.

### `docs/requirements-tracking.md` — HEAD (AM) 승 + K53 축약
- HEAD 원장 (K53 short + K54 detailed + K0-0904-AM 이연 순증감 block) 유지.
- origin/main K53 상세본 (AL 시각 레이어 상세) → 요약본으로 통합 · K54 AM 원장 병렬 표기.

**커밋**: `536f408` (merge commit · docs-only body).

## AN-2 · owner/repo/number 복합키 전면 감사 + 회귀 테스트

### 뿌리 확증 (Kyu 09-07 실측)
- **결함**: test-portal #87 상세 열기 → "제출 결과" 블록에 storeport #87 (08-24 merged ·
  `f6e3a40c`) 결과 표시. "미판정 8건" 팝업도 동일 뿌리 (case 상태를 잘못된 PR 에서 읽어 0/8).
- **뿌리 위치**: `src/lib/draft.ts` `KEY_PREFIX = 'test-portal:draft:v1:'` +
  `RESULT_KEY_PREFIX = 'test-portal:submit-result:v1:'` = 키에 **PR 번호만** (숫자) 포함 ·
  owner/repo 부재 → 같은 번호가 두 리포에 있을 때 localStorage 값 충돌.

### D1 스키마 감사 결과 (문제 없음)
- `case_state` PK = `(repo, pr_id, case_id)` — repo 컬럼 존재 · `project.repo` (owner/name) 저장.
- `case_catalog` PK = `(repo, case_id)` — 동일.
- `case_run.repo` + append-only — 동일.
- `approvals` PK = `id` (hub/round scoped · PR 무관).
- **결론**: D1 는 처음부터 owner/repo/pr 복합 정본 · 결함 없음. 뿌리 = localStorage 전용.

### grep 결과 (single-number PR 쿼리 0건)
```
$ grep -rn "WHERE pr_id\|WHERE.*pr_id" src/ | grep -v ".test."
src/lib/case-state-store.ts:98: WHERE repo = ? AND pr_id = ?
```
= 유일 SELECT `case_state WHERE pr_id` 이 **이미 repo 명시** · 순수 pr_id-only SELECT 없음.

### 정본 (v2 승격)
- `Draft` interface 확장: `owner: string` + `repo: string` + `pr_id: number` + `schema_version: 2`.
- `draftKey(ref: PrRef)` = `test-portal:draft:v2:${owner}/${repo}/${pr_id}`.
- `submitResultKey(ref: PrRef)` = `test-portal:submit-result:v2:${owner}/${repo}/${pr_id}`.
- `loadDraft` 방어 = 키 정합 이후 payload owner/repo/pr_id 재확인 (파일 이동 시 null).
- v1 잔여 localStorage 항목 = 유령 (Kyu 단일 사용자 · 자동 폐기).

### 회귀 테스트 (Kyu 요구 = "같은 번호가 두 리포에 있을 때 재현")
`src/lib/draft.test.ts`:
```
it('같은 PR 번호 · 두 리포 · 격리 저장 (오염 없음)', () => {
  const REF_A = { owner: 'CuriocityDevAi', repo: 'test-portal', pr_id: 42 };
  const REF_B = { owner: 'CuriocityDevAi', repo: 'storeport', pr_id: 42 };
  saveDraft({ ...emptyDraft(REF_A), verdict: 'pass', verdict_reason: 'A OK' });
  saveDraft({ ...emptyDraft(REF_B), verdict: 'fail', verdict_reason: 'B FAIL' });
  expect(loadDraft(REF_A)?.verdict).toBe('pass');
  expect(loadDraft(REF_B)?.verdict).toBe('fail');
});

it('같은 PR 번호 · 두 리포 · submitResult 격리 (K0-0907-AN-2 회귀)', () => {
  saveSubmitResult(REF_TP, { verdict: 'pass', mark: 'test-portal-side' });
  saveSubmitResult(REF_SP, { verdict: 'fail', mark: 'storeport-side' });
  expect(loadSubmitResult(REF_TP)).toEqual({ verdict: 'pass', mark: 'test-portal-side' });
  expect(loadSubmitResult(REF_SP)).toEqual({ verdict: 'fail', mark: 'storeport-side' });
});
```

**단위 테스트 통관**: `pnpm test -- draft` = 28 passed (기존 18 + AN-2 신규 2 회귀 + 8 API 계약).

## AN-3 · 도장 직후 머지 재시도 (2·4·8 · BEHIND 재도장 · DIRTY 수동)

### 뿌리 (Kyu 원문 · 실측)
> "성공 판정 도장 직후 auto-merge 는 항상 실패한다 (GitHub mergeable 계산 지연)"

- 도장 (`kyu-gate check_run`) POST 성공 직후 `PUT /pulls/N/merge` 시도 = **HTTP 405** ·
  `Pull Request is not mergeable` (GitHub 아직 mergeable 계산 미완).
- 기존 코드 = 즉시 실패로 취급 · fallback 코멘트 append · Kyu 수동 병합 필요.

### 정본 (Kyu K0-0907-AN-3)
**`src/lib/merge.ts` 확장**:

1. **`fetchPrMergeState(token, owner, name, prNum)`** = `GET /pulls/N` · 응답의 `mergeable` +
   `mergeable_state` 정규화 반환. Un**k**nown values → `'unknown'` 폴백.
2. **`updatePrBranch(token, owner, name, prNum, expectedHeadSha)`** = `PUT /pulls/N/update-branch` ·
   BEHIND 상태 → base 반영. GitHub 응답 = 202 Accepted · `expected_head_sha` 명시 (race 방지).
3. **`mergeWithRetry(token, input, opts, fetchImpl)`** = 조율자:
   - (1) 즉시 병합 시도.
   - (2) 실패 kind ∈ {`not_mergeable` (405), `conflict` (409)} = 폴링 진입. 그 외
     (`unauth`/`not_found`/`api_failed`) = 즉시 return (재시도 무의미).
   - (3) delays [2000, 4000, 8000] ms 순회 · sleep 후 `fetchPrMergeState` 조회 · 3분기:
     - `clean` · `unstable` · `has_hooks` = 재-merge 시도 (성공 종결 · 실패 = 다음 delay).
     - `behind` = `restamp_required` (상위 orchestrator 처리).
     - `dirty` = `failed` + `reason='dirty'` (수동 안내).
     - `blocked` = `failed` + `reason='blocked'` (필수 체크 미통과).
     - `draft` = `failed` + `reason='draft'`.
     - `unknown` = 다음 delay 로.
   - (4) 모든 delay 소진 = `timeout` 실패.
4. **`mergeRetryFailureLabel(outcome)`** = 3분기 사람말 문구 반환 (`headline` + `guidance`).

**`src/lib/submit.ts:tryAutoMerge` Phase 2 (BEHIND 재도장)**:

- `mergeWithRetry` 결과가 `restamp_required` = `updatePrBranch` 호출 (`expected_head_sha`
  명시 · race 방지) → `stampKyuGate` **재도장** (새 HEAD SHA 위에 · Kyu 정본) →
  `mergeWithRetry` 재호출 (재도장 후 즉시 · attempts 누적).
- 재도장-재-BEHIND (동시 push 의심) = timeout 처리 · 무한 루프 방지.
- 응답 필드 = `merge_restamped=true` + `merge_new_head_sha=<sha>`.

**응답 필드 확장** (`SubmitResult`):

- `merge_failure_reason`: `'dirty'|'blocked'|'draft'|'timeout'|'other'`
- `merge_mergeable_state`: MergeableState (진단)
- `merge_attempts`: 재시도 회수
- `merge_restamped`: BEHIND 재도장 발생 여부
- `merge_new_head_sha`: 재도장 대상 SHA

**UI 3분기 문구** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):

- `dirty` → **"병합 conflict · 터미널 해소 필요"** + `git fetch && git merge origin/main` 안내.
- `blocked` → **"필수 체크 미통과 · 자동 병합 불가"** + PR Checks 탭 안내.
- `timeout` → **"GitHub mergeable 판정 지연 · 시간 초과"** + 재판정 or 수동 안내.
- `merge_restamped=true` 시 재도장 배너 + 새 HEAD SHA 노출.

### 단위 테스트 (Kyu 요구 = 3분기 실 fetch mock · shape mock 금지)
`src/lib/merge.test.ts` 신규 15:
- `mergeWithRetry`: 즉시 성공 · 405→unknown→clean 재-merge · BEHIND restamp_required · DIRTY ·
  BLOCKED · unknown timeout · unauth 즉시 실패 (재시도 없음).
- `updatePrBranch`: 202 정상 · 409 conflict.
- `fetchPrMergeState`: CLEAN 정규화 · 알 수 없는 state → unknown 폴백.
- `mergeRetryFailureLabel`: dirty · blocked · timeout · draft 문구 · 3분기 keyword 확증.

**단위 테스트 통관**: `pnpm test -- merge` = 46 passed (기존 30 + AN-3 신규 16).

## AN-4 · 자기 검증 결과

```
pnpm check         → 999 FILES 0 ERRORS 0 WARNINGS
pnpm test          → 67 files · 922 tests passed
pnpm build         → adapter-cloudflare · done
pnpm exec playwright test → 7 passed (10.0s · chromium-phone 390×844)
```

- Playwright smoke 7 (a-g) 전량 재통과.
- vitest 922 (기존 904 + AN-2 draft 확장 3 + AN-3 merge 15).
- AN-2 회귀 테스트 = 같은 PR 번호 두 리포 격리 확증 (draft.ts + submit-result 각 1건).
- AN-3 단위 테스트 = mergeStateStatus 3분기 별 실 fetch mock 통관 (CLEAN · BEHIND · DIRTY ·
  BLOCKED · timeout · unauth).

## GitHub mergeable 상태 (라운드 마감 시점 관측)

- PR#87 merge commit `536f408` push 후 auto-deploy 대기 · Kyu 대시보드 확증 필요.
- 자체 관측 (K0 툴체인 미접근) = GitHub CLI 없음 · Kyu 실기 시점에 상세 페이지 배지 관찰 필수.

## Kyu 다음 실기 (라운드 마감)

**PR#87 다시 성공 판정 → auto-merge 되는가**

절차:
1. 배포 완료 후 (Cloudflare Workers Builds auto-deploy 통상 1-3분 · SHA `536f408` 반영 확인)
   `test.curiocity.company` 접속.
2. `[할 일]` 인박스 or `[PR]` 목록에서 PR#87 진입 (**AM 홈 3구역 정본** · 하단 탭 없음 확증).
3. 8 케이스 전량 P 판정 → PR 종합 판정 = `[성공]` → auto-merge 토글 ON (기본 ON) → [제출].
4. 관측 목표:
   - `⏳` 배지 표시 후 **3분기 문구 없이 ✅ 병합 완료** 로 정착 (mergeWithRetry 성공 시).
   - or `BEHIND` 재도장 배너 표시 + 새 HEAD SHA 노출 후 ✅ 병합 완료.
   - **DIRTY 문구가 뜨면** = 실제 conflict 존재 (재발 · 로컬 해소 필요 · 별건 라운드).
   - **timeout 문구가 뜨면** = GitHub mergeable 판정 지연 (재판정 or 재시도).

Kyu 회신 시 다음 라운드 진입 (완료 / 결함 지적 / 심문).

## 파일 변경 요약

- 신규: 0
- 수정: `src/lib/draft.ts` (v1→v2 · owner/repo/pr_id 복합키) · `src/lib/merge.ts`
  (mergeWithRetry · updatePrBranch · fetchPrMergeState · mergeRetryFailureLabel 신설) ·
  `src/lib/submit.ts` (tryAutoMerge Phase 1/2 재구성) ·
  `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (UI 3분기 문구 · 재도장 배너) ·
  `src/lib/draft.test.ts` (28 tests) · `src/lib/merge.test.ts` (46 tests) ·
  `src/lib/submit.test.ts` (emptyDraft 호출 형태 갱신) · `docs/SPEC.md` (§ 5.6 신설 · v1.55) ·
  `docs/requirements-tracking.md` (K55 추가) · `docs/design/kyu-orchestrator-v0.3.md` (§ 9.30/31 병존) ·
  `e2e/*` (AL 5장 rm · AM 7장 유지)
- 삭제: `e2e/screenshots/01-inbox.png`, `02-inbox-empty.png`, `03-pr-list.png`,
  `04-pr-row-pill.png`, `05-hub.png` (AL 스샷 · AM 대체).

## 커밋 흐름

1. `536f408` — Merge origin/main into feat/k0-0904-am-motion-grammar-home (K0-0907-AN-1)
   · docs 병존 · AM 승 파일별 명세.
2. AN-2/AN-3 커밋 = 별건 (아래 K0 커밋).

---

*정본 · K0-0907-AN · 자기 검증 통과 · Kyu 실기 확증 대기 (PR#87 auto-merge 재현).*
