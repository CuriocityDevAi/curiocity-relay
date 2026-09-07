---
round: K0-0907-AO
date: 2026-09-07
hub: K0 (test-portal)
kind: inquiry (CYCLE § ③-relay 정본 · K0-0807-T 편입 · 심문 게시 회신 대기)
base: main@96d8254 (K0-0904-AM squash 착지 · 2026-09-07 04:24 UTC · kyu-gate App PR#87)
branch: feat/k0-0907-ao-perf-and-defects (main@96d8254 에서 신설)
---

# K0-0907-AO 심문 · 회신 요청

Kyu 원문 = AO-1(상세 진입 5초 → 즉시 · 최우선) · AO-2(홈 복귀 2~3초 → 즉시) · AO-3(설정 시트 = 진짜 설정) · AO-4(체크리스트 소실 결함) · AO-5(AM 이연 · AP 분리 판단) + [DOC][BUILD][REPORT] + 성능 예산 400ms/200ms 명기.

CYCLE § ③ 심문 게이트 정본. 구현 착수 前 아래 (a)/(b)/(c)/(d) 회수 필요.

---

## 큐 · 원장 실측 (CYCLE § ② 정본)

**dispatch 큐** (`ls ops/dispatch/*/`):
- inbox 7: p2-2 · p2-3 · p2-4 · p2-5 · p2-6 · p5 · deeplink (전량 P2-P5 · AO 무관)
- await-kyu 1: p2-2-0-access (완결 · 정리 대상)
- active 0

**EPIC-STATE Active** (2건 · 이번 AO 편입 대상):
- P2 · 포털 UI · SUBMIT live 봉인 해제 · last_touched=2026-07-29 (**STALE 41일**)
- K33 · 모바일·데스크톱 사용성 · last_touched=2026-07-29 (**STALE 41일**)

**AO 스코프 근거 SPEC 인용** (요약 금지 · 정본 인용):
- SPEC § 4 상세 화면 · § 4.4 하단 고정 바 · 제출 가드
- SPEC § 21 홈 3구역 (K0-0904-AM · 홈 단일 스크롤)
- SPEC § 22 Motion Grammar v1 · 3 계층 (홈 · 시트 · Push)
- SPEC § 6.1 실기 체크리스트 = 기계 판독 YAML (**AO-4 회귀 방지 대상**)
- SPEC § 3 원칙 = **저장 = GitHub · 자작 최소** (AO-1 SWR 캐시 정합 심문 대상)

---

## (a) 확인 질문 · 모호점

### a-1 · AO-1 캐시 구현체 선택 (K0 판단 필요 · Kyu 확정 요청)

Kyu 원문: "GitHub 응답을 **KV 또는 메모리**에 SWR (30s fresh · 5m stale) · ETag 활용".

**충돌** (CLAUDE.md § 3 3항 · SPEC § 1 원칙):
> "DB 신설 금지 (임시 캐시)". K0-0807-U 예외 = 오케 승인 큐 = **정본 상태만** D1 채택.
> **임시 캐시 = 지양 정본 유지**.

- **KV 신설 = 새 자원 도입** · CLAUDE.md § 3 [PLAN-OSS] 게이트 통과 필요.
- **in-memory 캐시** = Cloudflare Workers 다중 isolate 격리 하 인스턴스 간 값 다름 → race (K0-0807-U 뿌리 재현) · 강한 SWR 정본 안 됨.
- **대안 = Cloudflare fetch Cache API (표준)** · Workers 자체 캐시 · zero self-managed 자원 · Cache-Control 헤더로 자동 활용 · rate limit 완화.

**K0 권고 A (자작 최소 정본 정합)**:
- 서버 (Workers) = `Response` 헤더 `Cache-Control: public, max-age=30, s-maxage=30, stale-while-revalidate=270` 명시 · Cloudflare edge cache 자동 SWR.
- 클라이언트 = 인-메모리 스토어 (Svelte `$state`) + 명시적 invalidate (판정 제출 후). SWR 정본은 브라우저 fetch cache + `Cache-Control` 상속.
- ETag = 자연스레 활용 (GitHub REST 응답에 `ETag: W/"..."` 포함 · Cloudflare Cache API 자동 처리).

**K0 권고 B (Kyu 원문 KV 채택 시 [PLAN-OSS])**:
- `docs/plans/PLAN-OSS-swr-cache-kv.md` 신설 · CLAUDE.md § 3 정본 개정 (K0-0807-U 방식). 규모 = ½일 (KV binding + 캐시 wrapper + 무효화 API). 정본 소비 = /api/prs · /api/pr-cases · /api/pr-status.

**Q-cache**: **A (Cache API · 자작 최소)** vs **B (KV · [PLAN-OSS] 게이트)**?

### a-2 · AO-1 목록 → 상세 요약 전달 방식

Kyu 원문: "목록에서 넘겨받아 바로 그리고 · 스토어/goto state 로".

**SvelteKit 옵션**:
- (a) 앱-level Svelte store (`src/lib/pr-cache.ts`) · 홈/목록에서 fetch 결과 store 저장 · 상세 mount 시 `store.get(slug, id)` = 즉시 그리기.
- (b) `goto(url, { state: portalPR })` = HTML5 history state · 상세 `page.state` 접근. Svelte 5 안 정본 = history state API.
- (c) SvelteKit `$page.data` = `+page.ts` load 반환값 · 홈에서 미리 fetch 하여 넘김 (routing 재편 필요).

**K0 권고 = (a) 스토어**. 이유: 여러 진입 경로 (홈 · 목록 · 딥링크) 통합 · 스토어 자체가 SWR 캐시 정본 · 딥링크 진입 시 store miss = fetch 후 저장. `+page.ts` load = 서버 fetch 병렬화 (Promise.all + streamed promises) 별건 정합.

**Q-store**: (a) 스토어 정본 · (b) history state · (c) load fn 셋 중 확정?

### a-3 · AO-3 시트 내부 항목 최종 목록

현행 `/settings/+page.svelte` (897 라인 · K0 실측) 안 3 섹션:
- (1) **자동 승인 스위치** (K0-0904-AI-4 · 실험 · 기본 OFF)
- (2) **kyu-bridge 온보드** (K0-0807-Z · localStorage 토큰 · base URL)
- (3) **프로젝트 레지스트리** (등록 목록 · [+ 새 프로젝트] · 삭제)

Kyu 원문 = "자동 승인 스위치 · 브리지 토큰 · 저장소 목록 등 설정 본체". "등" 이 (3) 레지스트리 CRUD 편입인지, 표시만인지?

**K0 판단**:
- 시트 = 조작 UX (스위치 · 텍스트 입력 · 목록) 는 편입. **레지스트리 CRUD 폼 (신 프로젝트 추가) 이 시트 안에서 세로 400+ 라인은 UX 부담** → CRUD 폼은 목록 아래 별도 [+] Push page 로 이관? 아니면 시트 안 접이식?
- `/settings` 라우트 폐지 (Kyu 원문 = 폐지 or 얇은 wrapper).

**Q-settings**: 시트 안 편입 범위 = **(1)+(2)+(3) 표시+CRUD 전체** vs **(1)+(2)+(3) 표시만·CRUD 는 Push page** 중?

### a-4 · AO-4 뿌리 확증 (이미 특정 완료 · Kyu 승인 요청)

**K0 실측 (2026-09-07 · gh pr view 87 body)**:
- PR#87 body 86 라인 안 `test-checklist` 문자열 = **0건** (`grep -c test-checklist`)
- ` ```yaml ` fenced block = **0건** (`grep -c yaml`)
- 파서 (`src/lib/parser/test-checklist.ts:51`) = `/```(?:yaml|yml)?\s*\n([\s\S]*?)\n```/g` fenced yaml block 만 스캔 · body 안 fenced yaml 부재 = case 0.

**확정**: AN 라운드 `gh pr edit --body "$(cat <<'EOF'...EOF)"` 로 body 를 통째로 재작성 · 원본 (AM 시점) test-checklist yaml fenced 블록 소실.

**PR#87 이 이미 병합됐지만 body 편집 가능** (GitHub 정책). Kyu 실기 재현 원본 확보 위해 편집 필요?

**재발 방지 (K0 권고 · Kyu 승인 요청)**:
- (i) **K1 어설션 신설** (`tools/regression-runner/assertions/test-portal/ao4-pr-body-checklist.mjs`) · PR body 안 test-checklist yaml fenced block 존재 · CI matrix 편입 (pull_request event) · 없으면 fail.
- (ii) **CLAUDE.md § 5 신규 gotcha** 신설 · "gh pr edit --body 시 test-checklist 블록 보존 의무" 항목 (§ 5.17 예상).
- (iii) **`ops/gh-body-editor.mjs` 신설** (K0 세션 소비 도구) · 기존 body 안 test-checklist block extract → 새 body 하단에 재삽입 · 자동 보존.

**Q-ao4-1**: PR#87 body 편집으로 원본 test-checklist 블록 복원할까? (Kyu 재현 확증 목적)
**Q-ao4-2**: 재발 방지 3방식 (K1 어설션 · CLAUDE.md gotcha · gh-body-editor 도구) 전량 편입? 일부만?

### a-5 · AO-5 AP 분리 판단 요청

Kyu 원문: "과대하면 AP 로 분리 보고". K0 규모 산정:

- **PopMenu.svelte** (계층 1 · 필터 칩 `▾` 팝오버) = 신설 컴포넌트 · click-outside · Focus trap · 규모 ½일
- **DirtyGuard** = 사유·메모 입력 중 닫기 확인 · 규모 ¼일
- **중첩 푸시** (PR 상세 → 케이스 확대 · AM-3 잔여) = navStack 확장 · 규모 ½일
- **AM-4 이모지 → octicon 완결 · raw hex 0 · ALLOW_LIST 비우기** = @primer/octicons 소비 확장 · 검증 = al1 어설션 · 규모 ½~1일

**AO 스코프 합계** (AO-1~5 전량):
- AO-1 성능 = 2일 (스토어 + streamed promises + preload tap + Cache API + Playwright 성능 spec)
- AO-2 홈 복귀 = ½일 (스토어 재사용 + snapshot API)
- AO-3 시트 정본 = ¾일 (settings 이전 · CRUD Push page 판단 별건)
- AO-4 결함 = ½일 (뿌리 확증 완료 · fix + assertion)
- AO-5 이연 회수 = 2일 (Pop · Dirty · 중첩 · octicon)
- 합계 **~5.5일** · 1주 라운드 정본

**K0 권고**:
- **AO 스코프 = AO-1~4 + AO-5 부분 (raw hex 0 + ALLOW_LIST 비우기만)** = 3.5일.
- **AP 분리 = PopMenu · DirtyGuard · 중첩 푸시 · 이모지→octicon 완결** = 별건 EPIC.

이유: AO 는 성능 결함 + 설정 시트 + 체크리스트 회수 = **직접 UX 결함 회수 라운드**. AM 이연 (PopMenu · DirtyGuard · 중첩 · octicon) = 신규 UI 계층 · 스코프 팽창.

**Q-ao5**: AO 는 (AO-1~4 + raw hex 0) 로 좁히고 AM 이연은 AP 별건? 아니면 AO 안에 전량?

---

## (b) 충돌 · 중복 지적

### b-1 · 서버 load fn 부재 = SPEC § 5.1 정합 확인 필요

현행 상세 페이지 (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`) = `+page.ts` · `+page.server.ts` 부재. mount 안 client-side `loadPR()` = registry 조회 → `/api/prs?repo=<slug>` → `findPRInList` → `/api/pr-cases?repo=<slug>&pr_id=<n>` → `loadCaseStates` → `refreshPrStatusAfterSubmit` 순차. 4~5 회 왕복.

**AO-1 정본 = Promise.all + streamed promises** · SvelteKit `+page.server.ts` 로 이전 필요. 이 이전 = SPEC § 5.1 (제출 시 흐름 · 서버 시각) 도 무관 (서버 페이지 로드는 별건). 단, **환경 변수 소비 (env.GITHUB_TOKEN)** 는 서버 정본이 자연.

- Q-load: `+page.server.ts` 이전 = 착수 승인 요청. 대안 = 클라이언트 유지 + fetch 병렬화 (Promise.all 만) · 단순.

### b-2 · SWR 스토어 vs 승인 큐 D1 이중 정본 우려

승인 큐 = D1 정본 (K0-0807-U). AO 스토어 = GitHub 응답 캐시. 두 층 정합.

- 스토어 = GitHub `pulls.list` 응답 (`PortalPR[]`) · owner/repo 별 slot · 30s fresh · 5m stale.
- D1 = case_state (판정) · case_catalog (회귀 목록) · case_run (러너 이력) · approvals (오케 큐).

**충돌 없음**. 스토어 무효화 트리거 = "판정 제출" (Kyu 원문) · **어떤 store slot 무효화?** = 해당 PR 의 case_state (D1 자체 무효화 아님 · 스토어 안 case_state 캐시만) + 해당 PR 의 status (kyu_gate/merged).

**Q-store-inv**: 판정 제출 후 무효화 대상 = (i) 해당 PR 상세 slot 만, (ii) 해당 slug 전체 목록 슬롯 (`/api/prs?repo=<slug>` 재fetch)?

### b-3 · 하단 탭 폐지 (AM 정본) vs settings 시트 = navigation 정합

AM 정본 = 하단 탭 폐지 · 홈 단일 스크롤. Settings = 홈 상단 [⚙] 버튼 → BottomSheet (계층 2). 시트 안 설정 조작 = 정합 · **/settings 라우트 = 딥링크 진입만 처리?** or **완전 폐지 · [⚙] 만 접근 경로?**

- Q-settings-route: 폐지 or 얇은 wrapper (딥링크 진입 시 홈 goto + 시트 open)? K0 권고 = 얇은 wrapper (딥링크 · 북마크 정합 · SPEC § 4.4 permalink 원칙 정합).

---

## (c) 요구사항 반론

### c-1 · KV 캐시 = SPEC § 3 자작 최소 원칙 위배

Kyu 원문 "KV 또는 메모리" 중 KV 채택 시 [PLAN-OSS] 게이트 통과 필요. K0-0807-U 예외 = 정본 상태만 (승인 큐). 임시 캐시 = 지양 정본. Cloudflare fetch Cache API (표준 · zero self-managed) 로 SWR 목적 달성 가능 · KV 도입 = 오버스펙.

**K0 반론 = KV 도입 반대 · Cache API + 클라이언트 스토어로 대체**.

### c-2 · 성능 예산 400ms/200ms 측정 방식 반론 (Playwright 측정 유효성)

Playwright 로컬 dev 서버 측정 = 실제 사용자 폰 성능 (LTE · 4G) 과 편차 큼. K0 권고:
- Playwright 측정 = **개발 정합 기준** (regression detector · 예산 초과 시 CI fail).
- **Kyu 폰 실기** = 최종 확증 (K0-0907-AO-report.md 안 측정값 3개 + Kyu 회신).
- 성능 예산 SPEC § 편입 시 "개발 정합 기준 · 실 폰 확증 별건" 명기.

### c-3 · idle 프리페치 상위 5행 = GitHub API rate limit 정합

GitHub REST rate limit = 5000/h (user token). 홈 방문 시 5행 prefetch (`/api/prs?repo=<slug>&pr_id=<n>` 5회) × 홈 방문 5회/시 = 25 req/hr · 무해. **채택 반대 없음**. 단 preload dedupe 필수 (스토어 hit 시 skip).

---

## (d) 역제안

### d-1 · SPEC 성능 예산 § 위치 = § 4.5 신설 or § 22 추가

Kyu 원문 = "SPEC 에 '성능 예산: 상세 첫 페인트 400ms · 홈 복귀 200ms' 명기". K0 권고 = **§ 4.5 신설** (SPEC § 4 상세 화면 하위) · 상세 페이지 스코프 명확. § 22 Motion Grammar 는 애니메이션 duration (SHEET_PRESENT_MS 420 등) 정본 · 예산은 다른 축.

- Q-spec-loc: § 4.5 (상세 하위) or § 4.6 (상세 하위 별건) or § 23 (신설 · 성능 예산 통합)?

### d-2 · 판정 제출 후 캐시 무효화 = 클라이언트 명시적 (webhook 별건 P4)

Kyu 원문 "판정 제출 후 해당 PR 캐시 무효화". K0 정본 = **submit 성공 후 클라이언트 스토어 slot invalidate + refetch**. GitHub webhook 소비 = P4 후 별건 (지금 인프라 없음).

- Q-invalidate: 명시적 클라이언트 트리거 채택?

### d-3 · Playwright 성능 spec 위치 = `e2e/portal-perf.spec.ts` 신설

기존 `portal-smoke.spec.ts` 는 UI 존재/렌더 검증 · 성능은 별건 파일 정본. K0 권고 = `e2e/portal-perf.spec.ts` 신설 · Kyu 성능 예산 assertion 편입 (400ms · 200ms · 케이스 렌더 별도 값).

- Q-perf-spec: `e2e/portal-perf.spec.ts` 신설 정본?

### d-4 · AO-4 검증 = 새 AO PR body 에 test-checklist yaml 8건 편입 · Kyu 폰 실기 확증

AO PR (신설) body = 반드시 test-checklist yaml fenced 8 케이스 (성능 3 · 시트 1 · 체크리스트 복원 1 · AM 이연 3) 편입 · Kyu 폰에서 상세 열어 케이스 렌더 확증. AO-4 fix + 재발 assertion 자체 확증도 편입.

---

## Kyu 회신 요청 항목 (총 9 · Q)

1. **Q-cache**: (A) Cache API · 자작 최소 vs (B) KV · [PLAN-OSS] 게이트?
2. **Q-store**: (a) 스토어 · (b) history state · (c) load fn 셋 중 정본?
3. **Q-settings**: 시트 편입 = 표시+CRUD 전체 vs 표시만·CRUD 는 Push?
4. **Q-ao4-1**: PR#87 body 원본 test-checklist 블록 복원?
5. **Q-ao4-2**: 재발 방지 = K1 어설션 · CLAUDE.md gotcha · gh-body-editor 도구 중 전량 or 일부?
6. **Q-ao5**: AO 스코프 = (1~4 + raw hex 0) 로 좁히고 AM 이연 은 AP 별건 or 전량 AO?
7. **Q-load**: 상세 페이지 = `+page.server.ts` 이전 or 클라이언트 유지 + fetch 병렬화?
8. **Q-store-inv**: 판정 제출 후 무효화 = (i) 상세 slot 만, (ii) 목록 slot 도?
9. **Q-spec-loc**: 성능 예산 SPEC § 위치 = § 4.5 or § 4.6 or § 23 신설?

---

## 대기 · 실행 계획 (Kyu 회신 후)

Q-cache · Q-store · Q-settings · Q-ao5 회수 → 착수. 나머지는 구현 중 사소 · 회신 없어도 진행 가능.

라운드 착지 인수 (Kyu 원문):
- [ ] 측정값 3개 (상세 첫 페인트 · 케이스 렌더 · 홈 복귀) 리포트 편입
- [ ] 설정 시트 스샷 (진짜 설정 · 시트 안 자동 승인/브리지/저장소 조작)
- [ ] 체크리스트 8개 복원 스샷
- [ ] 없으면 착지 아님 (Kyu 원문 · 자기 검증 blocker)

---

*정본 · K0-0907-AO-inquiry · CYCLE § ③-relay · Kyu 회신 대기.*
