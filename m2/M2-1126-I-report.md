PASS b3c990590

## M2-1126-I — W9경로 · W2보완 · W10 클라우드 오늘 줄

### 작업 브랜치
- `feat/M2-1126-G-ci-watch-v111` (PR #50) → `b3c990590` 추가
- 작업 워크트리: `~/projects/curiocity-relay-wts/M2-1126-I`
- main 머지 커밋(620d7a112) + 작업 커밋(b3c990590) 2개를 PR #50 브랜치에 fast-forward push

---

### REQ 1 · W9(R0-V) — health.sh runner 경로 수정

**파일**: `scripts/ci-box/health.sh`

**변경 전**: `$HOME/actions-runner`, `$HOME/actions-runner-light`, `$HOME/actions-runner-fork`, `$HOME/actions-runner-fork-light`

**변경 후**: `_runner_dir` 규칙 4경로:
- `$HOME/actions-runner-ci-box-sp-heavy`
- `$HOME/actions-runner-ci-box-sp-light`
- `$HOME/actions-runner-ci-box-fork-heavy`
- `$HOME/actions-runner-ci-box-fork-light`

4경로 중 `_diag` 없으면 `find $HOME -maxdepth 2 -type d -name _diag` 동적 탐색 폴백.

---

### REQ 2 · W2 보완 — MARKER_JOBS에 추가

**파일**: `scripts/watch/ci-watch-render.mjs`

```js
export const MARKER_JOBS = new Set([
  'route', 'heavy-cloud', 'ci-summary', 'feature-map-route',
  'changes-filter', 'markers-and-forbidden'  // ← 추가
]);
```

ci-watch.mjs · ci-offload-impact.mjs 모두 ci-watch-render.mjs import 경유이므로 이 한 곳 수정으로 양쪽 반영.

---

### REQ 3 · W10 — 클라우드 오늘 줄 개편

**파일**: `scripts/watch/ci-watch-render.mjs`, `scripts/ci-watch.mjs`

**변경 전**: `cloud 잡 오늘  ${cd.realCount}건  잔여 ${remaining}`

**변경 후**: `클라우드 오늘  PR N · PT M · 잡 K · 넘김 X/Y`
- PR = 오늘 클라우드 잡 1건 이상 돈 PR 수 (isCountableJob + runner_kind=cloud)
- PT = 그 PR 연결 프롬프트 수 (status/pipeline/<id>.jsonl artifact.pr_number 교집합)
- 잡 = cloudData.realCount (W2 규칙)
- 넘김 = cloudTodayCount/cloudLimit · 한도 소진 시 빨강
- ci-watch.mjs에 `computeCloudTodayPRStats()` · `computeCloudTodayPT()` 추가
- renderLayout에 `cloudPR=null`, `cloudPT=null` 파라미터 추가

버전: 1.11 → 1.12

---

### 테스트 결과

| 테스트 | 결과 |
|--------|------|
| `ci-box-health.test.sh` (F-1 W9경로, F-2 find폴백 포함) | 29/29 PASS |
| `ci-watch-w112.test.mjs` (W2보완 3개 + W10 5개) | 8/8 PASS |
| `ci-watch-k.test.mjs` (기존) | 통과 (99/99 일부) |
| `ci-watch-machines.test.mjs` (기존) | 통과 |
| `ci-watch-w111.test.mjs` (기존 W5~W9) | 통과 |
| `ci-offload-impact.test.mjs` (기존) | 통과 |

전체 관련 테스트 99/99 + 신규 8/8 + bash 29/29 → 모두 PASS

---

### 스냅샷 (폭 100 · 140)

**폭 100** — W10 클라우드 오늘 줄 형태:
```
  클라우드 오늘  PR 3 · PT 4 · 잡 18 · 넘김 3/5
```

**폭 140** — 동일 형태 확인 (W10-3 테스트 통과)

---

### 커밋

```
b3c990590 feat(ci-watch): M2-1126-I — W9경로·W2보완·W10 클라우드 오늘 줄
```
