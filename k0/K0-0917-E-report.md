---
round: K0-0917-E
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/118
base: 304f27a
spec_bump: v1.K0-0917-E
req: [K0-BH-1, K0-BH-2, K0-BH-3, K0-BH-4]
ledger: [R030, R031]
processes: [feature-map-view, feature-map-yaml, common-utils]
finished_at: 2026-09-17
---

# K0-0917-E · 지도 프로젝트 칩 + L3 카드 내용 (BH · R030) 착지 리포트

**Kyu 원문 (2026-09-17)**: "지도 탭 결함 (Kyu 09-17 스샷) · 4 항목".

**base** = main@304f27a (K1-0917-C 오케 머지 후).
**PR** = #118.
**착지 직전 origin/main 재병합** = Already up to date.

## 4 항목 소화

### BH-1 · 프로젝트 칩

- `fetchFeatureMapProjects()` 신설 (`src/lib/ui/feature-map-data.ts`) = `index.json.feature_maps[]` 전체 프로젝트 slug 배열.
- `.fm-project-chips` 렌더 = 각 프로젝트 `.fm-chip` 버튼 (`data-testid="fm-chip"` · `data-project` · `aria-pressed` · `.on` class).
- 기본 선택 = `localStorage[test-portal:feature-map:selected-project:v1]` · 없으면 첫 번째 · 최후 폴백 = `projectSlug` prop.
- 클릭 = `loadProject(slug)` → localStorage 저장 + `fetchFeatureMap(slug)` 재fetch.
- **test-portal 고정 폐기** (Kyu 원문 정본).

### BH-2 · L3 카드 내용

- `.fm-area-head` 재편 = 이름 + 우측 요약 **"프로세스 N · 변경 중 N"** (`data-testid="fm-area-summary"`).
- `.fm-area-preview` = 상위 3 프로세스 이름 미리보기 chip (`.fm-preview-chip` · `data-color` = 상태 별 배경) + "+N" 오버플로우.
- 프로세스 0 = `.fm-area-empty` **"하위 없음 · 지도 파일 확인"** (`data-testid="fm-area-empty"` · 회색 italic).
- **빈 카드 금지** (Kyu 원문).

### BH-3 · 상단 요약 문구 재편

- "실 데이터 · 0 파일" 폐기.
- 신 문구 = **"실 데이터 · 영역 N · 프로세스 N · 상세 N · 프로젝트 X"** (`data-testid="fm-summary-text"`).
- 상세 N = 각 프로세스 안 details 배열 크기 합 (K1-D nested 파서 착지 후 실측).

### BH-4 · top-level 스키마 렌더 확인 (K1-D nested 파서 착지 전)

- todoboss·storeport top-level 스키마 = 현재 데이터로 프로젝트 칩 클릭 → view 재fetch → 트리맵 렌더.
- 프로덕션 스샷 3프로젝트 = workflow 실행 확증 (Kyu 스샷 대비).

## 프로덕션 workflow 실행

- **Run ID** = `35182605571`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35182605571
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip · 29.8s**

## 자기 검증

- `pnpm check` = 1064 files · 0 err · 88 warnings.
- `pnpm build` = adapter-cloudflare done.
- Playwright chromium-phone = **37 pass · 25 skip · 0 fail**.

## 파일 변경 요약

- **M** `src/lib/ui/feature-map-data.ts` (BH-1 · `fetchFeatureMapProjects()`)
- **M** `src/lib/ui/FeatureMap.svelte` (BH-1 프로젝트 칩 · BH-2 L3 카드 재편 · BH-3 상단 문구)
- **M** `docs/spec/k0.md § K0-BH-1~4`
- **M** `docs/state/k0.md · docs/tracking/k0.md § K109`
