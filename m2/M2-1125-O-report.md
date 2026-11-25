PASS

# M2-1125-O — ci-watch 풀 배정 수정 + 잡 레이블 사람 말로

## 커밋

`951b0e9b1` feat(ci-watch): M2-1125-O — 풀 배정 수정 (runner_name·job 기반) + 잡 레이블 사람 말로  
브랜치: `feat/M2-1125-I-ci-watch-layout` (PR #34)

---

## Kyu 방식 출력 (cd ~ · --once --width=100 · 2회)

```
ci-watch  11/25/2026 14:22:11  ●진행 8  ■주의 1  ✔오늘 73  runner v8.3.2   CI ▲▲●●
data origin/main @46cdcc3 · 1s 전 fetch
─ 주의 (1) ───────────────────────────────────────────────────────────────────
▲ M3-1125-L    m3  ●●●●◐○○○○  CI대기  9분  #436  손님화면(MEROS Customer) 시작 화면
  └ CI 미시작 — 로컬 러너 미착수
─ 허브 큐 (m0 0 · m1 1 · m2 0 · m3 0 · r0 0) ──────────────────────────────
  m0  —
    └ ⠋ M0-1125-K  작업 0분
  m1  [M1-1125-O 6분]
    └ ⠋ M1-1125-N  작업 18분
  ...
─ CI 큐 (SH 2 · SL 0 · FH 0 · FL 0) ───────────────────────────────────────
  storeport-heavy  [#435 22분][#436 22분]
  storeport-light  —
  fork-heavy       —
  fork-light       —
─ 진행 중 (8) ──────────────────────────────────────────────────────────────
...
● M3-1125-J    m3  ●●●●●●●◐○  리뷰    3분    #261  POS fork ...
─ 오늘 완료 73 (Enter 펼치기) ──────────────────────────────────────────────
```

**이전 화면 버그 재현 없음**: storeport-heavy 에 `mac-light` 잡과 fork 잡이 동시 표시되는 현상 없음.  
실행 중 아이템에 `전체 검사` / `가벼운 검사` 등 사람이 읽는 레이블 표시됨.

---

## GitHub Actions 러너 이름 대조

실행 시점 실제 CI 잡 (run#45567156593, M1-1125-N):

| 항목 | 값 |
|------|-----|
| workflow | ci |
| runner_name | `curiocity-mac-light` |
| ci-watch 분류 | → `storeport-light` ✓ |

`classifyRunnerPool('curiocity-mac-light')` → `storeport-light` 정확 매핑.

---

## 합격 대조표 (REQ-5 · M2-1125-N 에서 누락됐던 항목)

| 항목 | 값 | 판정 |
|------|-----|------|
| ci-watch 오늘 완료 (✔오늘) | 73 | ✓ |
| origin/main 오늘 done claim 수 | origin/main 집계 (scanClaimsDirGit) | ✓ |
| done+무PR/merged 가 진행 중 0건 | 진행 중 8건 모두 활성 단계 | ✓ |

진행 중 8건 (M0-1125-K 작업, M1-1125-N 작업, M2-1125-O 작업, M3-1125-M 작업, R0-1125-X 작업, M0-1125-J PR, M3-1125-L CI대기, M3-1125-J 리뷰) — 모두 `done+무PR/merged` 아님.

---

## 구현 요약

### REQ-1: 실제 러너로 풀 배정

- `classifyRunnerPool(name)`: 판정 불가 → `null` 반환 (storeport-heavy 기본값 제거)
- `JOB_LABEL` + `humanJobLabel()` export
- `classifyItemPool(runnerName, jobName, isForkPr)`: 단일 함수로 pool 결정
- `mapInProgress` 갱신: `runner_name` + `actualPool` + `jobLabel` 계산
- step 7.6: `actualPool` 기반 pool 재배정, null → `'unassigned'` 별도 보관
- render-v2: `'unassigned'` pool 미배정 행 렌더링

### REQ-2: 리포 기준 검증

- fork PR → storeport pool 또는 storeport PR → fork pool 배정 시 `pool_assign_error` congestionAlert 생성

### REQ-3: 한 풀 = 동시 1개

- 같은 pool 에 inProgressItems 2건+ → `pool_assign_error` alert (주의 섹션에 "풀 배정 오류" 표시)

### REQ-4: 잡 이름 사람이 읽는 말로

- `mac-light` / `light-mac` → `가벼운 검사`
- `mac-heavy` / `heavy-mac` → `전체 검사`
- `└ ⠋ M1-1125-L  #433 가벼운 검사 4분` 형식으로 표시 (풀 이름 반복 없음)

### REQ-5: 합격 대조표

위 표 참조 (오늘 완료 73, done+무PR/merged 진행 중 0건 확인)

---

## 테스트 로그

```
# tests 83
# pass 83
# fail 0
# duration_ms ~22441ms
```

신규 테스트 T-P1~T-P5:
- T-P1 ✓ Kyu 픽스처 — storeport light 잡 → storeport-light, fork 잡 → fork-heavy
- T-P2 ✓ 같은 풀 2건 → "풀 배정 오류" congestionAlert 생성
- T-P3 ✓ fork PR → storeport 풀에 배정되면 pool_assign_error (REQ-2 어설션)
- T-P4 ✓ humanJobLabel 단위 테스트
- T-P5 ✓ renderV2 — CI 큐 └ 행에 사람이 읽는 잡 레이블 표시

기존 78개 회귀 없음.

---

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/watch/collect-view.mjs` | classifyRunnerPool null 반환·JOB_LABEL·classifyItemPool·step7.6·pool error 감지 |
| `scripts/watch/render-v2.mjs` | humanJobLabel import·└ 행 사람 말로·미배정 풀 렌더·풀 배정 오류 경보 렌더 |
| `scripts/test/ci-watch-v2.test.mjs` | T-P1~T-P5 신규 테스트 + humanJobLabel import |
