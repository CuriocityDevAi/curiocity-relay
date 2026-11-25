#432 APPROVE · #34 APPROVE

## #432 storeport — setup-multi-store 멱등 + PS PB1·nickname

| 항목 | 결과 | 근거 |
|---|---|---|
| **페이지네이션 안전** | ✅ 안전 | Medusa v2.17.2 MikroORM — `take` 미지정 시 전체 반환. `query.graph({entity:"inventory_item"})` / `listInventoryLevels({location_id})` 무제한 |
| **sales_channel link 멱등** | ✅ | `query.graph(entity:"stock_location", fields:["sales_channels.id"])` 선조회 → 이미 포함 시 skip |
| **inventory level 차집합** | ✅ | `listInventoryLevels({location_id:psId})` 선조회 → Set 차집합 → `toCreate` 만 생성 |
| **`--ps-pb1 off` = `pb1_pct:0`** | ✅ | Admin `page.tsx:336` `locPb1Enabled ? null : 0` 과 동일. `patchLocationSettings` 에 `nullDeletes:true` 고정 |
| **`--ps-pb1 on` = 키 삭제(브랜드 상속)** | ✅ | `pb1_pct:null` + `nullDeletes:true` → DB row 에서 키 제거 → merged view 브랜드 추종 |
| **POS quote가 location override 읽음** | ✅ | `quote/route.ts:110` `getForLocation(stock_location_id)` → merged → `pb1_pct > 0 ? … : 0` |
| **`--ps-nickname` 경로** | ✅ | `parseArgs`→`validateNickname`(형식)→`upsertStore(psId)`→`setNickname(psId,nick)` |
| **nickname 멱등** | ✅ | `current === parsed.psNickname` → skip |
| **2회 apply 쓰기 0** | ✅ | 테스트 `M0-1125-H · 2회 apply 멱등` — workflow run / setNickname 2회차 0 |
| **dry-run 쓰기 0** | ✅ | 테스트 통과 |
| **부분 상태 재실행** | ✅ | 각 단계 독립 선조회 → skip |
| **typecheck / lint / CI** | ✅ | PR 체크리스트 + heavy-mac pass |

**지적 (운영 주의):** `--pim-name` 기본값 `"PIM"` → 운영 명령어에 `--pim-name "Soopsok Sweets PIM3"` 명시 필요.

---

## #34 curiocity-relay — ci-watch 확정 레이아웃

| 항목 | 결과 | 근거 |
|---|---|---|
| **허브 큐 대기 칩 + └ 실행 줄** | ✅ | `renderHubQueue` — 대기 칩 오른쪽, └ 실행 줄, 없으면 `—` |
| **CI 큐 제목 SH/SL/FH/FL** | ✅ | `─ CI 큐 (SH n · SL n · FH n · FL n) ─` |
| **스피너** | ✅ | 10프레임 · 120ms 독립 타이머 · `--once` 첫 프레임 고정 |
| **큐 정체 빨강(60s/60s/180s)** | ✅ | 처리기 비어 있는 상태에서만 판정 · 바쁘면 빨강 아님 |
| **주의 구역** | ✅ | 큐 정체 + 일반 카드 주의 → `renderCaution` |
| **9단계 띠** | ✅ | queue·hub·report·pr·ci_pending·ci_running·ci_result·review·merge |
| **0건 접힘** | ✅ | 허브 큐 0건 → `—`. CI 큐 활동 없으면 제목만 |
| **`--once --width=80` 실행 로그** | ✅ | 모든 줄 EAW display width ≤ 80 확인 |
| **`--once --width=120` 실행** | ✅ | 정상 출력 |
| **오늘 완료 N = WIB done 수** | ✅ | 56건 · `getWibDateStr` UTC→WIB 변환 후 비교 |
| **인터랙티브 5초 — 스피너 프레임 변경** | ✅ | 화면 갱신·프레임 순환 직접 확인 |
| **gh 호출 캐시 30초** | ✅ | `defaultFetchPrState` / `fetchPrBySearch` Map + `cachedAt < 30_000` |
| **`node --test ci-watch-v2.test.mjs`** | ✅ | 71 pass 0 fail |
| **줄 폭 ≤ 터미널 폭** | ✅ | `sectionHr` / `truncateWidth` EAW 기준 |

---

## 직접 실행 로그

```
# --once --width=80
ci-watch  11/25/2026 12:43:48  ●진행 4  ■주의 1  ✔오늘 56   runner v8.3.2   CI ▲●●●
─ 주의 (1) ─────────────────────────────────────────────────────────────────────
■ M0-1125-H    m0  ●●●●●●◐○○  CI결과  13분  #432  PS 매장 먼저
  └ CI 결과 13분 전
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ───────────────────────────────────
  m1  —
    └ ⠋ M1-1125-K  작업 2분
  ...
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ────────────────────────────────────────────
  storeport-heavy  —
    └ ⠋ #431  heavy-mac 5분
─ 진행 중 (4) ──────────────────────────────────────────────────────────────────
● M1-1125-K    m1  ●◐○○○○○○○  작업    2분          POS Cart 세금 0 /…
● R0-1125-Q    r0  ●◐○○○○○○○  작업    2분          ledger/decision-p…
■ M0-1125-H    m0  ●●●●●●◐○○  CI결과  13분   #432  PS 매장 먼저
─ 오늘 완료 56 (Enter 펼치기) ──────────────────────────────────────────────────
 j/k 이동 · Enter 상세 · / 필터 · r 새로고침 · q 종료

# node --test ci-watch-v2.test.mjs
# tests 71
# pass  71
# fail  0
```
