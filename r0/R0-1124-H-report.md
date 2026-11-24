CHANGES

## R0-1124-H — PR #17 ci-watch r키·카운트다운·경과시간 리뷰

### 판정: CHANGES

**사유**: PR #17 (`feat/M2-1124-H-ci-watch-keys`) mergeable = CONFLICTING — main 으로 rebase 필요.

---

### 1. mergeable 확인

| 항목 | 결과 |
|---|---|
| base | main |
| mergeStateStatus | DIRTY |
| mergeable | **CONFLICTING** |

#16 이 squash 머지된 이후 main 이 앞서 나감. 현재 브랜치를 main 위로 rebase 하지 않으면 머지 불가.  
→ **CHANGES: main 으로 rebase 필요**

---

### 2. 변경 파일 확인

GitHub PR diff (merge-base 기준) 변경 파일 4개:

| 파일 | 변경 |
|---|---|
| `scripts/ci-watch.mjs` | 수정 (+443 / -8) |
| `scripts/watch/ci-watch-render.mjs` | 수정 (+101 / -9) |
| `m2/M2-1124-C-report.md` | 추가 (이전 커밋 누적) |
| `m2/M2-1124-H-report.md` | 추가 (이전 커밋 누적) |

`scripts/ci-watch.mjs` 뿐이 아님. `ci-watch-render.mjs` 수정은 리포트 미착지 분리 렌더 로직(REQ 3) 구현으로 의도된 범위 내. 리포트 2개는 rebase 후 사라질 예정.

---

### 3. 기능 검증 (worktree: /Users/kyu.lee/curiocity-live/relay-M2-1124-H)

#### REQ ①: r 입력 → 즉시 갱신
```js
// ci-watch.mjs:829-834
else if (key === 'r' || key === 'R') {
  const now = Date.now();
  if (now - lastForceRefreshMs >= KEY_REFRESH_COOLDOWN_MS) {
    lastForceRefreshMs = now;
    forceRefresh(); // refreshTimer 취소 → tick() 즉시 호출
  }
}
```
`forceRefresh()` 가 `clearTimeout(refreshTimer)` 후 `tick()` 직접 호출. ✅ 코드 정확.

#### REQ ②: q / Ctrl+C 종료 후 터미널 복원
```js
// ci-watch.mjs:681-688
function cleanupTerminal() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  try {
    if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
  } catch {}
  process.stdout.write('\x1b[?25h\n'); // 커서 복원
}
```
`setRawMode(false)` + `\x1b[?25h` 처리 완비. q 핸들러·SIGINT 핸들러 모두 `cleanupTerminal()` 경유. ✅

#### REQ ③: 카운트다운 1초마다 · 깜빡임 없음
```js
// ci-watch.mjs:674-678
countdownTimer = setInterval(() => {
  if (isRendering) return;
  const remain = Math.max(0, Math.round((nextRefreshMs - Date.now()) / 1000));
  process.stdout.write('\x1b[1A\r\x1b[2K' + fmtCountdownLine(remain, fullMode) + '\n');
}, 1000);
```
마지막 한 줄만 `\x1b[1A\r\x1b[2K` 로 갱신(전체 화면 지우기 없음). `isRendering` 중 스킵으로 race condition 방지. ✅

#### REQ ④: Ctrl+C 정상 종료
- raw mode 에서 Ctrl+C = `\x03` → 키 핸들러 (line 827) 에서 `cleanupTerminal(); process.exit(0);`
- SIGINT 핸들러 (line 803) 도 같은 처리. ✅

#### REQ ⑤: r 연타 → gh API 폭주 없음 (10초 캐시)
```js
const KEY_REFRESH_COOLDOWN_MS = 10_000; // line 666
// ...
if (now - lastForceRefreshMs >= KEY_REFRESH_COOLDOWN_MS) { // line 831
```
10초 쿨다운 정확. 추가로 `tick()` 내 `fetchAllRunState()` 는 `RUNNER_REFRESH_MS = 120_000` (2분) 별도 캐시. ✅

#### REQ ⑥: 리포트 미착지 분리 표시
```js
// ci-watch.mjs:691-704: computeHubReportStatus()
// all.json.hubs[hub].ended_at 있을 때 workMin(작업시간) · waitMin(착지대기) 분리
// ci-watch-render.mjs:154-159:
if (rptStatus && !rptStatus.reportExists) {
  // "작업 Xmin · ⚠ 리포트 미착지 Ymin" 표시
}
```
`ended_at` 기준으로 작업시간과 미착지 대기를 별도 계산. 실행 화면에서도 `m2  M2-1124-C  131분` 형태 경과시간 정상 렌더 확인. ✅

#### REQ non-TTY (stdin 파이프 크래시 없음)
실제 실행:
```
echo "" | node scripts/ci-watch.mjs
```
`if (process.stdin.isTTY)` 조건으로 raw mode 완전 스킵. 초기 화면 렌더 정상 출력 후 대기. 크래시 없음. ✅

---

### 결론

| 항목 | 결과 |
|---|---|
| mergeable | ❌ CONFLICTING |
| 변경 파일 범위 | ⚠ ci-watch.mjs + ci-watch-render.mjs + 리포트 2개 |
| REQ ①~⑥ 코드 | ✅ 전부 정확 |
| non-TTY 크래시 | ✅ 없음 |

**→ CHANGES: main 으로 rebase 필요 (충돌 해소 후 재검토 가능)**
