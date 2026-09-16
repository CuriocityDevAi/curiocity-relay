---
round: K0-0916-E
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/107
base: b5e8dc2
spec_bump: v1.K0-0916-E
req: [K0-BA-1, K0-BA-2, K0-BA-3, K0-BA-4, K0-BA-5, K0-BA-6, K0-BA-7, K0-BA-8, K0-BA-9, K0-BA-10]
ledger: [R002, R012, R013, R001]
finished_at: 2026-09-16
---

# K0-0916-E · BA 흐름판 (R002 · R012 · R013) 착지 리포트

**Kyu 원문 (2026-09-16)**: "BA = 흐름판 탭 (실기·흐름·이력) · Kyu v3 와이어프레임 정본" · 10 항목 지시.

**base** = main@b5e8dc2 (K0-0916-A 오케 머지 후).
**PR** = #107.
**착지 직전 origin/main 재병합** = Already up to date.

## 원장 대사 (ledger_events)

| R-id | 상태 | 이 라운드 처리 | 다음 단계 |
|---|---|---|---|
| **R002** | implementing (K0) | 흐름판 UI 신설 (FlowBoard + flow-data) · Playwright 9 pass | Kyu 실기 확증 → merged |
| **R012** | implementing → merged (K0) | 허브 탭 → 흐름 탭 교체 완결 (activeTab · testid · view · CSS) | 회귀 확증 완료 (portal-aw + portal-smoke 갱신) |
| **R013** | implementing → merged (K0) | 큐 통합 이관표 (inbox 7 → R101~R107) · docs/spec/k0.md § K0-BA-9 | K1 index.json 반영 |
| **R001** | implementing (K2) | 흐름판 안 🔴 배지 표시만 (repeat=3 · blocked_by=kyu) | K2 라운드 회수 |
| **R101~R107** | waiting (신설) | 이관표 편입 · R101 next=true · R105 conflict_with R104 | 우선순위 발부 대기 |

## 파일 경계 준수

Kyu 09-15 정본 (K0-0915-B 규약): K0 = `src/routes/**`(api 제외) · `src/lib/ui/**` · `config/projects.json` + docs (state/k0.md · spec/k0.md 신설 · tracking/k0.md · milestones/) + `curiocity-relay/README.md`.
K1/K2 소유 (`api/`·`kyu-bridge`·`.github`·`tools/regression-runner`·`migrations`) 침범 없음.

## 10 항목 소화

- **BA-1** 상단 띠 = 3 칩 (내 차례/결정/실기) + 이번 주 요약 (착지/머지/밀림) + 🔴/⚠ 핫 카운트 + 프로젝트/우선순위 필터.
- **BA-2** 행 = 허브 (`activeHubs()` 파생 · 동면 포함) · 실시간 카드 (상태 점 4색 · N분 전 · 마지막 행동).
- **BA-3** 5 열 = 대기·구현 중·착지·PR·실기·머지·배포 (파란/초록/보라 테두리 · gate/version 배지).
- **BA-4** 카드 스키마 = P0/P1/P2 좌띠 · S/M/L/Epic 배지 · 경과일 (21↑ 주황) · 🔴 (repeat≥2) · ⚠ 상충 (conflict_with) · "내 차례"/"결정" 파란 태그 · "Kyu 결정이 막고 있음" (blocked_by=kyu).
- **BA-5** 시트 3종 (Kyu 원문 vaul · BottomSheet 재사용 · 자작 최소 · 신규 dep 없음).
- **BA-6** 상충 [삭제]/[유지] 로컬 draft (`conflictLog` + `hiddenIds`) · yaml PATCH API 편입 대기.
- **BA-7** 폰 (≤767) = 세로 스택 · 맥 (≥768) = 5 열 grid.
- **BA-8** 데이터 규약 = FlowRequirement 타입 정본 (yaml size · next · conflict_with · blocked_by 신설).
- **BA-9** 이관표 = ops/dispatch/inbox 7건 → R101~R107 (docs/spec/k0.md § K0-BA-9 표).
- **BA-10** 시맨틱 토큰 `--merged` 신설 (kit-tokens.css:85 · Primer purple 재사용 · raw hex ALLOW_LIST 1).

## 자기 검증 결과

- `pnpm check` = 1046 files · **0 err** · 81 warnings (v2 legacy CSS unused)
- `pnpm test` = 74 test files · **986 pass** · 1 fail = `tools/kyu-bridge/test/session-manager-ab.test.mjs` = **K1 소유 · Vitest runner 미탑재 · K1 라운드 회부** (K0 라운드 무영향)
- `pnpm build` = adapter-cloudflare done
- Playwright chromium-phone = **29 pass · 10 skip · 0 fail** (신 spec `portal-flow-ba` 9 pass 포함)

## 성능 예산 · 커밋 규약

- 커밋 메시지 = `!` 미포함 (BUILD 규약).
- PR body frontmatter + test-checklist `req:` 필드 포함.
- raw hex ALLOW_LIST 1 = `--merged` 시맨틱 토큰 (kit-tokens.css) · 나머지 hex 도입 없음.

## 다음 라운드 인수 (분산)

- **K1** = `index.json.requirements[]` 집계 · `size`·`next`·`conflict_with`·`blocked_by` 필드 반영 · `events[]` 신설 (K1-0916-B events 규약 정합) · `hubs metrics` (files_changed · tests_passed · last_action).
- **K2** = R001 스크린샷 원시 이슈 회수 실 진행 (흐름판 안 🔴 배지 표시 정본).
- **K0** = yaml PATCH API 편입 (지금 로컬 draft) · 다음 K0 라운드 = 실 데이터 소비 + 태스크 시트 events 합류 + 시맨틱 토큰 확장.

## 파일 변경 요약

- **A** `src/lib/ui/FlowBoard.svelte` (흐름판 전체 · 700 라인)
- **A** `src/lib/ui/flow-data.ts` (타입 · 시드 · 필터 · 파생)
- **A** `docs/spec/k0.md` (K0 절 분리 정본 · § K0-BA-1~10)
- **A** `e2e/portal-flow-ba.spec.ts` (9 pass · a1~a9)
- **M** `src/routes/+page.svelte` (activeTab hubs→flow · FlowBoard 소비)
- **M** `src/lib/kit-tokens.css` (`--merged` 신설)
- **M** `e2e/portal-aw.spec.ts` (aw-a1 tab-flow 갱신 · aw-c1 skip · legacy 처리)
- **M** `e2e/portal-smoke.spec.ts` (tab-hubs → tab-flow)
- **M** `docs/state/k0.md` (BA Active + § K0-BA)
- **M** `docs/tracking/k0.md` (K102)
- **M** `curiocity-relay/README.md` (requirements yaml 필드 규약)
