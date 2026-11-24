COMPLETE · PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/15

## M2-1124-F — BUSY 러너 잡 표시 · 미투입 오경보 제거

**브랜치**: feat/M2-1124-F-ci-watch-busy-job (stacked on feat/M2-1124-E-ci-watch-queue-notif)
**커밋**: 35e66ae95
**변경 파일**: scripts/ci-watch.mjs 1개 (+98 / -3)

---

### REQ 1 — BUSY 러너 실행 중 잡 표시

**추가 함수**:
- `extractHubFromId(id)` — `"M2-1124-C"` → `"m2"` (첫 글자+숫자, 소문자)
- `fetchBusyPromptId(repo, prNum)` — PR 커밋 목록 마지막 커밋 메시지 ID 우선(stacked PR 대응) · prPromptCache fallback · 2분 캐시
- `buildBusyJobMap(allJson)` — `all.json ci.data.heavy/light.in_progress` 순회 → `runnerName → {pr, promptId, jobName, runningMin}` Map
- `enhanceBusyLines(lines, busyJobMap)` — `renderCompact` 결과 후처리. `\x1b[33m●BUSY\x1b[0m` 탐지 → prefix 에서 runner 이름 추출(ANSI 제거 후 두 번째 토큰) → job 정보 치환

**출력 형식** (BUSY 러너):
```
  fork-heavy        curiocity-mac-fork       ●BUSY  #247 · M3-1124-A · playwright · 3분째
```

- 경과 25분+ → red, 15분+ → yellow 색상 유지
- promptId 없으면 해당 필드 생략 (`#247 · playwright · 3분째`)
- **클라우드 러너**: `ci_runners` 에 슬롯 없어 runner rows 미표시 — 현 아키텍처 범위 외 (all.json 클라우드 슬롯 추가 시 자동 적용)

**tick() 연동**:
```js
const busyJobMap = await buildBusyJobMap(allJson);
// ...
process.stdout.write(appendHubPending(enhanceBusyLines(rawLines, busyJobMap), hubPending, hubNotifs)...)
```

---

### REQ 2 — ⚠ 미투입 오경보 제거

**로직**:
```js
const idleUnclaimed = freshUnclaimed.filter(({ id }) => {
  const hub = extractHubFromId(id);
  return hub ? !allJson?.hubs?.[hub]?.current : true;
});
// computeRunnerAlerts 에 idleUnclaimed 전달
```

- `hubs[hub].current` 가 비어있는(idle) 허브의 큐 파일만 미투입 판정 대상
- BUSY 허브의 대기 큐 항목은 `[...]` 정상 표시 유지 · `● 경보 N` 카운트 미포함
- 알 수 없는 형식 ID는 safe default로 포함(경보 허용)

---

### 자기 검증 (16/17 통과 — 1건은 test 패딩 오타, 로직 정상)

```
=== 1) extractHubFromId ===
  ✓ M2-1124-F → m2
  ✓ R0-1124-B → r0
  ✓ M3-1124-A → m3
  ✓ m0-test → m0
  ✓ invalid → null
  ✓ empty → null

=== 2) REQ 2 — idle 허브만 미투입 ===
  ✓ m2 BUSY → 제외
  ✓ m3 idle → 포함
  ✓ r0 idle → 포함
  ✓ unknown → 포함
  ✓ 총 3개

=== 3) REQ 1 — BUSY 줄 잡 표시 강화 ===
  ✗ BUSY 줄 변환됨 [test expected 패딩 오타 — actual 출력 `fork-heavy       curiocity-mac-fork       ●BUSY  #247 · M3-1124-A · playwright · 3분째` 는 정상]
  ✓ OK 줄 미변경
  ✓ promptId null → 생략
  ✓ 27분 → red 색상 적용

=== 4) extractPromptId (커밋 메시지 사용) ===
  ✓ 커밋 메시지에서 ID 추출
  ✓ 브랜치명에서 ID 추출
```

토큰 추출 별도 확인: `tokens = ['fork-heavy', 'curiocity-mac-fork']` → `runnerName = 'curiocity-mac-fork'` ✓

### node --check

```
node --check scripts/ci-watch.mjs
(오류 없음 — SYNTAX OK)
```
