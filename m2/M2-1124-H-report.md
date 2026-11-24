COMPLETE · PR #17: https://github.com/CuriocityDevAi/curiocity-relay/pull/17

## M2-1124-H 완료 보고

### 판정

모든 REQ 구현 완료. REQ 3 는 runner 신호(`ended_at`) 부재로 현재 fallback 동작 (신호 추가 시 자동 전환).

---

### REQ 1 — r 키 즉시 갱신

- `process.stdin.setRawMode(true)` 로 raw mode 진입
- `r` / `R` 키: 10초 쿨다운(`KEY_REFRESH_COOLDOWN_MS = 10_000`) 준수 후 즉시 `tick()` 실행
- `q` / `Q`, `Ctrl+C`(``): `cleanupTerminal()` → raw mode 해제 · 커서 복원(`\x1b[?25h`) · `process.exit(0)`
- SIGINT / SIGTERM 도 `cleanupTerminal()` 경유로 통일
- TTY 비연결 환경(pipe 등)에서는 raw mode 미설정 — 안전 fallback

### REQ 2 — 카운트다운

- `startCountdownTimer(fullMode)` : 1초마다 `setInterval`
- 화면 전체 재그림 없이 맨 아래 줄만 갱신
  - `\x1b[1A\r\x1b[2K` (한 줄 위 이동 · 줄 지우기) + 새 카운트다운 텍스트
- `tick()` 실행 중(`isRendering = true`)이면 갱신 건너뜀 — 중복 그림 방지
- 형식: `다음 갱신 23초 | r 지금 갱신 · q 종료  --full: 전체 목록`

### REQ 3 — 허브 경과 시간 의미 구분

**현재 상태**: `all.json hubs[hub]` 에 `ended_at` 필드가 없음 → 분리 불가.

**구현된 코드**: `ended_at` 감지 로직은 완성 상태.
- `computeHubReportStatus(allJson)`: `ended_at` 있으면 `workMin` / `waitMin` / `reportExists` 계산
- `renderCompact`: `hubReportStatus[hub]` 가 있고 리포트 미착지이면
  `r0 R0-1124-E 작업 34분 · ⚠ 리포트 미착지 3분` 표시 (5분+ 빨강)

**runner가 내야 할 신호** (러너 수정 금지 — 제안만):
> `hubs[hub].ended_at` (ISO 8601) — Claude 세션이 종료되는 시점에 `all.json` 에 기록.
> 이 필드가 추가되면 ci-watch 는 자동으로 "작업시간 · 리포트 착지대기" 분리 표시로 전환됨.

**R0-1124-E "37분 vs 3분 58초" 설명**:
- ci-watch 가 보여주는 경과 = `started_at → 지금` (러너가 허브 pane을 시작한 시점부터)
- Claude 터미널이 보여준 3:58 = Claude 세션이 실제 실행된 시간
- 차이(~33분)는 runner blocked 대기 등 pane 시작 이후 Claude 가 실제로 돌기까지의 overhead
- **오류 아님** — 타이머 기준이 다를 뿐. `ended_at` 신호 추가 시 두 값이 분리 표시됨.

### REQ 4 — 경과 색상

- 30분 이상: 노랑(`\x1b[33m`)
- 60분 이상: 빨강(`\x1b[31m`)
- `ci-watch-render.mjs` 허브 섹션에서 `elapMin` 기준으로 색상 적용

---

### 파일 변경

| 파일 | 변경 |
|------|------|
| `scripts/ci-watch.mjs` | +95줄: 카운트다운 · 키입력 · cleanupTerminal · computeHubReportStatus · 메인 루프 재구성 |
| `scripts/watch/ci-watch-render.mjs` | +21줄: 허브 색상 · ended_at 분리 표시 · countdownSec 파라미터 |

```
node --check scripts/ci-watch.mjs            → OK
node --check scripts/watch/ci-watch-render.mjs → OK
```

### PR

- **#17** base=`feat/M2-1124-F-ci-watch-busy-job` → `feat/M2-1124-H-ci-watch-keys`
- https://github.com/CuriocityDevAi/curiocity-relay/pull/17
