#45 CHANGES

## 판정 근거

### 항목 1 — 주의 구역 위치 (결정 §5 위반) ✗ CHANGES

결정 §5: "줄 밖 경보만 **맨 아래** 주의 구역"

코드(`ci-watch.mjs:renderLayout`) 실제 레이아웃 순서:
```
idx=0  머리줄 (ci-watch v1.8 …)
idx=1  ─ 주의 (N) ─   ← 머리줄 바로 아래 (상단)
idx=2  ─ 허브 큐 …
...
idx=9  ─ CI 큐 …
```

검증 커맨드:
```
node --input-type=module -e "
import {renderLayout} from './scripts/watch/ci-watch-render.mjs';
...
const alertIdx = plainAll.findIndex(l => l.includes('─ 주의'));    // 1
const hubIdx   = plainAll.findIndex(l => l.includes('─ 허브 큐')); // 2
"
```
결과: `주의 idx=1, 허브큐 idx=2` → 주의 구역이 맨 위 (§5 불이행).

---

### 항목 2 — 오늘 처리 열 정렬 (결정 §1 위반) ✗ CHANGES

결정 §1: "마지막 줄 `오늘 처리` = 각 기계 열 아래에 `N건 · 평균실행`"
(MBP 열 아래 / iMAC 열 아래 / 클라우드 열 아래 각각 가로 정렬)

실제 렌더(`ci-watch-render.mjs:551`):
```js
return `  오늘 처리: ${macPart} · ${cloudPart}`;
```
출력: `오늘 처리: MAC 11건·4.7m · 클라우드 0건` — 한 줄 문장(§1 불이행).

`todayMachineStats` 제공 시에도 `오늘 처리: MBP 35건·2m · iMAC 1건·36s · 클라우드 2건·8m` 형태로, 열 아래 정렬이 아니라 연속 텍스트.

---

### 항목 3 — 잔상 자기 검증 ② (런타임 미확인) ✗ CHANGES

리포트에 ② 섹션 없음. 코드 정적 분석 결과:
- `truncateAnsiWidth(l, tw)` 모든 줄 적용 (`renderDiff:874`) ✓
- `\x1b[J` 각 렌더 후 write (`renderDiff:894`) ✓
- SIGWINCH → `_prevLines = []` 전체 재그림 (`ci-watch.mjs:1188`) ✓

**폭 100 직접 확인** (renderLayout 호출):
```
Width 100: 21줄 렌더
Max display width after truncation: 100  ← 초과 없음
Lines exceeding width 100: 0
```

**런타임 TTY 확인** (node spawn 5초, COLUMNS=100):
- `\x1b[J` 36회 발생 ✓
- 비TTY 모드(columns 미설정)에서는 fallback 120 사용

단, 가상 PTY(node-pty) 미설치 · macOS `script` 명령이 샌드박스에서 출력 캡처 실패로 **실제 화면 버퍼 재구성 30초 테스트 미수행**. SIGWINCH 후 잔상 런타임 미검증.

---

### 항목 4 — 클라우드 `+N` · 대기 2+N · ID 무절단 fixture ✗ CHANGES (일부)

**코드 동작 확인** (직접 렌더 테스트):
- 클라우드 count=3 → `⠋M2-1126-A 5m +2` ✓
- 대기 4개 → `[M2-1126-A 5m][M2-1126-B 3m]+2` ✓
- ID 무절단 → M-10 테스트(`ci-watch-machines.test.mjs:326`) fixture 존재 ✓

**fixture 미존재**:
- 클라우드 다중 실행 `+N` → `ci-watch-machines.test.mjs`에 해당 케이스 없음
- 대기 칩 2개 + `+N` → `ci-watch-machines.test.mjs`에 해당 케이스 없음
(코드는 동작하나 단위 테스트로 커버되지 않음)

---

### 항목 5 — 테스트 170 직접 실행 ✓ PASS

```
cd /Users/kyu.lee/projects/curiocity-relay-wts/M2-1126-C
node --test scripts/test/ci-watch-*.test.mjs
# tests 170
# pass  170
# fail    0
# duration_ms 20496.845
```

---

## CHANGES 목록

1. **주의 구역 맨 아래로 이동** — `renderLayout`에서 주의 섹션을 허브큐·CI큐·진행중·오늘완료 이후 맨 마지막으로 재배치
2. **오늘 처리 열 정렬** — `buildTodayProcessedRow` 반환값을 각 기계 열(MBP / iMAC / 클라우드) 아래 가로 위치 정렬 형태로 변경
3. **잔상 검증 ② 추가** — node-pty 또는 가상 PTY 환경에서 30초 실행 후 화면 버퍼 재구성·잔상 0 확인 결과를 리포트에 첨부
4. **fixture 추가** — 클라우드 count≥2 → `+N` 출력 / 대기 3+개 → 2칩+`+N` 출력 단위 테스트 케이스
