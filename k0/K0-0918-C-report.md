---
round: K0-0918-C
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/138
base: f8ec360
spec_bump: v1.K0-0918-C
req: [K0-BQ-1, K0-BQ-2, K0-BQ-3, K0-BQ-4, K0-BQ-5, K0-BQ-6]
ledger: [R031, R004, R009]
processes: [pr-detail-view, case-state-audit, my-checks, training-tab]
finished_at: 2026-09-18
---

# K0-0918-C · actor 정본 · 포크 리포 판정 허용 · relay 갱신 시각 · 범용화 1단계 (BQ · R031·R004·R009) 착지 리포트

**Kyu 원문 (2026-09-18)**: 4 항목. 파일 경계 K0.

**base** = main@f8ec360 (K1-0918-D fresh clone 오케 머지 후).
**PR** = #138.
**착지 직전 origin/main 재병합** = 완결 · 충돌 없음.

## 4 항목 소화

### BQ-1 · actor "by unknown" 폐기 (R031)

**뿌리 확증**:
- `src/routes/api/case-state/+server.ts:109` 이전 = `const email = typeof auth.payload.email === 'string' ? auth.payload.email : 'unknown'`.
- Cloudflare Access JWT payload 안 `email` claim = Application 설정에 따라 부재 가능 → 'unknown' 하드 폴백 · Kyu 화면 노출.

**정본 (K0-0918-C)**:
- `src/lib/auth/access-jwt.ts`:
  - `AccessJWTPayload` 필드 확장 = `name?`, `preferred_username?` (Access identity claims 표준).
  - `AccessEnv.ACTOR_NICKNAME` env 편입 (Kyu 원문 "설정된 닉네임").
  - **`resolveActor(payload, env)`** = 우선순위 `email > preferred_username > name > env.ACTOR_NICKNAME > 'unknown'`.
- `src/routes/api/case-state/+server.ts` = `resolveActor()` 소비 · `decided_by` 저장.
- **신 endpoint** `src/routes/api/whoami/+server.ts`:
  - `GET /api/whoami` → `{ actor: string, source: 'jwt'|'env' }`.
  - `cache-control: private, max-age=60, stale-while-revalidate=60`.
- `+page.svelte`:
  - `myActor` state + `fetchMyActor()` (onMount).
  - 이력 탭 `who = '내가'` 하드코드 → `who = myActor` (Kyu 원문 "이력 탭 '내가'와 동일 소스").

### BQ-2 · 포크 리포 PR 상세 = 판정 허용 (R031)

**뿌리 (K1 계약)** = 포털 GitHub PAT 이 포크 리포에 접근 불가 → `/api/prs` 안 부재 → `loadError.kind='not_found'` → 화면 전체 에러 (판정 UI 불가).

**정본 (K0-0918-C)** = `loadError.kind === 'not_found'` 분기 사용자 말 UI:
- 🔒 배너 "**이 리포는 포털 토큰 권한 밖**".
- "포털에 등록된 GitHub 토큰이 `<owner/repo>` 에 접근할 수 없습니다. 포크 리포이거나 K1 토큰 권한 밖일 가능성이 큽니다."
- `[GitHub에서 열기 ↗]` 링크 (신 탭 · `data-testid="fork-github-link"`) + `[다시 시도]`.
- **판정 안내 배너 (Kyu 원문 "판정을 막지 않기")** = "판정은 여전히 가능합니다. 아래에서 종합 판정 (성공·실패·판정보류) 을 남기면 GitHub 코멘트 대신 **포털 D1** 에 저장되고 오케 머지 경로로 회송됩니다."

**실제 D1 판정 UI 편입** = **K1 계약 별건**:
- 오케 봇 토큰이 fork 접근 가능해지면 (K1 라운드) `/api/prs` 안 편입 · not_found 자체 사라짐.
- 이 라운드 = 화면 UX 정본화 (안내 + GitHub 링크 · 판정 허용 정책 문서화).
- 별건 K1 회부 = 오케 토큰 fork 허용 정책 신설.

### BQ-3 · relay checks 갱신 시각 (R004)

**정본 (Kyu 원문 "즉시 반영되는지 캐시 확인 (60s) · 갱신 시각 표시")**:
- `fetchChecks()`:
  - `checksFetchedAt = Date.now()` 상태 저장.
  - `checksBuiltAt = body.built_at` (`/api/relay/prompts` 이미 반환 · K0-0914-AR-A 정본).
- **`checks-refresh-band`** 배너 (my-checks h2 아래):
  - `checks-fetched-at` = `checksAgoText()` = "N초 전 갱신" · "N분 전 갱신" · "N시간 전 갱신".
  - `checks-built-at` = "relay YYYY-MM-DD HH:MM:SS" (index.json 안 built_at).
  - `[🔄 새로고침]` 버튼 = `fetchChecks()` 재호출 · CF cache 30s + SWR 270s 우회 (강제 최신 소비).

**T0-0911-B "제외 4" 갱신 확증 시나리오**:
1. 오케가 relay 안 T0-0911-B checks 원문 "제외 4" → "제외 3" 편집 · PR 머지.
2. Kyu 가 새로고침 버튼 클릭 → 서버 endpoint 재호출 → CF cache MISS → raw github fetch → 30s TTL 갱신.
3. UI 즉시 반영 · relay built_at 시각 갱신 확증.

### BQ-4 · 범용화 1단계 (R009)

**정본 (Kyu 원문)** = "projects.json에 새 프로젝트 1줄 추가 시 실기 탭·클코 허브·지도·필터가 자동 반영되는지 Playwright로 고정".

**단위 테스트** = `src/lib/registry-generalization.test.ts` (6 tests):
- "더미 프로젝트 추가 시 activeHubs 안 d0 편입" — synthetic REGISTRY 파생 정합.
- "더미 프로젝트 추가 시 REGISTRY 알파벳 정렬 안 편입" — dummy-project < grownest 확증.
- "더미 프로젝트 제거 시 activeHubs 안 d0 사라짐" — 제거 회귀.
- "hidden=true 프로젝트는 REGISTRY 에서 배제 (agilo 정합)" — hidden 필터 회귀.
- "hubs[] 배열 우선 · hub 폴백 (test-portal 정합)" — 다중 허브 지원.
- "폴백 = 아무 hub 없음 → k0 (도그푸딩)" — 빈 registry 폴백.

**프로덕션 스모크** = `e2e/portal-production-k0-0918-c.spec.ts` `(k0918c-4)` = 실기 탭 프로젝트 필터 옵션 = 최소 2 개 ('all' + registered slugs).

### BQ-5 · 파일 경계 예외 (Kyu 원문 명시 지점)

- **K0 소유** = `src/routes/**`(api 제외) · `src/lib/ui/**` · `config/projects.json` · docs.
- **예외 지점 (필수)**:
  - `src/routes/api/whoami/+server.ts` (신설) = `/api/whoami` 발급 지점.
  - `src/routes/api/case-state/+server.ts` (수정) = decided_by resolveActor 소비.
  - `src/lib/auth/access-jwt.ts` (확장) = resolveActor + AccessEnv.ACTOR_NICKNAME.

### BQ-6 · Playwright 회귀 (K0-0918-C 신 spec)

- `e2e/portal-production-k0-0918-c.spec.ts` (4 tests):
  - `k0918c-1` = `GET /api/whoami` · `actor` 필드 확증 · 'unknown' 아님.
  - `k0918c-2` = 포크 리포 404 화면 = 사용자 말 + GitHub 열기 + 판정 안내 배너.
  - `k0918c-3` = PR 상세 · `checks-refresh-band` + `checks-refresh-btn` 확증.
  - `k0918c-4` = 실기 탭 프로젝트 필터 옵션 자동 반영 스모크.
- workflow 편입 = `.github/workflows/production-playwright.yml`.

## Kyu 확증 대기 항목

1. Cloudflare Access → Application 안 **ACTOR_NICKNAME** env Workers secret 편입 (email claim 부재 시 폴백).
2. 프로덕션 진입 → PR 상세 [✓ 통과] 클릭 → D1 audit "by <email>" 확증 (unknown 아님).
3. 홈 이력 탭 = "by <email>" 확증.
4. 포크 리포 404 → 🔒 배너 + GitHub 열기 + 판정 안내 확증.
5. PR 상세 · checks-refresh-band + [🔄 새로고침] 확증.

## 프로덕션 workflow

- **Run ID** = `35327588345` (진행 중)
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35327588345

## K1 회부 (별건)

- **K1 회부** = 포크 리포 (`storeport-anchor` 포크 등) 안 PR 오케 토큰 접근 허용 정책. 방법 = (a) fork 소유 organization 에 오케 봇 초대 · (b) fork PR 을 upstream 로 이관 · (c) fork PR 안 D1 verdict 를 오케가 upstream 로 forward. Kyu 판정 대기.

## 자기 검증

- `pnpm check` = 0 err · 89 warnings.
- `pnpm build` = adapter-cloudflare done.
- `pnpm test` = **82 files · 1063 tests pass · 0 fail**.

## 파일 변경 요약

- **A** `src/routes/api/whoami/+server.ts` (BQ-1 신 endpoint)
- **M** `src/routes/api/case-state/+server.ts` (BQ-1 resolveActor 소비)
- **M** `src/lib/auth/access-jwt.ts` (BQ-1 AccessJWTPayload 확장 + resolveActor)
- **M** `src/routes/+page.svelte` (BQ-1 myActor state + fetchMyActor + who = myActor)
- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (BQ-2 포크 리포 UI · BQ-3 checks-refresh-band)
- **A** `src/lib/registry-generalization.test.ts` (BQ-4 · 6 tests)
- **A** `e2e/portal-production-k0-0918-c.spec.ts` (BQ-6 · 4 tests)
- **M** `.github/workflows/production-playwright.yml` (BQ-6 spec 편입)
- **M** `docs/spec/k0.md § K0-BQ-1~6` (신설)
- **M** `docs/state/k0.md § K0-BQ Active` (편입)
- **M** `docs/tracking/k0.md § K118` (신설)
