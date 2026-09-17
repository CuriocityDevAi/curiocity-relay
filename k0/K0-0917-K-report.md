---
round: K0-0917-K
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/129
base: 9176858
spec_bump: v1.K0-0917-K
req: [K0-BN-1, K0-BN-2, K0-BN-3, K0-BN-4, K0-BN-5, K0-BN-6]
ledger: [R003, R031, R002, R032]
processes: [pr-detail-view, env-open-sse, training-tab, flow-board, feature-map]
finished_at: 2026-09-17
---

# K0-0917-K · 딥링크 회수 · 상태 태그 · 칩=카드 · 히스토리 재편 · 영향 절 (BN · R003·R031·R002·R032) 착지 리포트

**Kyu 원문 (2026-09-17)**: 5 항목 · 착지 조건 = "프로덕션에서 Kyu 맥 Chrome이 localhost:4321로 열린 스샷 · 카드 수 = 칩 수 일치 스샷 · '후속' 0".

**base** = main@9176858 (K1-0917-G 오케 머지 후).
**PR** = #129.
**착지 직전 origin/main 재병합** = 완결 (K1 파일 편입 · 충돌 없음).

## 5 항목 소화

### BN-1 · 딥링크 회수 (R003 · 치명)

**뿌리 확증 (K0 실측 · 프로덕션 재현)**:
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:1012` `openTestMode` 파생 = `firstDeep = checksItems.find(...)?.deep_link` = **상대 경로** (예 `/payroll/run`). 그대로 `{ kind: 'deep-link', url: firstDeep }` 반환.
- 라인 1760 `window.open(openTestMode.url, '_blank')` = 브라우저가 상대 URL 을 **현재 origin (`test.curiocity.company`) 로 해상** → `test.curiocity.company/payroll/run` 열림.
- K0-0917-I 는 `startTraining()` (라인 342 · `[✓ 준비됨 · 실기 시작]` 이후) 만 조립 정본화 · **[테스트 열기]** 원 클릭 경로 (라인 1754) 는 미회수.

**K1 계약 위반 실측**:
- `tools/kyu-bridge/src/env.mjs:246` (deployed_url 흐름): `sseSend(res, 'ready', { jobId, url, autologin, source: 'deployed_url', elapsed_ms })`.
- `tools/kyu-bridge/src/env.mjs:438` (web/expo 흐름): `sseSend(res, 'ready', { jobId, url, autologin, autologin_applied, source, workdir, profile, elapsed_ms })`.
- **`base_url` · `home` · `port` 3 필드 모두 부재** → K0-0917-I 조립 정본이 base_url null 상태로 발동 → `assembleDeepLink` blocked 반환 · 실제 환경에서는 [실기 시작] 활성 자체가 어려움.

**정본 (K0-0917-K)** = 3 방어 편입:
1. **`openTestMode` 상대 URL 배제**: `firstDeep` 이 절대 URL (http/https) 만 `kind:'deep-link'` 반환 · 상대 + previewPort 있음 → `kind:'devenv'` (SSE 데몬 강제) · previewPort 부재 + deployedUrl 있음 → 절대 조립 후 `kind:'deployed'`.
2. **SSE ready 폴백**: base_url 부재 시 `project.previewPort` 로 `http://localhost:<port>` 자동 조립 (Kyu 원문 정본 · K1 계약 위반 완화). data.url · data.port 도 폴백 소비.
3. **onclick 최후 방어**: `window.open` 호출 전 `/^https?:\/\//i.test()` 재확증 · 상대 유입 시 `connectEnvOpen()` 강제 (window.open 금지).
4. **startTraining 절대 확증**: `assembleDeepLink` 결과가 상대이면 envError 표시 · window.open 금지.

### BN-2 · 상태 태그 (5 색) + 상태 필터 실동작 (R031)

- **5 색 GitHub 규칙** (`src/routes/+page.svelte` `statusLabel` 매핑):
  - 🟢 미판정 (unjudged · `--pass`) = 열린 PR + case_count ≥ 1 (기본 정본)
  - 🔵 판정됨 (judged · `--accent`) = 열린 PR + case_count = 0 (자동 머지 대기)
  - 🟣 머지됨 (merged · `--merged`) = merged=true
  - 🔴 닫힘 (closed · `--fail`) = closed + !merged
  - ⚪ 초안 (draft · `--muted`) = is_draft
- **필터 실동작 정본** = `filteredMyTurnItems` 파생이 filterStatus 값별로 다른 소스 (myTurnItems | allPRsFlat 각 필터). 이전 (K0-0917-J) 은 `unjudged` 만 실동작 · 나머지 4 상태는 no-op → **정본 편입**.
- 각 카드 = `.status-tag[data-status]` 상단 태그 렌더.

### BN-3 · 내 차례 = 칩 = 카드 (R002)

- **뿌리** = 이전 (K0-0917-J) 매칭 = `myTurnRounds.has(r.issued_id)` = round 문자열 매칭. test-portal 원장 R-id 의 `issued_id = "K0-0917-D"` (등) 가 myTurnItems.round (동일 문자열) 와 매칭 → my_turn 태그 오노출 (Kyu 실기 09-17 확증).
- **정본 (K0-0917-K)** = **PR key 정확 매칭**:
  - `myTurnPrKeys: Set<string>` = "owner/repo/N" 집합 (`+page.svelte` derived).
  - `HUB_REPO: Record<string, string>` (`flow-data.ts`) = k0/k1/k2 → CuriocityDevAi/test-portal · n0 → grownest · t0 → todoboss · m0 → storeport.
  - `flow-data.ts fetchRelayLedger` = `(landed_pr && HUB_REPO[hub]) → prKey → myTurnPrKeys.has(prKey)` = my_turn.
  - test-portal 원장 R-id (R001~R107) = landed_pr 부재 or 다른 리포 PR → key 매칭 실패 → **my_turn=false 확증** (Kyu 원문 "test-portal R-id 는 절대 '내 차례' 되지 않게").
  - 역호환 (landed_pr 부재 + issueKey Set 안 있음) 시 myTurnRounds 폴백 유지.

### BN-4 · 히스토리 = 태스크 처리 이력 (R002)

- **정본 (Kyu 원문)** = "이 task 를 클로드코드가 어떻게 처리했는지" 사람 문장 + 시각 + 주체.
- **사람 문장 정본** = `humanEventSentence(kind, text, hub)` 매핑 (예):
  - `reconcile` → "K0 가 원장과 대조함"
  - `report-push` → "K0 가 리포트 게시"
  - `priority-change` → "K0 가 우선순위 바꿨어요"
  - `issued` → "K0 발부됨"
- **기술 로그 접힘** = `read` · `reconcile` · `daemon-read` · `daemon-diff` (파일 감지 원시) = `<details>` 접힘 절 · 기본 미노출 (Kyu 원문 지시).
- **원천 5 합류 상태**:
  - (a) 원장 yaml git 이력 (K1-G events) = **편입 완결** (K1-0917-G 실측 · docs/audits/K1-0917-G-ledger-events.log 확인)
  - (b) 발부 (report-push · inquiry-push) = **편입 완결** (기존 events 소비)
  - (c) 터미널 대조·상충 (reconcile/consume/conflict/defer/silent-miss/mismatch) = **편입 완결** (K1 events kind 소비)
  - (d) PR 열림/머지 (GitHub webhook) = K1 편입 대기 · 폴백 = 원장 status 변경 이벤트 소비
  - (e) Kyu 판정 (D1) = 편입 대기 · 별건 라운드

### BN-5 · 영향 절 재구성 + R-id → PR 폴백 (R032)

- **영향 절 재구성**:
  - `[자세히 보기]` + `[지도에서 보기]` = `.impact-actions` 로 묶음.
  - 하단 `.sheet-actions` 에서 `[지도에서 보기]` 제거 (Kyu 원문 지시).
- **R-id → PR 폴백**:
  - FlowBoard 신규 prop `relayReports?: Array<{ round; pr }>` 편입.
  - `linkedPrFromReport` derived = `relayReports.find(r.round === currentTask.issue_id)?.pr` 에서 PR # 추출.
  - `!landed_pr && !linkedPrFromReport` 만 "이 R-id에 연결된 PR 없음" 표시.
  - M0-0915-A (포크 #6 · storeport #111) 등 landed_pr 부재 R-id 도 report frontmatter pr 로 확증.

### BN-6 · 파일 경계

- **K0 소유 전량** · 이번 라운드 = **파일 경계 예외 없음** (모든 변경이 K0 소유 파일: `src/routes/**` (api 제외) · `src/lib/ui/**` · docs).

## 프로덕션 workflow 실행

- **Run ID** = `35202284241` (진행 중 · 완결 시점에 결과 편입)
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35202284241
- **결과** = CI 완결 후 편입.

## Kyu 맥 확증 스샷 회부

- **핵심 스샷 1**: **Kyu 맥 Chrome 새 프로필 창이 `http://localhost:4321/payroll/run?...` 로 열림** (착지 조건 정본 · BN-1 확증).
- **스샷 2~6**: 상태 필터 5 옵션 각 1 회 실기 (BN-2 확증).
- **스샷 7**: 흐름 탭 chip-my-turn 수 = 실기 탭 목록 개수 일치 (BN-3 확증).
- **스샷 8**: 태스크 시트 안 "히스토리 (태스크 처리 이력)" 사람 문장 + "기술 로그" 접힘 (BN-4 확증).
- **스샷 9**: 태스크 시트 안 "영향" 절 안 `[자세히 보기] · [지도에서 보기]` 인접 노출 · 하단 sheet-actions 에서 [지도에서 보기] 제거 확증 (BN-5).

## K1 회부 (계약 위반 리포트)

- **K1 회부 요구**: 데몬 `/env/open` SSE `ready` 이벤트 payload 에 **`base_url` · `home` · `port` 3 필드 추가**. 없으면 K0 폴백 (project.previewPort 로 localhost 조립) 상주.
- **뿌리 파일** = `tools/kyu-bridge/src/env.mjs:246·438`.
- **K1 브랜치 편입 대상** = 두 sseSend 호출 · 필드 추가.

## 자기 검증

- `pnpm check` = 0 err · 89 warnings.
- `pnpm build` = adapter-cloudflare done.
- `pnpm test` = **81 files · 1050 tests pass · 0 fail**.

## 파일 변경 요약

- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (BN-1 openTestMode 상대 배제 · SSE port 폴백 · onclick 절대 확증 · startTraining 절대 확증)
- **M** `src/routes/+page.svelte` (BN-2 상태 태그 5 색 + filteredMyTurnItems 5-way · BN-3 myTurnPrKeys · FlowBoard prop 전달)
- **M** `src/lib/ui/FlowBoard.svelte` (BN-3 myTurnPrKeys prop · BN-4 humanEventSentence + 기술 로그 접힘 · BN-5 영향 절 안 [지도에서 보기] · linkedPrFromReport · relayReports prop)
- **M** `src/lib/ui/flow-data.ts` (BN-3 HUB_REPO 맵 + PR key 매칭 정본 · FetchLedgerOverrides myTurnPrKeys 편입)
- **M** `docs/spec/k0.md § K0-BN-1~6` (신설)
- **M** `docs/state/k0.md § K0-BN Active` (편입)
- **M** `docs/tracking/k0.md § K115` (신설)
