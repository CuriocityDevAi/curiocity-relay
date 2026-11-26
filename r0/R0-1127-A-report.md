relay#61: APPROVE (필수 수정 0건)
fork#282: APPROVE (필수 수정 0건)

---

## relay#61 (M0-1127-A — ci-watch 진행 중 9단계 띠 복구 v1.18)

### 명세 9개 요소 전수 대조

| 요소 | 판정 |
|---|---|
| CW-PROG 9칸 띠 · 단계 이름 · 색 3단계 · └ 이유 | ✅ 일치 |
| CW-HEAD `●진행 N` = pipelinePrompts 수 | ✅ 일치 |
| CW-HUBQ | ✅ 보존 |
| CW-CIQ 열 6개 | ✅ 보존 |
| CW-CIQ-TODAY | ✅ 보존 |
| CW-DONE 기계별 4줄 / 전체=세 줄 합 / 넘김 폐지 | ✅ 보존 |
| CW-ALERT countdown 위로 이동 | ✅ 일치 |
| CW-RENDER `[build-hubs]` 필터 | ✅ 일치 |
| CW-VERSION 1.18 | ✅ 일치 |

### 렌더 직접 실행 (폭 101 · pipelinePrompts 2건)

```
ci-watch v1.18 (2026-11-27)  2026/11/27 05:32:00  ●진행 2  ■주의 0  ✔오늘 3  runner v8.3.2  heartbeat 0분전
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ──────────────────────────────────────────────────────────
  m0  M0-1127-A  5분
    └ ⠋ M0-1127-A  작업 중
  m1  —  ...
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ──────────────────────────────────────────────────────────────────
  풀                대기    MBP M1   iMAC M1   클라우드   평균대기
  storeport-heavy   —       쉼       쉼         —         -
  storeport-light   —       OFF      OFF        —         -
  ...
─ 진행 중 (2) ─────────────────────────────────────────────────────────────────────────────────────────
  ● M1-1127-A    m1  ●◐○○○○○○○  작업    5분    #101    예시 작업 1
  ■ M2-1127-A    m2  ●●●●◐○○○○  CI대기  18분   #1      예시 작업 2
    └ CI 미시작
─ 오늘 완료 3 (r 갱신 · q 종료) ────────────────────────────────────────────────────────────────────────
  storeport   05:55 WIB  (10분 전)  ✔  CI
  MBP M1 오늘     PR 0 · PT 0 · 잡 2
  iMAC M1 오늘    PR 0 · PT 0 · 잡 1
  클라우드 오늘   PR 0 · PT 0 · 잡 0 · 넘김 폐지
  전체 오늘       PR 0 · PT 0 · 잡 3
  다음 갱신 30초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

### spec guard 테스트 직접 실행

```
node --test scripts/test/ci-watch-spec-guard.test.mjs
# tests 7 / pass 7 / fail 0 / duration_ms 111
```

### 변형 테스트 (1d)

| 변형 | 결과 |
|---|---|
| 구역 순서 뒤바꿈 (prog ↔ done) | G-SECT 가드가 잡음 ✅ |
| stageStrip('hub') 길이 | 9칸 (●◐○○○○○○○) ✅ |
| stageStrip('unknown') 길이 | 9칸 (○○○○○○○○○) ✅ |
| [build-hubs]/[claim]/[hub-runner-*] | G-RENDER 필터 확인 ✅ |

### 의심 2건 판정 (1c)

**① `curiocity-devai-method#1` 거짓 경보**
판정: 이 PR의 버그 아님. 기존 버그 (collect-view.mjs:168 `_SEARCH_REPOS`에 `curiocity-devai-method` 미등록 → `fetchPrBySearch` null 반환 → `fetchPrState`가 storeport#1 기본값으로 호출 → PR 상태 오판 → ci_pending 계속 유지 → 빨강). 고칠 위치: `collect-view.mjs:168-172` `_SEARCH_REPOS` 또는 `line:27` `NO_CI_REPOS`.

**② 제목이 "🔴 방법론 v2.0"으로 나옴**
판정: 이 PR의 버그 아님. `sources-local.mjs:198-208` `readQueueTitle` ① priority가 `원장 대사:` 첫 따옴표를 추출한다. 큐 파일에 따라 추출 텍스트가 task-specific하지 않을 수 있음. `c.title` 렌더 자체는 올바름. 데이터 소스 문제.

### relay#60 충돌 지점 (1f)

`scripts/ci-watch.mjs` 에서 충돌 예상:
- 버전 이력 줄 (같은 줄 수정)
- `CI_WATCH_VERSION`: relay#60 `'1.15'→'1.17'` vs relay#61 `'1.15'→'1.18'` → git conflict

relay#60 머지 후 relay#61 rebase 필요. 머지 순서: relay#60 → relay#61.

---

## fork#282 (M3-1127-A — spec-guard-audit + 보존 테스트 확장)

### spec-guard-audit 직접 실행 (2d)

```
node scripts/spec-guard-audit.mjs
[audit] 명세 로드: local:…/pos-payment-flow.md  → 33개 ID 파싱
[audit] 명세 로드: local:…/pos-order-detail.md   → 3개 ID 파싱
총 36개 ID · ✅ OK: 32 · ❌ FAIL: 0 · ⚠️ WARN: 4
📋 todo(이번 라운드 미완): 9개
[audit] ✅ 통과 (exit 0)
```

### 명세 ID 36개 커버 확인 (2a)

pos-payment-flow.md 33개 + pos-order-detail.md 3개 = 36개. 가로형/세로형 표 파서 모두 작동. ✅

SELL-HAND-OVER `todo:true` 구조: `isTodo`로 WARN(todo) 처리 (exit 0). `📋 todo: 9개` 출력으로 가시성 확보 ✅. 상한(cap)은 미구현 → 권고: `todoCount > MAX_TODO → warn` 추가 고려.

### 무작위 8개 testID grep (2b)

| testID | 소스 |
|---|---|
| cart-pay | CartPanel.tsx ✅ |
| cart-sheet-close | CartSheet.tsx ✅ |
| checkout-pay-cash | checkout/[draftOrderId].tsx ✅ |
| checkout-pay-in-parts | checkout/[draftOrderId].tsx ✅ |
| success-title | SuccessReceiptAnim.tsx ✅ |
| success-receipt-section | SuccessReceiptAnim.tsx ✅ |
| hand-over | SuccessReceiptAnim.tsx ✅ |
| order-link-customer | orders/[orderId].tsx ✅ |

**SRC 검사 vs 렌더 검사 구분:**
- SRC 전용: `SUCC-ASK-PHONE-DEL` (소스 주석/prop 부재 체크) — 부재 확인 목적으로 타당. 취지 위반 아님.
- 렌더 포함: CART-X-44PT·CHECKOUT-TENDER-B·SUCC-RECEIPT·ORDER-LINK-CUSTOMER 등 Playwright 렌더 확인.

### testID 동작 무변경 · 기존 보존 테스트 (2c)

추가 testID 모두 Text 컴포넌트 속성 추가. 렌더 트리·스타일·동작 무변경 ✅.

보존 테스트 2 (spec-guard-pos-playwright.mjs): 기존 체크 보존 + 새 항목 추가 ✅.
보존 테스트 1 (m3-1126-k-phone-status-playwright.mjs): V4-7 섹션이 M3-1126-S success 화면 칩 제거를 반영해 업데이트. 구현 변경 올바르게 반영 ✅. (POS-SUCC-PHONEENTRY 명세 업데이트 별도 필요.)

### CI 스텝 (2c)

assertions job → `["self-hosted","curiocity-mac-fork-light"]`. zero-cloud 정책으로 iMac 전용 ✅.
