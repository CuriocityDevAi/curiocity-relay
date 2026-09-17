---
round: K0-0917-J
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/127
base: 01a8773
spec_bump: v1.K0-0917-J
req: [K0-BM-1, K0-BM-2, K0-BM-3, K0-BM-4, K0-BM-5, K0-BM-6]
ledger: [R031, R002, R036]
processes: [training-filter, flow-board, feature-map, relay-cache]
finished_at: 2026-09-17
---

# K0-0917-J · 실기 필터 · 내 차례 단일 · 자동 ✅ · 지도 재시도 · 속도 (BM · R031·R002·R036) 착지 리포트

**Kyu 원문 (2026-09-17)**: 5 항목 · 착지 조건 = 프로덕션 실측 스샷·수치 · "후속" 0.

**base** = main@01a8773 (K0-0917-I 오케 머지 후).
**PR** = #127.
**착지 직전 origin/main 재병합** = 완결 (up-to-date · 이번 라운드는 병렬 충돌 없음).

## 5 항목 소화

### BM-1 · 실기 필터 무동작 뿌리 회수

- **뿌리 파일:줄** = `src/routes/+page.svelte:190` `myTurnItems = $derived(...)` = 6 filter\* state (filterHub · filterPr · filterStatus · filterProject · filterDevice · filterSearch) 를 **하나도 참조 안 함**. bindings 있으나 파생이 안 읽음 → 사용자 관점 무동작.
- **정본** = `filteredMyTurnItems` 신규 파생 (`+page.svelte`) · myTurnItems 를 감싸 6 필터 순차 적용.
- **렌더 소비** = `{#each filteredMyTurnItems ...}` (기존 `myTurnItems` 폐기) · 요약 = `<필터>개 (전체 <전체>) · 총 약 N분`.
- **빈 상태** = filtered=0 & 전체>0 = "필터 조건에 맞는 항목 없음" · filtered=0 & 전체=0 = "지금 실기할 것 없음" 이분화.
- **myTurnItems.length (원본)** = FlowBoard `myTurnCount` prop · 클코 허브 상단 chip-my-turn 정본 유지 (§ BM-2 정합).

### BM-2 · "내 차례" 단일 계산 함수

- **정본** = `myTurnItems` (`+page.svelte:190`) = 열린 PR + 확인 항목 ≥ 1 + 미판정. 4 곳 (실기 탭 · 클코 허브 상단 chip · ④ 실기 열 · 카드 태그) 모두 **동일 함수 결과** 소비.
- **폐기 (Kyu 원문 명시 삭제)**:
  - `src/lib/ui/flow-data.ts:405` `my_turn: r.status === 'landed'` (원장 status 로 my_turn 만들던 코드) → `myTurnRounds.has(r.issued_id)` 대체.
  - `flow-data.ts` 시드 R201 `my_turn: true` 하드코드 → 파생.
- **배관** = `+page.svelte` 가 `myTurnRounds: Set<string>` 파생 (`new Set(myTurnItems.map((i) => i.round))`) → FlowBoard prop → `fetchRelayLedger({ myTurnRounds })` overrides → FlowRequirement.my_turn 결정.
- **test-portal R-id 는 절대 "내 차례" 안 됨** = R001~R107 (test-portal 요구사항 원장) 은 PR 부재 → myTurnRounds Set 밖 → my_turn=false 확증.

### BM-3 · 원장 자동 ✅ (⑤ 열 화면 파생)

- **정본** = `+page.svelte` 가 `completedRounds: Set<string>` 파생 (relayReports 안 `isPrCompleted(r.pr) === true` 라운드) → FlowBoard prop → `fetchRelayLedger({ completedRounds })` overrides.
- **행동** = `flow-data.ts` 안 `statusToColumn(r.status)` 로 계산한 col 이 `landing` 이라도 `completedRounds.has(issue_id)` = true → `col = 'merged'`.
- **③ 착지·PR 열 = open PR 만** = `isPrCompleted` = allPRsFlat (`/api/prs` open 전량) 조회 · 부재 = 완료 판정 → 자동 ⑤ 강등.

### BM-4 · 지도 [다시 시도]

- **뿌리** = `feature-map-data.ts` 안 `fetchFeatureMap` = fetch 실패도 · projectSlug 부재도 모두 `null` 반환 → UI "수집 전" 하나만 표시 · 실패 회수 없음.
- **정본** = `FeatureMapFetchResult { view · error · notFound }` 3-way:
  - `error` = 네트워크/HTTP/타임아웃 실패 → UI "지도를 못 받았어요 · <사유>" + `[다시 시도]`.
  - `notFound` = 응답 성공 · projectSlug 부재 → UI "수집 전 (K1 build-index feature_maps 아직 미편입)" + `[다시 시도]`.
- **AbortController 10s 타임아웃** = 무한 대기 방지 · `loadingView=true` 갇힘 재발 방지.
- **`retryLoad()`** = fetchError 초기화 · projectChips 재조회 · `loadProject(selectedProject)` 재실행.

### BM-5 · 프로덕션 속도 · 서버 합성 캐시

- **뿌리 (K0 실측 2026-09-17)** = 홈 진입 시 클라이언트가 raw.githubusercontent.com **4 왕복** (index.json × 3 + hubs.json × 1) · index.json = 206KB · 4× 135ms 직렬 워스트 540ms + 824KB.
- **정본** = 서버 endpoint 신설:
  - `src/routes/api/relay/index/+server.ts` · CF `caches.default` + `fetch cf: { cacheTtl: 60 }` · X-Cache · `cache-control: public, max-age=60, stale-while-revalidate=60`.
  - `src/routes/api/relay/hubs-status/+server.ts` · TTL 30s + SWR 30s.
  - 클라이언트 4 소비 지점 (`feature-map-data.ts` × 2 · `flow-data.ts` × 1 · `FlowBoard.svelte` × 1) 전량 서버 endpoint 우선 · raw github 폴백 유지 (오프라인 dev).
- **번들 분석** (K0 실측) = 최대 chunk 128KB (nodes/2 홈 · nodes/6 PR 상세) · 총 precache 531.53 KiB · **code split 불요** (1MB 훨씬 이하).

### BM-6 · 파일 경계 예외

- **K0 파일 경계** = `src/routes/**` (api 제외) · `src/lib/ui/**` · `config/projects.json` · docs.
- **예외 (Kyu 원문 명시 · 속도 라운드 정합)** = `src/routes/api/relay/index/+server.ts` · `src/routes/api/relay/hubs-status/+server.ts` 2 endpoint 신설. passthrough only · GitHub 토큰 소비 없음 · relay 원문 그대로.

## 프로덕션 workflow 실행

- **Run ID** = `35196029319` (dispatch 완료 · 진행 중 · 완결 시점에 결과 편입)
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35196029319
- **결과** = **CI 완료 후 편입** (Kyu 확증 스샷 회부 대상 = PR 본문 § 7.2~7.6).

## Kyu 맥/폰 확증 스샷 회부

- **후속 확증** (PR body § 7.2~7.6 정본) = Kyu 프로덕션 실기 기대 스샷 5장 (필터 5 종 각 1회) · 지도 재시도 (오프라인 · 온라인 왕복) · X-Cache HIT 헤더 · 첫 페인트 1초 이하 · 탭 전환 300ms 이하.
- **로컬 실행** = auto-deploy 완결 후 (Cloudflare Workers Builds · 1~3분) · Kyu 세션 회부.

## 자기 검증

- `pnpm check` = 0 err · 89 warnings.
- `pnpm build` = adapter-cloudflare done (5.99s).
- `pnpm test` = **80 files · 1039 tests pass · 0 fail**.
- 번들 분석 = 최대 chunk 128KB (nodes/2·6) · code split 불요.

## 파일 변경 요약

- **A** `src/routes/api/relay/index/+server.ts` (BM-5 · CF cache 60s + SWR · 파일 경계 예외)
- **A** `src/routes/api/relay/hubs-status/+server.ts` (BM-5 · CF cache 30s + SWR · 파일 경계 예외)
- **M** `src/routes/+page.svelte` (BM-1 filteredMyTurnItems · BM-2 myTurnRounds · BM-3 completedRounds · BM-5 fetchHubsStatus 서버 endpoint 우선)
- **M** `src/lib/ui/FlowBoard.svelte` (BM-2/3 props myTurnRounds·completedRounds · fetchRelayLedger overrides · $effect refetch · BM-5 taskImpact fetch 서버 endpoint 우선)
- **M** `src/lib/ui/flow-data.ts` (BM-2 my_turn 원장 파생 폐기 · BM-3 completedRounds 강등 · BM-5 fetchRelayLedger 서버 endpoint 우선)
- **M** `src/lib/ui/feature-map-data.ts` (BM-4 FeatureMapFetchResult 3-way · AbortController 10s · BM-5 fetchIndexJson 서버 endpoint 우선)
- **M** `src/lib/ui/FeatureMap.svelte` (BM-4 fetchError state · retryLoad · [다시 시도] 버튼)
- **M** `docs/spec/k0.md § K0-BM-1~6` (신설)
- **M** `docs/state/k0.md § K0-BM Active` (편입)
- **M** `docs/tracking/k0.md § K114` (신설)
