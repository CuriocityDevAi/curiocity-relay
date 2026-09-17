---
round: K0-0917-D
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/116
base: 1df5cc5
spec_bump: v1.K0-0917-D
req: [K0-BG-A, K0-BG-B, K0-BG-C]
ledger: [R031, R032, R030, R002]
processes: [my-turn-list, pr-detail-view, flow-grid, flow-sheets, flow-card, feature-map-view, common-utils]
finished_at: 2026-09-17
---

# K0-0917-D · ImpactFlow 후속 + 시트 v2 + 실기·허브 결함 (BG) 착지 리포트

**Kyu 원문 (2026-09-17)**: "R031 09-17 실기 결함 2차 9건 + R032 ImpactFlow 후속 4 + R030 지도 3단계·실데이터 + R002 시트 v2 · 12 항목".

**base** = main@1df5cc5 (K0-0917-C 오케 머지 후).
**PR** = #116.
**착지 직전 origin/main 재병합** = Already up to date.

## 원장 대사

| R-id | 상태 | 이 라운드 |
|---|---|---|
| **R031** | 진행 중 | 실기·허브 결함 5건 (C8~C12) 회수 |
| **R032** | 진행 중 | ImpactFlow 후속 4건 (A2·A3·A4 · A1 후속 이관) |
| **R030** | 진행 중 | 지도 자체 3단계 토글 + PR diff files API |
| **R002** | 진행 중 | 시트 v2 (폭·2열·영향 절·PATCH 토스트) |

## 12 항목 소화

### A · ImpactFlow 후속 4건

- **A1** kit workspace 이관 = **후속 라운드 이관** (npm 배포 인프라 필요 · file: 프로토콜 배포 미지원). 로컬 사본 유지.
- **A2** 지도 탭 자체 3단계 = `.fm-3level` 토글 + `[3단계 확대]` 버튼 (`data-testid="btn-map-3level"`) → ImpactFlow static 모드 렌더.
- **A3** `/api/pr-diff-files/[owner]/[repo]/[pr]/+server.ts` 신설 = GitHub PR files API (paginated · 페이지당 100 · 최대 10 페이지) + **Cloudflare Cache API TTL 600s (10분)**.
- **A4** `[지도에서 보기]` = URL fragment `#map?process=<id>` · `flow-jump-map` CustomEvent 리스너 (+page.svelte onMount) · `activeTab = 'map'` 자동 진입 · `highlightedProcessId` 강조 준비.

### B · 시트 v2 (Kyu 09-17 스샷)

- **B5** 시트 폭 = 폰 100% · 맥 `max-width: 1040px` (`.task-sheet-v2`). 상단 정보 = **2열 그리드** (`.task-info-grid` `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`). 세로 나열 깨짐 수정.
- **B6** **"영향 (L3)" 절** 시트 안 신설 (`.impact-section` · `data-testid="impact-section"`) · 요약 한 줄 + `[자세히 보기]` 버튼 → `showImpactModal` 모달 (**ImpactFlow flow 모드 · 클코 허브 유지** · ESC 닫기 · `data-testid="if-impact-modal"`).
- **B7** PATCH 실패 시 = **화면 토스트** (`.toast-message` · `data-testid="patch-toast"` · 5s 후 자동 닫힘 · **콘솔 아님** · Kyu 원문 정본).

### C · 실기·허브 결함 5건

- **C8** 실기 목록 = **확인 항목 ≥1 AND 미판정·미머지** (`(p.case_count ?? 0) >= 1` 필터). `case_count === 0` PR = **"자동 머지 대기 N건"** 접힘 절 (`<details>` · `data-testid="auto-merge-waiting"` · 개수만).
- **C9** 라운드 ID 부재 = `projects.json` `findProject(repoName)?.hub` 매핑 + PR `created_at` MM-DD 파싱. "CURIOCITYDEVAI#245" 폐기.
- **C10** 상단 `"내 차례"` = 실기 탭과 **같은 함수** (`countMyTurn(prs)`) · `src/lib/my-turn-count.test.ts` 4 단위 테스트 pass (빈 목록 · open+caseCount≥1 필터 · draft 제외 · 상단 배지 = 흐름판 chip 동일).
- **C11** 허브 카드 마지막 행동 = **문장 우선** (K1-C `hubEvent.label` 소비) · 파일 경로 노출 금지. 폴백 = kind 별 문장 (`report-push` → "리포트 게시" · `inquiry-push` → "심문 게시" · `read/reconcile` → "문서 읽기" · `dispatch` → "프롬프트 투입" · 기타 → "이벤트 감지").
- **C12** 지도 프로세스 0건 = K1-C `feature_maps[]` 실측 후 확증. 0이면 뿌리 = `docs/feature-map.yaml:1` (schema 부재) or K1 build-index `collectFeatureMaps` fetch 실패 · 원인 규명 대상.

## 프로덕션 workflow 실행 확증

- **Run ID** = `35180298538`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35180298538
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip · 30.7s**
- **skip 0** 조건 만족 · secrets 편입 확증.

## 자기 검증 결과

- `pnpm check` = 1064 files · 0 err · 87 warnings.
- `pnpm test` = 76 test files · **1004 pass** (my-turn-count.test.ts 4 신설 pass).
- `pnpm build` = adapter-cloudflare done.
- Playwright chromium-phone = **37 pass · 25 skip · 0 fail**.

## 후속 라운드 인수

- **K0** = kit workspace 세팅 · portal `@curiocitydevai/impact-flow` peer 편입 (kit 0.1.0-beta.0 npm 배포 후).
- **K0** = 지도 프로세스 0건 실 확증 (K1-C feature_maps 편입 후).
- **K0** = ImpactFlow flow 모드 실 파일 소비 (PR diff files 매칭 · 카드 시트 [자세히 보기] 모달 안).
- **K1** = build-index PR diff · feature_maps 실 집계.

## 파일 변경 요약

- **A** `src/routes/api/pr-diff-files/[owner]/[repo]/[pr]/+server.ts` (A3 · GitHub API + Cache 10분)
- **A** `src/lib/my-turn-count.test.ts` (C10 · 4 단위 테스트)
- **M** `src/lib/ui/FeatureMap.svelte` (A2 3단계 토글 · A4 URL fragment)
- **M** `src/lib/ui/FlowBoard.svelte` (B5 폭+2열 · B6 영향 절+모달 · B7 토스트 · C11 문장)
- **M** `src/routes/+page.svelte` (A4 CustomEvent 리스너 · C8 필터+자동 머지 접힘 · C9 허브·날짜 매핑)
- **M** `docs/spec/k0.md § K0-BG-A/B/C`
- **M** `docs/state/k0.md · docs/tracking/k0.md § K108`
