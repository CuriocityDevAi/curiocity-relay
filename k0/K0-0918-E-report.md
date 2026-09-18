---
round: K0-0918-E
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/141
base: a2b884c
spec_bump: v1.K0-0918-E
req: [K0-BS-1, K0-BS-2, K0-BS-3, K0-BS-4, K0-BS-5, K0-BS-6, K0-BS-7, K0-BS-8]
ledger: [R031, R002]
processes: [flow-board, feature-map, pr-detail-view, pwa]
finished_at: 2026-09-18
---

# K0-0918-E · 카드 전영역 클릭 · 발부 ID 폴백 · derived 어댑터 · 지도 3s · PWA 갱신 (BS · R031·R002) 착지 리포트

**Kyu 원문 (2026-09-18)**: "경계: `src/lib/ui/flow-data.ts` · 계산 함수 수정 금지 (K1-G 진행 중) · 렌더 파일만." 5 항목.

**base** = main@a2b884c (K0-0918-D 오케 머지 후).
**PR** = #141.
**착지 직전 origin/main 재병합** = 완결 · 충돌 없음.

## 5 항목 소화

### BS-1 · 카드 전영역 클릭 → 시트 (진단 6)

**뿌리 확증**:
- `src/lib/ui/FlowBoard.svelte:681` 이전 `<button class="card-title-btn" onclick={openTaskSheet}>` = **제목 글자만 클릭 가능**. 카드 배경 · 여백 · 메타 영역 클릭 = 무동작.
- Kyu 원문 진단 6: "사용자 실제 클릭 위치 = 카드 배경 좌표".

**정본 (K0-0918-E)**:
- `<article class="flow-card clickable" role="button" tabindex="0" onclick={...} onkeydown={...}>` = **전 영역 클릭 + 키보드 접근성** (Enter/Space).
- 내부 `<a>` 링크 (`issue-id-link` · `card-pr-link`) = `onclick.stopPropagation` (시트 열림 방지 · 링크 우선).
- 제목 `<button>` → `<div>` 강등 (article 이 클릭 소유 · 이중 click 방지).
- CSS = `cursor: pointer` · hover 배경 강조 · `:focus-visible` outline 2px accent.

### BS-2 · 발부 ID 폴백 + 착지 열 PR 배지 (진단 4)

**정본 (Kyu 원문)** = "발부 ID 없으면 R-id 폴백 · 착지 열 카드에 repo/#PR 배지 (데이터 있는 것만)".

**derived.ts 어댑터**:
- `displayIssueId(card)` = `card.issue_id ?? card.id` (K1-G 착지 시 index.json issued_id 스위치).
- `shouldShowPrBadge(card)` = `card.landed_pr` 있음 AND `column` ∈ {landing, drilling, merged}.

**UI**:
- `<a class="issue-id-link" data-fallback={!r.issue_id}>` = 폴백 시 `opacity: 0.7 · font-style: italic` (시각 표시).
- `{#if showPrBadge}` = 데이터 있는 것만 배지 렌더.

### BS-3 · 계약 소비 어댑터 (`src/lib/ui/derived.ts` 신설)

**정본 (Kyu 원문)** = "화면이 쓰는 값 (column·my_turn·pr·merged·hub_state) 을 `src/lib/ui/derived.ts` 한 파일 인터페이스로 모으고 지금은 기존 계산에 연결 — K1-G 착지 시 이 파일만 index.json 필드로 바꾸면 되게".

**신설 파일**: `src/lib/ui/derived.ts`.
- **`FlowCardView`** 인터페이스 (16 필드) = 카드 계약. K1-G index.json.requirements[] 필드 대체 예상.
- **`HubStateView`** 인터페이스 = 허브 상태 계약 (K1-D status/hubs.json).
- **`FlowEventView`** = FlowEvent 재수출 (K1-G events[] 확장 대비).
- **`adaptRequirements(reqs)`** = FlowRequirement → FlowCardView (현재 통과 · K1-G 후 index.json 직접 소비로 스위치).
- **`displayIssueId`** / **`shouldShowPrBadge`** / **`HUB_REPO`** 재수출.
- **`ADAPTER_CONSUMERS`** 상수 = 사용처 목록 (테스트 · docs 자동 대조 대비).

### BS-4 · 사용처 목록 (K0-0918-E 시점 · K1-G 착지 대비)

| 소비 파일 | 소비 필드 (계약 명) | 현재 소스 |
|---|---|---|
| `src/lib/ui/FlowBoard.svelte` | `column · my_turn · needs_decision · landed_pr · issue_id · hub · title · priority · size · age_days · repeat_count · conflict_with · blocked_by · gate_result · drill_pass · drill_total · drill_defer_count · merged` (16 필드) | `flow-data.FlowRequirement` (K0-0917-K) |
| `src/routes/+page.svelte` | `myTurnRounds · completedRounds · hubsStatus · myActor · versionSha` (5 필드) | +page.svelte 자체 파생 |
| `src/lib/ui/FeatureMap.svelte` | `feature_maps[] · project · areas[] · processes[] · file_count · open_pr · merged_this_week` (6 필드) | `feature-map-data.ts` |
| `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` | `case_state · checks_built_at · pr_state · landed_pr · issue_id` (5 필드) | +page.svelte 자체 파생 |
| `src/lib/ui/derived.ts` (**신설**) | 어댑터 (FlowCardView · HubStateView · FlowEventView) | flow-data.ts 재수출 (통과) |

**K1-G 착지 시 마이그레이션 순서**:
1. `derived.ts adaptRequirements()` 안에서 index.json.requirements[] 필드 소비로 스위치.
2. `flow-data.ts` 안 파생 로직은 fallback 으로 유지 (index.json 부재 시).
3. 이 라운드 = 어댑터 얇게 연결 + 사용처 목록 확정 (문서화).

### BS-5 · 지도 3초 timeout (진단 4)

**정본 (Kyu 원문)** = "로딩 3초 넘으면 '데이터를 못 받았어요 · [다시 시도]' 문장 (무한 '불러오는 중' 금지) · 실패 응답 코드 표시".

**feature-map-data.ts**:
- `FETCH_TIMEOUT_MS = 3_000` (12000 → 3000).
- AbortError 시 `__error = '데이터를 못 받았어요 · 요청 시간 초과 (3초)'`.
- `IndexFetchDetail` 진단 유지 (K0-0918-B).

**UI (FeatureMap.svelte · K0-0918-B 정본 유지)**:
- error 배너 = fetchError 문장 + 진단 line "진단 · 서버 HTTP <code> · 경로 raw".
- `[다시 시도]` 버튼 = `retryLoad()` + `invalidateIndexCache()`.

### BS-6 · PWA 갱신 배너 (진단 캐시)

**정본 (Kyu 원문)** = "새 배포 감지 시 상단 띠 '새 버전 · [새로고침]' (캐시로 옛 화면 보는 일 종료)".

**신설 컴포넌트**: `src/lib/PwaUpdateBanner.svelte`.
- `onMount`:
  - `/api/version` fetch → `currentSha` 초기화.
  - 60초 폴링 = SHA 변경 감지 시 `updateAvailable = true`.
- SW 이벤트 (즉시 감지):
  - `updatefound` → 새 SW `statechange installed` → `updateAvailable = true`.
  - `controllerchange` → `updateAvailable = true` (새 SW 활성).
- 배너 (sticky top · z-index 100):
  - "🔔 새 버전이 배포됐어요 (build <SHA 7>)".
  - `[새로고침]` 버튼 = `window.location.reload()`.
- `+layout.svelte` 편입 = 모든 라우트 안 상단 sticky.

### BS-7 · Playwright 회귀

- `e2e/portal-production-k0-0918-e.spec.ts` (4 tests):
  - `k0918e-1` = 카드 배경 좌표 클릭 (bottom-right · 여백 · 사용자 실 클릭 위치) → 시트 render 확증.
  - `k0918e-2` = 발부 ID 렌더 확증 (폴백이든 실 필드든 상관없이 노출).
  - `k0918e-3` = 지도 timeout 3-way (error/empty/live/seed · loading 아님).
  - `k0918e-4` = PWA 컴포넌트 로드 스모크.

### BS-8 · 경계 준수 확증

- **`src/lib/ui/flow-data.ts` 안 계산 함수 = 무변경** (K1-G 진행 중 · Kyu 원문 정본).
- **신설** = derived.ts · PwaUpdateBanner.svelte (렌더/어댑터 계층).
- **수정** = FlowBoard.svelte (렌더) · feature-map-data.ts (timeout 상수 · 계산 아님) · +layout.svelte.
- flow-data.ts 안 `HUB_REPO` 상수는 어댑터가 재수출만 (수정 아님).

## 프로덕션 workflow

- **Run ID** = `35359241119`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35359241119

## Kyu 확증 대기 스샷 4

1. **카드 여백 클릭** → 시트 열림 (제목 밖 좌표).
2. **발부 ID 폴백** = R-id (italic) or 실 issue_id + 착지·실기·머지 열 repo/#PR 배지.
3. **지도 3초 timeout** = "데이터를 못 받았어요" + [다시 시도] + 서버 HTTP 진단.
4. **PWA 갱신 배너** = 새 배포 감지 시 "🔔 새 버전 · [새로고침]".

## K1-G 계약 소비 준비 (R002)

- **derived.ts** = K1-G 착지 시 유일 스위치 지점.
- **사용처 목록 (BS-4)** = 문서화 확정 · index.json 필드 매핑 대비.
- **K1 회부**: index.json.requirements[] 안 다음 필드 편입 대기:
  - `column` (요구사항 계약) · `my_turn` (drill 파생) · `landed_pr` (K1-G 이미 부분 편입) · `hub_state` (K1-D 재수출).

## 자기 검증

- `pnpm check` = 0 err · 90 warnings.
- `pnpm build` = adapter-cloudflare done.
- `pnpm test` = **82 files · 1063 tests pass · 0 fail**.

## 파일 변경 요약

- **A** `src/lib/ui/derived.ts` (BS-3 계약 어댑터 · 사용처 목록 상수)
- **A** `src/lib/PwaUpdateBanner.svelte` (BS-6 · SW updatefound + SHA 폴링)
- **M** `src/lib/ui/FlowBoard.svelte` (BS-1 article role=button · BS-2 displayIssueId/shouldShowPrBadge 소비 · BS-3 derived import)
- **M** `src/lib/ui/feature-map-data.ts` (BS-5 · FETCH_TIMEOUT_MS 3000 · 사용자 말)
- **M** `src/routes/+layout.svelte` (BS-6 PwaUpdateBanner 편입)
- **A** `e2e/portal-production-k0-0918-e.spec.ts` (BS-7 · 4 tests)
- **M** `.github/workflows/production-playwright.yml` (BS-7 spec 편입)
- **M** `docs/spec/k0.md § K0-BS-1~8` (신설)
- **M** `docs/state/k0.md § K0-BS Active` (편입)
- **M** `docs/tracking/k0.md § K120` (신설)
