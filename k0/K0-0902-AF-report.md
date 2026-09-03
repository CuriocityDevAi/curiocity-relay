# K0-0902-AF · 리포트 (AE 실기 결함 3 fix)

**round**: `K0-0902-AF`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/82
**branch**: `feat/k0-0902-af-render-progress-nav-fix`
**commit**: `a25f200`
**timestamp**: 2026-09-02

---

## 요약

**AE 실기 = 전 고리 실증 통과** (Kyu · PR#79 · commit `ff4c0f5c`):
- 파서 → D1 저장 → GitHub 박제 → kyu-gate check_run → auto-merge 전 고리 실증 통과.
- 카드에 테스트 개요 노출 · 상세 화면 D1 판정 이력 유지 · 폰↔맥 동기 정합.

**UI 사각지대 3 결함 회수** (AF 라운드):
- AF-1 목록 신 UI (필터 · 진행도 · 판정 완료 뱃지) 미표시
- AF-2 진행도 4/5 (5/5 저장 실제 · UI 반영 실패)
- AF-3 상세 화면 바탕 클릭 = 목록 이탈

---

## 뿌리 · 정본 조치

### AF-1 뿌리 (Kyu 요구 · 배포 번들 vs 렌더 조건 판정 명기)

**결론 = 번들 산출물 · 렌더 조건 아님 · 페이지가 다른 컴포넌트 소비**.

- `src/lib/PrList.svelte` = 필터 3종 · 진행도 · 판정 완료 뱃지 코드 존재 · 배포됨
- 조건부 렌더 (`prs.length > 0 && !loading && !failure` · `checklist_state === 'ok' && case_count > 0`) 정합
- **`src/routes/prs/+page.svelte` = 자체 카드 렌더** · `PrList.svelte` 미소비
- `PrList` 는 `src/routes/hub/[slug]/+page.svelte:317` 만 사용 · AD/AE 라운드에서 `PrList` 편입 시 `/prs` 미갱신 = 사각지대
- Kyu 실기 = `/prs` = 홈 랜딩 → 사각지대 노출 (`/hub/[slug]` 는 봤다면 정상 표시)

**정본 조치**:
- `src/routes/prs/+page.svelte` 자체 렌더 폐기:
  - 삭제: `PortalPR` state · `loadPRs` · `ratio` · `sortedPRs` · `gateMeta` · `envMeta` · fallback-banner · ApiError render · cards render (100+ 라인)
  - 유지: 프로젝트 탭 UI · relay watcher 배지 · events panel · settings 링크
- 카드 렌더 = `<PrList repoSlug={activeSlug} />` 단일 소비
- CSS 100+ 라인 폐기 (0 warnings 확증)
- ratio (자동화 M/N · 이전 항상 0/N · 실 kind='auto' 없음) 폐기 → 별건 이연

### AF-2 뿌리

**두 소스 mismatch**:
- 하단 진행도 (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte:820`) = `evaluatedCount(draft.results)` = localStorage 이력
- D1 `caseStates` = 정본 (Kyu 감사 이력 · 폰↔맥 동기)
- 초기 로드 시 draft.results 는 localStorage · caseStates 는 D1 → mismatch
- Kyu 실측: 5 case pass · D1 = 5건 (audit caption 노출) · draft.results = 4건 (5번째 이미 저장됐지만 다른 이유로 draft 반영 안 됨) → 하단 4/5

D1 저장 성공 확증 = 5번째 audit caption "판정: pass · 결정 2026-09-02 09:51:28" 노출. → D1 안 5건 저장됨 · 뿌리 = 진행도 계산 draft.results 만 봄.

**정본 조치**:
- `src/lib/case-state-store.ts:113-150` **`computeCaseProgress(cases, caseStates)` 신설 · 단일 소스**
  - 반환 = `{ decided, pass, fail, total, allPass }`
  - **정본 = D1 caseStates** · `draft.results` = 편의 view (setCase 낙관적 반영 · 정본 아님)
  - `allPass = total > 0 && pass === total && fail === 0` (kyu-gate 반자동 도장 활성 조건)
- 상세 화면 (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte:820-823`):
  ```typescript
  const caseProgress = $derived(computeCaseProgress(cases, caseStates));
  const totalCases = $derived(caseProgress.total);
  const evaluatedCases = $derived(caseProgress.decided);
  ```
- `loadCaseStates` 후 D1 → draft.results 동기화 (line 260-266 · submit 흐름 정합)
- `evaluatedCount` import 폐기 (line 63 · draft.results 소스 · caseStates 정본 단일 소스로 교체)
- **단위 테스트 신설** (`src/lib/case-progress.test.ts` · Kyu 원문 요구 · 8 종):
  1. 전항 pass = N/N · allPass=true (kyu-gate 활성 조건)
  2. Kyu 실측 재현 · 5/5 (이전 결함 = 4/5)
  3. 부분 판정 = M/N · allPass=false
  4. 재판정 pass → fail · fail 카운트
  5. fail 포함 (1 fail · 4 pass)
  6. 빈 case 목록 = 0/0
  7. 미판정 잔존 = allPass=false
  8. cases 밖 case_state 무시 (외부 오염 방지)

### AF-3 뿌리

`src/lib/SheetPush.svelte:127`:
```svelte
<div
  class="sheet-push-backdrop"
  onclick={() => onclose?.()}      // ← 뿌리
  onkeydown={(e) => e.key === 'Enter' && onclose?.()}
  role="button"
  tabindex="-1"
>
```

데스크톱 max-width 720+ 에서 sheet 는 중앙 정렬 · sheet 좌우 backdrop 여백 노출 · Kyu 클릭 시 `onclose` → parent `goBack` → `history.back()` → `/prs` 이탈.

**정본 조치**:
- `src/lib/SheetPush.svelte:124` backdrop = 순수 시각 layer
  - 삭제: `onclick` · `onkeydown` · `role="button"` · `tabindex="-1"`
  - 유지: `class` · `aria-hidden="true"`
- 닫기 3 경로만 유효:
  - (a) ESC 키 (`onMount` 안 `window.addEventListener('keydown', onKey)` 유지)
  - (b) 좌측 가장자리 swipe-back (모바일 · touchstart/move/end)
  - (c) 상단 sticky 헤더 [← 목록] 버튼 (`.back-btn` 이미 존재 · line 884)

---

## 정본 파일

### 신설
- `src/lib/case-progress.test.ts` (Kyu 원문 요구 · 8 종 단위 테스트)

### 편입
- `src/lib/case-state-store.ts:113-150` — `computeCaseProgress` 신설 (단일 소스)
- `src/lib/SheetPush.svelte:117-131` — backdrop click 제거
- `src/routes/prs/+page.svelte` — 자체 렌더 폐기 · `<PrList />` 소비 · CSS 100+ 라인 폐기
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:53-54,63,260-266,820-823` — computeCaseProgress import · D1 → draft 동기화 · caseProgress derived · evaluatedCount import 폐기

### 문서
- `docs/SPEC.md` v1.48 (§ 11 변경 이력)
- `docs/design/kyu-orchestrator-v0.3.md` § 9.25
- `docs/requirements-tracking.md` K48 + AF 이연 순증감

---

## QC

- **pnpm check** = 982/0/0 (신설 후 무결 · CSS unused 21 warning 정리 완료)
- **pnpm test** = 62 files · 804 pass (기존 796 + case-progress 신설 8)
  - `src/lib/case-progress.test.ts` = 전항 pass N/N · Kyu 실측 5/5 재현 · 부분 · 재판정 · fail · 빈 · 미판정 · 외부 오염
- **pnpm build** = ✔ (adapter-cloudflare)
- **git** = clean · commit `a25f200`

---

## Kyu 실기 절 (self-contained · § 9.5 정합)

### 배포 완료 후 (auto-deploy)

1. Cloudflare Workers Builds 대시보드 · Deployments 새 버전 확증 (SHA = PR#82 merge 후)
2. `git ls-remote origin main` = 이 PR merge SHA 확증

### AF-1 확증 · 목록 신 UI 3종

3. `https://test.curiocity.company/prs` 접속
4. **필터 3 버튼 노출 확증**: [전체] [판정 대기] [판정 완료] · 기본=[전체] 활성 · count 뱃지
5. 필터 클릭 시 카드 목록 즉시 필터링 · localStorage 유지 확증
6. **카드 진행도 노출 확증**: 확인 항목 있는 카드 = "확인 N항 중 M 완료" 뱃지
7. **판정 완료 카드 뱃지 확증**: [판정 완료] 필터 안 PR (예: PR#79 · #80) 우상단 = "성공 · 2026-09-02"
8. 이 PR 카드 자체 (self-parsing) 정상 표시 확증

### AF-2 확증 · 진행도 5/5

9. 이 PR 카드 클릭 · 상세 진입
10. 5 case 모두 [통과] 탭 · 5번째 audit caption 노출
11. **하단 진행도 = 5/5 확증** (이전 = 4/5)
12. 새로고침 (F5) → 5/5 유지 확증 (D1 정본)
13. 폰에서 같은 PR 상세 조회 → 5/5 노출 (폰↔맥 동기)

### AF-3 확증 · 바탕 클릭 이탈 없음

14. 데스크톱 브라우저 창 너비 720+ 로 상세 진입
15. sheet 밖 좌우 여백 (backdrop · 어두운 반투명) 클릭 → **이탈 없음** 확증
16. [← 목록] 버튼 클릭 → 목록 이탈
17. ESC 키 누르기 → 목록 이탈 (기존 유지)
18. 모바일 (실기 시) 좌측 가장자리 swipe → 목록 이탈 (기존 유지)

---

## 이연 순증감

**AF 신규 이연**:
- **`/prs` 프로젝트 탭 안 ratio (자동화 M/N)** = 이전 항상 0/N (실 kind='auto' 없음) · AF 라운드에서 폐기 · SPEC § 3.3 재해석 or 실 kind='auto' 도래 시 재편 · 별건

**AF 이연 회수 = 없음**

**원장 총** = AE 이연 유지 (판정 완료 verdict 3분화 · 재판정 명시 · 컴포넌트명 heuristic) + K44/K45/AD-4/AD-6 재확증 + AF /prs ratio

---

## 다음 라운드 대비

Kyu AF 실기 회신 후:
- **AG (예상)** = AE 이연 회수 (판정 완료 verdict 3분화 · kyu-gate check_run 조회 배선)
- 또는 **AG** = AD-4 kyu-gate 반자동 도장 UI 완결 (Kyu 우선순위 판정 대기)
- 또는 **AG** = AF 실기 결함 회수 (또 다른 결함 노출 시)

Kyu 판정 대기.
