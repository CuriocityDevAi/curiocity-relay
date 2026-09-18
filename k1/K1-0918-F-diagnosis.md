---
round: K1-0918-F
hub: k1
pr: none
outcome: diagnosis-only
ledger_events:
  - '{"id":"R031","action":"consume","note":"진단 전용 · Kyu 09-18 실물 결함 8건 재현 · 뿌리 · 이전 착지 놓친 이유 · 재발 방지"}'
  - '{"id":"R002","action":"read","note":"index.json 실 데이터 대조 · requirements 39·reports 33·events 363·feature_maps 3"}'
  - '{"id":"R030","action":"read","note":"feature_maps nested vs top-level 스키마 정합 · 프로세스 0 뿌리"}'
  - '{"id":"R032","action":"read","note":"착지 판정 = statusToColumn 두 벌 존재 (K0 vs K1 relay) · 정본 분산 뿌리"}'
kyu_checks: []
---

## 요지

**코드 수정 0 · PR 0 · 산출물 = 이 문서 하나**. Kyu 실물 결함 8건 재현 + 뿌리 + 이전 라운드가 놓친 이유 + 재발 방지 테스트 제안. 마지막 = 구조적 뿌리 3줄.

**측정 정본**:
- index.json 실 데이터 = built_at `2026-09-18T09:56:21Z` · schema v4 · requirements=39 · events=363 · hubs=6 · feature_maps=3
- test-portal main SHA · K0-F +page.svelte · K0 FlowBoard.svelte · K0 flow-data.ts · relay build-index.mjs
- (Playwright 실 실행 불가 · K1 원격 헤드리스 미배선 · 코드 흐름 정밀 대조로 대체)

---

## 진단 1 — 클코 허브 칩 "실기 0" vs 실기 탭 배지 "2"

### 재현 로그
- **실기 탭 배지** (`src/routes/+page.svelte:1155`) = `myTurnItems.length` · index.json.reports 안 열린 PR + kyu_checks ≥1 + 미판정 필터 (line 213~250)
- **흐름판 칩 "실기"** (`src/lib/ui/FlowBoard.svelte:532`) = `quickCounts.drill` · `countByQuickFilter(data.requirements)` = `reqs.filter(r.column === 'drilling').length`
- **클코 허브 카드 안 "실기 N"** = 별도 렌더 지점 없음 · 착시 = 흐름판 안 각 hub row 안 drilling 열 카드 수 (실측 = 없거나 소수)

index.json 실측:
- requirements.column='drilling' = **16** (R001~R008 · R010~R012 · R018·R021 등)
- reports 안 열린 PR + kyu_checks 있는 것 = **2** (미판정 실기 대상)

= 두 숫자는 **다른 함수 · 다른 데이터 소스** 결과. 착시 아님. 하지만 사용자에게 "실기 2 vs 0" 은 혼동.

### 원인 (파일:줄)
- `src/lib/ui/FlowBoard.svelte:532` = `quickCounts.drill` (requirements column 기반 · 16)
- `src/routes/+page.svelte:1155` = `myTurnItems.length` (reports+PR 기반 · 2)
- `src/lib/ui/FlowBoard.svelte:512` = `myTurnCount ?? quickCounts.myTurn` (실기 탭 배지 값 prop 우선 · 통일 이력 K0-0916-H 결함 4c). 하지만 **실기 칩(line 532)은 여전히 quickCounts.drill 만 사용** → 통일 안 됨.

### 수정 위치·규모
- FlowBoard.svelte:532 · myTurnCount prop 소비 (line 512 정합) or drill 은 원장 정본 (drilling 열) · 실기 탭은 실물 PR 정본으로 명확 분리 라벨 (예: "원장 실기" · "실기 대상 PR")
- 규모 = **S** (라벨 변경 + prop 통일)

### 이전 착지가 놓친 이유
K0-0916-H 결함 4(c) = **myTurnCount 만** 통일 (line 512). "실기 <b>{quickCounts.drill}</b>" (line 532) 는 별건 · 검증 안 함. 테스트 = "chip-my-turn 값 일치" · chip-drill 값 미검증.

### 재발 방지 테스트
```ts
// tests/flow-board-badge-consistency.spec.ts
// 실기 탭 배지 === 흐름판 chip-drill 값 (또는 명확히 다른 정의로 라벨 분리 확증)
expect(page.getByTestId('tab-training-badge').textContent()).toEqual(page.getByTestId('chip-drill').textContent());
// OR 명확 분리:
expect(page.getByTestId('chip-drill').textContent()).toMatch(/원장 실기/);
```

---

## 진단 2 — "내 차례 2" 카드 표시 부재 · 칩 클릭 시 필터 무동작

### 재현 로그
- `chip-my-turn` 값 = `myTurnCount ?? quickCounts.myTurn` (line 512)
- 클릭 시: `filters.quickFilter = 'my-turn'` (line 508)
- 필터 함수 `applyFilters` (`flow-data.ts`) = `r.my_turn === true` 만 표시

index.json 실측: `my_turn: true` 인 requirements = **0** (모두 false)

= "내 차례" 필터는 **원장 requirements 안 my_turn 필드** 로 필터링 · 하지만 requirements 안 my_turn true = 0. UI 배지 (myTurnCount=2) 는 **reports+PR 정본** (다른 소스).

### 원인 (파일:줄)
- `src/lib/ui/flow-data.ts:428~439` = my_turn 계산 (myTurnPrKeys 대조 · landed_pr + hub → HUB_REPO key)
- 대부분 R-id 안 landed_pr 부재 · my_turn = false 결과.
- 필터 = `applyFilters(reqs, {quickFilter: 'my-turn'})` = 0건.
- 카드 표시 부재 = 착시 아님. **필터 결과 = 0 개 · 원장 카드 관점 · 실기 탭 배지 (2) = 실 PR 관점 · 두 세계 불일치**.

### 수정 위치·규모
- 옵션 A: 칩 클릭 시 실기 탭으로 자동 전환 (내 차례 = 실 PR 만).
- 옵션 B: `applyFilters` 안 my_turn 계산을 my_turn=true OR issued_id ∈ myTurnRounds 로 확장.
- 옵션 C: 원장 R-id 에 landed_pr 자동 채우기 (오케 원장 갱신 규약).
- 규모 = **M** (옵션 B 최소 · 옵션 C 정본).

### 이전 착지가 놓친 이유
K0-0917-J·K = my_turn 계산 로직 수정 · 하지만 **원장 안 landed_pr 부재 시 fallback 계산 = false 로 fix** (원문 comment). 결과 = my_turn true 0건 · 필터 무동작. 테스트 = my_turn true 를 mock 으로 넣어 필터 동작 확증 · 실 index.json 정합 미검증.

### 재발 방지 테스트
```ts
// tests/my-turn-filter-real-data.spec.ts
// 실 index.json 로드 후 chip-my-turn 값 > 0 시, 클릭 후 카드 노출 개수 == 값
const badge = await page.getByTestId('chip-my-turn').textContent();
const n = parseInt(badge.match(/\d+/)[0]);
if (n > 0) {
    await page.getByTestId('chip-my-turn').click();
    expect(await page.locator('[data-testid=btn-open-task]').count()).toBe(n);
}
```

---

## 진단 3 — ③착지·PR 열에 K0-0917-D · 0916-A · 0916-E 라운드 남음

### 재현 로그
- K0-F `+page.svelte:915` `completedRounds` = relayReports 안 pr merged/closed → round 문자열 set
- `flow-data.ts:422` = `if (issueKey && completedRounds.has(issueKey)) col = 'merged'` (원장 → 화면 강등)

**index.json 실측**:
- requirements 안 R002.issued_id=`K0-0917-D` · R005.issued_id=`K0-0916-A` · R012.issued_id=`K0-0916-E` (모두 status=landed)
- reports 안 `K0-0917-D` · `K0-0916-A` · `K0-0916-E` = **0건** (relay 안 push 안 됨)
- 다른 K0 라운드 (K0-0917-I · J · K · K0-0918-A/B/C) = reports 안 있음

= relay `k0/K0-0917-D-report.md` 등 **파일 부재** → completedRounds set 안 없음 → col='merged' 강등 미발동 → 착지·PR 열 남음.

### 원인 (파일:줄)
- **뿌리 데이터**: `curiocity-relay/k0/` 하위 K0-0917-D · K0-0916-A · K0-0916-E report md 파일 부재 · Push 안 됨 (K0 라운드 절차 누락 or 삭제됨)
- flow-data.ts:422 매칭은 정합 · 데이터 문제.

### 수정 위치·규모
- 옵션 A: relay k0/ 에 누락 리포트 소급 push (K0 오케 라운드 · Kyu 실기 · 별건)
- 옵션 B: fallback = GitHub PR merged 실측 (issued_id 매칭) → completedRounds 확장 (relay 리포트 부재 시 GitHub 정본)
- 규모 = **M** (옵션 B · K0 flow-data.ts 안 allPRsFlat 기반 confirmed set 편입)

### 이전 착지가 놓친 이유
K0-0917-J 결함 3 = "발부 PR merged/closed = ⑤ 열 강등" · **relay reports 만 정본** (relayReports.filter(isPrCompleted)). GitHub 실측 백업 없음 · 리포트 누락 = 강등 실패.

### 재발 방지 테스트
```ts
// requirements[i].issued_id + status=landed 인 R-id 대상 · GitHub PR 확인
// (a) 리포트가 relay 안 있고 pr merged → column=merged
// (b) 리포트가 relay 안 없어도 · GitHub API 로 PR merged 확증되면 column=merged
```

---

## 진단 4 — 카드에 PR 번호 부재 · 대기 카드 ID 부재

### 재현 로그
- FlowBoard.svelte:695 = `{#if r.issue_id}<span>{r.issue_id}</span>{/if}` (라운드 ID · 예: K0-0917-D)
- PR 번호 (예: PR#87 · PR#100) 별도 렌더 없음 · issue_id 만.
- 대기 카드 = column='waiting' · 15건 · **issued_id 모두 null** (실측 · R009·R014·R015·R016 등 issued_id=None)

= issued_id 없으면 "ID 부재" 표시 자체 안 됨 · 대기 카드 15건 모두 issue_id null → 라벨 미노출.
= PR 번호 렌더 규칙 자체 없음 (설계 누락).

### 원인 (파일:줄)
- `src/lib/ui/FlowBoard.svelte:695` = issue_id 만 렌더 · PR 번호 (landed_pr) 는 카드 렌더 안 노출.
- 대기 카드 = issued_id 부재 · 정본 (오케가 아직 발부 안 함) · UI 안 R-id (r.id · 예: R009) 표시하면 해결.

### 수정 위치·규모
- FlowBoard.svelte:694-698 안 fallback = `{r.issue_id ?? r.id}` (R-id 폴백)
- 착지·PR 열 카드에 landed_pr 표시 = `#{landed_pr}` 배지
- 규모 = **S** (렌더 1줄)

### 이전 착지가 놓친 이유
K0-0918-B 결함 3 = 검색·PR# 필터 (`filters.pr` 편입) · 하지만 카드 자체 렌더 (line 695) 안 R-id 폴백 · landed_pr 표시 안 함. 테스트 = filter 동작 · 카드 라벨 미검증.

### 재발 방지 테스트
```ts
// 대기 카드 = R-id 폴백 노출
expect(page.locator('[data-column=waiting] [data-testid=issue-id]').first()).toContainText(/R\d+/);
// 착지·PR 카드 = PR# 노출
expect(page.locator('[data-column=landing] .card-pr').first()).toContainText(/#\d+/);
```

---

## 진단 5 — "구현 중" 열 비는 이유

### 재현 로그
- column='implementing' = requirements 안 **2건** (R019·R033 · 둘 다 hub=t0 · issued_id=T0-0917-B)
- 클코 (k0/k1/k2) 허브 안 구현 중 = **0건** (Kyu 관측 정합)

hubs.json 실측:
- k0 last_action="K0-0918-C 리포트" (running · 방금 활동)
- k1 last_action="K1-0918-E 리포트" (running · 방금 활동)
- t0/n0/m0/k2 last_action=None (idle · 활동 없음)

= 구현 중 열은 **requirements.status='issued'** 만 표시 · hub 상태 (running) 는 카드 배치와 무관.
= K0 라운드 진행 중 = R-id 원장에 반영 안 됨 · issued_id 만 채워지고 status=issued 없음.

### 원인 (파일:줄)
- `relay/scripts/build-index.mjs:statusToColumn` = `issued → implementing`
- 원장 안 issued 상태 R-id = 2건 · 나머지 K0/K1 활동은 원장 밖 (라운드 진행 = 원장 status 갱신 없음)
- 하드 UI 결함 아님. **원장 상태와 실제 활동의 불일치**.

### 수정 위치·규모
- 옵션 A: 허브 상태 (running · waiting-inquiry) 를 별도 배지로 카드 상단 노출 (원장 카드 아닌)
- 옵션 B: 오케 라운드 발부 시 R-id status=issued 강제 갱신 (원장 규약)
- 규모 = **M** (옵션 A · K0 UI 카드 위 hub state chip)

### 이전 착지가 놓친 이유
K1-0916-E 상태 정밀화 · K1-0917-B feature_maps 등 = hubs.json 정보 노출 · 하지만 흐름판 카드와 연결 안 됨. 테스트 = hubs.json 필드 정합만 · 카드 배치 연결 미검증.

### 재발 방지 테스트
```ts
// hubs 안 running 이면 구현 중 열 카드 or 대체 표시 확증
if (hubs.k0.state === 'running') {
    expect(page.locator('[data-hub=k0][data-column=implementing]').count()).toBeGreaterThan(0);
    // OR: hub row 상단 = "K0 실행 중" 배지
    expect(page.locator('[data-hub=k0] .hub-state-badge')).toContainText('실행 중');
}
```

---

## 진단 6 — 카드 클릭 시 시트 무반응

### 재현 로그
- FlowBoard.svelte:681-684 = `col.key === 'drilling' ? openDrillSheet(r.id) : openTaskSheet(r.id)`
- `openTaskSheet(id)` (line 295): `sheetTaskId = id; openSheet = 'task';`
- `openDrillSheet(id)` (line 303): `sheetTaskId = id; openSheet = 'drill';`
- BottomSheet 렌더 안 `open={openSheet !== null}` (별도 지점)

**코드 흐름 정본** · 이벤트 바인딩 · 상태 변경 · 시트 open 정합.

**Kyu 실기 시 무반응** 가능 원인:
- (a) 다른 element (전체 카드) `onclick` 없어서 · 카드 배경 클릭은 no-op · 오직 `btn-open-task` 버튼만 클릭 감지
- (b) 시트 컴포넌트 (`BottomSheet`) 안 z-index · 다른 overlay 가 가려짐
- (c) 콘솔 에러 · svelte reactivity 이슈

### 원인 (파일:줄)
- FlowBoard.svelte:681 = `class="card-title"` 버튼만 클릭 감지 · **카드 배경 클릭 안 됨**
- Kyu 관측 "카드 클릭" = 배경 (title 외 영역) 클릭 → 무반응 정상 (설계).

### 수정 위치·규모
- 카드 전체 `<button>` or `<a>` 로 감싸기 (btn-open-task 확장) · 배경 클릭도 시트 open
- 규모 = **S** (렌더 wrapper)

### 이전 착지가 놓친 이유
btn-open-task Playwright 테스트 = 버튼 직접 클릭 pass. 사용자는 카드 배경 (제목 밖 영역 · 배지 · 여백) 클릭 · 무반응. 테스트 = 사용자 실제 클릭 위치 미시뮬레이션.

### 재발 방지 테스트
```ts
// 카드 배경 클릭 = 시트 open
await page.locator('[data-hub=k0][data-column=waiting] .flow-card').first().click({position: {x: 100, y: 100}});
expect(page.getByTestId('bottom-sheet-task')).toBeVisible();
```

---

## 진단 7 — "머지 44 이번 주" 집계 기간 · 중복

### 재현 로그
- `src/routes/+page.svelte:915~925` `mergedThisWeekCount = allPRsFlat.filter(p.merged && merged_at (or created_at) >= 7일前)`
- allPRsFlat = 모든 프로젝트 PR 병합 (test-portal + todoboss + grownest + storeport + agilo)
- 폴백 = merged_at 부재 시 **created_at** 사용 → **created_at ≥ 7일前 = "이번 주 생성 & merged"** (다른 의미)

= 오래 전 열려서 이번 주 merged 된 PR = merged_at 이 있으면 정확 · 없으면 created_at 폴백 · 정확 집계 안 됨.
= "이번 주 merged" 정본 = merged_at 만 신뢰 · created_at 폴백 = 실 뜻 다름 (이번 주 생성).
= 중복 = 같은 PR 이 여러 project 에 잘못 편입 시 (unlikely · 각 repo 별 API).

44 = agilo · todoboss · grownest · storeport · test-portal 이번 주 merged 합계 (감사·기능·bot 커밋 다수).

### 원인 (파일:줄)
- `+page.svelte:921` `const mAt = ... .merged_at ?? p.created_at` (created_at 폴백 부정확)

### 수정 위치·규모
- merged_at 부재 시 = 폴백 없이 skip · 정확 카운트
- 규모 = **S** (라인 하나)

### 이전 착지가 놓친 이유
K0-0916-H 결함 4(d) = "GitHub 실측 merged" · merged_at 우선 편입 · created_at 폴백 = 데이터 부재 케이스 방어 · 하지만 오탐 유발. 테스트 = merged_at 있으면 정확 · 폴백 케이스 미검증.

### 재발 방지 테스트
```ts
// merged_at 없는 PR = 카운트 안 됨 (created_at 폴백 금지)
const prs = [{merged: true, created_at: <7일전>, merged_at: null}];
expect(computeMergedThisWeek(prs)).toBe(0);
```

---

## 진단 8 — 지도 탭 "불러오는 중" 고정 · 프로세스 0

### 재현 로그
- `src/lib/ui/FeatureMap.svelte:337` = `{#each area.processes as p (p.id)}` (area 안 nested processes 렌더)
- `+page.svelte:1259` = `<p class="status">불러오는 중…</p>` (loadingView=true 시)

**index.json 실측**:
- feature_maps = 3 (test-portal · todoboss · storeport)
- **각 map.areas[].processes = 0건** (모두 빈 배열)
- 대신 `map.processes` top-level = 37/128/46 건 (K1 relay flatten 결과)

= K0 FeatureMap.svelte 는 `area.processes` 소비 · **relay build-index 는 top-level processes[] with area FK 저장** · 데이터 스키마 불일치. area.processes = 0 → 렌더 안 됨 → "프로세스 0" 표시. 그리고 loadingView 는 fetch 성공 시 false 되지만 · 렌더 데이터 없음 = 사용자에게 "불러오는 중" 이후 빈 화면 (착시).

**재시도 코드 (K0-0918-B invalidateIndexCache) 위치**: `feature-map-data.ts:131` · `FeatureMap.svelte:79-88`. 이 코드는 fetch 재시도 · **파서 문제 미해결** (fetch 성공해도 데이터 빔).

### 원인 (파일:줄)
- `relay/scripts/build-index.mjs:parseFeatureMapYaml` (K1-0917-C·D) = top-level processes[] 로 flatten (실 리포 스키마 정합) · area.processes = [] 로 저장
- `src/lib/ui/FeatureMap.svelte:337` = area.processes 만 소비 (nested 스키마 기대)

### 수정 위치·규모
- 옵션 A: relay build-index = area FK 로 processes 를 area.processes 로 re-nest 출력
- 옵션 B: K0 FeatureMap.svelte = top-level processes 소비 · area FK 로 그룹핑
- 규모 = **M** (옵션 A · relay 수정)

### 이전 착지가 놓친 이유
K1-0917-D 후속 파서 정정 = 실 리포 top-level processes 지원. K0 UI 는 여전히 nested. 계약 mismatch. contract test = "processes 총 수" 검증 · UI 렌더 미검증.

### 재발 방지 테스트
```ts
// 지도 탭 · 첫 area 안 프로세스 카드 노출
await page.goto('/#map');
await page.waitForSelector('[data-testid=fm-area-card]');
expect(page.locator('[data-testid=fm-process-card]').first()).toBeVisible();
// OR: index.json area.processes = top-level processes 재구성 후 각 area 최소 1건
```

---

## 구조적 뿌리 요약 3줄

1. **statusToColumn 함수 두 벌** (K0 `flow-data.ts:359` `landed→landing` vs K1 relay `build-index.mjs` `landed→drilling`) — 정본 소유 불명확 · index.json 안 column 은 K1 값 저장 · K0 UI 는 자체 재계산 · 실 렌더는 K0 값 · **양쪽 사양이 흩어져 있어 어느 라운드도 "정본 하나" 를 손보지 못함**. 결함 3·5 뿌리.

2. **원장 (requirements.yaml) 과 실물 (relay reports + GitHub PR) 이 별개 정본**. quickCounts.drill (원장 column) vs myTurnItems (reports+PR) 두 세계 · UI 는 두 소스를 다른 함수로 소비 · 값 불일치 = 사용자 혼동. K0-F +page.svelte 안 completedRounds 만 브릿지 · GitHub 실측은 mergedThisWeek 만 · 카드 배치는 원장 정본만. 결함 1·2·3·5 뿌리.

3. **파서 · 렌더 · 계약 3분리**. relay build-index 파서 (K1) · K0 UI 소비자 · contract test (grep 기반 · 실 렌더 미검증) 서로 계약 문서 없음 · 스키마 변경 (nested→flatten) 시 한쪽만 fix · 다른쪽 오작동. **정합 검증 = 소스 grep 아닌 실 렌더 assert 로 격상 필요** (Playwright · 실 index.json). 결함 8 뿌리.

---

## 계량 요약

| # | 항목 | 원인 정본 | 규모 | 이전 라운드 놓침 |
|---|---|---|---|---|
| 1 | 실기 배지 2 vs 0 | 두 함수 · 두 데이터 소스 | S | 배지 통일 검증 · 칩 미검증 |
| 2 | 내 차례 필터 무동작 | my_turn=false 대다수 | M | mock 정합 · 실 데이터 미검증 |
| 3 | 착지·PR 열 잔존 | relay k0 reports 부재 | M | reports 정본만 · GitHub fallback 없음 |
| 4 | PR 번호·ID 부재 | issue_id 부재 + 폴백 없음 | S | 렌더 라벨 미검증 |
| 5 | 구현 중 열 빔 | 원장 status vs 활동 분리 | M | hubs.json 소비만 · 카드 연결 미검증 |
| 6 | 카드 클릭 무반응 | 배경 클릭 handler 없음 | S | 버튼 클릭만 테스트 |
| 7 | 머지 44 집계 | created_at 폴백 오탐 | S | merged_at 있으면 정확 · 폴백 미검증 |
| 8 | 지도 프로세스 0 | area.processes vs top-level | M | 파서 pass · 실 UI 렌더 미검증 |

## 관련 파일 (수정 없음 · 참조만)

- `src/routes/+page.svelte:213-297·915-925·1155·1259` (myTurnItems · mergedThisWeek · 지도 상태)
- `src/lib/ui/FlowBoard.svelte:295-306·422-462·505-533·664-737` (openSheet · col · 칩 · 카드 렌더)
- `src/lib/ui/flow-data.ts:359-370·417-462` (statusToColumn · fetchRelayLedger)
- `src/lib/ui/FeatureMap.svelte:65-108·337` (loadProject · area.processes 렌더)
- `src/lib/ui/feature-map-data.ts:57-125·171-215` (fetchIndexJson · fetchFeatureMap)
- `relay/scripts/build-index.mjs` (statusToColumn · parseFeatureMapYaml · collectRequirements)
- `curiocity-relay/index.json` (schema v4 · requirements 39 · reports 33 · feature_maps 3 · hubs 6)
