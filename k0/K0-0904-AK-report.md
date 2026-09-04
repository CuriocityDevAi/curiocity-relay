# K0-0904-AK · 리포트 (stale SHA 결함 fix + PR#85 정리)

**round**: `K0-0904-AK`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/85 (PR#85 에 이어 · Kyu 지시)
**branch**: `feat/k0-0904-ai-assertions-auto-approve` (rebased on main · commit `405258b`)
**timestamp**: 2026-09-04

---

## 요약

**AJ 이후 · Kyu 수동 PR#81 머지**. AI (PR#85) 는 PR#81 미머지 main 에서 분기 · 러너 껍데기 중복 신설.

**이 라운드**: PR#85 정리 (AJ-3 계획 그대로) + 근본 결함 fix (stale SHA · Kyu 실측 3회 반복).

---

## AK-1 · stale SHA 뿌리 확인 + fix

### 뿌리 파일:줄 (Kyu 요구 명기)

- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:154` = `fetch('/api/prs?repo=<slug>')` — 목록 스냅샷 fetch
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:155` = `pr = found` — 브라우저 상태 저장
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:721` = `head_sha: pr.head_sha || undefined` — 스냅샷 그대로 전송
- `src/lib/github.ts:135-165` `fetchOpenPRs` = 목록 시점 SHA 저장 · 재조회 없음

**판정 3회 반복 시나리오**:
- 브라우저 로드 (a21ace2 · 하루 전 SHA)
- Kyu 새 커밋 push (8826297)
- Kyu 판정 [제출] · 서버는 payload.head_sha=a21ace2 그대로 신뢰 · check_run 을 이 SHA 에 POST
- GitHub 는 새 HEAD (8826297) 에 required check 없음 → Expected · merge 409
- Kyu 판정 다시 [제출] → 같은 흐름 · 같은 SHA · 같은 실패

### 정본 조치 (SPEC § 5.2 신설)

**`src/lib/submit.ts`**:

```typescript
export function checkStaleHead(sentSha, latestSha): SubmitError | null {
  if (!latestSha) return null;      // 재조회 실패 = 스킵 (안전 폴백)
  if (!sentSha) return null;        // 신규 · 서버가 latest 채움
  if (sentSha === latestSha) return null;
  return new SubmitError('stale_head', ..., { latest_head_sha, sent_head_sha });
}

export async function fetchLatestPrHead(env, repo, prId): string | null {
  if (!env?.GITHUB_TOKEN) return null;
  const { Octokit } = await import('@octokit/rest');
  const client = new Octokit({ auth: env.GITHUB_TOKEN });
  const [owner, name] = repo.split('/');
  const res = await client.pulls.get({ owner, repo: name, pull_number: prId });
  return res.data.head?.sha ?? null;
}

export async function submit(payload, env) {
  if (SUBMIT_MODE === 'live' && env?.GITHUB_TOKEN) {
    const latest = await fetchLatestPrHead(env, payload.repo, payload.pr_id);
    const staleErr = checkStaleHead(payload.head_sha, latest);
    if (staleErr) throw staleErr;
    if (latest) payload.head_sha = latest;  // 서버 재조회 값 강제
  }
  return submitCore(payload, env, SUBMIT_MODE);
}
```

**`src/routes/api/submit/+server.ts`**:
- `err.kind === 'stale_head'` → HTTP **409** + `{ latest_head_sha, sent_head_sha }`

**UI (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`)**:
- 헤더에 `📌 판정 대상 커밋: <sha7>` 표시 (`data-testid="judgment-target-commit"`)
- 409 응답 시 `.stale-head` 배너 노출 · `[새로고침]` 버튼 (`data-testid="stale-head-banner"`)
- doSubmit 안 `res.status === 409 && body.error === 'stale_head'` 처리

### 회귀 테스트 (`src/lib/submit.test.ts`)

5 조건 조합:
1. sent = latest = 유효 (null)
2. latest 부재 (재조회 실패) = null (안전 폴백)
3. sent 부재 (신규) = null
4. **Kyu 실측 재현**: sent=`a21ace2c95c1` · latest=`8826297a26d0` → **SubmitError 'stale_head'**
5. 한 글자 차이도 stale (부분 일치 신뢰 금지)

---

## AK-2 · PR#85 정리 (AJ-3 계획 실행)

### rebase main

`git rebase origin/main` = **conflict 없음** (PR#81 K1 위에 얹혀 · 그 위 AI 커밋 · 자연 rebase).

### 삭제 4 (AI 뼈대 · K1 정본 중복)

| 파일 | 이유 |
|---|---|
| `config/regression-assertions.json` | K1 정본 = D1 case_catalog + 파일 존재 · JSON 중복 · 이중 관리 위험 |
| `tools/regression-runner/assertions/test-portal/ai1-auto-manual-badge-visible.mjs` | K1 러너 시그니처 호환 안 됨 (blocked 뼈대) |
| `tools/regression-runner/assertions/test-portal/ai4-auto-approve-rules-pure.mjs` | 동일 |
| `tools/regression-runner/assertions/test-portal/ai5-dedup-cleanup-idempotent.mjs` | 동일 |

### 재작성 3 (SPEC § 5.3 정본 = 파일 존재 여부)

**`src/lib/regression-assertions.ts`**:
```typescript
const assertionModules = import.meta.glob(
  '/tools/regression-runner/assertions/**/*.mjs',
  { eager: false }
);
const assertionSet: Set<string> = new Set(
  Object.keys(assertionModules).map(path => {
    const parts = path.split('/');
    return `${parts[parts.length-2]}:${parts[parts.length-1].replace(/\.mjs$/, '')}`;
  })
);
export function hasAssertion(repo: string, caseId: string): boolean {
  const slug = resolveSlug(repo);
  if (!slug) return false;
  return assertionSet.has(`${slug}:${caseId}`);
}
```

- Vite `import.meta.glob` = build 시점 catalog 자동 · Workers fs 부재 회피
- 새 어설션 파일 추가 시 rebuild 만으로 반영
- `/api/pr-cases` `automation_kind`·`kind_summary` · `github.ts` `auto_case_count`·`manual_case_count` = 이 함수 소비 · 로직 변경 없음

### 유지 8 (K1 무관)

- `src/lib/auto-approve.ts` + test (SPEC § 19 정본)
- `/api/approvals/dedup-cleanup/+server.ts` (승인 큐)
- `cleanupDuplicatePendings` (승인 큐)
- `humanizeHaltReason` (허브 사람 말)
- `hub/+page.svelte` 원문 접기
- `settings/+page.svelte` 자동 승인 스위치
- `PrList.svelte` `.row-kind` 카드 카운트
- `+page.svelte` `kindSummary` 상세 상단 요약

### 자체 어설션 1 실 작성 (Kyu 요구)

**`tools/regression-runner/assertions/test-portal/ak1-stale-head-guard-pure.mjs`**:
- K1 러너 시그니처 준수 (`CASE_META` export · `default async ({log})` · `{verdict, reason, fail_context}`)
- `src/lib/submit.ts` 안 `checkStaleHead` 4 조건 정본 문언 검증:
  - `if (!latestSha) return null` — latest 부재 폴백
  - `if (!sentSha) return null` — sent 부재 폴백
  - `if (sentSha === latestSha) return null` — 동일 SHA
  - `return new SubmitError('stale_head'` — stale 반환

이 어설션 파일 존재 = 이 PR 확인 항목 중 `ak1-stale-head-guard-pure` = 🤖 자동 표시.

---

## AK-3 · dedup-cleanup 실행

**시도**:
```
curl -X POST https://test.curiocity.company/api/approvals/dedup-cleanup
→ 302 Found (Cloudflare Access)
```

**결과**: Access JWT 필요 · K0 세션에서 실행 불가 · **미검증** (Kyu 실기 요구).

**Kyu 실기 절차**:
1. 브라우저에서 Access 로그인 후
2. DevTools console 에서 `fetch('/api/approvals/dedup-cleanup', { method: 'POST' }).then(r => r.json()).then(console.log)`
3. 결과 `{ok, removed: N, groups: M}` 확증
4. 재실행 시 `{removed: 0, groups: 0}` (idempotent 확증)

---

## 정본 파일

### 신설
- `tools/regression-runner/assertions/test-portal/ak1-stale-head-guard-pure.mjs` (K1 시그니처 · 실 어설션)

### 편입
- `src/lib/submit.ts` (checkStaleHead + fetchLatestPrHead + submit 재조회)
- `src/lib/submit.test.ts` (5 stale_head 회귀 테스트)
- `src/routes/api/submit/+server.ts` (409 응답)
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (헤더 SHA + .stale-head 배너)
- `src/lib/regression-assertions.ts` (Vite glob 재작성 · SPEC § 5.3 정본)

### 삭제
- `config/regression-assertions.json`
- `tools/regression-runner/assertions/test-portal/ai1-auto-manual-badge-visible.mjs`
- `tools/regression-runner/assertions/test-portal/ai4-auto-approve-rules-pure.mjs`
- `tools/regression-runner/assertions/test-portal/ai5-dedup-cleanup-idempotent.mjs`

### 문서
- `docs/SPEC.md` v1.52 + **§ 5.2 (제출 시점 HEAD 재조회 정본)** + **§ 5.3 (어설션 정본 = 파일 존재)**
- `docs/design/kyu-orchestrator-v0.3.md` § 9.29
- `docs/requirements-tracking.md` K52 + AK 이연 순증감

---

## 자기 검증 (Kyu 승인 규약 A · 2 라운드 · 필수)

### (a) 러너 로컬 실행 ✅ **PASS**

```
./tools/regression-runner/bin/seed-catalog-tmp --repo todoboss --print-json > /tmp/reg-todoboss.json
./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
→ pass 5 · fail 0 · blocked 0 · exit 0 ✅

REG_C3_SIMULATE_REGRESSION=1 ./tools/regression-runner/bin/regression-runner --repo todoboss --catalog-file /tmp/reg-todoboss.json
→ pass 4 · fail 1 (attendance-second-precision) · blocked 0 · exit 1 ✅

./tools/regression-runner/bin/seed-catalog-tmp --repo test-portal --print-json > /tmp/reg-testportal.json
./tools/regression-runner/bin/regression-runner --repo test-portal --catalog-file /tmp/reg-testportal.json
→ pass 2 (ak1-stale-head-guard-pure + migration-case-state-pk-preserved) · exit 0 ✅
```

### (b) Playwright MCP/CLI 스샷 ⚠ **미검증**

**사유**: K0 세션 환경에 Playwright MCP 도구 부재.

**다음 라운드 재요청**: 로컬 dev 서버 실행 + Playwright CLI 로 로그인 없이 스샷 캡처 (Access mock or bypass 필요).

**대안 (부분 검증)**:
- 위 러너 어설션 (`ak1-stale-head-guard-pure`) 는 `submit.ts` 소스 파일 안 정본 문언 존재를 검증 → pass
- 실제 브라우저 렌더링 확증은 Kyu 실기로 대체 (배포 후 상세 진입 → SHA 표시 · stale 배너)

### (c) CI 초록 ⚠ **push 후 실측 필요**

**사유**: 이 라운드 마감 시점 push 후 CI 실행 로그 미확보.

**push 완료**: `git push --force-with-lease origin feat/k0-0904-ai-assertions-auto-approve` → 405258b
**다음 검증**: `gh run list --workflow=regression.yml --limit 5` (push 후 몇 분 뒤)

---

## QC

- **pnpm check** = 996/0/0 ✅
- **pnpm test** = 67 files · 904 pass (기존 872 + AI 27 + stale_head 5) ✅
- **pnpm build** = ✔ (adapter-cloudflare) ✅
- **git** = clean · commit `405258b` · push 완료

---

## Kyu 실기 절

배포 후:
1. 이 PR 상세 헤더에 `📌 판정 대상 커밋: 405258b` 노출 확증
2. 확인 항목 중 `ak1-stale-head-guard-pure` = 🤖 뱃지 확증
3. dedup-cleanup 실행 (DevTools console) 후 `{removed, groups}` 결과 확증
4. PR#85 auto-merge 되는지 확증 (Kyu 성공 판정 시)

---

## 이연 순증감

**AK 신규 이연**:
- **Playwright MCP 스샷** = 다음 라운드 (K0 세션 MCP 부재)
- **CI 초록 실측** = push 후 규정 이행 확증 (이 라운드 마감 시점 미실행)
- **dedup-cleanup 실 실행** = Access JWT · Kyu 실기 요구 (removed N 결과)

**AK 이연 회수**:
- **AJ-3 계획** = **회수** (AK-2 실행 완결)
- **AI-1 JSON catalog** = **폐기** (Vite glob 로 재작성 · K1 정본 일원화)

**원장 총** = AH-4 잔여 상세 병행 · AG-5 토큰 · AH-2 서버 fix · AI-2 러너 실행 · AI-3 카탈로그 승격 · AI-5 unverified · **AK Playwright 스샷 · CI 실측 · dedup-cleanup 실 실행**

---

## 다음 라운드 대비

Kyu AK 실기 회신 후:
- **AL (예상)**: Playwright MCP 스샷 재요청 or AI-2 러너 실행 or AI-3 카탈로그 승격
- 또는 **AL**: PR#85 auto-merge 확증 후 결함 회수 (또 나오면)

Kyu 판정 대기.
