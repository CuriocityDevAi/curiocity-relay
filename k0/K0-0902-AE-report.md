# K0-0902-AE · 리포트 (AD 실기 결함 3 fix + 개선 1)

**round**: `K0-0902-AE`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/80
**branch**: `feat/k0-0902-ae-verdict-filter-summary`
**commit**: `c459246`
**timestamp**: 2026-09-02

---

## 요약

**AD-1 배선 확증 (Kyu 실기 최초 성공)**: 카드에 테스트 개요 노출 · 파서가 실제로 확인 항목을 읽는 것 확증.

**결함 3 + 개선 1 회수** (Kyu 원문 그대로):
- **AE-1 결함** — 판정 완료 PR 목록 소멸 · 되돌리기/재확인 경로 부재
- **AE-2 결함** — 개요가 사람의 말 아님 (마크다운 · 커밋 해시 · 라운드 ID · 컴포넌트명 원문 덤프)
- **AE-3 확증 불가** — AD-1 파서 재확증이 PR#79 만으로 가능했는데 AE-1 로 사라짐
- **AE-4 개선** — 확인 항목 없음 안내에 다음 행동 · guide 링크 부재

---

## 뿌리 · 정본 조치

### AE-1 뿌리

`src/lib/github.ts:133` = `client.pulls.list({ owner, repo, state: 'open', per_page: 30 })`.
Kyu [성공] 판정 → auto-merge → GitHub state=closed → 다음 fetch 에서 `state:'open'` 필터가
배제 → 카드 목록에서 소멸 → Kyu 상세 진입 URL 도 못 찾음.

**정본 조치**:
- `github.ts:133-141` = `state: 'all', sort: 'updated', direction: 'desc', per_page: 30`
- `github.ts:60-72` PortalPR 4 신 필드 `pr_state · merged · merged_at · closed_at`
- `github.ts:155-160` fetchOpenPRs 응답 매핑 4 필드 편입
- `PrList.svelte:26-29` `filter` state (`'all' | 'pending' | 'decided'`) · `FILTER_STORAGE_KEY` localStorage 유지
- `PrList.svelte:120-190` `isDecided(pr)` · `sortedPRs` derived (필터 · 정렬) · `filterCounts` derived · `setFilter` · `decidedLabel` (merged→"성공 · date" · closed unmerged→"판정 완료 · date")
- `PrList.svelte:222-260` 필터 UI (3 버튼 + count 뱃지) + 빈 상태 [전체 보기] 폴백
- `PrList.svelte:274-283` 판정 완료 카드 `.decided-badge` (accent-bar/wait-badge 대체) · `.card.decided { opacity: 0.75 } :hover { opacity: 1 }`

**재판정 경로**: verdict 컨트롤 (`+page.svelte:1327-1354`) 은 무조건 활성 · closed PR 도 GitHub 코멘트 허용 · Kyu 재선택 후 [제출] 재발 가능. 명시적 [재판정] 배지는 다음 라운드 판정.

### AE-2 뿌리

`src/lib/parser/test-checklist.ts:140-152` extractSummary = 3 non-empty 라인 concat + '…' 컷.
Kyu 실측 PR#288:
> 세로 빙고 룰렛 최종 재설계 · Z-1 ~ Z29 + N0-0902-A/B · `4c2174e9` HEAD. · A-2 재작업 + 버그 2건 + 환경 1건: · **B-1 (A-2 재작업)** · 신규 카드 폐기 · 기존 PieFace 웨지 재사용 · 위치 분산 + 겹침 clamp.

마크다운 (`**` `` ` ``) · 커밋 해시 (`4c2174e9`) · 라운드 ID (`Z-1` · `N0-0902-A/B`) · 컴포넌트명 (`PieFace`) 그대로 노출.

**정본 조치**:
- `src/lib/parser/summary-sanitize.ts` **신설 · 유일 정본**
  - `stripMarkdownEmphasis` = ** __ ` * _ ~~ [text](url) heading bullet blockquote
  - `stripDevNoise` = 4 정규식 (순서 = 파일 → 브랜치 → 라운드 ID → 커밋 해시 · 오탐 회피)
    - `FILE_PATH_RE` = `(?:[\w./-]+\/)?[\w-]+\.(?:tsx?|jsx?|md|json|ya?ml|svelte|sql|mjs|cjs|css|html|py|rs|go)\b`
    - `BRANCH_RE` = `\b(?:feat|fix|docs|chore|refactor|test|hotfix|release|perf|style)\/[\w-]+\b`
    - `ROUND_ID_RE` = `\b(?:[A-Z]\d?-)?[A-Z]\d?\d?-\d{4}-[A-Z](?:-\d+)?\b|\b[A-Z]-\d{1,3}\b`
    - `COMMIT_HASH_RE` = `\b[a-f0-9]{7,40}\b`
  - `tidyPunctuation` = 중점 U+00B7 → 공백 · 여러 공백 통합 · 앞뒤 구두점 컷
  - `splitSentences` = 마침표/느낌표/물음표 뒤 공백 or 개행
  - 2-3 문장 컷 · MAX_SUMMARY_LENGTH 240
- `test-checklist.ts:140-155` extractSummary 재작성 · region → sanitize
- `test-checklist.ts:186-190` wrapped `test-checklist:` summary 도 sanitize 적용
- 신설 test 9종 (Kyu PR#288 재현 · 파일 · 브랜치 · 링크 · bullet · 4문장 컷 · 순수 노이즈 → '' · 짧은 한글)

### AE-3 조치

AE-1 fix 후 [판정 완료] 필터에서 PR#79 재열림 → 상세 진입 · 케이스 5개 노출 확증. **Kyu 실기 절**에 편입 (self-parsing 회귀 자체 확증 라운드).

### AE-4 조치

`src/routes/pr/[owner]/[repo]/[id]/+page.svelte` missing 안내 확장:
- missing 절 = `.missing-guide` = 3 라인 (강조 · 형식 예시 · guide 링크)
- malformed 절도 하단에 동일 guide 링크 append
- 링크 = `https://github.com/CuriocityDevAi/curiocity-relay/blob/main/pr-test-checklist-guide.md`

---

## 정본 파일 (신설 · 편입)

### 신설
- `src/lib/parser/summary-sanitize.ts` (98 라인 · 4 helper + 정본 함수)
- `src/lib/parser/summary-sanitize.test.ts` (신설 test 9종)

### 편입
- `src/lib/parser/test-checklist.ts:11-12,140-155,186-190` — sanitize import + extractSummary 재작성 + wrapped summary sanitize
- `src/lib/github.ts:60-72,132-144,155-160` — state='all' + PortalPR 4 필드 + 응답 매핑
- `src/lib/data-source.ts:88-92` — mock 4 필드 정합
- `src/lib/PrList.svelte:26-29,120-190,222-283,395-460` — 필터 UI + decidedLabel + 판정 완료 뱃지 + CSS
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:1184-1225,1785-1802` — missing-guide + malformed 링크 + CSS

### fixture
- `src/lib/pr-lookup.test.ts` — 4 신 필드 추가
- `src/lib/launcher.test.ts` — 4 신 필드 추가

### 문서
- `docs/SPEC.md` v1.47 (§ 11 변경 이력)
- `docs/design/kyu-orchestrator-v0.3.md` § 9.24
- `docs/requirements-tracking.md` K47 + AE 이연 순증감

---

## QC

- **pnpm check** = 981/0/0 (신설 후 무결)
- **pnpm test** = 61 files · 796 pass (기존 787 + sanitize 9)
  - `src/lib/parser/summary-sanitize.test.ts` = Kyu PR#288 재현 · 파일/브랜치/링크/bullet/4문장 컷/순수 노이즈/한글 짧은 요약
- **pnpm build** = ✔ (adapter-cloudflare)
- **git** = clean · commit `c459246`

---

## Kyu 실기 절 (self-contained · § 9.5 정합)

### 배포 완료 후 (auto-deploy)

1. Cloudflare Workers Builds 대시보드 → Deployments 새 버전 확증 (SHA = PR#80 merge 후)
2. `git ls-remote origin main` = 이 PR merge SHA 확증

### AE-1 확증

3. `https://test.curiocity.company/prs` 접속
4. 필터 3 버튼 확증: [전체] [판정 대기] [판정 완료] · 기본 = [전체]
5. [판정 완료] 클릭 → **PR#79** 재열림 확증 (이전에 사라졌던 PR)
6. PR#79 카드 우상단 = "성공 · 2026-09-02" 뱃지 확증
7. 다른 프로젝트 페이지 이동 후 재접속 → 필터 상태 유지 확증 (localStorage)

### AE-2 확증

8. grownest 실 PR (예: PR#288) 카드 개요 확증:
   - `**` · 백틱 · 중점 없음
   - 커밋 해시 (`4c2174e9`) 없음
   - 라운드 ID (`Z-1` · `N0-0902-A/B`) 없음
   - 컴포넌트명 (`PieFace`) 없음 (컴포넌트명 heuristic 은 제거 안 함 · 파일 확장자 있는 것만 · Kyu 원문 = "필요하면 접기 영역" · 별건 판정 대기)
   - 2-3 문장 평문 · 최대 240자

### AE-3 확증

9. [판정 완료] 필터 · PR#79 카드 클릭 · 상세 진입
10. 케이스 5개 노출 확증:
    - `self-parse` · `progress-badge` · `d1-persistence` · `fail-reason` · `launcher-button-ac1f`
11. 노출 안 되면 = 파서 회귀 · 별건 라운드

### AE-4 확증

12. 확인 항목 없는 PR 상세 진입 (docs-only 예: main 최근 docs PR)
13. "이 PR 에는 확인 항목이 없습니다" 강조 + 형식 안내 + guide 링크 노출
14. `pr-test-checklist-guide.md ↗` 클릭 → curiocity-relay GitHub 파일 열림 확증

---

## 이연 순증감

**AE 신규 이연**:
- **판정 완료 카드 verdict 실 3분화** (성공/실패/보류) · 현재 = merged→성공 · closed unmerged→"판정 완료" 라벨만 · 실 verdict = kyu-gate check_run 조회 배선 다음 라운드
- **재판정 명시적 안내 UI** = 현재 verdict 컨트롤 무제한 유지로 기능 정합 · Kyu 실기 후 명시적 [재판정] 배지 여부 판정 · 다음 라운드
- **컴포넌트명 heuristic 제거** (PieFace · PascalCase) = 현재 sanitize 는 파일 확장자 있는 것만 · Kyu 원문 = "필요하면 접기 영역" 별건 판정 · 다음 라운드 회부

**AE 이연 회수**:
- **AD-4 kyu-gate 완결 반자동 도장 UI** 유지 (별건 라운드)
- **AD-6 재확증** 유지 (Kyu AE 실기 답변 후 재실기 회부)

**원장 총** = K44 오케 확장 · K45 프리뷰 실기 · AD-4 · AD-6 재확증 · verdict 3분화 · 재판정 안내 · 컴포넌트명 heuristic

---

## 다음 라운드 대비

Kyu AE 실기 회신 후:
- **AF (예상)** = 판정 완료 카드 verdict 실 3분화 (kyu-gate check_run 조회 배선)
- 또는 **AF** = AD-4 kyu-gate 반자동 도장 UI 완결 (Kyu 우선순위 판정 대기)
- 또는 **AF** = AE 실기 결함 회수 (또 다른 결함 노출 시)

Kyu 판정 대기.
