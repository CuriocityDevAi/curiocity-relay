---
round: K0-0917-C
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/115
kit_pr: https://github.com/CuriocityDevAi/curiocity-kit/pull/1
base: 6b8ce34
spec_bump: v1.K0-0917-C
req: [K0-BF-1, K0-BF-2, K0-BF-3, K0-BF-4, K0-BF-5, K0-BF-6, K0-BF-7, K0-BF-8]
ledger: [R032, R030, R002]
processes: [feature-map-view, feature-map-yaml, pr-detail-view, flow-sheets, common-utils]
finished_at: 2026-09-17
---

# K0-0917-C · 영향 흐름 뷰 · ImpactFlow (BF) 착지 리포트

**Kyu 원문 (2026-09-17)**: "R032 · 영향 흐름 뷰 · Kyu 09-17 3단계 확대 정본 · kit + portal 2 리포".

**base** = main@6b8ce34 (K0-0917-B 오케 머지 후).
**portal PR** = #115.
**kit PR** = curiocity-kit#1.
**착지 직전 origin/main 재병합** = Already up to date.

## 원장 대사

| R-id | 상태 | 이 라운드 |
|---|---|---|
| **R032** | 신설 | ImpactFlow 컴포넌트 (kit) + 3 진입 지점 (portal) + 오버레이 UX |
| **R030** | 진행 중 | 지도 시트에 [영향 보기] 진입 편입 · 지도 탭 자체 3단계는 후속 |
| **R002** | 진행 중 | 클코 허브 카드 시트 [지도에서 보기] 편입 |

## 2 리포 착지

### curiocity-kit (feat/impact-flow · PR#1)

- `packages/impact-flow/` 신설.
- `src/ImpactFlow.svelte` = Svelte 5 · SVG+CSS · 3단계 확대 · 300ms 감속.
- `src/matcher.ts` = glob → RegExp + `computeImpact()` 승격 규칙.
- `src/types.ts` = FeatureMapV2 스키마 (areas → processes → details).
- `example/todoboss-payroll.ts` = 급여 4 판정 예시 + PR#23 diff 시뮬레이션.
- `tests/matcher.test.mjs` = 6 tests (glob · alternation · countMatches · 승격 · unregistered · planned).
- `README.md` = API · 승격 규칙 · 예제.
- `package.json` = `@curiocitydevai/impact-flow@0.1.0-alpha.0` · peer svelte >=5.

### test-portal (feat/k0-0917-c-impact-flow · PR#115)

- **로컬 사본** = `src/lib/ui/ImpactFlow.svelte` + `impact-flow-matcher.ts` + `impact-flow-types.ts` (workspace 세팅 후속 이관).
- **3 진입 지점**:
  - `FeatureMap.svelte:btn-impact-open` 지도 시트 [영향 보기].
  - `FlowBoard.svelte:btn-map-jump` 클코 허브 카드 시트 [지도에서 보기].
  - `pr/[owner]/[repo]/[id]/+page.svelte:btn-impact-detail` PR 상세 [무엇이 바뀌나] (종합 판정 헤더).
- **오버레이 UX** = `[data-testid="impact-overlay"]` · role=dialog · aria-modal=true · z-index 200 · ESC 닫기.

## 3단계 확대 정본 (Kyu 09-17)

- **L3 (기본)** = 영역 트리맵. 영향 있는 영역만 켜지고 (`imp-changing` 주황 펄스) 나머지 30% 흐림 (`.imp-stable` opacity 0.3).
- **L2** = 영역 클릭 → 그 영역이 화면을 채우며 확대 (300ms `cubic-bezier(0.16, 1, 0.3, 1)`) → 안의 L2 프로세스.
- **L1** = 프로세스 클릭 → 상세.
- 브레드크럼 = "급여 › 4 판정 › 판정 규칙" + [뒤로].
- 레벨 토글 "L3 · L2 · L1 보기" · L1 전체 상세 (확대 없음) · L2/L3 동일 · 기본 L3.

## 색·상태 5종

- 변경 중 (`imp-changing`) = 주황 펄스 (`animation: if-pulse 1600ms`).
- 신규 (`imp-new`) = 초록 점선.
- 머지 (`imp-merged`) = 보라 (`--merged` 재사용).
- 영향 없음 (`imp-stable`) = 30% 흐림.
- 미등록 (`if-tag-unreg`) = 빨간 점선 "지도 미등록".

## beat (◀▶) · 자동 재생 없음

- 4 단계: 영역 켜짐 → 프로세스 켜짐 → 상세 켜짐 → 파일 목록.
- `[data-testid="if-beat-prev/next/label"]`.
- 자동 재생 없음 (Kyu 원문).

## prefers-reduced-motion

- `@media (prefers-reduced-motion: reduce)` = `.imp-changing { animation: none }` + `.if-zoomed { animation: none }`.

## 프로덕션 workflow 실행 확증

- **Run ID** = `35179419809`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35179419809
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip · 31.6s**
- **skip 0** 조건 만족 (secrets 편입 확증 · env 주입 정상).

## 자기 검증 결과

- `pnpm check` = 1061 files · 0 err · 86 warnings.
- `pnpm build` = adapter-cloudflare done.
- Playwright c-1~c-5 = **4 pass · 1 skip** (c-5 reduced-motion 별건).
- kit `node --test tests/matcher.test.mjs` = 6 pass.

## 후속 라운드 인수

- **K0** = kit workspace 세팅 · portal `package.json` `@curiocitydevai/impact-flow` peer 편입 (로컬 사본 폐지).
- **K0** = 지도 탭 자체 트리맵 3단계 확대 (L3 트리맵 → L2 확대 → L1 상세).
- **K1** = PR diff files 실 소비 (build-index PR diff 필드 편입 · portal 소비 시 `files` prop 실 데이터).
- **K0** = 클코 허브 [지도에서 보기] = 지도 탭 자동 진입 + 프로세스 펄스 강조 (postMessage 편입).

## 파일 변경 요약

### kit (feat/impact-flow)
- **A** `packages/impact-flow/package.json`
- **A** `packages/impact-flow/README.md`
- **A** `packages/impact-flow/src/ImpactFlow.svelte`
- **A** `packages/impact-flow/src/matcher.ts`
- **A** `packages/impact-flow/src/types.ts`
- **A** `packages/impact-flow/src/index.ts`
- **A** `packages/impact-flow/example/todoboss-payroll.ts`
- **A** `packages/impact-flow/tests/matcher.test.mjs`

### portal (feat/k0-0917-c-impact-flow)
- **A** `src/lib/ui/ImpactFlow.svelte` (kit 로컬 사본)
- **A** `src/lib/ui/impact-flow-matcher.ts`
- **A** `src/lib/ui/impact-flow-types.ts`
- **A** `e2e/portal-impact-flow-c.spec.ts`
- **A** `docs/spec/k0.md § K0-BF`
- **M** `src/lib/ui/FeatureMap.svelte` (B7-a · [영향 보기] · 오버레이)
- **M** `src/lib/ui/FlowBoard.svelte` (B7-b · [지도에서 보기])
- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (B7-c · [무엇이 바뀌나] · 오버레이)
- **M** `docs/state/k0.md · docs/tracking/k0.md § K107`
