---
round: K0-0917-G
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/122
base: 242a7e9
spec_bump: v1.K0-0917-G
req: [K0-BJ-1, K0-BJ-2, K0-BJ-3, K0-BJ-4, K0-BJ-5]
ledger: [R035, R031, R011]
processes: [pr-detail-view, checks-render, my-turn-list, common-utils]
finished_at: 2026-09-17
---

# K0-0917-G · 실기 결함 3 + 필터 R035 + 토큰 키 통일 (BJ) 착지 리포트

**Kyu 원문 (2026-09-17)**: "R035 실기 목록 필터 · R031 결함 3 (게이트 빨강·checks 합류·✓✗ 버튼) · R011".

**base** = main@242a7e9 (K0-0917-F 오케 머지 후).
**PR** = #122.
**착지 직전 origin/main 재병합** = Already up to date.

## 5 항목 소화

### BJ-1 · 기계 판정 띠 회색 정본 (R011 정합)

- **뿌리 파일:줄** = `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` `machineState` derived · K1 `gateResp.state` 우선 소비 → `required_checks=[]` 프로젝트도 red 반환 가능.
- **정본 수정** = `hasRequired` derived 신설 (`requiredChecksFor(project).length > 0`). false = **gray 강제** · [성공] 활성.
- 회색 문구 = "🔘 검사 없음 · 사람 판정 진행 가능" (기 편입).

### BJ-2 · checks 다중 파일 합류

- **폐지** = `list.find((c) => c.pr === thisUrl)` (단일 매치).
- **정본** = `list.filter(...)` · `ChecksFile[] = { id, items }[]` 배열 · 각 파일 절 제목 = 파일 id.
- `checksItems` = `matches.flatMap((m) => m.items)` (기계 판정용 소비).

### BJ-3 · [✓][✗] 저장 · 이어 찍기 확증

- 기존 `setCase(caseId, r)` 정본 유지 · `caseStates` D1 저장.
- 프로덕션 클릭 실측 = Kyu 회부.

### BJ-4 · 실기 목록 필터 (R035)

- 상태 6종: `filterHub` · `filterPr` · `filterStatus` (unjudged 기본 / judged / merged) · `filterProject` · `filterDevice` · `filterSearch`.
- UI = `.training-filters` 칩 한 줄 (`data-testid="training-filters"`) · 6 컨트롤.
- 폰 시트 = 후속 (state 편입만).

### BJ-5 · 브리지 토큰 저장 키 통일

- 정본 = `test-portal:kyu-bridge-token:v1` (`kyu-bridge-client.ts` 정본).
- K0-0917-F 오식 (`test-portal:kyu-bridge:token:v1`) → **자동 이관** (`getBridgeToken()` 로직).
- "미저장" 오탐 제거.

## 프로덕션 workflow 실행

- **Run ID** = `35191194791`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35191194791
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip · 27.8s**

## 자기 검증

- `pnpm check` = 1068 files · 0 err · 88 warnings.
- `pnpm build` = adapter-cloudflare done.
- Playwright chromium-phone = **37 pass · 25 skip · 0 fail**.

## 파일 변경 요약

- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (BJ-1 hasRequired · BJ-2 ChecksFile · BJ-5 자동 이관)
- **M** `src/routes/+page.svelte` (BJ-4 filter state + UI)
- **M** `docs/spec/k0.md § K0-BJ-1~5`
- **M** `docs/state/k0.md · docs/tracking/k0.md § K111`
