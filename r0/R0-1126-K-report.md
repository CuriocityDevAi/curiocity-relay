#45 CHANGES

PTY-1 이 실제 `renderDiff` 를 호출하지 않고 로컬 미러 복사본(`simulateRenderDiff`)을 사용함.

---

## 검증 항목별 결과

### 1. CHANGES 1 — 주의 구역 맨 아래 ✓

폭 80 · 100 · 140 모두:
- `주의 idx=20`, `허브큐 idx=1` → 주의가 맨 아래 ✓
- 경보 0건이면 주의 섹션 생략 (`allAlerts.length > 0` 조건) ✓

```
렌더 확인 (Width 80 / allAlerts=[{msg:'예시 경보'}]):
  줄 1  : ─ 허브 큐 (m0 0 · m1 0 ...) ─────────────────────── 평균대기
  줄 20 : ─ 주의 (1) ───────────────────────────────────────────────
  줄 21 :   ■ 예시 경보: CI 큐 대기 과다
  주의 idx=20 > 허브큐 idx=1 → 맨 아래 ✓
```

### 2. CHANGES 2 — 오늘 처리 열 정렬 ✓

EAW 기준 직접 계산 (Width 80 · 100 · 140 동일):

| | JS idx | EAW x |
|-|--------|-------|
| 헤더 `MBP M1` | 41 | **44** |
| 오늘처리 MBP 데이터 | 40 | **44** |

**이론 계산**:
- 헤더: `  `(2) + `CI_COL_POOL`(16) + `CI_SEP`(2) + `CI_COL_QUEUE`(22) + `CI_SEP`(2) = **44 EAW**
- 오늘처리: `  `(2) + `labelCell`(CI_COL_POOL+CI_SEP.length+CI_COL_QUEUE = 16+2+22 = 40) + `CI_SEP`(2) = **44 EAW**
- 세 폭 모두 MBP 데이터·헤더 EAW 위치 일치 ✓

### 3. CHANGES 3 — PTY-1 미러 복사본 ❌ → CHANGES

PTY-1 (`scripts/test/ci-watch-machines.test.mjs:658`) 은 실제 `renderDiff`(`scripts/ci-watch.mjs:871`)를 **호출하지 않는다**.

`simulateRenderDiff` 는 테스트 파일 내 로컬 함수(`ci-watch-machines.test.mjs:646`)로, `renderDiff` 로직을 수동으로 미러링한 것이다:

```javascript
// 테스트 파일 내 로컬 복사본 — renderDiff 를 import 하지 않음
function simulateRenderDiff(lines, termWidth, prevLines) {
  const writes = [];
  const truncated = lines.map(l => truncateAnsiWidth(l, termWidth)); // 실제 함수는 사용
  if (!prevLines || prevLines.length === 0) {
    writes.push('\x1b[2J\x1b[H');
    for (const line of truncated) writes.push(line + '\n');
  } else {
    // ...diff 로직 수동 복사...
  }
  writes.push('\x1b[J');
  return { writes, truncated };
}
```

**문제**: 만약 `renderDiff`에서 `truncateAnsiWidth` 호출을 빠뜨리거나 `\x1b[J]` 위치를 바꿔도 PTY-1 은 통과한다. 미러 복사본이므로 실제 함수의 회귀를 감지하지 못함.

`truncateAnsiWidth`(실제 모듈에서 import)는 호출하지만, `renderDiff` 자체는 호출 안 함 → **CHANGES 필요**.

### 4. CHANGES 4 — Q-1~Q-4 ✓

테스트 직접 실행 결과:
```
ok 45 - Q-1: renderLayout — 클라우드 2건 → +1 등장   ✓
ok 46 - Q-2: renderLayout — 클라우드 3건 → +2 등장   ✓
ok 47 - Q-3: renderLayout — 대기 3건 → 칩 2개 + +1 등장  ✓
ok 48 - Q-4: renderLayout — 대기 4건 → 칩 2개 + +2 등장  ✓
```

---

## Kyu 실화면 증상 대조

### (a) 모든 줄 폭 절단 ✓

`renderDiff`(`ci-watch.mjs:871`) 에서 모든 줄에 `truncateAnsiWidth(l, tw)` 적용:

```javascript
const tw = detectTerminalWidth();
const truncated = lines.map(l => truncateAnsiWidth(l, tw));  // 모든 줄 EAW 절단
```

창 폭 초과 → 줄바꿈 → 이전 프레임 잔상 증상은 v1.8 에서 차단됨 ✓

### (b) 로그 줄(`[claim] pushed` / `[hub-runner…self-update] 보류`) TTY 출력 경로

hub-runner 의 `log()` 함수:
```javascript
// hub-runner-v8.2.mjs:439
function log(scope, ...xs) {
  const line = `[hub-runner-${RUNNER_VERSION}...] ${xs.join(' ')}`;
  console.error(line);  // → stderr → TTY에 출력됨
}
```

`console.error` → stderr → TTY(화면)에 출력됨. v1.8이 이 경로를 차단하지는 않는다.

v1.8 대응: `\x1b[J`(커서 뒤 화면 전체 지움)를 **매 렌더 뒤** 추가(`ci-watch.mjs:894`). 렌더 범위 아래에 나타난 로그 줄은 다음 렌더 시 `\x1b[J`로 제거됨. **단**, 렌더 간격(기본 25초) 동안 로그 줄이 화면에 보이는 현상은 여전히 발생할 수 있음. v1.8 의 목표는 "잔상 제거"(다음 렌더 후 사라짐)이며, 로그 출력 경로 자체를 막는 것은 아님 — PR 설명의 "러너 로그 잔상 제거"와 일치 ✓

---

## 테스트 실행 결과

```
$ node --test scripts/test/ci-watch-*.test.mjs
# tests 175
# pass  175
# fail    0
# duration_ms ~20512
```

175/175 통과 ✓

---

## 결론

**#45 CHANGES** — PTY-1 이 실제 `renderDiff` 대신 로컬 미러 복사본을 사용하므로 `renderDiff` 회귀를 감지하지 못함.

나머지 항목(CHANGES 1 · 2 · 4, 증상 (a)(b))은 모두 ✓.

**요청 수정사항**: PTY-1 에서 `renderDiff`(`scripts/ci-watch.mjs` export)를 직접 import하여 `process.stdout` 을 mock 한 뒤 실제 함수를 호출하거나, 최소한 `simulateRenderDiff` 가 `renderDiff` 의 복사본임을 명시하고 별도로 `renderDiff` 의 직접 단위 테스트를 추가할 것.
