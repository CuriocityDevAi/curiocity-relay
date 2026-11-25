PASS

# ci-watch TUI 버그 5종 수정 (M2-1125-L)

## 실 relay --once --width=100 출력 (12:38:34 WIB)

```
ci-watch  11/25/2026 12:38:34  ●진행 4  ■주의 1  ✔오늘 54  runner v8.3.2   CI ●▲●●
─ 주의 (1) ─────────────────────────────────────────────────────────────────────────────────────────
▲ M0-1125-H    m0  ●●●●●●◐○○  CI결과  7분  #432  PS 매장 먼저
  └ CI 결과 7분 전
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ───────────────────────────────────────────────────────
  m0  —
  m1  —
  m2  —
    └ ⠋ M2-1125-L  작업 21분
  m3  —
    └ ⠋ M3-1125-H  작업 21분
  r0  —
    └ ⠋ R0-1125-P  작업 9분
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ────────────────────────────────────────────────────────────────
─ 진행 중 (4) ──────────────────────────────────────────────────────────────────────────────────────
● M2-1125-L    m2  ●◐○○○○○○○  작업    21분         ci-watch 터미널 UI (ledger/decision-c…
● M3-1125-H    m3  ●◐○○○○○○○  작업    21분         ledger/decision-admin-pos-settings-20…
● R0-1125-P    r0  ●◐○○○○○○○  작업    9분          POS Cart 세금 0 / Checkout PB1 합계 …
▲ M0-1125-H    m0  ●●●●●●◐○○  CI결과  7분    #432  PS 매장 먼저
─ 오늘 완료 54 (Enter 펼치기) ──────────────────────────────────────────────────────────────────────
  j/k 이동 · Enter 상세 · / 필터 · r 새로고침 · q 종료
```

## 진행 중 카드 사유

| ID | 열 | 사유 |
|---|---|---|
| M2-1125-L | 작업(hub) | m2 허브가 현재 작업 중 — allJson.hubs.m2.current = M2-1125-L |
| M3-1125-H | 작업(hub) | m3 허브가 현재 작업 중 — allJson.hubs.m3.current = M3-1125-H |
| R0-1125-P | 작업(hub) | r0 허브가 현재 작업 중 — allJson.hubs.r0.current = R0-1125-P |
| M0-1125-H | CI결과 | PR #432 열림 · CI 결과 7분 전 (ciResultRecentMin=15 이내) |

## 수정 내역

### Bug 1 · Done+무PR 카드가 진행 중으로 표시
**원인**: `collect-view.mjs` Step 9 가 `card.hub === 'r0'` 에만 done-claim 필터를 적용하고,
리포트 첫 줄 `^(APPROVE|PASS|FAIL|CHANGES)\b` 패턴을 체크해서 `#431 CHANGES` 형식을 걸러냈음.

**수정**: hub 조건 제거, 첫 줄 패턴 체크 제거. `claim.state === 'done'` + PR 없음이면 완료 편입.

### Bug 2 · 오늘 완료 4 → 54
**원인**: 완료 집계가 pipeline-view 에서 숨긴 카드 수(`doneToday`)만 세어서 최대 활성 창(20분)
안의 카드만 반영됐음.

**수정**: `scanClaimsDir` 로 `status/claims/` 전체 스캔 → WIB 오늘 날짜 `done` 클레임 집계.
`Math.max(pipeline계산, claims계산)` 으로 더 큰 값 사용.

### Bug 3 · M3-1125-G #431 DIRTY merge → CI대기로 표시
**원인**: `collect-view.mjs` Step 2 의 `defaultFetchPrState` 가 `mergeable`/`mergeStateStatus` 를
조회하지 않아 충돌 감지 불가.

**수정**: `gh pr view` JSON 필드에 `mergeable,mergeStateStatus` 추가. Step 2 에 `DIRTY/CONFLICTING`
감지 시 `card.level='red', card.reason='충돌 — rebase 필요', card.mergeConflict=true` 설정.

> 참고: M3-1125-G 는 최종 테스트 시점(12:38)에 20분 보고창에서 이미 나이아웃돼 TUI 에 미노출.
> T-L4 테스트가 로직 정확성을 검증.

### Bug 4 · R0 카드 제목 공백
**원인**: `pipeline-view.mjs` 의 R0 카드 제목 조회 로직이 큐 파일 경로를 올바르게 resolve 하지 못하는 케이스.
`collect-view.mjs` 에 Step 3.5 (전체 허브 제목 폴백 — 큐 파일 원장 대사) 미존재.

**수정**: Step 3.5 추가 — 모든 허브(r0 포함) `card.title` 없으면 `queue/<hub>/<id>.md` 에서
`readQueueTitle` 로 원장 대사 추출.

### Bug 5 · 회귀 테스트 추가 (T-L1 ~ T-L5)
`scripts/test/ci-watch-v2.test.mjs` 에 1125 날짜 코드 픽스처 기반 5개 테스트 추가.

| 테스트 | 검증 항목 |
|---|---|
| T-L1 | done+무PR (R0·m0) → inProgress 비노출, doneToday 증가 |
| T-L2 | done+열린PR → inProgress 유지 |
| T-L3 | 오늘 done claim 4건 → doneToday ≥ 4 |
| T-L4 | ci_pending + DIRTY merge → reason='충돌 — rebase 필요', level=red |
| T-L5 | R0 타겟 카드 done+무PR → inProgress 비노출 |

71/71 테스트 PASS.

## 커밋

`4a22c92cc` — `fix(ci-watch): M2-1125-L — done+무PR 카드 완료 편입·오늘완료 집계·충돌감지·R0제목폴백`
브랜치: `feat/M2-1125-I-ci-watch-layout`
변경 파일: `scripts/watch/sources-local.mjs`, `scripts/watch/collect-view.mjs`, `scripts/test/ci-watch-v2.test.mjs`
