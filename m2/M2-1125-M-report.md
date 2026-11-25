PASS

## M2-1125-M — CI 큐 한 출처 통일 (GH API fork · ci_pending 동기 · cwd 독립)

### 원인 2가지 (파일:줄)

**원인 1 — CI 큐와 진행 중 단계 불일치** (`scripts/watch/collect-view.mjs:273~352`)
- `ciPools`는 `all.json.ci.data.heavy/light`만 읽어 storeport mac 러너 데이터만 반영.
- `ci_pending` 카드 판정은 `pipeline-view.mjs`의 로컬 파일 추론(PR URL 있음 + CI jsonl 없음)이고, `ciPools`와 단계 동기가 없었음.
- 결과: `all.json.heavy.in_progress`에 M1-1125-K가 있어도 카드는 `ci_pending`로 남고, fork(FH/FL) 잡은 영원히 CI 큐에 미노출.

**원인 2 — cwd 의존** (`scripts/watch/runner-panel.mjs:14~16`)
- `runner-panel.mjs`가 `const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')`로 스크립트 위치 기반 경로 사용.
- ci-watch-try(얕은 clone)에서 단독 실행 시 `~/ci-watch-try`를 REPO_ROOT로 삼아 실제 relay 데이터를 못 읽음.
- ci-watch-v2.mjs 자체는 homedir 기반으로 올바르나, runner-panel.mjs가 cwd 의존이어서 잠재적 오작동 위험.

### 수정 내용

**`scripts/watch/collect-view.mjs`**
- `fetchGhForkRuns(nowMs)`: agilo-medusa-pos-fork GH API(queued + in_progress) 조회, 30초 모듈 캐시, `buildExtendedView`에 `fetchForkRuns` 파라미터로 주입 가능(테스트용).
- step 7.5a: `all.json` inProgressItems → `ci_pending`/`pr` 카드를 `ci_running`으로 승격, `ageMin`·`since`·`extra.ci` 보정.
- step 7.5b: `ci_pending` 카드가 어떤 pool에도 없으면(푸시 직후 미생성 케이스) PR 소속 리포 기반 pool pre-queue에 추가.
- step 7.5c: GH fork runs 로 `fork-heavy`/`fork-light` 보강, 카드 단계 동기.

**`scripts/watch/runner-panel.mjs`**
- `const REPO_ROOT = process.env.CI_WATCH_RELAY_ROOT || \`${homedir()}/projects/curiocity-relay\`` 로 교체 (cwd 독립).

### Kyu 방식 실행 --once 출력 (cwd=~)

```
ci-watch  11/25/2026 13:12:28  ●진행 8  ■주의 1  ✔오늘 1  runner v8.3.2   CI ▲●●●
─ 주의 (1) ───────────────────────────────────────────────────────────────────────
■ M1-1125-K    m1  ●●●●●●◐○○  CI결과  11분  #259  POS Cart 세금 0 / Checkout PB1…
  └ CI 결과 11분 전
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ────────────────────────────────────
  m0  —
    └ ⠋ M0-1125-I  작업 2분
  m1  —
  m2  —
    └ ⠋ M2-1125-M  작업 14분
  m3  —
    └ ⠋ M3-1125-I  작업 10분
  r0  —
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ────────────────────────────────────────────
─ 진행 중 (8) ──────────────────────────────────────────────────────────────────
● M0-1125-I    m0  ●◐○○○○○○○  작업    2분
● M2-1125-M    m2  ●◐○○○○○○○  작업    14분
● M3-1125-I    m3  ●◐○○○○○○○  작업    10분
● R0-1125-R    r0  ●●◐○○○○○○  리포트  2분
● R0-1125-Q    r0  ●●◐○○○○○○  리포트  17분
■ M1-1125-K    m1  ●●●●●●◐○○  CI결과  11분  #259
● M3-1125-H    m3  ●●◐○○○○○○  리포트  18분
● R0-1125-K    r0  ●●●●●●●◐○  리뷰    110분
─ 오늘 완료 1 (Enter 펼치기) ────────────────────────────────────────────────────
```

현재 M1-1125-K는 CI 잡이 완료되어 `CI결과`(stage 6) 표시 중. CI 큐 `SH 0`은 대기 항목 없음(실행 완료)이므로 정상.
ci_pending인 카드가 있을 때 → CI 큐에 칩 반드시 노출되는지는 T-GH2 테스트로 검증.

### 테스트 로그

```
# tests 69
# pass 69
# fail 0
# duration_ms 5971
```

신규 테스트:
- T-GH1: all.json in_progress → ci_pending 카드 ci_running 승격 ✓
- T-GH2: ci_pending 카드 미매핑 → storeport-heavy pre-queue 추가, CI 큐 SH 1+ 표시 ✓
- T-GH3: mockForkRuns 주입 → fork-heavy inProgressItems 추가, 카드 ci_running 승격 ✓
- T-GH4: mockForkRuns queued 주입 → fork-heavy queuedPrs 추가, CI 큐 FH 1+ 표시 ✓
- T-CWD1: /tmp 실행과 fixture root 실행 출력 동일 (타임스탬프 제외) ✓

### 커밋 · PR

커밋: `7427c99c8` feat/M2-1125-M-ci-watch-cwd-fix
PR #34 (`feat/M2-1125-I-ci-watch-layout`) 에 fast-forward push 완료.
https://github.com/CuriocityDevAi/curiocity-relay/pull/34
