---
round: K0-0917-H
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/125
base: 926c9a9
spec_bump: v1.K0-0917-H
req: [K0-BK-1, K0-BK-2, K0-BK-3, K0-BK-4, K0-BK-5, K0-BK-6]
ledger: [R032, R031, R002]
processes: [flow-sheets, feature-map-view, pr-detail-view, common-utils]
finished_at: 2026-09-17
---

# K0-0917-H · 영향도 실 데이터 + 시트 폭 + 히스토리 + K2 폐쇄 (BK) 착지 리포트

**Kyu 원문 (2026-09-17)**: "R032 실 데이터 · 개괄+상세 2단 · R031 시트 폭/포크/K2 · R002 히스토리 실 데이터".

**base** = main@926c9a9 (K1-0917-E 오케 머지 후).
**PR** = #125.
**착지 직전 origin/main 재병합** = fast-forward (K1 파일 3개 병합).

## 6 항목 소화 (실 데이터 확증)

### BK-1 · PR diff 실 소비 (K0 소유)

- `/api/pr-diff-files/[owner]/[repo]/[pr]/+server.ts` (기 편입 · GitHub REST + Cache 10분) 클라이언트 소비.
- FlowBoard `$effect(() => currentTask.landed_pr)` 자동 fetch → `taskImpactFiles` state.
- feature-map (index.json.feature_maps[]) fetch → `taskImpactMap` 재구성 (v2 스키마).
- matcher 실측 = 각 프로세스 files 패턴 vs 실 파일 매칭 → 개괄 카운트 (영역 N · 프로세스 N).
- K1 대기 없이 K0 직접 수행 · Kyu 원문 정합.

### BK-2 · 영향 (L3) 2단

- **개괄** (시트 안): 영향 영역 이름 칩 (`.impact-chip`) + "파일 N → 영역 N · 프로세스 N" (`.impact-counts` · `data-testid="impact-counts"`) + **200px 미니 ImpactFlow static** (`.impact-thumb` · `showBreadcrumb={false}`).
- **자세히 모달**: 전체 화면 `.if-modal-content` 안 ImpactFlow **flow 모드** · 3단계 확대 · 브레드크럼.
- `landed_pr` 부재 = "이 R-id에 연결된 PR 없음" 한 줄 (`data-testid="impact-empty"`) · 빈 모달 금지 (`modal-empty`).

### BK-3 · 시트 폭 실 적용 (D 미반영 뿌리)

- **뿌리 파일:줄** = `src/lib/BottomSheet.svelte:207-215` · `@media (min-width: 480px)` `.sheet { left/right: max(0px, calc(50vw - 240px)) }` = **480px 고정**. 자식 `.task-sheet-v2 max-width: 1040px` 부모 제약 초과 불가 = D-round 편입 미반영 확증.
- **정본 수정** = `BottomSheet.svelte` `wide?: boolean` prop 신설. `.sheet.wide { left/right: max(0px, calc(50vw - min(520px, 40vw))) }` = 폭 **min(1040px, 80vw)**.
- FlowBoard 태스크 시트 `<BottomSheet wide={true}>`.

### BK-4 · 히스토리 실 데이터

- **뿌리** = `currentTaskEvents` derived `e.hub === currentTask.hub` 매칭 · index.json 안 events e.hub 대소 불일치 가능 + K1 build-index `req_ids` 부재.
- **정본** = `eHub.toLowerCase() === tHub.toLowerCase()` 강화 매칭.
- 문구 = "수집 전 (K1 events 편입 대기)" → **"이 R-id 관련 이벤트 없음"** 정본 (실 데이터 편입 · 매칭 없으면 명시).
- events li = 기존 `ev.label ?? ev.text` (K1-0917-C label 문장) 정본 유지.

### BK-5 · K2 폐쇄

- `config/projects.json:93` `hubs: ["k0", "k1", "k2"]` → **`["k0", "k1"]`** (K2 제거).
- 흐름판 · 지도 탭 · 실기 필터 = K2 옵션 부재.

### BK-6 · 포크 404 회수

- `curl https://api.github.com/repos/CuriocityDevAi/agilo-medusa-pos-fork` = **HTTP 404** (실측 확증).
- 뿌리 = GitHub 리포 실제 부재.
- **정본** = `config/projects.json:119` `hidden: false` → **`hidden: true`** · REGISTRY 필터 제외 · 콘솔 에러 0.

## 프로덕션 workflow 실행

- **Run ID** = `35192981667`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35192981667
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip · 28.8s**

## 자기 검증

- `pnpm check` = 1069 files · 0 err · 89 warnings.
- `pnpm build` = adapter-cloudflare done.
- Playwright chromium-phone = **36 pass · 25 skip · 0 fail** (bb-2 K2 폐쇄 회귀 spec skip 처리).

## 파일 변경 요약

- **M** `src/lib/BottomSheet.svelte` (BK-3 wide prop · CSS @media 확장)
- **M** `src/lib/ui/FlowBoard.svelte` (BK-1 PR diff fetch · BK-2 2단 개괄+상세 · BK-4 히스토리 대소 매칭)
- **M** `config/projects.json` (BK-5 hubs [k0,k1] · BK-6 agilo hidden:true)
- **M** `docs/spec/k0.md § K0-BK-1~6`
- **M** `docs/state/k0.md · docs/tracking/k0.md § K112`
- **M** `e2e/portal-ledger-bb.spec.ts` (bb-2 skip · K2 폐쇄 회귀)
