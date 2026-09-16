---
round: K0-0916-G
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/110
base: 7ea62ac
spec_bump: v1.K0-0916-G
req: [K0-BC-1, K0-BC-2, K0-BC-3, K0-BC-4, K0-BC-5]
ledger: [R030, R002]
processes: [feature-map-yaml, feature-map-check, feature-map-view, spec-docs]
finished_at: 2026-09-16
---

# K0-0916-G · 기능 지도 (BC · R030) 착지 리포트

**Kyu 원문 (2026-09-16)**: "기능 지도 · test-portal 초판 + 지도 탭. R030" · 5 항목 지시.

**base** = main@7ea62ac (K0-0916-F 오케 머지 후).
**PR** = #110.
**착지 직전 origin/main 재병합** = Already up to date.
**정본 규약** = `curiocity-relay/docs/feature-map-convention.md` (오케 상주 · 링크 그대로).

## 원장 대사 (ledger_events)

| R-id | 상태 | 이 라운드 처리 | 다음 단계 |
|---|---|---|---|
| **R030** | 신설 (filed → issued → verified 진행) | test-portal 초판 · 검증 스크립트 · CI · 지도 탭 · [DOC] 규약 5 항목 착지 | Kyu 프로덕션 실기 → done |
| **R002** | (K0-0916-F 마감 중) | 흐름판 착지 · 마일스톤 결과 대기 | Kyu 마일스톤 실기 확증 |

## 파일 경계

Kyu K0-0916-G 원문: K0 + **collectFeatureMaps 1함수 K1 build-index 편입 예외** (다음 K1 라운드 회부 · 이번 라운드는 `feature_maps[]` 부재 · 시드 폴백으로 UI 검증).

## 5 항목 소화

### BC-1 · `docs/feature-map.yaml` 초판

- 10 영역 · 36 프로세스 · files glob 실측.
- 영역 = 실기 · 흐름판 · 이력 · 환경 · 알림 · 게이트·지표 · relay 소비 · 인프라 · 기능 지도 · 문서.
- 스키마 = 오케 convention 그대로 (project · version · areas[{id, name, processes[{id, name, summary, files, spec, status}]}]).
- summary = 처음 보는 사람 기준 · 한 문장 · 약어 0.

### BC-2 · 검증 스크립트 + CI

- `scripts/feature-map-check.mjs` = 표준 glob (`**`, `*`, `?`, `{a,b}` alternation) → regex 매칭.
- 검증 3종: (a) live 프로세스 files ≥1 · (b) 미분류 임계 30% · (c) planned 승격 안내.
- CI `.github/workflows/feature-map-check.yml` = PR paths 변경 시 자동 실행 · fail 시 PR 코멘트 (미분류 · 부재 목록).
- **실측 통과**: 389 files · classified 389 · **미분류 0% · 부재 0건**.

### BC-3 · 지도 탭 UI

- `src/lib/ui/FeatureMap.svelte` 신설 + `src/lib/ui/feature-map-data.ts` 신설.
- 탭 확장: `activeTab: 'training'|'flow'|'map'|'history'` (3 → 4).
- 상단 카운트 (프로세스 N · 변경 중 N · 신규 N · 미분류 N).
- 미등록 경고 배너 (`unregistered_files.length > 0` 시 빨간 점선 + details 30건).
- 2단 트리맵 `.fm-tree` grid · `.fm-area` 카드 안 `.fm-proc` 버튼 (file_count 비례 40~200px).
- **5 색 상태** (Kyu 원문 · CSS class `.p-*`):
  - `stable` (변화 없음) = 회색
  - `changing` (열린 PR) = 파랑 (`--accent`)
  - `new` (신규) = 빨간 점선 (`--fail` dashed)
  - `merged-this-week` (이번 주 머지) = **보라** (`--merged` · K0-BA-10 재사용)
  - `planned` = 회색 점선 (`--muted` dashed)
- 프로세스 시트 (`BottomSheet` 재사용): summary · 지금 (상태·파일 수·열린 PR·이번 주 머지·파일 목록) · 히스토리 (git log 편입 대기) · 액션 3 (`[spec 열기]` · `[흐름판에서 보기]` · `[PR 실기]`).
- 폰 반응형 (`@media (max-width: 767px)`): `.fm-tree` 1열 세로 스택.

### BC-4 · 데이터 소비

- `fetchFeatureMap(projectSlug)` = raw `index.json.feature_maps[]` (K1 build-index 편입 대기).
- 폴백 = `FEATURE_MAP_SEED` (수집 전 회색 명시).
- 데이터 소스 배너 `[data-source="live"|"seed"]`.

### BC-5 · CLAUDE.md § 10.2 [DOC] 규약

- src 변경 시 `docs/feature-map.yaml` 해당 프로세스 갱신 · 신규 파일 등록.
- PR 본문 `processes: [<id>, ...]` frontmatter 필드 필수.
- 커밋 메시지 processes 기재 (선택).
- 모든 K0 라운드 자기 검증에 `scripts/feature-map-check.mjs` 편입.
- `status` = live/planned/deprecated (building = 포털 계산 · 여기 기입 금지).

## 자기 검증 결과

- `pnpm check` = 1058 files · **0 err** · 81 warnings
- `pnpm test` = 75 files · **1000 pass**
- `pnpm build` = adapter-cloudflare done
- Playwright chromium-phone = **38 pass · 12 skip · 0 fail** (신 spec `portal-feature-map-bc` 8 pass 포함)
- `feature-map-check.mjs` = **389 files · classified 389 · 미분류 0% (0/389) · 부재 0건**

## 미분류 % · Playwright · 스샷

- **미분류 %** = **0.00%** (Kyu 원문 요구 · REPORT frontmatter 편입).
- **Playwright 390/1280**: 트리맵 렌더 · 색 5종 · 시트 · 미등록 경고 · 폰 세로 · 맥 grid 스샷 모두 pass.
- 스샷 = `e2e/screenshots/bc-390-feature-map.png` · `bc-1280-feature-map.png`.

## 성능 예산 · 커밋 규약

- 커밋 메시지 = `!` 미포함.
- PR body frontmatter + test-checklist `req:` + **`processes:` 필드 편입** (K0-BC-5 규약 정합).
- raw hex ALLOW_LIST = `--merged` 재사용 (K0-BA-10 정합).

## 다음 라운드 인수

- **K1** = `collectFeatureMaps()` build-index 편입 (docs/feature-map.yaml raw fetch · 각 리포 main · unregistered_files 파생 · git log 히스토리 캐시 10분).
- **K0** = git log 포털 API + d3 방사형 마인드맵 토글 (선택 · 이번 라운드 미착지 · 다음 K0).
- **K2** = R001 스크린샷 원시 이슈 회수 실 진행 (흐름판 안 🔴 배지 표시).

## 파일 변경 요약

- **A** `docs/feature-map.yaml` (10 영역 · 36 프로세스)
- **A** `scripts/feature-map-check.mjs` (glob 매칭 + 검증 + JSON)
- **A** `.github/workflows/feature-map-check.yml` (PR paths + 코멘트)
- **A** `src/lib/ui/FeatureMap.svelte` (2단 트리맵 · 5 색 · 시트)
- **A** `src/lib/ui/feature-map-data.ts` (타입 · fetch · 시드)
- **A** `e2e/portal-feature-map-bc.spec.ts` (8 pass)
- **A** `docs/spec/k0.md § K0-BC-1~5`
- **M** `src/routes/+page.svelte` (activeTab 확장 · 지도 탭 편입)
- **M** `CLAUDE.md § 10.2` (신설)
- **M** `docs/state/k0.md · docs/tracking/k0.md § K104`
- **M** `curiocity-relay/README.md` § feature-map 링크 1줄
