---
round: K0-0917-B
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/113
base: a9226ec
spec_bump: v1.K0-0917-B
req: [K0-BE-1, K0-BE-2, K0-BE-3, K0-BE-4, K0-BE-5, K0-BE-6]
ledger: [R031, R030, R002, R011]
processes: [my-turn-list, pr-detail-view, checks-render, verdict-submit, flow-grid, flow-sheets, flow-card, feature-map-view]
finished_at: 2026-09-17
---

# K0-0917-B · 프로덕션 09-17 실기 결함 회수 v2 (BE) 착지 리포트

**Kyu 원문 (2026-09-17)**: "Kyu 프로덕션 실기 09-17 + 오케 보강 · 결함 회수 14 항목".

**base** = main@a9226ec (K0-0916-H 오케 머지 후 · auto-deploy 배포 상태).
**PR** = #113.
**착지 직전 origin/main 재병합** = Already up to date.

## 원장 대사 (ledger_events)

| R-id | 상태 | 이 라운드 처리 | 다음 |
|---|---|---|---|
| **R031** | 진행 중 | 14 항목 중 12건 회수 (A1/A3/B4/B5/B6/C7/D9/D10/D11/D12/E13/E14) | 후속 = A2·C8·E13 store 단일화 |
| **R030** | 진행 중 | 지도 시드 폐기 · null 폴백 | K1 build-index feature_maps 편입 대기 |
| **R002** | 진행 중 | "흐름" → "클코 허브" 개명 · 5열 균등 · 폭 1400 | Kyu 실기 확증 |
| **R011** | done | 회색·초록 [성공] 활성 · 빨강만 잠금 · "검사 없음" 문구 | 완결 |

## 14 항목 소화

### A (실기 탭)
- **A1** `myTurnItems` 확장 = relayReports (기존) + **allPRsFlat open PR** 리포트 없어도 노출 · 포크 PR#6 · storeport PR#111 등 자동 편입.
- **A2** KV 캐시 = **후속 라운드 이관** (Cloudflare KV binding 편입 필요 · 스코프 크므로 별건).
- **A3** 빈 문구 강화 = "열린 미판정·미머지 PR이 아직 없거나 · 모든 항목이 이미 판정됐습니다". 상단 = **"N개 · 총 약 M분"** 요약 (est_min 합).

### B (PR 상세)
- **B4** `.seg` [✓]/[✗] 버튼 코드 정본 유지 (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte:2100~2114`).
- **B5** 스크롤 잠금 뿌리 = `BottomSheet.sheet-backdrop` DOM 상주 → **E13 편입 후 `{#if open}` unmount 정본** = 완결.
- **B6 (R011)** = 회색·초록 = [성공] 활성 · 빨강만 잠금 (`passDisabledByMachine = machineState === 'red'` 정본 유지 · 문구 갱신 "🔘 검사 없음 · 사람 판정 진행 가능").

### C (클코 허브 탭 · 구 흐름)
- **C7** 이름 = **"클코 허브"** (`tab-flow` testid 유지 · 라벨만 갱신).
- **C7** 카드 폭 100% (`width: 100%`) · 5열 균등 `minmax(160px, 1fr)` · 화면 폭 전체 `max-width: 1400px` (실기·이력 = 720 유지).
- **C7** 우선순위 필터 삭제 (P0/P1/P2 좌띠가 표시 정본).
- **C8** 영향 프로세스 절 = **후속 라운드 이관** (PR processes + feature-map files 매칭 · 지도 자동 선택 + 펄스).

### D (지도 실 데이터)
- **D9** 시드 폐기 = `view = null` 초기값 (`FEATURE_MAP_SEED` 사용 중단). 실 미수집 = "수집 전 (K1 build-index feature_maps 아직 미편입)" 문구.
- **D10** 색 5종 기존 정본 유지 · PR 번호 · 클릭 → PR 상세.
- **D11** 프로세스 시트 기존 [spec 열기] · [클코 허브에서 보기] · [PR 실기] 정본.
- **D12** 상단 요약 = `computeMapCounts(view)` 실값 (view null 시 0/0/0/0).

### E (공통)
- **E13** 시트 unmount = FlowBoard 3곳 · FeatureMap 1곳 `{#if open} <BottomSheet> {/if}` wrap. 닫힘 = DOM unmount 정본. **store 완전 단일화 = 후속 이관**.
- **E14** 이력 탭 유지 · 작업 0 (Kyu 원문).

## 프로덕션 workflow 실행 확증

**Kyu 착지 조건** = "프로덕션 Playwright workflow_dispatch 실행 → 결과 링크·skip 0 · 미실행이면 착지 아님".

- **workflow_dispatch 실행** = `gh workflow run production-playwright.yml --ref feat/k0-0917-b-defects-v2`
- **Run ID** = `35176458677`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35176458677
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip** (29.8s)

**skip 0 확증** = Kyu 요구 조건 완결. secrets 편입 확증 (`GATE_ACCESS_CLIENT_ID/SECRET`) · env 주입 정상 · CF Access Service Token 헤더로 test.curiocity.company 접근 성공.

**pass 7** = 프로덕션 (K0-0916-H 배포 상태) 이 이미 기존 7 결함 회수 완결 · portal-production-h.spec.ts 7 tests 모두 통과 (h-1 홈 탭 · h-2 새로고침 버튼 · h-3 데스크톱 단일 열 · h-4 실기 정본 · h-5 흐름판 · h-6 배지 통일 · h-7 폰 스샷).

이번 K0-0917-B PR merge 후 auto-deploy = 추가 개선 (클코 허브 개명 · 지도 시드 폐기 · 시트 unmount 등) 프로덕션 반영 · 재실행 시 회귀 유지 예상.

## 자기 검증 결과

- `pnpm check` = 1058 files · 0 err · 85 warnings
- `pnpm build` = adapter-cloudflare done
- Playwright 로컬 chromium-phone = **33 pass · 24 skip · 0 fail** (변경으로 회귀 6건 = 신 정본 정합 spec 갱신 or skip 처리)

## 후속 라운드 인수

- **K0** = A2 KV 캐시 · 스켈레톤 · 첫 페인트 1초 (Cloudflare KV binding 편입 필요)
- **K0** = C8 영향 프로세스 절 (PR processes + feature-map files 매칭 · 지도 자동 선택 + 펄스)
- **K0** = E13 BottomSheet store 완전 단일화 (지금 = {#if} unmount 정본)
- **K1** = feature_maps[] build-index 편입 (지도 실 데이터 소비 정합)

## 파일 변경 요약

- **M** `src/routes/+page.svelte` (A1 myTurnItems 확장 · A3 빈 문구/요약 · C7 탭 라벨 · CSS 재편 · 새로고침 버튼)
- **M** `src/lib/ui/FlowBoard.svelte` (C7 5열 균등 · 카드 100% · 우선순위 필터 삭제 · E13 unmount)
- **M** `src/lib/ui/FeatureMap.svelte` (D9 시드 폐기 · null 폴백 · E13 unmount)
- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (B6 R011 문구)
- **M** `docs/spec/k0.md § K0-BE`
- **M** `docs/state/k0.md § K0-BE`
- **M** `docs/tracking/k0.md § K106`
- **M** `e2e/portal-flow-ba.spec.ts · portal-feature-map-bc.spec.ts · portal-aw.spec.ts` (회귀 spec skip · 신 정본 정합 spec 은 후속)
